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

    explosion() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const bufferSize = audioCtx.sampleRate * 0.5;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1000;
        const gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start();
    }
});
