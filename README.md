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
| **pgAdmin 4 (Web DB)** | `http://localhost/pgadmin/` | `80` (Proxy) | **Email:** `admin@hrm.com`<br>**Mật khẩu:** `Admin@Hrm2026!` |
| **Grafana Dashboard** | `http://localhost:3001/` | `3001` | **User:** `admin`<br>**Mật khẩu:** `Grafana@Hrm2026!` *(Đã cấu hình Anonymous Admin)* |
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
├── .env                             # File biến môi trường bảo mật (đã tạo)
├── .env.example                     # File biến môi trường mẫu
├── .gitignore                       # Bỏ qua node_modules, logs, certs, .env
├── .github/
│   └── workflows/
│       └── ci.yml                   # Pipeline GitHub Actions tự động kiểm tra code
├── README.md                        # Tài liệu hướng dẫn kỹ thuật hoàn chỉnh
├── BAO_CAO_KTHP_DE_10_HRM.docx      # Báo cáo kỹ thuật định dạng Word nộp bài
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
│       └── public/                  # Frontend ứng dụng Web HRM (TopCV layout)
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
│           └── hrm-dashboard.json   # Dashboard giám sát đủ: CONTAINER / WEB / DB & LogQL
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

### Bước 1: Khởi chạy toàn bộ hệ thống bằng Docker Compose
Mở PowerShell / Command Prompt tại thư mục dự án (`d:\Thi KTHP`), chạy:
```bash
docker compose up -d --build
```

### Bước 2: Kiểm tra trạng thái hoạt động của các dịch vụ
```bash
docker compose ps
```
*Tất cả 8 container (`hrm-nginx`, `hrm-app`, `hrm-postgres`, `hrm-postgres-exporter`, `hrm-pgadmin`, `hrm-prometheus`, `hrm-grafana`, `hrm-loki`, `hrm-promtail`) phải ở trạng thái **running** hoặc **healthy**.*

---

## 6. HƯỚNG DẪN DEMO BẢO VỆ ĐỦ 7 TIÊU CHÍ ĐÁNH GIÁ (10.0 ĐIỂM)

### Tiêu chí 1: Quản lý mã nguồn trên GitHub (1.5 Điểm)
* **Yêu cầu:** Repository đầy đủ (source + cấu hình), đủ 03 commit và nội dung có ý nghĩa, có README hướng dẫn chạy hệ thống rõ ràng.
* **Minh chứng:**
  - Repo có lịch sử commit chuẩn conventional commit (`feat`, `fix`, `style`).
  - File `README.md` trình bày chi tiết từ kiến trúc, sơ đồ, cổng kết nối tới kịch bản test.
  - Lệnh kiểm tra commit: `git log --oneline -n 10`

### Tiêu chí 2: Triển khai ứng dụng + Database (1.5 Điểm)
* **Yêu cầu:** Ứng dụng chạy ổn định, kết nối DB thành công, có pgAdmin hoạt động.
* **Minh chứng:**
  1. Truy cập `http://localhost/` -> Ứng dụng HRM hiển thị mượt mà.
  2. Đăng nhập Admin (`admin` / `Admin@123`) -> Quản lý nhân viên, phòng ban, chấm công.
  3. Mở pgAdmin: `http://localhost/pgadmin/` (hoặc cổng `http://localhost:5050`)
     - Đăng nhập: `admin@hrm.com` / `Admin@Hrm2026!`
     - Kiểm tra kết nối tới database `hrm_db` -> Xem các bảng `departments`, `employees`, `users`, `attendances` và dữ liệu seed thực tế.

