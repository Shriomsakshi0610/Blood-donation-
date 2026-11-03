/**
 * BloodConnect — Common UI Controller & Utilities
 */

// Blood Group Display Formatter
const BLOOD_GROUP_MAP = {
  'A_POSITIVE': 'A+',
  'A_NEGATIVE': 'A-',
  'B_POSITIVE': 'B+',
  'B_NEGATIVE': 'B-',
  'AB_POSITIVE': 'AB+',
  'AB_NEGATIVE': 'AB-',
  'O_POSITIVE': 'O+',
  'O_NEGATIVE': 'O-'
};

const BLOOD_GROUP_REVERSE_MAP = {
  'A+': 'A_POSITIVE',
  'A-': 'A_NEGATIVE',
  'B+': 'B_POSITIVE',
  'B-': 'B_NEGATIVE',
  'AB+': 'AB_POSITIVE',
  'AB-': 'AB_NEGATIVE',
  'O+': 'O_POSITIVE',
  'O-': 'O_NEGATIVE'
};

function formatBloodGroup(val) {
  return BLOOD_GROUP_MAP[val] || val || '—';
}

function formatGender(val) {
  if (!val) return '—';
  return val.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Route Guard: Protect authenticated pages
 */
function enforceProtectedRoute(allowedRoles = null) {
  if (!window.bcApi) return true;
  const user = window.bcApi.getCurrentUser();
  if (!user) {
    sessionStorage.setItem('bc_redirect_after_login', window.location.pathname);
    showToast('Sign In Required', 'Please log in to access your dashboard.', 'warning');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 400);
    return false;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = user.role || 'USER';
    const isAllowed = allowedRoles.includes(role) || (role === 'ADMIN' && allowedRoles.includes('ROLE_ADMIN'));
    if (!isAllowed) {
      showToast('Access Denied', 'You do not have permission to view this section.', 'error');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 500);
      return false;
    }
  }

  return true;
}

/**
 * Redirect already logged-in users away from Login / Register
 */
function redirectIfAuthenticated() {
  if (!window.bcApi) return;
  const user = window.bcApi.getCurrentUser();
  if (user) {
    const isAdmin = user.role === 'ADMIN' || user.role === 'ROLE_ADMIN';
    window.location.href = isAdmin ? 'admin-dashboard.html' : 'donor-dashboard.html';
  }
}

/**
 * Toast Notifications
 */
function showToast(title, message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = {
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF3038" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
  }[type] || '';

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 20);

  // Auto dismiss after 4.5s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

/**
 * Modal Dialog Controller
 */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close modals when clicking backdrop
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

/**
 * Update Navbar with User Profile and Role-Based Navigation
 * Maintains exactly ONE user control in the header across desktop and mobile.
 */
function updateNavbar() {
  const user = window.bcApi ? window.bcApi.getCurrentUser() : null;
  const navActions = document.getElementById('nav-auth-actions');
  if (!navActions) return;

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ROLE_ADMIN');

  const authMarkup = user ? `
    <div class="user-menu-wrapper">
      <button class="user-profile-btn" id="nav-user-toggle" onclick="toggleUserDropdown(event)" aria-label="User account menu">
        <div class="user-avatar-circle">${(user.firstName || 'U')[0]}</div>
        <span>${user.firstName} ${user.lastName || ''}</span>
        <span class="badge badge-blood" style="font-size:0.75rem; padding:0.15rem 0.45rem;">${formatBloodGroup(user.bloodGroup)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="user-dropdown" id="user-nav-dropdown">
        <a href="donor-dashboard.html" class="user-dropdown-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
          Donor Dashboard
        </a>
        <a href="recipient-dashboard.html" class="user-dropdown-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          Recipient Requests
        </a>
        ${isAdmin ? `
        <a href="admin-dashboard.html" class="user-dropdown-item" style="color:var(--primary-red); font-weight:600;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Admin Portal
        </a>
        ` : ''}
        <div style="height:1px; background:var(--border-light); margin:0.35rem 0;"></div>
        <div class="user-dropdown-item text-danger" onclick="handleNavbarLogout()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </div>
      </div>
    </div>
  ` : `
    <a href="login.html" class="btn btn-secondary btn-sm">Sign In</a>
    <a href="register.html" class="btn btn-primary btn-sm">Become a Donor</a>
  `;

  navActions.innerHTML = authMarkup;
}

