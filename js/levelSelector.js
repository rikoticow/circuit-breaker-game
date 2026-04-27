// Circuit Board Level Selector - Circuit Breaker
// RETRO INDUSTRIAL UI ENGINE

const LevelSelector = {
    active: false,
    animFrame: 0,
    selectedLevel: 0,
    camera: { x: 0, y: 0 },
    
    // Stats & Progress
    stars: [], // Array of star counts per level
    unlockedLevels: 1,
    currentChapter: 0,
    
    // Visual Settings
    gridSize: 80, // Size of nodes in the circuit
    nodes: [],
    connections: [],
    
    // Animation
    nodeScales: [],
    pathProgress: 0,
    cursorPulse: 0,
    pendingChapterUnlock: false,

    init() {
        this.loadProgress();
        this._buildCircuit();
        this.selectedLevel = this._findLastUnlocked();
    },

    loadProgress() {
        const saved = localStorage.getItem('circuit_breaker_progress');
        if (saved) {
            const data = JSON.parse(saved);
            this.stars = data.stars || [];
            this.unlockedLevels = data.unlocked || 1;
        } else {
            this.stars = Array(LEVELS.length).fill(0);
            this.unlockedLevels = 1;
        }
    },

    saveProgress() {
        const data = {
            stars: this.stars,
            unlocked: this.unlockedLevels
        };
        localStorage.setItem('circuit_breaker_progress', JSON.stringify(data));
    },

    completeLevel(idx, stars, moves) {
        // Record stars
        if (stars > (this.stars[idx] || 0)) {
            this.stars[idx] = stars;
        }

        // Check chapter unlock (70% stars required in current chapter)
        this.pendingChapterUnlock = false;
        const currentChap = CHAPTERS.find(c => c.levels.includes(idx));
        if (currentChap) {
            const chapIdx = CHAPTERS.indexOf(currentChap);
            const nextChap = CHAPTERS[chapIdx + 1];
            if (nextChap) {
                // If the next level belongs to next chapter and we just completed the last level of current chapter
                const lastLvlOfChap = currentChap.levels[currentChap.levels.length - 1];
                if (idx === lastLvlOfChap) {
                    const starsInChap = currentChap.levels.reduce((sum, lIdx) => sum + (this.stars[lIdx] || 0), 0);
                    const maxPossible = currentChap.levels.length * 3;
                    if (starsInChap >= maxPossible * 0.7) {
                        this.pendingChapterUnlock = true;
                    }
                }
            }
        }

        // Unlock next
        if (idx + 1 < LEVELS.length && idx + 1 === this.unlockedLevels) {
            this.unlockedLevels++;
        }
        this.saveProgress();

        // Calculate economy bonus (Moves left)
        const lvl = LEVELS[idx];
        const movesLeft = lvl.time - moves;
        return Math.max(0, movesLeft * 50);
    },

    _findLastUnlocked() {
        return Math.max(0, this.unlockedLevels - 1);
    },

    _buildCircuit() {
        this.nodes = [];
        this.connections = [];
        this.nodeScales = [];

        // Simple serpentine path for the circuit board
        const cols = 5;
        LEVELS.forEach((lvl, i) => {
            const row = Math.floor(i / cols);
            const col = (row % 2 === 0) ? (i % cols) : (cols - 1 - (i % cols));
            
            this.nodes.push({
                x: 100 + col * 120,
                y: 100 + row * 100,
                levelIndex: i,
                name: lvl.name
            });
            this.nodeScales.push(1.0);

            if (i > 0) {
                this.connections.push({
                    from: i - 1,
                    to: i,
                    type: (row === Math.floor((i-1)/cols)) ? 'H' : 'V'
                });
            }
        });
    },

    open(currentLvl = 0) {
        this.active = true;
        this.selectedLevel = currentLvl;
        this.animFrame = 0;
        this.pendingChapterUnlock = false;
        
        // Ensure UI bars are hidden
        document.getElementById('ui-top')?.classList.add('covered');
        document.getElementById('ui-bottom')?.classList.add('covered');

        // Switch to menu music intensity
        if (window.AudioSys) {
            AudioSys.setMusicIntensity(0);
            AudioSys.playGameMusic();
        }
    },

    close() {
        this.active = false;
        document.getElementById('ui-top')?.classList.remove('covered');
        document.getElementById('ui-bottom')?.classList.remove('covered');
    },

    handleInput(key) {
        if (!this.active) return null;

        if (key === 'ArrowRight' || key === 'd') {
            if (this.selectedLevel < this.unlockedLevels - 1) {
                this.selectedLevel++;
                AudioSys.move();
            } else {
                AudioSys.playTone(150, 'sawtooth', 0.1, 0.1); // "Locked" sound
            }
        }
        if (key === 'ArrowLeft' || key === 'a') {
            if (this.selectedLevel > 0) {
                this.selectedLevel--;
                AudioSys.move();
            }
        }
        if (key === 'ArrowDown' || key === 's') {
            // Find node below in grid
            const current = this.nodes[this.selectedLevel];
            let bestDist = Infinity;
            let bestIdx = -1;
            this.nodes.forEach((n, i) => {
                if (n.y > current.y && i < this.unlockedLevels) {
                    const d = Math.abs(n.x - current.x);
                    if (d < bestDist) { bestDist = d; bestIdx = i; }
                }
            });
            if (bestIdx !== -1) { this.selectedLevel = bestIdx; AudioSys.move(); }
        }
        if (key === 'ArrowUp' || key === 'w') {
            const current = this.nodes[this.selectedLevel];
            let bestDist = Infinity;
            let bestIdx = -1;
            this.nodes.forEach((n, i) => {
                if (n.y < current.y) {
                    const d = Math.abs(n.x - current.x);
                    if (d < bestDist) { bestDist = d; bestIdx = i; }
                }
            });
            if (bestIdx !== -1) { this.selectedLevel = bestIdx; AudioSys.move(); }
        }

        if (key === 'Enter' || key === ' ') {
            AudioSys.playTone(400, 'square', 0.2, 0.2);
            return `SELECT_${this.selectedLevel}`;
        }

        return null;
    },

    update() {
        this.animFrame++;
        this.cursorPulse = Math.sin(this.animFrame * 0.15) * 5;

        // Smoothly lerp node scales
        this.nodes.forEach((n, i) => {
            const target = (i === this.selectedLevel) ? 1.4 : 1.0;
            this.nodeScales[i] += (target - this.nodeScales[i]) * 0.15;
        });

        // Camera follow selected node
        const targetX = this.nodes[this.selectedLevel].x - 320;
        const targetY = this.nodes[this.selectedLevel].y - 240;
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;
    },

    render(ctx) {
        const W = 640, H = 480;
        ctx.save();
        
        // 1. Draw Industrial Background
        this._drawBackground(ctx, W, H);

        ctx.translate(-this.camera.x, -this.camera.y);

        // 2. Draw Circuit Traces (Wires)
        this._drawTraces(ctx);

        // 3. Draw Level Nodes
        this._drawNodes(ctx);

        ctx.restore();

        // 4. Draw Header/Footer UI
        this._drawUI(ctx, W, H);
        
        // 5. Draw CRT Effects
        this._drawCRTOverlay(ctx, W, H);
    },

    _drawBackground(ctx, W, H) {
        // Deep teal-black gradient
        const bgGrad = ctx.createRadialGradient(W/2, H/2, 100, W/2, H/2, 500);
        bgGrad.addColorStop(0, '#0a1018');
        bgGrad.addColorStop(1, '#05080c');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Circuit grid dots
        ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
        for (let x = 0; x < 2000; x += 40) {
            for (let y = 0; y < 2000; y += 40) {
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },

    _drawTraces(ctx) {
        this.connections.forEach((conn, i) => {
            const from = this.nodes[conn.from];
            const to = this.nodes[conn.to];
            const isUnlocked = conn.to < this.unlockedLevels;

            ctx.lineWidth = 4;
            ctx.strokeStyle = isUnlocked ? '#003344' : '#151a20';
            
            // Draw path with L-shapes (orthogonal)
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            if (conn.type === 'H') {
                ctx.lineTo(to.x, to.y);
            } else {
                ctx.lineTo(from.x, to.y);
                ctx.lineTo(to.x, to.y);
            }
            ctx.stroke();

            // Draw active energy flow on unlocked paths
            if (isUnlocked) {
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = '#00f0ff';
                ctx.setLineDash([10, 20]);
                ctx.lineDashOffset = -this.animFrame * 0.5;
                ctx.stroke();
                ctx.setLineDash([]);
            }
        });
    },

    _drawNodes(ctx) {
        this.nodes.forEach((n, i) => {
            const isUnlocked = i < this.unlockedLevels;
            const isSelected = i === this.selectedLevel;
            const scale = this.nodeScales[i];
            const stars = this.stars[i] || 0;

            ctx.save();
            ctx.translate(n.x, n.y);
            ctx.scale(scale, scale);

            // Node Outer ring
            ctx.lineWidth = 2;
            ctx.strokeStyle = isUnlocked ? (isSelected ? '#00f0ff' : '#00a0aa') : '#252a35';
            if (isSelected) {
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 10;
            }
            
            // Hexagon Node
            ctx.beginPath();
            for (let side = 0; side < 6; side++) {
                const angle = side * Math.PI / 3;
                ctx.lineTo(Math.cos(angle) * 20, Math.sin(angle) * 20);
            }
            ctx.closePath();
            ctx.fillStyle = isUnlocked ? '#0a1a2a' : '#05080c';
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Stars / Bolts (Procedural icons)
            if (isUnlocked) {
                for (let s = 0; s < 3; s++) {
                    const angle = (s * 2/3 * Math.PI) - Math.PI/2;
                    const bx = Math.cos(angle) * 12;
                    const by = Math.sin(angle) * 12;
                    const earned = s < stars;
                    
                    ctx.fillStyle = earned ? '#00f0ff' : '#15202a';
                    this._drawBolt(ctx, bx, by, earned ? 6 : 4);
                }
            } else {
                // Locked Icon (Padlock)
                ctx.fillStyle = '#15202a';
                ctx.fillRect(-4, -2, 8, 8);
                ctx.beginPath();
                ctx.arc(0, -2, 4, Math.PI, 0);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#15202a';
                ctx.stroke();
            }

            // Level Number
            if (isUnlocked) {
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fff';
                // ctx.fillText(i + 1, 0, 4); // Too cluttered?
            }

            ctx.restore();
        });
    },

    _drawBolt(ctx, x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x - size/4, y - size/2);
        ctx.lineTo(x + size/2, y - size/4);
        ctx.lineTo(x, y);
        ctx.lineTo(x + size/4, y + size/2);
        ctx.lineTo(x - size/2, y + size/4);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();
    },

    _drawUI(ctx, W, H) {
        const selectedLvl = LEVELS[this.selectedLevel];
        
        // 1. Header Strip
        ctx.fillStyle = 'rgba(0, 10, 20, 0.8)';
        ctx.fillRect(0, 0, W, 60);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(W, 60); ctx.stroke();

        ctx.font = '24px "VT323", monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#00f0ff';
        ctx.fillText("TERMINAL DE ACESSO - REDE QUANTICA", 20, 35);

        // 2. Footer Info Panel
        ctx.fillStyle = 'rgba(0, 10, 20, 0.8)';
        ctx.fillRect(0, H - 100, W, 100);
        ctx.beginPath(); ctx.moveTo(0, H - 100); ctx.lineTo(W, H - 100); ctx.stroke();

        // Level Details
        ctx.font = '22px "VT323", monospace';
        ctx.fillStyle = '#fff';
        const levelNum = (this.selectedLevel + 1).toString().padStart(2, '0');
        ctx.fillText(`PRODUÇÃO: NÍVEL ${levelNum}`, 20, H - 65);
        
        ctx.font = '18px "VT323", monospace';
        ctx.fillStyle = '#00ff9f';
        ctx.fillText(`PROTOCOLO: ${selectedLvl.name.toUpperCase()}`, 20, H - 35);

        // Control hints
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.fillText("[SETAS] NAVEGAR  [ENTER] INICIAR", W - 20, H - 35);
        
        // Stars summary
        const totalStars = this.stars.reduce((a, b) => a + b, 0);
        const maxStars = LEVELS.length * 3;
        ctx.fillText(`TOTAL ESTRELAS: ${totalStars}/${maxStars}`, W - 20, H - 65);

        // Chapter Indicators
        this._drawChapterBadges(ctx, W, H);
    },

    _drawChapterBadges(ctx, W, H) {
        const currentChap = CHAPTERS.find(c => c.levels.includes(this.selectedLevel));
        if (currentChap) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = 'bold 14px "VT323", monospace';
            const badgeW = 200;
            const bx = (W - badgeW) / 2;
            const by = 50;

            // Label
            ctx.fillStyle = '#00ff9f';
            ctx.fillText(currentChap.name, W/2, by + 30);
            
            // Underline
            ctx.strokeStyle = '#00ff9f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(W/2 - 80, by + 35);
            ctx.lineTo(W/2 + 80, by + 35);
            ctx.stroke();

            ctx.restore();
        }
    },

    _drawCRTOverlay(ctx, W, H) {
        // Scanlines
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        for (let y = 0; y < H; y += 4) {
            ctx.fillRect(0, y, W, 2);
        }
        
        // Vignette
        const vig = ctx.createRadialGradient(W/2, H/2, 200, W/2, H/2, 450);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }
};

window.LevelSelector = LevelSelector;