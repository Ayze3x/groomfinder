/**
 * src/config/db.js
 * MongoDB Atlas connection using Mongoose with retry logic
 */

import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB() {
    if (isConnected) return;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is not defined in environment variables');
    }

    try {
        const conn = await mongoose.connect(uri, {
            // These options ensure a stable connection in Atlas
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`❌ MongoDB connection error: ${err.message}`);
        // Retry after 5 seconds
        console.log('⏳ Retrying in 5 seconds...');
        await new Promise(r => setTimeout(r, 5000));
        return connectDB(); // recursive retry
    }

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
        isConnected = false;
        console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB error:', err.message);
    });
}

export default connectDB;
