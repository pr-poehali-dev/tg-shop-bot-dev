import json
import os
from typing import Dict, Any, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Telegram bot webhook handler for EasyShop
    Args: event - webhook update from Telegram, context - cloud function context
    Returns: HTTP response with status 200
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        update = json.loads(event.get('body', '{}'))
        
        if 'message' in update:
            process_message(update['message'])
        elif 'callback_query' in update:
            process_callback(update['callback_query'])
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True}),
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }


def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url)


def send_telegram_message(chat_id: int, text: str, reply_markup: Optional[Dict] = None):
    import urllib.request
    import urllib.parse
    
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
    
    data = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'HTML'
    }
    
    if reply_markup:
        data['reply_markup'] = json.dumps(reply_markup)
    
    req_data = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=req_data)
    urllib.request.urlopen(req)


def process_message(message: Dict[str, Any]):
    chat_id = message['chat']['id']
    text = message.get('text', '')
    user = message['from']
    
    if text == '/start':
        send_welcome(chat_id)
    elif text == '📦 Каталог':
        send_catalog(chat_id)
    elif text == '💬 Обратная связь':
        send_contact_info(chat_id)
    elif text == '📋 Мои заказы':
        send_my_orders(chat_id, user['id'])
    else:
        send_telegram_message(chat_id, '❓ Используйте кнопки меню для навигации')


def send_welcome(chat_id: int):
    text = '''🛍️ <b>Добро пожаловать в EasyShop!</b>

Рады видеть вас в нашем магазине! 

Используйте кнопки ниже для навигации:
📦 Каталог - посмотреть товары
💬 Обратная связь - связаться с нами
📋 Мои заказы - история ваших заказов'''
    
    keyboard = {
        'keyboard': [
            [{'text': '📦 Каталог'}],
            [{'text': '💬 Обратная связь'}, {'text': '📋 Мои заказы'}]
        ],
        'resize_keyboard': True
    }
    
    send_telegram_message(chat_id, text, keyboard)


def send_catalog(chat_id: int):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('SELECT id, name, description, price, emoji FROM products ORDER BY id')
    products = cur.fetchall()
    
    cur.close()
    conn.close()
    
    text = '📦 <b>Каталог товаров</b>\n\nВыберите товар для заказа:'
    
    inline_keyboard = []
    for product in products:
        button_text = f"{product['emoji']} {product['name']} - {product['price']:,} ₽"
        inline_keyboard.append([{
            'text': button_text,
            'callback_data': f"product_{product['id']}"
        }])
    
    reply_markup = {'inline_keyboard': inline_keyboard}
    send_telegram_message(chat_id, text, reply_markup)


def send_contact_info(chat_id: int):
    text = '''💬 <b>Обратная связь</b>

Свяжитесь с нами любым удобным способом:

📞 <b>Телефон:</b> +7 (999) 123-45-67
✉️ <b>Email:</b> support@easyshop.ru
💬 <b>Telegram:</b> @easyshop_support

Мы работаем с 9:00 до 21:00 (МСК)'''
    
    send_telegram_message(chat_id, text)


def send_my_orders(chat_id: int, user_id: int):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('''
        SELECT order_number, product_name, status, created_at, start_date, end_date
        FROM orders 
        WHERE telegram_user_id = %s
        ORDER BY created_at DESC
        LIMIT 10
    ''', (user_id,))
    
    orders = cur.fetchall()
    
    cur.close()
    conn.close()
    
    if not orders:
        text = '📋 <b>Мои заказы</b>\n\nУ вас пока нет заказов.\nПосмотрите наш каталог! 📦'
    else:
        text = '📋 <b>Мои заказы</b>\n\n'
        
        status_emoji = {
            'pending': '⏳',
            'accepted': '💳',
            'processing': '⚙️',
            'completed': '✅',
            'cancelled': '❌'
        }
        
        status_text = {
            'pending': 'Ожидание принятия',
            'accepted': 'Заказ принят',
            'processing': 'Выполняется',
            'completed': 'Выполнено',
            'cancelled': 'Отменено'
        }
        
        for order in orders:
            emoji = status_emoji.get(order['status'], '📦')
            status = status_text.get(order['status'], order['status'])
            text += f"\n{emoji} <b>{order['product_name']}</b>"
            text += f"\nЗаказ: #{order['order_number']}"
            text += f"\nСтатус: {status}"
            
            if order['end_date']:
                text += f"\nГотовность: {order['end_date'].strftime('%d.%m.%Y')}"
            
            text += '\n'
    
    send_telegram_message(chat_id, text)


def process_callback(callback_query: Dict[str, Any]):
    chat_id = callback_query['message']['chat']['id']
    callback_data = callback_query['data']
    user = callback_query['from']
    
    if callback_data.startswith('product_'):
        product_id = int(callback_data.split('_')[1])
        show_product_details(chat_id, product_id, user)
    elif callback_data.startswith('order_'):
        product_id = int(callback_data.split('_')[1])
        create_order(chat_id, product_id, user)


def show_product_details(chat_id: int, product_id: int, user: Dict[str, Any]):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('SELECT id, name, description, price, emoji FROM products WHERE id = %s', (product_id,))
    product = cur.fetchone()
    
    cur.close()
    conn.close()
    
    if not product:
        send_telegram_message(chat_id, '❌ Товар не найден')
        return
    
    text = f'''{product['emoji']} <b>{product['name']}</b>

{product['description']}

💰 <b>Цена:</b> {product['price']:,} ₽

Оформить заказ?'''
    
    reply_markup = {
        'inline_keyboard': [
            [{'text': '✅ Оформить заказ', 'callback_data': f"order_{product['id']}"}],
            [{'text': '◀️ Назад к каталогу', 'callback_data': 'back_catalog'}]
        ]
    }
    
    send_telegram_message(chat_id, text, reply_markup)


def create_order(chat_id: int, product_id: int, user: Dict[str, Any]):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('SELECT id, name, price, emoji FROM products WHERE id = %s', (product_id,))
    product = cur.fetchone()
    
    if not product:
        send_telegram_message(chat_id, '❌ Товар не найден')
        cur.close()
        conn.close()
        return
    
    import time
    order_number = f"ORD-{int(time.time())}"
    customer_name = user.get('first_name', 'Клиент')
    username = user.get('username', '')
    
    cur.execute('''
        INSERT INTO orders 
        (order_number, telegram_user_id, telegram_username, customer_name, product_id, product_name, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    ''', (order_number, user['id'], username, customer_name, product['id'], product['name'], 'pending'))
    
    conn.commit()
    cur.close()
    conn.close()
    
    text = f'''🎉 <b>Заказ создан!</b>

{product['emoji']} <b>{product['name']}</b>
💰 {product['price']:,} ₽

📝 <b>Номер заказа:</b> #{order_number}
⏳ <b>Статус:</b> Ожидание принятия

Мы свяжемся с вами в ближайшее время для подтверждения!

Отследить заказ: 📋 Мои заказы'''
    
    send_telegram_message(chat_id, text)
