# PAC Services & Courses - Comprehensive Documentation

> **Tài liệu cập nhật:** Dựa trên tài liệu chính thức từ PAC và phân tích sample data hiện tại  
> **Ngày tạo:** October 3, 2025  
> **Mục đích:** Hướng dẫn implementation và cấu trúc dữ liệu cho hệ thống PAC

---

## 📋 Tổng quan hệ thống

PAC cung cấp 2 loại dịch vụ chính:

### 🎓 **Courses (Khóa học)**
- **Mục đích:** Đào tạo kỹ năng cụ thể
- **Hình thức:** Lớp học có cấu trúc với giảng viên
- **Đặc điểm:** Có curriculum, bài giảng, homework

### 🧭 **Career Guidance Services (Dịch vụ hướng nghiệp)**
- **Mục đích:** Tư vấn và định hướng nghề nghiệp
- **Hình thức:** Đánh giá tâm lý + tư vấn 1:1 với chuyên gia
- **Đặc điểm:** Báo cáo cá nhân hóa, lộ trình phát triển

---

## 🧭 CAREER GUIDANCE SERVICES (Dịch vụ hướng nghiệp)

### 🧠 1. Test Hướng nghiệp PAC

**Loại:** `career_test`  
**Mô tả:** Bài kiểm tra đánh giá tính cách, nhận thức và kỹ năng dựa trên nghiên cứu khoa học

#### 📦 **Gói 1: Khởi động** (Miễn phí)
```yaml
Giá: 0đ
Câu hỏi: 30 câu
Thời gian: 30 phút
Độ tuổi: 14-18 tuổi
Báo cáo: 5 trang
Ngôn ngữ: Tiếng Việt
```

**Nội dung báo cáo:**
- Tổng quan mã tính cách tương ứng với môi trường nghề nghiệp
- Đánh giá điểm mạnh của bản thân
- Gợi ý giá trị cần bồi dưỡng
- Gợi ý về đặc điểm môi trường làm việc phù hợp
- Gợi ý nhóm nghề phù hợp với sở thích

#### 📦 **Gói 2: Tăng tốc** (1.975.000đ)
```yaml
Giá: 1.975.000đ
Câu hỏi: 120 câu
Thời gian: Không giới hạn
Độ tuổi: 14-22 tuổi
Báo cáo: 25-26 trang
Ngôn ngữ: Tiếng Việt
```

**Nội dung báo cáo (mở rộng từ gói Khởi động):**
- Phân tích nhóm tính cách, điểm mạnh và phong cách làm việc đặc trưng
- Đánh giá các lĩnh vực quan tâm và ngành học/lĩnh vực học
- Phân tích vai trò trong công việc và môi trường làm việc phù hợp
- Gợi ý nhóm nghề để phát triển tối đa các mối quan tâm và sở thích
- Hướng dẫn sử dụng công cụ và nguồn tài nguyên phân tích

---

### 👨‍🏫 2. Hướng nghiệp cùng chuyên gia

**Loại:** `consultation`  
**Mô tả:** Tư vấn hướng nghiệp chuyên sâu 1:1 với chuyên gia quốc tế từ IECA, ACAC, CIS

#### 👥 **Đội ngũ chuyên gia**
- **Trình độ:** 10+ năm kinh nghiệm
- **Chứng chỉ:** IECA, ACAC, CIS
- **Chuyên môn:** Tư vấn tâm lý, giáo dục, hướng nghiệp, tuyển sinh đại học
- **Kinh nghiệm:** Làm việc tại trường PTTH Quốc tế và giáo dục đại học

#### 📦 **Gói 1: Học đường** (14.750.000đ)
```yaml
Giá: 14.750.000đ
Độ tuổi: 15-18 tuổi
Bài đánh giá: 3 bài
Buổi tư vấn: 5 buổi 1:1
Ngôn ngữ: Tiếng Anh và Tiếng Việt
```

**Quy trình thực hiện:**
1. **Bước 1:** Thực hiện 3 bài đánh giá trắc nghiệm có bản quyền về:
   - Đánh giá nghề nghiệp
   - Đánh giá sở thích
   - Đánh giá tố chất và năng lực cá nhân
   
