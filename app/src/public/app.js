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
  setupTheme();
  setupNotifications();
  setupNavigation();
  setupLiveClock();
  setupModals();
  setupForms();
  setupFilters();
  setupMonitoringLinks();
  setupEmployeeDashboardActions();

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
      const uInput = document.getElementById('login-username');
      const pInput = document.getElementById('login-password');
      if (uInput) uInput.value = 'admin';
      if (pInput) pInput.value = 'Admin@123';
      performLogin('admin', 'Admin@123');
    });
  }

  if (btnQuickUserAn) {
    btnQuickUserAn.addEventListener('click', () => {
      const uInput = document.getElementById('login-username');
      const pInput = document.getElementById('login-password');
      if (uInput) uInput.value = 'an.nguyen';
      if (pInput) pInput.value = 'An@123';
      performLogin('an.nguyen', 'An@123');
    });
  }

  const btnTogglePwd = document.getElementById('btn-toggle-password');
  const loginPwdInput = document.getElementById('login-password');
  if (btnTogglePwd && loginPwdInput) {
    btnTogglePwd.addEventListener('click', () => {
      const isPassword = loginPwdInput.type === 'password';
      loginPwdInput.type = isPassword ? 'text' : 'password';
      btnTogglePwd.innerHTML = isPassword ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
      btnTogglePwd.setAttribute('aria-label', isPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    });
  }

  // Chuyển đổi qua lại giữa tab Nhà Tuyển Dụng và Ứng Viên
  const tabEmployer = document.getElementById('tab-employer');
  const tabCandidate = document.getElementById('tab-candidate');
  const btnSwitchCandidate = document.getElementById('btn-switch-candidate');

  if (tabEmployer && tabCandidate) {
    tabEmployer.addEventListener('click', () => {
      tabEmployer.classList.add('active');
      tabCandidate.classList.remove('active');
      const cardTitle = document.querySelector('.recruit-form-header .form-title');
      const cardSubtitle = document.querySelector('.recruit-form-header .form-desc');
      const submitText = document.querySelector('.btn-submit-recruit span');
      if (cardTitle) cardTitle.textContent = 'Đăng nhập Nhà Tuyển Dụng';
      if (cardSubtitle) cardSubtitle.textContent = 'Cùng TopRecruit kết nối nhân tài & phát triển đội ngũ';
      if (submitText) submitText.textContent = 'Đăng nhập Cổng Nhà Tuyển Dụng';
    });

    const switchToCandidate = () => {
      tabCandidate.classList.add('active');
      tabEmployer.classList.remove('active');
      const cardTitle = document.querySelector('.recruit-form-header .form-title');
      const cardSubtitle = document.querySelector('.recruit-form-header .form-desc');
      const submitText = document.querySelector('.btn-submit-recruit span');
      if (cardTitle) cardTitle.textContent = 'Đăng nhập Người Tìm Việc';
      if (cardSubtitle) cardSubtitle.textContent = 'Xem trạng thái hồ sơ ứng tuyển & tìm việc làm mơ ước';
      if (submitText) submitText.textContent = 'Đăng nhập Cổng Ứng Viên';
      showToast('Cổng Ứng viên đang kết nối. Hiện tại vui lòng chọn tab "Nhà Tuyển Dụng" để quản trị hệ thống HRM!', 'info');
    };

    tabCandidate.addEventListener('click', switchToCandidate);
    if (btnSwitchCandidate) btnSwitchCandidate.addEventListener('click', switchToCandidate);
  }

  // Tương tác các nút SSO và liên kết phụ trợ
  const btnGoogle = document.getElementById('btn-sso-google');
  const btnLinkedin = document.getElementById('btn-sso-linkedin');
  const linkForgot = document.getElementById('link-forgot-pwd');
  const linkRegister = document.getElementById('link-register-employer');

  if (btnGoogle) {
    btnGoogle.addEventListener('click', () => {
      showToast('Đăng nhập Google Workspace yêu cầu tích hợp Google Cloud OAuth2. Vui lòng sử dụng tài khoản Demo bên dưới để kiểm tra!', 'info');
    });
  }

  if (btnLinkedin) {
    btnLinkedin.addEventListener('click', () => {
      showToast('Đăng nhập LinkedIn Recruiter yêu cầu chứng chỉ đối tác LinkedIn. Vui lòng dùng tài khoản Demo bên dưới!', 'info');
    });
  }

  if (linkForgot) {
    linkForgot.addEventListener('click', () => {
      showToast('Vui lòng liên hệ Hotline 1900 6868 hoặc Quản trị viên hệ thống để khôi phục mật khẩu tài khoản HR của bạn.', 'info');
    });
  }

  if (linkRegister) {
    linkRegister.addEventListener('click', () => {
      showToast('Cảm ơn quý doanh nghiệp! Chuyên viên tư vấn tuyển dụng TopRecruit sẽ liên hệ trong vòng 15 phút.', 'success');
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
  const viewTitle = document.getElementById('view-title');

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

  // Ẩn/hiện các nút bấm theo quyền ADMIN (bao gồm cả tab Giám sát & Logs)
  const adminElements = document.querySelectorAll('.admin-only');
  adminElements.forEach(el => {
    el.style.display = currentUser.role === 'ADMIN' ? '' : 'none';
  });

  // Chuyển đổi giữa Admin Dashboard và Employee Dashboard
  const adminDashView = document.getElementById('admin-dashboard-view');
  const empDashView = document.getElementById('employee-dashboard-view');

  if (currentUser.role === 'EMPLOYEE') {
    if (adminDashView) adminDashView.style.display = 'none';
    if (empDashView) empDashView.style.display = 'block';
    if (viewTitle) viewTitle.innerText = 'Cổng Thông tin Nhân viên';
    loadEmployeeDashboard();
  } else {
    if (adminDashView) adminDashView.style.display = 'block';
    if (empDashView) empDashView.style.display = 'none';
    if (viewTitle) viewTitle.innerText = 'Bảng điều khiển Tổng quan';
  }

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
        if (targetTab === 'tab-dashboard' && currentUser && currentUser.role === 'EMPLOYEE') {
          viewTitle.innerText = 'Cổng Thông tin Nhân viên';
        } else {
          viewTitle.innerText = viewTitles[targetTab];
        }
      }

      // Làm mới dữ liệu tab được chọn
      if (targetTab === 'tab-dashboard') {
        if (currentUser && currentUser.role === 'EMPLOYEE') {
          loadEmployeeDashboard();
        } else {
          loadDashboardStats();
        }
      }
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
    const originalHtml = btn.innerHTML;
    copyText(codeEl.innerText.trim());
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Đã chép!';
    btn.style.color = '#4ade80';
    btn.style.borderColor = '#4ade80';
    setTimeout(() => {
      btn.innerHTML = originalHtml;
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 2000);
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
  const tasks = [
    loadDepartments(),
    loadEmployees(),
    loadAttendance()
  ];
  if (currentUser && currentUser.role === 'EMPLOYEE') {
    tasks.push(loadEmployeeDashboard());
  } else {
    tasks.push(loadDashboardStats());
  }
  await Promise.all(tasks);
}

// =================== 3.1. CỔNG THÔNG TIN NHÂN VIÊN (EMPLOYEE DASHBOARD) ===================
async function loadEmployeeDashboard() {
  if (!currentUser) return;

  try {
    // 1. Tải thông tin hồ sơ nhân viên đầy đủ
    let emp = null;
    if (currentUser.employee_id) {
      try {
        const empRes = await authFetch(`/api/employees/${currentUser.employee_id}`);
        if (empRes.ok) {
          emp = await empRes.json();
        }
      } catch (e) {}
    }

    const fullName = emp?.full_name || currentUser.full_name || currentUser.username;
    const empCode = emp?.code || currentUser.employee_code || 'NV001';
    const deptName = emp?.department_name || 'Phòng ban';
    const position = emp?.position || currentUser.position || 'Nhân viên';
    const email = emp?.email || currentUser.email || '';
    const phone = emp?.phone || 'Chưa cập nhật';
    const contractType = emp?.contract_type || 'Toàn thời gian';
    const status = emp?.status || 'ACTIVE';

    const initials = fullName.slice(0, 2).toUpperCase();

    // Điền thông tin vào Thẻ Chào mừng & Hồ sơ
    const avatarEl = document.getElementById('emp-portal-avatar');
    if (avatarEl) avatarEl.innerText = initials;
    const nameEl = document.getElementById('emp-portal-fullname');
    if (nameEl) nameEl.innerText = fullName;
    const codeEl = document.getElementById('emp-portal-code');
    if (codeEl) codeEl.innerText = empCode;
    const deptEl = document.getElementById('emp-portal-dept');
    if (deptEl) deptEl.innerText = deptName;
    const posEl = document.getElementById('emp-portal-position');
    if (posEl) posEl.innerText = position;
    const emailEl = document.getElementById('emp-portal-email');
    if (emailEl) emailEl.innerText = email;
    const phoneEl = document.getElementById('emp-portal-phone');
    if (phoneEl) phoneEl.innerText = phone;
    const contractEl = document.getElementById('emp-policy-contract');
    if (contractEl) contractEl.innerText = contractType;
    const statusEl = document.getElementById('emp-portal-status');
    if (statusEl) statusEl.innerText = status === 'ACTIVE' ? 'Đang làm việc' : status;

    // 2. Tải lịch sử chấm công cá nhân tháng này
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM

    const attRes = await authFetch(`/api/attendances?month=${currentMonthStr}`);
    const attList = attRes.ok ? await attRes.json() : [];

    // Tính thống kê cá nhân trong tháng
    let totalDays = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    let totalWorkHours = 0;

    attList.forEach(a => {
      if (a.check_in) {
        totalDays++;
        if (a.status === 'LATE') lateCount++;
        else onTimeCount++;
        totalWorkHours += parseFloat(a.work_hours || 0);
      }
    });

    animateNumber('emp-stat-days', totalDays);
    animateNumber('emp-stat-on-time', onTimeCount);
    animateNumber('emp-stat-late', lateCount);
    const hoursEl = document.getElementById('emp-stat-hours');
    if (hoursEl) hoursEl.innerText = `${Math.round(totalWorkHours * 10) / 10}h`;

    // 3. Trạng thái điểm danh hôm nay
    const todayDateEl = document.getElementById('emp-today-date');
    if (todayDateEl) {
      const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      todayDateEl.innerText = now.toLocaleDateString('vi-VN', dateOptions);
    }

    const todayRecord = attList.find(a => a.work_date && a.work_date.split('T')[0] === todayStr);

    const circleEl = document.getElementById('emp-status-circle');
    const titleEl = document.getElementById('emp-status-title');
    const descEl = document.getElementById('emp-status-desc');
    const checkinVal = document.getElementById('emp-today-checkin');
    const checkoutVal = document.getElementById('emp-today-checkout');
    const durationVal = document.getElementById('emp-today-duration');
    const btnCheckin = document.getElementById('btn-emp-checkin');
    const btnCheckout = document.getElementById('btn-emp-checkout');

    if (!todayRecord || !todayRecord.check_in) {
      if (circleEl) circleEl.className = 'status-indicator-circle waiting';
      if (titleEl) titleEl.innerText = 'Chưa vào ca làm việc';
      if (descEl) descEl.innerText = 'Bạn chưa điểm danh hôm nay. Vui lòng bấm "Check In Ngay" khi bắt đầu ca trực.';
      if (checkinVal) checkinVal.innerText = '--:--:--';
      if (checkoutVal) checkoutVal.innerText = '--:--:--';
      if (durationVal) durationVal.innerText = '-- giờ';
      if (btnCheckin) {
        btnCheckin.disabled = false;
        btnCheckin.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Check In Ngay';
      }
      if (btnCheckout) btnCheckout.disabled = true;
    } else if (todayRecord.check_in && !todayRecord.check_out) {
      const isLate = todayRecord.status === 'LATE';
      if (circleEl) circleEl.className = 'status-indicator-circle active';
      if (titleEl) titleEl.innerText = `Đang trong ca làm việc (${isLate ? 'Đi muộn' : 'Đúng giờ'})`;
      if (descEl) descEl.innerText = `Đã Check-in lúc ${todayRecord.check_in}. Bấm Check Out khi bạn kết thúc ca làm việc.`;
      if (checkinVal) checkinVal.innerText = todayRecord.check_in;
      if (checkoutVal) checkoutVal.innerText = '--:--:--';
      if (durationVal) durationVal.innerText = 'Đang làm việc';
      if (btnCheckin) {
        btnCheckin.disabled = true;
        btnCheckin.innerHTML = '<i class="fa-solid fa-circle-check"></i> Đã Check In';
      }
      if (btnCheckout) btnCheckout.disabled = false;
    } else {
      if (circleEl) circleEl.className = 'status-indicator-circle completed';
      if (titleEl) titleEl.innerText = 'Đã hoàn thành ca làm việc hôm nay';
      if (descEl) descEl.innerText = `Ca làm việc đã kết thúc. Tổng thời gian ghi nhận: ${todayRecord.work_hours || 0} giờ.`;
      if (checkinVal) checkinVal.innerText = todayRecord.check_in;
      if (checkoutVal) checkoutVal.innerText = todayRecord.check_out;
      if (durationVal) durationVal.innerText = `${todayRecord.work_hours || 0} giờ`;
      if (btnCheckin) {
        btnCheckin.disabled = true;
        btnCheckin.innerHTML = '<i class="fa-solid fa-circle-check"></i> Đã Check In';
      }
      if (btnCheckout) {
        btnCheckout.disabled = true;
        btnCheckout.innerHTML = '<i class="fa-solid fa-circle-check"></i> Đã Check Out';
      }
    }

    // 4. Render 7 ngày chấm công gần nhất của nhân viên
    const tbody = document.getElementById('emp-personal-attendance-tbody');
    if (tbody) {
      tbody.innerHTML = '';
      const recent7 = attList.slice(0, 7);
      if (recent7.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Chưa có lịch sử chấm công nào trong tháng này.</td></tr>';
      } else {
        recent7.forEach(rec => {
          const tr = document.createElement('tr');
          const isLate = rec.status === 'LATE';
          const statusText = isLate ? 'Đi muộn' : (rec.status === 'PRESENT' ? 'Đúng giờ' : (rec.status || 'Chấm công'));
          const statusClass = isLate ? 'late' : 'present';

          tr.innerHTML = `
            <td><i class="fa-regular fa-calendar text-muted"></i> <strong>${rec.work_date ? rec.work_date.split('T')[0] : 'N/A'}</strong></td>
            <td><span class="badge-status online"><i class="fa-regular fa-clock"></i> ${rec.check_in || '--:--'}</span></td>
            <td>${rec.check_out ? `<span class="badge-status online"><i class="fa-regular fa-clock"></i> ${rec.check_out}</span>` : '<span class="text-muted"><i class="fa-regular fa-circle-question"></i> Chưa out</span>'}</td>
            <td><span class="salary-tag">${rec.work_hours || 0}h</span></td>
            <td><span class="tag-status ${statusClass}">${statusText}</span></td>
            <td>${escapeHtml(rec.notes || '-')}</td>
          `;
          tbody.appendChild(tr);
        });
      }
    }
  } catch (err) {
    console.error('loadEmployeeDashboard error:', err);
  }
}

function setupEmployeeDashboardActions() {
  const btnCheckin = document.getElementById('btn-emp-checkin');
  const btnCheckout = document.getElementById('btn-emp-checkout');
  const btnRefresh = document.getElementById('btn-refresh-emp-attendance');

  if (btnCheckin) {
    btnCheckin.addEventListener('click', async () => {
      const notes = document.getElementById('emp-personal-notes')?.value || '';
      try {
        btnCheckin.disabled = true;
        const res = await authFetch('/api/attendances/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi khi Check In');

        showToast('Điểm danh Check In ca trực hôm nay thành công!', 'success');
        const notesInput = document.getElementById('emp-personal-notes');
        if (notesInput) notesInput.value = '';
        await loadEmployeeDashboard();
        loadAttendance();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btnCheckin.disabled = false;
      }
    });
  }

  if (btnCheckout) {
    btnCheckout.addEventListener('click', async () => {
      try {
        btnCheckout.disabled = true;
        const res = await authFetch('/api/attendances/check-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi khi Check Out');

        showToast(`Check Out ca làm việc thành công! Tổng số giờ: ${data.work_hours} giờ`, 'success');
        await loadEmployeeDashboard();
        loadAttendance();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btnCheckout.disabled = false;
      }
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadEmployeeDashboard();
      showToast('Đã làm mới dữ liệu chấm công cá nhân!', 'info');
    });
  }
}

// =================== 4. DASHBOARD & BIỂU ĐỒ ===================
async function loadDashboardStats() {
  try {
    const t0 = performance.now();
    const res = await authFetch('/api/stats');
    const t1 = performance.now();
    const latencyMs = Math.max(1, Math.round(t1 - t0));
    
    const liveLatencyEl = document.getElementById('live-latency');
    if (liveLatencyEl) liveLatencyEl.innerText = `${latencyMs}ms`;
    const telemetryLatencyEl = document.getElementById('telemetry-latency');
    if (telemetryLatencyEl) telemetryLatencyEl.innerText = `~${latencyMs}ms (Scraped)`;

    if (!res.ok) throw new Error('Không thể tải dữ liệu thống kê');
    const data = await res.json();

    // Hiệu ứng nhảy số tự động (Animated Counter)
    animateNumber('stat-total-emp', data.totalEmployees || 0);
    animateNumber('stat-active-emp', data.activeEmployees || 0);
    animateNumber('stat-departments', data.totalDepartments || 0);
    animateNumber('stat-attendances', data.attendancesToday || 0);

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

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const borderColor = isDark ? '#0f172a' : '#ffffff';

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
        borderColor: borderColor
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" },
            color: textColor
          }
        }
      }
    }
  });
}

