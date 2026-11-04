import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { query, closeDatabaseConnection } from '../src/config/database.js';

describe('Expense Tracker REST API Integration Tests', () => {
  const testCreatedIds = [];
  const testPrefix = `__TEST_EXPENSE__${Date.now()}`;

  beforeAll(async () => {
    // Clean up any stale test records from prior runs without touching seed data
    await query("DELETE FROM expenses WHERE title LIKE '__TEST_EXPENSE__%'");

    // Verify baseline seed records exist
    const seedCheck = await query('SELECT count(*) FROM expenses');
    expect(Number(seedCheck.rows[0].count)).toBeGreaterThanOrEqual(10);
  });

  afterAll(async () => {
    // Strictly clean up test-created records only
    if (testCreatedIds.length > 0) {
      await query('DELETE FROM expenses WHERE id = ANY($1::bigint[])', [testCreatedIds]);
    }
    await query("DELETE FROM expenses WHERE title LIKE '__TEST_EXPENSE__%'");

    // Verify all 10 original seed records remain intact
    const finalCheck = await query("SELECT count(*) FROM expenses WHERE title NOT LIKE '__TEST_EXPENSE__%'");
    expect(Number(finalCheck.rows[0].count)).toBe(10);

    // Close the database pool so Vitest finishes cleanly
    await closeDatabaseConnection();
  });

  describe('Health and System Routes', () => {
    it('GET / should return 200 with service information', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Expense Tracker API');
      expect(response.body).toHaveProperty('documentation');
    });

    it('GET /health should return 200 and confirm database connectivity', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ok',
        service: 'expense-tracker-api',
        database: 'connected',
      });
      expect(response.body).toHaveProperty('timestamp');
    });

    it('GET /non-existent-route should return 404', async () => {
      const response = await request(app).get('/non-existent-route');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Route not found');
    });
  });

  describe('GET /expenses', () => {
    it('should return 200 and a JSON array of expenses', async () => {
      const response = await request(app).get('/expenses');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(10);
    });

    it('should return expenses in deterministic order (expense_date DESC, id DESC)', async () => {
      const response = await request(app).get('/expenses');
      expect(response.status).toBe(200);
      const expenses = response.body;

      for (let i = 0; i < expenses.length - 1; i++) {
        const current = expenses[i];
        const next = expenses[i + 1];

        if (current.expense_date === next.expense_date) {
          expect(BigInt(current.id) >= BigInt(next.id)).toBe(true);
        } else {
          expect(current.expense_date >= next.expense_date).toBe(true);
        }
      }
    });

    it('should include the seeded synthetic expense records with expected fields', async () => {
      const response = await request(app).get('/expenses');
      expect(response.status).toBe(200);

      const electricityBill = response.body.find((e) => e.title === 'Electricity Bill');
      expect(electricityBill).toBeDefined();
      expect(electricityBill).toMatchObject({
        category: 'Utilities',
        amount: '1850.75',
        expense_date: '2026-10-05',
      });
      expect(typeof electricityBill.id).toBe('string');
      expect(electricityBill).toHaveProperty('created_at');
    });
  });

  describe('POST /expenses', () => {
    it('should create a new expense with valid payload and return 201', async () => {
      const payload = {
        title: `${testPrefix} Cloud Server Fee`,
        category: 'Infrastructure',
        amount: 49.99,
        expense_date: '2026-10-25',
      };

      const response = await request(app)
        .post('/expenses')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(typeof response.body.id).toBe('string');
      expect(response.body.title).toBe(payload.title);
      expect(response.body.category).toBe(payload.category);
      expect(response.body.amount).toBe('49.99');
      expect(response.body.expense_date).toBe('2026-10-25');
      expect(response.body).toHaveProperty('created_at');

      testCreatedIds.push(response.body.id);
    });

    it('should accept amount as string with two decimal places and return 201', async () => {
      const payload = {
        title: `${testPrefix} Domain Registration`,
        category: 'Networking',
        amount: '12.50',
        expense_date: '2026-10-26',
      };

      const response = await request(app)
        .post('/expenses')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.amount).toBe('12.50');
      testCreatedIds.push(response.body.id);
    });

    it('should trim title and category strings upon insertion', async () => {
      const payload = {
        title: `   ${testPrefix} Trimmed Expense   `,
        category: '  Utilities  ',
        amount: 25.0,
        expense_date: '2026-10-27',
      };

      const response = await request(app)
        .post('/expenses')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(`${testPrefix} Trimmed Expense`);
      expect(response.body.category).toBe('Utilities');
      expect(response.body.amount).toBe('25.00');
      testCreatedIds.push(response.body.id);
    });

    it('should reject missing title with 400', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          category: 'Food',
          amount: 20.0,
          expense_date: '2026-10-28',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('details');
      expect(response.body.details.some((i) => i.path.includes('title'))).toBe(true);
    });

    it('should reject empty or whitespace-only title with 400', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          title: '   ',
          category: 'Food',
          amount: 20.0,
          expense_date: '2026-10-28',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject title exceeding 120 characters with 400', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          title: 'A'.repeat(121),
          category: 'Food',
          amount: 20.0,
          expense_date: '2026-10-28',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject missing category with 400', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          title: `${testPrefix} Missing Category`,
          amount: 20.0,
          expense_date: '2026-10-28',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject empty category with 400', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          title: `${testPrefix} Valid Title`,
          category: '   ',
          amount: 20.0,
          expense_date: '2026-10-28',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject zero amount with 400', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          title: `${testPrefix} Zero Amount`,
          category: 'Food',
          amount: 0,
          expense_date: '2026-10-28',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject negative amount with 400', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          title: `${testPrefix} Negative Amount`,
          category: 'Food',
          amount: -15.5,
          expense_date: '2026-10-28',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject excessive decimal precision (more than 2 places) with 400', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          title: `${testPrefix} High Precision Amount`,
          category: 'Finance',
          amount: 15.555,
          expense_date: '2026-10-28',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject amount exceeding NUMERIC(12,2) with 400', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          title: `${testPrefix} Huge Amount`,
          category: 'Finance',
          amount: 10000000000.0,
          expense_date: '2026-10-28',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject invalid date format with 400', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          title: `${testPrefix} Bad Date`,
          category: 'Food',
          amount: 10.0,
          expense_date: '2026/10/28',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject nonexistent calendar date (e.g. Feb 30) with 400', async () => {
      const response = await request(app)
        .post('/expenses')
        .send({
          title: `${testPrefix} Nonexistent Date`,
          category: 'Food',
          amount: 10.0,
          expense_date: '2026-02-30',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('DELETE /expenses/:id', () => {
    it('should successfully delete an existing test expense and return 204', async () => {
      // First create a record to delete
      const createResponse = await request(app)
        .post('/expenses')
        .send({
          title: `${testPrefix} To Be Deleted`,
          category: 'Temporary',
          amount: 9.99,
          expense_date: '2026-10-29',
        });

      expect(createResponse.status).toBe(201);
      const createdId = createResponse.body.id;

      // Delete the created record
      const deleteResponse = await request(app).delete(`/expenses/${createdId}`);
      expect(deleteResponse.status).toBe(204);
      expect(deleteResponse.text).toBe('');

      // Verify it is gone from subsequent GET /expenses
      const getResponse = await request(app).get('/expenses');
      const found = getResponse.body.find((e) => e.id === createdId);
      expect(found).toBeUndefined();
    });

    it('should return 404 when deleting a valid but non-existent expense ID', async () => {
      const nonExistentId = '999999999';
      const response = await request(app).delete(`/expenses/${nonExistentId}`);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain(`Expense with ID ${nonExistentId} not found`);
    });

    it('should return 400 for non-numeric ID', async () => {
      const response = await request(app).delete('/expenses/abc');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 for zero ID', async () => {
      const response = await request(app).delete('/expenses/0');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for negative ID', async () => {
      const response = await request(app).delete('/expenses/-5');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for fractional ID', async () => {
      const response = await request(app).delete('/expenses/1.5');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 for ID exceeding 64-bit integer', async () => {
      const overflowId = '9223372036854775808';
      const response = await request(app).delete(`/expenses/${overflowId}`);
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });
});
