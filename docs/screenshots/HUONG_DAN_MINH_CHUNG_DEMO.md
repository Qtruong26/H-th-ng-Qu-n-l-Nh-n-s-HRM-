# BỘ MINH CHỨNG & HƯỚNG DẪN CHỤP SCREENSHOT (TIÊU CHÍ 7 - ĐỀ 10 HRM)

Tài liệu này hướng dẫn sinh viên chụp và lưu các ảnh chụp màn hình (screenshots) làm minh chứng hoàn thành đầy đủ các tiêu chí khi nộp bài và bảo vệ trước Hội đồng Chấm thi.

---

## DANH SÁCH 7 ẢNH CHỤP MINH CHỨNG CẦN CÓ

### 📸 Ảnh 1: Trạng thái 8 Container hoạt động (`docker compose ps`)
* **Cách thực hiện:** Mở Terminal/PowerShell, gõ lệnh `docker compose ps`
* **Nội dung cần thấy rõ:**
  - Cả 8 service: `hrm-nginx`, `hrm-app`, `hrm-postgres`, `hrm-postgres-exporter`, `hrm-pgadmin`, `hrm-prometheus`, `hrm-grafana`, `hrm-loki`, `hrm-promtail`.
  - Cột `State`: Tất cả đều hiển thị `running` (hoặc `healthy` đối với `postgres`).
* **Tiêu chí đáp ứng:** Tiêu chí 2 & Tiêu chí 7.

---

### 📸 Ảnh 2: Giao diện Web Quản lý Nhân sự (Admin & Employee)
* **Cách thực hiện:**
  1. Mở trình duyệt `http://localhost/`.
  2. Đăng nhập tài khoản Admin (`admin` / `Admin@123`).
  3. Chụp màn hình trang chủ với 4 thẻ thống kê, biểu đồ Chart.js và bảng danh sách nhân viên có đầy đủ cột Mức lương và nút thao tác CRUD.
  4. Đăng nhập tài khoản nhân viên (`an.nguyen` / `An@123`) để chụp minh chứng tính năng che giấu mức lương `****** (Bảo mật)`.
* **Tiêu chí đáp ứng:** Tiêu chí 2 (Ứng dụng hoạt động ổn định).

---

### 📸 Ảnh 3: Quản trị Cơ sở dữ liệu pgAdmin 4
* **Cách thực hiện:**
  1. Mở trình duyệt `http://localhost/pgadmin/` (hoặc `http://localhost:5050`).
  2. Đăng nhập tài khoản `admin@hrm.com` / `Admin@Hrm2026!`.
  3. Mở cây thư mục: `Servers` -> `HRM Database` -> `Databases` -> `hrm_db` -> `Schemas` -> `public` -> `Tables`.
  4. Nhấp chuột phải vào bảng `employees` hoặc `departments` -> Chọn *View/Edit Data* -> *All Rows*.
  5. Chụp màn hình hiển thị danh sách các bản ghi dữ liệu seed thực tế.
* **Tiêu chí đáp ứng:** Tiêu chí 2 (Kết nối DB thành công, pgAdmin hoạt động).

---

### 📸 Ảnh 4: Kiểm tra Nginx HTTPS, Security Headers & Rate Limit
* **Cách thực hiện:**
  1. Mở trình duyệt truy cập `https://localhost/` -> Chụp ổ khóa SSL/TLS màu bảo mật.
  2. Mở PowerShell chạy lệnh kiểm tra security headers và ẩn phiên bản:
     ```powershell
     curl -I http://localhost/
     ```
  3. Chạy lệnh kiểm tra Rate Limiting trả về mã 429:
     ```powershell
     for ($i=1; $i -le 40; $i++) { curl -s -o /dev/null -w "%{http_code}`n" http://localhost/ }
     ```
  4. Chụp màn hình Terminal thấy rõ mã `429 Too Many Requests` và các headers `X-Frame-Options`, `X-Content-Type-Options`, `Server: nginx`.
* **Tiêu chí đáp ứng:** Tiêu chí 3 (Nginx Reverse Proxy & Hardening).

---

### 📸 Ảnh 5: Prometheus Targets UP
* **Cách thực hiện:**
  1. Mở trình duyệt `http://localhost:9090/targets`.
  2. Chụp màn hình hiển thị 2 target màu xanh dương/xanh lá **UP**:
     - `hrm-app (http://app:3000/metrics)`
     - `postgres-database (http://postgres-exporter:9187/metrics)`
* **Tiêu chí đáp ứng:** Tiêu chí 4 (Prometheus thu thập metrics).

---

### 📸 Ảnh 6: Grafana Dashboard (Container / Web / Database)
* **Cách thực hiện:**
  1. Mở trình duyệt `http://localhost:3001/` -> Vào mục **Dashboards** -> Chọn **HRM System - Monitoring & LogQL Dashboard**.
  2. Chụp màn hình bao gồm:
     - **Tài nguyên Container:** Biểu đồ *Container CPU Usage (%)* và *Container RAM & Heap Memory Usage*.
     - **Hiệu năng Web:** Biểu đồ *Request Rate* và *Độ trễ phản hồi (P95 Latency)*.
     - **Cơ sở dữ liệu:** Biểu đồ *PostgreSQL Active Connections* và *Transactions Commits/sec*.
* **Tiêu chí đáp ứng:** Tiêu chí 4 (Grafana có dashboard giám sát đủ container / web / DB).

---

### 📸 Ảnh 7: Truy vấn Log tập trung bằng LogQL trên Loki
* **Cách thực hiện:**
  1. Trong Grafana `http://localhost:3001/`, bấm vào biểu tượng la bàn (**Explore**).
  2. Chọn Datasource: **Loki**.
  3. Nhập câu lệnh LogQL:
     `{job="hrm-app"}` hoặc `{job="hrm-app"} |= "HTTP Request processed"`
  4. Bấm **Run query** và chụp màn hình các dòng log JSON có màu, phân tách `timestamp`, `level`, `service`, `message`.
* **Tiêu chí đáp ứng:** Tiêu chí 5 (Loki + Promtail hoạt động, truy vấn bằng LogQL).
