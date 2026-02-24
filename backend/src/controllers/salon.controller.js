/**
 * src/controllers/salon.controller.js
 * CRUD for salons — public reads, admin-only writes
 */

import Salon from '../models/Salon.js';

// ── Helper: calculate haversine distance ─────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
        * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── GET /api/salons ──────────────────────────────────────
export async function getSalons(req, res) {
    try {
        const {
            category,
            lat,
            lng,
            radius = 5, // km
            search,
            sort = 'distance',
        } = req.query;

        const filter = { isActive: true };
        if (category && category !== 'all') filter.category = category;

        let salons = await Salon.find(filter).select('-__v').lean();

        // Attach distance if coordinates provided
        if (lat && lng) {
            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);
            salons = salons
                .map(s => ({
                    ...s,
                    distance: haversineKm(userLat, userLng, s.location.lat, s.location.lng),
                }))
                .filter(s => parseFloat(radius) >= 999 || s.distance <= parseFloat(radius))
                .sort((a, b) =>
                    sort === 'rating' ? b.rating - a.rating : a.distance - b.distance
                );
        }

        // Text search
        if (search) {
            const q = search.toLowerCase();
            salons = salons.filter(
                s =>
                    s.name.toLowerCase().includes(q) ||
                    s.tagline?.toLowerCase().includes(q) ||
                    s.address.toLowerCase().includes(q) ||
                    (s.tags || []).some(t => t.toLowerCase().includes(q))
            );
        }

        res.json({ salons, count: salons.length });
    } catch (err) {
        console.error('getSalons error:', err);
        res.status(500).json({ error: 'Failed to fetch salons.' });
    }
}

// ── GET /api/salons/:id ──────────────────────────────────
export async function getSalonById(req, res) {
    try {
        const salon = await Salon.findOne({
            _id: req.params.id,
            isActive: true,
        }).select('-__v').lean();

        if (!salon) {
            return res.status(404).json({ error: 'Salon not found.' });
        }

        res.json({ salon });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid salon ID format.' });
        }
        console.error('getSalonById error:', err);
        res.status(500).json({ error: 'Failed to fetch salon.' });
    }
}

// ── POST /api/salons (admin only) ────────────────────────
export async function createSalon(req, res) {
    try {
        const {
            name, category, tagline, address, phone,
            openTime, closeTime, image, galleryImages,
            services, coupons, tags, verified,
            avgServiceTime, loyaltyPointsPerVisit,
            location, // { lat, lng }
        } = req.body;

        if (!name || !category || !address || !location?.lat || !location?.lng) {
            return res.status(400).json({
                error: 'Fields required: name, category, address, location.lat, location.lng',
            });
        }

        const salon = await Salon.create({
            name, category, tagline, address, phone,
            openTime, closeTime, image, galleryImages,
            services: services || [],
            coupons: coupons || [],
            tags: tags || [],
            verified: verified || false,
            avgServiceTime: avgServiceTime || 45,
            loyaltyPointsPerVisit: loyaltyPointsPerVisit || 50,
            location: { lat: location.lat, lng: location.lng },
            adminId: req.user.id,
            adminEmail: req.user.email,
        });

        res.status(201).json({ message: 'Salon created.', salon });
    } catch (err) {
        console.error('createSalon error:', err);
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ error: errors.join(', ') });
        }
        res.status(500).json({ error: 'Failed to create salon.' });
    }
}

// ── PUT /api/salons/:id (admin only) ─────────────────────
export async function updateSalon(req, res) {
    try {
        const salon = await Salon.findById(req.params.id);
        if (!salon) return res.status(404).json({ error: 'Salon not found.' });

        // Ensure admin owns this salon
        if (
            req.user.role !== 'admin' ||
            (salon.adminId && salon.adminId.toString() !== req.user.id)
        ) {
            return res.status(403).json({ error: 'You can only update your own salon.' });
        }

        // Fields that can be updated
        const allowed = [
            'name', 'tagline', 'address', 'phone', 'openTime', 'closeTime',
            'image', 'galleryImages', 'services', 'coupons', 'tags', 'verified',
            'avgServiceTime', 'loyaltyPointsPerVisit', 'location',
            'currentPeopleCount',
        ];

        allowed.forEach(field => {
            if (req.body[field] !== undefined) {
                salon[field] = req.body[field];
            }
        });

        await salon.save();
        res.json({ message: 'Salon updated.', salon });
    } catch (err) {
        console.error('updateSalon error:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to update salon.' });
    }
}

// ── DELETE /api/salons/:id (admin only) ──────────────────
export async function deleteSalon(req, res) {
    try {
        const salon = await Salon.findById(req.params.id);
        if (!salon) return res.status(404).json({ error: 'Salon not found.' });

        // Soft-delete
        salon.isActive = false;
        await salon.save();

        res.json({ message: 'Salon removed from listing.' });
    } catch (err) {
        console.error('deleteSalon error:', err);
        res.status(500).json({ error: 'Failed to delete salon.' });
    }
}
