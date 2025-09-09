/**
 * PAC Group Component Loader
 * Dynamic component loading system with preloader integration
 */

class ComponentLoader {
  constructor() {
    this.loadedComponents = new Set();
    this.componentCache = new Map();
    this.loadingQueue = [];
    this.isLoading = false;
    
    // Preloader elements
    this.preloader = document.querySelector('#preloader');
    this.showPreloader = this.showPreloader.bind(this);
    this.hidePreloader = this.hidePreloader.bind(this);
  }

  /**
   * Show preloader during component loading
   */
  showPreloader() {
    if (this.preloader) {
      this.preloader.style.display = 'flex';
      this.preloader.style.opacity = '1';
    }
  }

  /**
   * Hide preloader after components loaded
   */
  hidePreloader() {
    if (this.preloader) {
      setTimeout(() => {
        this.preloader.style.opacity = '0';
        setTimeout(() => {
          this.preloader.style.display = 'none';
        }, 300);
      }, 500);
    }
  }

  /**
   * Load a single component
   */
  async loadComponent(componentName, targetSelector, useCache = true) {
    const target = document.querySelector(targetSelector);
    if (!target) {
      console.warn(`Target element not found: ${targetSelector}. Skipping component: ${componentName}`);
      return false;
    }

    try {
      let componentHtml = '';

      // Check cache first (but add cache busting for development)
      const cacheKey = componentName + '_v1.1'; // Version for cache busting
      if (useCache && this.componentCache.has(cacheKey)) {
        componentHtml = this.componentCache.get(cacheKey);
      } else {
        // Fetch component from server với cache busting
        const cacheBuster = new Date().getTime();
        const response = await fetch(`components/${componentName}.html?v=${cacheBuster}`);
        if (!response.ok) {
          throw new Error(`Failed to load component: ${componentName}`);
        }
        componentHtml = await response.text();
        
        // Cache the component với versioned key
        if (useCache) {
          this.componentCache.set(cacheKey, componentHtml);
        }
      }

      // Insert component into target
      target.innerHTML = componentHtml;
      
      // Force execute any scripts in the component
      const scripts = target.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        // Replace the old script with new one to force execution
        script.parentNode.replaceChild(newScript, script);
      });
      
      // Update loading states
      target.classList.remove('component-loading');
      target.classList.add('component-loaded');
      
      // Mark as loaded
      this.loadedComponents.add(componentName);
      
      // Trigger component-specific initialization với delay để đảm bảo DOM ready
      setTimeout(() => {
        this.initializeComponent(componentName, target);
      }, 100);
      
