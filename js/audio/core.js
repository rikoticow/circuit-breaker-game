// Simple Web Audio API Synthesizer - Core Logic
const audioCtx = window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const musicGain = audioCtx.createGain();
musicGain.gain.value = 0.5; // 50% Volume as requested
musicGain.connect(audioCtx.destination);

const AudioSys = window.AudioSys = {
    musicGain: musicGain,

    getSpatialVolume(sourceX, sourceY, baseVolume, maxDistance = 20) {
        if (sourceX === undefined || sourceY === undefined || !window.game || !window.game.player) {
            return baseVolume;
        }
        const dx = sourceX - window.game.player.x;
        const dy = sourceY - window.game.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= maxDistance) return 0;

        // Linear attenuation: 1.0 at 0 dist, 0.0 at maxDistance
        const factor = 1 - (dist / maxDistance);
        return baseVolume * factor;
    },

    playTone(freq, type, duration, vol=0.1, startTime=null, sourceX=undefined, sourceY=undefined) {
        if (audioCtx.state === 'suspended') {
            return;
        }
        const now = startTime || audioCtx.currentTime;
        
        // Apply Spatial Audio
        const finalVol = this.getSpatialVolume(sourceX, sourceY, vol);
        if (finalVol <= 0) return;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        
        gain.gain.setValueAtTime(finalVol, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, finalVol * 0.1), now + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(now);
        osc.stop(now + duration);
    },

    move() {
        this.playTone(150, 'square', 0.1, 0.05);
    },

    speak(mood = 'neutral') {
        if (window.RobotVoice) window.RobotVoice.speak(mood);
    }
};
