/**
 * js/admin.js
 * Admin panel API helper functions
 * Used to power the admin dashboard with real backend data.
 */

import api from './api.js';

// ── Salon Management ──────────────────────────────────────

/**
 * Fetch the admin's own salon from the backend
 */
export async function adminGetMySalon(salonId) {
    const res = await api.get(`/salons/${salonId}`);
    return res.ok ? res.data.salon : null;
}

/**
 * Update salon info (name, services, location, hours, etc.)
 */
export async function adminUpdateSalon(salonId, data) {
    const res = await api.put(`/salons/${salonId}`, data);
    if (res.ok) {
        showToast('Salon updated successfully!', 'success');
        return { ok: true, salon: res.data.salon };
    }
    showToast(res.error || 'Failed to update salon.', 'error');
    return { ok: false, error: res.error };
}

// ── Bookings Management ───────────────────────────────────

/**
 * Get all bookings for a salon (with optional status/date filter)
 */
export async function adminGetBookings(salonId, filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const res = await api.get(`/bookings/salon/${salonId}${params ? '?' + params : ''}`);
    return res.ok ? { ok: true, bookings: res.data.bookings } : { ok: false, bookings: [] };
}

/**
 * Update a booking's status (arrived, completed, noshow, cancelled)
 */
export async function adminUpdateBookingStatus(bookingId, status, adminNote = '') {
    const res = await api.put(`/bookings/${bookingId}/status`, { status, adminNote });
    if (res.ok) {
        showToast(`Booking marked as ${status}.`, 'success');
        return { ok: true };
    }
    showToast(res.error || 'Failed to update booking.', 'error');
    return { ok: false };
}

// ── Slot Management ───────────────────────────────────────

/**
 * Add available time slots for a salon on a date
 * @param {string} salonId
 * @param {string} date - YYYY-MM-DD
 * @param {string[]} times - e.g. ["09:00", "09:30", ...]
 */
export async function adminAddSlots(salonId, date, times) {
    const res = await api.post(`/slots/${salonId}`, { date, times });
    if (res.ok) {
        showToast(`${times.length} slots added for ${date}!`, 'success');
        return { ok: true, slots: res.data.slots };
    }
    showToast(res.error || 'Failed to add slots.', 'error');
    return { ok: false, error: res.error };
}

/**
 * Remove un-booked slots for a salon on a date
 */
export async function adminRemoveSlots(salonId, date) {
    const res = await api.delete(`/slots/${salonId}?date=${date}`);
    if (res.ok) {
        showToast(`Slots cleared for ${date}.`, 'success');
        return { ok: true };
    }
    showToast(res.error || 'Failed to remove slots.', 'error');
    return { ok: false };
}

/**
 * Generate slots from a time range and interval
 * Admin helper — not an API call
 */
export function generateSlotTimes(openTime = '09:00', closeTime = '21:00', intervalMin = 30) {
    const times = [];
    let [h, m] = openTime.split(':').map(Number);
    const [endH, endM] = closeTime.split(':').map(Number);
    const endTotal = endH * 60 + endM - 60; // stop 1h before close

    while (h * 60 + m <= endTotal) {
        times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        m += intervalMin;
        if (m >= 60) { m = 0; h++; }
    }
    return times;
}

// ── Render: Slot Manager UI ───────────────────────────────
/**
 * renderSlotManagerSection(containerId, salonId, openTime, closeTime)
 * Renders the "Manage Availability" section inside the admin panel.
 */
export function renderSlotManagerSection(containerId, salonId, openTime = '09:00', closeTime = '21:00') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Generate next 7 days
    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
    });

    const slotTimes = generateSlotTimes(openTime, closeTime);
    const today = dates[0];

    container.innerHTML = `
  <div class="admin-slot-manager">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
      <h3 style="font-size:1.1rem;font-weight:700">Manage Availability</h3>
      <select id="admin-slot-date-picker" class="input-field" style="width:auto;min-width:160px"
              onchange="adminLoadSlotsForDate(this.value,'${salonId}')">
        ${dates.map(d => `<option value="${d}">${d}</option>`).join('')}
      </select>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      <button class="btn btn-primary btn-sm" onclick="adminAddAllSlots('${salonId}')">
        <i class="ph ph-plus"></i>Add All Slots
      </button>
      <button class="btn btn-ghost btn-sm" style="color:var(--danger)"
              onclick="adminClearSlots('${salonId}')">
        <i class="ph ph-trash"></i>Clear Date
      </button>
    </div>

    <div id="admin-slot-grid-container">
      <p style="color:var(--text-muted);font-size:0.84rem">Loading slots for ${today}…</p>
    </div>
  </div>`;

    // Wire global handler functions
    window.adminLoadSlotsForDate = async (date, sid) => {
        const gridContainer = document.getElementById('admin-slot-grid-container');
        if (!gridContainer) return;
        gridContainer.innerHTML = '<div class="location-spinner" style="margin:0 auto"></div>';
        const res = await api.get(`/slots/${sid}?date=${date}`);
        if (!res.ok) {
            gridContainer.innerHTML = '<p style="color:var(--danger)">Failed to load slots.</p>';
            return;
        }
        const { slots } = res.data;
        gridContainer.innerHTML = `
    <div class="slot-time-grid">
      ${slots.map(s => `
      <div class="slot-time-btn ${s.isBooked ? 'slot-booked' : 'slot-free'}" style="cursor:default">
        ${formatTime12h(s.time)}
        ${s.isBooked ? '<br><small style="font-size:0.6rem">Booked</small>' : ''}
      </div>`).join('')}
    </div>
    <p style="font-size:0.8rem;color:var(--text-muted);margin-top:10px">
      ${slots.filter(s => !s.isBooked).length}/${slots.length} available
    </p>`;
    };

    window.adminAddAllSlots = async (sid) => {
        const date = document.getElementById('admin-slot-date-picker')?.value || today;
        const times = generateSlotTimes(openTime, closeTime);
        await adminAddSlots(sid, date, times);
        window.adminLoadSlotsForDate(date, sid);
    };

    window.adminClearSlots = async (sid) => {
        const date = document.getElementById('admin-slot-date-picker')?.value || today;
        await adminRemoveSlots(sid, date);
        window.adminLoadSlotsForDate(date, sid);
    };

    // Load today's slots
    window.adminLoadSlotsForDate(today, salonId);
}

function formatTime12h(time) {
    const [h, m] = time.split(':').map(Number);
    const period = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}