      return true;

    } catch (error) {
      console.error(`Error loading component ${componentName}:`, error);
      target.classList.remove('component-loading');
      target.classList.add('component-error');
      target.innerHTML = `<div class="component-error">
        <p>Không thể tải component: ${componentName}</p>
        <button onclick="window.componentLoader.reloadComponent('${componentName}', '${targetSelector}')">Thử lại</button>
      </div>`;
      return false;
    }
  }

  /**
   * Load multiple components
   */
  async loadComponents(components) {
    if (this.isLoading) {
      console.warn('Components are already being loaded');
      return;
    }

    this.isLoading = true;
    this.showPreloader();

    // Filter out components whose targets don't exist
    const validComponents = components.filter(({ name, target }) => {
      const exists = document.querySelector(target) !== null;
      return exists;
    });

    const loadPromises = validComponents.map(({ name, target }) => 
      this.loadComponent(name, target)
    );

    try {
      const results = await Promise.all(loadPromises);
      
      // Initialize page-wide features after all components loaded
      this.initializePageFeatures();
      
    } catch (error) {
      console.error('Error loading components:', error);
    } finally {
      this.isLoading = false;
      this.hidePreloader();
    }
  }

  /**
   * Reload a specific component
   */
  async reloadComponent(componentName, targetSelector) {
    this.loadedComponents.delete(componentName);
    this.componentCache.delete(componentName);
    return await this.loadComponent(componentName, targetSelector, false);
  }

  /**
   * Initialize component-specific features
   */
  initializeComponent(componentName, targetElement) {
    // Re-initialize AOS for new elements
    if (typeof AOS !== 'undefined') {
      AOS.refresh();
    }

    // Re-initialize counters for new elements
    if (typeof PureCounter !== 'undefined') {
      const counters = targetElement.querySelectorAll('.purecounter');
      counters.forEach(counter => {
        new PureCounter(counter);
      });
    }

    // Re-initialize GLightbox for new elements
    if (typeof GLightbox !== 'undefined') {
      const lightboxElements = targetElement.querySelectorAll('.glightbox');
      if (lightboxElements.length > 0) {
        GLightbox({
          selector: '.glightbox'
        });
      }
    }

    // Component-specific initializations
    switch (componentName) {
      case 'hero':
        this.initializeHero(targetElement);
        break;
      case 'featured-programs':
        this.initializeFeaturedPrograms(targetElement);
        break;
      case 'find-teacher':
        this.initializeFindTeacher(targetElement);
        break;
      case 'team':
        this.initializeTeam(targetElement);
        break;
      case 'partners':
        this.initializePartners(targetElement);
        break;
      // Add more component-specific initializations as needed
    }
  }

  /**
   * Initialize page-wide features after all components loaded
   */
  initializePageFeatures() {
    // Re-initialize mobile nav toggle
    const mobileNavToggleBtn = document.querySelector('.mobile-nav-toggle');
    if (mobileNavToggleBtn) {
      mobileNavToggleBtn.addEventListener('click', function() {
        document.querySelector('body').classList.toggle('mobile-nav-active');
        this.classList.toggle('bi-list');
        this.classList.toggle('bi-x');
      });
    }

    // Re-initialize navigation menu
    document.querySelectorAll('#navmenu a').forEach(navmenu => {
      navmenu.addEventListener('click', () => {
        if (document.querySelector('.mobile-nav-active')) {
          document.querySelector('body').classList.remove('mobile-nav-active');
          const toggleBtn = document.querySelector('.mobile-nav-toggle');
          if (toggleBtn) {
            toggleBtn.classList.add('bi-list');
            toggleBtn.classList.remove('bi-x');
          }
        }
      });
    });

    // Re-initialize dropdown toggles
    document.querySelectorAll('.navmenu .toggle-dropdown').forEach(navmenu => {
      navmenu.addEventListener('click', function(e) {
        e.preventDefault();
        this.parentNode.classList.toggle('active');
        this.parentNode.nextElementSibling.classList.toggle('dropdown-active');
        e.stopImmediatePropagation();
      });
    });

    // Re-initialize scroll top button
    const scrollTop = document.querySelector('.scroll-top');
    if (scrollTop) {
      scrollTop.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }

    // Re-initialize Swiper sliders
    if (typeof Swiper !== 'undefined') {
      document.querySelectorAll(".init-swiper").forEach(function(swiperElement) {
        if (!swiperElement.swiper) {
          let config = JSON.parse(
            swiperElement.querySelector(".swiper-config").innerHTML.trim()
          );
          new Swiper(swiperElement, config);
        }
      });
    }

    // Re-initialize Isotope layouts
    if (typeof Isotope !== 'undefined') {
      document.querySelectorAll('.isotope-layout').forEach(function(isotopeItem) {
        let layout = isotopeItem.getAttribute('data-layout') ?? 'masonry';
        let filter = isotopeItem.getAttribute('data-default-filter') ?? '*';
        let sort = isotopeItem.getAttribute('data-sort') ?? 'original-order';

        let initIsotope;
        if (typeof imagesLoaded !== 'undefined') {
          imagesLoaded(isotopeItem.querySelector('.isotope-container'), function() {
            initIsotope = new Isotope(isotopeItem.querySelector('.isotope-container'), {
              itemSelector: '.isotope-item',
              layoutMode: layout,
              filter: filter,
              sortBy: sort
            });
          });
        }
      });
    }

    // Dispatch custom event for other scripts
    document.dispatchEvent(new CustomEvent('componentsLoaded', {
      detail: {
        loadedComponents: Array.from(this.loadedComponents)
      }
    }));
  }

  /**
   * Component-specific initialization methods
   */
  initializeHero(element) {
    // Hero-specific initialization
    // Wait a bit for DOM to settle, then trigger hero slideshow
    setTimeout(() => {
      if (typeof initHeroSlideshow === 'function') {
        initHeroSlideshow();
      } else {
        // Try to find and call hero slideshow from main.js
        const slides = element.querySelectorAll('.hero-slideshow .slide');
        if (slides.length > 0) {
          this.manualHeroInit(slides);
        }
      }
    }, 100);
  }
  
  /**
   * Manual hero slideshow initialization
   */
  manualHeroInit(slides) {
    let currentSlide = 0;
    
    function showNextSlide() {
      slides[currentSlide].classList.remove('active');
      currentSlide = (currentSlide + 1) % slides.length;
      slides[currentSlide].classList.add('active');
    }
    
    setInterval(showNextSlide, 2000);
  }

  initializeFeaturedPrograms(element) {
    // Featured programs specific initialization
  }

  initializeFindTeacher(element) {
    // Find teacher specific initialization
    const form = element.querySelector('.search-form');
    if (form) {
      form.addEventListener('submit', this.handleTeacherSearch.bind(this));
    }
  }

  /**
   * Handle teacher search form
   */
  handleTeacherSearch(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const searchData = Object.fromEntries(formData.entries());
    // Implement search logic here
  }

  /**
   * Get component loading status
   */
  getLoadingStatus() {
    return {
      isLoading: this.isLoading,
      loadedComponents: Array.from(this.loadedComponents),
      cachedComponents: Array.from(this.componentCache.keys())
    };
  }

  /**
   * Initialize Partners slideshow component
   */
  initializePartners(targetElement) {
    // Wait a bit for script to execute
    setTimeout(() => {
      this.attemptPartnersInit();
    }, 200);
  }
  
  /**
   * Attempt to initialize partners slideshow with better error handling
   */
  attemptPartnersInit() {
    const maxAttempts = 10;
    let attempts = 0;
    
    const tryInit = () => {
      attempts++;
      
      // Check if the elements exist first
      const partnersSection = document.querySelector('#partners');
      if (!partnersSection) {
        if (attempts < maxAttempts) {
          setTimeout(tryInit, 300);
        }
        return;
      }
      
      // Check if function exists
      if (typeof window.initPartnersSlideshow === 'function') {
        const success = window.initPartnersSlideshow();
        if (success) {
          return;
        }
      }
      
      // Retry if failed and we have attempts left
      if (attempts < maxAttempts) {
        const delay = Math.min(500 * attempts, 2000); // Max 2 second delay
        setTimeout(tryInit, delay);
      } else {
        // As a last resort, try to manually initialize
        this.manualPartnersInit();
      }
    };
    
    // Start first attempt
    tryInit();
  }
  
  /**
   * Manual initialization as last resort
   */
  manualPartnersInit() {
    const partnersSection = document.querySelector('#partners');
    if (!partnersSection) return;
    
    // Try to trigger the inline script again
    const script = partnersSection.querySelector('script');
    if (script) {
      try {
        eval(script.textContent);
        // Try calling the function after a delay
        setTimeout(() => {
          if (typeof window.initPartnersSlideshow === 'function') {
            window.initPartnersSlideshow();
          }
        }, 100);
      } catch (error) {
        // Silent fail in production
      }
    }
  }
  
  /**
   * Initialize team component
   */
  initializeTeam(targetElement) {
    // Team-specific initialization
    // Wait a bit for DOM to settle, then trigger team data loading
    setTimeout(() => {
      if (typeof window.loadTeamData === 'function') {
        window.loadTeamData();
      } else {
        // Retry a few times as loadTeamData might not be available yet
        this.initializeTeamWithRetry(0);
      }
    }, 100);
  }
  
  /**
   * Retry team initialization with exponential backoff
   */
  initializeTeamWithRetry(attempts) {
    const maxAttempts = 5;
    attempts = attempts || 0;
    
    const tryInit = () => {
      attempts++;
      
      // Check if the team grid exists first
      const teamGrid = document.querySelector('#team-members-grid');
      if (!teamGrid) {
        if (attempts < maxAttempts) {
          setTimeout(tryInit, 300);
        }
        return;
      }
      
      // Check if function exists
      if (typeof window.loadTeamData === 'function') {
        window.loadTeamData();
        return;
      }
      
      // Retry if failed and we have attempts left
      if (attempts < maxAttempts) {
        const delay = Math.min(500 * attempts, 2000); // Max 2 second delay
        setTimeout(tryInit, delay);
      }
    };
    
    // Start first attempt
    tryInit();
  }
}

