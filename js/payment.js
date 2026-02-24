/**
 * js/payment.js
 * Razorpay payment integration
 * Loads Razorpay checkout script and handles the full payment flow.
 */

import api, { getToken } from './api.js';

/**
 * Load the Razorpay checkout script dynamically (if not already loaded)
 */
function loadRazorpayScript() {
    return new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
}

/**
 * initiatePayment(bookingId, userInfo)
 *
 * Full Razorpay checkout flow:
 * 1. Create Razorpay order on backend
 * 2. Open Razorpay popup
 * 3. On success → verify signature on backend
 * 4. Returns { ok, bookingId } on success
 */
export async function initiatePayment(bookingId, userInfo = {}) {
    // 1. Load Razorpay script
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
        showToast('Payment service unavailable. Please try again.', 'error');
        return { ok: false, error: 'Razorpay script failed to load' };
    }

    // 2. Create order on backend
    showToast('Setting up payment…', 'info');
    const orderRes = await api.post('/payments/create-order', { bookingId });

    if (!orderRes.ok) {
        showToast(orderRes.error || 'Failed to create payment order.', 'error');
        return { ok: false, error: orderRes.error };
    }

    const { orderId, amount, currency, keyId, prefill } = orderRes.data;

    // 3. Open Razorpay checkout
    return new Promise((resolve) => {
        const options = {
            key: keyId,
            amount,
            currency: currency || 'INR',
            name: 'AuraCraft',
            description: 'Salon Booking Payment',
            image: '/images/auracraft-logo.jpg',
            order_id: orderId,
            prefill: {
                name: prefill?.name || userInfo.name || '',
                email: prefill?.email || userInfo.email || '',
                contact: userInfo.phone || '',
            },
            theme: { color: '#8B5CF6' },

            // Payment success handler
            handler: async function (response) {
                showToast('Verifying payment…', 'info');
                const verifyRes = await api.post('/payments/verify', {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    bookingId,
                });

                if (verifyRes.ok) {
                    showToast('🎉 Booking confirmed! Payment successful.', 'success');
                    resolve({ ok: true, bookingId, paymentId: response.razorpay_payment_id });
                } else {
                    showToast('Payment verification failed. Contact support.', 'error');
                    resolve({ ok: false, error: 'Signature verification failed' });
                }
            },

            modal: {
                ondismiss: function () {
                    showToast('Payment cancelled.', 'info');
                    resolve({ ok: false, error: 'Payment dismissed by user' });
                },
            },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
            console.error('Razorpay payment failed:', response.error);
            showToast(
                `Payment failed: ${response.error.description || 'Unknown error'}`,
                'error'
            );
            resolve({ ok: false, error: response.error.description });
        });

        rzp.open();
    });
}

/**
 * Quick helper to render a payment summary card
 */
export function renderPaymentSummary(service, discountAmount = 0, finalAmount) {
    const actual = finalAmount ?? service.price;
    const saved = discountAmount > 0 ? discountAmount : 0;

    return `
  <div class="payment-summary-card">
    <div class="payment-row">
      <span>Service</span>
      <span>${service.name}</span>
    </div>
    <div class="payment-row">
      <span>Price</span>
      <span>₹${service.price.toLocaleString('en-IN')}</span>
    </div>
    ${saved > 0 ? `
    <div class="payment-row payment-discount">
      <span>Discount</span>
      <span>−₹${saved.toLocaleString('en-IN')}</span>
    </div>` : ''}
    <div class="payment-row payment-total">
      <span>Total</span>
      <span>₹${actual.toLocaleString('en-IN')}</span>
    </div>
    <div style="font-size:0.72rem;color:var(--text-muted);margin-top:8px;text-align:center">
      🔒 Secured by Razorpay · UPI, Cards, Net Banking accepted
    </div>
  </div>`;
}
