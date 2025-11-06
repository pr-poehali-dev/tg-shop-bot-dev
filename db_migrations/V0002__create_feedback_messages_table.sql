CREATE TABLE IF NOT EXISTS feedback_messages (
    id SERIAL PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL,
    telegram_username VARCHAR(255),
    customer_name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    admin_reply TEXT,
    is_replied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    replied_at TIMESTAMP
);

CREATE INDEX idx_feedback_telegram_user_id ON feedback_messages(telegram_user_id);
CREATE INDEX idx_feedback_is_replied ON feedback_messages(is_replied);