/**
 * src/routes/booking.routes.js
 */
import { Router } from 'express';
import {
    createBooking,
    confirmBooking,
    getUserBookings,
    getSalonBookings,
    updateBookingStatus,
} from '../controllers/booking.controller.js';
import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/admin.js';

const router = Router();

// All booking routes require authentication
router.use(protect);

// POST /api/bookings — create a new booking
router.post('/', createBooking);

// GET /api/bookings/me — get current user's bookings
router.get('/me', getUserBookings);

// PUT /api/bookings/:id/confirm — confirm after payment
router.put('/:id/confirm', confirmBooking);

// GET /api/bookings/salon/:salonId — admin: get all bookings for a salon
router.get('/salon/:salonId', adminOnly, getSalonBookings);

// PUT /api/bookings/:id/status — admin: update booking status
router.put('/:id/status', adminOnly, updateBookingStatus);

export default router;
