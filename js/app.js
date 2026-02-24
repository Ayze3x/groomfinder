// AuraCraft v3 – App Router & Entry Point (Backend-connected)
import { getCurrentSession, endSession, registerCustomer, loginCustomer, loginStore, sendPhoneOTP, verifyPhoneOTP, fillDemoCredentials } from './auth.js';
import { initiatePayment, renderPaymentSummary } from './payment.js';
import { initSlotPicker, getSelectedSlot } from './slots.js';
import { initSalonMap, openGoogleMapsDirections } from './location.js';
import { renderSlotManagerSection, adminGetBookings, adminUpdateBookingStatus } from './admin.js';

// Make key functions available globally (called from HTML onclick attrs)
window.navigateTo = navigateTo;
window.fillDemoCredentials = fillDemoCredentials;
window.openGoogleMapsDirections = openGoogleMapsDirections;

// ── Critical: expose auth session helpers to legacy global scripts ──
// settings.js, ui.js, bookings.js are plain scripts that can't ES-import.
// They call these functions directly — must be on window.
window.getCurrentSession = getCurrentSession;
window.endSession = endSession;

// ── Global showToast — used by settings.js, ui.js and inline onclick attrs ──
window.showToast = function (msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.style.cssText = `
    position:relative;display:flex;align-items:center;gap:10px;
    padding:12px 18px;border-radius:12px;font-size:0.875rem;font-weight:500;
    min-width:260px;max-width:340px;pointer-events:auto;
    box-shadow:0 8px 24px rgba(0,0,0,0.4);animation:toastIn 0.3s ease;
    ${type === 'success' ? 'background:#065f46;border:1px solid #34d399;color:#a7f3d0' :
      type === 'error' ? 'background:#7f1d1d;border:1px solid #f87171;color:#fecaca' :
        type === 'warning' ? 'background:#78350f;border:1px solid #fbbf24;color:#fde68a' :
          'background:#1e1b4b;border:1px solid #818cf8;color:#c7d2fe'}
  `;
  t.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
};
// Alias used in some older templates
window.showNotification = window.showToast;

// AuraCraft v3 – App Router & Entry Point
let _userLocation = null;
let _currentLocationLabel = localStorage.getItem('gf_location_label') || '';
let _currentRoute = null;
let _discoverySort = "distance"; // "distance" | "smart"
let _discoveryView = "grid"; // "grid" | "list"
let _discoveryFilter = "all";
let _discoverySearch = "";

// ═══════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════
function navigateTo(path) {
  history.pushState({}, "", "#" + path);
  handleRoute(path);
}

