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
    
    // Ensure sidebar gets updated after profile data is loaded
    setTimeout(() => {
      const sidebarUsername = document.getElementById('sidebar-username');
      if (sidebarUsername && sidebarUsername.textContent === 'Đang tải...' && this.originalData && this.originalData.fullname) {
        if (typeof authChecker !== 'undefined') {
          authChecker.emitAuthStateChange(true, this.originalData);
        }
      }
    }, 2000);
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

    // Refresh profile button
    const refreshBtn = document.getElementById('refresh-profile-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshProfile());
    }

    // Form input change detection
    const formInputs = document.querySelectorAll('.profile-form input, .profile-form textarea');
    formInputs.forEach(input => {
      // Skip readonly fields
      if (!input.readOnly) {
        input.addEventListener('input', () => this.onFormChange());
      }
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
      
      // Fetch user profile from API
      const response = await fetch('api/auth/get-profile.php', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Include cookies for authentication
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        throw new Error('Server returned invalid response format');
      }

      const result = await response.json();

      if (response.ok && result.success) {
        const userData = result.user;
        
        this.populateForm(userData);
        this.originalData = { ...userData };
        
        // Show email verification status
        this.updateEmailVerificationStatus(userData.email_verified);
        
        // Emit auth state change event for sidebar update
        if (typeof authChecker !== 'undefined') {
          authChecker.emitAuthStateChange(true, userData);
        }
        
        // Also emit a specific profile manager ready event
        const profileReadyEvent = new CustomEvent('profileManagerReady', {
          detail: { userData: userData }
        });
        window.dispatchEvent(profileReadyEvent);
        
        // Force trigger sidebar update with direct localStorage
        setTimeout(() => {
          // Ensure user_info is in localStorage
          if (userData) {
            localStorage.setItem('user_info', JSON.stringify(userData));
          }
          
          // Try to call sidebar function directly if it exists
          if (typeof loadUserInfoFromLocalStorage === 'function') {
            loadUserInfoFromLocalStorage();
          } else if (window.loadUserInfoFromLocalStorage) {
            window.loadUserInfoFromLocalStorage();
          }
        }, 500);
      } else {
        // Handle API error
        
        if (response.status === 401) {
          this.showNotification('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'warning');
          // Redirect to login after a delay
          setTimeout(() => {
            if (typeof authChecker !== 'undefined') {
              authChecker.redirectToLogin('Phiên đăng nhập hết hạn');
            } else {
              window.location.href = 'dangnhap';
            }
          }, 2000);
          return;
        } else {
          throw new Error(result.message || 'Không thể tải thông tin profile');
        }
      }
      
    } catch (error) {
      console.error('[Profile] Error loading profile:', error);
      console.error('[Profile] Error stack:', error.stack);
      
      this.showNotification('Không thể tải thông tin profile. Vui lòng thử lại.', 'error');
      
      // Fallback to demo data in case of network error
      console.log('[Profile] Loading fallback data...');
      const fallbackData = this.getUserDataFromStorage() || this.getDefaultUserData();
      this.populateForm(fallbackData);
      this.originalData = { ...fallbackData };
      
      // Even with fallback data, try to emit auth state if we have user info
      if (fallbackData && fallbackData.fullname && typeof authChecker !== 'undefined') {
        authChecker.emitAuthStateChange(true, fallbackData);
      }
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
      if (element) {
        if (userData[field] !== undefined && userData[field] !== null) {
          element.value = userData[field];
        }
      }
    });

    // Set status (readonly field) - use status_text if available
    const statusField = document.getElementById('status');
    if (statusField) {
      const statusText = userData.status_text || this.getStatusText(userData.status);
      statusField.value = statusText;
    }
    
    // Update profile header with user info
    this.updateProfileHeader(userData);
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
      
      // Send to API
      const response = await fetch('api/auth/update-profile.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(formData)
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        throw new Error('Server returned invalid response format');
      }

      const result = await response.json();

      if (response.ok && result.success) {
        // Update original data
        this.originalData = { ...formData };
        
        // Update profile header
        if (result.user) {
          this.updateProfileHeader(result.user);
          
          // Emit auth state change event for sidebar update
          if (typeof authChecker !== 'undefined') {
            authChecker.emitAuthStateChange(true, result.user);
          }
        }
        
        // Save to localStorage for backup
        this.saveToStorage(formData);
        
        this.showNotification('Thông tin profile đã được cập nhật thành công!', 'success');
        
        // Reset form state
        this.onFormChange();
        
      } else {
        // Handle API errors
        console.error('[Profile] Save API Error:', result);
        
        if (response.status === 401) {
          this.showNotification('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'warning');
          setTimeout(() => {
            if (typeof authChecker !== 'undefined') {
              authChecker.redirectToLogin('Phiên đăng nhập hết hạn');
            } else {
              window.location.href = 'dangnhap';
            }
          }, 2000);
        } else if (response.status === 409) {
          this.showNotification('Email này đã được sử dụng bởi tài khoản khác.', 'error');
        } else {
          this.showNotification(result.message || 'Có lỗi xảy ra khi lưu thông tin.', 'error');
        }
      }
      
    } catch (error) {
      console.error('[Profile] Error saving profile:', error);
      console.error('[Profile] Save error stack:', error.stack);
      this.showNotification('Có lỗi mạng xảy ra. Vui lòng thử lại.', 'error');
    } finally {
      this.setLoadingState(false);
    }
  }

  collectFormData() {
    const fields = ['fullname', 'email', 'phone', 'birth_date', 'address'];
    const data = {};
    
    fields.forEach(field => {
      const element = document.getElementById(field);
      if (element) {
        data[field] = element.value.trim();
      }
    });

    return data;
  }

  /**
   * Refresh profile data from server
   */
  async refreshProfile() {
    const refreshBtn = document.getElementById('refresh-profile-btn');
    if (refreshBtn) {
      const originalHTML = refreshBtn.innerHTML;
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      refreshBtn.disabled = true;
    }

    try {
      await this.loadUserProfile();
      this.showNotification('Đã làm mới thông tin profile!', 'success');
    } catch (error) {
      this.showNotification('Không thể làm mới thông tin. Vui lòng thử lại.', 'error');
    } finally {
      if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        refreshBtn.disabled = false;
      }
    }
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
    // Use Toastbar if available, otherwise fallback to custom notification
    if (typeof Toastbar !== 'undefined') {
      // Map types to Toastbar
      const toastTypes = {
        'success': 'success',
        'error': 'error', 
        'warning': 'warning',
        'info': 'info'
      };
      
      const title = type === 'success' ? 'Thành công!' : 
                   type === 'error' ? 'Lỗi!' :
                   type === 'warning' ? 'Cảnh báo!' : 'Thông báo';
      
      Toastbar.show(title, message, toastTypes[type] || 'info');
    } else {
      // Fallback to custom notification
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

  /**
   * Update profile header with user information
   * @param {Object} userData - User data object
   */
  updateProfileHeader(userData) {
    // Update avatar initials
    const avatarCircle = document.querySelector('.profile-avatar .avatar-circle');
    if (avatarCircle && userData.fullname) {
      const initials = this.getInitials(userData.fullname);
      avatarCircle.innerHTML = `<span class="fw-bold fs-4">${initials}</span>`;
    } else {
      console.log('[Profile] Avatar circle not found or no fullname');
    }
    
    // Update profile title if exists
    const profileTitle = document.querySelector('.profile-main-content h3');
    if (profileTitle && userData.fullname) {
      profileTitle.textContent = `Hồ sơ của ${userData.fullname}`;
    }
  }

  /**
   * Get initials from full name
   * @param {string} fullname - Full name
   * @returns {string} Initials
   */
  getInitials(fullname) {
    if (!fullname) return 'U';
    
    const names = fullname.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    const firstInitial = names[0].charAt(0).toUpperCase();
    const lastInitial = names[names.length - 1].charAt(0).toUpperCase();
    return firstInitial + lastInitial;
  }

  /**
   * Update email verification status display
   * @param {boolean} isVerified - Email verification status
   */
  updateEmailVerificationStatus(isVerified) {
    const emailGroup = document.querySelector('#email').closest('.form-group');
    if (!emailGroup) return;
    
    // Remove existing status elements
    const existingStatus = emailGroup.querySelector('.email-status');
    if (existingStatus) {
      existingStatus.remove();
    }
    
    // Create status element
    const statusElement = document.createElement('small');
    statusElement.className = 'email-status mt-1 d-block';
    
    if (isVerified) {
      statusElement.className += ' text-success';
      statusElement.innerHTML = '<i class="fas fa-shield-alt me-1"></i>Email đã được xác thực';
      
      // Update input group text
      const inputGroupText = emailGroup.querySelector('.input-group-text');
      if (inputGroupText) {
        inputGroupText.className = 'input-group-text bg-success text-white';
        inputGroupText.innerHTML = '<i class="fas fa-check-circle"></i>';
      }
    } else {
      statusElement.className += ' text-warning';
      statusElement.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>Email chưa được xác thực';
      
      // Update input group text
      const inputGroupText = emailGroup.querySelector('.input-group-text');
      if (inputGroupText) {
        inputGroupText.className = 'input-group-text bg-warning text-dark';
        inputGroupText.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
      }
    }
    
    // Insert after input group
    const inputGroup = emailGroup.querySelector('.input-group');
    if (inputGroup) {
      inputGroup.insertAdjacentElement('afterend', statusElement);
    }
  }
}

// Initialize profile manager when page loads
window.addEventListener('load', function() {
  window.profileManager = new ProfileManager();
});

// Export for global access
window.ProfileManager = ProfileManager;
