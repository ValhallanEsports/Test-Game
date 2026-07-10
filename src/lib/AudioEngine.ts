/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isMusicPlaying: boolean = false;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  // Techno sequencer state
  private schedulerIntervalId: number | null = null;
  private currentBeat: number = 0;
  private tempo: number = 135; // BPM
  private beatDuration: number = 60 / 135; // duration of a quarter note in seconds
  private beatCallback: ((beatCount: number) => void) | null = null;

  constructor() {
    // Lazy initialisation on first interaction
  }

  public init() {
    if (this.ctx) return;

    try {
      // Setup Web Audio Context
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      // Master output controls
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Music sub-mix
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // SFX sub-mix
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Resume if suspended (browser security)
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.error("Web Audio API not supported or failed to initialize:", e);
    }
  }

  public setBeatCallback(callback: (beatCount: number) => void) {
    this.beatCallback = callback;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.5, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuteState(): boolean {
    return this.isMuted;
  }

  public startMusic() {
    this.init();
    if (!this.ctx || this.isMusicPlaying) return;

    this.ctx.resume().then(() => {
      this.isMusicPlaying = true;
      this.currentBeat = 0;
      this.schedulerIntervalId = window.setInterval(() => this.scheduler(), 120);
    });
  }

  public stopMusic() {
    if (this.schedulerIntervalId) {
      window.clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
    }
    this.isMusicPlaying = false;
  }

  // Retro Synthesised Techno Sequencer
  private scheduler() {
    if (!this.ctx || !this.musicGain || this.isMuted) return;

    const lookAhead = 0.200; // Look-ahead time in seconds
    const timePerSubbeat = this.beatDuration / 4; // 16th notes
    
    // We tick every 120ms and schedule events that happen shortly in the future
    const currentTime = this.ctx.currentTime;
    
    // Let's schedule notes for the next 150ms
    const scheduleTime = currentTime + lookAhead;

    // A simple, classic techno groove (Kick, Bassline, Hi-hat, Beep Lead)
    // 16-step sequence loop
    const step = this.currentBeat % 16;
    
    // Trigger callbacks for visual pulse (on every 4th step - the quarter beat)
    if (step % 4 === 0 && this.beatCallback) {
      this.beatCallback(Math.floor(this.currentBeat / 4));
    }

    // --- Synthesise Kick Drum (steps 0, 4, 8, 12) ---
    if (step % 4 === 0) {
      this.playKick(currentTime);
    }

    // --- Synthesise Hi-Hat (steps 2, 6, 10, 14 - offbeats) ---
    if (step % 4 === 2) {
      this.playHiHat(currentTime);
    } else if (step % 2 === 1 && Math.random() > 0.6) {
      // Snare-like noise rattle on random odd steps
      this.playSnare(currentTime);
    }

    // --- Synthesise Bassline (Rolling 16th notes or rhythm) ---
    // Notes: C2 (65Hz), Eb2 (77Hz), G2 (98Hz), Bb2 (116Hz)
    const scale = [65.41, 77.78, 97.99, 116.54, 130.81]; // C minor pentatonic bass
    let bassIdx = 0;
    if (step < 4) bassIdx = 0;
    else if (step < 8) bassIdx = 1;
    else if (step < 12) bassIdx = 2;
    else bassIdx = 3;

    // Syncopated bass pattern: play on most steps except first subbeat of a beat
    if (step % 4 !== 0) {
      this.playBass(scale[bassIdx], currentTime, 0.1);
    }

    // --- Synthesise Lead Arpeggios (Fast rhythmic melodic lines) ---
    // Let's play a melody that shifts keys
    const leadScale = [261.63, 311.13, 392.00, 466.16, 523.25, 622.25]; // C minor pentatonic lead
    const melody = [0, 2, 4, 3, 5, 4, 2, 1, 0, 3, 2, 5, 4, 1, 3, 2];
    const leadNote = leadScale[melody[step % leadScale.length]];

    // Geometry dash visual synched melody
    if (step % 3 === 0 && Math.random() > 0.3) {
      this.playLead(leadNote, currentTime, 0.12);
    }

    this.currentBeat++;
  }

  // --- Core Instruments ---

  private playKick(time: number) {
    if (!this.ctx || !this.musicGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.musicGain);
    
    // Pitch drop for kick drum punch
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.2);
    
    // Quick decay volume envelope
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
    
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private playHiHat(time: number) {
    if (!this.ctx || !this.musicGain) return;

    // Highpass filtered white noise for hi-hat
    const bufferSize = this.ctx.sampleRate * 0.05; // 50ms buffer
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  private playSnare(time: number) {
    if (!this.ctx || !this.musicGain) return;

    // Lowpass/bandpass noise combined with brief tone
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.08);
  }

  private playBass(frequency: number, time: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Sawtooth bass gives a classic buzzy electro feel
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, time);

    // Warm low-pass filter to keep bass deep but clean
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, time);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  private playLead(frequency: number, time: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Triangle or square lead for geometry retro vibes
    osc.type = Math.random() > 0.5 ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(frequency, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, time);
    filter.Q.setValueAtTime(2, time);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  // --- Sound Effects (SFX) ---

  public playJump() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    // Rapid pitch sweep up (classic arcade jump!)
    osc.frequency.exponentialRampToValueAtTime(650, time + 0.15);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.16);
  }

  public playDuck() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, time);
    // Slide pitch down for ducking squash
    osc.frequency.linearRampToValueAtTime(110, time + 0.12);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.13);
  }

  public playOrbTap() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // High pitched chime ring
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, time);
    osc.frequency.exponentialRampToValueAtTime(1400, time + 0.08);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    // Add brief bandpass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, time);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.26);
  }

  public playPortal() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Sci-fi sweep
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.3);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, time);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.31);
  }

  public playCheckpointSet() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const time = this.ctx.currentTime;
    
    // Sparkly little dual arpeggio
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C major chords
    frequencies.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      
      const noteTime = time + idx * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.12, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.16);
    });
  }

  public playCheckpointLoad() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Futuristic sweep-up sound indicating rewind
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.linearRampToValueAtTime(800, time + 0.25);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.26);
  }

  public playCrash() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const time = this.ctx.currentTime;

    // 1. Synthesise heavy low frequency boom
    const osc = this.ctx.createOscillator();
    const gainOsc = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(20, time + 0.3);

    gainOsc.gain.setValueAtTime(0.4, time);
    gainOsc.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    osc.connect(gainOsc);
    gainOsc.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.45);

    // 2. Synthesise explosive noise spray
    const bufferSize = this.ctx.sampleRate * 0.35; // 350ms crash noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.35);

    const gainNoise = this.ctx.createGain();
    gainNoise.gain.setValueAtTime(0.35, time);
    gainNoise.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    noise.connect(filter);
    filter.connect(gainNoise);
    gainNoise.connect(this.sfxGain);

    noise.start(time);
    noise.stop(time + 0.36);
  }

  public playSpeedPad() {
    this.init();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, time);
    osc.frequency.linearRampToValueAtTime(1200, time + 0.15);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(time);
    osc.stop(time + 0.16);
  }
}

// Singleton instances
const audioEngine = new AudioEngine();
export default audioEngine;
