// Конфигурация - измените на ваш ngrok URL или домен
const CONFIG = {
    // Для локальной разработки через ngrok
    backendUrl: 'https://4d44-77-105-28-218.ngrok-free.app', // Автоматически использует текущий домен
    // Или укажите напрямую: 'https://your-ngrok-url.ngrok-free.app'

    // Настройки для тестирования
    testChatId: 123456, // Будет заменен на реальный ID пользователя
    testPackId: 'sticker-pack-1',

    // Суммы для тестирования
    starsAmount: 100,    // 100 Telegram Stars
    tonAmount: 0.1       // 0.1 TON
};

// Инициализация Telegram WebApp
let tgWebApp = null;
let currentUser = null;

if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    tgWebApp = Telegram.WebApp;
    tgWebApp.ready();
    tgWebApp.expand();

    // Получение данных пользователя
    currentUser = tgWebApp.initDataUnsafe?.user;

    if (currentUser) {
        logToUI(`👤 Пользователь: ${currentUser.first_name} (ID: ${currentUser.id})`);
        CONFIG.testChatId = currentUser.id;
    } else {
        logToUI('⚠️  Данные пользователя недоступны - используется тестовый ID');
    }

    // Настройка темы
    document.body.style.backgroundColor = tgWebApp.backgroundColor || '#f0f0f0';
    document.body.style.color = tgWebApp.textColor || '#000000';

    logToUI(`📱 WebApp версия: ${tgWebApp.version}, платформа: ${tgWebApp.platform}`);
} else {
    logToUI('⚠️  Telegram WebApp API недоступно - тестирование в браузере');
}

// Функция логирования в UI
function logToUI(message) {
    const debugLog = document.getElementById('debug-log');
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;

    console.log(logMessage);
    debugLog.textContent += `\n${logMessage}`;
    debugLog.scrollTop = debugLog.scrollHeight;
}

// Функция для отображения статуса кнопки
function setButtonState(buttonId, text, disabled = false) {
    const button = document.getElementById(buttonId);
    button.textContent = text;
    button.disabled = disabled;
}

// Универсальная функция для API запросов
async function makeRequest(endpoint, data = null, method = 'POST') {
    const url = `${CONFIG.backendUrl}${endpoint}`;

    try {
        logToUI(`📤 Запрос: ${method} ${endpoint}`);
        if (data) logToUI(`📝 Данные: ${JSON.stringify(data, null, 2)}`);

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true' // Для ngrok
            },
            mode: 'cors'
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const responseText = await response.text();

        logToUI(`📥 Ответ (${response.status}): ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}\n${responseText}`);
        }

        return responseText ? JSON.parse(responseText) : {};

    } catch (error) {
        logToUI(`❌ Ошибка запроса: ${error.message}`);

        // Детальная диагностика ошибок
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            logToUI('💡 Возможные причины: CORS, сеть недоступна, неверный URL сервера');
        } else if (error.message.includes('ERR_NETWORK')) {
            logToUI('💡 Сетевая ошибка - проверьте подключение и URL сервера');
        }

        // Показать пользователю
        if (tgWebApp) {
            tgWebApp.showAlert(`Ошибка: ${error.message}`);
        } else {
            alert(`Ошибка: ${error.message}`);
        }

        throw error;
    }
}

// Проверка статуса сервера при загрузке
async function checkServerStatus() {
    try {
        const status = await makeRequest('/api/status', null, 'GET');
        logToUI(`✅ Сервер активен: ${status.timestamp}`);
        logToUI(`🔧 Доступные функции: Stars=${status.features.telegram_stars}, TON=${status.features.ton_payments}`);

        // Обновление кнопок в зависимости от доступных функций
        if (!status.features.telegram_stars) {
            setButtonState('stars-btn', 'Telegram Stars недоступно', true);
        }
        if (!status.features.ton_payments) {
            setButtonState('ton-btn', 'TON платежи недоступны', true);
        }

    } catch (error) {
        logToUI('❌ Сервер недоступен');
    }
}

