// Конфигурация - измените на ваш ngrok URL или домен
const CONFIG = {
    backendUrl: 'https://4d44-77-105-28-218.ngrok-free.app',
    testChatId: 123456,
    testPackId: 'sticker-pack-1',
    starsAmount: 100,
    tonAmount: 0.1
};

// Инициализация Telegram WebApp
let tgWebApp = null;
let currentUser = null;

if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    tgWebApp = Telegram.WebApp;
    tgWebApp.ready();
    tgWebApp.expand();

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
                'ngrok-skip-browser-warning': 'true'
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

        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            logToUI('💡 Возможные причины: CORS, сеть недоступна, неверный URL сервера');
        }

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

// ИСПРАВЛЕННЫЙ обработчик Telegram Stars платежей
document.getElementById('stars-btn')?.addEventListener('click', async () => {
    setButtonState('stars-btn', 'Создание инвойса...', true);

    try {
        // Создаем ссылку на инвойс через Bot API
        const invoiceData = {
            chatId: CONFIG.testChatId,
            packId: CONFIG.testPackId,
            title: '⭐ Премиум стикер-пак',
            description: 'Набор из 10 эксклюзивных стикеров',
            amount: CONFIG.starsAmount
        };

        const response = await makeRequest('/api/create-stars-invoice-link', invoiceData);

        if (!response.success || !response.invoiceLink) {
            throw new Error('Получен некорректный ответ от сервера');
        }

        logToUI(`💫 Ссылка на инвойс создана: ${response.invoiceLink}`);

        // Открытие инвойса через правильный Telegram WebApp API
        if (tgWebApp && typeof tgWebApp.openInvoice === 'function') {
            logToUI('🚀 Открытие инвойса через Telegram WebApp...');

            tgWebApp.openInvoice(response.invoiceLink, (status) => {
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
            const link = document.createElement('a');
            link.href = response.invoiceLink;
            link.textContent = 'Открыть Stars инвойс';
            link.target = '_blank';
            link.style.display = 'block';
            link.style.margin = '10px 0';
            link.style.color = '#0088cc';
            document.body.appendChild(link);

            setTimeout(() => {
                setButtonState('stars-btn', `⭐ Telegram Stars (${CONFIG.starsAmount} звезд)`, false);
            }, 2000);
        }

    } catch (error) {
        setButtonState('stars-btn', `⭐ Telegram Stars (${CONFIG.starsAmount} звезд)`, false);
        logToUI(`❌ Ошибка создания Stars инвойса: ${error.message}`);
    }
});

// УЛУЧШЕННЫЙ обработчик TON платежей
document.getElementById('ton-btn')?.addEventListener('click', async () => {
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

        // Создание улучшенного интерфейса для TON платежа
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
            <p>📱 Откройте ссылку в TON кошельке или скопируйте её:</p>
            <div style="word-break: break-all; margin: 10px 0; font-family: monospace; font-size: 12px; background: white; padding: 8px; border-radius: 4px;">
                ${response.paymentLink}
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="copy-ton-link" style="background: #4caf50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    📋 Копировать ссылку
                </button>
                <button id="open-ton-wallet" style="background: #2196f3; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    🔗 Попробовать открыть
                </button>
                <button id="close-ton-container" style="background: #f44336; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    ❌ Закрыть
                </button>
            </div>
        `;

        document.body.appendChild(linkContainer);

        // Обработчик копирования
        document.getElementById('copy-ton-link').addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(response.paymentLink);
                logToUI('📋 Ссылка скопирована в буфер обмена');

                if (tgWebApp) {
                    tgWebApp.showAlert('Ссылка скопирована! Вставьте её в TON кошелек.');
                } else {
                    alert('Ссылка скопирована!');
                }
            } catch (error) {
                logToUI(`❌ Ошибка копирования: ${error.message}`);
                // Fallback
                const textArea = document.createElement('textarea');
                textArea.value = response.paymentLink;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('Ссылка скопирована!');
            }
        });

        // Попытка открыть кошелек
        document.getElementById('open-ton-wallet').addEventListener('click', () => {
            try {
                // Попробуем разные способы открытия
                if (window.open(response.paymentLink, '_blank')) {
                    logToUI('✅ Ссылка открыта в новом окне');
                } else {
                    logToUI('❌ Не удалось открыть ссылку автоматически');
                    if (tgWebApp) {
                        tgWebApp.showAlert('Не удалось открыть автоматически. Скопируйте ссылку вручную.');
                    }
                }
            } catch (error) {
                logToUI(`❌ Ошибка открытия: ${error.message}`);
            }
        });

        // Обработчик закрытия
        document.getElementById('close-ton-container').addEventListener('click', () => {
            linkContainer.remove();
            setButtonState('ton-btn', `💎 TON Платежи (${CONFIG.tonAmount} TON)`, false);
        });

        // Запуск проверки статуса платежа
        let checkCount = 0;
        const maxChecks = 24;

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

            if (checkCount >= maxChecks) {
                clearInterval(paymentChecker);
                logToUI(`⏰ Проверка платежа остановлена по таймауту (${maxChecks} попыток)`);
                setButtonState('ton-btn', `💎 TON Платежи (${CONFIG.tonAmount} TON)`, false);
            }
        }, 5000);

        // Уведомление пользователя
        const message = 'Скопируйте ссылку и откройте её в TON кошельке для оплаты.';
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