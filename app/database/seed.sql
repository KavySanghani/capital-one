INSERT INTO expenses (title, category, amount, expense_date)
SELECT
    seed.title,
    seed.category,
    seed.amount,
    seed.expense_date
FROM (
    VALUES
        ('Grocery Shopping', 'Food', 1250.50::NUMERIC, DATE '2026-10-01'),
        ('Bus Pass', 'Transport', 650.00::NUMERIC, DATE '2026-10-03'),
        ('Electricity Bill', 'Utilities', 1850.75::NUMERIC, DATE '2026-10-05'),
        ('Wireless Headphones', 'Shopping', 2499.00::NUMERIC, DATE '2026-10-08'),
        ('Medical Supplies', 'Healthcare', 540.25::NUMERIC, DATE '2026-10-10'),
        ('Movie Tickets', 'Entertainment', 480.00::NUMERIC, DATE '2026-10-12'),
        ('Restaurant Dinner', 'Food', 950.00::NUMERIC, DATE '2026-10-15'),
        ('Cab Fare', 'Transport', 320.00::NUMERIC, DATE '2026-10-18'),
        ('Internet Bill', 'Utilities', 999.00::NUMERIC, DATE '2026-10-20'),
        ('Notebook and Pens', 'Shopping', 275.00::NUMERIC, DATE '2026-10-22')
) AS seed(title, category, amount, expense_date)
WHERE NOT EXISTS (
    SELECT 1
    FROM expenses existing
    WHERE existing.title = seed.title
      AND existing.category = seed.category
      AND existing.amount = seed.amount
      AND existing.expense_date = seed.expense_date
);
