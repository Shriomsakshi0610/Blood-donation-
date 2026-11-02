/**
 * BloodConnect — Homepage Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  initStatsCounters();
  initQuickSearch();
  initCompatibilityWidget();
});

/**
 * Animated Statistics Counter
 */
function initStatsCounters() {
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateValue(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  statNumbers.forEach(el => observer.observe(el));
}

function animateValue(element) {
  const target = parseInt(element.getAttribute('data-target'), 10);
  const suffix = element.getAttribute('data-suffix') || '';
  const duration = 1800;
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out quart
    const easeOut = 1 - Math.pow(1 - progress, 4);
    const current = Math.floor(start + (target - start) * easeOut);
    element.innerHTML = `${current.toLocaleString()}<span class="plus">${suffix}</span>`;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.innerHTML = `${target.toLocaleString()}<span class="plus">${suffix}</span>`;
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
