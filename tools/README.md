# PAC Migration Tools

Thư mục này chứa các công cụ hỗ trợ migration dữ liệu từ dự án cũ (MongoDB) sang dự án mới (MySQL).

## Danh sách Tools

### 1. create_sql_migrate_questions.py
**Mục đích**: Tạo file SQL migration cho bảng `questions` từ file `questions.json`

**Chức năng**:
- Đọc dữ liệu từ `old-project/db/questions.json`
- Phân loại câu hỏi theo category (personality, activities, subjects, interests)
- Xác định độ khó (easy, medium, hard) dựa vào nội dung
- Tạo file `sql/migrate_questions.sql` với các câu lệnh INSERT
- Cung cấp thống kê chi tiết về dữ liệu

**Cách sử dụng**:
```bash
# Từ thư mục tools
cd tools
python create_sql_migrate_questions.py

# Hoặc từ thư mục gốc
python tools/create_sql_migrate_questions.py
```

**Output**: File `sql/migrate_questions.sql` sẵn sàng để import vào MySQL

**Yêu cầu**:
- Python 3.6+
- File `old-project/db/questions.json` phải tồn tại

## Cấu trúc Thư mục

```
tools/
├── README.md                           # File này
├── create_sql_migrate_questions.py     # Migration tool cho questions
└── [future migration tools]            # Các tools khác sẽ được thêm vào
```

## Kế hoạch Tools Tương lai

1. **create_sql_migrate_users.py** - Migration users từ users.json
2. **create_sql_migrate_results.py** - Migration test results từ results.json  
3. **validate_migration.py** - Kiểm tra tính toàn vẹn dữ liệu sau migration
4. **data_cleanup.py** - Dọn dẹp và tối ưu dữ liệu

## Lưu ý

- Tất cả tools đều hoạt động từ context của thư mục `tools`
- Các đường dẫn được tính từ thư mục gốc của project
- Luôn backup database trước khi chạy migration
- Kiểm tra kết quả migration bằng các query kiểm tra được cung cấp