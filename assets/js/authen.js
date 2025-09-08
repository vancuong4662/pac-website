/**
 * Authentication Helper Module
 * PAC Group - Unlock Your Career
 * Handle authentication status checking and session management
 */

class AuthChecker {
    constructor() {
        this.baseURL = 'api/auth';
        this.redirectDelay = 2000; // 2 seconds
    }

    /**
     * Get cookie value by name
     * @param {string} name - Cookie name
     * @returns {string|null} Cookie value or null if not found
     */
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }

    /**
     * Set cookie with options
     * @param {string} name - Cookie name
     * @param {string} value - Cookie value
     * @param {Object} options - Cookie options
     */
    setCookie(name, value, options = {}) {
        let cookieString = `${name}=${value}`;
        
        if (options.expires) {
            cookieString += `; expires=${options.expires}`;
        }
        if (options.path) {
            cookieString += `; path=${options.path}`;
        }
        if (options.domain) {
            cookieString += `; domain=${options.domain}`;
        }
        if (options.secure) {
            cookieString += `; secure`;
        }
        if (options.httpOnly) {
            cookieString += `; httponly`;
        }
        if (options.sameSite) {
            cookieString += `; samesite=${options.sameSite}`;
        }
        
        document.cookie = cookieString;
    }

    /**
     * Delete cookie by name
     * @param {string} name - Cookie name
     */
    deleteCookie(name) {
        this.setCookie(name, '', {
            expires: 'Thu, 01 Jan 1970 00:00:00 GMT',
            path: '/'
        });
    }

    /**
     * Get user info from cookie
     * @returns {Object|null} User info object or null
     */
    getUserInfo() {
        try {
            const userInfoCookie = this.getCookie('pac_user_info');
            console.log('[AuthChecker] Raw pac_user_info cookie:', userInfoCookie);
            if (userInfoCookie) {
                const parsed = JSON.parse(decodeURIComponent(userInfoCookie));
                console.log('[AuthChecker] Parsed user info:', parsed);
                return parsed;
            }
        } catch (error) {
            console.error('[AuthChecker] Error parsing user info cookie:', error);
        }
        console.log('[AuthChecker] No valid user info found in cookies');
        return null;
    }

    /**
     * Get session token from cookie
     * @returns {string|null} Session token or null
     */
    getSessionToken() {
        const token = this.getCookie('pac_session_token');
        console.log('[AuthChecker] Session token from cookie:', token ? `${token.substring(0, 10)}...` : 'null');
        return token;
    }

    /**
     * Check if user is authenticated locally (quick check)
     * @returns {boolean} True if user appears to be authenticated
     */
    isAuthenticatedLocally() {
        console.log('[AuthChecker] Checking local authentication...');
        
        // Since session token is httpOnly, we can only check user info
        // This is just a quick check - real verification happens on server
        const userInfo = this.getUserInfo();
        
        console.log('[AuthChecker] User info:', userInfo ? userInfo : 'Missing');
        
        // If we have user info, assume we might be authenticated (need server verification)
        const hasUserInfo = !!(userInfo && userInfo.id);
        console.log('[AuthChecker] Local auth result (user info only):', hasUserInfo);
        
        return hasUserInfo;
    }

    /**
     * Verify session token with server
     * @param {string} token - Session token to verify (ignored since we use httpOnly cookie)
     * @returns {Promise<Object>} Verification result
     */
    async verifySession(token = null) {
        console.log('[AuthChecker] Verifying session with server (using httpOnly cookie)...');

        try {
            // Don't send token in body since it's httpOnly - server will read from cookie
            const response = await fetch(`${this.baseURL}/verify-session.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Important: send cookies
                body: JSON.stringify({}) // Empty body - server reads cookie
            });

            const result = await response.json();
            console.log('[AuthChecker] Server verification response:', result);
            
            if (response.ok && result.success && result.authenticated) {
                return {
                    valid: true,
                    user: result.user,
                    message: result.message,
                    expires_at: result.expires_at
                };
            } else {
                // Session invalid, clean up local data
                this.clearAuthData();
                return {
                    valid: false,
                    message: result.message || 'Session verification failed'
                };
            }
        } catch (error) {
            console.error('[AuthChecker] Session verification error:', error);
            return {
                valid: false,
                message: 'Network error during session verification'
            };
        }
    }

    /**
     * Clear all authentication data
     */
    clearAuthData() {
        this.deleteCookie('pac_session_token');
        this.deleteCookie('pac_user_info');
        
        // Clear any localStorage data if exists
        if (typeof Storage !== 'undefined') {
            localStorage.removeItem('pac_auth_token');
            localStorage.removeItem('pac_user_data');
        }
    }

    /**
     * Check authentication status (comprehensive check)
     * @returns {Promise<Object>} Authentication status result
     */
    async checkAuthStatus() {
        console.log('[AuthChecker] Starting checkAuthStatus()');
        
        // Quick local check first (only check user info since token is httpOnly)
        const hasUserInfo = this.isAuthenticatedLocally();
        console.log('[AuthChecker] Local user info check:', hasUserInfo);
        
        if (!hasUserInfo) {
            console.log('[AuthChecker] No user info found locally');
            return {
                authenticated: false,
                message: 'No local user data found'
            };
        }

        console.log('[AuthChecker] User info found locally, verifying with server...');
        // Always verify with server since we can't read session token
        const verification = await this.verifySession();
        console.log('[AuthChecker] Server verification result:', verification);
        
        return {
            authenticated: verification.valid,
            user: verification.user || null,
            message: verification.message
        };
    }

    /**
     * Redirect to dashboard/home page
     * @param {string} redirectUrl - Custom redirect URL
     */
    redirectToDashboard(redirectUrl = 'home') {
        window.location.href = redirectUrl;
    }

    /**
     * Redirect to login page
     * @param {string} message - Optional message to show
     */
    redirectToLogin(message = null) {
        let loginUrl = 'login';
        if (message) {
            loginUrl += `?message=${encodeURIComponent(message)}`;
        }
        window.location.href = loginUrl;
    }

    /**
     * Show toast notification
     * @param {string} message - Message to show
     * @param {string} type - Toast type (success, error, info, warning)
     */
    showToast(message, type = 'info') {
        if (typeof Toastbar !== 'undefined') {
            Toastbar.show(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Handle authentication check for login/register pages
     * Redirects if user is already authenticated
     * @param {string} pageName - Current page name for logging
     */
    async handleAuthPageAccess(pageName = 'auth') {
        console.log(`[AuthChecker] Starting handleAuthPageAccess for ${pageName}`);
        
        try {
            console.log('[AuthChecker] Checking authentication status...');
            const authStatus = await this.checkAuthStatus();
            
            console.log('[AuthChecker] Auth status result:', authStatus);
            
            if (authStatus.authenticated) {
                console.log('[AuthChecker] User is authenticated, preparing redirect...');
                const userInfo = authStatus.user;
                const welcomeMessage = userInfo ? 
                    `Chào mừng trở lại, ${userInfo.fullname || userInfo.username}!` : 
                    'Bạn đã đăng nhập. Đang chuyển hướng...';
                
                console.log('[AuthChecker] Showing welcome message and redirecting immediately...');
                this.showToast(welcomeMessage, 'info');
                
                // Redirect immediately to home
                console.log('[AuthChecker] Executing immediate redirect to home...');
                this.redirectToDashboard('home');
                
                return true; // User is authenticated, will be redirected
            }
            
            console.log('[AuthChecker] User is not authenticated, allowing access to auth page');
            return false; // User is not authenticated, can proceed
        } catch (error) {
            console.error(`[AuthChecker] Error checking auth status on ${pageName} page:`, error);
            return false; // Allow access on error
        }
    }

    /**
     * Handle authentication check for protected pages
     * Redirects if user is not authenticated
     * @param {string} pageName - Current page name for logging
     * @param {boolean} showMessage - Whether to show unauthorized message
     */
    async handleProtectedPageAccess(pageName = 'protected', showMessage = true) {
        try {
            const authStatus = await this.checkAuthStatus();
            
            if (!authStatus.authenticated) {
                if (showMessage) {
                    this.showToast('Vui lòng đăng nhập để truy cập trang này', 'warning');
                }
                
                // Redirect immediately to login
                this.redirectToLogin('Phiên đăng nhập đã hết hạn');
                
                return false; // User is not authenticated, will be redirected
            }
            
            return authStatus.user; // Return user data for authenticated user
        } catch (error) {
            console.error(`Error checking auth status on ${pageName} page:`, error);
            
            if (showMessage) {
                this.showToast('Lỗi xác thực. Vui lòng đăng nhập lại', 'error');
            }
            
            // Redirect immediately to login on error
            this.redirectToLogin('Lỗi xác thực');
            
            return false;
        }
    }

    /**
     * Logout user
     * @param {boolean} redirectToLogin - Whether to redirect to login page
     */
    async logout(redirectToLogin = true) {
        try {
            const sessionToken = this.getSessionToken();
            
            if (sessionToken) {
                // Call logout API
                await fetch(`${this.baseURL}/logout.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        session_token: sessionToken
                    })
                });
            }
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            // Clear local data regardless of API call result
            this.clearAuthData();
            
            if (redirectToLogin) {
                this.showToast('Đã đăng xuất thành công', 'success');
                setTimeout(() => {
                    this.redirectToLogin();
                }, 1000);
            }
        }
    }
}

// Create global instance
const authChecker = new AuthChecker();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthChecker;
}
