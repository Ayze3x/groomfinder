// AuraCraft — Firebase Client SDK Configuration
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDq2_1MavuvLCzAqdhUMgMPmgW5VSN8bq8",
    authDomain: "auracraft-e12b1.firebaseapp.com",
    projectId: "auracraft-e12b1",
    storageBucket: "auracraft-e12b1.firebasestorage.app",
    messagingSenderId: "992334492656",
    appId: "1:992334492656:web:e5e101259f7f9c2ee1e335",
    measurementId: "G-TS401L48BT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services used across the app
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
