import { query } from '../config/database.js';
import {
  createExpenseSchema,
  expenseIdParamSchema,
} from '../validators/expense.validator.js';

export async function getExpenses(req, res) {
  const result = await query(
    `SELECT id, title, category, amount, expense_date::TEXT AS expense_date, created_at
     FROM expenses
     ORDER BY expense_date DESC, id DESC`
  );

  return res.status(200).json(result.rows);
}

export async function createExpense(req, res) {
  const validatedData = createExpenseSchema.parse(req.body);

  const result = await query(
    `INSERT INTO expenses (title, category, amount, expense_date)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, category, amount, expense_date::TEXT AS expense_date, created_at`,
    [
      validatedData.title,
      validatedData.category,
      validatedData.amount,
      validatedData.expense_date,
    ]
  );

  return res.status(201).json(result.rows[0]);
}

export async function deleteExpense(req, res) {
  const { id } = expenseIdParamSchema.parse(req.params);

  const result = await query(
    'DELETE FROM expenses WHERE id = $1 RETURNING id',
    [id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: `Expense with ID ${id} not found`,
    });
  }

  return res.status(204).send();
}
