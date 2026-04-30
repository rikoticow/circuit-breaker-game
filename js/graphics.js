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

    init(canvas) {
        this.ctx = canvas.getContext('2d');
        // Disable smoothing
        this.ctx.imageSmoothingEnabled = false;

        // Create offscreen buffer for permanent trails (performance optimization)
        this.trailCanvas = document.createElement('canvas');
        this.trailCanvas.width = 2000;
        this.trailCanvas.height = 2000;
        this.trailCtx = this.trailCanvas.getContext('2d');

        // Transition Canvas (covers entire UI)
        this.tCanvas = document.getElementById('transitionCanvas');
        if (this.tCanvas) {
            this.tCanvas.width = 640;
            this.tCanvas.height = 560;
            this.tCtx = this.tCanvas.getContext('2d');
        }
    },

    clear() {
        this.ctx.fillStyle = COLORS.bg;
        this.ctx.fillRect(0, 0, 640, 480);
        
        // Draw grid
        this.ctx.strokeStyle = '#004422'; // Lighter green for the floor grid
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let x = 0; x <= 640; x += this.tileSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, 480);
        }
        for (let y = 0; y <= 480; y += this.tileSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(640, y);
        }
        this.ctx.stroke();
    },

    drawHUD(game) {
        // Draw Result Vignette (Red for death/gameOver, Green for win)
        this._drawResultVignette(this.ctx, game);
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
    }
};
