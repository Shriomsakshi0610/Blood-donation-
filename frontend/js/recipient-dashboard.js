/**
 * BloodConnect — Recipient Dashboard Controller
 * Manages Blood Requests, Emergency Broadcasts, and Donor Responses
 */

document.addEventListener('DOMContentLoaded', () => {
  initRecipientTabs();
  loadRecipientRequests();
  initCreateRequestForm();
});

function initRecipientTabs() {
  const links = document.querySelectorAll('.sidebar-link[data-tab]');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.getAttribute('data-tab');

      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const panels = document.querySelectorAll('.dashboard-panel');
      panels.forEach(p => p.classList.remove('active'));

      const target = document.getElementById(`panel-${tabId}`);
      if (target) target.classList.add('active');
    });
  });
}

/**
 * Load Active & Historical Blood Requests
 */
async function loadRecipientRequests() {
  const container = document.getElementById('recipient-requests-table-body');
  if (!container) return;

  const requests = await window.bcApi.getBloodRequests();
  
  if (requests.length === 0) {
    container.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem;">No active requests. Click "Create Blood Request" to post an emergency request.</td></tr>`;
    return;
  }

  container.innerHTML = requests.map(req => {
    const statusBadges = {
      'PENDING': `<span class="badge badge-warning">Broadcasting</span>`,
      'DONOR_ASSIGNED': `<span class="badge badge-info">2 Donors Responded</span>`,
      'FULFILLED': `<span class="badge badge-success">Fulfilled</span>`
    };

    return `
      <tr>
        <td><strong>${req.id}</strong></td>
        <td>
          <div style="font-weight:600; color:var(--text-main);">${req.patientName || 'Emergency Patient'}</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">${req.city}</div>
        </td>
        <td><span class="badge badge-blood">${formatBloodGroup(req.bloodGroup)}</span></td>
        <td>${req.units} Units</td>
        <td>${req.hospital}</td>
        <td><span class="badge ${req.urgency === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}">${req.urgency}</span></td>
        <td>${statusBadges[req.status] || `<span class="badge badge-info">${req.status}</span>`}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="viewResponsesModal('${req.id}', '${req.hospital}')">View Donors</button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Handle Blood Request Creation Form
 */
function initCreateRequestForm() {
  const form = document.getElementById('create-request-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const patientName = document.getElementById('newreq-patient').value.trim();
    const bloodGroup = document.getElementById('newreq-blood-group').value;
    const units = parseInt(document.getElementById('newreq-units').value, 10);
    const hospital = document.getElementById('newreq-hospital').value.trim();
    const city = document.getElementById('newreq-city').value.trim();
    const pincode = document.getElementById('newreq-pincode').value.trim();
    const requiredDate = document.getElementById('newreq-date').value;
    const urgency = document.getElementById('newreq-urgency').value;
    const contact = document.getElementById('newreq-contact').value.trim();
    const consent = document.getElementById('newreq-consent').checked;

    if (!consent) {
      showToast('Consent Required', 'Please confirm that the medical request is verified.', 'warning');
      return;
    }

    const payload = {
      patientName,
      bloodGroup,
      units,
      hospital,
      city,
      pincode,
      requiredDate,
      urgency,
      contact
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    setLoading(submitBtn, true, 'Broadcasting Request...');

    try {
      const created = await window.bcApi.createBloodRequest(payload);
      showToast('Request Broadcasted', `Urgent request ${created.id} broadcasted to all matching ${formatBloodGroup(bloodGroup)} donors in ${city}!`, 'success');
      closeModal('create-request-modal');
      form.reset();
      loadRecipientRequests();
    } catch (err) {
      showToast('Error', err.message, 'error');
    } finally {
      setLoading(submitBtn, false, 'Broadcast Emergency Request');
    }
  });
}

function viewResponsesModal(reqId, hospital) {
  let modal = document.getElementById('view-responses-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'view-responses-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-dialog" style="max-width:620px;">
      <div class="modal-header">
        <h4>Matched Donors for ${reqId}</h4>
        <button class="modal-close" onclick="closeModal('view-responses-modal')">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:1.25rem;">
          The following voluntary donors have responded to your request at <strong>${hospital}</strong> and are available for donation.
        </p>

        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:0.85rem;">
              <div class="badge badge-blood">O+</div>
              <div>
                <strong style="color:var(--text-main);">Dr. Aryan Verma</strong>
                <div style="font-size:0.82rem; color:var(--text-secondary);">2.4 km away • Verified 14x Donor</div>
              </div>
            </div>
            <a href="tel:+919876543210" class="btn btn-primary btn-sm">Call Donor</a>
          </div>

          <div style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:0.85rem;">
              <div class="badge badge-blood">O+</div>
              <div>
                <strong style="color:var(--text-main);">Rohan Kulkarni</strong>
                <div style="font-size:0.82rem; color:var(--text-secondary);">3.2 km away • Available immediately</div>
              </div>
            </div>
            <a href="tel:+919876543211" class="btn btn-primary btn-sm">Call Donor</a>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" onclick="closeModal('view-responses-modal')">Close</button>
      </div>
    </div>
  `;

  openModal('view-responses-modal');
}
