// High-energy Megaman-inspired Rock/Synth Soundtrack
// dual-tempo system: 90 BPM (Menu) / 140 BPM (Action)

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.connect(audioCtx.destination);
masterGain.gain.value = 0.3;

const AudioSys = {
    bpm: 140, // Gameplay tempo
    menuBpm: 90, // Menu tempo
    stepTime: 0,
    isPlaying: false,
    currentStep: 0,
    musicIntensity: 0, // 0: Menu/Ambient, 1: Action
    lastStepTime: 0,
    
    // Waveforms for different instruments
    synth: 'square',
    bass: 'sawtooth',
    lead: 'triangle',

    init() {
        this.stepTime = 60 / this.bpm / 4; // 16th notes
        this.lastStepTime = audioCtx.currentTime;
    },

    setMusicIntensity(val) {
        this.musicIntensity = val;
        // Update BPM and step time based on intensity
        const targetBpm = val === 0 ? this.menuBpm : this.bpm;
        this.stepTime = 60 / targetBpm / 4;
    },

    playTone(freq, type = 'sine', duration = 0.1, volume = 0.1, decay = 0.05) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(masterGain);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },

    // Sequencer for the rock-driven soundtrack
    playMusicStep() {
        if (!this.isPlaying) return;
        
        const step = this.currentStep % 16;
        const bar = Math.floor(this.currentStep / 16) % 4;

        if (this.musicIntensity === 0) {
            // MENU MODE (90 BPM - Heavy, sparse rhythmic chugs)
            // Heavy Kick / Bass impact on 1 and 9
            if (step === 0 || step === 8) {
                this.playTone(45, 'sawtooth', 0.4, 0.25); // Heavy Low C
                this.playTone(90, 'square', 0.2, 0.1);  // Octave slap
            }
            // Rhythmic industrial noise on 5 and 13
            if (step === 4 || step === 12) {
                this._playSnare(0.15, 0.1);
            }
        } else {
            // ACTION MODE (140 BPM - Driving 16th note Rock Patterns)
            // Bassline (Driving 8th/16th notes)
            const bassPitches = [32.7, 32.7, 36.7, 32.7, 43.6, 43.6, 38.9, 32.7]; // C1, D1, F1, Eb1
            const pitch = bassPitches[Math.floor(step/2) % bassPitches.length];
            this.playTone(pitch, 'sawtooth', 0.1, 0.2);

            // Drum Pattern
            if (step === 0 || step === 8) this.playTone(50, 'sine', 0.2, 0.3); // Kick
            if (step === 4 || step === 12) this._playSnare(0.15, 0.2); // Snare
            if (step % 2 === 0) this._playHiHat(0.05, 0.05); // Hats

            // Lead Synth Arpeggio (Every 4 bars change)
            const scales = [
                [261, 311, 392, 440], // Cm6
                [261, 311, 349, 415]  // Abmaj7
            ];
            const currentScale = scales[bar % 2];
            const leadNote = currentScale[step % currentScale.length];
            if (step % 4 === 0 || (bar === 3 && step > 8)) {
                this.playTone(leadNote * 2, 'square', 0.15, 0.08);
            }
        }

        this.currentStep++;
        
        // Schedule next step
        const nextTime = this.lastStepTime + this.stepTime;
        const delay = (nextTime - audioCtx.currentTime) * 1000;
        this.lastStepTime = nextTime;
        
        setTimeout(() => this.playMusicStep(), Math.max(0, delay));
    },

    _playSnare(duration, vol) {
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(vol, audioCtx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noise.start();
        
        // Add a "pop" to the snare
        this.playTone(180, 'triangle', 0.05, vol * 0.5);
    },

    _playHiHat(duration, vol) {
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 8000;
        
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(vol, audioCtx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noise.start();
    },

    // Game SFX
    move() { this.playTone(150 + Math.random() * 50, 'square', 0.05, 0.15); },
    rotate() { this.playTone(400, 'sine', 0.1, 0.1); this.playTone(600, 'sine', 0.08, 0.08); },
    collect() { this.playTone(800, 'sine', 0.1, 0.15); this.playTone(1200, 'sine', 0.15, 0.1); },
    corePowered() { 
        this.playTone(200, 'sawtooth', 0.3, 0.2);
        this.playTone(400, 'sawtooth', 0.2, 0.15);
        this.playTone(800, 'sawtooth', 0.1, 0.1);
    },
    levelComplete() {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
        notes.forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'square', 0.4, 0.15), i * 150);
        });
    },
    doorGrind() { this.playTone(60 + Math.random() * 20, 'sawtooth', 0.05, 0.05); },
    doorSlam() { this.playTone(40, 'sine', 0.2, 0.3); this._playSnare(0.2, 0.2); },
    rebootWarning() { this.playTone(100, 'square', 0.5, 0.2); },
    
    playGameMusic() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.lastStepTime = audioCtx.currentTime;
        this.playMusicStep();
    },

    updateHum(isMoving, pitchShift = 0, isDead = false) {
        // Ambient industrial hum or death silence
        if (isDead) {
            // High pitched noise or silence
            return;
        }
    }
};

window.AudioSys = AudioSys;