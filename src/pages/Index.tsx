import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

type OrderStatus = 'pending' | 'accepted' | 'processing' | 'completed' | 'cancelled';

interface Order {
  id: string;
  productName: string;
  customerName: string;
  executor: string;
  notes: string;
  status: OrderStatus;
  createdAt: Date;
  startDate?: Date;
  endDate?: Date;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
}

const mockProducts: Product[] = [
  { id: '1', name: 'Кроссовки Nike Air', description: 'Удобные спортивные кроссовки', price: 8999, emoji: '👟' },
  { id: '2', name: 'Рюкзак Urban', description: 'Стильный городской рюкзак', price: 3499, emoji: '🎒' },
  { id: '3', name: 'Наушники Pro', description: 'Беспроводные наушники с ANC', price: 12999, emoji: '🎧' },
  { id: '4', name: 'Умные часы', description: 'Фитнес-трекер с монитором', price: 15999, emoji: '⌚' },
  { id: '5', name: 'Термос Steel', description: 'Вакуумный термос 500мл', price: 1299, emoji: '☕' },
  { id: '6', name: 'Power Bank', description: 'Портативная зарядка 20000мАч', price: 2499, emoji: '🔋' },
];

const statusConfig: Record<OrderStatus, { label: string; color: string; emoji: string }> = {
  pending: { label: 'Ожидание принятия', color: 'bg-yellow-500', emoji: '⏳' },
  accepted: { label: 'Заказ принят, ожидаем оплату', color: 'bg-blue-500', emoji: '💳' },
  processing: { label: 'Выполняется', color: 'bg-purple-500', emoji: '⚙️' },
  completed: { label: 'Выполнено', color: 'bg-green-500', emoji: '✅' },
  cancelled: { label: 'Отменено', color: 'bg-red-500', emoji: '❌' },
};

