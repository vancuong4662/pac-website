/**
 * Header Cart Manager
 * Manages cart count display in header across all pages
 */

class HeaderCartManager {
    constructor() {
        this.cartCountElement = null;
        this.init();
    }
    
    init() {
        // Get cart count element
        this.cartCountElement = document.getElementById('header-cart-count');
        
        // Load initial cart count
        this.updateCartCount();
        
        // Listen for cart updates from other pages/components
        window.addEventListener('storage', (e) => {
            if (e.key === 'cart_updated') {
                this.updateCartCount();
            }
        });
        
        // Listen for custom cart update events
        window.addEventListener('cartUpdated', () => {
            this.updateCartCount();
        });
        
        // Make functions available globally
        window.updateHeaderCartCount = this.updateCartCount.bind(this);
    }
    
    async updateCartCount() {
        try {
            const response = await fetch('api/cart/get.php');
            
            // Handle authentication status
            if (response.status === 401) {
                this.setCartCount(0);
                return;
            }
            
            // Handle other error statuses
            if (!response.ok) {
                this.setCartCount(0);
                return;
            }
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                this.setCartCount(0);
                return;
            }
            
            // Try to parse JSON
            let data;
            try {
                const responseText = await response.text();
                data = JSON.parse(responseText);
            } catch (parseError) {
                this.setCartCount(0);
                return;
            }
            
            if (data.success && data.data && data.data.items) {
                const itemCount = data.data.items.length;
                this.setCartCount(itemCount);
            } else {
                this.setCartCount(0);
            }
        } catch (error) {
            this.setCartCount(0);
        }
    }
    
    setCartCount(count) {
        if (this.cartCountElement) {
            this.cartCountElement.textContent = count;
            this.cartCountElement.style.display = count > 0 ? 'block' : 'none';
        }
    }
    
    // Public method to notify cart update
    notifyCartUpdate() {
        // Update local count
        this.updateCartCount();
        
        // Notify other tabs
        localStorage.setItem('cart_updated', Date.now().toString());
        localStorage.removeItem('cart_updated');
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('cartUpdated'));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for header to load if it's loaded dynamically
    setTimeout(() => {
        if (!window.headerCartManager) {
            window.headerCartManager = new HeaderCartManager();
        }
    }, 500);
});

// Make HeaderCartManager available globally
window.HeaderCartManager = HeaderCartManager;
