/**
 * src/controllers/otp.controller.js
 * Firebase Phone OTP — verifies Firebase ID token and returns app JWT
 * (This is a thin wrapper around auth.controller.firebaseOtpVerify)
 */

export { firebaseOtpVerify as verifyOtp } from './auth.controller.js';
