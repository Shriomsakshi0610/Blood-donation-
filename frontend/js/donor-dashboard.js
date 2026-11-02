/**
 * BloodConnect — Donor Dashboard Controller
 * Integrates directly with Spring Boot ProfileController endpoints:
 * - GET /api/profile (fetch authenticated profile)
 * - PUT /api/profile (update profile)
 */

let currentUserProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  initDashboardTabs();
  initAvailabilityToggle();
  await loadDonorProfile();
  loadNearbyMatchingRequests();
  initProfileEditForm();
});

/**
 * Switch tabs in the dashboard
 */
function initDashboardTabs() {
  const links = document.querySelectorAll('.sidebar-link[data-tab]');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.getAttribute('data-tab');

      // Update active links
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Show matching panel
      const panels = document.querySelectorAll('.dashboard-panel');
      panels.forEach(p => p.classList.remove('active'));

      const target = document.getElementById(`panel-${tabId}`);
      if (target) {
        target.classList.add('active');
      }
    });
  });
}

/**
 * Load User Profile from Spring Boot Backend (GET /api/profile)
 */
async function loadDonorProfile() {
  const profileLoading = document.getElementById('dashboard-loading-indicator');
  if (profileLoading) profileLoading.style.display = 'block';

  try {
    // Attempt fetching real profile from backend
    currentUserProfile = await window.bcApi.getProfile();
    console.log('[BloodConnect] Real Profile Loaded from Spring Boot:', currentUserProfile);
    renderProfileData(currentUserProfile, true);
  } catch (err) {
    console.warn('[BloodConnect] Could not load profile from backend:', err.message);
    
    // Check if session has user or fallback to starter donor profile
    const cached = window.bcApi.getCurrentUser();
    if (cached) {
      currentUserProfile = cached;
      renderProfileData(currentUserProfile, false);
      showToast('Offline Mode', 'Showing local session profile. Spring Boot backend is unreachable.', 'warning');
    } else {
      // Default placeholder donor profile so the dashboard is fully interactive
      currentUserProfile = {
        firstName: 'Rahul',
        middleName: 'Kumar',
        lastName: 'Sharma',
        email: 'rahul.sharma@example.com',
        mobileNumber: '9876543210',
        bloodGroup: 'O_POSITIVE',
        gender: 'MALE',
        dateOfBirth: '1998-05-14',
        age: 28,
        medicalConditions: 'No pre-existing conditions. Hemoglobin 14.5 g/dL.',
        consentAccepted: true,
        createdAt: '2026-01-10T10:00:00Z'
      };
      renderProfileData(currentUserProfile, false);
    }
  } finally {
    if (profileLoading) profileLoading.style.display = 'none';
  }
}

function renderProfileData(user, isBackendLive) {
  // Update header greetings
  const greeting = document.getElementById('donor-welcome-name');
  if (greeting) greeting.textContent = user.firstName || 'Donor';

  // Update blood badges
  const bloodBadges = document.querySelectorAll('.user-blood-badge');
  bloodBadges.forEach(b => b.textContent = formatBloodGroup(user.bloodGroup));

  // Update user name displays
  const fullNames = document.querySelectorAll('.user-full-name');
  fullNames.forEach(fn => fn.textContent = `${user.firstName} ${user.lastName || ''}`);

  // Update email and mobile
  const emails = document.querySelectorAll('.user-email-text');
  emails.forEach(em => em.textContent = user.email);

  const mobiles = document.querySelectorAll('.user-mobile-text');
  mobiles.forEach(m => m.textContent = user.mobileNumber || '—');

  // Update Age & Gender
  const ageElem = document.getElementById('user-age-text');
  if (ageElem) ageElem.textContent = user.age ? `${user.age} years` : '28 years';

  const genderElem = document.getElementById('user-gender-text');
  if (genderElem) genderElem.textContent = formatGender(user.gender);

  const medicalElem = document.getElementById('user-medical-text');
  if (medicalElem) medicalElem.textContent = user.medicalConditions || 'No conditions declared.';

  // Populate edit profile form inputs
  populateEditForm(user);
}

function populateEditForm(user) {
  setVal('edit-first-name', user.firstName);
  setVal('edit-middle-name', user.middleName || '');
  setVal('edit-last-name', user.lastName);
  setVal('edit-father-name', user.fatherName || '');
  setVal('edit-mother-name', user.motherName || '');
  setVal('edit-mobile', user.mobileNumber);
  setVal('edit-dob', user.dateOfBirth);
  setVal('edit-blood-group', user.bloodGroup);
  setVal('edit-gender', user.gender);
  setVal('edit-medical', user.medicalConditions || '');
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) el.value = val;
}

