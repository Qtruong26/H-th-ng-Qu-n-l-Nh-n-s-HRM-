# BÁO CÁO KỸ THUẬT & HƯỚNG DẪN TRIỂN KHAI
# ĐỀ TÀI 10: HỆ THỐNG QUẢN LÝ NHÂN SỰ (HRM)
**Học phần: Thi Kết thúc học phần (KTHP) - DevOps & Quản trị Hệ thống Cloud**

---

## 1. MỤC TIÊU VÀ PHẠM VI DỰ ÁN

Dự án triển khai một hệ thống Quản lý Nhân sự (Human Resource Management - HRM) hoàn chỉnh chạy thực tế trên môi trường container hóa (Docker Compose), tích hợp đầy đủ các tiêu chuẩn vận hành DevOps hiện đại:
1. **Ứng dụng Quản lý Nhân sự (Full-stack):**
   - Xác thực đa vai trò (**ADMIN** & **EMPLOYEE**) sử dụng JWT Token và băm mật khẩu bảo mật bằng **bcrypt**.
   - Quản lý Nhân viên (CRUD, tìm kiếm, lọc theo phòng ban/trạng thái, phân trang, che giấu mức lương với người không có thẩm quyền).
   - Quản lý Phòng ban (CRUD, xem danh sách nhân sự theo phòng ban, ràng buộc khóa ngoại ngăn xóa phòng ban đang có nhân viên).
   - Sổ chấm công & Điểm danh (Check-in, Check-out, tính tổng thời gian làm việc thực tế, phân loại đúng giờ / đi muộn, chấm công thủ công).
   - Bảng điều khiển (Dashboard) thời gian thực với biểu đồ trực quan hóa cơ cấu nhân sự và thống kê chấm công.
2. **Hạ tầng Cơ sở dữ liệu:** PostgreSQL 16 bền vững với Docker Volume, cơ chế tự động khởi tạo Schema, Indexes và nạp dữ liệu mẫu (Seeding). Kèm giao diện quản trị trực quan pgAdmin 4.
3. **Cổng vào Reverse Proxy & Hardening:** Nginx làm cổng vào duy nhất (Port 80 & Port 443 HTTPS với chứng chỉ SSL/TLS tự ký), cấu hình Rate Limiting chống DoS, ẩn phiên bản và thiết lập bộ Security Headers chuẩn OWASP.
4. **Hệ thống Giám sát Chỉ số (Monitoring):** Prometheus định kỳ thu thập số liệu từ HRM App (`/metrics`) và PostgreSQL Exporter, hiển thị trực quan qua Grafana Dashboard tự động nạp sẵn (Provisioning).
5. **Hệ thống Thu thập Log Tập trung (Centralized Logging):** Promtail thu thập log file có cấu trúc JSON từ ứng dụng đẩy về Grafana Loki, cho phép phân tích và truy vết sự kiện thời gian thực bằng ngôn ngữ LogQL.

---

## 2. KIẾN TRÚC TỔNG THỂ & SƠ ĐỒ LUỒNG REQUEST

### 2.1. Kiến trúc phân tầng (Multi-Container Architecture)

```
                       [ Client / Trình duyệt Người dùng ]
                                      │
                   HTTP (:80) / HTTPS (:443 SSL Tự ký)
                                      ▼
                      ┌───────────────────────────────┐
                      │      Nginx Reverse Proxy      │
                      │  - Rate Limiting (25r/s)      │
                      │  - Security Headers (HSTS,XSS)│
                      │  - Ẩn server_tokens          │
                      └───────┬───────────────┬───────┘
                              │               │
               Proxy / & /api/│               │ Proxy /pgadmin/
                              ▼               ▼
           ┌───────────────────────────┐   ┌───────────────────────────┐
           │     HRM Application       │   │         pgAdmin 4         │
           │  Node.js (Express, Non-root)  │ (Quản trị DB trực quan)   │
           └─────────────┬─────────────┘   └─────────────┬─────────────┘
                         │                               │
                Port 5432│ Truy vấn dữ liệu     Port 5432│
                         ▼                               ▼
                 ┌───────────────────────────────────────────────┐
                 │             PostgreSQL 16 Engine              │
                 │   (Bảng: departments, employees, users, att)  │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │              Postgres Exporter                │
                 │       (Thu thập metrics DB cổng :9187)        │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
 ┌──────────────────────┐ Scrape ┌───────────────────────────────┐
 │   Promtail Agent     │        │          Prometheus           │
 │ (Đọc /var/log/app)   │        │     (Scrape App & Postgres)   │
 └──────────┬───────────┘        └───────────────┬───────────────┘
            │ Push logs                          │ Datasource
            ▼                                    ▼
 ┌──────────────────────┐ Truy vấn LogQL ┌───────────────────────────────┐
 │     Grafana Loki     │◄───────────────┤            Grafana            │
 │ (Kho lưu trữ Logs)   │                │     (Bảng điều khiển giám sát)│
 └──────────────────────┘                └───────────────────────────────┘
```

