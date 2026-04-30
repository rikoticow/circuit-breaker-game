// Industrial Ambience: Lasers, Conveyors, and Electrical Hum
Object.assign(window.AudioSys, {
    playConveyorGear(type = 0) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const duration = 0.05;
        const baseFreq = type === 0 ? 120 : 160;
        const filterFreq = type === 0 ? 800 : 1200;
        const vol = type === 0 ? 0.08 : 0.07;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        osc.type = 'square';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.linearRampToValueAtTime(baseFreq * 0.8, now + duration);
        filter.type = 'bandpass'; filter.frequency.value = filterFreq; filter.Q.value = 5;
        gain.gain.setValueAtTime(vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + duration);

        const lowOsc = audioCtx.createOscillator();
        const lowGain = audioCtx.createGain();
        lowOsc.type = 'triangle';
        lowOsc.frequency.setValueAtTime(type === 0 ? 80 : 70, now);
        lowOsc.frequency.exponentialRampToValueAtTime(50, now + duration);
        lowGain.gain.setValueAtTime(0.08, now);
        lowGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        lowOsc.connect(lowGain); lowGain.connect(audioCtx.destination);
        lowOsc.start(now); lowOsc.stop(now + duration);

        const bufferSize = audioCtx.sampleRate * 0.01;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const nFilter = audioCtx.createBiquadFilter();
        nFilter.type = 'highpass'; nFilter.frequency.value = type === 0 ? 4000 : 6000;
        const nGain = audioCtx.createGain();
        nGain.gain.setValueAtTime(0.05, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
        noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(audioCtx.destination);
        noise.start(now);
    },

    shepardOscillators: [],
    shepardGains: [],
    shepardPhase: 0,
    updateConveyorShepard(active) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;

        if (active) {
            if (this.shepardOscillators.length === 0) {
                for (let i = 0; i < 5; i++) {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0, now);
                    osc.connect(gain); gain.connect(audioCtx.destination);
                    osc.start();
                    this.shepardOscillators.push(osc);
                    this.shepardGains.push(gain);
                }
            }
            this.shepardPhase = (this.shepardPhase + 0.005) % 1.0;
            for (let i = 0; i < 5; i++) {
                let pos = (i + this.shepardPhase * 5) % 5;
                let freq = 60 * Math.pow(2, pos);
                this.shepardOscillators[i].frequency.setValueAtTime(freq, now);
                let x = pos / 5;
                let gainVal = Math.pow(Math.sin(x * Math.PI), 8) * 0.045; 
                this.shepardGains[i].gain.setTargetAtTime(gainVal, now, 0.03);
            }
        } else {
            if (this.shepardOscillators.length > 0) {
                for (let i = 0; i < 5; i++) {
                    this.shepardGains[i].gain.setTargetAtTime(0, now, 0.1);
                }
            }
        }
    },

    humNodes: [],
    humGain: null,
    crackleInterval: null,

    startHum() {
        if (this.humNodes.length > 0) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        osc1.type = 'sawtooth'; osc1.frequency.value = 120;
        osc2.type = 'square'; osc2.frequency.value = 240;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 800;
        this.humGain = audioCtx.createGain();
        this.humGain.gain.value = 0;
        osc1.connect(filter); osc2.connect(filter);
        filter.connect(this.humGain); this.humGain.connect(audioCtx.destination);
        osc1.start(); osc2.start();
        this.humNodes = [osc1, osc2];
    },

    updateHum(hasActiveBlocks, progress = 0, isContaminated = false) {
        if (audioCtx.state !== 'running') return;
        if (this.humNodes.length === 0) this.startHum();
        this.humGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);

        const lfoSpeed = isContaminated ? 12.0 : 3.0;
        const lfoDepth = isContaminated ? 12.0 : 4.0;
        let lfo = Math.sin(audioCtx.currentTime * lfoSpeed) * lfoDepth;
        if (isContaminated && Math.random() > 0.95) lfo += (Math.random() - 0.5) * 40;

        const baseF1 = 120; const baseF2 = 240;
        const targetF1 = baseF1 + (progress * 80) + lfo;
        const targetF2 = baseF2 + (progress * 160) + (lfo * 1.5);
        if (this.humNodes[0]) this.humNodes[0].frequency.setTargetAtTime(targetF1, audioCtx.currentTime, 0.1);
        if (this.humNodes[1]) this.humNodes[1].frequency.setTargetAtTime(targetF2, audioCtx.currentTime, 0.1);

        this._currentProgress = progress; this._isContaminated = isContaminated;
        if (hasActiveBlocks && !this.crackleInterval) {
            this.crackleInterval = setInterval(() => {
                const prog = this._currentProgress || 0;
                const contam = this._isContaminated || false;
                const baseChance = contam ? 0.65 : 0.95;
                const crackleChance = baseChance - (prog * 0.4);
                if (Math.random() > crackleChance) {
                    const crackle = audioCtx.createOscillator();
                    const g = audioCtx.createGain();
                    const baseFreq = contam ? 400 : 1500;
                    crackle.type = contam ? 'sawtooth' : 'square';
                    crackle.frequency.setValueAtTime(baseFreq + (prog * 2500) + Math.random() * 2000, audioCtx.currentTime);
                    g.gain.setValueAtTime(0.006, audioCtx.currentTime);
                    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
                    crackle.connect(g); g.connect(audioCtx.destination);
                    crackle.start(); crackle.stop(audioCtx.currentTime + 0.04);
                }
            }, 50);
        } else if (!hasActiveBlocks && this.crackleInterval) {
            clearInterval(this.crackleInterval);
            this.crackleInterval = null;
        }
    },

    laserNodes: [],
    laserGain: null,
    laserHitNodes: [],
    laserHitGain: null,

    updateLaserAudio(activeEmitters) {
        if (audioCtx.state !== 'running') return;
        const isLaserActive = activeEmitters.length > 0;
        if (isLaserActive && !this.laserGain) {
            this.laserGain = audioCtx.createGain();
            this.laserGain.gain.value = 0;
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            osc1.type = 'sawtooth'; osc1.frequency.value = 55;
            osc2.type = 'square'; osc2.frequency.value = 110;
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass'; filter.frequency.value = 800; filter.Q.value = 12;
            osc1.connect(filter); osc2.connect(filter);
            filter.connect(this.laserGain); this.laserGain.connect(audioCtx.destination);
            osc1.start(); osc2.start();
            this.laserNodes = [osc1, osc2, filter];
        }

        if (this.laserGain) {
            const targetVol = isLaserActive ? 0.03 : 0;
            this.laserGain.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.05);
            if (isLaserActive) {
                const sweep = 1000 + Math.sin(audioCtx.currentTime * 2.5) * 600;
                this.laserNodes[2].frequency.setTargetAtTime(sweep, audioCtx.currentTime, 0.1);
                const lfo = Math.sin(audioCtx.currentTime * 40) * 1.5;
                this.laserNodes[0].frequency.setTargetAtTime(55 + lfo, audioCtx.currentTime, 0.05);
                this.laserNodes[1].frequency.setTargetAtTime(110 + lfo * 2, audioCtx.currentTime, 0.05);
            }
        }

        const isHitting = activeEmitters.some(e => e.laserTarget && e.laserTarget.type !== 'NONE' && e.laserTarget.type !== 'PLAYER');
        if (isHitting && !this.laserHitGain) {
            this.laserHitGain = audioCtx.createGain();
            this.laserHitGain.gain.value = 0;
            const bufferSize = audioCtx.sampleRate * 2;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer; noise.loop = true;
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'highpass'; filter.frequency.value = 6500;
            const lpf = audioCtx.createBiquadFilter();
            lpf.type = 'lowpass'; lpf.frequency.value = 12000;
            noise.connect(filter); filter.connect(lpf); lpf.connect(this.laserHitGain);
            this.laserHitGain.connect(audioCtx.destination);
            noise.start();
            this.laserHitNodes = [noise, filter];
        }

        if (this.laserHitGain) {
            const targetHitVol = isHitting ? 0.015 : 0;
            this.laserHitGain.gain.setTargetAtTime(targetHitVol, audioCtx.currentTime, 0.05);
            if (isHitting) {
                const sizzle = 6500 + Math.sin(audioCtx.currentTime * 10) * 500;
                this.laserHitNodes[1].frequency.setTargetAtTime(sizzle, audioCtx.currentTime, 0.05);
            }
        }
    },

    conveyorSlide() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const duration = 0.15;
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + duration);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start(now);
    }
});
