import json
import os
from typing import Dict, Any, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

ADMIN_USERNAME = 'skzry'

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


def is_admin(user: Dict[str, Any]) -> bool:
    return user.get('username', '').lower() == ADMIN_USERNAME.lower()


user_states = {}

def process_message(message: Dict[str, Any]):
    chat_id = message['chat']['id']
    text = message.get('text', '')
    user = message['from']
    
    if text == '/start':
        user_states.pop(chat_id, None)
        send_welcome(chat_id, user)
    elif text == '/admin' and is_admin(user):
        user_states.pop(chat_id, None)
        send_admin_panel(chat_id)
    elif text == '📦 Каталог':
        user_states.pop(chat_id, None)
        send_catalog(chat_id)
    elif text == '💬 Обратная связь':
        user_states[chat_id] = 'awaiting_feedback'
        send_feedback_prompt(chat_id)
    elif text == '📋 Мои заказы':
        user_states.pop(chat_id, None)
        send_my_orders(chat_id, user['id'])
    elif text == '🔙 Назад':
        user_states.pop(chat_id, None)
        send_welcome(chat_id, user)
    elif user_states.get(chat_id) == 'awaiting_feedback':
        save_feedback_message(chat_id, user, text)
        user_states.pop(chat_id, None)
    elif user_states.get(chat_id, {}).get('type') == 'awaiting_product_name' and is_admin(user):
        handle_new_product_name(chat_id, text)
    elif user_states.get(chat_id, {}).get('type') == 'awaiting_product_description' and is_admin(user):
        handle_new_product_description(chat_id, text)
    elif user_states.get(chat_id, {}).get('type') == 'awaiting_product_price' and is_admin(user):
        handle_new_product_price(chat_id, text)
    elif user_states.get(chat_id, {}).get('type') == 'awaiting_product_emoji' and is_admin(user):
        handle_new_product_emoji(chat_id, text)
    elif user_states.get(chat_id, {}).get('type') == 'awaiting_feedback_reply' and is_admin(user):
        handle_feedback_reply(chat_id, text)
    else:
        send_telegram_message(chat_id, '❓ Используйте кнопки меню для навигации')


def send_welcome(chat_id: int, user: Dict[str, Any]):
    text = '''🛍️ <b>Добро пожаловать в EasyShop!</b>

Рады видеть вас в нашем магазине! 

Используйте кнопки ниже для навигации:
📦 Каталог - посмотреть товары
💬 Обратная связь - связаться с нами
📋 Мои заказы - история ваших заказов'''
    
    keyboard_buttons = [
        [{'text': '📦 Каталог'}],
        [{'text': '💬 Обратная связь'}, {'text': '📋 Мои заказы'}]
    ]
    
    if is_admin(user):
        text += '\n\n⚙️ Админ-панель доступна по команде /admin'
    
    keyboard = {
        'keyboard': keyboard_buttons,
        'resize_keyboard': True
    }
    
    send_telegram_message(chat_id, text, keyboard)


def send_admin_panel(chat_id: int):
    text = '''⚙️ <b>Админ-панель EasyShop</b>

Выберите действие:'''
    
    inline_keyboard = [
        [{'text': '📦 Все заказы', 'callback_data': 'admin_orders'}],
        [{'text': '💬 Обратная связь', 'callback_data': 'admin_feedback'}],
        [{'text': '📦 Управление товарами', 'callback_data': 'admin_products'}],
        [{'text': '🔙 Назад', 'callback_data': 'admin_back'}]
    ]
    
    reply_markup = {'inline_keyboard': inline_keyboard}
    send_telegram_message(chat_id, text, reply_markup)


