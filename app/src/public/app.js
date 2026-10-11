// State Management
let departments = [];
let employees = [];

// DOM Elements
const views = {
  'tab-dashboard': 'Bảng điều khiển Tổng quan',
  'tab-employees': 'Quản lý Nhân sự',
  'tab-departments': 'Danh sách Phòng ban',
  'tab-attendance': 'Sổ Chấm công & Điểm danh',
  'tab-monitoring': 'Hạ tầng & Hệ thống Giám sát'
};

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupLiveClock();
  setupModals();
  setupForms();
  setupSearchAndFilters();
  setupAttendanceActions();
  setupMonitoringLinks();

  // Set default attendance date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('attendance-date').value = today;

  // Initial Load
  loadAllData();
});

// Dynamic host for monitoring links (works on localhost, 127.0.0.1, or VM IP)
function setupMonitoringLinks() {
  const host = window.location.hostname || 'localhost';
  const promLink = document.getElementById('link-prometheus');
  const grafanaLink = document.getElementById('link-grafana');
  if (promLink) promLink.href = `http://${host}:9090`;
  if (grafanaLink) grafanaLink.href = `http://${host}:3001`;
}

// Navigation Handling
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const panes = document.querySelectorAll('.tab-pane');
  const viewTitle = document.getElementById('view-title');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      navButtons.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(targetTab);
      if (pane) pane.classList.add('active');

      if (viewTitle && views[targetTab]) {
        viewTitle.innerText = views[targetTab];
      }

      // Refresh specific tab data
      if (targetTab === 'tab-dashboard') loadDashboardStats();
      if (targetTab === 'tab-employees') loadEmployees();
      if (targetTab === 'tab-departments') loadDepartments();
      if (targetTab === 'tab-attendance') loadAttendance();
    });
  });
}

// Live Clock
function setupLiveClock() {
  const clockEl = document.getElementById('live-clock');
  function updateClock() {
    const now = new Date();
    clockEl.innerText = now.toLocaleTimeString('vi-VN');
  }
  updateClock();
  setInterval(updateClock, 1000);
}

// Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// Data Fetching
async function loadAllData() {
  await Promise.all([
    loadDashboardStats(),
    loadDepartments(),
    loadEmployees(),
    loadAttendance()
  ]);
}

async function loadDashboardStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Cannot load stats');
    const data = await res.json();

    document.getElementById('stat-total-emp').innerText = data.totalEmployees || 0;
    document.getElementById('stat-active-emp').innerText = data.activeEmployees || 0;
    document.getElementById('stat-departments').innerText = data.totalDepartments || 0;
    document.getElementById('stat-attendances').innerText = data.attendancesToday || 0;
  } catch (err) {
    console.error('Stats error:', err);
  }
}

async function loadDepartments() {
  try {
    const res = await fetch('/api/departments');
    departments = await res.json();

    // Render in Departments Tab
    const grid = document.getElementById('dept-grid-container');
    grid.innerHTML = '';

    if (departments.length === 0) {
      grid.innerHTML = '<p class="text-muted">Chưa có phòng ban nào.</p>';
    }

    departments.forEach(dept => {
      const card = document.createElement('div');
      card.className = 'dept-card';
      card.innerHTML = `
        <div class="dept-card-header">
          <span class="dept-code-tag">${escapeHtml(dept.code)}</span>
          <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.8rem; color: #ef4444;" onclick="deleteDepartment(${dept.id})">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
        <h4 class="dept-card-title">${escapeHtml(dept.name)}</h4>
        <p class="dept-desc">${escapeHtml(dept.description || 'Chưa có mô tả chi tiết.')}</p>
        <div class="dept-card-footer">
          <span class="dept-members"><i class="fa-solid fa-users"></i> ${dept.employee_count || 0} nhân sự</span>
        </div>
      `;
      grid.appendChild(card);
    });

    // Populate dropdowns
    updateDepartmentDropdowns();
  } catch (err) {
    console.error('Dept error:', err);
  }
}

