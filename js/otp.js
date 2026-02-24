/**
 * js/otp.js
 * AuraCraft — Firebase Phone OTP Verification
 *
 * Flow:
 * 1. login page calls sendOTP() → stores verificationId in sessionStorage → redirects here
 * 2. User enters 6-digit OTP → verifyOTP() confirms with Firebase
 * 3. exchanges Firebase ID token for app JWT → saves to localStorage → redirects to app
 */

// ── Config ────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDq2_1MavuvLCzAqdhUMgMPmgW5VSN8bq8",
    authDomain: "auracraft-e12b1.firebaseapp.com",
    projectId: "auracraft-e12b1",
    storageBucket: "auracraft-e12b1.firebasestorage.app",
    messagingSenderId: "992334492656",
    appId: "1:992334492656:web:e5e101259f7f9c2ee1e335",
};

const API_BASE = 'http://localhost:5000/api';

// ── Firebase init (compat SDK) ────────────────────────────────────
if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
}
const firebaseAuth = firebase.auth();

// ── State ─────────────────────────────────────────────────────────
let phoneNumber = '';
let verificationId = '';
let timerInterval = null;
let secondsLeft = 120;

// ── Init ──────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    // Read phone + verificationId from sessionStorage (set by login page)
    phoneNumber = sessionStorage.getItem('otp_phone') || '';
    verificationId = sessionStorage.getItem('otp_verificationId') || '';

    // Display phone number
    const phoneDisplay = document.getElementById('otp-phone-display');
    if (phoneDisplay) phoneDisplay.textContent = phoneNumber || 'your phone';

    if (!verificationId) {
        showStatus('No OTP session found. Please go back and send OTP again.', 'error');
        return;
    }

    initOTPBoxes();
    startTimer();
});

// ── OTP Box Logic ─────────────────────────────────────────────────
function initOTPBoxes() {
    const boxes = document.querySelectorAll('.otp-box');

    boxes.forEach((box, i) => {
        box.addEventListener('keydown', (e) => {
            // Allow: backspace, delete, tab, arrows
            if (e.key === 'Backspace') {
                if (box.value === '' && i > 0) {
                    boxes[i - 1].focus();
                    boxes[i - 1].value = '';
                    boxes[i - 1].classList.remove('filled');
                }
            }
        });

        box.addEventListener('input', (e) => {
            // Strip non-digits
            box.value = box.value.replace(/\D/g, '');
            box.classList.toggle('filled', box.value.length > 0);

            if (box.value && i < boxes.length - 1) {
                boxes[i + 1].focus();
            }

            checkAllFilled(boxes);
        });

        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
            [...pasted.slice(0, 6)].forEach((char, idx) => {
                if (boxes[idx]) {
                    boxes[idx].value = char;
                    boxes[idx].classList.add('filled');
                }
            });
            const next = Math.min(pasted.length, 5);
            boxes[next].focus();
            checkAllFilled(boxes);
        });
    });

    // Focus first box
    boxes[0]?.focus();
}

function checkAllFilled(boxes) {
    const otp = [...boxes].map(b => b.value).join('');
    const btn = document.getElementById('verify-btn');
    const allFilled = otp.length === 6;
    if (btn) btn.disabled = !allFilled;

    // Auto-submit when all 6 filled
    if (allFilled) {
        setTimeout(() => verifyOTP(), 300);
    }
}

function getOTPValue() {
    return [...document.querySelectorAll('.otp-box')].map(b => b.value).join('');
}

function setBoxState(state) {
    document.querySelectorAll('.otp-box').forEach(b => {
        b.classList.remove('error', 'success');
        if (state) b.classList.add(state);
    });
}

// ── Timer ─────────────────────────────────────────────────────────
function startTimer() {
    secondsLeft = 120;
    updateTimerDisplay();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        secondsLeft--;
        updateTimerDisplay();

        if (secondsLeft <= 0) {
            clearInterval(timerInterval);
            const resendBtn = document.getElementById('resend-btn');
            if (resendBtn) resendBtn.classList.add('active');
        }
    }, 1000);
}

function updateTimerDisplay() {
    const el = document.getElementById('timer-display');
    if (!el) return;
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Resend OTP ────────────────────────────────────────────────────
window.resendOTP = async function () {
    if (!phoneNumber) { showStatus('Phone number not found. Go back and try again.', 'error'); return; }

    const resendBtn = document.getElementById('resend-btn');
    resendBtn.classList.remove('active');
    resendBtn.textContent = 'Sending…';
    clearStatus();

    try {
        // Create a fresh invisible reCAPTCHA for resend
        if (window.recaptchaVerifier) {
            try { window.recaptchaVerifier.clear(); } catch (_) { }
        }
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            size: 'invisible',
            callback: () => { },
            'expired-callback': () => { window.recaptchaVerifier = null; },
        });

        const confirmation = await firebaseAuth.signInWithPhoneNumber(phoneNumber, window.recaptchaVerifier);
        verificationId = confirmation.verificationId;
        sessionStorage.setItem('otp_verificationId', verificationId);

        // Clear boxes
        document.querySelectorAll('.otp-box').forEach(b => { b.value = ''; b.classList.remove('filled', 'error', 'success'); });
        document.querySelectorAll('.otp-box')[0]?.focus();
        document.getElementById('verify-btn').disabled = true;

        startTimer();
        showToast('OTP sent again! Check your SMS.', 'success');
        resendBtn.textContent = 'Resend OTP';
    } catch (err) {
        console.error('Resend error:', err);
        showStatus(friendlyError(err), 'error');
        resendBtn.textContent = 'Resend OTP';
        resendBtn.classList.add('active');
    }
};

