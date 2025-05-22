const backendUrl = 'https://e063-77-105-28-218.ngrok-free.app'; // Replace with your backend URL

// Helper function to make API requests
async function makeRequest(endpoint, data) {
    try {
        const response = await fetch(`${backendUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        return await response.json();
    } catch (error) {
        Telegram.WebApp.showAlert(`Error: ${error.message}`);
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
            amount: 100, // 100 Stars
        };
        const { invoice } = await makeRequest('/api/create-stars-invoice', data);
        Telegram.WebApp.openInvoice(invoice.url, (status) => {
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

// Telegram Payments API
document.getElementById('payments-btn').addEventListener('click', async () => {
    const button = document.getElementById('payments-btn');
    button.disabled = true;
    button.textContent = 'Processing...';
    try {
        const data = {
            chatId: Telegram.WebApp.initDataUnsafe.user?.id || 123456,
            packId: 'sticker-pack-1',
            title: 'Premium Sticker Pack',
            description: 'A set of 10 premium stickers',
            amount: 100, // $1.00 (in cents)
            currency: 'USD',
        };
        const { invoice } = await makeRequest('/api/create-payment-invoice', data);
        Telegram.WebApp.openInvoice(invoice.url, (status) => {
            if (status === 'paid') {
                Telegram.WebApp.showAlert('Payment successful! Stickers unlocked.');
            } else if (status === 'cancelled') {
                Telegram.WebApp.showAlert('Payment cancelled.');
            } else {
                Telegram.WebApp.showAlert('Payment failed. Please try again.');
            }
            button.disabled = false;
            button.textContent = 'Test Payments API ($1.00)';
        });
    } catch (error) {
        button.disabled = false;
        button.textContent = 'Test Payments API ($1.00)';
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
            amount: 0.1, // 0.1 TON
        };
        const { paymentLink } = await makeRequest('/api/create-ton-invoice', data);
        Telegram.WebApp.openLink(paymentLink);
        Telegram.WebApp.showAlert('Please complete the payment in your TON Wallet.');

        // Poll for payment confirmation
        const checkPayment = setInterval(async () => {
            try {
                const statusRes = await makeRequest('/api/check-ton-payment', {
                    chatId: data.chatId,
                    packId: data.packId,
                });
                if (statusRes.status === 'completed') {
                    clearInterval(checkPayment);
                    Telegram.WebApp.showAlert('Payment successful! Stickers unlocked.');
                    button.disabled = false;
                    button.textContent = 'Test TON Payments (0.1 TON)';
                }
            } catch (error) {
                clearInterval(checkPayment);
                Telegram.WebApp.showAlert('Error checking payment.');
                button.disabled = false;
                button.textContent = 'Test TON Payments (0.1 TON)';
            }
        }, 5000);
    } catch (error) {
        button.disabled = false;
        button.textContent = 'Test TON Payments (0.1 TON)';
    }
});