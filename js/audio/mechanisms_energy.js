// Mechanisms: Energy Flow and Explosions
Object.assign(window.AudioSys, {
    energyFlow() {
        if(Math.random() < 0.2) this.playTone(50 + Math.random()*20, 'sine', 0.1, 0.02);
    },

    corePowered() {
        const now = audioCtx.currentTime;
        this.playTone(600, 'sine', 0.3, 0.1);
        setTimeout(() => this.playTone(1200, 'sine', 0.2, 0.08), 100);
        const playCrackle = (delay) => {
            setTimeout(() => {
                const bufferSize = audioCtx.sampleRate * 0.08;
                const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (i % 2 === 0 ? 1 : 0);
                const source = audioCtx.createBufferSource(); source.buffer = buffer;
                const filter = audioCtx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 3000 + Math.random() * 2000;
                const g = audioCtx.createGain(); g.gain.setValueAtTime(0.08, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
                source.connect(filter); filter.connect(g); g.connect(audioCtx.destination);
                source.start();
            }, delay);
        };
        [0, 50, 100, 150].forEach(d => playCrackle(d));
        const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
        osc.frequency.setValueAtTime(50, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
        g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.3);
    },

    explosion(isLarge = false, sourceX = undefined, sourceY = undefined) {
        console.log("SFX: Explosion triggered, isLarge =", isLarge);
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const duration = isLarge ? 2.5 : 1.2; // Aumentado (era 2.0 / 0.8)
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; 
        filter.frequency.setValueAtTime(isLarge ? 800 : 1500, now); // Mais agudo para normal
        filter.frequency.exponentialRampToValueAtTime(40, now + duration * 0.8);
        
        const gain = audioCtx.createGain(); 
        let baseVol = isLarge ? 0.9 : 0.8;
        const finalVol = window.AudioSys ? AudioSys.getSpatialVolume(sourceX, sourceY, baseVol) : baseVol;
        
        if (finalVol <= 0) return;

        gain.gain.setValueAtTime(finalVol, now); 
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        const output = AudioSys.musicGain || audioCtx.destination;

        // "Dirty" effect for large explosions (Distortion)
        if (isLarge) {
            const shaper = audioCtx.createWaveShaper();
            shaper.curve = (function() {
                const n = 44100; const curve = new Float32Array(n);
                for (let i = 0; i < n; i++) {
                    const x = (i * 2) / n - 1;
                    curve[i] = Math.tanh(x * 10);
                }
                return curve;
            })();
            noise.connect(shaper); shaper.connect(filter);
        } else {
            noise.connect(filter);
        }

        filter.connect(gain); gain.connect(output);
        noise.start();
        
        // Low thump (Sub-bass impact)
        const osc = audioCtx.createOscillator();
        const g2 = audioCtx.createGain();
        osc.frequency.setValueAtTime(isLarge ? 100 : 150, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + (isLarge ? 0.6 : 0.4));
        
        const finalVol2 = window.AudioSys ? AudioSys.getSpatialVolume(sourceX, sourceY, isLarge ? 0.6 : 0.4) : (isLarge ? 0.6 : 0.4);
        g2.gain.setValueAtTime(finalVol2, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + (isLarge ? 0.8 : 0.5));
        osc.connect(g2); g2.connect(output);
        osc.start(); osc.stop(now + (isLarge ? 0.8 : 0.5));
    },

    playMeltdownCharge(duration = 3, sourceX = undefined, sourceY = undefined) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const output = AudioSys.musicGain || audioCtx.destination;
        
        // Whistling Kettle sound (Sine sweep)
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(3500, now + duration);
        
        const gain = audioCtx.createGain();
        const spatialFactor = window.AudioSys ? AudioSys.getSpatialVolume(sourceX, sourceY, 1.0) : 1.0;
        if (spatialFactor <= 0) return;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1 * spatialFactor, now + 1.0); 
        gain.gain.linearRampToValueAtTime(0.2 * spatialFactor, now + duration);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.1);
        
        // Add some noise to the kettle
        const noise = audioCtx.createBufferSource();
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const nFilter = audioCtx.createBiquadFilter();
        nFilter.type = 'bandpass'; nFilter.frequency.value = 2000;
        const nGain = audioCtx.createGain();
        nGain.gain.setValueAtTime(0, now);
        nGain.gain.linearRampToValueAtTime(0.05 * spatialFactor, now + duration);
        
        osc.connect(gain); gain.connect(output);
        noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(output);
        
        osc.start(); osc.stop(now + duration + 0.1);
        noise.start(); noise.stop(now + duration + 0.1);
    },

    playFlamethrower(duration = 5, sourceX = undefined, sourceY = undefined) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const output = AudioSys.musicGain || audioCtx.destination;
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter(); 
        filter.type = 'lowpass'; 
        filter.frequency.setValueAtTime(1000, now); 
        filter.Q.value = 1;
        
        const gain = audioCtx.createGain();
        const spatialFactor = window.AudioSys ? AudioSys.getSpatialVolume(sourceX, sourceY, 1.0) : 1.0;
        if (spatialFactor <= 0) return;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3 * spatialFactor, now + 0.1);
        gain.gain.linearRampToValueAtTime(0.2 * spatialFactor, now + duration - 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        noise.connect(filter); filter.connect(gain); gain.connect(output);
        noise.start();
    }
});
