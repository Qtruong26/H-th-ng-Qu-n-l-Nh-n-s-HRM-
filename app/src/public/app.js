// ========================================================
// HỆ THỐNG QUẢN LÝ NHÂN SỰ (HRM) - FRONTEND APPLICATION
// ========================================================

// Trạng thái phiên người dùng và dữ liệu
let authToken = localStorage.getItem('hrm_token') || null;
let currentUser = JSON.parse(localStorage.getItem('hrm_user') || 'null');

let departments = [];
let employees = [];
let empPagination = { page: 1, limit: 10, total: 0, totalPages: 1 };

let deptChartInstance = null;
let attChartInstance = null;

// Tiêu đề tương ứng các Tab
const viewTitles = {
  'tab-dashboard': 'Bảng điều khiển Tổng quan',
  'tab-employees': 'Quản lý Nhân sự',
  'tab-departments': 'Danh sách Phòng ban',
  'tab-attendance': 'Sổ Chấm công & Điểm danh',
  'tab-monitoring': 'Hạ tầng & Hệ thống Giám sát'
};

// Khởi chạy ứng dụng
document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  setupNavigation();
  setupLiveClock();
  setupModals();
  setupForms();
  setupFilters();
  setupMonitoringLinks();

  // Mặc định ngày hôm nay cho chấm công
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('attendance-date');
  if (dateInput) dateInput.value = today;

  if (authToken && currentUser) {
    applyUserRoleUI();
    loadAllData();
  } else {
    showLoginOverlay(true);
  }
});

// =================== 1. QUẢN LÝ XÁC THỰC (AUTH & RBAC) ===================
function setupAuth() {
  const loginForm = document.getElementById('login-form');
  const btnQuickAdmin = document.getElementById('btn-quick-admin');
  const btnQuickUserAn = document.getElementById('btn-quick-user-an');
  const btnLogout = document.getElementById('btn-logout');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = document.getElementById('login-username').value.trim();
      const p = document.getElementById('login-password').value;
      await performLogin(u, p);
    });
  }

  if (btnQuickAdmin) {
    btnQuickAdmin.addEventListener('click', () => {
      performLogin('admin', 'Admin@123');
    });
  }

  if (btnQuickUserAn) {
    btnQuickUserAn.addEventListener('click', () => {
      performLogin('an.nguyen', 'An@123');
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      logout();
    });
  }
}

async function performLogin(username, password) {
  const errorAlert = document.getElementById('login-error-alert');
  const btnSubmit = document.getElementById('btn-login-submit');

  try {
    if (errorAlert) errorAlert.style.display = 'none';
    if (btnSubmit) btnSubmit.disabled = true;

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Đăng nhập không thành công');
    }

    // Lưu token và user vào LocalStorage
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('hrm_token', authToken);
    localStorage.setItem('hrm_user', JSON.stringify(currentUser));

    showLoginOverlay(false);
    applyUserRoleUI();
    showToast(`Chào mừng ${currentUser.full_name || currentUser.username} quay trở lại!`, 'success');
    loadAllData();
  } catch (err) {
    if (errorAlert) {
      errorAlert.innerText = err.message;
      errorAlert.style.display = 'block';
    } else {
      showToast(err.message, 'error');
    }
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
  }
}

function logout() {
  if (authToken) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    }).catch(() => {});
  }
  authToken = null;
  currentUser = null;
  localStorage.removeItem('hrm_token');
  localStorage.removeItem('hrm_user');
  showLoginOverlay(true);
  showToast('Đã đăng xuất khỏi hệ thống', 'info');
}

function showLoginOverlay(show) {
  const overlay = document.getElementById('login-overlay');
  if (overlay) {
    overlay.style.display = show ? 'flex' : 'none';
  }
}

