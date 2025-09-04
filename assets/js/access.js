/*
* Access Pages JavaScript (Login & Register)
* PAC Group - Unlock Your Career
* Reusable auth functionality for login and register pages
*/

// Auth Page Configuration
const AuthConfig = {
  API_BASE_URL: 'api/auth', // Đường dẫn tương đối từ root level
  TIMEOUT: 30000,
  DEMO_ACCOUNTS: {
    admin: 'admin123',
    user: 'user123', 
    demo: 'demo123',
    pacgroup: 'pac2025'
  }
};

// Auth Page Helper Functions
const AuthHelpers = {
  
  // Initialize auth page functionality
  init: function(pageType) {
    document.addEventListener('DOMContentLoaded', function() {
      AuthHelpers.setupEventListeners(pageType);
      AuthHelpers.setupAnimations();
      AuthHelpers.focusFirstInput();
      
      if (pageType === 'login') {
        AuthHelpers.showWelcomeToast();
      }
    });
  },

  // Setup event listeners based on page type
  setupEventListeners: function(pageType) {
    const authForm = document.getElementById('authForm');
    const authButton = document.getElementById('authButton');
    const inputs = authForm.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');

    // Main action button click
    authButton.addEventListener('click', function() {
      if (pageType === 'login') {
        AuthHelpers.handleLogin();
      } else if (pageType === 'register') {
        AuthHelpers.handleRegister();
      }
    });

    // Enter key press in input fields
    inputs.forEach(input => {
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          if (pageType === 'login') {
            AuthHelpers.handleLogin();
          } else if (pageType === 'register') {
            AuthHelpers.handleRegister();
          }
        }
      });
    });

    // Forgot password link
    const forgotPasswordLink = document.getElementById('forgotPassword');
    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('Thông báo', 'Chức năng quên mật khẩu sẽ được triển khai sớm.', 'info', 4000);
      });
    }

    // Terms and Privacy links (for register page)
    const termsLink = document.getElementById('termsLink');
    if (termsLink) {
      termsLink.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('Điều khoản sử dụng', 'Trang điều khoản sử dụng đang được cập nhật.', 'info', 4000);
      });
    }

    const privacyLink = document.getElementById('privacyLink');
    if (privacyLink) {
      privacyLink.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('Chính sách bảo mật', 'Trang chính sách bảo mật đang được cập nhật.', 'info', 4000);
      });
    }
  },

  // Handle login functionality
  handleLogin: function() {
    const authForm = document.getElementById('authForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberInput = document.getElementById('remember');

    // Get form data
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const remember = rememberInput ? rememberInput.checked : false;

    // Validate form
    if (!username || !password) {
      showToast('Lỗi đăng nhập', 'Vui lòng nhập đầy đủ thông tin đăng nhập.', 'error', 4000);
      return;
    }

    // Show loading state
    AuthHelpers.setLoadingState(true, 'login');

    // Prepare data for API
    const loginData = {
      username: username,
      password: password,
      remember: remember
    };

    // Make API request
    AuthHelpers.makeAuthRequest('login.php', loginData, 'login');
  },

  // Handle register functionality
  handleRegister: function() {
    const authForm = document.getElementById('authForm');
    
    // Get form data
    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const agree = document.getElementById('agree').checked;
    
    // Basic validation
    let errors = [];
    
    if (!fullname) {
      errors.push('Họ và tên không được để trống');
    } else if (fullname.length < 2) {
      errors.push('Họ và tên phải có ít nhất 2 ký tự');
    }
    
    if (!email) {
      errors.push('Email không được để trống');
    } else if (!AuthHelpers.isValidEmail(email)) {
      errors.push('Email không hợp lệ');
    }
    
    if (!username) {
      errors.push('Tên đăng nhập không được để trống');
    } else if (username.length < 4) {
      errors.push('Tên đăng nhập phải có ít nhất 4 ký tự');
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới');
    }
    
    if (!password) {
      errors.push('Mật khẩu không được để trống');
    } else if (password.length < 6) {
      errors.push('Mật khẩu phải có ít nhất 6 ký tự');
    }
    
    if (password !== confirmPassword) {
      errors.push('Mật khẩu xác nhận không khớp');
    }
    
    if (!agree) {
      errors.push('Bạn phải đồng ý với điều khoản sử dụng');
    }
    
    // Show errors if any
    if (errors.length > 0) {
      showToast('Lỗi đăng ký', errors.join('<br>'), 'error', 6000);
      return;
    }

    // Show loading state
    AuthHelpers.setLoadingState(true, 'register');

    // Prepare registration data
    const registerData = {
      fullname: fullname,
      email: email,
      username: username,
      password: password,
      confirmPassword: confirmPassword,
      agree: agree
    };

    // Make API request
    AuthHelpers.makeAuthRequest('register.php', registerData, 'register');
  },

  // Generic API request function
  makeAuthRequest: function(endpoint, data, type) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${AuthConfig.API_BASE_URL}/${endpoint}`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        AuthHelpers.setLoadingState(false, type);
        AuthHelpers.handleApiResponse(xhr, type);
      }
    };

    xhr.onerror = function() {
      AuthHelpers.setLoadingState(false, type);
      showToast('Lỗi kết nối', 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.', 'error', 5000);
    };

    xhr.ontimeout = function() {
      AuthHelpers.setLoadingState(false, type);
      showToast('Timeout', 'Kết nối timeout. Vui lòng thử lại.', 'warning', 5000);
    };

    xhr.timeout = AuthConfig.TIMEOUT;

    // Send the request
    xhr.send(JSON.stringify(data));
  },

  // Handle API response
  handleApiResponse: function(xhr, type) {
    if (xhr.status === 200 || xhr.status === 201) {
      try {
        const response = JSON.parse(xhr.responseText);
        
        if (response.success) {
          const successMessage = type === 'login' ? 'Đăng nhập thành công!' : 'Đăng ký thành công!';
          showToast('Thành công!', response.message || successMessage, 'success', 2000);
          
          // Store auth data if provided
          if (response.token) {
            localStorage.setItem('auth_token', response.token);
          }
          
          if (response.user || response.data) {
            const userData = response.user || response.data;
            localStorage.setItem('user_info', JSON.stringify(userData));
          }

          // Redirect after success
          setTimeout(() => {
            if (type === 'register') {
              // Redirect to login page after successful registration
              window.location.href = 'dangnhap';
            } else {
              const redirectUrl = response.redirect_url || '/pac-new/';
              window.location.href = redirectUrl;
            }
          }, 1500);
        } else {
          const errorMessage = type === 'login' ? 'Đăng nhập thất bại' : 'Đăng ký thất bại';
          let displayMessage = response.message || `${errorMessage}.`;
          
          // Handle validation errors
          if (response.errors && Array.isArray(response.errors)) {
            displayMessage = response.errors.join('<br>');
          }
          
          showToast(errorMessage, displayMessage, 'error', 5000);
        }
      } catch (e) {
        console.error('JSON Parse Error:', e);
        showToast('Lỗi server', 'Có lỗi xảy ra khi xử lý phản hồi từ server.', 'error', 5000);
      }
    } else if (xhr.status === 400) {
      try {
        const response = JSON.parse(xhr.responseText);
        let displayMessage = response.message || 'Dữ liệu không hợp lệ';
        
        // Handle validation errors
        if (response.errors && Array.isArray(response.errors)) {
          displayMessage = response.errors.join('<br>');
        }
        
        showToast('Dữ liệu không hợp lệ', displayMessage, 'warning', 5000);
      } catch (e) {
        showToast('Dữ liệu không hợp lệ', 'Dữ liệu không hợp lệ.', 'warning', 5000);
      }
    } else if (xhr.status === 401) {
      showToast('Lỗi xác thực', 'Thông tin xác thực không chính xác.', 'error', 5000);
    } else if (xhr.status === 409) {
      try {
        const response = JSON.parse(xhr.responseText);
        showToast('Dữ liệu đã tồn tại', response.message || 'Dữ liệu đã tồn tại trong hệ thống.', 'warning', 5000);
      } catch (e) {
        showToast('Dữ liệu đã tồn tại', 'Dữ liệu đã tồn tại trong hệ thống.', 'warning', 5000);
      }
    } else if (xhr.status === 422) {
      try {
        const response = JSON.parse(xhr.responseText);
        showToast('Dữ liệu không hợp lệ', response.message || 'Dữ liệu không hợp lệ.', 'warning', 5000);
      } catch (e) {
        showToast('Dữ liệu không hợp lệ', 'Dữ liệu không hợp lệ.', 'warning', 5000);
      }
    } else if (xhr.status === 429) {
      showToast('Quá nhiều lần thử', 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.', 'warning', 6000);
    } else if (xhr.status === 0) {
      showToast('Lỗi kết nối', 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.', 'error', 5000);
    } else {
      showToast('Lỗi không xác định', `Có lỗi xảy ra (Mã lỗi: ${xhr.status}). Vui lòng thử lại sau.`, 'error', 5000);
    }
  },

  // Set loading state for buttons and inputs
  setLoadingState: function(isLoading, type) {
    const authButton = document.getElementById('authButton');
    const authForm = document.getElementById('authForm');
    const inputs = authForm.querySelectorAll('input');

    if (isLoading) {
      authButton.classList.add('loading');
      authButton.disabled = true;
      
      if (type === 'login') {
        authButton.textContent = 'Đang đăng nhập...';
      } else if (type === 'register') {
        authButton.textContent = 'Đang đăng ký...';
      }
      
      inputs.forEach(input => input.disabled = true);
    } else {
      authButton.classList.remove('loading');
      authButton.disabled = false;
      
      if (type === 'login') {
        authButton.textContent = 'ĐĂNG NHẬP';
      } else if (type === 'register') {
        authButton.textContent = 'ĐĂNG KÝ';
      }
      
      inputs.forEach(input => input.disabled = false);
    }
  },

  // Focus on first input
  focusFirstInput: function() {
    const firstInput = document.querySelector('#authForm input[type="text"], #authForm input[type="email"]');
    if (firstInput) {
      firstInput.focus();
    }
  },

  // Show welcome toast for login page
  showWelcomeToast: function() {
    setTimeout(() => {
      const accounts = Object.keys(AuthConfig.DEMO_ACCOUNTS).join('/');
      showToast('Chào mừng!', `Bạn có thể test với: ${accounts}`, 'info', 6000);
    }, 500);
  },

  // Setup animations
  setupAnimations: function() {
    // Icon floating animation
    function animateIcon() {
      const icon = document.querySelector('.auth-illustration i');
      if (icon) {
        icon.style.transform = 'translateY(-10px)';
        icon.style.transition = 'transform 2s ease-in-out';
        setTimeout(() => {
          icon.style.transform = 'translateY(0px)';
        }, 2000);
      }
    }

    // Start animation
    setTimeout(animateIcon, 1000);
    setInterval(animateIcon, 6000);
  },

  // Utility function to get form data as object
  getFormData: function(formId) {
    const form = document.getElementById(formId);
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
      data[key] = value.trim();
    }
    
    return data;
  },

  // Utility function to validate email format
  isValidEmail: function(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Utility function to validate password strength
  isStrongPassword: function(password) {
    // At least 6 characters, contains letters and numbers
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;
    return passwordRegex.test(password);
  }
};

// Export for global use
window.AuthHelpers = AuthHelpers;