function toggleUserDropdown(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('user-nav-dropdown');
  if (dropdown) dropdown.classList.toggle('show');
}

document.addEventListener('click', () => {
  const dropdown = document.getElementById('user-nav-dropdown');
  if (dropdown) dropdown.classList.remove('show');
});

async function handleNavbarLogout() {
  try {
    await window.bcApi.logout();
    showToast('Signed Out', 'You have been successfully logged out.', 'info');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 400);
  } catch (err) {
    showToast('Signed Out', 'Session cleared.', 'info');
    window.location.href = 'index.html';
  }
}

/**
 * Mobile Navigation Menu Toggle
 */
function initMobileNav() {
  const toggle = document.querySelector('.mobile-nav-toggle');
  const menu = document.querySelector('.nav-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('open');
    });
  }
}

/**
 * Backend Connectivity Monitor
 */
async function initBackendHealthCheck() {
  const pill = document.getElementById('backend-status-indicator');
  if (!pill) return;

  const dot = pill.querySelector('.backend-status-dot');
  const text = pill.querySelector('.backend-status-text');

  const apiUrl = window.bcApi.baseUrl;
  const isLocal = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1');
  const envLabel = isLocal ? '8080' : 'Render';

  try {
    const health = await window.bcApi.getAdminHealth();
    if (dot) dot.className = 'backend-status-dot online';
    if (text) text.textContent = `Admin API (${envLabel})`;
    pill.title = `Server: ${health.server} | DB: ${health.database} | JVM: ${health.jvmUsedMemoryMb}MB / ${health.jvmTotalMemoryMb}MB`;
    pill.onclick = () => showBackendHelpModal(true, health);
  } catch (err) {
    if (dot) dot.className = 'backend-status-dot offline';
    if (text) text.textContent = `API Offline (${envLabel})`;
    pill.title = `Admin health check failed: ${err.message}`;
    pill.onclick = () => showBackendHelpModal(false, null);
  }
}

function showBackendHelpModal(isOnline, healthData = null) {
  let modal = document.getElementById('backend-help-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'backend-help-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  const apiUrl = window.bcApi.baseUrl;

  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h4 style="display:flex; align-items:center; gap:0.5rem;">
          <span style="color:var(--primary-red); font-size:1.4rem;">☕</span>
          Administrator Server Health Monitor
        </h4>
        <button class="modal-close" onclick="closeModal('backend-help-modal')">✕</button>
      </div>
      <div class="modal-body">
        <div style="background:${isOnline ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)'}; border:1px solid ${isOnline ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}; border-radius:var(--radius-md); padding:1rem; margin-bottom:1.25rem;">
          <strong style="color:${isOnline ? 'var(--success)' : 'var(--warning)'}; display:flex; align-items:center; gap:0.5rem;">
            ${isOnline ? '● Spring Boot Backend is Active & Authorized' : '▲ Backend Health Verification Failed'}
          </strong>
          <p style="font-size:0.88rem; margin-top:0.4rem; color:var(--text-secondary);">
            Target URL: <code>${apiUrl}</code><br>
            ${healthData ? `JVM Memory: <strong>${healthData.jvmUsedMemoryMb} MB</strong> used / <strong>${healthData.jvmTotalMemoryMb} MB</strong> total<br>Database Connection: <strong>${healthData.database}</strong>` : 'Service responded with an error or is offline.'}
          </p>
        </div>

        <h5>Backend Service Information:</h5>
        <pre style="background:var(--bg-input); padding:0.85rem; border-radius:var(--radius-md); font-family:var(--font-mono); font-size:0.85rem; border:1px solid var(--border-color); overflow-x:auto;">
${apiUrl}</pre>
        <p style="font-size:0.82rem; color:var(--text-muted); margin-top:0.75rem;">
          Protected by Spring Security role-based access control (ROLE_ADMIN).
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" onclick="closeModal('backend-help-modal')">Close</button>
        <button class="btn btn-primary btn-sm" onclick="initBackendHealthCheck().then(() => closeModal('backend-help-modal'))">Re-check Status</button>
      </div>
    </div>
  `;
  openModal('backend-help-modal');
}

// Global initialization on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  initMobileNav();
});
