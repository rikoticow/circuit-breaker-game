Object.assign(Graphics, {
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

    drawHole(x, y, neighbors = 0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // 1. TOTAL VOID
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(px, py, ts, ts);

        // Neighbors bitmask: 1: Up, 2: Right, 4: Down, 8: Left
        const hasUp = neighbors & 1;
        const hasRight = neighbors & 2;
        const hasDown = neighbors & 4;
        const hasLeft = neighbors & 8;

        // 2. LAYERED ORGANIC RIMS (High detail, varied distortion)
        const layers = [
            { color: '#2a2a35', width: 2.5, intensity: 3.0, seed: 123, offset: 0.5 }, 
            { color: '#3b3b4a', width: 1.5, intensity: 2.0, seed: 456, offset: 1.0 }, 
            { color: '#15151a', width: 0.8, intensity: 4.5, seed: 789, offset: 0.0 },
            { color: '#0a0a0f', width: 2.0, intensity: 1.5, seed: 321, offset: 1.5 }
        ];

        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';

        layers.forEach(layer => {
            this.ctx.strokeStyle = layer.color;
            this.ctx.lineWidth = layer.width;
            
            // Multi-octave jitter for a more "cracked" edge
            const jitter = (s, i) => {
                const noise = Math.sin(s * 11.0 + layer.seed) * 0.6 + 
                              Math.sin(s * 27.0 + layer.seed) * 0.3 +
                              Math.sin(s * 53.0 + layer.seed) * 0.1;
                return Math.max(0, noise * i);
            };

            this.ctx.beginPath();
            
            // TOP
            if (!hasUp) {
                this.ctx.moveTo(px, py + layer.offset + jitter(x, layer.intensity));
                for (let i = 2; i <= ts; i += 2) {
                    this.ctx.lineTo(px + i, py + layer.offset + jitter(x + i/ts, layer.intensity));
                }
            }

            // RIGHT
            if (!hasRight) {
                const startY = hasUp ? py : py + layer.offset;
                this.ctx.moveTo(px + ts - layer.offset - jitter(y, layer.intensity), startY);
                for (let i = 2; i <= ts; i += 2) {
                    this.ctx.lineTo(px + ts - layer.offset - jitter(y + i/ts, layer.intensity), py + i);
                }
            }

            // BOTTOM
            if (!hasDown) {
                const startX = hasRight ? px + ts : px + ts - layer.offset;
                this.ctx.moveTo(startX, py + ts - layer.offset - jitter(x + 1, layer.intensity));
                for (let i = ts; i >= 0; i -= 2) {
                    this.ctx.lineTo(px + i, py + ts - layer.offset - jitter(x + i/ts, layer.intensity));
                }
            }
            // LEFT
            if (!hasLeft) {
                const startY = hasDown ? py + ts : py + ts - layer.offset;
                this.ctx.moveTo(px + layer.offset + jitter(y + 1, layer.intensity), startY);
                for (let i = ts; i >= 0; i -= 2) {
                    this.ctx.lineTo(px + layer.offset + jitter(y + i/ts, layer.intensity), py + i);
                }
            }

            this.ctx.stroke();
        });
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
        } else if (variant === 7) {
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
        } else {
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

    drawGlassWall(x, y, frame, isLaserPassing) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        this.ctx.save();

        // 1. Reinforced Metal Frame (Dark industrial look)
        this.ctx.fillStyle = '#4a5568';
        this.ctx.fillRect(px, py, ts, ts);
        
        // Glass inner area (Cutout)
        this.ctx.fillStyle = 'rgba(20, 30, 40, 0.8)';
        this.ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);
        
        // Glass Surface (Translucent with light blue tint)
        this.ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
        this.ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);

        // 2. Industrial Rivets in corners
        this.ctx.fillStyle = '#1a1a1a';
        const rs = 2;
        this.ctx.fillRect(px + 1, py + 1, rs, rs);
        this.ctx.fillRect(px + ts - 3, py + 1, rs, rs);
        this.ctx.fillRect(px + 1, py + ts - 3, rs, rs);
        this.ctx.fillRect(px + ts - 3, py + ts - 3, rs, rs);

        // 3. Diagonal Reflections (Glass shine)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        // Main reflections
        this.ctx.moveTo(px + 6, py + ts - 6);
        this.ctx.lineTo(px + ts - 6, py + 6);
        this.ctx.moveTo(px + 12, py + ts - 6);
        this.ctx.lineTo(px + ts - 6, py + 12);
        this.ctx.stroke();

        // 4. Optic Permeability Feedback (Cyan glow on edges when laser passes)
        if (isLaserPassing) {
            this.ctx.save();
            const glowAlpha = 0.3 + Math.sin(frame * 0.2) * 0.2;
            this.ctx.strokeStyle = `rgba(0, 240, 255, ${glowAlpha})`;
            this.ctx.lineWidth = 2;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#00f0ff';
            // Draw inner glowing rectangle
            this.ctx.strokeRect(px + 5, py + 5, ts - 10, ts - 10);
            
            // Random sparks on the glass surface
            if (Math.random() > 0.9) {
                this.spawnParticle(px + 16, py + 16, '#00f0ff', 'spark');
            }
            this.ctx.restore();
        }

        this.ctx.restore();
    }
});
