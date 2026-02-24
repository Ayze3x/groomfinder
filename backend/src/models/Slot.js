/**
 * src/models/Slot.js
 * Time slot availability model — tracks which slots exist per salon per date
 * and whether they have been booked.
 */

import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema(
    {
        salonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Salon',
            required: true,
        },
        // Format: YYYY-MM-DD
        date: {
            type: String,
            required: true,
            match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
        },
        // Format: HH:MM (24-hour)
        time: {
            type: String,
            required: true,
            match: [/^\d{2}:\d{2}$/, 'Time must be HH:MM'],
        },
        isBooked: {
            type: Boolean,
            default: false,
        },
        // Reference to the booking that claimed this slot
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate slots for same salon + date + time
slotSchema.index({ salonId: 1, date: 1, time: 1 }, { unique: true });
// Fast lookup by salon and date
slotSchema.index({ salonId: 1, date: 1 });

const Slot = mongoose.model('Slot', slotSchema);
export default Slot;