// Initialize global component loader
window.componentLoader = new ComponentLoader();

// Global helper function for backward compatibility
window.loadComponent = function(targetSelector, componentPath) {
  const componentName = componentPath.replace('components/', '').replace('.html', '');
  return window.componentLoader.loadComponent(componentName, `#${targetSelector}`);
};

// Auto-load components when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Check if page has custom component loading (will be defined by specific pages)
  if (window.pageComponentsConfig) {
    
    // Handle array format (legacy format for profile page)
    if (Array.isArray(window.pageComponentsConfig)) {
      window.componentLoader.loadComponents(window.pageComponentsConfig).then(() => {
        // Set active navigation based on current page
        setTimeout(() => {
          setActiveNavigation();
        }, 200);
      });
      return;
    }
    
    // Handle object format (new format for payment-history and other pages)
    if (typeof window.pageComponentsConfig === 'object') {
      // Convert pageComponentsConfig object to components array
      const pageComponents = [];
      
      // Add header and footer if they exist
      if (document.querySelector('#header-section')) {
        pageComponents.push({ name: 'header', target: '#header-section' });
      }
      
      if (document.querySelector('#footer-section')) {
        pageComponents.push({ name: 'footer', target: '#footer-section' });
      }
      
      // Add sidebar if configured
      if (window.pageComponentsConfig.sidebar) {
        const sidebarTarget = '#profile-sidebar, #payment-history-sidebar';
        const sidebarElement = document.querySelector('#profile-sidebar') || document.querySelector('#payment-history-sidebar');
        if (sidebarElement) {
          const sidebarComponent = { 
            name: window.pageComponentsConfig.sidebar.replace('.html', ''), 
            target: sidebarElement.id ? `#${sidebarElement.id}` : '#profile-sidebar'
          };
          pageComponents.push(sidebarComponent);
        }
      }
      
      if (pageComponents.length > 0) {
        window.componentLoader.loadComponents(pageComponents).then(() => {
          // Set active navigation based on current page
          setTimeout(() => {
            setActiveNavigation();
          }, 200);
        });
      }
      return;
    }
  }
  
  // Default components for index page (only if we detect index-specific elements)
  const isIndexPage = document.querySelector('.index-page') !== null;
  
  if (isIndexPage) {
    const indexComponents = [
      { name: 'header', target: '#header-section' },
      { name: 'hero', target: '#hero-section' },
      { name: 'about', target: '#about-section' },
      { name: 'why-choose', target: '#why-choose-section' },
      { name: 'solution', target: '#solution-section' },
      { name: 'courses', target: '#courses-section' },
      { name: 'team', target: '#team-section' },
      { name: 'feedback', target: '#feedback-section' },
      { name: 'partners', target: '#partners-section' },
      { name: 'footer', target: '#footer-section' }
    ];
    
    window.componentLoader.loadComponents(indexComponents);
  } else {
    // For other pages without pageComponentsConfig, only load header and footer
    const commonComponents = [];
    
    if (document.querySelector('#header-section')) {
      commonComponents.push({ name: 'header', target: '#header-section' });
    }
    
    if (document.querySelector('#footer-section')) {
      commonComponents.push({ name: 'footer', target: '#footer-section' });
    }
    
    if (commonComponents.length > 0) {
      window.componentLoader.loadComponents(commonComponents);
    }
  }
});

/**
 * Set active navigation item based on current page
 */
function setActiveNavigation() {
  const currentPath = window.location.pathname;
  const currentPage = currentPath.split('/').pop() || 'index.html';
  
  // Find all navigation links
  const navLinks = document.querySelectorAll('.profile-nav .nav-link');
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    
    // Check if this link matches current page
    const href = link.getAttribute('href');
    if (href) {
      const linkPage = href.split('/').pop() || href;
      
      // Match patterns for different pages
      if (
        (currentPage.includes('payment-history') && href.includes('payment-history')) ||
        (currentPage.includes('test-results') && href.includes('test-results')) ||
        (currentPage.includes('profile') && !currentPage.includes('payment-history') && !currentPage.includes('test-results') && href.includes('profile') && !href.includes('payment-history') && !href.includes('test-results'))
      ) {
        link.classList.add('active');
      }
    }
  });
}
