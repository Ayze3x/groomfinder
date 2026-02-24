/**
 * src/routes/salon.routes.js
 */
import { Router } from 'express';
import {
    getSalons,
    getSalonById,
    createSalon,
    updateSalon,
    deleteSalon,
} from '../controllers/salon.controller.js';
import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/admin.js';

const router = Router();

// GET /api/salons?category=&lat=&lng=&radius=&search=&sort=
router.get('/', getSalons);

// GET /api/salons/:id
router.get('/:id', getSalonById);

// POST /api/salons — admin only: create a salon
router.post('/', protect, adminOnly, createSalon);

// PUT /api/salons/:id — admin only: update salon info
router.put('/:id', protect, adminOnly, updateSalon);

// DELETE /api/salons/:id — admin only: soft-delete
router.delete('/:id', protect, adminOnly, deleteSalon);

export default router;
