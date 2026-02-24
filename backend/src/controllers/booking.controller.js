/**
 * src/controllers/booking.controller.js
 * Booking lifecycle: create → payment → confirm → status updates
 */

import Booking from '../models/Booking.js';
import Salon from '../models/Salon.js';
import Slot from '../models/Slot.js';
import User from '../models/User.js';

// ── POST /api/bookings ───────────────────────────────────
// Create a booking in "pendingPayment" status.
// The slot is NOT marked booked yet — only on payment confirmation.
export async function createBooking(req, res) {
    try {
        const {
            salonId,
            serviceId,
            date,
            time,
            couponCode,
            paymentType = 'prepaid',
        } = req.body;

        if (!salonId || !serviceId || !date || !time) {
            return res.status(400).json({
                error: 'salonId, serviceId, date, and time are required.',
            });
        }

        // Validate salon
        const salon = await Salon.findById(salonId);
        if (!salon || !salon.isActive) {
            return res.status(404).json({ error: 'Salon not found.' });
        }

        // Validate service
        const service = salon.services.find(s => s.id === serviceId);
        if (!service) {
            return res.status(400).json({ error: 'Service not found in this salon.' });
        }

        // Check if slot is available
        const existingSlot = await Slot.findOne({ salonId, date, time, isBooked: true });
        if (existingSlot) {
            return res.status(409).json({ error: 'This time slot is already booked.' });
        }

        // Also check for existing booking at same slot
        const existingBooking = await Booking.findOne({
            salonId,
            date,
            time,
            status: { $in: ['pendingPayment', 'confirmed', 'arrived'] },
        });
        if (existingBooking) {
            return res.status(409).json({ error: 'This slot is no longer available.' });
        }

        // Validate and apply coupon
        let discountAmount = 0;
        let finalAmount = service.price;
        let appliedCouponCode = null;

        if (couponCode) {
            const coupon = (salon.coupons || []).find(
                c => c.code.toLowerCase() === couponCode.toLowerCase() && c.active
            );
            if (!coupon) {
                return res.status(400).json({ error: 'Invalid or expired coupon code.' });
            }
            if (new Date(coupon.expiry) < new Date()) {
                return res.status(400).json({ error: 'This coupon has expired.' });
            }
            if (service.price < coupon.minOrder) {
                return res.status(400).json({
                    error: `Minimum order ₹${coupon.minOrder} required for this coupon.`,
                });
            }
            discountAmount =
                coupon.type === 'percent'
                    ? Math.round(service.price * coupon.value / 100)
                    : coupon.value;
            finalAmount = Math.max(0, service.price - discountAmount);
            appliedCouponCode = coupon.code;
        }

        // Create the booking
        const booking = await Booking.create({
            userId: req.user.id,
            salonId,
            service: {
                id: service.id,
                name: service.name,
                price: service.price,
                duration: service.duration,
            },
            date,
            time,
            paymentStatus: 'pending',
            paymentType,
            originalAmount: service.price,
            couponCode: appliedCouponCode,
            discountAmount,
            finalAmount,
            status: 'pendingPayment',
        });

        res.status(201).json({
            message: 'Booking created. Complete payment to confirm.',
            booking: {
                id: booking._id,
                salonId: booking.salonId,
                salonName: salon.name,
                service: booking.service,
                date: booking.date,
                time: booking.time,
                originalAmount: booking.originalAmount,
                discountAmount: booking.discountAmount,
                finalAmount: booking.finalAmount,
                status: booking.status,
            },
        });
    } catch (err) {
        console.error('createBooking error:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to create booking.' });
    }
}

// ── PUT /api/bookings/:id/confirm ────────────────────────
// Called after successful payment verification
export async function confirmBooking(req, res) {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ error: 'Booking not found.' });

        // Ensure the booking belongs to this user
        if (booking.userId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        booking.status = 'confirmed';
        booking.paymentStatus = 'paid';
        await booking.save();

        // Mark the slot as booked
        await Slot.findOneAndUpdate(
            { salonId: booking.salonId, date: booking.date, time: booking.time },
            { isBooked: true, bookingId: booking._id },
            { upsert: true, new: true }
        );

        // Award loyalty points
        const salon = await Salon.findById(booking.salonId);
        if (salon) {
            const pts = salon.loyaltyPointsPerVisit || 50;
            await User.findByIdAndUpdate(booking.userId, {
                $inc: { loyaltyPoints: pts },
            });
            booking.loyaltyPointsAwarded = pts;
            await booking.save();
        }

        res.json({ message: 'Booking confirmed!', booking });
    } catch (err) {
        console.error('confirmBooking error:', err);
        res.status(500).json({ error: 'Failed to confirm booking.' });
    }
}

// ── GET /api/bookings/me ────────────────────────────────
export async function getUserBookings(req, res) {
    try {
        const bookings = await Booking.find({ userId: req.user.id })
            .populate('salonId', 'name address image location')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ bookings });
    } catch (err) {
        console.error('getUserBookings error:', err);
        res.status(500).json({ error: 'Failed to fetch bookings.' });
    }
}

// ── GET /api/bookings/salon/:salonId (admin) ─────────────
export async function getSalonBookings(req, res) {
    try {
        const { salonId } = req.params;
        const { status, date } = req.query;

        const filter = { salonId };
        if (status && status !== 'all') filter.status = status;
        if (date) filter.date = date;

        const bookings = await Booking.find(filter)
            .populate('userId', 'name email phone')
            .sort({ date: -1, time: 1 })
            .lean();

        res.json({ bookings, count: bookings.length });
    } catch (err) {
        console.error('getSalonBookings error:', err);
        res.status(500).json({ error: 'Failed to fetch salon bookings.' });
    }
}

// ── PUT /api/bookings/:id/status (admin) ─────────────────
export async function updateBookingStatus(req, res) {
    try {
        const { status, adminNote } = req.body;
        const validStatuses = ['confirmed', 'arrived', 'completed', 'cancelled', 'noshow'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ error: 'Booking not found.' });

        booking.status = status;
        if (adminNote !== undefined) booking.adminNote = adminNote;
        await booking.save();

        res.json({ message: `Booking marked as ${status}.`, booking });
    } catch (err) {
        console.error('updateBookingStatus error:', err);
        res.status(500).json({ error: 'Failed to update booking status.' });
    }
}
