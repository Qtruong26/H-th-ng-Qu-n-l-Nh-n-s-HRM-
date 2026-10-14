const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('./logger');
const { pool, initDB } = require('./db');
const {
  register,
  httpRequestCounter,
  httpRequestDuration,
  activeEmployeesGauge,
  activeDepartmentsGauge,
  attendanceEventsCounter,
  authAttemptsCounter
} = require('./metrics');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'hrm_secure_jwt_secret_devops_2026';

app.use(cors());
app.use(express.json());

// =================== MIDDLEWARE GHI METRICS & LOGS (BẢO MẬT) ===================
app.use((req, res, next) => {
  const start = process.hrtime();
  const route = req.path;

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    const status = res.statusCode.toString();

    // Không ghi metrics cho endpoint /metrics để tránh sai lệch
    if (route !== '/metrics') {
      httpRequestCounter.inc({ method: req.method, route, status });
      httpRequestDuration.observe({ method: req.method, route, status }, durationInSeconds);

      // Tuyệt đối không log body chứa password hoặc auth token
      const logData = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration_ms: Math.round(durationInSeconds * 1000),
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
      };

      if (res.statusCode >= 500) {
        logger.error('HTTP Request server error', logData);
      } else if (res.statusCode >= 400) {
        logger.warn('HTTP Request client warning', logData);
      } else {
        logger.info('HTTP Request processed', logData);
      }
    }
  });

  next();
});

// Phục vụ frontend tĩnh
app.use(express.static(path.join(__dirname, 'public')));

// =================== MIDDLEWARE XÁC THỰC & PHÂN QUYỀN (JWT & RBAC) ===================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập để truy cập tài nguyên này' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Phiên đăng nhập đã hết hạn hoặc token không hợp lệ' });
    }
    req.user = user;
    next();
  });
}

function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) req.user = user;
      next();
    });
  } else {
    next();
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này (Chỉ dành cho ' + roles.join(', ') + ')' });
    }
    next();
  };
}

// =================== METRICS & HEALTH ===================
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex.message);
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'UP', database: 'CONNECTED', timestamp: new Date() });
  } catch (err) {
    res.status(503).json({ status: 'DOWN', database: err.message });
  }
});

// Cập nhật gauges định kỳ cho Prometheus
async function updateGauges() {
  try {
    const empRes = await pool.query("SELECT COUNT(*) FROM employees WHERE status = 'ACTIVE'");
    const deptRes = await pool.query("SELECT COUNT(*) FROM departments");
    activeEmployeesGauge.set(parseInt(empRes.rows[0].count) || 0);
    activeDepartmentsGauge.set(parseInt(deptRes.rows[0].count) || 0);
  } catch (err) {
    // Database chưa sẵn sàng, bỏ qua
  }
}
setInterval(updateGauges, 10000);