def send_admin_orders(chat_id: int):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('''
        SELECT id, order_number, customer_name, product_name, 
               executor, status, created_at, end_date
        FROM orders
        ORDER BY 
            CASE status
                WHEN 'pending' THEN 1
                WHEN 'accepted' THEN 2
                WHEN 'processing' THEN 3
                WHEN 'completed' THEN 4
                ELSE 5
            END,
            created_at DESC
        LIMIT 20
    ''')
    
    orders = cur.fetchall()
    cur.close()
    conn.close()
    
    if not orders:
        text = '📦 <b>Заказы</b>\n\nНет заказов'
        inline_keyboard = [[{'text': '🔙 Назад', 'callback_data': 'admin_panel'}]]
    else:
        text = '📦 <b>Все заказы</b> (последние 20)\n\n'
        
        status_emoji = {
            'pending': '⏳',
            'accepted': '💳',
            'processing': '⚙️',
            'completed': '✅',
            'cancelled': '❌'
        }
        
        inline_keyboard = []
        for order in orders:
            emoji = status_emoji.get(order['status'], '📦')
            button_text = f"{emoji} {order['customer_name']} - {order['product_name'][:20]}"
            inline_keyboard.append([{
                'text': button_text,
                'callback_data': f"admin_order_{order['id']}"
            }])
        
        inline_keyboard.append([{'text': '🔙 Назад', 'callback_data': 'admin_panel'}])
    
    reply_markup = {'inline_keyboard': inline_keyboard}
    send_telegram_message(chat_id, text, reply_markup)


def send_admin_order_details(chat_id: int, order_id: int):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('''
        SELECT id, order_number, telegram_user_id, telegram_username, 
               customer_name, product_name, executor, notes, status, 
               created_at, start_date, end_date
        FROM orders
        WHERE id = %s
    ''', (order_id,))
    
    order = cur.fetchone()
    cur.close()
    conn.close()
    
    if not order:
        send_telegram_message(chat_id, '❌ Заказ не найден')
        return
    
    status_text = {
        'pending': 'Ожидание принятия',
        'accepted': 'Заказ принят',
        'processing': 'Выполняется',
        'completed': 'Выполнено',
        'cancelled': 'Отменено'
    }
    
    text = f'''📦 <b>Заказ #{order['order_number']}</b>

👤 <b>Клиент:</b> {order['customer_name']}
📱 <b>Username:</b> @{order['telegram_username'] or 'не указан'}
🎁 <b>Товар:</b> {order['product_name']}
📝 <b>Исполнитель:</b> {order['executor'] or 'Не назначен'}
📊 <b>Статус:</b> {status_text.get(order['status'], order['status'])}

📅 <b>Создан:</b> {order['created_at'].strftime('%d.%m.%Y %H:%M')}
🎯 <b>Срок:</b> {order['end_date'].strftime('%d.%m.%Y') if order['end_date'] else 'Не указан'}

{f"💬 <b>Примечания:</b> {order['notes']}" if order['notes'] else ""}'''
    
    inline_keyboard = [
        [
            {'text': '✅ Принять', 'callback_data': f"order_accept_{order_id}"},
            {'text': '❌ Отменить', 'callback_data': f"order_cancel_{order_id}"}
        ],
        [
            {'text': '⚙️ В работу', 'callback_data': f"order_processing_{order_id}"},
            {'text': '🎉 Завершить', 'callback_data': f"order_complete_{order_id}"}
        ],
        [{'text': '🔙 К списку', 'callback_data': 'admin_orders'}]
    ]
    
    reply_markup = {'inline_keyboard': inline_keyboard}
    send_telegram_message(chat_id, text, reply_markup)


def send_admin_feedback(chat_id: int):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('''
        SELECT id, customer_name, telegram_username, message, 
               is_replied, created_at
        FROM feedback_messages
        ORDER BY is_replied ASC, created_at DESC
        LIMIT 20
    ''')
    
    messages = cur.fetchall()
    cur.close()
    conn.close()
    
    if not messages:
        text = '💬 <b>Обратная связь</b>\n\nНет сообщений'
        inline_keyboard = [[{'text': '🔙 Назад', 'callback_data': 'admin_panel'}]]
    else:
        unreplied_count = sum(1 for m in messages if not m['is_replied'])
        text = f'💬 <b>Обратная связь</b>\n\nНовых: {unreplied_count}\n\n'
        
        inline_keyboard = []
        for msg in messages:
            emoji = '❗' if not msg['is_replied'] else '✅'
            preview = msg['message'][:30] + '...' if len(msg['message']) > 30 else msg['message']
            button_text = f"{emoji} {msg['customer_name']}: {preview}"
            inline_keyboard.append([{
                'text': button_text,
                'callback_data': f"admin_feedback_{msg['id']}"
            }])
        
        inline_keyboard.append([{'text': '🔙 Назад', 'callback_data': 'admin_panel'}])
    
    reply_markup = {'inline_keyboard': inline_keyboard}
    send_telegram_message(chat_id, text, reply_markup)


