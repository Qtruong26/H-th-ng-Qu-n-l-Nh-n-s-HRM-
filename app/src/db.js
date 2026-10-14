const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
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

      // 1. Tạo bảng departments (Phòng ban)
      await client.query(`
        CREATE TABLE IF NOT EXISTS departments (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 2. Tạo bảng employees (Nhân viên)
      await client.query(`
        CREATE TABLE IF NOT EXISTS employees (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          birth_date DATE,
          gender VARCHAR(20) DEFAULT 'Khác',
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(50),
          address TEXT,
          position VARCHAR(100),
          salary NUMERIC(14, 2) DEFAULT 0,
          department_id INTEGER REFERENCES departments(id) ON DELETE RESTRICT,
          joined_date DATE DEFAULT CURRENT_DATE,
          contract_type VARCHAR(100) DEFAULT 'Toàn thời gian',
          status VARCHAR(50) DEFAULT 'ACTIVE',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 3. Tạo bảng users (Tài khoản và phân quyền)
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'EMPLOYEE',
          employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP WITH TIME ZONE
        );
      `);

      // 4. Tạo bảng attendances (Chấm công & Điểm danh)
      await client.query(`
        CREATE TABLE IF NOT EXISTS attendances (
          id SERIAL PRIMARY KEY,
          employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          work_date DATE NOT NULL DEFAULT CURRENT_DATE,
          check_in TIME,
          check_out TIME,
          work_hours NUMERIC(5, 2) DEFAULT 0,
          status VARCHAR(50) DEFAULT 'PRESENT',
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_employee_date UNIQUE (employee_id, work_date)
        );
      `);

      // 5. Tự động kiểm tra và thêm các cột cần thiết nếu DB đã khởi tạo từ trước (Auto Migration)
      await client.query(`
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS birth_date DATE;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'Khác';
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_type VARCHAR(100) DEFAULT 'Toàn thời gian';
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary NUMERIC(14, 2) DEFAULT 0;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS joined_date DATE DEFAULT CURRENT_DATE;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE attendances ADD COLUMN IF NOT EXISTS work_hours NUMERIC(5, 2) DEFAULT 0;
        ALTER TABLE attendances ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PRESENT';
        ALTER TABLE attendances ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE attendances ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
      `);

      // 6. Tạo Indexes tối ưu hóa truy vấn
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(code);
        CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
        CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
        CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(work_date);
        CREATE INDEX IF NOT EXISTS idx_attendances_emp ON attendances(employee_id);
      `);

      // 6. Kiểm tra và seed dữ liệu mẫu
      const deptCount = await client.query('SELECT COUNT(*) FROM departments');
      if (parseInt(deptCount.rows[0].count) === 0) {
        logger.info('Seeding initial sample departments and employees...');

        // Seed phòng ban
        await client.query(`
          INSERT INTO departments (code, name, description) VALUES
          ('IT', 'Phòng Công nghệ Thông tin', 'Phát triển phần mềm, hạ tầng Cloud và DevOps'),
          ('HR', 'Phòng Hành chính Nhân sự', 'Quản trị nhân lực, tuyển dụng và đào tạo phát triển'),
          ('ACC', 'Phòng Kế toán - Tài chính', 'Quản lý tài chính, ngân sách, báo cáo thuế và tiền lương'),
          ('MKT', 'Phòng Marketing', 'Truyền thông số, nghiên cứu thị trường và thương hiệu');
        `);

        // Seed nhân viên
        await client.query(`
          INSERT INTO employees (code, full_name, birth_date, gender, email, phone, address, position, salary, department_id, contract_type, status, joined_date) VALUES
          ('NV001', 'Nguyễn Văn An', '1995-05-12', 'Nam', 'an.nguyen@hrm.com', '0912345678', 'Hà Nội', 'DevOps Engineer', 28000000, 1, 'Toàn thời gian', 'ACTIVE', '2022-03-01'),
          ('NV002', 'Trần Thị Bích', '1996-08-20', 'Nữ', 'bich.tran@hrm.com', '0923456789', 'Đà Nẵng', 'HR Manager', 24000000, 2, 'Toàn thời gian', 'ACTIVE', '2021-06-15'),
          ('NV003', 'Lê Hoàng Cường', '1998-11-04', 'Nam', 'cuong.le@hrm.com', '0934567890', 'TP. Hồ Chí Minh', 'Backend Developer', 22000000, 1, 'Toàn thời gian', 'ACTIVE', '2023-01-10'),
          ('NV004', 'Phạm Minh Dũng', '1994-02-18', 'Nam', 'dung.pham@hrm.com', '0945678901', 'Hà Nội', 'Kế toán trưởng', 25000000, 3, 'Toàn thời gian', 'ACTIVE', '2020-09-01'),
          ('NV005', 'Võ Thảo My', '1999-07-25', 'Nữ', 'my.vo@hrm.com', '0956789012', 'Cần Thơ', 'Marketing Lead', 20000000, 4, 'Toàn thời gian', 'ACTIVE', '2023-05-15');
        `);

        // Seed chấm công hôm nay
        await client.query(`
          INSERT INTO attendances (employee_id, work_date, check_in, check_out, work_hours, status, notes) VALUES
          (1, CURRENT_DATE, '08:00:00', '17:30:00', 8.5, 'PRESENT', 'Đúng giờ - hoàn thành task'),
          (2, CURRENT_DATE, '08:20:00', '17:30:00', 8.1, 'LATE', 'Đi muộn 20 phút do thời tiết'),
          (3, CURRENT_DATE, '07:55:00', NULL, 0, 'PRESENT', 'Đang làm việc tại văn phòng');
        `);

        logger.info('Sample departments, employees, and attendances seeded.');
      }

      // 7. Seed tài khoản Users (có băm mật khẩu bảo mật bằng bcrypt)
      const userCount = await client.query('SELECT COUNT(*) FROM users');
      if (parseInt(userCount.rows[0].count) === 0) {
        logger.info('Seeding initial secure user accounts with bcrypt...');
        const adminPassHash = bcrypt.hashSync('Admin@123', 10);
        const anPassHash = bcrypt.hashSync('An@123', 10);
        const bichPassHash = bcrypt.hashSync('Bich@123', 10);

        await client.query(`
          INSERT INTO users (username, password_hash, role, employee_id) VALUES
          ('admin', $1, 'ADMIN', NULL),
          ('an.nguyen', $2, 'EMPLOYEE', 1),
          ('bich.tran', $3, 'EMPLOYEE', 2);
        `, [adminPassHash, anPassHash, bichPassHash]);

        logger.info('User accounts seeded: admin (ADMIN), an.nguyen (EMPLOYEE), bich.tran (EMPLOYEE).');
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
