// Simple Web Audio API Synthesizer - Core Logic
const audioCtx = window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const musicGain = audioCtx.createGain();
musicGain.gain.value = 0.5; // 50% Volume as requested
musicGain.connect(audioCtx.destination);

const AudioSys = window.AudioSys = {
    musicGain: musicGain,
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

    move() {
        this.playTone(150, 'square', 0.1, 0.05);
    }
};
