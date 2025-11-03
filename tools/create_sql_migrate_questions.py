#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script tạo file SQL migration từ questions.json sang MySQL
Tác giả: PAC Migration System
Ngày tạo: November 2025
"""

import json
import os
from datetime import datetime

def load_questions_json(file_path):
    """Đọc file questions.json từ dự án cũ"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"✅ Đọc thành công {len(data)} câu hỏi từ {file_path}")
        return data
    except FileNotFoundError:
        print(f"❌ Không tìm thấy file: {file_path}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Lỗi định dạng JSON: {e}")
        return None
    except Exception as e:
        print(f"❌ Lỗi đọc file: {e}")
        return None

def categorize_question(question_text, question_id):
    """Phân loại câu hỏi dựa vào nội dung và ID"""
    text = question_text.lower()
    
    # Phân loại theo nội dung câu hỏi
    if any(keyword in text for keyword in ['muốn làm', 'làm việc', 'nghề nghiệp', 'chuyên gia', 'giám đốc', 'trưởng phòng']):
        return 'interests'  # Câu hỏi về sở thích nghề nghiệp
    elif any(keyword in text for keyword in ['thích', 'hứng thú', 'quan tâm', 'yêu', 'tham gia']):
        return 'activities'  # Câu hỏi về hoạt động yêu thích
    elif any(keyword in text for keyword in ['môn học', 'học', 'khoa học', 'toán', 'nghệ thuật']):
        return 'subjects'  # Câu hỏi về môn học
    else:
        return 'personality'  # Câu hỏi về tính cách

def determine_difficulty(question_text, holland_code):
    """Xác định độ khó dựa vào độ phức tạp câu hỏi"""
    text = question_text.lower()
    
    # Câu hỏi dài và phức tạp -> khó
    if len(question_text) > 80 or any(keyword in text for keyword in [
        'phức tạp', 'chuyên sâu', 'trừu tượng', 'logic', 'phân tích'
    ]):
        return 'hard'
    
    # Câu hỏi ngắn và đơn giản -> dễ
    if len(question_text) < 40 or any(keyword in text for keyword in [
        'giỏi', 'thích', 'muốn', 'có phải'
    ]):
        return 'easy'
    
    # Mặc định là trung bình
    return 'medium'

def escape_sql_string(text):
    """Escape ký tự đặc biệt trong SQL string"""
    if not text:
        return text
    
    # Thay thế các ký tự đặc biệt
    text = text.replace("'", "''")  # Single quote
    text = text.replace("\\", "\\\\")  # Backslash
    text = text.replace("\n", "\\n")  # Newline
    text = text.replace("\r", "\\r")  # Carriage return
    text = text.replace("\t", "\\t")  # Tab
    return text