2. **Bước 2:** 5 buổi tư vấn 1:1 với chuyên gia về:
   - Các nhóm ngành, nhóm nghề
   - Môn học và công việc phổ biến
   - Đặc thù và xu thế tương lai

**Kết quả nhận được:**
- 3 báo cáo cá nhân hóa:
  - Báo cáo tổng quan về nghề, mức học vấn và bằng cấp
  - Báo cáo năng lực và phẩm chất cá nhân  
  - Báo cáo chuyên sâu về nghề và bộ kỹ năng nghề, ngành tương đương
- Hướng dẫn sử dụng công cụ và nguồn tài nguyên phân tích

#### 📦 **Gói 2: Toàn diện** (24.750.000đ)
```yaml
Giá: 24.750.000đ
Độ tuổi: 14-17 tuổi
Bài đánh giá: 3 bài
Buổi tư vấn: 6 buổi 1:1
Ngôn ngữ: Tiếng Anh và Tiếng Việt
Đặc biệt: Lộ trình 2 giai đoạn
```

**Quy trình thực hiện (5 bước):**
1. **Bước 1:** 3 bài đánh giá trắc nghiệm có bản quyền (giống gói Học đường)

2. **Bước 2:** Tư vấn với chuyên gia về nghề nghiệp và ngành học

3. **Bước 3:** Tư vấn lựa chọn nhóm môn/môn học các chương trình quốc tế:
   - IGCSE
   - A Levels  
   - AP
   - IB

4. **Bước 4:** Học chuyên ngành mô phỏng

5. **Bước 5:** Đánh giá lại bộ kỹ năng, so sánh và báo cáo thay đổi

**Kết quả nhận được (mở rộng từ gói Học đường):**
- Lộ trình 2 giai đoạn hướng nghiệp
- Tư vấn chọn môn học và chương trình quốc tế
- Buổi trao đổi trực tiếp với phụ huynh
- Tổng kết, theo dõi và đánh giá cuối giai đoạn 2

---

## 🎓 COURSES (Khóa học)

### ✍️ 1. Viết luận tăng cường

**Loại:** `course`  
**Danh mục:** `writing`  
**Mô tả:** Hướng dẫn các kỹ thuật viết bài luận học thuật ở các bậc học

#### 👥 **Đối tượng**
- Học sinh PTTH chuẩn bị đi du học
- Học sinh Đại học chuẩn bị đi du học  
- Học sinh PTTH/Đại học chuẩn bị học tại trường Quốc tế tại Việt Nam

#### 📚 **Thông tin khóa học**
```yaml
Thời lượng: 16 giờ
Hình thức: Trực tiếp hoặc trực tuyến
Giảng viên: Thạc sĩ Ngôn ngữ Anh
Ưu đãi: Đăng ký cùng khóa khác hoặc theo nhóm
```

#### 🎯 **Kết quả mong đợi**
- Hiểu các dạng bài luận căn bản, áp dụng kỹ thuật viết hiệu quả
- Hiểu và áp dụng trích dẫn, viết lại ý và tóm tắt
- Biết cách lập luận thuyết phục trên cơ sở dẫn chứng
- Đọc và phân tích, hiểu cấu trúc đoạn văn/bài đọc
- Đánh giá nguồn tài liệu và chọn tài liệu phù hợp
- Hiểu đúng cách trích dẫn để tránh lỗi đạo văn

#### 📖 **Nội dung học**
- Các loại viết học thuật thường gặp
- Cấu trúc bài luận và đoạn văn
- Liên kết ý và cấu trúc câu
- Đánh giá nguồn tài liệu, ghi chú, tóm tắt
- Cách trích dẫn và tránh lỗi đạo văn

#### 💰 **Gói học phí**

**📦 Gói 1: Nhóm 6 học viên** (5.199.000đ ← 6.999.000đ)
```yaml
Giá gốc: 6.999.000đ
Giá ưu đãi: 5.199.000đ
Nhóm: 5-6 học viên
Lịch học: Cố định
Đặc điểm: Giá ưu đãi nhất
```

**📦 Gói 2: Nhóm 4 học viên** (7.600.000đ ← 9.999.000đ)
```yaml
Giá gốc: 9.999.000đ
Giá ưu đãi: 7.600.000đ
Nhóm: 3-4 học viên
Lịch học: Linh hoạt theo sắp xếp
Đặc điểm: Tương tác tốt hơn
```

