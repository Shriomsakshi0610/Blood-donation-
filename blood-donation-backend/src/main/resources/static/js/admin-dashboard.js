/**
 * BloodConnect — Admin Dashboard Controller
 * Provides System KPIs, User & Donor Management, Verification Queue, and Inventory Analytics
 */

document.addEventListener('DOMContentLoaded', () => {
  initAdminTabs();
  loadAdminUsers();
  loadAdminRequests();
  initSearchableTables();
  renderInventoryBarChart();
});

function initAdminTabs() {
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
 * Load Admin Users & Donors Table
 */
async function loadAdminUsers() {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) return;

  const users = [
    { id: 1, name: "Rahul Sharma", email: "rahul@example.com", mobile: "+91 9876543210", bloodGroup: "O_POSITIVE", role: "Donor", status: "VERIFIED", joined: "2026-01-12" },
    { id: 2, name: "Pooja Deshmukh", email: "pooja.d@example.com", mobile: "+91 9823456781", bloodGroup: "A_POSITIVE", role: "Donor", status: "VERIFIED", joined: "2026-02-04" },
    { id: 3, name: "Vikram Rathore", email: "vikram@example.com", mobile: "+91 9712345678", bloodGroup: "B_POSITIVE", role: "Donor", status: "VERIFIED", joined: "2026-02-18" },
    { id: 4, name: "Sneha Nair", email: "sneha.nair@example.com", mobile: "+91 9845112233", bloodGroup: "AB_POSITIVE", role: "Recipient", status: "PENDING", joined: "2026-03-01" },
    { id: 5, name: "Dr. Aryan Verma", email: "aryan.v@example.com", mobile: "+91 9911223344", bloodGroup: "O_NEGATIVE", role: "Doctor / Donor", status: "VERIFIED", joined: "2026-03-15" }
  ];

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>#USER-${u.id}</td>
      <td>
        <strong>${u.name}</strong>
        <div style="font-size:0.8rem; color:var(--text-muted);">${u.email}</div>
      </td>
      <td><span class="badge badge-blood">${formatBloodGroup(u.bloodGroup)}</span></td>
      <td>${u.mobile}</td>
      <td><span class="badge badge-info">${u.role}</span></td>
      <td>
        <span class="badge ${u.status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}">
          ${u.status}
        </span>
      </td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="showUserModal(${u.id}, '${u.name}', '${u.email}', '${u.bloodGroup}')">Manage</button>
      </td>
    </tr>
  `).join('');
}

/**
 * Load Admin Requests
 */
async function loadAdminRequests() {
  const tbody = document.getElementById('admin-requests-table-body');
  if (!tbody) return;

  const reqs = await window.bcApi.getBloodRequests();
  tbody.innerHTML = reqs.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${r.hospital}</td>
      <td>${r.city}</td>
      <td><span class="badge badge-blood">${formatBloodGroup(r.bloodGroup)}</span></td>
      <td>${r.units} Units</td>
      <td><span class="badge ${r.urgency === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}">${r.urgency}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="alert('Broadcasting emergency SMS push for ${r.id}...')">Dispatch Alert</button>
      </td>
    </tr>
  `).join('');
}

function initSearchableTables() {
  const input = document.getElementById('admin-user-search');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    const rows = document.querySelectorAll('#admin-users-table-body tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(q) ? '' : 'none';
    });
  });
}

/**
 * Render Blood Inventory Distribution (Pure CSS & SVG)
 */
function renderInventoryBarChart() {
  const container = document.getElementById('inventory-chart-bars');
  if (!container) return;

  const inventory = [
    { type: 'A+', units: 142, max: 200, color: '#FF3038' },
    { type: 'A-', units: 48,  max: 200, color: '#E51D2A' },
    { type: 'B+', units: 185, max: 200, color: '#FF3038' },
    { type: 'B-', units: 36,  max: 200, color: '#E51D2A' },
    { type: 'AB+', units: 92, max: 200, color: '#FF3038' },
    { type: 'AB-', units: 18, max: 200, color: '#EF4444' }, // critical
    { type: 'O+', units: 196, max: 200, color: '#FF3038' },
    { type: 'O-', units: 28,  max: 200, color: '#EF4444' }  // critical
  ];

  container.innerHTML = inventory.map(item => {
    const pct = Math.round((item.units / item.max) * 100);
    const isCritical = item.units < 40;

    return `
      <div style="display:flex; flex-direction:column; align-items:center; gap:0.5rem; flex:1; min-width:40px;">
        <div style="font-size:0.8rem; font-weight:700; color:${isCritical ? 'var(--danger)' : 'var(--text-main)'};">
          ${item.units}u
        </div>
        <div style="width:100%; height:160px; background:var(--bg-input); border-radius:var(--radius-sm); display:flex; align-items:flex-end; padding:3px; border:1px solid var(--border-color);">
          <div style="width:100%; height:${pct}%; background:${isCritical ? 'var(--danger)' : 'var(--primary-red)'}; border-radius:4px; box-shadow:0 0 10px ${isCritical ? 'rgba(239,68,68,0.5)' : 'rgba(255,48,56,0.4)'}; transition:height 1s ease;"></div>
        </div>
        <div style="font-weight:700; font-size:0.88rem; color:var(--text-secondary);">${item.type}</div>
      </div>
    `;
  }).join('');
}

function showUserModal(id, name, email, bloodGroup) {
  alert(`User ID: #${id}\nName: ${name}\nEmail: ${email}\nBlood Group: ${formatBloodGroup(bloodGroup)}\nRole: Voluntary Donor\nStatus: Active`);
}
