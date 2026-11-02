/**
 * BloodConnect — Homepage Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  loadRealHomepageStats();
  initQuickSearch();
  initCompatibilityWidget();
});

/**
 * Fetch and Render Real Database Statistics (GET /api/stats)
 * No fake counters, no simulated numbers, and no fabricated claims.
 */
async function loadRealHomepageStats() {
  const statDonors = document.getElementById('stat-registered-donors');
  const statUsers = document.getElementById('stat-total-users');
  const statBloodGroups = document.getElementById('stat-blood-groups');
  const statDonations = document.getElementById('stat-donations');
  const heroDonorCount = document.getElementById('hero-donor-count');

  try {
    const stats = await window.bcApi.getPublicStats();
    
    // 1. Registered Donors (genuine database count)
    const donorsCount = typeof stats.registeredDonors === 'number' ? stats.registeredDonors : 0;
    if (statDonors) {
      animateStat(statDonors, donorsCount);
    }
    if (heroDonorCount) {
      heroDonorCount.textContent = donorsCount.toLocaleString();
    }

    // 2. Total Registered Users / Community Members
    const usersCount = typeof stats.totalUsers === 'number' ? stats.totalUsers : 0;
    if (statUsers) {
      animateStat(statUsers, usersCount);
    }

    // 3. Blood Groups Represented in the Database
    const bloodGroupsCount = typeof stats.bloodGroupsRepresented === 'number' ? stats.bloodGroupsRepresented : 0;
    if (statBloodGroups) {
      animateStat(statBloodGroups, bloodGroupsCount, '/ 8');
    }

    // 4. Verified Donations (Handled honestly: schema limitation)
    if (statDonations) {
      if (stats.totalDonations !== null && stats.totalDonations !== undefined) {
        animateStat(statDonations, stats.totalDonations);
      } else {
        statDonations.innerHTML = `<span style="color:var(--text-muted); font-size:1.6rem;" title="Donation recording module is currently in development">—</span>`;
      }
    }
  } catch (err) {
    console.warn('[BloodConnect] Could not load statistics from backend:', err.message);
    // Honest unavailable indicator on error / offline
    const unavailableHtml = `<span style="color:var(--text-muted); font-size:1.6rem;" title="Statistics service unavailable">—</span>`;
    if (statDonors) statDonors.innerHTML = unavailableHtml;
    if (statUsers) statUsers.innerHTML = unavailableHtml;
    if (statBloodGroups) statBloodGroups.innerHTML = unavailableHtml;
    if (statDonations) statDonations.innerHTML = unavailableHtml;
    if (heroDonorCount) heroDonorCount.textContent = '—';
  }
}

function animateStat(element, target, suffix = '') {
  if (!element) return;
  if (target === 0) {
    element.innerHTML = `0${suffix ? `<span class="stat-suffix" style="font-size:0.9rem; color:var(--text-muted); margin-left:0.25rem;">${suffix}</span>` : ''}`;
    return;
  }

  const duration = 1200;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(target * easeOut);
    element.innerHTML = `${current.toLocaleString()}${suffix ? `<span class="stat-suffix" style="font-size:0.9rem; color:var(--text-muted); margin-left:0.25rem;">${suffix}</span>` : ''}`;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.innerHTML = `${target.toLocaleString()}${suffix ? `<span class="stat-suffix" style="font-size:0.9rem; color:var(--text-muted); margin-left:0.25rem;">${suffix}</span>` : ''}`;
    }
  }

  requestAnimationFrame(update);
}

/**
 * Homepage Quick Search Redirect
 */
function initQuickSearch() {
  const form = document.getElementById('home-quick-search-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bloodGroup = document.getElementById('quick-blood-group').value;
    const city = document.getElementById('quick-city').value.trim();
    
    const params = new URLSearchParams();
    if (bloodGroup && bloodGroup !== 'ALL') params.append('bloodGroup', bloodGroup);
    if (city) params.append('city', city);

    window.location.href = `search.html?${params.toString()}`;
  });
}

/**
 * Interactive Blood Type Compatibility Explorer
 */
const COMPATIBILITY_DATA = {
  'O_NEGATIVE': {
    give: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    receive: ['O-'],
    role: 'Universal Red Blood Cell Donor'
  },
  'O_POSITIVE': {
    give: ['O+', 'A+', 'B+', 'AB+'],
    receive: ['O+', 'O-'],
    role: 'Most Needed Common Blood Type'
  },
  'A_NEGATIVE': {
    give: ['A-', 'A+', 'AB-', 'AB+'],
    receive: ['A-', 'O-'],
    role: 'Rare & Highly Valued'
  },
  'A_POSITIVE': {
    give: ['A+', 'AB+'],
    receive: ['A+', 'A-', 'O+', 'O-'],
    role: 'Key Platelet & RBC Donor'
  },
  'B_NEGATIVE': {
    give: ['B-', 'B+', 'AB-', 'AB+'],
    receive: ['B-', 'O-'],
    role: 'Rare Donor Type'
  },
  'B_POSITIVE': {
    give: ['B+', 'AB+'],
    receive: ['B+', 'B-', 'O+', 'O-'],
    role: 'Essential Hospital Supply'
  },
  'AB_NEGATIVE': {
    give: ['AB-', 'AB+'],
    receive: ['AB-', 'A-', 'B-', 'O-'],
    role: 'Rarest Blood Group'
  },
  'AB_POSITIVE': {
    give: ['AB+'],
    receive: ['All Blood Types (Universal Recipient)'],
    role: 'Universal Plasma Donor'
  }
};

function initCompatibilityWidget() {
  const buttons = document.querySelectorAll('.compat-btn');
  const detailsBox = document.getElementById('compat-details-box');
  if (!buttons.length || !detailsBox) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const bg = btn.getAttribute('data-bg');
      const data = COMPATIBILITY_DATA[bg];
      if (!data) return;

      detailsBox.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
          <h4 style="display:flex; align-items:center; gap:0.5rem;">
            <span class="badge badge-blood">${formatBloodGroup(bg)}</span>
            <span>${data.role}</span>
          </h4>
        </div>
        <div class="grid grid-2 gap-2">
          <div style="background:var(--bg-input); padding:1.25rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
            <div style="font-size:0.82rem; text-transform:uppercase; color:var(--text-muted); font-weight:600; margin-bottom:0.5rem;">You Can Donate Blood To:</div>
            <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
              ${data.give.map(t => `<span class="badge badge-success" style="font-size:0.85rem;">${t}</span>`).join('')}
            </div>
          </div>
          <div style="background:var(--bg-input); padding:1.25rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
            <div style="font-size:0.82rem; text-transform:uppercase; color:var(--text-muted); font-weight:600; margin-bottom:0.5rem;">You Can Receive Blood From:</div>
            <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
              ${data.receive.map(t => `<span class="badge badge-info" style="font-size:0.85rem;">${t}</span>`).join('')}
            </div>
          </div>
        </div>
      `;
    });
  });
}
