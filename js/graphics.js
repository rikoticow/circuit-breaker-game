/**
 * CIRCUIT BREAKER - Graphics System
 * Handles all Canvas 2D rendering and industrial effects.
 */

const Graphics = {
    canvas: null,
    ctx: null,
    tCanvas: null, // Transition canvas
    tCtx: null,
    trailCanvas: null,
    trailCtx: null,
    tileSize: 32,
    particles: [],
    trails: [],

    init(canvas, tCanvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        if (tCanvas) {
            this.tCanvas = tCanvas;
            this.tCtx = tCanvas.getContext('2d');
        }

        // Offscreen canvas for permanent trails
        this.trailCanvas = document.createElement('canvas');
        this.trailCanvas.width = canvas.width;
        this.trailCanvas.height = canvas.height;
        this.trailCtx = this.trailCanvas.getContext('2d');
    },

    clear() {
        this.ctx.fillStyle = '#050810';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    },

    render(game) {
        this.clear();
        this.ctx.save();
        
        // 1. Camera
        this.ctx.translate(-Math.floor(game.camera.x), -Math.floor(game.camera.y));

        // 2. Pass 1: Floor and Trails
        const h = game.map.length;
        const w = game.map[0].length;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const c = game.map[y][x];
                if (c !== '#' && c !== 'W') {
                    this.drawFloor(x, y);
                }
            }
        }
        this.drawTrails();

        // 3. Pass 2: Static Electronics (Wires, Nodes, Linkables)
        game.wires.forEach(w => {
            const flow = game.poweredWires.get(`${w.x},${w.y}`) || null;
            this.drawWire(w.x, w.y, w.type, flow, game.animFrame || 0);
        });
        game.quantumFloors.forEach(qf => this.drawQuantumFloor(qf.x, qf.y, qf.active, game.animFrame || 0, qf.flashTimer, qf.pulseIntensity, qf.entrySide, qf.whiteGlow));
        game.buttons.forEach(b => this.drawButton(b.x, b.y, b.isPressed, b.isToggle));
        game.purpleButtons.forEach(b => this.drawPurpleButton(b.x, b.y, b.isPressed));
        game.chargingStations.forEach(s => {
            const powered = game.poweredStations.has(`${s.x},${s.y}`);
            this.drawChargingStation(s.x, s.y, powered, game.animFrame || 0);
        });
        game.conveyors.forEach(c => this.drawConveyor(c.x, c.y, c.dir, game.animFrame || 0, c.inDir, c.beltDist, c.beltLength));

        // 4. Pass 3: Walls and Ceilings (Overlays)
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const c = game.map[y][x];
                if (c === '#') this.drawCeiling(x, y);
                else if (c === 'W') this.drawWallFace(x, y);
                if (game.scrapPositions.has(`${x},${y}`)) this.drawScrap(x, y, game.animFrame || 0);
            }
        }
        game.brokenCores.forEach(bc => this.drawBrokenCore(bc.x, bc.y, game.animFrame || 0));

        // 5. Pass 4: Sources and Targets
        game.sources.forEach(s => this.drawCore(s.x, s.y, 'B', true));
        game.redSources.forEach(s => this.drawCore(s.x, s.y, 'X', true));
        game.targets.forEach(t => {
            const d = game.poweredTargets.get(`${t.x},${t.y}`) || { charge: 0, contaminated: false };
            this.drawCore(t.x, t.y, 'T', d.charge >= t.required && !d.contaminated, t.required, d.charge, d.contaminated);
        });

        // 6. Pass 5: Dynamic Blocks
        game.blocks.forEach(b => {
            const power = game.poweredBlocks.get(`${b.x},${b.y}`) || null;
            const dist = Math.sqrt((b.x - b.visualX)**2 + (b.y - b.visualY)**2);
            this.drawBlock(b.visualX, b.visualY, b.visualAngle, power, dist, b.dir);
        });

        // 7. Pass 6: Player / Robot
        if (!game.player.isDead || game.player.deathType !== 'CRUSHED') {
            const vx = game.player.x - game.player.visualX;
            const vy = game.player.y - game.player.visualY;
            this.drawRobot(game.player.visualX, game.player.visualY, game.player.dir, game.animFrame || 0, game.player.visorColor, vx, vy, game.player.isDead, game.player.deathType, game.player.deathTimer, game.player.deathDir);
        }

        // 8. Pass 7: Post-Process (Debris, Particles, Doors)
        game.debris.forEach(p => this.drawDebris(p));
        this.drawParticles();
        game.doors.forEach(d => this.drawDoor(d.x, d.y, d.state, d.error, game.animFrame || 0, d.orientation, d.side, d.visualOpen));

        // Floating info (requirements)
        game.targets.forEach(t => {
            const d = game.poweredTargets.get(`${t.x},${t.y}`) || { charge: 0 };
            this.drawCoreRequirement(t.x, t.y, t.required, d.charge);
        });

        this.ctx.restore();

        // Screen Effects (UI)
        this.drawHUD(game);
        if (game.state === 'REVERSING') this.drawReverseEffect(game.animFrame);
        if (game.transitionState !== 'NONE') this.drawDoorTransition(game, game.transitionProgress);
    },

    drawFloor(x, y) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        
        this.ctx.fillStyle = '#0a0e1a';
        this.ctx.fillRect(px, py, ts, ts);
        
        // Floor tile detail (rivets/scuffs)
        this.ctx.fillStyle = '#1a2233';
        this.ctx.fillRect(px + 4, py + 4, 2, 2);
        this.ctx.fillRect(px + ts - 6, py + 4, 2, 2);
        this.ctx.fillRect(px + 4, py + ts - 6, 2, 2);
        this.ctx.fillRect(px + ts - 6, py + ts - 6, 2, 2);
        
        // Faint grid
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(px, py, ts, ts);
    },

    drawCeiling(x, y) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        this.ctx.fillStyle = '#1c1e22';
        this.ctx.fillRect(px, py, ts, ts);
        this.ctx.fillStyle = '#2d3748';
        this.ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(px, py, ts, ts);
    },

    drawWallFace(x, y) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        const grad = this.ctx.createLinearGradient(px, py, px, py + ts);
        grad.addColorStop(0, '#2d3748');
        grad.addColorStop(1, '#1a202c');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(px, py, ts, ts);
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(px + 2, py, ts - 4, ts);
    },

    drawWire(x, y, type, flowData, frame) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        const cx = px + ts/2;
        const cy = py + ts/2;
        
        // Base wire (Pipe)
        this.ctx.strokeStyle = '#222';
        this.ctx.lineWidth = 10;
        this.ctx.lineCap = 'butt';

        const drawPath = (strokeStyle, width) => {
            this.ctx.strokeStyle = strokeStyle;
            this.ctx.lineWidth = width;
            this.ctx.beginPath();
            if (type === 'H') { this.ctx.moveTo(px, cy); this.ctx.lineTo(px + ts, cy); }
            else if (type === 'V') { this.ctx.moveTo(cx, py); this.ctx.lineTo(cx, py + ts); }
            else if (type === '+') { 
                this.ctx.moveTo(px, cy); this.ctx.lineTo(px + ts, cy); 
                this.ctx.moveTo(cx, py); this.ctx.lineTo(cx, py + ts); 
            }
            else if (type === 'L') { this.ctx.moveTo(px + ts, cy); this.ctx.lineTo(cx, cy); this.ctx.lineTo(cx, py); }
            else if (type === 'J') { this.ctx.moveTo(px, cy); this.ctx.lineTo(cx, cy); this.ctx.lineTo(cx, py); }
            else if (type === 'C') { this.ctx.moveTo(px, cy); this.ctx.lineTo(cx, cy); this.ctx.lineTo(cx, py + ts); }
            else if (type === 'F') { this.ctx.moveTo(px + ts, cy); this.ctx.lineTo(cx, cy); this.ctx.lineTo(cx, py + ts); }
            else if (type === 'u') { this.ctx.moveTo(px, cy); this.ctx.lineTo(px + ts, cy); this.ctx.moveTo(cx, cy); this.ctx.lineTo(cx, py); }
            else if (type === 'd') { this.ctx.moveTo(px, cy); this.ctx.lineTo(px + ts, cy); this.ctx.moveTo(cx, cy); this.ctx.lineTo(cx, py + ts); }
            else if (type === 'l') { this.ctx.moveTo(cx, py); this.ctx.lineTo(cx, py + ts); this.ctx.moveTo(cx, cy); this.ctx.lineTo(px, cy); }
            else if (type === 'r') { this.ctx.moveTo(cx, py); this.ctx.lineTo(cx, py + ts); this.ctx.moveTo(cx, cy); this.ctx.lineTo(px + ts, cy); }
            this.ctx.stroke();
        };

        // Pipe Body
        drawPath('#1a202c', 10);
        drawPath('#2d3748', 6);

        // Energy Flow
        if (flowData) {
            let color = '#0077ff'; // Blue
            if (flowData.color === 'OCEAN') color = '#00f0ff'; // Cyan
            else if (flowData.color === 'RED') color = '#ff003c'; // Red
            else if (flowData.color === 'YELLOW') color = '#ffcc00'; // Warning

            this.ctx.save();
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 8;
            drawPath(color, 3);
            this.ctx.restore();

            // Flow dots
            const t = (frame * 0.05) % 1;
            this.ctx.fillStyle = '#fff';
            // Simple dot for H/V for now
            if (type === 'H') {
                this.ctx.fillRect(px + t * ts, cy - 1, 4, 2);
                this.ctx.fillRect(px + ((t + 0.5) % 1) * ts, cy - 1, 4, 2);
            }
        }
    },

    drawCore(x, y, type, isActive, required = 1, current = 0, isContaminated = false) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        const cx = px + ts/2;
        const cy = py + ts/2;

        // Base Plate
        this.ctx.fillStyle = '#1c1e22';
        this.ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(px + 4, py + 4, ts - 8, ts - 8);

        // Core Housing
        const r = 10;
        this.ctx.fillStyle = '#2d3748';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.ctx.fill();

        // Inner Light
        let color = '#333';
        if (type === 'B') color = '#00f0ff';
        else if (type === 'X') color = '#ff003c';
        else if (type === 'T') {
            if (isContaminated) color = '#ff003c';
            else if (isActive) color = '#00ff9f';
            else color = '#004422';
        }

        if (isActive || type === 'B' || type === 'X') {
            this.ctx.save();
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        } else {
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Progress ring for targets
        if (type === 'T' && required > 1) {
            this.ctx.strokeStyle = '#222';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            this.ctx.stroke();
            
            if (current > 0) {
                this.ctx.strokeStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, 12, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * (current / required)));
                this.ctx.stroke();
            }
        }
    },

    drawChargingStation(x, y, isPowered, frame) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        const cx = px + ts/2;
        const cy = py + ts/2;

        this.ctx.fillStyle = '#2d3748';
        this.ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.strokeRect(px + 6, py + 6, ts - 12, ts - 12);

        // Battery Icon
        this.ctx.fillStyle = isPowered ? '#ffcc00' : '#443300';
        if (isPowered) {
            this.ctx.save();
            this.ctx.shadowColor = '#ffcc00';
            this.ctx.shadowBlur = 10;
        }
        this.ctx.fillRect(cx - 6, cy - 8, 12, 16);
        this.ctx.fillRect(cx - 3, cy - 11, 6, 3);
        
        if (isPowered) {
            // Charge lines animation
            const t = (frame * 0.1) % 1;
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(cx - 4, cy - 6 + t * 12, 8, 2);
            this.ctx.restore();
        }
    },

    drawConveyor(x, y, dir, frame, inDir = null, dist = 0, len = 10) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        const cx = px + ts/2;
        const cy = py + ts/2;

        this.ctx.fillStyle = '#1c1e22';
        this.ctx.fillRect(px, py, ts, ts);

        this.ctx.save();
        this.ctx.translate(cx, cy);
        if (dir === DIRS.UP) this.ctx.rotate(-Math.PI/2);
        if (dir === DIRS.DOWN) this.ctx.rotate(Math.PI/2);
        if (dir === DIRS.LEFT) this.ctx.rotate(Math.PI);

        // Belt Base
        this.ctx.fillStyle = '#2d3748';
        this.ctx.fillRect(-16, -12, 32, 24);
        
        // Moving slats
        const offset = (frame * 1.5) % 16;
        this.ctx.fillStyle = '#1a202c';
        for (let i = -24; i < 24; i += 8) {
            this.ctx.fillRect(i + offset, -10, 4, 20);
        }
        
        this.ctx.restore();

        // Direction indicators (Arrows)
        this.ctx.fillStyle = 'rgba(0, 240, 255, 0.3)';
        const arrowOffset = (frame * 0.5) % 16;
        this.ctx.save();
        this.ctx.translate(cx, cy);
        if (dir === DIRS.UP) this.ctx.rotate(-Math.PI/2);
        if (dir === DIRS.DOWN) this.ctx.rotate(Math.PI/2);
        if (dir === DIRS.LEFT) this.ctx.rotate(Math.PI);
        
        for (let i = -12; i < 12; i += 12) {
            this.ctx.beginPath();
            this.ctx.moveTo(i + arrowOffset - 4, -4);
            this.ctx.lineTo(i + arrowOffset + 4, 0);
            this.ctx.lineTo(i + arrowOffset - 4, 4);
            this.ctx.fill();
        }
        this.ctx.restore();
    },

    drawScrap(x, y, frame) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        const cx = px + ts/2;
        const cy = py + ts/2;

        const bob = Math.sin(frame * 0.1) * 3;
        this.ctx.save();
        this.ctx.translate(cx, cy + bob);
        
        // Shiny metal scrap bits
        const count = 3;
        for (let i = 0; i < count; i++) {
            this.ctx.rotate((Math.PI * 2) / count);
            this.ctx.fillStyle = '#a0aec0';
            this.ctx.fillRect(2, 2, 4, 4);
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(2, 2, 1, 1);
        }
        this.ctx.restore();
    },

    drawBrokenCore(x, y, frame) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        const cx = px + ts/2;
        const cy = py + ts/2;

        this.ctx.fillStyle = '#1c1e22';
        this.ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);
        
        // Cracked glass and sparking core
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.beginPath();
        this.ctx.moveTo(px + 6, py + 6); this.ctx.lineTo(cx, cy); this.ctx.lineTo(px + ts - 6, py + 10);
        this.ctx.stroke();

        if (frame % 30 < 5) {
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(cx + (Math.random()-0.5)*10, cy + (Math.random()-0.5)*10, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    },

    drawRobot(x, y, dir, frame, colorOverride = null, vx = 0, vy = 0, isDead = false, deathType = null, deathTimer = 0, deathDir = {x:0, y:0}) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        const cx = px + ts/2;
        const cy = py + ts/2;

        this.ctx.save();
        this.ctx.translate(cx, cy);

        // Failure variables
        const isCrushed = isDead && deathType === 'CRUSHED';
        const tRaw = deathTimer || 0;
        
        const p = Math.min(tRaw / 35, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        const t = ease * 28;
        const tr = ease * 40;
        
        const bx = isCrushed ? (deathDir ? deathDir.x * t * 1.5 : 0) : 0;
        const by = isCrushed ? (deathDir ? deathDir.y * t * 1.5 : 0) : 0;

        if (!isDead) {
            const speed = Math.sqrt(vx*vx + vy*vy);
            if (speed > 0.05) {
                const stretch = 1 + speed * 0.4;
                const squash = 1 - speed * 0.2;
                if (Math.abs(vx) > Math.abs(vy)) this.ctx.scale(stretch, squash);
                else this.ctx.scale(squash, stretch);
            }
        }
        
        const bodyBob = !isDead ? ((frame % 20 < 10) ? -0.5 : 0.5) : 0;
        const headTremble = !isDead ? (Math.sin(frame * 0.3) * 0.4) : 0;
        
        this.ctx.save();
        this.ctx.translate(bx, by + bodyBob);
        this.ctx.rotate(dir * Math.PI / 2);

        // Treads
        this.ctx.fillStyle = '#4a5568';
        this.ctx.fillRect(-12, 7, 24, 7);
        this.ctx.fillRect(-12, -14, 24, 7);

        // Main Body
        this.ctx.fillStyle = isDead ? '#2a2a2a' : '#dd6b20'; 
        this.ctx.fillRect(-8, -8, 14, 16);
        
        this.ctx.restore();

        // Head
        this.ctx.save();
        this.ctx.translate(bx, by + headTremble); 
        this.ctx.rotate(dir * Math.PI / 2); 

        this.ctx.fillStyle = isDead ? '#2a2a2a' : '#ed8936'; 
        this.ctx.fillRect(-2, -6, 12, 12);
        
        const visorColor = isDead ? '#000' : (colorOverride || '#00f0ff');
        this.ctx.fillStyle = '#1a202c';
        this.ctx.fillRect(4, -4, 8, 8);
        this.ctx.fillStyle = visorColor;
        this.ctx.fillRect(6, -2, 4, 4);
        
        this.ctx.restore();
        this.ctx.restore();
    },

    drawCoreRequirement(x, y, required, current) {
        if (required <= 0) return;
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        const cx = px + ts/2;
        const cy = py + ts/2;

        this.ctx.font = 'bold 18px "VT323", monospace';
        this.ctx.textAlign = 'center';
        const remaining = Math.max(0, required - current);
        const displayVal = remaining.toString();
        const bob = Math.sin(Date.now() / 300) * 3;
        const textY = cy - ts/2 - 15 + bob;

        this.ctx.fillStyle = 'rgba(10, 15, 20, 0.9)';
        const metrics = this.ctx.measureText(displayVal);
        this.ctx.fillRect(cx - metrics.width/2 - 4, textY - 14, metrics.width + 8, 20);
        
        this.ctx.fillStyle = remaining === 0 ? '#00ff9f' : '#fff';
        this.ctx.fillText(displayVal, cx, textY);
    },

    spawnParticle(x, y, color, type = 'spark') {
        const p = {
            x, y,
            vx: type === 'smoke' ? (Math.random() - 0.5) * 0.4 : (Math.random() - 0.5) * 5,
            vy: type === 'smoke' ? -0.2 - Math.random() * 0.3 : (Math.random() - 0.5) * 5,
            life: 1.0,
            color, type,
            size: type === 'smoke' ? 2 + Math.random() * 3 : 4
        };
        this.particles.push(p);
        return p;
    },

    drawParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx; p.y += p.vy;
            p.life -= p.type === 'smoke' ? 0.01 : 0.05;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            if (p.type === 'smoke') {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size * (1 - p.life/2), 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(p.x, p.y, p.size, p.size);
            }
        }
        this.ctx.globalAlpha = 1.0;
    },

    clearTrails() { this.trails = []; this.trailCtx.clearRect(0,0,640,480); },

    spawnTrailSegment(vx, vy, angle) {
        const ts = this.tileSize;
        const cx = vx * ts + ts / 2;
        const cy = vy * ts + ts / 2;
        this.trails.push({ x: cx, y: cy, angle, life: 1.0 });
    },

    drawTrails() {
        this.ctx.save();
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const t = this.trails[i];
            t.life -= 0.005;
            if (t.life <= 0) { this.trails.splice(i, 1); continue; }
            this.ctx.globalAlpha = t.life * 0.3;
            this.ctx.fillStyle = '#1a1510';
            this.ctx.save();
            this.ctx.translate(t.x, t.y);
            this.ctx.rotate(t.angle);
            this.ctx.fillRect(-8, 7, 16, 7);
            this.ctx.fillRect(-8, -14, 16, 7);
            this.ctx.restore();
        }
        this.ctx.restore();
    },

    drawHUD(game) {
        // Red overlay when close to death
        if (game.moves < 10) {
            this.ctx.fillStyle = `rgba(255, 0, 0, ${0.1 * (1 - game.moves/10)})`;
            this.ctx.fillRect(0, 0, 640, 480);
        }
    },

    drawDoorTransition(game, progress) {
        if (!this.tCtx) return;
        this.tCtx.clearRect(0, 0, 640, 560);
        const w = 320;
        const lx = -w + w * progress;
        const rx = 640 - w * progress;
        this.tCtx.fillStyle = '#1c1e22';
        this.tCtx.fillRect(lx, 0, w, 560);
        this.tCtx.fillRect(rx, 0, w, 560);
        this.tCtx.fillStyle = '#00f0ff';
        this.tCtx.font = '32px "VT323"';
        this.tCtx.textAlign = 'center';
        if (progress > 0.8) this.tCtx.fillText(game.transitionLabel, 320, 280);
    },

    drawBlock(x, y, angle, powerData, dist, logicalDir) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        this.ctx.save();
        this.ctx.translate(px + ts/2, py + ts/2);
        this.ctx.rotate(angle);
        this.ctx.fillStyle = '#3a3a4a';
        this.ctx.fillRect(-14, -14, 28, 28);
        this.ctx.fillStyle = powerData && powerData.active ? '#00f0ff' : '#fff';
        this.ctx.beginPath();
        this.ctx.moveTo(-6, -6); this.ctx.lineTo(8, 0); this.ctx.lineTo(-6, 6);
        this.ctx.fill();
        this.ctx.restore();
    },

    drawDebris(p) {
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rot);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-2, -2, 4, 4);
        this.ctx.restore();
    },

    drawReverseEffect(frame) {
        this.ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
        this.ctx.fillRect(0, 0, 640, 480);
    }
};
