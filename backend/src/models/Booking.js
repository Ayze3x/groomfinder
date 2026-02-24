/**
 * src/models/Booking.js
 * Booking model — full lifecycle from pendingPayment → confirmed → arrived
 */

import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
    {
        // References
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        salonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Salon',
            required: true,
        },

        // Service chosen
        service: {
            id: { type: String, required: true },
            name: { type: String, required: true },
            price: { type: Number, required: true },
            duration: { type: Number, required: true }, // minutes
        },

        // Schedule
        date: {
            type: String,
            required: true,
            // Format: YYYY-MM-DD
            match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
        },
        time: {
            type: String,
            required: true,
            // Format: HH:MM
            match: [/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'],
        },

        // Payment info
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'free', 'failed', 'refunded'],
            default: 'pending',
        },
        razorpayOrderId: { type: String, default: null },
        razorpayPaymentId: { type: String, default: null },
        razorpaySignature: { type: String, default: null },

        // Pricing
        originalAmount: { type: Number, required: true },
        couponCode: { type: String, default: null },
        discountAmount: { type: Number, default: 0 },
        finalAmount: { type: Number, required: true },

        // Booking lifecycle status
        status: {
            type: String,
            enum: ['pendingPayment', 'confirmed', 'arrived', 'completed', 'cancelled', 'noshow'],
            default: 'pendingPayment',
        },

        // Payment type (for queue priority)
        paymentType: {
            type: String,
            enum: ['prepaid', 'postpaid'],
            default: 'postpaid',
        },

        // Admin notes
        adminNote: { type: String, default: '' },

        // Loyalty points awarded for this booking
        loyaltyPointsAwarded: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Compound index to prevent duplicate bookings at same slot
bookingSchema.index(
    { salonId: 1, date: 1, time: 1 },
    { unique: false } // handled at controller level with Slot model
);

// Indexes for common queries
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ salonId: 1, date: 1 });
bookingSchema.index({ razorpayOrderId: 1 });
bookingSchema.index({ status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
