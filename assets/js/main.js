/**
* Template Name: MediNest
* Template URL: https://bootstrapmade.com/medinest-bootstrap-hospital-template/
* Updated: Aug 11 2025 with Bootstrap v5.3.7
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/

(function() {
  "use strict";

  /**
   * Apply .scrolled class to the body as the page is scrolled down
   */
  function toggleScrolled() {
    const selectBody = document.querySelector('body');
    const selectHeader = document.querySelector('#header');
    if (!selectHeader || (!selectHeader.classList.contains('scroll-up-sticky') && !selectHeader.classList.contains('sticky-top') && !selectHeader.classList.contains('fixed-top'))) return;
    window.scrollY > 100 ? selectBody.classList.add('scrolled') : selectBody.classList.remove('scrolled');
  }

  document.addEventListener('scroll', toggleScrolled);
  window.addEventListener('load', toggleScrolled);

  /**
   * Mobile nav toggle
   */
  const mobileNavToggleBtn = document.querySelector('.mobile-nav-toggle');

  function mobileNavToogle() {
    document.querySelector('body').classList.toggle('mobile-nav-active');
    mobileNavToggleBtn.classList.toggle('bi-list');
    mobileNavToggleBtn.classList.toggle('bi-x');
  }
  if (mobileNavToggleBtn) {
    mobileNavToggleBtn.addEventListener('click', mobileNavToogle);
  }

  /**
   * New Mobile Navigation Handler
   */
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
  const mobileNavClose = document.querySelector('.mobile-nav-close');

  function openMobileNav() {
    mobileNav.classList.add('active');
    mobileNavOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    mobileNav.classList.remove('active');
    mobileNavOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', openMobileNav);
  }

  if (mobileNavClose) {
    mobileNavClose.addEventListener('click', closeMobileNav);
  }

  if (mobileNavOverlay) {
    mobileNavOverlay.addEventListener('click', closeMobileNav);
  }

  // Mobile dropdown toggles
  document.querySelectorAll('.mobile-dropdown-toggle').forEach(toggle => {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      const dropdown = this.closest('.mobile-dropdown');
      dropdown.classList.toggle('active');
    });
  });

  /**
   * Hide mobile nav on same-page/hash links
   */
  document.querySelectorAll('#navmenu a').forEach(navmenu => {
    navmenu.addEventListener('click', () => {
      if (document.querySelector('.mobile-nav-active')) {
        mobileNavToogle();
      }
    });

  });

  // Close mobile nav when clicking on menu links
  document.querySelectorAll('.mobile-nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
      closeMobileNav();
    });
  });

  /**
   * Toggle mobile nav dropdowns
   */
  document.querySelectorAll('.navmenu .toggle-dropdown').forEach(navmenu => {
    navmenu.addEventListener('click', function(e) {
      e.preventDefault();
      this.parentNode.classList.toggle('active');
      this.parentNode.nextElementSibling.classList.toggle('dropdown-active');
      e.stopImmediatePropagation();
    });
  });

  /**
   * Preloader
   */
  const preloader = document.querySelector('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove();
    });
  }

  /**
   * Scroll top button
   */
  let scrollTop = document.querySelector('.scroll-top');

  function toggleScrollTop() {
    if (scrollTop) {
      window.scrollY > 100 ? scrollTop.classList.add('active') : scrollTop.classList.remove('active');
    }
  }
  
  if (scrollTop) {
    scrollTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  window.addEventListener('load', toggleScrollTop);
  document.addEventListener('scroll', toggleScrollTop);

  /**
   * Animation on scroll function and init
   */
  function aosInit() {
    AOS.init({
      duration: 600,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    });
  }
  window.addEventListener('load', aosInit);

  /**
   * Initiate glightbox
   */
  const glightbox = GLightbox({
    selector: '.glightbox'
  });

  /**
   * Initiate Pure Counter
   */
  new PureCounter();

  /**
   * Init isotope layout and filters
   */
  document.querySelectorAll('.isotope-layout').forEach(function(isotopeItem) {
    let layout = isotopeItem.getAttribute('data-layout') ?? 'masonry';
    let filter = isotopeItem.getAttribute('data-default-filter') ?? '*';
    let sort = isotopeItem.getAttribute('data-sort') ?? 'original-order';

    let initIsotope;
    imagesLoaded(isotopeItem.querySelector('.isotope-container'), function() {
      initIsotope = new Isotope(isotopeItem.querySelector('.isotope-container'), {
        itemSelector: '.isotope-item',
        layoutMode: layout,
        filter: filter,
        sortBy: sort
      });
    });

    isotopeItem.querySelectorAll('.isotope-filters li').forEach(function(filters) {
      filters.addEventListener('click', function() {
        isotopeItem.querySelector('.isotope-filters .filter-active').classList.remove('filter-active');
        this.classList.add('filter-active');
        initIsotope.arrange({
          filter: this.getAttribute('data-filter')
        });
        if (typeof aosInit === 'function') {
          aosInit();
        }
      }, false);
    });

  });

  /**
   * Init swiper sliders
   */
  function initSwiper() {
    document.querySelectorAll(".init-swiper").forEach(function(swiperElement) {
      let config = JSON.parse(
        swiperElement.querySelector(".swiper-config").innerHTML.trim()
      );

      if (swiperElement.classList.contains("swiper-tab")) {
        initSwiperWithCustomPagination(swiperElement, config);
      } else {
        new Swiper(swiperElement, config);
      }
    });
  }

  window.addEventListener("load", initSwiper);

  /**
   * Frequently Asked Questions Toggle
   */
  document.querySelectorAll('.faq-item h3, .faq-item .faq-toggle, .faq-item .faq-header').forEach((faqItem) => {
    faqItem.addEventListener('click', () => {
      faqItem.parentNode.classList.toggle('faq-active');
    });
  });

  /**
   * Hero Slideshow
   */
  function initHeroSlideshow() {
    const slides = document.querySelectorAll('.hero-slideshow .slide');
    let currentSlide = 0;
    
    if (slides.length === 0) return;

    function showNextSlide() {
      // Remove active class from current slide
      slides[currentSlide].classList.remove('active');
      
      // Move to next slide
      currentSlide = (currentSlide + 1) % slides.length;
      
      // Add active class to new slide
      slides[currentSlide].classList.add('active');
    }

    // Start slideshow - change every 2 seconds
    setInterval(showNextSlide, 2000);
  }

  // Initialize slideshow when DOM is loaded
  window.addEventListener('load', function() {
    // Wait for components to load first
    setTimeout(function() {
      initHeroSlideshow();
      
      // If still no slides, retry a few more times
      if (document.querySelectorAll('.hero-slideshow .slide').length === 0) {
        setTimeout(initHeroSlideshow, 500);
        setTimeout(initHeroSlideshow, 1000);
        setTimeout(initHeroSlideshow, 1500);
      }
    }, 200);
  });

  /**
   * Feedback Slideshow
   */
  function initFeedbackSlideshow() {
    const slides = document.querySelectorAll('.feedback .testimonial-slide');
    const indicators = document.querySelectorAll('.feedback .indicator');
    let currentSlide = 0;
    let slideInterval = null;
    let isInitialized = false;
    
    if (slides.length === 0 || isInitialized) return;
    
    // Mark as initialized to prevent multiple initializations
    isInitialized = true;

    function showSlide(index) {
      // Clear any existing interval first
      if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
      }
      
      // Remove active class from all slides and indicators
      slides.forEach(slide => slide.classList.remove('active'));
      indicators.forEach(indicator => indicator.classList.remove('active'));
      
      // Add active class to selected slide and indicator
      if (slides[index] && indicators[index]) {
        slides[index].classList.add('active');
        indicators[index].classList.add('active');
      }
      
      currentSlide = index;
      
      // Restart the interval after showing slide
      startSlideshow();
    }

    function nextSlide() {
      const nextIndex = (currentSlide + 1) % slides.length;
      currentSlide = nextIndex;
      
      // Remove active class from all slides and indicators
      slides.forEach(slide => slide.classList.remove('active'));
      indicators.forEach(indicator => indicator.classList.remove('active'));
      
      // Add active class to current slide and indicator
      if (slides[currentSlide] && indicators[currentSlide]) {
        slides[currentSlide].classList.add('active');
        indicators[currentSlide].classList.add('active');
      }
    }

    function startSlideshow() {
      // Clear existing interval if any
      if (slideInterval) {
        clearInterval(slideInterval);
      }
      // Set new interval
      slideInterval = setInterval(nextSlide, 3000); // Exactly 3 seconds
    }

    function stopSlideshow() {
      if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
      }
    }

    // Add click handlers to indicators
    indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        if (index !== currentSlide) {
          showSlide(index);
        }
      });
    });

    // Pause on hover
    const feedbackSection = document.querySelector('.feedback');
    if (feedbackSection) {
      feedbackSection.addEventListener('mouseenter', stopSlideshow);
      feedbackSection.addEventListener('mouseleave', startSlideshow);
    }

    // Start the slideshow
    startSlideshow();
  }

  // Initialize feedback slideshow when DOM is loaded
  window.addEventListener('load', function() {
    // Wait a bit to ensure all components are loaded
    setTimeout(function() {
      initFeedbackSlideshow();
    }, 600);
  });

  /**
   * Team Data Management
   */
  let teamMembers = [];

  async function loadTeamData() {
    try {
      // Check if team grid exists, if not, retry later
      const grid = document.getElementById('team-members-grid');
      if (!grid) {
        setTimeout(loadTeamData, 300);
        return;
      }

      // Check localStorage first
      const cachedData = localStorage.getItem('teamMembersData');
      const cacheTimestamp = localStorage.getItem('teamMembersTimestamp');
      const currentTime = new Date().getTime();
      const cacheAge = currentTime - (cacheTimestamp || 0);
      const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

      if (cachedData && cacheAge < cacheExpiry) {
        teamMembers = JSON.parse(cachedData);
        renderTeamMembers();
        return;
      }

      // Fetch from server
      const response = await fetch('static/team.json');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      teamMembers = data.members;
      
      // Cache data
      localStorage.setItem('teamMembersData', JSON.stringify(teamMembers));
      localStorage.setItem('teamMembersTimestamp', currentTime.toString());
      
      renderTeamMembers();
    } catch (error) {
      console.error('Error loading team data:', error);
      showErrorMessage();
    }
  }

  // Make loadTeamData globally accessible
  window.loadTeamData = loadTeamData;

  function renderTeamMembers() {
    const grid = document.getElementById('team-members-grid');
    if (!grid || !teamMembers.length) return;

    grid.innerHTML = '';

    teamMembers.forEach((member, index) => {
      const memberCard = createMemberCard(member, index);
      grid.appendChild(memberCard);
    });

    // Initialize AOS animations for new elements
    if (typeof AOS !== 'undefined') {
      AOS.refresh();
    }
  }

  function createMemberCard(member, index) {
    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-6 mb-4';
    
    const memberId = member.name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/\s+/g, '-');

    col.innerHTML = `
      <div class="specialist-card" data-aos="slide-up" data-aos-delay="${100 + (index * 100)}">
        <div class="card-content">
          <div class="specialist-info">
            <div class="profile-section">
              <div class="profile-image">
                <img src="${member.image}" alt="${member.name}" class="img-fluid">
                <div class="online-status active"></div>
              </div>
              <div class="specialist-data">
                <h3>${member.name}</h3>
                <p class="specialty">${member.role}</p>
                <div class="credentials">
                  <span class="badge">${member.badge}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="quick-actions">
            <button class="action-btn primary" data-member="${memberId}">Xem thông tin</button>
          </div>
        </div>
      </div>
    `;

    return col;
  }

  function showErrorMessage() {
    const grid = document.getElementById('team-members-grid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="col-12 text-center">
        <div class="error-message">
          <i class="bi bi-exclamation-triangle text-warning"></i>
          <p>Không thể tải thông tin chuyên gia. Vui lòng thử lại sau.</p>
          <button class="btn btn-primary" onclick="loadTeamData()">Thử lại</button>
        </div>
      </div>
    `;
  }

  /**
   * Team Member Modal
   */
  let memberModalInstance = null; // Store single modal instance
  
  function initTeamModal() {
    const modal = document.getElementById('memberModal');
    if (!modal) return;
    
    // Create single modal instance
    memberModalInstance = new bootstrap.Modal(modal, {
      keyboard: true,
      backdrop: true,
      focus: true
    });

    // Use event delegation to handle dynamically created buttons
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-member]')) {
        const memberId = e.target.getAttribute('data-member');
        showMemberModal(memberId);
      }
    });
    
    // Clean up backdrop when modal is hidden
    modal.addEventListener('hidden.bs.modal', function () {
      // Force cleanup any remaining backdrops
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => {
        if (backdrop.parentNode) {
          backdrop.parentNode.removeChild(backdrop);
        }
      });
      // Ensure body class is cleaned
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    });
  }

  function showMemberModal(memberId) {
    // Don't proceed if modal instance not ready
    if (!memberModalInstance) {
      setTimeout(() => showMemberModal(memberId), 100);
      return;
    }

    const member = teamMembers.find(m => {
      const normalizedName = m.name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/\s+/g, '-');
      return normalizedName === memberId;
    });

    if (!member) return;

    // Update modal content
    document.getElementById('memberName').textContent = member.name;
    document.getElementById('memberRole').textContent = member.role;
    document.getElementById('memberBadge').textContent = member.badge;
    document.getElementById('memberPhoto').src = member.image;
    document.getElementById('memberPhoto').alt = member.name;

    // Update titles list
    const titlesContainer = document.getElementById('memberTitles');
    titlesContainer.innerHTML = '';
    if (member.title && member.title.length > 0) {
      member.title.forEach(title => {
        const li = document.createElement('li');
        li.textContent = title;
        titlesContainer.appendChild(li);
      });
    }

    // Update description
    document.getElementById('memberDescription').innerHTML = member.description || 'Thông tin chi tiết sẽ được cập nhật sớm...';

    // Show modal using existing instance
    memberModalInstance.show();
  }

  // Initialize team functionality with multiple strategies
  function initTeamWithFallback() {
    if (document.getElementById('team-members-grid')) {
      loadTeamData();
      initTeamModal();
      return true;
    }
    return false;
  }

  // Strategy 1: DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(() => {
        if (!initTeamWithFallback()) {
          // Retry after a delay if team section not ready
          setTimeout(initTeamWithFallback, 500);
        }
      }, 100);
    });
  } else {
    // Document already loaded
    setTimeout(() => {
      if (!initTeamWithFallback()) {
        // Retry after a delay if team section not ready
        setTimeout(initTeamWithFallback, 500);
      }
    }, 100);
  }

  // Strategy 2: Window load event
  window.addEventListener('load', function() {
    setTimeout(() => {
      if (!initTeamWithFallback()) {
        // Retry after a delay if team section not ready
        setTimeout(initTeamWithFallback, 500);
      }
    }, 200);
  });

  // Strategy 3: Delayed fallback for cached pages
  setTimeout(() => {
    initTeamWithFallback();
  }, 1000);

  // Strategy 4: Final safety net
  setTimeout(() => {
    initTeamWithFallback();
  }, 2500);

})();