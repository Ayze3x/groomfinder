/**
 * js/location.js
 * Leaflet + OpenStreetMap integration (100% FREE)
 * Used on salon detail pages to show the salon's real location.
 */

let _leafletLoaded = false;

/**
 * Load Leaflet CSS + JS from CDN (lazy, once)
 */
function loadLeaflet() {
    if (_leafletLoaded || window.L) { _leafletLoaded = true; return Promise.resolve(); }

    return new Promise((resolve, reject) => {
        // Load Leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => { _leafletLoaded = true; resolve(); };
        script.onerror = () => reject(new Error('Leaflet failed to load'));
        document.head.appendChild(script);
    });
}

/**
 * initSalonMap(containerId, lat, lng, salonName, address)
 *
 * Renders a real Leaflet/OpenStreetMap map inside the given container element.
 * Shows a marker at the salon's coordinates with a popup.
 */
export async function initSalonMap(containerId, lat, lng, salonName, address = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        await loadLeaflet();
    } catch (err) {
        container.innerHTML = `
    <div class="map-error-fallback">
      <i class="ph ph-map-trifold" style="font-size:2rem;color:var(--text-muted)"></i>
      <p style="color:var(--text-muted);margin-top:8px;font-size:0.84rem">Map unavailable. Check internet connection.</p>
    </div>`;
        return;
    }

    // Clear container
    container.innerHTML = '';
    container.style.height = container.style.height || '280px';
    container.style.borderRadius = container.style.borderRadius || 'var(--radius-lg, 16px)';
    container.style.overflow = 'hidden';
    container.style.zIndex = '1';

    // Initialize Leaflet map
    const map = window.L.map(containerId, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: false, // prevent accidental scroll-zoom on mobile
    });

    // OpenStreetMap tile layer (free, no API key needed)
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
    }).addTo(map);

    // Custom marker icon (purple pin matching AuraCraft brand)
    const icon = window.L.divIcon({
        className: '',
        html: `<div style="
      width:36px;height:36px;
      background:linear-gradient(135deg,#8B5CF6,#EC4899);
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -40],
    });

    // Add marker with popup
    const marker = window.L.marker([lat, lng], { icon }).addTo(map);
    marker.bindPopup(`
    <div style="font-family:system-ui,sans-serif;min-width:160px">
      <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px">${salonName}</div>
      <div style="font-size:0.8rem;color:#666;margin-bottom:8px">${address}</div>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}"
         target="_blank" rel="noopener"
         style="color:#8B5CF6;font-size:0.82rem;font-weight:600;text-decoration:none">
        🧭 Get Directions →
      </a>
    </div>
  `).openPopup();

    return map;
}

/**
 * openGoogleMapsDirections(lat, lng)
 * Opens Google Maps with the salon as the destination
 */
export function openGoogleMapsDirections(lat, lng) {
    window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        '_blank',
        'noopener'
    );
}

/**
 * renderMapPlaceholder(containerId, lat, lng, salonName)
 * Lightweight "get directions" button — no map library needed
 * Used in cards where a full map is too heavy
 */
export function renderMapButton(lat, lng) {
    return `
  <button class="btn btn-secondary btn-sm" style="gap:6px"
          onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}','_blank','noopener')">
    <i class="ph ph-navigation-arrow"></i>Get Directions
  </button>`;
}
