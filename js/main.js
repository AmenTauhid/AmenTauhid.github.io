(function () {
  'use strict';

  // ========== THEME TOGGLE ==========
  function initTheme() {
    var saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    if (current === 'light') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }

  // ========== HERO ANIMATION ==========
  function initHero() {
    var hero = document.getElementById('hero');
    if (!hero) return;

    var visited = sessionStorage.getItem('heroPlayed');
    if (visited) {
      hero.classList.remove('hero-animate');
      hero.classList.add('hero-skip');
      return;
    }

    var typingEl = hero.querySelector('.hero-typing');
    var bubbles = hero.querySelectorAll('.bubble');
    var receipt = hero.querySelector('.receipt');
    var pills = hero.querySelector('.contact-pills');
    var elements = [];

    bubbles.forEach(function (b) { elements.push(b); });
    if (receipt) elements.push(receipt);
    if (pills) elements.push(pills);

    // Show received bubble first
    setTimeout(function () {
      if (bubbles[0]) bubbles[0].classList.add('animate-in');
    }, 400);

    // Show typing indicator
    setTimeout(function () {
      if (typingEl) typingEl.classList.add('show');
    }, 1000);

    // Hide typing, show sent bubbles
    setTimeout(function () {
      if (typingEl) typingEl.classList.remove('show');
    }, 1800);

    var sentStart = 2000;
    for (var i = 1; i < bubbles.length; i++) {
      (function (el, delay) {
        setTimeout(function () {
          el.classList.add('animate-in');
        }, delay);
      })(bubbles[i], sentStart + (i - 1) * 300);
    }

    // Receipt
    setTimeout(function () {
      if (receipt) receipt.classList.add('animate-in');
    }, sentStart + (bubbles.length - 1) * 300 + 200);

    // Pills
    setTimeout(function () {
      if (pills) pills.classList.add('animate-in');
    }, sentStart + (bubbles.length - 1) * 300 + 400);

    sessionStorage.setItem('heroPlayed', '1');
  }

  // ========== SCROLL REVEAL ==========
  function initScrollReveal() {
    var reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    reveals.forEach(function (el) {
      observer.observe(el);
    });
  }

  // ========== MODALS ==========
  function openModal(name) {
    var modal = document.getElementById(name + '-modal');
    var overlay = document.getElementById(name + '-overlay');
    if (!modal || !overlay) return;

    document.body.style.overflow = 'hidden';
    overlay.classList.add('open');
    // Small delay for overlay to appear before modal slides
    requestAnimationFrame(function () {
      modal.classList.add('open');
    });
  }

  function closeModal(name) {
    var modal = document.getElementById(name + '-modal');
    var overlay = document.getElementById(name + '-overlay');
    if (!modal || !overlay) return;

    modal.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    // Scroll modal back to top for next open
    setTimeout(function () {
      modal.scrollTop = 0;
    }, 500);
  }

  // Close on overlay click
  function initModalOverlays() {
    var overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(function (overlay) {
      overlay.addEventListener('click', function () {
        var id = overlay.id.replace('-overlay', '');
        closeModal(id);
      });
    });
  }

  // Project card clicks
  function initProjectCards() {
    var cards = document.querySelectorAll('.project-card');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var modalName = card.getAttribute('data-modal');
        if (modalName) openModal(modalName);
      });
    });
  }

  // ========== EXPERIENCE EXPAND ==========
  window.toggleExpand = function (btn) {
    var card = btn.closest('.experience-card');
    if (!card) return;
    var expanded = card.classList.toggle('expanded');
    btn.textContent = expanded ? 'Show less' : 'Show more';
  };

  // ========== KEYBOARD SHORTCUTS ==========
  function initKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        // Close any open modal
        document.querySelectorAll('.modal.open').forEach(function (modal) {
          var id = modal.id.replace('-modal', '');
          closeModal(id);
        });
      }
    });
  }

  // ========== INIT ==========
  function init() {
    initTheme();
    initHero();
    initScrollReveal();
    initModalOverlays();
    initProjectCards();
    initKeyboard();

    // Theme toggle button
    var toggleBtn = document.querySelector('.theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleTheme);
    }
  }

  // Expose closeModal globally for inline onclick
  window.closeModal = closeModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