def send_admin_feedback_details(chat_id: int, message_id: int):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('''
        SELECT id, telegram_user_id, telegram_username, customer_name,
               message, admin_reply, is_replied, created_at, replied_at
        FROM feedback_messages
        WHERE id = %s
    ''', (message_id,))
    
    feedback = cur.fetchone()
    cur.close()
    conn.close()
    
    if not feedback:
        send_telegram_message(chat_id, '❌ Сообщение не найдено')
        return
    
    text = f'''💬 <b>Сообщение от клиента</b>

👤 <b>От:</b> {feedback['customer_name']}
📱 <b>Username:</b> @{feedback['telegram_username'] or 'не указан'}
📅 <b>Дата:</b> {feedback['created_at'].strftime('%d.%m.%Y %H:%M')}

💬 <b>Сообщение:</b>
{feedback['message']}'''
    
    if feedback['is_replied'] and feedback['admin_reply']:
        text += f"\n\n✅ <b>Ваш ответ:</b>\n{feedback['admin_reply']}"
        text += f"\n📅 {feedback['replied_at'].strftime('%d.%m.%Y %H:%M')}"
        inline_keyboard = [[{'text': '🔙 К списку', 'callback_data': 'admin_feedback'}]]
    else:
        inline_keyboard = [
            [{'text': '✉️ Ответить', 'callback_data': f"feedback_reply_{message_id}"}],
            [{'text': '🔙 К списку', 'callback_data': 'admin_feedback'}]
        ]
    
    reply_markup = {'inline_keyboard': inline_keyboard}
    send_telegram_message(chat_id, text, reply_markup)


def send_admin_products(chat_id: int):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('SELECT id, name, emoji, price FROM products ORDER BY id')
    products = cur.fetchall()
    
    cur.close()
    conn.close()
    
    text = '📦 <b>Управление товарами</b>\n\n'
    
    inline_keyboard = []
    for product in products:
        button_text = f"{product['emoji']} {product['name']} - {product['price']:,} ₽"
        inline_keyboard.append([{
            'text': button_text,
            'callback_data': f"admin_product_{product['id']}"
        }])
    
    inline_keyboard.append([{'text': '➕ Добавить товар', 'callback_data': 'admin_product_add'}])
    inline_keyboard.append([{'text': '🔙 Назад', 'callback_data': 'admin_panel'}])
    
    reply_markup = {'inline_keyboard': inline_keyboard}
    send_telegram_message(chat_id, text, reply_markup)


def send_admin_product_details(chat_id: int, product_id: int):
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

📝 {product['description']}

💰 <b>Цена:</b> {product['price']:,} ₽'''
    
    inline_keyboard = [
        [{'text': '🗑️ Удалить товар', 'callback_data': f"product_delete_{product_id}"}],
        [{'text': '🔙 К списку', 'callback_data': 'admin_products'}]
    ]
    
    reply_markup = {'inline_keyboard': inline_keyboard}
    send_telegram_message(chat_id, text, reply_markup)


def start_add_product(chat_id: int):
    user_states[chat_id] = {'type': 'awaiting_product_name', 'product': {}}
    send_telegram_message(chat_id, '📝 Введите название товара:')


def handle_new_product_name(chat_id: int, name: str):
    user_states[chat_id]['product']['name'] = name
    user_states[chat_id]['type'] = 'awaiting_product_description'
    send_telegram_message(chat_id, '📝 Введите описание товара:')


def handle_new_product_description(chat_id: int, description: str):
    user_states[chat_id]['product']['description'] = description
    user_states[chat_id]['type'] = 'awaiting_product_price'
    send_telegram_message(chat_id, '💰 Введите цену товара (только число):')


def handle_new_product_price(chat_id: int, price_text: str):
    try:
        price = int(price_text.replace(' ', '').replace(',', ''))
        user_states[chat_id]['product']['price'] = price
        user_states[chat_id]['type'] = 'awaiting_product_emoji'
        send_telegram_message(chat_id, '🎨 Введите эмодзи для товара (например: 🎁):')
    except ValueError:
        send_telegram_message(chat_id, '❌ Ошибка! Введите корректное число:')


def handle_new_product_emoji(chat_id: int, emoji: str):
    product_data = user_states[chat_id]['product']
    product_data['emoji'] = emoji
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('''
        INSERT INTO products (name, description, price, emoji)
        VALUES (%s, %s, %s, %s)
    ''', (product_data['name'], product_data['description'], product_data['price'], product_data['emoji']))
    
    conn.commit()
    cur.close()
    conn.close()
    
    user_states.pop(chat_id, None)
    
    text = f'''✅ <b>Товар добавлен!</b>