function applyUserRoleUI() {
  if (!currentUser) return;

  const headerAvatar = document.getElementById('header-user-avatar');
  const headerName = document.getElementById('header-user-name');
  const headerRole = document.getElementById('header-user-role');

  if (headerName) headerName.innerText = currentUser.full_name || currentUser.username;
  if (headerAvatar) {
    const initials = (currentUser.full_name || currentUser.username).slice(0, 2).toUpperCase();
    headerAvatar.innerText = initials;
  }
  if (headerRole) {
    headerRole.innerText = currentUser.role === 'ADMIN' ? 'QUẢN TRỊ VIÊN' : 'NHÂN VIÊN';
    if (currentUser.role === 'EMPLOYEE') {
      headerRole.classList.add('employee');
    } else {
      headerRole.classList.remove('employee');
    }
  }

  // Ẩn/hiện các nút bấm theo quyền ADMIN
  const adminElements = document.querySelectorAll('.admin-only');
  adminElements.forEach(el => {
    el.style.display = currentUser.role === 'ADMIN' ? '' : 'none';
  });

  // Điều chỉnh form điểm danh nhanh
  const quickEmpGroup = document.getElementById('quick-emp-select-group');
  if (currentUser.role === 'EMPLOYEE' && quickEmpGroup) {
    quickEmpGroup.style.display = 'none'; // Tự động chọn chính mình
  } else if (quickEmpGroup) {
    quickEmpGroup.style.display = '';
  }
}

// Wrapper fetch tự động gắn Bearer token
async function authFetch(url, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      logout();
      throw new Error(data.error || 'Phiên làm việc hết hạn');
    }
    throw new Error(data.error || 'Bạn không có quyền thực hiện');
  }
  return res;
}

// =================== 2. ĐIỀU HƯỚNG & GIAO DIỆN CHUNG ===================
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

      if (viewTitle && viewTitles[targetTab]) {
        viewTitle.innerText = viewTitles[targetTab];
      }

      // Làm mới dữ liệu tab được chọn
      if (targetTab === 'tab-dashboard') loadDashboardStats();
      if (targetTab === 'tab-employees') loadEmployees();
      if (targetTab === 'tab-departments') loadDepartments();
      if (targetTab === 'tab-attendance') loadAttendance();
    });
  });
}

function setupLiveClock() {
  const clockEl = document.getElementById('live-clock');
  function update() {
    if (clockEl) {
      const now = new Date();
      clockEl.innerText = now.toLocaleTimeString('vi-VN');
    }
  }
  update();
  setInterval(update, 1000);
}

function setupMonitoringLinks() {
  const host = window.location.hostname || 'localhost';
  const promLink = document.getElementById('link-prometheus');
  const grafanaLink = document.getElementById('link-grafana');
  if (promLink) promLink.href = `http://${host}:9090`;
  if (grafanaLink) grafanaLink.href = `http://${host}:3001`;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Đã sao chép LogQL vào bộ nhớ tạm!', 'info');
  });
}

function copySnippetCode(btn) {
  const codeEl = btn.closest('.code-snippet')?.querySelector('code');
  if (codeEl) {
    copyText(codeEl.innerText.trim());
  }
}

function formatMoney(amount) {
  if (amount === null || amount === undefined) return '<span class="salary-masked">****** (Bảo mật)</span>';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =================== 3. TẢI DỮ LIỆU TOÀN CỤC ===================
async function loadAllData() {
  await Promise.all([
    loadDashboardStats(),
    loadDepartments(),
    loadEmployees(),
    loadAttendance()
  ]);
}

// =================== 4. DASHBOARD & BIỂU ĐỒ ===================
async function loadDashboardStats() {
  try {
    const res = await authFetch('/api/stats');
    if (!res.ok) throw new Error('Không thể tải dữ liệu thống kê');
    const data = await res.json();

    document.getElementById('stat-total-emp').innerText = data.totalEmployees || 0;
    document.getElementById('stat-active-emp').innerText = data.activeEmployees || 0;
    document.getElementById('stat-departments').innerText = data.totalDepartments || 0;
    document.getElementById('stat-attendances').innerText = data.attendancesToday || 0;

    // Vẽ biểu đồ Chart.js
    if (window.Chart) {
      renderDepartmentChart(data.departmentDistribution || []);
      renderAttendanceChart(data.attendanceSummaryWeek || []);
    }

    // Render 5 nhân viên mới
    renderRecentEmployees(data.recentEmployees || []);
  } catch (err) {
    console.error('Stats error:', err);
  }
}

function renderDepartmentChart(distribution) {
  const canvas = document.getElementById('chart-departments');
  if (!canvas) return;

  const labels = distribution.map(d => d.name);
  const dataVals = distribution.map(d => parseInt(d.count));

  if (deptChartInstance) {
    deptChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  deptChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Chưa có dữ liệu'],
      datasets: [{
        data: dataVals.length ? dataVals : [1],
        backgroundColor: [
          '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
      }
    }
  });
}

function renderAttendanceChart(weekSummary) {
  const canvas = document.getElementById('chart-attendance-week');
  if (!canvas) return;

  const labels = weekSummary.map(w => w.date_label);
  const presentData = weekSummary.map(w => parseInt(w.present_count));
  const lateData = weekSummary.map(w => parseInt(w.late_count));

  if (attChartInstance) {
    attChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  attChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Đúng giờ',
          data: presentData,
          backgroundColor: '#10b981',
          borderRadius: 4
        },
        {
          label: 'Đi muộn',
          data: lateData,
          backgroundColor: '#f59e0b',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }
      }
    }
  });
}

