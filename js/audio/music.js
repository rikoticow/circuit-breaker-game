// Adaptive Music System and Synthesized Instruments
Object.assign(window.AudioSys, {
    musicActive: false,
    nextNoteTime: 0,
    current16thNote: 0,
    musicTimerID: null,
    tempoBPM: 140, 
    musicIntensity: 1,

    playGameMusic() {
        if (this.musicActive) return;
        if (audioCtx.state === 'suspended') {
            const resume = () => {
                audioCtx.resume().then(() => {
                    this.playGameMusic();
                    window.removeEventListener('click', resume);
                    window.removeEventListener('keydown', resume);
                });
            };
            window.addEventListener('click', resume);
            window.addEventListener('keydown', resume);
            return;
        }
        this.musicActive = true;
        this.current16thNote = 0;
        this.nextNoteTime = audioCtx.currentTime + 0.1;
        this.scheduleMusic();
    },

    stopGameMusic() {
        this.musicActive = false;
        if (this.musicTimerID) clearTimeout(this.musicTimerID);
    },

    setMusicIntensity(val) {
        this.musicIntensity = Math.max(0, Math.min(2, val));
        this.tempoBPM = (this.musicIntensity === 0) ? 100 : 140;
    },

    scheduleMusic() {
        if (!this.musicActive) return;
        const lookahead = 0.1; 
        while (this.nextNoteTime < audioCtx.currentTime + lookahead) {
            this.playMusicStep(this.current16thNote, this.nextNoteTime);
            const secondsPerBeat = 60.0 / this.tempoBPM;
            this.nextNoteTime += 0.25 * secondsPerBeat; 
            this.current16thNote++;
            if (this.current16thNote === 256) this.current16thNote = 0;
        }
        this.musicTimerID = setTimeout(() => this.scheduleMusic(), 25);
    },

    playMusicStep(step, time) {
        const bar = Math.floor(step / 16); 
        const localStep = step % 16;
        const progBar = bar % 4; 
        const bassFreqs = [82.4, 82.4, 130.8, 146.8];
        const bassRoot = bassFreqs[progBar];

        if (this.musicIntensity > 0) {
            if (localStep === 0) this.playPowerChord(bassRoot, time);
            if (localStep % 2 === 0 || localStep % 4 === 3) {
                if (localStep !== 0) this.playVariedChug(bassRoot, time, 1200, true);
            }
            this.playHiHat(time);
            if (localStep === 0 || localStep === 8 || localStep === 11) this.playKick(time);
            if (localStep === 4 || localStep === 12) this.playSnare(time);
            if (progBar === 0 && localStep === 0) this.playCinematicSnare(time);
            if (progBar === 3 && localStep >= 12 && localStep % 2 === 0) this.playSnare(time);
        } else {
            if (localStep === 0) this.playBladeRunnerPad(step, bar, time);
            if (localStep % 2 === 0) this.playHiHat(time);
        }

        const melodyBar = bar % 8;
        const melody = [
            [329.6, 0, 0, 392.0, 0, 0, 440.0, 0, 0, 493.9, 0, 440.0, 0, 392.0, 0, 0],
            [329.6, 0, 0, 0, 0, 0, 0, 0, 493.9, 0, 523.3, 0, 493.9, 0, 440.0, 0],
            [392.0, 0, 0, 329.6, 0, 0, 261.6, 0, 0, 329.6, 0, 0, 392.0, 0, 0, 0],
            [440.0, 0, 0, 370.0, 0, 0, 293.7, 0, 0, 370.0, 0, 440.0, 0, 587.3, 0, 0],
            [659.3, 0, 0, 587.3, 0, 0, 523.3, 0, 0, 493.9, 0, 0, 440.0, 0, 0, 0],
            [493.9, 0, 0, 392.0, 0, 0, 329.6, 0, 0, 0, 0, 0, 329.6, 392.0, 440.0, 493.9],
            [523.3, 0, 0, 493.9, 0, 0, 440.0, 0, 0, 392.0, 0, 0, 329.6, 0, 0, 0],
            [440.0, 0, 0, 0, 587.3, 0, 0, 0, 659.3, 0, 0, 0, 0, 0, 0, 0]
        ];
        const note = melody[melodyBar][localStep];
        if (note > 0) this.playMetalLead(note, time);
    },

    playBladeRunnerPad(step, bar, time) {
        if (step % 16 !== 0) return;
        const freqs = [130.8, 130.8, 130.8, 130.8, 130.8, 130.8, 174.6, 196.0];
        const freq = freqs[bar % 8] || 130.8;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(freq * 0.5, time);
        osc.detune.value = 15;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.03, time + 1.0);
        gain.gain.linearRampToValueAtTime(0, time + 3.0);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(time); osc.stop(time + 3.0);
    },

    playCinematicSnare(time) {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.5, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < buffer.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 800;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.06, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start(time);
    },

    playVariedChug(freq, time, filterFreq, isAggressive) {
        const duration = isAggressive ? 0.1 : 0.15;
        const gain = audioCtx.createGain();
        const shaper = audioCtx.createWaveShaper();
        shaper.curve = (function() {
            const n = 44100; const curve = new Float32Array(n);
            const dist = isAggressive ? 8 : 4;
            for (let i = 0; i < n; i++) {
                const x = (i * 2) / n - 1;
                curve[i] = Math.tanh(x * dist);
            }
            return curve;
        })();
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = filterFreq;
        const root = audioCtx.createOscillator(); root.type = 'sawtooth'; root.frequency.value = freq;
        const root2 = audioCtx.createOscillator(); root2.type = 'sawtooth'; root2.frequency.value = freq; root2.detune.value = 8;
        const fifth = audioCtx.createOscillator(); fifth.type = 'sawtooth'; fifth.frequency.value = freq * 1.5;
        gain.gain.setValueAtTime(0.08, time); gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        [root, root2, fifth].forEach(o => { o.connect(shaper); o.start(time); o.stop(time + duration); });
        shaper.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    },

    playKick(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.2);
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(time); osc.stop(time + 0.2);
    },

    playSnare(time) {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.value = 1000;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start(time);
    },

    playHiHat(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square'; osc.frequency.value = 8000;
        gain.gain.setValueAtTime(0.02, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(time); osc.stop(time + 0.03);
    },

    playPowerChord(freq, time) {
        const duration = 0.15;
        const gain = audioCtx.createGain();
        const shaper = audioCtx.createWaveShaper();
        shaper.curve = (function() {
            const n = 44100; const curve = new Float32Array(n);
            for (let i = 0; i < n; i++) {
                const x = (i * 2) / n - 1;
                curve[i] = Math.tanh(x * 5);
            }
            return curve;
        })();
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 1200;
        const root = audioCtx.createOscillator(); root.type = 'sawtooth'; root.frequency.value = freq;
        const root2 = audioCtx.createOscillator(); root2.type = 'sawtooth'; root2.frequency.value = freq; root2.detune.value = 10;
        const fifth = audioCtx.createOscillator(); fifth.type = 'sawtooth'; fifth.frequency.value = freq * 1.5; fifth.detune.value = -5;
        gain.gain.setValueAtTime(0.08, time); gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        [root, root2, fifth].forEach(o => { o.connect(shaper); o.start(time); o.stop(time + duration); });
        shaper.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    },

    playMetalLead(freq, time) {
        const duration = 0.3;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        osc1.type = 'sawtooth'; osc2.type = 'square';
        osc1.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq, time); osc2.detune.value = 15;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.setValueAtTime(4000, time);
        filter.frequency.exponentialRampToValueAtTime(1000, time + duration);
        osc1.connect(filter); osc2.connect(filter);
        filter.connect(gain); gain.connect(audioCtx.destination);
        osc1.start(time); osc2.start(time);
        osc1.stop(time + duration); osc2.stop(time + duration);
    }
});
