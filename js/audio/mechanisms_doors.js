// Mechanisms: Buttons and Doors
Object.assign(window.AudioSys, {
    buttonClick() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const nSize = audioCtx.sampleRate * 0.005;
        const nBuffer = audioCtx.createBuffer(1, nSize, audioCtx.sampleRate);
        const nData = nBuffer.getChannelData(0);
        for(let i=0; i<nSize; i++) nData[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = nBuffer;
        const nFilter = audioCtx.createBiquadFilter();
        nFilter.type = 'highpass'; nFilter.frequency.value = 5000;
        const nGain = audioCtx.createGain();
        nGain.gain.setValueAtTime(0.15, now); nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.005);
        noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(audioCtx.destination);
        noise.start(now);

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.02);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.02);

        const lowOsc = audioCtx.createOscillator();
        const lowGain = audioCtx.createGain();
        lowOsc.type = 'sine'; lowOsc.frequency.setValueAtTime(160, now);
        lowOsc.frequency.exponentialRampToValueAtTime(60, now + 0.06);
        lowGain.gain.setValueAtTime(0.12, now); lowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        lowOsc.connect(lowGain); lowGain.connect(audioCtx.destination);
        lowOsc.start(now); lowOsc.stop(now + 0.06);
    },

    playDoorOpen() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square'; osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.1);

        const hSize = audioCtx.sampleRate * 0.5;
        const hBuffer = audioCtx.createBuffer(1, hSize, audioCtx.sampleRate);
        const hData = hBuffer.getChannelData(0);
        for(let i=0; i<hSize; i++) hData[i] = Math.random() * 2 - 1;
        const hiss = audioCtx.createBufferSource();
        hiss.buffer = hBuffer;
        const hFilter = audioCtx.createBiquadFilter();
        hFilter.type = 'highpass'; hFilter.frequency.setValueAtTime(6000, now);
        hFilter.frequency.exponentialRampToValueAtTime(3000, now + 0.5);
        const hGain = audioCtx.createGain();
        hGain.gain.setValueAtTime(0, now); hGain.gain.linearRampToValueAtTime(0.07, now + 0.05);
        hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        hiss.connect(hFilter); hFilter.connect(hGain); hGain.connect(audioCtx.destination);
        hiss.start(now);

        const pSize = audioCtx.sampleRate * 0.2;
        const pBuffer = audioCtx.createBuffer(1, pSize, audioCtx.sampleRate);
        const pData = pBuffer.getChannelData(0);
        for(let i=0; i<pSize; i++) pData[i] = Math.random() * 2 - 1;
        const puff = audioCtx.createBufferSource();
        puff.buffer = pBuffer;
        const pFilter = audioCtx.createBiquadFilter();
        pFilter.type = 'lowpass'; pFilter.frequency.setValueAtTime(800, now + 0.4);
        const pGain = audioCtx.createGain();
        pGain.gain.setValueAtTime(0, now + 0.4); pGain.gain.linearRampToValueAtTime(0.1, now + 0.45);
        pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        puff.connect(pFilter); pFilter.connect(pGain); pGain.connect(audioCtx.destination);
        puff.start(now + 0.4);
    },

    playDoorCloseRelease() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const pSize = audioCtx.sampleRate * 0.3;
        const pBuffer = audioCtx.createBuffer(1, pSize, audioCtx.sampleRate);
        const pData = pBuffer.getChannelData(0);
        for(let i=0; i<pSize; i++) pData[i] = Math.random() * 2 - 1;
        const puff = audioCtx.createBufferSource();
        puff.buffer = pBuffer;
        const pFilter = audioCtx.createBiquadFilter();
        pFilter.type = 'lowpass'; pFilter.frequency.setValueAtTime(1200, now);
        const pGain = audioCtx.createGain();
        pGain.gain.setValueAtTime(0.06, now); pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        puff.connect(pFilter); pFilter.connect(pGain); pGain.connect(audioCtx.destination);
        puff.start(now);
    },

    playDoorClosingWhir() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const duration = 0.3;
        const hSize = audioCtx.sampleRate * duration;
        const hBuffer = audioCtx.createBuffer(1, hSize, audioCtx.sampleRate);
        const hData = hBuffer.getChannelData(0);
        for(let i=0; i<hSize; i++) hData[i] = Math.random() * 2 - 1;
        const hiss = audioCtx.createBufferSource();
        hiss.buffer = hBuffer;
        const hFilter = audioCtx.createBiquadFilter();
        hFilter.type = 'highpass'; hFilter.frequency.setValueAtTime(5000, now);
        hFilter.frequency.exponentialRampToValueAtTime(2500, now + duration);
        const hGain = audioCtx.createGain();
        hGain.gain.setValueAtTime(0, now); hGain.gain.linearRampToValueAtTime(0.05, now + 0.05);
        hGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        hiss.connect(hFilter); hFilter.connect(hGain); hGain.connect(audioCtx.destination);
        hiss.start(now);
    },

    doorSlam() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const playImpactLayer = (freq, q, type, vol, decay) => {
            const bufferSize = audioCtx.sampleRate * decay;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const source = audioCtx.createBufferSource(); source.buffer = buffer;
            const filter = audioCtx.createBiquadFilter(); filter.type = type; filter.frequency.setValueAtTime(freq, now);
            filter.frequency.exponentialRampToValueAtTime(freq * 0.2, now + decay); filter.Q.value = q;
            const gain = audioCtx.createGain(); gain.gain.setValueAtTime(vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
            source.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
            source.start(now);
        };
        playImpactLayer(100, 10, 'lowpass', 1.0, 0.6);
        playImpactLayer(1500, 2, 'bandpass', 0.4, 0.2);
        const sub = audioCtx.createOscillator(); const subG = audioCtx.createGain();
        sub.frequency.setValueAtTime(60, now); subG.gain.setValueAtTime(0.5, now); subG.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        sub.connect(subG); subG.connect(audioCtx.destination);
        sub.start(now); sub.stop(now + 0.4);
    },

    doorGrind() {
        if (audioCtx.state !== 'running') return;
        const duration = 0.15;
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
        const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 400 + Math.random() * 400;
        const gain = audioCtx.createGain(); gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start();
    }
});
