/**
 * src/routes/slots.routes.js
 */
import { Router } from 'express';
import { getSlots, addSlots, removeSlots } from '../controllers/slots.controller.js';
import { protect } from '../middleware/auth.js';
import { ownSalonOnly } from '../middleware/admin.js';

const router = Router();

// GET /api/slots/:salonId?date=YYYY-MM-DD — public: view available slots
router.get('/:salonId', getSlots);

// POST /api/slots/:salonId — admin only: define available slots for a date
router.post('/:salonId', protect, ownSalonOnly, addSlots);

// DELETE /api/slots/:salonId?date=YYYY-MM-DD — admin only: remove un-booked slots
router.delete('/:salonId', protect, ownSalonOnly, removeSlots);

export default router;