// Обработчик Telegram Stars платежей
document.getElementById('stars-btn')?.addEventListener('click', async () => {
    const button = document.getElementById('stars-btn');
    setButtonState('stars-btn', 'Создание инвойса...', true);

    try {
        const invoiceData = {
            chatId: CONFIG.testChatId,
            packId: CONFIG.testPackId,
            title: '⭐ Премиум стикер-пак',
            description: 'Набор из 10 эксклюзивных стикеров',
            amount: CONFIG.starsAmount
        };

        const response = await makeRequest('/api/create-stars-invoice', invoiceData);

        if (!response.success || !response.invoice?.url) {
            throw new Error('Получен некорректный ответ от сервера');
        }

        logToUI(`💫 Инвойс создан: ${response.payload}`);

        // Открытие инвойса через Telegram WebApp API
        if (tgWebApp && typeof tgWebApp.openInvoice === 'function') {
            logToUI('🚀 Открытие инвойса через Telegram...');

            // Для Stars используем правильный формат URL
            const invoiceUrl = response.invoice.url || `https://t.me/invoice/${response.payload}`;

            tgWebApp.openInvoice(invoiceUrl, (status) => {
                logToUI(`💳 Статус платежа: ${status}`);

                const messages = {
                    'paid': '🎉 Платеж успешен! Стикеры разблокированы.',
                    'cancelled': '❌ Платеж отменен.',
                    'failed': '💔 Платеж не удался. Попробуйте еще раз.',
                    'pending': '⏳ Платеж в обработке...'
                };

                const message = messages[status] || `❓ Неизвестный статус: ${status}`;

                if (tgWebApp) {
                    tgWebApp.showAlert(message);
                } else {
                    alert(message);
                }

                setButtonState('stars-btn', `⭐ Telegram Stars (${CONFIG.starsAmount} звезд)`, false);
            });
        } else {
            // Fallback для тестирования в браузере
            logToUI('⚠️  openInvoice API недоступно - показываю ссылку');
            const invoiceUrl = response.invoice.url || `https://t.me/invoice/${response.payload}`;
            const link = document.createElement('a');
            link.href = invoiceUrl;
            link.textContent = 'Открыть Stars инвойс';
            link.target = '_blank';
            link.style.display = 'block';
            link.style.margin = '10px 0';
            link.style.color = '#0088cc';
            document.body.appendChild(link);

            setButtonState('stars-btn', `⭐ Telegram Stars (${CONFIG.starsAmount} звezd)`, false);
        }

    } catch (error) {
        setButtonState('stars-btn', `⭐ Telegram Stars (${CONFIG.starsAmount} звезд)`, false);
        logToUI(`❌ Ошибка создания Stars инвойса: ${error.message}`);
    }
});

