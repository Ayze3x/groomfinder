/**
 * src/models/User.js
 * User model — supports both email/password and Firebase OTP users
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        },
        passwordHash: {
            type: String,
            // Not required — Firebase OTP users have no password
        },
        phone: {
            type: String,
            trim: true,
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        // Firebase UID — set when user logs in via Firebase OTP
        firebaseUid: {
            type: String,
            sparse: true, // allows multiple null values in a unique field
        },
        // For admin users — which salon they manage
        salonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Salon',
            default: null,
        },
        loyaltyPoints: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Track last login for analytics
        lastLoginAt: {
            type: Date,
        },
    },
    {
        timestamps: true, // createdAt, updatedAt
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Hash password before saving ──────────────────────────
userSchema.pre('save', async function (next) {
    // Only hash if password was modified
    if (!this.isModified('passwordHash') || !this.passwordHash) return next();
    const saltRounds = 12;
    this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
    next();
});

// ── Instance method: compare password ──────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.passwordHash) return false;
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

// ── Remove sensitive fields when serializing ──────────
userSchema.methods.toSafeObject = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    delete obj.__v;
    return obj;
};

// Indexes for fast lookup
userSchema.index({ email: 1 });
userSchema.index({ firebaseUid: 1 }, { sparse: true });

const User = mongoose.model('User', userSchema);
export default User;
