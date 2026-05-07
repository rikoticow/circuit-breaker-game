// Circuit Breaker - Robot Procedural Voice System
// Procedural synthesis based on seeded random for glitchy, industrial aesthetic

const RobotVoice = {
    _getSeededRandom(seed) {
        let s = typeof seed === 'string' ? seed.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a|0},0) : seed;
        return function() {
            var t = s += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    },

    speak(mood = 'neutral') {
        const audioCtx = window.audioCtx;
        if (!audioCtx) return;
        
        if (audioCtx.state === 'suspended') {
            // Only try to resume if there's a reason, otherwise just fail silently
            // Chrome will log a warning if we call resume() without a gesture.
            return; 
        }

        const seed = Math.floor(Math.random() * 1000000).toString();
        const random = this._getSeededRandom(seed);

        let params = {
            baseFreq: 422,
            wave: 'triangle',
            duration: 1.6,
            speed: 6,
            jitter: 1200,
            glide: 0.27
        };

        if (mood === 'damage' || mood === 'dead') {
            params.baseFreq = 200 + random() * 400;
            params.jitter = 3000;
            params.duration = (mood === 'dead') ? 2.2 : (0.4 + random() * 0.6);
            params.speed = 20;
            params.wave = 'sawtooth';
        } else if (mood === 'heal') {
            params.baseFreq = 600 + random() * 300;
            params.jitter = 500;
            params.duration = 1.0;
            params.speed = 4;
            params.glide = 0.8;
        }

        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = params.wave;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
        gain.gain.setValueAtTime(0.05, now + params.duration - 0.05);
        gain.gain.linearRampToValueAtTime(0, now + params.duration);

        let t = now;
        const avgStep = 1.0 / params.speed;
        osc.frequency.setValueAtTime(params.baseFreq, t);

        while (t < now + params.duration) {
            const step = avgStep * (0.3 + random() * 1.4);
            const target = params.baseFreq + (random() - 0.5) * params.jitter;
            t += step;

            if (t > now + params.duration) t = now + params.duration;

            if (random() < params.glide) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(20, target), t);
            } else {
                osc.frequency.setValueAtTime(Math.max(20, target), t);
            }
        }

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + params.duration);
    }
};

if (typeof window !== 'undefined') window.RobotVoice = RobotVoice;
