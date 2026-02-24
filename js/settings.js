// AuraCraft — Settings Module
// Handles rendering & persistence for Customer and Admin settings pages

// ── Self-contained session helper (no ES-module dependency) ──────────────
// settings.js is a plain global script — it cannot import from auth.js.
// This reads the same sessionStorage key that auth.js writes, so it stays in sync.
function getCurrentSession() {
  if (window._cachedGetCurrentSession) return window._cachedGetCurrentSession();
  try {
    const raw = sessionStorage.getItem('gf_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── showToast fallback (ui.js defines the real one; this is a no-op safety net) ──
if (typeof showToast === 'undefined') {
  window.showToast = function (msg, type) { console.log('[toast]', type, msg); };
}

// ── navigateTo fallback ───────────────────────────────────────────────────
if (typeof navigateTo === 'undefined') {
  window.navigateTo = function (path) { window.location.hash = '#' + path; };
}



// ── Settings storage key ──────────────────────────────────────────────────
const SETTINGS_KEY = 'gf_settings';

function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  } catch { return {}; }
}

function saveSetting(key, value) {
  const s = getSettings();
  s[key] = value;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function getSetting(key, defaultVal) {
  const s = getSettings();
  return s.hasOwnProperty(key) ? s[key] : defaultVal;
}

// ═══════════════════════════════════════════
// THEME TOGGLE (shared)
// ═══════════════════════════════════════════
function applyTheme(isDark) {
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('gf_theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('gf_theme', 'light');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(!isDark);
  saveSetting('darkMode', !isDark);
  // Update all theme toggles on page
  document.querySelectorAll('.theme-toggle-thumb').forEach(el => {
    el.parentElement.classList.toggle('on', !isDark);
  });
  document.querySelectorAll('.theme-mode-label').forEach(el => {
    el.textContent = !isDark ? 'Dark Mode' : 'Light Mode';
  });
}

// ═══════════════════════════════════════════
// TOGGLE HELPER
// ═══════════════════════════════════════════
function toggleSetting(key, defaultVal) {
  const current = getSetting(key, defaultVal);
  const next = !current;
  saveSetting(key, next);
  const toggle = document.querySelector(`[data-setting="${key}"]`);
  if (toggle) {
    toggle.classList.toggle('on', next);
    const label = toggle.closest('.settings-row')?.querySelector('.settings-row-status');
    if (label) label.textContent = next ? 'On' : 'Off';
  }
}

// ═══════════════════════════════════════════
// ROW BUILDER HELPERS
// ═══════════════════════════════════════════
function buildToggleRow(label, subLabel, key, defaultVal, icon = '') {
  const isOn = getSetting(key, defaultVal);
  return `
    <div class="settings-row">
      <div class="settings-row-left">
        ${icon ? `<span class="settings-row-icon">${icon}</span>` : ''}
        <div class="settings-row-info">
          <div class="settings-row-label">${label}</div>
          ${subLabel ? `<div class="settings-row-sublabel">${subLabel}</div>` : ''}
        </div>
      </div>
      <div class="settings-row-right">
        <span class="settings-row-status">${isOn ? 'On' : 'Off'}</span>
        <button class="toggle-switch ${isOn ? 'on' : ''}" data-setting="${key}" onclick="toggleSetting('${key}', ${defaultVal})" aria-label="Toggle ${label}">
          <span class="toggle-thumb"></span>
        </button>
      </div>
    </div>`;
}

function buildThemeRow() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return `
    <div class="settings-row">
      <div class="settings-row-left">
        <span class="settings-row-icon">${isDark ? '🌙' : '☀️'}</span>
        <div class="settings-row-info">
          <div class="settings-row-label theme-mode-label">${isDark ? 'Dark Mode' : 'Light Mode'}</div>
          <div class="settings-row-sublabel">Smooth theme transition</div>
        </div>
      </div>
      <div class="settings-row-right">
        <button class="toggle-switch theme-toggle ${isDark ? 'on' : ''}" onclick="toggleTheme()" aria-label="Toggle theme">
          <span class="toggle-thumb theme-toggle-thumb"></span>
        </button>
      </div>
    </div>`;
}

function buildActionRow(label, subLabel, btnLabel, btnClass, onclick, icon = '') {
  return `
    <div class="settings-row">
      <div class="settings-row-left">
        ${icon ? `<span class="settings-row-icon">${icon}</span>` : ''}
        <div class="settings-row-info">
          <div class="settings-row-label">${label}</div>
          ${subLabel ? `<div class="settings-row-sublabel">${subLabel}</div>` : ''}
        </div>
      </div>
      <div class="settings-row-right">
        <button class="btn btn-sm ${btnClass}" onclick="${onclick}">${btnLabel}</button>
      </div>
    </div>`;
}

function buildLinkRow(label, subLabel, icon = '', onclick = '') {
  return `
    <div class="settings-row settings-row-link" ${onclick ? `onclick="${onclick}"` : ''} role="button" tabindex="0">
      <div class="settings-row-left">
        ${icon ? `<span class="settings-row-icon">${icon}</span>` : ''}
        <div class="settings-row-info">
          <div class="settings-row-label">${label}</div>
          ${subLabel ? `<div class="settings-row-sublabel">${subLabel}</div>` : ''}
        </div>
      </div>
      <div class="settings-row-right">
        <i class="ph ph-caret-right" style="color:var(--text-muted);font-size:1.1rem"></i>
      </div>
    </div>`;
}

function buildSection(title, emoji, rows) {
  return `
    <div class="settings-section">
      <div class="settings-section-header">
        <span class="settings-section-emoji">${emoji}</span>
        <span class="settings-section-title">${title}</span>
      </div>
      <div class="settings-section-body">
        ${rows.join('')}
      </div>
    </div>`;
}

// ═══════════════════════════════════════════
// CUSTOMER SETTINGS PAGE
// ═══════════════════════════════════════════
function renderCustomerSettings(container, session) {
  const backRoute = session ? '/discover' : '/';
  container.innerHTML = `
<div class="settings-page" id="settings-page-inner">
  <!-- Header -->
  <div class="settings-header">
    <button class="btn btn-ghost btn-icon settings-back-btn" onclick="navigateTo('${backRoute}')" aria-label="Back">
      <i class="ph ph-arrow-left"></i>
    </button>
    <div class="settings-header-info">
      <div class="settings-header-title">Settings</div>
      <div class="settings-header-sub">Personalise your AuraCraft experience</div>
    </div>
    <div class="settings-avatar">${session ? session.name.charAt(0).toUpperCase() : '?'}</div>
  </div>

  <!-- Profile Hero -->
  ${session ? `
  <div class="settings-profile-hero">
    <div class="settings-profile-avatar">${session.name.charAt(0).toUpperCase()}</div>
    <div class="settings-profile-info">
      <div class="settings-profile-name">${session.name}</div>
      <div class="settings-profile-email">${session.email}</div>
      <span class="settings-profile-badge">✓ Customer</span>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="showToast('Profile editor coming soon!', 'info')">Edit</button>
  </div>` : ''}

  <div class="settings-body">

    <!-- Account & Profile -->
    ${buildSection('Account & Profile', '👤', [
    buildLinkRow('Edit Profile', 'Update name, bio and preferences', '✏️', "showToast('Profile editor coming soon!','info')"),
    buildLinkRow('Change Photos', 'Update your profile pictures', '📷', "showToast('Photo upload coming soon!','info')"),
    buildLinkRow('Update Preferences', 'Age, height, religion, location, profession', '🎛️', "showToast('Preference panel coming soon!','info')"),
    buildLinkRow('Verification', 'Email, mobile, ID proof', '🔒', "showToast('Verification panel coming soon!','info')"),
    buildToggleRow('Profile Visibility', 'Allow others to see your profile', 'profileVisible', true, '👁️'),
  ])}

    <!-- Discovery & Matching -->
    ${buildSection('Discovery & Matching', '🧭', [
    buildToggleRow('Profile Visibility', 'Show your profile in discovery', 'discoveryVisible', true, '🔍'),
    buildToggleRow('Chat Availability', 'Let matched salons message you', 'chatAvailable', true, '💬'),
    buildToggleRow('Smart Recommendations', 'AI-powered salon suggestions', 'smartRecs', true, '🤖'),
    buildActionRow('Distance Filter', 'Currently set to 5 km', 'Change', 'btn-secondary', "showToast('Distance filter coming soon!','info')", '📍'),
  ])}

    <!-- Notifications -->
    ${buildSection('Notifications', '🔔', [
    buildToggleRow('Push Notifications', 'Receive app alerts', 'pushNotifs', true, '📲'),
    buildToggleRow('Match Alerts', 'New salon matches near you', 'matchAlerts', true, '⚡'),
    buildToggleRow('Chat Messages', 'New message notifications', 'chatNotifs', true, '💬'),
    buildToggleRow('Profile Views', 'Know when someone views you', 'profileViews', false, '👀'),
    buildToggleRow('Subscription Reminders', 'Renewal and offer alerts', 'subReminders', true, '🏷️'),
  ])}

    <!-- Security -->
    ${buildSection('Security', '🔐', [
    buildLinkRow('Change Password', 'Update your account password', '🔑', "showToast('Password change coming soon!','info')"),
    buildToggleRow('Two-Factor Authentication', 'Extra layer of security', 'twoFactor', false, '🛡️'),
    buildLinkRow('Block User List', 'Manage blocked users', '🚫', "showToast('Block list coming soon!','info')"),
    buildLinkRow('Report an Issue', 'Help us fix problems', '🐛', "showToast('Thank you! Report feature coming soon.','info')"),
  ])}

    <!-- App Appearance -->
    ${buildSection('App Appearance', '🎨', [
    buildThemeRow(),
    buildToggleRow('Animations', 'Enable smooth transitions', 'animations', true, '✨'),
    buildActionRow('Font Size', 'Medium', 'Change', 'btn-secondary', "showToast('Font size picker coming soon!','info')", '🔤'),
  ])}

    <!-- General -->
    ${buildSection('General', '⚙️', [
    buildActionRow('Language', 'English (default)', 'Change', 'btn-secondary', "showToast('Language options coming soon!','info')", '🌍'),
    buildLinkRow('Invite & Earn', 'Get rewards for referrals', '🎁', "showToast('Referral program coming soon!','info')"),
    buildLinkRow('Contact Support', 'Get help from our team', '💬', "showToast('Opening support chat...','info')"),
    buildLinkRow('About AuraCraft', 'Version 2.0 — Build 2024', 'ℹ️'),
    buildLinkRow('Terms & Conditions', 'Read our usage policies', '📄', "showToast('Opening Terms...','info')"),
  ])}

    <!-- Danger Zone -->
    <div class="settings-section settings-danger-section">
      <div class="settings-section-header">
        <span class="settings-section-emoji">⚠️</span>
        <span class="settings-section-title">Account</span>
      </div>
      <div class="settings-section-body">
        <div class="settings-row">
          <div class="settings-row-left">
            <span class="settings-row-icon">🚪</span>
            <div class="settings-row-info">
              <div class="settings-row-label">Log Out</div>
              <div class="settings-row-sublabel">You will be returned to the home screen</div>
            </div>
          </div>
          <div class="settings-row-right">
            <button class="btn btn-sm btn-danger" onclick="logoutUser()">Log Out</button>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-footer">
      <div class="settings-footer-logo"><img src="images/auracraft-logo.jpg" alt="AuraCraft" style="width:22px;height:22px;border-radius:4px;object-fit:cover;vertical-align:middle;margin-right:6px"> AuraCraft</div>
      <div class="settings-footer-version">v2.0 · Build 2024 · All rights reserved</div>
    </div>
  </div>
</div>`;
}

// ═══════════════════════════════════════════
// ADMIN SETTINGS PAGE
// ═══════════════════════════════════════════
function renderAdminSettings(container, session, salon) {
  container.innerHTML = `
<div class="settings-page" id="settings-page-inner">
  <!-- Header -->
  <div class="settings-header">
    <button class="btn btn-ghost btn-icon settings-back-btn" onclick="navigateTo('/admin')" aria-label="Back">
      <i class="ph ph-arrow-left"></i>
    </button>
    <div class="settings-header-info">
      <div class="settings-header-title">Admin Settings</div>
      <div class="settings-header-sub">${salon ? salon.name : 'Store configuration'}</div>
    </div>
    <div class="settings-avatar admin-avatar">⚙</div>
  </div>

  <!-- Profile Hero -->
  ${salon ? `
  <div class="settings-profile-hero admin-profile-hero">
    <div class="settings-profile-avatar admin-avatar-lg">${salon.name.charAt(0)}</div>
    <div class="settings-profile-info">
      <div class="settings-profile-name">${salon.name}</div>
      <div class="settings-profile-email">${session.email}</div>
      <span class="settings-profile-badge admin-badge">⚡ Admin</span>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="showToast('Store editor coming soon!','info')">Edit</button>
  </div>` : ''}

  <div class="settings-body">

    <!-- System Controls -->
    ${buildSection('System Controls', '🖥️', [
    buildToggleRow('User Registration', 'Allow new users to sign up', 'sysUserReg', true, '👥'),
    buildToggleRow('Auto-Approve Profiles', 'Skip manual approval for new profiles', 'autoApprove', false, '✅'),
    buildToggleRow('AI Moderation', 'Use AI to filter inappropriate content', 'aiModeration', true, '🤖'),
    buildActionRow('Traffic Simulation', 'Test traffic data injection', 'Run Test', 'btn-secondary', "showToast('Traffic simulation triggered!','success')", '🚦'),
    buildActionRow('Manage User Roles', 'Admin, moderator, viewer levels', 'Manage', 'btn-secondary', "showToast('Role management coming soon!','info')", '🏷️'),
  ])}

    <!-- Analytics Controls -->
    ${buildSection('Analytics Controls', '📊', [
    buildToggleRow('Live Tracking', 'Real-time visitor analytics', 'liveTracking', true, '📡'),
    buildToggleRow('Dashboard Widgets', 'Show analytics widgets', 'dashWidgets', true, '📈'),
    buildActionRow('Alert Thresholds', 'Set notification triggers', 'Configure', 'btn-secondary', "showToast('Alert configuration coming soon!','info')", '🔔'),
    buildToggleRow('Export Reports', 'Enable scheduled report generation', 'exportReports', true, '📤'),
  ])}

    <!-- Customization -->
    ${buildSection('Customization', '🎨', [
    buildThemeRow(),
    buildActionRow('Store Branding', 'Logo, colors and display name', 'Edit', 'btn-secondary', "showToast('Branding editor coming soon!','info')", '🏪'),
    buildLinkRow('App Version Panel', 'AuraCraft v2.0 — Admin Build', 'ℹ️'),
    buildToggleRow('Compact View', 'Use denser information layout', 'compactView', false, '🗜️'),
  ])}

    <!-- Security & Access -->
    ${buildSection('Security & Access', '🔐', [
    buildLinkRow('Admin Password Reset', 'Change your admin credentials', '🔑', "showToast('Password reset coming soon!','info')"),
    buildToggleRow('Two-Factor Authentication', 'Require 2FA for admin login', 'adminTwoFactor', false, '🛡️'),
    buildLinkRow('API Keys Management', 'View and rotate API keys', '🗝️', "showToast('API key panel coming soon!','info')"),
    buildLinkRow('Session Logs', 'View active and past sessions', '📋', "showToast('Session logs coming soon!','info')"),
    buildToggleRow('Device Restrictions', 'Limit access to trusted devices', 'deviceRestrict', false, '📱'),
  ])}

    <!-- Backup & Restore -->
    ${buildSection('Backup & Restore', '💾', [
    buildActionRow('Database Backup', 'Trigger a manual backup now', 'Backup Now', 'btn-secondary', "showToast('Backup started! You will be notified when complete.','success')", '🗄️'),
    buildActionRow('Export User Data', 'Download all user records as CSV', 'Export', 'btn-secondary', "showToast('Export started! Download will begin shortly.','success')", '📦'),
    buildActionRow('Download Reports', 'Get analytics and booking reports', 'Download', 'btn-secondary', "showToast('Report download initiated!','success')", '📊'),
    buildToggleRow('Auto Backup', 'Schedule daily automatic backups', 'autoBackup', true, '⏱️'),
  ])}

    <!-- Danger Zone -->
    <div class="settings-section settings-danger-section">
      <div class="settings-section-header">
        <span class="settings-section-emoji">⚠️</span>
        <span class="settings-section-title">Admin Account</span>
      </div>
      <div class="settings-section-body">
        <div class="settings-row">
          <div class="settings-row-left">
            <span class="settings-row-icon">🚪</span>
            <div class="settings-row-info">
              <div class="settings-row-label">Log Out</div>
              <div class="settings-row-sublabel">End your admin session</div>
            </div>
          </div>
          <div class="settings-row-right">
            <button class="btn btn-sm btn-danger" onclick="logoutUser()">Log Out</button>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-footer">
      <div class="settings-footer-logo"><img src="images/auracraft-logo.jpg" alt="AuraCraft" style="width:22px;height:22px;border-radius:4px;object-fit:cover;vertical-align:middle;margin-right:6px"> AuraCraft Admin</div>
      <div class="settings-footer-version">v2.0 · Admin Panel · Secure Session</div>
    </div>
  </div>
</div>`;
}

// ═══════════════════════════════════════════
// MAIN ENTRY — renderSettingsPage()
// ═══════════════════════════════════════════
function renderSettingsPage() {
  const container = document.getElementById('page-settings');
  if (!container) return;

  try {
    const session = getCurrentSession();

    if (session && session.type === 'store') {
      const salon = getSalonById(session.salonId);
      renderAdminSettings(container, session, salon);
    } else {
      renderCustomerSettings(container, session);
    }
  } catch (err) {
    // Surface any rendering errors visibly so we can debug
    container.innerHTML = `<div style="padding:40px;color:var(--danger);font-family:monospace">
            <h2>Settings render error</h2>
            <pre style="white-space:pre-wrap;font-size:0.8rem">${err.stack || err.message}</pre>
            <button onclick="navigateTo('/discover')" style="margin-top:20px">← Back</button>
        </div>`;
    console.error('renderSettingsPage error:', err);
  }
}