{emoji} <b>{product_data['name']}</b>
{product_data['description']}
💰 {product_data['price']:,} ₽'''
    
    inline_keyboard = [[{'text': '📦 К списку товаров', 'callback_data': 'admin_products'}]]
    reply_markup = {'inline_keyboard': inline_keyboard}
    send_telegram_message(chat_id, text, reply_markup)


def start_feedback_reply(chat_id: int, message_id: int):
    user_states[chat_id] = {'type': 'awaiting_feedback_reply', 'message_id': message_id}
    send_telegram_message(chat_id, '✉️ Введите ответ клиенту:')


def handle_feedback_reply(chat_id: int, reply_text: str):
    message_id = user_states[chat_id]['message_id']
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('''
        SELECT telegram_user_id, customer_name, message
        FROM feedback_messages
        WHERE id = %s
    ''', (message_id,))
    
    feedback = cur.fetchone()
    
    if feedback:
        replied_at = datetime.now()
        
        cur.execute('''
            UPDATE feedback_messages
            SET admin_reply = %s, is_replied = TRUE, replied_at = %s
            WHERE id = %s
        ''', (reply_text, replied_at, message_id))
        
        conn.commit()
        
        notification_text = f'''📨 <b>Ответ от поддержки EasyShop</b>

💬 <b>Ваш вопрос:</b>
{feedback['message']}

👤 <b>Ответ:</b>
{reply_text}'''
        
        send_telegram_message(feedback['telegram_user_id'], notification_text)
        send_telegram_message(chat_id, '✅ Ответ отправлен клиенту!')
    
    cur.close()
    conn.close()
    user_states.pop(chat_id, None)
    
    inline_keyboard = [[{'text': '🔙 К списку', 'callback_data': 'admin_feedback'}]]
    reply_markup = {'inline_keyboard': inline_keyboard}
    send_telegram_message(chat_id, '✅ Ответ успешно отправлен!', reply_markup)


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


def send_feedback_prompt(chat_id: int):
    text = '''💬 <b>Обратная связь</b>

Напишите ваше сообщение, и мы ответим вам в ближайшее время!

Введите текст вашего вопроса или предложения:'''
    
    send_telegram_message(chat_id, text)


def save_feedback_message(chat_id: int, user: Dict[str, Any], message_text: str):
    conn = get_db_connection()
    cur = conn.cursor()
    
    customer_name = user.get('first_name', 'Клиент')
    username = user.get('username', '')
    
    cur.execute('''
        INSERT INTO feedback_messages 
        (telegram_user_id, telegram_username, customer_name, message)
        VALUES (%s, %s, %s, %s)
    ''', (user['id'], username, customer_name, message_text))
    
    conn.commit()
    cur.close()
    conn.close()
    
    text = '''✅ <b>Сообщение отправлено!</b>

Спасибо за обращение! Мы получили ваше сообщение и ответим в ближайшее время.