function handleRoute(path) {
  _currentRoute = path;
  const pages = document.querySelectorAll(".page");
  pages.forEach(p => p.classList.add("hidden"));

  const session = getCurrentSession();

  // Auth guards
  const customerRoutes = ["/discover", "/salon/", "/book/", "/my-bookings", "/payment"];
  const adminRoutes = ["/admin"];
  const settingsRoute = ["/settings"];
  if (customerRoutes.some(r => path.startsWith(r)) && (!session || session.type !== "customer")) {
    navigateTo("/customer-login"); return;
  }
  if (adminRoutes.some(r => path.startsWith(r)) && (!session || session.type !== "store")) {
    navigateTo("/store-login"); return;
  }
  if (settingsRoute.some(r => path.startsWith(r)) && !session) {
    navigateTo("/"); return;
  }

  if (path === "/" || path === "") {
    show("page-landing");
  } else if (path === "/customer-login") {
    show("page-customer-login"); renderAuthPage("customer");
  } else if (path === "/store-login") {
    show("page-store-login"); renderAuthPage("store");
  } else if (path === "/discover") {
    show("page-discover"); initDiscovery();
  } else if (path.startsWith("/salon/")) {
    const id = path.split("/")[2].split("?")[0];
    show("page-salon-detail"); showSalonDetail(id);
  } else if (path.startsWith("/book/")) {
    const cleanPath = path.split("?")[0];          // strip query string first
    const id = cleanPath.split("/")[2];              // now safe to split on /
    const params = new URLSearchParams(path.split("?")[1] || "");
    show("page-book"); initBookingPage(id, params.get("service"));
  } else if (path === "/payment") {
    show("page-payment"); initPaymentPage();
  } else if (path === "/my-bookings") {
    show("page-my-bookings"); initMyBookingsPage();
  } else if (path === "/admin" || path.startsWith("/admin")) {
    show("page-admin"); initAdminPage(path);
  } else if (path === "/settings") {
    show("page-settings"); renderSettingsPage();
  } else {
    navigateTo("/");
  }
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

// ═══════════════════════════════════════════
// AUTH RENDERING
// ═══════════════════════════════════════════
function renderAuthPage(type) {
  const pageId = type === "customer" ? "page-customer-login" : "page-store-login";
  const page = document.getElementById(pageId);
  const isStore = type === "store";

  page.innerHTML = `
  <div class="auth-page">
    <div class="auth-bg"><div class="landing-bg"><div class="landing-orb orb-1"></div><div class="landing-orb orb-2"></div></div></div>
    <div class="auth-box">
      <div class="auth-logo">
        <img src="images/auracraft-logo.jpg" alt="AuraCraft" class="auth-logo-img">
        <div class="auth-logo-text">AuraCraft</div>
      </div>
      <div class="auth-type-badge ${type}">${isStore ? "🏪 Store Admin" : "👤 Customer"}</div>
      <div class="auth-title" id="auth-title">${isStore ? "Store Login" : "Welcome back"}</div>
      <div class="auth-sub" id="auth-sub">${isStore ? "Log in to manage your store" : "Log in to discover & book"}</div>
      <form class="auth-form" id="auth-form" onsubmit="handleAuthSubmit(event,'${type}')">
        <div id="name-field" class="input-group" style="display:none">
          <label class="input-label">Full Name</label>
          <input id="auth-name" class="input-field" placeholder="Your name" autocomplete="name">
        </div>
        <div class="input-group">
          <label class="input-label">Email</label>
          <input id="auth-email" class="input-field" type="email" placeholder="${isStore ? "admin@yoursalon.com" : "you@example.com"}" required autocomplete="email">
        </div>
        <div class="input-group">
          <label class="input-label">Password</label>
          <input id="auth-password" class="input-field" type="password" placeholder="••••••••" required autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-primary btn-lg" id="auth-submit-btn">${isStore ? "Sign In" : "Login"}</button>
      </form>
      ${isStore ? `<div class="demo-creds" style="margin-top:14px;cursor:pointer" onclick="fillDemoCredentials('admin@bladelounge.com','blade123')" title="Click to auto-fill"><span style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">👆 Click to auto-fill demo</span><br><strong>Email:</strong> admin@bladelounge.com<br><strong>Password:</strong> blade123</div>` : ""}
      ${!isStore ? `<div class="auth-footer" id="auth-footer">Don't have an account? <button type="button" class="btn-link" onclick="toggleAuthMode('${type}')">Sign up</button></div>` : ""}
      ${!isStore ? `
      <div class="otp-login-section">
        <div class="otp-divider">or continue with</div>
        <div id="otp-phone-step">
          <div class="otp-phone-wrap">
            <span class="phone-country-code">🇮🇳 +91</span>
            <input id="otp-phone-input" class="input-field" type="tel" placeholder="10-digit mobile number"
                   maxlength="10" inputmode="numeric" style="flex:1">
          </div>
          <button class="btn btn-secondary btn-lg" style="width:100%;margin-top:10px" onclick="handleSendOTP()">
            <i class="ph ph-device-mobile"></i>Send OTP
          </button>
          <div id="recaptcha-container"></div>
        </div>
        <div id="otp-verify-step" style="display:none">
          <p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:12px">Enter the 6-digit OTP sent to your number</p>
          <input id="otp-code-input" class="input-field" type="text" placeholder="Enter OTP" maxlength="6"
                 inputmode="numeric" style="letter-spacing:0.3em;font-size:1.2rem;text-align:center">
          <button class="btn btn-primary btn-lg" style="width:100%;margin-top:10px" onclick="handleVerifyOTP()">
            <i class="ph ph-check-circle"></i>Verify & Login
          </button>
          <div class="otp-timer">
            <button class="otp-resend-btn" id="otp-resend-btn" onclick="handleSendOTP()" disabled>Resend OTP</button>
            <span id="otp-timer-text"> in 30s</span>
          </div>
        </div>
      </div>` : ""}
      <div class="auth-footer" style="margin-top:12px"><a onclick="navigateTo('/')" style="color:var(--text-muted)">← Back to home</a></div>
    </div>
  </div>`;
  window._authMode = "login";

  // Wire OTP handlers
  window.handleSendOTP = async function () {
    const rawPhone = (document.getElementById('otp-phone-input')?.value || '').trim();
    if (!rawPhone || rawPhone.length < 10) { showToast('Enter a valid 10-digit number', 'error'); return; }
    const phone = '+91' + rawPhone;
    showToast('Sending OTP…', 'info');
    const res = await sendPhoneOTP(phone);
    if (!res.ok) { showToast(res.error || 'Failed to send OTP', 'error'); return; }
    document.getElementById('otp-phone-step').style.display = 'none';
    document.getElementById('otp-verify-step').style.display = 'block';
    showToast('OTP sent! Check your SMS.', 'success');
    // Start 30s countdown
    let secs = 30;
    const timerEl = document.getElementById('otp-timer-text');
    const resendBtn = document.getElementById('otp-resend-btn');
    if (resendBtn) resendBtn.disabled = true;
    const iv = setInterval(() => {
      secs--;
      if (timerEl) timerEl.textContent = secs > 0 ? ` in ${secs}s` : '';
      if (secs <= 0) { clearInterval(iv); if (resendBtn) resendBtn.disabled = false; }
    }, 1000);
  };
  window.handleVerifyOTP = async function () {
    const otp = (document.getElementById('otp-code-input')?.value || '').trim();
    if (!otp || otp.length < 6) { showToast('Enter the 6-digit OTP', 'error'); return; }
    showToast('Verifying OTP…', 'info');
    const res = await verifyPhoneOTP(otp);
    if (!res.ok) { showToast(res.error || 'OTP verification failed', 'error'); return; }
    showToast('Welcome to AuraCraft! 🎉', 'success');
    navigateTo('/discover');
  };
}

function toggleAuthMode(type) {
  window._authMode = window._authMode === "login" ? "register" : "login";
  const isReg = window._authMode === "register";
  document.getElementById("auth-title").textContent = isReg ? "Create account" : "Welcome back";
  document.getElementById("auth-sub").textContent = isReg ? "Get started with AuraCraft" : "Log in to discover & book";
  const nameField = document.getElementById("name-field");
  if (nameField) nameField.style.display = isReg ? "block" : "none";
  document.getElementById("auth-submit-btn").textContent = isReg ? "Create Account" : "Login";
  document.getElementById("auth-footer").innerHTML = isReg ? 'Already have an account? <a onclick="toggleAuthMode(\'customer\')">Sign in</a>' : 'Don\'t have an account? <a onclick="toggleAuthMode(\'customer\')">Sign up</a>';
}

async function handleAuthSubmit(e, type) {
  e.preventDefault();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const nameEl = document.getElementById("auth-name");
  const name = nameEl ? nameEl.value.trim() : "";
  const btn = document.getElementById("auth-submit-btn");
  btn.disabled = true; btn.textContent = "Please wait…";

  if (type === "store") {
    const result = await loginStore(email, password);
    if (!result.ok) { showToast(result.error, "error"); btn.disabled = false; btn.textContent = "Sign In"; return; }
    // Try to get salon info from session (backend) or local data (offline)
    const salonIdOrObj = result.session.salonId;
    const salon = salonIdOrObj ? (getSalonById(salonIdOrObj) || { name: result.session.salonName || 'Your Store' }) : { name: 'Your Store' };
    if (typeof seedAdminDemoBookings === 'function' && salonIdOrObj) seedAdminDemoBookings(salonIdOrObj, salon.name);
    showToast(`Welcome back, ${salon.name}!`, "success");
    navigateTo("/admin");
  } else {
    if (window._authMode === "register") {
      if (!name) { showToast("Enter your name", "error"); btn.disabled = false; btn.textContent = "Create Account"; return; }
      const result = await registerCustomer(email, password, name);
      if (!result.ok) { showToast(result.error, "error"); btn.disabled = false; btn.textContent = "Create Account"; return; }
      if (typeof seedDemoBookings === 'function') seedDemoBookings(email, name);
      showToast("Account created! Welcome to AuraCraft 🎉", "success");
      navigateTo("/discover");
    } else {
      const result = await loginCustomer(email, password);
      if (!result.ok) { showToast(result.error, "error"); btn.disabled = false; btn.textContent = "Login"; return; }
      showToast(`Welcome back, ${result.session.name}!`, "success");
      navigateTo("/discover");
    }
  }
}
window.handleAuthSubmit = handleAuthSubmit;
window.toggleAuthMode = toggleAuthMode;

// ═══════════════════════════════════════════
// DISCOVERY PAGE — Redesigned
// ═══════════════════════════════════════════

// Promo banner data (Unsplash photo IDs that reliably load)
const PROMO_BANNERS = [
  { title: 'Special Spa\nPackages', sub: 'Up to 30% off • Limited time', img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=480&q=80', dark: false },
  { title: 'Luxury Hair\nServices', sub: 'Book & save ₹200 today', img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=480&q=80', dark: true },
  { title: 'Premium\nBarber Cuts', sub: 'Walk-in friendly • from ₹299', img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=480&q=80', dark: true },
];

// Service category tiles
const SERVICE_TILES = [
  { label: 'Haircuts', img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=160&q=80', filter: 'barber' },
  { label: 'Spa', img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=160&q=80', filter: 'spa' },
  { label: 'Nail Care', img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=160&q=80', filter: 'beauty' },
  { label: 'Massage', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=160&q=80', filter: 'spa' },
  { label: 'Salon', img: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=160&q=80', filter: 'salon' },
  { label: 'Unisex', img: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=160&q=80', filter: 'unisex' },
];

// Per-salon Unsplash images map
const SALON_IMAGES = {
  sal_001: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80',
  sal_002: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80',
  sal_003: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400&q=80',
  sal_004: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&q=80',
  sal_005: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&q=80',
  sal_006: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&q=80',
  sal_007: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&q=80',
};

function initDiscovery() {
  const session = getCurrentSession();
  if (!session) return;
  const firstName = (session.name || 'there').split(' ')[0];
  const container = document.getElementById('page-discover');

  const promoBannersHtml = PROMO_BANNERS.map((b, i) => `
    <div class="promo-banner-card ${b.dark ? 'promo-banner-dark' : 'promo-banner-light'}"
         style="background-image:url('${b.img}')" onclick="setFilter('${i === 0 ? 'spa' : i === 1 ? 'salon' : 'barber'}')">
      <div class="promo-banner-overlay"></div>
      <div class="promo-banner-content">
        <div class="promo-banner-title">${b.title.replace('\n', '<br>')}</div>
        <div class="promo-banner-sub">${b.sub}</div>
      </div>
    </div>`).join('');

  const serviceTilesHtml = SERVICE_TILES.map(t => `
    <button class="service-tile" onclick="setFilter('${t.filter}')">
      <div class="service-tile-img" style="background-image:url('${t.img}')"></div>
      <span class="service-tile-label">${t.label}</span>
    </button>`).join('');

  const savedLocation = _currentLocationLabel || 'Mumbai, India';
  container.innerHTML = `
  <!-- Fixed bottom nav placeholder to push content up -->
  <div class="discover-scroll-wrap">

    <!-- ── TOP HEADER ── -->
    <div class="discover-header-bar">
      <div class="discover-greeting-col">
        <div class="discover-hi">Hi, ${firstName} 👋</div>
        <button class="discover-location-btn" onclick="openLocationPicker()">
          <i class="ph ph-map-pin" style="font-size:0.9rem;color:var(--brand-primary)"></i>
          <span id="location-label-text">${savedLocation}</span>
          <i class="ph ph-caret-down" style="font-size:0.7rem;color:var(--text-muted)"></i>
        </button>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="discover-nearby-pill" onclick="openNearbyMap()" title="Nearby salons on map">
          <i class="ph ph-map-trifold"></i> Nearby
        </button>
        <button class="discover-notif-btn" onclick="navigateTo('/settings')">
          <i class="ph ph-gear"></i>
        </button>
      </div>
    </div>

    <!-- ── SEARCH ── -->
    <div class="discover-search-wrap">
      <i class="ph ph-magnifying-glass discover-search-icon"></i>
      <input id="search-input" class="discover-search-input" placeholder="Find Salons, Spas, Barbers…"
             oninput="handleSearch(this.value)">
    </div>

    <!-- ── PROMO BANNERS ── -->
    <div class="discover-section-header">
      <span class="discover-section-title">Featured</span>
    </div>
    <div class="promo-banners-row" id="promo-banners-row">
      ${promoBannersHtml}
    </div>

    <!-- ── SERVICE CATEGORIES ── -->
    <div class="discover-section-header">
      <span class="discover-section-title">Services</span>
    </div>
    <div class="service-tiles-row">
      ${serviceTilesHtml}
    </div>

    <!-- ── FILTER CHIPS ── -->
    <div class="discover-section-header" style="margin-top:4px">
      <span class="discover-section-title">Explore</span>
      <div style="display:flex;gap:6px" id="sort-btns">
        <button class="discover-sort-btn ${_discoverySort === 'distance' ? 'active' : ''}" onclick="setSort('distance')"><i class="ph ph-navigation-arrow"></i> Near</button>
        <button class="discover-sort-btn ${_discoverySort === 'smart' ? 'active' : ''}" onclick="setSort('smart')"><i class="ph ph-star"></i> Smart</button>
      </div>
    </div>
    <div class="discover-chips-row" id="category-filters">
      ${[['all', 'All'], ['barber', 'Barber'], ['salon', 'Salon'], ['beauty', 'Beauty'], ['spa', 'Spa'], ['unisex', 'Unisex']].map(([k, l]) =>
    `<button class="discover-chip${_discoveryFilter === k ? ' active' : ''}" onclick="setFilter('${k}')">${l}</button>`
  ).join('')}
    </div>

    <!-- ── PROXIMITY BANNER ── -->
    <div id="proximity-banner-area"></div>

    <!-- ── SALONS LIST ── -->
    <div class="discover-section-header">
      <span class="discover-section-title">Top Rated Near You</span>
      <button class="discover-see-all" onclick="">See All</button>
    </div>
    <div id="discovery-results" class="discover-results-area">
      <div class="location-loading"><div class="location-spinner"></div><p>Detecting location…</p></div>
    </div>

    <!-- Bottom nav spacer -->
    <div style="height:calc(var(--bottom-nav-h) + 12px)"></div>
  </div>

  <!-- ── BOTTOM NAVIGATION ── -->
  <nav class="bottom-nav" id="bottom-nav">
    <button class="bottom-nav-item active" id="bnav-home" onclick="setDiscoveryBottomNav('home');navigateTo('/discover')">
      <i class="ph ph-house-simple"></i><span>Home</span>
    </button>
    <button class="bottom-nav-item" id="bnav-bookings" onclick="setDiscoveryBottomNav('bookings');navigateTo('/my-bookings')">
      <i class="ph ph-calendar-blank"></i><span>Bookings</span>
    </button>
    <button class="bottom-nav-item" id="bnav-offers" onclick="setDiscoveryBottomNav('offers');showToast('Offers coming soon!','info')">
      <i class="ph ph-tag"></i><span>Offers</span>
    </button>
    <button class="bottom-nav-item" id="bnav-profile" onclick="setDiscoveryBottomNav('profile');navigateTo('/settings')">
      <i class="ph ph-user-circle"></i><span>Profile</span>
    </button>
  </nav>`;

  detectAndLoadSalons();
}

function setDiscoveryBottomNav(tab) {
  ['home', 'bookings', 'offers', 'profile'].forEach(t => {
    const el = document.getElementById('bnav-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
}

// ═══════════════════════════════════════════
// NEARBY MAP MODAL (fake CSS map)
// ═══════════════════════════════════════════
function openNearbyMap() {
  const existing = document.getElementById('nearby-map-modal');
  if (existing) { closeNearbyMap(); return; }

  const salons = _userLocation
    ? getSalonsNearby(_userLocation.lat, _userLocation.lng, 5)
    : (typeof SALONS !== 'undefined' ? SALONS.slice(0, 7) : []);

  const mapW = 400, mapH = 340;
  const center = { x: mapW / 2, y: mapH / 2 };
  const pinColors = ['#8B6355', '#7A9E7E', '#D4A574', '#5B8DBE', '#C87563', '#6B8E7A', '#AD7D5E', '#8E7AAD'];
  const salonPins = salons.slice(0, 8).map((s, i) => {
    const angle = (i / Math.max(salons.slice(0, 8).length, 1)) * 2 * Math.PI - 0.3;
    const dist = s.distance != null ? Math.min(s.distance * 55, 140) : (50 + i * 22);
    const x = Math.round(center.x + Math.cos(angle) * dist);
    const y = Math.round(center.y + Math.sin(angle) * dist * 0.6);
    return { salon: s, x, y, color: pinColors[i % pinColors.length] };
  });

  const pinsHtml = salonPins.map(p => `
    <div class="map-salon-pin" style="left:${p.x}px;top:${p.y}px;background:${p.color}"
         onclick="closeNearbyMap();navigateTo('/salon/${p.salon.id}')">
      <i class="ph ph-scissors" style="font-size:0.7rem"></i>
      <div class="map-salon-label">${p.salon.name}</div>
    </div>`).join('');

  const modal = document.createElement('div');
  modal.id = 'nearby-map-modal';
  modal.className = 'nearby-map-modal-overlay';
  modal.innerHTML = `
    <div class="nearby-map-sheet">
      <div class="nearby-map-header">
        <div>
          <div style="font-weight:800;font-size:1rem">Salons Near You</div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">
            ${salons.length} places · <span>${_currentLocationLabel || 'Your area'}</span>
          </div>
        </div>
        <button class="map-close-btn" onclick="closeNearbyMap()"><i class="ph ph-x"></i></button>
      </div>

      <div class="fake-map-canvas" id="fake-map-canvas">
        <div class="map-grid-overlay"></div>
        <div class="map-road map-road-h" style="top:38%"></div>
        <div class="map-road map-road-h" style="top:60%"></div>
        <div class="map-road map-road-h map-road-thin" style="top:22%"></div>
        <div class="map-road map-road-h map-road-thin" style="top:75%"></div>
        <div class="map-road map-road-v" style="left:40%"></div>
        <div class="map-road map-road-v" style="left:63%"></div>
        <div class="map-road map-road-v map-road-thin" style="left:25%"></div>
        <div class="map-road map-road-v map-road-thin" style="left:78%"></div>
        <div class="map-park" style="left:53%;top:63%;width:58px;height:42px"></div>
        <div class="map-water" style="left:7%;top:8%;width:68px;height:48px;border-radius:12px"></div>
        <div class="map-building" style="left:18%;top:28%;width:42px;height:32px"></div>
        <div class="map-building" style="left:66%;top:18%;width:48px;height:36px"></div>
        <div class="map-building" style="left:71%;top:70%;width:36px;height:26px"></div>
        ${pinsHtml}
        <div class="map-user-pin" style="left:50%;top:50%">
          <div class="map-user-pulse"></div>
          <div class="map-user-dot"></div>
          <div class="map-user-label">You</div>
        </div>
        <div class="map-zoom-ctrl">
          <button class="map-zoom-btn" onclick="mapZoom(1)"><i class="ph ph-plus"></i></button>
          <button class="map-zoom-btn" onclick="mapZoom(-1)"><i class="ph ph-minus"></i></button>
        </div>
        <button class="map-locate-btn" onclick="mapLocateMe()"><i class="ph ph-crosshair-simple"></i></button>
      </div>

      <div class="map-salon-list">
        ${salons.slice(0, 5).map((s, i) => `
        <div class="map-salon-row" onclick="closeNearbyMap();navigateTo('/salon/${s.id}')">
          <div class="map-salon-dot" style="background:${pinColors[i % pinColors.length]}"></div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
            <div style="font-size:0.74rem;color:var(--text-muted)">${s.distance != null ? s.distance.toFixed(1) + ' km' : ''} · ⭐ ${s.rating}</div>
          </div>
          <span style="font-size:0.75rem;color:var(--brand-primary);font-weight:700;flex-shrink:0">View →</span>
        </div>`).join('')}
      </div>
    </div>`;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));
}

function closeNearbyMap() {
  const modal = document.getElementById('nearby-map-modal');
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => modal.remove(), 320);
}

function mapZoom(dir) {
  const canvas = document.getElementById('fake-map-canvas');
  if (!canvas) return;
  const current = parseFloat(canvas.dataset.zoom || '1');
  const next = Math.max(0.7, Math.min(1.6, current + dir * 0.15));
  canvas.dataset.zoom = next;
  canvas.style.transform = `scale(${next})`;
  canvas.style.transformOrigin = 'center center';
}

function mapLocateMe() {
  showToast('Centered on your location', 'info');
  const canvas = document.getElementById('fake-map-canvas');
  if (canvas) { canvas.dataset.zoom = '1'; canvas.style.transform = 'scale(1)'; }
}

// ═══════════════════════════════════════════
// LOCATION PICKER (Swiggy/Zomato style)
// ═══════════════════════════════════════════
const POPULAR_AREAS = [
  'Bandra West', 'Andheri East', 'Juhu', 'Powai', 'Kurla',
  'Worli', 'Lower Parel', 'Malad', 'Borivali', 'Thane'
];

const RECENT_LOCATIONS = [
  { label: 'Home', sub: 'Bandra West, Mumbai 400050', icon: 'ph-house-simple' },
  { label: 'Work', sub: 'BKC, Mumbai 400051', icon: 'ph-briefcase' },
];

function openLocationPicker() {
  const existing = document.getElementById('location-picker-modal');
  if (existing) { closeLocationPicker(); return; }

  const modal = document.createElement('div');
  modal.id = 'location-picker-modal';
  modal.className = 'loc-picker-overlay';
  modal.innerHTML = `
    <div class="loc-picker-sheet" id="loc-picker-sheet">
      <div class="loc-picker-handle"></div>
      <div class="loc-picker-header">
        <button class="loc-picker-back" onclick="closeLocationPicker()"><i class="ph ph-x"></i></button>
        <span style="font-weight:800;font-size:1rem">Choose Location</span>
        <span></span>
      </div>
      <div class="loc-search-wrap">
        <i class="ph ph-magnifying-glass loc-search-icon"></i>
        <input class="loc-search-input" id="loc-search-input"
               placeholder="Search area, landmark, salon…"
               oninput="filterLocationResults(this.value)">
        <button class="loc-search-clear" onclick="document.getElementById('loc-search-input').value='';filterLocationResults('')">
          <i class="ph ph-x"></i>
        </button>
      </div>
      <button class="loc-gps-btn" onclick="useCurrentGPSLocation()">
        <div class="loc-gps-icon"><i class="ph ph-crosshair-simple"></i></div>
        <div>
          <div style="font-weight:700;font-size:0.92rem">Use current location</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">Detect via GPS</div>
        </div>
        <i class="ph ph-arrow-right" style="margin-left:auto;color:var(--text-muted)"></i>
      </button>
      <div class="loc-section-label">Saved</div>
      <div class="loc-recent-list">
        ${RECENT_LOCATIONS.map(r => `
        <button class="loc-recent-item" onclick="selectLocation('${r.label}','${r.sub}')">
          <div class="loc-recent-icon"><i class="ph ${r.icon}"></i></div>
          <div>
            <div style="font-weight:700;font-size:0.88rem">${r.label}</div>
            <div style="font-size:0.74rem;color:var(--text-muted);margin-top:1px">${r.sub}</div>
          </div>
        </button>`).join('')}
      </div>
      <div class="loc-section-label">Popular Areas</div>
      <div class="loc-chips-wrap" id="loc-chips">
        ${POPULAR_AREAS.map(a => `
        <button class="loc-area-chip" onclick="selectLocation('${a}','${a}, Mumbai')">${a}</button>`).join('')}
      </div>
      <div id="loc-search-results" class="loc-search-results" style="display:none"></div>
    </div>`;

  modal.addEventListener('click', e => { if (e.target === modal) closeLocationPicker(); });
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));
  setTimeout(() => document.getElementById('loc-search-input')?.focus(), 360);
}

function closeLocationPicker() {
  const modal = document.getElementById('location-picker-modal');
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => modal.remove(), 350);
}

function selectLocation(label, sub) {
  _currentLocationLabel = label;
  localStorage.setItem('gf_location_label', label);
  const el = document.getElementById('location-label-text');
  if (el) el.textContent = label;
  closeLocationPicker();
  showToast('📍 Location set to ' + label, 'success');
  detectAndLoadSalons();
}

function useCurrentGPSLocation() {
  showToast('Detecting your location…', 'info');
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        _userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        selectLocation('Current Location', pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4));
      },
      () => {
        _userLocation = { lat: BASE_LAT, lng: BASE_LNG };
        selectLocation('Bandra, Mumbai', 'Bandra West, Mumbai 400050');
      },
      { timeout: 8000 }
    );
  } else {
    selectLocation('Bandra, Mumbai', 'Bandra West, Mumbai 400050');
  }
}

function filterLocationResults(val) {
  const resultsEl = document.getElementById('loc-search-results');
  const chipsEl = document.getElementById('loc-chips');
  if (!val.trim()) {
    if (resultsEl) resultsEl.style.display = 'none';
    if (chipsEl) chipsEl.style.display = 'flex';
    return;
  }
  if (chipsEl) chipsEl.style.display = 'none';
  const v = val.toLowerCase();
  const areaMatches = POPULAR_AREAS.filter(a => a.toLowerCase().includes(v))
    .map(a => ({ label: a, sub: a + ', Mumbai', type: 'area' }));
  const salonMatches = (typeof SALONS !== 'undefined' ? SALONS : [])
    .filter(s => s.address.toLowerCase().includes(v) || s.name.toLowerCase().includes(v))
    .map(s => ({ label: s.name, sub: s.address, type: 'salon', id: s.id }));
  const all = [...areaMatches, ...salonMatches];
  if (resultsEl) {
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = all.length ? all.map(r => `
      <button class="loc-result-item" onclick="${r.type === 'salon'
        ? `closeLocationPicker();navigateTo('/salon/${r.id}')`
        : `selectLocation('${r.label}','${r.sub}')`
      }">
        <i class="ph ${r.type === 'salon' ? 'ph-scissors' : 'ph-map-pin'}" style="color:var(--brand-primary);flex-shrink:0;font-size:1rem"></i>
        <div>
          <div style="font-weight:700;font-size:0.88rem">${r.label}</div>
          <div style="font-size:0.74rem;color:var(--text-muted)">${r.sub}</div>
        </div>
      </button>`).join('')
      : `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:0.85rem">No results for "${val}"</div>`;
  }
}