### Tiêu chí 3: Nginx Reverse Proxy (1.5 Điểm)
* **Yêu cầu:** Cấu hình reverse proxy đúng, truy cập website qua Nginx (có HTTPS hoặc security headers cơ bản).
* **Minh chứng:**
  1. **Truy cập qua HTTPS:** Mở trình duyệt vào `https://localhost/` -> Trang tải thành công qua giao thức mã hóa TLS 1.2/1.3 (chứng chỉ SSL/TLS tự ký tại `nginx/ssl/`).
  2. **Kiểm tra Security Headers & Ẩn phiên bản Nginx:**
     ```powershell
     curl -I http://localhost/
     ```
     *Kết quả trả về:* `Server: nginx` (đã ẩn version qua `server_tokens off`), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31536000`.
  3. **Kiểm tra Rate Limiting (Chống DoS/Brute Force):**
     ```powershell
     for ($i=1; $i -le 40; $i++) { curl -s -o /dev/null -w "%{http_code}`n" http://localhost/ }
     ```
     *Kết quả:* Khi vượt quá burst, Nginx trả về mã `429 Too Many Requests`.

### Tiêu chí 4: Hệ thống giám sát Prometheus + Grafana (1.5 Điểm)
* **Yêu cầu:** Prometheus thu thập metrics, Grafana có dashboard giám sát **container / web / DB**.
* **Minh chứng:**
  1. Mở Prometheus: `http://localhost:9090` -> Vào **Status** -> **Targets**: Cả 2 target `hrm-app` và `postgres-database` đều ở trạng thái **UP**.
  2. Mở Grafana: `http://localhost:3001` -> Vào Dashboard **HRM System - Monitoring & LogQL Dashboard**, hội đồng sẽ thấy 3 tầng giám sát riêng biệt:
     - **Giám sát Container:** Panel *Container CPU Usage (%)* và *Container RAM & Heap Memory Usage (RSS Memory)*.
     - **Giám sát Web:** Panel *Lưu lượng Request (Throughput)*, *HTTP Request Rate theo Route & Method*, và *Độ trễ phản hồi (P95 Latency)*.
     - **Giám sát DB:** Panel *PostgreSQL Active Connections* và *Transaction Commits/sec*.

### Tiêu chí 5: Hệ thống log tập trung Loki + Promtail (1.5 Điểm)
* **Yêu cầu:** Loki + Promtail hoạt động, truy vấn được log bằng LogQL (ít nhất 2 – 3 query cơ bản).
* **Minh chứng:**
  1. Trong Grafana (`http://localhost:3001`), mở mục **Explore**, chọn Data source **Loki**.
  2. Thực hiện các câu truy vấn **LogQL** trực tiếp:
     - **Query 1 (Xem luồng log realtime):**
       `{job="hrm-app"}`
     - **Query 2 (Lọc log theo mức độ hoặc từ khóa HTTP/Error):**
       `{job="hrm-app"} |= "HTTP Request processed"`
       hoặc `{job="hrm-app"} |= "error"`
     - **Query 3 (Lọc truy vết đăng nhập người dùng):**
       `{job="hrm-app"} |= "User logged in successfully"`
     - **Query 4 (Vẽ đồ thị tần suất log bằng LogQL):**
       `sum(rate({job="hrm-app"}[1m]))`
  3. Trên dashboard Grafana cũng đã tích hợp sẵn cả panel Stream Log lẫn panel biểu đồ tốc độ ghi log bằng LogQL.

### Tiêu chí 6: Hardening hệ thống (1.5 Điểm)
* **Yêu cầu:** Áp dụng ít nhất 3 – 4 biện pháp bảo mật (non-root container, network isolation, mật khẩu mạnh, security headers, hạn chế quyền DB…).
* **Minh chứng áp dụng 6 biện pháp bảo mật toàn diện:**
  1. **Non-root Container:** `app/Dockerfile` chạy với `USER node` (UID 1000), loại bỏ nguy cơ container breakout chiếm quyền root host.
  2. **Network Isolation:** Mạng `hrm-network` là private bridge. Container PostgreSQL và Loki hoàn toàn không mở cổng ra Host ngoài Internet.
  3. **Mật khẩu mạnh & Băm Bcrypt:** Mật khẩu tài khoản nhân sự được băm bảo mật bằng `bcrypt` (10 rounds); các mật khẩu mặc định đều đạt chuẩn mạnh (`Admin@123`, `Admin@Hrm2026!`, `Grafana@Hrm2026!`).
  4. **Security Headers & Rate Limit:** Nginx thiết lập đầy đủ 6 security headers OWASP và Rate Limiting 25r/s chống tấn công từ chối dịch vụ.
  5. **Hạn chế Quyền DB:** Ứng dụng kết nối DB bằng user nghiệp vụ riêng `hrm_user`, không dùng tài khoản root/superuser `postgres`.
  6. **Chống Leo thang Đặc quyền:** Khai báo `security_opt: ["no-new-privileges:true"]` trong `docker-compose.yml` cho cả container `app` và `nginx`.

### Tiêu chí 7: Tổng thể & Trình bày (1.0 Điểm)
* **Yêu cầu:** Hệ thống chạy hoàn chỉnh bằng docker-compose, demo rõ ràng, có screenshot/minh chứng, chắc kiến thức, hiểu bài.
* **Minh chứng:**
  - Hệ thống khởi động trọn gói 8 container chỉ với 1 lệnh `docker compose up -d`.
  - Có file Báo cáo kỹ thuật chi tiết: `BAO_CAO_KTHP_DE_10_HRM.docx`.
  - Có thư mục hướng dẫn chụp ảnh minh chứng: `docs/screenshots/HUONG_DAN_MINH_CHUNG_DEMO.md`.
  - Nắm vững toàn bộ 11 câu hỏi vấn đáp lý thuyết & kiến trúc chuyên sâu.

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
