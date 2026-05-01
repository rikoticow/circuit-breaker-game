/**
 * CIRCUIT BREAKER - Dialogue System
 * Handles typewriter effects, rich text, and industrial HUD aesthetics.
 */
const Dialogue = {
    activeTippy: null,
    isTyping: false,
    isDone: false,
    skipRequested: false,
    queue: [],
    
    // Default typing speed (ms per char)
    defaultSpeed: 30, 
    
    handleInput(e) {
        if (!Dialogue.activeTippy) return;
        
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            
            // If still typing (not done), trigger Turbo Mode
            if (!Dialogue.isDone) {
                Dialogue.skipRequested = true;
            } 
            // If text is fully written, proceed to hide/next
            else {
                Dialogue.hide();
            }
        }
    },
    
    /**
     * Show a dialogue box
     * @param {Element|Object} target - DOM element or Virtual Element {getBoundingClientRect: () => ...}
     * @param {Object} config - { text, icon, isAI, speed, onComplete, arrow, theme, autoDismiss, lockPlayer, dismissDelay }
     */
    show(target, config) {
        if (this.isTyping) {
            this.queue.push({ target, config });
            return;
        }

        let { 
            text, 
            icon = 'central', 
            isAI = true, 
            onComplete = null,
            arrow = true,
            theme = 'industrial-hud',
            autoDismiss = true,
            lockPlayer = true,
            dismissDelay = 1500,
            position = 'center'
        } = config;

        let voiceTheme = isAI ? 'ai-voice-box' : 'human-voice-box';
        if (icon === 'alert') voiceTheme = 'alert-voice-box';
        if (icon === 'critical') voiceTheme = 'critical-voice-box';
        const fullTheme = `${theme} ${voiceTheme}`;

        this.isTyping = true;
        this.isDone = false;
        this.skipRequested = false;
        this.currentConfig = config;
        
        // Block player if needed
        if (lockPlayer && window.game) {
            window.game.inputLocked = true;
        }

        // Clean previous tippy if any
        if (this.activeTippy) {
            this.activeTippy.destroy();
        }

        // HUD Template
        const content = document.createElement('div');
        let voiceClass = isAI ? 'ai-voice' : 'human-voice';
        if (icon === 'alert') voiceClass = 'alert-voice';
        if (icon === 'critical') voiceClass = 'critical-voice';

        content.className = `dialogue-container ${voiceClass}`;
        content.innerHTML = `
            <div class="hud-minimal-frame">
                <div class="hud-body"></div>
                <div class="hud-indicator"></div>
            </div>
        `;

        const body = content.querySelector('.hud-body');
        const indicator = content.querySelector('.hud-indicator');
        
        // Screen Positioning Logic
        let tippyTarget = target;
        let placement = 'top';

        if (position && position !== 'follow') {
            tippyTarget = {
                getBoundingClientRect: () => {
                    const vw = window.innerWidth;
                    const vh = window.innerHeight;
                    const w = 300, h = 20;
                    let x = (vw - w) / 2;
                    let y = (vh - h) / 2;

                    if (position === 'top') {
                        y = 40; 
                        placement = 'bottom';
                    } else if (position === 'bottom') {
                        y = vh - 40; 
                        placement = 'top';
                    } else if (position === 'left') {
                        x = 40;
                        placement = 'right';
                    } else if (position === 'right') {
                        x = vw - 40;
                        placement = 'left';
                    } else if (position === 'center') {
                        placement = 'top'; // Center of the virtual rect
                    }

                    return {
                        width: w, height: h,
                        top: y, left: x,
                        bottom: y + h, right: x + w,
                        x: x, y: y
                    };
                }
            };
            arrow = false;
        }

        // Initialize Tippy
        this.activeTippy = tippy(document.body, {
            getReferenceClientRect: tippyTarget.getBoundingClientRect,
            content: content,
            allowHTML: true,
            arrow: arrow,
            theme: fullTheme,
            placement: placement,
            interactive: true,
            trigger: 'manual',
            hideOnClick: false,
            maxWidth: 450,
            onMount: (instance) => {
                if (window.AudioSys && window.audioCtx && audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }
                this.startTypewriter(body, indicator, text, config, onComplete);
            }
        });

        this.activeTippy.show();
        this.tippyTarget = tippyTarget; // Store for update loop

        // Register global input listener
        document.addEventListener('keydown', this.handleInput);
    },

    update() {
        if (this.activeTippy && this.currentConfig && this.currentConfig.position === 'follow') {
            // Tippy uses the getBoundingClientRect of the target, 
            // but we need to tell popper to recalculate
            if (this.activeTippy.popperInstance) {
                this.activeTippy.popperInstance.update();
            }
        }
    },

    /**
     * Closes the current dialogue and handles queue
     */
    hide() {
        if (this.activeTippy) {
            this.activeTippy.hide();
            this.isTyping = false;
            this.isDone = false;
            this.skipRequested = false;
            
            // Remove listener
            document.removeEventListener('keydown', this.handleInput);
            if (window.game && this.currentConfig && this.currentConfig.lockPlayer) {
                window.game.inputLocked = false;
            }

            if (this.onCompleteCallback) {
                this.onCompleteCallback();
                this.onCompleteCallback = null;
            }

            // Check for queue
            if (this.queue.length > 0) {
                const next = this.queue.shift();
                this.show(next.target, next.config);
            }
        }
    },

    async startTypewriter(element, indicator, fullText = "", config, onComplete) {
        if (!fullText) {
            this.isDone = true;
            this.isTyping = false;
            if (onComplete) onComplete();
            this.hide();
            return;
        }

        const cleanText = fullText.replace(/\[.*?\]/g, '');
        element.innerHTML = ""; 

        let currentText = "";
        let i = 0;
        let speed = config.speed || this.defaultSpeed;
        let isAI = config.isAI;
        this.onCompleteCallback = onComplete;
        this.isDone = false;
        this.skipRequested = false;
        
        while (i < fullText.length) {
            // "Turbo Mode" - if skip is requested, speed up significantly instead of instant jump
            let effectiveSpeed = this.skipRequested ? Math.min(speed, 5) : speed;
            let char = fullText[i];
            
            // Tag Handling
            if (char === '[') {
                const endTag = fullText.indexOf(']', i);
                if (endTag !== -1) {
                    const tagContent = fullText.substring(i + 1, endTag);
                    const [tag, val] = tagContent.split(':');
                    
                    if (tag === 'pause') {
                        if (!this.skipRequested) {
                            await new Promise(r => setTimeout(r, parseInt(val)));
                        }
                    } else if (tag === 'speed') {
                        speed = parseInt(val);
                    } else if (tag === 'color') {
                        currentText += `<span style="color:${val}">`;
                    } else if (tag === 'sfx') {
                        isAI = (val === 'ia' || val === 'ai');
                    }
                    
                    i = endTag + 1;
                    continue;
                }
            }

            // Native HTML (Rich Text)
            if (char === '<') {
                const endTag = fullText.indexOf('>', i);
                if (endTag !== -1) {
                    currentText += fullText.substring(i, endTag + 1);
                    i = endTag + 1;
                    element.innerHTML = currentText;
                    continue;
                }
            }

            currentText += char;
            element.innerHTML = currentText + '<span class="hud-typewriter-cursor"></span>';
            
            if (char !== " " && char !== "\n") {
                const pitch = 0.8 + (Math.random() * 0.4);
                if (window.AudioSys && AudioSys.playVoiceBlip) {
                    AudioSys.playVoiceBlip(char, pitch, isAI);
                }
            }

            i++;
            if (effectiveSpeed > 0) {
                await new Promise(r => setTimeout(r, effectiveSpeed));
            }
        }

        this.isDone = true;
        this.isTyping = true; // Still "active" but done typing
        element.innerHTML = currentText; // Remove cursor when done

        // Update indicator
        if (!config.autoDismiss) {
            indicator.innerHTML = "[SPACE TO CONTINUE]";
            indicator.classList.add('visible');
        } else {
            // Even if autoDismiss is on, we allow manual skip
            indicator.innerHTML = "[SPACE TO SKIP]";
            indicator.classList.add('visible');
            indicator.style.opacity = "0.5";
            
            setTimeout(() => {
                if (this.isDone && this.activeTippy && config.autoDismiss) {
                    this.hide();
                }
            }, config.dismissDelay || 1500);
        }
    }
};

window.Dialogue = Dialogue;
