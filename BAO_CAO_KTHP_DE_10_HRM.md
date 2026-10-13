# BÁO CÁO THI KẾT THÚC HỌC PHẦN (KTHP)
## ĐỀ TÀI 10: HỆ THỐNG QUẢN LÝ NHÂN SỰ (HRM) HOÀN CHỈNH
**Học phần: DevOps, Quản trị Hệ thống & Cloud Computing**
**Môi trường triển khai: Docker Compose, PostgreSQL 16, Nginx Reverse Proxy, Prometheus, Grafana, Loki & Promtail**

---

### THÔNG TIN HỌC VIÊN / SINH VIÊN
* **Họ và tên:** `[Họ và tên sinh viên]`
* **Mã số sinh viên (MSSV):** `[Mã số sinh viên]`
* **Lớp sinh hoạt / Lớp học phần:** `[Tên lớp]`
* **Giảng viên hướng dẫn / Chấm thi:** `[Tên giảng viên]`
* **Năm học:** 2025 - 2026

---

## MỤC LỤC
1. [GIỚI THIỆU ĐỀ TÀI VÀ MỤC TIÊU](#1-giới-thiệu-đề-tài-và-mục-tiêu)
2. [PHÂN TÍCH YÊU CẦU NGHIỆP VỤ](#2-phân-tích-yêu-cầu-nghiệp-vụ)
3. [CÔNG NGHỆ VÀ KIẾN TRÚC TỔNG THỂ](#3-công-nghệ-và-kiến-trúc-tổng-thể)
4. [THIẾT KẾ CƠ SỞ DỮ LIỆU POSTGRESQL VÀ RÀNG BUỘC](#4-thiết-kế-cơ-sở-dữ-liệu-postgresql-và-ràng-buộc)
5. [TRIỂN KHAI VÀ TỐI ƯU HÓA DOCKER COMPOSE](#5-triển-khai-và-tối-ưu-hóa-docker-compose)
6. [NGINX REVERSE PROXY, SECURITY HEADERS VÀ HTTPS SSL](#6-nginx-reverse-proxy-security-headers-và-https-ssl)
7. [HỆ THỐNG GIÁM SÁT CHỈ SỐ PROMETHEUS & EXPORTERS](#7-hệ-thống-giám-sát-chỉ-số-prometheus--exporters)
8. [BẢNG ĐIỀU KHIỂN TRỰC QUAN HÓA GRAFANA DASHBOARDS](#8-bảng-điều-khiển-trực-quan-hóa-grafana-dashboards)
9. [HỆ THỐNG THU THẬP VÀ PHÂN TÍCH LOG LOKI + PROMTAIL & LOGQL](#9-hệ-thống-thu-thập-và-phân-tích-log-loki--promtail--logql)
10. [CÁC BIỆN PHÁP HARDENING VÀ BẢO MẬT HỆ THỐNG](#10-các-biện-pháp-hardening-và-bảo-mật-hệ-thống)
11. [KỊCH BẢN KIỂM THỬ VÀ KẾT QUẢ THỰC NGHIỆM](#11-kịch-bản-kiểm-thử-và-kết-quả-thực-nghiệm)
12. [HƯỚNG DẪN DEMO BẢO VỆ CHẤM ĐIỂM](#12-hướng-dẫn-demo-bảo-vệ-chấm-điểm)
13. [KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN](#13-kết-luận-và-hướng-phát-triển)

---

## 1. GIỚI THIỆU ĐỀ TÀI VÀ MỤC TIÊU

### 1.1. Đặt vấn đề
Hệ thống Quản trị Nguồn nhân lực (HRM) là nền tảng số hóa then chốt của mọi doanh nghiệp, quản lý dữ liệu nhân sự, cơ cấu phòng ban và kỷ luật lao động qua chấm công. Mục tiêu của Đề tài 10 là xây dựng một hệ thống HRM hoàn chỉnh, có khả năng chạy thực tế trên máy tính bằng Docker Compose, tích hợp đầy đủ cơ sở dữ liệu quan hệ PostgreSQL 16, Nginx Reverse Proxy kiên cố, cùng cụm công cụ giám sát (Prometheus, Grafana) và thu thập log tập trung (Loki, Promtail) theo chuẩn DevOps doanh nghiệp.

### 1.2. Mục tiêu kỹ thuật
- **Ứng dụng:** Xây dựng website HRM có đầy đủ CRUD nhân viên, phòng ban, chấm công, phân quyền JWT và phân trang dữ liệu.
- **Cơ sở dữ liệu:** PostgreSQL 16 với khóa chính, khóa ngoại, indexes và volume lưu trữ bền vững.
- **Cổng vào:** Nginx Reverse Proxy hỗ trợ cả HTTP (80) và HTTPS (443 SSL tự ký), Rate Limiting và Security Headers.
- **Giám sát:** Prometheus định kỳ scrape metrics từ HRM App và Postgres Exporter, tự động provisioning dashboard trên Grafana.
- **Logging:** Promtail đọc file log JSON của App đẩy về Grafana Loki, truy vấn và phân tích lỗi bằng LogQL.
- **Hardening:** Non-root container, mã hóa mật khẩu bcrypt, che giấu dữ liệu nhạy cảm (lương), cô lập mạng nội bộ.

---

## 2. PHÂN TÍCH YÊU CẦU NGHIỆP VỤ

### 2.1. Phân quyền và Vai trò (RBAC)
- **ADMIN (Quản trị viên):** Quản lý toàn bộ nhân viên, xem và điều chỉnh mức lương, tạo/sửa/xóa phòng ban, chấm công thủ công và quản lý tài khoản.
- **EMPLOYEE (Nhân viên):** Xem danh sách nhân sự (trường Mức lương bị ẩn `******` để bảo vệ quyền riêng tư), tự điểm danh Check In / Check Out và xem lịch sử chấm công cá nhân.

### 2.2. Nghiệp vụ Quản lý Nhân sự
- Thông tin quản lý: Mã NV (duy nhất), Họ tên, Ngày sinh, Giới tính, Email (duy nhất, regex chuẩn), Số điện thoại, Địa chỉ, Phòng ban, Chức vụ, Ngày vào làm, Loại hợp đồng, Mức lương và Trạng thái.
- Bộ lọc và Tìm kiếm: Tìm kiếm đa trường (mã, tên, email), lọc theo phòng ban và trạng thái làm việc (ACTIVE, ON_LEAVE, RESIGNED).
- Phân trang: Phân trang phía máy chủ (Server-side Pagination) giúp tối ưu hiệu năng cơ sở dữ liệu.

### 2.3. Nghiệp vụ Quản lý Phòng ban
- Quản lý mã, tên, mô tả nhiệm vụ của từng đơn vị.
- Đếm tự động số lượng nhân sự thuộc phòng ban.
- Ràng buộc toàn vẹn: Không cho phép xóa phòng ban nếu vẫn còn nhân viên đang trực thuộc.

### 2.4. Nghiệp vụ Chấm công & Điểm danh
- Ghi nhận giờ vào (Check-in), tự động đánh dấu ĐÚNG GIỜ hoặc ĐI MUỘN (nếu sau 08h15).
- Ghi nhận giờ ra (Check-out), tính toán tổng thời gian làm việc thực tế (`work_hours = check_out - check_in`).
- Lọc lịch sử theo ngày, theo tháng hoặc theo phòng ban.

---

## 3. CÔNG NGHỆ VÀ KIẾN TRÚC TỔNG THỂ

### 3.1. Danh sách Công nghệ Lựa chọn
| Thành phần | Công nghệ | Phiên bản | Vai trò |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | Node.js | v20 LTS Alpine | Nền tảng thực thi ứng dụng backend bất đồng bộ |
| **Web Framework** | Express.js | v4.19+ | Xử lý định tuyến RESTful, middleware bảo mật |
| **Frontend UI** | HTML5 / CSS3 / Chart.js | v4.4 | Giao diện quản trị responsive, biểu đồ trực quan |
| **Cơ sở dữ liệu** | PostgreSQL | 16-alpine | CSDL quan hệ lưu trữ dữ liệu bền vững |
| **Quản trị CSDL** | pgAdmin 4 | 8.5 | Quản trị giao diện Web GUI cho PostgreSQL |
| **Reverse Proxy** | Nginx | 1.25-alpine | Cổng vào duy nhất, rate limit, SSL, security headers |
| **Metrics Collector** | Prometheus | v2.51.0 | Thu thập và lưu trữ time-series metrics |
| **DB Exporter** | postgres-exporter | v0.15.0 | Trích xuất metrics nội tại của PostgreSQL |
| **Dashboard** | Grafana | 10.4.0 | Trực quan hóa metrics và logs tập trung |
| **Log Storage** | Grafana Loki | 2.9.5 | Lưu trữ và lập chỉ mục nhật ký phân tán |
| **Log Shipper** | Promtail | 2.9.5 | Đọc log file JSON và đẩy về Loki |

### 3.2. Sơ đồ Luồng Request
```
[Client] -> HTTP (:80) / HTTPS (:443) -> [Nginx Reverse Proxy]
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                            [HRM App (:3000)]        [pgAdmin (:80)]
                                    │
                                    ▼
                          [PostgreSQL (:5432)]
                                    │
                                    ▼
                         [postgres-exporter (:9187)]
                                    │
    [Promtail] -> [Loki]            │
         ▲           ▲              ▼
         │           │        [Prometheus (:9090)]
   [Log Files]       └──────────────┼───────────────────────┘
                                    ▼
                             [Grafana (:3001)]
```

---

## 4. THIẾT KẾ CƠ SỞ DỮ LIỆU POSTGRESQL VÀ RÀNG BUỘC

### 4.1. Cấu trúc Các Bảng
1. `departments`: `id (PK)`, `code (UNIQUE)`, `name`, `description`, `created_at`.
2. `employees`: `id (PK)`, `code (UNIQUE)`, `full_name`, `birth_date`, `gender`, `email (UNIQUE)`, `phone`, `address`, `position`, `salary`, `department_id (FK -> departments.id ON DELETE RESTRICT)`, `joined_date`, `contract_type`, `status`, `created_at`.
3. `users`: `id (PK)`, `username (UNIQUE)`, `password_hash`, `role (ADMIN/EMPLOYEE)`, `employee_id (FK -> employees.id ON DELETE CASCADE)`, `created_at`, `last_login`.
4. `attendances`: `id (PK)`, `employee_id (FK -> employees.id ON DELETE CASCADE)`, `work_date`, `check_in`, `check_out`, `work_hours`, `status`, `notes`, `created_at`. Ràng buộc `UNIQUE (employee_id, work_date)`.

### 4.2. Chỉ mục (Indexes) Tối ưu hóa Truy vấn
```sql
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(code);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(work_date);
CREATE INDEX IF NOT EXISTS idx_attendances_emp ON attendances(employee_id);
```

---

## 5. TRIỂN KHAI VÀ TỐI ƯU HÓA DOCKER COMPOSE

File `docker-compose.yml` tích hợp 8 services trên một bridge network nội bộ `hrm-network`:
- **postgres**: Cấu hình healthcheck `pg_isready`, lưu dữ liệu qua named volume `postgres_data`.
- **pgadmin**: Phụ thuộc `postgres` với điều kiện `service_healthy`.
- **postgres-exporter**: Kết nối tới `postgres:5432` nội bộ để xuất metrics database.
- **app**: Build từ `Dockerfile` non-root (`USER node`), mount volume log `app_logs`.
- **nginx**: Mở cổng 80 và 443, mount cấu hình `default.conf` và chứng chỉ SSL `nginx/ssl`.
- **prometheus**: Scrape từ `app:3000` và `postgres-exporter:9187`.
- **grafana**: Tự động mount provisioning datasources và dashboard.
- **loki & promtail**: Promtail mount `app_logs` để đọc file JSON và đẩy về Loki qua API HTTP.

---

## 6. NGINX REVERSE PROXY, SECURITY HEADERS VÀ HTTPS SSL

### 6.1. Security Headers
```nginx
server_tokens off;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 6.2. Rate Limiting & Buffer Overflow
- `limit_req_zone $binary_remote_addr zone=general_limit:10m rate=25r/s;` (burst 35)
- `limit_req_zone $binary_remote_addr zone=api_limit:10m rate=15r/s;` (burst 20)
- Trả về mã lỗi 429 kèm JSON thông báo rõ ràng khi vượt ngưỡng.
- Giới hạn `client_body_buffer_size 128k` và `client_max_body_size 10M`.

---

## 7. HỆ THỐNG GIÁM SÁT CHỈ SỐ PROMETHEUS & EXPORTERS

### 7.1. Custom Business Metrics
- `hrm_http_requests_total`: Counter theo dõi tổng lượt request HTTP theo method, route, status.
- `hrm_http_request_duration_seconds`: Histogram đo độ trễ request.
- `hrm_active_employees_count`: Gauge đếm số nhân viên đang làm việc.
- `hrm_active_departments_count`: Gauge đếm số phòng ban.
- `hrm_attendance_actions_total`: Counter đếm lượt check-in / check-out.
- `hrm_auth_attempts_total`: Counter đếm số lượt đăng nhập thành công/thất bại theo vai trò.

### 7.2. Database Metrics
- `pg_stat_database_numbackends{datname="hrm_db"}`: Số lượng active connections.
- `rate(pg_stat_database_xact_commit{datname="hrm_db"}[1m])`: Tần suất commit giao dịch.

---

## 8. BẢNG ĐIỀU KHIỂN TRỰC QUAN HÓA GRAFANA DASHBOARDS

Dashboard tự động nạp qua provisioning file `hrm-dashboard.json`:
1. **Stat Cards:** Nhân viên hoạt động, Phòng ban, Throughput (ops/s), Tổng lượt điểm danh.
2. **HTTP Performance:** Request rate theo method/route và biểu đồ P95 Latency.
3. **PostgreSQL & Auth:** Số kết nối active CSDL và biểu đồ theo dõi đăng nhập.
4. **LogQL Live Stream:** Bảng nhật ký trực tiếp từ Loki.

---

## 9. HỆ THỐNG THU THẬP VÀ PHÂN TÍCH LOG LOKI + PROMTAIL & LOGQL

### 5 Câu lệnh LogQL Mẫu để Demo:
1. Xem toàn bộ log stream của HRM App:
   `{job="hrm-app"}`
2. Lọc các HTTP request được xử lý:
   `{job="hrm-app"} |= "HTTP Request processed"`
3. Truy vết các phiên đăng nhập thành công:
   `{job="hrm-app"} |= "User logged in successfully"`
4. Lọc các bản ghi phát sinh lỗi:
   `{job="hrm-app"} |= "error"`
5. Tính tốc độ phát sinh log trên mỗi phút:
   `rate({job="hrm-app"}[1m])`

---

## 10. CÁC BIỆN PHÁP HARDENING VÀ BẢO MẬT HỆ THỐNG

1. **Non-Root Container:** Dockerfile chạy dưới quyền `USER node` (UID 1000).
2. **Cô lập Mạng:** PostgreSQL, Loki, Postgres-exporter không công khai cổng ra ngoài host.
3. **Quản lý Secrets:** Sử dụng biến môi trường, không đưa `.env` vào Git.
4. **Băm Mật khẩu:** Sử dụng thuật toán `bcrypt` với 10 salt rounds.
5. **Phiên làm việc JWT:** Thời hạn 24h, mã hóa HMAC-SHA256.
6. **RBAC Backend:** Phân quyền nghiêm ngặt tại middleware Express (`requireRole`).
7. **Bảo vệ Dữ liệu Nhạy cảm:** Ẩn mức lương với tài khoản EMPLOYEE.
8. **Ẩn Phiên bản Máy chủ:** `server_tokens off` trên Nginx.
9. **Security Headers OWASP:** Chống Clickjacking, MIME sniffing, XSS, HSTS.
10. **Rate Limiting:** Chống tấn công DoS và brute-force quét mật khẩu.
11. **Chống Buffer Overflow:** Giới hạn body và header buffers.
12. **HTTPS SSL/TLS:** Hỗ trợ mã hóa kênh truyền cổng 443.
13. **Kiểm tra Dữ liệu Đầu vào:** Regex email, validate số giờ làm việc.
14. **Làm sạch Log:** Tuyệt đối không ghi mật khẩu và token ra file log.
15. **Che giấu Stack Trace:** Centralized error handler không làm lộ chi tiết mã nguồn.

---

## 11. KỊCH BẢN KIỂM THỬ VÀ KẾT QUẢ THỰC NGHIỆM

### Kết quả Unit Tests (`npm test`):
```
🧪 Starting HRM Unit & Validation Tests...
1. Testing bcrypt password hashing and verification...
   ✅ Bcrypt password hashing test PASSED
2. Testing JWT token generation and verification...
   ✅ JWT token generation and verification test PASSED
3. Testing attendance work hours calculation...
   ✅ Attendance work hours calculation test PASSED
4. Testing Email validation regex...
   ✅ Email regex validation test PASSED
5. Testing attendance status classification (8:15 AM threshold)...
   ✅ Attendance status classification test PASSED

🎉 ALL 5 HRM UNIT TESTS PASSED SUCCESSFULLY!
```

---

## 12. HƯỚNG DẪN DEMO BẢO VỆ CHẤM ĐIỂM

1. **Khởi động hệ thống:**
   ```bash
   docker compose up -d --build
   docker compose ps
   ```
2. **Demo Website HRM (`http://localhost/`):**
   - Đăng nhập Admin: `admin` / `Admin@123` -> Toàn quyền CRUD, thấy lương.
   - Đăng nhập Nhân viên: `an.nguyen` / `An@123` -> Ẩn lương, chỉ tự điểm danh.
   - Thử Check-in / Check-out, xem biểu đồ Chart.js cập nhật tự động.
3. **Demo Nginx Hardening:**
   ```powershell
   curl -I http://localhost/
   for ($i=1; $i -le 40; $i++) { curl -s -o /dev/null -w "%{http_code}`n" http://localhost/ }
   ```
4. **Demo Prometheus (`http://localhost:9090`) & Grafana (`http://localhost:3001`):**
   - Kiểm tra 2 targets UP trên Prometheus.
   - Quan sát các Panel trên Dashboard HRM System.
5. **Demo Loki LogQL:**
   - Mở Grafana Explore -> Chọn Loki -> Chạy `{job="hrm-app"}`.

---

## 13. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

Hệ thống đã hoàn thiện 100% các yêu cầu của Đề tài 10, đáp ứng trọn vẹn cả tiêu chí ứng dụng nghiệp vụ lẫn hạ tầng DevOps hiện đại (Docker, Nginx, Prometheus, Grafana, Loki). Hướng phát triển tiếp theo là mở rộng triển khai trên cụm Kubernetes (K8s) và tích hợp pipeline CI/CD DevSecOps tự động quét lỗ hổng mã nguồn.
