/**
 * src/config/firebase-admin.js
 * Firebase Admin SDK initialization — used to verify phone OTP tokens
 *
 * Setup:
 *  1. Go to Firebase Console → Project Settings → Service Accounts
 *  2. Click "Generate new private key" → download JSON
 *  3. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env
 */

import admin from 'firebase-admin';

let firebaseAdmin = null;

export function getFirebaseAdmin() {
    if (firebaseAdmin) return firebaseAdmin.auth();

    const {
        FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL,
        FIREBASE_PRIVATE_KEY,
    } = process.env;

    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
        throw new Error(
            'Firebase Admin credentials not set. ' +
            'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env'
        );
    }

    // The private key from .env has escaped newlines — fix them
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

    firebaseAdmin = admin.initializeApp(
        {
            credential: admin.credential.cert({
                projectId: FIREBASE_PROJECT_ID,
                clientEmail: FIREBASE_CLIENT_EMAIL,
                privateKey,
            }),
        },
        'auracraft-admin' // named app instance to avoid conflicts
    );

    console.log('✅ Firebase Admin SDK initialized');
    return firebaseAdmin.auth();
}

export default getFirebaseAdmin;
