const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="text-8xl mb-6">🛍️</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            EasyShop
          </h1>
          <p className="text-xl text-gray-600">
            Добро пожаловать в наш магазин!
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              📱 Делайте заказы через Telegram!
            </h2>
            <p className="text-gray-600">
              Мы перешли на удобный формат обслуживания через Telegram бот.
              Вы можете просматривать каталог, делать заказы и отслеживать их статус прямо в мессенджере!
            </p>
          </div>

          <div className="pt-4">
            <a
              href="https://t.me/YOUR_BOT_USERNAME"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold text-lg hover:shadow-lg transition-all transform hover:scale-105"
            >
              <span className="text-2xl">💬</span>
              Открыть бот в Telegram
            </a>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="space-y-2">
                <div className="text-3xl">📦</div>
                <div className="font-semibold">Каталог товаров</div>
                <div>Просматривайте весь ассортимент</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl">🛒</div>
                <div className="font-semibold">Быстрый заказ</div>
                <div>Оформите заказ за минуту</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl">📋</div>
                <div className="font-semibold">Отслеживание</div>
                <div>Следите за статусом заказа</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          Возникли вопросы? Напишите нам в боте через раздел "💬 Обратная связь"
        </div>
      </div>
    </div>
  );
};

export default Index;
