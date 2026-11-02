/**
 * BloodConnect — Donor Search Page Controller
 */

let currentDonors = [];
let leafletMap = null;
let mapMarkers = [];

document.addEventListener('DOMContentLoaded', () => {
  parseQueryParams();
  initSearchFilters();
  initViewToggle();
  executeSearch();
});

function parseQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const bloodGroup = urlParams.get('bloodGroup');
  const city = urlParams.get('city');

  if (bloodGroup) {
    const bgSelect = document.getElementById('filter-blood-group');
    if (bgSelect) bgSelect.value = bloodGroup;
  }
  if (city) {
    const cityInput = document.getElementById('filter-location');
    if (cityInput) cityInput.value = city;
  }
}

function initSearchFilters() {
  const form = document.getElementById('donor-filter-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      executeSearch();
    });
  }

  // Radius slider listener
  const radiusSlider = document.getElementById('filter-radius');
  const radiusVal = document.getElementById('radius-value');
  if (radiusSlider && radiusVal) {
    radiusSlider.addEventListener('input', () => {
      radiusVal.textContent = `${radiusSlider.value} km`;
    });
  }

  // Checkbox auto-refresh
  const checkboxes = document.querySelectorAll('#filter-available, #filter-verified');
  checkboxes.forEach(cb => cb.addEventListener('change', () => executeSearch()));
}

function initViewToggle() {
  const btnList = document.getElementById('btn-view-list');
  const btnMap = document.getElementById('btn-view-map');
  const listView = document.getElementById('donor-list-container');
  const mapView = document.getElementById('donor-map-container');

  if (btnList && btnMap && listView && mapView) {
    btnList.addEventListener('click', () => {
      btnList.classList.add('active');
      btnMap.classList.remove('active');
      listView.style.display = 'grid';
      mapView.style.display = 'none';
    });

    btnMap.addEventListener('click', () => {
      btnMap.classList.add('active');
      btnList.classList.remove('active');
      listView.style.display = 'none';
      mapView.style.display = 'block';
      setTimeout(() => initOrUpdateMap(currentDonors), 100);
    });
  }
}

async function executeSearch() {
  const bloodGroup = document.getElementById('filter-blood-group')?.value || 'ALL';
  const city = document.getElementById('filter-location')?.value.trim() || '';
  const onlyAvailable = document.getElementById('filter-available')?.checked || false;
  const onlyVerified = document.getElementById('filter-verified')?.checked || false;

  const resultsContainer = document.getElementById('donor-list-container');
  const resultsCount = document.getElementById('search-results-count');

  if (resultsContainer) {
    resultsContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
        <svg class="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary-red)" stroke-width="2" style="animation:spin 1s linear infinite; margin-bottom:1rem;">
          <circle cx="12" cy="12" r="10" stroke="rgba(255,48,56,0.2)"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        <p style="color:var(--text-secondary);">Searching matching voluntary blood donors...</p>
      </div>
    `;
  }

  try {
    currentDonors = await window.bcApi.searchDonors({
      bloodGroup,
      city,
      onlyAvailable,
      onlyVerified
    });

    if (resultsCount) {
      resultsCount.textContent = `Found ${currentDonors.length} matching donors`;
    }

    renderDonorCards(currentDonors);
    if (leafletMap && document.getElementById('donor-map-container')?.style.display !== 'none') {
      initOrUpdateMap(currentDonors);
    }
  } catch (err) {
    console.error('Search error:', err);
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
          <p style="color:var(--danger);">Error searching donors: ${err.message}</p>
        </div>
      `;
    }
  }
}

