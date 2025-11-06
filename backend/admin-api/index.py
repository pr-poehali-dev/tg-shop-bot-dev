import json
import os
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Admin API for managing orders and products
    Args: event - HTTP request with method, body, queryStringParameters
    Returns: HTTP response with orders/products data or update status
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    admin_password = headers.get('x-admin-password', headers.get('X-Admin-Password', ''))
    
    if admin_password != 'easyshop25':
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Unauthorized'}),
            'isBase64Encoded': False
        }
    
    path = event.get('queryStringParameters', {}).get('action', 'list_orders')
    
    if method == 'GET':
        if path == 'list_orders':
            return get_orders()
        elif path == 'list_products':
            return get_products()
    
    elif method == 'POST':
        body = json.loads(event.get('body', '{}'))
        if path == 'add_product':
            return add_product(body)
    
    elif method == 'PUT':
        body = json.loads(event.get('body', '{}'))
        
        if path == 'update_product':
            return update_product(body)
        
        order_id = body.get('order_id')
        
        if 'status' in body:
            return update_order_status(order_id, body)
        elif 'executor' in body:
            return update_order_executor(order_id, body.get('executor'))
        elif 'end_date' in body:
            return update_order_end_date(order_id, body.get('end_date'))
    
    elif method == 'DELETE':
        body = json.loads(event.get('body', '{}'))
        if 'order_id' in body:
            return delete_order(body.get('order_id'))
        elif 'product_id' in body:
            return delete_product(body.get('product_id'))
    
    return {
        'statusCode': 400,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': 'Invalid request'}),
        'isBase64Encoded': False
    }


def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url)


def get_orders():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('''
        SELECT id, order_number, telegram_user_id, telegram_username, 
               customer_name, product_name, executor, notes, status,
               start_date, end_date, created_at
        FROM orders 
        ORDER BY created_at DESC
    ''')
    
    orders = cur.fetchall()
    cur.close()
    conn.close()
    
    orders_list = []
    for order in orders:
        order_dict = dict(order)
        for key in ['created_at', 'start_date', 'end_date']:
            if order_dict.get(key):
                order_dict[key] = order_dict[key].isoformat()
        orders_list.append(order_dict)
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'orders': orders_list}),
        'isBase64Encoded': False
    }


def get_products():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute('SELECT id, name, description, price, emoji FROM products ORDER BY id')
    products = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'products': [dict(p) for p in products]}),
        'isBase64Encoded': False
    }


def update_order_status(order_id: int, body: Dict[str, Any]):
    conn = get_db_connection()
    cur = conn.cursor()
    
    status = body.get('status')
    
    if status in ['accepted', 'processing']:
        start_date = datetime.now()
        end_date = start_date + timedelta(days=3)
        
        cur.execute('''
            UPDATE orders 
            SET status = %s, start_date = %s, end_date = %s
            WHERE id = %s
        ''', (status, start_date, end_date, order_id))
    else:
        cur.execute('UPDATE orders SET status = %s WHERE id = %s', (status, order_id))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }


def update_order_executor(order_id: int, executor: str):
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('UPDATE orders SET executor = %s WHERE id = %s', (executor, order_id))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }


def update_order_end_date(order_id: int, end_date_str: str):
    conn = get_db_connection()
    cur = conn.cursor()
    
    end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
    cur.execute('UPDATE orders SET end_date = %s WHERE id = %s', (end_date, order_id))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }


def delete_order(order_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('DELETE FROM orders WHERE id = %s', (order_id,))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }


def add_product(body: Dict[str, Any]):
    conn = get_db_connection()
    cur = conn.cursor()
    
    name = body.get('name')
    description = body.get('description')
    price = body.get('price')
    emoji = body.get('emoji')
    
    cur.execute('''
        INSERT INTO products (name, description, price, emoji)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    ''', (name, description, price, emoji))
    
    product_id = cur.fetchone()[0]
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'success': True, 'id': product_id}),
        'isBase64Encoded': False
    }


def update_product(body: Dict[str, Any]):
    conn = get_db_connection()
    cur = conn.cursor()
    
    product_id = body.get('id')
    name = body.get('name')
    description = body.get('description')
    price = body.get('price')
    emoji = body.get('emoji')
    
    cur.execute('''
        UPDATE products 
        SET name = %s, description = %s, price = %s, emoji = %s
        WHERE id = %s
    ''', (name, description, price, emoji, product_id))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }


def delete_product(product_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('DELETE FROM products WHERE id = %s', (product_id,))
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }