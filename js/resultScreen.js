// ============================================================
// RESULT SCREEN - Circuit Breaker
// Industrial CRT-style level completion summary
// ============================================================

const ResultScreen = {
    active: false,
    animFrame: 0,
    selectedButton: 1, // 0: REPLAY, 1: NEXT LEVEL, 2: MAIN MENU
    particles: [],
    starScales: [0, 0, 0], // For pop animation
    isAutoAdvanceActive: true,
    autoAdvanceTimer: 300,
    failed: false,

    // Result data captured at level completion
    data: {
        levelIndex: 0,
        levelName: '',
        timeRemaining: 0,
        score: 0,
        livesRemaining: 0,
        stars: 0,
        bonus: 0,
        bonusLabel: '',
        totalScore: 0,
        scrapCollected: 0,
        totalScrap: 0
    },

    // Animation sequencing
    revealStep: 0,      // Which stat line is currently revealed
    revealTimer: 0,      // Frame counter for staggered reveal
    starsRevealed: 0,    // How many bolts have been revealed
    starRevealTimer: 0,

    open(gameState, failed = false) {
        this.active = true;
        this.animFrame = 0;
        this.autoAdvanceTimer = 300;
        this.isAutoAdvanceActive = true;
        this.failed = failed;
        this.isGameOver = (gameState.lives <= 0);
        this.selectedButton = (failed || this.isGameOver) ? 0 : 1; 
        this.particles = [];
        this.revealStep = 0;
        this.revealTimer = 0;
        this.starsRevealed = 0;
        this.starRevealTimer = 0;
        this.starScales = [0.8, 0.8, 0.8];

        // Capture result data
        const lvl = LEVELS[gameState.levelIndex];
        const totalTime = lvl.timer || 60;
        const timeRemaining = gameState.time;
        const timePercent = (timeRemaining / totalTime) * 100;

        // Percentage-based stars: >50% = 3, >20% = 2, else 1
        const stars = timePercent > 50 ? 3 : (timePercent > 20 ? 2 : 1);
        
        const baseScore = 1000 + Math.floor(timeRemaining * 10);

        // Calculate bonus
        let bonus = 0;
        let bonusLabel = '';
        if (gameState.lives === 3) {
            bonus = 500;
            bonusLabel = 'INTEGRIDADE TOTAL (+500 CREDITS)';
        } else if (timePercent > 75) {
            bonus = 400;
            bonusLabel = 'VELOCIDADE RELÂMPAGO (+400 CREDITS)';
        } else if (stars === 3) {
            bonus = 200;
            bonusLabel = 'EFICIÊNCIA (+200 CREDITS)';
        }

        this.data = {
            levelIndex: gameState.levelIndex,
            levelName: lvl ? (lvl.name || `NÍVEL ${gameState.levelIndex + 1}`) : 'NÍVEL ??',
            timeRemaining: failed ? 0 : timeRemaining,
            score: failed ? 0 : baseScore,
            livesRemaining: gameState.lives,
            moveCount: gameState.moveCount,
            stars: failed ? 0 : stars,
            bonus: 0,
            economyBonus: 0, 
            bonusLabel: failed ? 'OPERÁRIO DESATIVADO' : bonusLabel,
            totalScore: failed ? 0 : (baseScore + bonus + (gameState.economyBonus || 0)),
            scrapCollected: gameState.scrapCollected || 0,
            totalScrap: gameState.totalScrap || 0
        };

        // Cover HTML UI with hazard stripes
        document.getElementById('ui-top')?.classList.add('covered');
        document.getElementById('ui-bottom')?.classList.add('covered');

        // Switch music to atmospheric
        if (window.AudioSys) {
            AudioSys.setMusicIntensity(0);
            AudioSys.playGameMusic();
            AudioSys.updateHum(false, 0, false);
        }
    },

    close() {
        this.active = false;

        // Uncover HTML UI
        document.getElementById('ui-top')?.classList.remove('covered');
        document.getElementById('ui-bottom')?.classList.remove('covered');
    },

    handleInput(key) {
        if (!this.active) return null;

        // Skip reveal animation on any key press
        if (this.revealStep < 5) {
            this.revealStep = 5;
            this.starsRevealed = this.data.stars;
            if (window.AudioSys) AudioSys.corePowered();
            return true;
        }

        if (key === 'ArrowLeft' || key === 'a') {
            this.isAutoAdvanceActive = false;
            this.selectedButton = Math.max(0, this.selectedButton - 1);
            if (window.AudioSys) AudioSys.move();
            return true;
        }
        if (key === 'ArrowRight' || key === 'd') {
            this.isAutoAdvanceActive = false;
            const maxIdx = this.failed ? 1 : 2;
            this.selectedButton = Math.min(maxIdx, this.selectedButton + 1);
            if (window.AudioSys) AudioSys.move();
            return true;
        }
        if (key === 'Enter' || key === ' ') {
            if (window.AudioSys) AudioSys.corePowered();
            if (this.selectedButton === 0) return 'REPLAY';
            if (this.failed || this.isGameOver) {
                if (this.selectedButton === 1) return 'MAIN_MENU';
            } else {
                if (this.selectedButton === 1) return 'NEXT_LEVEL';
                if (this.selectedButton === 2) return 'MAIN_MENU';
            }
        }

        return true;
    },

    update() {
        if (!this.active) return;
        this.animFrame++;

        // Staggered reveal animation
        this.revealTimer++;
        if (this.revealStep < 5 && this.revealTimer >= 20) {
            this.revealStep++;
            this.revealTimer = 0;
            if (window.AudioSys) AudioSys.playTone(400 + this.revealStep * 100, 'square', 0.08, 0.06);
        }

        // Star reveal (after stats)
        if (this.revealStep >= 5 && this.starsRevealed < this.data.stars) {
            this.starRevealTimer++;
            if (this.starRevealTimer >= 15) {
                this.starsRevealed++;
                this.starRevealTimer = 0;
                if (window.AudioSys) AudioSys.playTone(600 + this.starsRevealed * 200, 'sine', 0.15, 0.08);
                // Burst particles for each star reveal
                for (let i = 0; i < 12; i++) {
                    const starSpacing = 70;
                    const boltX = 320 - starSpacing + (this.starsRevealed - 1) * starSpacing;
                    this.particles.push({
                        x: boltX,
                        y: 120,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 6,
                        life: 0.8 + Math.random() * 0.4,
                        color: Math.random() > 0.3 ? '#00f0ff' : '#fff'
                    });
                }
            }
        }

        // Auto-advance logic
        const isLastLevel = this.data.levelIndex >= LEVELS.length - 1;
        if (this.revealStep >= 5 && this.isAutoAdvanceActive && !isLastLevel && !this.failed) {
            this.autoAdvanceTimer--;
            if (this.autoAdvanceTimer <= 0) return 'NEXT_LEVEL';
        }

        // Update star scales (growth animation)
        for (let i = 0; i < 3; i++) {
            const isEarned = i < this.data.stars;
            const isRevealed = i < this.starsRevealed;
            
            // Base target scale: 0.8 if not revealed, 1.0 if side bolt, 1.4 if middle bolt
            let target = 0.8;
            if (isRevealed && isEarned) {
                target = (i === 1) ? 1.4 : 1.0;
            } else if (isRevealed && !isEarned) {
                target = 0.8; 
            }

            // Lerp scale for smooth growth
            this.starScales[i] += (target - this.starScales[i]) * 0.15;
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Ambient spark particles on the panel border
        if (this.animFrame % 8 === 0) {
            const side = Math.random();
            let px, py;
            if (side < 0.25) { px = 120 + Math.random() * 400; py = 75; }
            else if (side < 0.5) { px = 120 + Math.random() * 400; py = 430; }
            else if (side < 0.75) { px = 120; py = 75 + Math.random() * 355; }
            else { px = 520; py = 75 + Math.random() * 355; }

            this.particles.push({
                x: px, y: py,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 0.5 + Math.random() * 0.3,
                color: Math.random() > 0.5 ? '#00f0ff' : '#00ff9f'
            });
        }
    },

    render(ctx) {
        if (!this.active) return;
        const W = 640, H = 480;

        ctx.save();

        // === BACKGROUND (Transparent Overlay) ===
        ctx.fillStyle = 'rgba(0, 5, 15, 0.4)'; // More transparent
        ctx.fillRect(0, 0, W, H);

        // Subtle circuit grid pattern
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 32) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y < H; y += 32) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // === MAIN PANEL ===
        this._drawMainPanel(ctx, W, H);

        // === TITLE ===
        this._drawTitle(ctx, W);

        // === LIGHTNING BOLTS (Stars) ===
        this._drawStars(ctx, W);

        // === STATS ===
        this._drawStats(ctx, W);

        // === MESSAGE ===
        this._drawMessage(ctx, W);

        // === BUTTONS ===
        this._drawButtons(ctx, W, H);

        // === PARTICLES ===
        this._drawParticles(ctx);

        // === CRT OVERLAY ===
        this._drawCRTOverlay(ctx, W, H);

        ctx.restore();
    },

    _drawMainPanel(ctx, W, H) {
        const panelX = 110, panelY = 40;
        const panelW = W - 220, panelH = 400;

        // Outer border (Dark steel)
        ctx.fillStyle = 'rgba(26, 30, 42, 0.9)'; // Slightly transparent
        ctx.fillRect(panelX - 4, panelY - 4, panelW + 8, panelH + 8);

        // Main panel body
        const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
        panelGrad.addColorStop(0, 'rgba(20, 24, 42, 0.9)');
        panelGrad.addColorStop(0.5, 'rgba(16, 20, 40, 0.9)');
        panelGrad.addColorStop(1, 'rgba(12, 16, 32, 0.9)');
        ctx.fillStyle = panelGrad;
        ctx.fillRect(panelX, panelY, panelW, panelH);

        // Inner bevel
        ctx.strokeStyle = '#2a3050';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX + 2, panelY + 2, panelW - 4, panelH - 4);

        // Outer glow border
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.strokeRect(panelX - 1, panelY - 1, panelW + 2, panelH + 2);
        ctx.shadowBlur = 0;

        // Corner rivets
        const rivets = [
            [panelX + 8, panelY + 8],
            [panelX + panelW - 12, panelY + 8],
            [panelX + 8, panelY + panelH - 12],
            [panelX + panelW - 12, panelY + panelH - 12]
        ];
        for (const [rx, ry] of rivets) {
            ctx.fillStyle = '#3a4060';
            ctx.beginPath();
            ctx.arc(rx, ry, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#222840';
            ctx.beginPath();
            ctx.arc(rx, ry, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Corner bracket accents (L-shaped metal pieces)
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(panelX - 6, panelY + 20);
        ctx.lineTo(panelX - 6, panelY - 6);
        ctx.lineTo(panelX + 20, panelY - 6);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(panelX + panelW + 6, panelY + 20);
        ctx.lineTo(panelX + panelW + 6, panelY - 6);
        ctx.lineTo(panelX + panelW - 20, panelY - 6);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(panelX - 6, panelY + panelH - 20);
        ctx.lineTo(panelX - 6, panelY + panelH + 6);
        ctx.lineTo(panelX + 20, panelY + panelH + 6);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(panelX + panelW + 6, panelY + panelH - 20);
        ctx.lineTo(panelX + panelW + 6, panelY + panelH + 6);
        ctx.lineTo(panelX + panelW - 20, panelY + panelH + 6);
        ctx.stroke();

        ctx.globalAlpha = 1.0;
    },

    _drawTitle(ctx, W) {
        const levelNum = (this.data.levelIndex + 1).toString().padStart(2, '0');
        let titleText = this.failed ? "FALHA CRÍTICA" : `NÍVEL ${levelNum} COMPLETO!`;
        if (this.isGameOver) titleText = "SISTEMA DESARTICULADO";

        const bannerW = 340;
        const bannerH = 40;
        const bannerX = (W - bannerW) / 2;
        const bannerY = 20; // Overlap the top edge of the main panel (centered on the edge)

        // Header Box (Button Style)
        // Glow
        ctx.shadowColor = this.failed ? '#ff003c' : '#00ff9f';
        ctx.shadowBlur = 15;
        ctx.fillStyle = this.failed ? '#ff003c' : '#00ff9f';
        ctx.fillRect(bannerX - 2, bannerY - 2, bannerW + 4, bannerH + 4);
        ctx.shadowBlur = 0;

        // Inner Body
        ctx.fillStyle = '#0a2030';
        ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
        
        // Border
        ctx.strokeStyle = this.failed ? '#ff003c' : '#00ff9f';
        ctx.lineWidth = 2;
        ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

        // Title text
        ctx.font = 'bold 22px "VT323", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#00ff9f';
        ctx.shadowBlur = 5;
        ctx.fillText(titleText, W / 2, bannerY + bannerH / 2);
        ctx.shadowBlur = 0;
    },

    _drawStars(ctx, W) {
        const starY = 95;
        const starSpacing = 70; // Increased spacing for larger middle bolt
        const startX = W / 2 - starSpacing;

        for (let i = 0; i < 3; i++) {
            const bx = startX + i * starSpacing;
            const isRevealed = i < this.starsRevealed;
            const isEarned = i < this.data.stars;
            const scale = this.starScales[i];

            ctx.save();

            if (isRevealed && isEarned) {
                // Glow for active stars
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = (12 + Math.sin(this.animFrame * 0.08 + i) * 4) * scale;
                
                // Draw with dynamic scale and full colors
                const baseSize = 28;
                this._drawEnergyBolt(ctx, bx, starY, baseSize * scale);
            } else {
                // Inactive star (turned off) - even darker as requested
                const baseSize = 28;
                const offScale = scale;
                
                ctx.save();
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#050810'; // Near black
                ctx.strokeStyle = '#101525'; // Dark blue-grey stroke
                ctx.lineWidth = 1;
                
                this._drawEnergyBoltSimple(ctx, bx, starY, baseSize * offScale);
                ctx.stroke();
                ctx.restore();
            }

            ctx.restore();
        }
    },

    // Simplified version for the "off" state
    _drawEnergyBoltSimple(ctx, x, y, size) {
        const scale = size / 40;
        const pts = [
            { x: -10, y: -20 }, { x: 12, y: -20 }, { x: 2, y: -2 },
            { x: 18, y: -2 }, { x: -5, y: 25 }, { x: 4, y: 4 }, { x: -12, y: 4 }
        ];

        ctx.beginPath();
        ctx.moveTo(x + pts[0].x * scale, y + pts[0].y * scale);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(x + pts[i].x * scale, y + pts[i].y * scale);
        }
        ctx.closePath();
        ctx.fill();
    },

    _drawCoreIcon(ctx, x, y, size) {
        const half = size / 2;
        
        // Outer dark frame
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - half, y - half, size, size);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - half, y - half, size, size);

        // Inner glowing core
        const coreSize = size * 0.6;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, coreSize / 2);
        grad.addColorStop(0, '#00ff9f'); // Bright Neon Green
        grad.addColorStop(1, '#008855'); // Darker Green
        
        ctx.shadowColor = '#00ff9f';
        ctx.shadowBlur = 8;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, coreSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Glass highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(x - coreSize * 0.15, y - coreSize * 0.15, coreSize * 0.1, 0, Math.PI * 2);
        ctx.fill();
    },

    _drawClockIcon(ctx, x, y, size) {
        const r = size / 2;
        ctx.strokeStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        // Hands
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - r * 0.6);
        ctx.moveTo(x, y);
        ctx.lineTo(x + r * 0.4, y);
        ctx.stroke();
        ctx.shadowBlur = 0;
    },

    _drawArrowIcon(ctx, x, y, size) {
        const s = size * 0.8;
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(x - s/2, y);
        ctx.lineTo(x + s/2, y);
        ctx.lineTo(x, y - s/2);
        ctx.fill();
        ctx.fillRect(x - s/4, y, s/2, s/2);
        ctx.shadowBlur = 0;
    },

    _drawHeartIcon(ctx, x, y, size) {
        const h = size * 0.8;
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(x, y + h/4);
        ctx.bezierCurveTo(x, y, x - h/2, y, x - h/2, y + h/4);
        ctx.bezierCurveTo(x - h/2, y + h/2, x, y + h*0.8, x, y + h);
        ctx.bezierCurveTo(x, y + h*0.8, x + h/2, y + h/2, x + h/2, y + h/4);
        ctx.bezierCurveTo(x + h/2, y, x, y, x, y + h/4);
        ctx.fill();
        ctx.shadowBlur = 0;
    },
    _drawScrapIcon(ctx, x, y, size) {
        const r = size / 2;
        ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 5;
        // Draw a small hex nut or gear shape
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
    },

    _drawTrophyIcon(ctx, x, y, size) {
        const w = size;
        const h = size;
        const scale = size / 20;
        
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 8;

        const drawCup = (ox = 0, oy = 0) => {
            ctx.beginPath();
            // Cup body
            ctx.moveTo(x - w/2 + ox, y - h/2 + oy);
            ctx.lineTo(x + w/2 + ox, y - h/2 + oy);
            ctx.lineTo(x + w/4 + ox, y + h/8 + oy);
            ctx.lineTo(x - w/4 + ox, y + h/8 + oy);
            ctx.closePath();
            // Stem & Base
            ctx.moveTo(x - w/8 + ox, y + h/8 + oy);
            ctx.lineTo(x + w/8 + ox, y + h/8 + oy);
            ctx.lineTo(x + w/8 + ox, y + h/4 + oy);
            ctx.lineTo(x - w/8 + ox, y + h/4 + oy);
            ctx.closePath();
            ctx.moveTo(x - w/3 + ox, y + h/4 + oy);
            ctx.lineTo(x + w/3 + ox, y + h/4 + oy);
            ctx.lineTo(x + w/3 + ox, y + h/2 + oy);
            ctx.lineTo(x - w/3 + ox, y + h/2 + oy);
            ctx.closePath();
        };

        const drawHandles = (ox = 0, oy = 0) => {
            ctx.beginPath();
            ctx.arc(x - w/2 + ox, y - h/4 + oy, w/4, Math.PI * 0.5, Math.PI * 1.5);
            ctx.arc(x + w/2 + ox, y - h/4 + oy, w/4, Math.PI * 1.5, Math.PI * 0.5);
        };

        // 1. 3D DEPTH
        ctx.fillStyle = '#9b4d00';
        drawCup(2, 2);
        ctx.fill();
        ctx.strokeStyle = '#9b4d00';
        ctx.lineWidth = 2 * scale;
        drawHandles(2, 2);
        ctx.stroke();

        // 2. MAIN BODY
        ctx.fillStyle = '#ffcc00';
        drawCup();
        ctx.fill();
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2 * scale;
        drawHandles();
        ctx.stroke();

        // 3. BLACK OUTLINE
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1 * scale;
        drawCup();
        ctx.stroke();
        drawHandles();
        ctx.stroke();

        ctx.shadowBlur = 0;
    },

    _drawStats(ctx, W) {
        const statsX = 160;
        const statsW = W - 320;
        const statsY = 155;
        const lineH = 35;
        const panelPadding = 110;
        const colW = statsW / 2;
        ctx.fillStyle = 'rgba(0, 10, 30, 0.7)';
        ctx.fillRect(statsX - 15, statsY - 12, statsW + 30, lineH * 4 + panelPadding);
        ctx.strokeStyle = '#1a2a40';
        ctx.lineWidth = 1;
        ctx.strokeRect(statsX - 15, statsY - 12, statsW + 30, lineH * 4 + panelPadding);

        ctx.textBaseline = 'middle';
        
        // --- 1. CORE HEADER (Full Width) ---
        if (this.revealStep > 0) {
            const headerY = statsY + lineH / 2 - 5;
            this._drawCoreIcon(ctx, statsX + 8, headerY, 18);
            
            ctx.font = 'bold 18px "VT323", monospace';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#00ff9f';
            ctx.fillText('NÚCLEO ESTABILIZADO', statsX + 28, headerY);
            
            ctx.font = '16px "VT323", monospace';
            const textW = ctx.measureText('NÚCLEO ESTABILIZADO').width;
            ctx.fillText('(+1000 CREDITS)', statsX + 28 + textW + 25, headerY);
        }

        const bodyYStart = statsY + lineH;

        // --- COLUMN 1 (LEFT): TIME & MOVES ---
        const drawColItem = (idx, icon, value, subValue, xOffset, colColor = '#fff') => {
            // idx 0 is the row below the header
            if (this.revealStep <= idx + 1) return;
            const y = bodyYStart + idx * lineH + lineH / 2;
            const curX = statsX + xOffset;

        if (icon === 'TIME') this._drawClockIcon(ctx, curX + 8, y, 16);
        else if (icon === 'MOVES') this._drawArrowIcon(ctx, curX + 8, y, 16);
        else if (icon === 'LIVES') this._drawHeartIcon(ctx, curX + 8, y - 6, 14);
        else if (icon === 'SCRAP') this._drawScrapIcon(ctx, curX + 8, y, 14);
        else {
                ctx.textAlign = 'left';
                ctx.fillStyle = '#00f0ff';
                ctx.font = '18px serif';
                ctx.fillText(icon, curX, y);
            }

            // Main Value
            ctx.font = '20px "VT323", monospace';
            ctx.textAlign = 'left';
            ctx.fillStyle = colColor;
            ctx.fillText(value, curX + 28, y);

            // Sub Value (Bonus points or detail)
            if (subValue) {
                ctx.font = '14px "VT323", monospace';
                ctx.fillStyle = '#00ff9f';
                ctx.textAlign = 'left';
                const mainW = ctx.measureText(value).width;
                ctx.fillText(subValue, curX + 28 + mainW + 15, y + 1);
            }
        };

        // Left Column Items (Row index 0 and 1 relative to bodyYStart)
        const timeBonusLabel = `(+${this.data.timeRemaining * 10} CREDITS)`;
        const moveBonusLabel = this.data.economyBonus > 0 ? `(+${this.data.economyBonus} CREDITS)` : null;
        
        drawColItem(0, 'TIME', this._formatTime(this.data.timeRemaining), timeBonusLabel, 0);
        drawColItem(1, 'MOVES', `${this.data.moveCount} MOVS`, moveBonusLabel, 0);

        // Right Column Items
        drawColItem(0, 'LIVES', (this.data.livesRemaining * 33) + '%', '(INTEGRIDADE)', colW + 20);
        drawColItem(1, 'SCRAP', this.data.scrapCollected + '/' + this.data.totalScrap, '(TRALHAS)', colW + 20, '#ffcc00');

        // --- SPECIAL BONUS (FULL WIDTH) ---
        if (this.revealStep >= 4) {
            const bonusY = bodyYStart + 2 * lineH + lineH / 2;
            this._drawTrophyIcon(ctx, statsX + 8, bonusY, 18);
            
            ctx.font = '18px "VT323", monospace';
            ctx.fillStyle = '#00ff9f';
            ctx.textAlign = 'left';
            ctx.shadowColor = '#00ff9f';
            ctx.shadowBlur = 4;
            ctx.fillText(this.data.bonusLabel || 'SEM BÔNUS ADICIONAL', statsX + 28, bonusY);
            ctx.shadowBlur = 0;
        }

        // --- TOTAL SCORE ---
        if (this.revealStep >= 5) {
            const totalY = bodyYStart + 3 * lineH + 20;

            // Separator line
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(statsX, totalY - 18);
            ctx.lineTo(statsX + statsW, totalY - 18);
            ctx.stroke();
            ctx.globalAlpha = 1;

            ctx.font = 'bold 28px "VT323", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 12;
            ctx.fillText(`TOTAL: ${this.data.totalScore} CREDITS`, W / 2, totalY + 6);
            ctx.shadowBlur = 0;
        }
    },

    _drawMessage(ctx, W) {
        if (this.revealStep < 5) return;

        const msgY = 360;
        const messages = [
            'EXCELENTE TRABALHO, MECÂNICO!',
            'CIRCUITO RESTAURADO COM SUCESSO!',
            'OPERAÇÃO CONCLUÍDA!',
            'SISTEMA ONLINE!',
            'SETOR ESTABILIZADO!'
        ];
        const msg = (this.failed || this.isGameOver) ? 'SISTEMA DESARTICULADO - OPERÁRIO DESATIVADO' : messages[this.data.levelIndex % messages.length];

        ctx.font = '18px "VT323", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ff9f';
        ctx.shadowColor = '#00ff9f';
        ctx.shadowBlur = 6;
        ctx.fillText(msg, W / 2, msgY);
        ctx.shadowBlur = 0;
    },

    _drawButtons(ctx, W, H) {
        if (this.revealStep < 5) return;

        const buttonY = 430;
        const buttonH = 36;
        const buttonGap = 20;
        const isLastLevel = this.data.levelIndex >= LEVELS.length - 1;
        const seconds = Math.max(0, Math.ceil(this.autoAdvanceTimer / 60));
        
        let nextLevelLabel = 'PRÓXIMO NÍVEL';
        let nextBtnColor = '#00ff9f';

        if (isLastLevel) {
            nextLevelLabel = 'CONCLUIR';
            nextBtnColor = '#00f0ff'; // Cyan for completion
        } else if (typeof LevelSelector !== 'undefined' && LevelSelector.pendingChapterUnlock) {
            nextLevelLabel = this.isAutoAdvanceActive ? `NOVO SETOR (${seconds}s)` : 'NOVO SETOR';
            nextBtnColor = '#00ff9f';
        } else if (this.isAutoAdvanceActive) {
            nextLevelLabel = `PRÓXIMO NÍVEL (${seconds}s)`;
        }

        let buttons = [];
        if (this.failed || this.isGameOver) {
            buttons = [
                { label: 'TENTAR NOVAMENTE', width: 180, color: this.isGameOver ? '#ff003c' : '#00f0ff' },
                { label: 'VOLTAR AO MENU', width: 180, color: '#00f0ff' }
            ];
        } else {
            buttons = [
                { label: 'REPLAY', width: 100, color: '#00f0ff' },
                { label: nextLevelLabel, width: 240, color: nextBtnColor },
                { label: 'MENU', width: 100, color: '#00f0ff' }
            ];
        }

        // Calculate total width
        const totalW = buttons.reduce((s, b) => s + b.width, 0) + buttonGap * (buttons.length - 1);
        let bx = (W - totalW) / 2;

        for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            const isSelected = this.selectedButton === i;
            const btnColor = btn.color;

            // Button background
            if (isSelected) {
                // Selected glow
                ctx.shadowColor = btnColor;
                ctx.shadowBlur = 12;
                ctx.fillStyle = btnColor;
                ctx.fillRect(bx - 2, buttonY - 2, btn.width + 4, buttonH + 4);
                ctx.shadowBlur = 0;

                // Inner
                ctx.fillStyle = '#0a2030';
                ctx.fillRect(bx, buttonY, btn.width, buttonH);

                // Animated border pulse
                const pulse = Math.sin(this.animFrame * 0.1) * 0.3 + 0.7;
                ctx.strokeStyle = btnColor;
                ctx.globalAlpha = pulse;
                ctx.lineWidth = 2;
                ctx.strokeRect(bx, buttonY, btn.width, buttonH);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = '#1a1e2e';
                ctx.fillRect(bx, buttonY, btn.width, buttonH);
                ctx.strokeStyle = '#2a3050';
                ctx.lineWidth = 1;
                ctx.strokeRect(bx, buttonY, btn.width, buttonH);
            }

            // Button text
            ctx.font = isSelected ? 'bold 18px "VT323", monospace' : '16px "VT323", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isSelected ? btnColor : '#667788';
            if (isSelected) {
                ctx.shadowColor = btnColor;
                ctx.shadowBlur = 6;
            }
            ctx.fillText(btn.label, bx + btn.width / 2, buttonY + buttonH / 2 + 1);
            ctx.shadowBlur = 0;

            // Selection indicator arrows
            if (isSelected) {
                const arrowPulse = Math.sin(this.animFrame * 0.08) * 3;
                ctx.fillStyle = '#00f0ff';

                // Left arrow
                ctx.beginPath();
                ctx.moveTo(bx - 10 - arrowPulse, buttonY + buttonH / 2);
                ctx.lineTo(bx - 4, buttonY + buttonH / 2 - 6);
                ctx.lineTo(bx - 4, buttonY + buttonH / 2 + 6);
                ctx.closePath();
                ctx.fill();

                // Right arrow
                ctx.beginPath();
                ctx.moveTo(bx + btn.width + 10 + arrowPulse, buttonY + buttonH / 2);
                ctx.lineTo(bx + btn.width + 4, buttonY + buttonH / 2 - 6);
                ctx.lineTo(bx + btn.width + 4, buttonY + buttonH / 2 + 6);
                ctx.closePath();
                ctx.fill();
            }

            bx += btn.width + buttonGap;
        }
    },

    _drawParticles(ctx) {
        for (const p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
        }
        ctx.globalAlpha = 1.0;
    },

    _drawCRTOverlay(ctx, W, H) {
        // Vignette
        const vig = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 400);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        // Scanlines
        ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
        for (let y = 0; y < H; y += 3) {
            ctx.fillRect(0, y, W, 1);
        }

        // Subtle noise
        if (this.animFrame % 2 === 0) {
            for (let i = 0; i < 20; i++) {
                ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.02})`;
                ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
            }
        }
    },

    _drawEnergyBolt(ctx, x, y, size) {
        const scale = size / 40;
        
        // Define points for a sharper, more industrial bolt matching the reference
        const pts = [
            { x: -14, y: -20 }, // Top Left
            { x: 12,  y: -20 }, // Top Right
            { x: 2,   y: -2 },  // Mid Right (In)
            { x: 16,  y: -2 },  // Mid Right (Out)
            { x: -4,  y: 25 },  // Bottom Tip
            { x: 4,   y: 4 },   // Mid Left (In)
            { x: -16, y: 4 }    // Mid Left (Out)
        ];

        const drawPath = (offsetX = 0, offsetY = 0) => {
            ctx.beginPath();
            ctx.moveTo(x + (pts[0].x + offsetX) * scale, y + (pts[0].y + offsetY) * scale);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(x + (pts[i].x + offsetX) * scale, y + (pts[i].y + offsetY) * scale);
            }
            ctx.closePath();
        };

        // 1. 3D DEPTH (Blocky offset)
        ctx.fillStyle = '#005a70'; // Dark Teal
        drawPath(3, 3);
        ctx.fill();

        // 2. OUTER BLACK OUTLINE
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3 * scale;
        drawPath();
        ctx.stroke();

        // 3. MAIN BODY GRADIENT
        const boltGrad = ctx.createLinearGradient(x, y - 20 * scale, x, y + 25 * scale);
        boltGrad.addColorStop(0, '#b0ffff'); // Bright Cyan
        boltGrad.addColorStop(0.5, '#00f0ff'); // Cyan
        boltGrad.addColorStop(1, '#0080aa'); // Deeper Blue
        
        ctx.fillStyle = boltGrad;
        drawPath();
        ctx.fill();

        // 4. INNER HIGHLIGHT (Top-Left Edge)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(x + (pts[0].x + 3) * scale, y + (pts[0].y + 3) * scale);
        ctx.lineTo(x + (pts[1].x - 6) * scale, y + (pts[1].y + 3) * scale);
        ctx.stroke();
    },

    _formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
};