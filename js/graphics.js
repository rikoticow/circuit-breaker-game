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
        const pulse = (Math.sin(game.alertPulse) + 1) / 2;
        const intensity = 0.15 + pulse * 0.25;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        const grad = ctx.createRadialGradient(320, 240, 100, 320, 240, 500);
        grad.addColorStop(0, `rgba(255, 0, 0, 0)`);
        grad.addColorStop(1, `rgba(255, 0, 0, ${intensity})`);
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 560);
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
        if (!game.isBlackoutActive || game.blackoutAlpha <= 0) return;

        const bctx = this.blackoutCtx;
        bctx.clearRect(0, 0, 640, 480);

        // 1. Darkness Layer
        bctx.globalAlpha = game.blackoutAlpha;
        bctx.fillStyle = 'rgba(5, 5, 8, 0.98)';
        bctx.fillRect(0, 0, 640, 480);

        // 2. Punch Lights (Destination-Out)
        bctx.globalCompositeOperation = 'destination-out';
        bctx.globalAlpha = 1.0;

        bctx.save();
        // Match camera transform
        let sx = 0, sy = 0;
        if (game.screenShakeTimer > 0) {
            const intensity = game.screenShakeTimer * 0.5;
            sx = (Math.random() - 0.5) * intensity;
            sy = (Math.random() - 0.5) * intensity;
        }
        bctx.translate(-Math.floor(game.camera.x) + sx, -Math.floor(game.camera.y) + sy);

        // Player Light (1.5 tile radius approx)
        const px = game.player.visualX * 32 + 16;
        const py = game.player.visualY * 32 + 16;
        this._drawLight(bctx, px, py, 48);

        // Electrical Network Light
        // Wires
        for (const [key, flow] of game.poweredWires) {
            if (flow.color === 'OCEAN' || flow.color === 'CIANO') {
                const [x, y] = key.split(',').map(Number);
                this._drawLight(bctx, x * 32 + 16, y * 32 + 16, 32);
            }
        }
        // Blocks
        for (const [key, bData] of game.poweredBlocks) {
            if (bData.active && !bData.invalid) {
                const [x, y] = key.split(',').map(Number);
                this._drawLight(bctx, x * 32 + 16, y * 32 + 16, 40);
            }
        }
        // Targets/Cores
        for (const [key, tData] of game.poweredTargets) {
            if (tData.charge > 0) {
                const [x, y] = key.split(',').map(Number);
                this._drawLight(bctx, x * 32 + 16, y * 32 + 16, 50);
            }
        }
        // Catalysts
        for (const cat of game.catalysts) {
            if (cat.active) {
                this._drawLight(bctx, cat.x * 32 + 16, cat.y * 32 + 16, 60);
            }
        }

        bctx.restore();
        bctx.globalCompositeOperation = 'source-over';

        // Draw the blackout buffer to the main context
        this.ctx.drawImage(this.blackoutCanvas, 0, 0);
    },

    _drawLight(ctx, x, y, radius) {
        const grad = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
};
