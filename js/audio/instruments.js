// Synthesized Instruments Library
// Extends AudioSys with procedural sound generation

Object.assign(window.AudioSys, {
    playKick(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.2);
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        osc.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + 0.2);
    },

    playSnare(time) {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.value = 1000;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    playHiHat(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square'; osc.frequency.value = 8000;
        gain.gain.setValueAtTime(0.02, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
        osc.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + 0.03);
    },

    playRetroKick(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + 0.15);
    },

    playRetroSnare(time) {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.value = 800;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    playPowerChord(freq, time) {
        const duration = 0.15;
        const gain = audioCtx.createGain();
        const shaper = audioCtx.createWaveShaper();
        shaper.curve = (function () {
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
        shaper.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
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
        filter.connect(gain); gain.connect(this.musicGain);
        osc1.start(time); osc2.start(time);
        osc1.stop(time + duration); osc2.stop(time + duration);
    },

    playVariedChug(freq, time, filterFreq, isAggressive) {
        const duration = isAggressive ? 0.1 : 0.15;
        const gain = audioCtx.createGain();
        const shaper = audioCtx.createWaveShaper();
        shaper.curve = (function () {
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
        shaper.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
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
        osc.connect(gain); gain.connect(this.musicGain);
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
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    playCyberPad(chordFreqs, time, intensity) {
        const duration = intensity === 0 ? 4.0 : 2.0;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.06, time + 1.0);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, time);
        filter.frequency.linearRampToValueAtTime(1500, time + 1.0);
        filter.frequency.exponentialRampToValueAtTime(300, time + duration);
        chordFreqs.forEach(freq => {
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            osc1.type = 'sawtooth'; osc2.type = 'sawtooth';
            osc1.frequency.value = freq;
            osc2.frequency.value = freq;
            osc2.detune.value = 12;
            osc1.connect(filter); osc2.connect(filter);
            osc1.start(time); osc2.start(time);
            osc1.stop(time + duration); osc2.stop(time + duration);
        });
        filter.connect(gain); gain.connect(this.musicGain);
    },

    play8BitBass(freq, time, isAggressive) {
        const duration = isAggressive ? 0.12 : 0.18;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + duration);
    },

    playHeroLead(freq, time, intensity, isArp = false) {
        const duration = isArp ? 0.1 : (intensity === 0 ? 0.6 : 0.25);
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        if (intensity === 0) {
            osc.type = 'sine';
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.1, time + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
            const lfo = audioCtx.createOscillator();
            lfo.frequency.value = 6;
            const lfoGain = audioCtx.createGain();
            lfoGain.gain.value = 8;
            lfo.connect(lfoGain); lfoGain.connect(osc.detune);
            lfo.start(time + 0.1); lfo.stop(time + duration);
        } else {
            osc.type = 'square';
            gain.gain.setValueAtTime(0.05, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        }
        osc.frequency.setValueAtTime(freq, time);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 3000;
        osc.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + duration);
    },

    playWaterPad(chordFreqs, time, intensity) {
        const duration = intensity === 0 ? 4.0 : 2.5;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + 1.0);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine'; lfo.frequency.value = 0.5;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 600;
        filter.frequency.setValueAtTime(400, time);
        lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
        lfo.start(time); lfo.stop(time + duration);
        chordFreqs.forEach((freq) => {
            const osc = audioCtx.createOscillator();
            osc.type = 'triangle'; osc.frequency.value = freq;
            osc.connect(filter); osc.start(time); osc.stop(time + duration);
        });
        filter.connect(gain); gain.connect(this.musicGain);
    },

    playHydroBass(freq, time) {
        const duration = 0.2;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth'; osc.frequency.value = freq;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.1);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + duration);
    },

    playCrystalLead(freq, time, intensity) {
        this.triggerCrystalTone(freq, time, 0.15);
        if (intensity < 2) {
            this.triggerCrystalTone(freq, time + 0.35, 0.05);
            this.triggerCrystalTone(freq, time + 0.70, 0.01);
        }
    },

    triggerCrystalTone(freq, time, volume) {
        const duration = 0.8;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq * 2;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + duration);
    },

    playBubbleArp(chordFreqs, time) {
        const notes = [chordFreqs[0], chordFreqs[1], chordFreqs[2], chordFreqs[1]];
        notes.forEach((freq, index) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.value = freq * 4;
            const noteTime = time + (index * 0.05);
            gain.gain.setValueAtTime(0.05, noteTime);
            gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.05);
            osc.connect(gain); gain.connect(this.musicGain);
            osc.start(noteTime); osc.stop(noteTime + 0.05);
        });
    },

    playSubKick(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(100, time);
        osc.frequency.exponentialRampToValueAtTime(10, time + 0.15);
        gain.gain.setValueAtTime(0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + 0.15);
    },

    playSplashSnare(time) {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 1500;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    playBubbleHiHat(time) {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 3500; filter.Q.value = 5;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    playBrightPad(chordFreqs, time) {
        const duration = 2.0;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.setValueAtTime(500, time);
        filter.frequency.exponentialRampToValueAtTime(3000, time + 0.5);
        filter.frequency.exponentialRampToValueAtTime(200, time + duration);
        chordFreqs.forEach(freq => {
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            osc1.type = 'sawtooth'; osc2.type = 'sawtooth';
            osc1.frequency.value = freq; osc2.frequency.value = freq; osc2.detune.value = 8;
            osc1.connect(filter); osc2.connect(filter);
            osc1.start(time); osc2.start(time);
            osc1.stop(time + duration); osc2.stop(time + duration);
        });
        filter.connect(gain); gain.connect(this.musicGain);
    },

    playSlapBass(freq, time, isPop = false) {
        const duration = isPop ? 0.1 : 0.2;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(isPop ? 0.2 : 0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.setValueAtTime(isPop ? 5000 : 2500, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + duration);
        osc.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + duration);
    },

    playMarimba(freq, time) {
        const duration = 0.15;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + duration);
    },

    playBongo(time, isHigh) {
        const duration = 0.15;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(isHigh ? 400 : 250, time);
        osc.frequency.exponentialRampToValueAtTime(isHigh ? 250 : 150, time + 0.1);
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + duration);
    },

    playHeroLead_Jungle(freq, time) {
        const duration = 0.25;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square'; osc.frequency.value = freq;
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 6;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 15;
        lfo.connect(lfoGain); lfoGain.connect(osc.detune);
        gain.gain.setValueAtTime(0.06, time);
        gain.gain.linearRampToValueAtTime(0.05, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 3500;
        osc.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        osc.start(time); lfo.start(time);
        osc.stop(time + duration); lfo.stop(time + duration);
    },

    playRainAmbient(time) {
        const duration = 1.0;
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 300 + (Math.random() * 100);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.015, time);
        gain.gain.linearRampToValueAtTime(0.01, time + duration);
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    playTragicPad(chordFreqs, time, intensity) {
        const duration = 4.0;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.06 + (intensity * 0.02), time + 2.0);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration + 1.0);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.setValueAtTime(150, time);
        filter.frequency.linearRampToValueAtTime(600, time + 2.0);
        filter.frequency.exponentialRampToValueAtTime(100, time + duration);
        chordFreqs.forEach(freq => {
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            osc1.type = 'sawtooth'; osc2.type = 'sawtooth';
            osc1.frequency.value = freq; osc2.frequency.value = freq; osc2.detune.value = -12;
            osc1.connect(filter); osc2.connect(filter);
            osc1.start(time); osc2.start(time);
            osc1.stop(time + duration + 1.0); osc2.stop(time + duration + 1.0);
        });
        filter.connect(gain); gain.connect(this.musicGain);
    },

    playExhaustedDrone(freq, time) {
        const duration = 4.0;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        const waveShaper = audioCtx.createWaveShaper();
        waveShaper.curve = new Float32Array([-0.8, 0, 0.8]);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + 1.0);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 150;
        osc.connect(waveShaper); waveShaper.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + duration);
    },

    playCryingOcarina(freq, time) {
        const duration = 1.5;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 3.5;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 8;
        lfo.connect(lfoGain); lfoGain.connect(osc.detune);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.frequency.setValueAtTime(freq, time);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 800;
        osc.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        osc.start(time); lfo.start(time);
        osc.stop(time + duration); lfo.stop(time + duration);
    },

    playFuneralBell(freq, time) {
        const duration = 6.0;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = 'sine'; osc2.type = 'triangle';
        osc1.frequency.value = freq / 2; osc2.frequency.value = (freq / 2) * 3.0;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc1.connect(gain); osc2.connect(gain); gain.connect(this.musicGain);
        osc1.start(time); osc2.start(time);
        osc1.stop(time + duration); osc2.stop(time + duration);
    },

    playWindChime(time) {
        const duration = 4.0;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const chimeNotes = [880.00, 1046.50, 1318.51, 1567.98, 1760.00];
        const randomNote = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];
        osc.type = 'sine'; osc.frequency.value = randomNote;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.05, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 4000;
        osc.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + duration);
    },

    playTriforcePad(chordFreqs, time, intensity) {
        const duration = intensity === 0 ? 4.0 : 2.0;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.setValueAtTime(800, time);
        filter.frequency.linearRampToValueAtTime(2500, time + 1.0);
        chordFreqs.forEach((freq) => {
            const osc = audioCtx.createOscillator();
            osc.type = 'sawtooth'; osc.frequency.value = freq;
            osc.connect(filter); osc.start(time); osc.stop(time + duration);
        });
        filter.connect(gain); gain.connect(this.musicGain);
    },

    playBusterBass(freq, time) {
        const duration = 0.12;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square'; osc.frequency.value = freq;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, time);
        filter.frequency.exponentialRampToValueAtTime(200, time + 0.08);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + duration);
    },

    play8BitArp(freq, time) {
        const duration = 0.08;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + duration);
    },

    playMasterSwordLead(freq, time, intensity) {
        const duration = intensity === 0 ? 0.8 : 0.4;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = 'square'; osc2.type = 'triangle';
        osc1.frequency.value = freq; osc2.frequency.value = freq;
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 6;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 10;
        lfo.connect(lfoGain); lfoGain.connect(osc1.detune);
        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 5000;
        osc1.connect(filter); osc2.connect(filter);
        filter.connect(gain); gain.connect(this.musicGain);
        osc1.start(time); osc2.start(time); lfo.start(time);
        osc1.stop(time + duration); osc2.stop(time + duration); lfo.stop(time + duration);
    },

    playRetroKick_Epic(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(200, time);
        osc.frequency.exponentialRampToValueAtTime(20, time + 0.1);
        gain.gain.setValueAtTime(0.7, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + 0.15);
    },

    playRetroSnare_Epic(time) {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.value = 800;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    playTickHat(time) {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 8000;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    playChoirPad(chordFreqs, time, intensity) {
        const duration = intensity === 0 ? 4.0 : 2.0;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, time);
        filter.frequency.linearRampToValueAtTime(1200, time + 1.0);
        chordFreqs.forEach((freq) => {
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            osc1.type = 'triangle'; osc2.type = 'sine';
            osc1.frequency.value = freq; osc2.frequency.value = freq * 2;
            osc2.detune.value = 10;
            osc1.connect(filter); osc2.connect(filter);
            osc1.start(time); osc2.start(time);
            osc1.stop(time + duration); osc2.stop(time + duration);
        });
        filter.connect(gain); gain.connect(this.musicGain);
    },

    playXBass(freq, time) {
        const duration = 0.12;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = 'sawtooth'; osc2.type = 'square';
        osc1.frequency.value = freq; osc2.frequency.value = freq / 2;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2500, time);
        filter.frequency.exponentialRampToValueAtTime(150, time + 0.08);
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc1.connect(filter); osc2.connect(filter);
        filter.connect(gain); gain.connect(this.musicGain);
        osc1.start(time); osc2.start(time);
        osc1.stop(time + duration); osc2.stop(time + duration);
    },

    playOverdriveGuitar(freq, time, intensity) {
        if (!this.distortionCurve) {
            const k = 400; const n = 44100;
            this.distortionCurve = new Float32Array(n);
            const deg = Math.PI / 180;
            for (let i = 0; i < n; ++i) {
                const x = i * 2 / n - 1;
                this.distortionCurve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
            }
        }
        const duration = intensity === 0 ? 0.6 : 0.25;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = 'square'; osc2.type = 'sawtooth';
        osc1.frequency.value = freq; osc2.frequency.value = freq;
        osc2.detune.value = 15;
        const waveShaper = audioCtx.createWaveShaper();
        waveShaper.curve = this.distortionCurve;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(5000, time);
        filter.frequency.exponentialRampToValueAtTime(1000, time + duration);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc1.connect(waveShaper); osc2.connect(waveShaper);
        waveShaper.connect(filter);
        filter.connect(gain); gain.connect(this.musicGain);
        osc1.start(time); osc2.start(time);
        osc1.stop(time + duration); osc2.stop(time + duration);
    },

    playHarpsichord(freq, time) {
        const duration = 0.15;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth'; osc.frequency.value = freq;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.value = 2000;
        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + duration);
    },

    playSNESKick(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(250, time);
        osc.frequency.exponentialRampToValueAtTime(20, time + 0.1);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + 0.15);
    },

    playSNESSnare(time) {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.value = 800;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    playSNESHat(time) {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 8000;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    playEkklesiastikoOrgano(chordFreqs, time, intensity) {
        const duration = intensity === 0 ? 4.0 : 2.0;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.12, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        chordFreqs.forEach((freq) => {
            this.createOrganPipe(freq, time, duration, gain, 1.0);
            this.createOrganPipe(freq * 2, time, duration, gain, 0.5);
            this.createOrganPipe(freq * 3, time, duration, gain, 0.3);
        });
        gain.connect(this.musicGain);
    },

    createOrganPipe(freq, time, duration, outGain, vol) {
        const osc = audioCtx.createOscillator();
        const pipeGain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        pipeGain.gain.value = vol;
        osc.connect(pipeGain);
        pipeGain.connect(outGain);
        osc.start(time);
        osc.stop(time + duration);
    },

    playVampireBass(freq, time, intensity) {
        const duration = intensity === 2 ? 0.10 : 0.15;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2500, time);
        filter.frequency.exponentialRampToValueAtTime(300, time + 0.08);
        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(time);
        osc.stop(time + duration);
    },

    playTsempaloArp(freq, time) {
        const duration = 0.15;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2500;
        filter.Q.value = 2;
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(time);
        osc.stop(time + duration);
    },

    playGothikoLead(freq, time, intensity) {
        const duration = intensity === 0 ? 0.8 : 0.4;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = 'square';
        osc2.type = 'sawtooth';
        osc1.frequency.value = freq;
        osc2.frequency.value = freq;
        osc2.detune.value = -8;
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 5;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 12;
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.detune);
        lfoGain.connect(osc2.detune);
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 4000;
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc1.start(time); osc2.start(time); lfo.start(time);
        osc1.stop(time + duration); osc2.stop(time + duration); lfo.stop(time + duration);
    },

    playMastigio(time) {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.15, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(5000, time);
        filter.frequency.exponentialRampToValueAtTime(800, time + 0.1);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    playSkoteinoKick(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, time);
        osc.frequency.exponentialRampToValueAtTime(20, time + 0.1);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + 0.15);
    },

    playStringPad(chordFreqs, time, intensity) {
        const duration = intensity === 0 ? 4.0 : 2.5;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, time);
        filter.frequency.linearRampToValueAtTime(1500, time + 1.5);
        chordFreqs.forEach((freq) => {
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            osc1.type = 'sawtooth'; osc2.type = 'sawtooth';
            osc1.frequency.value = freq; osc2.frequency.value = freq; 
            osc2.detune.value = 12;
            osc1.connect(filter); osc2.connect(filter);
            osc1.start(time); osc2.start(time);
            osc1.stop(time + duration); osc2.stop(time + duration);
        });
        filter.connect(gain); gain.connect(this.musicGain);
    },

    playHarpSweep(chordFreqs, time, isFast = false) {
        const notes = [chordFreqs[0], chordFreqs[1], chordFreqs[2], chordFreqs[0] * 2];
        const speed = isFast ? 0.03 : 0.06;
        notes.forEach((freq, i) => {
            const noteTime = time + (i * speed);
            const duration = 1.0;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine'; osc.frequency.value = freq * 2;
            gain.gain.setValueAtTime(0.06, noteTime);
            gain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);
            osc.connect(gain); gain.connect(this.musicGain);
            osc.start(noteTime); osc.stop(noteTime + duration);
        });
    },

    playAdventureBass(freq, time) {
        const duration = 0.15;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square'; osc.frequency.value = freq;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.08);
        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + duration);
    },

    playAeroLead(freq, time, intensity) {
        const duration = intensity === 0 ? 0.8 : 0.35;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const osc3 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = 'sawtooth'; osc2.type = 'sawtooth'; osc3.type = 'square';
        osc1.frequency.value = freq; osc2.frequency.value = freq;
        osc3.frequency.value = freq / 2; osc2.detune.value = 8;
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 5;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 4;
        lfo.connect(lfoGain); lfoGain.connect(osc1.detune); lfoGain.connect(osc2.detune);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.18, time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, time);
        filter.frequency.exponentialRampToValueAtTime(6000, time + 0.05);
        filter.frequency.exponentialRampToValueAtTime(1500, time + duration);
        osc1.connect(filter); osc2.connect(filter); osc3.connect(filter);
        filter.connect(gain); gain.connect(this.musicGain);
        osc1.start(time); osc2.start(time); osc3.start(time); lfo.start(time);
        osc1.stop(time + duration); osc2.stop(time + duration); osc3.stop(time + duration); lfo.stop(time + duration);
    },

    playSNESKick(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(250, time);
        osc.frequency.exponentialRampToValueAtTime(20, time + 0.1);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc.connect(gain); gain.connect(this.musicGain);
        osc.start(time); osc.stop(time + 0.15);
    },

    playSNESSnare(time) {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 1500; filter.Q.value = 1;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    playSNESHat(time) {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 10000;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    playCrashCymbal(time) {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 1.5, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(6000, time);
        filter.frequency.linearRampToValueAtTime(2000, time + 1.0);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    // --- Temporal Buster Instruments ---

    playTimePad(chordFreqs, time, intensity) {
        const duration = intensity === 0 ? 4.0 : 2.0;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.5); 
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, time);
        filter.frequency.exponentialRampToValueAtTime(1500, time + 1.0); 
        chordFreqs.forEach((freq) => {
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            osc1.type = 'sawtooth'; 
            osc2.type = 'sawtooth';
            osc1.frequency.value = freq;
            osc2.frequency.value = freq; 
            osc2.detune.value = 15;
            osc1.connect(filter);
            osc2.connect(filter);
            osc1.start(time); osc2.start(time);
            osc1.stop(time + duration); osc2.stop(time + duration);
        });
        filter.connect(gain);
        gain.connect(this.musicGain);
    },

    playClockTick(time, isHigh) {
        const duration = 0.05;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(isHigh ? 1200 : 800, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 10;
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(time);
        osc.stop(time + duration);
    },

    playTimeWarp(time) {
        const duration = 2.0;
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1; 
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 5;
        filter.frequency.setValueAtTime(200, time);
        filter.frequency.exponentialRampToValueAtTime(4000, time + duration/2);
        filter.frequency.exponentialRampToValueAtTime(200, time + duration);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + duration/2);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration); 
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    playTechBass(freq, time, intensity) {
        const duration = intensity === 2 ? 0.12 : 0.18;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, time); 
        filter.frequency.exponentialRampToValueAtTime(150, time + 0.1); 
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(time);
        osc.stop(time + duration);
    },

    playEpochLead(freq, time, intensity) {
        const duration = intensity === 0 ? 0.8 : 0.35; 
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = 'triangle';
        osc2.type = 'square';
        const midFreq = freq / 2;
        osc1.frequency.setValueAtTime(midFreq * 0.95, time);
        osc1.frequency.exponentialRampToValueAtTime(midFreq, time + 0.04);
        osc2.frequency.setValueAtTime(midFreq * 0.95, time);
        osc2.frequency.exponentialRampToValueAtTime(midFreq, time + 0.04);
        osc2.detune.value = 8;
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 5; 
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 6;
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.detune);
        lfoGain.connect(osc2.detune);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.18, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, time);
        filter.frequency.exponentialRampToValueAtTime(3000, time + 0.05);
        filter.frequency.exponentialRampToValueAtTime(1000, time + duration);
        osc1.connect(filter); osc2.connect(filter);
        filter.connect(gain); gain.connect(this.musicGain);
        osc1.start(time); osc2.start(time); lfo.start(time);
        osc1.stop(time + duration); osc2.stop(time + duration); lfo.stop(time + duration);
    },

    // --- Void Suspense Instruments ---

    playChronoPad(chordFreqs, time, intensity) {
        const duration = intensity === 0 ? 4.0 : 2.5;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.06, time + 1.0);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, time);
        filter.frequency.exponentialRampToValueAtTime(800, time + 1.5); 
        chordFreqs.forEach((freq) => {
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            osc1.type = 'sine'; 
            osc2.type = 'sawtooth'; 
            osc1.frequency.value = freq;
            osc2.frequency.value = freq; 
            osc2.detune.value = 25; 
            osc1.connect(filter);
            osc2.connect(filter);
            osc1.start(time); osc2.start(time);
            osc1.stop(time + duration); osc2.stop(time + duration);
        });
        filter.connect(gain);
        gain.connect(this.musicGain);
    },

    playFlamencoPluck(freq, time) {
        const duration = 0.25;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(4000, time);
        filter.frequency.exponentialRampToValueAtTime(200, time + 0.1);
        filter.Q.value = 3;
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(time);
        osc.stop(time + duration);
    },

    playVoidClap(time) {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1; 
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass'; 
        filter.frequency.value = 1200; 
        filter.Q.value = 1;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.03);
        gain.gain.linearRampToValueAtTime(0.2, time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        noise.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
        noise.start(time);
    },

    playDesertLead(freq, time, intensity) {
        const duration = intensity === 0 ? 1.5 : 0.45; 
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = 'square'; 
        osc2.type = 'sawtooth'; 
        osc1.frequency.value = freq;
        osc2.frequency.value = freq;
        osc2.detune.value = -12; 
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 4; 
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 15; 
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.detune);
        lfoGain.connect(osc2.detune);
        gain.gain.setValueAtTime(0, time);
        if (intensity === 0 || duration > 0.8) {
            gain.gain.linearRampToValueAtTime(0.12, time + 0.5); 
        } else {
            gain.gain.linearRampToValueAtTime(0.15, time + 0.05);
        }
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, time);
        filter.frequency.exponentialRampToValueAtTime(3000, time + 0.1); 
        filter.frequency.exponentialRampToValueAtTime(1000, time + duration);
        osc1.connect(filter); osc2.connect(filter);
        filter.connect(gain); gain.connect(this.musicGain);
        osc1.start(time); osc2.start(time); lfo.start(time);
        osc1.stop(time + duration); osc2.stop(time + duration); lfo.stop(time + duration);
    }
});
