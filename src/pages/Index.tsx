import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  emoji: string;
}

interface FeedbackMessage {
  id: number;
  telegram_user_id: number;
  telegram_username: string;
  customer_name: string;
  message: string;
  admin_reply: string;
  is_replied: boolean;
  created_at: string;
  replied_at?: string;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([]);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [webhookSetup, setWebhookSetup] = useState(false);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<FeedbackMessage | null>(null);
  const [replyText, setReplyText] = useState('');

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
        const newOrders = data.orders || [];
        
        if (lastOrderCount > 0 && newOrders.length > lastOrderCount) {
          toast.success('🔔 Получен новый заказ! Просмотрите', {
            duration: 10000,
          });
        }
        
        setOrders(newOrders);
        setLastOrderCount(newOrders.length);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    if (!isAdminAuthenticated) return;

    try {
      const response = await fetch(`${ADMIN_API_URL}?action=list_products`, {
        headers: {
          'X-Admin-Password': adminPassword
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadFeedback = async () => {
    if (!isAdminAuthenticated) return;

    try {
      const response = await fetch(`${ADMIN_API_URL}?action=list_feedback`, {
        headers: {
          'X-Admin-Password': adminPassword
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFeedbackMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadOrders();
      loadProducts();
      loadFeedback();
      const interval = setInterval(() => {
        loadOrders();
        loadFeedback();
      }, 5000);
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

  const handleUpdateEndDate = async (orderId: number, endDate: string) => {
    try {
      const response = await fetch(ADMIN_API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        },
        body: JSON.stringify({
          order_id: orderId,
          end_date: endDate
        })
      });

      if (response.ok) {
        toast.success('Дата готовности обновлена');
        loadOrders();
      }
    } catch (error) {
      toast.error('Ошибка обновления даты');
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm('Удалить этот заказ?')) return;

    try {
      const response = await fetch(ADMIN_API_URL, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        },
        body: JSON.stringify({
          order_id: orderId
        })
      });

      if (response.ok) {
        toast.success('Заказ удален');
        loadOrders();
      }
    } catch (error) {
      toast.error('Ошибка удаления заказа');
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;

    try {
      const isNew = !editingProduct.id;
      const response = await fetch(
        `${ADMIN_API_URL}?action=${isNew ? 'add_product' : 'update_product'}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': adminPassword
          },
          body: JSON.stringify(editingProduct)
        }
      );

      if (response.ok) {
        toast.success(isNew ? 'Товар добавлен' : 'Товар обновлен');
        loadProducts();
        setProductDialogOpen(false);
        setEditingProduct(null);
      }
    } catch (error) {
      toast.error('Ошибка сохранения товара');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Удалить этот товар?')) return;

    try {
      const response = await fetch(ADMIN_API_URL, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        },
        body: JSON.stringify({
          product_id: productId
        })
      });

      if (response.ok) {
        toast.success('Товар удален');
        loadProducts();
      }
    } catch (error) {
      toast.error('Ошибка удаления товара');
    }
  };

  const handleSendReply = async () => {
    if (!replyingTo || !replyText.trim()) return;

    try {
      const response = await fetch(`${ADMIN_API_URL}?action=send_feedback_reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword
        },
        body: JSON.stringify({
          message_id: replyingTo.id,
          admin_reply: replyText
        })
      });

      if (response.ok) {
        toast.success('Ответ отправлен клиенту');
        setReplyingTo(null);
        setReplyText('');
        loadFeedback();
      }
    } catch (error) {
      toast.error('Ошибка отправки ответа');
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
                👑 Админ-панель
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

            <Tabs defaultValue="orders" className="w-full">
              <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 mb-6">
                <TabsTrigger value="orders">📦 Заказы</TabsTrigger>
                <TabsTrigger value="catalog">🛍️ Каталог</TabsTrigger>
                <TabsTrigger value="feedback">
                  💬 Обратная связь
                  {feedbackMessages.filter(m => !m.is_replied).length > 0 && (
                    <Badge className="ml-2 bg-red-500">
                      {feedbackMessages.filter(m => !m.is_replied).length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteOrder(order.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Icon name="Trash2" size={18} />
                            </Button>
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
                            <div>
                              <Label className="text-xs text-gray-500">Дата готовности</Label>
                              <Input
                                type="date"
                                value={order.end_date ? new Date(order.end_date).toISOString().split('T')[0] : ''}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleUpdateEndDate(order.id, new Date(e.target.value).toISOString());
                                  }
                                }}
                                className="mt-1"
                              />
                            </div>
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
              </TabsContent>

              <TabsContent value="catalog">
                <div className="max-w-4xl mx-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Управление каталогом</h3>
                    <Button
                      onClick={() => {
                        setEditingProduct({ id: 0, name: '', description: '', price: 0, emoji: '📦' });
                        setProductDialogOpen(true);
                      }}
                      className="bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      <Icon name="Plus" className="mr-2" size={18} />
                      Добавить товар
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {products.map((product) => (
                      <Card key={product.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-4xl">{product.emoji}</div>
                              <div>
                                <CardTitle className="text-lg">{product.name}</CardTitle>
                                <CardDescription>{product.description}</CardDescription>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setProductDialogOpen(true);
                                }}
                              >
                                <Icon name="Pencil" size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Icon name="Trash2" size={16} />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-purple-600">
                            {product.price.toLocaleString('ru-RU')} ₽
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="feedback">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold">Сообщения от клиентов</h3>
                    <p className="text-sm text-gray-500">Непрочитанные сообщения отображаются первыми</p>
                  </div>

                  {feedbackMessages.length === 0 ? (
                    <Card className="max-w-2xl mx-auto">
                      <CardContent className="py-12 text-center">
                        <div className="text-6xl mb-4">💬</div>
                        <p className="text-gray-500 text-lg mb-2">Сообщений пока нет</p>
                        <p className="text-sm text-gray-400">
                          Клиенты могут написать через раздел "Обратная связь" в боте
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {feedbackMessages.map((feedback) => (
                        <Card key={feedback.id} className={`shadow-lg hover:shadow-xl transition-shadow ${
                          !feedback.is_replied ? 'border-2 border-yellow-400' : ''
                        }`}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="flex items-center gap-2 mb-2 flex-wrap">
                                  {feedback.is_replied ? '✅' : '⏳'} {feedback.customer_name}
                                  {!feedback.is_replied && (
                                    <Badge className="bg-yellow-500 text-white">Ожидает ответа</Badge>
                                  )}
                                </CardTitle>
                                <CardDescription>
                                  {feedback.telegram_username && (
                                    <>@{feedback.telegram_username} • </>
                                  )}
                                  {new Date(feedback.created_at).toLocaleString('ru-RU')}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label className="text-xs text-gray-500">Сообщение клиента</Label>
                              <div className="mt-1 p-3 bg-blue-50 rounded-lg text-sm">
                                {feedback.message}
                              </div>
                            </div>

                            {feedback.is_replied && feedback.admin_reply ? (
                              <div>
                                <Label className="text-xs text-gray-500">Ваш ответ</Label>
                                <div className="mt-1 p-3 bg-green-50 rounded-lg text-sm">
                                  {feedback.admin_reply}
                                </div>
                                {feedback.replied_at && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    Отправлено: {new Date(feedback.replied_at).toLocaleString('ru-RU')}
                                  </div>
                                )}
                              </div>
                            ) : replyingTo?.id === feedback.id ? (
                              <div className="space-y-2">
                                <Label>Ваш ответ</Label>
                                <Textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Напишите ответ клиенту..."
                                  rows={4}
                                />
                                <div className="flex gap-2">
                                  <Button onClick={handleSendReply} className="bg-green-600 hover:bg-green-700">
                                    <Icon name="Send" className="mr-2" size={16} />
                                    Отправить
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyText('');
                                    }}
                                  >
                                    Отмена
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                onClick={() => {
                                  setReplyingTo(feedback);
                                  setReplyText('');
                                }}
                                className="bg-gradient-to-r from-purple-600 to-pink-600"
                              >
                                <Icon name="MessageSquare" className="mr-2" size={16} />
                                Ответить
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct?.id ? 'Редактировать товар' : 'Добавить товар'}</DialogTitle>
            <DialogDescription>Заполните информацию о товаре</DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="emoji">Эмодзи</Label>
                <Input
                  id="emoji"
                  value={editingProduct.emoji}
                  onChange={(e) => setEditingProduct({ ...editingProduct, emoji: e.target.value })}
                  placeholder="📦"
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="Название товара"
                />
              </div>
              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Описание товара"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="price">Цена (₽)</Label>
                <Input
                  id="price"
                  type="number"
                  value={editingProduct.price || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <Button onClick={handleSaveProduct} className="w-full">
                Сохранить
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;