function renderAttendanceChart(weekSummary) {
  const canvas = document.getElementById('chart-attendance-week');
  if (!canvas) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';

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
          borderRadius: 6
        },
        {
          label: 'Đi muộn',
          data: lateData,
          backgroundColor: '#f59e0b',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: textColor, font: { family: "'Plus Jakarta Sans', sans-serif" } },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: textColor, font: { family: "'Plus Jakarta Sans', sans-serif" } },
          grid: { color: gridColor }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" },
            color: textColor
          }
        }
      }
    }
  });
}

// =================== TIỆN ÍCH HIỆU ỨNG & THEME ===================
function animateNumber(elementId, targetValue, duration = 800) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const target = parseInt(targetValue) || 0;
  if (target === 0) { el.innerText = '0'; return; }
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(target * easeOut);
    el.innerText = current;
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.innerText = target;
    }
  }
  requestAnimationFrame(update);
}

function setupTheme() {
  const savedTheme = localStorage.getItem('hrm_theme') || 'light';
  applyTheme(savedTheme, false);

  const btnTheme = document.getElementById('btn-theme-toggle');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const activeTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme, true);
    });
  }
}

function applyTheme(theme, notify = false) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('hrm_theme', theme);
  const btnTheme = document.getElementById('btn-theme-toggle');
  if (btnTheme) {
    btnTheme.innerHTML = theme === 'dark' 
      ? '<i class="fa-solid fa-sun" style="color: #f59e0b;"></i>' 
      : '<i class="fa-solid fa-moon"></i>';
    btnTheme.setAttribute('title', theme === 'dark' ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối (Dark Mode)');
  }
  if (notify) {
    showToast(`Đã chuyển sang giao diện ${theme === 'dark' ? 'Tối (Dark Mode)' : 'Sáng (Light Mode)'}!`, 'info');
  }
  // Re-draw charts with theme color palette
  if (window.Chart && deptChartInstance) {
    loadDashboardStats();
  }
}

