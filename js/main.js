(function () {
  'use strict';

  var TOPICS = {
    projects:   { question: 'What are you working on?',  label: 'Projects' },
    experience: { question: 'Where have you worked?',    label: 'Work Experience' },
    skills:     { question: 'What tech do you use?',     label: 'Skills' },
    about:      { question: 'Tell me your story.',       label: 'My Story' }
  };

  var state = {
    explored: [],
    animating: false,
    minutes: 0,
    pendingSection: null,
    pendingQuestion: null
  };

  var conversation, quickReplies, messageArea, inputField, sendBtn;

  // ========== THEME ==========
  function initTheme() {
    if (localStorage.getItem('theme') === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  function toggleTheme() {
    if (document.documentElement.getAttribute('data-theme') === 'light') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }

  // ========== HERO ==========
  function initHero(callback) {
    var hero = document.getElementById('hero');
    if (!hero) return callback();

    var visited = sessionStorage.getItem('heroPlayed');
    if (visited) {
      hero.classList.remove('hero-animate');
      hero.classList.add('hero-skip');
      return callback();
    }

    var typingEl = hero.querySelector('.hero-typing');
    var bubbles = hero.querySelectorAll('.bubble');
    var receipt = hero.querySelector('.receipt');
    var pills = hero.querySelector('.contact-pills');

    setTimeout(function () {
      if (bubbles[0]) bubbles[0].classList.add('animate-in');
    }, 400);

    setTimeout(function () {
      if (typingEl) typingEl.classList.add('show');
    }, 1000);

    setTimeout(function () {
      if (typingEl) typingEl.classList.remove('show');
    }, 1800);

    var sentStart = 2000;
    for (var i = 1; i < bubbles.length; i++) {
      (function (el, delay) {
        setTimeout(function () { el.classList.add('animate-in'); }, delay);
      })(bubbles[i], sentStart + (i - 1) * 300);
    }

    var afterBubbles = sentStart + (bubbles.length - 1) * 300 + 200;

    setTimeout(function () {
      if (receipt) receipt.classList.add('animate-in');
    }, afterBubbles);

    setTimeout(function () {
      if (pills) pills.classList.add('animate-in');
    }, afterBubbles + 200);

    setTimeout(function () {
      hero.classList.remove('hero-animate');
      hero.classList.add('hero-skip');
      sessionStorage.setItem('heroPlayed', '1');
      callback();
    }, afterBubbles + 600);
  }

  // ========== TIME ==========
  function getTime() {
    state.minutes += 2;
    var h = 10;
    var m = state.minutes;
    while (m >= 60) { h++; m -= 60; }
    var ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

  // ========== SCROLL ==========
  function scrollToElement(el) {
    if (el) {
      requestAnimationFrame(function () {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  // ========== INPUT FIELD ==========
  function stageMessage(sectionId, questionText) {
    state.pendingSection = sectionId;
    state.pendingQuestion = questionText;
    inputField.textContent = questionText;
    inputField.classList.add('has-text');
    sendBtn.disabled = false;
    sendBtn.classList.add('active');
  }

  function clearInput() {
    state.pendingSection = null;
    state.pendingQuestion = null;
    inputField.textContent = 'Message Ayman...';
    inputField.classList.remove('has-text');
    sendBtn.disabled = true;
    sendBtn.classList.remove('active');
  }

  function sendMessage() {
    if (!state.pendingSection || state.animating) return;
    var sectionId = state.pendingSection;
    var questionText = state.pendingQuestion;
    clearInput();
    handleReply(sectionId, questionText);
  }

  // ========== QUICK REPLIES ==========
  function renderQuickReplies() {
    quickReplies.innerHTML = '';
    var remaining = Object.keys(TOPICS).filter(function (k) {
      return state.explored.indexOf(k) === -1;
    });

    if (remaining.length === 0) {
      var btn = createQuickBtn('How do I connect?', function () {
        stageMessage('contact', 'How do I connect?');
      });
      quickReplies.appendChild(btn);
      quickReplies.classList.add('visible');
      return;
    }

    remaining.forEach(function (key) {
      var btn = createQuickBtn(TOPICS[key].label, function () {
        stageMessage(key, TOPICS[key].question);
      });
      quickReplies.appendChild(btn);
    });

    quickReplies.classList.add('visible');
  }

  function createQuickBtn(label, onClick) {
    var btn = document.createElement('button');
    btn.className = 'quick-reply-btn';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function hideQuickReplies() {
    quickReplies.classList.remove('visible');
  }

  // ========== HANDLE REPLY ==========
  function handleReply(sectionId, questionText) {
    if (state.animating) return;
    state.animating = true;
    hideQuickReplies();

    var group = document.createElement('div');
    group.className = 'message-group';

    var ts = document.createElement('div');
    ts.className = 'timestamp';
    ts.textContent = getTime();
    group.appendChild(ts);

    var q = document.createElement('div');
    q.className = 'bubble sent solo chat-reveal';
    q.textContent = questionText;
    group.appendChild(q);

    conversation.appendChild(group);
    scrollToElement(ts);

    requestAnimationFrame(function () {
      q.classList.add('chat-visible');
    });

    setTimeout(function () {
      var typing = document.createElement('div');
      typing.className = 'typing-indicator';
      typing.innerHTML = '<span></span><span></span><span></span>';
      group.appendChild(typing);
      scrollToElement(typing);

      setTimeout(function () {
        group.removeChild(typing);

        var template = document.querySelector('[data-section="' + sectionId + '"]');
        if (template) {
          while (template.firstChild) {
            group.appendChild(template.firstChild);
          }
        }

        var reveals = group.querySelectorAll('.chat-reveal');
        reveals.forEach(function (el, i) {
          setTimeout(function () {
            el.classList.add('chat-visible');
          }, i * 120);
        });

        group.querySelectorAll('.project-card[data-modal]').forEach(function (card) {
          card.addEventListener('click', function () {
            openModal(card.getAttribute('data-modal'));
          });
        });

        if (sectionId !== 'contact') {
          state.explored.push(sectionId);
        }

        setTimeout(function () {
          state.animating = false;
          if (sectionId === 'contact') {
            showRestartOption();
          } else {
            renderQuickReplies();
          }
        }, reveals.length * 120 + 300);

      }, 1200);
    }, 600);
  }

  // ========== RESTART ==========
  function showRestartOption() {
    quickReplies.innerHTML = '';
    var btn = createQuickBtn('Start over', function () {
      resetConversation();
    });
    quickReplies.appendChild(btn);
    quickReplies.classList.add('visible');
  }

  function resetConversation() {
    hideQuickReplies();
    clearInput();
    state.explored = [];
    state.minutes = 0;
    sessionStorage.setItem('heroPlayed', '1');
    location.reload();
  }

  // ========== MODALS ==========
  function openModal(name) {
    var modal = document.getElementById(name + '-modal');
    var overlay = document.getElementById(name + '-overlay');
    if (!modal || !overlay) return;
    document.body.style.overflow = 'hidden';
    overlay.classList.add('open');
    requestAnimationFrame(function () {
      modal.classList.add('open');
    });
  }

  window.closeModal = function (name) {
    var modal = document.getElementById(name + '-modal');
    var overlay = document.getElementById(name + '-overlay');
    if (!modal || !overlay) return;
    modal.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(function () { modal.scrollTop = 0; }, 500);
  };

  window.toggleExpand = function (btn) {
    var card = btn.closest('.experience-card');
    if (!card) return;
    var expanded = card.classList.toggle('expanded');
    btn.textContent = expanded ? 'Show less' : 'Show more';
  };

  // ========== KEYBOARD ==========
  function initKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.open').forEach(function (modal) {
          var id = modal.id.replace('-modal', '');
          window.closeModal(id);
        });
      }
      if (e.key === 'Enter' && state.pendingSection) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // ========== INIT ==========
  function init() {
    initTheme();

    conversation = document.getElementById('conversation');
    quickReplies = document.getElementById('quick-replies');
    messageArea = document.querySelector('.message-area');
    inputField = document.querySelector('.input-field');
    sendBtn = document.querySelector('.input-send');

    var toggleBtn = document.querySelector('.theme-toggle');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);

    // Send button click
    sendBtn.addEventListener('click', function (e) {
      e.preventDefault();
      sendMessage();
    });

    // Modal overlay clicks
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function () {
        window.closeModal(overlay.id.replace('-overlay', ''));
      });
    });

    initKeyboard();

    initHero(function () {
      renderQuickReplies();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
