// Mechanisms: Blocks, Quantum and Portals
Object.assign(window.AudioSys, {
    playCubeCrush() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        for(let i=0; i<8; i++) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = i % 2 === 0 ? 'square' : 'sawtooth';
            const start = now + i * 0.01;
            osc.frequency.setValueAtTime(300 + i * 60, start);
            osc.frequency.exponentialRampToValueAtTime(100, start + 0.15);
            gain.gain.setValueAtTime(0.12, start); gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(start); osc.stop(start + 0.2);
        }
        for(let i=0; i<25; i++) {
            const delay = Math.random() * 0.45;
            const pNow = now + delay;
            const pOsc = audioCtx.createOscillator();
            const pGain = audioCtx.createGain();
            pOsc.type = Math.random() < 0.5 ? 'square' : 'sawtooth';
            pOsc.frequency.setValueAtTime(250 + Math.random() * 750, pNow);
            pGain.gain.setValueAtTime(0.07 + Math.random() * 0.09, pNow);
            pGain.gain.exponentialRampToValueAtTime(0.001, pNow + 0.05 + Math.random() * 0.1);
            pOsc.connect(pGain); pGain.connect(audioCtx.destination);
            pOsc.start(pNow); pOsc.stop(pNow + 0.15);
        }
    },

    playQuantumHum(isPush = false, variation = 0) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const baseFreq = isPush ? 400 : (700 + variation * 80);
        const targetFreq = isPush ? 550 : (1000 + variation * 120);
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.12);
        const fm = audioCtx.createOscillator();
        const fmGain = audioCtx.createGain();
        fm.type = 'square'; fm.frequency.value = isPush ? 35 : (60 + variation * 5); 
        fmGain.gain.value = isPush ? 450 : 300;
        fm.connect(fmGain); fmGain.connect(osc.frequency);
        gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(isPush ? 0.1 : 0.05, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain); gain.connect(audioCtx.destination);
        fm.start(now); osc.start(now);
        fm.stop(now + 0.15); osc.stop(now + 0.15);
    },

    playQuantumToggle(isActive) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        if (isActive) {
            osc.frequency.setValueAtTime(60, now); osc.frequency.exponentialRampToValueAtTime(400, now + 0.85);
            gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.07, now + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        } else {
            osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(30, now + 1.1);
            gain.gain.setValueAtTime(0.07, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        }
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 1.3);
    },

    push() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const duration = 0.3;
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + duration);
        filter.Q.value = 10;
        const osc = audioCtx.createOscillator();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + duration);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        noise.connect(filter); filter.connect(gain); osc.connect(gain); gain.connect(audioCtx.destination);
        noise.start(now); osc.start(now); osc.stop(now + duration);
    },

    rotate() {
        this.playTone(200, 'square', 0.1, 0.04);
        setTimeout(() => this.playTone(800, 'sine', 0.05, 0.02), 50);
        const now = audioCtx.currentTime;
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.value = 2000;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start(now);
    },

    playPrismRotate() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const pings = [{ f: 800, t: 0, d: 0.4 }, { f: 1100, t: 0.05, d: 0.3 }, { f: 950, t: 0.1, d: 0.5 }];
        pings.forEach(p => {
            const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();
            osc.type = Math.random() > 0.8 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(p.f + (Math.random() - 0.5) * 60, now + p.t);
            filter.type = 'lowpass'; filter.frequency.value = 1800 + Math.random() * 600; filter.Q.value = 2 + Math.random() * 12;
            g.gain.setValueAtTime(0, now + p.t); g.gain.linearRampToValueAtTime(0.06, now + p.t + 0.01);
            g.gain.exponentialRampToValueAtTime(0.001, now + p.t + p.d);
            osc.connect(filter); filter.connect(g); g.connect(audioCtx.destination);
            osc.start(now + p.t); osc.stop(now + p.t + p.d);
        });
        const sub = audioCtx.createOscillator(); const subG = audioCtx.createGain();
        sub.type = 'sine'; sub.frequency.setValueAtTime(75, now); sub.frequency.exponentialRampToValueAtTime(35, now + 0.3);
        subG.gain.setValueAtTime(0.15, now); subG.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        sub.connect(subG); subG.connect(audioCtx.destination);
        sub.start(now); sub.stop(now + 0.4);
        this.playTone(110 + Math.random() * 20, 'square', 0.2, 0.04);
    },

    playPortalWarp() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const osc1 = audioCtx.createOscillator(); const g1 = audioCtx.createGain();
        osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(100, now); osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        g1.gain.setValueAtTime(0, now); g1.gain.linearRampToValueAtTime(0.1, now + 0.05); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.connect(g1); g1.connect(audioCtx.destination);
        osc1.start(now); osc1.stop(now + 0.15);
        setTimeout(() => {
            const osc2 = audioCtx.createOscillator(); const g2 = audioCtx.createGain();
            osc2.type = 'sine'; osc2.frequency.setValueAtTime(800, audioCtx.currentTime); osc2.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
            g2.gain.setValueAtTime(0.1, audioCtx.currentTime); g2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
            osc2.connect(g2); g2.connect(audioCtx.destination);
            osc2.start(); osc2.stop(audioCtx.currentTime + 0.2);
        }, 100);
    },

    playPortalClick() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(50, now + 0.1);
        g.gain.setValueAtTime(0.15, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.1);
        this.playTone(1800, 'sine', 0.05, 0.03);
    },

    playGravityShift() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        
        // 1. DEEP SUB HUM (The Blade Runner Feel)
        const sub = audioCtx.createOscillator();
        const subGain = audioCtx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(40, now);
        sub.frequency.exponentialRampToValueAtTime(30, now + 0.8);
        
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        sub.connect(subGain);
        subGain.connect(audioCtx.destination);
        sub.start(now);
        sub.stop(now + 0.8);

        // 2. MECHANICAL RUMBLE (Distorted Sawtooth)
        const rumble = audioCtx.createOscillator();
        const rumbleGain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        
        rumble.type = 'sawtooth';
        rumble.frequency.setValueAtTime(60, now);
        rumble.frequency.linearRampToValueAtTime(45, now + 0.6);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);
        filter.Q.value = 15;
        
        rumbleGain.gain.setValueAtTime(0, now);
        rumbleGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        
        rumble.connect(filter);
        filter.connect(rumbleGain);
        rumbleGain.connect(audioCtx.destination);
        rumble.start(now);
        rumble.stop(now + 0.6);

        // 3. METALLIC IMPACT (Clang at the end)
        setTimeout(() => {
            const clang = audioCtx.createOscillator();
            const clangGain = audioCtx.createGain();
            clang.type = 'triangle';
            clang.frequency.setValueAtTime(120, audioCtx.currentTime);
            clang.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
            clangGain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            clangGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            clang.connect(clangGain);
            clangGain.connect(audioCtx.destination);
            clang.start();
            clang.stop(audioCtx.currentTime + 0.3);
        }, 150);
    },

    playDimensionInversion() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        // 1. REVERSE SWOOSH (Synthetic)
        const swoosh = audioCtx.createOscillator();
        const swooshGain = audioCtx.createGain();
        swoosh.type = 'sawtooth';
        swoosh.frequency.setValueAtTime(100, now);
        swoosh.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
        
        swooshGain.gain.setValueAtTime(0, now);
        swooshGain.gain.linearRampToValueAtTime(0.1, now + 0.25);
        swooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        
        swoosh.connect(swooshGain);
        swooshGain.connect(audioCtx.destination);
        swoosh.start(now);
        swoosh.stop(now + 0.35);

        // 2. DEEP BASS IMPACT (Deep Grave)
        const bass = audioCtx.createOscillator();
        const bassGain = audioCtx.createGain();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(60, now + 0.3);
        bass.frequency.exponentialRampToValueAtTime(20, now + 1.0);
        
        bassGain.gain.setValueAtTime(0, now + 0.3);
        bassGain.gain.linearRampToValueAtTime(0.25, now + 0.35);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        
        bass.connect(bassGain);
        bassGain.connect(audioCtx.destination);
        bass.start(now + 0.3);
        bass.stop(now + 1.0);
    }
});
