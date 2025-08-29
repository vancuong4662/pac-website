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
      console.error(`Target element not found: ${targetSelector}`);
      return false;
    }

    try {
      let componentHtml = '';

      // Check cache first
      if (useCache && this.componentCache.has(componentName)) {
        componentHtml = this.componentCache.get(componentName);
      } else {
        // Fetch component from server
        const response = await fetch(`components/${componentName}.html`);
        if (!response.ok) {
          throw new Error(`Failed to load component: ${componentName}`);
        }
        componentHtml = await response.text();
        
        // Cache the component
        if (useCache) {
          this.componentCache.set(componentName, componentHtml);
        }
      }

      // Insert component into target
      target.innerHTML = componentHtml;
      
      // Update loading states
      target.classList.remove('component-loading');
      target.classList.add('component-loaded');
      
      // Mark as loaded
      this.loadedComponents.add(componentName);
      
      // Trigger component-specific initialization
      this.initializeComponent(componentName, target);
      
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

    const loadPromises = components.map(({ name, target }) => 
      this.loadComponent(name, target)
    );

    try {
      const results = await Promise.all(loadPromises);
      const successCount = results.filter(result => result).length;
      
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
}

// Initialize global component loader
window.componentLoader = new ComponentLoader();

// Auto-load components when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Define components to load on page load
  const pageComponents = [
    { name: 'header', target: '#header-section' },
    { name: 'hero', target: '#hero-section' },
    { name: 'about', target: '#about-section' },
    { name: 'why-choose', target: '#why-choose-section' },
    { name: 'solution', target: '#solution-section' },
    { name: 'featured-services', target: '#featured-services-section' },
    { name: 'find-teacher', target: '#find-teacher-section' },
    { name: 'call-to-action', target: '#call-to-action-section' },
    { name: 'footer', target: '#footer-section' }
  ];

  // Load all components
  window.componentLoader.loadComponents(pageComponents);
});
