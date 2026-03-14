// todo: Файл не доделан

// todo: Сейчас получает имя города только на Английском языке, соответственно, перед запросом, нужно запросить i18n имя города на Английском
async function getWeatherByCity(city: string) {
    // 1. Сначала получаем координаты города
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`;

    const geoResponse = await fetch(geocodeUrl);

    /* todo:
    if (geoResponse.status === 429) {
        // Слишком много запросов
        const delay = this.retryDelay * Math.pow(2, i);

        await this.sleep(delay);

        continue;
    }
    */

    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
        throw new Error('Город не найден');
    }

    const { latitude, longitude, name } = geoData.results[0];

    /**
     * 2. Получаем погоду по координатам
     *
     * # Open-Meteo
     * * Полностью бесплатно, без API ключа!
     * * Пример: https://api.open-meteo.com/v1/forecast?latitude=55.75&longitude=37.62&current_weather=true
     * * Минус: Нужны координаты, а не название города
     *
     * ## 📊 Основные технические ограничения
     * 1. Лимиты запросов:
     *     * 10,000 запросов в день на IP-адрес
     *     * Минимальный интервал: 1 секунда между запросами (1 запрос/сек)
     *     * Rate limiting: При превышении — временная блокировка
     *
     * 2. Данные и точность:
     *     * Исторические данные: Только с 1940 года (неполные)
     *     * Прогноз: До 16 дней вперёд
     *     * Обновление: Каждый час для глобальных моделей
     *     * Разрешение: ~11 км для глобальных прогнозов
     *
     * 3. Географические ограничения:
     *     * 🌍 Покрытие: Весь мир
     *     * 🎯 Точность: Менее точный для микроклимата (городских районов)
     *     * ⛰️ Высота: Учитывает топографию, но без детализации
     *
     * ## 🔧 Ограничения по параметрам
     * В одном запросе можно получить максимум:
     *  * Переменных: До 20 погодных параметров за раз
     *  * Временных точек: До 10,000 точек данных на запрос
     *  * Исторических дней: До 92 дней в прошлом
     *
     * ## ⚡ Практические ограничения для сайта
     * 1. Что можно:
     *     * Показывать погоду для 100-500 пользователей в день
     *     * Обновлять данные раз в 30-60 минут
     *     * Хранить кеш на 1 час
     *     * Использовать для небольших проектов
     *
     * 2. Что сложно:
     *     * Приложение с 10,000+ пользователей в день
     *     * Real-time обновления каждую минуту
     *     * Точный прогноз для конкретной улицы
     *     * Коммерческие проекты с высокой нагрузкой
     */
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;

    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    return {
        city: name,
        temperature: weatherData.current_weather.temperature,
        windspeed: weatherData.current_weather.windspeed,
        weathercode: weatherData.current_weather.weathercode,
    };
}
