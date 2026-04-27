// Procedural Graphics Engine for Circuit Breaker
// Pure Canvas 2D - No external assets

const Graphics = {
    canvas: null,
    ctx: null,
    particles: [],
    trails: [],

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    },

    clear() {
        this.ctx.fillStyle = '#050810';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },

    drawFloor(x, y) {
        const ctx = this.ctx;
        ctx.fillStyle = '#0a0d16';
        ctx.fillRect(x * 32, y * 32, 32, 32);
        ctx.strokeStyle = '#101420';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * 32 + 0.5, y * 32 + 0.5, 31, 31);
        
        // Subtle detail
        ctx.fillStyle = '#0d111d';
        ctx.fillRect(x * 32 + 8, y * 32 + 8, 2, 2);
    },

    drawCeiling(x, y) {
        const ctx = this.ctx;
        const gx = x * 32, gy = y * 32;
        
        // Bronze/Metal panels
        ctx.fillStyle = '#2a1a10';
        ctx.fillRect(gx, gy, 32, 32);
        
        // Texture
        ctx.strokeStyle = '#3a2a1a';
        ctx.strokeRect(gx + 4, gy + 4, 24, 24);
        ctx.strokeRect(gx + 8, gy + 8, 16, 16);
    },

    drawWallFace(x, y) {
        const ctx = this.ctx;
        const gx = x * 32, gy = y * 32;
        ctx.fillStyle = '#151a25';
        ctx.fillRect(gx, gy, 32, 32);
        
        // Vertical pipes/supports
        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(gx + 12, gy, 8, 32);
        ctx.strokeStyle = '#202835';
        ctx.strokeRect(gx + 13, gy, 6, 32);
    },

    drawRobot(x, y, dir, frame, visorColor = null, vx = 0, vy = 0, isDead = false, deathType = null, deathTimer = 0, deathDir = null) {
        const ctx = this.ctx;
        const gx = x * 32 + 16, gy = y * 32 + 16;
        
        ctx.save();
        ctx.translate(gx, gy);

        if (isDead && deathType === 'CRUSH') {
            const scale = Math.max(0, 1 - deathTimer / 30);
            ctx.scale(scale, scale * 0.2); // Squash into floor
            ctx.rotate(deathTimer * 0.1);
        } else if (isDead) {
            ctx.globalAlpha = Math.max(0, 1 - deathTimer / 60);
            ctx.translate(0, -deathTimer * 0.5);
            ctx.rotate(deathTimer * 0.05);
        }

        // Squash & Stretch based on velocity
        const speed = Math.sqrt(vx*vx + vy*vy);
        const stretch = 1 + speed * 0.2;
        const squash = 1 / stretch;
        if (vx !== 0) ctx.scale(stretch, squash);
        else if (vy !== 0) ctx.scale(squash, stretch);

        // Body (Dark Industrial Teal)
        ctx.fillStyle = '#1a2a35';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        
        // Main core
        ctx.beginPath();
        ctx.roundRect(-10, -12, 20, 24, 4);
        ctx.fill();
        ctx.stroke();

        // Visor
        ctx.fillStyle = visorColor || '#00f0ff';
        if (isDead) ctx.fillStyle = '#ff003c';
        
        ctx.beginPath();
        if (dir === 0) ctx.roundRect(2, -6, 6, 4, 1);      // RIGHT
        else if (dir === 2) ctx.roundRect(-8, -6, 6, 4, 1); // LEFT
        else if (dir === 1) ctx.roundRect(-6, -6, 12, 4, 1); // DOWN
        else ctx.roundRect(-6, -8, 12, 2, 1);               // UP
        ctx.fill();

        // Treads (Black)
        ctx.fillStyle = '#050505';
        ctx.fillRect(-12, 6, 24, 6);
        ctx.fillRect(-12, 6, 4, 6);
        ctx.fillRect(8, 6, 4, 6);

        ctx.restore();
    },

    drawWire(x, y, type, flowDirs, frame) {
        const ctx = this.ctx;
        const gx = x * 32, gy = y * 32;
        
        ctx.lineWidth = 6;
        ctx.lineCap = 'butt';
        
        const connections = game.getWireConnections(type);
        
        // 1. Base (Inactive Dark Grey)
        ctx.strokeStyle = '#1a1d25';
        this._drawWireSegments(ctx, gx, gy, connections);

        // 2. Flow (Active Neon Blue/Red)
        if (flowDirs && flowDirs.size > 0) {
            const hasBlue = flowDirs.has('BLUE');
            const hasRed = flowDirs.has('RED');
            
            ctx.lineWidth = 4;
            if (hasBlue && hasRed) {
                // Purple contamination
                ctx.strokeStyle = '#ff00ff';
                ctx.shadowColor = '#ff00ff';
                ctx.shadowBlur = 8;
            } else if (hasRed) {
                ctx.strokeStyle = '#ff003c';
                ctx.shadowColor = '#ff003c';
                ctx.shadowBlur = 8;
            } else {
                ctx.strokeStyle = '#00f0ff';
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 8;
            }
            
            this._drawWireSegments(ctx, gx, gy, connections);
            
            // Traveling pulse
            const pulsePos = (frame % 30) / 30;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 24]);
            ctx.lineDashOffset = -pulsePos * 32;
            this._drawWireSegments(ctx, gx, gy, connections);
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
        }
    },

    _drawWireSegments(ctx, gx, gy, connections) {
        ctx.beginPath();
        for (const d of connections) {
            ctx.moveTo(gx + 16, gy + 16);
            if (d === 0) ctx.lineTo(gx + 32, gy + 16); // R
            if (d === 1) ctx.lineTo(gx + 16, gy + 32); // D
            if (d === 2) ctx.lineTo(gx, gy + 16);      // L
            if (d === 3) ctx.lineTo(gx + 16, gy);      // U
        }
        ctx.stroke();
    },

    drawCore(x, y, type, powered, req = 1, current = 0, contaminated = false) {
        const ctx = this.ctx;
        const gx = x * 32 + 16, gy = y * 32 + 16;
        
        // Base Socket
        ctx.fillStyle = '#0a1018';
        ctx.beginPath();
        ctx.roundRect(gx - 14, gy - 14, 28, 28, 4);
        ctx.fill();
        ctx.strokeStyle = '#1a2535';
        ctx.stroke();

        // Inner Glow
        if (powered && !contaminated) {
            ctx.shadowColor = (type === 'X' || type === '0') ? '#ff003c' : '#00f0ff';
            ctx.shadowBlur = 15;
        } else if (contaminated) {
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 15;
        }

        ctx.fillStyle = powered ? (type === 'X' ? '#ff003c' : '#00f0ff') : '#152030';
        if (contaminated) ctx.fillStyle = '#ff00ff';
        
        ctx.beginPath();
        ctx.arc(gx, gy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Requirement text (drawn separately in main loop to be on top)
    },

    drawCoreRequirement(x, y, req, current) {
        if (req <= 1) return;
        const ctx = this.ctx;
        const gx = x * 32 + 16, gy = y * 32 + 16;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${current}/${req}`, gx, gy + 4);
    },

    drawBrokenCore(x, y, frame) {
        const ctx = this.ctx;
        const gx = x * 32 + 16, gy = y * 32 + 16;
        ctx.fillStyle = '#101520';
        ctx.beginPath(); ctx.arc(gx, gy, 10, 0, Math.PI * 2); ctx.fill();
        
        // Glass shards
        ctx.strokeStyle = '#2a3545';
        ctx.beginPath();
        ctx.moveTo(gx - 8, gy - 8); ctx.lineTo(gx + 4, gy + 4);
        ctx.moveTo(gx + 8, gy - 6); ctx.lineTo(gx - 6, gy + 8);
        ctx.stroke();
    },

    drawBlock(x, y, angle, flowDirs, pushDist = 0, logicalDir = 0) {
        const ctx = this.ctx;
        const gx = x * 32 + 16, gy = y * 32 + 16;
        
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(angle);

        // Body
        ctx.fillStyle = '#202a35';
        ctx.strokeStyle = '#354555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-14, -14, 28, 28, 2);
        ctx.fill();
        ctx.stroke();

        // Arrow indicator
        ctx.fillStyle = (flowDirs && flowDirs.size > 0) ? '#00f0ff' : '#151d25';
        if (flowDirs && flowDirs.has('RED')) ctx.fillStyle = '#ff003c';
        
        ctx.beginPath();
        ctx.moveTo(10, 0); ctx.lineTo(-4, -10); ctx.lineTo(-4, 10);
        ctx.fill();

        ctx.restore();

        // Energy Arcs (If powered)
        if (flowDirs && flowDirs.size > 0) {
            this._drawEnergyLightning(gx, gy, logicalDir, flowDirs);
        }
    },

    _drawEnergyLightning(gx, gy, dir, flowDirs) {
        const ctx = this.ctx;
        const hasRed = flowDirs.has('RED');
        const color = hasRed ? '#ff003c' : '#00f0ff';
        
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        
        let tx = gx, ty = gy;
        if (dir === 0) tx += 32; else if (dir === 2) tx -= 32;
        else if (dir === 1) ty += 32; else ty -= 32;

        ctx.beginPath();
        ctx.moveTo(gx, gy);
        // Jagged line
        let cx = gx, cy = gy;
        const steps = 4;
        for (let i = 1; i <= steps; i++) {
            let px = gx + (tx - gx) * (i / steps);
            let py = gy + (ty - gy) * (i / steps);
            px += (Math.random() - 0.5) * 10;
            py += (Math.random() - 0.5) * 10;
            ctx.lineTo(px, py);
        }
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.shadowBlur = 0;
    },

    drawChargingStation(x, y, powered, frame) {
        const ctx = this.ctx;
        const gx = x * 32, gy = y * 32;
        
        // Floor Plate
        ctx.fillStyle = '#151a25';
        ctx.fillRect(gx + 2, gy + 2, 28, 28);
        ctx.strokeStyle = '#253545';
        ctx.strokeRect(gx + 4, gy + 4, 24, 24);

        // Corner lights
        ctx.fillStyle = powered ? '#00f0ff' : '#202530';
        if (powered) { ctx.shadowBlur = 5; ctx.shadowColor = '#00f0ff'; }
        ctx.fillRect(gx + 4, gy + 4, 4, 4);
        ctx.fillRect(gx + 24, gy + 4, 4, 4);
        ctx.fillRect(gx + 4, gy + 24, 4, 4);
        ctx.fillRect(gx + 24, gy + 24, 4, 4);
        ctx.shadowBlur = 0;
    },

    drawScrap(x, y, frame) {
        const ctx = this.ctx;
        const gx = x * 32 + 16, gy = y * 32 + 16;
        const bounce = Math.sin(frame * 0.1) * 3;
        
        ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 5;
        
        // Hex Nut shape
        ctx.save();
        ctx.translate(gx, gy + bounce);
        ctx.rotate(frame * 0.05);
        ctx.beginPath();
        for(let i=0; i<6; i++) {
            const a = i * Math.PI / 3;
            ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.shadowBlur = 0;
    },

    drawConveyor(x, y, dir, frame, inDir, beltDist, beltLength) {
        const ctx = this.ctx;
        const gx = x * 32, gy = y * 32;
        
        ctx.fillStyle = '#1a1d25';
        ctx.fillRect(gx, gy, 32, 32);

        // Belt side rails
        ctx.fillStyle = '#0d0f14';
        if (dir === 0 || dir === 2) { // Horizontal
            ctx.fillRect(gx, gy + 2, 32, 4);
            ctx.fillRect(gx, gy + 26, 32, 4);
        } else { // Vertical
            ctx.fillRect(gx + 2, gy, 4, 32);
            ctx.fillRect(gx + 26, gy, 4, 32);
        }

        // Moving treads
        ctx.strokeStyle = '#252a35';
        ctx.lineWidth = 2;
        const offset = (frame * 1.5) % 16;
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(gx + 4, gy + 4, 24, 24);
        ctx.clip();
        
        if (dir === 0 || dir === 2) {
            const xOff = dir === 0 ? offset : -offset;
            for (let i = -16; i < 48; i += 8) {
                ctx.moveTo(gx + i + xOff, gy + 4);
                ctx.lineTo(gx + i + xOff, gy + 28);
            }
        } else {
            const yOff = dir === 1 ? offset : -offset;
            for (let i = -16; i < 48; i += 8) {
                ctx.moveTo(gx + 4, gy + i + yOff);
                ctx.lineTo(gx + 28, gy + i + yOff);
            }
        }
        ctx.stroke();
        ctx.restore();
    },

    drawDoor(x, y, state, error, frame, orientation, side, visualOpen = 0) {
        const ctx = this.ctx;
        const gx = x * 32, gy = y * 32;

        // Frame
        ctx.fillStyle = '#151a25';
        ctx.fillRect(gx, gy, 32, 32);
        
        // Hazard stripes (Yellow/Black)
        ctx.save();
        ctx.beginPath(); ctx.rect(gx, gy, 32, 32); ctx.clip();
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#ffaa00';
        for (let i = -40; i < 80; i += 16) {
            ctx.fillRect(i, -40, 8, 120);
        }
        ctx.restore();

        // Sliding door panels
        ctx.fillStyle = error ? '#501010' : '#253045';
        ctx.strokeStyle = error ? '#ff003c' : '#456085';
        ctx.lineWidth = 2;
        
        const openDist = visualOpen * 14;
        
        if (orientation === 'V') {
            ctx.fillRect(gx + 4, gy + 2, 12 - openDist, 28); // Left panel
            ctx.strokeRect(gx + 4, gy + 2, 12 - openDist, 28);
            ctx.fillRect(gx + 16 + openDist, gy + 2, 12 - openDist, 28); // Right panel
            ctx.strokeRect(gx + 16 + openDist, gy + 2, 12 - openDist, 28);
        } else {
            ctx.fillRect(gx + 2, gy + 4, 28, 12 - openDist); // Top
            ctx.strokeRect(gx + 2, gy + 4, 28, 12 - openDist);
            ctx.fillRect(gx + 2, gy + 16 + openDist, 28, 12 - openDist); // Bottom
            ctx.strokeRect(gx + 2, gy + 16 + openDist, 28, 12 - openDist);
        }
    },

    drawButton(x, y, pressed, isToggle) {
        const ctx = this.ctx;
        const gx = x * 32 + 16, gy = y * 32 + 16;
        
        // Plate
        ctx.fillStyle = '#1a202a';
        ctx.fillRect(gx - 12, gy - 12, 24, 24);
        ctx.strokeStyle = '#354555';
        ctx.strokeRect(gx - 12, gy - 12, 24, 24);

        // Circular Button
        ctx.fillStyle = pressed ? '#00ff9f' : (isToggle ? '#006644' : '#004433');
        if (pressed) { ctx.shadowBlur = 10; ctx.shadowColor = '#00ff9f'; }
        ctx.beginPath();
        ctx.arc(gx, gy, pressed ? 7 : 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    },

    drawPurpleButton(x, y, pressed, isToggle) {
        const ctx = this.ctx;
        const gx = x * 32 + 16, gy = y * 32 + 16;
        
        // Plate
        ctx.fillStyle = '#1a202a';
        ctx.fillRect(gx - 12, gy - 12, 24, 24);
        ctx.strokeStyle = '#354555';
        ctx.strokeRect(gx - 12, gy - 12, 24, 24);

        // Circular Button
        ctx.fillStyle = pressed ? '#ff00ff' : '#660066';
        if (pressed) { ctx.shadowBlur = 10; ctx.shadowColor = '#ff00ff'; }
        ctx.beginPath();
        ctx.arc(gx, gy, pressed ? 7 : 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    },

    drawQuantumFloor(x, y, active, frame, flashTimer = 0, pulseIntensity = 1, entrySide = null, whiteGlow = 0) {
        const ctx = this.ctx;
        const gx = x * 32, gy = y * 32;

        // Base color (Deep dark purple/blue)
        ctx.fillStyle = active ? '#0c051a' : '#050810';
        ctx.fillRect(gx, gy, 32, 32);

        if (active) {
            // Quantum noise/stars
            const seed = (x * 7 + y * 13);
            for (let i = 0; i < 4; i++) {
                const px = ((seed * (i + 1) + frame * 0.2) % 32);
                const py = ((seed * (i + 5) + frame * 0.1) % 32);
                ctx.fillStyle = `rgba(160, 100, 255, ${0.3 * pulseIntensity})`;
                ctx.fillRect(gx + px, gy + py, 1, 1);
            }

            // Grid glow
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 * pulseIntensity})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(gx + 0.5, gy + 0.5, 31, 31);
        }

        // White flash/glow effect
        if (whiteGlow > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${whiteGlow * 0.6})`;
            ctx.fillRect(gx, gy, 32, 32);
        }
    },

    drawHUD(game) {
        // CRT Scanlines & Vignette are handled in index.css / DOM for performance
        // But we can draw some vector UI elements here if needed
    },

    drawDoorTransition(game, progress) {
        const ctx = this.ctx;
        const W = 640, H = 480;
        
        ctx.save();
        // Heavy blast doors closing from left and right
        const doorW = (W / 2) * progress;
        
        ctx.fillStyle = '#1a202a';
        ctx.strokeStyle = '#354555';
        ctx.lineWidth = 4;
        
        // Left Door
        ctx.fillRect(0, 0, doorW, H);
        ctx.strokeRect(-2, -2, doorW + 2, H + 4);
        
        // Right Door
        ctx.fillRect(W - doorW, 0, doorW, H);
        ctx.strokeRect(W - doorW, -2, doorW + 2, H + 4);

        // Center "Lock" line glow
        if (progress > 0.95) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f0ff';
            ctx.strokeStyle = '#00f0ff';
            ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Door Label
        if (progress > 0.5) {
            ctx.globalAlpha = (progress - 0.5) * 2;
            ctx.font = 'bold 32px "VT323", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#00f0ff';
            ctx.fillText(game.transitionLabel, W/2, H/2);
            
            ctx.font = '16px "VT323", monospace';
            ctx.fillText("ESTABELECENDO CONEXÃO QUANTICA...", W/2, H/2 + 40);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    },

    drawReverseEffect(frame) {
        const ctx = this.ctx;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(frame * 0.5)) * 0.2})`;
        ctx.fillRect(0, 0, 640, 480);
    },

    drawVHSEffect() {
        const ctx = this.ctx;
        // Tracking lines
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        const y = (Date.now() * 0.2) % 480;
        ctx.fillRect(0, y, 640, 2);
        ctx.fillRect(0, (y + 100) % 480, 640, 1);
    },

    spawnSparks(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x, y, 
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 1.0,
                color: color || '#00f0ff'
            });
        }
    },

    spawnExplosion(x, y, color) {
        for (let i = 0; i < 24; i++) {
            this.particles.push({
                x, y, 
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 1.5,
                color: color || '#fff'
            });
        }
    },

    drawParticles() {
        const ctx = this.ctx;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 2, 2);
        }
        ctx.globalAlpha = 1;
    },

    clearParticles() { this.particles = []; },

    drawDebris(p) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = '#1a2a35';
        ctx.strokeStyle = '#354555';
        ctx.lineWidth = 1;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.strokeRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
    },

    addTrail(x, y, dir) {
        this.trails.push({ x, y, dir, life: 1.0 });
        if (this.trails.length > 40) this.trails.shift();
    },

    drawTrails() {
        const ctx = this.ctx;
        ctx.save();
        for (const t of this.trails) {
            ctx.globalAlpha = t.life * 0.3;
            ctx.fillStyle = '#000';
            const gx = t.x * 32 + 4, gy = t.y * 32 + 4;
            if (t.dir === 0 || t.dir === 2) ctx.fillRect(gx, gy + 4, 24, 16);
            else ctx.fillRect(gx + 4, gy, 16, 24);
        }
        ctx.restore();
    },

    clearTrails() { this.trails = []; }
};

window.Graphics = Graphics;