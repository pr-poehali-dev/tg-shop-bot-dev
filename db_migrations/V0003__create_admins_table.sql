CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    telegram_user_id BIGINT UNIQUE NOT NULL,
    telegram_username VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    added_by_user_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admins (telegram_user_id, telegram_username, full_name, added_by_user_id)
SELECT 
    (SELECT telegram_user_id FROM orders WHERE telegram_username = 'skzry' LIMIT 1),
    'skzry',
    'Main Admin',
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM admins WHERE telegram_username = 'skzry'
);

CREATE INDEX idx_admins_telegram_user_id ON admins(telegram_user_id);