def convert_timestamp(timestamp_str):
    """Chuyển đổi timestamp từ MongoDB format sang MySQL TIMESTAMP"""
    try:
        # Parse timestamp từ format: "2022-07-20 02:19:34.953000"
        dt = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S.%f")
        # Trả về format MySQL TIMESTAMP
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except:
        # Fallback về timestamp hiện tại
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def create_sql_migration(questions_data, output_file):
    """Tạo file SQL migration từ dữ liệu questions"""
    
    # Header của file SQL
    sql_content = f"""-- =====================================================
-- PAC Holland Code Questions Migration
-- =====================================================
-- 
-- File: migrate_questions.sql
-- Mục đích: Migration dữ liệu từ MongoDB questions.json sang MySQL
-- Tạo bởi: create_sql_migrate_questions.py
-- Ngày tạo: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
-- Tổng số câu hỏi: {len(questions_data)}
--
-- HƯỚNG DẪN SỬ DỤNG:
-- 1. Đảm bảo đã chạy create-all-tables.sql trước
-- 2. Chạy file này trong HeidiSQL hoặc MySQL CLI
-- 3. Kiểm tra kết quả: SELECT COUNT(*) FROM questions;
-- =====================================================

-- Bắt đầu transaction để đảm bảo tính toàn vẹn dữ liệu
START TRANSACTION;

-- Xóa dữ liệu cũ nếu có (để có thể chạy lại script)
DELETE FROM questions;

-- Reset AUTO_INCREMENT
ALTER TABLE questions AUTO_INCREMENT = 1;

-- Thêm dữ liệu questions
"""

    # Đếm số lượng theo Holland Code
    holland_stats = {}
    category_stats = {}
    difficulty_stats = {}
    
    # Tạo các câu lệnh INSERT
    sql_content += "\n-- Bắt đầu INSERT dữ liệu\n"
    
    for i, question in enumerate(questions_data, 1):
        # Lấy dữ liệu từ JSON
        question_id = question.get('id', str(i))
        question_text = question.get('question', '')
        holland_code = question.get('code', 'R')
        created_at = question.get('createdAt', '')
        updated_at = question.get('updatedAt', '')
        
        # Xử lý dữ liệu
        category = categorize_question(question_text, question_id)
        difficulty = determine_difficulty(question_text, holland_code)
        
        # Escape SQL strings
        escaped_text = escape_sql_string(question_text)
        
        # Convert timestamps
        mysql_created_at = convert_timestamp(created_at)
        mysql_updated_at = convert_timestamp(updated_at)
        
        # Thống kê
        holland_stats[holland_code] = holland_stats.get(holland_code, 0) + 1
        category_stats[category] = category_stats.get(category, 0) + 1
        difficulty_stats[difficulty] = difficulty_stats.get(difficulty, 0) + 1
        
        # Tạo câu lệnh INSERT
        sql_content += f"""INSERT INTO questions (
    question_id, 
    question_text, 
    holland_code, 
    category, 
    difficulty_level, 
    sort_order, 
    is_active,
    created_at, 
    updated_at
) VALUES (
    '{question_id}',
    '{escaped_text}',
    '{holland_code}',
    '{category}',
    '{difficulty}',
    {question_id},
    1,
    '{mysql_created_at}',
    '{mysql_updated_at}'
);

"""

    # Footer với thống kê
    sql_content += f"""-- =====================================================
-- THỐNG KÊ DỮ LIỆU ĐÃ MIGRATION
-- =====================================================

-- Tổng số câu hỏi: {len(questions_data)}

-- Phân bố theo Holland Code:
"""
    
    for code, count in sorted(holland_stats.items()):
        code_name = {
            'R': 'Realistic (Thực tế)',
            'I': 'Investigative (Nghiên cứu)', 
            'A': 'Artistic (Nghệ thuật)',
            'S': 'Social (Xã hội)',
            'E': 'Enterprising (Doanh nghiệp)',
            'C': 'Conventional (Truyền thống)'
        }.get(code, code)
        sql_content += f"-- {code}: {count} câu ({code_name})\n"
    
    sql_content += f"""
-- Phân bố theo Category:
"""
    for category, count in sorted(category_stats.items()):
        sql_content += f"-- {category}: {count} câu\n"
    
    sql_content += f"""
-- Phân bố theo Difficulty:
"""
    for difficulty, count in sorted(difficulty_stats.items()):
        sql_content += f"-- {difficulty}: {count} câu\n"

    sql_content += f"""
-- Commit transaction
COMMIT;

-- Kiểm tra kết quả
SELECT 
    'Migration hoàn thành!' as status,
    COUNT(*) as total_questions,
    COUNT(DISTINCT holland_code) as unique_holland_codes,
    COUNT(DISTINCT category) as unique_categories
FROM questions;

-- Xem phân bố Holland Code
SELECT 
    holland_code,
    COUNT(*) as question_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM questions), 2) as percentage
FROM questions 
GROUP BY holland_code 
ORDER BY holland_code;

-- Xem phân bố Category  
SELECT 
    category,
    COUNT(*) as question_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM questions), 2) as percentage
FROM questions 
GROUP BY category 
ORDER BY category;

-- =====================================================
-- KẾT THÚC MIGRATION
-- =====================================================
"""

    # Ghi file SQL
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        print(f"✅ Tạo thành công file SQL: {output_file}")
        
        # In thống kê
        print("\n📊 THỐNG KÊ DỮ LIỆU:")
        print(f"Tổng số câu hỏi: {len(questions_data)}")
        print("\nPhân bố Holland Code:")
        for code, count in sorted(holland_stats.items()):
            percentage = (count / len(questions_data)) * 100
            print(f"  {code}: {count} câu ({percentage:.1f}%)")
        
        print("\nPhân bố Category:")
        for category, count in sorted(category_stats.items()):
            percentage = (count / len(questions_data)) * 100
            print(f"  {category}: {count} câu ({percentage:.1f}%)")
            
        print("\nPhân bố Difficulty:")
        for difficulty, count in sorted(difficulty_stats.items()):
            percentage = (count / len(questions_data)) * 100
            print(f"  {difficulty}: {count} câu ({percentage:.1f}%)")
            
        return True
        
    except Exception as e:
        print(f"❌ Lỗi ghi file SQL: {e}")
        return False

def main():
    """Hàm chính"""
    print("🚀 PAC Questions Migration Tool")
    print("=" * 50)
    
    # Đường dẫn file (từ thư mục tools)
    questions_json_path = "../old-project/db/questions.json"
    output_sql_path = "../sql/migrate_questions.sql"
    
    # Kiểm tra file tồn tại
    if not os.path.exists(questions_json_path):
        print(f"❌ Không tìm thấy file: {questions_json_path}")
        print("💡 Đảm bảo bạn đang chạy script từ thư mục tools")
        return
    
    # Tạo thư mục sql nếu chưa có
    os.makedirs("../sql", exist_ok=True)
    
    # Đọc dữ liệu questions
    print("📖 Đang đọc file questions.json...")
    questions_data = load_questions_json(questions_json_path)
    
    if not questions_data:
        print("❌ Không thể đọc dữ liệu questions")
        return
    
    # Tạo file SQL migration
    print("🔄 Đang tạo file SQL migration...")
    success = create_sql_migration(questions_data, output_sql_path)
    
    if success:
        print(f"\n✅ HOÀN THÀNH!")
        print(f"📁 File SQL đã được tạo: {output_sql_path}")
        print(f"📋 Các bước tiếp theo:")
        print(f"   1. Mở HeidiSQL và kết nối database")
        print(f"   2. Chạy file: {output_sql_path}")
        print(f"   3. Kiểm tra: SELECT COUNT(*) FROM questions;")
        print(f"\n💡 Hướng dẫn chạy:")
        print(f"   - Từ thư mục tools: python create_sql_migrate_questions.py")
        print(f"   - Hoặc từ thư mục gốc: python tools/create_sql_migrate_questions.py")
    else:
        print("❌ Có lỗi xảy ra trong quá trình tạo file SQL")

if __name__ == "__main__":
    main()