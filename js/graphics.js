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
    coreForbiddenPowered: '#ff003c'
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

    drawStaticBackground(game, startX, endX, startY, endY) {
        const mapH = game.map.length;
        const mapW = game.map[0].length;
        
        // Clamp bounds
        startX = Math.max(0, Math.floor(startX));
        startY = Math.max(0, Math.floor(startY));
        endX = Math.min(mapW, Math.ceil(endX));
        endY = Math.min(mapH, Math.ceil(endY));

        // Draw Floors and Holes (Static Base)
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const c = game.map[y][x];
                if (c === '*') {
                    let mask = 0;
                    if (y > 0 && game.map[y-1][x] === '*') mask |= 1;
                    if (x < mapW - 1 && game.map[y][x+1] === '*') mask |= 2;
                    if (y < mapH - 1 && game.map[y+1][x] === '*') mask |= 4;
                    if (x > 0 && game.map[y][x-1] === '*') mask |= 8;
                    this.drawHole(x, y, mask);
                } else if (c !== '#' && c !== 'W') {
                    this.drawFloor(x, y);
                }
            }
        }

        // Draw Walls and Ceilings (Static Structures)
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const c = game.map[y][x];
                if (c === '#') {
                    this.drawCeiling(x, y);
                } else if (c === 'W') {
                    this.drawWallFace(x, y);
                }
            }
        }
    },

    clear() {
        this.ctx.fillStyle = COLORS.bg;
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    },

    drawHUD(game) {
        // Draw Security Alert Pulse
        if (game.isSecurityAlert) {
            this._drawSecurityAlert(this.ctx, game);
        }
        
        // Draw Result Vignette (Red for death/gameOver, Green for win)
        this._drawResultVignette(this.ctx, game);
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
};