function setupNotifications() {
  const btn = document.getElementById('btn-notifications');
  const menu = document.getElementById('notification-menu');
  if (btn && menu) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.remove('open');
      }
    });
  }
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
    const initials = (e.full_name || 'NV').slice(0, 2).toUpperCase();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="emp-code-pill">${escapeHtml(e.code)}</span></td>
      <td>
        <div class="user-cell">
          <div class="table-avatar">${escapeHtml(initials)}</div>
          <div class="user-cell-info">
            <span class="user-cell-name">${escapeHtml(e.full_name)}</span>
            <span class="user-cell-email">${escapeHtml(e.email || '')}</span>
          </div>
        </div>
      </td>
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

    if (!res.ok) {
      throw new Error(result.error || 'Lỗi tải danh sách nhân viên từ máy chủ');
    }

    employees = result.data || [];
    empPagination = result.pagination || empPagination;

    renderEmployeeTable();
    updatePaginationUI();
    populateQuickAttendanceSelect();
  } catch (err) {
    console.error('Employees error:', err);
    showToast(err.message, 'error');
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
    const initials = (emp.full_name || 'NV').slice(0, 2).toUpperCase();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="emp-code-pill">${escapeHtml(emp.code)}</span></td>
      <td>
        <div class="user-cell">
          <div class="table-avatar">${escapeHtml(initials)}</div>
          <div class="user-cell-info">
            <span class="user-cell-name">${escapeHtml(emp.full_name)}</span>
            <span class="user-cell-sub">${escapeHtml(emp.gender || '')}</span>
          </div>
        </div>
      </td>
      <td><span class="dept-code-tag">${escapeHtml(emp.department_name || 'Chưa phân')}</span></td>
      <td>${escapeHtml(emp.position || 'Nhân viên')}</td>
      <td>
        <div class="contact-item"><i class="fa-solid fa-envelope text-muted"></i> ${escapeHtml(emp.email)}</div>
        ${emp.phone ? `<div class="contact-item"><i class="fa-solid fa-phone text-muted"></i> ${escapeHtml(emp.phone)}</div>` : ''}
      </td>
      <td class="salary-tag">${formatMoney(emp.salary)}</td>
      <td><span class="tag-status ${emp.status ? emp.status.toLowerCase() : 'active'}">${emp.status || 'ACTIVE'}</span></td>
      <td>
        <div class="button-group">
          <button class="btn btn-outline btn-icon" onclick="viewEmployeeDetail(${emp.id})" title="Chi tiết hồ sơ">
            <i class="fa-solid fa-eye"></i>
          </button>
          ${isAdmin ? `
            <button class="btn btn-outline btn-icon btn-edit" onclick="openEditEmployee(${emp.id})" title="Chỉnh sửa">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-outline btn-icon btn-delete" onclick="deleteEmployee(${emp.id})" title="Xóa nhân viên">
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
    const initials = (emp.full_name || 'NV').slice(0, 2).toUpperCase();
    dossier.innerHTML = `
      <div class="dossier-header-card">
        <div class="dossier-avatar">
          ${escapeHtml(initials)}
        </div>
        <div>
          <h4 class="dossier-name">${escapeHtml(emp.full_name)}</h4>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="dept-code-tag">${escapeHtml(emp.department_name || 'Chưa xếp')}</span>
            <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600;">${escapeHtml(emp.position || 'Nhân viên')}</span>
          </div>
        </div>
      </div>
      <div class="dossier-row"><span class="dossier-label"><i class="fa-solid fa-barcode text-muted"></i> Mã nhân viên:</span><span class="dossier-value"><span class="emp-code-pill">${escapeHtml(emp.code)}</span></span></div>
      <div class="dossier-row"><span class="dossier-label"><i class="fa-solid fa-cake-candles text-muted"></i> Ngày sinh:</span><span class="dossier-value">${emp.birth_date ? emp.birth_date.split('T')[0] : 'Chưa cập nhật'}</span></div>
      <div class="dossier-row"><span class="dossier-label"><i class="fa-solid fa-venus-mars text-muted"></i> Giới tính:</span><span class="dossier-value">${escapeHtml(emp.gender || 'Khác')}</span></div>
      <div class="dossier-row"><span class="dossier-label"><i class="fa-solid fa-envelope text-muted"></i> Email:</span><span class="dossier-value">${escapeHtml(emp.email)}</span></div>
      <div class="dossier-row"><span class="dossier-label"><i class="fa-solid fa-phone text-muted"></i> Số điện thoại:</span><span class="dossier-value">${escapeHtml(emp.phone || 'Chưa cập nhật')}</span></div>
      <div class="dossier-row"><span class="dossier-label"><i class="fa-solid fa-location-dot text-muted"></i> Địa chỉ:</span><span class="dossier-value">${escapeHtml(emp.address || 'Chưa cập nhật')}</span></div>
      <div class="dossier-row"><span class="dossier-label"><i class="fa-solid fa-calendar-check text-muted"></i> Ngày vào làm:</span><span class="dossier-value">${emp.joined_date ? emp.joined_date.split('T')[0] : 'N/A'}</span></div>
      <div class="dossier-row"><span class="dossier-label"><i class="fa-solid fa-file-contract text-muted"></i> Loại hợp đồng:</span><span class="dossier-value">${escapeHtml(emp.contract_type || 'Toàn thời gian')}</span></div>
      <div class="dossier-row"><span class="dossier-label"><i class="fa-solid fa-money-bill-wave text-muted"></i> Mức lương:</span><span class="dossier-value salary-tag">${formatMoney(emp.salary)}</span></div>
      <div class="dossier-row"><span class="dossier-label"><i class="fa-solid fa-signal text-muted"></i> Trạng thái:</span><span class="dossier-value tag-status ${emp.status ? emp.status.toLowerCase() : 'active'}">${emp.status || 'ACTIVE'}</span></div>
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
        <td><span class="emp-code-pill">${escapeHtml(att.employee_code)}</span></td>
        <td><strong>${escapeHtml(att.employee_name)}</strong></td>
        <td><span class="dept-code-tag">${escapeHtml(att.department_name || 'N/A')}</span></td>
        <td><i class="fa-regular fa-calendar text-muted"></i> ${att.work_date ? att.work_date.split('T')[0] : 'N/A'}</td>
        <td><span class="badge-status online"><i class="fa-regular fa-clock"></i> ${att.check_in || '--:--'}</span></td>
        <td>${att.check_out ? `<span class="badge-status online"><i class="fa-regular fa-clock"></i> ${att.check_out}</span>` : '<span class="text-muted"><i class="fa-regular fa-circle-question"></i> Chưa out</span>'}</td>
        <td><span class="salary-tag">${att.work_hours || 0}h</span></td>
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
