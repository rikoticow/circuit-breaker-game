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

    drawFloor(x, y) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // Base Tile Color (Slightly lighter bronze/brown)
        this.ctx.fillStyle = '#261e1b';
        this.ctx.fillRect(px, py, ts, ts);

        // Suble Border/Bevel (Brighter copper highlight)
        this.ctx.strokeStyle = '#3d302a';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(px + 1, py + 1, ts - 2, ts - 2);

        // Rivets in corners (More visible copper)
        this.ctx.fillStyle = '#4a3a34';
        const rs = 2; // Rivet size
        this.ctx.fillRect(px + 4, py + 4, rs, rs);
        this.ctx.fillRect(px + ts - 6, py + 4, rs, rs);
        this.ctx.fillRect(px + 4, py + ts - 6, rs, rs);
        this.ctx.fillRect(px + ts - 6, py + ts - 6, rs, rs);
        
        // Subtle diagonal texture
        this.ctx.strokeStyle = 'rgba(255, 150, 100, 0.02)';
        this.ctx.beginPath();
        this.ctx.moveTo(px + 5, py + 5);
        this.ctx.lineTo(px + ts - 5, py + ts - 5);
        this.ctx.stroke();
    },

    drawCeiling(x, y) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // Base dark metal
        this.ctx.fillStyle = '#1c1c24';
        this.ctx.fillRect(px, py, ts, ts);
        
        // Inner tile border (Bevel)
        this.ctx.fillStyle = '#2d2d3b';
        this.ctx.fillRect(px, py, ts, 2); // Top
        this.ctx.fillRect(px, py, 2, ts); // Left
        
        // Shadows
        this.ctx.fillStyle = '#0f0f14';
        this.ctx.fillRect(px, py + ts - 2, ts, 2); // Bottom
        this.ctx.fillRect(px + ts - 2, py, 2, ts); // Right
        
        // Small rivet in center
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(px + ts/2 - 2, py + ts/2 - 2, 4, 4);
    },

    drawConveyor(x, y, dir, frame, inDir = null, beltDist = 0, beltLength = 10, isActive = true) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        
        // 1. BASE (Belt track)
        this.ctx.fillStyle = isActive ? '#222831' : '#1a1e24';
        this.ctx.fillRect(px, py, ts, ts);
        
        // 2. Animated Belt Texture (Lines moving)
        this.ctx.strokeStyle = isActive ? '#393e46' : '#22262b';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        const offset = isActive ? ((frame * 0.8) % 12) : 0;
        
        const isCorner = inDir !== null && inDir !== dir;

        if (!isCorner) {
            // Straight belt logic
            if (dir === DIRS.LEFT || dir === DIRS.RIGHT) {
                for (let i = -12; i < ts + 12; i += 12) {
                    const ox = i + (dir === DIRS.RIGHT ? offset : -offset);
                    if (ox >= 0 && ox <= ts) {
                        this.ctx.moveTo(px + ox, py + 4);
                        this.ctx.lineTo(px + ox, py + ts - 4);
                    }
                }
            } else {
                for (let i = -12; i < ts + 12; i += 12) {
                    const oy = i + (dir === DIRS.DOWN ? offset : -offset);
                    if (oy >= 0 && oy <= ts) {
                        this.ctx.moveTo(px + 4, py + oy);
                        this.ctx.lineTo(px + ts - 4, py + oy);
                    }
                }
            }
        } else {
            // Corner logic (Curved lines)
            this.ctx.save();
            this.ctx.translate(px + ts/2, py + ts/2);
            
            // 8-Case Matrix for Corners
            if (inDir === DIRS.RIGHT && dir === DIRS.DOWN) { /* No rot */ }
            else if (inDir === DIRS.DOWN && dir === DIRS.LEFT) this.ctx.rotate(Math.PI/2);
            else if (inDir === DIRS.LEFT && dir === DIRS.UP) this.ctx.rotate(Math.PI);
            else if (inDir === DIRS.UP && dir === DIRS.RIGHT) this.ctx.rotate(-Math.PI/2);
            else if (inDir === DIRS.RIGHT && dir === DIRS.UP) this.ctx.scale(1, -1);
            else if (inDir === DIRS.UP && dir === DIRS.LEFT) { this.ctx.rotate(-Math.PI/2); this.ctx.scale(1, -1); }
            else if (inDir === DIRS.LEFT && dir === DIRS.DOWN) { this.ctx.rotate(Math.PI); this.ctx.scale(1, -1); }
            else if (inDir === DIRS.DOWN && dir === DIRS.RIGHT) { this.ctx.rotate(Math.PI/2); this.ctx.scale(1, -1); }

            // Animate corner using line dash offset
            if (isActive) {
                this.ctx.setLineDash([4, 8]);
                this.ctx.lineDashOffset = (frame * 0.8);
            }

            for (let r = 8; r < ts; r += 10) {
                this.ctx.beginPath();
                this.ctx.arc(-ts/2, ts/2, r, -Math.PI/2, 0);
                this.ctx.stroke();
            }
            this.ctx.setLineDash([]); // Reset
            this.ctx.restore();
        }
        this.ctx.stroke();

        // 3. Side Rails
        this.ctx.fillStyle = isActive ? '#3a4452' : '#2a3442';
        if (!isCorner) {
            if (dir === DIRS.LEFT || dir === DIRS.RIGHT) {
                this.ctx.fillRect(px, py, ts, 4); 
                this.ctx.fillRect(px, py + ts - 4, ts, 4);
            } else {
                this.ctx.fillRect(px, py, 4, ts);
                this.ctx.fillRect(px + ts - 4, py, 4, ts);
            }
        } else {
            this.ctx.save();
            this.ctx.translate(px + ts/2, py + ts/2);
            if (inDir === DIRS.RIGHT && dir === DIRS.DOWN) { /* No rot */ }
            else if (inDir === DIRS.DOWN && dir === DIRS.LEFT) this.ctx.rotate(Math.PI/2);
            else if (inDir === DIRS.LEFT && dir === DIRS.UP) this.ctx.rotate(Math.PI);
            else if (inDir === DIRS.UP && dir === DIRS.RIGHT) this.ctx.rotate(-Math.PI/2);
            else if (inDir === DIRS.RIGHT && dir === DIRS.UP) this.ctx.scale(1, -1);
            else if (inDir === DIRS.UP && dir === DIRS.LEFT) { this.ctx.rotate(-Math.PI/2); this.ctx.scale(1, -1); }
            else if (inDir === DIRS.LEFT && dir === DIRS.DOWN) { this.ctx.rotate(Math.PI); this.ctx.scale(1, -1); }
            else if (inDir === DIRS.DOWN && dir === DIRS.RIGHT) { this.ctx.rotate(Math.PI/2); this.ctx.scale(1, -1); }
            this.ctx.strokeStyle = isActive ? '#3a4452' : '#2a3442';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.arc(-ts/2, ts/2, ts - 2, -Math.PI/2, 0);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.arc(-ts/2, ts/2, 2, -Math.PI/2, 0);
            this.ctx.stroke();
            this.ctx.restore();
        }

        // 4. Directional Arrows (Single Tile-by-Tile 'Ping' Animation)
        this.ctx.save();
        this.ctx.translate(px + ts/2, py + ts/2);

        if (isActive) {
            this.ctx.fillStyle = '#00f0ff';
            this.ctx.shadowColor = '#00f0ff';
            this.ctx.shadowBlur = 8;

            // Dynamic cycle based on actual belt length + a small pause
            const cycleLength = beltLength || 10;
            const pauseLength = Math.max(4, Math.floor(cycleLength * 0.3)); 
            const totalCycle = cycleLength + pauseLength;
            
            const speed = 0.05 + (cycleLength * 0.005);
            const pingPos = ((frame * speed) % totalCycle) - 2.0; 
            
            this.ctx.globalAlpha = 0;
            if (frame === -1) {
                this.ctx.globalAlpha = 0.9;
            } else if (pingPos < cycleLength + 2) { 
                let d = Math.abs(pingPos - beltDist);
                if (inDir !== null && d > totalCycle / 2) d = Math.abs(d - totalCycle);
                this.ctx.globalAlpha = Math.max(0, 1.0 - d * 0.45) * 0.9;
            }
        } else {
            // COMPLETELY HIDE ARROWS WHEN OFF
            this.ctx.globalAlpha = 0;
        }

        if (isCorner) {
            if (inDir === DIRS.RIGHT && dir === DIRS.DOWN) { /* No rot */ }
            else if (inDir === DIRS.DOWN && dir === DIRS.LEFT) this.ctx.rotate(Math.PI/2);
            else if (inDir === DIRS.LEFT && dir === DIRS.UP) this.ctx.rotate(Math.PI);
            else if (inDir === DIRS.UP && dir === DIRS.RIGHT) this.ctx.rotate(-Math.PI/2);
            else if (inDir === DIRS.RIGHT && dir === DIRS.UP) this.ctx.scale(1, -1);
            else if (inDir === DIRS.UP && dir === DIRS.LEFT) { this.ctx.rotate(-Math.PI/2); this.ctx.scale(1, -1); }
            else if (inDir === DIRS.LEFT && dir === DIRS.DOWN) { this.ctx.rotate(Math.PI); this.ctx.scale(1, -1); }
            else if (inDir === DIRS.DOWN && dir === DIRS.RIGHT) { this.ctx.rotate(Math.PI/2); this.ctx.scale(1, -1); }

            this.ctx.translate(-ts/2, ts/2);
            this.ctx.rotate(-Math.PI/4); // 45 degrees
            this.ctx.translate(ts/2, 0); 
            this.ctx.rotate(Math.PI/2); // Tangent
        } else {
            if (dir === DIRS.DOWN) this.ctx.rotate(Math.PI/2);
            else if (dir === DIRS.LEFT) this.ctx.rotate(Math.PI);
            else if (dir === DIRS.UP) this.ctx.rotate(-Math.PI/2);
        }
        
        this.ctx.beginPath();
        this.ctx.moveTo(-3, -4);
        this.ctx.lineTo(3, 0);
        this.ctx.lineTo(-3, 4);
        this.ctx.fill();
        
        this.ctx.restore();
    },

    drawWallFace(x, y) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        
        // Seeded variant based on position
        const variant = Math.abs(x * 7 + y * 31) % 10;

        // 1. BASE BACKGROUND (Dark industrial metal)
        this.ctx.fillStyle = '#1c1c24';
        this.ctx.fillRect(px, py, ts, ts);
        
        // 2. INNER PANEL BEVEL
        this.ctx.fillStyle = '#2d2d3b';
        this.ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
        
        // 3. VARIANT SPECIFIC LAYER
        if (variant === 6) { 
            // CHAOTIC/DESTROYED WIRES (Loose and Messy)
            this.ctx.fillStyle = '#0a0a0f';
            this.ctx.fillRect(px + 4, py, ts - 8, 4);

            const drawChaoticWire = (color, startX, segments) => {
                // Shadow
                this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(px + startX, py);
                segments.forEach(s => this.ctx.lineTo(px + s.x, py + s.y));
                this.ctx.stroke();
                // Wire Core
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(px + startX, py);
                segments.forEach(s => this.ctx.lineTo(px + s.x, py + s.y));
                this.ctx.stroke();
                
                // Frayed end (Small gray tip)
                const last = segments[segments.length - 1];
                this.ctx.fillStyle = '#888';
                this.ctx.fillRect(px + last.x - 1, py + last.y, 2, 2);
            };

            // Red Wire (Short, cut)
            drawChaoticWire('#ff3344', 6, [{x:10, y:8}, {x:5, y:18}]);
            
            // Green Wire (Long, dangling)
            drawChaoticWire('#00ff88', 16, [{x:12, y:12}, {x:20, y:20}, {x:14, y:30}]);
            
            // Blue Wire (Jagged mess)
            drawChaoticWire('#0099ff', 24, [{x:28, y:10}, {x:22, y:14}, {x:26, y:24}]);

            // Random copper bits
            this.ctx.fillStyle = '#b87333';
            this.ctx.fillRect(px + 14, py + 12, 1, 1);
            this.ctx.fillRect(px + 22, py + 18, 1, 1);
        }
 else if (variant === 7) {
            // COMPUTER/TERMINAL (High Detail)
            // 1. Screen Area
            this.ctx.fillStyle = '#111';
            this.ctx.fillRect(px+4, py+4, ts-8, 14);
            // Green CRT Screen
            this.ctx.fillStyle = '#004400';
            this.ctx.fillRect(px+6, py+6, ts-12, 10);
            
            // Scanlines/Data
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            this.ctx.fillRect(px+8, py+8, 8, 1);
            this.ctx.fillRect(px+12, py+10, 10, 1);
            
            // 2. Control Panel (Middle)
            this.ctx.fillStyle = '#222';
            this.ctx.fillRect(px+4, py+18, ts-8, 6);
            this.ctx.fillStyle = '#444';
            for(let i=0; i<3; i++) {
                this.ctx.fillRect(px+8+i*7, py+20, 5, 2);
            }

            // 3. Server Grid (Bottom)
            this.ctx.fillStyle = '#0a0a0f';
            this.ctx.fillRect(px+4, py+24, ts-8, 6);
            this.ctx.strokeStyle = '#222';
            for(let i=0; i<3; i++) {
                this.ctx.beginPath(); this.ctx.moveTo(px+6, py+25+i*2); this.ctx.lineTo(px+ts-6, py+25+i*2); this.ctx.stroke();
            }

            // 4. LEDs
            if (Math.sin(Date.now() * 0.005) > 0) {
                this.ctx.fillStyle = '#ffcc00';
                this.ctx.fillRect(px+ts-10, py+8, 2, 2);
            }
            if (Math.sin(Date.now() * 0.007 + 1) > 0) {
                this.ctx.fillStyle = '#00ff88';
                this.ctx.fillRect(px+ts-8, py+20, 2, 2);
            }
        } else if (variant >= 8) {
            // BROKEN/EXPOSED (High Detail 3D Depth)
            // 1. Deep Hole Base
            this.ctx.fillStyle = '#050508'; 
            this.ctx.beginPath();
            this.ctx.moveTo(px+4, py+4); this.ctx.lineTo(px+ts-6, py+6); this.ctx.lineTo(px+ts-4, py+ts-6); this.ctx.lineTo(px+6, py+ts-8);
            this.ctx.fill();

            // 2. Inner Rim Highlight (The "Thickness" of the wall)
            this.ctx.strokeStyle = '#3a3a4a';
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.moveTo(px+4, py+4); this.ctx.lineTo(px+ts-6, py+6); this.ctx.lineTo(px+ts-4, py+ts-6); this.ctx.lineTo(px+6, py+ts-8);
            this.ctx.closePath();
            this.ctx.stroke();

            // 3. Exposed Internals (Metal Rebars)
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath(); this.ctx.moveTo(px+10, py+5); this.ctx.lineTo(px+10, py+26); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(px+22, py+6); this.ctx.lineTo(px+20, py+25); this.ctx.stroke();
            
            // Rebar highlights
            this.ctx.strokeStyle = '#444';
            this.ctx.beginPath(); this.ctx.moveTo(px+10.5, py+5); this.ctx.lineTo(px+10.5, py+26); this.ctx.stroke();

            // 4. Loose internal wires
            this.ctx.lineWidth = 1;
            this.ctx.strokeStyle = '#ff4444'; // Red
            this.ctx.beginPath(); this.ctx.moveTo(px+6, py+10); this.ctx.quadraticCurveTo(px+12, py+15, px+7, py+22); this.ctx.stroke();
            this.ctx.strokeStyle = '#00ff88'; // Green
            this.ctx.beginPath(); this.ctx.moveTo(px+ts-7, py+8); this.ctx.quadraticCurveTo(px+ts-14, py+14, px+ts-10, py+25); this.ctx.stroke();

            // 5. Debris at the bottom
            this.ctx.fillStyle = '#111';
            this.ctx.fillRect(px+8, py+ts-8, 4, 2);
            this.ctx.fillRect(px+18, py+ts-10, 3, 2);
        }
 else {
            // CLEAN PLATES (Rivets)
            this.ctx.fillStyle = '#3a3a4a';
            const rs = 2;
            this.ctx.fillRect(px+4, py+4, rs, rs);
            this.ctx.fillRect(px+ts-6, py+4, rs, rs);
            this.ctx.fillRect(px+4, py+ts-6, rs, rs);
            this.ctx.fillRect(px+ts-6, py+ts-6, rs, rs);
        }

        // 4. OUTER SHADOW (Bottom)
        this.ctx.fillStyle = '#11111a';
        this.ctx.fillRect(px, py + ts - 2, ts, 2);
    },

    drawWire(x, y, type, flowData, time) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        const hc = px + ts/2;
        const vc = py + ts/2;
        const w = 12; // Thicker pipe inner
        const hw = w/2;
        
        const isPowered = flowData !== null;
        let color = '#ff6a00';
        let borderColor = '#883300';
        
        if (isPowered) {
            if (flowData.color === 'RED') {
                color = '#ff003c';
                borderColor = '#880011';
            } else if (flowData.color === 'YELLOW') {
                color = '#ffff00';
                borderColor = '#888800';
            } else if (flowData.color === 'OCEAN') {
                color = '#00f0ff'; // Cyan for Validated
                borderColor = '#005588';
            } else {
                color = '#0077ff'; // Ocean Blue for Just Energized
                borderColor = '#003366';
            }
        }
        
        const flowDirs = isPowered ? flowData.dirs : [];

        const connections = game.getWireConnections(type);

        // Draw Outer Border (Black outline)
        this.ctx.fillStyle = '#000';
        const bw = w + 8; // Border width
        const hbw = bw/2;
        
        this.ctx.beginPath();
        this.ctx.arc(hc, vc, hbw, 0, Math.PI * 2);
        this.ctx.fill();
        if (connections.includes(DIRS.UP)) this.ctx.fillRect(hc - hbw, py, bw, ts/2);
        if (connections.includes(DIRS.DOWN)) this.ctx.fillRect(hc - hbw, vc, bw, ts/2);
        if (connections.includes(DIRS.LEFT)) this.ctx.fillRect(px, vc - hbw, ts/2, bw);
        if (connections.includes(DIRS.RIGHT)) this.ctx.fillRect(hc, vc - hbw, ts/2, bw);

        // Draw Main Pipe Body
        this.ctx.fillStyle = borderColor;
        const ow = w + 4; 
        const ohw = ow/2;
        
        this.ctx.beginPath();
        this.ctx.arc(hc, vc, ohw, 0, Math.PI * 2);
        this.ctx.fill();
        if (connections.includes(DIRS.UP)) this.ctx.fillRect(hc - ohw, py, ow, ts/2);
        if (connections.includes(DIRS.DOWN)) this.ctx.fillRect(hc - ohw, vc, ow, ts/2);
        if (connections.includes(DIRS.LEFT)) this.ctx.fillRect(px, vc - ohw, ts/2, ow);
        if (connections.includes(DIRS.RIGHT)) this.ctx.fillRect(hc, vc - ohw, ts/2, ow);

        // Draw Inner Core
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(hc, vc, hw, 0, Math.PI * 2);
        this.ctx.fill();
        if (connections.includes(DIRS.UP)) this.ctx.fillRect(hc - hw, py, w, ts/2);
        if (connections.includes(DIRS.DOWN)) this.ctx.fillRect(hc - hw, vc, w, ts/2);
        if (connections.includes(DIRS.LEFT)) this.ctx.fillRect(px, vc - hw, ts/2, w);
        if (connections.includes(DIRS.RIGHT)) this.ctx.fillRect(hc, vc - hw, ts/2, w);

        // Draw Central Highlight Strip (The "Liquid" look)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        const sw = 4;
        const hsw = sw/2;
        if (connections.includes(DIRS.UP)) this.ctx.fillRect(hc - hsw, py, sw, ts/2);
        if (connections.includes(DIRS.DOWN)) this.ctx.fillRect(hc - hsw, vc, sw, ts/2);
        if (connections.includes(DIRS.LEFT)) this.ctx.fillRect(px, vc - hsw, ts/2, sw);
        if (connections.includes(DIRS.RIGHT)) this.ctx.fillRect(hc, vc - hsw, ts/2, sw);

        // Draw flowing arrows
        if (isPowered) {
            this.ctx.fillStyle = '#ffffff';
            const entries = flowData.entries || [];
            const exits = flowData.dirs || [];
            
            // Draw arrows for each path segment
            const drawArrowAt = (d, isIncoming) => {
                for (let i = 0; i < 2; i++) {
                    this.ctx.save();
                    this.ctx.translate(hc, vc);
                    
                    if (d === DIRS.UP) this.ctx.rotate(-Math.PI/2);
                    else if (d === DIRS.DOWN) this.ctx.rotate(Math.PI/2);
                    else if (d === DIRS.LEFT) this.ctx.rotate(Math.PI);
                    else if (d === DIRS.RIGHT) this.ctx.rotate(0);

                    const speed = 0.6;
                    const spacing = 16;
                    const cycle = ts/2; 
                    const offset = (time * speed + i * spacing) % cycle;
                    
                    // Incoming: move from -16 to 0. Outgoing: move from 0 to 16.
                    const relX = isIncoming ? (offset - ts/2) : offset;
                    
                    if (relX > -ts/2 + 2 && relX < ts/2 - 2) {
                        this.ctx.translate(relX, 0);
                        this.ctx.beginPath();
                        this.ctx.moveTo(-3, -3);
                        this.ctx.lineTo(3, 0);
                        this.ctx.lineTo(-3, 3);
                        this.ctx.fill();
                    }
                    this.ctx.restore();
                }
            };

            // Incoming arrows (pointing towards center)
            for (let d of entries) {
                // To point towards center from the entry side, we rotate by 180 degrees relative to the entry side's normal rotation?
                // Actually, if energy enters from LEFT, the entry side is LEFT.
                // We want arrows moving from LEFT to CENTER.
                // Our rotation logic: DIRS.RIGHT is 0.
                // If we rotate DIRS.LEFT (180deg) and translate by negative offset?
                // Let's rethink.
                // If we want Left->Center: Rotate 0 (RIGHT), start at -16, move to 0.
                const dirMap = { [DIRS.LEFT]: DIRS.RIGHT, [DIRS.RIGHT]: DIRS.LEFT, [DIRS.UP]: DIRS.DOWN, [DIRS.DOWN]: DIRS.UP };
                drawArrowAt(dirMap[d], true);
            }
            // Outgoing arrows (pointing away from center)
            for (let d of exits) {
                drawArrowAt(d, false);
            }
        }
    },

    drawChargingStation(x, y, isPowered, frame) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // 1. Base metallic platform (Heavier look)
        this.ctx.fillStyle = '#2d3748';
        this.ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
        
        // Darker inner frame
        this.ctx.fillStyle = '#1a202c';
        this.ctx.fillRect(px + 6, py + 6, ts - 12, ts - 12);

        if (isPowered) {
            // 2. POWERED STATE: Neon Green Glow
            this.ctx.save();
            this.ctx.shadowColor = '#00ff9f';
            this.ctx.shadowBlur = 15;
            
            // Bright green glass
            this.ctx.fillStyle = '#00ff9f';
            this.ctx.fillRect(px + 10, py + 10, ts - 20, ts - 20);
            
            // Inner light core
            this.ctx.fillStyle = '#fff';
            this.ctx.globalAlpha = 0.5 + Math.sin(frame * 0.1) * 0.2;
            this.ctx.fillRect(px + 14, py + 14, ts - 28, ts - 28);
            
            this.ctx.restore();
        } else {
            // 3. UNPOWERED STATE: Irregular Yellow Warning Lights
            this.ctx.fillStyle = '#0a0a0a'; // Dark glass
            this.ctx.fillRect(px + 10, py + 10, ts - 20, ts - 20);
            
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.shadowColor = '#ffcc00';
            const s = 2; // Smaller lights
            
            // Draw 4 small corner lights with irregular flickering
            const corners = [
                {x: px + 6, y: py + 6, i: 0},
                {x: px + ts - 8, y: py + 6, i: 1},
                {x: px + 6, y: py + ts - 8, i: 2},
                {x: px + ts - 8, y: py + ts - 8, i: 3}
            ];

            for (const c of corners) {
                // Individual flicker logic for each light (Slower and calmer)
                const flicker = Math.sin(frame * 0.05 + c.i * 2.1) + Math.sin(frame * 0.08 + c.i * 1.2);
                if (flicker > 1.2) {
                    this.ctx.shadowBlur = 5;
                    this.ctx.fillRect(c.x, c.y, s, s);
                }
            }
            this.ctx.shadowBlur = 0;
        }
    },

    drawBrokenCore(x, y, frame) {
        const cx = x * this.tileSize + this.tileSize/2;
        const cy = y * this.tileSize + this.tileSize/2;
        const ts = this.tileSize;

        this.ctx.save();
        
        // 1. Support Claws (Burnt Metallic brackets)
        this.ctx.fillStyle = '#222';
        const clawSize = 6;
        const clawOffset = ts/2 - 6;
        this.ctx.fillRect(cx - clawOffset - 2, cy - clawOffset - 2, clawSize, clawSize);
        this.ctx.fillRect(cx + clawOffset - 4, cy - clawOffset - 2, clawSize, clawSize);
        this.ctx.fillRect(cx - clawOffset - 2, cy + clawOffset - 4, clawSize, clawSize);
        this.ctx.fillRect(cx + clawOffset - 4, cy + clawOffset - 4, clawSize, clawSize);

        // 2. Base Plate
        this.ctx.fillStyle = '#111';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, ts/2 - 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 2. INNER CORE (Dark, burnt sphere)
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, ts/2 - 8, 0, Math.PI * 2);
        this.ctx.fill();

        // 3. CRACKS (Light gray scratches)
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 6, cy - 6); this.ctx.lineTo(cx + 2, cy + 2); this.ctx.lineTo(cx - 2, cy + 8);
        this.ctx.moveTo(cx + 8, cy - 8); this.ctx.lineTo(cx - 2, cy - 2); this.ctx.lineTo(cx + 6, cy + 4);
        this.ctx.stroke();

        // 4. SMOKE SPAWN (Slow, dense, column-like)
        if (frame % 6 === 0) { // Slower spawning
            this.particles.push({
                x: cx + (Math.random()-0.5)*6, 
                y: cy - 4,
                vx: (Math.random() - 0.5) * 0.2, // Very low horizontal drift
                vy: -0.2 - Math.random() * 0.3, // Slower rise
                life: 2.5, // Lasts a long time
                color: Math.random() > 0.5 ? '#222' : '#111',
                type: 'smoke',
                size: 10 + Math.random() * 5 // Large, consistent blobs
            });
        }
        
        // 5. FREQUENT SPARKS (Short circuits)
        if (frame % 12 === 0) {
            this.spawnParticle(cx, cy, '#ffcc00', 'spark');
        }

        this.ctx.restore();
    },
    drawCore(x, y, charType, isPowered, required = 0, current = 0, isContaminated = false) {
        const cx = x * this.tileSize + this.tileSize/2;
        const cy = y * this.tileSize + this.tileSize/2;
        const ts = this.tileSize;
        
        let color = COLORS.coreBlue;
        let isSource = false;
        if (charType === 'B') {
            isSource = true;
            isPowered = true;
            color = COLORS.coreBlue;
        } else if (charType === 'X') {
            isSource = true;
            isPowered = true;
            color = '#ff003c'; // Red Source
        } else if (charType === 'T' || (charType >= '0' && charType <= '9')) {
            if (isContaminated) {
                color = '#ff003c'; // Corrupted Red
                isPowered = true;
            } else {
                color = isPowered ? COLORS.coreTargetPowered : COLORS.coreTargetIdle;
            }
        }

        // 1. Support Claws (Metallic brackets at corners)
        this.ctx.fillStyle = '#444';
        const clawSize = 6;
        const clawOffset = ts/2 - 6;
        // Diagonal brackets
        this.ctx.fillRect(cx - clawOffset - 2, cy - clawOffset - 2, clawSize, clawSize);
        this.ctx.fillRect(cx + clawOffset - 4, cy - clawOffset - 2, clawSize, clawSize);
        this.ctx.fillRect(cx - clawOffset - 2, cy + clawOffset - 4, clawSize, clawSize);
        this.ctx.fillRect(cx + clawOffset - 4, cy + clawOffset - 4, clawSize, clawSize);

        // Claws (Brighter highlights)
        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(cx - clawOffset, cy - clawOffset, 2, 2);
        this.ctx.fillRect(cx + clawOffset - 2, cy - clawOffset, 2, 2);
        this.ctx.fillRect(cx - clawOffset, cy + clawOffset - 2, 2, 2);
        this.ctx.fillRect(cx + clawOffset - 2, cy + clawOffset - 2, 2, 2);

        // 2. Base Plate
        this.ctx.fillStyle = '#222';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, ts/2 - 4, 0, Math.PI * 2);
        this.ctx.fill();

        // 3. Core Primary Circle
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, ts/2 - 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 4. Inner Highlight (Ring)
        this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, ts/2 - 12, 0, Math.PI * 2);
        this.ctx.stroke();

        // 5. Center Glow Point
        this.ctx.fillStyle = '#fff';
        this.ctx.globalAlpha = isPowered ? 0.8 : 0.2;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;

        this.ctx.shadowBlur = 0;

        this.ctx.shadowBlur = 0;
    },
    drawScrap(x, y, frame) {
        const cx = x * this.tileSize + this.tileSize/2;
        const cy = y * this.tileSize + this.tileSize/2;

        // --- FLOOR SHADOW ---
        const shadowPulse = 0.8 + Math.sin(frame * 0.1) * 0.1;
        this.ctx.save();
        this.ctx.translate(cx, cy + 10);
        this.ctx.scale(shadowPulse, shadowPulse * 0.5);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // Draw 3 items in a cluster
        for (let i = 0; i < 3; i++) {
            // Seed-based type and movement for each item in the cluster
            const itemSeed = (x * 7 + y * 13 + i * 17);
            const scrapType = itemSeed % 4;

            // Individual bobbing and rotation
            const bob = Math.sin(frame * 0.08 + itemSeed) * 4;
            const rot = frame * (0.04 + i * 0.01) + itemSeed;
            
            // Orbit/Offset from center
            const offsetX = Math.cos(itemSeed * 0.5) * 6;
            const offsetY = Math.sin(itemSeed * 0.5) * 6;

            this.ctx.save();
            this.ctx.translate(cx + offsetX, cy + offsetY + bob);
            this.ctx.rotate(rot);

            this.ctx.fillStyle = '#888'; // Grey metal
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;

            if (scrapType === 0) {
                // --- LARGE GEAR ---
                const r = 5;
                this.ctx.beginPath();
                for (let j = 0; j < 8; j++) {
                    const angle = (j / 8) * Math.PI * 2;
                    const nextAngle = ((j + 0.5) / 8) * Math.PI * 2;
                    this.ctx.lineTo(Math.cos(angle) * (r + 3), Math.sin(angle) * (r + 3));
                    this.ctx.lineTo(Math.cos(nextAngle) * (r + 3), Math.sin(nextAngle) * (r + 3));
                    this.ctx.lineTo(Math.cos(nextAngle) * r, Math.sin(nextAngle) * r);
                }
                this.ctx.closePath();
                this.ctx.fill(); this.ctx.stroke();
                this.ctx.fillStyle = '#222';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 1.5, 0, Math.PI * 2); this.ctx.fill();
            } else if (scrapType === 1) {
                // --- SCREW ---
                this.ctx.fillRect(-4, -6, 8, 3);
                this.ctx.strokeRect(-4, -6, 8, 3);
                this.ctx.fillRect(-2, -3, 4, 8);
                this.ctx.strokeRect(-2, -3, 4, 8);
                this.ctx.fillStyle = '#222';
                this.ctx.fillRect(-3, -5.5, 6, 1);
            } else if (scrapType === 2) {
                // --- HEX NUT (Porca) ---
                const r = 6;
                this.ctx.beginPath();
                for (let j = 0; j < 6; j++) {
                    const angle = (j / 6) * Math.PI * 2;
                    this.ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
                }
                this.ctx.closePath();
                this.ctx.fill(); this.ctx.stroke();
                this.ctx.fillStyle = '#222';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 2, 0, Math.PI * 2); this.ctx.fill();
            } else {
                // --- SMALL GEAR ---
                const r = 3;
                this.ctx.beginPath();
                for (let j = 0; j < 6; j++) {
                    const angle = (j / 6) * Math.PI * 2;
                    const nextAngle = ((j + 0.5) / 6) * Math.PI * 2;
                    this.ctx.lineTo(Math.cos(angle) * (r + 2), Math.sin(angle) * (r + 2));
                    this.ctx.lineTo(Math.cos(nextAngle) * (r + 2), Math.sin(nextAngle) * (r + 2));
                }
                this.ctx.closePath();
                this.ctx.fill(); this.ctx.stroke();
                this.ctx.fillStyle = '#222';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 1, 0, Math.PI * 2); this.ctx.fill();
            }

            // Shared shine
            this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
            this.ctx.fillRect(-1.5, -1.5, 1.5, 1.5);

            this.ctx.restore();
        }
    },

    drawDoor(x, y, state, isError, frame, orientation, side, openPct = null) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // No background, use standard floor
        
        if (state === 'OPEN' || state === 'BROKEN_OPEN') {
            this.ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
            this.ctx.fillRect(px, py, ts, ts);
        }

        this.ctx.save();
        
        // Animation Offset
        if (openPct === null) {
            openPct = (state === 'OPEN' || state === 'BROKEN_OPEN') ? 1 : 0;
        }
        let ox = 0, oy = 0;
        const dist = ts * 0.9;

        if (side === 'LEFT') ox = -dist * openPct;
        else if (side === 'RIGHT') ox = dist * openPct;
        else if (side === 'TOP') oy = -dist * openPct;
        else if (side === 'BOTTOM') oy = dist * openPct;
        else {
            // Single door: slides UP by default
            oy = -dist * openPct;
        }

        this.ctx.translate(px + ox, py + oy);

        // CLOSED/SLIDING PLATE: Heavy metal with Hazard Stripes
        this.ctx.fillStyle = '#2d3748';
        this.ctx.fillRect(0, 0, ts, ts);
        
        // Bevel (adapts to side to form a continuous 2-block structure)
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 2;
        
        let bx = 2, by = 2, bw = ts - 4, bh = ts - 4;
        if (side === 'LEFT') { bw = ts - 2; }
        else if (side === 'RIGHT') { bx = 0; bw = ts - 2; }
        else if (side === 'TOP') { bh = ts - 2; }
        else if (side === 'BOTTOM') { by = 0; bh = ts - 2; }
        
        this.ctx.beginPath();
        if (side === 'LEFT') {
            this.ctx.moveTo(bx + bw, by);
            this.ctx.lineTo(bx, by);
            this.ctx.lineTo(bx, by + bh);
            this.ctx.lineTo(bx + bw, by + bh);
        } else if (side === 'RIGHT') {
            this.ctx.moveTo(bx, by);
            this.ctx.lineTo(bx + bw, by);
            this.ctx.lineTo(bx + bw, by + bh);
            this.ctx.lineTo(bx, by + bh);
        } else if (side === 'TOP') {
            this.ctx.moveTo(bx, by + bh);
            this.ctx.lineTo(bx, by);
            this.ctx.lineTo(bx + bw, by);
            this.ctx.lineTo(bx + bw, by + bh);
        } else if (side === 'BOTTOM') {
            this.ctx.moveTo(bx, by);
            this.ctx.lineTo(bx, by + bh);
            this.ctx.lineTo(bx + bw, by + bh);
            this.ctx.lineTo(bx + bw, by);
        } else {
            this.ctx.rect(bx, by, bw, bh);
        }
        this.ctx.stroke();
        
        // Hazard Stripes Clipping Region
        this.ctx.save();
        this.ctx.beginPath();
        let cx = 4, cy = 4, cw = ts - 8, ch = ts - 8;
        if (side === 'LEFT') { cw = ts - 4; }
        else if (side === 'RIGHT') { cx = 0; cw = ts - 4; }
        else if (side === 'TOP') { ch = ts - 4; }
        else if (side === 'BOTTOM') { cy = 0; ch = ts - 4; }
        this.ctx.rect(cx, cy, cw, ch);
        this.ctx.clip();
        
        const stripeW = 8;
        for (let i = -ts; i < ts * 2; i += stripeW * 2) {
            this.ctx.fillStyle = '#ffcc00'; // Yellow
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i + stripeW, 0);
            this.ctx.lineTo(i + stripeW - ts, ts);
            this.ctx.lineTo(i - ts, ts);
            this.ctx.fill();

            this.ctx.fillStyle = '#111'; // Black
            const j = i + stripeW;
            this.ctx.beginPath();
            this.ctx.moveTo(j, 0);
            this.ctx.lineTo(j + stripeW, 0);
            this.ctx.lineTo(j + stripeW - ts, ts);
            this.ctx.lineTo(j - ts, ts);
            this.ctx.fill();
        }
        this.ctx.restore();

        // Status Light / Damage Visuals
        if (state === 'BROKEN_OPEN') {
            // 1. Structural Cracks
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            // Main crack from top corner
            this.ctx.moveTo(4, 4); this.ctx.lineTo(12, 12); this.ctx.lineTo(8, 20); this.ctx.lineTo(15, 28);
            // Secondary branch
            this.ctx.moveTo(12, 12); this.ctx.lineTo(22, 10); this.ctx.lineTo(28, 15);
            this.ctx.stroke();

            // 2. Concentrated Golden Sparks (One Fixed Point per Burst)
            if (Math.random() > 0.94) {
                // Pick a single point along the leading edge
                const edgePos = 4 + Math.random() * (ts - 8);
                let sx = 0, sy = 0;
                if (side === 'LEFT') { sx = ts - 2; sy = edgePos; }
                else if (side === 'RIGHT') { sx = 2; sy = edgePos; }
                else if (side === 'TOP') { sx = edgePos; sy = ts - 2; }
                else if (side === 'BOTTOM') { sx = edgePos; sy = 2; }
                else { sx = edgePos; sy = ts - 2; }

                const goldColor = '#ffcc00';
                // Spawn 2 at the exact same spot for a "pop" effect
                for(let i=0; i<2; i++) {
                    this.spawnParticle(px + ox + sx, py + oy + sy, goldColor, 'spark');
                }
            }
        } else if (isError) {
            // Blinking yellow lights for closing error (obstructed)
            if (Math.floor(frame / 10) % 2 === 0) {
                this.ctx.save();
                this.ctx.shadowColor = '#ffcc00';
                this.ctx.shadowBlur = 15;
                this.ctx.fillStyle = '#ffcc00';
                this.ctx.beginPath();
                this.ctx.arc(ts/2, ts/2, 6, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
        }
        
        // Side glowing edges (If open or opening)
        if (openPct > 0) {
            this.ctx.shadowColor = '#00f0ff';
            this.ctx.shadowBlur = 10;
            this.ctx.fillStyle = '#00f0ff';
            // Edge that faces the opening
            if (side === 'LEFT') this.ctx.fillRect(ts - 2, 0, 2, ts);
            else if (side === 'RIGHT') this.ctx.fillRect(0, 0, 2, ts);
            else if (side === 'TOP') this.ctx.fillRect(0, ts - 2, ts, 2);
            else if (side === 'BOTTOM') this.ctx.fillRect(0, 0, ts, 2);
            this.ctx.shadowBlur = 0;
        }

        this.ctx.restore();
    },

    drawButton(x, y, isPressed, behavior = 'TIMER', charge = 0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // --- 0. COLOR PALETTE PER BEHAVIOR ---
        let baseColor = '#1a1a0a'; // Dark base
        let accentColor = '#ffcc00'; // Yellow (Default)
        let ledR = 255, ledG = 136, ledB = 0; // Orange-ish LEDs
        let idleColor = '#443300';

        if (behavior === 'TOGGLE') {
            baseColor = '#051a0a';
            accentColor = '#10b981'; // Green
            ledR = 0; ledG = 255; ledB = 100;
            idleColor = '#003311';
        } else if (behavior === 'PERMANENT') {
            baseColor = '#1a0505';
            accentColor = '#ef4444'; // Red
            ledR = 255; ledG = 50; ledB = 0;
            idleColor = '#330000';
        } else if (behavior === 'PRESSURE') {
            baseColor = '#10051a';
            accentColor = '#a855f7'; // Purple
            ledR = 180; ledG = 0; ledB = 255;
            idleColor = '#220033';
        }

        // --- 1. PROGRESSIVE LEDs (Chasing Effect) ---
        // Sequential clockwise animation (TL -> TR -> BR -> BL)
        const time = Date.now() * 0.004; // Slower speed
        const ledS = 2; 
        const pad = 1;
        
        const ledPositions = [
            { x: pad, y: pad },           // 0: TL
            { x: ts - pad - ledS, y: pad },// 1: TR
            { x: ts - pad - ledS, y: ts - pad - ledS }, // 2: BR
            { x: pad, y: ts - pad - ledS } // 3: BL
        ];
        
        // --- 1. BASE PLATE (Quantum Model Style) ---
        this.ctx.fillStyle = baseColor;
        this.ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);

        // --- 2. PROGRESSIVE FEEDBACK (LEDs or Border) ---
        this.ctx.save();
        
        if (behavior === 'PRESSURE') {
            // Draw a perimeter line that fills up
            const bPad = 2;
            const bSize = ts - bPad * 2;
            this.ctx.strokeStyle = `rgba(${ledR}, ${ledG}, ${ledB}, 0.3)`;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(px + bPad, py + bPad, bSize, bSize);

            if (charge > 0) {
                this.ctx.strokeStyle = `rgb(${ledR}, ${ledG}, ${ledB})`;
                this.ctx.shadowColor = `rgb(${ledR}, ${ledG}, ${ledB})`;
                this.ctx.shadowBlur = 8;
                this.ctx.lineWidth = 2.5; // Thicker for better feedback
                this.ctx.lineCap = 'square';
                
                // Clockwise path around the square
                const p = charge; // 0 to 1
                this.ctx.beginPath();
                this.ctx.moveTo(px + bPad + bSize/2, py + bPad); // Start Top Center
                
                // Top Right
                if (p > 0) {
                    const segment = Math.min(p, 0.125) / 0.125;
                    this.ctx.lineTo(px + bPad + bSize/2 + (bSize/2) * segment, py + bPad);
                }
                // Right Side
                if (p > 0.125) {
                    const segment = Math.min(p, 0.375) - 0.125;
                    const factor = segment / 0.25;
                    this.ctx.lineTo(px + bPad + bSize, py + bPad + bSize * factor);
                }
                // Bottom
                if (p > 0.375) {
                    const segment = Math.min(p, 0.625) - 0.375;
                    const factor = segment / 0.25;
                    this.ctx.lineTo(px + bPad + bSize - bSize * factor, py + bPad + bSize);
                }
                // Left
                if (p > 0.625) {
                    const segment = Math.min(p, 0.875) - 0.625;
                    const factor = segment / 0.25;
                    this.ctx.lineTo(px + bPad, py + bPad + bSize - bSize * factor);
                }
                // Back to Top Center
                if (p > 0.875) {
                    const segment = Math.min(p, 1.0) - 0.875;
                    const factor = segment / 0.125;
                    this.ctx.lineTo(px + bPad + bSize * 0.5 * factor, py + bPad);
                }
                this.ctx.stroke();
            }
        } else {
            // Draw corner LEDs for other types
            ledPositions.forEach((pos, i) => {
                let ledPulse;
                if (isPressed) {
                    ledPulse = 1.0; // Stay ON when pressed
                } else {
                    // Phase shift based on index (i * 1.57 creates a clockwise flow for 4 points)
                    ledPulse = Math.pow(0.5 + Math.sin(time - i * 1.57) * 0.5, 3);
                }

                const alpha = ledPulse * 0.9;
                const color = `rgba(${ledR}, ${ledG}, ${ledB}, ${alpha})`;
                
                this.ctx.fillStyle = color;
                this.ctx.shadowColor = color;
                this.ctx.shadowBlur = ledPulse * 5;
                this.ctx.fillRect(px + pos.x, py + pos.y, ledS, ledS);
            });
        }
        this.ctx.restore();
        
        const cx = px + ts/2;
        const cy = py + ts/2;
        const radius = isPressed ? 7 : 9;
        
        this.ctx.fillStyle = isPressed ? accentColor : idleColor;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        if (isPressed) {
            this.ctx.save();
            this.ctx.strokeStyle = accentColor;
            this.ctx.lineWidth = 2;
            this.ctx.shadowColor = accentColor;
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        } else {
            this.ctx.strokeStyle = isPressed ? accentColor : '#2d2d2d';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // --- 3. INNER DETAIL (Quantum Model Aesthetic) ---
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(cx - 2, cy - 2, 2, 0, Math.PI * 2);
        this.ctx.fill();
    },

    drawPurpleButton(x, y, isPressed, isToggle = false) {
        // Compatibility wrapper for the new unified drawButton
        this.drawButton(x, y, isPressed, isToggle ? 'TOGGLE' : 'PRESSURE');
    },

    drawQuantumFloor(x, y, isActive, frame, flashTimer = 0, intensity = 1.0, entrySide = null, whiteGlow = 0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // Base floor
        this.drawFloor(x, y);

        this.ctx.save();
        if (isActive) {
            // DIGITAL PURPLE BARRIER (Active State)
            const pulse = 0.2 + Math.sin(frame * 0.1) * 0.1;
            const r = Math.floor(138 + (255 - 138) * whiteGlow);
            const g = Math.floor(43 + (255 - 43) * whiteGlow);
            const b = Math.floor(226 + (255 - 226) * whiteGlow);
            
            this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulse})`;
            this.ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);

            const r2 = Math.floor(191 + (255 - 191) * whiteGlow);
            const g2 = Math.floor(0 + (255 - 0) * whiteGlow);
            const b2 = Math.floor(255 + (255 - 255) * whiteGlow);
            
            this.ctx.strokeStyle = `rgba(${r2}, ${g2}, ${b2}, ${pulse * 2})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for (let i = 4; i < ts; i += 8) {
                this.ctx.moveTo(px + i, py + 2);
                this.ctx.lineTo(px + i, py + ts - 2);
                this.ctx.moveTo(px + 2, py + i);
                this.ctx.lineTo(px + ts - 2, py + i);
            }
            this.ctx.stroke();

            // Corner energy bits (Moving)
            this.ctx.fillStyle = whiteGlow > 0.5 ? '#fff' : '#bf00ff';
            const s = 2;
            const t = (frame * 0.1) % (ts - 4);
            this.ctx.fillRect(px + 2 + t, py + 2, s, s);
            this.ctx.fillRect(px + ts - 2 - s, py + 2 + t, s, s);
            this.ctx.fillRect(px + ts - 2 - s - t, py + ts - 2 - s, s, s);
            this.ctx.fillRect(px + 2, py + ts - 2 - s - t, s, s);
        } else {
            // ENERGIZED WHITE FLOOR (Deactivated State)
            const pulse = 0.1 + Math.sin(frame * 0.05) * 0.05;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
            this.ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);

            this.ctx.strokeStyle = `rgba(255, 255, 255, ${pulse * 1.5})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(px + ts/2, py + 4); this.ctx.lineTo(px + ts/2, py + ts - 4);
            this.ctx.moveTo(px + 4, py + ts/2); this.ctx.lineTo(px + ts - 4, py + ts/2);
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            const cs = 3;
            this.ctx.fillRect(px + 4, py + 4, cs, 1); this.ctx.fillRect(px + 4, py + 4, 1, cs);
            this.ctx.fillRect(px + ts - 4 - cs, py + 4, cs, 1); this.ctx.fillRect(px + ts - 5, py + 4, 1, cs);
            this.ctx.fillRect(px + 4, py + ts - 5, cs, 1); this.ctx.fillRect(px + 4, py + ts - 4 - cs, 1, cs);
            this.ctx.fillRect(px + ts - 4 - cs, py + ts - 5, cs, 1); this.ctx.fillRect(px + ts - 5, py + ts - 4 - cs, 1, cs);
        }

        // --- DIRECTIONAL SHOCKWAVE FEEDBACK ---
        if (flashTimer > 0 && flashTimer <= 15) {
            this.ctx.save();
            const progress = 1 - (flashTimer / 15);
            const alpha = (flashTimer / 15) * intensity;
            
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2 * intensity;
            this.ctx.globalAlpha = alpha;
            this.ctx.shadowColor = '#fff';
            this.ctx.shadowBlur = 5 * intensity;

            const cx = px + ts / 2;
            const cy = py + ts / 2;

            if (entrySide && (entrySide.dx !== 0 || entrySide.dy !== 0)) {
                const dist = ts * progress;
                this.ctx.beginPath();
                if (entrySide.dx < 0) { // LEFT
                    this.ctx.moveTo(px + dist, py + 2); this.ctx.lineTo(px + dist, py + ts - 2);
                } else if (entrySide.dx > 0) { // RIGHT
                    this.ctx.moveTo(px + ts - dist, py + 2); this.ctx.lineTo(px + ts - dist, py + ts - 2);
                } else if (entrySide.dy < 0) { // TOP
                    this.ctx.moveTo(px + 2, py + dist); this.ctx.lineTo(px + ts - 2, py + dist);
                } else if (entrySide.dy > 0) { // BOTTOM
                    this.ctx.moveTo(px + 2, py + ts - dist); this.ctx.lineTo(px + ts - 2, py + ts - dist);
                }
                this.ctx.stroke();
            } else {
                // Expanding square ring (propagation)
                const size = ts * progress;
                this.ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
            }
            this.ctx.restore();
        }
        this.ctx.restore();
    },


    drawHUD(game) {
        // Draw Result Vignette (Red for death/gameOver, Green for win)
        this._drawResultVignette(this.ctx, game);
    },

    drawDoorTransition(game, progress) {
        if (!this.tCtx) return;
        this.tCtx.clearRect(0, 0, 640, 560);
        if (progress <= 0) return;
        
        const ctx = this.tCtx;
        const w = 320;
        const h = 560;
        
        const lx = -w + w * progress;
        const rx = 640 - w * progress;

        ctx.save();
        
        // Shadow behind the door (covers entire game-container)
        if (progress < 1) {
            ctx.fillStyle = `rgba(0,0,0,${progress * 0.8})`;
            ctx.fillRect(0, 0, 640, 560);
        }

        // Determine status text
        let status = game.transitionLabel || 'CIRCUIT BREAKER';
        let prompt = '';
        if (game.transitionState === 'WAITING' && progress === 1 && game.transitionStayClosed) {
            prompt = 'APERTE PARA CONTINUAR';
        }

        this.drawDoorHalf(ctx, lx, 0, w, h, true, status, prompt);
        this.drawDoorHalf(ctx, rx, 0, w, h, false, status, prompt);

        // Sparks and Smoke when closed or closing tightly
        if (progress > 0.85) {
            const centerY = 320; // Approximately in the game area center
            if (Math.random() > 0.4) this.spawnParticle(320, Math.random() * h, '#ffcc00', 'spark');
            if (Math.random() > 0.2) this.spawnParticle(320 + (Math.random()-0.5)*20, Math.random() * h, '#111', 'smoke');
            if (Math.random() > 0.8) this.spawnParticle(320, Math.random() * h, '#00f0ff', 'spark');
        }

        // Prompt removed from here, now in door screen
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

    drawDoorHalf(ctx, x, y, w, h, isLeft, statusText, promptText = '') {
        // Base dark metal
        ctx.fillStyle = '#1c1e22';
        ctx.fillRect(x, y, w, h);

        // Inner panel bevel
        ctx.fillStyle = '#25282e';
        ctx.fillRect(x + 4, y + 4, w - 8, h - 8);

        // Vertical pipe/beam
        ctx.fillStyle = '#111215';
        ctx.fillRect(x + (isLeft ? 40 : w - 80), y, 40, h);
        
        // Highlight on pipe
        ctx.fillStyle = '#2a2d34';
        ctx.fillRect(x + (isLeft ? 44 : w - 76), y, 4, h);

        // Horizontal structural beams
        for (let i = 0; i < 4; i++) {
            const by = 60 + i * 110;
            ctx.fillStyle = '#181a1e';
            ctx.fillRect(x, by, w, 40);
            
            // Rivets
            ctx.fillStyle = '#0a0a0c';
            ctx.fillRect(x + w/2 - 2, by + 6, 4, 4);
            ctx.fillRect(x + w/2 - 2, by + 30, 4, 4);
        }

        // Lock mechanism half
        const lockW = 60;
        const lockH = 100;
        const lockY = h/2 - lockH/2;
        
        ctx.fillStyle = '#2c3138';
        if (isLeft) {
            ctx.fillRect(x + w - lockW, lockY, lockW, lockH);
            // Electronic pad
            ctx.fillStyle = '#111';
            ctx.fillRect(x + w - lockW + 10, lockY + 10, 30, 20);
            // Green wave/status
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(x + w - lockW + 12, lockY + 18, 26, 2);
            ctx.fillRect(x + w - lockW + 20, lockY + 14, 10, 10); // Center pulse
        } else {
            ctx.fillRect(x, lockY, lockW, lockH);
            // Lock bar receiver slot
            ctx.fillStyle = '#0a0a0c';
            ctx.fillRect(x + 10, lockY + 30, 40, 40);
        }
        
        // Center seam shadow/highlight
        if (isLeft) {
            ctx.fillStyle = '#050505';
            ctx.fillRect(x + w - 4, y, 4, h);
        } else {
            // --- CRT SCREEN (Added to Right Panel) ---
            const screenW = 200; // WIDER
            const screenH = 80;  // TALLER
            const screenX = x + (w - screenW) / 2; // CENTERED on panel
            const screenY = h / 2 - 120;

            // Screen Housing
            ctx.fillStyle = '#111';
            ctx.fillRect(screenX - 4, screenY - 4, screenW + 8, screenH + 8);
            
            // Screen Background (Glowing Green/Red/Blue)
            let screenColor = '#004411'; // Dim Green
            let textColor = '#00ff41'; // Matrix Green
            if (statusText === 'SUCESSO') {
                screenColor = '#004422';
                textColor = '#00ff9f';
            } else if (statusText === 'FALHA') {
                screenColor = '#440011';
                textColor = '#ff003c';
            } else {
                screenColor = '#002244';
                textColor = '#00f0ff';
            }

            ctx.fillStyle = screenColor;
            ctx.fillRect(screenX, screenY, screenW, screenH);
            
            // Screen Content
            ctx.save();
            // Flickering effect
            if (Math.random() > 0.05) {
                ctx.fillStyle = textColor;
                ctx.textAlign = 'center';
                
                // Text Shadow (Glow)
                ctx.shadowColor = textColor;
                ctx.shadowBlur = 10;

                if (promptText) {
                    // Draw Status smaller
                    ctx.font = 'bold 16px "VT323", monospace';
                    ctx.fillText(statusText, screenX + screenW/2, screenY + 25);
                    
                    // Draw Prompt (Pulsing)
                    const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
                    ctx.globalAlpha = 0.5 + pulse * 0.5;
                    ctx.font = 'bold 18px "VT323", monospace';
                    ctx.fillText(promptText, screenX + screenW/2, screenY + 55);
                } else {
                    // Draw Status only (Original behavior)
                    ctx.font = 'bold 24px "VT323", monospace';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(statusText, screenX + screenW/2, screenY + screenH/2);
                }
                
                // Scanlines on screen
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = '#000';
                for(let i=0; i<screenH; i+=3) ctx.fillRect(screenX, screenY + i, screenW, 1);
            }
            ctx.restore();
        }
    },

    drawLightning(startX, startY, endX, endY, color) {
        const ctx = this.ctx;
        const numOfPoints = 6;
        const dx = endX - startX;
        const dy = endY - startY;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        for (let i = 1; i < numOfPoints; i++) {
            const pct = i / numOfPoints;
            // Add randomness perpendicular to the direction
            const jitterX = (Math.random() - 0.5) * 10;
            const jitterY = (Math.random() - 0.5) * 10;
            ctx.lineTo(startX + dx * pct + jitterX, startY + dy * pct + jitterY);
        }
        
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Glow effect
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    },

    drawBlock(x, y, visualAngle, powerData, distToTarget = 0, logicalDir = 0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        const cx = px + ts/2;
        const cy = py + ts/2;
        
        // 1. Dark Metal Base
        this.ctx.fillStyle = '#3a3a4a';
        this.ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
        
        // 2. Industrial Corner Plates (Orange)
        this.ctx.fillStyle = '#ff8800';
        const cs = 8; // corner size
        // Top-left
        this.ctx.fillRect(px + 2, py + 2, cs, cs);
        // Top-right
        this.ctx.fillRect(px + ts - cs - 2, py + 2, cs, cs);
        // Bottom-left
        this.ctx.fillRect(px + 2, py + ts - cs - 2, cs, cs);
        // Bottom-right
        this.ctx.fillRect(px + ts - cs - 2, py + ts - cs - 2, cs, cs);

        // 3. Central Metal Panel
        this.ctx.fillStyle = '#888899';
        this.ctx.fillRect(px + 6, py + 6, ts - 12, ts - 12);
        
        // 4. Panel Details (Screws/Bevel)
        this.ctx.fillStyle = '#aaaaBB';
        this.ctx.fillRect(px + 6, py + 6, ts - 12, 2); // Top bevel
        this.ctx.fillRect(px + 6, py + 6, 2, ts - 12); // Left bevel
        this.ctx.fillStyle = '#555566';
        this.ctx.fillRect(px + 6, py + ts - 8, ts - 12, 2); // Bottom shadow
        this.ctx.fillRect(px + ts - 8, py + 6, 2, ts - 12); // Right shadow

        // 5. Directional Indicator (Large Triangle)
        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.rotate(visualAngle); // Use interpolated visual angle for the arrow
        
        const isPowered = powerData !== null && powerData.active;
        const isInvalid = powerData !== null && powerData.invalid;
        const isOcean = powerData !== null && powerData.isOcean;
        
        let color = '#fff'; // Inactive
        if (powerData) {
            if (powerData.invalid) {
                color = '#ffcc00'; // Yellow for Counter-flow error
            } else if (powerData.active) {
                if (powerData.color === 'RED') {
                    color = '#ff003c';
                } else {
                    color = isOcean ? '#00f0ff' : '#0077ff'; // Cyan if everything is right (Ocean), Muted Blue if just energized
                }
            }
        }
        
        if (isPowered || isInvalid) {
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 10;
        }

        // Central Triangle
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        const triSize = 8;
        this.ctx.moveTo(-triSize, -triSize);
        this.ctx.lineTo(triSize, 0);
        this.ctx.lineTo(-triSize, triSize);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
        this.ctx.shadowBlur = 0;

        // 6. Energy Injection Lightning Effect (Only if settled)
        // Use logicalDir to determine bolt orientation, keeping it grid-aligned
        if (isPowered && distToTarget < 0.1) {
            let nextX = cx, nextY = cy;
            const dist = 32; // To next tile
            if (logicalDir === DIRS.UP) nextY -= dist;
            else if (logicalDir === DIRS.DOWN) nextY += dist;
            else if (logicalDir === DIRS.LEFT) nextX -= dist;
            else if (logicalDir === DIRS.RIGHT) nextX += dist;

            // Draw multiple arcs for thickness
            for(let i=0; i<2; i++) {
                this.drawLightning(cx, cy, nextX, nextY, color);
            }
        }
    },

    drawDebris(p) {
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rot);
        
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.moveTo(p.vertices[0].x, p.vertices[0].y);
        for (let i = 1; i < p.vertices.length; i++) {
            this.ctx.lineTo(p.vertices[i].x, p.vertices[i].y);
        }
        this.ctx.closePath();
        this.ctx.fill();

        // Subtle shadow/bevel
        this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        this.ctx.restore();
    },

    drawReverseEffect(frame) {
        const W = this.ctx.canvas.width;
        const H = this.ctx.canvas.height;
        
        this.ctx.save();
        
        // 1. Dark Tint
        this.ctx.fillStyle = 'rgba(0, 20, 40, 0.2)';
        this.ctx.fillRect(0, 0, W, H);
        
        // 2. Horizontal Glitch Lines
        this.ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
        for (let i = 0; i < 5; i++) {
            const h = Math.random() * 20;
            const y = (frame * 5 + i * 100) % H;
            this.ctx.fillRect(0, y, W, h);
        }
        
        // 3. Scanlines
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        for (let y = 0; y < H; y += 4) {
            this.ctx.fillRect(0, y, W, 2);
        }
        
        // 4. "REWIND" Text & Symbol
        this.ctx.font = 'bold 24px "VT323", monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = '#00f0ff';
        this.ctx.shadowColor = '#00f0ff';
        this.ctx.shadowBlur = 10;
        
        const blink = Math.floor(frame / 10) % 2 === 0;
        if (blink) {
            this.ctx.fillText("<< REVERSÃO QUÂNTICA", W - 20, 40);
        }
        
        // 5. Random Noise
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * W;
            const y = Math.random() * H;
            this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
            this.ctx.fillRect(x, y, 2, 2);
        }

        this.ctx.restore();
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
        
        // Easing: Fast at start, slow at end (Ease Out Cubic)
        const p = Math.min(tRaw / 35, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        const t = ease * 28; // Max spread distance
        const tr = ease * 40; // Max rotation
        
        // Global Directional Bias (towards open corridor)
        const bx = isCrushed ? (deathDir ? deathDir.x * t * 1.5 : 0) : 0;
        const by = isCrushed ? (deathDir ? deathDir.y * t * 1.5 : 0) : 0;

        // --- SQUASH & STRETCH ---
        if (!isDead) {
            const speed = Math.sqrt(vx*vx + vy*vy);
            if (speed > 0.05) {
                const stretch = 1 + speed * 0.4;
                const squash = 1 - speed * 0.2;
                if (Math.abs(vx) > Math.abs(vy)) this.ctx.scale(stretch, squash);
                else this.ctx.scale(squash, stretch);
            }
        }
        
        // 1. ANIMATION VALUES
        const bodyBob = !isDead ? ((frame % 20 < 10) ? -0.5 : 0.5) : 0;
        const headTremble = !isDead ? (Math.sin(frame * 0.3) * 0.4) : 0;
        
        // --- DRAW BODY PARTS ---
        this.ctx.save();
        this.ctx.translate(bx, by + bodyBob);
        this.ctx.rotate(dir * Math.PI / 2);

        // Failure sparks (Fewer, directed)
        if (isCrushed && tRaw < 15 && frame % 3 === 0) {
            const sp = this.spawnParticle(cx + bx, cy + by, '#ffcc00', 'spark');
            if (sp && deathDir) {
                sp.vx += deathDir.x * 6;
                sp.vy += deathDir.y * 6;
            }
        }

        // --- TREADS ---
        const treadSpread = isCrushed ? t * 0.4 : 0;
        const treadRot = isCrushed ? tr * 0.05 : 0;

        // Right Tread
        this.ctx.save();
        this.ctx.translate(0, treadSpread);
        this.ctx.rotate(treadRot);
        this.ctx.fillStyle = '#4a5568';
        this.ctx.fillRect(-12, 7, 24, 7);
        this.ctx.fillStyle = '#1a202c';
        this.ctx.fillRect(-8, 8, 4, 5);
        this.ctx.fillRect(0, 8, 4, 5);
        this.ctx.fillRect(8, 8, 4, 5);
        this.ctx.restore();

        // Left Tread
        this.ctx.save();
        this.ctx.translate(0, -treadSpread);
        this.ctx.rotate(-treadRot * 1.1);
        this.ctx.fillStyle = '#4a5568';
        this.ctx.fillRect(-12, -14, 24, 7);
        this.ctx.fillStyle = '#1a202c';
        this.ctx.fillRect(-8, -13, 4, 5);
        this.ctx.fillRect(0, -13, 4, 5);
        this.ctx.fillRect(8, -13, 4, 5);
        this.ctx.restore();

        // --- ARMS ---
        const armSpreadX = isCrushed ? t * 0.6 : 0;
        const armSpreadY = isCrushed ? t * 0.3 : 0;
        
        // Right Arm
        this.ctx.save();
        this.ctx.translate(armSpreadX, armSpreadY);
        this.ctx.rotate(isCrushed ? tr * 0.1 : 0);
        this.ctx.fillStyle = '#2b6cb0';
        this.ctx.fillRect(-2, 7, 6, 4);
        this.ctx.fillStyle = '#ed8936';
        this.ctx.fillRect(4, 7, 8, 3);
        this.ctx.restore();

        // Left Arm
        this.ctx.save();
        this.ctx.translate(armSpreadX, -armSpreadY);
        this.ctx.rotate(isCrushed ? -tr * 0.1 : 0);
        this.ctx.fillStyle = '#2b6cb0';
        this.ctx.fillRect(-2, -11, 6, 4);
        this.ctx.fillStyle = '#ed8936';
        this.ctx.fillRect(4, -10, 8, 3);
        this.ctx.restore();

        // --- BACKPACK ---
        this.ctx.save();
        this.ctx.translate(isCrushed ? -t * 0.5 : 0, 0);
        this.ctx.rotate(isCrushed ? -tr * 0.08 : 0);
        this.ctx.fillStyle = '#3182ce';
        this.ctx.fillRect(-14, -8, 6, 16);
        this.ctx.fillStyle = '#2b6cb0';
        this.ctx.fillRect(-14, -8, 2, 16);
        this.ctx.restore();

        // --- MAIN BODY (BASE) ---
        this.ctx.save();
        if (isCrushed) {
            this.ctx.translate(Math.sin(tRaw)*1.2, Math.cos(tRaw)*1.2);
            this.ctx.rotate(tr * 0.03);
        }
        this.ctx.fillStyle = isDead ? '#2a2a2a' : '#dd6b20'; 
        this.ctx.fillRect(-8, -8, 14, 16);
        
        // Status LEDs (Off if dead)
        if (!isDead) {
            const robotLights = [{x:-12, y:-4, i:10}, {x:-12, y:2, i:11}, {x:-4, y:-6, i:12}];
            for (const l of robotLights) {
                const flicker = Math.sin(frame * 0.08 + l.i * 2.1) + Math.sin(frame * 0.12 + l.i * 1.2);
                if (flicker > 1.3) {
                    this.ctx.fillStyle = '#ffcc00';
                    this.ctx.shadowColor = '#ffcc00';
                    this.ctx.shadowBlur = 4;
                    this.ctx.fillRect(l.x, l.y, 2, 2);
                }
            }
        }
        this.ctx.restore();

        // Persistent smoke and sparks if shutdown
        if (isDead && deathType === 'SHUTDOWN') {
            if (frame % 15 === 0) Graphics.spawnParticle(cx, cy, 'rgba(100,100,100,0.5)', 'smoke');
            if (frame % 20 === 0) Graphics.spawnParticle(cx, cy, '#ffcc00', 'spark');
        }
        this.ctx.restore();

        // --- DRAW HEAD ---
        this.ctx.save();
        const headSpreadX = isCrushed ? t * 1.2 : 0;
        const headSpreadY = isCrushed ? -t * 0.5 : 0;
        this.ctx.translate(bx + headSpreadX, by + headSpreadY + headTremble); 
        this.ctx.rotate(dir * Math.PI / 2 + (isCrushed ? tr * 0.2 : 0)); 

        // Head
        this.ctx.fillStyle = isDead ? '#2a2a2a' : '#ed8936'; 
        this.ctx.fillRect(-2, -6, 12, 12);
        
        // Antenna
        const visorColor = isDead ? '#000' : (colorOverride || '#00f0ff');
        this.ctx.fillStyle = '#4a5568';
        this.ctx.fillRect(-4, -9, 2, 4);
        this.ctx.fillStyle = visorColor;
        this.ctx.beginPath();
        this.ctx.arc(-3, -11, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Visor
        this.ctx.fillStyle = '#1a202c';
        this.ctx.fillRect(4, -4, 8, 8);
        this.ctx.fillStyle = visorColor;
        if (!isDead) {
            this.ctx.shadowColor = visorColor;
            this.ctx.shadowBlur = 8;
        }
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
        
        // Floating animation (bobbing)
        const bob = Math.sin(Date.now() / 300) * 3;
        const textY = cy - ts/2 - 15 + bob;

        // Measure text for background plate
        const metrics = this.ctx.measureText(displayVal);
        const bgW = Math.max(20, metrics.width + 12);
        const bgH = 22;
        const bgX = cx - bgW / 2;
        const bgY = textY - bgH / 2 - 1;

        // Draw Background Plate (Rounded)
        // Color changes to green if complete, otherwise remains dark
        const isComplete = remaining === 0;
        this.ctx.fillStyle = isComplete ? 'rgba(0, 100, 50, 0.95)' : 'rgba(10, 15, 20, 0.95)';
        this.ctx.strokeStyle = isComplete ? '#00ff9f' : '#00f0ff';
        this.ctx.lineWidth = 2;
        
        // Manual round rect
        const r = 6;
        this.ctx.beginPath();
        this.ctx.moveTo(bgX + r, bgY);
        this.ctx.lineTo(bgX + bgW - r, bgY);
        this.ctx.quadraticCurveTo(bgX + bgW, bgY, bgX + bgW, bgY + r);
        this.ctx.lineTo(bgX + bgW, bgY + bgH - r);
        this.ctx.quadraticCurveTo(bgX + bgW, bgY + bgH, bgX + bgW - r, bgY + bgH);
        this.ctx.lineTo(bgX + r, bgY + bgH);
        this.ctx.quadraticCurveTo(bgX, bgY + bgH, bgX, bgY + bgH - r);
        this.ctx.lineTo(bgX, bgY + r);
        this.ctx.quadraticCurveTo(bgX, bgY, bgX + r, bgY);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // White fill text
        this.ctx.fillStyle = '#fff';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(displayVal, cx, textY + 1);
        this.ctx.textBaseline = 'alphabetic'; // Reset
    },

    spawnParticle(x, y, color, type = 'spark') {
        const p = {
            x: x, y: y,
            vx: type === 'smoke' ? (Math.random() - 0.5) * 0.4 : (type === 'debris' ? (Math.random() - 0.5) * 8 : (Math.random() - 0.5) * 5),
            vy: type === 'smoke' ? -0.2 - Math.random() * 0.3 : (type === 'debris' ? (Math.random() - 0.5) * 8 : (Math.random() - 0.5) * 5),
            life: 1.0,
            color: color,
            type: type,
            size: type === 'smoke' ? 2 + Math.random() * 3 : 4
        };
        this.particles.push(p);
        return p;
    },

    drawParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.type === 'smoke' ? 0.01 : 0.05;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;

            if (p.type === 'smoke') {
                const progress = 1 - p.life; // 0 to 1
                const scale = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
                const currentSize = Math.abs(p.size * scale);
                
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (p.type === 'spark') {
                // Realistic line sparks (streaks) - Thicker and more opaque
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = 2.5;
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                // Tail length based on velocity
                this.ctx.lineTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5);
                this.ctx.stroke();
            } else {
                this.ctx.fillRect(p.x, p.y, p.size, p.size);
            }
        }
        this.ctx.globalAlpha = 1.0;
    },

    clearParticles() {
        this.particles.length = 0;
    },

    clearTrails() {
        this.trails.length = 0; // Clear dynamic trails
        // Clear the offscreen trail buffer
        if (this.trailCtx) {
            this.trailCtx.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height);
        }
    },

    spawnTrailSegment(vx, vy, angle) {
        const ts = this.tileSize;
        const cx = vx * ts + ts / 2;
        const cy = vy * ts + ts / 2;

        const treadOffset = 7;
        const ox1 = Math.cos(angle + Math.PI/2) * treadOffset;
        const oy1 = Math.sin(angle + Math.PI/2) * treadOffset;
        const ox2 = Math.cos(angle - Math.PI/2) * treadOffset;
        const oy2 = Math.sin(angle - Math.PI/2) * treadOffset;

        const jitter = () => (Math.random() - 0.5);

        // Add to dynamic array first so it can "dry" visually
        this.trails.push({
            x1: cx + ox1 + jitter() * 3, 
            y1: cy + oy1 + jitter() * 3,
            x2: cx + ox2 + jitter() * 3, 
            y2: cy + oy2 + jitter() * 3,
            angle: angle + jitter() * 0.2,
            size: 3 + Math.random() * 3, 
            length: 8 + Math.random() * 10,
            baseAlpha: 0.2 + Math.random() * 0.5,
            life: 1.0 
        });
    },

    drawTrails() {
        this.ctx.save();
        
        // 1. Draw the static, permanent trails (the "baked" ones)
        if (this.trailCanvas) {
            this.ctx.drawImage(this.trailCanvas, 0, 0);
        }

        // 2. Process and draw dynamic "drying" trails
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const t = this.trails[i];
            
            // Slower drying speed (about 8-10 seconds)
            t.life -= 0.002; 

            if (t.life <= 0.3) {
                // Bake to buffer
                this.bakeTrailToBuffer(t);
                // Draw one last time on main ctx to prevent flicker
                this.drawSingleTrail(this.ctx, t, t.baseAlpha * 0.3);
                this.trails.splice(i, 1);
                continue;
            }

            // Draw dynamic segment
            this.drawSingleTrail(this.ctx, t, t.baseAlpha * t.life);
        }

        this.ctx.restore();
        this.ctx.globalAlpha = 1.0;
    },

    drawSingleTrail(ctx, t, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#1a1510';

        // Left
        ctx.save();
        ctx.translate(t.x1, t.y1);
        ctx.rotate(t.angle);
        ctx.fillRect(-t.length / 2, -t.size / 2, t.length, t.size);
        ctx.restore();

        // Right
        ctx.save();
        ctx.translate(t.x2, t.y2);
        ctx.rotate(t.angle);
        ctx.fillRect(-t.length / 2, -t.size / 2, t.length, t.size);
        ctx.restore();

        ctx.restore();
    },

    bakeTrailToBuffer(t) {
        if (!this.trailCtx) return;
        this.drawSingleTrail(this.trailCtx, t, t.baseAlpha * 0.3);
    },

    drawVHSEffect() {
        const ctx = this.ctx;
        const w = 640;
        const h = 480;

        // 1. CRT Scanlines
        ctx.fillStyle = 'rgba(18, 16, 16, 0.2)';
        for (let i = 0; i < h; i += 3) {
            ctx.fillRect(0, i, w, 1);
        }

        // 2. Tracking Noise Lines
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        const numNoise = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numNoise; i++) {
            const y = Math.random() * h;
            const height = 1 + Math.random() * 2;
            ctx.fillRect(0, y, w, height);
        }

        // 3. Glitch/Jitter (Horizontal shift)
        if (Math.random() > 0.8) {
            const jitterX = (Math.random() - 0.5) * 4;
            const jitterY = (Math.random() - 0.5) * 2;
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.3;
            ctx.drawImage(ctx.canvas, jitterX, jitterY);
            ctx.restore();
        }

        // 4. VHS "REW" Indicator
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px "VT323", monospace';
        ctx.textAlign = 'left';
        
        // Blink "REW"
        if (Math.floor(Date.now() / 200) % 2 === 0) {
            ctx.fillText('PLAY  -16x', 40, 50);
            ctx.fillText('<< REW', 40, 80);
        }

        // Rolling Timecode (simulated)
        const date = new Date();
        const tc = `00:04:${date.getSeconds().toString().padStart(2, '0')}:${Math.floor(date.getMilliseconds()/10).toString().padStart(2, '0')}`;
        ctx.fillText(tc, 40, h - 40);
        
        // Static Grain
        for (let i = 0; i < 50; i++) {
            const gx = Math.random() * w;
            const gy = Math.random() * h;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(gx, gy, 1, 1);
        }
    }
};
