/**
 * src/models/Salon.js
 * Salon model — mirrors the frontend SALONS_BASE data structure
 */

import mongoose from 'mongoose';

// Sub-schema for individual services
const serviceSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    duration: { type: Number, required: true }, // minutes
    price: { type: Number, required: true },    // INR
    category: { type: String, enum: ['small', 'major'], default: 'small' },
}, { _id: false });

// Sub-schema for coupons
const couponSchema = new mongoose.Schema({
    id: { type: String, required: true },
    code: { type: String, required: true, uppercase: true },
    type: { type: String, enum: ['percent', 'flat'], required: true },
    value: { type: Number, required: true },
    description: { type: String },
    minOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    expiry: { type: String }, // ISO date string YYYY-MM-DD
}, { _id: false });

const salonSchema = new mongoose.Schema(
    {
        // Basic info
        name: {
            type: String,
            required: [true, 'Salon name is required'],
            trim: true,
            maxlength: [100, 'Name too long'],
        },
        category: {
            type: String,
            enum: ['salon', 'barber', 'beauty', 'spa', 'unisex'],
            required: true,
        },
        tagline: { type: String, trim: true },
        address: { type: String, required: true, trim: true },
        phone: { type: String, trim: true },

        // Location — used for geo-proximity filtering
        location: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },

        // Admin who manages this salon
        adminEmail: { type: String, lowercase: true, trim: true },
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

        // Operating hours
        openTime: { type: String, default: '09:00' },
        closeTime: { type: String, default: '21:00' },

        // Ratings
        rating: { type: Number, default: 4.0, min: 0, max: 5 },
        reviewCount: { type: Number, default: 0 },

        // Images
        image: { type: String, default: '' },
        galleryImages: [{ type: String }],

        // Services offered
        services: [serviceSchema],

        // Coupons / promotions
        coupons: [couponSchema],

        // Tags for search/filter
        tags: [{ type: String }],

        // Live traffic data
        currentPeopleCount: { type: Number, default: 0, min: 0 },
        avgServiceTime: { type: Number, default: 45 }, // minutes

        // Loyalty
        loyaltyPointsPerVisit: { type: Number, default: 50 },

        // Verified badge
        verified: { type: Boolean, default: false },

        // Soft-delete flag
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual: traffic level derived from current count
salonSchema.virtual('trafficLevel').get(function () {
    if (this.currentPeopleCount <= 5) return 'Low';
    if (this.currentPeopleCount <= 10) return 'Moderate';
    return 'High';
});

// Virtual: estimated waiting minutes
salonSchema.virtual('waitingMinutes').get(function () {
    return this.currentPeopleCount * this.avgServiceTime;
});

// Indexes
salonSchema.index({ 'location.lat': 1, 'location.lng': 1 });
salonSchema.index({ category: 1 });
salonSchema.index({ adminId: 1 });
salonSchema.index({ isActive: 1 });

const Salon = mongoose.model('Salon', salonSchema);
export default Salon;
