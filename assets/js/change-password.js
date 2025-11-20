/**
 * PAC Group Change Password Page JavaScript
 * Handles password change functionality
 */

class ChangePasswordManager {
  constructor() {
    this.isLoading = false;
    
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializePage());
    } else {
      this.initializePage();
    }
  }

  initializePage() {
    this.bindEvents();
    this.setupPasswordToggles();
    this.setupPasswordStrengthChecker();
  }

  bindEvents() {
    // Change password button
    const changePasswordBtn = document.getElementById('change-password-btn');
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', () => this.changePassword());
    }

    // Enter key to submit
    const passwordInputs = document.querySelectorAll('#current-password, #new-password, #confirm-password');
    passwordInputs.forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.changePassword();
        }
      });
    });

    // Real-time password match validation
    const confirmPasswordInput = document.getElementById('confirm-password');
    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', () => this.checkPasswordMatch());
    }
  }

  setupPasswordToggles() {
    // Toggle password visibility for all password fields
    const toggleButtons = [
      { btnId: 'toggle-current-password', inputId: 'current-password' },
      { btnId: 'toggle-new-password', inputId: 'new-password' },
      { btnId: 'toggle-confirm-password', inputId: 'confirm-password' }
    ];

    toggleButtons.forEach(({ btnId, inputId }) => {
      const btn = document.getElementById(btnId);
      const input = document.getElementById(inputId);

      if (btn && input) {
        btn.addEventListener('click', () => {
          const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
          input.setAttribute('type', type);
          
          // Toggle icon
          const icon = btn.querySelector('i');
          if (icon) {
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
          }
        });
      }
    });
  }

  setupPasswordStrengthChecker() {
    const newPasswordInput = document.getElementById('new-password');
    const strengthIndicator = document.getElementById('password-strength');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    if (newPasswordInput && strengthIndicator && strengthBar && strengthText) {
      newPasswordInput.addEventListener('input', (e) => {
        const password = e.target.value;
        
        if (password.length === 0) {
          strengthIndicator.style.display = 'none';
          return;
        }

        strengthIndicator.style.display = 'block';
        
        // Calculate password strength
        const strength = this.calculatePasswordStrength(password);
        
        // Update strength bar
        strengthBar.style.width = `${strength.percentage}%`;
        strengthBar.className = `progress-bar ${strength.colorClass}`;
        
        // Update strength text
        strengthText.textContent = strength.text;
        strengthText.className = `ms-2 fw-semibold ${strength.textClass}`;
      });
    }
  }

  calculatePasswordStrength(password) {
    let score = 0;
    
    // Length check
    if (password.length >= 6) score += 25;
    if (password.length >= 8) score += 25;
    
    // Contains lowercase
    if (/[a-z]/.test(password)) score += 10;
    
    // Contains uppercase
    if (/[A-Z]/.test(password)) score += 15;
    
    // Contains numbers
    if (/\d/.test(password)) score += 15;
    
    // Contains special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
    
    // Determine strength level
    if (score < 40) {
      return {
        percentage: score,
        text: 'Yếu',
        colorClass: 'bg-danger',
        textClass: 'text-danger'
      };
    } else if (score < 70) {
      return {
        percentage: score,
        text: 'Trung bình',
        colorClass: 'bg-warning',
        textClass: 'text-warning'
      };
    } else {
      return {
        percentage: score,
        text: 'Mạnh',
        colorClass: 'bg-success',
        textClass: 'text-success'
      };
    }
  }

  checkPasswordMatch() {
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const confirmInput = document.getElementById('confirm-password');

    if (confirmPassword.length === 0) {
      this.clearFieldError(confirmInput);
      return;
    }

    if (newPassword !== confirmPassword) {
      this.showFieldError(confirmInput, 'Mật khẩu xác nhận không khớp');
    } else {
      this.clearFieldError(confirmInput);
      confirmInput.classList.add('is-valid');
    }
  }

  async changePassword() {
    if (this.isLoading) return;

    try {
      // Validate form
      if (!this.validateForm()) {
        showToast('Cảnh báo!', 'Vui lòng kiểm tra lại thông tin đã nhập.', 'warning', 3000);
        return;
      }

      this.setLoadingState(true);
      
      // Collect form data
      const currentPassword = document.getElementById('current-password').value.trim();
      const newPassword = document.getElementById('new-password').value.trim();
      const confirmPassword = document.getElementById('confirm-password').value.trim();
      
      // Send to API
      const response = await fetch('api/auth/change-password.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Try to get response text for debugging
        const responseText = await response.text();
        console.error('[Change Password] Non-JSON response:', responseText.substring(0, 500));
        throw new Error('Server returned invalid response format. Please check server configuration.');
      }

      const result = await response.json();

      if (response.ok && result.success) {
        showToast('Thành công!', 'Đổi mật khẩu thành công!', 'success', 3000);
        
        // Clear form immediately after successful password change
        this.clearForm();
        
        // Optionally redirect to profile page after a delay
        setTimeout(() => {
          showToast('Thông báo', 'Vui lòng đăng nhập lại với mật khẩu mới.', 'info', 3000);
          
          // Logout and redirect to login
          setTimeout(async () => {
            if (typeof authChecker !== 'undefined') {
              await authChecker.logout(false);
            }
            window.location.href = 'dangnhap';
          }, 2000);
        }, 1500);
        
      } else {
        // Handle API errors
        console.error('[Change Password] API Error:', result);
        
        if (response.status === 401) {
          if (result.error_code === 'INVALID_CURRENT_PASSWORD') {
            showToast('Lỗi!', 'Mật khẩu hiện tại không chính xác.', 'error', 3000);
            const currentPasswordInput = document.getElementById('current-password');
            this.showFieldError(currentPasswordInput, 'Mật khẩu hiện tại không chính xác');
          } else {
            showToast('Cảnh báo!', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'warning', 3000);
            setTimeout(() => {
              if (typeof authChecker !== 'undefined') {
                authChecker.redirectToLogin('Phiên đăng nhập hết hạn');
              } else {
                window.location.href = 'dangnhap';
              }
            }, 2000);
          }
        } else if (response.status === 400) {
          showToast('Lỗi!', result.message || 'Dữ liệu không hợp lệ.', 'error', 3000);
        } else {
          showToast('Lỗi!', result.message || 'Có lỗi xảy ra khi đổi mật khẩu.', 'error', 3000);
        }
      }
      
    } catch (error) {
      console.error('[Change Password] Error:', error);
      console.error('[Change Password] Error stack:', error.stack);
      showToast('Lỗi!', 'Có lỗi mạng xảy ra. Vui lòng thử lại.', 'error', 3000);
    } finally {
      this.setLoadingState(false);
    }
  }

  validateForm() {
    let isValid = true;
    
    // Get all inputs
    const currentPassword = document.getElementById('current-password');
    const newPassword = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');

    // Clear previous errors
    this.clearAllFieldErrors();

    // Validate current password
    if (!currentPassword.value.trim()) {
      this.showFieldError(currentPassword, 'Vui lòng nhập mật khẩu hiện tại');
      isValid = false;
    }

    // Validate new password
    if (!newPassword.value.trim()) {
      this.showFieldError(newPassword, 'Vui lòng nhập mật khẩu mới');
      isValid = false;
    } else if (newPassword.value.trim().length < 6) {
      this.showFieldError(newPassword, 'Mật khẩu mới phải có ít nhất 6 ký tự');
      isValid = false;
    } else if (currentPassword.value.trim() === newPassword.value.trim()) {
      this.showFieldError(newPassword, 'Mật khẩu mới phải khác mật khẩu hiện tại');
      isValid = false;
    }

    // Validate confirm password
    if (!confirmPassword.value.trim()) {
      this.showFieldError(confirmPassword, 'Vui lòng xác nhận mật khẩu mới');
      isValid = false;
    } else if (newPassword.value.trim() !== confirmPassword.value.trim()) {
      this.showFieldError(confirmPassword, 'Mật khẩu xác nhận không khớp');
      isValid = false;
    }

    return isValid;
  }

  showFieldError(element, message) {
    if (!element) return;
    
    element.classList.add('is-invalid');
    element.classList.remove('is-valid');
    
    // Remove existing error message
    const existingError = element.parentNode.parentNode.querySelector('.invalid-feedback');
    if (existingError) {
      existingError.remove();
    }
    
    // Add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback d-block mt-1';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle me-1"></i>${message}`;
    element.parentNode.parentNode.appendChild(errorDiv);
  }

  clearFieldError(element) {
    if (!element) return;
    
    element.classList.remove('is-invalid');
    element.classList.remove('is-valid');
    
    const errorMessage = element.parentNode.parentNode.querySelector('.invalid-feedback');
    if (errorMessage) {
      errorMessage.remove();
    }
  }

  clearAllFieldErrors() {
    const fields = document.querySelectorAll('.change-password-form .form-control');
    fields.forEach(field => {
      field.classList.remove('is-invalid', 'is-valid');
    });
    
    const errorMessages = document.querySelectorAll('.change-password-form .invalid-feedback');
    errorMessages.forEach(msg => msg.remove());
  }

  setLoadingState(loading) {
    this.isLoading = loading;
    
    const changePasswordBtn = document.getElementById('change-password-btn');
    const formInputs = document.querySelectorAll('.change-password-form input');
    const toggleButtons = document.querySelectorAll('[id^="toggle-"]');
    
    if (loading) {
      if (changePasswordBtn) {
        changePasswordBtn.disabled = true;
        changePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Đang xử lý...';
      }
      
      formInputs.forEach(input => input.disabled = true);
      toggleButtons.forEach(btn => btn.disabled = true);
    } else {
      if (changePasswordBtn) {
        changePasswordBtn.disabled = false;
        changePasswordBtn.innerHTML = '<i class="fas fa-shield-alt me-2"></i>Đổi mật khẩu';
      }
      
      formInputs.forEach(input => input.disabled = false);
      toggleButtons.forEach(btn => btn.disabled = false);
    }
  }

  clearForm() {
    // Clear all password inputs
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    
    // Hide password strength indicator
    const strengthIndicator = document.getElementById('password-strength');
    if (strengthIndicator) {
      strengthIndicator.style.display = 'none';
    }
    
    // Clear all errors
    this.clearAllFieldErrors();
    
    // Reset all password fields to hidden
    ['current-password', 'new-password', 'confirm-password'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.setAttribute('type', 'password');
      }
    });
    
    // Reset toggle icons
    ['toggle-current-password', 'toggle-new-password', 'toggle-confirm-password'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = 'fas fa-eye';
        }
      }
    });
  }
}

// Initialize change password manager when page loads
window.addEventListener('load', function() {
  window.changePasswordManager = new ChangePasswordManager();
});

// Export for global access
window.ChangePasswordManager = ChangePasswordManager;
