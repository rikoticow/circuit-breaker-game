// Adaptive Music System and Synthesized Instruments
// Consolidated and Refactored for Multi-Theme Support

Object.assign(window.AudioSys, {
    musicActive: false,
    nextNoteTime: 0,
    current16thNote: 0,
    musicTimerID: null,
    tempoBPM: 140,
    musicIntensity: 1,
    currentThemeKey: 'industrial',

    // --- Core Controls ---

    playGameMusic(target = null) {
        // Se target for uma string, é uma chave de tema direta (usado no player)
        if (typeof target === 'string' && this.THEMES[target]) {
            this.currentThemeKey = target;
        } else {
            // Se for número ou null, resolve via lógica de nível/setor
            this.updateThemeFromLevel(target);
        }

        if (this.musicActive) {
            // Se já estiver ativo e o tema for o mesmo, não faz nada
            return;
        }
        if (audioCtx.state === 'suspended') {
            const resume = () => {
                audioCtx.resume().then(() => {
                    this.playGameMusic();
                    window.removeEventListener('click', resume);
                    window.removeEventListener('keydown', resume);
                });
            };
            window.addEventListener('click', resume);
            window.addEventListener('keydown', resume);
            return;
        }

        this.musicActive = true;
        this.current16thNote = 0;
        this.nextNoteTime = audioCtx.currentTime + 0.1;
        this.scheduleMusic();
    },

    stopGameMusic() {
        this.musicActive = false;
        if (this.musicTimerID) clearTimeout(this.musicTimerID);
    },

    setMusicIntensity(val) {
        this.musicIntensity = Math.max(0, Math.min(2, val));
        const theme = this.THEMES[this.currentThemeKey];
        if (theme && theme.getBPM) {
            this.tempoBPM = theme.getBPM(this.musicIntensity);
        } else {
            this.tempoBPM = (this.musicIntensity === 0) ? 100 : 140;
        }
    },

    updateThemeFromLevel(forceIdx = null) {
        let levelIdx = 0;
        if (forceIdx !== null) {
            levelIdx = forceIdx;
        } else if (window.game) {
            levelIdx = window.game.levelIndex;
        } else if (window.GameState && window.GameState.instance) {
            levelIdx = window.GameState.instance.levelIndex;
        }

        const level = (window.LEVELS && levelIdx >= 0) ? window.LEVELS[levelIdx] : null;
        const prevTheme = this.currentThemeKey;

        // Scan map for hazards (Pits) to force Aquatic theme (Atmospheric shift)
        let hasPits = false;
        if (level && level.map) {
            hasPits = level.map.some(row => row.includes('*'));
        }

        // --- Chapter-Based Sector Mapping ---
        let sectorIdx = 0;
        
        // Se o array CHAPTERS existir (definido no levels.js), procuramos o setor correto
        if (window.CHAPTERS) {
            const foundIdx = window.CHAPTERS.findIndex(ch => ch.levels && ch.levels.includes(levelIdx));
            if (foundIdx !== -1) sectorIdx = foundIdx;
            else sectorIdx = levelIdx; // Fallback para 1:1 se não encontrar no chapter
        } else {
            sectorIdx = levelIdx; // Fallback total
        }

        const themesMap = [
            'industrial',  // Setor 01: Steel Heart Awakening
            'adventure',   // Setor 02: Binary Explorer
            'aero',        // Setor 03: Skyward Flow
            'aquatic',     // Setor 04: Quantum Abyss
            'jungle',      // Setor 05: Neon Wilds
            'void',        // Setor 06: Shadows of the Void
            'epic',        // Setor 07: Reality Breach
            'climax',      // Setor 08: Overclocked Spirit
            'singularity', // Setor 09: Singularity Paradox
            'gothic'       // Setor 10: The Circuit Breaker
        ];

        this.currentThemeKey = themesMap[sectorIdx] || 'aero';

        // Casos especiais baseados em mecânica (ex: cair no abismo)
        if (hasPits && sectorIdx < 3) {
            this.currentThemeKey = 'aquatic'; // Força tema de abismo se houver pits em setores iniciais
        }

        // If theme actually changed, reset the clock
        if (this.currentThemeKey !== prevTheme && this.musicActive) {
            this.current16thNote = 0;
            this.nextNoteTime = audioCtx.currentTime + 0.05;
        }

        // Sync BPM
        this.setMusicIntensity(this.musicIntensity);
    },

    scheduleMusic() {
        if (!this.musicActive) return;
        const lookahead = 0.1;
        while (this.nextNoteTime < audioCtx.currentTime + lookahead) {
            this.playMusicStep(this.current16thNote, this.nextNoteTime);
            const secondsPerBeat = 60.0 / this.tempoBPM;
            this.nextNoteTime += 0.25 * secondsPerBeat;
            this.current16thNote++;
            if (this.current16thNote === 512) this.current16thNote = 0; // Suporte expandido para 32 compassos
        }
        this.musicTimerID = setTimeout(() => this.scheduleMusic(), 25);
    },

    playMusicStep(step, time) {
        const theme = this.THEMES[this.currentThemeKey];
        if (theme && theme.playStep) {
            theme.playStep.call(this, step, time);
        }
    },

    // --- THEME DEFINITIONS ---

    THEMES: {
        industrial: {
            getBPM(intensity) { return intensity === 0 ? 100 : 140; },
            playStep(step, time) {
                const bar = Math.floor(step / 16);
                const localStep = step % 16;
                const progBar = bar % 4;
                const bassFreqs = [82.4, 82.4, 130.8, 146.8];
                const bassRoot = bassFreqs[progBar];
                if (this.musicIntensity > 0) {
                    if (localStep === 0) this.playPowerChord(bassRoot, time);
                    if (localStep % 2 === 0 || localStep % 4 === 3) {
                        if (localStep !== 0) this.playVariedChug(bassRoot, time, 1200, true);
                    }
                    this.playHiHat(time);
                    if (localStep === 0 || localStep === 8 || localStep === 11) this.playKick(time);
                    if (localStep === 4 || localStep === 12) this.playSnare(time);
                    if (progBar === 0 && localStep === 0) this.playCinematicSnare(time);
                    if (progBar === 3 && localStep >= 12 && localStep % 2 === 0) this.playSnare(time);
                } else {
                    if (localStep === 0) this.playBladeRunnerPad(step, bar, time);
                    if (localStep % 2 === 0) this.playHiHat(time);
                }
                const melodyBar = bar % 8;
                const melody = [
                    [329.6, 0, 0, 392.0, 0, 0, 440.0, 0, 0, 493.9, 0, 440.0, 0, 392.0, 0, 0],
                    [329.6, 0, 0, 0, 0, 0, 0, 0, 493.9, 0, 523.3, 0, 493.9, 0, 440.0, 0],
                    [392.0, 0, 0, 329.6, 0, 0, 261.6, 0, 0, 329.6, 0, 0, 392.0, 0, 0, 0],
                    [440.0, 0, 0, 370.0, 0, 0, 293.7, 0, 0, 370.0, 0, 440.0, 0, 587.3, 0, 0],
                    [659.3, 0, 0, 587.3, 0, 0, 523.3, 0, 0, 493.9, 0, 0, 440.0, 0, 0, 0],
                    [493.9, 0, 0, 392.0, 0, 0, 329.6, 0, 0, 0, 0, 0, 329.6, 392.0, 440.0, 493.9],
                    [523.3, 0, 0, 493.9, 0, 0, 440.0, 0, 0, 392.0, 0, 0, 329.6, 0, 0, 0],
                    [440.0, 0, 0, 0, 587.3, 0, 0, 0, 659.3, 0, 0, 0, 0, 0, 0, 0]
                ];
                const note = melody[melodyBar][localStep];
                if (note > 0) this.playMetalLead(note, time);
            }
        },

        adventure: {
            getBPM(intensity) { return intensity === 0 ? 100 : (intensity === 1 ? 130 : 160); },
            playStep(step, time) {
                const bar = Math.floor(step / 16);
                const localStep = step % 16;
                const progBar = bar % 8;
                const bassRoots = [110.0, 87.31, 130.81, 98.00, 110.0, 87.31, 164.81, 164.81];
                const padChords = [
                    [110.0, 130.81, 164.81], [87.31, 110.0, 130.81], [130.81, 164.81, 196.00], [98.00, 123.47, 146.83],
                    [110.0, 130.81, 164.81], [87.31, 110.0, 130.81], [164.81, 207.65, 246.94], [164.81, 207.65, 246.94]
                ];
                if (localStep === 0) this.playCyberPad(padChords[progBar], time, this.musicIntensity);
                if (this.musicIntensity > 0) {
                    if (this.musicIntensity === 2) this.play8BitBass(bassRoots[progBar], time, true);
                    else if (localStep % 2 === 0 || localStep % 4 === 3) this.play8BitBass(bassRoots[progBar], time, false);
                    if (this.musicIntensity === 2) {
                        if (localStep % 4 === 0) this.playRetroKick(time);
                        if (localStep % 8 === 4) this.playRetroSnare(time);
                        if (localStep % 2 === 0) this.playHiHat(time);
                    } else {
                        if (localStep === 0 || localStep === 10) this.playRetroKick(time);
                        if (localStep === 4 || localStep === 12) this.playRetroSnare(time);
                        if (localStep % 4 === 0) this.playHiHat(time);
                    }
                }
                const melody = [
                    [440.0, 0, 659.3, 0, 523.3, 0, 440.0, 0, 493.9, 0, 523.3, 0, 659.3, 0, 880.0, 0],
                    [349.2, 0, 440.0, 0, 523.3, 0, 698.5, 0, 659.3, 0, 523.3, 0, 440.0, 0, 523.3, 0],
                    [261.6, 0, 392.0, 0, 523.3, 0, 659.3, 0, 587.3, 0, 392.0, 0, 293.7, 0, 392.0, 0],
                    [392.0, 0, 493.9, 0, 587.3, 0, 784.0, 0, 698.5, 0, 587.3, 0, 493.9, 0, 392.0, 0],
                    [880.0, 0, 659.3, 0, 0, 0, 523.3, 0, 659.3, 0, 0, 0, 440.0, 0, 0, 0],
                    [698.5, 0, 523.3, 0, 0, 0, 440.0, 0, 523.3, 0, 0, 0, 349.2, 0, 0, 0],
                    [329.6, 0, 415.3, 0, 493.9, 0, 659.3, 0, 830.6, 0, 659.3, 0, 493.9, 0, 415.3, 0],
                    [830.6, 0, 0, 0, 987.8, 0, 0, 0, 1046.5, 0, 0, 0, 0, 0, 0, 0]
                ];
                const note = melody[progBar][localStep];
                if (note > 0) this.playHeroLead(note, time, this.musicIntensity);
                if (this.musicIntensity === 2 && note === 0 && localStep % 2 === 0) {
                    const arpNotes = [bassRoots[progBar] * 4, bassRoots[progBar] * 6];
                    this.playHeroLead(arpNotes[(localStep / 2) % 2], time, 2, true);
                }
            }
        },

        aero: {
            getBPM(intensity) { return intensity === 0 ? 120 : (intensity === 1 ? 155 : 175); },
            playStep(step, time) {
                const bar = Math.floor(step / 16);
                const localStep = step % 16;
                const progBar = bar % 16;
                const padChords = [
                    [164.81, 196.00, 246.94], [130.81, 164.81, 196.00], [146.83, 196.00, 246.94], [146.83, 185.00, 220.00],
                    [164.81, 196.00, 246.94], [130.81, 164.81, 196.00], [110.00, 130.81, 164.81], [123.47, 155.56, 196.00],
                    [130.81, 164.81, 196.00], [146.83, 185.00, 220.00], [164.81, 196.00, 246.94], [123.47, 146.83, 185.00],
                    [130.81, 164.81, 196.00], [146.83, 185.00, 220.00], [164.81, 207.65, 246.94], [164.81, 207.65, 246.94]
                ];
                const bassRoots = [
                    82.41, 65.41, 98.00, 73.42, 82.41, 65.41, 55.00, 61.74,
                    65.41, 73.42, 82.41, 61.74, 65.41, 73.42, 82.41, 82.41
                ];
                if (localStep === 0) this.playStringPad(padChords[progBar], time, this.musicIntensity);
                if (this.musicIntensity < 2) {
                    if (localStep % 4 === 0) this.playHarpSweep(padChords[progBar], time);
                } else {
                    if (localStep % 2 === 0) this.playHarpSweep(padChords[progBar], time, true);
                }
                if (this.musicIntensity > 0) {
                    if (progBar !== 15 || localStep < 8) {
                        if (localStep % 4 === 0 || localStep % 4 === 3) this.playAdventureBass(bassRoots[progBar], time);
                    }
                    if (localStep === 0 && (progBar === 0 || progBar === 8)) this.playCrashCymbal(time);
                    if (localStep === 14 && (progBar === 7 || progBar === 15)) this.playCrashCymbal(time);
                    if ((progBar === 7 || progBar === 15) && localStep >= 8) {
                        if (localStep % 2 === 0) this.playSNESSnare(time);
                    } else {
                        if (localStep % 4 === 0) this.playSNESKick(time);
                        if (localStep === 4 || localStep === 12) this.playSNESSnare(time);
                        this.playSNESHat(time);
                    }
                } else {
                    if (localStep === 0) this.playSNESKick(time);
                    if (localStep === 0 && progBar % 4 === 0) this.playCrashCymbal(time);
                }
                const melody = [
                    [659.25, 0, 0, 987.77, 0, 0, 783.99, 0, 659.25, 0, 0, 739.99, 0, 0, 0, 0],
                    [783.99, 0, 0, 1046.50, 0, 0, 783.99, 0, 659.25, 0, 0, 587.33, 0, 0, 0, 0],
                    [587.33, 0, 0, 783.99, 0, 0, 587.33, 0, 493.88, 0, 0, 523.25, 0, 0, 0, 0],
                    [739.99, 0, 0, 880.00, 0, 0, 739.99, 0, 587.33, 0, 0, 659.25, 0, 0, 0, 0],
                    [659.25, 0, 0, 987.77, 0, 0, 783.99, 0, 659.25, 0, 0, 739.99, 0, 0, 0, 0],
                    [783.99, 0, 0, 1046.50, 0, 0, 783.99, 0, 659.25, 0, 0, 587.33, 0, 0, 0, 0],
                    [880.00, 0, 0, 1046.50, 0, 0, 1318.51, 0, 1046.50, 0, 0, 987.77, 0, 0, 0, 0],
                    [987.77, 0, 0, 1174.66, 0, 0, 1567.98, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    [1046.50, 0, 783.99, 0, 659.25, 0, 783.99, 0, 1046.50, 0, 1318.51, 0, 1567.98, 0, 0, 0],
                    [1174.66, 0, 880.00, 0, 739.99, 0, 880.00, 0, 1174.66, 0, 1479.98, 0, 1760.00, 0, 0, 0],
                    [1318.51, 0, 987.77, 0, 783.99, 0, 987.77, 0, 1318.51, 0, 1567.98, 0, 1975.53, 0, 0, 0],
                    [987.77, 0, 739.99, 0, 587.33, 0, 739.99, 0, 987.77, 0, 1174.66, 0, 1479.98, 0, 0, 0],
                    [1046.50, 0, 783.99, 0, 659.25, 0, 783.99, 0, 1046.50, 0, 1318.51, 0, 1567.98, 0, 0, 0],
                    [1174.66, 0, 880.00, 0, 739.99, 0, 880.00, 0, 1174.66, 0, 1479.98, 0, 1760.00, 0, 0, 0],
                    [1318.51, 1174.66, 1318.51, 1174.66, 1318.51, 1174.66, 1318.51, 1174.66, 1318.51, 1174.66, 1318.51, 1174.66, 1318.51, 1174.66, 1318.51, 1174.66],
                    [1975.53, 0, 0, 0, 0, 0, 0, 0, 164.81, 0, 0, 0, 0, 0, 0, 0]
                ];
                const note = melody[progBar][localStep];
                if (note > 0) {
                    if (this.musicIntensity > 0 || (this.musicIntensity === 0 && localStep % 4 === 0)) this.playAeroLead(note, time, this.musicIntensity);
                }
            }
        },

        aquatic: {
            getBPM(intensity) { return intensity === 0 ? 90 : (intensity === 1 ? 120 : 145); },
            playStep(step, time) {
                const bar = Math.floor(step / 16);
                const localStep = step % 16;
                const progBar = bar % 4;
                const padChords = [[174.61, 207.65, 261.63], [155.56, 196.00, 233.08], [138.59, 174.61, 207.65], [130.81, 164.81, 196.00]];
                const bassRoots = [87.31, 77.78, 69.30, 65.41];
                if (localStep === 0) this.playWaterPad(padChords[progBar], time, this.musicIntensity);
                if (this.musicIntensity > 0) {
                    if (localStep % 2 === 0) {
                        this.playHydroBass(bassRoots[progBar], time);
                        if (this.musicIntensity === 2 && localStep % 4 === 2) this.playHydroBass(bassRoots[progBar], time + 0.1);
                    }
                    if (localStep === 0 || localStep === 8 || (this.musicIntensity === 2 && localStep === 14)) this.playSubKick(time);
                    if (localStep === 4 || localStep === 12) this.playSplashSnare(time);
                    if (localStep % 2 !== 0) this.playBubbleHiHat(time);
                } else if (localStep === 0) this.playSubKick(time);
                const melody = [
                    [523.25, 0, 415.30, 0, 349.23, 0, 523.25, 0, 698.46, 0, 0, 0, 523.25, 0, 0, 0],
                    [466.16, 0, 392.00, 0, 311.13, 0, 466.16, 0, 622.25, 0, 0, 0, 466.16, 0, 0, 0],
                    [415.30, 0, 349.23, 0, 277.18, 0, 415.30, 0, 554.37, 0, 0, 0, 415.30, 0, 0, 0],
                    [392.00, 0, 329.63, 0, 261.63, 0, 392.00, 0, 523.25, 0, 392.00, 0, 329.63, 0, 261.63, 0]
                ];
                const note = melody[progBar][localStep];
                if (note > 0) this.playCrystalLead(note, time, this.musicIntensity);
                if (this.musicIntensity === 2 && localStep % 4 === 0) this.playBubbleArp(padChords[progBar], time);
            }
        },

        jungle: {
            getBPM(intensity) { return intensity === 0 ? 105 : (intensity === 1 ? 125 : 150); },
            playStep(step, time) {
                const bar = Math.floor(step / 16);
                const localStep = step % 16;
                const progBar = bar % 4;
                const roots = [65.41, 87.31, 73.42, 98.00];
                const padChords = [[130.81, 164.81, 196.00], [174.61, 220.00, 261.63], [146.83, 174.61, 220.00], [146.83, 196.00, 246.94]];
                if (localStep === 0) this.playBrightPad(padChords[progBar], time);
                if (this.musicIntensity > 0) {
                    if (localStep === 0 || localStep === 5 || localStep === 10 || localStep === 14) {
                        this.playSlapBass(roots[progBar], time);
                        if (localStep === 14) this.playSlapBass(roots[progBar] * 2, time, true);
                    }
                    if (localStep % 4 === 0) this.playBongo(time, false);
                    if (localStep === 2 || localStep === 7 || localStep === 13) this.playBongo(time, true);
                }
                if (this.musicIntensity === 2) {
                    if (localStep === 0 || localStep === 8 || localStep === 10) this.playRetroKick(time);
                    if (localStep === 4 || localStep === 12) this.playRetroSnare(time);
                    if (localStep % 2 === 0) this.playHiHat(time);
                }
                const melody = [
                    [261.63, 0, 329.63, 0, 392.00, 0, 523.25, 0, 392.00, 0, 329.63, 0, 392.00, 0, 0, 0],
                    [349.23, 0, 440.00, 0, 523.25, 0, 698.46, 0, 523.25, 0, 440.00, 0, 349.23, 0, 0, 0],
                    [293.66, 0, 349.23, 0, 440.00, 0, 587.33, 0, 440.00, 0, 349.23, 0, 293.66, 0, 0, 0],
                    [392.00, 0, 493.88, 0, 587.33, 0, 783.99, 0, 0, 0, 587.33, 0, 493.88, 0, 392.00, 0]
                ];
                const note = melody[progBar][localStep];
                if (note > 0) {
                    if (this.musicIntensity === 2) { this.playHeroLead_Jungle(note, time); this.playMarimba(note, time); }
                    else this.playMarimba(note, time);
                }
                if (this.musicIntensity > 0 && localStep % 2 !== 0 && localStep < 8 && note === 0) this.playMarimba(padChords[progBar][(localStep - 1) % 3] * 2, time);
            }
        },

        tragic: {
            getBPM(intensity) { return intensity === 0 ? 70 : (intensity === 1 ? 65 : 55); },
            playStep(step, time) {
                const bar = Math.floor(step / 16);
                const localStep = step % 16;
                const progBar = bar % 4;
                const padChords = [[110.00, 130.81, 164.81], [87.31, 130.81, 174.61], [73.42, 110.00, 146.83], [82.41, 123.47, 164.81]];
                if (localStep % 4 === 0) this.playRainAmbient(time);
                if (localStep === 0) this.playTragicPad(padChords[progBar], time, this.musicIntensity);
                if (this.musicIntensity > 0 && localStep === 0) this.playExhaustedDrone(padChords[progBar][0] / 2, time);
                const melody = [
                    [329.63, 0, 0, 0, 261.63, 0, 0, 0, 246.94, 0, 0, 0, 220.00, 0, 0, 0],
                    [261.63, 0, 0, 0, 220.00, 0, 0, 0, 196.00, 0, 0, 0, 174.61, 0, 0, 0],
                    [349.23, 0, 0, 0, 293.66, 0, 0, 0, 261.63, 0, 0, 0, 220.00, 0, 0, 0],
                    [329.63, 0, 0, 0, 415.30, 0, 0, 0, 392.00, 0, 0, 0, 349.23, 0, 0, 0]
                ];
                const note = melody[progBar][localStep];
                if (note > 0) this.playCryingOcarina(note, time);
                if (this.musicIntensity === 2 && localStep === 0 && (progBar === 0 || progBar === 2)) this.playFuneralBell(padChords[progBar][0], time);
                if (this.musicIntensity === 0 && (localStep === 2 || localStep === 7 || localStep === 13)) if (Math.random() > 0.4) this.playWindChime(time);
            }
        },

        void: {
            getBPM(intensity) { 
                if (intensity === 0) return 90;
                if (intensity === 1) return 125;
                return 155;
            },
            playStep(step, time) {
                const bar = Math.floor(step / 16); 
                const localStep = step % 16;
                const progBar = bar % 32; 
                
                const padChords = [
                    [220.00, 261.63, 329.63], [207.65, 261.63, 329.63], [196.00, 233.08, 293.66], [185.00, 220.00, 261.63],
                    [174.61, 220.00, 261.63], [164.81, 207.65, 246.94], [164.81, 207.65, 246.94], [164.81, 207.65, 246.94],
                    [220.00, 261.63, 329.63], [207.65, 261.63, 329.63], [196.00, 233.08, 293.66], [185.00, 220.00, 261.63],
                    [174.61, 220.00, 261.63], [164.81, 207.65, 246.94], [146.83, 174.61, 220.00], [164.81, 207.65, 246.94],
                    [220.00, 261.63, 329.63], [246.94, 293.66, 370.00], [261.63, 311.13, 392.00], [293.66, 349.23, 440.00],
                    [329.63, 392.00, 493.88], [349.23, 415.30, 523.25], [164.81, 207.65, 246.94], [164.81, 207.65, 246.94],
                    [220.00, 261.63, 329.63], [261.63, 311.13, 392.00], [329.63, 392.00, 493.88], [174.61, 220.00, 261.63],
                    [146.83, 174.61, 220.00], [174.61, 220.00, 261.63], [164.81, 207.65, 246.94], [164.81, 207.65, 246.94]
                ];
                
                const bassRoots = [
                    55.00, 51.91, 49.00, 46.25, 43.65, 41.20, 41.20, 41.20,
                    55.00, 51.91, 49.00, 46.25, 43.65, 41.20, 36.71, 41.20,
                    55.00, 61.74, 65.41, 73.42, 82.41, 87.31, 41.20, 41.20,
                    55.00, 65.41, 82.41, 43.65, 36.71, 43.65, 41.20, 41.20
                ];

                if (localStep === 0) this.playChronoPad(padChords[progBar], time, this.musicIntensity);
                
                if (this.musicIntensity > 0 && (progBar >= 16 || this.musicIntensity === 2)) {
                    if (localStep === 0 || localStep === 3 || localStep === 6 || localStep === 10) {
                        const arpNote = padChords[progBar][(localStep % 3)];
                        this.playFlamencoPluck(arpNote * 2, time);
                    }
                }

                if (this.musicIntensity < 2) {
                    if (localStep % 4 === 0) this.playClockTick(time, true);
                    if (localStep % 4 === 2) this.playClockTick(time, false);
                } else {
                    if (localStep % 2 === 0) this.playClockTick(time, true);
                }

                if (this.musicIntensity > 0) {
                    if (this.musicIntensity === 2 && progBar >= 16) {
                        if (localStep % 4 !== 3) this.playTechBass(bassRoots[progBar], time, true);
                    } else {
                        if (localStep === 0 || localStep === 3 || localStep === 8) {
                            if (progBar !== 31 || localStep < 8) this.playTechBass(bassRoots[progBar], time, false);
                        }
                    }

                    if (progBar === 31 && localStep >= 8) {
                        if (localStep % 2 === 0) this.playSNESSnare(time);
                    } else {
                        if (this.musicIntensity === 1) {
                            if (localStep === 0 || localStep === 3) this.playSNESKick(time);
                            if (localStep === 12) this.playVoidClap(time); 
                            if (localStep % 4 === 0) this.playTickHat(time);
                        } else {
                            if (localStep % 4 === 0 || localStep === 10) this.playSNESKick(time);
                            if (localStep === 4 || localStep === 12) this.playSNESSnare(time);
                            if (localStep === 4 || localStep === 12) this.playVoidClap(time); 
                            this.playTickHat(time); 
                        }
                    }
                } else {
                    if (localStep === 0 || localStep === 3) this.playSNESKick(time);
                }

                const melody = [
                    [880.00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 830.61, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 783.99, 0, 0, 0, 0, 0, 0, 0], [739.99, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [698.46, 0, 0, 0, 880.00, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [659.25, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 659.25, 698.46, 739.99, 783.99, 830.61, 880.00, 932.33, 987.77], [1046.50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [1318.51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 1244.51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 1174.66, 0, 0, 0, 0, 0, 0, 0], [1108.73, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [1046.50, 0, 0, 0, 1318.51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [987.77, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 1046.50, 0, 987.77, 0, 880.00, 0, 783.99, 0], [659.25, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [880.00, 0, 0, 0, 1046.50, 0, 987.77, 0, 880.00, 0, 0, 0, 1046.50, 0, 0, 0], [987.77, 0, 0, 0, 1174.66, 0, 1046.50, 0, 987.77, 0, 0, 0, 1174.66, 0, 0, 0], [1046.50, 0, 0, 0, 1318.51, 0, 1174.66, 0, 1046.50, 0, 0, 0, 1318.51, 0, 0, 0], [1174.66, 0, 0, 0, 1396.91, 0, 1318.51, 0, 1174.66, 0, 0, 0, 1396.91, 0, 0, 0], [1318.51, 0, 0, 0, 1567.98, 0, 1396.91, 0, 1318.51, 0, 0, 0, 1567.98, 0, 0, 0], [1396.91, 0, 0, 0, 1760.00, 0, 1567.98, 0, 1396.91, 0, 0, 0, 1760.00, 0, 0, 0], [1318.51, 0, 0, 0, 1244.51, 0, 0, 0, 1318.51, 0, 0, 0, 1661.22, 0, 0, 0], [1318.51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [1760.00, 0, 0, 0, 0, 0, 0, 0, 2093.00, 0, 0, 0, 0, 0, 0, 0], [1975.53, 0, 0, 0, 0, 0, 0, 0, 1567.98, 0, 0, 0, 0, 0, 0, 0], [1318.51, 0, 0, 0, 0, 0, 0, 0, 1760.00, 0, 0, 0, 0, 0, 0, 0], [1396.91, 0, 0, 0, 0, 0, 0, 0, 1046.50, 0, 0, 0, 0, 0, 0, 0], [1174.66, 0, 0, 0, 0, 0, 0, 0, 1396.91, 0, 0, 0, 0, 0, 0, 0], [880.00,  0, 0, 0, 0, 0, 0, 0, 1046.50, 0, 0, 0, 0, 0, 0, 0], [987.77, 1046.50, 987.77, 1046.50, 987.77, 1046.50, 987.77, 1046.50, 987.77, 1046.50, 987.77, 1046.50, 987.77, 1046.50, 987.77, 1046.50], [987.77, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                ];

                const note = melody[progBar][localStep];
                if (note > 0) {
                    if (this.musicIntensity > 0 || (this.musicIntensity === 0 && localStep === 0)) {
                        this.playDesertLead(note, time, this.musicIntensity);
                    }
                }
            }
        },

        epic: {
            getBPM(intensity) { return intensity === 0 ? 100 : (intensity === 1 ? 145 : 175); },
            playStep(step, time) {
                const bar = Math.floor(step / 16);
                const localStep = step % 16;
                const progBar = bar % 8;
                const padChords = [[220.00, 261.63, 329.63], [174.61, 220.00, 261.63], [146.83, 174.61, 220.00], [164.81, 207.65, 246.94], [220.00, 261.63, 329.63], [174.61, 220.00, 261.63], [146.83, 174.61, 220.00], [164.81, 207.65, 246.94]];
                const bassRoots = [55.00, 43.65, 73.42, 82.41, 55.00, 43.65, 73.42, 82.41];
                if (localStep === 0) this.playTriforcePad(padChords[progBar], time, this.musicIntensity);
                if (this.musicIntensity > 0) {
                    if (localStep % 4 !== 3) this.playBusterBass(bassRoots[progBar], time);
                    if (this.musicIntensity === 1) {
                        if (localStep === 0 || localStep === 8 || localStep === 10) this.playRetroKick_Epic(time);
                        if (localStep === 4 || localStep === 12) this.playRetroSnare_Epic(time);
                        if (localStep % 2 === 0) this.playTickHat(time);
                    } else {
                        if (localStep % 4 === 0 || localStep === 14) this.playRetroKick_Epic(time);
                        if (localStep === 4 || localStep === 12) this.playRetroSnare_Epic(time);
                        this.playTickHat(time);
                    }
                } else if (localStep === 0) this.playRetroKick_Epic(time);
                if (this.musicIntensity === 2) this.play8BitArp(padChords[progBar][localStep % 3] * 2, time);
                else if (this.musicIntensity === 1 && localStep >= 8) this.play8BitArp(padChords[progBar][localStep % 3] * 2, time);
                const melody = [
                    [880.00, 0, 0, 659.25, 0, 0, 523.25, 0, 880.00, 0, 0, 1046.50, 0, 987.77, 0, 0],
                    [698.46, 0, 0, 523.25, 0, 0, 349.23, 0, 698.46, 0, 0, 783.99, 0, 880.00, 0, 0],
                    [587.33, 0, 0, 698.46, 0, 0, 880.00, 0, 1174.66, 0, 0, 1046.50, 0, 880.00, 0, 0],
                    [659.25, 0, 830.61, 0, 987.77, 0, 1318.51, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    [880.00, 0, 0, 659.25, 0, 0, 523.25, 0, 880.00, 0, 0, 1046.50, 0, 987.77, 0, 0],
                    [698.46, 0, 0, 523.25, 0, 0, 349.23, 0, 698.46, 0, 0, 783.99, 0, 880.00, 0, 0],
                    [1174.66, 0, 0, 1046.50, 0, 0, 880.00, 0, 698.46, 0, 0, 587.33, 0, 698.46, 0, 0],
                    [830.61, 0, 0, 0, 987.77, 0, 0, 0, 1318.51, 0, 0, 0, 1661.22, 0, 0, 0]
                ];
                const note = melody[progBar][localStep];
                if (note > 0) if (this.musicIntensity > 0 || (this.musicIntensity === 0 && localStep % 4 === 0)) this.playMasterSwordLead(note, time, this.musicIntensity);
            }
        },

        // --- High Energy / Final Sector Themes ---
        climax: {
            getBPM(intensity) { return intensity === 0 ? 110 : (intensity === 1 ? 145 : 170); },
            playStep(step, time) {
                const bar = Math.floor(step / 16);
                const localStep = step % 16;
                const progBar = bar % 16;
                const padChords = [[146.83, 174.61, 220.00], [116.54, 146.83, 174.61], [174.61, 220.00, 261.63], [110.00, 138.59, 164.81], [146.83, 174.61, 220.00], [116.54, 146.83, 174.61], [98.00, 116.54, 146.83], [110.00, 138.59, 164.81], [146.83, 174.61, 220.00], [130.81, 164.81, 196.00], [116.54, 146.83, 174.61], [110.00, 138.59, 164.81], [174.61, 220.00, 261.63], [130.81, 164.81, 196.00], [98.00, 116.54, 146.83], [110.00, 138.59, 164.81]];
                const bassRoots = [73.42, 58.27, 87.31, 55.00, 73.42, 58.27, 49.00, 55.00, 73.42, 65.41, 58.27, 55.00, 87.31, 65.41, 49.00, 55.00];
                if (localStep === 0) this.playChoirPad(padChords[progBar], time, this.musicIntensity);
                if (this.musicIntensity > 0) {
                    if (localStep % 4 !== 3 && !(progBar === 15 && localStep > 8)) this.playXBass(bassRoots[progBar], time);
                    if (progBar === 15 && localStep > 8) { if (localStep % 2 === 0) this.playSNESSnare(time); }
                    else {
                        if (this.musicIntensity === 1) { if (localStep === 0 || localStep === 8 || localStep === 10) this.playSNESKick(time); if (localStep === 4 || localStep === 12) this.playSNESSnare(time); if (localStep % 2 === 0) this.playSNESHat(time); }
                        else { if (localStep % 4 === 0 || localStep === 14) this.playSNESKick(time); if (localStep === 4 || localStep === 12) this.playSNESSnare(time); this.playSNESHat(time); }
                    }
                } else if (localStep === 0) this.playSNESKick(time);
                if (this.musicIntensity === 2 || (this.musicIntensity === 1 && progBar >= 4)) if (progBar >= 8 || localStep % 2 === 0) { const arpNote = padChords[progBar][(localStep / 2) % 3] || padChords[progBar][0]; this.playHarpsichord(arpNote * 4, time); }
                const melody = [[587.33, 0, 0, 698.46, 0, 0, 880.00, 0, 587.33, 0, 0, 698.46, 0, 880.00, 0, 0], [932.33, 0, 0, 880.00, 0, 0, 698.46, 0, 932.33, 0, 0, 880.00, 0, 698.46, 0, 0], [1046.50, 0, 0, 880.00, 0, 0, 698.46, 0, 1046.50, 0, 0, 880.00, 0, 698.46, 0, 0], [1108.73, 0, 880.00, 0, 659.25, 0, 554.37, 0, 659.25, 0, 880.00, 0, 1108.73, 0, 0, 0], [1174.66, 0, 0, 1046.50, 0, 0, 880.00, 0, 1174.66, 0, 0, 1046.50, 0, 880.00, 0, 0], [1396.91, 0, 0, 1174.66, 0, 0, 932.33, 0, 1396.91, 0, 0, 1174.66, 0, 932.33, 0, 0], [1567.98, 0, 0, 1396.91, 0, 0, 1174.66, 0, 1567.98, 0, 0, 1396.91, 0, 1174.66, 0, 0], [1760.00, 1661.22, 1760.00, 1661.22, 1760.00, 1661.22, 1760.00, 1661.22, 1760.00, 0, 0, 0, 0, 0, 0, 0], [1174.66, 0, 1046.50, 0, 1174.66, 1396.91, 0, 0, 1174.66, 0, 1046.50, 0, 1174.66, 1567.98, 0, 0], [1046.50, 0, 932.33, 0, 1046.50, 1174.66, 0, 0, 1046.50, 0, 932.33, 0, 1046.50, 1396.91, 0, 0], [932.33, 0, 880.00, 0, 932.33, 1046.50, 0, 0, 932.33, 0, 880.00, 0, 932.33, 1174.66, 0, 0], [880.00, 932.33, 1046.50, 1108.73, 1174.66, 0, 0, 0, 1108.73, 0, 0, 0, 0, 0, 0, 0], [1396.91, 0, 1174.66, 0, 1046.50, 0, 1174.66, 0, 1396.91, 0, 1567.98, 0, 1760.00, 0, 0, 0], [1567.98, 0, 1396.91, 0, 1174.66, 0, 1046.50, 0, 932.33, 0, 880.00, 0, 698.46, 0, 0, 0], [1174.66, 0, 0, 0, 932.33, 0, 0, 0, 783.99, 0, 0, 0, 698.46, 0, 0, 0], [1108.73, 1174.66, 1108.73, 1174.66, 1108.73, 1174.66, 1108.73, 1174.66, 1108.73, 1174.66, 1108.73, 1174.66, 1108.73, 1174.66, 1108.73, 1174.66]];
                const note = melody[progBar][localStep];
                if (note > 0) if (this.musicIntensity > 0 || (this.musicIntensity === 0 && localStep === 0)) this.playOverdriveGuitar(note, time, this.musicIntensity);
            }
        },

        gothic: {
            getBPM(intensity) { return intensity === 0 ? 115 : (intensity === 1 ? 140 : 165); },
            playStep(step, time) {
                const bar = Math.floor(step / 16);
                const localStep = step % 16;
                const progBar = bar % 8;
                const padChords = [[146.83, 174.61, 220.00], [130.81, 164.81, 196.00], [116.54, 146.83, 174.61], [110.00, 138.59, 164.81], [146.83, 174.61, 220.00], [130.81, 164.81, 196.00], [164.81, 196.00, 246.94], [110.00, 138.59, 164.81]];
                const bassRoots = [73.42, 65.41, 58.27, 55.00, 73.42, 65.41, 82.41, 55.00];
                if (localStep === 0) this.playEkklesiastikoOrgano(padChords[progBar], time, this.musicIntensity);
                if (this.musicIntensity > 0) {
                    if (localStep % 2 === 0) this.playVampireBass(bassRoots[progBar], time, this.musicIntensity);
                    if (this.musicIntensity === 1) { if (localStep === 0 || localStep === 8 || localStep === 10) this.playSkoteinoKick(time); if (localStep === 4 || localStep === 12) this.playMastigio(time); }
                    else { if (localStep % 4 === 0 || localStep === 14) this.playSkoteinoKick(time); if (localStep === 4 || localStep === 12) this.playMastigio(time); if (localStep % 2 === 0) this.playSNESHat(time); }
                }
                if (this.musicIntensity === 2 || (this.musicIntensity === 1 && localStep % 4 === 0)) { const arpNote = padChords[progBar][localStep % 3] * 2; this.playTsempaloArp(arpNote, time); }
                const melody = [[587.33, 0, 659.25, 698.46, 0, 0, 880.00, 0, 783.99, 0, 698.46, 0, 659.25, 0, 0, 0], [523.25, 0, 587.33, 659.25, 0, 0, 783.99, 0, 698.46, 0, 659.25, 0, 523.25, 0, 0, 0], [466.16, 0, 523.25, 587.33, 0, 0, 698.46, 0, 659.25, 0, 587.33, 0, 466.16, 0, 0, 0], [440.00, 0, 0, 0, 554.37, 0, 0, 0, 659.25, 0, 0, 0, 880.00, 0, 0, 0], [1174.66, 0, 0, 0, 1046.50, 0, 0, 0, 880.00, 0, 0, 0, 698.46, 0, 0, 0], [1046.50, 0, 0, 0, 932.33, 0, 0, 0, 783.99, 0, 0, 0, 659.25, 0, 0, 0], [1318.51, 0, 0, 0, 1174.66, 0, 0, 0, 987.77, 0, 0, 0, 830.61, 0, 0, 0], [880.00, 830.61, 880.00, 932.33, 880.00, 987.77, 880.00, 1046.50, 880.00, 0, 0, 0, 0, 0, 0, 0]];
                const note = melody[progBar][localStep];
                if (note > 0) this.playGothikoLead(note, time, this.musicIntensity);
            }
        },

        singularity: {
            getBPM(intensity) { 
                if (intensity === 0) return 100;
                if (intensity === 1) return 140;
                return 165;
            },
            playStep(step, time) {
                const bar = Math.floor(step / 16); 
                const localStep = step % 16;
                const progBar = bar % 32; 
                
                const padChords = [
                    [130.81, 155.56, 196.00], [103.83, 130.81, 155.56], [155.56, 196.00, 233.08], [116.54, 146.83, 174.61],
                    [130.81, 155.56, 196.00], [103.83, 130.81, 155.56], [98.00, 123.47, 146.83], [98.00, 123.47, 146.83],
                    [103.83, 130.81, 155.56], [116.54, 146.83, 174.61], [130.81, 155.56, 196.00], [155.56, 196.00, 233.08],
                    [103.83, 130.81, 155.56], [87.31, 103.83, 130.81], [98.00, 123.47, 146.83], [98.00, 123.47, 146.83],
                    [87.31, 103.83, 130.81], [130.81, 155.56, 196.00], [98.00, 123.47, 146.83], [130.81, 155.56, 196.00],
                    [87.31, 103.83, 130.81], [130.81, 155.56, 196.00], [103.83, 130.81, 155.56], [116.54, 146.83, 174.61],
                    [261.63, 311.13, 392.00], [233.08, 277.18, 349.23], [207.65, 261.63, 311.13], [196.00, 233.08, 293.66],
                    [174.61, 207.65, 261.63], [155.56, 196.00, 233.08], [196.00, 246.94, 293.66], [196.00, 246.94, 293.66]
                ];
                
                const bassRoots = [
                    65.41, 51.91, 77.78, 58.27, 65.41, 51.91, 49.00, 49.00,
                    51.91, 58.27, 65.41, 77.78, 51.91, 43.65, 49.00, 49.00,
                    43.65, 65.41, 49.00, 65.41, 43.65, 65.41, 51.91, 58.27,
                    65.41, 58.27, 51.91, 49.00, 43.65, 77.78, 49.00, 49.00
                ];

                if (localStep === 0) this.playTimePad(padChords[progBar], time, this.musicIntensity);
                if (this.musicIntensity === 0) {
                    if (localStep % 8 === 0) this.playClockTick(time, true);
                    if (localStep % 8 === 4) this.playClockTick(time, false);
                } else {
                    if (localStep % 4 === 0) this.playClockTick(time, true);
                }

                if (localStep === 0 && (progBar === 0 || progBar === 8 || progBar === 16 || progBar === 24)) {
                    if (this.musicIntensity > 0) this.playTimeWarp(time);
                }

                if (this.musicIntensity > 0) {
                    if ((progBar !== 15 && progBar !== 31) || localStep < 10) {
                        if (localStep % 4 !== 3) this.playTechBass(bassRoots[progBar], time, this.musicIntensity);
                    }
                    if ((progBar === 15 || progBar === 31) && localStep >= 8) {
                        if (localStep % 2 === 0) this.playSNESSnare(time);
                    } else {
                        if (this.musicIntensity === 1) {
                            if (localStep === 0 || localStep === 8 || localStep === 11) this.playSNESKick(time);
                            if (localStep === 4 || localStep === 12) this.playSNESSnare(time);
                            if (localStep % 2 === 0) this.playTickHat(time);
                        } else {
                            if (localStep % 4 === 0 || localStep === 14) this.playSNESKick(time);
                            if (localStep === 4 || localStep === 12) this.playSNESSnare(time);
                            this.playTickHat(time); 
                        }
                    }
                }

                const melody = [
                    [523.25, 0, 0, 622.25, 0, 0, 783.99, 0, 523.25, 0, 0, 622.25, 0, 783.99, 0, 0], [830.61, 0, 0, 783.99, 0, 0, 622.25, 0, 830.61, 0, 0, 783.99, 0, 622.25, 0, 0], [932.33, 0, 0, 783.99, 0, 0, 622.25, 0, 932.33, 0, 0, 783.99, 0, 622.25, 0, 0], [932.33, 0, 1046.50,0, 1174.66,0, 932.33, 0, 783.99, 0, 0, 0, 0, 0, 0, 0], [1046.50,0, 0, 1244.51,0, 0, 1567.98,0, 1046.50,0, 0, 1244.51,0, 1567.98,0, 0], [1661.22,0, 0, 1567.98,0, 0, 1244.51,0, 1661.22,0, 0, 1567.98,0, 1244.51,0, 0], [1567.98,0, 0, 1174.66,0, 0, 783.99, 0, 1567.98,0, 0, 1174.66,0, 783.99, 0, 0], [1567.98,1479.98,1567.98,1479.98,1567.98,1479.98,1567.98,1479.98,1567.98,0, 0, 0, 0, 0, 0, 0], [1046.50,0, 0, 0, 1244.51,0, 0, 0, 1567.98,0, 0, 0, 1661.22,0, 0, 0], [1864.66,0, 0, 0, 1567.98,0, 0, 0, 1174.66,0, 0, 0, 932.33, 0, 0, 0], [1046.50,0, 0, 0, 1244.51,0, 0, 0, 1567.98,0, 0, 0, 1864.66,0, 0, 0], [1567.98,0, 0, 0, 1864.66,0, 0, 0, 2349.32,0, 0, 0, 1864.66,0, 0, 0], [1661.22,0, 1567.98,0, 1244.51,0, 1046.50,0, 1661.22,0, 1567.98,0, 1244.51,0, 1046.50,0], [1396.91,0, 1046.50,0, 698.46, 0, 1396.91,0, 1046.50,0, 698.46, 0, 1046.50,0, 1396.91,0], [1567.98,1479.98,1567.98,1479.98,1567.98,1479.98,1567.98,1479.98,1567.98,1479.98,1567.98,1479.98,1567.98,1479.98,1567.98,1479.98], [1567.98,0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [698.46, 830.61, 1046.50, 1396.91, 1046.50, 830.61, 698.46, 830.61, 1046.50, 1396.91, 1046.50, 830.61, 698.46, 830.61, 1046.50, 1396.91], [523.25, 622.25, 783.99, 1046.50, 783.99, 622.25, 523.25, 622.25, 783.99, 1046.50, 783.99, 622.25, 523.25, 622.25, 783.99, 1046.50], [783.99, 987.77, 1174.66, 1567.98, 1174.66, 987.77, 783.99, 987.77, 1174.66, 1567.98, 1174.66, 987.77, 783.99, 987.77, 1174.66, 1567.98], [523.25, 622.25, 783.99, 1046.50, 1244.51, 1567.98, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [698.46, 830.61, 1046.50, 1396.91, 1046.50, 830.61, 698.46, 830.61, 1046.50, 1396.91, 1046.50, 830.61, 698.46, 830.61, 1046.50, 1396.91], [523.25, 622.25, 783.99, 1046.50, 783.99, 622.25, 523.25, 622.25, 783.99, 1046.50, 783.99, 622.25, 523.25, 622.25, 783.99, 1046.50], [830.61, 1046.50, 1244.51, 1661.22, 1244.51, 1046.50, 830.61, 1046.50, 1244.51, 1661.22, 1244.51, 1046.50, 830.61, 1046.50, 1244.51, 1661.22], [932.33, 1174.66, 1396.91, 1864.66, 1396.91, 1174.66, 932.33, 1174.66, 1396.91, 1864.66, 1396.91, 1174.66, 932.33, 1174.66, 1396.91, 1864.66], [2093.00,0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [1864.66,0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [1661.22,0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [1567.98,0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [1396.91,0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [1244.51,0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [1567.98,1479.98,1567.98,1479.98,1567.98,1479.98,1567.98,1479.98,1567.98,1479.98,1567.98,1479.98,1567.98,1479.98,1567.98,1479.98], [1567.98,0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                ];

                const note = melody[progBar][localStep];
                if (note > 0) {
                    if (this.musicIntensity > 0 || (this.musicIntensity === 0 && localStep === 0)) {
                        this.playEpochLead(note, time, this.musicIntensity);
                    }
                }
            }
        }
    }
});
