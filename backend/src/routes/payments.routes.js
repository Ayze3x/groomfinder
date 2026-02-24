/**
 * src/routes/payments.routes.js
 */
import { Router } from 'express';
import { createOrder, verifyPayment } from '../controllers/payments.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// All payment routes require authentication
router.use(protect);

// POST /api/payments/create-order — create Razorpay order for a booking
router.post('/create-order', createOrder);

// POST /api/payments/verify — verify Razorpay payment signature
router.post('/verify', verifyPayment);

export default router;
