import os
import re

# Thư mục gốc của dự án
PROJECT_DIR = "path/to/your/project"

# Regex để bắt tất cả console.* và có thể nhiều dòng
# Giải thích:
# - console\.(log|warn|error|info|debug) → bắt console.log, console.warn, etc
# - \(.*?\) → bắt nội dung trong ngoặc, non-greedy
# - re.DOTALL → cho phép match nhiều dòng
CONSOLE_REGEX = re.compile(
    r'^\s*console\.(log|warn|error|info|debug)\s*\((?:[^)(]*|\((?:[^)(]*|\([^)(]*\))*\))*\)\s*;?\s*$',
    re.MULTILINE
)

def clean_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Xóa tất cả console.*
    new_content = CONSOLE_REGEX.sub('', content)

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Đã clean: {file_path}")

def traverse_and_clean(root_dir):
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(('.js', '.html')):
                full_path = os.path.join(dirpath, filename)
                clean_file(full_path)

if __name__ == "__main__":
    traverse_and_clean(PROJECT_DIR)
    print("Hoàn tất việc xóa console.*!")