// =================== 1. API XÁC THỰC & TÀI KHOẢN (AUTH) ===================
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    authAttemptsCounter.inc({ status: 'failure', role: 'unknown' });
    return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ tên đăng nhập và mật khẩu' });
  }

  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.password_hash, u.role, u.employee_id,
             e.full_name, e.email, e.position, e.code AS employee_code
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE u.username = $1
    `, [username.trim()]);

    if (result.rows.length === 0) {
      authAttemptsCounter.inc({ status: 'failure', role: 'unknown' });
      logger.warn('Failed login attempt - user not found', { username });
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      authAttemptsCounter.inc({ status: 'failure', role: user.role });
      logger.warn('Failed login attempt - invalid password', { username });
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    // Cập nhật last_login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Tạo JWT token (thời hạn 24h)
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      employee_id: user.employee_id,
      full_name: user.full_name || 'Quản trị viên',
      email: user.email || 'admin@hrm.com'
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
    authAttemptsCounter.inc({ status: 'success', role: user.role });

    logger.info('User logged in successfully', { username: user.username, role: user.role });

    // Trả về token và thông tin đã lọc (không trả password_hash)
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employee_id: user.employee_id,
        employee_code: user.employee_code,
        full_name: user.full_name || 'Quản trị viên hệ thống',
        email: user.email || 'admin@hrm.com',
        position: user.position || 'Quản trị viên'
      }
    });
  } catch (err) {
    logger.error('Error during login', { error: err.message });
    res.status(500).json({ error: 'Lỗi máy chủ trong quá trình đăng nhập' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.role, u.employee_id,
             e.full_name, e.email, e.position, e.code AS employee_code
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi truy vấn thông tin người dùng' });
  }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  logger.info('User logged out', { username: req.user.username });
  res.json({ message: 'Đăng xuất thành công' });
});

// =================== 2. API THỐNG KÊ DASHBOARD ===================
app.get('/api/stats', async (req, res) => {
  try {
    const empRes = await pool.query("SELECT COUNT(*) FROM employees");
    const activeEmpRes = await pool.query("SELECT COUNT(*) FROM employees WHERE status = 'ACTIVE'");
    const deptRes = await pool.query("SELECT COUNT(*) FROM departments");
    const attRes = await pool.query("SELECT COUNT(*) FROM attendances WHERE work_date = CURRENT_DATE");

    // Thống kê phân bổ nhân viên theo phòng ban cho biểu đồ
    const deptDistRes = await pool.query(`
      SELECT d.name, COUNT(e.id) AS count
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'ACTIVE'
      GROUP BY d.id, d.name
      ORDER BY count DESC
    `);

    // Thống kê chấm công 7 ngày gần nhất cho biểu đồ
    const attWeekRes = await pool.query(`
      SELECT 
        TO_CHAR(d.day, 'DD/MM') AS date_label,
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) AS present_count,
        COUNT(CASE WHEN a.status = 'LATE' THEN 1 END) AS late_count
      FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d(day)
      LEFT JOIN attendances a ON a.work_date = d.day::date
      GROUP BY d.day
      ORDER BY d.day ASC
    `);

    // Danh sách 5 nhân viên mới nhất
    const recentEmpRes = await pool.query(`
      SELECT e.id, e.code, e.full_name, e.position, e.status, e.joined_date, d.name AS department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY e.id DESC
      LIMIT 5
    `);

    res.json({
      totalEmployees: parseInt(empRes.rows[0].count),
      activeEmployees: parseInt(activeEmpRes.rows[0].count),
      totalDepartments: parseInt(deptRes.rows[0].count),
      attendancesToday: parseInt(attRes.rows[0].count),
      departmentDistribution: deptDistRes.rows,
      attendanceSummaryWeek: attWeekRes.rows,
      recentEmployees: recentEmpRes.rows
    });
  } catch (err) {
    logger.error('Error fetching dashboard stats', { error: err.message });
    res.status(500).json({ error: 'Lỗi truy xuất dữ liệu thống kê' });
  }
});

// =================== 3. API PHÒNG BAN (DEPARTMENTS) ===================
app.get('/api/departments', async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT d.*, COUNT(e.id) AS employee_count 
      FROM departments d 
      LEFT JOIN employees e ON d.id = e.department_id 
    `;
    const params = [];
    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` WHERE d.name ILIKE $1 OR d.code ILIKE $1 `;
    }
    query += ` GROUP BY d.id ORDER BY d.id ASC `;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching departments', { error: err.message });
    res.status(500).json({ error: 'Lỗi lấy danh sách phòng ban' });
  }
});

app.get('/api/departments/:id/employees', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT id, code, full_name, email, phone, position, status, joined_date
      FROM employees
      WHERE department_id = $1
      ORDER BY id ASC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy danh sách nhân viên của phòng ban' });
  }
});

app.post('/api/departments', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  const { code, name, description } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: 'Mã phòng ban và tên phòng ban là bắt buộc' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO departments (code, name, description) VALUES ($1, $2, $3) RETURNING *',
      [code.trim().toUpperCase(), name.trim(), description || '']
    );
    logger.info('Department created', { department: result.rows[0], user: req.user.username });
    updateGauges();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Mã phòng ban đã tồn tại trên hệ thống' });
    }
    logger.error('Error creating department', { error: err.message });
    res.status(500).json({ error: 'Lỗi tạo phòng ban mới' });
  }
});

app.put('/api/departments/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { code, name, description } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: 'Mã phòng ban và tên phòng ban là bắt buộc' });
  }
  try {
    const result = await pool.query(
      'UPDATE departments SET code = $1, name = $2, description = $3 WHERE id = $4 RETURNING *',
      [code.trim().toUpperCase(), name.trim(), description || '', id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phòng ban' });
    }
    logger.info('Department updated', { department: result.rows[0], user: req.user.username });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Mã phòng ban bị trùng lặp' });
    }
    res.status(500).json({ error: 'Lỗi cập nhật phòng ban' });
  }
});

