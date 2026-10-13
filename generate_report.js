const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType
} = require('docx');

console.log('Generating comprehensive technical report (.docx)...');

// Helper functions for docx styling
function createHeading1(text) {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    run: { font: 'Calibri', size: 32, bold: true, color: '1F4E78' }
  });
}

function createHeading2(text) {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    run: { font: 'Calibri', size: 26, bold: true, color: '2E75B6' }
  });
}

function createHeading3(text) {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 90 },
    run: { font: 'Calibri', size: 22, bold: true, color: '5B9BD5' }
  });
}

function createPara(text, bold = false, italic = false) {
  return new Paragraph({
    spacing: { before: 60, after: 80, line: 276 },
    children: [
      new TextRun({
        text: text,
        font: 'Calibri',
        size: 22,
        bold: bold,
        italics: italic,
        color: '262626'
      })
    ]
  });
}

function createBullet(text, boldPrefix = '', level = 0) {
  const children = [];
  if (boldPrefix) {
    children.push(new TextRun({ text: boldPrefix + ' ', font: 'Calibri', size: 22, bold: true, color: '1F4E78' }));
  }
  children.push(new TextRun({ text: text, font: 'Calibri', size: 22, color: '262626' }));

  return new Paragraph({
    bullet: { level },
    spacing: { before: 40, after: 60, line: 260 },
    children
  });
}

function createCodeBlock(lines) {
  return lines.map(line => new Paragraph({
    spacing: { before: 20, after: 20 },
    shading: { fill: 'F2F4F7', type: ShadingType.CLEAR },
    children: [
      new TextRun({
        text: line,
        font: 'Consolas',
        size: 19,
        color: '1E293B'
      })
    ]
  }));
}

function createSimpleTable(headers, rows) {
  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: headers.map(h => new TableCell({
        shading: { fill: '1F4E78', type: ShadingType.CLEAR },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: h, font: 'Calibri', size: 20, bold: true, color: 'FFFFFF' })]
        })]
      }))
    }),
    ...rows.map(row => new TableRow({
      children: row.map((cell, idx) => new TableCell({
        shading: { fill: idx % 2 === 0 ? 'F9FAFB' : 'FFFFFF', type: ShadingType.CLEAR },
        children: [new Paragraph({
          children: [new TextRun({ text: cell, font: 'Calibri', size: 20, color: '333333' })]
        })]
      }))
    }))
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  });
}

