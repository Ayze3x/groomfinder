/**
 * js/auth.js
 * AuraCraft v3 — Auth Module
 * Supports: Email/Password (backend JWT) + Firebase Phone OTP
 */

import { auth } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    RecaptchaVerifier,
    signInWithPhoneNumber,
} from 'firebase/auth';
import { getToken, setToken, clearToken } from './api.js';
import api from './api.js';

const SESSION_KEY = 'gf_session';

// ── Session helpers ───────────────────────────────────────
export function getCurrentSession() {
    const s = sessionStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
}

function setSession(data) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function endSession() {
    clearToken();
    sessionStorage.removeItem(SESSION_KEY);
    signOut(auth).catch(() => { });
    navigateTo('/');
}

export function logoutUser() {
    endSession();
}

// ── Email/Password Registration ──────────────────────────
export async function registerCustomer(email, password, name) {
    if (!email || !password || !name) return { ok: false, error: 'All fields are required' };
    if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters' };

    // Try backend first
    const res = await api.post('/auth/register', { name, email, password });

    if (res.ok) {
        const { token, user } = res.data;
        setToken(token);
        const session = {
            type: 'customer',
            email: user.email,
            name: user.name,
            id: user.id,
            role: user.role,
            loyaltyPoints: user.loyaltyPoints,
            _source: 'backend',
        };
        setSession(session);
        return { ok: true, session };
    }

    if (res.offline) {
        // Offline fallback: use Firebase Auth
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const session = { type: 'customer', email: cred.user.email, name, _source: 'firebase' };
            setSession(session);
            return { ok: true, session };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }

    return { ok: false, error: res.error };
}

// ── Email/Password Login ─────────────────────────────────
export async function loginCustomer(email, password) {
    // Try backend first
    const res = await api.post('/auth/login', { email, password });

    if (res.ok) {
        const { token, user } = res.data;
        setToken(token);
        const session = {
            type: 'customer',
            email: user.email,
            name: user.name,
            id: user.id,
            role: user.role,
            salonId: user.salonId,
            loyaltyPoints: user.loyaltyPoints,
            _source: 'backend',
        };
        setSession(session);
        return { ok: true, session };
    }

    if (res.offline) {
        // Offline: try Firebase Auth
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const session = {
                type: 'customer',
                email: cred.user.email,
                name: cred.user.displayName || email.split('@')[0],
                _source: 'firebase',
            };
            setSession(session);
            return { ok: true, session };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }

    return { ok: false, error: res.error };
}

// ── Store Admin Login ────────────────────────────────────
export async function loginStore(email, password) {
    // Try backend
    const res = await api.post('/auth/login', { email, password });

    if (res.ok) {
        const { token, user } = res.data;
        if (user.role !== 'admin') {
            return { ok: false, error: 'Not an admin account.' };
        }
        setToken(token);
        const session = {
            type: 'store',
            email: user.email,
            name: user.name,
            id: user.id,
            salonId: user.salonId,
            _source: 'backend',
        };
        setSession(session);
        return { ok: true, session };
    }

    if (res.offline) {
        // Offline: use the hardcoded STORE_ADMINS from data.js
        const lowerEmail = (email || '').toLowerCase().trim();
        const key = Object.keys(STORE_ADMINS).find(k => k.toLowerCase() === lowerEmail);
        const admin = key ? STORE_ADMINS[key] : null;
        if (!admin || admin.password !== (password || '').trim()) {
            return { ok: false, error: 'Invalid store credentials. Check email & password.' };
        }
        const salon = getSalonById(admin.salonId);
        if (!salon) return { ok: false, error: 'Store data not found' };
        const session = { type: 'store', email: key, salonId: admin.salonId, salonName: salon.name, _source: 'offline' };
        setSession(session);
        return { ok: true, session };
    }

    return { ok: false, error: res.error };
}

// ── Firebase Phone OTP ────────────────────────────────────
let _confirmationResult = null;

/**
 * Step 1: Send OTP to phone number.
 * Stores confirmationResult in memory — app.js shows the inline OTP input step.
 */
export async function sendPhoneOTP(phone) {
    try {
        const formatted = phone.startsWith('+') ? phone : '+91' + phone.replace(/\D/g, '');

        if (window.recaptchaVerifier) {
            try { window.recaptchaVerifier.clear(); } catch (_) { }
        }
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: () => { },
            'expired-callback': () => { window.recaptchaVerifier = null; },
        });

        _confirmationResult = await signInWithPhoneNumber(auth, formatted, window.recaptchaVerifier);
        return { ok: true };

    } catch (err) {
        console.error('sendPhoneOTP error:', err);
        if (window.recaptchaVerifier) {
            try { window.recaptchaVerifier.clear(); } catch (_) { }
            window.recaptchaVerifier = null;
        }
        const msg = err.code === 'auth/invalid-phone-number'
            ? 'Invalid phone number. Use +91XXXXXXXXXX format.'
            : err.code === 'auth/too-many-requests'
                ? 'Too many requests. Please wait a moment.'
                : err.message;
        return { ok: false, error: msg };
    }
}



/**
 * Step 2: Verify OTP entered by user
 * Then exchanges Firebase token for an app JWT from the backend
 */
export async function verifyPhoneOTP(otp, name = '') {
    if (!_confirmationResult) {
        return { ok: false, error: 'No OTP session. Please request OTP first.' };
    }

    try {
        const result = await _confirmationResult.confirm(otp);
        const firebaseIdToken = await result.user.getIdToken();

        // Exchange Firebase token for app JWT
        const res = await api.post('/auth/firebase-otp', {
            firebaseIdToken,
            name,
        });

        if (res.ok) {
            const { token, user } = res.data;
            setToken(token);
            const session = {
                type: 'customer',
                email: user.email,
                name: user.name,
                phone: user.phone,
                id: user.id,
                role: user.role,
                loyaltyPoints: user.loyaltyPoints,
                _source: 'otp',
            };
            setSession(session);
            _confirmationResult = null;
            return { ok: true, session };
        }

        if (res.offline) {
            // Backend offline — use Firebase user directly
            const session = {
                type: 'customer',
                email: result.user.email || `${result.user.uid}@phone.local`,
                name: name || result.user.displayName || 'User',
                phone: result.user.phoneNumber,
                _source: 'firebase-otp-offline',
            };
            setSession(session);
            return { ok: true, session };
        }

        return { ok: false, error: res.error };
    } catch (err) {
        console.error('verifyPhoneOTP error:', err);
        return {
            ok: false,
            error: err.code === 'auth/invalid-verification-code'
                ? 'Invalid OTP. Please check and try again.'
                : err.message,
        };
    }
}

// ── Demo helpers ─────────────────────────────────────────
export function fillDemoCredentials(email, password) {
    const emailEl = document.getElementById('auth-email');
    const passEl = document.getElementById('auth-password');
    if (emailEl) emailEl.value = email;
    if (passEl) passEl.value = password;
    showToast('Demo credentials filled — click Sign In!', 'info');
}
