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
    lastX: 0,
    lastY: 0,
    
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
        const instances = tippy(document.body, {
            getReferenceClientRect: () => tippyTarget.getBoundingClientRect(),
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

        this.activeTippy = Array.isArray(instances) ? instances[0] : instances;
        this.activeTippy.show();
        this.tippyTarget = tippyTarget; // Store for update loop

        // Register global input listener
        document.addEventListener('keydown', this.handleInput);
    },

    update() {
        if (this.activeTippy && this.currentConfig && this.currentConfig.position === 'follow') {
            const instance = this.activeTippy;
            if (!instance.popperInstance) return;

            // PERFORMANCE OPTIMIZATION: Dirty Checking
            // We only force an update if the target's position has actually changed in screen space
            const rect = this.tippyTarget.getBoundingClientRect();
            
            if (Math.abs(rect.x - this.lastX) > 0.1 || Math.abs(rect.y - this.lastY) > 0.1) {
                this.lastX = rect.x;
                this.lastY = rect.y;
                instance.popperInstance.forceUpdate();
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

        let activeEffects = new Map(); // name -> intensity
        let currentSize = '18px';
        let currentColor = '';
        
        const randomChar = () => {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*()";
            return chars[Math.floor(Math.random() * chars.length)];
        };

        while (i < fullText.length) {
            // "Turbo Mode" - if skip is requested, speed up significantly instead of instant jump
            let effectiveSpeed = this.skipRequested ? Math.min(speed, 5) : speed;
            let char = fullText[i];
            
            // Tag Handling
            if (char === '[') {
                const endTag = fullText.indexOf(']', i);
                if (endTag !== -1) {
                    const content = fullText.substring(i + 1, endTag);
                    
                    // Support for closing tags like [/arcane]
                    if (content.startsWith('/')) {
                        const tagToClose = content.substring(1);
                        if (tagToClose === 'arcane') {
                            activeEffects.delete('arcane');
                            activeEffects.delete('arcane-color-1');
                            activeEffects.delete('arcane-color-2');
                        } else if (tagToClose === 'crypt') {
                            activeEffects.delete('crypt-mode');
                        } else if (tagToClose === 'highlight') {
                            activeEffects.delete('highlight');
                            activeEffects.delete('highlight-color');
                        } else if (tagToClose === 'sfx') {
                            config.voice = 'ia';
                            isAI = true;
                        } else {
                            activeEffects.delete(tagToClose);
                        }
                        i = endTag + 1;
                        continue;
                    }

                    const firstColon = content.indexOf(':');
                    if (firstColon === -1) { i = endTag + 1; continue; }
                    
                    const tag = content.substring(0, firstColon);
                    const val = content.substring(firstColon + 1);
                    const intensity = parseFloat(val) || 1;
                    
                    if (tag === 'pause') {
                        if (!this.skipRequested) {
                            await new Promise(r => setTimeout(r, parseInt(val)));
                        }
                    } else if (tag === 'speed') {
                        speed = parseInt(val);
                    } else if (tag === 'color') {
                        currentColor = val;
                    } else if (tag === 'size') {
                        currentSize = val.includes('px') ? val : val + 'px';
                    } else if (tag === 'arcane') {
                        if (val === 'off' || val === '/') {
                            activeEffects.delete('arcane');
                            activeEffects.delete('arcane-color-1');
                            activeEffects.delete('arcane-color-2');
                        } else {
                            const parts = val.split(':');
                            if (parts.length === 3) {
                                activeEffects.set('arcane', parseFloat(parts[0]) || 1);
                                activeEffects.set('arcane-color-1', parts[1]);
                                activeEffects.set('arcane-color-2', parts[2]);
                            } else if (parts.length === 2) {
                                if (parts[0].startsWith('#')) {
                                    activeEffects.set('arcane', 1);
                                    activeEffects.set('arcane-color-1', parts[0]);
                                    activeEffects.set('arcane-color-2', parts[1]);
                                } else {
                                    activeEffects.set('arcane', parseFloat(parts[0]) || 1);
                                    activeEffects.set('arcane-color-1', parts[1]);
                                    activeEffects.set('arcane-color-2', parts[1]);
                                }
                            } else if (val.startsWith('#')) {
                                activeEffects.set('arcane', 1);
                                activeEffects.set('arcane-color-1', val);
                                activeEffects.set('arcane-color-2', val);
                            } else {
                                activeEffects.set('arcane', intensity);
                                activeEffects.delete('arcane-color-1');
                                activeEffects.delete('arcane-color-2');
                            }
                        }
                    } else if (tag === 'highlight') {
                        if (val === 'off' || val === '/') {
                            activeEffects.delete('highlight');
                            activeEffects.delete('highlight-color');
                        } else {
                            activeEffects.set('highlight', 1);
                            if (val) activeEffects.set('highlight-color', val);
                        }
                    } else if (['shake', 'wave', 'pulse', 'melt', 'pixel', 'sketch', 'reboot'].includes(tag)) {
                        if (val === 'off' || val === '/') activeEffects.delete(tag);
                        else activeEffects.set(tag, intensity);
                    } else if (tag === 'glitch') {
                        if (val === 'off' || val === '/') activeEffects.delete('glitch');
                        else {
                            activeEffects.set('glitch', intensity);
                            setTimeout(() => activeEffects.delete('glitch'), 500);
                        }
                    } else if (tag === 'crypt') {
                        if (val === 'off' || val === '/') activeEffects.delete('crypt-mode');
                        else activeEffects.set('crypt-mode', intensity);
                    } else if (tag === 'sfx') {
                        if (val === 'off' || val === '/') config.voice = 'ia';
                        else config.voice = val;
                        isAI = (config.voice === 'ia' || config.voice === 'ai');
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

            // Newline Handling
            if (char === '\n' || (char === '\\' && fullText[i+1] === 'n')) {
                const cursor = element.querySelector('.hud-typewriter-cursor');
                if (cursor) cursor.remove();
                element.insertAdjacentHTML('beforeend', '<br><span class="hud-typewriter-cursor"></span>');
                i += (char === '\\' ? 2 : 1);
                continue;
            }

            // Prepare CSS variables for effects
            let vars = Array.from(activeEffects.entries())
                .map(([name, val]) => {
                    if (name.includes('color')) return `--${name}: ${val}`;
                    return `--${name}-intensity: ${val}`;
                })
                .join('; ');

            // [crypt] Effect Handling - Persistent encrypted look
            if (activeEffects.has('crypt-mode') && char !== " " && char !== "\n") {
                const cryptInt = activeEffects.get('crypt-mode') || 1;
                const delay = (element.querySelectorAll('span').length) * -0.1;
                const charSpan = `<span data-char="${char}" data-intensity="${cryptInt}" style="font-size: ${currentSize}; ${currentColor ? 'color:' + currentColor : ''}; ${vars}; animation-delay: ${delay}s" class="crypt-span"></span>`;
                
                const cursor = element.querySelector('.hud-typewriter-cursor');
                if (cursor) cursor.remove();
                element.insertAdjacentHTML('beforeend', charSpan + '<span class="hud-typewriter-cursor"></span>');
                
                i++;
                if (effectiveSpeed > 0) await new Promise(r => setTimeout(r, effectiveSpeed));
                continue;
            }

            // Character Construction with Effects
            const charToRender = char; // \n handled above
            const finalDelay = (element.querySelectorAll('span').length) * -0.1;
            const delayStyle = activeEffects.has('melt') 
                ? `animation-delay: ${0.1 + Math.random() * 0.3}s;` 
                : `animation-delay: ${finalDelay}s;`;
            
            // Priority: Effects that manage color (arcane, highlight) override the static [color] tag
            const colorIsManaged = activeEffects.has('arcane') || activeEffects.has('highlight');
            const inlineColor = (!colorIsManaged && currentColor) ? `color: ${currentColor};` : '';
            
            let charSpan = `<span style="font-size: ${currentSize}; ${inlineColor} ${vars}; ${delayStyle}" class="${Array.from(activeEffects.keys()).map(k => k === 'crypt-mode' ? 'crypt-span' : k).filter(k => !k.includes('color')).join(' ')}">${charToRender === ' ' ? '&nbsp;' : charToRender}</span>`;
            
            // Remove cursor temporary if it exists to append correctly
            const cursor = element.querySelector('.hud-typewriter-cursor');
            if (cursor) cursor.remove();
            
            element.insertAdjacentHTML('beforeend', charSpan + '<span class="hud-typewriter-cursor"></span>');
            
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
        const finalCursor = element.querySelector('.hud-typewriter-cursor');
        if (finalCursor) finalCursor.remove();

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

// --- Persistent Effects Loop ---
setInterval(() => {
    const cryptElements = document.querySelectorAll('.crypt-span');
    const symbols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*()";
    cryptElements.forEach(el => {
        const intensity = parseFloat(el.getAttribute('data-intensity')) || 1;
        const targetChar = el.getAttribute('data-char');
        
        // Probability of scrambling: higher intensity = more scrambling
        // Example: if intensity is 1, 70% chance of random symbol
        if (Math.random() < (0.3 * intensity)) {
            el.innerText = symbols[Math.floor(Math.random() * symbols.length)];
        } else {
            el.innerText = targetChar;
        }
    });
}, 100);