// ── Verify OTP ────────────────────────────────────────────────────
window.verifyOTP = async function () {
    const otp = getOTPValue();
    if (otp.length !== 6) { showStatus('Please enter all 6 digits.', 'error'); return; }
    if (!verificationId) { showStatus('OTP session expired. Resend OTP.', 'error'); return; }

    const btn = document.getElementById('verify-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>&nbsp; Verifying…';
    clearStatus();

    try {
        // Use PhoneAuthProvider.credential to confirm — works cross-page!
        const credential = firebase.auth.PhoneAuthProvider.credential(verificationId, otp);
        const result = await firebaseAuth.signInWithCredential(credential);

        setBoxState('success');
        showToast('OTP verified! Logging you in…', 'success');

        // Get Firebase ID token and exchange for backend JWT
        const idToken = await result.user.getIdToken();
        await exchangeForJWT(idToken, result.user.phoneNumber);

    } catch (err) {
        console.error('Verify OTP error:', err);
        setBoxState('error');
        showStatus(friendlyError(err), 'error');
        btn.innerHTML = '<i class="ph ph-shield-check"></i>&nbsp; Verify OTP';
        btn.disabled = false;
    }
};

// ── Exchange Firebase ID token for backend JWT ────────────────────
async function exchangeForJWT(idToken, phone) {
    try {
        const res = await fetch(`${API_BASE}/auth/firebase-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firebaseIdToken: idToken }),
        });

        const data = await res.json();

        if (res.ok && data.token) {
            // Save JWT + session
            localStorage.setItem('gf_jwt', data.token);
            const session = {
                type: 'customer',
                email: data.user?.email || `${data.user?.id}@otp.local`,
                name: data.user?.name || phone,
                phone: data.user?.phone || phone,
                id: data.user?.id,
                role: data.user?.role || 'customer',
                loyaltyPoints: data.user?.loyaltyPoints || 0,
                _source: 'otp',
            };
            sessionStorage.setItem('gf_session', JSON.stringify(session));

            // Clean up OTP state
            sessionStorage.removeItem('otp_phone');
            sessionStorage.removeItem('otp_verificationId');

            showToast('Welcome to AuraCraft! 🎉', 'success');
            setTimeout(() => { window.location.href = 'index.html#/discover'; }, 1200);

        } else {
            // Backend unavailable — use Firebase session only
            console.warn('Backend JWT exchange failed, using Firebase session:', data);
            const session = {
                type: 'customer',
                email: phone + '@otp.local',
                name: phone,
                phone,
                _source: 'firebase-otp-offline',
            };
            sessionStorage.setItem('gf_session', JSON.stringify(session));
            sessionStorage.removeItem('otp_phone');
            sessionStorage.removeItem('otp_verificationId');

            showToast('Logged in (offline mode)', 'info');
            setTimeout(() => { window.location.href = 'index.html#/discover'; }, 1200);
        }

    } catch (err) {
        console.error('JWT exchange error:', err);
        // Network error — still log in via Firebase session
        const session = {
            type: 'customer',
            email: phone + '@otp.local',
            name: phone,
            phone,
            _source: 'firebase-otp-offline',
        };
        sessionStorage.setItem('gf_session', JSON.stringify(session));
        showToast('Logged in (backend unreachable)', 'info');
        setTimeout(() => { window.location.href = 'index.html#/discover'; }, 1200);
    }
}

// ── Helpers ───────────────────────────────────────────────────────
function friendlyError(err) {
    switch (err.code) {
        case 'auth/invalid-verification-code': return 'Incorrect OTP. Please try again.';
        case 'auth/code-expired': return 'OTP expired. Click Resend OTP.';
        case 'auth/session-expired': return 'Session expired. Click Resend OTP.';
        case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment.';
        case 'auth/invalid-phone-number': return 'Invalid phone number format.';
        default: return err.message || 'Something went wrong. Please try again.';
    }
}

function showStatus(msg, type) {
    const el = document.getElementById('status-msg');
    if (!el) return;
    el.textContent = msg;
    el.className = `status-msg ${type}`;
}

function clearStatus() {
    const el = document.getElementById('status-msg');
    if (el) { el.textContent = ''; el.className = 'status-msg'; }
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = `${icons[type] || ''} ${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}
