/**
 * src/controllers/payments.controller.js
 * Razorpay payment order creation and signature verification
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import Booking from '../models/Booking.js';

// Initialize Razorpay instance
const getRazorpay = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay credentials not configured in .env');
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

// ── POST /api/payments/create-order ─────────────────────
// Creates a Razorpay order for a booking.
// Frontend uses the returned orderId to open the Razorpay checkout popup.
export async function createOrder(req, res) {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({ error: 'bookingId is required.' });
        }

        // Fetch the booking
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }
        if (booking.userId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied.' });
        }
        if (booking.status !== 'pendingPayment') {
            return res.status(400).json({
                error: `Booking is already in ${booking.status} state.`,
            });
        }

        // Create Razorpay order
        // Amount must be in paise (₹ × 100)
        const razorpay = getRazorpay();
        const order = await razorpay.orders.create({
            amount: Math.round(booking.finalAmount * 100), // paise
            currency: 'INR',
            receipt: `booking_${booking._id}`,
            notes: {
                bookingId: booking._id.toString(),
                userId: req.user.id,
                salonId: booking.salonId.toString(),
            },
        });

        // Save Razorpay order ID to booking
        booking.razorpayOrderId = order.id;
        await booking.save();

        res.json({
            orderId: order.id,
            amount: order.amount,       // paise
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID, // sent to frontend to open popup
            bookingId: booking._id,
            // Prefill data for Razorpay modal
            prefill: {
                name: req.user.name,
                email: req.user.email,
            },
        });
    } catch (err) {
        console.error('createOrder error:', err);
        if (err.message.includes('Razorpay credentials')) {
            return res.status(500).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to create payment order.' });
    }
}

// ── POST /api/payments/verify ────────────────────────────
// Verifies the Razorpay payment signature after successful checkout.
// CRITICAL: This is the security check — never skip it.
export async function verifyPayment(req, res) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            bookingId,
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
            return res.status(400).json({
                error: 'razorpay_order_id, razorpay_payment_id, razorpay_signature, and bookingId are required.',
            });
        }

        // Verify HMAC-SHA256 signature
        // Expected: HMAC(order_id + "|" + payment_id, key_secret)
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            console.warn('⚠️  Razorpay signature mismatch for booking:', bookingId);
            return res.status(400).json({
                error: 'Payment verification failed. Invalid signature.',
            });
        }

        // Signature valid — update booking
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        booking.razorpayOrderId = razorpay_order_id;
        booking.razorpayPaymentId = razorpay_payment_id;
        booking.razorpaySignature = razorpay_signature;
        booking.paymentStatus = 'paid';
        booking.paymentType = 'prepaid';
        booking.status = 'confirmed';
        await booking.save();

        res.json({
            message: 'Payment verified. Booking confirmed!',
            booking: {
                id: booking._id,
                status: booking.status,
                paymentStatus: booking.paymentStatus,
                date: booking.date,
                time: booking.time,
                service: booking.service,
            },
        });
    } catch (err) {
        console.error('verifyPayment error:', err);
        res.status(500).json({ error: 'Payment verification error.' });
    }
}
