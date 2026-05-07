Object.assign(Graphics, {
    drawFloor(x, y, char = '.', mask = 0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // Coordinate-based variation (pseudo-random)
        const seedX = x + (this.levelSeed || 0);
        const seedY = y + (this.levelSeed || 0);
        const seed = Math.abs(Math.sin(seedX * 12.9898 + seedY * 78.233) * 43758.5453) % 1;

        if (char === 'a') {
            // SECTOR A: Laboratório (Asséptico com Desgaste e Variação de Pontos)
            const lBase = 88 + (seed - 0.5) * 5;
            this.ctx.fillStyle = `hsl(210, 8%, ${lBase}%)`;
            this.ctx.fillRect(px, py, ts, ts);

            // Subtle Tiling
            this.ctx.strokeStyle = `rgba(0, 0, 0, 0.05)`;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);

            // VARIATION: Dense Dotted Pattern (Clean Anti-slip)
            if (seed > 0.6) {
                this.ctx.fillStyle = `rgba(0, 0, 0, 0.03)`;
                const spacing = 4;
                for (let i = 2; i < ts; i += spacing) {
                    for (let j = 2; j < ts; j += spacing) {
                        this.ctx.fillRect(px + i, py + j, 1, 1);
                    }
                }
            }

            // Scratches (Numerous but very subtle)
            this.ctx.lineWidth = 0.5;
            for (let i = 0; i < 3; i++) {
                const sSeed = (seed * (i + 1) * 1337) % 1;
                if (sSeed > 0.3) {
                    this.ctx.strokeStyle = `rgba(0, 0, 0, ${0.02 + sSeed * 0.03})`;
                    this.ctx.beginPath();
                    const xOff = (sSeed * 100) % 20;
                    const yOff = (sSeed * 200) % 20;
                    const len = 3 + sSeed * 5;
                    this.ctx.moveTo(px + xOff, py + yOff);
                    this.ctx.lineTo(px + xOff + len, py + yOff + (sSeed * 2));
                    this.ctx.stroke();
                }
            }

            // Dirt/Grime (Small, very faint spots)
            for (let i = 0; i < 2; i++) {
                const dSeed = (seed * (i + 1) * 777) % 1;
                if (dSeed > 0.6) {
                    this.ctx.fillStyle = `rgba(60, 50, 40, 0.025)`;
                    this.ctx.beginPath();
                    this.ctx.arc(px + ts * dSeed, py + ts * ((dSeed * 2) % 1), 1 + dSeed * 3, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }

        } else if (char === 'b') {
            // SECTOR B: Industrial Hybrid (Avermelhado / Chapa + Grade + Variação de Pontos)
            const h = 10 + (seed - 0.5) * 5;
            const s = 25 + (seed - 0.5) * 5;
            const l = 12 + (seed - 0.5) * 3;
            this.ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
            this.ctx.fillRect(px, py, ts, ts);

            // VARIATION: Switch between Dotted or Hybrid
            if (seed > 0.6) {
                // Subtle Dotted Pattern
                this.ctx.fillStyle = `hsl(${h}, ${s}%, ${l + 4}%)`;
                const dotSize = 2;
                const spacing = 8;
                for (let i = 4; i < ts; i += spacing) {
                    for (let j = 4; j < ts; j += spacing) {
                        this.ctx.beginPath();
                        this.ctx.arc(px + i, py + j, dotSize/2, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
            } else {
                // Diamond plate background
                this.ctx.strokeStyle = `hsla(${h}, ${s}%, ${l + 10}%, 0.25)`;
                this.ctx.beginPath();
                for(let i=4; i<ts; i+=10) {
                    this.ctx.moveTo(px+i, py+4); this.ctx.lineTo(px+i-3, py+7);
                    this.ctx.moveTo(px+i, py+ts-7); this.ctx.lineTo(px+i+3, py+ts-4);
                }
                this.ctx.stroke();

                // Grate in the middle area
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                this.ctx.fillRect(px + 6, py + 6, ts - 12, ts - 12);
                
                this.ctx.strokeStyle = `hsl(${h}, ${s}%, ${l + 8}%)`;
                this.ctx.lineWidth = 1;
                for(let i=8; i<ts-6; i+=6) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(px+i, py+6); this.ctx.lineTo(px+i, py+ts-6);
                    this.ctx.stroke();
                    this.ctx.beginPath();
                    this.ctx.moveTo(px+6, py+i); this.ctx.lineTo(px+ts-6, py+i);
                    this.ctx.stroke();
                }
            }

            // Corner bolts (Always present for consistency)
            this.ctx.fillStyle = `hsl(${h}, ${s}%, ${l - 8}%)`;
            this.ctx.fillRect(px + 2, py + 2, 3, 3);
            this.ctx.fillRect(px + ts - 5, py + 2, 3, 3);
            this.ctx.fillRect(px + 2, py + ts - 5, 3, 3);
            this.ctx.fillRect(px + ts - 5, py + ts - 5, 3, 3);
        } else if (char === 'c') {
            // SECTOR C: High-Tech (Composite Technical Panels)
            const h = 210, s = 12;
            const baseL = 14 + (seed - 0.5) * 4;
            this.ctx.fillStyle = `hsl(${h}, ${s}%, ${baseL}%)`;
            this.ctx.fillRect(px, py, ts, ts);

            // 4-Quadrant Panel Design
            const half = ts / 2;
            this.ctx.lineWidth = 1;
            
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    const qx = px + i * half;
                    const qy = py + j * half;
                    
                    // Panel Bevel
                    this.ctx.strokeStyle = `rgba(255, 255, 255, 0.05)`;
                    this.ctx.strokeRect(qx + 1.5, qy + 1.5, half - 3, half - 3);
                    this.ctx.strokeStyle = `rgba(0, 0, 0, 0.3)`;
                    this.ctx.strokeRect(qx + 0.5, qy + 0.5, half - 1, half - 1);

                    // Technical Detail: LEDs (Procedural Variation)
                    const ledMode = Math.floor(seed * 10); // 0-9
                    const bs = 2;
                    
                    for (let k = 0; k < 4; k++) {
                        // LED Positions in quadrant
                        const lx = (k === 0 || k === 2) ? 4 : half - 6;
                        const ly = (k === 0 || k === 1) ? 4 : half - 6;
                        
                        let isOn = false;
                        if (ledMode === 7) isOn = true; // Mode: All ON
                        else if (ledMode === 8 && k === 0 && i === 0 && j === 0) isOn = true; // Mode: Only ONE on the whole tile
                        else if (ledMode === 9 && k === Math.floor(seed * 4)) isOn = true; // Mode: One per quadrant

                        if (isOn) {
                            this.ctx.fillStyle = '#00ff9f';
                            this.ctx.shadowBlur = 4;
                            this.ctx.shadowColor = '#00ff9f';
                            this.ctx.fillRect(qx + lx, qy + ly, bs, bs);
                            this.ctx.shadowBlur = 0;
                        } else {
                            this.ctx.fillStyle = `rgba(0, 0, 0, 0.5)`;
                            this.ctx.fillRect(qx + lx, qy + ly, bs, bs);
                        }
                    }
                }
            }

            // Central Technical Glow (Subtle Cyan Cross)
            this.ctx.strokeStyle = 'rgba(0, 255, 159, 0.06)';
            this.ctx.beginPath();
            this.ctx.moveTo(px + ts/2, py + 4); this.ctx.lineTo(px + ts/2, py + ts - 4);
            this.ctx.moveTo(px + 4, py + ts/2); this.ctx.lineTo(px + ts - 4, py + ts/2);
            this.ctx.stroke();
        } else if (char === 'z') {
            // SECTOR: Compilador (Chão - Vidro Iridescente)
            this.ctx.fillStyle = '#0a1a1f';
            this.ctx.fillRect(px, py, ts, ts);

            const t = Date.now() * 0.0005;
            const sheenPos = (t + seed) % 2;
            this.ctx.save();
            this.ctx.beginPath(); this.ctx.rect(px, py, ts, ts); this.ctx.clip();
            for (let i = 0; i < 2; i++) {
                const offset = (sheenPos + i * 0.6) % 2 - 1;
                const grad = this.ctx.createLinearGradient(px + offset * ts * 2, py, px + offset * ts * 2 + ts, py + ts);
                grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
                grad.addColorStop(0.5, `hsla(${(t * 50 + i * 60) % 360}, 100%, 70%, 0.1)`);
                grad.addColorStop(1, 'rgba(255, 0, 255, 0)');
                this.ctx.fillStyle = grad;
                this.ctx.fillRect(px, py, ts, ts);
            }
            this.ctx.restore();
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.beginPath();
            this.ctx.moveTo(px + 2, py + 2); this.ctx.lineTo(px + ts - 4, py + 2);
            this.ctx.moveTo(px + 2, py + 2); this.ctx.lineTo(px + 2, py + ts - 4);
            this.ctx.stroke();
            this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
            this.ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
        } else if (char === 'o') {
            // LOGISTIC SECTOR: Metal Plate Floor
            const lBase = 20 + (seed - 0.5) * 5;
            this.ctx.fillStyle = `hsl(210, 8%, ${lBase}%)`;
            this.ctx.fillRect(px, py, ts, ts);
            
            // Industrial Plate Details (Seams and Rivets)
            this.ctx.strokeStyle = `rgba(0, 0, 0, 0.4)`;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
            
            this.ctx.fillStyle = `rgba(255, 255, 255, 0.05)`;
            this.ctx.fillRect(px + 1, py + 1, ts - 2, 1);
            this.ctx.fillRect(px + 1, py + 1, 1, ts - 2);

            // Rivets in corners
            this.ctx.fillStyle = `rgba(0, 0, 0, 0.5)`;
            const rs = 2;
            this.ctx.fillRect(px + 3, py + 3, rs, rs);
            this.ctx.fillRect(px + ts - 5, py + 3, rs, rs);
            this.ctx.fillRect(px + 3, py + ts - 5, rs, rs);
            this.ctx.fillRect(px + ts - 5, py + ts - 5, rs, rs);
        } else if (char === ',') {
            // LOGISTIC SECTOR: Tactile Anti-slip Floor (Connectivity-aware)
            // Color variation: Blend between Yellow and Orange based on seed
            const hue = 48 - (seed * 20); // 48 (Yellow) to 28 (Orange)
            const baseColor = `hsl(${hue}, 90%, 50%)`;
            const darkColor = `hsl(${hue}, 90%, 40%)`;
            
            this.ctx.fillStyle = baseColor;
            this.ctx.fillRect(px, py, ts, ts);
            
            // Mask Logic: 1:Up, 2:Right, 4:Down, 8:Left
            const isVertical = (mask === 1 || mask === 4 || mask === 5);
            const isHorizontal = (mask === 2 || mask === 8 || mask === 10);
            const isHub = !isVertical && !isHorizontal;

            if (isHub) {
                // Dots pattern (Tactile Paving - Warning/Hub)
                const dotSize = 2.5;
                const spacing = 8;
                const offset = 4; // Centering: (32 - (3*8))/2 = 4
                for (let dy = offset; dy < ts; dy += spacing) {
                    for (let dx = offset; dx < ts; dx += spacing) {
                        // Shadow
                        this.ctx.fillStyle = 'rgba(0,0,0,0.25)';
                        this.ctx.beginPath();
                        this.ctx.arc(px + dx + 1, py + dy + 1, dotSize, 0, Math.PI * 2);
                        this.ctx.fill();
                        // Dot base
                        this.ctx.fillStyle = darkColor;
                        this.ctx.beginPath();
                        this.ctx.arc(px + dx, py + dy, dotSize, 0, Math.PI * 2);
                        this.ctx.fill();
                        // Highlight
                        this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
                        this.ctx.beginPath();
                        this.ctx.arc(px + dx - 0.5, py + dy - 0.5, dotSize/2, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
            } else {
                // Bars pattern (Directional)
                const barWidth = 3;
                const spacing = 8;
                const offset = 4;
                for (let i = offset; i < ts; i += spacing) {
                    // Shadow
                    this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    if (isVertical) this.ctx.fillRect(px + i + 1, py + 1, barWidth, ts - 2);
                    else this.ctx.fillRect(px + 1, py + i + 1, ts - 2, barWidth);
                    
                    // Bar base
                    this.ctx.fillStyle = darkColor;
                    if (isVertical) this.ctx.fillRect(px + i, py + 1, barWidth, ts - 2);
                    else this.ctx.fillRect(px + 1, py + i, ts - 2, barWidth);
                    
                    // Highlight
                    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    if (isVertical) this.ctx.fillRect(px + i, py + 1, 1, ts - 2);
                    else this.ctx.fillRect(px + 1, py + i, ts - 2, 1);
                }
            }

            // Tile border
            this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            this.ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
        } else if (char === 't') {
            // SECTOR: Óptico (Chão de Laboratório Iridescente - MAIS AZULADO)
            // Base: Technical blue-gray
            const lBase = 85 + (seed - 0.5) * 5;
            this.ctx.fillStyle = `hsl(210, 30%, ${lBase}%)`;
            this.ctx.fillRect(px, py, ts, ts);

            // Iridescent Sheen (Diagonal movement)
            const t = Date.now() * 0.0006;
            const sheenPos = (t + seed * 2) % 2.5;
            this.ctx.save();
            this.ctx.beginPath(); this.ctx.rect(px, py, ts, ts); this.ctx.clip();
            
            const offset = sheenPos - 1;
            const grad = this.ctx.createLinearGradient(px + offset * ts, py, px + offset * ts + ts, py + ts);
            grad.addColorStop(0, 'rgba(0, 200, 255, 0)');
            grad.addColorStop(0.5, `hsla(${(t * 30 + seed * 360) % 360}, 100%, 75%, 0.15)`);
            grad.addColorStop(1, 'rgba(255, 0, 255, 0)');
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(px, py, ts, ts);
            this.ctx.restore();

            // Hexagonal Technical Grid (Subtle Blue)
            this.ctx.strokeStyle = 'rgba(0, 150, 255, 0.1)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for(let i=0; i<3; i++) {
                const hx = px + ts/2 + Math.cos(i * Math.PI/1.5) * 12;
                const hy = py + ts/2 + Math.sin(i * Math.PI/1.5) * 12;
                this.ctx.moveTo(hx, hy);
                this.ctx.lineTo(px + ts/2, py + ts/2);
            }
            this.ctx.stroke();

            // Polished Edge
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
        } else if (char === '\u03C3') {
            // SECTOR: Processamento (Metal Plate Floor with Logistics Borders)
            const lBase = 20 + (seed - 0.5) * 5;
            this.ctx.fillStyle = `hsl(210, 10%, ${lBase}%)`;
            this.ctx.fillRect(px, py, ts, ts);
            
            // Industrial Plate Details (Seams only)
            this.ctx.strokeStyle = `rgba(0, 0, 0, 0.4)`;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
            
            this.ctx.fillStyle = `rgba(255, 255, 255, 0.05)`;
            this.ctx.fillRect(px + 1, py + 1, ts - 2, 1);
            this.ctx.fillRect(px + 1, py + 1, 1, ts - 2);

            // LOGISTICS DELIMITATION (Yellow Lines - DOUBLE THICK)
            // Neighbors bitmask: 1: Up, 2: Right, 4: Down, 8: Left
            const yellow = '#ffcc00';
            this.ctx.lineWidth = 8;
            this.ctx.strokeStyle = yellow;
            
            if (mask & 1) { // Border with Wall above
                this.ctx.beginPath(); this.ctx.moveTo(px, py + 4); this.ctx.lineTo(px + ts, py + 4); this.ctx.stroke();
            }
            if (mask & 2) { // Border with Wall right
                this.ctx.beginPath(); this.ctx.moveTo(px + ts - 4, py); this.ctx.lineTo(px + ts - 4, py + ts); this.ctx.stroke();
            }
            if (mask & 4) { // Border with Wall below
                this.ctx.beginPath(); this.ctx.moveTo(px, py + ts - 4); this.ctx.lineTo(px + ts, py + ts - 4); this.ctx.stroke();
            }
            if (mask & 8) { // Border with Wall left
                this.ctx.beginPath(); this.ctx.moveTo(px + 4, py); this.ctx.lineTo(px + 4, py + ts); this.ctx.stroke();
            }

            // Rivets in corners (Drawn ABOVE yellow lines per request)
            this.ctx.fillStyle = `rgba(0, 0, 0, 0.5)`;
            const rs = 2;
            this.ctx.fillRect(px + 3, py + 3, rs, rs);
            this.ctx.fillRect(px + ts - 5, py + 3, rs, rs);
            this.ctx.fillRect(px + 3, py + ts - 5, rs, rs);
            this.ctx.fillRect(px + ts - 5, py + ts - 5, rs, rs);
        } else if (char === '\u03A3') {
            // Reserved for Σ Wall (handled in drawWallFace)
            return;
        } else if (char === '&') {
            // SECTOR: Realidade (Chão - High-Tech Multicolorido)
            // Base: Technical gray (Matches High-Tech 'c' but slightly deeper)
            const seedVal = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
            const baseL = 12 + (seedVal - 0.5) * 4;
            this.ctx.fillStyle = `hsl(210, 10%, ${baseL}%)`;
            this.ctx.fillRect(px, py, ts, ts);

            // Dynamic Multicolor Setup
            const t = Date.now() * 0.002;
            const hue = (t * 50 + x * 20 + y * 20 + seedVal * 360) % 360;
            const neonColor = `hsl(${hue}, 100%, 65%)`;

            // 4-Quadrant Panel Design (Matches High-Tech 'c')
            const half = ts / 2;
            this.ctx.lineWidth = 1;
            
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    const qx = px + i * half;
                    const qy = py + j * half;
                    
                    // Panel Bevel
                    this.ctx.strokeStyle = `rgba(255, 255, 255, 0.03)`;
                    this.ctx.strokeRect(qx + 1.5, qy + 1.5, half - 3, half - 3);
                    this.ctx.strokeStyle = `rgba(0, 0, 0, 0.5)`;
                    this.ctx.strokeRect(qx + 0.5, qy + 0.5, half - 1, half - 1);

                    // Technical Detail: LEDs (Multicolor variation)
                    const ledMode = Math.floor(seedVal * 10);
                    const bs = 2;
                    
                    for (let k = 0; k < 4; k++) {
                        const lx = (k === 0 || k === 2) ? 4 : half - 6;
                        const ly = (k === 0 || k === 1) ? 4 : half - 6;
                        
                        let isOn = false;
                        if (ledMode === 7) isOn = true;
                        else if (ledMode === 8 && k === 0 && i === 0 && j === 0) isOn = true;
                        else if (ledMode === 9 && k === Math.floor(seedVal * 4)) isOn = true;

                        if (isOn) {
                            this.ctx.fillStyle = neonColor;
                            this.ctx.shadowBlur = 6;
                            this.ctx.shadowColor = neonColor;
                            this.ctx.fillRect(qx + lx, qy + ly, bs, bs);
                            this.ctx.shadowBlur = 0;
                        } else {
                            this.ctx.fillStyle = `rgba(255, 255, 255, 0.05)`;
                            this.ctx.fillRect(qx + lx, qy + ly, bs, bs);
                        }
                    }
                }
            }
            // Central intersection glow
            this.ctx.fillStyle = neonColor;
            this.ctx.globalAlpha = 0.1;
            this.ctx.fillRect(px + half - 1, py + 2, 2, ts - 4);
            this.ctx.fillRect(px + 2, py + half - 1, ts - 4, 2);
            this.ctx.globalAlpha = 1.0;
        } else if (char === '\u03C1') {
            // PROCESSING SECTOR: Pink Tactile Floor (Copied from Logistics ',')
            const hue = 320 + (seed * 20); // Pink/Magenta range
            const baseColor = `hsl(${hue}, 70%, 50%)`;
            const darkColor = `hsl(${hue}, 70%, 40%)`;
            
            this.ctx.fillStyle = baseColor;
            this.ctx.fillRect(px, py, ts, ts);
            
            const isVertical = (mask === 1 || mask === 4 || mask === 5);
            const isHorizontal = (mask === 2 || mask === 8 || mask === 10);
            const isHub = !isVertical && !isHorizontal;

            if (isHub) {
                const dotSize = 2.5; const spacing = 8; const offset = 4;
                for (let dy = offset; dy < ts; dy += spacing) {
                    for (let dx = offset; dx < ts; dx += spacing) {
                        this.ctx.fillStyle = 'rgba(0,0,0,0.25)';
                        this.ctx.beginPath(); this.ctx.arc(px + dx + 1, py + dy + 1, dotSize, 0, Math.PI * 2); this.ctx.fill();
                        this.ctx.fillStyle = darkColor;
                        this.ctx.beginPath(); this.ctx.arc(px + dx, py + dy, dotSize, 0, Math.PI * 2); this.ctx.fill();
                        this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
                        this.ctx.beginPath(); this.ctx.arc(px + dx - 0.5, py + dy - 0.5, dotSize/2, 0, Math.PI * 2); this.ctx.fill();
                    }
                }
            } else {
                const barWidth = 3; const spacing = 8; const offset = 4;
                for (let i = offset; i < ts; i += spacing) {
                    this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    if (isVertical) this.ctx.fillRect(px + i + 1, py + 1, barWidth, ts - 2);
                    else this.ctx.fillRect(px + 1, py + i + 1, ts - 2, barWidth);
                    this.ctx.fillStyle = darkColor;
                    if (isVertical) this.ctx.fillRect(px + i, py + 1, barWidth, ts - 2);
                    else this.ctx.fillRect(px + 1, py + i, ts - 2, barWidth);
                    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    if (isVertical) this.ctx.fillRect(px + i, py + 1, 1, ts - 2);
                    else this.ctx.fillRect(px + 1, py + i, ts - 2, 1);
                }
            }
            this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            this.ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
        } else if (char === "'") {
            // SECTOR: Quântico (Chão de Dados - Heavy Metal Gray)
            // 1. BASE: Massive Iron Slate
            const seedVal = Math.abs(Math.sin(seed * 43.123 + x * 12.7 + y * 9.1) * 1000) % 1;
            this.ctx.fillStyle = '#202025';
            this.ctx.fillRect(px, py, ts, ts);

            // 1. Geometric Etching (Circuit-like but mystic)
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            if (seedVal > 0.5) {
                this.ctx.moveTo(px + 4, py + 4); this.ctx.lineTo(px + ts - 4, py + ts - 4);
            } else {
                this.ctx.moveTo(px + ts - 4, py + 4); this.ctx.lineTo(px + 4, py + ts - 4);
            }
            this.ctx.stroke();
            
            // Subtle Industrial Grid
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.moveTo(px, py + ts/2); this.ctx.lineTo(px + ts, py + ts/2);
            this.ctx.moveTo(px + ts/2, py); this.ctx.lineTo(px + ts/2, py + ts);
            this.ctx.stroke();

            // 2. Glowing Runic Detail (Purple)
            const pulse = (Math.sin(Date.now() * 0.003 + seedVal * 10) + 1) / 2;
            const purpleNeon = '#bf00ff';
            if (seedVal > 0.7) {
                this.ctx.fillStyle = purpleNeon;
                this.ctx.globalAlpha = 0.1 + pulse * 0.4;
                this.ctx.shadowBlur = 8 * pulse;
                this.ctx.shadowColor = purpleNeon;
                this.ctx.font = '8px monospace';
                this.ctx.textAlign = 'center';
                const runes = ["◊", "∆", "Σ", "Ω", "∞", "⚛", "✧"];
                const rune = runes[Math.floor(seedVal * runes.length)];
                this.ctx.fillText(rune, px + ts/2, py + ts/2 + 3);
                this.ctx.shadowBlur = 0;
                this.ctx.globalAlpha = 1.0;
            }

            // 3. Heavy Metal Bevel
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            this.ctx.strokeRect(px + 1, py + 1, ts - 2, ts - 2);
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
        } else {
            // DEFAULT: Chão (Borracha) - Original Copper Style
            const h = 25 + (seed - 0.5) * 6;
            const s = 15 + (seed - 0.5) * 4;
            const l = 18 + (seed - 0.5) * 5;
            this.ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
            this.ctx.fillRect(px, py, ts, ts);

            // Subtle Border/Bevel (Copper highlight)
            this.ctx.strokeStyle = `hsl(${h}, ${s}%, ${l + 8}%)`;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);

            // Rivets in corners (Deep Copper Shadow)
            this.ctx.fillStyle = `hsl(${h}, ${s}%, ${l - 10}%)`;
            const rs = 2; // Rivet size
            this.ctx.fillRect(px + 4, py + 4, rs, rs);
            this.ctx.fillRect(px + ts - 6, py + 4, rs, rs);
            this.ctx.fillRect(px + 4, py + ts - 6, rs, rs);
            this.ctx.fillRect(px + ts - 6, py + ts - 6, rs, rs);
            
            // Subtle diagonal texture (Copper sheen)
            this.ctx.strokeStyle = 'rgba(255, 180, 100, 0.04)';
            this.ctx.beginPath();
            this.ctx.moveTo(px + 5, py + 5);
            this.ctx.lineTo(px + ts - 5, py + ts - 5);
            this.ctx.stroke();
        }
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
            { color: '#2a2a35', width: 2.5, intensity: 3.0, seed: 123 + (this.levelSeed || 0), offset: 0.5 }, 
            { color: '#3b3b4a', width: 1.5, intensity: 2.0, seed: 456 + (this.levelSeed || 0), offset: 1.0 }, 
            { color: '#15151a', width: 0.8, intensity: 4.5, seed: 789 + (this.levelSeed || 0), offset: 0.0 },
            { color: '#0a0a0f', width: 2.0, intensity: 1.5, seed: 321 + (this.levelSeed || 0), offset: 1.5 }
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

    drawVacuumAbyss(x, y, neighbors = 0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // 1. TOTAL VOID (Purple-ish Black)
        this.ctx.fillStyle = '#050008';
        this.ctx.fillRect(px, py, ts, ts);

        // 2. Stars
        const seedX = x + (this.levelSeed || 0);
        const seedY = y + (this.levelSeed || 0);
        const seed = Math.abs(Math.sin(seedX * 12.9898 + seedY * 78.233) * 43758.5453) % 1;
        
        const t = Date.now() * 0.001;
        for (let i = 0; i < 4; i++) {
            const pSeed = (seed * (i + 1) * 456.7) % 1;
            const px_p = px + 4 + (pSeed * (ts - 8));
            const py_p = py + 4 + ((pSeed * 7.7) % 1 * (ts - 8));
            const pulse = 0.3 + Math.sin(t * (0.8 + pSeed) + pSeed * 10) * 0.3;
            this.ctx.fillStyle = `rgba(180, 150, 255, ${pulse})`;
            this.ctx.shadowBlur = 3 * pulse;
            this.ctx.shadowColor = '#b496ff';
            this.ctx.fillRect(px_p, py_p, 1.2, 1.2);
            this.ctx.shadowBlur = 0;
        }

        // 3. Galactic Glow (Subtle gradient)
        this.ctx.globalAlpha = 0.12;
        const grad = this.ctx.createRadialGradient(px + ts/2, py + ts/2, 0, px + ts/2, py + ts/2, ts);
        grad.addColorStop(0, '#2a0044');
        grad.addColorStop(1, '#050008');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(px, py, ts, ts);
        this.ctx.globalAlpha = 1.0;

        // 4. ABYSS RIMS (Neon Purple/Cyan mix)
        const layers = [
            { color: 'rgba(140, 0, 255, 0.4)', width: 2, intensity: 2.0, offset: 0.5 },
            { color: 'rgba(0, 200, 255, 0.2)', width: 1, intensity: 3.5, offset: 1.0 }
        ];

        const hasUp = neighbors & 1;
        const hasRight = neighbors & 2;
        const hasDown = neighbors & 4;
        const hasLeft = neighbors & 8;

        layers.forEach(layer => {
            this.ctx.strokeStyle = layer.color;
            this.ctx.lineWidth = layer.width;
            const jitter = (s, i) => Math.abs(Math.sin(s * 15 + seed)) * i;

            this.ctx.beginPath();
            if (!hasUp) {
                this.ctx.moveTo(px, py + layer.offset + jitter(x, layer.intensity));
                for (let i = 2; i <= ts; i += 2) this.ctx.lineTo(px + i, py + layer.offset + jitter(x + i/ts, layer.intensity));
            }
            if (!hasRight) {
                const sY = hasUp ? py : py + layer.offset;
                this.ctx.moveTo(px + ts - layer.offset - jitter(y, layer.intensity), sY);
                for (let i = 2; i <= ts; i += 2) this.ctx.lineTo(px + ts - layer.offset - jitter(y + i/ts, layer.intensity), sY + i);
            }
            if (!hasDown) {
                this.ctx.moveTo(px, py + ts - layer.offset - jitter(x, layer.intensity));
                for (let i = 2; i <= ts; i += 2) this.ctx.lineTo(px + i, py + ts - layer.offset - jitter(x + i/ts, layer.intensity));
            }
            if (!hasLeft) {
                const sY = hasUp ? py : py + layer.offset;
                this.ctx.moveTo(px + layer.offset + jitter(y, layer.intensity), sY);
                for (let i = 2; i <= ts; i += 2) this.ctx.lineTo(px + layer.offset + jitter(y + i/ts, layer.intensity), sY + i);
            }
            this.ctx.stroke();
        });
    },

    drawOpticalCeiling(x, y, neighbors = 0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // Colors
        const baseDark = '#04121a';
        const mainBlue = '#0088cc';
        const lightCyan = '#00e5ff';
        const edgeCyan = '#005577';

        // 1. BASE BACKGROUND
        this.ctx.fillStyle = baseDark;
        this.ctx.fillRect(px, py, ts, ts);

        // Neighbors: 1:Up, 2:Right, 4:Down, 8:Left
        const hasU = neighbors & 1;
        const hasR = neighbors & 2;
        const hasD = neighbors & 4;
        const hasL = neighbors & 8;

        // 2. CENTRAL DIAGONAL DECORATION (Only if it's a solid block or center)
        this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(px + 8, py + 8); this.ctx.lineTo(px + ts - 8, py + ts - 8);
        this.ctx.moveTo(px + ts - 8, py + 8); this.ctx.lineTo(px + 8, py + ts - 8);
        this.ctx.stroke();

        // 3. OUTER FRAME (Main Blue)
        this.ctx.strokeStyle = edgeCyan;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        // Drawing outer border with beveled corners if not connected
        if (!hasU) { this.ctx.moveTo(px + (hasL?0:4), py + 2); this.ctx.lineTo(px + ts - (hasR?0:4), py + 2); }
        if (!hasR) { this.ctx.moveTo(px + ts - 2, py + (hasU?0:4)); this.ctx.lineTo(px + ts - 2, py + ts - (hasD?0:4)); }
        if (!hasD) { this.ctx.moveTo(px + ts - (hasR?0:4), py + ts - 2); this.ctx.lineTo(px + (hasL?0:4), py + ts - 2); }
        if (!hasL) { this.ctx.moveTo(px + 2, py + ts - (hasD?0:4)); this.ctx.lineTo(px + 2, py + (hasU?0:4)); }
        
        // Bevels
        if (!hasU && !hasL) { this.ctx.moveTo(px + 4, py + 2); this.ctx.lineTo(px + 2, py + 4); }
        if (!hasU && !hasR) { this.ctx.moveTo(px + ts - 4, py + 2); this.ctx.lineTo(px + ts - 2, py + 4); }
        if (!hasD && !hasR) { this.ctx.moveTo(px + ts - 2, py + ts - 4); this.ctx.lineTo(px + ts - 4, py + ts - 2); }
        if (!hasD && !hasL) { this.ctx.moveTo(px + 2, py + ts - 4); this.ctx.lineTo(px + 4, py + ts - 2); }
        this.ctx.stroke();

        // 4. DASHED MIDDLE FRAME (Cyan - formerly yellow)
        this.ctx.strokeStyle = mainBlue;
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([4, 2]);
        this.ctx.beginPath();
        if (!hasU) { this.ctx.moveTo(px + 5, py + 5); this.ctx.lineTo(px + ts - 5, py + 5); }
        if (!hasR) { this.ctx.moveTo(px + ts - 5, py + 5); this.ctx.lineTo(px + ts - 5, py + ts - 5); }
        if (!hasD) { this.ctx.moveTo(px + ts - 5, py + ts - 5); this.ctx.lineTo(px + 5, py + ts - 5); }
        if (!hasL) { this.ctx.moveTo(px + 5, py + ts - 5); this.ctx.lineTo(px + 5, py + 5); }
        this.ctx.stroke();
        this.ctx.setLineDash([]); // Reset dash

        // 5. INNER GLOW FRAME (Cyan)
        this.ctx.strokeStyle = lightCyan;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        if (!hasU) { this.ctx.moveTo(px + 8, py + 8); this.ctx.lineTo(px + ts - 8, py + 8); }
        if (!hasR) { this.ctx.moveTo(px + ts - 8, py + 8); this.ctx.lineTo(px + ts - 8, py + ts - 8); }
        if (!hasD) { this.ctx.moveTo(px + ts - 8, py + ts - 8); this.ctx.lineTo(px + 8, py + ts - 8); }
        if (!hasL) { this.ctx.moveTo(px + 8, py + ts - 8); this.ctx.lineTo(px + 8, py + 8); }
        this.ctx.stroke();

        // Optional: Corner Tech Detail
        if (!hasU && !hasL) {
            this.ctx.fillStyle = lightCyan;
            this.ctx.fillRect(px + 4, py + 4, 2, 2);
        }
    },

    drawLabCeiling(x, y, neighbors = 0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // Neighbors: 1:Up, 2:Right, 4:Down, 8:Left
        const hasU = neighbors & 1;
        const hasR = neighbors & 2;
        const hasD = neighbors & 4;
        const hasL = neighbors & 8;

        // 1. BASE (Clean lab white-gray)
        this.ctx.fillStyle = 'hsl(210, 5%, 82%)';
        this.ctx.fillRect(px, py, ts, ts);

        // 2. STRUCTURAL BEVELS (Only on exposed edges)
        if (!hasU) { this.ctx.fillStyle = 'rgba(255,255,255,0.4)'; this.ctx.fillRect(px, py, ts, 2); }
        if (!hasL) { this.ctx.fillStyle = 'rgba(255,255,255,0.4)'; this.ctx.fillRect(px, py, 2, ts); }
        if (!hasD) { this.ctx.fillStyle = 'rgba(0,0,0,0.15)'; this.ctx.fillRect(px, py + ts - 2, ts, 2); }
        if (!hasR) { this.ctx.fillStyle = 'rgba(0,0,0,0.15)'; this.ctx.fillRect(px + ts - 2, py, 2, ts); }

        // 3. INNER DIVIDER LINES (Suppressed on connected sides - EXTRA GIGANTE)
        this.ctx.lineWidth = 16;
        
        // Shadow/Groove (Super heavy)
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
        this.ctx.beginPath();
        if (!hasL && !hasR) { this.ctx.moveTo(px + ts/2, py); this.ctx.lineTo(px + ts/2, py + ts); }
        if (!hasU && !hasD) { this.ctx.moveTo(px, py + ts/2); this.ctx.lineTo(px + ts, py + ts/2); }
        this.ctx.stroke();

        // Highlight (Deep 3D)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        if (!hasL && !hasR) { this.ctx.moveTo(px + ts/2 + 5, py); this.ctx.lineTo(px + ts/2 + 5, py + ts); }
        if (!hasU && !hasD) { this.ctx.moveTo(px, py + ts/2 + 5); this.ctx.lineTo(px + ts, py + ts/2 + 5); }
        this.ctx.stroke();

        // 4. CORNER DETAIL (Gigante screws)
        this.ctx.fillStyle = 'rgba(0,0,0,0.12)';
        const bs = 6;
        if (!hasU && !hasL) this.ctx.fillRect(px + 4, py + 4, bs, bs);
        if (!hasU && !hasR) this.ctx.fillRect(px + ts - 10, py + 4, bs, bs);
        if (!hasD && !hasL) this.ctx.fillRect(px + 4, py + ts - 10, bs, bs);
        if (!hasD && !hasR) this.ctx.fillRect(px + ts - 10, py + ts - 10, bs, bs);
    },

    drawBronzeCeiling(x, y, neighbors = 0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // Colors - Warm Bronze/Copper Palette
        const baseDark = '#1a1820';
        const plateBronze = '#20202b';
        const metalHighlight = 'rgba(255, 240, 200, 0.08)';
        const metalShadow = 'rgba(0, 0, 0, 0.6)';
        const bronzeAccent = 'rgba(180, 140, 80, 0.12)';

        // Neighbors: 1:Up, 2:Right, 4:Down, 8:Left
        const hasU = neighbors & 1;
        const hasR = neighbors & 2;
        const hasD = neighbors & 4;
        const hasL = neighbors & 8;

        // 1. BASE BACKGROUND
        this.ctx.fillStyle = baseDark;
        this.ctx.fillRect(px, py, ts, ts);

        // 2. STRUCTURAL PLATE
        this.ctx.fillStyle = plateBronze;
        const pU = hasU ? 0 : 4;
        const pR = hasR ? 0 : 4;
        const pD = hasD ? 0 : 4;
        const pL = hasL ? 0 : 4;
        this.ctx.fillRect(px + pL, py + pU, ts - pL - pR, ts - pU - pD);

        // 3. BEVELS (Thick metallic depth)
        const drawFrame = (inset, color, weight) => {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = weight;
            this.ctx.beginPath();
            if (!hasU) { this.ctx.moveTo(px + (hasL ? 0 : inset), py + inset); this.ctx.lineTo(px + (hasR ? ts : ts - inset), py + inset); }
            if (!hasR) { this.ctx.moveTo(px + ts - inset, py + (hasU ? 0 : inset)); this.ctx.lineTo(px + ts - inset, py + (hasD ? ts : ts - inset)); }
            if (!hasD) { this.ctx.moveTo(px + (hasR ? ts : ts - inset), py + ts - inset); this.ctx.lineTo(px + (hasL ? 0 : inset), py + ts - inset); }
            if (!hasL) { this.ctx.moveTo(px + inset, py + (hasD ? ts : ts - inset)); this.ctx.lineTo(px + inset, py + (hasU ? 0 : inset)); }
            this.ctx.stroke();
        };

        // Outer structural bevel
        drawFrame(1, metalHighlight, 2);
        drawFrame(ts - 1, metalShadow, 1);

        // Inner groove (bronze accent)
        drawFrame(6, 'rgba(0,0,0,0.35)', 2);
        drawFrame(7, bronzeAccent, 1);

        // 4. CORNER RIVETS
        this.ctx.fillStyle = '#2a2535';
        const bs = 2;
        if (!hasU && !hasL) this.ctx.fillRect(px + 3, py + 3, bs, bs);
        if (!hasU && !hasR) this.ctx.fillRect(px + ts - 5, py + 3, bs, bs);
        if (!hasD && !hasL) this.ctx.fillRect(px + 3, py + ts - 5, bs, bs);
        if (!hasD && !hasR) this.ctx.fillRect(px + ts - 5, py + ts - 5, bs, bs);

        // 5. CENTER DETAIL (Small copper rivet)
        const seed = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        if (seed > 0.6 || neighbors === 0) {
            this.ctx.fillStyle = '#0a0a10';
            this.ctx.fillRect(px + ts/2 - 1, py + ts/2 - 1, 2, 2);
        }
    },

    drawLogisticCeiling(x, y, neighbors = 0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        const ctx = this.ctx;

        // Base structural dark metal
        ctx.fillStyle = '#0a0d10';
        ctx.fillRect(px, py, ts, ts);

        const hasU = neighbors & 1;
        const hasR = neighbors & 2;
        const hasD = neighbors & 4;
        const hasL = neighbors & 8;

        // Yellow Support Beams (#ffd700)
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        
        // Connectivity grid
        const cx = px + ts/2;
        const cy = py + ts/2;

        if (hasU) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, py); ctx.stroke(); }
        if (hasR) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px + ts, cy); ctx.stroke(); }
        if (hasD) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, py + ts); ctx.stroke(); }
        if (hasL) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, cy); ctx.stroke(); }

        // Junction detail
        ctx.fillStyle = '#e6c300';
        ctx.fillRect(cx - 4, cy - 4, 8, 8);
        ctx.fillStyle = '#222';
        ctx.fillRect(cx - 2, cy - 2, 4, 4);

        // Edge capping if not connected
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        if (!hasU) ctx.strokeRect(px + 2, py + 2, ts - 4, 2);
        if (!hasD) ctx.strokeRect(px + 2, py + ts - 4, ts - 4, 2);
        if (!hasL) ctx.strokeRect(px + 2, py + 2, 2, ts - 4);
        if (!hasR) ctx.strokeRect(px + ts - 4, py + 2, 2, ts - 4);
    },

    drawHighTechCeiling(x, y, neighbors = 0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // Colors - Green Tech Palette (Industrial Green)
        const baseDark = '#060a08';
        const plateDark = '#0f1a14';
        const techGreen = '#00bb88';
        const subtleGreen = 'rgba(0, 187, 136, 0.15)';
        const metalHighlight = 'rgba(255, 255, 255, 0.05)';
        const metalShadow = 'rgba(0, 0, 0, 0.6)';

        // Neighbors: 1:Up, 2:Right, 4:Down, 8:Left
        const hasU = neighbors & 1;
        const hasR = neighbors & 2;
        const hasD = neighbors & 4;
        const hasL = neighbors & 8;

        // 1. BASE BACKGROUND
        this.ctx.fillStyle = baseDark;
        this.ctx.fillRect(px, py, ts, ts);

        // 2. LAYERED STRUCTURAL PLATES
        this.ctx.fillStyle = plateDark;
        const pU = hasU ? 0 : 5;
        const pR = hasR ? 0 : 5;
        const pD = hasD ? 0 : 5;
        const pL = hasL ? 0 : 5;
        this.ctx.fillRect(px + pL, py + pU, ts - pL - pR, ts - pU - pD);

        // 3. SUBTLE THICK FRAMES (Physical Grooves)
        const drawFrame = (inset, color, weight) => {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = weight;
            this.ctx.beginPath();
            if (!hasU) { this.ctx.moveTo(px + (hasL ? 0 : inset), py + inset); this.ctx.lineTo(px + (hasR ? ts : ts - inset), py + inset); }
            if (!hasR) { this.ctx.moveTo(px + ts - inset, py + (hasU ? 0 : inset)); this.ctx.lineTo(px + ts - inset, py + (hasD ? ts : ts - inset)); }
            if (!hasD) { this.ctx.moveTo(px + (hasR ? ts : ts - inset), py + ts - inset); this.ctx.lineTo(px + (hasL ? 0 : inset), py + ts - inset); }
            if (!hasL) { this.ctx.moveTo(px + inset, py + (hasD ? ts : ts - inset)); this.ctx.lineTo(px + inset, py + (hasU ? 0 : inset)); }
            this.ctx.stroke();
        };

        // Outer Structural Bevel
        drawFrame(2, metalHighlight, 2);
        drawFrame(ts-2, metalShadow, 1);

        // Main Industrial Groove (Thick & Muted)
        drawFrame(6, 'rgba(0,0,0,0.4)', 3);
        drawFrame(7, subtleGreen, 1);

        // 4. "PONTINHOS" (Tech Hardware Details)
        // Corner Bolts
        this.ctx.fillStyle = '#1a2a22';
        const bs = 2;
        if (!hasU && !hasL) this.ctx.fillRect(px + 3, py + 3, bs, bs);
        if (!hasU && !hasR) this.ctx.fillRect(px + ts - 5, py + 3, bs, bs);
        if (!hasD && !hasL) this.ctx.fillRect(px + 3, py + ts - 5, bs, bs);
        if (!hasD && !hasR) this.ctx.fillRect(px + ts - 5, py + ts - 5, bs, bs);
    },

    drawRealityCeiling(x, y, neighbors = 0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // Base color (Technical grayish metal)
        const baseDark = `hsl(210, 8%, 6%)`;
        const plateDark = `hsl(210, 8%, 10%)`;
        
        // Dynamic Rainbow Lighting
        const seed = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        const t = Date.now() * 0.1;
        const hue = (t + x * 20 + y * 20 + seed * 360) % 360;
        const neonColor = `hsl(${hue}, 80%, 55%)`;
        const subtleColor = `hsla(${hue}, 80%, 55%, 0.2)`;

        // Neighbors: 1:Up, 2:Right, 4:Down, 8:Left
        const hasU = neighbors & 1;
        const hasR = neighbors & 2;
        const hasD = neighbors & 4;
        const hasL = neighbors & 8;

        // 1. BASE BACKGROUND
        this.ctx.fillStyle = baseDark;
        this.ctx.fillRect(px, py, ts, ts);

        // 2. LAYERED STRUCTURAL PLATES
        this.ctx.fillStyle = plateDark;
        const pU = hasU ? 0 : 5;
        const pR = hasR ? 0 : 5;
        const pD = hasD ? 0 : 5;
        const pL = hasL ? 0 : 5;
        this.ctx.fillRect(px + pL, py + pU, ts - pL - pR, ts - pU - pD);

        // 3. SUBTLE THICK FRAMES
        const drawFrame = (inset, color, weight) => {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = weight;
            this.ctx.beginPath();
            if (!hasU) { this.ctx.moveTo(px + (hasL ? 0 : inset), py + inset); this.ctx.lineTo(px + (hasR ? ts : ts - inset), py + inset); }
            if (!hasR) { this.ctx.moveTo(px + ts - inset, py + (hasU ? 0 : inset)); this.ctx.lineTo(px + ts - inset, py + (hasD ? ts : ts - inset)); }
            if (!hasD) { this.ctx.moveTo(px + (hasR ? ts : ts - inset), py + ts - inset); this.ctx.lineTo(px + (hasL ? 0 : inset), py + ts - inset); }
            if (!hasL) { this.ctx.moveTo(px + inset, py + (hasD ? ts : ts - inset)); this.ctx.lineTo(px + inset, py + (hasU ? 0 : inset)); }
            this.ctx.stroke();
        };

        drawFrame(2, 'rgba(255, 255, 255, 0.05)', 2);
        drawFrame(ts-2, 'rgba(0, 0, 0, 0.6)', 1);
        drawFrame(6, 'rgba(0,0,0,0.4)', 3);
        drawFrame(7, subtleColor, 1);

        // 4. MULTICOLORED LEDs
        if (seed > 0.6 || neighbors === 0) {
            const isOn = (Date.now() + seed * 1000) % 1500 > 750;
            this.ctx.fillStyle = isOn ? neonColor : '#101010';
            this.ctx.shadowBlur = isOn ? 10 : 0;
            this.ctx.shadowColor = neonColor;
            this.ctx.fillRect(px + ts/2 - 1, py + ts/2 - 1, 2, 2);
            
            if (seed > 0.85) {
                const hue2 = (hue + 180) % 360; // Complementary color dot
                this.ctx.fillStyle = isOn ? `hsl(${hue2}, 80%, 55%)` : '#101010';
                this.ctx.fillRect(px + ts/2 + 4, py + ts/2 - 3, 1, 1);
            }
            this.ctx.shadowBlur = 0;
        }
    },

    drawQuantumCeiling(x, y, neighbors = 0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // Colors (Copy of Optical structure but Purple)
        const baseDark = '#1e1e24'; // Heavy Metal Gray
        const mainPurple = '#bf00ff';
        const lightPurple = '#df80ff';
        const edgePurple = '#4b0082';

        // 1. BASE BACKGROUND
        this.ctx.fillStyle = baseDark;
        this.ctx.fillRect(px, py, ts, ts);

        // Neighbors: 1:Up, 2:Right, 4:Down, 8:Left
        const hasU = neighbors & 1;
        const hasR = neighbors & 2;
        const hasD = neighbors & 4;
        const hasL = neighbors & 8;

        // 2. CENTRAL DIAGONAL DECORATION
        this.ctx.strokeStyle = 'rgba(191, 0, 255, 0.08)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(px + 8, py + 8); this.ctx.lineTo(px + ts - 8, py + ts - 8);
        this.ctx.moveTo(px + ts - 8, py + 8); this.ctx.lineTo(px + 8, py + ts - 8);
        this.ctx.stroke();

        // 3. OUTER FRAME (Indigo/Edge Purple)
        this.ctx.strokeStyle = edgePurple;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        if (!hasU) { this.ctx.moveTo(px + (hasL?0:4), py + 2); this.ctx.lineTo(px + ts - (hasR?0:4), py + 2); }
        if (!hasR) { this.ctx.moveTo(px + ts - 2, py + (hasU?0:4)); this.ctx.lineTo(px + ts - 2, py + ts - (hasD?0:4)); }
        if (!hasD) { this.ctx.moveTo(px + ts - (hasR?0:4), py + ts - 2); this.ctx.lineTo(px + (hasL?0:4), py + ts - 2); }
        if (!hasL) { this.ctx.moveTo(px + 2, py + ts - (hasD?0:4)); this.ctx.lineTo(px + 2, py + (hasU?0:4)); }
        
        // Bevels
        if (!hasU && !hasL) { this.ctx.moveTo(px + 4, py + 2); this.ctx.lineTo(px + 2, py + 4); }
        if (!hasU && !hasR) { this.ctx.moveTo(px + ts - 4, py + 2); this.ctx.lineTo(px + ts - 2, py + 4); }
        if (!hasD && !hasR) { this.ctx.moveTo(px + ts - 2, py + ts - 4); this.ctx.lineTo(px + ts - 4, py + ts - 2); }
        if (!hasD && !hasL) { this.ctx.moveTo(px + 2, py + ts - 4); this.ctx.lineTo(px + 4, py + ts - 2); }
        this.ctx.stroke();

        // 4. FULL-LENGTH DASHED RAILS (Purple Neon - Edge to Edge)
        this.ctx.strokeStyle = mainPurple;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]);
        this.ctx.beginPath();
        
        // Horizontal rails spanning full TS
        if (!hasU) { this.ctx.moveTo(px, py + 5); this.ctx.lineTo(px + ts, py + 5); }
        if (!hasD) { this.ctx.moveTo(px, py + ts - 5); this.ctx.lineTo(px + ts, py + ts - 5); }
        // Vertical rails spanning full TS
        if (!hasL) { this.ctx.moveTo(px + 5, py); this.ctx.lineTo(px + 5, py + ts); }
        if (!hasR) { this.ctx.moveTo(px + ts - 5, py); this.ctx.lineTo(px + ts - 5, py + ts); }
        
        this.ctx.stroke();
        this.ctx.setLineDash([]); // Reset dash

        // 5. INNER GLOW FRAME (Light Purple)
        this.ctx.strokeStyle = lightPurple;
        this.ctx.globalAlpha = 0.3;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        if (!hasU) { this.ctx.moveTo(px + 8, py + 8); this.ctx.lineTo(px + ts - 8, py + 8); }
        if (!hasR) { this.ctx.moveTo(px + ts - 8, py + 8); this.ctx.lineTo(px + ts - 8, py + ts - 8); }
        if (!hasD) { this.ctx.moveTo(px + ts - 8, py + ts - 8); this.ctx.lineTo(px + 8, py + ts - 8); }
        if (!hasL) { this.ctx.moveTo(px + 8, py + ts - 8); this.ctx.lineTo(px + 8, py + 8); }
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;

        // Corner Tech Detail
        if (!hasU && !hasL) {
            this.ctx.fillStyle = lightPurple;
            this.ctx.fillRect(px + 4, py + 4, 2, 2);
        }
    },

    drawProcessingCeiling(x, y, neighbors = 0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // Colors (Processing Structural Style)
        const bgGrid = '#0a181a';
        const beamBase = '#006677';
        const beamMain = '#00aabb';
        const beamLight = '#00ffff';
        const bracketColor = '#a0ffff';

        // 1. BACKGROUND GRID (Panels)
        this.ctx.fillStyle = bgGrid;
        this.ctx.fillRect(px, py, ts, ts);
        
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= ts; i += 8) {
            this.ctx.beginPath(); this.ctx.moveTo(px + i, py); this.ctx.lineTo(px + i, py + ts); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(px, py + i); this.ctx.lineTo(px + ts, py + i); this.ctx.stroke();
        }

        // Neighbors: 1:Up, 2:Right, 4:Down, 8:Left
        const hasU = neighbors & 1;
        const hasR = neighbors & 2;
        const hasD = neighbors & 4;
        const hasL = neighbors & 8;

        // 2. STRUCTURAL BEAMS (Thick Layered Design)
        const drawBeamLayer = (color, inset, width) => {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = width;
            this.ctx.beginPath();
            if (!hasU) { this.ctx.moveTo(px + (hasL?0:inset), py + inset); this.ctx.lineTo(px + ts - (hasR?0:inset), py + inset); }
            if (!hasR) { this.ctx.moveTo(px + ts - inset, py + (hasU?0:inset)); this.ctx.lineTo(px + ts - inset, py + ts - (hasD?0:inset)); }
            if (!hasD) { this.ctx.moveTo(px + ts - (hasR?0:inset), py + ts - inset); this.ctx.lineTo(px + (hasL?0:inset), py + ts - inset); }
            if (!hasL) { this.ctx.moveTo(px + inset, py + ts - (hasD?0:inset)); this.ctx.lineTo(px + inset, py + (hasU?0:inset)); }
            this.ctx.stroke();
        };

        drawBeamLayer(beamBase, 2, 6);
        drawBeamLayer(beamMain, 3, 4);
        drawBeamLayer(beamLight, 3, 1); // Highlight edge

        // 3. BRACKETS / FASTENERS (Inspired by reference image)
        this.ctx.fillStyle = bracketColor;
        const drawBracket = (bx, by, bw, bh) => {
            this.ctx.fillRect(px + bx, py + by, bw, bh);
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(px + bx + bw - 1, py + by, 1, bh);
            this.ctx.fillStyle = bracketColor;
        };

        if (!hasU) { drawBracket(8, 0, 4, 5); drawBracket(ts - 12, 0, 4, 5); }
        if (!hasD) { drawBracket(8, ts - 5, 4, 5); drawBracket(ts - 12, ts - 5, 4, 5); }
        if (!hasL) { drawBracket(0, 8, 5, 4); drawBracket(0, ts - 12, 5, 4); }
        if (!hasR) { drawBracket(ts - 5, 8, 5, 4); drawBracket(ts - 5, ts - 12, 5, 4); }

        // 4. TECHNICAL DETAILS (Static)
        this.ctx.fillStyle = '#0088aa';
        this.ctx.beginPath();
        this.ctx.arc(px + ts/2, py + ts/2, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
    },

    drawCeiling(x, y, char = '#') {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        // Coordinate-based variation (pseudo-random)
        const seedX = x + (this.levelSeed || 0);
        const seedY = y + (this.levelSeed || 0);
        const seed = Math.abs(Math.sin(seedX * 12.9898 + seedY * 78.233) * 43758.5453) % 1;

        if (char === 'A') {
            // Redirected to procedural method
            this.drawLabCeiling(x, y, 0);

        } else if (char === 'Ω') {
            // SECTOR: Processamento (Teto - Procedural)
            this.drawProcessingCeiling(x, y, 0);

        } else if (char === 'I') {
            // SECTOR B: Teto Industrial (Avermelhado / Estrutural)
            const h = 5, s = 45, l = 10;
            this.ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
            this.ctx.fillRect(px, py, ts, ts);

            // Bevel Effect
            this.ctx.fillStyle = `hsla(${h}, ${s}%, ${l + 12}%, 0.3)`;
            this.ctx.fillRect(px, py, ts, 2); this.ctx.fillRect(px, py, 2, ts);
            this.ctx.fillStyle = `hsla(${h}, ${s}%, ${l - 8}%, 0.5)`;
            this.ctx.fillRect(px, py + ts - 2, ts, 2); this.ctx.fillRect(px + ts - 2, py, 2, ts);

            // Large Structural "X" Brace (Instead of vertical lines)
            this.ctx.strokeStyle = `hsla(${h}, ${s}%, ${l - 4}%, 0.8)`;
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(px + 6, py + 6); this.ctx.lineTo(px + ts - 6, py + ts - 6);
            this.ctx.moveTo(px + ts - 6, py + 6); this.ctx.lineTo(px + 6, py + ts - 6);
            this.ctx.stroke();

            // Heavy Bolts in corners
            this.ctx.fillStyle = `hsla(${h}, ${s}%, ${l + 15}%, 0.4)`;
            const bs = 3;
            this.ctx.fillRect(px + 4, py + 4, bs, bs);
            this.ctx.fillRect(px + ts - 7, py + 4, bs, bs);
            this.ctx.fillRect(px + 4, py + ts - 7, bs, bs);
            this.ctx.fillRect(px + ts - 7, py + ts - 7, bs, bs);

        } else if (char === 'x') {
            // SECTOR: Compilador (Teto - Matéria Cristalizada / Fragmentos Voronoi)
            // 1. Deep Void Base
            this.ctx.fillStyle = '#050008'; 
            this.ctx.fillRect(px, py, ts, ts);

            // 2. Crystallized Shards (Pseudo-Voronoi)
            const shardCount = 5;
            for (let i = 0; i < shardCount; i++) {
                const sSeed = (seed * (i + 1) * 313.7) % 1;
                // Random points for shard vertices
                const cx = px + ts/2 + (Math.cos(sSeed * 10) * (ts/4));
                const cy = py + ts/2 + (Math.sin(sSeed * 7) * (ts/4));
                
                this.ctx.beginPath();
                this.ctx.moveTo(cx, cy);
                
                // Create a sharp shard polygon
                const sides = 3 + Math.floor(sSeed * 2);
                for (let j = 0; j < sides; j++) {
                    const ang = (j / sides) * Math.PI * 2 + (sSeed * 5);
                    const len = 8 + (sSeed * 12);
                    this.ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
                }
                this.ctx.closePath();

                // Shard fill: Dark Amethyst gradient
                const grad = this.ctx.createLinearGradient(cx - 10, cy - 10, cx + 10, cy + 10);
                grad.addColorStop(0, '#150025');
                grad.addColorStop(0.5, '#0a0015');
                grad.addColorStop(1, '#1a0033');
                this.ctx.fillStyle = grad;
                this.ctx.fill();

                // Sharp Neon Edge
                this.ctx.strokeStyle = `rgba(140, 0, 255, ${0.1 + sSeed * 0.2})`;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();

                // Internal crystalline facet (Subtle highlight)
                this.ctx.beginPath();
                this.ctx.moveTo(cx, cy);
                this.ctx.lineTo(cx + 4, cy - 4);
                this.ctx.strokeStyle = 'rgba(200, 150, 255, 0.05)';
                this.ctx.stroke();
            }

            // 3. Technical Grid / Bevel (Solidifies it as a "Ceiling")
            this.ctx.strokeStyle = 'rgba(100, 50, 150, 0.15)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(px + ts/2, py); this.ctx.lineTo(px + ts/2, py + ts);
            this.ctx.moveTo(px, py + ts/2); this.ctx.lineTo(px + ts, py + ts/2);
            this.ctx.stroke();

            // Border
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            this.ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);

        } else if (char === '=') {
            // SECTOR: Realidade (Teto)
            this.drawRealityCeiling(x, y, 0);

        } else {
            // DEFAULT '#': Rendered by drawBronzeCeiling (procedural)
            // Fallback for non-procedural calls (e.g. old code paths)
            this.drawBronzeCeiling(x, y, 0);
        }

    },

    drawWallFace(x, y, char = 'W') {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        const seedX = x + (this.levelSeed || 0);
        const seedY = y + (this.levelSeed || 0);
        const seed = Math.abs(Math.sin(seedX * 12.9898 + seedY * 78.233) * 43758.5453) % 1;
        const seedVal = Math.abs(seedX * 7 + seedY * 31);
        const variant = Math.floor(seed * 20);
        const ctx = this.ctx;

        if (char === '\u03C0') {
            // SECTOR: Processamento (Parede de Estantes Cyan - Item Layout from '~')
            this.ctx.fillStyle = '#081a1a';
            this.ctx.fillRect(px, py, ts, ts);
            
            const variant = seedVal % 10;
            const t = Date.now();

            const drawItem = (ix, iy, type) => {
                const ipx = px + ix; const ipy = py + iy;
                // High-Variety Technical Items (Not just cyan)
                if (type === 'orb_cyan') {
                    this.ctx.fillStyle = '#00ffff'; this.ctx.beginPath(); this.ctx.arc(ipx + 4, ipy + 4, 4, 0, Math.PI * 2); this.ctx.fill();
                    this.ctx.fillStyle = 'rgba(255,255,255,0.7)'; this.ctx.beginPath(); this.ctx.arc(ipx + 2, ipy + 2, 1.5, 0, Math.PI * 2); this.ctx.fill();
                } else if (type === 'orb_amber') {
                    this.ctx.fillStyle = '#ffaa00'; this.ctx.beginPath(); this.ctx.arc(ipx + 4, ipy + 4, 3, 0, Math.PI * 2); this.ctx.fill();
                    this.ctx.fillStyle = 'rgba(255,255,255,0.5)'; this.ctx.beginPath(); this.ctx.arc(ipx + 3, ipy + 3, 1, 0, Math.PI * 2); this.ctx.fill();
                } else if (type === 'scrap') {
                    this.ctx.fillStyle = '#778899'; this.ctx.fillRect(ipx + 1, ipy + 3, 6, 4);
                    this.ctx.fillStyle = '#556677'; this.ctx.fillRect(ipx + 2, ipy + 2, 3, 2);
                } else if (type === 'head') {
                    this.ctx.fillStyle = '#eeeeee'; this.ctx.fillRect(ipx, ipy, 8, 3);
                    this.ctx.fillStyle = '#00ffff'; this.ctx.fillRect(ipx, ipy + 3, 8, 5);
                    this.ctx.fillStyle = '#ff3300'; this.ctx.fillRect(ipx + 5, ipy + 1, 2, 1.5);
                } else if (type === 'arm') {
                    this.ctx.fillStyle = '#008888'; this.ctx.fillRect(ipx, ipy, 3, 3);
                    this.ctx.fillStyle = '#dddddd'; this.ctx.fillRect(ipx + 3, ipy + 1, 5, 2);
                    this.ctx.fillStyle = '#006677'; this.ctx.fillRect(ipx + 7, ipy, 2, 4);
                } else if (type === 'pulley') {
                    this.ctx.fillStyle = '#ffcc00'; this.ctx.beginPath(); this.ctx.arc(ipx+4, ipy+4, 4, 0, Math.PI*2); this.ctx.fill();
                    this.ctx.fillStyle = '#051010'; this.ctx.beginPath(); this.ctx.arc(ipx+4, ipy+4, 1.5, 0, Math.PI*2); this.ctx.fill();
                } else if (type === 'laser') {
                    this.ctx.fillStyle = '#333333'; this.ctx.fillRect(ipx, ipy + 1, 8, 6);
                    this.ctx.fillStyle = '#ff0000'; this.ctx.fillRect(ipx + 6, ipy + 3, 2, 2);
                } else if (type === 'amp') {
                    this.ctx.fillStyle = '#ff00ff'; this.ctx.beginPath(); this.ctx.moveTo(ipx+4, ipy); this.ctx.lineTo(ipx+8, ipy+8); this.ctx.lineTo(ipx, ipy+8); this.ctx.fill();
                }
            };

            if (variant < 3) {
                drawItem(8, 6, 'head'); drawItem(18, 6, 'orb_amber'); drawItem(6, 20, 'laser'); drawItem(20, 20, 'arm');
            } else if (variant < 6) {
                drawItem(6, 5, 'pulley'); drawItem(14, 7, 'pulley'); drawItem(22, 5, 'scrap'); drawItem(8, 19, 'orb_cyan'); drawItem(18, 20, 'amp');
            } else if (variant < 9) {
                drawItem(10, 6, 'amp'); drawItem(20, 5, 'head'); drawItem(6, 22, 'orb_amber'); drawItem(14, 20, 'arm'); drawItem(24, 21, 'pulley');
            } else { drawItem(12, 18, 'head'); }

            const rackColor = '#1a2e2e'; // Dark Teal Rack
            this.ctx.fillStyle = rackColor;
            this.ctx.fillRect(px + 1, py, 4, ts); this.ctx.fillRect(px + ts - 5, py, 4, ts);
            this.ctx.fillRect(px, py + 1, ts, 3); this.ctx.fillRect(px, py + (ts/2) - 2, ts, 4); this.ctx.fillRect(px, py + ts - 4, ts, 4);
            
            // Status LEDs on vertical rack supports (User loved these)
            const ledOn1 = Math.sin(t * 0.008 + seed * 50) > 0;
            const ledOn2 = Math.sin(t * 0.006 + seed * 70) > 0;
            this.ctx.fillStyle = ledOn1 ? '#ff3344' : '#111';
            this.ctx.fillRect(px + 2, py + 8, 2, 2);
            this.ctx.fillStyle = ledOn2 ? '#00ff88' : '#111';
            this.ctx.fillRect(px + ts - 4, py + 12, 2, 2);

            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
            this.ctx.fillRect(px + 2, py, 1, ts); this.ctx.fillRect(px, py + (ts/2) - 1, ts, 1);
            
            return;
        }

        if (char === '\u03A3') {
            // SECTOR: Processamento (Parede Sólida Logística)
            const baseL = 15 + (seed - 0.5) * 5;
            this.ctx.fillStyle = `hsl(210, 12%, ${baseL}%)`;
            this.ctx.fillRect(px, py, ts, ts);

            // Vertical Industrial Ribbing (Reinforcement)
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            for (let i = 4; i < ts; i += 8) {
                this.ctx.fillRect(px + i, py + 2, 3, ts - 4);
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                this.ctx.fillRect(px + i, py + 2, 1, ts - 4);
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            }

            // Horizontal Technical Band
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(px, py + ts/2 - 4, ts, 8);
            
            // Subtle Hazard Pattern on the band
            this.ctx.strokeStyle = 'rgba(255, 200, 0, 0.1)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            for (let i = 0; i < ts; i += 6) {
                this.ctx.moveTo(px + i, py + ts/2 - 4);
                this.ctx.lineTo(px + i + 4, py + ts/2 + 4);
            }
            this.ctx.stroke();

            // Edge Bevels
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
            
            return;
        }

        if (char === 'f') {
            // ... (keeping existing 'f' code)
            // SECTOR A: Parede Laboratório (Genérica - Contínua)
            // 1. BASE BACKGROUND (Clean off-white)
            this.ctx.fillStyle = '#b0b8c0'; // Base metallic gray-blue
            this.ctx.fillRect(px, py, ts, ts);
            
            // 2. MAIN SURFACE
            this.ctx.fillStyle = '#d0d8e0'; // Lighter surface
            this.ctx.fillRect(px, py + 2, ts, ts - 6);
            
            // Always draw top highlight for continuity
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.fillRect(px, py + 2, ts, 1);

            // Always draw Tech Blue Glow for continuity
            this.ctx.fillStyle = 'rgba(0, 100, 255, 0.08)'; // Slightly more visible
            this.ctx.fillRect(px, py + 4, ts, 4);

            // 3. VARIANT SPECIFIC
            const fVariant = seedVal % 10;
            if (fVariant === 1) {
                // Outer Case
                this.ctx.fillStyle = '#4a5058';
                this.ctx.fillRect(px + 4, py + 4, ts - 8, ts - 12);
                
                // Screen (Neon Green CRT)
                this.ctx.fillStyle = '#0a1a0a';
                this.ctx.fillRect(px + 6, py + 6, ts - 12, 12);
                
                // Green Scanlines
                this.ctx.fillStyle = 'rgba(0, 255, 100, 0.2)';
                for (let i = 0; i < 12; i += 2) {
                    this.ctx.fillRect(px + 6, py + 6 + i, ts - 12, 1);
                }

                // Pulsing Screen Content
                const pulse = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
                this.ctx.fillStyle = `rgba(0, 255, 100, ${0.1 + pulse * 0.2})`;
                this.ctx.fillRect(px + 8, py + 8, 8, 3);
                this.ctx.fillRect(px + 18, py + 12, 6, 2);

                // Button Panel
                this.ctx.fillStyle = '#2a3038';
                this.ctx.fillRect(px + 4, py + 16, ts - 8, 4);
                
                // Blinking Buttons
                const t = Date.now();
                const drawLED = (lx, ly, color, freq, offset) => {
                    const isOn = Math.sin(t * freq + offset) > 0;
                    this.ctx.fillStyle = isOn ? color : 'rgba(0,0,0,0.5)';
                    this.ctx.fillRect(px + lx, py + ly, 2, 2);
                    if (isOn) {
                        this.ctx.shadowBlur = 4;
                        this.ctx.shadowColor = color;
                        this.ctx.fillRect(px + lx, py + ly, 2, 2);
                        this.ctx.shadowBlur = 0;
                    }
                };

                drawLED(8, 17, '#ff3344', 0.01, 0);   // Red
                drawLED(12, 17, '#00f0ff', 0.008, 1); // Blue
                drawLED(16, 17, '#ffcc00', 0.012, 2); // Yellow
                drawLED(20, 17, '#00ff88', 0.005, 3); // Green
            } else if (fVariant === 2) {
                // SECTOR A VARIANT: Large Laboratory Inox Tanks
                // 1. Recessed Niche
                this.ctx.fillStyle = '#4a5058';
                this.ctx.fillRect(px + 3, py + 3, ts - 6, ts - 10);

                const drawInoxTank = (tx, ty, width) => {
                    // Tank Body
                    this.ctx.fillStyle = '#b0b8c0'; // Base Inox
                    this.ctx.fillRect(px + tx, py + ty, width, 18);
                    
                    // Polished Highlights
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                    this.ctx.fillRect(px + tx + 1, py + ty, 2, 18);
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    this.ctx.fillRect(px + tx + width - 3, py + ty, 1, 18);

                    // Top Dome/Cap
                    this.ctx.fillStyle = '#d0d8e0';
                    this.ctx.beginPath();
                    this.ctx.arc(px + tx + width/2, py + ty, width/2, Math.PI, 0);
                    this.ctx.fill();

                    // Straps (Steel)
                    this.ctx.fillStyle = '#3a4048';
                    this.ctx.fillRect(px + tx - 1, py + ty + 4, width + 2, 2);
                    this.ctx.fillRect(px + tx - 1, py + ty + 12, width + 2, 2);
                    
                    // Pressure Gauge
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.beginPath();
                    this.ctx.arc(px + tx + width/2, py + ty - 2, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.strokeStyle = '#333';
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(px + tx + width/2, py + ty - 2);
                    this.ctx.lineTo(px + tx + width/2 + 2, py + ty - 3);
                    this.ctx.stroke();
                };

                // Two Large Tanks
                drawInoxTank(6, 6, 9);
                drawInoxTank(17, 6, 9);

            } else if (fVariant === 3) {
                // SECTOR A VARIANT: Single Heavy Subtle Pipe
                const px_off = 14;
                this.ctx.fillStyle = '#8a929a'; // Subtle gray
                this.ctx.fillRect(px + px_off, py + 8, 6, ts - 12); // Lowered so it doesn't overlap blue line
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                this.ctx.fillRect(px + px_off + 1, py + 8, 2, ts - 12);
                
                // Subtle Bracket
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                this.ctx.fillRect(px + px_off - 2, py + 14, 10, 2);

            } else if (fVariant === 4) {
                // SECTOR A VARIANT: Twin Recessed Conduits (Adjusted Thickness)
                const drawConduit = (px_off) => {
                    this.ctx.fillStyle = '#8a929a';
                    this.ctx.fillRect(px + px_off, py + 8, 3, ts - 12); // Lowered
                    this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    this.ctx.fillRect(px + px_off, py + 8, 1, ts - 12);
                };
                drawConduit(9);
                drawConduit(15);
                
                // Small subtle connectors
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                this.ctx.fillRect(px + 8, py + 18, 11, 1);

            } else if (fVariant === 5) {
                // SECTOR A VARIANT: Triple Tech-Pipes (Adjusted Thickness)
                const drawWire = (px_off, color) => {
                    this.ctx.fillStyle = color;
                    this.ctx.fillRect(px + px_off, py + 8, 2, ts - 12); // Lowered
                    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    this.ctx.fillRect(px + px_off, py + 8, 1, ts - 12);
                };
                drawWire(10, 'rgba(184, 115, 51, 0.6)'); // Copper
                drawWire(15, 'rgba(0, 153, 255, 0.5)'); // Blue
                drawWire(20, 'rgba(140, 150, 160, 0.6)'); // Steel

            } else if (fVariant === 6) {
                // SECTOR A VARIANT: Warning Signs (Smaller and higher)
                const drawSign = (type) => {
                    const sx = px + ts/2, sy = py + 12; 
                    // Yellow Triangle (Smaller)
                    this.ctx.fillStyle = '#ffcc00';
                    this.ctx.beginPath();
                    this.ctx.moveTo(sx, sy - 5);
                    this.ctx.lineTo(sx + 6, sy + 5);
                    this.ctx.lineTo(sx - 6, sy + 5);
                    this.ctx.closePath();
                    this.ctx.fill();
                    this.ctx.strokeStyle = '#000';
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();

                    // Black Symbol (Smaller)
                    this.ctx.fillStyle = '#000';
                    if (type === 'voltage') {
                        this.ctx.beginPath();
                        this.ctx.moveTo(sx + 0.5, sy - 3); this.ctx.lineTo(sx - 1.5, sy + 0.5);
                        this.ctx.lineTo(sx, sy + 0.5); this.ctx.lineTo(sx - 0.5, sy + 3);
                        this.ctx.lineTo(sx + 1.5, sy - 0.5); this.ctx.lineTo(sx, sy - 0.5);
                        this.ctx.closePath(); this.ctx.fill();
                    } else if (type === 'radiation') {
                        this.ctx.beginPath();
                        this.ctx.arc(sx, sy + 1, 1, 0, Math.PI * 2); this.ctx.fill();
                        for(let a=0; a<3; a++) {
                            this.ctx.beginPath();
                            this.ctx.arc(sx, sy + 1, 2.5, a*2.1 + 0.3, a*2.1 + 1.2);
                            this.ctx.lineTo(sx, sy + 1); this.ctx.fill();
                        }
                    } else if (type === 'biohazard') {
                        this.ctx.strokeStyle = '#000'; this.ctx.lineWidth = 0.5;
                        for(let a=0; a<3; a++) {
                            this.ctx.beginPath();
                            this.ctx.arc(sx + Math.cos(a*2.1)*1.2, sy + 1 + Math.sin(a*2.1)*1.2, 1.2, 0, Math.PI*2);
                            this.ctx.stroke();
                        }
                    } else { // Flame
                        this.ctx.beginPath();
                        this.ctx.moveTo(sx, sy + 3.5);
                        this.ctx.bezierCurveTo(sx-2.5, sy+3.5, sx-2.5, sy, sx, sy-2);
                        this.ctx.bezierCurveTo(sx+2.5, sy, sx+2.5, sy+3.5, sx, sy+3.5);
                        this.ctx.fill();
                    }
                };

                const signTypes = ['voltage', 'radiation', 'biohazard', 'flame'];
                const typeIdx = Math.floor(seed * 4);
                drawSign(signTypes[typeIdx]);

            } else if (fVariant === 7 || fVariant === 8) {
                // SECTOR A VARIANT: Recessed Laboratory Niche (Light/Aseptic)
                const nx = px + 3, ny = py + 8, nw = ts - 6, nh = ts - 16;
                
                // 1. Niche Cavity (Light gray/white shadow)
                this.ctx.fillStyle = '#a8b0b8';
                this.ctx.fillRect(nx, ny, nw, nh);
                
                // 2. Internal Shadows (Depth - more subtle on light background)
                this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
                this.ctx.fillRect(nx, ny, nw, 2); // Top
                this.ctx.fillRect(nx, ny, 2, nh); // Left
                this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
                this.ctx.fillRect(nx, ny + nh - 1, nw, 1); // Bottom highlight

                // 3. Items inside niche
                // Shelf 1 (Upper)
                for (let i = 0; i < 5; i++) {
                    const bH = 3 + (Math.sin(seed * 50 + i) * 1.5 + 1.5);
                    const colors = ['#6b3503', '#1f3f3f', '#921212', '#3672a4'];
                    this.ctx.fillStyle = colors[(i + Math.floor(seed * 10)) % colors.length];
                    this.ctx.fillRect(nx + 2 + i * 3, ny + nh/2 - bH - 1, 2.5, bH);
                }

                // Shelf 2 (Lower glassware)
                // Small Beaker
                this.ctx.fillStyle = 'rgba(150,200,255,0.4)';
                this.ctx.fillRect(nx + 3, ny + nh - 5, 3, 4);
                this.ctx.fillStyle = '#00ff88';
                this.ctx.fillRect(nx + 3, ny + nh - 3, 3, 2);

                // Small Flask
                this.ctx.fillStyle = 'rgba(150,200,255,0.4)';
                this.ctx.beginPath();
                this.ctx.moveTo(nx + 10, ny + nh - 1);
                this.ctx.lineTo(nx + 7, ny + nh - 1);
                this.ctx.lineTo(nx + 8.5, ny + nh - 4);
                this.ctx.closePath();
                this.ctx.fill();

                // Test Tubes
                const tubeColors = ['#00f0ff', '#ff3344'];
                for(let j=0; j<2; j++) {
                    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    this.ctx.fillRect(nx + 14 + j*3, ny + nh - 6, 1.5, 5);
                    this.ctx.fillStyle = tubeColors[j];
                    this.ctx.fillRect(nx + 14 + j*3, ny + nh - 3, 1.5, 2);
                }

            } else {
                // Already drawing Blue Glow above
            }

            // 5. BASEBOARD / KICKPLATE (Continuous horizontal bar)
            this.ctx.fillStyle = '#808890';
            this.ctx.fillRect(px, py + ts - 4, ts, 4);

            // 6. MICRO DETAIL (Subtle vertical seam)
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(px, py + 2); this.ctx.lineTo(px, py + ts - 4);
            this.ctx.stroke();

            return; 
        }

        if (char === 'i') {
            // SECTOR A: Parede Laboratório - Tubo de Contenção (Procedural Variations)
            // 1. BASE BACKGROUND
            this.ctx.fillStyle = '#b0b8c0';
            this.ctx.fillRect(px, py, ts, ts);
            this.ctx.fillStyle = '#d0d8e0';
            this.ctx.fillRect(px, py + 2, ts, ts - 6);
            
            // 2. CONTINUITY LINES
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.fillRect(px, py + 2, ts, 1);
            this.ctx.fillStyle = 'rgba(0, 100, 255, 0.08)';
            this.ctx.fillRect(px, py + 4, ts, 4);

            // 3. THE TUBE / PANEL (Procedural Logic)
            const isControlPanel = variant >= 14;
            const isHalfPill = !isControlPanel && variant < 4; 
            
            if (isControlPanel) {
                // SECTOR A: Full-Tile Control Panel Variation (Light Colored)
                const bx = px, by = py + 4, bw = ts, bh = ts - 8;
                
                // Panel Base (Light Industrial Gray)
                this.ctx.fillStyle = '#c0c8d0';
                this.ctx.fillRect(bx, by, bw, bh);
                
                // Bezel / Frame
                this.ctx.strokeStyle = '#a0a8b0';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);

                // 1. Digital Display (Centered Top - Green Screen with CRYPT effect)
                this.ctx.fillStyle = '#0a1a0a';
                this.ctx.fillRect(bx + 4, by + 3, bw - 8, 6);
                const displayPulse = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
                this.ctx.fillStyle = `rgba(0, 255, 68, ${0.4 + displayPulse * 0.6})`;
                this.ctx.font = '6px monospace';
                
                // Generate cryptic text based on time
                const cryptChars = "!@#$%^&*()_+-=[]{}|;:,.<>/?0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                let crypticText = "";
                const textLen = 12;
                const timeSeed = Math.floor(Date.now() / 100); // Change every 100ms
                for (let i = 0; i < textLen; i++) {
                    const charIdx = (timeSeed + i * 7 + Math.floor(seed * 100)) % cryptChars.length;
                    crypticText += cryptChars[charIdx];
                }
                this.ctx.fillText(crypticText, bx + 6, by + 8);

                // 2. Dense Buttons Grid (Main Array)
                const t = Date.now();
                for (let row = 0; row < 3; row++) {
                    for (let col = 0; col < 6; col++) {
                        const bSeed = (seed * 100 + row * 17 + col * 23) % 100;
                        const colors = ['#ff3344', '#00f0ff', '#ffcc00', '#00ff88'];
                        const colIdx = Math.floor(bSeed / 25);
                        const freq = 0.003 + (bSeed % 5) * 0.001;
                        const isOn = Math.sin(t * freq + bSeed) > 0.5;
                        
                        const bX = bx + 2 + col * 4;
                        const bY = by + 11 + row * 3.5;

                        this.ctx.fillStyle = '#a0a8b0'; 
                        this.ctx.fillRect(bX, bY, 3, 2);
                        
                        if (isOn) {
                            this.ctx.fillStyle = colors[colIdx];
                            this.ctx.shadowBlur = 3;
                            this.ctx.shadowColor = colors[colIdx];
                            this.ctx.fillRect(bX + 0.5, bY, 2, 2);
                            this.ctx.shadowBlur = 0;
                        } else {
                            this.ctx.fillStyle = 'rgba(0,0,0,0.15)';
                            this.ctx.fillRect(bX + 0.5, bY, 2, 2);
                        }
                    }
                }

                // 3. Numeric Keypad Section (Right side)
                const kx = bx + 26, ky = by + 11;
                this.ctx.fillStyle = '#a0a8b0';
                this.ctx.fillRect(kx - 1, ky - 1, 10, 10);
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        this.ctx.fillStyle = '#f0f4f8'; // White keys
                        this.ctx.fillRect(kx + c * 3, ky + r * 3, 2, 2);
                    }
                }

                // 4. Multi-Sliders (Bottom)
                this.ctx.strokeStyle = '#9098a0';
                this.ctx.lineWidth = 1;
                for (let s = 0; s < 5; s++) {
                    const sx = bx + 4 + s * 5.5;
                    const sy = by + 23;
                    const sh = 4;
                    // Slot
                    this.ctx.beginPath();
                    this.ctx.moveTo(sx, sy); this.ctx.lineTo(sx, sy + sh);
                    this.ctx.stroke();
                    // Knob
                    const knobPos = (Math.sin(seed * 40 + s * 12) + 1) * 0.5 * sh;
                    this.ctx.fillStyle = '#4a5058';
                    this.ctx.fillRect(sx - 1.5, sy + knobPos - 1, 3, 2);
                }
            } else {
                const tubeW = 10;
                const tubeX = px + (ts - tubeW) / 2;
                const tY = isHalfPill ? py + 10 : py + 6;
                const tH = isHalfPill ? 12 : ts - 14;

                // Recessed niche
                this.ctx.fillStyle = '#101418';
                if (isHalfPill) {
                    this.ctx.fillRect(tubeX - 2, tY - 5, tubeW + 4, tH + 7);
                } else {
                    this.ctx.fillRect(tubeX - 2, tY - 2, tubeW + 4, tH + 4);
                }

                // Liquid body
                this.ctx.fillStyle = '#00ff44';
                this.ctx.fillRect(tubeX, tY, tubeW, tH);
                this.ctx.beginPath();
                this.ctx.arc(tubeX + tubeW/2, tY, tubeW/2, Math.PI, 0);
                this.ctx.fill();
                
                if (!isHalfPill) {
                    this.ctx.beginPath();
                    this.ctx.arc(tubeX + tubeW/2, tY + tH, tubeW/2, 0, Math.PI);
                    this.ctx.fill();
                }
                
                // Bubbles
                const t = Date.now() * 0.005;
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                for (let i = 0; i < 5; i++) {
                    const bSeed = (seed * 100 + i * 53) % 100;
                    const speed = 0.7 + (bSeed % 5) * 0.1;
                    const bx = tubeX + 2 + ((bSeed) % (tubeW - 4)) + Math.sin(t * 0.5 + i) * 1.5;
                    const by = tY + tH - 2 - ((t * speed + i * 12) % (tH + 4));
                    const bSize = 0.7 + (Math.sin(t * 0.3 + i) + 1) * 0.4;
                    if (by > tY - 4 && by < tY + tH + 4) {
                        this.ctx.beginPath(); this.ctx.arc(bx, by, bSize, 0, Math.PI * 2); this.ctx.fill();
                    }
                }

                // Glass Highlights
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(tubeX + tubeW/2, tY, tubeW/2, Math.PI, 0);
                this.ctx.lineTo(tubeX + tubeW, tY + tH);
                if (isHalfPill) this.ctx.lineTo(tubeX, tY + tH);
                else this.ctx.arc(tubeX + tubeW/2, tY + tH, tubeW/2, 0, Math.PI);
                this.ctx.closePath(); this.ctx.clip();
                const grad = this.ctx.createLinearGradient(tubeX, 0, tubeX + tubeW, 0);
                grad.addColorStop(0, 'rgba(0,0,0,0.3)'); grad.addColorStop(0.2, 'rgba(255,255,255,0.4)');
                grad.addColorStop(0.5, 'rgba(255,255,255,0.1)'); grad.addColorStop(1, 'rgba(0,0,0,0.4)');
                this.ctx.fillStyle = grad;
                this.ctx.fillRect(tubeX, tY - 6, tubeW, tH + 12);
                this.ctx.restore();

                // Supports
            }

            // 4. BASEBOARD
            this.ctx.fillStyle = '#808890';
            this.ctx.fillRect(px, py + ts - 4, ts, 4);

            return;
        }

        if (char === ':') {
            // SECTOR: Realidade (Parede Modular Multicolorida)
            const baseL = 11 + (seed - 0.5) * 4;
            this.ctx.fillStyle = `hsl(210, 8%, ${baseL}%)`;
            this.ctx.fillRect(px, py, ts, ts);
            this.ctx.strokeStyle = '#203038';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);
            this.ctx.strokeRect(px + 6, py + 6, ts - 12, ts - 12);
            const t = Date.now() * 0.1;
            const hue = (t + x * 20 + y * 20 + seed * 360) % 360;
            const neon = `hsl(${hue}, 100%, 60%)`;
            const bright = `hsl(${hue}, 100%, 85%)`;
            if (variant === 7 || variant === 10 || variant === 11) {
                const isDense = variant >= 10;
                this.ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.2)`;
                const pW = isDense ? ts - 12 : 16;
                const pX = px + (ts - pW) / 2;
                this.ctx.fillRect(pX, py + 4, pW, ts - 8);
                this.ctx.fillStyle = bright;
                const count = isDense ? 8 : 4;
                const step = (ts - 10) / count;
                for (let i = 0; i < count; i++) {
                    this.ctx.fillRect(pX + 2, py + 6 + i * step, pW - 4, isDense ? 1.5 : 3);
                }
            } else if (variant === 5 || variant === 6) {
                this.ctx.beginPath();
                this.ctx.arc(px + ts / 2, py + ts / 2, 6, 0, Math.PI * 2);
                this.ctx.fillStyle = '#152028';
                this.ctx.fill();
                this.ctx.strokeStyle = neon;
                this.ctx.stroke();
                const blink = Math.sin(Date.now() * 0.005) > 0.5;
                this.ctx.fillStyle = blink ? neon : `hsl(${hue}, 100%, 20%)`;
                this.ctx.beginPath();
                this.ctx.arc(px + ts / 2, py + ts / 2, 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (variant === 8 || variant === 9) {
                this.ctx.strokeStyle = '#253540';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(px + 8, py + 4);
                this.ctx.lineTo(px + 8, py + ts - 4);
                this.ctx.moveTo(px + 12, py + 8);
                this.ctx.lineTo(px + 12, py + ts - 8);
                this.ctx.stroke();
                this.ctx.fillStyle = neon;
                this.ctx.fillRect(px + 22, py + 10, 3, 3);
            } else {
                this.ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.05)`;
                this.ctx.fillRect(px + 8, py + 8, ts - 16, ts - 16);
                this.ctx.fillStyle = '#1a2a30';
                this.ctx.fillRect(px + 4, py + 4, 2, 2);
                this.ctx.fillRect(px + ts - 6, py + 4, 2, 2);
                this.ctx.fillRect(px + 4, py + ts - 6, 2, 2);
                this.ctx.fillRect(px + ts - 6, py + ts - 6, 2, 2);
            }
            return;
        }

        if (char === ';') {
            // SECTOR: Realidade (Parede Conduíte Multicolorida)
            const baseL = 10 + (seed - 0.5) * 4;
            this.ctx.fillStyle = `hsl(210, 8%, ${baseL}%)`;
            this.ctx.fillRect(px, py, ts, ts);
            const isWide = (variant % 3 === 0);
            const trunkW = isWide ? ts - 6 : 14;
            const tx = px + (ts - trunkW) / 2;
            this.ctx.fillStyle = '#1a2530';
            this.ctx.fillRect(tx, py, trunkW, ts);
            this.ctx.fillStyle = '#253545';
            this.ctx.fillRect(tx, py, 2, ts);
            this.ctx.fillRect(tx + trunkW - 2, py, 2, ts);
            const t = Date.now() * 0.1;
            const hue = (t + x * 30 + y * 30 + variant * 10) % 360;
            const neon = `hsl(${hue}, 100%, 60%)`;
            const pulse = (Math.sin(Date.now() * 0.003 + variant) + 1) / 2;
            this.ctx.shadowBlur = 12 * pulse;
            this.ctx.shadowColor = neon;
            if (isWide) {
                this.ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.15 + pulse * 0.7})`;
                const coreW = 3.5;
                this.ctx.fillRect(tx + 3.5, py, coreW, ts);
                this.ctx.fillRect(tx + (trunkW/2) - (coreW/2), py, coreW, ts);
                this.ctx.fillRect(tx + trunkW - 3.5 - coreW, py, coreW, ts);
            } else {
                this.ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.2 + pulse * 0.8})`;
                this.ctx.fillRect(tx + 4, py, trunkW - 8, ts);
            }
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#101820';
            this.ctx.fillRect(px, py + 8, ts, 2);
            this.ctx.fillRect(px, py + 22, ts, 2);
            return;
        }

        if (char === '"') {
            // SECTOR: Quântico (Parede de Circuito Industrial - Heavy Metal Gray)
            // 1. BASE: Heavy Industrial Steel
            this.ctx.fillStyle = '#1e1e24';
            this.ctx.fillRect(px, py, ts, ts);

            // Subtle Static Noise Texture (Quantum Interference)
            const seedVal = Math.abs(Math.sin(seed * 43.123 + x * 12.7 + y * 9.1) * 1000) % 1;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
            for(let i=0; i<8; i++) {
                const nx = (Math.sin(seedVal * 10 + i) * 0.5 + 0.5) * ts;
                const ny = (Math.cos(seedVal * 7 + i) * 0.5 + 0.5) * ts;
                this.ctx.fillRect(px + nx, py + ny, 1, 1);
            }

            const purpleNeon = '#bf00ff';
            const t = Date.now();
            const pulse = (Math.sin(t * 0.002 + seedVal * 20) + 1) / 2;

            // 2. MASSIVE METAL PLATE STRUCTURE (No Vertical Borders)
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(px, py + 2); this.ctx.lineTo(px + ts, py + 2);
            this.ctx.stroke();
            
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(px, py + ts - 2); this.ctx.lineTo(px + ts, py + ts - 2);
            this.ctx.stroke();
            this.ctx.lineWidth = 1; 

            // Industrial Rivets
            this.ctx.fillStyle = '#1a1a22';
            this.ctx.fillRect(px + 4, py + 4, 2, 2);
            this.ctx.fillRect(px + ts - 6, py + 4, 2, 2);

            // 3. VARIATION SELECTION (Favoring Static/Generic)
            // 60% Static Panel, 20% Data Scroll, 10% Core, 10% Micro-Controllers
            let variantType = 1; // Generic Static Panel
            if (seedVal > 0.60) variantType = 0; // Data Scroll
            if (seedVal > 0.80) variantType = 2; // Data Core
            if (seedVal > 0.90) variantType = 3; // Controller Array

            const pillarWidth = ts * 0.6;
            const pillarX = px + (ts - pillarWidth) / 2;
            this.ctx.strokeStyle = `rgba(191, 0, 255, ${0.3 + pulse * 0.3})`;
            
            if (variantType === 1) {
                // GENERIC STATIC PANEL (Most Common)
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                this.ctx.strokeRect(pillarX + 4, py + 6, pillarWidth - 8, ts - 12);
                this.ctx.lineWidth = 1;
                // Horizontal reinforcement ribs
                for (let i = 0; i < 3; i++) {
                    const ly = py + 8 + i * 6;
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                    this.ctx.beginPath();
                    this.ctx.moveTo(pillarX + 2, ly); this.ctx.lineTo(pillarX + pillarWidth - 2, ly);
                    this.ctx.stroke();
                }
            } else if (variantType === 0) {
                // Massive Data Scroll
                this.ctx.font = 'bold 5px monospace';
                this.ctx.fillStyle = `rgba(191, 0, 255, ${0.4 * pulse})`;
                const shift = Math.floor(t * 0.02) % 10;
                for (let i = 0; i < 5; i++) {
                    const line = (i + shift) % 2 === 0 ? "10110" : "01001";
                    this.ctx.fillText(line, pillarX + 6, py + 8 + i * 6);
                }
            } else if (variantType === 2) {
                // High-Intensity Data Core
                this.ctx.beginPath();
                this.ctx.arc(px + ts/2, py + ts/2, 6, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.fillStyle = purpleNeon;
                this.ctx.shadowBlur = 10 * pulse;
                this.ctx.shadowColor = purpleNeon;
                this.ctx.beginPath();
                this.ctx.arc(px + ts/2, py + ts/2, 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            } else {
                // Micro-Controller Array
                const slotS = pillarWidth / 3;
                for (let i = 0; i < 3; i++) {
                    this.ctx.strokeRect(pillarX + i * slotS + 1, py + 12, 4, 8);
                    if ((Math.floor(t * 0.005) + i) % 3 === 0) {
                        this.ctx.fillStyle = purpleNeon;
                        this.ctx.fillRect(pillarX + i * slotS + 2, py + 14, 2, 2);
                    }
                }
            }

            // 4. HEAVY PLATE BEVELS (Horizontal)
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.beginPath();
            this.ctx.moveTo(px, py + 0.5); this.ctx.lineTo(px + ts, py + 0.5);
            this.ctx.moveTo(px, py + ts - 0.5); this.ctx.lineTo(px + ts, py + ts - 0.5);
            this.ctx.stroke();
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.beginPath();
            this.ctx.moveTo(px, py + 1.5); this.ctx.lineTo(px + ts, py + 1.5);
            this.ctx.stroke();
            
            return;
        }

        if (char === 'g') {
            // SECTOR ÓPTICO: Parede de Laboratório com Lentes e Vidros
            // 1. BASE BACKGROUND (Polished Steel)
            this.ctx.fillStyle = '#a0b0b8';
            this.ctx.fillRect(px, py, ts, ts);
            this.ctx.fillStyle = '#c0d0d8';
            this.ctx.fillRect(px, py + 2, ts, ts - 6);

            const oVariant = Math.floor(seed * 10);
            
            if (oVariant < 3) {
                // VARIANT: Plain Optical Panel (Just polished metal with seams)
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                this.ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);
                this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
                this.ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
            } else if (oVariant < 6) {
                // VARIANT: Magnifying Lens / Viewport (Shifted from < 4)
                const cx = px + ts/2, cy = py + ts/2;
                const r = 6;
                
                // Rim
                this.ctx.fillStyle = '#4a5058';
                this.ctx.beginPath(); this.ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); this.ctx.fill();
                
                // Glass
                const gGrad = this.ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, r);
                gGrad.addColorStop(0, 'rgba(200, 255, 255, 0.6)');
                gGrad.addColorStop(1, 'rgba(100, 200, 255, 0.3)');
                this.ctx.fillStyle = gGrad;
                this.ctx.beginPath(); this.ctx.arc(cx, cy, r, 0, Math.PI * 2); this.ctx.fill();
                
                // Reflection
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.beginPath(); this.ctx.ellipse(cx - 2.5, cy - 2.5, 2, 1, -Math.PI/4, 0, Math.PI * 2); this.ctx.fill();
            } else if (oVariant < 8) {
                // VARIANT: Vertical Glass Conduits (Shifted from < 7)
                const drawGlassTube = (tx) => {
                    const gx = px + tx, gy = py + 4, gw = 6, gh = ts - 8;
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    this.ctx.fillRect(gx - 1, gy, gw + 2, gh);
                    
                    const tGrad = this.ctx.createLinearGradient(gx, gy, gx + gw, gy);
                    tGrad.addColorStop(0, 'rgba(150, 230, 255, 0.4)');
                    tGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
                    tGrad.addColorStop(1, 'rgba(150, 230, 255, 0.4)');
                    this.ctx.fillStyle = tGrad;
                    this.ctx.fillRect(gx, gy, gw, gh);
                    
                    // Liquid pulse
                    const pulse = (Date.now() * 0.002 + seed * 10) % 1;
                    this.ctx.fillStyle = `hsla(${(Date.now() * 0.1) % 360}, 80%, 60%, 0.3)`;
                    this.ctx.fillRect(gx, gy + gh * pulse, gw, 4);
                };
                drawGlassTube(6);
                drawGlassTube(18);
            } else {
                // VARIANT: Optical Gauge / Prism Display
                this.ctx.fillStyle = '#2a2f35';
                this.ctx.fillRect(px + 4, py + 6, ts - 8, ts - 14);
                
                // Laser line inside display
                const beamY = py + ts/2 + Math.sin(Date.now() * 0.005 + seed * 20) * 4;
                this.ctx.strokeStyle = '#ff0055';
                this.ctx.lineWidth = 1.5;
                this.ctx.shadowBlur = 4;
                this.ctx.shadowColor = '#ff0055';
                this.ctx.beginPath();
                this.ctx.moveTo(px + 6, beamY);
                this.ctx.lineTo(px + ts - 6, beamY);
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
                
                // Decorative dots
                this.ctx.fillStyle = '#00ff88';
                this.ctx.fillRect(px + 6, py + 8, 2, 2);
                this.ctx.fillRect(px + 10, py + 8, 2, 2);
            }

            // Baseboard
            this.ctx.fillStyle = '#808890';
            this.ctx.fillRect(px, py + ts - 4, ts, 4);
            return;
        }
        
        if (char === 'j') {
            // SECTOR B: Industrial Diamond Grating Wall (Based on user image)
            // 1. BASE BACKGROUND (Deep reddish industrial depth)
            this.ctx.fillStyle = '#120a08';
            this.ctx.fillRect(px, py, ts, ts);
            
            // 2. DIAMOND GRATING PATTERN
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(px, py, ts, ts);
            this.ctx.clip();

            this.ctx.strokeStyle = '#5a3d35'; // Copper/Rust metallic
            this.ctx.lineWidth = 2;
            const step = 8;
            
            // Damage Tiers
            let skipBack = 0; // 0 = no skip, >1 = skip every Nth line
            let skipForward = 0;
            if (variant > 17) { skipBack = 2; skipForward = 3; } // Heavy
            else if (variant > 14) { skipBack = 4; skipForward = 5; } // Medium
            else if (variant > 11) { skipBack = 6; skipForward = 0; } // Light (one direction)
            else if (variant > 8) { skipBack = 10; skipForward = 0; } // Very Light

            // Draw lines in two directions to form diamonds
            for (let i = -ts; i < ts * 2; i += step) {
                const lineIdx = Math.floor((i + ts) / step);
                const doSkipBack = skipBack > 0 && ((lineIdx + variant) % skipBack === 0);
                const doSkipForward = skipForward > 0 && ((lineIdx + variant * 3) % skipForward === 0);

                // Diagonal \
                if (!doSkipBack) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(px + i, py);
                    this.ctx.lineTo(px + i + ts, py + ts);
                    this.ctx.stroke();
                }
                
                // Diagonal /
                if (!doSkipForward) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(px + i + ts, py);
                    this.ctx.lineTo(px + i, py + ts);
                    this.ctx.stroke();
                }
            }

            // 3. HIGHLIGHTS (Give it that metallic "pop" from the image)
            this.ctx.strokeStyle = 'rgba(255, 200, 180, 0.15)';
            this.ctx.lineWidth = 1;
            
            for (let i = -ts; i < ts * 2; i += step) {
                const lineIdx = Math.floor((i + ts) / step);
                const doSkipBack = skipBack > 0 && ((lineIdx + variant) % skipBack === 0);
                if (!doSkipBack) {
                    // Diagonal \ highlight
                    this.ctx.beginPath();
                    this.ctx.moveTo(px + i + 1, py);
                    this.ctx.lineTo(px + i + ts + 1, py + ts);
                    this.ctx.stroke();
                }
            }
            // 4. AMBIENT DUST / DEPTH (Slightly darken the centers of diamonds)
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            for (let iy = 0; iy < ts; iy += step) {
                for (let ix = (iy % (step * 2) === 0 ? 0 : step / 2); ix < ts; ix += step) {
                    this.ctx.beginPath();
                    this.ctx.arc(px + ix + step / 2, py + iy + step / 2, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }

            this.ctx.restore();
            return;
        }

        if (char === 'k') {
            // SECTOR B: Industrial Hazard & Ventilation Wall
            // 1. BASE PANEL (Reddish industrial metal)
            this.ctx.fillStyle = '#302420';
            this.ctx.fillRect(px, py, ts, ts);
            
            // 2. HAZARD STRIPES (Top and Bottom)
            const stripeW = 6;
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(px, py, ts, 6);
            this.ctx.rect(px, py + ts - 6, ts, 6);
            this.ctx.clip();
            
            this.ctx.fillStyle = '#ffcc00'; // Industrial Yellow
            this.ctx.fillRect(px, py, ts, ts);
            
            this.ctx.fillStyle = '#000000'; // Black Stripes
            for (let i = -ts; i < ts * 2; i += stripeW * 2) {
                this.ctx.beginPath();
                this.ctx.moveTo(px + i, py);
                this.ctx.lineTo(px + i + stripeW, py);
                this.ctx.lineTo(px + i + stripeW - 10, py + ts);
                this.ctx.lineTo(px + i - 10, py + ts);
                this.ctx.fill();
            }
            this.ctx.restore();

            // 3. PROCEDURAL VARIATIONS (Grille, Hatch, Emergency Light, or Plain)
            if (variant < 3) { 
                // Plain Panel (No extra detail)
            } else if (variant < 6) {
                // Ventilation Grille
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                for (let i = 8; i < ts - 8; i += 4) {
                    this.ctx.fillRect(px + 6, py + i, ts - 12, 2);
                }
            } else if (variant < 10) {
                // Circular Reinforced Vault Hatch (Alçapão Redondo)
                const centerX = px + ts / 2;
                const centerY = py + ts / 2;
                const radius = 9;
                
                // Outer Reinforced Ring
                this.ctx.fillStyle = '#251c18';
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius + 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = '#4a3830';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                // Vault Door Plate
                this.ctx.fillStyle = '#3a2a24';
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Rivets around the door
                this.ctx.fillStyle = '#111';
                for (let i = 0; i < 8; i++) {
                    const ang = (i / 8) * Math.PI * 2;
                    this.ctx.fillRect(centerX + Math.cos(ang) * (radius - 2) - 1, centerY + Math.sin(ang) * (radius - 2) - 1, 2, 2);
                }
                
                // Central Locking Valve (Handwheel)
                this.ctx.strokeStyle = '#1a1510';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
                this.ctx.stroke();
                // Valve spokes
                for (let i = 0; i < 4; i++) {
                    const ang = (i / 4) * Math.PI * 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(centerX, centerY);
                    this.ctx.lineTo(centerX + Math.cos(ang) * 3, centerY + Math.sin(ang) * 3);
                    this.ctx.stroke();
                }
            } else {
                // Emergency Indicator (Red)
                const blink = Math.sin(Date.now() * 0.004) > 0;
                this.ctx.fillStyle = blink ? '#ff3300' : '#441100';
                this.ctx.fillRect(px + ts / 2 - 2, py + 10, 4, 4);
                if (blink) {
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = '#ff3300';
                    this.ctx.strokeRect(px + ts / 2 - 2, py + 10, 4, 4);
                    this.ctx.shadowBlur = 0;
                }
            }
            return;
        }

        if (char === 'h') {
            // SECTOR C: High-Tech Modular Technical Wall (Star Wars Style)
            // 1. BASE BACKGROUND (Deep high-tech metal)
            this.ctx.fillStyle = '#0a1014';
            this.ctx.fillRect(px, py, ts, ts);
            
            // 2. PANEL STRUCTURE
            this.ctx.strokeStyle = '#203038';
            this.ctx.lineWidth = 1;
            
            // Draw recessed panel look
            this.ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);
            this.ctx.strokeRect(px + 6, py + 6, ts - 12, ts - 12);
            
            // VARIATIONS
            if (variant === 7 || variant === 10 || variant === 11) {
                // Star Wars "Light Panel" variant
                const isDense = variant >= 10;
                this.ctx.fillStyle = isDense ? 'rgba(0, 255, 159, 0.2)' : 'rgba(0, 255, 159, 0.15)'; // Green glow
                const pW = isDense ? ts - 12 : 16;
                const pX = px + (ts - pW) / 2;
                this.ctx.fillRect(pX, py + 4, pW, ts - 8);
                
                // Bright segments
                this.ctx.fillStyle = '#b0ffdf'; // Brighter green-tinted white
                const count = isDense ? 8 : 4;
                const step = (ts - 10) / count;
                for (let i = 0; i < count; i++) {
                    this.ctx.fillRect(pX + 2, py + 6 + i * step, pW - 4, isDense ? 1.5 : 3);
                }
            } else if (variant === 5 || variant === 6) {
                // Data Port / Circular Interface
                this.ctx.beginPath();
                this.ctx.arc(px + ts / 2, py + ts / 2, 6, 0, Math.PI * 2);
                this.ctx.fillStyle = '#152028';
                this.ctx.fill();
                this.ctx.strokeStyle = '#00ff9f';
                this.ctx.stroke();
                
                // Center LED
                const blink = Math.sin(Date.now() * 0.005) > 0.5;
                this.ctx.fillStyle = blink ? '#00ff9f' : '#005040';
                this.ctx.beginPath();
                this.ctx.arc(px + ts / 2, py + ts / 2, 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (variant === 8 || variant === 9) {
                // Greeble / Wires
                this.ctx.strokeStyle = '#253540';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(px + 8, py + 4);
                this.ctx.lineTo(px + 8, py + ts - 4);
                this.ctx.moveTo(px + 12, py + 8);
                this.ctx.lineTo(px + 12, py + ts - 8);
                this.ctx.stroke();
                
                // Small colored detail
                this.ctx.fillStyle = '#00ff9f';
                this.ctx.fillRect(px + 22, py + 10, 3, 3);
            } else {
                // Standard Modular Panel (Variant 0-4)
                this.ctx.fillStyle = 'rgba(0, 255, 159, 0.05)';
                this.ctx.fillRect(px + 8, py + 8, ts - 16, ts - 16);
                
                // Corner bolts
                this.ctx.fillStyle = '#1a2a30';
                this.ctx.fillRect(px + 4, py + 4, 2, 2);
                this.ctx.fillRect(px + ts - 6, py + 4, 2, 2);
                this.ctx.fillRect(px + 4, py + ts - 6, 2, 2);
                this.ctx.fillRect(px + ts - 6, py + ts - 6, 2, 2);
            }

            return;
        }

        if (char === 'm') {
            // SECTOR C: High-Tech Energy Conduit Wall
            this.ctx.fillStyle = '#080c10';
            this.ctx.fillRect(px, py, ts, ts);
            
            const isWide = (variant % 3 === 0);
            const trunkW = isWide ? ts - 6 : 14;
            const tx = px + (ts - trunkW) / 2;
            
            // Outer casing
            this.ctx.fillStyle = '#1a2530';
            this.ctx.fillRect(tx, py, trunkW, ts);
            
            // Edges
            this.ctx.fillStyle = '#253545';
            this.ctx.fillRect(tx, py, 2, ts);
            this.ctx.fillRect(tx + trunkW - 2, py, 2, ts);
            
            // 3. ENERGY CORE(S)
            const pulse = (Math.sin(Date.now() * 0.003 + variant) + 1) / 2;
            this.ctx.shadowBlur = 12 * pulse;
            this.ctx.shadowColor = '#00ff9f';
            
            if (isWide) {
                // Triple Vertical Energy Cores (Covers almost the whole block)
                this.ctx.fillStyle = `rgba(0, 255, 159, ${0.15 + pulse * 0.7})`;
                const coreW = 3.5;
                this.ctx.fillRect(tx + 3.5, py, coreW, ts);
                this.ctx.fillRect(tx + (trunkW/2) - (coreW/2), py, coreW, ts);
                this.ctx.fillRect(tx + trunkW - 3.5 - coreW, py, coreW, ts);
            } else {
                // Standard single core
                this.ctx.fillStyle = `rgba(0, 255, 159, ${0.2 + pulse * 0.8})`;
                this.ctx.fillRect(tx + 4, py, trunkW - 8, ts);
            }
            
            this.ctx.shadowBlur = 0;
            
            // 4. CROSS-CONNECTORS (Subtle background details)
            this.ctx.fillStyle = '#101820';
            this.ctx.fillRect(px, py + 8, ts, 2);
            this.ctx.fillRect(px, py + 22, ts, 2);

            return;
        } else if (char === '{') {
            // SECTOR: Logística (Parede - Estantes com Caixas)
            ctx.fillStyle = '#0a1015'; // Darker warehouse shadow
            ctx.fillRect(px, py, ts, ts);
            
            const variant = seedVal % 10;
            // Box Drawing Helper (Adjusted to fit within rack)
            const drawBox = (bx, by, bw, bh, color, tape = true) => {
                ctx.fillStyle = color;
                ctx.fillRect(px + bx, py + by, bw, bh);
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(px + bx, py + by + bh - 2, bw, 2);
                ctx.fillRect(px + bx + bw - 2, py + by, 2, bh);
                if (tape) {
                    ctx.fillStyle = 'rgba(255,255,255,0.15)';
                    ctx.fillRect(px + bx + (bw/2) - 1.5, py + by, 3, bh);
                }
                if (seed > 0.4) {
                    ctx.fillStyle = 'rgba(255,255,255,0.6)';
                    ctx.fillRect(px + bx + 3, py + by + 3, 6, 4);
                }
            };

            // Yellowish Industrial Palette
            const yellow1 = '#f1c40f';
            const yellow2 = '#d4ac0d';

            if (variant < 4) {
                drawBox(6, 4, 20, 10, yellow1);
                drawBox(5, 18, 22, 10, yellow2);
            } else if (variant < 7) {
                drawBox(5, 4, 10, 10, yellow2);
                drawBox(17, 4, 10, 10, yellow1);
                drawBox(5, 18, 22, 10, yellow1);
            } else if (variant < 9) {
                drawBox(8, 4, 16, 8, yellow1);
                drawBox(5, 16, 12, 12, yellow2);
                drawBox(19, 20, 8, 8, yellow1, false);
            } else {
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(px + 6, py + 5, ts - 12, ts - 10);
            }

            const rackColor = '#2c3e50';
            ctx.fillStyle = rackColor;
            ctx.fillRect(px + 1, py, 4, ts); ctx.fillRect(px + ts - 5, py, 4, ts);
            ctx.fillRect(px, py + 1, ts, 3); ctx.fillRect(px, py + (ts/2) - 2, ts, 4); ctx.fillRect(px, py + ts - 4, ts, 4);
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(px + 2, py, 1, ts); ctx.fillRect(px, py + (ts/2) - 1, ts, 1);
            ctx.fillStyle = '#1a252f';
            ctx.fillRect(px + 1, py + (ts/2) - 2, 4, 4); ctx.fillRect(px + ts - 5, py + (ts/2) - 2, 4, 4);
            return;
        } else if (char === '~') {
            // SECTOR: Logística (Parede - Estantes com SUCATA / COMPONENTES)
            ctx.fillStyle = '#0a1015'; // Darker warehouse shadow
            ctx.fillRect(px, py, ts, ts);
            const variant = seedVal % 10;
            const drawItem = (ix, iy, type) => {
                const ipx = px + ix; const ipy = py + iy;
                if (type === 'orb_blue') {
                    ctx.fillStyle = '#00f0ff'; ctx.beginPath(); ctx.arc(ipx + 4, ipy + 4, 4, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(ipx + 2, ipy + 2, 1.5, 0, Math.PI * 2); ctx.fill();
                } else if (type === 'orb_green') {
                    ctx.fillStyle = '#00ff00'; ctx.beginPath(); ctx.arc(ipx + 4, ipy + 4, 4, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(ipx + 2, ipy + 2, 1.5, 0, Math.PI * 2); ctx.fill();
                } else if (type === 'scrap') {
                    ctx.fillStyle = '#7f8c8d'; ctx.fillRect(ipx + 1, ipy + 3, 6, 4);
                    ctx.fillStyle = '#95a5a6'; ctx.fillRect(ipx + 2, ipy + 2, 3, 2);
                } else if (type === 'head') {
                    // Specific Robot Head (Blue top, Orange face)
                    ctx.fillStyle = '#2980b9'; ctx.fillRect(ipx, ipy, 8, 3); // Blue Cap
                    ctx.fillStyle = '#e67e22'; ctx.fillRect(ipx, ipy + 3, 8, 5); // Orange Face
                    ctx.fillStyle = '#f1c40f'; ctx.fillRect(ipx + 5, ipy + 1, 2, 1.5); // Yellow Eye
                } else if (type === 'arm') {
                    // Robot Arm (Orange with Blue joints)
                    ctx.fillStyle = '#2980b9'; ctx.fillRect(ipx, ipy, 3, 3); // Shoulder
                    ctx.fillStyle = '#e67e22'; ctx.fillRect(ipx + 3, ipy + 1, 5, 2); // Bicep
                    ctx.fillStyle = '#2980b9'; ctx.fillRect(ipx + 7, ipy, 2, 4); // Hand/Joint
                } else if (type === 'pulley') {
                    // Metallic Pulley (Circular with center hole)
                    ctx.fillStyle = '#95a5a6'; ctx.beginPath(); ctx.arc(ipx+4, ipy+4, 4, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(ipx+4, ipy+4, 1.5, 0, Math.PI*2); ctx.fill();
                } else if (type === 'laser') {
                    ctx.fillStyle = '#2c3e50'; ctx.fillRect(ipx, ipy + 1, 8, 6);
                    ctx.fillStyle = '#ff0000'; ctx.fillRect(ipx + 6, ipy + 3, 2, 2);
                } else if (type === 'amp') {
                    ctx.fillStyle = '#9b59b6'; ctx.beginPath(); ctx.moveTo(ipx+4, ipy); ctx.lineTo(ipx+8, ipy+8); ctx.lineTo(ipx, ipy+8); ctx.fill();
                }
            };
            if (variant < 3) {
                drawItem(8, 6, 'head'); drawItem(18, 6, 'orb_blue'); drawItem(6, 20, 'laser'); drawItem(20, 20, 'arm');
            } else if (variant < 6) {
                drawItem(6, 5, 'pulley'); drawItem(14, 7, 'pulley'); drawItem(22, 5, 'scrap'); drawItem(8, 19, 'orb_green'); drawItem(18, 20, 'amp');
            } else if (variant < 9) {
                drawItem(10, 6, 'amp'); drawItem(20, 5, 'head'); drawItem(6, 22, 'orb_blue'); drawItem(14, 20, 'arm'); drawItem(24, 21, 'pulley');
            } else { drawItem(12, 18, 'head'); }
            const rackColor = '#34495e';
            ctx.fillStyle = rackColor; ctx.fillRect(px + 1, py, 4, ts); ctx.fillRect(px + ts - 5, py, 4, ts);
            ctx.fillRect(px, py + 1, ts, 3); ctx.fillRect(px, py + (ts/2) - 2, ts, 4); ctx.fillRect(px, py + ts - 4, ts, 4);
            ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(px + 2, py, 1, ts); ctx.fillRect(px, py + (ts/2) - 1, ts, 1);
            ctx.fillStyle = '#1a252f'; ctx.fillRect(px + 1, py + (ts/2) - 2, 4, 4); ctx.fillRect(px + ts - 5, py + (ts/2) - 2, 4, 4);
            return;
        }

        // DEFAULT: Industrial Metal Wall (W)
        // 1. BASE BACKGROUND (Dark industrial metal)
        this.ctx.fillStyle = '#1c1c24';
        this.ctx.fillRect(px, py, ts, ts);
        
        // 2. INNER PANEL BEVEL
        this.ctx.fillStyle = '#2d2d3b';
        this.ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
        
        // 3. VARIANT SPECIFIC LAYER
        const wVariant = seedVal % 20;
        if (wVariant >= 0 && wVariant <= 4) { 
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
        } else if (wVariant >= 5 && wVariant <= 9) {
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
        } else if (wVariant >= 10 && wVariant <= 14) {
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

        if (char === 'q') {
            // SECTOR: Compilador (Parede - Transcendental / Roxo)
            this.ctx.fillStyle = '#1a002a';
            this.ctx.fillRect(px, py, ts, ts);
            const t = Date.now() * 0.0008;
            const p = 0.5 + Math.sin(t + seed * 10) * 0.3;
            const sz = (ts/2 - 4) * p;
            this.ctx.strokeStyle = 'rgba(180, 50, 255, 0.2)';
            this.ctx.beginPath();
            this.ctx.moveTo(px + ts/2, py + ts/2 - sz);
            this.ctx.lineTo(px + ts/2 + sz, py + ts/2);
            this.ctx.lineTo(px + ts/2, py + ts/2 + sz);
            this.ctx.lineTo(px + ts/2 - sz, py + ts/2);
            this.ctx.closePath(); this.ctx.stroke();
            this.ctx.strokeStyle = 'rgba(180, 50, 255, 0.1)';
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI / 2) + seed;
                this.ctx.beginPath();
                this.ctx.moveTo(px + ts/2, py + ts/2);
                this.ctx.lineTo(px + ts/2 + Math.cos(angle) * ts, py + ts/2 + Math.sin(angle) * ts);
                this.ctx.stroke();
            }
            this.ctx.fillStyle = `rgba(140, 0, 255, ${0.1 + p * 0.1})`;
            this.ctx.shadowBlur = 10 * p;
            this.ctx.shadowColor = '#8c00ff';
            this.ctx.fillRect(px + ts/2 - 2, py + ts/2 - 2, 4, 4);
            this.ctx.shadowBlur = 0;
            this.ctx.strokeStyle = 'rgba(180, 50, 255, 0.15)';
            this.ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
            
            // Wall Base
            this.ctx.fillStyle = '#111';
            this.ctx.fillRect(px, py + ts - 2, ts, 2);
            return;
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

        // 0. Micro Dark Outline (To define tile boundary)
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);

        // 1. Glass Base (Bluish tint, 10% opacity)
        this.ctx.fillStyle = 'rgba(0, 150, 255, 0.1)';
        this.ctx.fillRect(px, py, ts, ts);

        // 2. Simple Diagonal Reflection Lines (Animated Sweep)
        const cycle = ts * 4;
        const progress = (frame * 0.5) % cycle;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 1.0)';
        
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(px, py, ts, ts);
        this.ctx.clip();
        
        for (let i = 0; i < 2; i++) {
            const offset = progress - i * 16; 
            
            if (offset > 0 && offset < ts * 2) {
                this.ctx.beginPath();
                this.ctx.lineWidth = i === 0 ? 6 : 2; // Much thicker
                
                const x1 = Math.max(0, offset - ts);
                const y1 = Math.min(ts, offset);
                const x2 = Math.min(ts, offset);
                const y2 = Math.max(0, offset - ts);
                
                if (Math.abs(x1 - x2) > 1) {
                    this.ctx.moveTo(px + x1, py + y1);
                    this.ctx.lineTo(px + x2, py + y2);
                }
                this.ctx.stroke();
            }
        }
        this.ctx.restore();

        // 4. Optic Permeability Feedback (Cyan glow only when laser passes)
        if (isLaserPassing) {
            this.ctx.save();
            const glowAlpha = 0.2 + Math.sin(frame * 0.2) * 0.1;
            this.ctx.strokeStyle = `rgba(0, 240, 255, ${glowAlpha})`;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(px + 1, py + 1, ts - 2, ts - 2);
            this.ctx.restore();
        }

        this.ctx.restore();
    },

    drawWorldLabel(x, y, text, color = '#00f0ff', alpha = 1.0, cryptIntensity = 0) {
        if (alpha <= 0 || !text) return;
        const px = (x + 0.5) * this.tileSize;
        const py = (y + 0.5) * this.tileSize;
        
        // Use shared Crypt Scrambler Logic
        const renderText = this.scrambleText(text, cryptIntensity, x * 13 + y * 37);

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.font = '20px "VT323"';
        this.ctx.textAlign = 'center';
        
        // Glow effect
        this.ctx.shadowBlur = 4;
        this.ctx.shadowColor = color;
        
        this.ctx.fillStyle = color;
        this.ctx.fillText(renderText, px, py);
        
        this.ctx.restore();
    }
});
