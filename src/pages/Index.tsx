import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

type OrderStatus = 'pending' | 'accepted' | 'processing' | 'completed' | 'cancelled';

interface Order {
  id: number;
  order_number: string;
  telegram_user_id: number;
  telegram_username: string;
  customer_name: string;
  product_name: string;
  executor: string;
  notes: string;
  status: OrderStatus;
  created_at: string;
  start_date?: string;
  end_date?: string;
}

const ADMIN_API_URL = 'https://functions.poehali.dev/b823eb44-8018-4191-b3f2-06bd4f9b653f';
const BOT_WEBHOOK_URL = 'https://functions.poehali.dev/b73d3f99-ef4a-42f2-8003-47201a0b51f9';

const statusConfig: Record<OrderStatus, { label: string; color: string; emoji: string }> = {
  pending: { label: 'Ожидание принятия', color: 'bg-yellow-500', emoji: '⏳' },
  accepted: { label: 'Заказ принят, ожидаем оплату', color: 'bg-blue-500', emoji: '💳' },
  processing: { label: 'Выполняется', color: 'bg-purple-500', emoji: '⚙️' },
  completed: { label: 'Выполнено', color: 'bg-green-500', emoji: '✅' },
  cancelled: { label: 'Отменено', color: 'bg-red-500', emoji: '❌' },
};

