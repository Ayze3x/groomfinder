/**
 * src/controllers/auth.controller.js
 * Handles email/password registration, login, Firebase OTP verification, and profile
 */

import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { getFirebaseAdmin } from '../config/firebase-admin.js';

// ── Register with email + password ───────────────────────
export async function register(req, res) {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        // Check for existing user
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ error: 'An account with that email already exists.' });
        }

        // Create user (password hashed by pre-save hook)
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            passwordHash: password, // hook will hash this
            role: 'user',
        });

        const token = generateToken(user._id);

        res.status(201).json({
            message: 'Account created successfully.',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                loyaltyPoints: user.loyaltyPoints,
            },
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
}

// ── Login with email + password ──────────────────────────
export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user || !user.passwordHash) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Update last login
        user.lastLoginAt = new Date();
        await user.save();

        const token = generateToken(user._id);

        res.json({
            message: 'Login successful.',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                salonId: user.salonId,
                loyaltyPoints: user.loyaltyPoints,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
}

// ── Firebase OTP verification → app JWT ─────────────────
// Frontend sends a Firebase ID token after phone OTP is verified.
// Backend validates it with Firebase Admin SDK and returns its own JWT.
export async function firebaseOtpVerify(req, res) {
    try {
        const { firebaseIdToken, name } = req.body;

        if (!firebaseIdToken) {
            return res.status(400).json({ error: 'Firebase ID token is required.' });
        }

        // Verify token with Firebase Admin SDK
        let decodedToken;
        try {
            const adminAuth = getFirebaseAdmin();
            decodedToken = await adminAuth.verifyIdToken(firebaseIdToken);
        } catch (firebaseErr) {
            console.error('Firebase token verification failed:', firebaseErr.message);
            return res.status(401).json({ error: 'Invalid or expired Firebase token.' });
        }

        const { uid, phone_number, email: fbEmail } = decodedToken;

        // Find or create user by Firebase UID
        let user = await User.findOne({ firebaseUid: uid });

        if (!user) {
            // Also try to find by phone number
            if (phone_number) {
                user = await User.findOne({ phone: phone_number });
            }

            if (user) {
                // Existing user — link Firebase UID
                user.firebaseUid = uid;
                await user.save();
            } else {
                // Brand new user — auto-create account
                const generatedEmail = fbEmail || `${uid}@firebase.auracraft.app`;
                const displayName = name || `User_${uid.slice(-6)}`;

                user = await User.create({
                    name: displayName,
                    email: generatedEmail,
                    phone: phone_number || '',
                    firebaseUid: uid,
                    role: 'user',
                });
            }
        }

        // Update last login
        user.lastLoginAt = new Date();
        await user.save();

        const token = generateToken(user._id);

        res.json({
            message: 'OTP verified. Login successful.',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                loyaltyPoints: user.loyaltyPoints,
            },
        });
    } catch (err) {
        console.error('Firebase OTP verify error:', err);
        res.status(500).json({ error: 'Server error during OTP verification.' });
    }
}

// ── Get current user profile ────────────────────────────
export async function getMe(req, res) {
    try {
        const user = await User.findById(req.user.id).select('-passwordHash -__v');
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ user });
    } catch (err) {
        console.error('getMe error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
}