function detectAndLoadSalons() {
  // Always show salons immediately using fallback location — no blank screen
  if (!_userLocation) {
    _userLocation = { lat: BASE_LAT, lng: BASE_LNG };
    renderDiscovery();
  }
  // Silently refine with real GPS in the background
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        _userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        renderDiscovery();
      },
      () => { /* stay on demo location — already rendered */ },
      { timeout: 6000 }
    );
  }
}



function checkProximity() {
  if (!_userLocation) return;
  const nearby = getSalonsNearby(_userLocation.lat, _userLocation.lng, 0.2);
  if (nearby.length) {
    const area = document.getElementById('proximity-banner-area');
    if (!area) return;
    area.innerHTML = `
    <div class="proximity-banner-new" onclick="navigateTo('/salon/${nearby[0].id}')">
      <i class="ph ph-map-pin-line" style="color:var(--brand-primary);font-size:1.1rem"></i>
      <div style="flex:1">
        <div style="font-weight:700;font-size:0.88rem">📍 You're near ${nearby[0].name}!</div>
        <div style="font-size:0.78rem;color:var(--text-muted)">${(nearby[0].distance * 1000).toFixed(0)}m away · Walk in now!</div>
      </div>
      <i class="ph ph-arrow-right" style="color:var(--text-muted)"></i>
    </div>`;
  }
}