const Index = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [webhookSetup, setWebhookSetup] = useState(false);

  const loadOrders = async () => {
    if (!isAdminAuthenticated) return;

    try {
      setLoading(true);
      const response = await fetch(`${ADMIN_API_URL}?action=list_orders`, {
        headers: {
          'X-Admin-Password': adminPassword
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadOrders();
      const interval = setInterval(loadOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [isAdminAuthenticated]);

  const handleAdminLogin = () => {
    if (adminPassword === 'easyshop25') {
      setIsAdminAuthenticated(true);
      toast.success('✨ Вход выполнен успешно');
    } else {
      toast.error('❌ Неверный пароль');
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    try {
      const response = await fetch(ADMIN_API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        },
        body: JSON.stringify({
          order_id: orderId,
          status: newStatus
        })
      });

      if (response.ok) {
        toast.success('Статус заказа обновлен');
        loadOrders();
      }
    } catch (error) {
      toast.error('Ошибка обновления статуса');
    }
  };

  const handleUpdateExecutor = async (orderId: number, executor: string) => {
    try {
      const response = await fetch(ADMIN_API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        },
        body: JSON.stringify({
          order_id: orderId,
          executor: executor
        })
      });

      if (response.ok) {
        loadOrders();
      }
    } catch (error) {
      console.error('Error updating executor:', error);
    }
  };

  const setupWebhook = async () => {
    const botToken = prompt('Введите токен бота от @BotFather:');
    if (!botToken) return;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(BOT_WEBHOOK_URL)}`
      );
      const data = await response.json();

      if (data.ok) {
        toast.success('🎉 Webhook установлен! Бот готов к работе');
        setWebhookSetup(true);
      } else {
        toast.error('Ошибка установки webhook: ' + data.description);
      }
    } catch (error) {
      toast.error('Ошибка подключения к Telegram');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 animate-fade-in">
        {!isAdminAuthenticated ? (
          <Card className="max-w-md mx-auto shadow-2xl">
            <CardHeader>
              <div className="text-5xl mb-3 text-center">🤖</div>
              <CardTitle className="text-center">Админ-панель Telegram бота</CardTitle>
              <CardDescription className="text-center">EasyShop Bot Management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="password">Пароль админ-панели</Label>
                <Input
                  id="password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                  placeholder="Введите пароль"
                />
              </div>
              <Button 
                onClick={handleAdminLogin}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Войти
              </Button>

              <div className="pt-4 border-t space-y-3">
                <p className="text-sm text-center text-gray-600 font-semibold">
                  📖 Инструкция по запуску бота:
                </p>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal pl-5">
                  <li>Создайте бота через @BotFather в Telegram</li>
                  <li>Скопируйте токен бота</li>
                  <li>Добавьте токен в секреты проекта (TELEGRAM_BOT_TOKEN)</li>
                  <li>Нажмите "Настроить webhook" ниже</li>
                  <li>Найдите вашего бота в Telegram и напишите /start</li>
                </ol>
                
                <Button 
                  onClick={setupWebhook}
                  variant="outline"
                  className="w-full"
                  disabled={webhookSetup}
                >
                  {webhookSetup ? '✅ Webhook настроен' : '🔗 Настроить webhook'}
                </Button>

                <div className="bg-blue-50 p-3 rounded text-xs text-gray-700">
                  <div className="font-semibold mb-1">Webhook URL:</div>
                  <code className="break-all text-xs">{BOT_WEBHOOK_URL}</code>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                👑 Управление заказами
              </h2>
              <div className="flex gap-2 items-center">
                {loading && <div className="text-sm text-gray-500 animate-pulse">⟳ Обновление...</div>}
                <Button
                  onClick={setupWebhook}
                  variant="outline"
                  size="sm"
                >
                  <Icon name="Settings" className="mr-2" size={16} />
                  Webhook
                </Button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-6 animate-scale-in">
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-purple-600">{orders.length}</div>
                  <div className="text-sm text-gray-600">Всего заказов</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-yellow-600">
                    {orders.filter(o => o.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">Ожидают принятия</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">
                    {orders.filter(o => o.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">Выполнено</div>
                </div>
              </div>
            </div>
            
            {orders.length === 0 ? (
              <Card className="max-w-2xl mx-auto">
                <CardContent className="py-12 text-center">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-500 text-lg mb-2">Заказов пока нет</p>
                  <p className="text-sm text-gray-400">
                    Пользователи могут оформить заказ через Telegram бота
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto">
                {orders.map((order) => (
                  <Card key={order.id} className="shadow-lg hover:shadow-xl transition-shadow animate-fade-in">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 mb-2 flex-wrap">
                            {statusConfig[order.status].emoji} {order.product_name}
                            <Badge className={`${statusConfig[order.status].color} text-white`}>
                              {statusConfig[order.status].label}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            Заказ #{order.order_number}
                            {order.telegram_username && (
                              <> • @{order.telegram_username}</>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-500">Клиент</Label>
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-xs text-gray-500">ID: {order.telegram_user_id}</div>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Исполнитель</Label>
                          <Input
                            value={order.executor}
                            onChange={(e) => {
                              const newExecutor = e.target.value;
                              setOrders(orders.map(o => 
                                o.id === order.id ? { ...o, executor: newExecutor } : o
                              ));
                            }}
                            onBlur={(e) => handleUpdateExecutor(order.id, e.target.value)}
                            placeholder="Назначить исполнителя"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {order.notes && (
                        <div>
                          <Label className="text-xs text-gray-500">Примечания</Label>
                          <div className="mt-1 p-2 bg-gray-50 rounded text-sm">{order.notes}</div>
                        </div>
                      )}

                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-gray-500">Создан</Label>
                          <div>{new Date(order.created_at).toLocaleString('ru-RU')}</div>
                        </div>
                        {order.start_date && (
                          <div>
                            <Label className="text-xs text-gray-500">Начало</Label>
                            <div>{new Date(order.start_date).toLocaleDateString('ru-RU')}</div>
                          </div>
                        )}
                        {order.end_date && (
                          <div>
                            <Label className="text-xs text-gray-500">Завершение</Label>
                            <div className="font-medium text-purple-600">
                              {new Date(order.end_date).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-xs text-gray-500 mb-2 block">Изменить статус</Label>
                        <Select
                          value={order.status}
                          onValueChange={(value: OrderStatus) => handleUpdateOrderStatus(order.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([status, config]) => (
                              <SelectItem key={status} value={status}>
                                {config.emoji} {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
