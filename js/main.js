(function () {
  'use strict';

  var TOPICS = {
    projects:   { question: 'What are you working on?',  label: 'Projects',        emoji: '💻' },
    experience: { question: 'Where have you worked?',    label: 'Work Experience', emoji: '💼' },
    skills:     { question: 'What tech do you use?',     label: 'Skills',          emoji: '🛠️' },
    about:      { question: 'Tell me your story.',       label: 'My Story',        emoji: '📖' }
  };

  var state = {
    explored: [],
    animating: false,
    pendingSection: null,
    pendingQuestion: null,
    muted: true,
    konamiBuffer: []
  };

  var KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

  var conversation, quickReplies, messageArea, inputField, sendBtn, headerEmoji, pinnedNav;
  var sendSound, receiveSound;

  // ========== UTILS ==========
  function formatTime(date) {
    var h = date.getHours();
    var m = date.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

  function getNow() {
    return formatTime(new Date());
  }

  // ========== THEME ==========
  function initTheme() {
    var saved = localStorage.getItem('theme');
    if (saved) {
      if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    // Listen for system changes (only if user hasn't manually set)
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
        if (!localStorage.getItem('theme')) {
          if (e.matches) {
            document.documentElement.setAttribute('data-theme', 'light');
          } else {
            document.documentElement.removeAttribute('data-theme');
          }
        }
      });
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

  // ========== SOUNDS ==========
  function initSounds() {
    state.muted = localStorage.getItem('muted') !== 'false';
    // Short base64-encoded beep sounds (tiny, no external files needed)
    sendSound = new Audio('data:audio/wav;base64,UklGRl4AAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToAAABkAMgA/AD/APgA4AC8AJAAYAAwAAAA4AC8AJAAaABAABgA8ADIAKAAgABgAEAAIAAIAPAA0ACwAJA=');
    receiveSound = new Audio('data:audio/wav;base64,UklGRl4AAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToAAAAwAGAAkAC8AOgA/AD/APwA6AC8AJAAYAAwAAAA8ADQALAA0ADwAAgAIABAAGAAeACQAKgAwADYAOg=');
    sendSound.volume = 0.3;
    receiveSound.volume = 0.3;
  }

  function playSound(sound) {
    if (state.muted || !sound) return;
    sound.currentTime = 0;
    sound.play().catch(function () {});
  }

  function toggleMute() {
    state.muted = !state.muted;
    localStorage.setItem('muted', state.muted ? 'true' : 'false');
    var muteBtn = document.querySelector('.mute-toggle');
    if (muteBtn) {
      muteBtn.querySelector('.icon-muted').style.display = state.muted ? 'block' : 'none';
      muteBtn.querySelector('.icon-unmuted').style.display = state.muted ? 'none' : 'block';
    }
  }

  // ========== HERO ==========
  function initHero(callback) {
    var hero = document.getElementById('hero');
    if (!hero) return callback();

    // Set hero timestamp to current time
    var heroTs = hero.querySelector('.timestamp');
    if (heroTs) heroTs.textContent = 'Today ' + getNow();

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
      playSound(sendSound);
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

    setTimeout(function () {
      playSound(receiveSound);
    }, sentStart);

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

  // ========== SCROLL ==========
  function scrollToElement(el) {
    if (el) {
      requestAnimationFrame(function () {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  // ========== EMOJI STATUS ==========
  function updateEmoji(sectionId) {
    if (!headerEmoji) return;
    var emoji = '👋';
    if (sectionId && TOPICS[sectionId]) {
      emoji = TOPICS[sectionId].emoji;
    } else if (sectionId === 'contact') {
      emoji = '🤝';
    }
    headerEmoji.classList.add('emoji-flip');
    setTimeout(function () {
      headerEmoji.textContent = emoji;
      headerEmoji.classList.remove('emoji-flip');
    }, 150);
  }

  // ========== PINNED NAV ==========
  function initPinnedNav() {
    pinnedNav = document.getElementById('pinned-nav');
    if (!pinnedNav) return;
    Object.keys(TOPICS).forEach(function (key) {
      var pin = pinnedNav.querySelector('[data-pin="' + key + '"]');
      if (pin) {
        pin.addEventListener('click', function () {
          if (state.explored.indexOf(key) !== -1) {
            // Scroll to that section
            var section = document.querySelector('[data-section-group="' + key + '"]');
            if (section) scrollToElement(section);
          } else if (!state.animating) {
            stageMessage(key, TOPICS[key].question);
          }
        });
      }
    });
  }

  function updatePinnedNav() {
    if (!pinnedNav) return;
    state.explored.forEach(function (key) {
      var pin = pinnedNav.querySelector('[data-pin="' + key + '"]');
      if (pin) pin.classList.add('explored');
    });
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
    playSound(sendSound);
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
    updateEmoji(sectionId);

    var group = document.createElement('div');
    group.className = 'message-group';
    if (sectionId !== 'contact') {
      group.setAttribute('data-section-group', sectionId);
    }

    var ts = document.createElement('div');
    ts.className = 'timestamp';
    ts.textContent = getNow();
    group.appendChild(ts);

    var q = document.createElement('div');
    q.className = 'bubble sent solo bubble-send-effect';
    q.textContent = questionText;
    group.appendChild(q);

    conversation.appendChild(group);
    scrollToElement(ts);

    // Remove send effect class after animation
    q.addEventListener('animationend', function () {
      q.classList.remove('bubble-send-effect');
    });

    setTimeout(function () {
      var typing = document.createElement('div');
      typing.className = 'typing-indicator';
      typing.innerHTML = '<span></span><span></span><span></span>';
      group.appendChild(typing);
      scrollToElement(typing);

      setTimeout(function () {
        group.removeChild(typing);
        playSound(receiveSound);

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

        // Bind project card clicks
        group.querySelectorAll('.project-card[data-modal]').forEach(function (card) {
          card.addEventListener('click', function () {
            openModal(card.getAttribute('data-modal'));
          });
        });

        // Bind reactions on received bubbles
        group.querySelectorAll('.bubble.received').forEach(function (bubble) {
          initReaction(bubble);
        });

        if (sectionId !== 'contact') {
          state.explored.push(sectionId);
          updatePinnedNav();
        }

        // Update read receipt after content loads
        var receipt = group.querySelector('.receipt');
        if (receipt) {
          setTimeout(function () {
            receipt.classList.add('receipt-read');
            receipt.textContent = 'Read ' + getNow();
          }, reveals.length * 120 + 800);
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

  // ========== REACTIONS ==========
  var REACTIONS = ['❤️', '👍', '👎', '😂', '‼️', '❓'];

  function initReaction(bubble) {
    bubble.classList.add('reactable');
    bubble.addEventListener('click', function (e) {
      // Don't trigger on links or buttons inside the bubble
      if (e.target.closest('a, button, .project-card, .experience-card, .skills-card, .contact-card')) return;
      toggleReactionBar(bubble);
    });
  }

  function toggleReactionBar(bubble) {
    // Close any open bars first
    document.querySelectorAll('.reaction-bar.show').forEach(function (bar) {
      bar.classList.remove('show');
    });

    var existing = bubble.querySelector('.reaction-bar');
    if (existing) {
      existing.classList.toggle('show');
      return;
    }

    var bar = document.createElement('div');
    bar.className = 'reaction-bar show';
    REACTIONS.forEach(function (emoji) {
      var btn = document.createElement('button');
      btn.className = 'reaction-btn';
      btn.textContent = emoji;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        addReaction(bubble, emoji);
        bar.classList.remove('show');
      });
      bar.appendChild(btn);
    });
    bubble.appendChild(bar);
  }

  function addReaction(bubble, emoji) {
    var badge = bubble.querySelector('.reaction-badge');
    if (badge) {
      if (badge.textContent === emoji) {
        badge.remove();
        return;
      }
      badge.textContent = emoji;
    } else {
      badge = document.createElement('span');
      badge.className = 'reaction-badge';
      badge.textContent = emoji;
      bubble.appendChild(badge);
    }
    badge.classList.add('reaction-pop');
    badge.addEventListener('animationend', function () {
      badge.classList.remove('reaction-pop');
    });
  }

  // ========== KONAMI CODE ==========
  function checkKonami(key) {
    state.konamiBuffer.push(key);
    if (state.konamiBuffer.length > KONAMI.length) {
      state.konamiBuffer.shift();
    }
    if (state.konamiBuffer.length === KONAMI.length &&
        state.konamiBuffer.every(function (k, i) { return k === KONAMI[i]; })) {
      triggerEasterEgg();
      state.konamiBuffer = [];
    }
  }

  function triggerEasterEgg() {
    // Confetti
    var container = document.createElement('div');
    container.className = 'confetti-container';
    for (var i = 0; i < 80; i++) {
      var piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.animationDelay = Math.random() * 2 + 's';
      piece.style.animationDuration = (2 + Math.random() * 2) + 's';
      piece.style.background = ['#0b93f6', '#30d158', '#ff375f', '#ffd60a', '#bf5af2', '#ff9f0a'][Math.floor(Math.random() * 6)];
      container.appendChild(piece);
    }
    document.body.appendChild(container);
    setTimeout(function () { container.remove(); }, 4000);

    // Secret bubble
    var group = document.createElement('div');
    group.className = 'message-group';
    var ts = document.createElement('div');
    ts.className = 'timestamp';
    ts.textContent = '🎉 Secret Unlocked';
    group.appendChild(ts);
    var bubble = document.createElement('div');
    bubble.className = 'bubble received solo chat-reveal';
    bubble.textContent = "You found the secret! Fun fact: I've written code in 7+ languages across 3 continents 🌍";
    group.appendChild(bubble);
    conversation.appendChild(group);
    requestAnimationFrame(function () { bubble.classList.add('chat-visible'); });
    scrollToElement(ts);
    playSound(receiveSound);
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
      // Konami
      checkKonami(e.key);

      if (e.key === 'Escape') {
        // Close reaction bars
        document.querySelectorAll('.reaction-bar.show').forEach(function (bar) {
          bar.classList.remove('show');
        });
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

    // Close reaction bars on outside click
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.reactable')) {
        document.querySelectorAll('.reaction-bar.show').forEach(function (bar) {
          bar.classList.remove('show');
        });
      }
    });
  }

  // ========== INIT ==========
  function init() {
    initTheme();
    initSounds();

    conversation = document.getElementById('conversation');
    quickReplies = document.getElementById('quick-replies');
    messageArea = document.querySelector('.message-area');
    inputField = document.querySelector('.input-field');
    sendBtn = document.querySelector('.input-send');
    headerEmoji = document.querySelector('.header-emoji');

    var toggleBtn = document.querySelector('.theme-toggle');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);

    var muteBtn = document.querySelector('.mute-toggle');
    if (muteBtn) muteBtn.addEventListener('click', toggleMute);

    sendBtn.addEventListener('click', function (e) {
      e.preventDefault();
      sendMessage();
    });

    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function () {
        window.closeModal(overlay.id.replace('-overlay', ''));
      });
    });

    initPinnedNav();
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
