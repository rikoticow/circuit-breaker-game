/**
 * CIRCUIT BREAKER - Audio System (Megaman Inspired Rock/Synth)
 */

const AudioSys = {
    audioCtx: null,
    tempo: 140,
    nextStepTime: 0,
    currentStep: 0,
    currentBar: 0,
    isPlaying: false,
    isMenu: true,
    intensity: 0, // 0 to 1 based on energy propagation
    
    init() {
        if (this.audioCtx) return;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.isPlaying = true;
        this.scheduler();
    },

    setMenu(val) {
        this.isMenu = val;
        this.tempo = val ? 90 : 140;
    },

    scheduler() {
        if (!this.isPlaying) return;
        while (this.nextStepTime < this.audioCtx.currentTime + 0.1) {
            this.playMusicStep(this.currentStep, this.currentBar, this.nextStepTime);
            this.advanceStep();
        }
        setTimeout(() => this.scheduler(), 25);
    },

    advanceStep() {
        const secondsPerStep = 60 / this.tempo / 4;
        this.nextStepTime += secondsPerStep;
        this.currentStep++;
        if (this.currentStep >= 16) {
            this.currentStep = 0;
            this.currentBar++;
        }
    },

    playMusicStep(step, bar, time) {
        if (this.isMenu) {
            // Menu: Heavy atmospheric chugs
            if (step % 8 === 0) this.playKick(time);
            if (step % 16 === 8) this.playSnare(time);
            if (step % 4 === 0) this.playPowerChord(55, time); // A1
        } else {
            // Gameplay: Driving 16th note rock
            this.playKick(time);
            if (step % 8 === 4) this.playSnare(time);
            if (step % 2 === 0) this.playHiHat(time);
            
            // Bassline
            const bassFreqs = [55, 55, 65.4, 73.4]; // A, C, D
            const bass = bassFreqs[Math.floor(bar / 2) % 4];
            if (step % 4 === 0) this.playPowerChord(bass, time);
            
            // Lead if intensity high
            if (this.intensity > 0.5 && step % 8 === 0) {
                this.playMetalLead(bass * 4, time);
            }
        }
    },

    // Procedural Instruments
    playKick(time) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.2);
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(time); osc.stop(time + 0.2);
    },

    playSnare(time) {
        const noise = this.audioCtx.createBufferSource();
        const buffer = this.audioCtx.createBuffer(1, this.audioCtx.sampleRate * 0.1, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        noise.connect(gain); gain.connect(this.audioCtx.destination);
        noise.start(time);
    },

    playHiHat(time) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = 8000;
        gain.gain.setValueAtTime(0.02, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(time); osc.stop(time + 0.03);
    },

    playPowerChord(freq, time) {
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.value = freq;
        osc2.frequency.value = freq * 1.5; // Power fifth
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        osc1.connect(gain); osc2.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc1.start(time); osc2.start(time);
        osc1.stop(time + 0.2); osc2.stop(time + 0.2);
    },

    playMetalLead(freq, time) {
        const osc = this.audioCtx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.03, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(time); osc.stop(time + 0.1);
    },

    // UI/Game SFX
    move() { this.playNoise(200, 0.05, 0.05); },
    rotate() { this.playTone(440, 880, 0.1, 'square'); },
    push() { this.playTone(100, 50, 0.2, 'sawtooth'); },
    explosion() { this.playNoise(50, 0.5, 0.4); },
    corePowered() { this.playTone(880, 1760, 0.5, 'sine'); },
    coreLost() { this.playTone(220, 110, 0.3, 'sawtooth'); },

    playTone(f1, f2, dur, type) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f1, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(f2, this.audioCtx.currentTime + dur);
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + dur);
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        osc.start(); osc.stop(this.audioCtx.currentTime + dur);
    },

    playNoise(freq, dur, vol) {
        const noise = this.audioCtx.createBufferSource();
        const buffer = this.audioCtx.createBuffer(1, this.audioCtx.sampleRate * dur, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = this.audioCtx.createBiquadFilter();
        filter.frequency.value = freq;
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + dur);
        noise.connect(filter); filter.connect(gain); gain.connect(this.audioCtx.destination);
        noise.start();
    }
};