// Обработчик TON платежей
document.getElementById('ton-btn')?.addEventListener('click', async () => {
    const button = document.getElementById('ton-btn');
    setButtonState('ton-btn', 'Создание TON платежа...', true);

    try {
        const paymentData = {
            chatId: CONFIG.testChatId,
            packId: CONFIG.testPackId,
            amount: CONFIG.tonAmount
        };

        const response = await makeRequest('/api/create-ton-invoice', paymentData);

        if (!response.success || !response.paymentLink) {
            throw new Error('Получен некорректный ответ от сервера');
        }

        logToUI(`💎 TON платеж создан: ${response.payload}`);
        logToUI(`🔗 Ссылка: ${response.paymentLink}`);

        // Попытка открыть TON кошелек
        let linkOpened = false;

        // Способ 1: Telegram WebApp openLink
        if (tgWebApp && typeof tgWebApp.openLink === 'function') {
            try {
                tgWebApp.openLink(response.paymentLink);
                logToUI('✅ Ссылка открыта через Telegram WebApp');
                linkOpened = true;
            } catch (error) {
                logToUI(`❌ Ошибка openLink: ${error.message}`);
            }
        }

        // Способ 2: window.open как fallback
        if (!linkOpened) {
            try {
                const opened = window.open(response.paymentLink, '_blank');
                if (opened) {
                    logToUI('✅ Ссылка открыта через window.open');
                    linkOpened = true;
                } else {
                    logToUI('❌ window.open заблокирован браузером');
                }
            } catch (error) {
                logToUI(`❌ Ошибка window.open: ${error.message}`);
            }
        }

        // Создание интерфейса с ссылкой и кнопкой копирования
        const linkContainer = document.createElement('div');
        linkContainer.id = 'ton-payment-container';
        linkContainer.style.cssText = `
            margin: 15px 0;
            padding: 15px;
            background: #e3f2fd;
            border-radius: 8px;
            border-left: 4px solid #2196f3;
        `;

        linkContainer.innerHTML = `
            <p><strong>💎 TON Платеж (${CONFIG.tonAmount} TON)</strong></p>
            <p>${linkOpened ? '✅ Завершите платеж в TON кошельке' : '❗ Скопируйте ссылку для оплаты:'}</p>
            <div style="word-break: break-all; margin: 10px 0; font-family: monospace; font-size: 12px; background: white; padding: 8px; border-radius: 4px;">
                ${response.paymentLink}
            </div>
            <button id="copy-ton-link" style="background: #4caf50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                📋 Копировать ссылку
            </button>
            <button id="close-ton-container" style="background: #f44336; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                ❌ Закрыть
            </button>
        `;

        document.body.appendChild(linkContainer);

        // Обработчик копирования
        document.getElementById('copy-ton-link').addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(response.paymentLink);
                logToUI('📋 Ссылка скопирована в буфер обмена');

                if (tgWebApp) {
                    tgWebApp.showAlert('Ссылка скопирована! Вставьте её в Telegram для оплаты.');
                } else {
                    alert('Ссылка скопирована!');
                }
            } catch (error) {
                logToUI(`❌ Ошибка копирования: ${error.message}`);
                // Fallback - выделение текста
                const textArea = document.createElement('textarea');
                textArea.value = response.paymentLink;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('Ссылка скопирована!');
            }
        });

        // Обработчик закрытия
        document.getElementById('close-ton-container').addEventListener('click', () => {
            linkContainer.remove();
            setButtonState('ton-btn', `💎 TON Платежи (${CONFIG.tonAmount} TON)`, false);
        });

        // Запуск проверки статуса платежа
        let checkCount = 0;
        const maxChecks = 24; // 2 минуты проверок каждые 5 секунд

        const paymentChecker = setInterval(async () => {
            checkCount++;

            try {
                const statusResponse = await makeRequest('/api/check-ton-payment', {
                    chatId: paymentData.chatId,
                    packId: paymentData.packId
                });

                logToUI(`🔍 Проверка TON платежа #${checkCount}: ${statusResponse.status}`);

                if (statusResponse.status === 'completed') {
                    clearInterval(paymentChecker);
                    linkContainer.remove();
                    setButtonState('ton-btn', `💎 TON Платежи (${CONFIG.tonAmount} TON)`, false);

                    const successMessage = '🎉 TON платеж подтвержден! Стикеры разблокированы.';
                    logToUI(successMessage);

                    if (tgWebApp) {
                        tgWebApp.showAlert(successMessage);
                    } else {
                        alert(successMessage);
                    }
                } else if (statusResponse.status === 'not_found') {
                    clearInterval(paymentChecker);
                    linkContainer.remove();
                    setButtonState('ton-btn', `💎 TON Платежи (${CONFIG.tonAmount} TON)`, false);
                    logToUI('❌ Заказ не найден');
                }

            } catch (error) {
                logToUI(`❌ Ошибка проверки статуса: ${error.message}`);
            }

            // Остановка проверки по таймауту
            if (checkCount >= maxChecks) {
                clearInterval(paymentChecker);
                logToUI(`⏰ Проверка платежа остановлена по таймауту (${maxChecks} попыток)`);
                setButtonState('ton-btn', `💎 TON Платежи (${CONFIG.tonAmount} TON)`, false);
            }
        }, 5000); // Проверка каждые 5 секунд

        // Уведомление пользователя
        const message = linkOpened ?
            'Завершите платеж в TON кошельке. Статус будет проверяться автоматически.' :
            'Скопируйте ссылку и откройте её в Telegram для оплаты.';

        if (tgWebApp) {
            tgWebApp.showAlert(message);
        } else {
            alert(message);
        }

    } catch (error) {
        setButtonState('ton-btn', `💎 TON Платежи (${CONFIG.tonAmount} TON)`, false);
        logToUI(`❌ Ошибка создания TON платежа: ${error.message}`);
    }
});

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    logToUI('🚀 Приложение запущено');
    logToUI(`🔧 Backend URL: ${CONFIG.backendUrl}`);

    // Проверка статуса сервера
    checkServerStatus();

    // Показать информацию о конфигурации
    setTimeout(() => {
        logToUI(`💰 Тест суммы: ${CONFIG.starsAmount} Stars, ${CONFIG.tonAmount} TON`);
        logToUI(`👤 Chat ID: ${CONFIG.testChatId}`);
    }, 1000);
});