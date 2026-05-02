Object.assign(Graphics, {
    drawWire(x, y, type, flowData, time) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        const hc = px + ts/2;
        const vc = py + ts/2;
        const w = 12; // Thicker pipe inner
        const hw = w/2;
        
        const isPowered = !!flowData;
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

            for (let d of entries) {
                const dirMap = { [DIRS.LEFT]: DIRS.RIGHT, [DIRS.RIGHT]: DIRS.LEFT, [DIRS.UP]: DIRS.DOWN, [DIRS.DOWN]: DIRS.UP };
                drawArrowAt(dirMap[d], true);
            }
            for (let d of exits) {
                drawArrowAt(d, false);
            }
        }
    },

    drawChargingStation(x, y, isPowered, frame) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        this.ctx.fillStyle = '#2d3748';
        this.ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
        
        this.ctx.fillStyle = '#1a202c';
        this.ctx.fillRect(px + 6, py + 6, ts - 12, ts - 12);

        if (isPowered) {
            this.ctx.save();
            this.ctx.fillStyle = '#00ff9f';
            this.ctx.fillRect(px + 10, py + 10, ts - 20, ts - 20);
            this.ctx.fillStyle = '#fff';
            this.ctx.globalAlpha = 0.5 + Math.sin(frame * 0.1) * 0.2;
            this.ctx.fillRect(px + 14, py + 14, ts - 28, ts - 28);
            this.ctx.restore();
        } else {
            this.ctx.fillStyle = '#0a0a0a'; 
            this.ctx.fillRect(px + 10, py + 10, ts - 20, ts - 20);
            
            const s = 2;
            const corners = [
                { x: px + 11, y: py + 11, i: 0 },
                { x: px + ts - 13, y: py + 11, i: 1 },
                { x: px + 11, y: py + ts - 13, i: 2 },
                { x: px + ts - 13, y: py + ts - 13, i: 3 }
            ];

            this.ctx.fillStyle = '#ffcc00';
            for (const c of corners) {
                const flicker = Math.sin(frame * 0.05 + c.i * 2.1) + Math.sin(frame * 0.08 + c.i * 1.2);
                if (flicker > 1.2) {
                    this.ctx.fillRect(c.x, c.y, s, s);
                }
            }
        }
    },

    drawBrokenCore(x, y, frame) {
        const ts = this.tileSize;
        const cx = x * ts + ts/2;
        const cy = y * ts + ts/2;

        this.ctx.save();
        this.ctx.fillStyle = '#222';
        const clawSize = 6;
        const clawOffset = ts/2 - 6;
        this.ctx.fillRect(cx - clawOffset - 2, cy - clawOffset - 2, clawSize, clawSize);
        this.ctx.fillRect(cx + clawOffset - 4, cy - clawOffset - 2, clawSize, clawSize);
        this.ctx.fillRect(cx - clawOffset - 2, cy + clawOffset - 4, clawSize, clawSize);
        this.ctx.fillRect(cx + clawOffset - 4, cy + clawOffset - 4, clawSize, clawSize);

        this.ctx.fillStyle = '#111';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, ts/2 - 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, ts/2 - 8, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 6, cy - 6); this.ctx.lineTo(cx + 2, cy + 2); this.ctx.lineTo(cx - 2, cy + 8);
        this.ctx.moveTo(cx + 8, cy - 8); this.ctx.lineTo(cx - 2, cy - 2); this.ctx.lineTo(cx + 6, cy + 4);
        this.ctx.stroke();

        if (frame % 6 === 0) {
            this.particles.push({
                x: cx + (Math.random()-0.5)*6, 
                y: cy - 4,
                vx: (Math.random() - 0.5) * 0.2,
                vy: -0.2 - Math.random() * 0.3,
                life: 2.5,
                color: Math.random() > 0.5 ? '#222' : '#111',
                type: 'smoke',
                size: 10 + Math.random() * 5
            });
        }
        if (frame % 12 === 0) {
            this.spawnParticle(cx, cy, '#ffcc00', 'spark');
        }
        this.ctx.restore();
    },

    drawCore(x, y, charType, isPowered, required = 0, current = 0, isContaminated = false) {
        const ts = this.tileSize;
        const cx = x * ts + ts/2;
        const cy = y * ts + ts/2;
        
        let color = COLORS.coreBlue;
        if (charType === 'B') {
            isPowered = true;
            color = COLORS.coreBlue;
        } else if (charType === 'X') {
            isPowered = true;
            color = '#ff003c';
        } else if (charType === 'T' || (charType >= '0' && charType <= '9')) {
            if (isContaminated) {
                color = '#ff003c';
                isPowered = true;
            } else {
                color = isPowered ? COLORS.coreTargetPowered : COLORS.coreTargetIdle;
            }
        }

        this.ctx.fillStyle = '#444';
        const clawSize = 6;
        const clawOffset = ts/2 - 6;
        this.ctx.fillRect(cx - clawOffset - 2, cy - clawOffset - 2, clawSize, clawSize);
        this.ctx.fillRect(cx + clawOffset - 4, cy - clawOffset - 2, clawSize, clawSize);
        this.ctx.fillRect(cx - clawOffset - 2, cy + clawOffset - 4, clawSize, clawSize);
        this.ctx.fillRect(cx + clawOffset - 4, cy + clawOffset - 4, clawSize, clawSize);

        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(cx - clawOffset, cy - clawOffset, 2, 2);
        this.ctx.fillRect(cx + clawOffset - 2, cy - clawOffset, 2, 2);
        this.ctx.fillRect(cx - clawOffset, cy + clawOffset - 2, 2, 2);
        this.ctx.fillRect(cx + clawOffset - 2, cy + clawOffset - 2, 2, 2);

        this.ctx.fillStyle = '#222';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, ts/2 - 4, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, ts/2 - 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, ts/2 - 12, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.fillStyle = '#fff';
        this.ctx.globalAlpha = isPowered ? 0.8 : 0.2;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;

    },

    drawCatalyst(x, y, active, frame) {
        const ts = this.tileSize;
        const px = x * ts;
        const py = y * ts;
        const cx = px + ts/2;
        const cy = py + ts/2;

        this.ctx.save();
        this.ctx.fillStyle = '#3a3a4a';
        this.ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
        this.ctx.strokeStyle = active ? '#00f0ff' : '#5a5a6a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(px + 3, py + 3, ts - 6, ts - 6);
        
        this.ctx.fillStyle = '#1a1a2a';
        this.ctx.fillRect(px + 2, py + 2, 8, 8);
        this.ctx.fillRect(px + ts - 10, py + 2, 8, 8);
        this.ctx.fillRect(px + 2, py + ts - 10, 8, 8);
        this.ctx.fillRect(px + ts - 10, py + ts - 10, 8, 8);

        this.ctx.fillStyle = active ? '#00f0ff' : '#1a1a1a';
        const portW = 8;
        const portH = 4;
        this.ctx.fillRect(cx - portW/2, py, portW, portH);
        this.ctx.fillRect(cx - portW/2, py + ts - portH, portW, portH);
        this.ctx.fillRect(px, cy - portW/2, portH, portW);
        this.ctx.fillRect(px + ts - portH, cy - portW/2, portH, portW);

        this.ctx.save();
        if (active) {
            this.ctx.fillStyle = '#00f0ff';
        } else {
            this.ctx.fillStyle = '#1a1a1a';
        }
        
        this.ctx.beginPath();
        const r = 8;
        this.ctx.moveTo(cx, cy - r - 2); this.ctx.lineTo(cx + r, cy - r); this.ctx.lineTo(cx + r + 2, cy); this.ctx.lineTo(cx + r, cy + r);
        this.ctx.lineTo(cx, cy + r + 2); this.ctx.lineTo(cx - r, cy + r); this.ctx.lineTo(cx - r - 2, cy); this.ctx.lineTo(cx - r, cy - r);
        this.ctx.closePath();
        this.ctx.fill();
        
        if (active) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.globalAlpha = 0.6;
            this.ctx.beginPath();
            const angle = frame * 0.1;
            this.ctx.arc(cx, cy, 5, angle, angle + Math.PI);
            this.ctx.stroke();
            if (Math.random() > 0.8) this.spawnParticle(cx + (Math.random()-0.5)*10, cy + (Math.random()-0.5)*10, '#00f0ff', 'spark');
        }
        this.ctx.restore();
        this.ctx.restore();
    }
});
