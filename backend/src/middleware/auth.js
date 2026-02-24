/**
 * src/middleware/auth.js
 * JWT Authentication Middleware
 * Verifies Bearer token and attaches req.user to the request
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect — requires a valid JWT to be present
 * Usage: router.get('/protected', protect, handler)
 */
export async function protect(req, res, next) {
    try {
        // 1. Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authentication required. Please log in.',
            });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token missing.' });
        }

        // 2. Verify token signature + expiry
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Session expired. Please log in again.' });
            }
            return res.status(401).json({ error: 'Invalid token. Please log in again.' });
        }

        // 3. Find user in DB (ensures user still exists and is not deleted)
        const user = await User.findById(decoded.id).select('-passwordHash');
        if (!user) {
            return res.status(401).json({ error: 'User account no longer exists.' });
        }

        // 4. Attach user to request — downstream handlers can use req.user
        req.user = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            salonId: user.salonId ? user.salonId.toString() : null,
        };

        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ error: 'Authentication error.' });
    }
}

/**
 * Generate a JWT for a user
 */
export function generateToken(userId) {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

export default protect;
