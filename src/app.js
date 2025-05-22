const backendUrl = 'https://4d44-77-105-28-218.ngrok-free.app'; // Your ngrok URL

// Helper function to log to UI
function logToUI(message) {
    const debugLog = document.getElementById('debug-log');
    const timestamp = new Date().toLocaleTimeString();
    debugLog.textContent += `\n[${timestamp}] ${message}`;
    debugLog.scrollTop = debugLog.scrollHeight;
}

// Helper function to make API requests
async function makeRequest(endpoint, data) {
    try {
        logToUI(`Sending request to ${endpoint}: ${JSON.stringify(data)}`);
        const response = await fetch(`${backendUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            mode: 'cors',
        });
        const responseText = await response.text();
        logToUI(`Response from ${endpoint} (status ${response.status}): ${responseText}`);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${responseText}`);
        }
        const result = JSON.parse(responseText);
        return result;
    } catch (error) {
        logToUI(`Error in ${endpoint}: ${error.name}: ${error.message}`);
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            logToUI('Possible issues: Network error, CORS, or server unreachable');
        }
        Telegram.WebApp.showAlert(`Request failed: ${error.message}`);
        throw error;
    }
}

// Telegram Stars Payment
document.getElementById('stars-btn').addEventListener('click', async () => {
    const button = document.getElementById('stars-btn');
    button.disabled = true;
    button.textContent = 'Processing...';
    try {
        const data = {
            chatId: Telegram.WebApp.initDataUnsafe.user?.id || 123456,
            packId: 'sticker-pack-1',
            title: 'Premium Sticker Pack',
            description: 'A set of 10 premium stickers',
            amount: 100,
        };
        const { invoice } = await makeRequest('/api/create-stars-invoice', data);
        if (!invoice?.url) throw new Error('Invalid invoice URL');
        logToUI(`Opening invoice: ${invoice.url}`);
        Telegram.WebApp.openInvoice(invoice.url, (status) => {
            logToUI(`Invoice status: ${status}`);
            if (status === 'paid') {
                Telegram.WebApp.showAlert('Payment successful! Stickers unlocked.');
            } else if (status === 'cancelled') {
                Telegram.WebApp.showAlert('Payment cancelled.');
            } else {
                Telegram.WebApp.showAlert('Payment failed. Please try again.');
            }
            button.disabled = false;
            button.textContent = 'Test Telegram Stars (100 Stars)';
        });
    } catch (error) {
        button.disabled = false;
        button.textContent = 'Test Telegram Stars (100 Stars)';
    }
});

// TON Payments
document.getElementById('ton-btn').addEventListener('click', async () => {
    const button = document.getElementById('ton-btn');
    button.disabled = true;
    button.textContent = 'Processing...';
    try {
        const data = {
            chatId: Telegram.WebApp.initDataUnsafe.user?.id || 123456,
            packId: 'sticker-pack-1',
            amount: 0.1,
        };
        const { paymentLink } = await makeRequest('/api/create-ton-invoice', data);
        if (!paymentLink || !paymentLink.startsWith('ton://')) {
            throw new Error('Invalid TON payment link');
        }
        logToUI(`Opening TON payment link: ${paymentLink}`);
        try {
            Telegram.WebApp.openLink(paymentLink);
            logToUI('openLink called successfully');
            Telegram.WebApp.showAlert('Please complete the payment in your TON Wallet.');
        } catch (error) {
            logToUI(`Error opening TON link: ${error.name}: ${error.message}`);
            Telegram.WebApp.showAlert('Failed to open TON Wallet. Please ensure a TON Wallet (e.g., @Wallet) is installed and in testnet mode.');
        }

        // Fallback: Retry opening link after a delay
        setTimeout(() => {
            try {
                Telegram.WebApp.openLink(paymentLink);
                logToUI('Retried opening TON payment link');
            } catch (error) {
                logToUI(`Retry error: ${error.name}: ${error.message}`);
            }
        }, 1000);

        // Poll for payment confirmation
        const checkPayment = setInterval(async () => {
            try {
                const statusRes = await makeRequest('/api/check-ton-payment', {
                    chatId: data.chatId,
                    packId: data.packId,
                });
                logToUI(`Check TON payment status: ${JSON.stringify(statusRes)}`);
                if (statusRes.status === 'completed') {
                    clearInterval(checkPayment);
                    Telegram.WebApp.showAlert('Payment successful! Stickers unlocked.');
                    button.disabled = false;
                    button.textContent = 'Test TON Payments (0.1 TON)';
                } else if (statusRes.status === 'not_found') {
                    clearInterval(checkPayment);
                    Telegram.WebApp.showAlert('Order not found.');
                    button.disabled = false;
                    button.textContent = 'Test TON Payments (0.1 TON)';
                }
            } catch (error) {
                logToUI(`Check TON payment error: ${error.name}: ${error.message}`);
                clearInterval(checkPayment);
                Telegram.WebApp.showAlert(`Check payment failed: ${error.message}`);
                button.disabled = false;
                button.textContent = 'Test TON Payments (0.1 TON)';
            }
        }, 5000);
    } catch (error) {
        button.disabled = false;
        button.textContent = 'Test TON Payments (0.1 TON)';
    }
});