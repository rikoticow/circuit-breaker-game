/**
 * CIRCUIT BREAKER - Voice Synthesis System
 * Uses meSpeak.js for industrial/robotic IA voice.
 */

const IAVoice = {
    initialized: false,
    initializing: false,
    pendingText: null,
    configPath: './js/lib/mespeak_config.json?v=' + Date.now(),
    voicePath: './js/lib/pt.json?v=' + Date.now(),
    
    // Cache to prevent meSpeak from crashing on rapid calls (e.g. glitch + demon modes)
    synthesisCache: new Map(),
    MAX_CACHE_SIZE: 100,
    
    defaultOptions: {
        amplitude: 100,
        pitch: 50,     
        speed: 130,    
        wordgap: 1,
        variant: 'f2', 
        voice: 'pt',
        echo: true,
        feedback: 0.4,
        delayTime: 0.12,
        detune: 120,
        playbackRate: 1.2,
        glitchMode: true,
        driftMode: true,
        driftAmount: 0.15,
        driftSpeed: 2
    },

    init() {
        if (this.initialized || this.initializing) return;
        this.initializing = true;
        this.configTriggered = false;
        
        console.log("IA Voice: Starting initialization...");
        
        try {
            if (typeof meSpeak === 'undefined') {
                console.error("IA Voice: meSpeak.js library not found!");
                this.initializing = false;
                return;
            }

            // Timeout safety: if it takes more than 10s, reset flag so it can try again
            this.initTimeout = setTimeout(() => {
                if (!this.initialized) {
                    console.warn("IA Voice: Initialization timeout. meSpeak may have failed to load assets.");
                    this.initializing = false;
                }
            }, 10000);

            // Poll for config load since meSpeak.loadConfig does not take a callback
            const pollConfig = () => {
                if (meSpeak.isConfigLoaded()) {
                    console.log("IA Voice: Config loaded. Loading voice...");
                    this.loadVoiceSequence();
                } else {
                    if (!this.configTriggered) {
                        this.configTriggered = true;
                        console.log("IA Voice: Requesting config from " + this.configPath);
                        meSpeak.loadConfig(this.configPath);
                    }
                    // Keep polling (unless it timed out)
                    if (this.initializing) {
                        setTimeout(pollConfig, 100);
                    }
                }
            };

            pollConfig();
        } catch (e) {
            this.initializing = false;
            console.error("IA Voice: Fatal error during init:", e);
        }
    },

    loadVoiceSequence() {
        if (meSpeak.isVoiceLoaded('pt')) {
            this.finalizeInit();
            return;
        }

        meSpeak.loadVoice(this.voicePath, (success, message) => {
            if (success) {
                console.log("IA Voice: Voice data loaded successfully.");
                this.finalizeInit();
            } else {
                console.error("IA Voice: Failed to load voice data:", message);
                this.initializing = false;
            }
        });
    },

    finalizeInit() {
        if (this.initTimeout) clearTimeout(this.initTimeout);
        this.initialized = true;
        this.initializing = false;
        console.log("IA Voice: System fully ready.");
        
        if (this.pendingText) {
            console.log("IA Voice: Speaking pending message...");
            const { text, options } = this.pendingText;
            this.pendingText = null;
            this.speak(text, options);
        }
    },

    speak(text, options = {}) {
        if (!this.initialized) {
            this.pendingText = { text, options };
            this.init();
            console.warn("IA Voice: Not ready, queuing message.");
            return;
        }

        // Handle Stutter Mode (repeating syllables)
        if (options.stutterMode) {
            text = text.split(/\s+/).map(word => {
                if (word.length > 3 && Math.random() > 0.5) {
                    const start = word.substring(0, 1);
                    return `${start}-${start}-${word}`;
                }
                return word;
            }).join(' ');
        }

        // Handle Glitch Mode or Pitch Flip (both require word-by-word processing)
        if (options.glitchMode || options.pitchFlip || (this.defaultOptions.glitchMode && options.glitchMode !== false)) {
            this.speakGlitchy(text, options);
            return;
        }

        const cleanText = text.replace(/\[.*?\]/g, '');
        const speakOptions = { ...this.defaultOptions, ...options };
        
        try {
            console.log("IA Voice speaking: " + cleanText);
            
            // If Web Audio effects are requested, we process via playWithEffects
            const needsWebAudio = speakOptions.echo || 
                                 speakOptions.variant === 'whisperf' || 
                                 speakOptions.demonMode || 
                                 speakOptions.thunderMode ||
                                 speakOptions.detune !== undefined ||
                                 speakOptions.playbackRate !== undefined ||
                                 speakOptions.reverseEcho;

            if (needsWebAudio) {
                const buffer = this.getCachedSynthesis(cleanText, speakOptions);
                if (buffer) {
                    this.playWithEffects(buffer, speakOptions, cleanText);
                }
            } else {
                meSpeak.speak(cleanText, speakOptions);
            }
        } catch (e) {
            console.error("IA Voice: meSpeak.speak error:", e);
        }
    },

    playWithEffects(uint8Data, options, cleanText) {
        if (!window.audioCtx) return;
        
        const uint8 = new Uint8Array(uint8Data);
        const ab = uint8.buffer;
        
        // Reverse Echo Mode: Supernatural pre-delay effect
        if (options.reverseEcho) {
            this.playReverseEcho(ab, options);
            return;
        }

        // Thunder Mode: Uses multiple synthesis calls for synchronized layers
        if (options.thunderMode) {
            this.playLayer(ab, { ...options, delay: 0 }); // Original
            
            // Generate deep layers via synthesis so they have the same duration
            const deep1 = this.getCachedSynthesis(cleanText, { ...options, pitch: Math.max(1, (options.pitch || 50) - 20) });
            const deep2 = this.getCachedSynthesis(cleanText, { ...options, pitch: Math.max(1, (options.pitch || 50) - 40) });
            
            if (deep1) this.playLayer(new Uint8Array(deep1).buffer, { ...options, delay: 0.01, pan: -0.3, volume: 0.8, thunderFilter: true });
            if (deep2) this.playLayer(new Uint8Array(deep2).buffer, { ...options, delay: 0.02, pan: 0.3, volume: 1.0, thunderFilter: true });
            return;
        }

        // Demon Mode: Uses multiple synthesis calls for synchronized choral effect
        if (options.demonMode) {
            this.playLayer(ab, { ...options, delay: 0, pan: 0 }); // Center
            
            const p = options.pitch || 50;
            const s1 = this.getCachedSynthesis(cleanText, { ...options, pitch: p + 15 });
            const s2 = this.getCachedSynthesis(cleanText, { ...options, pitch: p - 15 });
            
            if (s1) this.playLayer(new Uint8Array(s1).buffer, { ...options, delay: 0.01, pan: -0.4, volume: 0.7 });
            if (s2) this.playLayer(new Uint8Array(s2).buffer, { ...options, delay: 0.02, pan: 0.4, volume: 0.7 });
            return;
        }

        this.playLayer(ab, options);
    },

    getCachedSynthesis(text, options) {
        // Create a unique key for this text and its synthesis parameters
        const key = `${text}_p${options.pitch}_s${options.speed}_v${options.variant}_g${options.wordgap}_pf${options.pitchFlip ? '1' : '0'}`;
        
        if (this.synthesisCache.has(key)) {
            return this.synthesisCache.get(key);
        }

        try {
            const buffer = meSpeak.speak(text, { ...options, rawdata: 'array' });
            if (buffer) {
                // Manage cache size
                if (this.synthesisCache.size >= this.MAX_CACHE_SIZE) {
                    const firstKey = this.synthesisCache.keys().next().value;
                    this.synthesisCache.delete(firstKey);
                }
                this.synthesisCache.set(key, buffer);
                return buffer;
            }
        } catch (e) {
            console.error("IA Voice Cache Error:", e);
        }
        return null;
    },

    playReverseEcho(ab, options) {
        audioCtx.decodeAudioData(ab.slice(0), (buffer) => {
            const duration = buffer.duration;
            const sampleRate = buffer.sampleRate;
            const channels = buffer.numberOfChannels;
            
            // Create a longer buffer to hold the "pre-echoes"
            const extraTime = 2.0; 
            const newBuffer = audioCtx.createBuffer(channels, (duration + extraTime) * sampleRate, sampleRate);
            
            for (let c = 0; c < channels; c++) {
                const data = buffer.getChannelData(c);
                const newData = newBuffer.getChannelData(c);
                
                // 1. Reverse original
                const reversed = new Float32Array(data).reverse();
                
                // 2. Place reversed at the START of newData
                newData.set(reversed);
                
                // 3. Apply manual echo on reversed data
                const delaySamples = Math.floor(0.15 * sampleRate);
                const feedback = 0.4;
                for (let i = 0; i < 3; i++) {
                    const offset = (i + 1) * delaySamples;
                    const gain = Math.pow(feedback, i + 1);
                    for (let j = 0; j < reversed.length; j++) {
                        if (offset + j < newData.length) {
                            newData[offset + j] += reversed[j] * gain;
                        }
                    }
                }
                
                // 4. Reverse the whole thing back
                newData.reverse();
            }
            
            // Play the result
            const source = audioCtx.createBufferSource();
            source.buffer = newBuffer;
            
            if (options.playbackRate) source.playbackRate.value = options.playbackRate;
            if (options.detune) source.detune.value = options.detune;

            source.connect(audioCtx.destination);
            source.start();
        });
    },

    playLayer(ab, options) {
        audioCtx.decodeAudioData(ab.slice(0), (audioBuffer) => {
            const sourceNode = audioCtx.createBufferSource();
            sourceNode.buffer = audioBuffer;
            let currentNode = sourceNode;
            
            const startTime = audioCtx.currentTime + (options.delay || 0);

            // Nodes
            const mainGain = audioCtx.createGain();
            const panner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
            const delay = audioCtx.createDelay();
            const feedback = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();
            const bitCrusher = options.bitcrusher ? audioCtx.createWaveShaper() : null;

            // Configuration
            mainGain.gain.value = (options.volume || (options.demonMode ? 0.7 : 1.0));
            if (panner) panner.pan.value = options.pan || 0;

            // Thunder Filter (removes highs from sub layers)
            if (options.thunderFilter) {
                const thunderLP = audioCtx.createBiquadFilter();
                thunderLP.type = 'lowpass';
                thunderLP.frequency.value = 150;
                currentNode.connect(thunderLP);
                currentNode = thunderLP; // Update chain
            }

            // Bitcrusher Implementation
            if (bitCrusher) {
                bitCrusher.curve = this.makeDistortionCurve(options.bitcrusherAmount || 10);
                bitCrusher.oversample = '4x';
            }

            // Drift Mode (LFO Pitch Modulation)
            if (options.driftMode) {
                const lfo = audioCtx.createOscillator();
                const lfoGain = audioCtx.createGain();
                lfo.type = 'sine';
                lfo.frequency.value = options.driftSpeed || 2; // Hz
                lfoGain.gain.value = options.driftAmount || 0.1; // Intensity
                lfo.connect(lfoGain);
                lfoGain.connect(sourceNode.playbackRate);
                lfo.start();
            }
            
            // Adjust echo based on options or defaults from the instance
            const delayTime = options.delayTime !== undefined ? options.delayTime : this.defaultOptions.delayTime; 
            const feedbackValue = options.feedback !== undefined ? options.feedback : this.defaultOptions.feedback;
            
            delay.delayTime.value = delayTime;
            feedback.gain.value = feedbackValue;
            
            filter.type = 'lowpass';
            filter.frequency.value = 2500; // Industrial muffle

            // Pitch manipulation via Web Audio Source Node
            if (options.playbackRate) {
                sourceNode.playbackRate.value = options.playbackRate;
            }
            if (options.detune) {
                sourceNode.detune.value = options.detune;
            }

            // Main path
            let lastNode = currentNode;
            if (bitCrusher) {
                lastNode.connect(bitCrusher);
                lastNode = bitCrusher;
            }
            if (panner) {
                lastNode.connect(panner);
                lastNode = panner;
            }
            lastNode.connect(mainGain);
            mainGain.connect(audioCtx.destination);

            // Connect to Echo Loop if enabled
            if (options.echo) {
                sourceNode.connect(delay);
                delay.connect(filter);
                filter.connect(feedback);
                feedback.connect(delay); 
                feedback.connect(audioCtx.destination);
            }

            sourceNode.start(startTime);
        }, (err) => {
            // Ignore decoding errors on multiple layers to avoid console spam
        });
    },

    makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    },

    speakGlitchy(text, options) {
        const words = text.split(/\s+/);
        let currentIndex = 0;

        const speakNextWord = () => {
            if (currentIndex >= words.length) return;
            
            const word = words[currentIndex];
            const randomGap = Math.floor(Math.random() * 3) + 1; // 1 to 3
            
            // Apply Pitch Flip if enabled (Alternates between high and low pitch per word)
            let wordOptions = { ...options, glitchMode: false, pitchFlip: false };
            if (options.pitchFlip) {
                const isEven = currentIndex % 2 === 0;
                const detuneAmount = options.pitchFlipAmount || 800; // Radical hardware detune
                
                wordOptions.detune = isEven ? detuneAmount : -detuneAmount;
                console.log(`IA Voice PitchFlip: Word "${word}" -> ${isEven ? 'HIGH' : 'LOW'} (detune: ${wordOptions.detune})`);
            }

            this.speak(word, wordOptions);
            
            currentIndex++;
            
            // Estimate word duration: approx 60ms per char at speed 220
            const speedFactor = options.speed || this.defaultOptions.speed;
            const duration = (word.length * (13000 / speedFactor)) + (randomGap * 20);
            
            if (currentIndex < words.length) {
                setTimeout(speakNextWord, duration);
            }
        };

        speakNextWord();
    },

    stop() {
        if (typeof meSpeak !== 'undefined' && meSpeak.stop) {
            meSpeak.stop();
        }
    }
};

window.IAVoice = IAVoice;

// Start loading assets immediately
IAVoice.init();
