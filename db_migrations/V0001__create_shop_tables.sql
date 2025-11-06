CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    telegram_user_id BIGINT NOT NULL,
    telegram_username VARCHAR(255),
    customer_name VARCHAR(255) NOT NULL,
    product_id INTEGER REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    executor VARCHAR(255) DEFAULT 'Не назначен',
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_telegram_user_id ON orders(telegram_user_id);
CREATE INDEX idx_orders_status ON orders(status);

INSERT INTO products (name, description, price, emoji) VALUES
('Кроссовки Nike Air', 'Удобные спортивные кроссовки', 8999, '👟'),
('Рюкзак Urban', 'Стильный городской рюкзак', 3499, '🎒'),
('Наушники Pro', 'Беспроводные наушники с ANC', 12999, '🎧'),
('Умные часы', 'Фитнес-трекер с монитором', 15999, '⌚'),
('Термос Steel', 'Вакуумный термос 500мл', 1299, '☕'),
('Power Bank', 'Портативная зарядка 20000мАч', 2499, '🔋');