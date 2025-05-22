const { createRoot } = ReactDOM;
const { BrowserRouter, Routes, Route, Link } = ReactRouterDOM;

const App = () => {
    return (
        <BrowserRouter basename="/StickerStoreMiniApp">
            <div className="container">
                <h1>Sticker Store Mini App</h1>
                <nav>
                    <Link to="/stars">Test Stars</Link> | <Link to="/payments">Test Payments API</Link> | <Link to="/ton">Test TON</Link>
                </nav>
                <Routes>
                    <Route path="/stars" element={<Stars />} />
                    <Route path="/payments" element={<PaymentsAPI />} />
                    <Route path="/ton" element={<TON />} />
                    <Route path="/" element={<h2>Select a payment method above</h2>} />
                </Routes>
            </div>
        </BrowserRouter>
    );
};

// Components (defined below)
const Stars = () => {
    const [loading, setLoading] = React.useState(false);

    const buyStickerPack = async () => {
        setLoading(true);
        try {
            const response = await fetch('https://your-backend.com/api/create-stars-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: Telegram.WebApp.initDataUnsafe.user?.id || 123456,
                    packId: 'sticker-pack-1',
                    title: 'Premium Sticker Pack',
                    description: 'A set of 10 premium stickers',
                    amount: 100, // 100 Stars
                }),
            });
            const { invoice } = await response.json();
            Telegram.WebApp.openInvoice(invoice.url, (status) => {
                if (status === 'paid') {
                    Telegram.WebApp.showAlert('Payment successful! Stickers unlocked.');
                } else if (status === 'cancelled') {
                    Telegram.WebApp.showAlert('Payment cancelled.');
                } else {
                    Telegram.WebApp.showAlert('Payment failed. Please try again.');
                }
                setLoading(false);
            });
        } catch (error) {
            Telegram.WebApp.showAlert('Error initiating payment.');
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Test Telegram Stars</h2>
            <button onClick={buyStickerPack} disabled={loading}>
                {loading ? 'Processing...' : 'Buy Sticker Pack (100 Stars)'}
            </button>
        </div>
    );
};

const PaymentsAPI = () => {
    const [loading, setLoading] = React.useState(false);

    const buyStickerPack = async () => {
        setLoading(true);
        try {
            const response = await fetch('https://your-backend.com/api/create-payment-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: Telegram.WebApp.initDataUnsafe.user?.id || 123456,
                    packId: 'sticker-pack-1',
                    title: 'Premium Sticker Pack',
                    description: 'A set of 10 premium stickers',
                    amount: 100, // $1.00 (in cents)
                    currency: 'USD',
                }),
            });
            const { invoice } = await response.json();
            Telegram.WebApp.openInvoice(invoice.url, (status) => {
                if (status === 'paid') {
                    Telegram.WebApp.showAlert('Payment successful! Stickers unlocked.');
                } else if (status === 'cancelled') {
                    Telegram.WebApp.showAlert('Payment cancelled.');
                } else {
                    Telegram.WebApp.showAlert('Payment failed. Please try again.');
                }
                setLoading(false);
            });
        } catch (error) {
            Telegram.WebApp.showAlert('Error initiating payment.');
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Test Telegram Payments API</h2>
            <button onClick={buyStickerPack} disabled={loading}>
                {loading ? 'Processing...' : 'Buy Sticker Pack ($1.00)'}
            </button>
        </div>
    );
};

const TON = () => {
    const [loading, setLoading] = React.useState(false);

    const buyStickerPack = async () => {
        setLoading(true);
        try {
            const response = await fetch('https://your-backend.com/api/create-ton-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: Telegram.WebApp.initDataUnsafe.user?.id || 123456,
                    packId: 'sticker-pack-1',
                    amount: 0.1, // 0.1 TON
                }),
            });
            const { paymentLink } = await response.json();
            Telegram.WebApp.openLink(paymentLink);
            Telegram.WebApp.showAlert('Please complete the payment in your TON Wallet.');

            const checkPayment = setInterval(async () => {
                const statusRes = await fetch('https://your-backend.com/api/check-ton-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chatId: Telegram.WebApp.initDataUnsafe.user?.id || 123456, packId: 'sticker-pack-1' }),
                });
                const { status } = await statusRes.json();
                if (status === 'completed') {
                    clearInterval(checkPayment);
                    Telegram.WebApp.showAlert('Payment successful! Stickers unlocked.');
                    setLoading(false);
                }
            }, 5000);
        } catch (error) {
            Telegram.WebApp.showAlert('Error initiating payment.');
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Test TON Payments</h2>
            <button onClick={buyStickerPack} disabled={loading}>
                {loading ? 'Processing...' : 'Buy Sticker Pack (0.1 TON)'}
            </button>
        </div>
    );
};

// Render the app
const root = createRoot(document.getElementById('root'));
root.render(<App />);