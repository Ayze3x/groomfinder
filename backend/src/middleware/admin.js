/**
 * src/middleware/admin.js
 * Role-based Access Control — Admin Guard
 * Must be used AFTER the protect middleware.
 *
 * Usage: router.post('/salons', protect, adminOnly, createSalon)
 */

export function adminOnly(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Access denied. Admin privileges required.',
        });
    }

    next();
}

/**
 * Salon Owner Guard — admin can only manage their OWN salon
 * Checks that req.user.salonId matches the :salonId param
 */
export function ownSalonOnly(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    const requestedSalonId = req.params.salonId || req.params.id;
    if (req.user.salonId && req.user.salonId !== requestedSalonId) {
        return res.status(403).json({
            error: 'Access denied. You can only manage your own salon.',
        });
    }

    next();
}

export default adminOnly;