Используйте кнопки меню для продолжения работы.'''
    
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
    
    if callback_data == 'admin_panel' and is_admin(user):
        send_admin_panel(chat_id)
    elif callback_data == 'admin_orders' and is_admin(user):
        send_admin_orders(chat_id)
    elif callback_data.startswith('admin_order_') and is_admin(user):
        order_id = int(callback_data.split('_')[2])
        send_admin_order_details(chat_id, order_id)
    elif callback_data == 'admin_feedback' and is_admin(user):
        send_admin_feedback(chat_id)
    elif callback_data.startswith('admin_feedback_') and is_admin(user):
        message_id = int(callback_data.split('_')[2])
        send_admin_feedback_details(chat_id, message_id)
    elif callback_data.startswith('feedback_reply_') and is_admin(user):
        message_id = int(callback_data.split('_')[2])
        start_feedback_reply(chat_id, message_id)
    elif callback_data == 'admin_products' and is_admin(user):
        send_admin_products(chat_id)
    elif callback_data.startswith('admin_product_') and is_admin(user):
        product_id = int(callback_data.split('_')[2])
        send_admin_product_details(chat_id, product_id)
    elif callback_data == 'admin_product_add' and is_admin(user):
        start_add_product(chat_id)
    elif callback_data.startswith('product_delete_') and is_admin(user):
        product_id = int(callback_data.split('_')[2])
        delete_product(chat_id, product_id)
    elif callback_data.startswith('order_accept_') and is_admin(user):
        order_id = int(callback_data.split('_')[2])
        update_order_status(chat_id, order_id, 'accepted')
    elif callback_data.startswith('order_cancel_') and is_admin(user):
        order_id = int(callback_data.split('_')[2])
        update_order_status(chat_id, order_id, 'cancelled')
    elif callback_data.startswith('order_processing_') and is_admin(user):
        order_id = int(callback_data.split('_')[2])
        update_order_status(chat_id, order_id, 'processing')
    elif callback_data.startswith('order_complete_') and is_admin(user):
        order_id = int(callback_data.split('_')[2])
        update_order_status(chat_id, order_id, 'completed')
    elif callback_data == 'admin_back' and is_admin(user):
        send_welcome(chat_id, user)
    elif callback_data.startswith('product_'):
        product_id = int(callback_data.split('_')[1])
        show_product_details(chat_id, product_id, user)
    elif callback_data.startswith('order_'):
        product_id = int(callback_data.split('_')[1])
        create_order(chat_id, product_id, user)


def update_order_status(chat_id: int, order_id: int, new_status: str):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('SELECT telegram_user_id, order_number FROM orders WHERE id = %s', (order_id,))
    order = cur.fetchone()
    
    if order:
        cur.execute('UPDATE orders SET status = %s WHERE id = %s', (new_status, order_id))
        conn.commit()
        
        status_text = {
            'pending': 'Ожидание принятия',
            'accepted': 'Заказ принят',
            'processing': 'Выполняется',
            'completed': 'Выполнено',
            'cancelled': 'Отменено'
        }
        
        notification = f'''📦 <b>Статус заказа изменен</b>

Заказ #{order['order_number']}
Новый статус: {status_text.get(new_status, new_status)}'''
        
        send_telegram_message(order['telegram_user_id'], notification)
        send_telegram_message(chat_id, f'✅ Статус заказа обновлен на: {status_text.get(new_status, new_status)}')
        send_admin_order_details(chat_id, order_id)
    
    cur.close()
    conn.close()


def delete_product(chat_id: int, product_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('DELETE FROM products WHERE id = %s', (product_id,))
    conn.commit()
    
    cur.close()
    conn.close()
    
    send_telegram_message(chat_id, '✅ Товар удален!')
    send_admin_products(chat_id)


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

📝 {product['description']}

💰 <b>Цена:</b> {product['price']:,} ₽'''
    
    inline_keyboard = [
        [{'text': '🛒 Заказать', 'callback_data': f"order_{product_id}"}],
        [{'text': '🔙 К каталогу', 'callback_data': 'back_to_catalog'}]
    ]
    
    reply_markup = {'inline_keyboard': inline_keyboard}
    send_telegram_message(chat_id, text, reply_markup)


def create_order(chat_id: int, product_id: int, user: Dict[str, Any]):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('SELECT name, price FROM products WHERE id = %s', (product_id,))
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
    
    start_date = datetime.now()
    end_date = start_date + timedelta(days=7)
    
    cur.execute('''
        INSERT INTO orders 
        (order_number, telegram_user_id, telegram_username, customer_name, 
         product_name, status, start_date, end_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    ''', (order_number, user['id'], username, customer_name, 
          product['name'], 'pending', start_date, end_date))
    
    conn.commit()
    cur.close()
    conn.close()
    
    text = f'''✅ <b>Заказ оформлен!</b>

📦 {product['name']}
💰 {product['price']:,} ₽
📋 Номер заказа: #{order_number}

Мы свяжемся с вами в ближайшее время для подтверждения.
Отслеживайте статус в разделе "Мои заказы".'''
    
    send_telegram_message(chat_id, text)
