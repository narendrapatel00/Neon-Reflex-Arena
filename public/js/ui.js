/**
 * Neon Reflex Arena - UI Dashboard Controller
 * Orchestrates game states, updates HUD widgets, animate stats numbers,
 * monitors achievements, and synchronizes with REST API and synth audio.
 */

class UIController {
  constructor() {
    // Game variables
    this.currentScore = 0;
    this.animatedScore = 0;
    this.highScore = 0;
    this.hits = 0;
    this.misses = 0;
    
    // Combo multiplier system
    this.comboCount = 0; // consecutive hits count
    this.comboMultiplier = 1; // x1, x2, x3, x5
    this.peakCombo = 1;
    
    // Timer
    this.timeLeft = 60.0;
    
    // Reaction times tracking
    this.hitTimestamps = [];
    this.averageReactionTime = 0;
    this.lastOrbSpawnTime = 0;
    
    // Pilot details
    this.username = '';
    this.achievements = {
      firstHit: false,
      comboMaster: false,
      accuracyKing: false,
      highScorer: false
    };
    
    // Audio toggles (default ON)
    this.musicOn = true;
    this.sfxOn = true;
  }

  // Initial execution boot sequence
  init() {
    this.loadSettings();
    this.runBootSequence();
    this.setupEventListeners();
  }

  // Load configuration and data from LocalStorage
  loadSettings() {
    try {
      this.username = localStorage.getItem('neon_reflex_username') || '';
      this.highScore = parseInt(localStorage.getItem('neon_reflex_highscore') || '0', 10);
      
      const savedMusic = localStorage.getItem('neon_reflex_music');
      if (savedMusic !== null) this.musicOn = savedMusic === 'true';
      
      const savedSfx = localStorage.getItem('neon_reflex_sfx');
      if (savedSfx !== null) this.sfxOn = savedSfx === 'true';
      
      const savedAch = localStorage.getItem('neon_reflex_achievements');
      if (savedAch) {
        this.achievements = { ...this.achievements, ...JSON.parse(savedAch) };
      }
      
      // Update UI cards
      document.getElementById('display-highscore').textContent = this.formatNumber(this.highScore);
      this.updateAchievementsUI();
    } catch (e) {
      console.error('Failed to load local storage configurations:', e);
    }
  }

  // Save configurations to LocalStorage
  saveSettings() {
    try {
      localStorage.setItem('neon_reflex_username', this.username);
      localStorage.setItem('neon_reflex_highscore', this.highScore.toString());
      localStorage.setItem('neon_reflex_music', this.musicOn.toString());
      localStorage.setItem('neon_reflex_sfx', this.sfxOn.toString());
      localStorage.setItem('neon_reflex_achievements', JSON.stringify(this.achievements));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  // Futuristic loading bar simulation
  runBootSequence() {
    const progressFill = document.getElementById('loader-progress-fill');
    const percentText = document.getElementById('loader-percent');
    const terminal = document.getElementById('boot-terminal');
    
    let percent = 0;
    
    const logs = [
      "&gt; CONNECTION SECURED WITH REFLEX NET...",
      "&gt; ALLOCATING GPU MEMORY HEAPS...",
      "&gt; PARALLAX VECTOR SENSORS: ONLINE",
      "&gt; AUDIO ENGINES BUFFERED: 44.1kHz STEREO",
      "&gt; INITIALIZING 3D WEBGL GRAPHICS ENVIRONMENT...",
      "&gt; NEURAL IMPLANT SYNAPSE SYNCHRONIZATION: COMPLETE",
      "&gt; SYSTEM STANDBY: READY FOR HOST ACCESS"
    ];
    
    const logInterval = setInterval(() => {
      if (logs.length > 0) {
        const line = document.createElement('div');
        line.className = 'boot-line';
        line.innerHTML = logs.shift();
        terminal.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
      }
    }, 400);

    const progressInterval = setInterval(() => {
      percent += Math.floor(Math.random() * 5) + 2;
      if (percent >= 100) {
        percent = 100;
        clearInterval(progressInterval);
        clearInterval(logInterval);
        
        // Finalize loading phase transition
        setTimeout(() => {
          this.endLoaderSequence();
        }, 500);
      }
      progressFill.style.width = percent + '%';
      percentText.textContent = percent + '%';
    }, 70);
  }

  endLoaderSequence() {
    const loaderScreen = document.getElementById('loader-screen');
    loaderScreen.style.opacity = 0;
    
    setTimeout(() => {
      loaderScreen.style.display = 'none';
      
      // Initialize ThreeJS scene structure in background
      if (window.threeGame) {
        window.threeGame.init('three-canvas-container', this);
      }
      
      // Check if username has been registered
      if (!this.username) {
        this.showIdentityModal();
      } else {
        this.transitionToDashboard();
      }
    }, 800);
  }

  showIdentityModal() {
    const modal = document.getElementById('identity-modal');
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('active');
    }, 50);
  }

