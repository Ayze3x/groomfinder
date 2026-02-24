/**
 * js/slots.js
 * Salon availability slot picker UI
 * Fetches available time slots from the backend and renders a timetable grid.
 */

import api from './api.js';

let _selectedSlot = null;
let _selectedDate = null;
let _onSlotSelect = null;

/**
 * initSlotPicker(containerId, salonId, options)
 * Renders a date picker + time slot grid inside the given container.
 *
 * options:
 *   onSelect(date, time) — called when user picks a slot
 *   preselectedDate — default date (YYYY-MM-DD)
 */
export async function initSlotPicker(containerId, salonId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    _onSlotSelect = options.onSelect || (() => { });

    // Default to today if not specified
    const today = new Date();
    const defaultDate = options.preselectedDate || today.toISOString().split('T')[0];
    _selectedDate = defaultDate;

    // Generate next 7 days for the date picker
    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return d;
    });

    const datePickerHtml = dates.map(d => {
        const iso = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
        const dayNum = d.getDate();
        const monthName = d.toLocaleDateString('en-IN', { month: 'short' });
        const isToday = iso === defaultDate;
        return `
    <button class="slot-date-chip ${isToday ? 'active' : ''}" data-date="${iso}"
            onclick="selectSlotDate('${iso}','${salonId}','${containerId}')">
      <div class="slot-date-day">${dayName}</div>
      <div class="slot-date-num">${dayNum}</div>
      <div class="slot-date-month">${monthName}</div>
    </button>`;
    }).join('');

    container.innerHTML = `
  <div class="slot-picker">
    <div class="slot-section-label">Choose a Date</div>
    <div class="slot-date-row">${datePickerHtml}</div>
    <div class="slot-section-label" style="margin-top:16px">Available Times</div>
    <div id="${containerId}-grid" class="slot-grid">
      <div class="slot-loading"><div class="location-spinner"></div><p>Loading slots…</p></div>
    </div>
  </div>`;

    // Register the selectSlotDate function globally so onclick works
    window.selectSlotDate = selectSlotDate;
    window.pickSlot = pickSlot;

    // Load slots for default date
    await loadAndRenderSlots(salonId, defaultDate, `${containerId}-grid`);
}

// ── Called when a date chip is clicked ─────────────────
async function selectSlotDate(date, salonId, containerId) {
    _selectedDate = date;
    _selectedSlot = null;

    // Update active chip
    document.querySelectorAll('.slot-date-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.date === date);
    });

    await loadAndRenderSlots(salonId, date, `${containerId}-grid`);

    // Trigger callback with null to clear previous selection
    if (_onSlotSelect) _onSlotSelect(date, null);
}

// ── Fetch slots from API and render the grid ───────────
export async function loadAndRenderSlots(salonId, date, gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    grid.innerHTML = '<div class="slot-loading"><div class="location-spinner"></div><p>Loading…</p></div>';

    const res = await api.get(`/slots/${salonId}?date=${date}`);

    if (res.offline || !res.ok) {
        // Offline fallback: generate from standard hours
        const fallbackSlots = generateFallbackSlots();
        renderSlotGrid(grid, fallbackSlots);
        return;
    }

    const { slots, available } = res.data;

    if (!slots || slots.length === 0) {
        grid.innerHTML = `
    <div class="no-salons" style="padding:24px">
      <i class="ph ph-calendar-x"></i>
      <p>No slots available for this date.</p>
    </div>`;
        return;
    }

    const info = document.createElement('div');
    info.style.cssText = 'font-size:0.78rem;color:var(--text-muted);margin-bottom:10px';
    info.textContent = `${available} of ${slots.length} slots open`;
    grid.innerHTML = '';
    grid.appendChild(info);

    renderSlotGrid(grid, slots);
}

function renderSlotGrid(grid, slots) {
    const slotGrid = document.createElement('div');
    slotGrid.className = 'slot-time-grid';

    slots.forEach(slot => {
        const btn = document.createElement('button');
        btn.className = `slot-time-btn ${slot.isBooked ? 'slot-booked' : 'slot-free'} ${_selectedSlot === slot.time ? 'slot-selected' : ''}`;
        btn.disabled = slot.isBooked;
        btn.textContent = formatTime12h(slot.time);
        btn.dataset.time = slot.time;

        if (!slot.isBooked) {
            btn.onclick = () => pickSlot(slot.time, btn);
        }

        slotGrid.appendChild(btn);
    });

    grid.appendChild(slotGrid);

    // Legend
    const legend = document.createElement('div');
    legend.className = 'slot-legend';
    legend.innerHTML = `
  <span class="slot-legend-item"><span class="slot-legend-dot slot-free"></span>Available</span>
  <span class="slot-legend-item"><span class="slot-legend-dot slot-booked"></span>Booked</span>
  <span class="slot-legend-item"><span class="slot-legend-dot slot-selected"></span>Selected</span>`;
    grid.appendChild(legend);
}

function pickSlot(time, btn) {
    _selectedSlot = time;

    // Update UI — highlight selected button
    document.querySelectorAll('.slot-time-btn').forEach(b => {
        b.classList.toggle('slot-selected', b.dataset.time === time);
    });

    if (_onSlotSelect) _onSlotSelect(_selectedDate, time);
}

// ── Getters ──────────────────────────────────────────────
export function getSelectedSlot() {
    return { date: _selectedDate, time: _selectedSlot };
}

// ── Offline fallback 30-min slots ────────────────────────
function generateFallbackSlots() {
    const slots = [];
    for (let h = 9; h < 20; h++) {
        slots.push({ time: `${String(h).padStart(2, '0')}:00`, isBooked: false });
        slots.push({ time: `${String(h).padStart(2, '0')}:30`, isBooked: false });
    }
    return slots;
}

function formatTime12h(time) {
    const [h, m] = time.split(':').map(Number);
    const period = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}
