/**
 * src/routes/auth.routes.js
 */
import { Router } from 'express';
import { register, login, firebaseOtpVerify, getMe } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register — create new account
router.post('/register', register);

// POST /api/auth/login — email + password login
router.post('/login', login);

// POST /api/auth/firebase-otp — verify Firebase phone OTP token → return app JWT
router.post('/firebase-otp', firebaseOtpVerify);

// POST /api/auth/otp-login — alias for firebase-otp (used by otp.html)
router.post('/otp-login', firebaseOtpVerify);

// GET /api/auth/me — get current user (protected)
router.get('/me', protect, getMe);

export default router;
