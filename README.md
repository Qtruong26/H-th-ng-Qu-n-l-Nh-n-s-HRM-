# BÁO CÁO KỸ THUẬT & HƯỚNG DẪN TRIỂN KHAI
## ĐỀ 10: HỆ THỐNG QUẢN LÝ NHÂN SỰ (HRM)
**Môn học: Thi Kết thúc học phần (KTHP) - DevOps / Quản trị hệ thống & Cloud**

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

Dự án được xây dựng theo kiến trúc Microservices / Multi-Container hoàn chỉnh và tự động hóa bằng Docker Compose:

* **Ứng dụng chính (HRM App):** Node.js (Express) + Frontend Vanilla JS/CSS hiện đại, đáp ứng đầy đủ nghiệp vụ:
  * Quản lý nhân viên (Thêm, sửa, xóa, tìm kiếm, lọc theo phòng ban).
  * Quản lý phòng ban (Tạo, xóa, đếm số lượng nhân sự).
  * Chấm công & Điểm danh hàng ngày (Check-in, Check-out, phân loại đúng giờ/muộn).
  * Tích hợp sẵn `prom-client` xuất metrics chuẩn tại `/metrics`.
  * Tích hợp `winston` ghi log JSON có cấu trúc.
* **Cơ sở dữ liệu:** PostgreSQL 16 + Giao diện quản trị pgAdmin 4 (tự động khởi tạo schema và nạp sẵn dữ liệu mẫu).
* **Reverse Proxy & Hardening:** Nginx làm cổng vào duy nhất (Port 80), điều hướng traffic, cấu hình Rate Limiting và các Security Headers chống tấn công web.
* **Giám sát (Monitoring):** Prometheus định kỳ scrape metrics từ HRM App -> Hiển thị trực quan trên Grafana Dashboard tự động nạp sẵn.
* **Thu thập Log (Logging):** Promtail thu thập log container gửi về Grafana Loki -> Truy vấn và phân tích thời gian thực bằng ngôn ngữ LogQL.
* **CI/CD & Hardening:** 
  * Dockerfile chạy dưới quyền non-root user (`USER node`).
  * Ẩn phiên bản hệ thống (`server_tokens off`).
  * Pipeline GitHub Actions (`.github/workflows/ci.yml`) tự động kiểm tra code và build image.

---

## 2. BẢNG CỔNG TRUY CẬP VÀ THÔNG TIN TÀI KHOẢN

| Dịch vụ | Địa chỉ URL | Cổng (Port) | Tài khoản / Mật khẩu |
| :--- | :--- | :--- | :--- |
| **HRM Web App (qua Nginx)** | `http://localhost/` | `80` | Không yêu cầu đăng nhập |
| **pgAdmin 4 (qua Nginx Proxy)**| `http://localhost/pgadmin/` | `80` (hoặc `:5050`) | **Email:** `admin@hrm.com`<br>**Password:** `admin123` |
| **PostgreSQL Database** | `localhost:5432` | `5432` | **User:** `hrm_user`<br>**Password:** `hrm_password123`<br>**DB:** `hrm_db` |
| **Grafana Dashboard** | `http://localhost:3001` | `3001` | **User:** `admin`<br>**Password:** `admin` *(Đã bật sẵn Anonymous Admin)* |
| **Prometheus** | `http://localhost:9090` | `9090` | Trực tiếp không cần mật khẩu |
| **HRM App Metrics** | `http://localhost/metrics` | `80` | Endpoint metrics Prometheus |
| **Grafana Loki** | `http://localhost:3100` | `3100` | Cổng lưu trữ log |

---

## 3. HƯỚNG DẪN KHỞI CHẠY (QUAN TRỌNG)

### Bước 1: Khởi động Docker
Hãy đảm bảo **Docker Desktop** trên máy của bạn đã được bật và đang chạy.

### Bước 2: Chạy toàn bộ hệ thống bằng Docker Compose
Mở PowerShell hoặc Command Prompt tại thư mục dự án (`d:\Thi KTHP`), chạy lệnh:

```bash
docker compose up -d --build
```

### Bước 3: Kiểm tra trạng thái các Container
```bash
docker compose ps
```
Tất cả các container (`hrm-app`, `hrm-postgres`, `hrm-pgadmin`, `hrm-nginx`, `hrm-prometheus`, `hrm-grafana`, `hrm-loki`, `hrm-promtail`) phải ở trạng thái `Up` hoặc `running (healthy)`.

---

## 4. KỊCH BẢN DEMO BẢO VỆ ĐỒ ÁN / CHẤM THI

### Kịch bản 1: Demo Chức năng Quản lý Nhân sự (HRM App)
1. Mở trình duyệt truy cập: `http://localhost/`
2. **Tab Tổng quan:**
   * Xem các thẻ thống kê tổng số nhân sự, phòng ban, lượt chấm công.
   * Thử chức năng **Điểm danh nhanh**: Chọn 1 nhân viên -> Bấm **Check In**, sau đó bấm **Check Out**.
3. **Tab Nhân viên:**
   * Bấm **Thêm Nhân viên**: Điền thông tin -> Bấm Lưu (dữ liệu lưu trực tiếp vào PostgreSQL).
   * Thử tìm kiếm theo tên/mã NV và lọc theo phòng ban.
   * Thử sửa và xóa nhân viên.
4. **Tab Phòng ban:**
   * Tạo phòng ban mới (ví dụ: `RND` - Nghiên cứu).
   * Xem số lượng nhân sự tự động liên kết.
5. **Tab Chấm công:**
   * Xem danh sách chấm công trong ngày theo thời gian thực.

---