function renderDiscovery() {
  if (!_userLocation) return;
  let salons = getSalonsNearby(_userLocation.lat, _userLocation.lng, 5);
  // If no salons within 5km (real GPS far from demo data), show all with wider radius
  if (!salons.length) {
    salons = getSalonsNearby(_userLocation.lat, _userLocation.lng, 9999)
      .concat(getAllSalonsEnriched().map(s => ({ ...s, distance: null })));
    // Deduplicate by id
    const seen = new Set();
    salons = salons.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
  }
  if (_discoveryFilter !== 'all') salons = salons.filter(s => s.category === _discoveryFilter);
  if (_discoverySearch) {
    const q = _discoverySearch.toLowerCase();
    salons = salons.filter(s => s.name.toLowerCase().includes(q) || s.tagline.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q) || (s.tags || []).some(t => t.toLowerCase().includes(q)));
  }
  if (_discoverySort === 'smart') salons.sort((a, b) => getRecommendationScore(b) - getRecommendationScore(a));

  const container = document.getElementById('discovery-results');
  if (!container) return;

  if (!salons.length) {
    container.innerHTML = `<div class="no-salons"><i class="ph ph-magnifying-glass"></i><h3>No results</h3><p>Try a different filter or search term</p></div>`;
    return;
  }

  container.innerHTML = `<div class="discover-salon-grid">${salons.map(s => { try { return renderSalonCard(s); } catch (e) { console.error('Card error', s.id, e); return ''; } }).join('')}</div>`;
  checkProximity();
}


