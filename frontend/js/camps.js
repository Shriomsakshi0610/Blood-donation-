/**
 * BloodConnect — Donation Camps Controller
 */

let allCamps = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadCamps();
  initCampCityFilter();
  initHostCampForm();
});

async function loadCamps(filterCity = 'ALL') {
  const container = document.getElementById('camps-cards-grid');
  if (!container) return;

  allCamps = await window.bcApi.getCamps();
  let displayed = allCamps;

  if (filterCity !== 'ALL') {
    displayed = displayed.filter(c => c.city.toLowerCase() === filterCity.toLowerCase());
  }

  container.innerHTML = displayed.map(camp => {
    const [year, month, day] = camp.date.split('-');
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monthLabel = monthNames[parseInt(month, 10) - 1];

    return `
      <div class="camp-card">
        <div class="camp-card-image">
          <div class="camp-date-badge">
            <div class="day">${day}</div>
            <div class="month">${monthLabel}</div>
          </div>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,48,56,0.3)" stroke-width="1.5">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        </div>
        <div class="camp-card-body">
          <div>
            <div style="font-size:0.8rem; color:var(--primary-red); font-weight:600; text-transform:uppercase; margin-bottom:0.35rem;">
              ${camp.organizer}
            </div>
            <h4>${camp.name}</h4>
            <p class="venue">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:text-top; margin-right:4px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              ${camp.venue}
            </p>
            <div style="display:flex; align-items:center; gap:1.25rem; font-size:0.84rem; color:var(--text-secondary); margin-bottom:1rem;">
              <span>🕒 ${camp.time}</span>
              <span>🎯 Target: ${camp.targetUnits} Units</span>
            </div>
          </div>
          <div style="border-top:1px solid var(--border-light); padding-top:1rem; display:flex; align-items:center; justify-content:space-between;">
            <div style="font-size:0.82rem; color:var(--text-muted);">
              <strong>${camp.registered}</strong> donors joined
            </div>
            <button class="btn btn-primary btn-sm" onclick="openCampRegisterModal('${camp.id}', '${camp.name}', '${camp.venue}')">
              Join as Donor
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function initCampCityFilter() {
  const select = document.getElementById('filter-camp-city');
  if (!select) return;

  select.addEventListener('change', () => {
    loadCamps(select.value);
  });
}

function openCampRegisterModal(campId, campName, venue) {
  let modal = document.getElementById('camp-register-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'camp-register-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  const currentUser = window.bcApi.getCurrentUser() || {};

  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h4>Register for Donation Camp</h4>
        <button class="modal-close" onclick="closeModal('camp-register-modal')">✕</button>
      </div>
      <div class="modal-body">
        <div style="background:var(--bg-input); padding:1rem; border-radius:var(--radius-md); margin-bottom:1.25rem;">
          <h5 style="color:var(--primary-red); margin-bottom:0.25rem;">${campName}</h5>
          <p style="font-size:0.84rem; color:var(--text-secondary); margin:0;">${venue}</p>
        </div>

        <form id="camp-reg-form" onsubmit="handleCampRegistration(event, '${campName}')">
          <div class="form-group">
            <label class="form-label">Full Name <span class="required">*</span></label>
            <input type="text" id="cr-name" class="form-control" value="${currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}` : ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email Address <span class="required">*</span></label>
            <input type="email" id="cr-email" class="form-control" value="${currentUser.email || ''}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Mobile Number <span class="required">*</span></label>
            <input type="tel" id="cr-mobile" class="form-control" value="${currentUser.mobileNumber || ''}" pattern="^[6-9][0-9]{9}$" placeholder="10-digit mobile" required>
          </div>
          <div class="form-group">
            <label class="form-label">Blood Group <span class="required">*</span></label>
            <select id="cr-blood" class="form-select" required>
              <option value="">Select Blood Group</option>
              <option value="A_POSITIVE">A+</option>
              <option value="A_NEGATIVE">A-</option>
              <option value="B_POSITIVE">B+</option>
              <option value="B_NEGATIVE">B-</option>
              <option value="AB_POSITIVE">AB+</option>
              <option value="AB_NEGATIVE">AB-</option>
              <option value="O_POSITIVE">O+</option>
              <option value="O_NEGATIVE">O-</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Preferred Time Slot</label>
            <select id="cr-slot" class="form-select">
              <option>Morning (09:00 AM - 11:30 AM)</option>
              <option>Midday (11:30 AM - 02:00 PM)</option>
              <option>Afternoon (02:00 PM - 04:30 PM)</option>
            </select>
          </div>
          <div class="modal-footer" style="padding:1rem 0 0; border-top:none;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal('camp-register-modal')">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">Confirm Donor Registration</button>
          </div>
        </form>
      </div>
    </div>
  `;

  if (currentUser.bloodGroup) {
    const sel = document.getElementById('cr-blood');
    if (sel) sel.value = currentUser.bloodGroup;
  }

  openModal('camp-register-modal');
}

function handleCampRegistration(e, campName) {
  e.preventDefault();
  closeModal('camp-register-modal');
  showToast('Registered Successfully', `You have been registered for ${campName}! A confirmation SMS with donor pass has been sent.`, 'success');
}

function initHostCampForm() {
  const form = document.getElementById('host-camp-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    closeModal('host-camp-modal');
    showToast('Camp Request Submitted', 'Our volunteer operations team will review your venue details and contact you within 24 hours.', 'success');
    form.reset();
  });
}