// Bắt đầu cấu trúc tài liệu Báo cáo KTHP
const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        // ================= TRANG BÌA =================
        new Paragraph({ spacing: { before: 800, after: 200 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: "BỘ GIÁO DỤC VÀ ĐÀO TẠO", font: "Calibri", size: 28, bold: true })
        ]}),
        new Paragraph({ spacing: { before: 0, after: 600 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: "TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN & TRUYỀN THÔNG", font: "Calibri", size: 24, bold: true, color: "1F4E78" })
        ]}),
        new Paragraph({ spacing: { before: 400, after: 200 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", font: "Calibri", size: 22, color: "5B9BD5" })
        ]}),
        new Paragraph({ spacing: { before: 600, after: 200 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: "BÁO CÁO THI KẾT THÚC HỌC PHẦN (KTHP)", font: "Calibri", size: 36, bold: true, color: "C00000" })
        ]}),
        new Paragraph({ spacing: { before: 100, after: 400 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: "HỌC PHẦN: DEVOPS, QUẢN TRỊ HỆ THỐNG & CLOUD COMPUTING", font: "Calibri", size: 26, bold: true, color: "1F4E78" })
        ]}),
        new Paragraph({ spacing: { before: 300, after: 800 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: "ĐỀ TÀI 10: XÂY DỰNG HỆ THỐNG QUẢN LÝ NHÂN SỰ (HRM) HOÀN CHỈNH VỚI DOCKER COMPOSE, POSTGRESQL, NGINX REVERSE PROXY, PROMETHEUS, GRAFANA VÀ LOKI", font: "Calibri", size: 28, bold: true })
        ]}),
        new Paragraph({ spacing: { before: 600, after: 100 }, children: [
          new TextRun({ text: "THÔNG TIN SINH VIÊN THỰC HIỆN:", font: "Calibri", size: 24, bold: true })
        ]}),
        createBullet("[Họ và tên sinh viên]", "Sinh viên thực hiện:"),
        createBullet("[Mã số sinh viên - MSSV]", "Mã số sinh viên:"),
        createBullet("[Tên lớp sinh hoạt / Lớp học phần]", "Lớp học phần:"),
        createBullet("[Họ và tên Giảng viên giảng dạy / Chấm thi]", "Giảng viên hướng dẫn:"),
        createBullet("[Khoa Công nghệ Thông tin / Viễn thông]", "Khoa / Viện đào tạo:"),
        new Paragraph({ spacing: { before: 800, after: 100 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: "Năm học: 2025 - 2026", font: "Calibri", size: 22, italic: true })
        ]}),

        // ================= MỤC LỤC =================
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("MỤC LỤC NỘI DUNG BÁO CÁO"),
        createPara("1. GIỚI THIỆU ĐỀ TÀI VÀ MỤC TIÊU HỆ THỐNG"),
        createPara("2. PHÂN TÍCH YÊU CẦU NGHIỆP VỤ HỆ THỐNG HRM"),
        createPara("3. KIẾN TRÚC TỔNG THỂ VÀ CÔNG NGHỆ SỬ DỤNG"),
        createPara("4. THIẾT KẾ CƠ SỞ DỮ LIỆU POSTGRESQL VÀ RÀNG BUỘC TOÀN VẸN"),
        createPara("5. TRIỂN KHAI VÀ TỐI ƯU HÓA DOCKER COMPOSE MULTI-CONTAINER"),
        createPara("6. NGINX REVERSE PROXY, SECURITY HEADERS VÀ HTTPS SSL TỰ KÝ"),
        createPara("7. HỆ THỐNG GIÁM SÁT CHỈ SỐ THỜI GIAN THỰC (PROMETHEUS & EXPORTERS)"),
        createPara("8. BẢNG ĐIỀU KHIỂN TRỰC QUAN HÓA GRAFANA DASHBOARDS"),
        createPara("9. HỆ THỐNG THU THẬP VÀ PHÂN TÍCH LOG TẬP TRUNG (LOKI, PROMTAIL & LOGQL)"),
        createPara("10. CÁC BIỆN PHÁP HARDENING VÀ BẢO MẬT HỆ THỐNG TOÀN DIỆN"),
        createPara("11. KỊCH BẢN KIỂM THỬ (TEST SCENARIOS) VÀ KẾT QUẢ THỰC NGHIỆM"),
        createPara("12. HƯỚNG DẪN VẬN HÀNH VÀ KỊCH BẢN DEMO BẢO VỆ CHẤM ĐIỂM"),
        createPara("13. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN HỆ THỐNG"),

        // ================= 1. GIỚI THIỆU ĐỀ TÀI =================
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("1. GIỚI THIỆU ĐỀ TÀI VÀ MỤC TIÊU HỆ THỐNG"),
        createHeading2("1.1. Đặt vấn đề"),
        createPara("Trong bối cảnh chuyển đổi số của các tổ chức và doanh nghiệp hiện đại, Hệ thống Quản trị Nguồn nhân lực (Human Resource Management - HRM) đóng vai trò then chốt trong việc quản lý hồ sơ nhân viên, tổ chức phòng ban và giám sát tính tuân thủ làm việc qua hoạt động điểm danh, chấm công. Bên cạnh các tính năng ứng dụng, khía cạnh kỹ thuật vận hành (DevOps), khả năng tự phục hồi, bảo mật thông tin và tính minh bạch trong việc giám sát hệ thống là tiêu chí tiên quyết."),
        createPara("Đề tài 10 đặt ra mục tiêu xây dựng một hệ thống website Quản lý Nhân sự hoàn chỉnh, có khả năng chạy thực tế bằng Docker Compose trên môi trường máy tính, kết nối cơ sở dữ liệu quan hệ PostgreSQL 16 bền vững, cổng truy cập an toàn qua Nginx Reverse Proxy, cùng cụm giám sát chỉ số (Prometheus, Postgres Exporter, Grafana) và cụm quản lý log tập trung (Loki, Promtail, LogQL)."),

        createHeading2("1.2. Mục tiêu kỹ thuật cụ thể"),
        createBullet("Xây dựng website HRM có đầy đủ giao diện người dùng hiện đại, responsive, trực quan, hỗ trợ tiếng Việt.", "Ứng dụng nghiệp vụ:"),
        createBullet("Phân quyền 2 vai trò chặt chẽ: Quản trị viên (ADMIN) và Nhân viên (EMPLOYEE). Mật khẩu mã hóa bảo mật bằng thuật toán bcrypt, phiên làm việc xác thực bằng chuẩn JWT (JSON Web Token).", "Xác thực & Bảo mật:"),
        createBullet("PostgreSQL 16 được cấu hình chạy cô lập trong Docker network, cơ chế tự động khởi tạo Schema, Indexes, Foreign Keys và Seed dữ liệu mẫu ban đầu.", "Cơ sở dữ liệu:"),
        createBullet("Nginx đứng trước toàn bộ ứng dụng, định tuyến traffic, ẩn phiên bản máy chủ, áp dụng Rate Limiting chống DoS và hỗ trợ HTTPS với chứng chỉ SSL/TLS tự ký.", "Reverse Proxy:"),
        createBullet("Prometheus định kỳ scrape metrics chuẩn từ Node.js App và PostgreSQL Exporter, tự động nạp Dashboard Grafana để hiển thị trực quan Throughput, Latency, CPU, RAM.", "Hạ tầng Giám sát:"),
        createBullet("Promtail thu thập log file JSON của ứng dụng đẩy về Grafana Loki, cho phép thực thi các câu lệnh LogQL truy vết sự kiện và cảnh báo lỗi.", "Quản lý Log tập trung:"),

        // ================= 2. PHÂN TÍCH YÊU CẦU NGHIỆP VỤ =================
        createHeading1("2. PHÂN TÍCH YÊU CẦU NGHIỆP VỤ HỆ THỐNG HRM"),
        createHeading2("2.1. Phân quyền và Bảo mật Vai trò (RBAC)"),
        createSimpleTable(
          ["Vai trò (Role)", "Quyền hạn xem dữ liệu", "Quyền hạn thao tác dữ liệu", "Giao diện hỗ trợ"],
          [
            ["ADMIN (Quản trị viên)", "Toàn quyền xem tất cả thông tin, bao gồm Mức lương (Salary) của toàn bộ nhân viên.", "Thêm, sửa, xóa nhân viên; tạo, sửa, xóa phòng ban; chấm công thủ công và duyệt điểm danh.", "Hiển thị đầy đủ thanh công cụ quản trị, bảng thống kê và các nút hành động."],
            ["EMPLOYEE (Nhân viên)", "Xem danh sách nhân sự (trường Mức lương bị ẩn '******' để bảo vệ quyền riêng tư), xem thông tin của chính mình.", "Chỉ có thể tự điểm danh Check In, Check Out cho chính tài khoản của mình; xem lịch sử chấm công cá nhân.", "Ẩn toàn bộ nút thêm, sửa, xóa nhân viên và phòng ban. Form điểm danh tự chọn tên chính mình."]
          ]
        ),

        createHeading2("2.2. Phân hệ Quản lý Nhân viên (Employee Management)"),
        createPara("Hệ thống hỗ trợ đầy đủ các thao tác CRUD và bộ lọc nâng cao:"),
        createBullet("Mã nhân viên (duy nhất, viết hoa), Họ và tên, Ngày sinh, Giới tính, Email (duy nhất, regex chuẩn), Số điện thoại, Địa chỉ, Phòng ban, Chức vụ, Ngày vào làm, Loại hợp đồng, Mức lương và Trạng thái (ACTIVE, ON_LEAVE, RESIGNED).", "Thông tin lưu trữ:"),
        createBullet("Hỗ trợ tìm kiếm theo Họ tên, Mã nhân viên hoặc Email. Lọc kết hợp theo Phòng ban và Trạng thái làm việc.", "Tìm kiếm & Lọc:"),
        createBullet("Hỗ trợ phân trang phía máy chủ (Server-side Pagination) với các tham số page, limit giúp tối ưu hiệu năng cơ sở dữ liệu khi số lượng nhân sự tăng cao.", "Phân trang:"),
        createBullet("Cung cấp giao diện Popup Dossier trình bày đầy đủ hồ sơ chi tiết của nhân sự được chọn.", "Hồ sơ chi tiết:"),

        createHeading2("2.3. Phân hệ Quản lý Phòng ban (Department Management)"),
        createBullet("Mã phòng ban (duy nhất), Tên phòng ban và Mô tả chức năng nhiệm vụ.", "Thuộc tính:"),
        createBullet("Mỗi thẻ phòng ban hiển thị huy hiệu (Badge) đếm số lượng nhân sự đang làm việc tại phòng ban đó.", "Thống kê tự động:"),
        createBullet("Xem danh sách toàn bộ nhân viên thuộc phòng ban thông qua modal chuyên dụng.", "Xem nhân sự:"),
        createBullet("Áp dụng ràng buộc toàn vẹn cơ sở dữ liệu: Hệ thống chủ động kiểm tra và ngăn chặn việc xóa phòng ban nếu vẫn còn nhân viên đang trực thuộc, bảo vệ dữ liệu nghiệp vụ.", "Ràng buộc an toàn:"),

        createHeading2("2.4. Phân hệ Sổ Chấm công & Điểm danh (Attendance Management)"),
        createBullet("Ghi nhận giờ vào thực tế. Hệ thống tự động so sánh với mốc thời gian quy định (08h15) để đánh dấu trạng thái ĐÚNG GIỜ (PRESENT) hoặc ĐI MUỘN (LATE).", "Điểm danh Check In:"),
        createBullet("Ghi nhận giờ ra thực tế. Kiểm tra tính hợp lệ đảm bảo giờ ra sau giờ vào, tự động tính tổng số giờ làm việc thực tế (work_hours = check_out - check_in).", "Điểm danh Check Out:"),
        createBullet("Lọc theo ngày cụ thể, lọc theo tháng (YYYY-MM) hoặc lọc theo phòng ban.", "Lịch sử & Thống kê:"),
        createBullet("Dành riêng cho Quản trị viên bổ sung hoặc điều chỉnh thời gian điểm danh trong trường hợp nhân viên quên check-in/out.", "Chấm công thủ công:"),

        // ================= 3. KIẾN TRÚC TỔNG THỂ VÀ CÔNG NGHỆ =================
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("3. KIẾN TRÚC TỔNG THỂ VÀ CÔNG NGHỆ SỬ DỤNG"),
        createHeading2("3.1. Danh sách Công nghệ & Phiên bản Lựa chọn"),
        createSimpleTable(
          ["Thành phần kiến trúc", "Công nghệ sử dụng", "Phiên bản lựa chọn", "Vai trò và lý do lựa chọn"],
          [
            ["Backend Runtime", "Node.js", "v20 LTS (Alpine)", "Nhẹ, hiệu năng I/O bất đồng bộ cao, tích hợp tốt với prom-client và winston."],
            ["Web Framework", "Express.js", "v4.19+", "Tối giản, dễ kiểm soát middleware, xử lý định tuyến RESTful và CORS an toàn."],
            ["Frontend UI", "Vanilla JS / Modern CSS / Chart.js", "ES6+ / CSS3 / v4.4", "Giao diện mượt mà, trực quan hóa biểu đồ, không phụ thuộc build phức tạp."],
            ["Cơ sở dữ liệu", "PostgreSQL", "16-alpine", "Hệ quản trị CSDL quan hệ tin cậy, hỗ trợ ACID toàn diện và index mạnh mẽ."],
            ["Quản trị Database", "pgAdmin 4", "8.5", "Giao diện Web GUI trực quan để quản trị bảng, truy vấn SQL và kiểm tra dữ liệu."],
            ["Reverse Proxy", "Nginx", "1.25-alpine", "Cổng vào an toàn duy nhất, cân bằng tải, rate limit, SSL termination, security headers."],
            ["Thu thập Chỉ số", "Prometheus", "v2.51.0", "Hệ thống Time-Series DB tiêu chuẩn thu thập metrics qua mô hình Pull."],
            ["DB Exporter", "postgres-exporter", "v0.15.0", "Chuyển đổi các chỉ số thống kê nội tại của PostgreSQL thành chuẩn Prometheus."],
            ["Trực quan hóa", "Grafana", "10.4.0", "Bảng điều khiển giám sát trực quan hóa cả Metrics (Prometheus) và Logs (Loki)."],
            ["Lưu trữ Log", "Grafana Loki", "2.9.5", "Lưu trữ log phân tán tối ưu dung lượng (chỉ đánh chỉ mục nhãn - label indexing)."],
            ["Agent thu thập Log", "Promtail", "2.9.5", "Đọc các file log JSON của App và đẩy về Loki qua API HTTP Push."]
          ]
        ),

        createHeading2("3.2. Sơ đồ Luồng Yêu cầu (Request Flow Diagram)"),
        createPara("Toàn bộ các yêu cầu từ phía người dùng đều đi qua Nginx Reverse Proxy tại cổng 80 hoặc 443. Nginx thực hiện kiểm tra Rate Limiting và thêm các Security Headers trước khi chuyển tiếp (Reverse Proxy) vào ứng dụng HRM Node.js tại cổng 3000 nội bộ. Ứng dụng Node.js tương tác với PostgreSQL qua kết nối Pool trong mạng Docker nội bộ (hrm-network). Cổng của PostgreSQL hoàn toàn không được công khai ra ngoài host, giúp cô lập dữ liệu tuyệt đối."),

        // ================= 4. THIẾT KẾ CƠ SỞ DỮ LIỆU =================
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("4. THIẾT KẾ CƠ SỞ DỮ LIỆU POSTGRESQL VÀ RÀNG BUỘC TOÀN VẸN"),
        createHeading2("4.1. Sơ đồ Thực thể và Các Bảng Dữ liệu"),
        createPara("Cơ sở dữ liệu hrm_db bao gồm 4 bảng cốt lõi với các mối quan hệ chặt chẽ:"),
        createBullet("departments (id, code, name, description, created_at) - Khóa chính id, ràng buộc UNIQUE cho code.", "Bảng departments:"),
        createBullet("employees (id, code, full_name, birth_date, gender, email, phone, address, position, salary, department_id, joined_date, contract_type, status, created_at) - Khóa ngoại department_id tham chiếu tới departments(id) với ON DELETE RESTRICT.", "Bảng employees:"),
        createBullet("users (id, username, password_hash, role, employee_id, created_at, last_login) - Khóa ngoại employee_id tham chiếu tới employees(id) ON DELETE CASCADE, ràng buộc UNIQUE cho username.", "Bảng users:"),
        createBullet("attendances (id, employee_id, work_date, check_in, check_out, work_hours, status, notes, created_at) - Khóa ngoại employee_id tham chiếu tới employees(id) ON DELETE CASCADE, ràng buộc UNIQUE (employee_id, work_date).", "Bảng attendances:"),

        createHeading2("4.2. Các Chỉ mục (Indexes) Tối ưu hóa"),
        createPara("Để đảm bảo tốc độ phản hồi tối đa khi dữ liệu phát triển lớn, các chỉ mục tìm kiếm thường xuyên được thiết lập sẵn trong quy trình khởi tạo schema:"),
        ...createCodeBlock([
          "CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(code);",
          "CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);",
          "CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department_id);",
          "CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);",
          "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);",
          "CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(work_date);",
          "CREATE INDEX IF NOT EXISTS idx_attendances_emp ON attendances(employee_id);"
        ]),

        createHeading2("4.3. Cơ chế Khởi tạo và Nạp Dữ liệu Mẫu (Seeding)"),
        createPara("Hàm initDB() trong file db.js tự động kiểm tra số lượng bản ghi trong database. Nếu cơ sở dữ liệu trống, hệ thống tự động:"),
        createBullet("Tạo 4 phòng ban: Công nghệ thông tin (IT), Hành chính nhân sự (HR), Kế toán (ACC), Marketing (MKT).", "1. Seed phòng ban:"),
        createBullet("Tạo 5 nhân viên mẫu đại diện đầy đủ các phòng ban và chức danh.", "2. Seed nhân sự:"),
        createBullet("Tạo 3 tài khoản có mật khẩu băm bảo mật bằng bcrypt: admin (ADMIN), an.nguyen (EMPLOYEE), bich.tran (EMPLOYEE).", "3. Seed tài khoản:"),
        createBullet("Tạo dữ liệu chấm công mẫu cho ngày hiện tại.", "4. Seed chấm công:"),

        // ================= 5. TRIỂN KHAI DOCKER COMPOSE =================
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("5. TRIỂN KHAI VÀ TỐI ƯU HÓA DOCKER COMPOSE MULTI-CONTAINER"),
        createHeading2("5.1. Thiết kế Dịch vụ trong docker-compose.yml"),
        createPara("Dự án tổ chức 8 containers dịch vụ được kết nối qua một Docker Network duy nhất 'hrm-network' kiểu bridge:"),
        createBullet("Lưu trữ dữ liệu quan hệ, cấu hình healthcheck pg_isready định kỳ 5 giây, volume bền vững 'postgres_data'.", "1. postgres:"),
        createBullet("Giao diện quản trị web, phụ thuộc 'postgres' với condition: service_healthy.", "2. pgadmin:"),
        createBullet("Exporter trích xuất chỉ số database phục vụ Prometheus giám sát.", "3. postgres-exporter:"),
        createBullet("Ứng dụng cốt lõi Node.js, build từ hardened Dockerfile, volume 'app_logs'.", "4. app:"),
        createBullet("Cổng vào duy nhất mở port 80 và 443, gắn mount cấu hình default.conf và chứng chỉ ssl.", "5. nginx:"),
        createBullet("Thu thập metrics từ app và postgres-exporter, volume 'prometheus_data'.", "6. prometheus:"),
        createBullet("Bảng điều khiển trực quan hóa, tự động mount provisioning datasources và dashboards.", "7. grafana:"),
        createBullet("Lưu trữ và lập chỉ mục logs.", "8. loki:"),
        createBullet("Thu thập file log /var/log/app đẩy về Loki.", "9. promtail:"),

        createHeading2("5.2. Biện pháp Tối ưu hóa Container"),
        createBullet("Tất cả các dịch vụ đều sử dụng tag phiên bản cụ thể (ví dụ: postgres:16-alpine, nginx:1.25-alpine, prom/prometheus:v2.51.0), tuyệt đối tránh dùng tag latest tùy tiện để đảm bảo tính ổn định và tái lập.", "Phiên bản nhất quán:"),
        createBullet("Các dịch vụ như postgres, loki, postgres-exporter không công khai port ra ngoài máy host, ngăn chặn rò rỉ cổng trên Internet.", "Cô lập cổng nội bộ:"),
        createBullet("Dữ liệu quan trọng như cơ sở dữ liệu và chuỗi thời gian của Prometheus được gắn vào named volume độc lập, không mất dữ liệu khi khởi động lại.", "Volume bền vững:"),

        // ================= 6. NGINX REVERSE PROXY =================
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("6. NGINX REVERSE PROXY, SECURITY HEADERS VÀ HTTPS SSL TỰ KÝ"),
        createHeading2("6.1. Cấu hình Cổng vào và Định tuyến"),
        createPara("Nginx đóng vai trò là reverse proxy tiếp nhận toàn bộ traffic từ client tại cổng 80 (HTTP) và cổng 443 (HTTPS), sau đó phân phối lưu lượng:"),
        createBullet("Chuyển tiếp đến http://app:3000 phục vụ giao diện và tài nguyên tĩnh.", "Đường dẫn / :"),
        createBullet("Chuyển tiếp đến http://app:3000/api/ phục vụ các thao tác dữ liệu nghiệp vụ.", "Đường dẫn /api/ :"),
        createBullet("Chuyển tiếp đến http://pgadmin:80/ kèm header X-Script-Name để pgAdmin hoạt động trơn tru phía sau proxy.", "Đường dẫn /pgadmin/ :"),

        createHeading2("6.2. Bộ Quy tắc Bảo mật và Security Headers"),
        ...createCodeBlock([
          "# Ẩn phiên bản máy chủ",
          "server_tokens off;",
          "",
          "# Chống Clickjacking",
          "add_header X-Frame-Options \"SAMEORIGIN\" always;",
          "",
          "# Chống MIME-sniffing",
          "add_header X-Content-Type-Options \"nosniff\" always;",
          "",
          "# Bật bộ lọc XSS của trình duyệt",
          "add_header X-XSS-Protection \"1; mode=block\" always;",
          "",
          "# Kiểm soát chuyển tiếp Referrer",
          "add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;",
          "",
          "# Ép buộc duyệt web an toàn (HTTPS)",
          "add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains\" always;"
        ]),

        createHeading2("6.3. Giới hạn Tốc độ Yêu cầu (Rate Limiting Chống DoS)"),
        createPara("Nginx sử dụng module limit_req_zone để kiểm soát lưu lượng request theo địa chỉ IP:"),
        createBullet("Giới hạn 25 request/giây với dung lượng burst cho phép tối đa 35 request.", "Zone general_limit:"),
        createBullet("Giới hạn 15 request/giây với burst tối đa 20 request đối với các endpoint ghi dữ liệu.", "Zone api_limit:"),
        createBullet("Khi vượt ngưỡng, Nginx lập tức phản hồi mã HTTP 429 Too Many Requests kèm JSON thông báo thân thiện.", "Xử lý vi phạm:"),

        createHeading2("6.4. Hỗ trợ Giao thức HTTPS với Chứng chỉ SSL Tự ký"),
        createPara("Hệ thống sinh sẵn cặp khóa RSA 2048-bit (cert.pem và key.pem) đặt tại thư mục nginx/ssl và kích hoạt trên cổng 443 với giao thức mã hóa hiện đại TLSv1.2 và TLSv1.3. Do sử dụng chứng chỉ tự ký phục vụ demo học tập, trình duyệt sẽ đưa ra cảnh báo bảo mật ban đầu và người dùng có thể chấp nhận tiếp tục an toàn."),

        // ================= 7. HỆ THỐNG GIÁM SÁT PROMETHEUS =================
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("7. HỆ THỐNG GIÁM SÁT CHỈ SỐ THỜI GIAN THỰC (PROMETHEUS & EXPORTERS)"),
        createHeading2("7.1. Cấu hình Scrape Targets trong prometheus.yml"),
        createPara("Prometheus được thiết lập với chu kỳ lấy mẫu (scrape_interval) 5 giây cho toàn hệ thống:"),
        createBullet("Mục tiêu app:3000/metrics (chu kỳ 3s) thu thập metrics của ứng dụng HRM Node.js.", "Target hrm-app:"),
        createBullet("Mục tiêu postgres-exporter:9187 (chu kỳ 5s) thu thập metrics kết nối và giao dịch của PostgreSQL.", "Target postgres-database:"),
        createBullet("Mục tiêu localhost:9090 tự giám sát hiệu năng của chính Prometheus.", "Target prometheus:"),

        createHeading2("7.2. Các Metrics Nghiệp vụ Tùy biến (Custom Application Metrics)"),
        createSimpleTable(
          ["Tên Metric", "Loại Metric", "Labels", "Ý nghĩa giám sát"],
          [
            ["hrm_http_requests_total", "Counter", "method, route, status", "Tổng số lượt request HTTP đến hệ thống theo mã phản hồi."],
            ["hrm_http_request_duration_seconds", "Histogram", "method, route, status", "Đo lường thời gian phân phối độ trễ xử lý của các request."],
            ["hrm_active_employees_count", "Gauge", "-", "Số lượng nhân viên đang ở trạng thái làm việc (ACTIVE)."],
            ["hrm_active_departments_count", "Gauge", "-", "Tổng số lượng phòng ban hiện có trong doanh nghiệp."],
            ["hrm_attendance_actions_total", "Counter", "action", "Tổng số lượt thực hiện Check In hoặc Check Out."],
            ["hrm_auth_attempts_total", "Counter", "status, role", "Số lượt đăng nhập hệ thống thành công hoặc thất bại."]
          ]
        ),

        // ================= 8. GRAFANA DASHBOARDS =================
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("8. BẢNG ĐIỀU KHIỂN TRỰC QUAN HÓA GRAFANA DASHBOARDS"),
        createHeading2("8.1. Cơ chế Tự động Nạp cấu hình (Provisioning)"),
        createPara("Để loại bỏ hoàn toàn các thao tác cấu hình thủ công phức tạp khi triển khai, dự án áp dụng cơ chế Provisioning của Grafana:"),
        createBullet("Tự động đăng ký 2 nguồn dữ liệu mặc định: Prometheus (http://prometheus:9090) và Loki (http://loki:3100).", "Datasources Provisioning:"),
        createBullet("Tự động nạp file dashboard JSON hoàn chỉnh (hrm-dashboard.json) ngay khi container khởi động.", "Dashboards Provisioning:"),
        createBullet("Bật chế độ Anonymous Admin để giảng viên và người chấm thi có thể truy cập dashboard ngay lập tức mà không gặp trở ngại đăng nhập.", "Anonymous Access:"),

        createHeading2("8.2. Danh mục các Panels trên Dashboard HRM System"),
        createBullet("Hiển thị thẻ số lớn về Nhân viên hoạt động, Phòng ban, Lưu lượng Throughput (ops/s) và Lượt chấm công.", "Row 1 - Tổng quan:"),
        createBullet("Biểu đồ đường trực quan hóa Request Rate theo method/route và biểu đồ Histogram P95 Latency.", "Row 2 - Hiệu năng HTTP:"),
        createBullet("Biểu đồ giám sát số lượng Active Connections tới CSDL hrm_db, tần suất commit giao dịch và biểu đồ cột các sự kiện đăng nhập xác thực.", "Row 3 - Database & Auth:"),
        createBullet("Tích hợp trực tiếp bảng Logs Viewer truy vấn từ Loki qua biểu thức {job=\"hrm-app\"}.", "Row 4 - LogQL Live Stream:"),

        // ================= 9. LOKI VÀ PROMTAIL =================
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("9. HỆ THỐNG THU THẬP VÀ PHÂN TÍCH LOG TẬP TRUNG (LOKI, PROMTAIL & LOGQL)"),
        createHeading2("9.1. Kiến trúc Thu thập Log"),
        createPara("Thay vì để các container ghi log tùy tiện ra stdout không có cấu trúc, hệ thống áp dụng chuẩn ghi log JSON hiện đại bằng thư viện Winston:"),
        createBullet("Ứng dụng HRM ghi toàn bộ access log và error log vào file có cấu trúc JSON /var/log/app/app.log với cơ chế xoay vòng (log rotation tối đa 10MB x 5 files).", "Winston File Transport:"),
        createBullet("Promtail mount volume app_logs, đọc nội dung file log, phân tích các trường JSON (timestamp, level, message, method, url, status) và gán nhãn.", "Promtail Scrape Pipeline:"),
        createBullet("Loki tiếp nhận log stream và đánh chỉ mục theo labels, tiết kiệm tài nguyên bộ nhớ và ổ đĩa.", "Loki TSDB Storage:"),

        createHeading2("9.2. Bảng Truy vấn LogQL Mẫu Phục vụ Chấm thi"),
        createSimpleTable(
          ["Mục đích kiểm tra", "Câu lệnh LogQL", "Giải thích chi tiết kết quả"],
          [
            ["Xem toàn bộ stream log của HRM App", "{job=\"hrm-app\"}", "Hiển thị toàn bộ các dòng nhật ký của ứng dụng theo thời gian thực."],
            ["Lọc các HTTP Request được xử lý", "{job=\"hrm-app\"} |= \"HTTP Request processed\"", "Truy vết các request client được ứng dụng phục vụ thành công."],
            ["Truy vết đăng nhập thành công", "{job=\"hrm-app\"} |= \"User logged in successfully\"", "Theo dõi các sự kiện đăng nhập kèm username và role."],
            ["Truy vết thao tác điểm danh", "{job=\"hrm-app\"} |= \"Employee checked in\"", "Kiểm tra sự kiện chấm công check in của nhân viên."],
            ["Lọc các dòng log lỗi", "{job=\"hrm-app\"} |= \"error\"", "Phát hiện và cô lập nhanh chóng các ngoại lệ hoặc sự cố phát sinh."],
            ["Đo tốc độ phát sinh log trên mỗi phút", "rate({job=\"hrm-app\"}[1m])", "Vẽ biểu đồ tần suất phát sinh nhật ký nhằm phát hiện bất thường."]
          ]
        ),

        // ================= 10. HARDENING VÀ BẢO MẬT =================
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("10. CÁC BIỆN PHÁP HARDENING VÀ BẢO MẬT HỆ THỐNG TOÀN DIỆN"),
        createHeading2("10.1. Danh mục 15 Biện pháp Bảo mật Đã Triển khai"),
        createBullet("Dockerfile sử dụng user node (UID 1000) thay vì chạy quyền ROOT, ngăn chặn rủi ro chiếm quyền host nếu xảy ra container breakout.", "1. Container Non-Root:"),
        createBullet("PostgreSQL, Loki và Postgres-exporter chỉ giao tiếp qua mạng nội bộ hrm-network, không công khai cổng ra bên ngoài máy host.", "2. Cô lập Mạng Docker:"),
        createBullet("Tất cả mật khẩu và tài khoản quản trị được đọc từ biến môi trường, cung cấp file .env.example mẫu và đưa .env vào .gitignore.", "3. Quản lý Secret bằng Biến môi trường:"),
        createBullet("Mật khẩu người dùng được băm với thuật toán bcrypt (10 salt rounds), chống lại các cuộc tấn công tra từ điển và rainbow table.", "4. Mã hóa Mật khẩu:"),
        createBullet("Sử dụng JSON Web Token với thuật toán HMAC-SHA256, thời hạn 24h, chứa đầy đủ định danh và vai trò người dùng.", "5. Phiên làm việc JWT:"),
        createBullet("Kiểm tra quyền hạn chặt chẽ tại tầng Backend/API (requireRole middleware), không chỉ ẩn nút trên giao diện người dùng.", "6. Phân quyền RBAC Backend:"),
        createBullet("Mức lương nhân viên chỉ hiển thị cho tài khoản Quản trị viên (ADMIN). Khi nhân viên thường xem danh sách, giá trị lương được che giấu.", "7. Bảo vệ Dữ liệu Nhạy cảm:"),
        createBullet("Nginx ẩn thông tin phiên bản bằng chỉ thị server_tokens off, hạn chế kẻ tấn công khai thác lỗ hổng đã biết.", "8. Ẩn Phiên bản Máy chủ:"),
        createBullet("Áp dụng đầy đủ X-Frame-Options (chống Clickjacking), X-Content-Type-Options (chống MIME sniffing), X-XSS-Protection và HSTS.", "9. Security Headers OWASP:"),
        createBullet("Giới hạn tốc độ request cho cả trang tĩnh và API, ngăn chặn các đợt tấn công DoS và brute-force quét mật khẩu.", "10. Rate Limiting Nginx:"),
        createBullet("Giới hạn client_body_buffer_size 128k và client_max_body_size 10M phòng chống tấn công tràn bộ đệm.", "11. Chống Buffer Overflow:"),
        createBullet("Hỗ trợ kênh truyền mã hóa SSL/TLS trên cổng 443 với các thuật toán mã hóa mạnh.", "12. HTTPS SSL Termination:"),
        createBullet("Kiểm tra định dạng email bằng Regex, chuẩn hóa viết hoa mã NV, ngăn chặn giờ checkout trước checkin.", "13. Kiểm tra Dữ liệu Đầu vào:"),
        createBullet("Middleware ghi log tự động loại bỏ các trường mật khẩu và token, không ghi thông tin nhạy cảm vào ổ đĩa.", "14. Làm sạch Log (Sanitized Logs):"),
        createBullet("Centralized error handling bắt mọi ngoại lệ và chỉ trả về thông báo lỗi thân thiện, không làm lộ stack trace hay cấu trúc mã nguồn.", "15. Che giấu Stack Trace:"),

        createHeading2("10.2. Các Rủi ro Còn lại và Khuyến nghị Triển khai Thực tế"),
        createPara("Mặc dù hệ thống đã triển khai nhiều biện pháp bảo mật nghiêm ngặt, trong môi trường sản xuất thực tế cần lưu ý thêm các điểm sau:"),
        createBullet("Hiện tại sử dụng chứng chỉ SSL tự ký cho mục đích demo; khi đưa vào môi trường Production cần sử dụng chứng chỉ số hợp lệ từ Let's Encrypt hoặc CA uy tín.", "1. Chứng chỉ SSL:"),
        createBullet("Cần tích hợp Web Application Firewall (WAF) như ModSecurity để phòng chống các mẫu tấn công SQL Injection và XSS phức tạp.", "2. WAF nâng cao:"),
        createBullet("Định kỳ xoay vòng JWT Secret và Database Password theo chính sách an toàn thông tin doanh nghiệp.", "3. Xoay vòng khóa bí mật:"),

        // ================= 11. KỊCH BẢN KIỂM THỬ =================
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("11. KỊCH BẢN KIỂM THỬ (TEST SCENARIOS) VÀ KẾT QUẢ THỰC NGHIỆM"),
        createHeading2("11.1. Kết quả Kiểm thử Tự động (Unit Tests)"),
        createPara("Hệ thống tích hợp bộ kiểm thử tự động tại thư mục app/test/api.test.js và chạy qua lệnh npm test. Kết quả thực tế đạt 100% tỷ lệ vượt qua:"),
        createBullet("Kiểm tra băm mật khẩu, so sánh đúng và thất bại khi sai mật khẩu -> KẾT QUẢ: PASSED.", "Test 1 - Bcrypt Password Hashing:"),
        createBullet("Kiểm tra ký token, giải mã payload id, username, role -> KẾT QUẢ: PASSED.", "Test 2 - JWT Signing & Verification:"),
        createBullet("Kiểm tra logic tính tổng số giờ làm việc thực tế -> KẾT QUẢ: PASSED.", "Test 3 - Work Hours Calculation:"),
        createBullet("Kiểm tra biểu thức chính quy xác thực email hợp lệ và chặn email sai định dạng -> KẾT QUẢ: PASSED.", "Test 4 - Email Regex Validation:"),
        createBullet("Kiểm tra phân loại trạng thái chấm công đúng giờ / muộn theo ngưỡng 08h15 -> KẾT QUẢ: PASSED.", "Test 5 - Attendance Classification:"),

        createHeading2("11.2. Bảng Tổng hợp Kết quả Nghiệm thu Hệ thống"),
        createSimpleTable(
          ["Hạng mục kiểm tra", "Trạng thái", "Kết quả thực nghiệm", "Ghi chú nghiệm thu"],
          [
            ["Website HRM", "ĐÃ KIỂM TRA", "Hoạt động đầy đủ tính năng CRUD, phân quyền, phân trang, lọc, Chart.js.", "Giao diện tiếng Việt chuyên nghiệp."],
            ["Cơ sở dữ liệu PostgreSQL", "ĐÃ KIỂM TRA", "Khởi tạo thành công 4 bảng, indexes, ràng buộc khóa ngoại và seed dữ liệu.", "Kết nối nội bộ ổn định qua pool."],
            ["pgAdmin 4", "ĐÃ KIỂM TRA", "Truy cập được qua Nginx proxy tại /pgadmin/, kết nối sẵn database.", "User: admin@hrm.com."],
            ["Docker Compose", "ĐÃ KIỂM TRA", "Cấu hình hợp lệ, 8 containers khởi chạy đồng bộ với healthcheck.", "Cô lập mạng hrm-network."],
            ["Nginx Reverse Proxy", "ĐÃ KIỂM TRA", "Chuyển tiếp chính xác HTTP (port 80) và HTTPS (port 443). Rate limit 429 hoạt động.", "Ẩn server_tokens thành công."],
            ["Prometheus Monitoring", "ĐÃ KIỂM TRA", "Scrape thành công target app:3000/metrics và postgres-exporter:9187.", "Trạng thái targets: UP."],
            ["Grafana Dashboard", "ĐÃ KIỂM TRA", "Tự động nạp Datasources và Dashboard trực quan hóa.", "Anonymous Admin kích hoạt."],
            ["Loki + Promtail", "ĐÃ KIỂM TRA", "Thu thập file log JSON của App đẩy về Loki. Truy vấn LogQL mượt mà.", "5 câu lệnh LogQL demo sẵn sàng."],
            ["Hardening & Security", "ĐÃ KIỂM TRA", "Container non-root, bcrypt, JWT RBAC, ẩn lương, security headers.", "Đáp ứng đầy đủ 15 tiêu chí."]
          ]
        ),

        // ================= 12. HƯỚNG DẪN DEMO =================
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("12. HƯỚNG DẪN VẬN HÀNH VÀ KỊCH BẢN DEMO BẢO VỆ CHẤM ĐIỂM"),
        createHeading2("12.1. Các Bước Khởi động Nhanh"),
        createBullet("Đảm bảo ứng dụng Docker Desktop trên máy chủ Windows đã được khởi động.", "Bước 1:"),
        createBullet("Mở PowerShell tại thư mục dự án và thực thi lệnh: docker compose up -d --build", "Bước 2:"),
        createBullet("Kiểm tra trạng thái các container qua lệnh: docker compose ps", "Bước 3:"),

        createHeading2("12.2. Trình tự Thuyết minh Demo cho Hội đồng Chấm thi"),
        createBullet("Mở trình duyệt truy cập http://localhost/. Đăng nhập bằng tài khoản Quản trị viên (admin / Admin@123) để minh họa toàn bộ quyền hạn. Sau đó chuyển sang tài khoản nhân viên (an.nguyen / An@123) để minh họa tính năng ẩn lương và tự chấm công.", "Bước 1 - Demo Nghiệp vụ HRM:"),
        createBullet("Mở http://localhost/pgadmin/ để chứng minh dữ liệu được lưu trữ thực tế trong bảng PostgreSQL chứ không dùng dữ liệu giả.", "Bước 2 - Demo Cơ sở dữ liệu:"),
        createBullet("Chạy lệnh curl -I http://localhost/ kiểm tra ẩn phiên bản và security headers. Chạy vòng lặp request kiểm tra mã 429 Rate Limiting.", "Bước 3 - Demo Nginx Hardening:"),
        createBullet("Mở Prometheus (:9090) kiểm tra Targets UP. Mở Grafana (:3001) xem các biểu đồ Request Rate, Latency P95, Postgres connections.", "Bước 4 - Demo Giám sát Metrics:"),
        createBullet("Vào mục Explore trên Grafana, chọn Loki và chạy câu lệnh {job=\"hrm-app\"} để xem các dòng nhật ký JSON thời gian thực.", "Bước 5 - Demo Centralized Logs:"),

        // ================= 13. KẾT LUẬN =================
        new Paragraph({ pageBreakBefore: true }),
        createHeading1("13. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN HỆ THỐNG"),
        createHeading2("13.1. Kết luận"),
        createPara("Đề tài 10: Hệ thống Quản lý Nhân sự (HRM) đã được triển khai hoàn chỉnh, bám sát và đáp ứng trọn vẹn 100% các yêu cầu từ đề bài môn học:"),
        createBullet("Ứng dụng web HRM hoạt động ổn định, nghiệp vụ phong phú, bảo mật vai trò nghiêm ngặt.", "Về ứng dụng:"),
        createBullet("Toàn bộ kiến trúc được container hóa bằng Docker Compose với các phiên bản tương thích cao, quản trị mạng cô lập và lưu trữ dữ liệu bền vững.", "Về hạ tầng:"),
        createBullet("Cổng vào Nginx kiên cố với đầy đủ các biện pháp phòng chống tấn công web phổ biến.", "Về mạng & bảo mật:"),
        createBullet("Hệ sinh thái giám sát và quản lý log tiêu chuẩn công nghiệp (Prometheus, Grafana, Loki, Promtail) hoạt động hoàn hảo.", "Về vận hành DevOps:"),

        createHeading2("13.2. Hướng phát triển tiếp theo"),
        createBullet("Nâng cấp từ Docker Compose lên cụm Kubernetes (K8s) với Helm Chart để tăng cường tính sẵn sàng cao (High Availability) và tự động co giãn (Horizontal Pod Autoscaling).", "1. Mở rộng Cụm Kubernetes:"),
        createBullet("Xây dựng quy trình CI/CD hoàn chỉnh tự động quét lỗ hổng mã nguồn (SonarQube) và lỗ hổng hình ảnh container (Trivy) trước khi triển khai.", "2. DevSecOps Pipeline:"),
        createBullet("Tích hợp cơ chế thông báo sự cố qua Slack/Telegram Alertmanager khi có sự cố hệ thống hoặc lượt truy cập bất thường.", "3. Hệ thống Cảnh báo tự động:"),

        new Paragraph({ spacing: { before: 600, after: 100 }, alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: "── HẾT BÁO CÁO KỸ THUẬT ──", font: "Calibri", size: 24, bold: true, color: "1F4E78" })
        ]})
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  const docxPath = path.join(__dirname, 'BAO_CAO_KTHP_DE_10_HRM.docx');
  fs.writeFileSync(docxPath, buffer);
  console.log(`✅ File báo cáo DOCX đã được tạo thành công tại: ${docxPath}`);
}).catch(err => {
  console.error('Error generating docx:', err);
});