app.delete('/api/departments/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    // Kiểm tra ràng buộc: Nếu phòng ban còn nhân viên thì không cho xóa
    const checkEmp = await pool.query('SELECT COUNT(*) FROM employees WHERE department_id = $1', [id]);
    const empCount = parseInt(checkEmp.rows[0].count);
    if (empCount > 0) {
      return res.status(400).json({
        error: `Không thể xóa phòng ban này vì đang có ${empCount} nhân viên thuộc phòng ban. Vui lòng chuyển hoặc xóa nhân viên trước!`
      });
    }

    const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phòng ban cần xóa' });
    }

    logger.info('Department deleted', { id, user: req.user.username });
    updateGauges();
    res.json({ message: 'Xóa phòng ban thành công' });
  } catch (err) {
    logger.error('Error deleting department', { error: err.message });
    res.status(500).json({ error: 'Lỗi khi xóa phòng ban' });
  }
});

// =================== 4. API NHÂN VIÊN (EMPLOYEES - PHÂN TRANG & BẢO MẬT LƯƠNG) ===================
app.get('/api/employees', optionalAuthenticate, async (req, res) => {
  try {
    const { department_id, status, search, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const isAdmin = req.user && req.user.role === 'ADMIN';

    let countQuery = `SELECT COUNT(*) FROM employees e WHERE 1=1`;
    let dataQuery = `
      SELECT e.id, e.code, e.full_name, e.birth_date, e.gender, e.email, e.phone,
             e.address, e.position, e.department_id, e.joined_date, e.contract_type,
             e.status, e.created_at,
             ${isAdmin ? 'e.salary' : 'NULL as salary'},
             d.name AS department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (department_id && !isNaN(parseInt(department_id))) {
      params.push(parseInt(department_id));
      countQuery += ` AND e.department_id = $${params.length}`;
      dataQuery += ` AND e.department_id = $${params.length}`;
    }

    if (status && status.trim() !== '') {
      params.push(status.trim());
      countQuery += ` AND e.status = $${params.length}`;
      dataQuery += ` AND e.status = $${params.length}`;
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      const searchClause = ` AND (e.full_name ILIKE $${params.length} OR e.code ILIKE $${params.length} OR e.email ILIKE $${params.length})`;
      countQuery += searchClause;
      dataQuery += searchClause;
    }

    const totalCountRes = await pool.query(countQuery, params);
    const total = parseInt(totalCountRes.rows[0].count);

    dataQuery += ` ORDER BY e.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const dataRes = await pool.query(dataQuery, [...params, limitNum, offset]);

    res.json({
      data: dataRes.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    logger.error('Error fetching employees', { error: err.message });
    res.status(500).json({ error: 'Lỗi truy vấn danh sách nhân viên' });
  }
});

app.get('/api/employees/:id', optionalAuthenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user && req.user.role === 'ADMIN';
    const isOwner = req.user && req.user.employee_id === parseInt(id);

    const result = await pool.query(`
      SELECT e.*, d.name AS department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }

    const employee = result.rows[0];
    // Che mức lương nếu không phải ADMIN hoặc chính chủ
    if (!isAdmin && !isOwner) {
      employee.salary = null;
    }

    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi truy vấn thông tin nhân viên' });
  }
});

app.post('/api/employees', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  const {
    code, full_name, birth_date, gender, email, phone, address,
    position, salary, department_id, joined_date, contract_type, status
  } = req.body;

  // Validate bắt buộc
  if (!code || !full_name || !email) {
    return res.status(400).json({ error: 'Mã NV, Họ tên và Email là thông tin bắt buộc' });
  }

  // Validate định dạng email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Định dạng Email không hợp lệ' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO employees (
        code, full_name, birth_date, gender, email, phone, address,
        position, salary, department_id, joined_date, contract_type, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        code.trim().toUpperCase(),
        full_name.trim(),
        birth_date || null,
        gender || 'Khác',
        email.trim().toLowerCase(),
        phone || '',
        address || '',
        position || '',
        salary ? parseFloat(salary) : 0,
        department_id || null,
        joined_date || new Date(),
        contract_type || 'Toàn thời gian',
        status || 'ACTIVE'
      ]
    );

    logger.info('Employee created', { employee: result.rows[0], user: req.user.username });
    updateGauges();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Mã nhân viên hoặc Email đã tồn tại trong hệ thống' });
    }
    logger.error('Error creating employee', { error: err.message });
    res.status(500).json({ error: 'Lỗi tạo mới nhân viên' });
  }
});

app.put('/api/employees/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const {
    full_name, birth_date, gender, email, phone, address,
    position, salary, department_id, joined_date, contract_type, status
  } = req.body;

  if (!full_name || !email) {
    return res.status(400).json({ error: 'Họ tên và Email là thông tin bắt buộc' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Định dạng Email không hợp lệ' });
  }

  try {
    const result = await pool.query(
      `UPDATE employees 
       SET full_name = $1, birth_date = $2, gender = $3, email = $4, phone = $5,
           address = $6, position = $7, salary = $8, department_id = $9,
           joined_date = $10, contract_type = $11, status = $12
       WHERE id = $13 RETURNING *`,
      [
        full_name.trim(),
        birth_date || null,
        gender || 'Khác',
        email.trim().toLowerCase(),
        phone || '',
        address || '',
        position || '',
        salary ? parseFloat(salary) : 0,
        department_id || null,
        joined_date || null,
        contract_type || 'Toàn thời gian',
        status || 'ACTIVE',
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên cần chỉnh sửa' });
    }

    logger.info('Employee updated', { employee: result.rows[0], user: req.user.username });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email cập nhật bị trùng với nhân viên khác' });
    }
    logger.error('Error updating employee', { error: err.message });
    res.status(500).json({ error: 'Lỗi cập nhật thông tin nhân viên' });
  }
});

app.delete('/api/employees/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên cần xóa' });
    }
    logger.info('Employee deleted', { id, user: req.user.username });
    updateGauges();
    res.json({ message: 'Xóa nhân viên thành công' });
  } catch (err) {
    logger.error('Error deleting employee', { error: err.message });
    res.status(500).json({ error: 'Lỗi khi xóa nhân viên' });
  }
});

// =================== 5. API CHẤM CÔNG (ATTENDANCES) ===================
app.get('/api/attendances', optionalAuthenticate, async (req, res) => {
  try {
    const { date, month, employee_id, department_id } = req.query;
    let query = `
      SELECT a.*, e.code AS employee_code, e.full_name AS employee_name, d.name AS department_name
      FROM attendances a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    // Nếu là nhân viên thường, chỉ cho xem lịch sử chấm công của bản thân
    if (req.user && req.user.role === 'EMPLOYEE' && req.user.employee_id) {
      params.push(req.user.employee_id);
      query += ` AND a.employee_id = $${params.length}`;
    } else if (employee_id) {
      params.push(employee_id);
      query += ` AND a.employee_id = $${params.length}`;
    }

    if (department_id) {
      params.push(department_id);
      query += ` AND e.department_id = $${params.length}`;
    }

    if (month) {
      params.push(month);
      query += ` AND TO_CHAR(a.work_date, 'YYYY-MM') = $${params.length}`;
    } else if (date) {
      params.push(date);
      query += ` AND a.work_date = $${params.length}`;
    } else {
      // Mặc định ngày hôm nay nếu không có bộ lọc
      params.push(new Date().toISOString().split('T')[0]);
      query += ` AND a.work_date = $${params.length}`;
    }

    query += ' ORDER BY a.work_date DESC, a.check_in ASC NULLS LAST';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching attendances', { error: err.message });
    res.status(500).json({ error: 'Lỗi truy vấn dữ liệu chấm công' });
  }
});

// Check-in
app.post('/api/attendances/check-in', authenticateToken, async (req, res) => {
  let { employee_id, notes } = req.body;

  // Nếu là EMPLOYEE, ép buộc employee_id chính là tài khoản đang đăng nhập
  if (req.user.role === 'EMPLOYEE') {
    if (!req.user.employee_id) {
      return res.status(403).json({ error: 'Tài khoản chưa được liên kết với hồ sơ nhân viên' });
    }
    employee_id = req.user.employee_id;
  }

  if (!employee_id) {
    return res.status(400).json({ error: 'Vui lòng chọn nhân viên thực hiện điểm danh' });
  }

  try {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 15);
    const status = isLate ? 'LATE' : 'PRESENT';

    const result = await pool.query(`
      INSERT INTO attendances (employee_id, work_date, check_in, status, notes)
      VALUES ($1, CURRENT_DATE, $2, $3, $4)
      ON CONFLICT (employee_id, work_date) 
      DO UPDATE SET check_in = COALESCE(attendances.check_in, EXCLUDED.check_in),
                    status = EXCLUDED.status,
                    notes = COALESCE(EXCLUDED.notes, attendances.notes)
      RETURNING *
    `, [employee_id, timeStr, status, notes || (isLate ? 'Đi muộn' : 'Đúng giờ')]);

    attendanceEventsCounter.inc({ action: 'check_in' });
    logger.info('Employee checked in', { attendance: result.rows[0], user: req.user.username });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error in check-in', { error: err.message });
    res.status(500).json({ error: 'Lỗi thực hiện Check In' });
  }
});

// Check-out
app.post('/api/attendances/check-out', authenticateToken, async (req, res) => {
  let { employee_id } = req.body;

  if (req.user.role === 'EMPLOYEE') {
    if (!req.user.employee_id) {
      return res.status(403).json({ error: 'Tài khoản chưa được liên kết với hồ sơ nhân viên' });
    }
    employee_id = req.user.employee_id;
  }

  if (!employee_id) {
    return res.status(400).json({ error: 'Vui lòng chọn nhân viên' });
  }

  try {
    // Kiểm tra xem đã Check-in hôm nay chưa
    const checkRes = await pool.query(`
      SELECT check_in FROM attendances WHERE employee_id = $1 AND work_date = CURRENT_DATE
    `, [employee_id]);

    if (checkRes.rows.length === 0 || !checkRes.rows[0].check_in) {
      return res.status(400).json({ error: 'Nhân viên chưa thực hiện Check-in hôm nay!' });
    }

    const checkInTime = checkRes.rows[0].check_in; // "HH:MM:SS"
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    // Tính tổng giờ làm việc thực tế
    const [inH, inM, inS] = checkInTime.split(':').map(Number);
    const [outH, outM, outS] = timeStr.split(':').map(Number);
    const diffHours = (outH + outM / 60 + outS / 3600) - (inH + inM / 60 + inS / 3600);
    const workHours = Math.max(0, Math.round(diffHours * 10) / 10);

    const result = await pool.query(`
      UPDATE attendances
      SET check_out = $1, work_hours = $2
      WHERE employee_id = $3 AND work_date = CURRENT_DATE
      RETURNING *
    `, [timeStr, workHours, employee_id]);

    attendanceEventsCounter.inc({ action: 'check_out' });
    logger.info('Employee checked out', { attendance: result.rows[0], user: req.user.username });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error in check-out', { error: err.message });
    res.status(500).json({ error: 'Lỗi thực hiện Check Out' });
  }
});

// Chấm công thủ công (Dành riêng cho ADMIN)
app.post('/api/attendances/manual', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  const { employee_id, work_date, check_in, check_out, status, notes } = req.body;
  if (!employee_id || !work_date) {
    return res.status(400).json({ error: 'Nhân viên và ngày làm việc là bắt buộc' });
  }

  // Kiểm tra giờ ra trước giờ vào
  let workHours = 0;
  if (check_in && check_out) {
    if (check_out <= check_in) {
      return res.status(400).json({ error: 'Giờ Check-out phải sau giờ Check-in' });
    }
    const [inH, inM] = check_in.split(':').map(Number);
    const [outH, outM] = check_out.split(':').map(Number);
    workHours = Math.round(((outH + outM / 60) - (inH + inM / 60)) * 10) / 10;
  }

  try {
    const result = await pool.query(`
      INSERT INTO attendances (employee_id, work_date, check_in, check_out, work_hours, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (employee_id, work_date)
      DO UPDATE SET check_in = EXCLUDED.check_in,
                    check_out = EXCLUDED.check_out,
                    work_hours = EXCLUDED.work_hours,
                    status = EXCLUDED.status,
                    notes = EXCLUDED.notes
      RETURNING *
    `, [employee_id, work_date, check_in || null, check_out || null, workHours, status || 'PRESENT', notes || '']);

    logger.info('Manual attendance recorded', { record: result.rows[0], admin: req.user.username });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi ghi nhận chấm công thủ công' });
  }
});

// =================== XỬ LÝ LỖI TRUNG TÂM (KHÔNG LỘ STACK TRACE) ===================
app.use((err, req, res, next) => {
  logger.error('Unhandled server exception', { message: err.message });
  res.status(500).json({ error: 'Hệ thống xảy ra sự cố nội bộ. Vui lòng liên hệ quản trị viên.' });
});

// Khởi chạy server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`HRM Application running on port ${PORT}`);
  console.log(` HRM Server is running at http://localhost:${PORT}`);

  // Khởi tạo DB và nạp gauges
  initDB().then(() => {
    updateGauges();
  }).catch(err => {
    logger.error('Failed to init DB:', { error: err.message });
  });
});
