## Current tasks
1. Tách biệt logic chọn Unit và Custom Prompt trong quiz generation
2. Sửa backend để lấy chunks từ các unit được chọn
3. Sửa schema userQuizzes để support nhiều unit
4. Loại bỏ code trùng lặp

## Plan
1. Frontend:
   - Tìm và phân tích file gọi API "/api/generate-quiz"
   - Sửa interface request để support unit IDs và optional prompt
   - Cập nhật UI để phản ánh thay đổi logic

2. Backend:
   - Sửa schema database cho userQuizzes
   - Thêm logic lấy chunks từ nhiều unit
   - Tối ưu code trùng lặp

## Steps
1. Frontend:
   - [x] Tìm file gọi API generate quiz
   - [x] Phân tích và sửa request interface
   - [x] Cập nhật UI components
   - [ ] Test các thay đổi

2. Backend:
   - [x] Sửa schema database
   - [x] Implement logic lấy chunks từ nhiều unit
   - [x] Tối ưu code
   - [ ] Test API endpoints

## Things done
- Đã sửa schema QuizRequest để support unit IDs và optional prompt
- Đã cập nhật API endpoint để xử lý unit IDs và optional prompt
- Đã sửa UI component QuizGenerator để cho phép chọn nhiều unit
- Đã thêm schema database mới cho quan hệ quiz-unit
- Đã tạo unit service để xử lý việc lấy dữ liệu từ units
- Đã tối ưu code bằng cách tách logic thành các service riêng biệt
- Đã tạo migration script cho database schema mới

## Things not done yet
- Implement chi tiết hàm get_unit_chunks để lấy dữ liệu từ storage system
- Test các thay đổi

## Next Steps
1. Implement hàm get_unit_chunks:
   - Xác định storage system đang sử dụng cho unit content
   - Implement logic để lấy và xử lý chunks từ storage
   - Thêm caching nếu cần thiết

2. Testing:
   - Test UI cho việc chọn multiple units
   - Test API với các combination khác nhau của units và prompt
   - Test database migration
   - Test relationships giữa quiz và units 