function renderRecentEmployees(recentList) {
  const tbody = document.getElementById('recent-emp-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (recentList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Chưa có nhân viên nào.</td></tr>';
    return;
  }

  recentList.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(e.code)}</strong></td>
      <td>${escapeHtml(e.full_name)}</td>
      <td><span class="dept-code-tag">${escapeHtml(e.department_name || 'Chưa xếp')}</span></td>
      <td>${escapeHtml(e.position || 'Nhân viên')}</td>
      <td>${e.joined_date ? e.joined_date.split('T')[0] : 'N/A'}</td>
      <td><span class="tag-status ${e.status ? e.status.toLowerCase() : 'active'}">${e.status || 'ACTIVE'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// =================== 5. QUẢN LÝ PHÒNG BAN ===================
async function loadDepartments() {
  try {
    const search = document.getElementById('dept-search-input')?.value.trim() || '';
    const res = await authFetch(`/api/departments?search=${encodeURIComponent(search)}`);
    departments = await res.json();

    // Render danh sách thẻ phòng ban
    const grid = document.getElementById('dept-grid-container');
    if (grid) {
      grid.innerHTML = '';
      if (departments.length === 0) {
        grid.innerHTML = '<p class="text-muted">Không tìm thấy phòng ban nào.</p>';
      } else {
        departments.forEach(dept => {
          const card = document.createElement('div');
          card.className = 'dept-card';
          const isAdmin = currentUser && currentUser.role === 'ADMIN';

          card.innerHTML = `
            <div class="dept-card-header">
              <span class="dept-code-tag">${escapeHtml(dept.code)}</span>
              ${isAdmin ? `
                <div class="button-group">
                  <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.8rem;" onclick="openEditDepartment(${dept.id})" title="Chỉnh sửa">
                    <i class="fa-solid fa-pen"></i>
                  </button>
                  <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.8rem; color: #ef4444;" onclick="deleteDepartment(${dept.id})" title="Xóa phòng ban">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              ` : ''}
            </div>
            <h4 class="dept-card-title">${escapeHtml(dept.name)}</h4>
            <p class="dept-desc">${escapeHtml(dept.description || 'Chưa có mô tả chi tiết.')}</p>
            <div class="dept-card-footer">
              <span class="dept-members"><i class="fa-solid fa-users"></i> ${dept.employee_count || 0} nhân sự</span>
              <button class="btn btn-outline btn-action" onclick="viewDepartmentEmployees(${dept.id}, '${escapeHtml(dept.name)}')">
                <i class="fa-solid fa-list"></i> Xem nhân sự
              </button>
            </div>
          `;
          grid.appendChild(card);
        });
      }
    }

    // Cập nhật các dropdown chọn phòng ban
    populateDepartmentSelects();
  } catch (err) {
    console.error('Dept error:', err);
  }
}

function populateDepartmentSelects() {
  const selects = [
    document.getElementById('emp-filter-dept'),
    document.getElementById('emp-dept-select'),
    document.getElementById('attendance-filter-dept')
  ];

  selects.forEach(select => {
    if (!select) return;
    const currentVal = select.value;
    const isFilter = select.id.includes('filter');
    select.innerHTML = isFilter ? '<option value="">Tất cả phòng ban</option>' : '<option value="">-- Chưa phân bổ --</option>';

    departments.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.innerText = `${d.code} - ${d.name}`;
      select.appendChild(opt);
    });
    select.value = currentVal;
  });
}

async function viewDepartmentEmployees(deptId, deptName) {
  try {
    const res = await authFetch(`/api/departments/${deptId}/employees`);
    const empList = await res.json();

    const titleEl = document.getElementById('dept-employees-title');
    if (titleEl) titleEl.innerText = `Danh sách Nhân sự: ${deptName}`;

    const tbody = document.getElementById('dept-emp-table-body');
    tbody.innerHTML = '';

    if (empList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Chưa có nhân viên nào trong phòng ban này.</td></tr>';
    } else {
      empList.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${escapeHtml(e.code)}</strong></td>
          <td>${escapeHtml(e.full_name)}</td>
          <td>${escapeHtml(e.position || 'Nhân viên')}</td>
          <td>${escapeHtml(e.email)}</td>
          <td>${escapeHtml(e.phone || 'N/A')}</td>
          <td><span class="tag-status ${e.status ? e.status.toLowerCase() : 'active'}">${e.status || 'ACTIVE'}</span></td>
        `;
        tbody.appendChild(tr);
      });
    }

    document.getElementById('dept-employees-modal').classList.add('open');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openEditDepartment(id) {
  const dept = departments.find(d => d.id === id);
  if (!dept) return;

  document.getElementById('dept-modal-title').innerText = 'Chỉnh sửa Phòng ban';
  document.getElementById('dept-form-id').value = dept.id;
  document.getElementById('dept-code').value = dept.code;
  document.getElementById('dept-name').value = dept.name;
  document.getElementById('dept-desc').value = dept.description || '';

  document.getElementById('dept-modal').classList.add('open');
}

async function deleteDepartment(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa phòng ban này?')) return;
  try {
    const res = await authFetch(`/api/departments/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Không thể xóa phòng ban');

    showToast('Xóa phòng ban thành công!', 'success');
    loadDepartments();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// =================== 6. QUẢN LÝ NHÂN VIÊN (CRUD & PHÂN TRANG) ===================
async function loadEmployees() {
  try {
    const search = document.getElementById('emp-search-input')?.value.trim() || '';
    const deptId = document.getElementById('emp-filter-dept')?.value || '';
    const status = document.getElementById('emp-filter-status')?.value || '';

    const url = `/api/employees?page=${empPagination.page}&limit=${empPagination.limit}&search=${encodeURIComponent(search)}&department_id=${deptId}&status=${status}`;
    const res = await authFetch(url);
    const result = await res.json();

    employees = result.data || [];
    empPagination = result.pagination || empPagination;

    renderEmployeeTable();
    updatePaginationUI();
    populateQuickAttendanceSelect();
  } catch (err) {
    console.error('Employees error:', err);
  }
}

function renderEmployeeTable() {
  const tbody = document.getElementById('emp-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (employees.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không tìm thấy nhân viên nào.</td></tr>';
    return;
  }

  const isAdmin = currentUser && currentUser.role === 'ADMIN';

  employees.forEach(emp => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(emp.code)}</strong></td>
      <td>${escapeHtml(emp.full_name)}</td>
      <td><span class="dept-code-tag">${escapeHtml(emp.department_name || 'Chưa phân')}</span></td>
      <td>${escapeHtml(emp.position || 'Nhân viên')}</td>
      <td>
        <div><i class="fa-solid fa-envelope text-muted"></i> ${escapeHtml(emp.email)}</div>
        ${emp.phone ? `<div><i class="fa-solid fa-phone text-muted"></i> ${escapeHtml(emp.phone)}</div>` : ''}
      </td>
      <td class="salary-tag">${formatMoney(emp.salary)}</td>
      <td><span class="tag-status ${emp.status ? emp.status.toLowerCase() : 'active'}">${emp.status || 'ACTIVE'}</span></td>
      <td>
        <div class="button-group">
          <button class="btn btn-outline btn-action" onclick="viewEmployeeDetail(${emp.id})" title="Chi tiết hồ sơ">
            <i class="fa-solid fa-eye"></i>
          </button>
          ${isAdmin ? `
            <button class="btn btn-outline btn-action" onclick="openEditEmployee(${emp.id})" title="Chỉnh sửa">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-outline btn-action" style="color: #ef4444;" onclick="deleteEmployee(${emp.id})" title="Xóa nhân viên">
              <i class="fa-solid fa-trash"></i>
            </button>
          ` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updatePaginationUI() {
  const infoEl = document.getElementById('emp-pagination-info');
  const pageEl = document.getElementById('emp-current-page');
  const btnPrev = document.getElementById('btn-emp-prev');
  const btnNext = document.getElementById('btn-emp-next');

  if (infoEl) {
    const start = empPagination.total === 0 ? 0 : (empPagination.page - 1) * empPagination.limit + 1;
    const end = Math.min(empPagination.page * empPagination.limit, empPagination.total);
    infoEl.innerText = `Hiển thị ${start} - ${end} trong tổng số ${empPagination.total} nhân viên`;
  }

  if (pageEl) pageEl.innerText = `${empPagination.page} / ${empPagination.totalPages || 1}`;
  if (btnPrev) btnPrev.disabled = empPagination.page <= 1;
  if (btnNext) btnNext.disabled = empPagination.page >= empPagination.totalPages;
}

async function viewEmployeeDetail(id) {
  try {
    const res = await authFetch(`/api/employees/${id}`);
    const emp = await res.json();

    const dossier = document.getElementById('emp-dossier-content');
    dossier.innerHTML = `
      <div class="dossier-row"><span class="dossier-label">Mã nhân viên:</span><span class="dossier-value">${escapeHtml(emp.code)}</span></div>
      <div class="dossier-row"><span class="dossier-label">Họ và Tên:</span><span class="dossier-value">${escapeHtml(emp.full_name)}</span></div>
      <div class="dossier-row"><span class="dossier-label">Ngày sinh:</span><span class="dossier-value">${emp.birth_date ? emp.birth_date.split('T')[0] : 'Chưa cập nhật'}</span></div>
      <div class="dossier-row"><span class="dossier-label">Giới tính:</span><span class="dossier-value">${escapeHtml(emp.gender || 'Khác')}</span></div>
      <div class="dossier-row"><span class="dossier-label">Email:</span><span class="dossier-value">${escapeHtml(emp.email)}</span></div>
      <div class="dossier-row"><span class="dossier-label">Số điện thoại:</span><span class="dossier-value">${escapeHtml(emp.phone || 'Chưa cập nhật')}</span></div>
      <div class="dossier-row"><span class="dossier-label">Địa chỉ:</span><span class="dossier-value">${escapeHtml(emp.address || 'Chưa cập nhật')}</span></div>
      <div class="dossier-row"><span class="dossier-label">Phòng ban:</span><span class="dossier-value">${escapeHtml(emp.department_name || 'Chưa xếp')}</span></div>
      <div class="dossier-row"><span class="dossier-label">Chức vụ:</span><span class="dossier-value">${escapeHtml(emp.position || 'Nhân viên')}</span></div>
      <div class="dossier-row"><span class="dossier-label">Ngày vào làm:</span><span class="dossier-value">${emp.joined_date ? emp.joined_date.split('T')[0] : 'N/A'}</span></div>
      <div class="dossier-row"><span class="dossier-label">Loại hợp đồng:</span><span class="dossier-value">${escapeHtml(emp.contract_type || 'Toàn thời gian')}</span></div>
      <div class="dossier-row"><span class="dossier-label">Mức lương:</span><span class="dossier-value">${formatMoney(emp.salary)}</span></div>
      <div class="dossier-row"><span class="dossier-label">Trạng thái:</span><span class="dossier-value tag-status ${emp.status ? emp.status.toLowerCase() : 'active'}">${emp.status || 'ACTIVE'}</span></div>
    `;

    document.getElementById('emp-detail-modal').classList.add('open');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openEditEmployee(id) {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;

  document.getElementById('emp-modal-title').innerText = 'Chỉnh sửa Thông tin Nhân viên';
  document.getElementById('emp-form-id').value = emp.id;
  document.getElementById('emp-code').value = emp.code;
  document.getElementById('emp-code').disabled = true; // Không cho sửa mã NV
  document.getElementById('emp-fullname').value = emp.full_name;
  document.getElementById('emp-birthdate').value = emp.birth_date ? emp.birth_date.split('T')[0] : '';
  document.getElementById('emp-gender').value = emp.gender || 'Khác';
  document.getElementById('emp-email').value = emp.email;
  document.getElementById('emp-phone').value = emp.phone || '';
  document.getElementById('emp-address').value = emp.address || '';
  document.getElementById('emp-dept-select').value = emp.department_id || '';
  document.getElementById('emp-position').value = emp.position || '';
  document.getElementById('emp-joineddate').value = emp.joined_date ? emp.joined_date.split('T')[0] : '';
  document.getElementById('emp-contract').value = emp.contract_type || 'Toàn thời gian';
  document.getElementById('emp-salary').value = emp.salary || 0;
  document.getElementById('emp-status').value = emp.status || 'ACTIVE';

  document.getElementById('emp-modal').classList.add('open');
}

async function deleteEmployee(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa nhân viên này khỏi hệ thống?')) return;
  try {
    const res = await authFetch(`/api/employees/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi khi xóa nhân viên');

    showToast('Xóa nhân viên thành công!', 'success');
    loadEmployees();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function populateQuickAttendanceSelect() {
  const select = document.getElementById('quick-emp-select');
  const manualSelect = document.getElementById('manual-att-emp');
  if (!select) return;

  select.innerHTML = '<option value="">-- Chọn nhân viên --</option>';
  if (manualSelect) manualSelect.innerHTML = '<option value="">-- Chọn nhân viên --</option>';

  employees.forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.id;
    opt.innerText = `${emp.code} - ${emp.full_name}`;
    select.appendChild(opt);

    if (manualSelect) {
      const opt2 = opt.cloneNode(true);
      manualSelect.appendChild(opt2);
    }
  });

  // Nếu là EMPLOYEE đăng nhập, tự động chọn chính mình
  if (currentUser && currentUser.role === 'EMPLOYEE' && currentUser.employee_id) {
    select.value = currentUser.employee_id;
  }
}

// =================== 7. QUẢN LÝ CHẤM CÔNG (ATTENDANCE) ===================
async function loadAttendance() {
  try {
    const date = document.getElementById('attendance-date')?.value || '';
    const month = document.getElementById('attendance-month')?.value || '';
    const deptId = document.getElementById('attendance-filter-dept')?.value || '';

    let url = '/api/attendances?';
    if (month) url += `month=${month}&`;
    else if (date) url += `date=${date}&`;
    if (deptId) url += `department_id=${deptId}&`;

    const res = await authFetch(url);
    const data = await res.json();

    const tbody = document.getElementById('attendance-table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Chưa có bản ghi chấm công nào phù hợp.</td></tr>';
      return;
    }

    data.forEach(att => {
      const tr = document.createElement('tr');
      const isLate = att.status === 'LATE';
      const statusText = isLate ? 'Đi muộn' : (att.status === 'PRESENT' ? 'Đúng giờ' : att.status);
      const statusClass = isLate ? 'late' : 'present';

      tr.innerHTML = `
        <td><strong>${escapeHtml(att.employee_code)}</strong></td>
        <td>${escapeHtml(att.employee_name)}</td>
        <td><span class="dept-code-tag">${escapeHtml(att.department_name || 'N/A')}</span></td>
        <td>${att.work_date ? att.work_date.split('T')[0] : 'N/A'}</td>
        <td><span class="badge-status online"><i class="fa-regular fa-clock"></i> ${att.check_in || '--:--'}</span></td>
        <td>${att.check_out ? `<span class="badge-status online"><i class="fa-regular fa-clock"></i> ${att.check_out}</span>` : '<span class="text-muted">Chưa check-out</span>'}</td>
        <td><strong>${att.work_hours || 0}h</strong></td>
        <td><span class="tag-status ${statusClass}">${statusText}</span></td>
        <td>${escapeHtml(att.notes || '-')}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Attendance error:', err);
  }
}

// Check In / Check Out nhanh
function setupAttendanceActions() {
  const btnCheckin = document.getElementById('btn-quick-checkin');
  const btnCheckout = document.getElementById('btn-quick-checkout');

  if (btnCheckin) {
    btnCheckin.addEventListener('click', async () => {
      const empId = document.getElementById('quick-emp-select')?.value;
      const notes = document.getElementById('quick-notes')?.value;

      try {
        const res = await authFetch('/api/attendances/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employee_id: empId, notes })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi khi Check In');

        showToast('Điểm danh Check In thành công!', 'success');
        document.getElementById('quick-notes').value = '';
        loadAttendance();
        loadDashboardStats();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  if (btnCheckout) {
    btnCheckout.addEventListener('click', async () => {
      const empId = document.getElementById('quick-emp-select')?.value;

      try {
        const res = await authFetch('/api/attendances/check-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employee_id: empId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi khi Check Out');

        showToast(`Check Out thành công! Tổng thời gian: ${data.work_hours} giờ`, 'success');
        loadAttendance();
        loadDashboardStats();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

// =================== 8. CÁC MODAL VÀ FORM HANDLERS ===================
function setupModals() {
  // Modal Thêm nhân viên
  const btnOpenAddEmp = document.getElementById('btn-open-add-emp');
  const empModal = document.getElementById('emp-modal');
  const btnCloseEmp = document.getElementById('btn-close-emp-modal');
  const btnCancelEmp = document.getElementById('btn-cancel-emp');

  if (btnOpenAddEmp) {
    btnOpenAddEmp.addEventListener('click', () => {
      document.getElementById('emp-modal-title').innerText = 'Thêm Nhân viên mới';
      document.getElementById('emp-form-id').value = '';
      document.getElementById('emp-code').disabled = false;
      document.getElementById('emp-form').reset();
      empModal.classList.add('open');
    });
  }
  if (btnCloseEmp) btnCloseEmp.addEventListener('click', () => empModal.classList.remove('open'));
  if (btnCancelEmp) btnCancelEmp.addEventListener('click', () => empModal.classList.remove('open'));

  // Modal Chi tiết nhân viên
  const empDetailModal = document.getElementById('emp-detail-modal');
  const btnCloseDetail = document.getElementById('btn-close-emp-detail');
  const btnCloseDetailFooter = document.getElementById('btn-close-emp-detail-footer');
  if (btnCloseDetail) btnCloseDetail.addEventListener('click', () => empDetailModal.classList.remove('open'));
  if (btnCloseDetailFooter) btnCloseDetailFooter.addEventListener('click', () => empDetailModal.classList.remove('open'));

  // Modal Thêm phòng ban
  const btnOpenAddDept = document.getElementById('btn-open-add-dept');
  const deptModal = document.getElementById('dept-modal');
  const btnCloseDept = document.getElementById('btn-close-dept-modal');
  const btnCancelDept = document.getElementById('btn-cancel-dept');

  if (btnOpenAddDept) {
    btnOpenAddDept.addEventListener('click', () => {
      document.getElementById('dept-modal-title').innerText = 'Tạo Phòng ban mới';
      document.getElementById('dept-form-id').value = '';
      document.getElementById('dept-form').reset();
      deptModal.classList.add('open');
    });
  }
  if (btnCloseDept) btnCloseDept.addEventListener('click', () => deptModal.classList.remove('open'));
  if (btnCancelDept) btnCancelDept.addEventListener('click', () => deptModal.classList.remove('open'));

  // Modal Xem nhân viên phòng ban
  const deptEmpModal = document.getElementById('dept-employees-modal');
  const btnCloseDeptEmp = document.getElementById('btn-close-dept-emp-modal');
  const btnCloseDeptEmpFooter = document.getElementById('btn-close-dept-emp-footer');
  if (btnCloseDeptEmp) btnCloseDeptEmp.addEventListener('click', () => deptEmpModal.classList.remove('open'));
  if (btnCloseDeptEmpFooter) btnCloseDeptEmpFooter.addEventListener('click', () => deptEmpModal.classList.remove('open'));

  // Modal Chấm công thủ công (Admin)
  const manualAttModal = document.getElementById('manual-att-modal');
  const btnOpenManualAtt = document.getElementById('btn-manual-attendance');
  const btnCloseManualAtt = document.getElementById('btn-close-manual-att');
  const btnCancelManualAtt = document.getElementById('btn-cancel-manual-att');

  if (btnOpenManualAtt) {
    btnOpenManualAtt.addEventListener('click', () => {
      document.getElementById('manual-att-form').reset();
      document.getElementById('manual-att-date').value = new Date().toISOString().split('T')[0];
      manualAttModal.classList.add('open');
    });
  }
  if (btnCloseManualAtt) btnCloseManualAtt.addEventListener('click', () => manualAttModal.classList.remove('open'));
  if (btnCancelManualAtt) btnCancelManualAtt.addEventListener('click', () => manualAttModal.classList.remove('open'));

  // Đóng modal khi bấm ra ngoài backdrop
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      e.target.classList.remove('open');
    }
  });
}

function setupForms() {
  // Form Nhân viên (Thêm / Sửa)
  const empForm = document.getElementById('emp-form');
  if (empForm) {
    empForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('emp-form-id').value;
      const isEdit = Boolean(id);

      const payload = {
        code: document.getElementById('emp-code').value.trim(),
        full_name: document.getElementById('emp-fullname').value.trim(),
        birth_date: document.getElementById('emp-birthdate').value || null,
        gender: document.getElementById('emp-gender').value,
        email: document.getElementById('emp-email').value.trim(),
        phone: document.getElementById('emp-phone').value.trim(),
        address: document.getElementById('emp-address').value.trim(),
        department_id: document.getElementById('emp-dept-select').value || null,
        position: document.getElementById('emp-position').value.trim(),
        joined_date: document.getElementById('emp-joineddate').value || null,
        contract_type: document.getElementById('emp-contract').value,
        salary: document.getElementById('emp-salary').value,
        status: document.getElementById('emp-status').value
      };

      try {
        const url = isEdit ? `/api/employees/${id}` : '/api/employees';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await authFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi khi lưu nhân viên');

        showToast(isEdit ? 'Cập nhật nhân viên thành công!' : 'Thêm nhân viên thành công!', 'success');
        document.getElementById('emp-modal').classList.remove('open');
        loadEmployees();
        loadDashboardStats();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Form Phòng ban (Tạo / Sửa)
  const deptForm = document.getElementById('dept-form');
  if (deptForm) {
    deptForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('dept-form-id').value;
      const isEdit = Boolean(id);

      const payload = {
        code: document.getElementById('dept-code').value.trim(),
        name: document.getElementById('dept-name').value.trim(),
        description: document.getElementById('dept-desc').value.trim()
      };

      try {
        const url = isEdit ? `/api/departments/${id}` : '/api/departments';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await authFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi lưu phòng ban');

        showToast(isEdit ? 'Cập nhật phòng ban thành công!' : 'Tạo phòng ban thành công!', 'success');
        document.getElementById('dept-modal').classList.remove('open');
        loadDepartments();
        loadDashboardStats();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Form Chấm công thủ công (Admin)
  const manualAttForm = document.getElementById('manual-att-form');
  if (manualAttForm) {
    manualAttForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        employee_id: document.getElementById('manual-att-emp').value,
        work_date: document.getElementById('manual-att-date').value,
        check_in: document.getElementById('manual-att-checkin').value || null,
        check_out: document.getElementById('manual-att-checkout').value || null,
        status: document.getElementById('manual-att-status').value,
        notes: document.getElementById('manual-att-notes').value.trim()
      };

      try {
        const res = await authFetch('/api/attendances/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi ghi nhận chấm công');

        showToast('Ghi nhận chấm công thủ công thành công!', 'success');
        document.getElementById('manual-att-modal').classList.remove('open');
        loadAttendance();
        loadDashboardStats();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

function setupFilters() {
  // Tìm kiếm và lọc Nhân viên
  const empSearch = document.getElementById('emp-search-input');
  const empDeptFilter = document.getElementById('emp-filter-dept');
  const empStatusFilter = document.getElementById('emp-filter-status');

  let debounceTimer;
  if (empSearch) {
    empSearch.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        empPagination.page = 1;
        loadEmployees();
      }, 350);
    });
  }

  if (empDeptFilter) {
    empDeptFilter.addEventListener('change', () => {
      empPagination.page = 1;
      loadEmployees();
    });
  }

  if (empStatusFilter) {
    empStatusFilter.addEventListener('change', () => {
      empPagination.page = 1;
      loadEmployees();
    });
  }

  // Nút phân trang nhân viên
  const btnPrev = document.getElementById('btn-emp-prev');
  const btnNext = document.getElementById('btn-emp-next');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (empPagination.page > 1) {
        empPagination.page--;
        loadEmployees();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (empPagination.page < empPagination.totalPages) {
        empPagination.page++;
        loadEmployees();
      }
    });
  }

  // Tìm kiếm phòng ban
  const deptSearch = document.getElementById('dept-search-input');
  if (deptSearch) {
    deptSearch.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadDepartments();
      }, 350);
    });
  }

  // Lọc Chấm công
  const btnRefreshAtt = document.getElementById('btn-refresh-attendance');
  if (btnRefreshAtt) {
    btnRefreshAtt.addEventListener('click', () => {
      loadAttendance();
    });
  }

  // Điểm danh nhanh
  setupAttendanceActions();
}