function setFilter(f) {
  _discoveryFilter = f;
  document.querySelectorAll('#category-filters .discover-chip').forEach(c =>
    c.classList.toggle('active', c.textContent.toLowerCase() === f || (f === 'all' && c.textContent === 'All'))
  );
  showFloatingFilterBadge(f);
  renderDiscovery();
}
function setSort(s) { _discoverySort = s; initDiscovery(); }
function setView(v) { _discoveryView = v; initDiscovery(); }
function handleSearch(val) { _discoverySearch = val; renderDiscovery(); }

// ═══════════════════════════════════════════
// SALON DETAIL
// ═══════════════════════════════════════════
async function showSalonDetail(id) {
  const salon = getSalonById(id);
  if (!salon) { showToast("Salon not found", "error"); navigateTo("/discover"); return; }
  renderSalonDetail(salon);
  // After the detail page renders, inject a real Leaflet map
  requestAnimationFrame(async () => {
    const mapContainer = document.getElementById('salon-leaflet-map');
    if (mapContainer && salon.lat && salon.lng) {
      mapContainer.style.height = '260px';
      await initSalonMap('salon-leaflet-map', salon.lat, salon.lng, salon.name, salon.address);
    } else if (mapContainer && salon.location) {
      mapContainer.style.height = '260px';
      await initSalonMap('salon-leaflet-map', salon.location.lat, salon.location.lng, salon.name, salon.address);
    }
  });
}

// ═══════════════════════════════════════════
// MY BOOKINGS
// ═══════════════════════════════════════════
function initMyBookingsPage() {
  const page = document.getElementById("page-my-bookings");
  page.innerHTML = `
  <div class="topbar">
    <button class="btn btn-ghost btn-icon" onclick="navigateTo('/discover')"><i class="ph ph-arrow-left"></i></button>
    <div class="topbar-title">My Bookings</div>
  </div>
  <div class="my-bookings-inner">
    <div class="loyalty-banner">
      <div class="loyalty-info">
        <span class="loyalty-icon">🏅</span>
        <div>
          <div style="display:flex;align-items:baseline;gap:6px">
            <span class="loyalty-pts" id="loyalty-points-display">0</span>
            <span style="font-size:0.82rem;color:var(--text-secondary)">loyalty points</span>
          </div>
          <div class="loyalty-label" id="loyalty-tier">Member</div>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm"><i class="ph ph-gift"></i>Redeem</button>
    </div>
    <div id="my-bookings-list"></div>
  </div>`;
  renderMyBookings();
}

// ═══════════════════════════════════════════
// PAYMENT PAGE
// ═══════════════════════════════════════════
const UPI_APPS = [
  { id: 'gpay', name: 'GPay', icon: '🟢', bg: '#1a73e8' },
  { id: 'phonepe', name: 'PhonePe', icon: '💜', bg: '#5f259f' },
  { id: 'paytm', name: 'Paytm', icon: '💙', bg: '#00b9f1' },
  { id: 'bhim', name: 'BHIM', icon: '🇮🇳', bg: '#ff6600' },
  { id: 'other', name: 'Other', icon: '📱', bg: '#555' },
];

let _payState = { method: null, upiApp: null, couponCode: '', appliedCoupon: null };

async function initPaymentPage() {
  const data = window._pendingPaymentBooking;
  if (!data) { navigateTo('/discover'); return; }

  _payState = { method: null, upiApp: null, couponCode: '', appliedCoupon: null };

  const page = document.getElementById('page-payment');
  const session = getCurrentSession();
  const finalAmt = data.finalPrice;
  const img = data.salonImg || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200';

  page.innerHTML = `
  <div class="payment-page-wrap" id="pay-wrap">

    <!-- Hero header -->
    <div class="payment-hero">
      <button style="position:absolute;top:16px;left:16px;background:rgba(0,0,0,0.15);border:none;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#0d0c0a;font-size:1.1rem" onclick="history.back()">
        <i class="ph ph-arrow-left"></i>
      </button>
      <div class="payment-hero-label">Total Amount</div>
      <div class="payment-hero-amount">₹<span id="pay-total-display">${finalAmt.toLocaleString('en-IN')}</span></div>
      <div class="payment-hero-salon">${data.salonName} · ${data.serviceName}</div>
    </div>

    <!-- Floating card -->
    <div class="payment-card-float">

      <!-- Booking summary strip -->
      <div class="payment-summary-strip">
        <img class="payment-summary-strip-img" src="${img}" alt="${data.salonName}" onerror="this.src='https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200'">
        <div class="payment-summary-strip-info">
          <div class="payment-summary-strip-salon">${data.salonName}</div>
          <div class="payment-summary-strip-meta">${data.date} · ${data.time} · ${data.serviceDuration} min</div>
        </div>
        <div class="payment-summary-strip-price">₹${finalAmt.toLocaleString('en-IN')}</div>
      </div>

      <!-- Payment methods -->
      <div class="payment-section-title">Choose Payment Method</div>
      <div class="payment-methods-grid">
        <div class="payment-method-card" id="pm-upi" onclick="selectPayMethod('upi')">
          <div class="payment-method-badge">Fastest</div>
          <div class="payment-method-icon"><i class="ph ph-device-mobile"></i></div>
          <div class="payment-method-name">UPI</div>
          <div class="payment-method-sub">GPay, PhonePe…</div>
        </div>
        <div class="payment-method-card" id="pm-card" onclick="selectPayMethod('card')">
          <div class="payment-method-icon"><i class="ph ph-credit-card"></i></div>
          <div class="payment-method-name">Cards</div>
          <div class="payment-method-sub">Debit / Credit</div>
        </div>
        <div class="payment-method-card" id="pm-netbanking" onclick="selectPayMethod('netbanking')">
          <div class="payment-method-icon"><i class="ph ph-bank"></i></div>
          <div class="payment-method-name">Net Banking</div>
          <div class="payment-method-sub">All major banks</div>
        </div>
        <div class="payment-method-card" id="pm-wallet" onclick="selectPayMethod('wallet')">
          <div class="payment-method-icon"><i class="ph ph-wallet"></i></div>
          <div class="payment-method-name">Wallets</div>
          <div class="payment-method-sub">Paytm, Amazon…</div>
        </div>
      </div>

      <!-- Dynamic sub-section (UPI apps / note) -->
      <div id="pay-method-detail"></div>

      <!-- Price breakdown -->
      <div class="payment-breakdown">
        <div class="payment-breakdown-row">
          <span style="color:var(--text-muted)">Service</span>
          <span>${data.serviceName}</span>
        </div>
        <div class="payment-breakdown-row">
          <span style="color:var(--text-muted)">Price</span>
          <span>₹${data.servicePrice.toLocaleString('en-IN')}</span>
        </div>
        ${data.discount > 0 ? `
        <div class="payment-breakdown-row payment-breakdown-discount">
          <span>Coupon Discount</span>
          <span>−₹${data.discount.toLocaleString('en-IN')}</span>
        </div>` : ''}
        <div id="extra-discount-row"></div>
        <div class="payment-breakdown-row total">
          <span>Total Payable</span>
          <span style="color:var(--brand-primary)">₹<span id="payable-total">${finalAmt.toLocaleString('en-IN')}</span></span>
        </div>
      </div>

      <!-- Coupon row -->
      <div class="payment-coupon-row">
        <input class="payment-coupon-input" id="pay-coupon-input" placeholder="Have a coupon code?" oninput="_payState.couponCode=this.value.toUpperCase()">
        <button class="btn btn-secondary btn-sm" onclick="applyPaymentCoupon()">Apply</button>
      </div>
      <div id="pay-coupon-msg" style="font-size:0.78rem;padding:6px 16px 0;color:#34d399"></div>

      <!-- Trust bar -->
      <div class="payment-trust-bar">
        <span class="payment-trust-item"><i class="ph ph-lock-simple-open" style="color:#34d399"></i> SSL Secured</span>
        <span class="payment-trust-item"><i class="ph ph-shield-check" style="color:#a78bfa"></i> PCI-DSS Compliant</span>
        <span class="payment-trust-item"><i class="ph ph-bank" style="color:var(--brand-primary)"></i> RBI Approved</span>
      </div>

    </div><!-- /card-float -->

    <!-- Pay button -->
    <div class="payment-cta-footer" style="margin-top:20px">
      <button class="payment-pay-btn" id="pay-btn" onclick="triggerRazorpay()" disabled>
        <i class="ph ph-lock-simple"></i> Pay ₹<span id="pay-btn-amount">${finalAmt.toLocaleString('en-IN')}</span> Securely
      </button>
      <div style="text-align:center;font-size:0.72rem;color:var(--text-muted);margin-top:10px">
        <i class="ph ph-shield-check" style="color:#34d399"></i> Powered by <strong>Razorpay</strong> · Your card details are never stored
      </div>
    </div>

  </div>`;

  window.selectPayMethod = function (method) {
    _payState.method = method;
    // Highlight selected card
    ['upi', 'card', 'netbanking', 'wallet'].forEach(m => {
      const el = document.getElementById('pm-' + m);
      if (el) el.classList.toggle('selected', m === method);
    });
    // Show method-specific detail
    const detail = document.getElementById('pay-method-detail');
    if (method === 'upi') {
      detail.innerHTML = `
        <div class="payment-upi-options" id="upi-apps">
          ${UPI_APPS.map(a => `
          <button class="payment-upi-app-btn" id="upi-${a.id}" onclick="selectUpiApp('${a.id}')">
            <div class="payment-upi-app-icon" style="background:${a.bg}20;color:${a.bg}">${a.icon}</div>
            <div class="payment-upi-app-name">${a.name}</div>
          </button>`).join('')}
        </div>
        <div class="payment-upi-id-wrap">
          <input class="payment-upi-id-input" id="upi-id-input" placeholder="Or enter UPI ID (e.g. name@upi)">
        </div>`;
    } else if (method === 'card') {
      detail.innerHTML = `<div style="padding:12px 16px 0;font-size:0.8rem;color:var(--text-muted)"><i class="ph ph-info"></i> You'll enter your card details securely in the Razorpay checkout popup</div>`;
    } else if (method === 'netbanking') {
      detail.innerHTML = `<div style="padding:12px 16px 0;font-size:0.8rem;color:var(--text-muted)"><i class="ph ph-bank"></i> Select your bank in the Razorpay checkout popup (70+ banks supported)</div>`;
    } else if (method === 'wallet') {
      detail.innerHTML = `<div style="padding:12px 16px 0;font-size:0.8rem;color:var(--text-muted)"><i class="ph ph-wallet"></i> Paytm, Amazon Pay, Mobikwik and more — available in checkout</div>`;
    }
    // Enable pay button
    const btn = document.getElementById('pay-btn');
    if (btn) btn.disabled = false;
  };

  window.selectUpiApp = function (appId) {
    _payState.upiApp = appId;
    UPI_APPS.forEach(a => {
      const el = document.getElementById('upi-' + a.id);
      if (el) el.classList.toggle('selected', a.id === appId);
    });
  };
}