  hideIdentityModal() {
    const modal = document.getElementById('identity-modal');
    modal.classList.remove('active');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }

  // Dashboard reveal transition
  transitionToDashboard() {
    const dashboard = document.getElementById('app-dashboard');
    
    document.getElementById('display-username').textContent = this.username.toUpperCase();
    this.updateRankTitle();
    
    // Fetch and draw leaderboard rankings
    this.loadLeaderboard();
    
    // Initialize sound toggles in UI buttons
    this.updateSoundButtons();
    
    dashboard.style.pointerEvents = 'auto';
    dashboard.style.opacity = 1;
    
    // Lock music initializations on dashboard entrance
    if (window.synth) {
      window.synth.init();
      window.synth.toggleMusic(this.musicOn);
      window.synth.toggleSfx(this.sfxOn);
    }
  }

  // Event handlers configurations
  setupEventListeners() {
    // Submit Identity form
    const submitBtn = document.getElementById('submit-identity-btn');
    const usernameInput = document.getElementById('username-input');
    
    submitBtn.addEventListener('click', () => {
      const val = usernameInput.value.trim();
      if (val.length >= 3) {
        this.username = val;
        this.saveSettings();
        this.hideIdentityModal();
        this.transitionToDashboard();
      } else {
        const error = document.getElementById('identity-error');
        error.textContent = "DESIGNATION MUST BE AT LEAST 3 CHARACTERS";
        error.classList.add('visible');
      }
    });

    usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        submitBtn.click();
      }
    });

    // Audio controls
    document.getElementById('toggle-music-btn').addEventListener('click', () => {
      this.musicOn = !this.musicOn;
      this.saveSettings();
      this.updateSoundButtons();
      if (window.synth) window.synth.toggleMusic(this.musicOn);
    });

    document.getElementById('toggle-sfx-btn').addEventListener('click', () => {
      this.sfxOn = !this.sfxOn;
      this.saveSettings();
      this.updateSoundButtons();
      if (window.synth) window.synth.toggleSfx(this.sfxOn);
    });

    // Theme controls (Light/Dark cyber mode)
    document.getElementById('toggle-theme-btn').addEventListener('click', () => {
      const body = document.body;
      const themeBtn = document.getElementById('toggle-theme-btn');
      
      if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        themeBtn.querySelector('i').className = 'fa-solid fa-sun';
        themeBtn.querySelector('span').textContent = 'LIGHT';
      } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        themeBtn.querySelector('i').className = 'fa-solid fa-moon';
        themeBtn.querySelector('span').textContent = 'DARK';
      }
    });

    // Fullscreen controls
    const fsBtn = document.getElementById('toggle-fullscreen-btn');
    fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
        fsBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
      } else {
        document.exitFullscreen();
        fsBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
      }
    });

    // Game Actions Overlays
    document.getElementById('start-game-btn').addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('restart-game-btn').addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('post-score-btn').addEventListener('click', () => {
      this.submitScore();
    });
  }

  // Update audio icons
  updateSoundButtons() {
    const musicBtn = document.getElementById('toggle-music-btn');
    const sfxBtn = document.getElementById('toggle-sfx-btn');
    
    if (this.musicOn) {
      musicBtn.classList.remove('disabled');
      musicBtn.querySelector('i').className = 'fa-solid fa-music';
      musicBtn.querySelector('span').textContent = 'MUSIC ON';
    } else {
      musicBtn.classList.add('disabled');
      musicBtn.querySelector('i').className = 'fa-solid fa-music-slash';
      musicBtn.querySelector('span').textContent = 'MUSIC OFF';
    }

    if (this.sfxOn) {
      sfxBtn.classList.remove('disabled');
      sfxBtn.querySelector('i').className = 'fa-solid fa-volume-high';
      sfxBtn.querySelector('span').textContent = 'SFX ON';
    } else {
      sfxBtn.classList.add('disabled');
      sfxBtn.querySelector('i').className = 'fa-solid fa-volume-xmark';
      sfxBtn.querySelector('span').textContent = 'SFX OFF';
    }
  }

  // Rank thresholds based on highscore
  updateRankTitle() {
    let rank = 'RECRUIT';
    if (this.highScore >= 450) rank = 'CYBER GOD';
    else if (this.highScore >= 300) rank = 'NEURAL COMMANDER';
    else if (this.highScore >= 150) rank = 'OPERATIVE';
    
    document.getElementById('display-rank').textContent = rank;
  }

  // Start gameplay
  startGame() {
    // Reset performance metrics
    this.currentScore = 0;
    this.animatedScore = 0;
    this.hits = 0;
    this.misses = 0;
    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.peakCombo = 1;
    this.timeLeft = 60.0;
    this.hitTimestamps = [];
    this.averageReactionTime = 0;
    this.lastOrbSpawnTime = Date.now();
    
    // Update displays
    document.getElementById('hud-score').textContent = '0000';
    document.getElementById('hud-multiplier').textContent = 'x1';
    document.getElementById('hud-accuracy').textContent = '100%';
    document.getElementById('hud-time').textContent = '60.00';
    document.getElementById('combo-bar-fill').style.width = '0%';
    
    document.getElementById('stats-hits').textContent = '0';
    document.getElementById('stats-misses').textContent = '0';
    document.getElementById('stats-reaction').textContent = '--- ms';
    document.getElementById('stats-peak-combo').textContent = 'x1';
    
    // Hide UI overlays
    document.getElementById('start-overlay').classList.remove('active');
    document.getElementById('gameover-overlay').classList.remove('active');
    
    // Trigger audio resume
    if (window.synth) {
      window.synth.resumeContext();
      window.synth.updateMusicIntensity(1);
    }
    
    // Trigger 3D scene engine
    if (window.threeGame) {
      window.threeGame.start();
    }
  }

  // End gameplay
  endGame() {
    if (window.threeGame) {
      window.threeGame.stop();
    }
    
    if (window.synth) {
      window.synth.playGameOver();
      window.synth.updateMusicIntensity(1);
    }
    
    // Calculate final telemetry ratios
    const totalClicks = this.hits + this.misses;
    const finalAccuracy = totalClicks > 0 ? Math.round((this.hits / totalClicks) * 100) : 0;
    
    // Fill GameOver screen details
    document.getElementById('final-score').textContent = this.formatNumber(this.currentScore);
    document.getElementById('final-accuracy').textContent = finalAccuracy + '%';
    document.getElementById('final-hits').textContent = this.hits;
    document.getElementById('final-max-combo').textContent = 'x' + this.peakCombo;
    
    // Show GameOver panel
    document.getElementById('gameover-overlay').classList.add('active');
    
    // Check personal best and achievements
    this.checkSessionAchievements(finalAccuracy);
  }

  // ==========================================
  // HUD SCORE FLOATING POPUPS
  // ==========================================
  
  // Create 2D popup animation at screen coordinates
  spawnFloatingScore(text, x, y, type = 'hit') {
    const container = document.getElementById('floating-popups-container');
    if (!container) return;
    
    const popup = document.createElement('div');
    popup.className = `floating-score ${type}`;
    popup.textContent = text;
    
    // Center alignment offset
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    
    container.appendChild(popup);
    
    // Automatic node removal after transition completes
    setTimeout(() => {
      popup.remove();
    }, 850);
  }

  // Screen shake wrapper
  shakeViewport() {
    const wrapper = document.getElementById('game-container');
    wrapper.classList.remove('screen-shake');
    void wrapper.offsetWidth; // Trigger reflow to restart css animation
    wrapper.classList.add('screen-shake');
    setTimeout(() => {
      wrapper.classList.remove('screen-shake');
    }, 150);
  }

  // Visual edge glows (Cyan/Magenta vignette)
  flashEdgeVignette(isHit = true) {
    const overlayId = isHit ? 'hit-flash-overlay' : 'miss-flash-overlay';
    const overlay = document.getElementById(overlayId);
    
    overlay.classList.remove('active');
    void overlay.offsetWidth; // Trigger reflow
    overlay.classList.add('active');
    setTimeout(() => {
      overlay.classList.remove('active');
    }, 80);
  }

  // ==========================================
  // GAME EVENT TELEMETRY DISPATCHES
  // ==========================================

  // Orb successfully clicked
  registerHit(orbType, clientX, clientY) {
    this.hits++;
    
    // Reaction speed metrics
    const now = Date.now();
    const reactionTime = now - this.lastOrbSpawnTime;
    this.hitTimestamps.push(reactionTime);
    this.lastOrbSpawnTime = now;
    
    // Calculate running average reaction time
    const sum = this.hitTimestamps.reduce((a, b) => a + b, 0);
    this.averageReactionTime = Math.round(sum / this.hitTimestamps.length);
    
    // Score increase values: primary = +10, secondary = +15, accent = +25
    let basePts = 10;
    if (orbType === 'secondary') basePts = 15;
    else if (orbType === 'accent') basePts = 25;
    
    const gained = basePts * this.comboMultiplier;
    this.currentScore += gained;
    
    // Animate score ticker numbers
    this.animateScoreTicker();
    
    // Combo multiplier calculations
    this.comboCount++;
    this.updateComboMultiplier();
    
    // Trigger visual feedback
    this.flashEdgeVignette(true);
    
    // Synthesize hit audio
    if (window.synth) {
      window.synth.playHit(this.comboMultiplier);
    }
    
    // Draw 2D popup overlay
    let displayTxt = `+${gained}`;
    if (this.comboMultiplier > 1) {
      displayTxt += ` (x${this.comboMultiplier})`;
    }
    this.spawnFloatingScore(displayTxt, clientX, clientY, this.comboMultiplier >= 3 ? 'combo-up' : 'hit');
    
    // Refresh Sidebar Dashboard telemetry
    this.updateLiveStats();
    
    // Quick achievement check
    if (!this.achievements.firstHit) {
      this.unlockAchievement('firstHit');
    }
  }

  // Clicked empty background
  registerMiss(clientX, clientY) {
    this.misses++;
    this.currentScore = Math.max(0, this.currentScore - 5);
    this.animateScoreTicker();
    
    // Reset combo
    this.breakCombo();
    
    // Trigger feedbacks
    this.shakeViewport();
    this.flashEdgeVignette(false);
    
    if (window.synth) {
      window.synth.playMiss();
    }
    
    this.spawnFloatingScore('-5', clientX, clientY, 'miss');
    this.updateLiveStats();
  }

  // Target orb expires self-destruction
  registerExpiry() {
    // Expiring resets combo but doesn't deduct score points
    this.breakCombo();
    this.updateLiveStats();
  }

  // Reset consecutive hits combo counters
  breakCombo() {
    this.comboCount = 0;
    this.comboMultiplier = 1;
    
    document.getElementById('hud-multiplier').textContent = 'x1';
    document.getElementById('combo-bar-fill').style.width = '0%';
    
    if (window.synth) {
      window.synth.updateMusicIntensity(1);
    }
  }

  // Combo progression system limits:
  // x1 -> x2 (3 hits) -> x3 (7 hits) -> x5 (12 hits)
  updateComboMultiplier() {
    let nextMult = 1;
    let progressPercent = 0;
    
    if (this.comboCount >= 12) {
      nextMult = 5;
      progressPercent = 100;
    } else if (this.comboCount >= 7) {
      nextMult = 3;
      // Interpolate progress between 7 and 12 (5 steps)
      progressPercent = Math.round(((this.comboCount - 7) / 5) * 100);
    } else if (this.comboCount >= 3) {
      nextMult = 2;
      // Interpolate between 3 and 7 (4 steps)
      progressPercent = Math.round(((this.comboCount - 3) / 4) * 100);
    } else {
      nextMult = 1;
      progressPercent = Math.round((this.comboCount / 3) * 100);
    }
    
    // Check if multiplier jumped to sound chimes
    if (nextMult > this.comboMultiplier) {
      if (window.synth) {
        window.synth.playComboUp();
        window.synth.updateMusicIntensity(nextMult);
      }
      this.showToastNotification("COMBO MULTIPLIER UP!", `System link synchronized to x${nextMult}!`);
    }
    
    this.comboMultiplier = nextMult;
    this.peakCombo = Math.max(this.peakCombo, nextMult);
    
    document.getElementById('hud-multiplier').textContent = `x${this.comboMultiplier}`;
    document.getElementById('combo-bar-fill').style.width = `${progressPercent}%`;
  }

  // Live sidebar stats panel
  updateLiveStats() {
    const totalClicks = this.hits + this.misses;
    const accuracy = totalClicks > 0 ? Math.round((this.hits / totalClicks) * 100) : 100;
    
    document.getElementById('hud-accuracy').textContent = `${accuracy}%`;
    
    document.getElementById('stats-hits').textContent = this.hits;
    document.getElementById('stats-misses').textContent = this.misses;
    document.getElementById('stats-reaction').textContent = this.averageReactionTime ? `${this.averageReactionTime} ms` : '--- ms';
    document.getElementById('stats-peak-combo').textContent = `x${this.peakCombo}`;
  }

  // Smooth counting animation for scoring using requestAnimationFrame
  animateScoreTicker() {
    const scoreVal = document.getElementById('hud-score');
    const target = this.currentScore;
    
    const step = () => {
      const diff = target - this.animatedScore;
      if (Math.abs(diff) < 1) {
        this.animatedScore = target;
        scoreVal.textContent = this.formatNumber(this.animatedScore);
      } else {
        // Increment score by 15% of remaining distance (creates ease-out deceleration curve)
        this.animatedScore += diff * 0.15;
        scoreVal.textContent = this.formatNumber(Math.round(this.animatedScore));
        requestAnimationFrame(step);
      }
    };
    
    requestAnimationFrame(step);
  }

  // Main countdown timer ticker
  updateTimer(seconds) {
    this.timeLeft = seconds;
    const timeVal = document.getElementById('hud-time');
    
    timeVal.textContent = this.timeLeft.toFixed(2);
    
    // Visual alerts for final 10 seconds hazard
    if (this.timeLeft <= 10.0 && this.timeLeft > 0) {
      timeVal.classList.add('emergency-pulse');
    } else {
      timeVal.classList.remove('emergency-pulse');
    }
    
    // Stop game on expiry
    if (this.timeLeft <= 0) {
      this.endGame();
    }
  }

  // Format integer to digital HUD zero padding (e.g. 35 -> 0035)
  formatNumber(num) {
    return String(Math.floor(num)).padStart(4, '0');
  }

  // ==========================================
  // ACHIEVEMENT SYSTEM
  // ==========================================

  // Perform checks at end of game match session
  checkSessionAchievements(finalAccuracy) {
    // Highscorer: 300+ pts
    if (this.currentScore >= 300 && !this.achievements.highScorer) {
      this.unlockAchievement('highScorer');
    }
    
    // Combo master: x5 peak combo
    if (this.peakCombo >= 5 && !this.achievements.comboMaster) {
      this.unlockAchievement('comboMaster');
    }
    
    // Accuracy king: 90%+ with min 20 hits
    if (finalAccuracy >= 90 && this.hits >= 20 && !this.achievements.accuracyKing) {
      this.unlockAchievement('accuracyKing');
    }
    
    // Check personal best updates
    if (this.currentScore > this.highScore) {
      this.highScore = this.currentScore;
      this.saveSettings();
      document.getElementById('display-highscore').textContent = this.formatNumber(this.highScore);
      this.updateRankTitle();
      
      this.showToastNotification("NEW RECORD STABILIZED!", `Your personal best record has reached ${this.currentScore}!`);
      
      // Trigger canvas-confetti blast
      this.triggerConfettiCelebration();
    }
  }

  unlockAchievement(key) {
    this.achievements[key] = true;
    this.saveSettings();
    this.updateAchievementsUI();
    
    // Trigger toast alerts
    let title = "";
    let desc = "";
    
    switch (key) {
      case 'firstHit':
        title = "FIRST CONTACT UNLOCKED";
        desc = "Established sensory lock with target energy orb.";
        break;
      case 'comboMaster':
        title = "NEURAL FLOW UNLOCKED";
        desc = "Successfully maintained dynamic lock to x5 combo.";
        break;
      case 'accuracyKing':
        title = "SNIPER CHROME UNLOCKED";
        desc = "Demonstrated maximum precision calibration above 90%.";
        break;
      case 'highScorer':
        title = "CYBER GOD UNLOCKED";
        desc = "Accumulated over 300 score units in a single session.";
        break;
    }
    
    this.showToastNotification("ACHIEVEMENT UNLOCKED", title, true);
    this.triggerConfettiCelebration(0.25); // smaller confetti splash
  }

  updateAchievementsUI() {
    let count = 0;
    
    const mappings = [
      { key: 'firstHit', id: 'ach-first-hit' },
      { key: 'comboMaster', id: 'ach-combo-master' },
      { key: 'accuracyKing', id: 'ach-accuracy-king' },
      { key: 'highScorer', id: 'ach-high-scorer' }
    ];
    
    mappings.forEach(item => {
      const element = document.getElementById(item.id);
      if (this.achievements[item.key]) {
        count++;
        element.classList.remove('locked');
        element.classList.add('unlocked');
        element.querySelector('.ach-badge').innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      }
    });
    
    document.getElementById('unlocked-count').textContent = `${count} / 4`;
  }

  // Trigger browser canvas-confetti particle splash
  triggerConfettiCelebration(intensity = 1.0) {
    if (typeof confetti === 'undefined') return;
    
    const count = Math.round(150 * intensity);
    const defaults = {
      origin: { y: 0.6 }
    };

    function fire(particleRatio, opts) {
      confetti(Object.assign({}, defaults, opts, {
        particleCount: Math.floor(count * particleRatio)
      }));
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#00F5FF', '#A855F7']
    });
    fire(0.2, {
      spread: 60,
      colors: ['#FF0080', '#00F5FF']
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      colors: ['#A855F7', '#FF0080']
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
      colors: ['#00F5FF', '#FF0080', '#A855F7']
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
      colors: ['#ffffff']
    });
  }

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================
  showToastNotification(badge, message, isAch = false) {
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.className = 'toast-notification' + (isAch ? ' ach-unlocked' : '');
    
    const iconClass = isAch ? 'fa-solid fa-medal toast-icon ach-unlocked' : 'fa-solid fa-circle-info toast-icon';
    
    toast.innerHTML = `
      <i class="${iconClass}"></i>
      <div class="toast-body">
        <h4>${badge.toUpperCase()}</h4>
        <p>${message}</p>
      </div>
      <div class="toast-glow"></div>
    `;
    
    container.appendChild(toast);
    
    // Audio alerts
    if (isAch && window.synth) {
      window.synth.playComboUp();
    }
    
    // Auto-remove notification after 4.5 seconds
    setTimeout(() => {
      toast.classList.add('closing');
      setTimeout(() => {
        toast.remove();
      }, 400);
    }, 4500);
  }

  // ==========================================
  // API INTEGRATION & LEADERBOARDS
  // ==========================================

  // Fetch rankings
  async loadLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    const syncIcon = document.getElementById('sync-icon');
    const syncText = document.getElementById('sync-text');
    
    // Start spinner animation
    if (syncIcon) syncIcon.classList.add('spinning');
    if (syncText) syncText.textContent = "SYNCING...";
    
    const result = await window.ScoreAPI.fetchLeaderboard();
    
    if (syncIcon) syncIcon.classList.remove('spinning');
    if (syncText) {
      syncText.textContent = result.source === 'backend' ? "ONLINE" : "LOCAL";
    }
    
    list.innerHTML = '';
    
    if (result.success && result.data.length > 0) {
      result.data.forEach((item, index) => {
        const rank = index + 1;
        const row = document.createElement('div');
        row.className = `leaderboard-item rank-${rank}`;
        
        // Highlight active user row
        if (item.username.toLowerCase() === this.username.toLowerCase()) {
          row.classList.add('highlighted');
        }
        
        row.innerHTML = `
          <div class="rank-badge">${rank}</div>
          <div class="lb-username">${item.username.toUpperCase()}</div>
          <div class="lb-score">${this.formatNumber(item.score)}</div>
        `;
        list.appendChild(row);
      });
    } else {
      // Empty placeholder
      list.innerHTML = `
        <div class="leaderboard-empty">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>NO SECTOR RANKS RECORDED YET</span>
        </div>
      `;
    }
  }

  // Submit highscore
  async submitScore() {
    const postBtn = document.getElementById('post-score-btn');
    const oldText = postBtn.querySelector('.btn-text') ? postBtn.querySelector('.btn-text').textContent : 'POST SCORE';
    
    postBtn.disabled = true;
    if (postBtn.querySelector('.btn-text')) {
      postBtn.querySelector('.btn-text').textContent = 'UPLOADING DATA...';
    }
    
    const result = await window.ScoreAPI.postScore(this.username, this.currentScore);
    
    postBtn.disabled = false;
    if (postBtn.querySelector('.btn-text')) {
      postBtn.querySelector('.btn-text').textContent = 'TRANSMITTED';
    }
    
    if (result.success) {
      this.showToastNotification("TELEMETRY TRANSMITTED", "Score saved successfully to global database.");
      // Refresh rankings
      this.loadLeaderboard();
    } else {
      this.showToastNotification("TRANSMISSION ERROR", "Failed to upload scores. Saved locally.");
    }
    
    // Restore button status after delay
    setTimeout(() => {
      if (postBtn.querySelector('.btn-text')) {
        postBtn.querySelector('.btn-text').textContent = oldText;
      }
    }, 2500);
  }
}

// Instantiate globally
const uiController = new UIController();
window.uiController = uiController;

// Start execution once window loaded
window.addEventListener('DOMContentLoaded', () => {
  uiController.init();
});
