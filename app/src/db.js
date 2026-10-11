const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'hrm_user',
  password: process.env.DB_PASSWORD || 'hrm_password123',
  database: process.env.DB_NAME || 'hrm_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
});

async function initDB() {
  let retries = 15;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      logger.info('Connected successfully to PostgreSQL database');

      // Tạo bảng departments
      await client.query(`
        CREATE TABLE IF NOT EXISTS departments (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Tạo bảng employees
      await client.query(`
        CREATE TABLE IF NOT EXISTS employees (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(50),
          position VARCHAR(100),
          salary NUMERIC(12, 2) DEFAULT 0,
          department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          joined_date DATE DEFAULT CURRENT_DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Tạo bảng attendances (chấm công)
      await client.query(`
        CREATE TABLE IF NOT EXISTS attendances (
          id SERIAL PRIMARY KEY,
          employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          work_date DATE NOT NULL DEFAULT CURRENT_DATE,
          check_in TIME,
          check_out TIME,
          status VARCHAR(50) DEFAULT 'PRESENT',
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_employee_date UNIQUE (employee_id, work_date)
        );
      `);

      // Kiểm tra và seed dữ liệu mẫu nếu chưa có
      const deptCount = await client.query('SELECT COUNT(*) FROM departments');
      if (parseInt(deptCount.rows[0].count) === 0) {
        logger.info('Seeding initial sample data for HRM system...');

        await client.query(`
          INSERT INTO departments (code, name, description) VALUES
          ('IT', 'Phòng Công nghệ Thông tin', 'Phát triển phần mềm và hạ tầng hệ thống'),
          ('HR', 'Phòng Hành chính Nhân sự', 'Quản trị nhân lực, tuyển dụng và đào tạo'),
          ('ACC', 'Phòng Kế toán - Tài chính', 'Quản lý tài chính, ngân sách và tiền lương'),
          ('MKT', 'Phòng Marketing', 'Truyền thông và phát triển thương hiệu');
        `);

        await client.query(`
          INSERT INTO employees (code, full_name, email, phone, position, salary, department_id, status) VALUES
          ('NV001', 'Nguyễn Văn An', 'an.nguyen@hrm.com', '0912345678', 'DevOps Engineer', 25000000, 1, 'ACTIVE'),
          ('NV002', 'Trần Thị Bích', 'bich.tran@hrm.com', '0923456789', 'HR Manager', 22000000, 2, 'ACTIVE'),
          ('NV003', 'Lê Hoàng Cường', 'cuong.le@hrm.com', '0934567890', 'Backend Developer', 20000000, 1, 'ACTIVE'),
          ('NV004', 'Phạm Minh Dũng', 'dung.pham@hrm.com', '0945678901', 'Kế toán trưởng', 23000000, 3, 'ACTIVE'),
          ('NV005', 'Võ Thảo My', 'my.vo@hrm.com', '0956789012', 'Marketing Specialist', 18000000, 4, 'ACTIVE');
        `);

        await client.query(`
          INSERT INTO attendances (employee_id, work_date, check_in, check_out, status, notes) VALUES
          (1, CURRENT_DATE, '08:00:00', '17:30:00', 'PRESENT', 'Đúng giờ'),
          (2, CURRENT_DATE, '08:15:00', '17:30:00', 'LATE', 'Đi muộn 15 phút do kẹt xe'),
          (3, CURRENT_DATE, '07:55:00', NULL, 'PRESENT', 'Đang làm việc');
        `);

        logger.info('Sample data seeded successfully.');
      }

      client.release();
      break;
    } catch (err) {
      retries -= 1;
      logger.warn(`Waiting for database to be ready... (${15 - retries}/15): ${err.message}`);
      await new Promise(res => setTimeout(res, 3000));
    }
  }

  if (retries === 0) {
    logger.error('Could not connect to PostgreSQL after multiple attempts');
  }
}

module.exports = {
  pool,
  initDB
};