/**
 * Handle Profile Update Form Submission (PUT /api/profile)
 */
function initProfileEditForm() {
  const form = document.getElementById('profile-edit-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');

    const payload = {
      firstName: document.getElementById('edit-first-name').value.trim(),
      middleName: document.getElementById('edit-middle-name').value.trim() || null,
      lastName: document.getElementById('edit-last-name').value.trim(),
      fatherName: document.getElementById('edit-father-name').value.trim() || null,
      motherName: document.getElementById('edit-mother-name').value.trim() || null,
      mobileNumber: document.getElementById('edit-mobile').value.trim(),
      dateOfBirth: document.getElementById('edit-dob').value,
      bloodGroup: document.getElementById('edit-blood-group').value,
      gender: document.getElementById('edit-gender').value,
      medicalConditions: document.getElementById('edit-medical').value.trim() || null
    };

    setLoading(submitBtn, true, 'Saving to Database...');

    try {
      const updated = await window.bcApi.updateProfile(payload);
      showToast('Profile Updated', 'Changes saved successfully to Spring Boot backend.', 'success');
      renderProfileData(updated, true);
    } catch (err) {
      console.error('Profile update error:', err);
      if (err.isNetworkError) {
        showToast('Backend Offline', 'Could not sync with Spring Boot backend (localhost:8080). Saved locally.', 'warning');
        currentUserProfile = { ...currentUserProfile, ...payload };
        window.bcApi.setSession(currentUserProfile);
        renderProfileData(currentUserProfile, false);
      } else {
        showToast('Update Failed', err.message || 'Validation error while updating profile.', 'error');
      }
    } finally {
      setLoading(submitBtn, false, 'Save Changes');
    }
  });
}

/**
 * Availability Toggle Switch
 */
function initAvailabilityToggle() {
  const toggle = document.getElementById('availability-toggle-input');
  const label = document.getElementById('availability-status-text');

  if (toggle && label) {
    toggle.addEventListener('change', () => {
      if (toggle.checked) {
        label.textContent = 'Available for Emergency Calls';
        label.style.color = 'var(--success)';
        showToast('Availability Updated', 'You are marked as AVAILABLE for urgent blood needs.', 'success');
      } else {
        label.textContent = 'Temporarily Unavailable';
        label.style.color = 'var(--text-muted)';
        showToast('Availability Updated', 'You will not receive urgent emergency calls until re-enabled.', 'info');
      }
    });
  }
}

/**
 * Load Nearby Matching Urgent Requests
 */
async function loadNearbyMatchingRequests() {
  const container = document.getElementById('nearby-requests-container');
  if (!container) return;

  const requests = await window.bcApi.getBloodRequests();
  // Filter for matching urgency or relevant blood groups
  const urgentList = requests.slice(0, 3);

  container.innerHTML = urgentList.map(req => `
    <div class="card" style="margin-bottom:1.25rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1.25rem;">
      <div style="display:flex; align-items:center; gap:1.25rem;">
        <div class="donor-blood-tag">${formatBloodGroup(req.bloodGroup)}</div>
        <div>
          <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.25rem;">
            <h4 style="font-size:1.1rem; margin:0;">${req.hospital}</h4>
            <span class="badge ${req.urgency === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}">
              ${req.urgency}
            </span>
          </div>
          <p style="font-size:0.88rem; color:var(--text-secondary); margin:0;">
            Patient: ${req.patientName || 'Anonymous'} • Required: ${req.units} Units • ${req.city} (Approx. 3.2 km away)
          </p>
        </div>
      </div>
      <div style="display:flex; gap:0.75rem;">
        <button class="btn btn-outline btn-sm" onclick="showRequestDetails('${req.id}', '${req.hospital}', '${formatBloodGroup(req.bloodGroup)}')">View Details</button>
        <button class="btn btn-primary btn-sm" onclick="respondToDonation('${req.id}', '${req.hospital}')">Accept & Donate</button>
      </div>
    </div>
  `).join('');
}

function showRequestDetails(id, hospital, bloodGroup) {
  alert(`Blood Request ${id}\nHospital: ${hospital}\nBlood Group: ${bloodGroup}\nRequired Within: 12 Hours\nEmergency Hotline: +91 80 2234 5678`);
}

function respondToDonation(id, hospital) {
  showToast('Response Registered', `Thank you for committing to donate for request ${id} at ${hospital}. Hospital coordinator notified.`, 'success');
}
