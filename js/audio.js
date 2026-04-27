// Simple Web Audio API Synthesizer
const audioCtx = window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const AudioSys = window.AudioSys = {
    playTone(freq, type, duration, vol=0.1) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },

    move() {
        this.playTone(150, 'square', 0.1, 0.05);
    },

    buttonClick() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        // Layer 1: Sharp Attack (High-frequency contact) - Boosted
        const nSize = audioCtx.sampleRate * 0.005;
        const nBuffer = audioCtx.createBuffer(1, nSize, audioCtx.sampleRate);
        const nData = nBuffer.getChannelData(0);
        for(let i=0; i<nSize; i++) nData[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = nBuffer;
        const nFilter = audioCtx.createBiquadFilter();
        nFilter.type = 'highpass';
        nFilter.frequency.value = 5000;
        const nGain = audioCtx.createGain();
        nGain.gain.setValueAtTime(0.15, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.005);
        noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(audioCtx.destination);
        noise.start(now);

        // Layer 2: Mechanical "Plink" (Metal ringing) - Boosted
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.02);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.02);

        // Layer 3: Body Resonance (The "Thud") - Boosted
        const lowOsc = audioCtx.createOscillator();
        const lowGain = audioCtx.createGain();
        lowOsc.type = 'sine';
        lowOsc.frequency.setValueAtTime(160, now);
        lowOsc.frequency.exponentialRampToValueAtTime(60, now + 0.06);
        lowGain.gain.setValueAtTime(0.12, now);
        lowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        lowOsc.connect(lowGain); lowGain.connect(audioCtx.destination);
        lowOsc.start(now);
        lowOsc.stop(now + 0.06);
    },

    playDoorOpen() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        // 1. CRACK (Mechanical release)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        gain.gain.setValueAtTime(0.2, now); // Strong impact
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.1);

        // 2. TSSSSSSS (Pneumatic hiss)
        const hSize = audioCtx.sampleRate * 0.5;
        const hBuffer = audioCtx.createBuffer(1, hSize, audioCtx.sampleRate);
        const hData = hBuffer.getChannelData(0);
        for(let i=0; i<hSize; i++) hData[i] = Math.random() * 2 - 1;
        const hiss = audioCtx.createBufferSource();
        hiss.buffer = hBuffer;
        const hFilter = audioCtx.createBiquadFilter();
        hFilter.type = 'highpass';
        hFilter.frequency.setValueAtTime(6000, now);
        hFilter.frequency.exponentialRampToValueAtTime(3000, now + 0.5);
        const hGain = audioCtx.createGain();
        hGain.gain.setValueAtTime(0, now);
        hGain.gain.linearRampToValueAtTime(0.07, now + 0.05);
        hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        hiss.connect(hFilter); hFilter.connect(hGain); hGain.connect(audioCtx.destination);
        hiss.start(now);

        // 3. PFF (Final pressure release at the end of hiss)
        const pSize = audioCtx.sampleRate * 0.2;
        const pBuffer = audioCtx.createBuffer(1, pSize, audioCtx.sampleRate);
        const pData = pBuffer.getChannelData(0);
        for(let i=0; i<pSize; i++) pData[i] = Math.random() * 2 - 1;
        const puff = audioCtx.createBufferSource();
        puff.buffer = pBuffer;
        const pFilter = audioCtx.createBiquadFilter();
        pFilter.type = 'lowpass';
        pFilter.frequency.setValueAtTime(800, now + 0.4);
        const pGain = audioCtx.createGain();
        pGain.gain.setValueAtTime(0, now + 0.4);
        pGain.gain.linearRampToValueAtTime(0.1, now + 0.45);
        pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        puff.connect(pFilter); pFilter.connect(pGain); pGain.connect(audioCtx.destination);
        puff.start(now + 0.4);
    },

    playDoorCloseRelease() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        // Pneumatic "pssssss" of settling
        const pSize = audioCtx.sampleRate * 0.3;
        const pBuffer = audioCtx.createBuffer(1, pSize, audioCtx.sampleRate);
        const pData = pBuffer.getChannelData(0);
        for(let i=0; i<pSize; i++) pData[i] = Math.random() * 2 - 1;
        const puff = audioCtx.createBufferSource();
        puff.buffer = pBuffer;
        const pFilter = audioCtx.createBiquadFilter();
        pFilter.type = 'lowpass';
        pFilter.frequency.setValueAtTime(1200, now);
        const pGain = audioCtx.createGain();
        pGain.gain.setValueAtTime(0.06, now);
        pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        puff.connect(pFilter); pFilter.connect(pGain); pGain.connect(audioCtx.destination);
        puff.start(now);
    },

    playDoorClosingWhir() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const duration = 0.3;

        // Pneumatic hiss of the door sliding down (similar to opening TSSSS)
        const hSize = audioCtx.sampleRate * duration;
        const hBuffer = audioCtx.createBuffer(1, hSize, audioCtx.sampleRate);
        const hData = hBuffer.getChannelData(0);
        for(let i=0; i<hSize; i++) hData[i] = Math.random() * 2 - 1;
        
        const hiss = audioCtx.createBufferSource();
        hiss.buffer = hBuffer;
        const hFilter = audioCtx.createBiquadFilter();
        hFilter.type = 'highpass';
        hFilter.frequency.setValueAtTime(5000, now);
        hFilter.frequency.exponentialRampToValueAtTime(2500, now + duration);
        
        const hGain = audioCtx.createGain();
        hGain.gain.setValueAtTime(0, now);
        hGain.gain.linearRampToValueAtTime(0.05, now + 0.05);
        hGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        hiss.connect(hFilter);
        hFilter.connect(hGain);
        hGain.connect(audioCtx.destination);
        hiss.start(now);
    },

    playCubeCrush() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        // 1. DENSE MID-RANGE CRUNCH (8 overlapping layers)
        for(let i=0; i<8; i++) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = i % 2 === 0 ? 'square' : 'sawtooth';
            const start = now + i * 0.01;
            // Focus on MID range (300-800Hz) for more body
            osc.frequency.setValueAtTime(300 + i * 60, start);
            osc.frequency.exponentialRampToValueAtTime(100, start + 0.15);
            gain.gain.setValueAtTime(0.12, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(start); osc.stop(start + 0.2);
        }

        // 2. COMPACT MID CASCADE (25 pieces over 0.45s)
        for(let i=0; i<25; i++) {
            const delay = Math.random() * 0.45; // Much shorter, very overlapped
            const pNow = now + delay;
            
            const pOsc = audioCtx.createOscillator();
            const pGain = audioCtx.createGain();
            
            const r = Math.random();
            if (r < 0.5) {
                pOsc.type = 'square'; // Mid-range CLACK
                pOsc.frequency.setValueAtTime(400 + Math.random() * 600, pNow);
            } else {
                pOsc.type = 'sawtooth'; // Mid-range CRUNCH
                pOsc.frequency.setValueAtTime(250 + Math.random() * 500, pNow);
            }
            
            const pVol = 0.07 + Math.random() * 0.09;
            pGain.gain.setValueAtTime(pVol, pNow);
            pGain.gain.exponentialRampToValueAtTime(0.001, pNow + 0.05 + Math.random() * 0.1);
            
            pOsc.connect(pGain); pGain.connect(audioCtx.destination);
            pOsc.start(pNow);
            pOsc.stop(pNow + 0.15);
        }
    },

    playQuantumHum(isPush = false, variation = 0) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        // Pitch shift: Push is deeper (400Hz). 
        // Walk (isPush=false) uses variation to shift the tone (800Hz base + variation).
        const baseFreq = isPush ? 400 : (700 + variation * 80);
        const targetFreq = isPush ? 550 : (1000 + variation * 120);

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.12);
        
        // FM modulation: Rougher buzz for push
        const fm = audioCtx.createOscillator();
        const fmGain = audioCtx.createGain();
        fm.type = 'square';
        fm.frequency.value = isPush ? 35 : (60 + variation * 5); 
        fmGain.gain.value = isPush ? 450 : 300;
        fm.connect(fmGain);
        fmGain.connect(osc.frequency);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(isPush ? 0.1 : 0.05, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        fm.start(now);
        osc.start(now);
        fm.stop(now + 0.15);
        osc.stop(now + 0.15);
    },

    playQuantumToggle(isActive) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        // Heavy industrial machine aesthetic
        osc.type = 'sawtooth';
        
        if (isActive) {
            // LONGER RISE (Barrier Activates) - Heavy machine powering up
            osc.frequency.setValueAtTime(60, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.85);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.07, now + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        } else {
            // LONGER FALL (Barrier Deactivates) - Heavy machine shutting down
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 1.1);
            gain.gain.setValueAtTime(0.07, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        }

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 1.3);
    },

    conveyorSlide() {
        // Silenced jumping sound - using sustained gear sound instead
    },

    playConveyorGear(type = 0) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const duration = 0.05;

        // Alternating character
        const baseFreq = type === 0 ? 120 : 160;
        const filterFreq = type === 0 ? 800 : 1200;
        const vol = type === 0 ? 0.08 : 0.07; // Much louder

        // 1. Mechanical "Clank" (Metallic character)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.linearRampToValueAtTime(baseFreq * 0.8, now + duration);
        
        filter.type = 'bandpass';
        filter.frequency.value = filterFreq;
        filter.Q.value = 5;
        
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + duration);

        // 2. Industrial "Thud" (Low/Mid punch)
        const lowOsc = audioCtx.createOscillator();
        const lowGain = audioCtx.createGain();
        lowOsc.type = 'triangle';
        lowOsc.frequency.setValueAtTime(type === 0 ? 80 : 70, now);
        lowOsc.frequency.exponentialRampToValueAtTime(50, now + duration);
        
        lowGain.gain.setValueAtTime(0.08, now); // Increased
        lowGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        lowOsc.connect(lowGain);
        lowGain.connect(audioCtx.destination);
        lowOsc.start(now);
        lowOsc.stop(now + duration);

        // 3. Gear Teeth "Click" (High Metallic Noise)
        const bufferSize = audioCtx.sampleRate * 0.01;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const nFilter = audioCtx.createBiquadFilter();
        nFilter.type = 'highpass';
        nFilter.frequency.value = type === 0 ? 4000 : 6000;
        const nGain = audioCtx.createGain();
        nGain.gain.setValueAtTime(0.05, now); // Increased
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
        noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(audioCtx.destination);
        noise.start(now);
    },

    chapterSwitch() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const duration = 0.4;

        // 1. Organic "Whoosh" (Noise Sweep)
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + duration);
        filter.Q.value = 5;

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start(now);

        // 2. Low "Thud" (Weight of map shift)
        const osc = audioCtx.createOscillator();
        const oscG = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + duration);
        oscG.gain.setValueAtTime(0.15, now);
        oscG.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(oscG);
        oscG.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + duration);
    },

    shepardOscillators: [],
    shepardGains: [],
    shepardPhase: 0,
    updateConveyorShepard(active) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        if (active) {
            // Initialize oscillators if they don't exist
            if (this.shepardOscillators.length === 0) {
                for (let i = 0; i < 5; i++) {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0, now);
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.start();
                    this.shepardOscillators.push(osc);
                    this.shepardGains.push(gain);
                }
            }

            // Update phase (speed of ascension)
            this.shepardPhase = (this.shepardPhase + 0.005) % 1.0;

            for (let i = 0; i < 5; i++) {
                // Each oscillator is one octave apart
                let pos = (i + this.shepardPhase * 5) % 5;
                let freq = 60 * Math.pow(2, pos);
                
                // Use setValueAtTime to prevent "gliding" during the jump at the edges
                this.shepardOscillators[i].frequency.setValueAtTime(freq, now);

                // Steeper bell-shaped volume envelope (sin^8)
                // This ensures volume is ABSOLUTELY zero at the wrap-around point (pos=0 or pos=5)
                let x = pos / 5;
                let gainVal = Math.sin(x * Math.PI);
                gainVal = Math.pow(gainVal, 8) * 0.045; 
                
                this.shepardGains[i].gain.setTargetAtTime(gainVal, now, 0.03);
            }
        } else {
            // Fade out
            if (this.shepardOscillators.length > 0) {
                for (let i = 0; i < 5; i++) {
                    this.shepardGains[i].gain.setTargetAtTime(0, now, 0.1);
                }
            }
        }
    },

    selectorMove() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const duration = 0.15;

        // 1. Soft Servo Whir (Organic sliding pitch)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + duration);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05); // Increased volume
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + duration);

        // 2. Tiny mechanical "clack"
        const clickOsc = audioCtx.createOscillator();
        const clickGain = audioCtx.createGain();
        clickOsc.type = 'square';
        clickOsc.frequency.setValueAtTime(800, now);
        clickGain.gain.setValueAtTime(0.03, now); // Increased volume
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        clickOsc.connect(clickGain);
        clickGain.connect(audioCtx.destination);
        clickOsc.start(now);
        clickOsc.stop(now + 0.02);
    },

    push() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const duration = 0.3;

        // 1. Grinding Noise Layer (The crunch)
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        // 2. Resonant Filter (The "Metal on Metal" scream)
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + duration);
        filter.Q.value = 10; // High resonance for that mechanical grind

        // 3. Heavy Thud (The weight of the box)
        const osc = audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + duration);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        noise.start(now);
        osc.start(now);
        osc.stop(now + duration);
    },

    rotate() {
        // Mechanical whir (low square) + Electric click (high noise)
        this.playTone(200, 'square', 0.1, 0.04);
        setTimeout(() => this.playTone(800, 'sine', 0.05, 0.02), 50);
        
        // Add a tiny bit of noise for the "clunk"
        const now = audioCtx.currentTime;
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start(now);
    },

    undo() {
        this.playTone(300, 'square', 0.1, 0.05);
        setTimeout(() => this.playTone(200, 'square', 0.15, 0.05), 50);
    },

    energyFlow() {
        // Soft hum for energy
        if(Math.random() < 0.2) this.playTone(50 + Math.random()*20, 'sine', 0.1, 0.02);
    },

    corePowered() {
        // Multi-layered high-voltage activation
        const now = audioCtx.currentTime;
        
        // 1. Core sine sweep
        this.playTone(600, 'sine', 0.3, 0.1);
        setTimeout(() => this.playTone(1200, 'sine', 0.2, 0.08), 100);

        // 2. Electrical Crackle (High frequency noise bursts)
        const playCrackle = (delay) => {
            setTimeout(() => {
                const bufferSize = audioCtx.sampleRate * 0.08;
                const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (i % 2 === 0 ? 1 : 0);
                const source = audioCtx.createBufferSource();
                source.buffer = buffer;
                const filter = audioCtx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.value = 3000 + Math.random() * 2000;
                const g = audioCtx.createGain();
                g.gain.setValueAtTime(0.08, audioCtx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
                source.connect(filter); filter.connect(g); g.connect(audioCtx.destination);
                source.start();
            }, delay);
        };
        [0, 50, 100, 150].forEach(d => playCrackle(d));

        // 3. Low hum surge
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.frequency.setValueAtTime(50, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.3);
    },

    rechargeTick(current, max) {
        // Ascending frequency based on battery percentage
        const pct = current / max;
        const freq = 400 + (pct * 800); // Rises from 400Hz to 1200Hz
        this.playTone(freq, 'sine', 0.05, 0.05);
    },

    coreLost() {
        // Sad minor interval
        this.playTone(392, 'sawtooth', 0.2, 0.1); // G4
        setTimeout(() => this.playTone(311, 'sawtooth', 0.3, 0.1), 150); // Eb4
    },

    lifeLost() {
        if (audioCtx.state !== 'running') return;
        // Descending dissonant musical phrase
        const now = audioCtx.currentTime;
        const melody = [523.25, 415.30, 311.13, 233.08]; // C5, Ab4, Eb4, Bb3 (Descending minor-ish)
        melody.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 'square', 0.25, 0.08);
            }, i * 150);
        });
    },
    playScrapCollect() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        
        // Play 4-5 quick, randomized metallic "pings"
        for (let i = 0; i < 5; i++) {
            const delay = i * 0.04 + Math.random() * 0.03;
            const freq = 1200 + Math.random() * 2000;
            const type = Math.random() > 0.5 ? 'sine' : 'triangle';
            
            setTimeout(() => {
                const osc = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                g.gain.setValueAtTime(0.04, audioCtx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
                osc.connect(g); g.connect(audioCtx.destination);
                osc.start(); osc.stop(audioCtx.currentTime + 0.1);
            }, delay * 1000);
        }

        // Add a tiny bit of "junk" noise
        const bufferSize = audioCtx.sampleRate * 0.1;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.2;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.value = 3000;
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.03, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        noise.connect(filter); filter.connect(g); g.connect(audioCtx.destination);
        noise.start(now);
    },

    explosion() {
        // Noise burst
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 seconds
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        noise.start();
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

    playChapterUnlock() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        
        // "System Authority" Fanfare - Unique & Longer
        // Triumphant ascending arpeggio + Rhythmic cadence
        const notes = [
            // Part 1: Ascending Arpeggio
            { f: 130.81, t: 0.0, d: 0.15 }, // C3
            { f: 164.81, t: 0.15, d: 0.15 }, // E3
            { f: 196.00, t: 0.3, d: 0.15 }, // G3
            { f: 261.63, t: 0.45, d: 0.4 }, // C4
            
            // Part 2: Rhythmic Cadence (The "Theme")
            { f: 329.63, t: 0.9, d: 0.1 },  // E4
            { f: 329.63, t: 1.05, d: 0.1 }, // E4
            { f: 349.23, t: 1.2, d: 0.1 },  // F4
            { f: 392.00, t: 1.35, d: 0.4 }, // G4
            
            { f: 293.66, t: 1.8, d: 0.1 },  // D4
            { f: 329.63, t: 1.95, d: 0.1 }, // E4
            { f: 261.63, t: 2.1, d: 0.8 }   // C4 (The Final Shine)
        ];
        
        notes.forEach(n => {
            this.playTone(n.f, 'square', n.d, 0.08, now + n.t);
            // Add a slight octave harmony to part of it
            if (n.t > 0.8) {
                this.playTone(n.f * 0.5, 'square', n.d, 0.04, now + n.t);
            }
        });
    },

    playVoiceBlip(char, pitch = 1.0, isAI = true) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        
        // Frequência base: IA é mais "quadrada/digital", Humano é mais "senoidal/suave"
        const baseFreq = isAI ? 200 : 300;
        const freq = baseFreq * pitch * (0.9 + Math.random() * 0.2); 
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = isAI ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(now);
        osc.stop(now + 0.04);
    },

    // Overload playTone to support start time
    playTone(freq, type, duration, vol=0.1, startTime=null) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = startTime || audioCtx.currentTime;
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(now);
        osc.stop(now + duration);
    },

    braam() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const duration = 2.5;

        // The "BRAAM" is multiple detuned sawtooth oscillators
        [40, 40.5, 39.5].forEach(freq => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + duration);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + duration);
            filter.Q.value = 15;

            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(now);
            osc.stop(now + duration);
        });
        
        // Add a bit of noise for texture
        const noiseSource = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.5, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
        noiseSource.buffer = buffer;
        const nFilter = audioCtx.createBiquadFilter();
        nFilter.type = 'lowpass';
        nFilter.frequency.value = 500;
        const nGain = audioCtx.createGain();
        nGain.gain.setValueAtTime(0.1, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        noiseSource.connect(nFilter); nFilter.connect(nGain); nGain.connect(audioCtx.destination);
        noiseSource.start(now);
    },

    doorSlam() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        // Helper for Distorted Noise
        const playImpactLayer = (freq, q, type, vol, decay) => {
            const bufferSize = audioCtx.sampleRate * decay;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            
            const filter = audioCtx.createBiquadFilter();
            filter.type = type;
            filter.frequency.setValueAtTime(freq, now);
            filter.frequency.exponentialRampToValueAtTime(freq * 0.2, now + decay);
            filter.Q.value = q;
            
            const shaper = audioCtx.createWaveShaper();
            shaper.curve = (function() {
                const n = 44100;
                const curve = new Float32Array(n);
                for (let i = 0; i < n; i++) {
                    const x = (i * 2) / n - 1;
                    curve[i] = (3 + 20) * x * 20 * (Math.PI / 180) / (Math.PI + 20 * Math.abs(x));
                }
                return curve;
            })();

            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
            
            source.connect(filter);
            filter.connect(shaper);
            shaper.connect(gain);
            gain.connect(audioCtx.destination);
            source.start(now);
        };

        // Layer 1: Deep Thud (Weight)
        playImpactLayer(100, 10, 'lowpass', 1.0, 0.6);
        
        // Layer 2: Metallic Crunch (High-end dirt)
        playImpactLayer(1500, 2, 'bandpass', 0.4, 0.2);
        
        // Layer 3: Mid Resonance (Body)
        playImpactLayer(400, 5, 'lowpass', 0.6, 0.4);

        // Subtle sub-bass sine for that final punch
        const sub = audioCtx.createOscillator();
        const subG = audioCtx.createGain();
        sub.frequency.setValueAtTime(60, now);
        sub.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        subG.gain.setValueAtTime(0.5, now);
        subG.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        sub.connect(subG); subG.connect(audioCtx.destination);
        sub.start(now); sub.stop(now + 0.4);
    },

    doorGrind() {
        if (audioCtx.state !== 'running') return;
        const duration = 0.15;
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }
        
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400 + Math.random() * 400; // More presence
        
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime); // High volume
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start();
    },

    humNodes: [],
    humGain: null,
    crackleInterval: null,

    startHum() {
        if (this.humNodes.length > 0) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        // 1. Base Power Hum (Higher frequencies for a sharper, more electronic feel)
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = 120; // Increased from 50
        osc2.type = 'square';
        osc2.frequency.value = 240; // Increased from 100
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800; // Raised filter to let more "treble" through
        
        this.humGain = audioCtx.createGain();
        this.humGain.gain.value = 0;
        
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(this.humGain);
        this.humGain.connect(audioCtx.destination);
        
        osc1.start();
        osc2.start();
        this.humNodes = [osc1, osc2];
    },

    updateHum(hasActiveBlocks, progress = 0, isContaminated = false) {
        if (audioCtx.state !== 'running') return;
        if (this.humNodes.length === 0) this.startHum();
        
        // Volume adjustment (DISABLED FOR TEST - only crackles remains)
        const targetVol = 0;
        this.humGain.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.1);

        // Frequency adjustment (Pitch rises with progress + LFO wobble)
        // If contaminated, the LFO is much faster and more erratic
        const lfoSpeed = isContaminated ? 12.0 : 3.0;
        const lfoDepth = isContaminated ? 12.0 : 4.0;
        let lfo = Math.sin(audioCtx.currentTime * lfoSpeed) * lfoDepth;
        
        // Add random "glitch" jumps if contaminated
        if (isContaminated && Math.random() > 0.95) {
            lfo += (Math.random() - 0.5) * 40;
        }

        const baseF1 = 120;
        const baseF2 = 240;
        const targetF1 = baseF1 + (progress * 80) + lfo;
        const targetF2 = baseF2 + (progress * 160) + (lfo * 1.5);
        
        if (this.humNodes[0]) this.humNodes[0].frequency.setTargetAtTime(targetF1, audioCtx.currentTime, 0.1);
        if (this.humNodes[1]) this.humNodes[1].frequency.setTargetAtTime(targetF2, audioCtx.currentTime, 0.1);

        // --- Electrical Crackle Pass ---
        this._currentProgress = progress;
        this._isContaminated = isContaminated;

        if (hasActiveBlocks && !this.crackleInterval) {
            this.crackleInterval = setInterval(() => {
                const prog = this._currentProgress || 0;
                const contam = this._isContaminated || false;

                // FREQUENCY: More frequent as progress increases
                // Base chance is 0.95. At 100% progress, chance is 0.55.
                const baseChance = contam ? 0.65 : 0.95;
                const crackleChance = baseChance - (prog * 0.4);
                
                if (Math.random() > crackleChance) {
                    const crackle = audioCtx.createOscillator();
                    const g = audioCtx.createGain();
                    
                    // PITCH: Higher pitch as progress increases
                    const baseFreq = contam ? 400 : 1500;
                    const pitchRise = prog * 2500;
                    crackle.type = contam ? 'sawtooth' : 'square';
                    crackle.frequency.setValueAtTime(baseFreq + pitchRise + Math.random() * 2000, audioCtx.currentTime);
                    
                    const vol = 0.006; // Increased by 20%
                    g.gain.setValueAtTime(vol, audioCtx.currentTime);
                    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
                    
                    crackle.connect(g);
                    g.connect(audioCtx.destination);
                    crackle.start();
                    crackle.stop(audioCtx.currentTime + 0.04);
                }
            }, 50);
        } else if (!hasActiveBlocks && this.crackleInterval) {
            clearInterval(this.crackleInterval);
            this.crackleInterval = null;
        }
    },

    // --- Adaptive Music Sequencer ---
    musicActive: false,
    nextNoteTime: 0,
    current16thNote: 0,
    musicTimerID: null,
    tempoBPM: 140, 
    musicIntensity: 1, // 0: Ambient, 1: Exploration, 2: Action

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
        // Adjust the tempo during the menu/Intensity 0
        if (this.musicIntensity === 0) {
            this.tempoBPM = 100; // Slower, stripped-down version
        } else {
            this.tempoBPM = 140; // Full action
        }
    },

    scheduleMusic() {
        if (!this.musicActive) return;
        
        const lookahead = 0.1; 
        while (this.nextNoteTime < audioCtx.currentTime + lookahead) {
            this.playMusicStep(this.current16thNote, this.nextNoteTime);
            const secondsPerBeat = 60.0 / this.tempoBPM;
            this.nextNoteTime += 0.25 * secondsPerBeat; 
            this.current16thNote++;
            if (this.current16thNote === 256) { // 256 steps = 16 full bars (Storytelling Length)
                this.current16thNote = 0;
            }
        }
        
        this.musicTimerID = setTimeout(() => this.scheduleMusic(), 25);
    },

    /* 
    ============================================================
    MUSIC PRESETS - Use these for different game atmospheres
    To use: Replace playMusicStep and related instruments below.
    ============================================================

    --- PRESET A: INDUSTRIAL (Upbeat, Mechanical) ---
    tempoBPM: 125
    playMusicStep(step, time) {
        const bar = Math.floor(step / 16); 
        const localStep = step % 16;
        if ([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0][localStep]) this.playPiston(time);
        if (step % 4 === 2) this.playMetalDrop(time, 0.02);
        const freq = [[30, 30, 0, 30, 0, 30, 35, 0, 30, 30, 0, 30, 40, 0, 35, 0]][0][localStep];
        if (freq) this.playPowerGrid(freq, time);
        if ((bar === 1 || bar === 3) && [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0][localStep]) this.playCRTFeedback(bar === 1 ? 2500 : 3200, time);
    }

    --- PRESET B: METROID ATMOSPHERE (Suspenseful, Eerie) ---
    tempoBPM: 90
    playMusicStep(step, time) {
        const bar = Math.floor(step / 16); 
        const localStep = step % 16;
        if (localStep % 2 === 0) this.playDeepPulse([32.7, 32.7, 30.8, 29.1][bar % 4], time);
        if (localStep === 0) this.playMetroidPad([65.41, 77.78, 61.74, 58.27][bar % 4], time, 2.5);
        if ([4, 10, 14].includes(localStep)) this.playScannerPing(bar % 2 === 0 ? 2200 : 3300, time);
        if ((bar === 1 || bar === 3) && localStep % 2 === 1) this.playDigitalArp([1046.5, 880.0, 783.9, 622.2][(localStep - 1) / 2 % 4], time);
    }
    */

    playMusicStep(step, time) {
        const bar = Math.floor(step / 16); 
        const localStep = step % 16;

        const progBar = bar % 4; 
        const bassFreqs = [82.4, 82.4, 130.8, 146.8]; // E2, E2, C3, D3
        const bassRoot = bassFreqs[progBar];

        // --- BASS & DRUMS (Only active during Gameplay: Intensity > 0) ---
        if (this.musicIntensity > 0) {
            // LAYER 1: BASE / CHUGS
            if (localStep === 0) {
                this.playPowerChord(bassRoot, time);
            }
            if (localStep % 2 === 0 || localStep % 4 === 3) {
                if (localStep !== 0) {
                    this.playVariedChug(bassRoot, time, 1200, true);
                }
            }

            // LAYER 2: PERCUSSION
            this.playHiHat(time);
            
            if (localStep === 0 || localStep === 8 || localStep === 11) {
                this.playKick(time);
            }

            if (localStep === 4 || localStep === 12) {
                this.playSnare(time);
            }
            
            if (progBar === 0 && localStep === 0) {
                this.playCinematicSnare(time);
            }
            
            if (progBar === 3 && localStep >= 12 && localStep % 2 === 0) {
                this.playSnare(time);
            }
        } else {
            // --- MENU (Intensity 0) ---
            // Just a light pad to back the melody and some hi-hats
            if (localStep === 0) {
                this.playBladeRunnerPad(step, bar, time);
            }
            if (localStep % 2 === 0) {
                this.playHiHat(time);
            }
        }

        // --- LAYER 3: MELODY (ALWAYS ACTIVE, making it the SAME song) ---
        const melodyBar = bar % 8;
        const melody = [
            // Bar 0: E4, G4, A4, B4 (Heroic climb)
            [329.6, 0, 0, 392.0, 0, 0, 440.0, 0, 0, 493.9, 0, 440.0, 0, 392.0, 0, 0],
            // Bar 1: E4 resolution with a quick flourish
            [329.6, 0, 0, 0, 0, 0, 0, 0, 493.9, 0, 523.3, 0, 493.9, 0, 440.0, 0],
            // Bar 2: C4 variation
            [392.0, 0, 0, 329.6, 0, 0, 261.6, 0, 0, 329.6, 0, 0, 392.0, 0, 0, 0],
            // Bar 3: D4 building up
            [440.0, 0, 0, 370.0, 0, 0, 293.7, 0, 0, 370.0, 0, 440.0, 0, 587.3, 0, 0],
            // Bar 4: High E peak
            [659.3, 0, 0, 587.3, 0, 0, 523.3, 0, 0, 493.9, 0, 0, 440.0, 0, 0, 0],
            // Bar 5: Fast run down
            [493.9, 0, 0, 392.0, 0, 0, 329.6, 0, 0, 0, 0, 0, 329.6, 392.0, 440.0, 493.9],
            // Bar 6: C4 returning
            [523.3, 0, 0, 493.9, 0, 0, 440.0, 0, 0, 392.0, 0, 0, 329.6, 0, 0, 0],
            // Bar 7: D4 hold and lead to start
            [440.0, 0, 0, 0, 587.3, 0, 0, 0, 659.3, 0, 0, 0, 0, 0, 0, 0]
        ];
        const note = melody[melodyBar][localStep];
        if (note > 0) {
            this.playMetalLead(note, time);
        }
    },

    playBladeRunnerLead(freq, time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        // Vibrato
        osc.frequency.setTargetAtTime(freq * 1.01, time + 0.2, 0.1);
        osc.frequency.setTargetAtTime(freq * 0.99, time + 0.4, 0.1);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, time);
        filter.frequency.linearRampToValueAtTime(2500, time + 0.3);
        filter.frequency.exponentialRampToValueAtTime(1000, time + 1.2);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.05, time + 0.1); // Slow attack
        gain.gain.exponentialRampToValueAtTime(0.001, time + 1.5); // Long release
        
        osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        osc.start(time); osc.stop(time + 1.5);
    },

    playBladeRunnerBass(freq, time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        
        filter.type = 'lowpass';
        filter.frequency.value = 300;

        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
        
        osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        osc.start(time); osc.stop(time + 0.6);
    },

    playBladeRunnerPad(step, bar, time) {
        if (step % 16 !== 0) return; // Play once per bar
        const freqs = [130.8, 130.8, 130.8, 130.8, 130.8, 130.8, 174.6, 196.0]; // Follow harmony
        const freq = freqs[bar % 8] || 130.8;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq * 0.5, time);
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
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.06, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start(time);
    },

    playSeriousLead(freq, time) {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq, time);
        osc2.detune.value = 10;

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, time);
        filter.frequency.exponentialRampToValueAtTime(1200, time + 0.4);

        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5); // Longer sustain
        
        osc1.connect(filter); osc2.connect(filter);
        filter.connect(gain); gain.connect(audioCtx.destination);
        osc1.start(time); osc2.start(time);
        osc1.stop(time + 0.5); osc2.stop(time + 0.5);
    },

    playSeriousBass(freq, time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.type = 'sawtooth'; // Switched to sawtooth for more drive
        osc.frequency.setValueAtTime(freq, time);
        
        filter.type = 'lowpass';
        filter.frequency.value = 300;

        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        
        osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        osc.start(time); osc.stop(time + 0.2);
    },

    playVariedChug(freq, time, filterFreq, isAggressive) {
        const duration = isAggressive ? 0.1 : 0.15;
        const gain = audioCtx.createGain();
        const shaper = audioCtx.createWaveShaper();
        shaper.curve = (function() {
            const n = 44100;
            const curve = new Float32Array(n);
            const dist = isAggressive ? 8 : 4;
            for (let i = 0; i < n; i++) {
                const x = (i * 2) / n - 1;
                curve[i] = Math.tanh(x * dist);
            }
            return curve;
        })();

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;

        const root = audioCtx.createOscillator();
        root.type = 'sawtooth';
        root.frequency.value = freq;
        const root2 = audioCtx.createOscillator();
        root2.type = 'sawtooth';
        root2.frequency.value = freq;
        root2.detune.value = 8;
        const fifth = audioCtx.createOscillator();
        fifth.type = 'sawtooth';
        fifth.frequency.value = freq * 1.5;

        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

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
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start(time);
    },

    playHiHat(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = 8000;
        gain.gain.setValueAtTime(0.02, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(time); osc.stop(time + 0.03);
    },

    playPowerChord(freq, time) {
        const duration = 0.15;
        const createOsc = (f, type, detune) => {
            const o = audioCtx.createOscillator();
            o.type = type;
            o.frequency.value = f;
            o.detune.value = detune;
            return o;
        };

        const gain = audioCtx.createGain();
        const shaper = audioCtx.createWaveShaper();
        shaper.curve = (function() {
            const n = 44100;
            const curve = new Float32Array(n);
            for (let i = 0; i < n; i++) {
                const x = (i * 2) / n - 1;
                curve[i] = Math.tanh(x * 5); // Distortion
            }
            return curve;
        })();

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;

        // Root + Fifth (Power Chord)
        const root = createOsc(freq, 'sawtooth', 0);
        const root2 = createOsc(freq, 'sawtooth', 10);
        const fifth = createOsc(freq * 1.5, 'sawtooth', -5);

        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        [root, root2, fifth].forEach(o => {
            o.connect(shaper);
            o.start(time); o.stop(time + duration);
        });
        shaper.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
    },

    playMetalLead(freq, time) {
        const duration = 0.3;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq, time);
        osc2.detune.value = 15;

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(4000, time);
        filter.frequency.exponentialRampToValueAtTime(1000, time + duration);

        osc1.connect(filter); osc2.connect(filter);
        filter.connect(gain); gain.connect(audioCtx.destination);
        osc1.start(time); osc2.start(time);
        osc1.stop(time + duration); osc2.stop(time + duration);
    }
};