const Index = () => {
  const [currentView, setCurrentView] = useState<'home' | 'catalog' | 'contact' | 'admin'>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setOrderDialogOpen(true);
  };

  const handleCreateOrder = () => {
    if (!selectedProduct || !customerName.trim()) {
      toast.error('Заполните имя для оформления заказа');
      return;
    }

    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      productName: selectedProduct.name,
      customerName: customerName.trim(),
      executor: 'Не назначен',
      notes: orderNotes.trim(),
      status: 'pending',
      createdAt: new Date(),
    };

    setOrders([...orders, newOrder]);
    toast.success('🎉 Заказ создан! Ожидайте подтверждения');
    setOrderDialogOpen(false);
    setCustomerName('');
    setOrderNotes('');
    setSelectedProduct(null);
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'easyshop25') {
      setIsAdminAuthenticated(true);
      toast.success('✨ Вход выполнен успешно');
    } else {
      toast.error('❌ Неверный пароль');
    }
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(orders.map(order => {
      if (order.id === orderId) {
        const updated = { ...order, status: newStatus };
        if (newStatus === 'accepted' || newStatus === 'processing') {
          updated.startDate = new Date();
          updated.endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        }
        return updated;
      }
      return order;
    }));
    toast.success('Статус заказа обновлен');
  };

  const handleUpdateExecutor = (orderId: string, executor: string) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, executor } : order
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {currentView === 'home' && (
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
              🛍️ EasyShop
            </h1>
            <p className="text-xl text-gray-600 mb-8">Добро пожаловать в наш магазин!</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card 
              className="cursor-pointer hover:scale-105 transition-transform duration-300 hover:shadow-2xl bg-gradient-to-br from-purple-100 to-purple-50 border-purple-200"
              onClick={() => setCurrentView('catalog')}
            >
              <CardHeader>
                <div className="text-5xl mb-3 text-center">📦</div>
                <CardTitle className="text-center text-purple-900">Каталог</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-600">Посмотрите наши товары</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:scale-105 transition-transform duration-300 hover:shadow-2xl bg-gradient-to-br from-pink-100 to-pink-50 border-pink-200"
              onClick={() => setCurrentView('contact')}
            >
              <CardHeader>
                <div className="text-5xl mb-3 text-center">💬</div>
                <CardTitle className="text-center text-pink-900">Обратная связь</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-600">Свяжитесь с нами</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:scale-105 transition-transform duration-300 hover:shadow-2xl bg-gradient-to-br from-blue-100 to-blue-50 border-blue-200"
              onClick={() => setCurrentView('admin')}
            >
              <CardHeader>
                <div className="text-5xl mb-3 text-center">👑</div>
                <CardTitle className="text-center text-blue-900">Админ-панель</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-600">Управление заказами</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {currentView === 'catalog' && (
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <Button 
              variant="ghost" 
              onClick={() => setCurrentView('home')}
              className="hover:scale-105 transition-transform"
            >
              <Icon name="ArrowLeft" className="mr-2" />
              Назад
            </Button>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              📦 Каталог товаров
            </h2>
            <div className="w-24" />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {mockProducts.map((product) => (
              <Card 
                key={product.id}
                className="cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-2xl animate-scale-in"
                onClick={() => handleProductClick(product)}
              >
                <CardHeader>
                  <div className="text-6xl mb-3 text-center">{product.emoji}</div>
                  <CardTitle className="text-center">{product.name}</CardTitle>
                  <CardDescription className="text-center">{product.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-3">
                      {product.price.toLocaleString('ru-RU')} ₽
                    </div>
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                      Заказать
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {currentView === 'contact' && (
        <div className="container mx-auto px-4 py-8 animate-fade-in max-w-2xl">
          <Button 
            variant="ghost" 
            onClick={() => setCurrentView('home')}
            className="mb-8 hover:scale-105 transition-transform"
          >
            <Icon name="ArrowLeft" className="mr-2" />
            Назад
          </Button>

          <Card className="shadow-2xl">
            <CardHeader>
              <div className="text-5xl mb-3 text-center">💬</div>
              <CardTitle className="text-center text-2xl">Обратная связь</CardTitle>
              <CardDescription className="text-center">Свяжитесь с нами любым удобным способом</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <Icon name="Phone" className="text-purple-600" size={24} />
                <div>
                  <div className="font-semibold">Телефон</div>
                  <div className="text-gray-600">+7 (999) 123-45-67</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors">
                <Icon name="Mail" className="text-pink-600" size={24} />
                <div>
                  <div className="font-semibold">Email</div>
                  <div className="text-gray-600">support@easyshop.ru</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <Icon name="MessageCircle" className="text-blue-600" size={24} />
                <div>
                  <div className="font-semibold">Telegram</div>
                  <div className="text-gray-600">@easyshop_support</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {currentView === 'admin' && (
        <div className="container mx-auto px-4 py-8 animate-fade-in">
          <Button 
            variant="ghost" 
            onClick={() => {
              setCurrentView('home');
              setIsAdminAuthenticated(false);
              setAdminPassword('');
            }}
            className="mb-8 hover:scale-105 transition-transform"
          >
            <Icon name="ArrowLeft" className="mr-2" />
            Назад
          </Button>

          {!isAdminAuthenticated ? (
            <Card className="max-w-md mx-auto shadow-2xl">
              <CardHeader>
                <div className="text-5xl mb-3 text-center">👑</div>
                <CardTitle className="text-center">Вход в админ-панель</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="password">Пароль</Label>
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
              </CardContent>
            </Card>
          ) : (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                👑 Управление заказами
              </h2>
              
              {orders.length === 0 ? (
                <Card className="max-w-2xl mx-auto">
                  <CardContent className="py-12 text-center">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-gray-500 text-lg">Заказов пока нет</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {orders.map((order) => (
                    <Card key={order.id} className="shadow-lg hover:shadow-xl transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2 mb-2">
                              {statusConfig[order.status].emoji} {order.productName}
                              <Badge className={`${statusConfig[order.status].color} text-white`}>
                                {statusConfig[order.status].label}
                              </Badge>
                            </CardTitle>
                            <CardDescription>Заказ #{order.id}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-gray-500">Клиент</Label>
                            <div className="font-medium">{order.customerName}</div>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Исполнитель</Label>
                            <Input
                              value={order.executor}
                              onChange={(e) => handleUpdateExecutor(order.id, e.target.value)}
                              placeholder="Назначить исполнителя"
                              className="mt-1"
                            />
                          </div>
                        </div>

                        {order.notes && (
                          <div>
                            <Label className="text-xs text-gray-500">Примечания</Label>
                            <div className="mt-1 p-2 bg-gray-50 rounded">{order.notes}</div>
                          </div>
                        )}

                        {(order.startDate || order.endDate) && (
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-gray-500">Дата начала</Label>
                              <div className="font-medium">
                                {order.startDate?.toLocaleDateString('ru-RU')}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">Дата завершения</Label>
                              <div className="font-medium">
                                {order.endDate?.toLocaleDateString('ru-RU')}
                              </div>
                            </div>
                          </div>
                        )}

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
      )}

      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="text-5xl mb-3 text-center">{selectedProduct?.emoji}</div>
            <DialogTitle className="text-center">{selectedProduct?.name}</DialogTitle>
            <DialogDescription className="text-center">
              Цена: {selectedProduct?.price.toLocaleString('ru-RU')} ₽
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="customerName">Ваше имя *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Введите ваше имя"
              />
            </div>
            <div>
              <Label htmlFor="orderNotes">Примечания к заказу</Label>
              <Textarea
                id="orderNotes"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Дополнительные пожелания..."
                rows={3}
              />
            </div>
            <Button 
              onClick={handleCreateOrder}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Оформить заказ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
