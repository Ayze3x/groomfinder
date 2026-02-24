/**
 * src/routes/otp.routes.js
 */
import { Router } from 'express';
import { verifyOtp } from '../controllers/otp.controller.js';

const router = Router();

// POST /api/otp/verify — send Firebase ID token, receive app JWT
router.post('/verify', verifyOtp);

export default router;
