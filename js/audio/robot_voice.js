// Circuit Breaker - Robot Procedural Voice System
// Procedural synthesis based on seeded random for glitchy, industrial aesthetic

const RobotVoice = {
    _getSeededRandom(seed) {
        let s = typeof seed === 'string' ? seed.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a | 0 }, 0) : seed;
        return function () {
            var t = s += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }
    },

    // ==========================================
    // VOZ DO PERSONAGEM PRINCIPAL (ROBOT)
    // ==========================================
    speak(mood = 'neutral') {
        const audioCtx = window.audioCtx;
        if (!audioCtx || audioCtx.state === 'suspended') return;

        const seed = Math.floor(Math.random() * 1000000).toString();
        const random = this._getSeededRandom(seed);

        let params = {
            baseFreq: 422,
            wave: 'triangle',
            duration: 1.6,
            speed: 6,
            jitter: 1200,
            glide: 0.27,
            volume: 0.05
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

        this._synthesize(params, random);
    },

    // ==========================================
    // VOZ DO ROBÔ LOGÍSTICO (LOGISTIC BOT)
    // ==========================================
    speakLogistic(mood = 'neutral', sourceX = undefined, sourceY = undefined) {
        const audioCtx = window.audioCtx;
        if (!audioCtx || audioCtx.state === 'suspended') return;

        const seed = Math.floor(Math.random() * 1000000).toString();
        const random = this._getSeededRandom(seed);

        // CONFIG: Original (Aguda/Nervosa)
        let params = {
            baseFreq: 900 + random() * 200,
            wave: 'square',
            duration: 0.8 + random() * 0.4,
            speed: 12,
            jitter: 1500,
            glide: 0.4,
            volume: 0.015
        };

        if (mood === 'damage' || mood === 'dead') {
            params.baseFreq = 500 + random() * 300;
            params.jitter = 4000;
            params.duration = (mood === 'dead') ? 1.5 : 0.3;
            params.speed = 25;
            params.wave = 'sawtooth';
        } else if (mood === 'board') {
            params.baseFreq = 1200;
            params.jitter = 200;
            params.duration = 0.4;
            params.speed = 5;
            params.glide = 0.9;
        } else if (mood === 'dismount') {
            params.baseFreq = 800;
            params.jitter = 300;
            params.duration = 0.5;
            params.speed = 8;
            params.glide = 0.1;
        }

        this._synthesize(params, random, sourceX, sourceY);
    },

    // ==========================================
    // VOZ DA UNIDADE DE REPARO (REPAIR UNIT)
    // ==========================================
    speakRepair(mood = 'neutral', sourceX = undefined, sourceY = undefined) {
        const audioCtx = window.audioCtx;
        if (!audioCtx || audioCtx.state === 'suspended') return;

        const seed = Math.floor(Math.random() * 1000000).toString();
        const random = this._getSeededRandom(seed);

        // CONFIG: Masculina Profunda (Baixo)
        let params = {
            baseFreq: 110 + random() * 30, // Muito profunda
            wave: 'square',
            duration: 1.4 + random() * 0.4,
            speed: 7, // Lenta e deliberada
            jitter: 500,
            glide: 0.2,
            volume: 0.04
        };

        if (mood === 'damage' || mood === 'dead') {
            params.baseFreq = 70 + random() * 30;
            params.jitter = 3000;
            params.duration = (mood === 'dead') ? 2.5 : 0.6;
            params.speed = 18;
            params.wave = 'sawtooth';
        }

        this._synthesize(params, random, sourceX, sourceY);
    },

    // ==========================================
    // VOZ DO COURIER (DATA COURIER)
    // ==========================================
    speakCourier(mood = 'neutral', sourceX = undefined, sourceY = undefined) {
        const audioCtx = window.audioCtx;
        if (!audioCtx || audioCtx.state === 'suspended') return;

        const seed = Math.floor(Math.random() * 1000000).toString();
        const random = this._getSeededRandom(seed);

        // CONFIG: Ultra-aguda, rápida, "pássaro metálico"
        let params = {
            baseFreq: 1500 + random() * 500,
            wave: 'sine',
            duration: 0.4 + random() * 0.2,
            speed: 18,
            jitter: 500,
            glide: 0.9,
            volume: 0.012
        };

        if (mood === 'damage' || mood === 'dead') {
            params.baseFreq = 800 + random() * 400;
            params.jitter = 3000;
            params.duration = (mood === 'dead') ? 1.0 : 0.2;
            params.speed = 30;
            params.wave = 'sawtooth';
        } else if (mood === 'scared') {
            params.baseFreq = 2500 + random() * 1000;
            params.speed = 25;
            params.duration = 0.2;
        }

        this._synthesize(params, random, sourceX, sourceY);
    },

    // ==========================================
    // VOZ DO SPARK JUMPER (⚡)
    // ==========================================
    speakSpark(mood = 'neutral', sourceX = undefined, sourceY = undefined) {
        const audioCtx = window.audioCtx;
        if (!audioCtx || audioCtx.state === 'suspended') return;

        const seed = Math.floor(Math.random() * 1000000).toString();
        const random = this._getSeededRandom(seed);

        // CONFIG: Elétrica, oscilante, alta energia
        let params = {
            baseFreq: 600 + random() * 400,
            wave: 'sawtooth',
            duration: 0.6 + random() * 0.4,
            speed: 25, // Rápida
            jitter: 2000,
            glide: 0.8,
            volume: 0.02
        };

        if (mood === 'charging') {
            params.baseFreq = 400;
            params.jitter = 500;
            params.duration = 1.0;
            params.glide = 0.95; // Slide up
        } else if (mood === 'jumping') {
            params.baseFreq = 1200;
            params.jitter = 100;
            params.duration = 0.3;
            params.wave = 'sine';
        } else if (mood === 'discharge') {
            params.baseFreq = 1500;
            params.jitter = 5000;
            params.duration = 0.8;
            params.speed = 40;
            params.wave = 'square';
        }

        this._synthesize(params, random, sourceX, sourceY);
    },

    // ==========================================
    // VOZ DO SOLDADOR (WELD BOT)
    // ==========================================
    speakWeld(mood = 'neutral', sourceX = undefined, sourceY = undefined) {
        if (typeof IAVoice === 'undefined') return;

        const voiceOptions = {
            variant: 'm1',
            glitchMode: false,
            bitcrusher: true,
            bitcrusherAmount: 70,
            playbackRate: 0.8,
            pitch: 35,
            speed: 140,
            volume: 0.3, // Volume ajustado para ser um pouco mais baixo
            powerDownMode: (mood === 'dead'), // Ativa o efeito de "falha" (pitch caindo) na morte
            sourceX,
            sourceY
        };

        let text = "";
        const r = Math.random();

        switch (mood) {
            case 'weld':
                const weldPhrases = [
                    "Iniciando soldagem!",
                    "Fusão em curso!",
                    "Tratamento térmico!",
                    "Aumentando temperatura!",
                    "Fogo purifica!"
                ];
                text = weldPhrases[Math.floor(r * weldPhrases.length)];
                break;
            case 'dead':
                const deadPhrases = [
                    "Faísca solta!",
                    "Circuito fundido!",
                    "Superaquecimento total!",
                    "Núcleo derretido!",
                    "Escória metálica..."
                ];
                text = deadPhrases[Math.floor(r * deadPhrases.length)];
                break;
            case 'secured':
            case 'neutral':
                const safePhrases = [
                    "Sem pontos de calor!",
                    "Temperatura normalizada.",
                    "Solda resfriada.",
                    "Material estabilizado.",
                    "Chama extinta."
                ];
                text = safePhrases[Math.floor(r * safePhrases.length)];
                break;
            case 'detect':
                const detectPhrases = [
                    "SOLDAR!",
                    "EU PRECISO SOLDAR!",
                    "SOLDA SOLDA SOLDA!"
                ];
                text = detectPhrases[Math.floor(r * detectPhrases.length)];
                break;
            case 'damage':
                // For damage, we can use the procedural synth for a "pain" sound or just skip
                this._synthesize({
                    baseFreq: 100,
                    wave: 'sawtooth',
                    duration: 0.3,
                    speed: 20,
                    jitter: 3000,
                    volume: 0.04
                }, this._getSeededRandom(Math.random()), sourceX, sourceY);
                return;
        }

        if (text) {
            IAVoice.speak(text, voiceOptions);
        }
    },

    // ==========================================
    // VOZ DO BRICK STACK (BRICK / CONSTRUTOR)
    // ==========================================
    speakBrick(mood = 'neutral', sourceX = undefined, sourceY = undefined) {
        if (typeof IAVoice === 'undefined') return;

        const voiceOptions = {
            variant: 'm1',
            glitchMode: false,
            bitcrusher: true,
            bitcrusherAmount: 80,
            playbackRate: 0.7,
            pitch: 22,
            speed: 125,
            volume: 0.35,
            powerDownMode: (mood === 'dead' || mood === 'death'),
            sourceX,
            sourceY
        };

        let text = "";
        const r = Math.random();

        switch (mood) {
            case 'throw':
            case 'attack':
                const throwPhrases = [
                    "CAIXA NELE!",
                    "Lançando bloco!",
                    "Mais alvenaria!",
                    "Tijolo pesado!",
                    "CONSTRUIR BARREIRA!"
                ];
                text = throwPhrases[Math.floor(r * throwPhrases.length)];
                break;
            case 'reload':
                const reloadPhrases = [
                    "Faltou cimento...",
                    "Fabricando blocos...",
                    "Misturando argamassa...",
                    "Carga esgotada..."
                ];
                text = reloadPhrases[Math.floor(r * reloadPhrases.length)];
                break;
            case 'dead':
            case 'death':
                const deadPhrases = [
                    "Demolição total!",
                    "Estrutura desabou...",
                    "Fui esmagado!",
                    "Sem fundação..."
                ];
                text = deadPhrases[Math.floor(r * deadPhrases.length)];
                break;
            case 'secured':
            case 'neutral':
                const safePhrases = [
                    "Estoque de caixas cheio.",
                    "Alvenaria pronta.",
                    "Canteiro de obras limpo.",
                    "Cimento seco."
                ];
                text = safePhrases[Math.floor(r * safePhrases.length)];
                break;
            case 'damage':
                this._synthesize({
                    baseFreq: 80,
                    wave: 'square',
                    duration: 0.3,
                    speed: 15,
                    jitter: 2000,
                    volume: 0.05
                }, this._getSeededRandom(Math.random()), sourceX, sourceY);
                return;
        }

        if (text) {
            IAVoice.speak(text, voiceOptions);
        }
    },

    // ==========================================
    // VOZ DA CABLE SNAKE (🐍 / CAPTURADOR DE CABOS)
    // ==========================================
    speakCable(mood = 'neutral', sourceX = undefined, sourceY = undefined) {
        if (typeof IAVoice === 'undefined') return;

        // Throttling inteligente: impede que a sucuri sobreponha e polua o áudio ao repetir falas
        this._lastCableSpeechMs = this._lastCableSpeechMs || 0;
        const nowMs = Date.now();
        if (mood !== 'dead' && mood !== 'death' && mood !== 'damage') {
            if (nowMs - this._lastCableSpeechMs < 1500) return;
            this._lastCableSpeechMs = nowMs;
        }

        const voiceOptions = {
            variant: 'whisperf', // Voz feminina sussurrada/sibilante
            echo: true,
            feedback: 0.12, // Reduzido drasticamente para erradicar o eco ensurdecedor e repetitivo
            delayTime: 0.08, // Atraso curto para dar ambiência sutil sem embolar
            glitchMode: true,
            bitcrusher: true,
            bitcrusherAmount: 50,
            playbackRate: 1.15,
            pitch: 82,
            speed: 125,
            volume: 0.45,
            powerDownMode: (mood === 'dead' || mood === 'death'),
            sourceX,
            sourceY
        };

        let text = "";
        const r = Math.random();

        switch (mood) {
            case 'detect':
            case 'stretch':
                text = "Cable detected!";
                break;
            case 'grab':
            case 'wrap':
                const wrapPhrases = [
                    "Embrulhando!",
                    "Conexão estabelecida!",
                    "Apertando os cabos!"
                ];
                text = wrapPhrases[Math.floor(r * wrapPhrases.length)];
                break;
            case 'dead':
            case 'death':
                const deadPhrases = [
                    "Conexão perdida...",
                    "Cabos rompidos...",
                    "Desconectada!"
                ];
                text = deadPhrases[Math.floor(r * deadPhrases.length)];
                break;
            case 'damage':
                this._synthesize({
                    baseFreq: 500,
                    wave: 'sawtooth',
                    duration: 0.25,
                    speed: 30,
                    jitter: 2500,
                    volume: 0.05
                }, this._getSeededRandom(Math.random()), sourceX, sourceY);
                return;
        }

        if (text) {
            IAVoice.speak(text, voiceOptions);
        }
    },

    // ==========================================
    // VOZ DO GLITCH WALKER (👻 / ENTIDADE INSTÁVEL)
    // ==========================================
    speakGlitch(mood = 'neutral', sourceX = undefined, sourceY = undefined) {
        if (typeof IAVoice === 'undefined') return;

        // Throttling para não sobrepor falas de teleporte
        this._lastGlitchSpeechMs = this._lastGlitchSpeechMs || 0;
        const nowMs = Date.now();
        if (mood !== 'dead' && mood !== 'damage') {
            if (nowMs - this._lastGlitchSpeechMs < 1200) return;
            this._lastGlitchSpeechMs = nowMs;
        }

        const voiceOptions = {
            variant: 'f1', // Voz feminina robótica/instável
            echo: true,
            feedback: 0.15,
            delayTime: 0.05,
            glitchMode: true,
            bitcrusher: true,
            bitcrusherAmount: 85,
            playbackRate: 1.2,
            pitch: 75,
            speed: 150,
            volume: 0.4,
            powerDownMode: (mood === 'dead'),
            sourceX,
            sourceY
        };

        let text = "";
        const r = Math.random();

        switch (mood) {
            case 'fade':
                text = "Glitch!";
                break;
            case 'teleport':
                text = "Teleportando!";
                break;
            case 'reappear':
                text = "Reaparecendo!";
                break;
            case 'attack':
                text = "ERRO FATAL!";
                break;
            case 'dead':
                text = "Exceção não tratada...";
                break;
            case 'damage':
                this._synthesize({
                    baseFreq: 800,
                    wave: 'square',
                    duration: 0.2,
                    speed: 40,
                    jitter: 4000,
                    volume: 0.05
                }, this._getSeededRandom(Math.random()), sourceX, sourceY);
                return;
        }

        if (text) {
            IAVoice.speak(text, voiceOptions);
        }
    },


    // --- Private Synthesis Engine ---
    _synthesize(params, random, sourceX = undefined, sourceY = undefined) {
        const audioCtx = window.audioCtx;
        const now = audioCtx.currentTime;

        // Apply Spatial Audio
        const finalVol = AudioSys.getSpatialVolume(sourceX, sourceY, params.volume);
        if (finalVol <= 0) return;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = params.wave;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(finalVol, now + 0.05);
        gain.gain.setValueAtTime(finalVol, now + params.duration - 0.05);
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