### Kịch bản 2: Demo Cơ sở dữ liệu PostgreSQL & pgAdmin
1. Mở `http://localhost/pgadmin/` (hoặc `http://localhost:5050`)
2. Đăng nhập: `admin@hrm.com` / `admin123`
3. Thêm kết nối tới DB:
   * **Host:** `postgres`
   * **Port:** `5432`
   * **Database:** `hrm_db`
   * **Username:** `hrm_user`
   * **Password:** `hrm_password123`
4. Vào cây thư mục: `hrm_db` -> `Schemas` -> `public` -> `Tables` -> Xem 3 bảng: `departments`, `employees`, `attendances`.

---

### Kịch bản 3: Demo Nginx Reverse Proxy & Hardening (Tiêu chí điểm cao)

#### a) Kiểm tra Ẩn phiên bản Nginx (`server_tokens off`)
Chạy lệnh curl trong terminal:
```bash
curl -I http://localhost/
```
**Kết quả mong muốn:** Header chỉ hiển thị `Server: nginx` (hoàn toàn không lộ số version như nginx/1.25.x).

#### b) Kiểm tra Security Headers
Quan sát kết quả curl trên, các header bảo mật xuất hiện đầy đủ:
* `X-Frame-Options: SAMEORIGIN` (Chống Clickjacking)
* `X-Content-Type-Options: nosniff` (Chống MIME Sniffing)
* `X-XSS-Protection: 1; mode=block` (Chống Cross-Site Scripting)
* `Referrer-Policy: strict-origin-when-cross-origin`

#### c) Kiểm tra Rate Limiting (Chống DoS / Brute Force)
Chạy script gửi nhiều request liên tục:
```powershell
for ($i=1; $i -le 35; $i++) { curl -s -o /dev/null -w "%{http_code}`n" http://localhost/ }
```
**Kết quả mong muốn:** Ban đầu trả về mã `200`, khi vượt quá ngưỡng burst cho phép, Nginx lập tức chặn và trả về mã `429 Too Many Requests`.

---

### Kịch bản 4: Demo Prometheus & Grafana Monitoring
1. Mở Prometheus: `http://localhost:9090` -> Vào menu **Status** -> **Targets**: Thấy target `hrm-app (http://app:3000/metrics)` hiển thị trạng thái **UP (màu xanh)**.
2. Thử truy vấn PromQL:
   * `hrm_http_requests_total` : Tổng số lượt request đến hệ thống.
   * `hrm_active_employees_count` : Số lượng nhân viên đang hoạt động.
3. Mở Grafana: `http://localhost:3001`
   * Vào **Dashboards** -> Chọn **HRM System - Monitoring & LogQL Dashboard** (đã được cấu hình tự động).
   * Xem các Panel trực quan:
     * Đồng hồ đo Nhân viên & Phòng ban.
     * Biểu đồ thông lượng Request qua thời gian (`Throughput ops/s`).
     * Biểu đồ độ trễ xử lý (`P95 Latency`).

---

### Kịch bản 5: Demo Thu thập Log & Truy vấn LogQL (Loki + Promtail)
1. Trong Grafana (`http://localhost:3001`), vào mục **Explore** (biểu tượng la bàn bên thanh trái).
2. Chọn Data source: **Loki**.
3. Nhập các câu lệnh **LogQL** mẫu để demo cho giảng viên:

| Câu lệnh LogQL | Ý nghĩa giải thích cho giảng viên |
| :--- | :--- |
| `{job="hrm-app"}` | Lấy toàn bộ stream log của HRM App |
| `{job="hrm-app"} \|= "HTTP Request processed"` | Lọc toàn bộ các HTTP requests được xử lý |
| `{job="hrm-app"} \|= "Employee checked in"` | Truy vết các thao tác điểm danh check-in |
| `{job="hrm-app"} \|= "error"` | Lọc và hiển thị các log lỗi |
| `rate({job="hrm-app"}[1m])` | Biểu đồ tính toán tốc độ phát sinh log trên 1 phút |

4. Bấm **Run query** -> Xem các dòng log JSON có nhãn (timestamp, level, method, url, status) hiển thị trực tiếp.

---

### Kịch bản 6: Demo Hardening & An toàn hệ thống
* **Container Non-Root:** Mở `app/Dockerfile`, giải thích việc tạo user `USER node` để tránh container escape chiếm quyền root của máy chủ host.
* **Network Isolation:** Toàn bộ ứng dụng, database, logging chỉ liên lạc qua network nội bộ `hrm-network`, duy nhất cổng 80 của Nginx được mở ra bên ngoài.
* **Tự động phục hồi:** Tất cả container đều có cấu hình `restart: unless-stopped` và healthcheck tự động.

---

### Kịch bản 7: Demo CI/CD với GitHub Actions
1. Mở file `.github/workflows/ci.yml`.
2. Quy trình bao gồm:
   * Checkout mã nguồn.
   * Cài đặt môi trường Node.js 20.
   * Cài đặt dependencies và chạy Unit test.
   * Xác thực cú pháp `docker compose config`.
   * Tự động đóng gói Docker Image `hrm-app:latest`.
3. Khi đẩy code lên GitHub (`git push`), tab **Actions** trên GitHub sẽ tự động kích hoạt và hiển thị tích xanh (Pass).

---

## 5. CÁC LỆNH BẢO TRÌ & QUẢN LÝ DỰ ÁN

* Dừng toàn bộ hệ thống:
  ```bash
  docker compose down
  ```
* Dừng và xóa toàn bộ dữ liệu database để reset từ đầu:
  ```bash
  docker compose down -v
  ```
* Xem log trực tiếp của một dịch vụ:
  ```bash
  docker compose logs -f app
  docker compose logs -f nginx
  ```