function applyPaymentCoupon() {
  const data = window._pendingPaymentBooking;
  if (!data) return;
  const code = _payState.couponCode.trim();
  if (!code) { showToast('Enter a coupon code', 'error'); return; }
  const result = validateCoupon(code, data.salonId, data.servicePrice);
  const msgEl = document.getElementById('pay-coupon-msg');
  if (!result.ok) {
    if (msgEl) { msgEl.style.color = '#f87171'; msgEl.textContent = result.error; }
    showToast(result.error, 'error');
    return;
  }
  _payState.appliedCoupon = result;
  const newTotal = result.finalAmount;
  // Update displays
  const totalDisplay = document.getElementById('pay-total-display');
  const payableTotal = document.getElementById('payable-total');
  const btnAmt = document.getElementById('pay-btn-amount');
  const stripPrice = document.querySelector('.payment-summary-strip-price');
  if (totalDisplay) totalDisplay.textContent = newTotal.toLocaleString('en-IN');
  if (payableTotal) payableTotal.textContent = newTotal.toLocaleString('en-IN');
  if (btnAmt) btnAmt.textContent = newTotal.toLocaleString('en-IN');
  if (stripPrice) stripPrice.textContent = '₹' + newTotal.toLocaleString('en-IN');
  const extraRow = document.getElementById('extra-discount-row');
  if (extraRow) extraRow.innerHTML = `<div class="payment-breakdown-row payment-breakdown-discount"><span>Extra Coupon</span><span>−₹${result.discount.toLocaleString('en-IN')}</span></div>`;
  if (msgEl) { msgEl.style.color = '#34d399'; msgEl.textContent = `${result.coupon.description} — ₹${result.discount} saved!`; }
  showToast(`Coupon applied! ₹${result.discount} off`, 'success');
  // Update pending booking final price
  data.finalPrice = newTotal;
  data.discount = (data.discount || 0) + result.discount;
}

async function triggerRazorpay() {
  const data = window._pendingPaymentBooking;
  if (!data) { showToast('No pending booking found.', 'error'); return; }
  if (!_payState.method) { showToast('Select a payment method first', 'error'); return; }

  const btn = document.getElementById('pay-btn');
  if (btn) { btn.disabled = true; btn.classList.add('loading'); btn.innerHTML = '<i class="ph ph-spinner"></i> Opening Razorpay…'; }

  // Load Razorpay script
  const scriptLoaded = await new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });

  if (!scriptLoaded) {
    showToast('Payment service unavailable. Please try again.', 'error');
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); btn.innerHTML = `<i class="ph ph-lock-simple"></i> Pay ₹${data.finalPrice.toLocaleString('en-IN')} Securely`; }
    return;
  }

  const session = getCurrentSession();
  const keyId = 'rzp_live_SJbHZQEPbXNT0Q'; // frontend key (public)

  const options = {
    key: keyId,
    amount: Math.round(data.finalPrice * 100), // paise
    currency: 'INR',
    name: 'AuraCraft',
    description: `${data.serviceName} at ${data.salonName}`,
    image: '/images/auracraft-logo.jpg',
    prefill: {
      name: session?.name || '',
      email: session?.email || '',
    },
    notes: {
      salonName: data.salonName,
      serviceName: data.serviceName,
      date: data.date,
      time: data.time,
    },
    theme: { color: '#FDBE19' },
    method: _payState.method === 'upi' ? { upi: true, card: false, netbanking: false, wallet: false } :
      _payState.method === 'card' ? { upi: false, card: true, netbanking: false, wallet: false } :
        _payState.method === 'netbanking' ? { upi: false, card: false, netbanking: true, wallet: false } :
          { upi: false, card: false, netbanking: false, wallet: true },

    handler: async function (response) {
      // Payment success — create booking & show confirmation
      showToast('Payment successful! Confirming booking…', 'success');
      const booking = createBooking({
        salonId: data.salonId, salonName: data.salonName,
        serviceId: data.serviceId, serviceName: data.serviceName,
        servicePrice: data.servicePrice, serviceDuration: data.serviceDuration,
        customerEmail: data.customerEmail, customerName: data.customerName,
        date: data.date, time: data.time,
        paymentType: 'prepaid',
        appliedCoupon: data.appliedCoupon || null,
        finalPrice: data.finalPrice,
      });
      // Award loyalty points
      addLoyaltyPoints(data.customerEmail, 30);
      // Clear pending state
      window._pendingPaymentBooking = null;
      // Show payment success
      showPaymentSuccess(booking, data, response);
    },

    modal: {
      ondismiss: function () {
        showToast('Payment cancelled.', 'info');
        if (btn) {
          btn.disabled = false;
          btn.classList.remove('loading');
          btn.innerHTML = `<i class="ph ph-lock-simple"></i> Pay ₹${data.finalPrice.toLocaleString('en-IN')} Securely`;
        }
      },
    },
  };

  // Pre-fill UPI VPA if user typed one
  const upiIdInput = document.getElementById('upi-id-input');
  if (_payState.method === 'upi' && upiIdInput?.value) {
    options.prefill.vpa = upiIdInput.value.trim();
  }

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', function (response) {
    showToast(`Payment failed: ${response.error.description || 'Please try again'}`, 'error');
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.innerHTML = `<i class="ph ph-lock-simple"></i> Pay ₹${data.finalPrice.toLocaleString('en-IN')} Securely`;
    }
  });
  rzp.open();
}