**📦 Gói 3: Cá nhân 1:1** (19.800.000đ ← 21.000.000đ)
```yaml
Giá gốc: 21.000.000đ
Giá ưu đãi: 19.800.000đ
Nhóm: 1 học viên
Lịch học: Hoàn toàn cá nhân hóa
Đặc điểm: Chất lượng tối ưu, nội dung tùy chỉnh
```

---

### 📝 2. Viết luận chuyên sâu – Essay Coaching

**Loại:** `course`  
**Danh mục:** `writing`  
**Mô tả:** Hướng dẫn hoàn chỉnh 1 bài luận 500-1000 từ theo ý tưởng học sinh tự chọn

#### 👥 **Đối tượng**
- Học sinh chuẩn bị bài luận cá nhân ứng tuyển hồ sơ PTTH và Đại học
- Học sinh chuẩn bị bài luận xin học bổng PTTH và Đại học
- Học sinh chuẩn bị hồ sơ ứng tuyển chương trình hè
- Học sinh chuẩn bị bài luận ứng tuyển cuộc thi viết, dự án nghiên cứu bậc PTTH

#### 📚 **Thông tin khóa học**
```yaml
Thời lượng: 10 giờ (5 buổi)
Hình thức: Trực tiếp hoặc trực tuyến 1:1
Giảng viên: Cử nhân hoặc Thạc sĩ trong và ngoài nước
Áp dụng: 01 bài luận 500-1000 từ
Ưu đãi: Đăng ký cùng khóa khác hoặc theo nhóm
```

#### 🎯 **Kết quả mong đợi**
- Nắm được cấu trúc bài luận
- Biết cách lên ý tưởng và chủ đề dựa trên câu chuyện của chính mình
- Học được cách bố cục một bài luận
- Có bài luận theo tiêu chí và yêu cầu đề bài

#### 📅 **Chương trình học (5 buổi)**

**Buổi 1:** Phân tích hồ sơ cá nhân
- Điểm mạnh, điểm yếu, thành tích đã có
- Tìm kiếm ý tưởng và câu chuyện cho bài luận chính
- Đạo đức trong viết luận và chuẩn bị bộ hồ sơ cá nhân

**Buổi 2:** Phát triển chủ đề
- Phản biện và phân tích tính phù hợp và độc đáo của chủ đề
- Các cách khai thác và triển khai bài luận theo chủ đề
- Cấu trúc đoạn văn và bài văn
- Luyện tập viết bản nháp số 1

**Buổi 3:** Phản hồi nháp 1
- Phân tích và phản hồi bài luận nháp số 1
- Ngữ pháp và từ vựng, khả năng triển khai ý
- Văn phong và thủ pháp văn học
- Hướng dẫn phân tích bài luận mẫu tham khảo

**Buổi 4:** Phản hồi nháp 2  
- Phân tích và phản hồi bài luận nháp số 2
- Ngữ pháp và từ vựng, khả năng triển khai ý
- Văn phong và thủ pháp văn học
- Luyện tập phân tích bài luận mẫu và áp dụng kỹ năng viết nâng cao

**Buổi 5:** Hoàn thiện
- Sự thống nhất về cấu trúc và cách thể hiện của bài luận với toàn bộ hồ sơ xin học
- Hướng dẫn viết bài luận hoàn chỉnh

#### 🏛️ **Cấu trúc bài giảng**
- 📝 Thảo luận
- ✍️ Viết
- ❓ Hỏi đáp  
- 📊 Phân tích tình huống

#### 💰 **Học phí**
> **Lưu ý:** Tài liệu gốc không cung cấp thông tin học phí chi tiết cho khóa này

---

### 💼 3. Xây dựng CV và Hướng dẫn kỹ năng Phỏng vấn

**Loại:** `course`  
**Danh mục:** `career_skills`  
**Mô tả:** Hướng dẫn học sinh có buổi phỏng vấn thành công và gây ấn tượng

#### 👥 **Đối tượng**
- Học sinh chuẩn bị ứng tuyển hồ sơ PTTH và Đại học
- Học sinh chuẩn bị ứng tuyển các cuộc thi/dự án chuyên biệt bậc PTTH và Đại học