---

## 3. BẢNG CỔNG TRUY CẬP VÀ THÔNG TIN TÀI KHOẢN

| Dịch vụ | Địa chỉ URL | Cổng (Port) | Tài khoản / Mật khẩu truy cập |
| :--- | :--- | :--- | :--- |
| **HRM Web App (HTTP)** | `http://localhost/` | `80` | Đăng nhập tài khoản hệ thống bên dưới |
| **HRM Web App (HTTPS SSL)** | `https://localhost/` | `443` | Chứng chỉ tự ký (*Bấm Nâng cao -> Tiếp tục*) |
| **pgAdmin 4 (Web DB)** | `http://localhost/pgadmin/` | `80` (Proxy) | **Email:** `admin@hrm.com`<br>**Mật khẩu:** `admin123` |
| **Grafana Dashboard** | `http://localhost:3001/` | `3001` | **User:** `admin`<br>**Mật khẩu:** `admin` *(Đã bật Anonymous Admin)* |
| **Prometheus Server** | `http://localhost:9090/` | `9090` | Truy cập tự do không cần mật khẩu |
| **PostgreSQL Database** | `postgres:5432` *(Nội bộ)* | `5432` *(Cô lập)* | **User:** `hrm_user`<br>**Password:** `hrm_password123`<br>**DB:** `hrm_db` |
| **HRM App Metrics** | `http://localhost/metrics` | `80` | Endpoint Prometheus metrics |

### Danh sách Tài khoản Đăng nhập Demo Hệ thống HRM:
* **Tài khoản Quản trị viên (ADMIN):**
  * Tên đăng nhập: `admin`
  * Mật khẩu: `Admin@123`
  * Quyền hạn: Toàn quyền CRUD nhân viên, xem lương, tạo sửa xóa phòng ban, chấm công thủ công.
* **Tài khoản Nhân viên 1 (EMPLOYEE):**
  * Tên đăng nhập: `an.nguyen`
  * Mật khẩu: `An@123`
  * Quyền hạn: Xem danh sách nhân viên (ẩn lương), tự chấm công, xem lịch sử chấm công của mình.
* **Tài khoản Nhân viên 2 (EMPLOYEE):**
  * Tên đăng nhập: `bich.tran`
  * Mật khẩu: `Bich@123`

---

## 4. CẤU TRÚC THƯ MỤC DỰ ÁN

```
d:\Thi KTHP
├── .env.example                     # File biến môi trường mẫu
├── .gitignore                       # Bỏ qua node_modules, logs, certs, .env
├── .github/
│   └── workflows/
│       └── ci.yml                   # Pipeline GitHub Actions tự động kiểm tra code
├── README.md                        # Tài liệu hướng dẫn kỹ thuật hoàn chỉnh
├── docker-compose.yml               # File cấu hình khởi chạy toàn bộ 8 dịch vụ
├── app/                             # Mã nguồn ứng dụng HRM (Node.js & Express)
│   ├── Dockerfile                   # Dockerfile non-root user (USER node)
│   ├── package.json                 # Khai báo dependencies (bcryptjs, jsonwebtoken, pg, ...)
│   ├── test/
│   │   └── api.test.js              # Unit tests kiểm tra bcrypt, jwt, logic chấm công
│   └── src/
│       ├── db.js                    # Kết nối PostgreSQL, khởi tạo bảng, indexes, seed
│       ├── logger.js                # Cấu hình Winston JSON log luân chuyển
│       ├── metrics.js               # Khai báo Prometheus metrics (prom-client)
│       ├── server.js                # REST API, JWT authentication, RBAC authorization
│       └── public/                  # Frontend ứng dụng Web HRM
│           ├── index.html           # Giao diện responsive, modal đăng nhập, modal hồ sơ
│           ├── style.css            # Thiết kế hiện đại, bảng màu trực quan
│           └── app.js               # Logic frontend, Chart.js, xử lý JWT, phân trang
├── nginx/                           # Cấu hình Reverse Proxy Nginx
│   ├── default.conf                 # Cấu hình HTTP :80, HTTPS :443, SSL, Rate Limit
│   └── ssl/                         # Chứng chỉ SSL/TLS tự ký (cert.pem, key.pem)
├── pgadmin/
│   └── servers.json                 # File cấu hình tự đăng ký kết nối postgres
├── prometheus/
│   └── prometheus.yml               # Cấu hình scrape mục tiêu (app:3000 & postgres-exporter)
├── grafana/
│   └── provisioning/
│       ├── datasources/
│       │   └── datasources.yml      # Tự động nạp Prometheus & Loki
│       └── dashboards/
│           ├── dashboards.yml       # Khai báo thư mục dashboard
│           └── hrm-dashboard.json   # Dashboard hoàn chỉnh trực quan hóa chỉ số & LogQL
├── loki/
│   └── loki-config.yml              # Cấu hình Grafana Loki lưu trữ logs
└── promtail/
    └── promtail-config.yml          # Cấu hình Promtail đọc file log JSON của App
```