function showPaymentSuccess(booking, data, rzpResponse) {
  const page = document.getElementById('page-payment');
  page.innerHTML = `
  <div class="payment-success-wrap">
    <div class="payment-success-ring"><i class="ph ph-check"></i></div>
    <h2 class="payment-success-title">Payment Done!</h2>
    <p class="payment-success-sub">Your appointment is confirmed and you're in the priority queue.</p>

    <div class="payment-queue-pill">
      <i class="ph ph-lightning-a"></i> Queue Priority · ${booking.queueNumber || 'Q01'}
    </div>
    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:28px">${booking.peopleAhead || 0} people ahead · ~${booking.estimatedWaitMin || 0}m wait</div>

    <div class="payment-rzp-badge">
      <i class="ph ph-shield-check" style="color:#34d399"></i> Secured by Razorpay
      ${rzpResponse?.razorpay_payment_id ? `· ID: ${rzpResponse.razorpay_payment_id}` : ''}
    </div>

    <div class="payment-success-receipt">
      <div class="payment-success-receipt-header">
        <i class="ph ph-receipt"></i> Booking Receipt
      </div>
      <div class="payment-success-row">
        <span class="payment-success-label">Salon</span>
        <span class="payment-success-val">${data.salonName}</span>
      </div>
      <div class="payment-success-row">
        <span class="payment-success-label">Service</span>
        <span class="payment-success-val">${data.serviceName}</span>
      </div>
      <div class="payment-success-row">
        <span class="payment-success-label">Date & Time</span>
        <span class="payment-success-val">${data.date} · ${data.time}</span>
      </div>
      <div class="payment-success-row">
        <span class="payment-success-label">Duration</span>
        <span class="payment-success-val">${data.serviceDuration} min</span>
      </div>
      <div class="payment-success-row">
        <span class="payment-success-label">Queue #</span>
        <span class="payment-success-val" style="color:var(--brand-primary);font-weight:800">${booking.queueNumber || '—'}</span>
      </div>
      <div class="payment-success-row" style="background:rgba(253,190,25,0.05)">
        <span class="payment-success-label">Amount Paid</span>
        <span class="payment-success-val" style="color:var(--brand-primary);font-size:1.05rem;font-weight:800">₹${data.finalPrice.toLocaleString('en-IN')}</span>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:360px">
      <button class="btn btn-primary btn-lg" onclick="navigateTo('/discover')" style="width:100%">
        <i class="ph ph-house-simple"></i> Back to Home
      </button>
      <button class="btn btn-secondary" onclick="navigateTo('/my-bookings')" style="width:100%">
        <i class="ph ph-calendar-blank"></i> View My Bookings
      </button>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════
function openAdminDrawer() {
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('admin-drawer-overlay');
  if (sidebar) sidebar.classList.add('admin-drawer-open');
  if (overlay) overlay.classList.add('active');
}

function closeAdminDrawer() {
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('admin-drawer-overlay');
  if (sidebar) sidebar.classList.remove('admin-drawer-open');
  if (overlay) overlay.classList.remove('active');
}

function initAdminPage(path) {
  const session = getCurrentSession();
  if (!session || session.type !== 'store') return;
  const salon = getSalonById(session.salonId);

  const adminNavItems = [
    { view: 'dashboard', icon: 'ph-house-line', label: 'Dashboard' },
    { view: 'bookings', icon: 'ph-calendar-check', label: 'Bookings' },
    { view: 'availability', icon: 'ph-calendar-dots', label: 'Availability' },
    { view: 'queue', icon: 'ph-list-numbers', label: 'Queue' },
    { view: 'services', icon: 'ph-scissors', label: 'Services' },
    { view: 'coupons', icon: 'ph-tag', label: 'Coupons & Offers' },
    { view: 'users', icon: 'ph-users-three', label: 'User Management' },
    { view: 'reports', icon: 'ph-chart-bar', label: 'Reports' },
    { view: 'settings', icon: 'ph-gear', label: 'Settings' },
  ];

  const page = document.getElementById('page-admin');
  page.innerHTML = `
  <!-- Mobile drawer overlay: must be at page level, not inside the overflow:hidden flex wrapper -->
  <div id="admin-drawer-overlay" class="admin-drawer-overlay" onclick="closeAdminDrawer()"></div>

  <div style="display:flex;flex:1;min-height:0;position:relative">
    <!-- Sidebar (drawer on mobile) -->
    <div class="admin-sidebar" id="admin-sidebar">
      <div class="admin-sidebar-header">
        <div style="display:flex;align-items:center;gap:10px;flex:1">
          <img src="images/auracraft-logo.jpg" alt="AuraCraft" class="auth-logo-img" style="width:32px;height:32px;border-radius:6px;object-fit:cover">
          <div>
            <div style="font-size:0.72rem;color:var(--text-muted)">Admin Panel</div>
            <div style="font-size:0.9rem;font-weight:700" id="admin-dash-title">${salon.name}</div>
          </div>
        </div>
        <!-- Close btn (mobile only) -->
        <button class="btn btn-ghost btn-icon admin-drawer-close" onclick="closeAdminDrawer()" aria-label="Close menu">
          <i class="ph ph-x"></i>
        </button>
      </div>

      <!-- Profile mini card -->
      <div class="admin-sidebar-profile">
        <div class="admin-sidebar-avatar">${salon.name.charAt(0)}</div>
        <div>
          <div style="font-size:0.82rem;font-weight:600">${salon.name}</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">${session.email}</div>
        </div>
      </div>

      <nav style="flex:1;padding:12px 8px;display:flex;flex-direction:column;gap:2px;overflow-y:auto" id="admin-nav">
        ${adminNavItems.map(item => `
        <button class="admin-nav-btn" data-view="${item.view}" onclick="switchAdminView('${item.view}','${session.salonId}');closeAdminDrawer()"
          style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:var(--radius-md);font-size:0.88rem;font-weight:500;color:var(--text-secondary);text-align:left;width:100%;transition:all var(--transition)">
          <i class="ph ${item.icon}" style="font-size:1.1rem"></i>${item.label}
        </button>`).join('')}
      </nav>

      <div style="padding:12px 8px;border-top:1px solid var(--border)">
        <button class="btn btn-ghost" style="width:100%;justify-content:flex-start;gap:10px;color:var(--danger)" onclick="logoutUser()">
          <i class="ph ph-sign-out"></i>Logout
        </button>
      </div>
    </div>

    <!-- Main content area -->
    <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column" id="admin-main-content">

      <!-- Mobile topbar (hamburger) -->
      <div class="admin-mobile-topbar">
        <button class="btn btn-ghost btn-icon" onclick="openAdminDrawer()" aria-label="Open menu">
          <i class="ph ph-list" style="font-size:1.4rem"></i>
        </button>
        <div style="display:flex;align-items:center;gap:8px">
          <img src="images/auracraft-logo.jpg" alt="AuraCraft" class="auth-logo-img" style="width:28px;height:28px;border-radius:6px;object-fit:cover">
          <span style="font-family:var(--font-display);font-size:1rem;font-weight:700">${salon.name}</span>
        </div>
        <button class="btn btn-ghost btn-icon" onclick="switchAdminView('settings','${session.salonId}')" aria-label="Settings">
          <i class="ph ph-gear" style="font-size:1.2rem"></i>
        </button>
      </div>

      <!-- Dashboard view -->
      <div id="admin-view-dashboard" class="admin-inner">
        <div style="margin-bottom:20px">
          <h2 style="font-size:1.3rem;font-weight:800">Dashboard</h2>
          <p style="color:var(--text-secondary);font-size:0.84rem">${salon.address}</p>
        </div>
        <div id="admin-traffic-control"></div>
        <div class="stats-grid" id="admin-stats-grid"></div>
        <div style="font-size:1rem;font-weight:700;margin-bottom:12px">Recent Bookings</div>
        <div id="admin-recent-bookings"></div>
      </div>

      <!-- Bookings view -->
      <div id="admin-view-bookings" class="admin-inner hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
          <h2 style="font-size:1.3rem;font-weight:800">Bookings</h2>
          <div style="display:flex;gap:7px;flex-wrap:wrap">
            ${['all', 'pending', 'arrived', 'confirmed', 'prepaid', 'noshow'].map(f =>
    `<button class="chip admin-filter-chip${f === 'all' ? ' active' : ''}" data-filter="${f}" onclick="setAdminBookingFilter('${f}')">${f.charAt(0).toUpperCase() + f.slice(1)}</button>`
  ).join('')}
          </div>
        </div>
        <div id="admin-bookings-list"></div>
      </div>

      <!-- Queue view -->
      <div id="admin-view-queue" class="admin-inner hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
          <h2 style="font-size:1.3rem;font-weight:800">Today's Queue</h2>
          <button class="btn btn-secondary btn-sm" onclick="renderAdminQueueView('${session.salonId}')">
            <i class="ph ph-arrows-clockwise"></i>Refresh
          </button>
        </div>
        <div id="admin-queue-list"></div>
      </div>

      <!-- Services view -->
      <div id="admin-view-services" class="admin-inner hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
          <h2 style="font-size:1.3rem;font-weight:800">Services</h2>
          <button class="btn btn-primary" onclick="openAddServiceModal('${session.salonId}')">
            <i class="ph ph-plus"></i>Add Service
          </button>
        </div>
        <div id="admin-services-list" class="services-admin-list"></div>
      </div>

      <!-- Coupons view -->
      <div id="admin-view-coupons" class="admin-inner hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
          <h2 style="font-size:1.3rem;font-weight:800">Coupons & Offers</h2>
          <button class="btn btn-primary" onclick="openAddCouponModal('${session.salonId}')">
            <i class="ph ph-plus"></i>Add Coupon
          </button>
        </div>
        <div id="admin-coupons-list"></div>
      </div>

      <!-- User Management (mock) -->
      <div id="admin-view-users" class="admin-inner hidden">
        <h2 style="font-size:1.3rem;font-weight:800;margin-bottom:20px">User Management</h2>
        <div class="admin-mock-section">
          ${[['Alice Kumar', 'alice@email.com', 'Active', 'Customer'], ['Ravi Sharma', 'ravi@email.com', 'Active', 'Customer'], ['Priya Nair', 'priya@email.com', 'Suspended', 'Customer'], ['Demo Store', 'admin@bladelounge.com', 'Active', 'Admin']].map(([name, email, status, role]) => `
          <div class="admin-user-row">
            <div class="admin-user-avatar">${name[0]}</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.9rem">${name}</div>
              <div style="font-size:0.78rem;color:var(--text-muted)">${email} · ${role}</div>
            </div>
            <span class="badge ${status === 'Active' ? 'badge-success' : 'badge-danger'}">${status}</span>
          </div>`).join('')}
        </div>
      </div>

      <!-- Reports (mock) -->
      <div id="admin-view-reports" class="admin-inner hidden">
        <h2 style="font-size:1.3rem;font-weight:800;margin-bottom:20px">Reports</h2>
        <div class="stats-grid" style="margin-bottom:24px">
          ${[['Total Bookings', '142', '📋'], ['Revenue', '₹28,400', '💰'], ['Avg Rating', '4.7 ★', '⭐'], ['Active Users', '38', '👥']].map(([label, val, icon]) => `
          <div class="stat-card-modern"><div class="stat-card-icon">${icon}</div><div class="stat-card-val">${val}</div><div class="stat-card-label">${label}</div></div>`).join('')}
        </div>
        <div class="admin-mock-section">
          <div style="font-weight:700;margin-bottom:12px">Recent Reports</div>
          ${['Weekly Bookings Summary — Feb 2026', 'Monthly Revenue Report — Jan 2026', 'Customer Retention Analysis — Q4 2025'].map(r => `
          <div class="admin-user-row">
            <div class="admin-user-avatar" style="background:var(--brand-gradient)">📊</div>
            <div style="flex:1"><div style="font-weight:500;font-size:0.88rem">${r}</div></div>
            <button class="btn btn-sm btn-secondary" onclick="showToast('Downloading report...','success')"><i class="ph ph-download"></i></button>
          </div>`).join('')}
        </div>
      </div>

      <!-- Settings view (delegates to settings.js) -->
      <div id="admin-view-settings" class="admin-inner hidden" style="padding:0"></div>

    </div>
  </div>`;

  renderAdminDashboard(session.salonId);
  switchAdminView('dashboard', session.salonId);
}

function switchAdminView(view, salonId) {
  const views = ['dashboard', 'bookings', 'availability', 'queue', 'services', 'coupons', 'users', 'reports', 'settings'];

  // Create availability view on first use
  if (view === 'availability' && !document.getElementById('admin-view-availability')) {
    const mainContent = document.getElementById('admin-main-content');
    if (mainContent) {
      const div = document.createElement('div');
      div.id = 'admin-view-availability';
      div.className = 'admin-inner hidden';
      div.innerHTML = `<h2 style="font-size:1.3rem;font-weight:800;margin-bottom:6px">Slot Availability</h2>
        <p style="color:var(--text-secondary);font-size:0.84rem;margin-bottom:16px">Define bookable time slots for each date</p>
        <div id="admin-slot-manager-root"></div>`;
      mainContent.appendChild(div);
    }
  }

  views.forEach(v => {
    const el = document.getElementById(`admin-view-${v}`);
    if (el) el.classList.toggle('hidden', v !== view);
  });
  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    const isActive = btn.dataset.view === view;
    btn.style.background = isActive ? 'var(--brand-gradient-soft)' : '';
    btn.style.color = isActive ? 'var(--brand-primary)' : '';
    btn.style.fontWeight = isActive ? '700' : '500';
  });
  if (view === 'dashboard') renderAdminDashboard(salonId);
  if (view === 'bookings') { window._adminBookingFilter = 'all'; renderAdminBookingsPage(salonId); }
  if (view === 'availability') {
    const session = getCurrentSession();
    const salon = session ? getSalonById(session.salonId) : null;
    if (salon) renderSlotManagerSection('admin-slot-manager-root', salonId, salon.openTime, salon.closeTime);
  }
  if (view === 'queue') renderAdminQueueView(salonId);
  if (view === 'services') renderAdminServices(salonId);
  if (view === 'coupons') renderAdminCoupons(salonId);
  if (view === 'settings') {
    const container = document.getElementById('admin-view-settings');
    if (container) {
      const session = getCurrentSession();
      const salon = session ? getSalonById(session.salonId) : null;
      renderAdminSettings(container, session, salon);
    }
  }
}
window.switchAdminView = switchAdminView;

// ═══════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════
function logoutUser() {
  endSession();
  showToast("Logged out. See you soon!", "info");
  navigateTo("/");
}

// ═══════════════════════════════════════════
// EXPOSE MODULE FUNCTIONS TO WINDOW
// Each is assigned individually — no Object.assign so a missing function
// never silently crashes the whole block.
// ═══════════════════════════════════════════

// ── Router ───────────────────────────────────────────────────
window.navigateTo = navigateTo;
window.handleRoute = handleRoute;

// ── Auth ─────────────────────────────────────────────────────
window.handleAuthSubmit = handleAuthSubmit;
window.toggleAuthMode = toggleAuthMode;
window.logoutUser = logoutUser;

// ── Discovery — functions defined in this module ─────────────
window.initDiscovery = initDiscovery;
// Direct names used in all onclick attrs in the discover template:
window.setFilter = setFilter;    // onclick="setFilter('spa')"  (service tiles + explore chips)
window.setSort = setSort;      // onclick="setSort('smart')"  (Near / Smart buttons)
window.setView = setView;      // onclick="setView('list')"
window.handleSearch = handleSearch; // oninput="handleSearch(this.value)"
// Aliases kept for safety (e.g. if any old template uses longer names)
window.setDiscoveryFilter = setFilter;
window.setSalonSort = setSort;
window.filterSalons = setFilter;
window.sortSalons = setSort;
window.toggleView = setView;
window.setDiscoveryBottomNav = setDiscoveryBottomNav;

// ── Nearby map modal ─────────────────────────────────────────
window.openNearbyMap = openNearbyMap;
window.closeNearbyMap = closeNearbyMap;
window.mapZoom = mapZoom;
window.mapLocateMe = mapLocateMe;

// ── Location picker ──────────────────────────────────────────
window.openLocationPicker = openLocationPicker;
window.closeLocationPicker = closeLocationPicker;
window.filterLocationResults = filterLocationResults;
window.selectLocation = selectLocation;
window.useCurrentGPSLocation = useCurrentGPSLocation;

// ── Salon detail ──────────────────────────────────────────────
window.showSalonDetail = showSalonDetail;

// ── My Bookings ───────────────────────────────────────────────
window.initMyBookingsPage = initMyBookingsPage;

// ── Payment page ──────────────────────────────────────────────
window.initPaymentPage = initPaymentPage;
window.triggerRazorpay = triggerRazorpay;
window.applyPaymentCoupon = applyPaymentCoupon;
window.showPaymentSuccess = showPaymentSuccess;

// ── Admin panel ───────────────────────────────────────────────
window.initAdminPage = initAdminPage;
window.switchAdminView = switchAdminView;
window.openAdminDrawer = openAdminDrawer;
window.closeAdminDrawer = closeAdminDrawer;

// ── Imports already on window (set at top of file) ───────────
// window.navigateTo, window.fillDemoCredentials,
// window.openGoogleMapsDirections, window.getCurrentSession,
// window.endSession, window.showToast — already set above


// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
window.addEventListener("popstate", () => {
  const hash = window.location.hash.replace("#", "") || "/";
  handleRoute(hash);
});

document.addEventListener("DOMContentLoaded", () => {
  const hash = window.location.hash.replace("#", "") || "/";
  handleRoute(hash);
});