#### 📚 **Thông tin khóa học**
```yaml
Thời lượng: 8 giờ
Hình thức: Trực tiếp hoặc trực tuyến 1:1
Giảng viên: Cử nhân hoặc Thạc sĩ trong và ngoài nước
Ưu đãi: Đăng ký cùng khóa khác hoặc theo nhóm
```

#### 🎯 **Kết quả mong đợi**
- Biết cách lên ý tưởng và chủ đề dựa trên câu chuyện của chính mình
- Học được cách bố cục một bài luận
- Học sinh có bài luận theo tiêu chí và yêu cầu đề bài

#### 📖 **Nội dung học**
Hướng dẫn học sinh cách thức để có buổi phỏng vấn thành công và gây ấn tượng

#### 🏛️ **Cấu trúc bài giảng**
- 📝 Thảo luận
- ✍️ Viết  
- ❓ Hỏi đáp
- 📊 Phân tích tình huống

#### 💰 **Gói học phí**

**📦 Gói 1: Cố vấn Thành viên** (9.900.000đ)
```yaml
Giá: 9.900.000đ
Đặc điểm: Tư vấn cơ bản với chuyên gia có kinh nghiệm
Ưu đãi: Đăng ký cùng khóa khác hoặc theo nhóm
```

**📦 Gói 2: Cố vấn Cao cấp** (15.900.000đ)
```yaml
Giá: 15.900.000đ  
Đặc điểm: Tư vấn chuyên sâu với chuyên gia hàng đầu
Ưu đãi: Đăng ký cùng khóa khác hoặc theo nhóm
```

---

## 📊 So sánh Sample Data vs Tài liệu gốc

### ✅ **Các điểm đã đúng**
1. **Test Hướng nghiệp PAC:** Gói Khởi động và Tăng tốc đã chính xác
2. **Khóa Viết luận tăng cường:** Thông tin và các gói học phí đã đúng
3. **Phân loại type:** `career_test`, `course`, `consultation` đã chính xác

### ⚠️ **Các điểm cần cập nhật**

#### 1. **Essay Coaching**
- **Sample data:** Có giá 1.299.000đ → 899.000đ
- **Tài liệu gốc:** Không có thông tin giá cụ thể

#### 2. **CV và Phỏng vấn**  
- **Sample data:** 2 gói (9.900.000đ và 15.900.000đ) ✅ Chính xác
- **Type classification:** Đã được sửa từ `consultation` → `course` ✅

#### 3. **Hướng nghiệp chuyên gia**
- **Sample data:** Có 2 gói (Học đường: 14.750.000đ, Toàn diện: 24.750.000đ) ✅ Chính xác
- **Thông tin chi tiết:** Cần bổ sung thêm thông tin về quy trình và kết quả

### 🔄 **Khuyến nghị cập nhật**

1. **Bổ sung thông tin chi tiết** cho Essay Coaching về giá cả
2. **Cập nhật mô tả đầy đủ** cho các gói Hướng nghiệp chuyên gia
3. **Thêm curriculum chi tiết** cho các khóa học từ tài liệu gốc
4. **Cập nhật learning_outcomes** theo đúng tài liệu

---

## 🏗️ Cấu trúc Database Schema

### **Products Table**
```sql
- type: 'career_test' | 'course' | 'consultation'
- category: 'assessment' | 'writing' | 'career_skills' | 'career_guidance'
```

### **Classification Rules**
- **career_test:** Test Hướng nghiệp PAC
- **course:** Viết luận tăng cường, Essay Coaching, CV & Phỏng vấn
- **consultation:** Hướng nghiệp cùng chuyên gia

### **API Endpoints Usage**
- **courses.html:** `type=course` (3 sản phẩm)
- **solution.html:** `type=career_test` + `type=consultation` (2 sản phẩm)

---

## 📞 **Thông tin liên hệ**
- **Hotline:** 0966013663
- **Hỗ trợ:** Tất cả các gói đều có ưu đãi khi đăng ký combo hoặc nhóm

---

*Tài liệu này sẽ được cập nhật khi có thêm thông tin chi tiết từ PAC.*