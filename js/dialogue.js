/**
 * CIRCUIT BREAKER - Dialogue System
 * Handles typewriter effects, rich text, and industrial HUD aesthetics.
 */
const Dialogue = {
    activeTippy: null,
    isTyping: false,
    queue: [],
    
    // Default typing speed (ms per char)
    defaultSpeed: 30, 
    
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

        const { 
            text, 
            icon = 'central', 
            isAI = true, 
            onComplete = null,
            arrow = true,
            theme = 'industrial-hud',
            autoDismiss = true,
            lockPlayer = true,
            dismissDelay = 1500
        } = config;

        let voiceTheme = isAI ? 'ai-voice-box' : 'human-voice-box';
        if (icon === 'alert') voiceTheme = 'alert-voice-box';
        const fullTheme = `${theme} ${voiceTheme}`;

        this.isTyping = true;
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
        
        let titleText = 'CENTRAL_COMMAND';
        if (isAI) titleText = 'SYSTEM_AI_V7';
        if (icon === 'alert') titleText = 'SYSTEM_ALERT';

        content.className = `dialogue-container ${voiceClass}`;
        content.innerHTML = `
            <div class="hud-header">
                <div class="hud-icon ${icon}"></div>
                <div class="hud-title">${titleText}</div>
                <div class="hud-decor"></div>
            </div>
            <div class="hud-body"></div>
            <div class="hud-footer">
                <span class="hud-status">SYNC_ACTIVE</span>
                <div class="hud-indicator"></div>
                <div class="hud-blink-cursor"></div>
            </div>
        `;

        const body = content.querySelector('.hud-body');
        const indicator = content.querySelector('.hud-indicator');
        
        // Initialize Tippy
        this.activeTippy = tippy(document.body, {
            getReferenceClientRect: target.getBoundingClientRect,
            content: content,
            allowHTML: true,
            arrow: arrow,
            theme: fullTheme,
            interactive: true,
            trigger: 'manual',
            hideOnClick: false,
            maxWidth: 350,
            onShown: (instance) => {
                if (window.AudioSys && window.audioCtx && audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }
                this.startTypewriter(body, indicator, text, config, onComplete);
            }
        });

        this.activeTippy.show();
    },

    /**
     * Closes the current dialogue and handles queue
     */
    hide() {
        if (this.activeTippy) {
            this.activeTippy.hide();
            this.isTyping = false;
            
            // Release player
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

    async startTypewriter(element, indicator, fullText, config, onComplete) {
        // 1. Pre-calculate width to avoid horizontal jump
        const cleanText = fullText.replace(/\[.*?\]/g, '');
        element.style.width = 'auto';
        element.innerHTML = cleanText;
        
        // Measure only width (vertical remains flexible as requested)
        const targetWidth = element.scrollWidth;
        
        // Lock width dimension
        element.style.width = targetWidth + 'px';
        element.innerHTML = ""; // Reset for actual typewriter

        let currentText = "";
        let i = 0;
        let speed = config.speed || this.defaultSpeed;
        let isAI = config.isAI;
        this.onCompleteCallback = onComplete;
        
        while (i < fullText.length) {
            let char = fullText[i];
            
            // Tag Handling
            if (char === '[') {
                const endTag = fullText.indexOf(']', i);
                if (endTag !== -1) {
                    const tagContent = fullText.substring(i + 1, endTag);
                    const [tag, val] = tagContent.split(':');
                    
                    if (tag === 'pause') {
                        await new Promise(r => setTimeout(r, parseInt(val)));
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
            await new Promise(r => setTimeout(r, speed));
        }

        element.innerHTML = currentText; // Remove cursor when done

        // Finish
        if (config.autoDismiss) {
            setTimeout(() => this.hide(), config.dismissDelay || 1500);
        } else {
            // Wait for manual input
            indicator.innerHTML = "[PRESS ENTER]";
            indicator.classList.add('visible');
            
            const waitInput = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    document.removeEventListener('keydown', waitInput);
                    this.hide();
                }
            };
            document.addEventListener('keydown', waitInput);
        }
    }
};

window.Dialogue = Dialogue;
