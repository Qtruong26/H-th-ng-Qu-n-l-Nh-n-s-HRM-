const client = require('prom-client');

// Khởi tạo Registry để gom toàn bộ metrics
const register = new client.Registry();

// Thêm các metric chuẩn của Node.js runtime (CPU, Memory, Event Loop, GC)
client.collectDefaultMetrics({
  register,
  prefix: 'hrm_'
});

// Custom Metrics cho đề tài HRM
const httpRequestCounter = new client.Counter({
  name: 'hrm_http_requests_total',
  help: 'Tổng số lượt HTTP request đến hệ thống HRM',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'hrm_http_request_duration_seconds',
  help: 'Thời gian phản hồi HTTP request (giây)',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register]
});

const activeEmployeesGauge = new client.Gauge({
  name: 'hrm_active_employees_count',
  help: 'Tổng số nhân viên đang hoạt động trong hệ thống',
  registers: [register]
});

const activeDepartmentsGauge = new client.Gauge({
  name: 'hrm_active_departments_count',
  help: 'Tổng số phòng ban',
  registers: [register]
});

const attendanceEventsCounter = new client.Counter({
  name: 'hrm_attendance_actions_total',
  help: 'Số lượt check-in hoặc check-out chấm công',
  labelNames: ['action'],
  registers: [register]
});

const authAttemptsCounter = new client.Counter({
  name: 'hrm_auth_attempts_total',
  help: 'Tổng số lượt đăng nhập hệ thống HRM',
  labelNames: ['status', 'role'],
  registers: [register]
});

module.exports = {
  register,
  httpRequestCounter,
  httpRequestDuration,
  activeEmployeesGauge,
  activeDepartmentsGauge,
  attendanceEventsCounter,
  authAttemptsCounter
};
