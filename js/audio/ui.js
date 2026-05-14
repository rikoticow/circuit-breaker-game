// UI, System, Narrative and Cinematic Audio
Object.assign(window.AudioSys, {
    selectorMove() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const duration = 0.15;
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(450, now + duration);
        gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.08, now + 0.05); gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + duration);
        const clickOsc = audioCtx.createOscillator(); const clickGain = audioCtx.createGain();
        clickOsc.type = 'square'; clickOsc.frequency.setValueAtTime(800, now);
        clickGain.gain.setValueAtTime(0.03, now); clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        clickOsc.connect(clickGain); clickGain.connect(audioCtx.destination);
        clickOsc.start(now); clickOsc.stop(now + 0.02);
    },

    undo() {
        this.playTone(300, 'square', 0.1, 0.05);
        setTimeout(() => this.playTone(200, 'square', 0.15, 0.05), 50);
    },

    rechargeTick(current, max) {
        const pct = current / max;
        const freq = 400 + (pct * 800);
        this.playTone(freq, 'sine', 0.05, 0.05);
    },

    coreLost() {
        this.playTone(392, 'sawtooth', 0.2, 0.1); // G4
        setTimeout(() => this.playTone(311, 'sawtooth', 0.3, 0.1), 150); // Eb4
    },

    lifeLost() {
        if (audioCtx.state !== 'running') return;
        const melody = [523.25, 415.30, 311.13, 233.08];
        melody.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'square', 0.25, 0.08), i * 150);
        });
    },

    playScrapCollect() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        for (let i = 0; i < 5; i++) {
            const delay = i * 0.04 + Math.random() * 0.03;
            const freq = 1200 + Math.random() * 2000;
            setTimeout(() => {
                const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
                osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                g.gain.setValueAtTime(0.04, audioCtx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
                osc.connect(g); g.connect(audioCtx.destination);
                osc.start(); osc.stop(audioCtx.currentTime + 0.1);
            }, delay * 1000);
        }
        const bufferSize = audioCtx.sampleRate * 0.1;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.2;
        const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 3000;
        const g = audioCtx.createGain(); g.gain.setValueAtTime(0.03, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        noise.connect(filter); filter.connect(g); g.connect(audioCtx.destination);
        noise.start(now);
    },

    playFall() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.8);
        gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.8);
        setTimeout(() => {
            const thud = audioCtx.createOscillator(); const tGain = audioCtx.createGain();
            thud.type = 'sine'; thud.frequency.setValueAtTime(100, audioCtx.currentTime); thud.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.2);
            tGain.gain.setValueAtTime(0.2, audioCtx.currentTime); tGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
            thud.connect(tGain); tGain.connect(audioCtx.destination);
            thud.start(); thud.stop(audioCtx.currentTime + 0.2);
        }, 700);
    },

    levelComplete() {
        this.playTone(440, 'square', 0.1, 0.1);
        setTimeout(() => this.playTone(554, 'square', 0.1, 0.1), 100);
        setTimeout(() => this.playTone(659, 'square', 0.1, 0.1), 200);
        setTimeout(() => this.playTone(880, 'square', 0.3, 0.1), 300);
    },

    rebootWarning() {
        this.playTone(330, 'square', 0.05, 0.05);
        setTimeout(() => this.playTone(330, 'square', 0.05, 0.05), 100);
    },

    rebootConfirm() {
        this.playTone(200, 'sawtooth', 0.1, 0.1);
        setTimeout(() => this.playTone(100, 'sawtooth', 0.4, 0.1), 100);
    },

    playDenied() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    },

    playChapterUnlock() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const notes = [
            { f: 130.81, t: 0.0, d: 0.15 }, { f: 164.81, t: 0.15, d: 0.15 }, { f: 196.00, t: 0.3, d: 0.15 }, { f: 261.63, t: 0.45, d: 0.4 },
            { f: 329.63, t: 0.9, d: 0.1 }, { f: 329.63, t: 1.05, d: 0.1 }, { f: 349.23, t: 1.2, d: 0.1 }, { f: 392.00, t: 1.35, d: 0.4 },
            { f: 293.66, t: 1.8, d: 0.1 }, { f: 329.63, t: 1.95, d: 0.1 }, { f: 261.63, t: 2.1, d: 0.8 }
        ];
        notes.forEach(n => {
            this.playTone(n.f, 'square', n.d, 0.08, now + n.t);
            if (n.t > 0.8) this.playTone(n.f * 0.5, 'square', n.d, 0.04, now + n.t);
        });
    },

    playVoiceBlip(char, pitch = 1.0, isAI = true) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const baseFreq = isAI ? 200 : 300;
        const freq = baseFreq * pitch * (0.9 + Math.random() * 0.2); 
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.type = isAI ? 'square' : 'triangle'; osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.04, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.04);
    },

    braam() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const duration = 2.5;
        [40, 40.5, 39.5].forEach(freq => {
            const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(freq, now);
            filter.type = 'lowpass'; filter.frequency.setValueAtTime(2000, now); filter.Q.value = 15;
            gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
            osc.start(now); osc.stop(now + duration);
        });
    },

    _timerPitchIdx: 0,
    timerTick(seconds) {
        if (seconds < 0) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        const now = audioCtx.currentTime;
        const isEmergency = seconds <= 10;
        
        // "cada segundo que passa debe dar um tom com variação do pitch a cada vez"
        this._timerPitchIdx = (this._timerPitchIdx + 1) % 4;
        const cyclePitch = 1.0 + (this._timerPitchIdx * 0.05);
        
        // Increase pitch as time runs out (tension)
        const timeFactor = isEmergency ? (1.0 + (10 - seconds) * 0.05) : 1.0;
        const baseFreq = isEmergency ? 880 : 440;
        const freq = baseFreq * cyclePitch * timeFactor * (0.98 + Math.random() * 0.04);
        
        const type = isEmergency ? 'square' : 'sine';
        const vol = isEmergency ? 0.08 : 0.05;
        const duration = isEmergency ? 0.08 : 0.12;
        
        this.playTone(freq, type, duration, vol, now);
    },

    playAnimeImpactSFX(sourceX = undefined, sourceY = undefined) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        const spatialFactor = window.AudioSys ? AudioSys.getSpatialVolume(sourceX, sourceY, 1.0) : 1.0;
        if (spatialFactor <= 0) return;

        // 1. THE "CRACK" (High Frequency Snap)
        const snap = audioCtx.createOscillator();
        const snapGain = audioCtx.createGain();
        snap.type = 'square';
        snap.frequency.setValueAtTime(1800, now);
        snap.frequency.exponentialRampToValueAtTime(400, now + 0.04);
        snapGain.gain.setValueAtTime(0.25 * spatialFactor, now);
        snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        snap.connect(snapGain);
        snapGain.connect(audioCtx.destination);
        snap.start(now);
        snap.stop(now + 0.06);

        // 2. THE "DON" (Deep Heavy Thump)
        const thump = audioCtx.createOscillator();
        const thumpGain = audioCtx.createGain();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(140, now);
        thump.frequency.exponentialRampToValueAtTime(35, now + 0.2);
        thumpGain.gain.setValueAtTime(0.5 * spatialFactor, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        thump.connect(thumpGain);
        thumpGain.connect(audioCtx.destination);
        thump.start(now);
        thump.stop(now + 0.25);

        // 3. THE "SHATTER" (Noise Layer)
        const duration = 0.15;
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.2 * spatialFactor, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);
        noise.connect(filter);
        filter.connect(g);
        g.connect(audioCtx.destination);
        noise.start(now);
    }
});
