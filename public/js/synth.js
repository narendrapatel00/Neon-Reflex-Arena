/**
 * Neon Reflex Arena - Procedural Web Audio Synthesizer
 * Generates all sound effects and background music on-the-fly.
 */

class SynthController {
  constructor() {
    this.ctx = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    
    // Nodes for BGM
    this.masterBgmGain = null;
    this.masterSfxGain = null;
    
    // Music Sequencer Variables
    this.isPlayingMusic = false;
    this.bpm = 125;
    this.beatDuration = 60 / this.bpm; // Duration of one beat in seconds
    this.currentStep = 0;
    this.schedulerTimer = null;
    this.nextNoteTime = 0.0;
    this.scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)
    this.lookahead = 25.0; // How frequently to call scheduler (ms)
    
    // Music State Modulators
    this.comboIntensity = 1; // 1 to 5, increases lowpass filter cutoff and lead volume
    this.bgmFilter = null;
    
    // Scales: C Minor Pentatonic for leads
    this.scale = [130.81, 146.83, 155.56, 174.61, 196.00, 220.00, 233.08, 261.63, 293.66, 311.13, 349.23, 392.00, 466.16, 523.25]; // C3, D3, Eb3, F3, G3, A3, Bb3, C4, D4, Eb4, F4, G4, Bb4, C5
    // Bass sequence notes (C2, Eb2, G2, Bb2, Ab2, Bb2)
    this.bassNotes = [65.41, 65.41, 77.78, 77.78, 98.00, 98.00, 116.54, 103.83];
  }

  // Initialize the Web Audio Context (must be triggered by a user gesture)
  init() {
    if (this.ctx) return;
    
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      
      // Setup master gains
      this.masterBgmGain = this.ctx.createGain();
      this.masterBgmGain.gain.setValueAtTime(this.musicEnabled ? 0.22 : 0, this.ctx.currentTime);
      
      this.masterSfxGain = this.ctx.createGain();
      this.masterSfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.35 : 0, this.ctx.currentTime);
      
      // Global lowpass filter for the BGM to make it sound muffled or open up with combo
      this.bgmFilter = this.ctx.createBiquadFilter();
      this.bgmFilter.type = 'lowpass';
      this.bgmFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
      this.bgmFilter.Q.setValueAtTime(1, this.ctx.currentTime);
      
      // Route BGM nodes
      this.bgmFilter.connect(this.masterBgmGain);
      this.masterBgmGain.connect(this.ctx.destination);
      
      // Route SFX nodes directly
      this.masterSfxGain.connect(this.ctx.destination);
      
      console.log('Synth Controller Initialized successfully.');
      
      // Start background music loop
      this.startMusic();
    } catch (e) {
      console.error('Failed to initialize Web Audio API Synth:', e);
    }
  }

  resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Toggle Music state
  toggleMusic(enabled) {
    this.musicEnabled = enabled;
    if (this.masterBgmGain && this.ctx) {
      this.masterBgmGain.gain.setValueAtTime(enabled ? 0.22 : 0, this.ctx.currentTime);
    }
    if (enabled) {
      this.resumeContext();
      this.startMusic();
    }
  }

  // Toggle SFX state
  toggleSfx(enabled) {
    this.sfxEnabled = enabled;
    if (this.masterSfxGain && this.ctx) {
      this.masterSfxGain.gain.setValueAtTime(enabled ? 0.35 : 0, this.ctx.currentTime);
    }
  }

  // ==========================================
  // PROCEDURAL SOUND EFFECTS (SFX)
  // ==========================================

  // Play Orb Spawn sound
  playSpawn() {
    if (!this.ctx || !this.sfxEnabled) return;
    this.resumeContext();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sine';
    // Gentle ascending chime
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.18);
    
    gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
    
    osc.connect(gainNode);
    gainNode.connect(this.masterSfxGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  // Play Orb Hit laser sound
  playHit(combo = 1) {
    if (!this.ctx || !this.sfxEnabled) return;
    this.resumeContext();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.type = 'triangle';
    
    // Pitch depends slightly on combo multiplier to create a rewarding ascending reward
    const baseFreq = 700 + (combo * 100);
    const endFreq = 150 + (combo * 20);
    const duration = 0.16 + (combo * 0.01);
    
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
    
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(endFreq * 1.5, this.ctx.currentTime + duration);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterSfxGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Play Orb Miss detuned buzz sound
  playMiss() {
    if (!this.ctx || !this.sfxEnabled) return;
    this.resumeContext();

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(90, this.ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.3);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(93.5, this.ctx.currentTime); // detune for growl
    osc2.frequency.linearRampToValueAtTime(63.5, this.ctx.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.masterSfxGain);
    
    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.3);
    osc2.stop(this.ctx.currentTime + 0.3);
  }

  // Play Combo milestone chime
  playComboUp() {
    if (!this.ctx || !this.sfxEnabled) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    // Play a shiny Major arpeggio cascade: E5 -> G#5 -> B5 -> E6
    const arpeggio = [659.25, 830.61, 987.77, 1318.51];
    
    arpeggio.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      
      gainNode.gain.setValueAtTime(0, now + idx * 0.05);
      gainNode.gain.linearRampToValueAtTime(0.15, now + idx * 0.05 + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);
      
      osc.connect(gainNode);
      gainNode.connect(this.masterSfxGain);
      
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.25);
    });
  }

  // Play Game Over descending theme
  playGameOver() {
    if (!this.ctx || !this.sfxEnabled) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    // Sad C minor chord (C3, Eb3, G3, C4) sweeping downwards
    const chord = [130.81, 155.56, 196.00, 261.63];
    
    chord.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 1.2);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 1.2);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterSfxGain);
      
      osc.start(now);
      osc.stop(now + 1.2);
    });
  }

  // ==========================================
  // SEQUENCED BACKGROUND MUSIC (BGM)
  // ==========================================

  // Start BGM loop scheduler
  startMusic() {
    if (this.isPlayingMusic || !this.ctx) return;
    
    this.isPlayingMusic = true;
    this.nextNoteTime = this.ctx.currentTime;
    this.currentStep = 0;
    
    // Kick-start scheduling loop
    this.scheduler();
  }

  // Stop BGM loop scheduler
  stopMusic() {
    this.isPlayingMusic = false;
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  // Background Music Sequencer
  scheduler() {
    if (!this.isPlayingMusic) return;
    
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }
    
    this.schedulerTimer = setTimeout(() => this.scheduler(), this.lookahead);
  }

  advanceStep() {
    // 8-step sequencer loop
    this.currentStep = (this.currentStep + 1) % 16;
    const secondsPerBeat = 60.0 / this.bpm;
    // Each step is a 16th note (1/4 of a beat)
    this.nextNoteTime += 0.25 * secondsPerBeat;
  }

  // Schedule notes for a particular 16th-note step
  scheduleNote(step, time) {
    if (!this.musicEnabled) return;

    // Adjust global filter on BGM based on combo intensity
    // As combo goes up (1 to 5), the lowpass filter opens up and lets high frequencies through
    if (this.bgmFilter) {
      const targetFreq = 400 + (this.comboIntensity * 400); // 800Hz to 2400Hz
      this.bgmFilter.frequency.setTargetAtTime(targetFreq, time, 0.1);
    }

    // 1. Kick Drum (Triggered on step 0, 4, 8, 12)
    if (step % 4 === 0) {
      this.synthesizeKick(time);
    }

    // 2. Snare / Noise (Triggered on step 4, 12)
    if (step === 4 || step === 12) {
      this.synthesizeSnare(time);
    }

    // 3. Hi-Hats (Triggered on step 2, 6, 10, 14 - offbeat)
    if (step % 4 === 2) {
      this.synthesizeHihat(time);
    }

    // 4. Bass synth (Triggered on every 8th note: 0, 2, 4, 6, 8, 10, 12, 14)
    if (step % 2 === 0) {
      const bassIndex = Math.floor(step / 2) % this.bassNotes.length;
      const baseFreq = this.bassNotes[bassIndex];
      this.synthesizeBassLine(baseFreq, time);
    }

    // 5. Generative Arpeggiator Lead
    // Trigger rate increases as combo multiplier increases:
    // Combo x1: Trigger on step 0, 8
    // Combo x2: Trigger on step 0, 4, 8, 12
    // Combo x3+: Trigger on 8th notes
    // Combo x5: Trigger on 16th notes
    let shouldPlayLead = false;
    if (this.comboIntensity === 1 && (step === 0 || step === 8)) shouldPlayLead = true;
    else if (this.comboIntensity === 2 && step % 4 === 0) shouldPlayLead = true;
    else if (this.comboIntensity === 3 && step % 2 === 0) shouldPlayLead = true;
    else if (this.comboIntensity >= 4) shouldPlayLead = true;

    if (shouldPlayLead) {
      // Pick a semi-random note from C-minor pentatonic that moves in patterns
      const scaleDegree = this.getGenerativeMelodyDegree(step);
      const leadFreq = this.scale[scaleDegree] * 2; // Up one octave
      this.synthesizeLead(leadFreq, time);
    }
  }

  // Generative lead melody mapping based on step
  getGenerativeMelodyDegree(step) {
    // Deterministic melody based on step index + some variation
    const baseDegrees = [7, 9, 10, 7, 11, 9, 12, 10, 11, 7, 9, 13, 10, 11, 12, 7];
    let degree = baseDegrees[step];
    
    // Add minor variation for high combos
    if (this.comboIntensity >= 4 && Math.random() > 0.7) {
      degree += Math.floor(Math.random() * 3) - 1; // shift by 1 scale degree
    }
    
    return Math.max(0, Math.min(this.scale.length - 1, degree));
  }

  // Update combo state to modulate music
  updateMusicIntensity(combo) {
    this.comboIntensity = Math.min(5, Math.max(1, combo));
  }

  // ==========================================
  // PROCEDURAL INSTRUMENTS
  // ==========================================

  // Synthesize Kick Drum
  synthesizeKick(time) {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    
    gainNode.gain.setValueAtTime(0.28, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.13);
    
    osc.connect(gainNode);
    gainNode.connect(this.bgmFilter);
    
    osc.start(time);
    osc.stop(time + 0.13);
  }

  // Synthesize Snare Drum (Noise + swept triangle)
  synthesizeSnare(time) {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.15);
    
    gainNode.gain.setValueAtTime(0.15, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    
    osc.connect(gainNode);
    gainNode.connect(this.bgmFilter);
    
    osc.start(time);
    osc.stop(time + 0.15);
    
    // Add white noise pop for the snare tail
    this.playNoiseSnare(time);
  }

  // Generate white noise buffer
  playNoiseSnare(time) {
    const bufferSize = this.ctx.sampleRate * 0.12; // 120ms duration
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, time);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    
    noiseNode.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.bgmFilter);
    
    noiseNode.start(time);
    noiseNode.stop(time + 0.12);
  }

  // Synthesize Hi-Hat
  synthesizeHihat(time) {
    const bufferSize = this.ctx.sampleRate * 0.04; // Very short 40ms decay
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.04, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    
    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.bgmFilter);
    
    noiseNode.start(time);
    noiseNode.stop(time + 0.04);
  }

  // Synthesize Bassline instrument
  synthesizeBassLine(freq, time) {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    
    // Low pass filter for the bass to give it a heavy synthwave feel
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, time);
    
    gainNode.gain.setValueAtTime(0.12, time);
    // Short decay to create a rhythmic plucking bassline
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.bgmFilter);
    
    osc.start(time);
    osc.stop(time + 0.16);
  }

  // Synthesize Lead Melody instrument
  synthesizeLead(freq, time) {
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq * 0.5, time); // sub octave
    
    filter.type = 'peaking';
    filter.frequency.setValueAtTime(freq * 1.5, time);
    filter.Q.setValueAtTime(1, time);
    filter.gain.setValueAtTime(4, time);
    
    // Scale lead volume based on combo level
    const maxGain = 0.04 + (this.comboIntensity * 0.015);
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(maxGain, time + 0.02); // slight attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.22); // decay
    
    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.bgmFilter);
    
    osc.start(time);
    subOsc.start(time);
    osc.stop(time + 0.22);
    subOsc.stop(time + 0.22);
  }
}

// Instantiate globally so it can be referenced across modules
const synth = new SynthController();
window.synth = synth;
