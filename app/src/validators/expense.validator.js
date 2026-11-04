import { z } from 'zod';

const MAX_BIGINT = 9223372036854775807n;
const MAX_NUMERIC_12_2 = 9999999999.99;

export const createExpenseSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(120, 'Title cannot exceed 120 characters'),

  category: z
    .string({ required_error: 'Category is required' })
    .trim()
    .min(1, 'Category cannot be empty')
    .max(50, 'Category cannot exceed 50 characters'),

  amount: z
    .union([z.number(), z.string()], { required_error: 'Amount is required' })
    .refine((val) => {
      if (typeof val === 'number') {
        if (!Number.isFinite(val) || val <= 0 || val > MAX_NUMERIC_12_2) {
          return false;
        }
        const str = String(val);
        if (str.includes('e') || str.includes('E')) {
          return false;
        }
        const parts = str.split('.');
        if (parts.length === 2 && parts[1].length > 2) {
          return false;
        }
        return true;
      }

      if (typeof val === 'string') {
        const trimmed = val.trim();
        const numericRegex = /^[0-9]{1,10}(\.[0-9]{1,2})?$/;
        if (!numericRegex.test(trimmed)) {
          return false;
        }
        const num = Number(trimmed);
        return Number.isFinite(num) && num > 0 && num <= MAX_NUMERIC_12_2;
      }

      return false;
    }, {
      message: 'Amount must be a finite positive number with at most 2 decimal places and <= 9999999999.99',
    })
    .transform((val) => {
      const num = Number(val);
      return num.toFixed(2);
    }),

  expense_date: z
    .string({ required_error: 'Expense date is required' })
    .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Expense date must be in YYYY-MM-DD format')
    .refine((str) => {
      const match = str.match(/^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
      if (!match) return false;
      const [, y, m, d] = match.map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      return (
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === m - 1 &&
        date.getUTCDate() === d
      );
    }, {
      message: 'Expense date must be a valid calendar date',
    }),
});

export const expenseIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Expense ID is required' })
    .regex(/^[1-9]\d*$/, 'Expense ID must be a positive integer')
    .refine((val) => {
      try {
        const big = BigInt(val);
        return big > 0n && big <= MAX_BIGINT;
      } catch {
        return false;
      }
    }, {
      message: 'Expense ID exceeds maximum valid 64-bit integer',
    }),
});
