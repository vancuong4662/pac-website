/**
 * PAC Group Profile Page JavaScript
 * Handles profile management functionality
 */

class ProfileManager {
  constructor() {
    this.profileForm = null;
    this.isLoading = false;
    this.originalData = {};
    
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeProfile());
    } else {
      this.initializeProfile();
    }
  }

  initializeProfile() {
    this.bindEvents();
    this.loadUserProfile();
    this.setupValidation();
  }

  bindEvents() {
    // Save profile button
    const saveBtn = document.getElementById('save-profile-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveProfile());
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancel-profile-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.resetForm());
    }

    // Form input change detection
    const formInputs = document.querySelectorAll('.profile-form input, .profile-form textarea');
    formInputs.forEach(input => {
      input.addEventListener('input', () => this.onFormChange());
    });

    // Form focus effects
    formInputs.forEach(input => {
      input.addEventListener('focus', (e) => this.onInputFocus(e));
      input.addEventListener('blur', (e) => this.onInputBlur(e));
    });
  }

  async loadUserProfile() {
    try {
      this.setLoadingState(true);
      
      // In a real application, this would fetch from API
      // For demo purposes, using localStorage or default data
      const userData = this.getUserDataFromStorage() || this.getDefaultUserData();
      
      this.populateForm(userData);
      this.originalData = { ...userData };
      
    } catch (error) {
      console.error('Error loading profile:', error);
      this.showNotification('Không thể tải thông tin profile. Vui lòng thử lại.', 'error');
    } finally {
      this.setLoadingState(false);
    }
  }

  getUserDataFromStorage() {
    // Check localStorage for user data
    const storedData = localStorage.getItem('pac_user_profile');
    return storedData ? JSON.parse(storedData) : null;
  }

  getDefaultUserData() {
    // Default demo data
    return {
      fullname: 'Nguyen Van A',
      username: 'nguyenvana',
      email: 'nguyenvana@example.com',
      phone: '0123456789',
      birth_date: '1990-01-15',
      address: 'Số 1, Đường ABC, Phường XYZ, Quận 1, TP.HCM',
      status: 'active'
    };
  }

  populateForm(userData) {
    // Populate form fields
    const fields = ['fullname', 'username', 'email', 'phone', 'birth_date', 'address'];
    
    fields.forEach(field => {
      const element = document.getElementById(field);
      if (element && userData[field]) {
        element.value = userData[field];
      }
    });

    // Set status (readonly field)
    const statusField = document.getElementById('status');
    if (statusField) {
      const statusText = this.getStatusText(userData.status);
      statusField.value = statusText;
    }
  }

  getStatusText(status) {
    const statusMap = {
      'active': 'Đang hoạt động',
      'inactive': 'Tạm khóa',
      'banned': 'Bị cấm',
      'pending': 'Chờ xác thực'
    };
    return statusMap[status] || 'Không xác định';
  }

  async saveProfile() {
    if (this.isLoading) return;

    try {
      // Validate form
      if (!this.validateForm()) {
        this.showNotification('Vui lòng kiểm tra lại thông tin đã nhập.', 'warning');
        return;
      }

      this.setLoadingState(true);
      
      // Collect form data
      const formData = this.collectFormData();
      
      // Simulate API call
      await this.saveToAPI(formData);
      
      // Save to localStorage for demo
      this.saveToStorage(formData);
      
      // Update original data
      this.originalData = { ...formData };
      
      this.showNotification('Thông tin profile đã được cập nhật thành công!', 'success');
      
    } catch (error) {
      console.error('Error saving profile:', error);
      this.showNotification('Có lỗi xảy ra khi lưu thông tin. Vui lòng thử lại.', 'error');
    } finally {
      this.setLoadingState(false);
    }
  }

  collectFormData() {
    const fields = ['fullname', 'username', 'email', 'phone', 'birth_date', 'address'];
    const data = {};
    
    fields.forEach(field => {
      const element = document.getElementById(field);
      if (element) {
        data[field] = element.value.trim();
      }
    });

    return data;
  }

  validateForm() {
    let isValid = true;
    
    // Required fields validation
    const requiredFields = [
      { id: 'fullname', name: 'Họ và tên' },
      { id: 'username', name: 'Tên đăng nhập' },
      { id: 'email', name: 'Email' }
    ];

    requiredFields.forEach(field => {
      const element = document.getElementById(field.id);
      if (!element || !element.value.trim()) {
        this.showFieldError(element, `${field.name} là bắt buộc`);
        isValid = false;
      } else {
        this.clearFieldError(element);
      }
    });

    // Email validation
    const emailField = document.getElementById('email');
    if (emailField && emailField.value.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(emailField.value.trim())) {
        this.showFieldError(emailField, 'Email không hợp lệ');
        isValid = false;
      }
    }

    // Phone validation (if provided)
    const phoneField = document.getElementById('phone');
    if (phoneField && phoneField.value.trim()) {
      const phonePattern = /^[0-9]{10,11}$/;
      if (!phonePattern.test(phoneField.value.trim().replace(/\s/g, ''))) {
        this.showFieldError(phoneField, 'Số điện thoại không hợp lệ');
        isValid = false;
      }
    }

    return isValid;
  }

  showFieldError(element, message) {
    if (!element) return;
    
    element.classList.add('is-invalid');
    element.classList.remove('is-valid');
    
    // Remove existing error message
    const existingError = element.parentNode.querySelector('.invalid-feedback');
    if (existingError) {
      existingError.remove();
    }
    
    // Add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback d-block';
    errorDiv.textContent = message;
    element.parentNode.appendChild(errorDiv);
  }

  clearFieldError(element) {
    if (!element) return;
    
    element.classList.remove('is-invalid');
    element.classList.add('is-valid');
    
    const errorMessage = element.parentNode.querySelector('.invalid-feedback');
    if (errorMessage) {
      errorMessage.remove();
    }
  }

  async saveToAPI(data) {
    // Simulate API call delay
    return new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });
  }

  saveToStorage(data) {
    localStorage.setItem('pac_user_profile', JSON.stringify(data));
  }

  resetForm() {
    if (this.isLoading) return;
    
    if (confirm('Bạn có chắc chắn muốn hủy bỏ các thay đổi?')) {
      this.populateForm(this.originalData);
      this.clearAllFieldErrors();
      this.showNotification('Đã khôi phục thông tin ban đầu.', 'info');
    }
  }

  clearAllFieldErrors() {
    const fields = document.querySelectorAll('.profile-form .form-control');
    fields.forEach(field => {
      field.classList.remove('is-invalid', 'is-valid');
    });
    
    const errorMessages = document.querySelectorAll('.profile-form .invalid-feedback');
    errorMessages.forEach(msg => msg.remove());
  }

  setLoadingState(loading) {
    this.isLoading = loading;
    
    const saveBtn = document.getElementById('save-profile-btn');
    const cancelBtn = document.getElementById('cancel-profile-btn');
    const formInputs = document.querySelectorAll('.profile-form input, .profile-form textarea');
    
    if (loading) {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang lưu...';
      }
      if (cancelBtn) cancelBtn.disabled = true;
      
      formInputs.forEach(input => input.disabled = true);
    } else {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Lưu thay đổi';
      }
      if (cancelBtn) cancelBtn.disabled = false;
      
      formInputs.forEach(input => input.disabled = false);
    }
  }

  onFormChange() {
    // Enable save button if data has changed
    const currentData = this.collectFormData();
    const hasChanges = JSON.stringify(currentData) !== JSON.stringify(this.originalData);
    
    const saveBtn = document.getElementById('save-profile-btn');
    if (saveBtn && hasChanges) {
      saveBtn.classList.add('btn-warning');
      saveBtn.classList.remove('btn-primary');
      saveBtn.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Lưu thay đổi';
    } else if (saveBtn) {
      saveBtn.classList.remove('btn-warning');
      saveBtn.classList.add('btn-primary');
      saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Lưu thay đổi';
    }
  }

  onInputFocus(e) {
    const formGroup = e.target.closest('.form-group');
    if (formGroup) {
      formGroup.classList.add('focused');
    }
  }

  onInputBlur(e) {
    const formGroup = e.target.closest('.form-group');
    if (formGroup) {
      formGroup.classList.remove('focused');
    }
  }

  setupValidation() {
    // Real-time validation for email
    const emailField = document.getElementById('email');
    if (emailField) {
      emailField.addEventListener('blur', () => {
        if (emailField.value.trim()) {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (emailPattern.test(emailField.value.trim())) {
            this.clearFieldError(emailField);
          }
        }
      });
    }

    // Real-time validation for phone
    const phoneField = document.getElementById('phone');
    if (phoneField) {
      phoneField.addEventListener('input', (e) => {
        // Allow only numbers and spaces
        e.target.value = e.target.value.replace(/[^\d\s]/g, '');
      });
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = `
      top: 20px;
      right: 20px;
      z-index: 9999;
      min-width: 300px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    `;
    
    notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
}

// Initialize profile manager when page loads
window.addEventListener('load', function() {
  window.profileManager = new ProfileManager();
});

// Export for global access
window.ProfileManager = ProfileManager;