---

## 5. HƯỚNG DẪN BUILD VÀ KHỞI CHẠY HỆ THỐNG

### Yêu cầu tiên quyết:
- Máy tính đã cài đặt **Docker Desktop** (hoặc Docker Engine & Compose trên Linux).
- Đã bật ứng dụng Docker Desktop trước khi thực hiện lệnh.

### Bước 1: Sao chép file môi trường (nếu cần tùy chỉnh)
```bash
cp .env.example .env
```

### Bước 2: Khởi chạy toàn bộ hệ thống bằng Docker Compose
Mở PowerShell / Command Prompt tại thư mục dự án (`d:\Thi KTHP`), chạy:
```bash
docker compose up -d --build
```

### Bước 3: Kiểm tra trạng thái hoạt động của các dịch vụ
```bash
docker compose ps
```
*Tất cả 8 container (`hrm-nginx`, `hrm-app`, `hrm-postgres`, `hrm-postgres-exporter`, `hrm-pgadmin`, `hrm-prometheus`, `hrm-grafana`, `hrm-loki`, `hrm-promtail`) phải ở trạng thái **running** hoặc **healthy**.*

---

## 6. HƯỚNG DẪN DEMO CHẤM THI THEO TỪNG TIÊU CHÍ

### Tiêu chí 1: Website Quản lý Nhân sự & Cơ sở dữ liệu (3.0 Điểm)
1. **Đăng nhập & Phân quyền:**
   - Truy cập `http://localhost/`. Hệ thống yêu cầu đăng nhập.
   - Bấm nút **"Admin (admin / Admin@123)"** -> Giao diện kích hoạt quyền Quản trị viên (thấy đầy đủ nút Thêm, Sửa, Xóa nhân viên, cột Mức lương).
   - Thử Đăng xuất -> Bấm **"Nhân viên (an.nguyen / An@123)"** -> Cột mức lương hiển thị `****** (Bảo mật)`, các nút Thao tác quản trị bị ẩn.
2. **Dashboard:**
   - Hiển thị 4 thẻ thống kê trực tiếp từ PostgreSQL.
   - Quan sát 2 biểu đồ Chart.js: Cơ cấu nhân sự theo phòng ban & Thống kê chấm công tuần qua.
3. **Quản lý Nhân viên:**
   - Thử thêm mới nhân viên, xem chi tiết hồ sơ nhân sự, tìm kiếm theo tên/email, lọc theo phòng ban và chuyển trang (phân trang).
4. **Quản lý Phòng ban:**
   - Xem số lượng nhân sự thuộc từng phòng ban.
   - Thử xóa phòng ban đang có nhân viên -> Hệ thống chặn lại và hiển thị cảnh báo ràng buộc nghiệp vụ.
5. **Chấm công:**
   - Thực hiện **Check In** và **Check Out** -> Hệ thống tự động tính số giờ làm việc thực tế (`work_hours`) và phân loại đúng giờ / đi muộn.

### Tiêu chí 2: Cổng Nginx Reverse Proxy & Hardening (1.5 Điểm)
1. **Kiểm tra Ẩn phiên bản Nginx:**
   ```powershell
   curl -I http://localhost/
   ```
   *Kết quả: Header trả về `Server: nginx`, không hiển thị phiên bản chi tiết.*
2. **Kiểm tra Security Headers:**
   *Kết quả curl hiển thị đầy đủ: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`.*
3. **Kiểm tra HTTPS cổng 443:**
   - Mở trình duyệt truy cập `https://localhost/` -> Trang web tải an toàn qua kênh mã hóa TLS 1.2/1.3.
4. **Kiểm tra Rate Limiting (Chống DoS / Brute Force):**
   ```powershell
   for ($i=1; $i -le 40; $i++) { curl -s -o /dev/null -w "%{http_code}`n" http://localhost/ }
   ```
   *Kết quả: Ban đầu trả về mã `200`, khi vượt quá ngưỡng burst cho phép, Nginx lập tức trả về mã `429 Too Many Requests`.*

### Tiêu chí 3: Hệ thống Giám sát Prometheus + Grafana (1.5 Điểm)
1. Mở Prometheus: `http://localhost:9090` -> Vào menu **Status** -> **Targets**:
   - Thấy 2 target: `hrm-app (http://app:3000/metrics)` và `postgres-database (http://postgres-exporter:9187/metrics)` đều hiển thị **UP (Màu xanh)**.