function renderDonorCards(donors) {
  const container = document.getElementById('donor-list-container');
  if (!container) return;

  if (donors.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; background:var(--bg-card); border-radius:var(--radius-lg); border:1px solid var(--border-color);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin-bottom:1rem;">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <h4>No Donors Found Matching Your Criteria</h4>
        <p style="margin-top:0.5rem; color:var(--text-secondary);">Try broadening your search radius or selecting "All Blood Groups".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = donors.map(donor => `
    <div class="donor-card card-glow">
      <div>
        <div class="donor-card-header">
          <div style="display:flex; align-items:center; gap:0.85rem;">
            <div class="donor-blood-tag">${formatBloodGroup(donor.bloodGroup)}</div>
            <div class="donor-info">
              <h4>${donor.name}</h4>
              <p class="location">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                ${donor.city} (PIN: ${donor.pincode})
              </p>
            </div>
          </div>
          ${donor.verified ? `
            <span class="badge badge-success" title="Identity & Blood Group Verified">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Verified
            </span>
          ` : `
            <span class="badge badge-warning">Unverified</span>
          `}
        </div>

        <div class="donor-card-meta">
          <div class="meta-item">
            <span class="meta-label">Approx. Distance</span>
            <span class="meta-val">${donor.distance}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Total Donations</span>
            <span class="meta-val">${donor.donations} times</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Status</span>
            <span class="meta-val" style="color:${donor.available ? 'var(--success)' : 'var(--text-muted)'}">
              ${donor.available ? '● Available Now' : '○ Unavailable'}
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Last Donated</span>
            <span class="meta-val">${donor.lastDonated || 'Recent'}</span>
          </div>
        </div>
      </div>

      <div style="margin-top:1.25rem;">
        <button class="btn btn-primary btn-sm btn-block" onclick="openContactModal('${donor.name}', '${formatBloodGroup(donor.bloodGroup)}', '${donor.city}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Request Emergency Contact
        </button>
      </div>
    </div>
  `).join('');
}

function openContactModal(donorName, bloodGroup, city) {
  let modal = document.getElementById('contact-donor-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'contact-donor-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h4>Request Contact with ${donorName}</h4>
        <button class="modal-close" onclick="closeModal('contact-donor-modal')">✕</button>
      </div>
      <div class="modal-body">
        <div style="background:var(--bg-input); padding:1rem; border-radius:var(--radius-md); margin-bottom:1.25rem; display:flex; align-items:center; gap:1rem;">
          <div class="badge badge-blood">${bloodGroup}</div>
          <div>
            <div style="font-weight:600; color:var(--text-main);">${donorName}</div>
            <div style="font-size:0.82rem; color:var(--text-secondary);">${city} • Verified Voluntary Donor</div>
          </div>
        </div>

        <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:1rem;">
          To protect donor privacy, voluntary donors do not share direct phone numbers publicly. Submitting this request sends an instant SMS and in-app emergency alert with your hospital patient details.
        </p>

        <form id="contact-request-form" onsubmit="handleSendContactRequest(event, '${donorName}')">
          <div class="form-group">
            <label class="form-label">Patient Name <span class="required">*</span></label>
            <input type="text" id="req-patient-name" class="form-control" placeholder="e.g. Rahul Sharma" required>
          </div>
          <div class="form-group">
            <label class="form-label">Hospital / Medical Center <span class="required">*</span></label>
            <input type="text" id="req-hospital" class="form-control" placeholder="e.g. City General Hospital, Ward 4" required>
          </div>
          <div class="form-group">
            <label class="form-label">Required Units <span class="required">*</span></label>
            <input type="number" id="req-units" class="form-control" value="1" min="1" max="10" required>
          </div>
          <div class="form-group">
            <label class="form-label">Requester Callback Mobile <span class="required">*</span></label>
            <input type="tel" id="req-mobile" class="form-control" placeholder="10-digit mobile number" pattern="^[6-9][0-9]{9}$" required>
          </div>
          <div class="modal-footer" style="padding:1rem 0 0; border-top:none;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal('contact-donor-modal')">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">Dispatch Emergency Alert</button>
          </div>
        </form>
      </div>
    </div>
  `;

  openModal('contact-donor-modal');
}

function handleSendContactRequest(e, donorName) {
  e.preventDefault();
  closeModal('contact-donor-modal');
  showToast('Alert Dispatched', `Emergency blood request sent to ${donorName}. They will receive your patient and hospital details.`, 'success');
}

/**
 * Interactive Leaflet Map View
 */
function initOrUpdateMap(donors) {
  const mapElem = document.getElementById('map-view-elem');
  if (!mapElem) return;

  // If leaflet library is loaded
  if (typeof L === 'undefined') {
    mapElem.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:450px; background:var(--bg-input); border-radius:var(--radius-lg); text-align:center; padding:2rem;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary-red)" stroke-width="2" style="margin-bottom:1rem;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        <h4>Interactive Map View</h4>
        <p style="color:var(--text-secondary); max-width:400px; margin-top:0.5rem;">
          Showing ${donors.length} active donors distributed in nearby healthcare zones.
        </p>
      </div>
    `;
    return;
  }

  if (!leafletMap) {
    leafletMap = L.map('map-view-elem').setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(leafletMap);
  }

  // Clear existing markers
  mapMarkers.forEach(m => leafletMap.removeLayer(m));
  mapMarkers = [];

  const cityCoordinates = {
    'New Delhi': [28.6139, 77.2090],
    'Mumbai': [19.0760, 72.8777],
    'Bengaluru': [12.9716, 77.5946],
    'Kolkata': [22.5726, 88.3639],
    'Pune': [18.5204, 73.8567],
    'Chandigarh': [30.7333, 76.7794],
    'Chennai': [13.0827, 80.2707],
    'Hyderabad': [17.3850, 78.4867],
    'Kochi': [9.9312, 76.2673]
  };

  const group = [];
  donors.forEach(d => {
    let coords = cityCoordinates[d.city];
    if (coords) {
      // Add small jitter so multiple markers in same city don't completely overlap
      const jitterLat = coords[0] + (Math.random() - 0.5) * 0.08;
      const jitterLng = coords[1] + (Math.random() - 0.5) * 0.08;
      
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background:#FF3038; color:white; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:11px; border:2px solid white; box-shadow:0 0 10px rgba(255,48,56,0.8);">${formatBloodGroup(d.bloodGroup)}</div>`,
        iconSize: [28, 28]
      });

      const marker = L.marker([jitterLat, jitterLng], { icon: customIcon }).addTo(leafletMap);
      marker.bindPopup(`
        <div style="background:#1B1B22; color:white; padding:8px; border-radius:8px; font-family:sans-serif; min-width:180px;">
          <strong style="font-size:14px; color:#FF3038;">${formatBloodGroup(d.bloodGroup)} Donor</strong><br>
          <span>${d.name}</span><br>
          <span style="font-size:11px; color:#B7B7C2;">${d.city} • ${d.distance}</span><br>
          <div style="margin-top:6px; font-size:12px; color:#22C55E;">● Available</div>
        </div>
      `);
      mapMarkers.push(marker);
      group.push([jitterLat, jitterLng]);
    }
  });

  if (group.length > 0) {
    leafletMap.fitBounds(group, { padding: [50, 50], maxZoom: 12 });
  }
}