function updateDepartmentDropdowns() {
  const filterSelect = document.getElementById('emp-filter-dept');
  const modalSelect = document.getElementById('emp-dept-select');

  // Filter select
  const currentFilter = filterSelect.value;
  filterSelect.innerHTML = '<option value="">Tất cả phòng ban</option>';
  departments.forEach(d => {
    filterSelect.innerHTML += `<option value="${d.id}">${escapeHtml(d.name)}</option>`;
  });
  filterSelect.value = currentFilter;

  // Modal select
  modalSelect.innerHTML = '<option value="">-- Chưa phân bổ --</option>';
  departments.forEach(d => {
    modalSelect.innerHTML += `<option value="${d.id}">${escapeHtml(d.name)} (${escapeHtml(d.code)})</option>`;
  });
}

async function loadEmployees() {
  try {
    const search = document.getElementById('emp-search-input').value.trim();
    const deptId = document.getElementById('emp-filter-dept').value;

    let url = '/api/employees?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (deptId) url += `department_id=${encodeURIComponent(deptId)}&`;

    const res = await fetch(url);
    employees = await res.json();

    const tbody = document.getElementById('emp-table-body');
    tbody.innerHTML = '';

    if (employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 24px; color: #94a3b8;">Không tìm thấy nhân viên nào</td></tr>';
    } else {
      employees.forEach(emp => {
        const tr = document.createElement('tr');
        const salaryFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(emp.salary || 0);

        tr.innerHTML = `
          <td><strong>${escapeHtml(emp.code)}</strong></td>
          <td>${escapeHtml(emp.full_name)}</td>
          <td>${escapeHtml(emp.department_name || 'Chưa phân bổ')}</td>
          <td>${escapeHtml(emp.position || '-')}</td>
          <td>
            <div>${escapeHtml(emp.email)}</div>
            <small style="color: #64748b;">${escapeHtml(emp.phone || '')}</small>
          </td>
          <td>${salaryFormatted}</td>
          <td><span class="status-badge ${emp.status}">${emp.status}</span></td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-outline" style="padding: 4px 8px;" onclick="openEditEmployee(${emp.id})">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn btn-outline" style="padding: 4px 8px; color: #ef4444;" onclick="deleteEmployee(${emp.id})">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Populate quick-emp select on dashboard
    const quickSelect = document.getElementById('quick-emp-select');
    quickSelect.innerHTML = '<option value="">-- Chọn nhân viên --</option>';
    employees.forEach(emp => {
      quickSelect.innerHTML += `<option value="${emp.id}">${escapeHtml(emp.code)} - ${escapeHtml(emp.full_name)}</option>`;
    });
  } catch (err) {
    console.error('Employees error:', err);
  }
}

async function loadAttendance() {
  try {
    const date = document.getElementById('attendance-date').value;
    const res = await fetch(`/api/attendances?date=${date}`);
    const attendances = await res.json();

    const tbody = document.getElementById('attendance-table-body');
    tbody.innerHTML = '';

    if (attendances.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px; color: #94a3b8;">Chưa có dữ liệu chấm công cho ngày ${date}</td></tr>`;
    } else {
      attendances.forEach(att => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${escapeHtml(att.employee_code)}</strong></td>
          <td>${escapeHtml(att.employee_name)}</td>
          <td>${escapeHtml(att.department_name || '-')}</td>
          <td><span style="font-weight: 600; color: #16a34a;">${att.check_in || '-'}</span></td>
          <td><span style="font-weight: 600; color: #dc2626;">${att.check_out || 'Chưa check out'}</span></td>
          <td><span class="status-badge ${att.status}">${att.status === 'PRESENT' ? 'Đúng giờ' : (att.status === 'LATE' ? 'Đi muộn' : att.status)}</span></td>
          <td>${escapeHtml(att.notes || '')}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Attendance error:', err);
  }
}

// Attendance Quick Actions
function setupAttendanceActions() {
  document.getElementById('btn-quick-checkin').addEventListener('click', async () => {
    const employee_id = document.getElementById('quick-emp-select').value;
    const notes = document.getElementById('quick-notes').value;

    if (!employee_id) {
      showToast('Vui lòng chọn nhân viên!', 'error');
      return;
    }

    try {
      const res = await fetch('/api/attendances/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id, notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check in thất bại');

      showToast('Điểm danh Check-in thành công!');
      document.getElementById('quick-notes').value = '';
      loadDashboardStats();
      loadAttendance();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('btn-quick-checkout').addEventListener('click', async () => {
    const employee_id = document.getElementById('quick-emp-select').value;
    if (!employee_id) {
      showToast('Vui lòng chọn nhân viên!', 'error');
      return;
    }

    try {
      const res = await fetch('/api/attendances/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check out thất bại');

      showToast('Check-out thành công!');
      loadDashboardStats();
      loadAttendance();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('btn-refresh-attendance').addEventListener('click', loadAttendance);
  document.getElementById('attendance-date').addEventListener('change', loadAttendance);
}

// Modals Handling
function setupModals() {
  const empModal = document.getElementById('emp-modal');
  const deptModal = document.getElementById('dept-modal');

  document.getElementById('btn-open-add-emp').addEventListener('click', () => {
    document.getElementById('emp-form').reset();
    document.getElementById('emp-form-id').value = '';
    document.getElementById('emp-modal-title').innerText = 'Thêm Nhân viên mới';
    empModal.classList.add('show');
  });

  document.getElementById('btn-close-emp-modal').addEventListener('click', () => empModal.classList.remove('show'));
  document.getElementById('btn-cancel-emp').addEventListener('click', () => empModal.classList.remove('show'));

  document.getElementById('btn-open-add-dept').addEventListener('click', () => {
    document.getElementById('dept-form').reset();
    deptModal.classList.add('show');
  });

  document.getElementById('btn-close-dept-modal').addEventListener('click', () => deptModal.classList.remove('show'));
  document.getElementById('btn-cancel-dept').addEventListener('click', () => deptModal.classList.remove('show'));
}

// Form Submissions
function setupForms() {
  // Employee Form
  document.getElementById('emp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('emp-form-id').value;
    const payload = {
      code: document.getElementById('emp-code').value.trim(),
      full_name: document.getElementById('emp-fullname').value.trim(),
      email: document.getElementById('emp-email').value.trim(),
      phone: document.getElementById('emp-phone').value.trim(),
      department_id: document.getElementById('emp-dept-select').value || null,
      position: document.getElementById('emp-position').value.trim(),
      salary: parseFloat(document.getElementById('emp-salary').value) || 0,
      status: document.getElementById('emp-status').value
    };

    try {
      const url = id ? `/api/employees/${id}` : '/api/employees';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Thao tác không thành công');

      showToast(id ? 'Cập nhật nhân viên thành công' : 'Thêm nhân viên mới thành công');
      document.getElementById('emp-modal').classList.remove('show');
      loadEmployees();
      loadDashboardStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Department Form
  document.getElementById('dept-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      code: document.getElementById('dept-code').value.trim(),
      name: document.getElementById('dept-name').value.trim(),
      description: document.getElementById('dept-desc').value.trim()
    };

    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tạo phòng ban thất bại');

      showToast('Tạo phòng ban thành công');
      document.getElementById('dept-modal').classList.remove('show');
      loadDepartments();
      loadDashboardStats();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function setupSearchAndFilters() {
  document.getElementById('emp-search-input').addEventListener('input', debounce(loadEmployees, 300));
  document.getElementById('emp-filter-dept').addEventListener('change', loadEmployees);
}

// Global Actions for inline onclick
window.openEditEmployee = function(id) {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;

  document.getElementById('emp-form-id').value = emp.id;
  document.getElementById('emp-code').value = emp.code;
  document.getElementById('emp-fullname').value = emp.full_name;
  document.getElementById('emp-email').value = emp.email;
  document.getElementById('emp-phone').value = emp.phone || '';
  document.getElementById('emp-dept-select').value = emp.department_id || '';
  document.getElementById('emp-position').value = emp.position || '';
  document.getElementById('emp-salary').value = emp.salary || 0;
  document.getElementById('emp-status').value = emp.status || 'ACTIVE';

  document.getElementById('emp-modal-title').innerText = 'Chỉnh sửa thông tin Nhân viên';
  document.getElementById('emp-modal').classList.add('show');
};

window.deleteEmployee = async function(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) return;
  try {
    const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Xóa thất bại');
    showToast('Đã xóa nhân viên');
    loadEmployees();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.deleteDepartment = async function(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa phòng ban này? Các nhân viên thuộc phòng sẽ chuyển về Chưa phân bổ.')) return;
  try {
    const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Xóa phòng ban thất bại');
    showToast('Đã xóa phòng ban');
    loadDepartments();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Utilities
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