2. Mở Grafana: `http://localhost:3001` -> Vào **Dashboards** -> Chọn **HRM System - Monitoring & LogQL Dashboard**:
   - Panel số lượng nhân viên, phòng ban hoạt động (`hrm_active_employees_count`).
   - Panel lưu lượng Throughput requests (`rate(hrm_http_requests_total[1m])`).
   - Panel độ trễ xử lý P95 Latency.
   - Panel kết nối PostgreSQL (`pg_stat_database_numbackends`).
   - Panel theo dõi các lượt đăng nhập hệ thống (`hrm_auth_attempts_total`).

### Tiêu chí 4: Hệ thống Log Tập trung Loki + Promtail & LogQL (1.5 Điểm)
1. Trong Grafana (`http://localhost:3001`), mở mục **Explore** (Icon la bàn).
2. Chọn Data source: **Loki**.
3. Nhập và chạy các truy vấn **LogQL** mẫu:

| Câu lệnh LogQL | Mục đích demo |
| :--- | :--- |
| `{job="hrm-app"}` | Lấy toàn bộ dòng log stream được Promtail thu thập từ HRM App |
| `{job="hrm-app"} \|= "HTTP Request processed"` | Lọc các request HTTP được xử lý thành công qua Nginx/Express |
| `{job="hrm-app"} \|= "User logged in successfully"` | Truy vết các phiên đăng nhập thành công của người dùng |
| `{job="hrm-app"} \|= "error"` | Lọc và hiển thị tất cả các log phát sinh lỗi |
| `rate({job="hrm-app"}[1m])` | Vẽ biểu đồ tần suất ghi log theo từng phút |

### Tiêu chí 5: Hardening & An toàn Hệ thống (1.5 Điểm)
- **Container Non-Root:** File `app/Dockerfile` chạy với `USER node` (UID 1000) ngăn ngừa nguy cơ container breakout leo thang đặc quyền root trên máy chủ host.
- **Bảo mật Cơ sở dữ liệu:** PostgreSQL chạy trong mạng nội bộ cô lập `hrm-network`, không mở cổng 5432 ra ngoài Internet.
- **Bảo vệ Dữ liệu Nhạy cảm:** Mật khẩu người dùng được băm bằng thuật toán **bcrypt** với salt rounds 10; API không bao giờ trả về chuỗi hash mật khẩu. Mức lương nhân viên chỉ hiển thị cho tài khoản Quản trị viên (ADMIN).
- **Phòng thủ Lớp Mạng:** Nginx chặn đứng tấn công buffer overflow bằng `client_body_buffer_size 128k` và giới hạn `client_max_body_size 10M`.

---

## 7. HƯỚNG DẪN TẠO 3 COMMIT THEO MỐC ĐỀ BÀI

Để hoàn thành tiêu chí quản lý mã nguồn trên Git theo đúng 3 mốc của đề bài, người dùng có thể thực hiện 3 lệnh commit tương ứng sau:

```bash
# Mốc 1: COMMIT 1 — Nginx Reverse Proxy
git add nginx/ docker-compose.yml
git commit -m "feat(commit-1): configure Nginx Reverse Proxy with HTTPS SSL, rate limiting and security headers"

# Mốc 2: COMMIT 2 — Prometheus + Grafana
git add prometheus/ grafana/ docker-compose.yml app/src/metrics.js
git commit -m "feat(commit-2): setup Prometheus scraping with postgres-exporter and automated Grafana dashboard provisioning"

# Mốc 3: COMMIT 3 — Loki + Promtail
git add loki/ promtail/ README.md app/
git commit -m "feat(commit-3): integrate centralized logging with Loki, Promtail and verified LogQL queries"
```

---

## 8. CÁC LỆNH BẢO TRÌ & TROUBLESHOOTING

- Xem log trực tiếp của một dịch vụ:
  ```bash
  docker compose logs -f app
  docker compose logs -f nginx
  docker compose logs -f loki
  ```
- Dừng hệ thống:
  ```bash
  docker compose down
  ```
- Dừng và xóa toàn bộ volume database để nạp mới lại từ đầu:
  ```bash
  docker compose down -v
  ```
- Kiểm tra tính hợp lệ của file cấu hình Docker Compose:
  ```bash
  docker compose config
  ```
- Chạy unit test kiểm tra logic backend:
  ```bash
  cd app && npm test
  ```
