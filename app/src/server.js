const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./logger');
const { pool, initDB } = require('./db');
const {
  register,
  httpRequestCounter,
  httpRequestDuration,
  activeEmployeesGauge,
  activeDepartmentsGauge,
  attendanceEventsCounter
} = require('./metrics');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Middleware đo đạc metrics và log mọi HTTP request
app.use((req, res, next) => {
  const start = process.hrtime();
  const route = req.path;

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    const status = res.statusCode.toString();

    // Không ghi metrics cho chính endpoint /metrics để tránh sai lệch
    if (route !== '/metrics') {
      httpRequestCounter.inc({ method: req.method, route, status });
      httpRequestDuration.observe({ method: req.method, route, status }, durationInSeconds);

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

// Cập nhật gauges thống kê định kỳ cho Prometheus
async function updateGauges() {
  try {
    const empRes = await pool.query("SELECT COUNT(*) FROM employees WHERE status = 'ACTIVE'");
    const deptRes = await pool.query("SELECT COUNT(*) FROM departments");
    activeEmployeesGauge.set(parseInt(empRes.rows[0].count) || 0);
    activeDepartmentsGauge.set(parseInt(deptRes.rows[0].count) || 0);
  } catch (err) {
    // DB chưa sẵn sàng, bỏ qua
  }
}
setInterval(updateGauges, 10000);

// =================== API STATS ===================
app.get('/api/stats', async (req, res) => {
  try {
    const empRes = await pool.query("SELECT COUNT(*) FROM employees");
    const activeEmpRes = await pool.query("SELECT COUNT(*) FROM employees WHERE status = 'ACTIVE'");
    const deptRes = await pool.query("SELECT COUNT(*) FROM departments");
    const attRes = await pool.query("SELECT COUNT(*) FROM attendances WHERE work_date = CURRENT_DATE");

    res.json({
      totalEmployees: parseInt(empRes.rows[0].count),
      activeEmployees: parseInt(activeEmpRes.rows[0].count),
      totalDepartments: parseInt(deptRes.rows[0].count),
      attendancesToday: parseInt(attRes.rows[0].count)
    });
  } catch (err) {
    logger.error('Error fetching dashboard stats', { error: err.message });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// =================== API PHÒNG BAN (DEPARTMENTS) ===================
app.get('/api/departments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, COUNT(e.id) AS employee_count 
      FROM departments d 
      LEFT JOIN employees e ON d.id = e.department_id 
      GROUP BY d.id 
      ORDER BY d.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching departments', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/departments', async (req, res) => {
  const { code, name, description } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: 'Mã phòng ban và tên phòng ban là bắt buộc' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO departments (code, name, description) VALUES ($1, $2, $3) RETURNING *',
      [code.trim().toUpperCase(), name.trim(), description || '']
    );
    logger.info('Department created', { department: result.rows[0] });
    updateGauges();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Error creating department', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM departments WHERE id = $1', [id]);
    logger.info('Department deleted', { id });
    updateGauges();
    res.json({ message: 'Xóa phòng ban thành công' });
  } catch (err) {
    logger.error('Error deleting department', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// =================== API NHÂN VIÊN (EMPLOYEES) ===================
app.get('/api/employees', async (req, res) => {
  try {
    const { department_id, search } = req.query;
    let query = `
      SELECT e.*, d.name AS department_name 
      FROM employees e 
      LEFT JOIN departments d ON e.department_id = d.id 
      WHERE 1=1
    `;
    const params = [];

    if (department_id) {
      params.push(department_id);
      query += ` AND e.department_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (e.full_name ILIKE $${params.length} OR e.code ILIKE $${params.length} OR e.email ILIKE $${params.length})`;
    }

    query += ' ORDER BY e.id DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching employees', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees', async (req, res) => {
  const { code, full_name, email, phone, position, salary, department_id, status } = req.body;
  if (!code || !full_name || !email) {
    return res.status(400).json({ error: 'Mã NV, Họ tên và Email là bắt buộc' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO employees (code, full_name, email, phone, position, salary, department_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [code.trim().toUpperCase(), full_name.trim(), email.trim(), phone || '', position || '', salary || 0, department_id || null, status || 'ACTIVE']
    );
    logger.info('Employee created', { employee: result.rows[0] });
    updateGauges();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Error creating employee', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  const { full_name, email, phone, position, salary, department_id, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE employees 
       SET full_name = $1, email = $2, phone = $3, position = $4, salary = $5, department_id = $6, status = $7 
       WHERE id = $8 RETURNING *`,
      [full_name, email, phone, position, salary, department_id || null, status, id]
    );
    logger.info('Employee updated', { employee: result.rows[0] });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error updating employee', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM employees WHERE id = $1', [id]);
    logger.info('Employee deleted', { id });
    updateGauges();
    res.json({ message: 'Xóa nhân viên thành công' });
  } catch (err) {
    logger.error('Error deleting employee', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// =================== API CHẤM CÔNG (ATTENDANCE) ===================
app.get('/api/attendances', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const result = await pool.query(`
      SELECT a.*, e.code AS employee_code, e.full_name AS employee_name, d.name AS department_name
      FROM attendances a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE a.work_date = $1
      ORDER BY a.check_in ASC NULLS LAST
    `, [date]);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching attendances', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Check-in
app.post('/api/attendances/check-in', async (req, res) => {
  const { employee_id, notes } = req.body;
  if (!employee_id) {
    return res.status(400).json({ error: 'Vui lòng chọn nhân viên' });
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
      DO UPDATE SET check_in = EXCLUDED.check_in, status = EXCLUDED.status, notes = EXCLUDED.notes
      RETURNING *
    `, [employee_id, timeStr, status, notes || (isLate ? 'Đi muộn' : 'Đúng giờ')]);

    attendanceEventsCounter.inc({ action: 'check_in' });
    logger.info('Employee checked in', { attendance: result.rows[0] });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error in check-in', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Check-out
app.post('/api/attendances/check-out', async (req, res) => {
  const { employee_id } = req.body;
  if (!employee_id) {
    return res.status(400).json({ error: 'Vui lòng chọn nhân viên' });
  }
  try {
    const timeStr = new Date().toTimeString().split(' ')[0];
    const result = await pool.query(`
      UPDATE attendances
      SET check_out = $1
      WHERE employee_id = $2 AND work_date = CURRENT_DATE
      RETURNING *
    `, [timeStr, employee_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nhân viên chưa thực hiện Check-in hôm nay!' });
    }

    attendanceEventsCounter.inc({ action: 'check_out' });
    logger.info('Employee checked out', { attendance: result.rows[0] });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error in check-out', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Khởi chạy server ngay lập tức
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`HRM Application started on port ${PORT}`);
  console.log(`🚀 HRM Server is running at http://localhost:${PORT}`);
  
  // Khởi tạo DB và Gauges trong background
  initDB().then(() => {
    updateGauges();
  }).catch(err => {
    logger.error('Failed to init DB:', { error: err.message });
  });
});

