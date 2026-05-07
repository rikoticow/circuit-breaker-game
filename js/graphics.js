/**
 * Graphics Module - Core
 * Refactored for modularity.
 * Extensions loaded via: environment.js, mechanisms.js, entities.js, particles.js, trails.js, vfx.js
 */

const COLORS = {
    bg: '#050a05',
    grid: '#0a1a0a',
    wall: '#223322',
    wallEdge: '#446644',
    robotBody: '#ff8800',
    robotEye: '#00f0ff',
    block: '#444455',
    blockEdge: '#888899',
    wire: '#113322',
    wirePowered: '#00f0ff',
    wireEnergy: '#ffffff',
    coreBlue: '#00f0ff',
    coreTargetIdle: '#114422',
    coreTargetPowered: '#00ff9f',
    coreForbiddenIdle: '#441111',
    coreForbiddenPowered: '#ff003c',
    hpFull: '#ff003c',
    hpEmpty: '#220000',
    hpEdge: '#ff5588'
};

const DIRS = {
    RIGHT: 0,
    DOWN: 1,
    LEFT: 2,
    UP: 3
};

const Graphics = {
    ctx: null,
    tileSize: 32,
    particles: [],
    trails: [],
    trailCanvas: null,
    trailCtx: null,
    blackoutCanvas: null,
    blackoutCtx: null,
    bgCanvas: null,
    bgCtx: null,

    init(canvas) {
        this.ctx = canvas.getContext('2d');
        // Disable smoothing
        this.ctx.imageSmoothingEnabled = false;

        // Create offscreen buffer for permanent trails (performance optimization)
        this.trailCanvas = document.createElement('canvas');
        this.trailCanvas.width = 2000;
        this.trailCanvas.height = 2000;
        this.trailCtx = this.trailCanvas.getContext('2d');

        // Background Buffer removed, rendering directly now

        // Transition Canvas (covers entire UI)
        this.tCanvas = document.getElementById('transitionCanvas');
        if (this.tCanvas) {
            this.tCanvas.width = 640;
            this.tCanvas.height = 560;
            this.tCtx = this.tCanvas.getContext('2d');
        }

        // Blackout Buffer
        this.blackoutCanvas = document.createElement('canvas');
        this.blackoutCanvas.width = 640;
        this.blackoutCanvas.height = 480;
        this.blackoutCtx = this.blackoutCanvas.getContext('2d');
    },
    initLevelContext(game) {
        const effectiveIndex = game.originalLevelIndex !== undefined ? game.originalLevelIndex : game.levelIndex;
        this.levelSeed = (effectiveIndex !== undefined && effectiveIndex !== -1) ? effectiveIndex * 137 : Math.floor(Math.random() * 1000);
    },

    drawStaticBackground(game, startX, endX, startY, endY, frame = 0) {
        if (!this.ctx || !game.map || !game.map[0]) return;

        // 1. Ensure Background is Baked for the CURRENT level
        const levelKey = `${game.levelIndex}_${game.map[0].length}x${game.map.length}_${this.levelSeed}`;
        if (!this.bgCanvas || this.bakedLevelKey !== levelKey) {
            this.bakeBackground(game);
        }

        // 2. Draw the baked background
        if (this.bgCanvas) {
            try {
                this.ctx.drawImage(this.bgCanvas, 0, 0);
            } catch (e) {
                console.error("Error drawing bgCanvas:", e);
                // Fallback: If drawing fails (e.g. canvas too large), we could 
                // potentially draw manually, but for now we just log it.
            }
        }

        // 3. Draw Animated Elements (Wall Variant 7 - Computer Terminal, Energy Pillars)
        if (!game.map || !game.map[0]) return;
        
        startX = Math.max(0, Math.floor(startX));
        startY = Math.max(0, Math.floor(startY));
        endX = Math.min(game.map[0].length, Math.ceil(endX));
        endY = Math.min(game.map.length, Math.ceil(endY));

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const row = game.map[y];
                if (!row) continue;
                const c = row[x];
                // Technical/Animated tiles that need per-frame drawing or specialized handling
                if (['W', 'f', 'i', 'k', 'h', 'm', 'g', 'q', ':', ';', '&', '=', '\u03C0', '\u03A9', '\"', '|', '\u03A3', '\u03C3'].includes(c)) {
                    const seedX = x + (this.levelSeed || 0);
                    const seedY = y + (this.levelSeed || 0);
                    const variant = Math.abs(seedX * 7 + seedY * 31) % 10;
                    
                    // Conditions for per-frame dynamic rendering:
                    // 1. Terminals/Animated Walls (\u03C0 has blinking LEDs)
                    // 2. Reality/Processing/Quantum Ceilings (for connectivity mask stability)
                    // 3. Special Floors (&, \u03A3)
                    const isDynamic = (variant === 7 && (c === 'W' || c === 'f')) || 
                                      ['i', 'k', 'h', 'm', 'g', 'q', ':', ';', '&', '=', '\u03C0', '\u03A9', '|', '\u03A3', '\u03C3'].includes(c);
                    
                    if (isDynamic) {
                        if (c === '&' || c === '\u03A3' || c === '\u03C3') {
                            this.drawFloor(x, y, c);
                        } else if (c === '=' || c === '\u03A9' || c === '|') {
                            let mask = 0;
                            if (y > 0 && game.map[y-1][x] === c) mask |= 1;
                            if (x < game.map[0].length - 1 && game.map[y][x+1] === c) mask |= 2;
                            if (y < game.map.length - 1 && game.map[y+1][x] === c) mask |= 4;
                            if (x > 0 && game.map[y][x-1] === c) mask |= 8;
                            
                            if (c === '=') this.drawRealityCeiling(x, y, mask);
                            else if (c === '\u03A9') this.drawProcessingCeiling(x, y, mask);
                            else if (c === '|') this.drawQuantumCeiling(x, y, mask);
                        } else {
                            this.drawWallFace(x, y, c);
                        }
                    }
                }
            }
        }
    },

    bakeBackground(game) {
        if (!game.map || !game.map[0]) return;
        
        const mapH = game.map.length;
        const mapW = game.map[0].length;
        
        // Initialize or Resize bgCanvas to fit the entire map
        if (!this.bgCanvas) this.bgCanvas = document.createElement('canvas');
        this.bgCanvas.width = mapW * this.tileSize;
        this.bgCanvas.height = mapH * this.tileSize;
        this.bgCtx = this.bgCanvas.getContext('2d');
        if (!this.bgCtx) return;
        this.bgCtx.imageSmoothingEnabled = false;

        // Clear with background color
        this.bgCtx.fillStyle = COLORS.bg;
        this.bgCtx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);

        // Temp context swap to use existing draw methods from environment.js
        const oldCtx = this.ctx;
        this.ctx = this.bgCtx;

        try {
            // Phase 1: Draw Floors and Holes (Base Layer)
            for (let y = 0; y < mapH; y++) {
                const row = game.map[y];
                for (let x = 0; x < mapW; x++) {
                    const c = row[x];
                    if (c === '*') {
                        let mask = 0;
                        if (y > 0 && game.map[y-1][x] === '*') mask |= 1;
                        if (x < mapW - 1 && game.map[y][x+1] === '*') mask |= 2;
                        if (y < mapH - 1 && game.map[y+1][x] === '*') mask |= 4;
                        if (x > 0 && game.map[y][x-1] === '*') mask |= 8;
                        this.drawHole(x, y, mask);
                    } else if (c === '.') {
                        let mask = 0;
                        if (y > 0 && game.map[y-1][x] === '.') mask |= 1;
                        if (x < mapW - 1 && game.map[y][x+1] === '.') mask |= 2;
                        if (y < mapH - 1 && game.map[y+1][x] === '.') mask |= 4;
                        if (x > 0 && game.map[y][x-1] === '.') mask |= 8;
                        this.drawVacuumAbyss(x, y, mask);
                    } else if (c === ',') {
                        let mask = 0;
                        if (y > 0 && game.map[y-1][x] === ',') mask |= 1;
                        if (x < mapW - 1 && game.map[y][x+1] === ',') mask |= 2;
                        if (y < mapH - 1 && game.map[y+1][x] === ',') mask |= 4;
                        if (x > 0 && game.map[y][x-1] === ',') mask |= 8;
                        this.drawFloor(x, y, ',', mask);
                    } else if (c === '\u03C3') {
                        let mask = 0;
                        const structuralChars = ['#', 'W', 'A', 'I', 'Y', 'f', 'i', 'j', 'k', 'h', 'm', 'G', 'g', 'x', 'q', 'N', '\"', '|', ':', ';', '{', '~', '}', '=', '\u03A3', '\u03C0', '\u03A9'];
                        const isS = (tx, ty) => {
                            if (ty < 0 || ty >= mapH || tx < 0 || tx >= mapW) return false;
                            const nc = game.map[ty][tx];
                            return structuralChars.includes(nc) || nc === '*' || nc === '.';
                        };
                        if (isS(x, y - 1)) mask |= 1;
                        if (isS(x + 1, y)) mask |= 2;
                        if (isS(x, y + 1)) mask |= 4;
                        if (isS(x - 1, y)) mask |= 8;
                        this.drawFloor(x, y, '\u03C3', mask);
                    } else if (c === '\u03C1') {
                        let mask = 0;
                        if (y > 0 && game.map[y-1][x] === '\u03C1') mask |= 1;
                        if (x < mapW - 1 && game.map[y][x+1] === '\u03C1') mask |= 2;
                        if (y < mapH - 1 && game.map[y+1][x] === '\u03C1') mask |= 4;
                        if (x > 0 && game.map[y][x-1] === '\u03C1') mask |= 8;
                        this.drawFloor(x, y, '\u03C1', mask);
                    } else {
                        // Use explicit floor if defined, otherwise default copper floor (' ')
                        const floorChar = ['a', 'b', 'c', 't', 'z', 'o', '&', '\''].includes(c) ? c : ' ';
                        this.drawFloor(x, y, floorChar);
                    }
                }
            }

            // Phase 2: Draw Walls and Ceilings (Structure Layer)
            for (let y = 0; y < mapH; y++) {
                const row = game.map[y];
                for (let x = 0; x < mapW; x++) {
                    const c = row[x];
                    if (c === 'N') {
                        let mask = 0;
                        if (y > 0 && game.map[y - 1][x] === 'N') mask |= 1;
                        if (x < mapW - 1 && game.map[y][x + 1] === 'N') mask |= 2;
                        if (y < mapH - 1 && game.map[y + 1][x] === 'N') mask |= 4;
                        if (x > 0 && game.map[y][x - 1] === 'N') mask |= 8;
                        this.drawOpticalCeiling(x, y, mask);
                    } else if (c === 'Y') {
                        let mask = 0;
                        if (y > 0 && game.map[y - 1][x] === 'Y') mask |= 1;
                        if (x < mapW - 1 && game.map[y][x + 1] === 'Y') mask |= 2;
                        if (y < mapH - 1 && game.map[y + 1][x] === 'Y') mask |= 4;
                        if (x > 0 && game.map[y][x - 1] === 'Y') mask |= 8;
                        this.drawHighTechCeiling(x, y, mask);
                    } else if (c === '=') {
                        let mask = 0;
                        if (y > 0 && game.map[y - 1][x] === '=') mask |= 1;
                        if (x < mapW - 1 && game.map[y][x + 1] === '=') mask |= 2;
                        if (y < mapH - 1 && game.map[y + 1][x] === '=') mask |= 4;
                        if (x > 0 && game.map[y][x - 1] === '=') mask |= 8;
                        this.drawRealityCeiling(x, y, mask);
                    } else if (c === '#') {
                        let mask = 0;
                        if (y > 0 && game.map[y - 1][x] === '#') mask |= 1;
                        if (x < mapW - 1 && game.map[y][x + 1] === '#') mask |= 2;
                        if (y < mapH - 1 && game.map[y + 1][x] === '#') mask |= 4;
                        if (x > 0 && game.map[y][x - 1] === '#') mask |= 8;
                        this.drawBronzeCeiling(x, y, mask);
                    } else if (c === 'A') {
                        let mask = 0;
                        if (y > 0 && game.map[y - 1][x] === 'A') mask |= 1;
                        if (x < mapW - 1 && game.map[y][x + 1] === 'A') mask |= 2;
                        if (y < mapH - 1 && game.map[y + 1][x] === 'A') mask |= 4;
                        if (x > 0 && game.map[y][x - 1] === 'A') mask |= 8;
                        this.drawLabCeiling(x, y, mask);
                    } else if (c === '}') {
                        let mask = 0;
                        if (y > 0 && game.map[y - 1][x] === '}') mask |= 1;
                        if (x < mapW - 1 && game.map[y][x + 1] === '}') mask |= 2;
                        if (y < mapH - 1 && game.map[y + 1][x] === '}') mask |= 4;
                        if (x > 0 && game.map[y][x - 1] === '}') mask |= 8;
                        this.drawLogisticCeiling(x, y, mask);
                    } else if (c === '\u03A9') {
                        let mask = 0;
                        if (y > 0 && game.map[y - 1][x] === '\u03A9') mask |= 1;
                        if (x < mapW - 1 && game.map[y][x + 1] === '\u03A9') mask |= 2;
                        if (y < mapH - 1 && game.map[y + 1][x] === '\u03A9') mask |= 4;
                        if (x > 0 && game.map[y][x - 1] === '\u03A9') mask |= 8;
                        this.drawProcessingCeiling(x, y, mask);
                    } else if (c === '|') {
                        let mask = 0;
                        if (y > 0 && game.map[y - 1][x] === '|') mask |= 1;
                        if (x < mapW - 1 && game.map[y][x + 1] === '|') mask |= 2;
                        if (y < mapH - 1 && game.map[y + 1][x] === '|') mask |= 4;
                        if (x > 0 && game.map[y][x - 1] === '|') mask |= 8;
                        this.drawQuantumCeiling(x, y, mask);
                    } else if (c === 'I' || c === 'x') {
                        this.drawCeiling(x, y, c);
                    } else if (['W', 'f', 'i', 'j', 'k', 'h', 'm', 'g', 'q', '{', '~', ':', ';', '\"', '\u03A3', '\u03C0'].includes(c)) {
                        const seedX = x + (this.levelSeed || 0);
                        const seedY = y + (this.levelSeed || 0);
                        const variant = Math.abs(seedX * 7 + seedY * 31) % 10;
                        
                        // Decide if this wall should be baked or rendered dynamically (animated)
                        const isAnimated = (variant === 7 && (c === 'W' || c === 'f')) || ['i', 'k', 'h', 'm', 'g', 'q', ':', ';', '\u03C0'].includes(c);
                        
                        if (!isAnimated) { 
                            this.drawWallFace(x, y, c);
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error during background baking:", e);
        } finally {
            // ALWAYS restore the main context
            this.ctx = oldCtx;
            // Mark as baked for this specific state
            this.bakedLevelKey = `${game.levelIndex}_${mapW}x${mapH}_${this.levelSeed}`;
        }
    },

    clear() {
        this.ctx.fillStyle = COLORS.bg;
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    },

    lastHP: 0,
    hpFlashTimers: new Array(20).fill(0), // Support up to 5 hearts (20 quarters)
    
    lastScrapCount: 0,
    scrapSlideY: -50,
    scrapDisplayTimer: 0,

    hudEntranceTimer: 0,
    _lastHudLevel: -1,

    drawHUD(game) {
        // --- HP Flash Logic ---
        const currentHP = HPSystem.currentQuarters;
        if (this.lastHP > currentHP) {
            for (let i = currentHP; i < this.lastHP; i++) {
                if (i < this.hpFlashTimers.length) this.hpFlashTimers[i] = 30;
            }
        }
        this.lastHP = currentHP;
        for (let i = 0; i < this.hpFlashTimers.length; i++) {
            if (this.hpFlashTimers[i] > 0) this.hpFlashTimers[i]--;
        }

        // --- Scrap Slide Logic ---
        const currentScrap = game.scrapCollected;
        if (currentScrap > this.lastScrapCount) {
            this.scrapDisplayTimer = 180; // 3 seconds
        }
        this.lastScrapCount = currentScrap;

        if (this.scrapDisplayTimer > 0) {
            this.scrapDisplayTimer--;
            this.scrapSlideY += (35 - this.scrapSlideY) * 0.1;
        } else {
            this.scrapSlideY += (-50 - this.scrapSlideY) * 0.1;
        }

        // --- HUD Entrance Timer ---
        if (this._lastHudLevel !== game.levelIndex) {
            this._lastHudLevel = game.levelIndex;
            this.hudEntranceTimer = 180; // 3 seconds total
        }
        if (this.hudEntranceTimer > 0) this.hudEntranceTimer--;

        // Draw Security Alert Pulse
        if (game.isSecurityAlert) {
            this._drawSecurityAlert(this.ctx, game);
        }
        
        // Draw Result Vignette
        this._drawResultVignette(this.ctx, game);
        
        // --- NEW CMD HUD ---
        const ctx = this.ctx;
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const margin = 40; // Inward margin for hearts

        ctx.save();
        
        // 1. HP Status (Top Left)
        this._drawHearts(ctx, game, 60, 35);

        // 2. Main Info Area (Top Center)
        this._drawCenterInfo(ctx, game, w / 2, 35);

        // 3. Scrap Info (Top Right)
        this._drawTopRightInfo(ctx, game, w - 20, 35);

        ctx.restore();
    },

    _drawCenterInfo(ctx, game, x, y) {
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00ff9f';
        
        // Sequence: 180->60 (Name), 60->30 (Transition), 30->0 (Timer/Amps)

        // 1. Level Name (Top Area)
        if (this.hudEntranceTimer > 30) {
            const outProgress = Math.max(0, Math.min(1, (60 - this.hudEntranceTimer) / 30));
            ctx.save();
            ctx.translate(0, -outProgress * 50);
            ctx.globalAlpha = 1 - outProgress;

            const lvl = LEVELS[game.levelIndex];
            const targetName = (lvl ? lvl.name.toUpperCase() : "LABORATÓRIO");
            const levelNumStr = `NÍVEL ${(game.levelIndex + 1).toString().padStart(2, '0')}`;
            let name = (window.currentDisplayMode === 1) ? targetName : levelNumStr;
            if (window.glitchTimer > 0) name = this.scrambleText(name, window.glitchTimer / 80);
            
            ctx.font = '24px "VT323"';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#00ff9f';
            ctx.fillText(name, x, y);
            ctx.restore();
        }

        // 2. Timer & Amps (Bottom Area)
        if (this.hudEntranceTimer <= 30) {
            const inProgress = Math.max(0, Math.min(1, (30 - this.hudEntranceTimer) / 30));
            ctx.save();
            ctx.translate(0, (1 - inProgress) * -50);
            ctx.globalAlpha = inProgress;

            ctx.font = '20px "VT323"';
            
            // PRE-CALCULATE TOTAL WIDTH
            let timerStr = "";
            let tW = 0;
            if (game.time !== -1) {
                let min = Math.floor(game.time / 60);
                let sec = game.time % 60;
                timerStr = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
                tW = ctx.measureText(timerStr).width + 8; // Including padding
            }

            let ampsLabel = "";
            let alW = 0;
            let totalReq = 0;
            let totalCurrent = 0;
            if (game.targets.length > 0) {
                ampsLabel = (timerStr ? " | AMPS " : "AMPS ");
                alW = ctx.measureText(ampsLabel).width;
                for (const t of game.targets) {
                    totalReq += t.required;
                    const data = game.poweredTargets.get(`${t.x},${t.y}`);
                    totalCurrent += Math.min(t.required, data ? data.charge : 0);
                }
            }
            const barsW = totalReq * 7; // 4px bar + 3px gap
            
            const totalW = tW + alW + barsW;
            let currentX = x - (totalW / 2);

            // DRAW TIMER
            if (timerStr) {
                ctx.fillStyle = '#00ff9f';
                ctx.fillRect(currentX, y - 10, tW, 20); // 20px tall box
                ctx.fillStyle = '#000000';
                ctx.shadowBlur = 0;
                ctx.fillText(timerStr, currentX + 4, y);
                currentX += tW;
            }

            // DRAW AMPS LABEL
            if (ampsLabel) {
                ctx.fillStyle = '#00ff9f';
                ctx.shadowBlur = 8;
                ctx.fillText(ampsLabel, currentX, y);
                currentX += alW;
            }

            // DRAW BARS
            for (let i = 0; i < totalReq; i++) {
                ctx.fillStyle = i < totalCurrent ? '#00ff9f' : '#051a0f';
                ctx.strokeStyle = '#00ff9f';
                ctx.lineWidth = 1;
                
                const bx = currentX + i * 7;
                const by = y - 7;
                ctx.fillRect(bx, by, 5, 14);
                ctx.strokeRect(bx, by, 5, 14);
                
                if (i < totalCurrent) {
                    ctx.save();
                    ctx.globalAlpha = 0.4;
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = '#00ff9f';
                    ctx.fillRect(bx, by, 5, 14);
                    ctx.restore();
                }
            }
            ctx.restore();
        }
        ctx.restore();
    },

    _drawTopRightInfo(ctx, game, x, y) {
        // Scrap (Sliding)
        if (this.scrapSlideY > -45) {
            ctx.save();
            ctx.translate(0, this.scrapSlideY - y);
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.font = '20px "VT323"';
            ctx.fillStyle = '#00ff9f';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#00ff9f';
            
            // Only current total, as requested
            const scrapStr = `${game.scrapCollected}`;
            ctx.fillText(scrapStr, x, y);
            
            // Draw Gear Icon - Aligned slightly lower (+2px) for VT323 visual center
            this._drawGearIcon(ctx, x - ctx.measureText(scrapStr).width - 15, y + 2, 8);
            ctx.restore();
        }
    },

    _drawGearIcon(ctx, x, y, r) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Date.now() * 0.002); // Constant rotation
        
        ctx.strokeStyle = '#00ff9f';
        ctx.lineWidth = 1.5;
        
        // Core
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        
        // Teeth
        for (let i = 0; i < 8; i++) {
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-1.5, -r, 3, r * 0.4);
        }
        
        // Inner hole
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        
        ctx.restore();
    },

    _drawHearts(ctx, game, x, y) {
        const hearts = HPSystem.getHeartStates();
        const spacing = 22;
        
        hearts.forEach((h, i) => {
            this._drawHeart(ctx, x + i * spacing, y, h.fill, h.isBroken, i);
        });
    },

    _drawHeart(ctx, x, y, fill, isBroken, heartIndex) {
        const size = 9;
        ctx.save();
        ctx.translate(x, y);
        
        // Hexagon Path Helper
        const hexPath = (r) => {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        };

        // 1. Outer Edge (Technological Green)
        hexPath(size + 2);
        ctx.strokeStyle = isBroken ? '#441111' : '#00ff9f';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 2. Inner Background
        hexPath(size);
        ctx.fillStyle = '#051a0f';
        ctx.fill();

        // 3. Fill (Fractional - Zelda Style "Pizza Cut")
        if (fill > 0 && !isBroken) {
            ctx.save();
            hexPath(size);
            ctx.clip();
            
            ctx.fillStyle = '#00ff9f';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00ff9f';
            
            // Draw quadrants based on fill count (1-4)
            // Piece 1: Top-Left
            if (fill >= 1) ctx.fillRect(-size, -size, size, size);
            // Piece 2: Top-Right
            if (fill >= 2) ctx.fillRect(0, -size, size, size);
            // Piece 3: Bottom-Left
            if (fill >= 3) ctx.fillRect(-size, 0, size, size);
            // Piece 4: Bottom-Right
            if (fill >= 4) ctx.fillRect(0, 0, size, size);

            // Separators (The "Pizza Cut" lines)
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#051a0f'; // Same as background
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-size, 0); ctx.lineTo(size, 0);
            ctx.moveTo(0, -size); ctx.lineTo(0, size);
            ctx.stroke();
            
            ctx.restore();
        }

        // 4. Flash Effect for lost segments
        if (heartIndex !== undefined) {
            for (let q = 0; q < 4; q++) {
                const globalQ = heartIndex * 4 + q;
                const flashTimer = this.hpFlashTimers[globalQ];
                if (flashTimer > 0) {
                    ctx.save();
                    hexPath(size);
                    ctx.clip();
                    
                    // Each quarter (q=0 is bottom, q=3 is top)
                    // Wait, fill order: q=0 is bottom-most quarter
                    const qHeight = (size * 2) / 4;
                    const qY = size - (q + 1) * qHeight;
                    
                    // Flash color (white or neon red based on timer)
                    ctx.fillStyle = (flashTimer % 4 < 2) ? '#ffffff' : '#ff003c';
                    ctx.globalAlpha = flashTimer / 30;
                    ctx.fillRect(-size, qY, size * 2, qHeight);
                    
                    ctx.restore();
                }
            }
        }

        if (isBroken) {
            ctx.fillStyle = '#ff003c';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("X", 0, 4);
        }

        ctx.restore();
    },

    _drawSecurityAlert(ctx, game) {
        if (!game || game.alertPulse === undefined) return;
        
        const pulse = (Math.sin(game.alertPulse || 0) + 1) / 2;
        let intensity = 0.3 + pulse * 0.4;
        
        if (isNaN(intensity)) intensity = 0.3;
        intensity = Math.max(0, Math.min(1, intensity));

        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        const grad = ctx.createRadialGradient(cx, cy, 50, cx, cy, Math.max(w, h));
        grad.addColorStop(0, `rgba(255, 0, 0, 0)`);
        grad.addColorStop(0.6, `rgba(255, 0, 0, ${intensity * 0.5})`);
        grad.addColorStop(1, `rgba(255, 0, 0, ${intensity})`);
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    },

    _drawResultVignette(ctx, game) {
        let color = null;
        if (game.state === 'GAMEOVER' || game.state === 'REVERSING' || (game.player && game.player.isDead)) color = '255, 0, 30'; // Stronger Red
        if (game.state === 'WINNING' || game.state === 'LEVEL_COMPLETE') color = '0, 255, 65'; // Intense Neon Green

        if (!color) return;

        // Flash Logic: 2 pulses + Quick Fade Out
        const flashDur = 5;
        let intensity = 0;
        
        if (game.resultTimer < flashDur) intensity = 1; // 1st ON
        else if (game.resultTimer < flashDur * 2) intensity = 0; // 1st OFF
        else if (game.resultTimer < flashDur * 3) intensity = 1; // 2nd ON
        else if (game.resultTimer < 30) {
            // Quick Fade Out
            intensity = 1 - (game.resultTimer - flashDur * 3) / (30 - flashDur * 3);
        } else {
            return;
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = intensity * 0.8;

        // Slightly more closed gradient (starts at 180px radius)
        const grad = ctx.createRadialGradient(320, 240, 180, 320, 240, 550);
        grad.addColorStop(0, `rgba(${color}, 0)`);
        grad.addColorStop(0.5, `rgba(${color}, 0.2)`); // Smooth mid-tone
        grad.addColorStop(1, `rgba(${color}, 1)`);
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 560);
        ctx.restore();
    },

    drawBlackout(game) {
        // We still need a local blackoutCtx even if alpha is 0 to satisfy drawDoubleLight,
        // but we only draw the actual overlay if alpha > 0.
        const bctx = this.blackoutCtx;
        const animFrame = window.animFrame || 0;
        const isBlackoutVisible = game.blackoutAlpha > 0;
        
        // Pass 1: Prepare the dark overlay (Only if visible)
        bctx.setTransform(1, 0, 0, 1, 0, 0);
        bctx.globalCompositeOperation = 'source-over';
        bctx.clearRect(0, 0, 640, 480);
        if (isBlackoutVisible) {
            bctx.fillStyle = `rgba(5, 5, 8, ${game.blackoutAlpha})`; 
            bctx.fillRect(0, 0, 640, 480);
        }

        // Prepare for Pass 1 (Punching visibility - World-space)
        bctx.save();
        const sx = game.shakeOffset ? game.shakeOffset.x : 0;
        const sy = game.shakeOffset ? game.shakeOffset.y : 0;
        bctx.translate(-Math.floor(game.camera.x) + sx, -Math.floor(game.camera.y) + sy);
        bctx.globalCompositeOperation = 'destination-out';

        // Prepare for Pass 2 (Colored Additive Glows on main context)
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';

        // Helper to draw both the punch and the glow
        const drawDoubleLight = (x, y, radius, color, punchAlpha = 1.0, glowAlpha = 0.2) => {
            this._drawLight(bctx, x, y, radius, punchAlpha);
            this._drawGlow(this.ctx, x, y, radius * 1.5, color, glowAlpha);
        };

        // 1. Robot Light
        const px = game.player.visualX * 32 + 16;
        const py = game.player.visualY * 32 + 16;
        drawDoubleLight(px, py, 60, '#00f0ff', 1.0, 0.1);

        // 2. Conveyors (Cyan Movement)
        for (const conv of game.conveyors) {
            const isActive = game.isConveyorActive(conv);
            if (!isActive) continue;

            const cx = conv.x * 32 + 16; const cy = conv.y * 32 + 16;
            const dx = (conv.dir === 0 ? 1 : (conv.dir === 2 ? -1 : 0)) * 12;
            const dy = (conv.dir === 1 ? 1 : (conv.dir === 3 ? -1 : 0)) * 12;
            const x1 = cx - dx; const y1 = cy - dy; const x2 = cx + dx; const y2 = cy + dy;
            const offset = (animFrame * 0.1) % 1;

            const gradP = bctx.createLinearGradient(x1, y1, x2, y2);
            gradP.addColorStop(0, 'rgba(255, 255, 255, 0.05)'); gradP.addColorStop(offset, 'rgba(255, 255, 255, 0.3)'); gradP.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
            bctx.lineWidth = 12; bctx.lineCap = 'round'; bctx.strokeStyle = gradP; bctx.beginPath(); bctx.moveTo(x1, y1); bctx.lineTo(x2, y2); bctx.stroke();

            if (isBlackoutVisible) {
                const gradG = this.ctx.createLinearGradient(x1, y1, x2, y2);
                gradG.addColorStop(0, 'rgba(0, 240, 255, 0)'); gradG.addColorStop(offset, 'rgba(0, 240, 255, 0.08)'); gradG.addColorStop(1, 'rgba(0, 240, 255, 0)');
                this.ctx.lineWidth = 16; this.ctx.lineCap = 'round'; this.ctx.strokeStyle = gradG; this.ctx.beginPath(); this.ctx.moveTo(x1, y1); this.ctx.lineTo(x2, y2); this.ctx.stroke();
            }
        }

        // 3. Quantum Floors (Cyan Pulse)
        for (const qf of game.quantumFloors) if (qf.active) {
            const pulse = 20 + 10 * qf.pulseIntensity;
            drawDoubleLight(qf.x * 32 + 16, qf.y * 32 + 16, pulse, '#00f0ff', 0.4, 0.15);
        }

        // 4. Portals
        for (const port of game.portals) {
            drawDoubleLight(port.x * 32 + 16, port.y * 32 + 16, 60, port.color || '#00f0ff', 0.4, 0.3);
        }

        // 5. Charging Stations
        for (const station of game.chargingStations) {
            drawDoubleLight(station.x * 32 + 16, station.y * 32 + 16, 28, '#00f0ff', 0.5, 0.2);
        }

        // 6. Buttons & Gravity Controls
        for (const btn of game.buttons) if (btn.isPressed) {
            drawDoubleLight(btn.x * 32 + 16, btn.y * 32 + 16, 20, '#00f0ff', 0.4, 0.2);
        }
        for (const gb of game.gravityButtons) {
            drawDoubleLight(gb.x * 32 + 16, gb.y * 32 + 16, 24, '#00f0ff', 0.4, 0.2);
        }

        // 7. Broken Doors (Electrical Sparks)
        for (const door of game.doors) if (door.isBroken) {
            const flicker = 0.5 + Math.random() * 0.5;
            drawDoubleLight(door.x * 32 + 16, door.y * 32 + 16, 32 * flicker, '#ffcc00', 0.5 * flicker, 0.4 * flicker);
        }

        // 8. Electrical Network (Pulsing Energy Paths)
        bctx.lineWidth = 10; bctx.lineCap = 'round';
        for (const [key, flow] of game.poweredWires) {
            const [x, y] = key.split(',').map(Number); const cx = x * 32 + 16; const cy = y * 32 + 16;
            const neighbors = [{nx: x+1, ny: y}, {nx: x-1, ny: y}, {nx: x, ny: y+1}, {nx: x, ny: y-1}];
            for (const n of neighbors) if (game.poweredWires.has(`${n.nx},${n.ny}`)) {
                if (n.nx < x || n.ny < y) continue;
                const nx = n.nx * 32 + 16; const ny = n.ny * 32 + 16;
                const pulse = 0.5 + Math.sin(animFrame * 0.1 + (x + y) * 0.5) * 0.3;
                const gradP = bctx.createLinearGradient(cx, cy, nx, ny);
                gradP.addColorStop(0, `rgba(255, 255, 255, ${0.1 * pulse})`); gradP.addColorStop(0.5, `rgba(255, 255, 255, ${0.5 * pulse})`); gradP.addColorStop(1, `rgba(255, 255, 255, ${0.1 * pulse})`);
                bctx.lineWidth = 10; bctx.strokeStyle = gradP; bctx.beginPath(); bctx.moveTo(cx, cy); bctx.lineTo(nx, ny); bctx.stroke();
                const gradG = this.ctx.createLinearGradient(cx, cy, nx, ny);
                gradG.addColorStop(0, `rgba(0, 240, 255, 0)`); gradG.addColorStop(0.5, `rgba(0, 240, 255, ${0.15 * pulse})`); gradG.addColorStop(1, `rgba(0, 240, 255, 0)`);
                this.ctx.lineWidth = 12; this.ctx.strokeStyle = gradG; this.ctx.beginPath(); this.ctx.moveTo(cx, cy); this.ctx.lineTo(nx, ny); this.ctx.stroke();
            }
            drawDoubleLight(cx, cy, 14, '#00f0ff', 0.2, 0.1);
        }

        // 9. Sources (Blue/Red)
        for (const s of game.sources) drawDoubleLight(s.x * 32 + 16, s.y * 32 + 16, 40, '#00f0ff', 0.6, 0.3);
        for (const s of game.redSources) drawDoubleLight(s.x * 32 + 16, s.y * 32 + 16, 40, '#ff3300', 0.6, 0.3);

        // 10. Laser Beams (Purple + Impact Light)
        for (const em of game.emitters) if (em.isActive && em.laserPath) {
            const path = em.laserPath;
            bctx.lineWidth = 14; bctx.lineCap = 'round'; bctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            if (isBlackoutVisible) {
                this.ctx.lineWidth = 20; this.ctx.lineCap = 'round'; this.ctx.strokeStyle = 'rgba(191, 0, 255, 0.15)';
            }
            
            bctx.beginPath(); 
            if (isBlackoutVisible) this.ctx.beginPath();
            
            for (let i = 0; i < path.length; i++) {
                const nx = path[i].x * 32 + 16; const ny = path[i].y * 32 + 16;
                if (i === 0) { 
                    bctx.moveTo(nx, ny); 
                    if (isBlackoutVisible) this.ctx.moveTo(nx, ny); 
                    this._drawLight(bctx, nx, ny, 24); 
                    if (isBlackoutVisible) this._drawGlow(this.ctx, nx, ny, 32, '#bf00ff', 0.4); 
                }
                else { 
                    bctx.lineTo(nx, ny); 
                    if (isBlackoutVisible) this.ctx.lineTo(nx, ny); 
                }
            }
            bctx.stroke(); 
            if (isBlackoutVisible) this.ctx.stroke();
        }

        // 11. Selective Particle Lights (Doors, Laser Impact, Singularity)
        for (const p of this.particles) if (p.hasLight) {
            const size = (p.size || 2) * 5;
            drawDoubleLight(p.x, p.y, size, p.color || '#ffcc00', 0.6, 0.4);
        }

        // 12. Blocks, Targets, etc
        for (const [key, bData] of game.poweredBlocks) if (bData.active && !bData.invalid) { const [x, y] = key.split(',').map(Number); drawDoubleLight(x * 32 + 16, y * 32 + 16, 36, '#00f0ff', 0.5, 0.2); }
        for (const [key, tData] of game.poweredTargets) if (tData.charge > 0) { const [x, y] = key.split(',').map(Number); drawDoubleLight(x * 32 + 16, y * 32 + 16, 48, '#00f0ff', 0.7, 0.4); }
        for (const cat of game.catalysts) if (cat.active) drawDoubleLight(cat.x * 32 + 16, cat.y * 32 + 16, 50, '#00f0ff', 0.6, 0.3);
        for (const station of game.chargingStations) drawDoubleLight(station.x * 32 + 16, station.y * 32 + 16, 28, '#00f0ff', 0.5, 0.2);
        for (const sw of game.singularitySwitchers) {
            const swColor = game.isSolarPhase ? '#ffcc00' : '#bf00ff';
            // Pulsing animation (Breathing effect)
            const frame = game.frame || 0;
            const pulse = 0.6 + Math.sin(frame * 0.08) * 0.4;
            const size = 18 + pulse * 14;
            const alpha = 0.3 * pulse;
            
            // Persistent light
            drawDoubleLight(sw.x * 32 + 16, sw.y * 32 + 16, size, swColor, alpha, alpha * 0.5);
            
            // Dynamic flash (Transitions)
            if (sw.lightningTimer > 0) {
                const flashAlpha = sw.lightningTimer / 30;
                drawDoubleLight(sw.x * 32 + 16, sw.y * 32 + 16, 160, swColor, flashAlpha, flashAlpha * 0.8);
            }
        }

        bctx.restore();
        this.ctx.restore();

        // Final Overlay (Screen-space)
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.drawImage(this.blackoutCanvas, 0, 0);
        this.ctx.restore();
    },

    _drawLight(ctx, x, y, radius, alpha = 1.0) {
        if (!isFinite(x) || !isFinite(y) || !isFinite(radius) || radius <= 0) return;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    },

    _drawGlow(ctx, x, y, radius, color, alpha = 1.0) {
        if (!color || !isFinite(x) || !isFinite(y) || !isFinite(radius) || radius <= 0) return;
        ctx.save();
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        // We use the color string directly and control opacity via globalAlpha
        // This is much safer than parsing hex strings manually
        ctx.globalAlpha = alpha;
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)'); // Transparent
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    /**
     * Scrambles text based on intensity (Crypt effect)
     * Shared logic with Dialogue system but optimized for Canvas
     */
    scrambleText(text, intensity, seed = 0) {
        if (intensity <= 0) return text;
        const symbols = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*()";
        const timeStep = Math.floor(Date.now() / 100);
        let scrambled = "";
        for (let i = 0; i < text.length; i++) {
            if (text[i] === " ") { scrambled += " "; continue; }
            // Deterministic scramble based on time, position (seed), and char index
            const charSeed = (timeStep * (i + 1) + seed) % 1000;
            const rand = (Math.sin(charSeed) * 10000) % 1;
            if (Math.abs(rand) < (0.3 * intensity)) {
                const symIdx = Math.floor(Math.abs(Math.cos(charSeed) * symbols.length));
                scrambled += symbols[symIdx];
            } else {
                scrambled += text[i];
            }
        }
        return scrambled;
    },

    drawFogOfWar(game) {
        if (!game.fogOfWar) return;
        
        const ctx = this.ctx;
        const ts = this.tileSize;
        const startX = Math.floor(game.camera.x / ts);
        const endX = Math.ceil((game.camera.x + 640) / ts);
        const startY = Math.floor(game.camera.y / ts);
        const endY = Math.ceil((game.camera.y + 480) / ts);

        ctx.fillStyle = "#000000";
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (!game.discovered.has(`${x},${y}`)) {
                    ctx.fillRect(x * ts, y * ts, ts, ts);
                }
            }
        }
    }
};
