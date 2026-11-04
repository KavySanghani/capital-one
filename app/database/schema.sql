CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,

    title VARCHAR(120) NOT NULL
        CHECK (CHAR_LENGTH(TRIM(title)) BETWEEN 1 AND 120),

    category VARCHAR(50) NOT NULL
        CHECK (CHAR_LENGTH(TRIM(category)) BETWEEN 1 AND 50),

    amount NUMERIC(12, 2) NOT NULL
        CHECK (amount > 0),

    expense_date DATE NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date
    ON expenses (expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_category
    ON expenses (category);
