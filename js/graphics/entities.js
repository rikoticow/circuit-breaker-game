Object.assign(Graphics, {
    drawBlock(x, y, visualAngle, powerData, distToTarget = 0, logicalDir = 0, type = 'NORMAL', fallProgress = 0, phase = null, isSolarGlobal = true) {
        const ts = this.tileSize;
        const cx = (x + 0.5) * ts;
        const cy = (y + 0.5) * ts;
        const px = -ts / 2;
        const py = -ts / 2;
        
        this.ctx.save();
        this.ctx.translate(cx, cy);

        // --- PHASE STATE ---
        const isOutOfPhase = phase && ((phase === 'SOLAR' && !isSolarGlobal) || (phase === 'LUNAR' && isSolarGlobal));
        
        let baseMetal = '#3a3a4a';
        let accentColor = '#ff8800';
        let innerMetal = '#888899';
        
        if (phase === 'SOLAR') {
            baseMetal = '#4a3d05';
            accentColor = '#ffcc00';
            innerMetal = '#b8860b';
        } else if (phase === 'LUNAR') {
            baseMetal = '#1a052a';
            accentColor = '#bf00ff';
            innerMetal = '#4b0082';
        }

        if (isOutOfPhase) {
            const t = (performance.now() * 0.005);
            const blockSeed = (x * 17 + y * 23);
            this.ctx.strokeStyle = accentColor;
            this.ctx.lineWidth = 1.2;
            
            // Pre-calculate 4 corner jitters
            const j1x = Math.sin(t + blockSeed) * 1.5, j1y = Math.cos(t * 1.1 + blockSeed) * 1.5;
            const j2x = Math.sin(t * 0.9 + blockSeed + 2) * 1.5, j2y = Math.cos(t * 1.2 + blockSeed + 3) * 1.5;
            const j3x = Math.sin(t * 1.1 + blockSeed + 4) * 1.5, j3y = Math.cos(t * 0.8 + blockSeed + 5) * 1.5;
            const j4x = Math.sin(t * 0.8 + blockSeed + 6) * 1.5, j4y = Math.cos(t * 1.3 + blockSeed + 7) * 1.5;

            this.ctx.beginPath();
            
            // Helper for adding a wiggled rect to the current path
            const addWiggledRect = (rx, ry, rw, rh) => {
                this.ctx.moveTo(rx + j1x, ry + j1y);
                this.ctx.lineTo(rx + rw + j2x, ry + j2y);
                this.ctx.lineTo(rx + rw + j3x, ry + rh + j3y);
                this.ctx.lineTo(rx + j4x, ry + rh + j4y);
                this.ctx.lineTo(rx + j1x, ry + j1y);
            };

            // Main Outline
            addWiggledRect(px + 2, py + 2, ts - 4, ts - 4);
            
            if (type === 'PRISM' || type === 'prism') {
                const winMargin = 6;
                addWiggledRect(px + winMargin, py + winMargin, ts - winMargin*2, ts - winMargin*2);
            } else {
                const bcs = 8;
                addWiggledRect(px + 2, py + 2, bcs, bcs);
                addWiggledRect(px + ts - bcs - 2, py + 2, bcs, bcs);
                addWiggledRect(px + 2, py + ts - bcs - 2, bcs, bcs);
                addWiggledRect(px + ts - bcs - 2, py + ts - bcs - 2, bcs, bcs);
                addWiggledRect(px + 6, py + 6, ts - 12, ts - 12);
            }
            
            this.ctx.stroke(); // ONE STROKE for the entire block structure

            // Triangle/Mirror (needs separate path if rotated)
            if (type === 'PRISM' || type === 'prism') {
                this.ctx.save();
                this.ctx.rotate(visualAngle !== undefined ? visualAngle : (logicalDir * (Math.PI / 2)));
                this.ctx.beginPath();
                this.ctx.moveTo(10 + j1x, -10 + j2y);
                this.ctx.lineTo(-10 + j3x, 10 + j4y);
                this.ctx.stroke();
                this.ctx.restore();
            } else {
                this.ctx.save();
                this.ctx.rotate(visualAngle);
                this.ctx.beginPath();
                const triSize = 8;
                this.ctx.moveTo(-triSize + j1x, -triSize + j2y);
                this.ctx.lineTo(triSize + j3x, 0 + j4y);
                this.ctx.lineTo(-triSize + j1y, triSize + j2x);
                this.ctx.closePath();
                this.ctx.stroke();
                this.ctx.restore();
            }

            this.ctx.restore();
            return;
        }

        // --- FALL ANIMATION (Procedural Spin & Scale) ---
        if (fallProgress > 0) {
            const scale = Math.max(0, 1.0 - fallProgress);
            const rot = fallProgress * Math.PI * 6;
            this.ctx.scale(scale, scale);
            this.ctx.rotate(rot);
            this.ctx.globalAlpha *= Math.max(0, 1.0 - fallProgress);
            this.ctx.filter = `brightness(${Math.max(0, 100 - fallProgress * 150)}%)`;
        }

        if (type === 'PRISM' || type === 'prism') {
            // --- PRISMATIC INDUSTRIAL BLOCK ---
            let isHit = false;
            if (window.game && window.game.blocks) {
                const block = window.game.blocks.find(b => (b.visualX === x || b.x === x) && (b.visualY === y || b.y === y));
                if (block) isHit = block.isHit;
            }

            this.ctx.save();
            this.ctx.fillStyle = '#3a3a4a'; this.ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
            this.ctx.fillStyle = '#4a5568'; const cs = 8;
            this.ctx.fillRect(px + 2, py + 2, cs, cs); this.ctx.fillRect(px + ts - cs - 2, py + 2, cs, cs); this.ctx.fillRect(px + 2, py + ts - cs - 2, cs, cs); this.ctx.fillRect(px + ts - cs - 2, py + ts - cs - 2, cs, cs);
            const winMargin = 6; this.ctx.fillStyle = 'rgba(20, 25, 40, 0.9)'; this.ctx.fillRect(px + winMargin, py + winMargin, ts - winMargin*2, ts - winMargin*2);
            this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)'; this.ctx.lineWidth = 1; this.ctx.strokeRect(px + winMargin, py + winMargin, ts - winMargin*2, ts - winMargin*2);
            this.ctx.save();
            const mirrorRotation = visualAngle !== undefined ? visualAngle : (logicalDir * (Math.PI / 2));
            this.ctx.rotate(mirrorRotation);
            this.ctx.strokeStyle = '#000'; this.ctx.lineWidth = isHit ? 9 : 6; this.ctx.beginPath(); this.ctx.moveTo(8, -12); this.ctx.lineTo(-12, 8); this.ctx.stroke();
            if (isHit) {
                const hue = (Date.now() / 10) % 360, grad = this.ctx.createLinearGradient(12, -12, -12, 12);
                grad.addColorStop(0, `hsl(${hue}, 100%, 70%)`); grad.addColorStop(0.5, `hsl(${(hue + 60) % 360}, 100%, 80%)`); grad.addColorStop(1, `hsl(${(hue + 120) % 360}, 100%, 70%)`);
                this.ctx.strokeStyle = grad; this.ctx.lineWidth = 5;
            } else {
                this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 3;
            }
            this.ctx.beginPath(); this.ctx.moveTo(10, -10); this.ctx.lineTo(-10, 10); this.ctx.stroke();
            // if (isHit && Math.random() > 0.8) this.spawnParticle(cx + (Math.random()-0.5)*10, cy + (Math.random()-0.5)*10, `hsl(${(Date.now() / 10) % 360}, 100%, 75%)`, 'spark'); // REMOVED
            this.ctx.restore();
            this.ctx.fillStyle = '#1a1a1a'; const bs = 2;
            this.ctx.fillRect(px + 4, py + 4, bs, bs); this.ctx.fillRect(px + ts - 6, py + 4, bs, bs); this.ctx.fillRect(px + 4, py + ts - 6, bs, bs); this.ctx.fillRect(px + ts - 6, py + ts - 6, bs, bs);
            this.ctx.restore(); this.ctx.restore();
            return;
        }

        this.ctx.fillStyle = baseMetal; this.ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
        this.ctx.fillStyle = accentColor; const bcs = 8;
        this.ctx.fillRect(px + 2, py + 2, bcs, bcs); this.ctx.fillRect(px + ts - bcs - 2, py + 2, bcs, bcs); this.ctx.fillRect(px + 2, py + ts - bcs - 2, bcs, bcs); this.ctx.fillRect(px + ts - bcs - 2, py + ts - bcs - 2, bcs, bcs);
        this.ctx.fillStyle = innerMetal; this.ctx.fillRect(px + 6, py + 6, ts - 12, ts - 12);
        this.ctx.fillStyle = '#aaaaBB'; this.ctx.fillRect(px + 6, py + 6, ts - 12, 2); this.ctx.fillRect(px + 6, py + 6, 2, ts - 12);
        this.ctx.fillStyle = '#555566'; this.ctx.fillRect(px + 6, py + ts - 8, ts - 12, 2); this.ctx.fillRect(px + ts - 8, py + 6, 2, ts - 12);

        this.ctx.save();
        this.ctx.rotate(visualAngle);
        let arrowColor = '#fff';
        if (powerData) {
            if (powerData.invalid) arrowColor = '#ffcc00';
            else if (powerData.active) arrowColor = powerData.isOcean ? '#00f0ff' : (powerData.color === 'RED' ? '#ff003c' : '#0077ff');
        }
        this.ctx.fillStyle = arrowColor; this.ctx.beginPath(); const triSize = 8; this.ctx.moveTo(-triSize, -triSize); this.ctx.lineTo(triSize, 0); this.ctx.lineTo(-triSize, triSize); this.ctx.closePath(); this.ctx.fill();
        this.ctx.restore();

        if (powerData && powerData.active && distToTarget < 0.1 && !isOutOfPhase) {
            let relNextX = 0, relNextY = 0; const dist = 32;
            if (logicalDir === DIRS.UP) relNextY = -dist; else if (logicalDir === DIRS.DOWN) relNextY = dist; else if (logicalDir === DIRS.LEFT) relNextX = -dist; else if (logicalDir === DIRS.RIGHT) relNextX = dist;
            for(let i=0; i<2; i++) this.drawLightning(0, 0, relNextX, relNextY, arrowColor);
        }
        this.ctx.restore();
    },

    drawRobot(x, y, dir, frame, colorOverride = null, vx = 0, vy = 0, isDead = false, deathType = null, deathTimer = 0, deathDir = {x:0, y:0}, isGrabbing = false, flashTimer = 0) {
        const ts = this.tileSize, px = x * ts, py = y * ts, cx = px + ts/2, cy = py + ts/2;
        this.ctx.save(); this.ctx.translate(cx, cy);
        
        // --- DAMAGE FLASH EFFECT ---
        if (flashTimer > 0) {
            if (Math.floor(frame / 2) % 2 === 0) {
                this.ctx.filter = 'brightness(5) contrast(2)';
            }
            if (frame % 3 === 0) {
                this.spawnParticle(cx + (Math.random()-0.5)*15, cy + (Math.random()-0.5)*15, '#ffffff', 'spark');
            }
        }
        if (isDead && deathType === 'HOLE') {
            const progress = Math.min(1.0, deathTimer / 20), scale = Math.max(0, 1.0 - progress), rot = progress * Math.PI * 6;
            this.ctx.scale(scale, scale); this.ctx.rotate(rot); this.ctx.globalAlpha = Math.max(0, 1.0 - progress); this.ctx.filter = `brightness(${Math.max(0, 100 - progress * 150)}%)`;
        } else if (isDead && deathType === 'CRUSHED') {
            this.ctx.translate(deathDir.x * deathTimer * 0.5, deathDir.y * deathTimer * 0.5); this.ctx.globalAlpha = Math.max(0, 1 - deathTimer / 30);
        }
        const isCrushed = isDead && deathType === 'CRUSHED', p = Math.min((deathTimer || 0) / 35, 1), ease = 1 - Math.pow(1 - p, 3), t = ease * 28, tr = ease * 40;
        const bx = isCrushed ? (deathDir ? deathDir.x * t * 1.5 : 0) : 0, by = isCrushed ? (deathDir ? deathDir.y * t * 1.5 : 0) : 0;
        if (!isDead) { const speed = Math.sqrt(vx*vx + vy*vy); if (speed > 0.05) { const s = 1 + speed * 0.4, sq = 1 - speed * 0.2; if (Math.abs(vx) > Math.abs(vy)) this.ctx.scale(s, sq); else this.ctx.scale(sq, s); } }
        const bodyBob = !isDead ? ((frame % 20 < 10) ? -0.5 : 0.5) : 0, headTremble = !isDead ? (Math.sin(frame * 0.3) * 0.4) : 0;
        this.ctx.save(); this.ctx.translate(bx, by + bodyBob); this.ctx.rotate(dir * Math.PI / 2);
        if (isCrushed && deathTimer < 15 && frame % 3 === 0) { const sp = this.spawnParticle(cx + bx, cy + by, '#ffcc00', 'spark'); if (sp && deathDir) { sp.vx += deathDir.x * 6; sp.vy += deathDir.y * 6; } }
        const treadSpread = isCrushed ? t * 0.4 : 0, treadRot = isCrushed ? tr * 0.05 : 0;
        this.ctx.save(); this.ctx.translate(0, treadSpread); this.ctx.rotate(treadRot); this.ctx.fillStyle = '#4a5568'; this.ctx.fillRect(-12, 7, 24, 7); this.ctx.fillStyle = '#1a202c'; [-8, 0, 8].forEach(x => this.ctx.fillRect(x, 8, 4, 5)); this.ctx.restore();
        this.ctx.save(); this.ctx.translate(0, -treadSpread); this.ctx.rotate(-treadRot * 1.1); this.ctx.fillStyle = '#4a5568'; this.ctx.fillRect(-12, -14, 24, 7); this.ctx.fillStyle = '#1a202c'; [-8, 0, 8].forEach(x => this.ctx.fillRect(x, -13, 4, 5)); this.ctx.restore();
        const asX = isCrushed ? t * 0.6 : 0, asY = isCrushed ? t * 0.3 : 0;
        // Right Arm/Claw
        this.ctx.save(); 
        this.ctx.translate(asX + (isGrabbing ? 4 : 0), asY); 
        this.ctx.rotate(isCrushed ? tr * 0.1 : 0); 
        this.ctx.fillStyle = '#2b6cb0'; this.ctx.fillRect(-2, 7, 6, 4); 
        this.ctx.fillStyle = '#ed8936'; this.ctx.fillRect(4, 7, 8, 3); 
        if (isGrabbing) {
            this.ctx.fillStyle = '#00f0ff'; // Magnetic Blue
            this.ctx.fillRect(12, 7, 4, 3);
        }
        this.ctx.restore();
        
        // Left Arm/Claw
        this.ctx.save(); 
        this.ctx.translate(asX + (isGrabbing ? 4 : 0), -asY); 
        this.ctx.rotate(isCrushed ? -tr * 0.1 : 0); 
        this.ctx.fillStyle = '#2b6cb0'; this.ctx.fillRect(-2, -11, 6, 4); 
        this.ctx.fillStyle = '#ed8936'; this.ctx.fillRect(4, -10, 8, 3); 
        if (isGrabbing) {
            this.ctx.fillStyle = '#00f0ff';
            this.ctx.fillRect(12, -10, 4, 3);
        }
        this.ctx.restore();
        this.ctx.save(); this.ctx.translate(isCrushed ? -t * 0.5 : 0, 0); this.ctx.rotate(isCrushed ? -tr * 0.08 : 0); this.ctx.fillStyle = '#3182ce'; this.ctx.fillRect(-14, -8, 6, 16); this.ctx.fillStyle = '#2b6cb0'; this.ctx.fillRect(-14, -8, 2, 16); this.ctx.restore();
        this.ctx.save(); if (isCrushed) { this.ctx.translate(Math.sin(deathTimer)*1.2, Math.cos(deathTimer)*1.2); this.ctx.rotate(tr * 0.03); } this.ctx.fillStyle = '#dd6b20'; this.ctx.fillRect(-8, -8, 14, 16);
        if (!isDead) { [{x:-12, y:-4, i:10}, {x:-12, y:2, i:11}, {x:-4, y:-6, i:12}].forEach(l => { if (Math.sin(frame * 0.08 + l.i * 2.1) + Math.sin(frame * 0.12 + l.i * 1.2) > 1.3) { this.ctx.fillStyle = '#ffcc00'; this.ctx.fillRect(l.x, l.y, 2, 2); } }); }
        this.ctx.restore(); if (isDead && deathType === 'SHUTDOWN') { if (frame % 15 === 0) Graphics.spawnParticle(cx, cy, 'rgba(100,100,100,0.5)', 'smoke'); if (frame % 20 === 0) Graphics.spawnParticle(cx, cy, '#ffcc00', 'spark'); } this.ctx.restore();
        this.ctx.save(); this.ctx.translate(bx + (isCrushed ? t * 1.2 : 0), by + (isCrushed ? -t * 0.5 : 0) + headTremble); this.ctx.rotate(dir * Math.PI / 2 + (isCrushed ? tr * 0.2 : 0));
        this.ctx.fillStyle = '#ed8936'; this.ctx.fillRect(-2, -6, 12, 12);
        const vc = isDead ? '#000' : (colorOverride || '#00f0ff'); this.ctx.fillStyle = '#4a5568'; this.ctx.fillRect(-4, -9, 2, 4); this.ctx.fillStyle = vc; this.ctx.beginPath(); this.ctx.arc(-3, -11, 2, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.fillStyle = '#1a202c'; this.ctx.fillRect(4, -4, 8, 8); this.ctx.fillStyle = vc; this.ctx.fillRect(6, -2, 4, 4);
        this.ctx.restore(); this.ctx.restore();
    },

    drawScrap(x, y, frame) {
        const cx = x * this.tileSize + this.tileSize/2, cy = y * this.tileSize + this.tileSize/2;
        const sp = 0.8 + Math.sin(frame * 0.1) * 0.1;
        this.ctx.save(); this.ctx.translate(cx, cy + 10); this.ctx.scale(sp, sp * 0.5); this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; this.ctx.beginPath(); this.ctx.arc(0, 0, 10, 0, Math.PI * 2); this.ctx.fill(); this.ctx.restore();
        for (let i = 0; i < 3; i++) {
            const seed = (x * 7 + y * 13 + i * 17), type = seed % 4, bob = Math.sin(frame * 0.08 + seed) * 4, rot = frame * (0.04 + i * 0.01) + seed;
            this.ctx.save(); this.ctx.translate(cx + Math.cos(seed * 0.5) * 6, cy + Math.sin(seed * 0.5) * 6 + bob); this.ctx.rotate(rot);
            
            // Varied grayscale/metallic colors
            const sat = (seed % 5); // Very low saturation
            const lum = 30 + (seed % 50); // Significant luminosity variation
            this.ctx.fillStyle = `hsl(0, ${sat}%, ${lum}%)`;
            this.ctx.strokeStyle = `hsl(0, ${sat}%, ${Math.max(0, lum - 20)}%)`;
            this.ctx.lineWidth = 1;
            
            if (type === 0) { const r = 5; this.ctx.beginPath(); for (let j = 0; j < 8; j++) { const a = (j / 8) * Math.PI * 2, na = ((j + 0.5) / 8) * Math.PI * 2; this.ctx.lineTo(Math.cos(a) * (r + 3), Math.sin(a) * (r + 3)); this.ctx.lineTo(Math.cos(na) * (r + 3), Math.sin(na) * (r + 3)); this.ctx.lineTo(Math.cos(na) * r, Math.sin(na) * r); } this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke(); this.ctx.fillStyle = 'rgba(0,0,0,0.3)'; this.ctx.beginPath(); this.ctx.arc(0, 0, 1.5, 0, Math.PI * 2); this.ctx.fill(); }
            else if (type === 1) { this.ctx.fillRect(-4, -6, 8, 3); this.ctx.strokeRect(-4, -6, 8, 3); this.ctx.fillRect(-2, -3, 4, 8); this.ctx.strokeRect(-2, -3, 4, 8); this.ctx.fillStyle = 'rgba(0,0,0,0.3)'; this.ctx.fillRect(-3, -5.5, 6, 1); }
            else if (type === 2) { const r = 6; this.ctx.beginPath(); for (let j = 0; j < 6; j++) this.ctx.lineTo(Math.cos((j / 6) * Math.PI * 2) * r, Math.sin((j / 6) * Math.PI * 2) * r); this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke(); this.ctx.fillStyle = 'rgba(0,0,0,0.3)'; this.ctx.beginPath(); this.ctx.arc(0, 0, 2, 0, Math.PI * 2); this.ctx.fill(); }
            else { const r = 3; this.ctx.beginPath(); for (let j = 0; j < 6; j++) { const a = (j / 6) * Math.PI * 2, na = ((j + 0.5) / 6) * Math.PI * 2; this.ctx.lineTo(Math.cos(a) * (r + 2), Math.sin(a) * (r + 2)); this.ctx.lineTo(Math.cos(na) * (r + 2), Math.sin(na) * (r + 2)); } this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke(); this.ctx.fillStyle = 'rgba(0,0,0,0.3)'; this.ctx.beginPath(); this.ctx.arc(0, 0, 1, 0, Math.PI * 2); this.ctx.fill(); }
            this.ctx.fillStyle = 'rgba(255,255,255,0.2)'; this.ctx.fillRect(-1.5, -1.5, 1.5, 1.5); this.ctx.restore();
        }
    },

    drawDebris(p) {
        this.ctx.save(); this.ctx.translate(p.x, p.y); this.ctx.rotate(p.rot); this.ctx.fillStyle = p.color; this.ctx.beginPath(); this.ctx.moveTo(p.vertices[0].x, p.vertices[0].y); for (let i = 1; i < p.vertices.length; i++) this.ctx.lineTo(p.vertices[i].x, p.vertices[i].y); this.ctx.closePath(); this.ctx.fill(); this.ctx.strokeStyle = 'rgba(0,0,0,0.3)'; this.ctx.lineWidth = 1; this.ctx.stroke(); this.ctx.restore();
    },

    drawCoreRequirement(x, y, required, current) {
        if (required <= 0) return;
        const ts = this.tileSize, cx = x * ts + ts/2, cy = y * ts + ts/2;
        this.ctx.font = 'bold 18px "VT323", monospace'; this.ctx.textAlign = 'center';
        const rem = Math.max(0, required - current), val = rem.toString(), textY = cy - ts/2 - 15 + Math.sin(Date.now() / 300) * 3;
        const m = this.ctx.measureText(val), bgW = Math.max(20, m.width + 12), bgH = 22, bgX = cx - bgW / 2, bgY = textY - bgH / 2 - 1;
        const comp = rem === 0; this.ctx.fillStyle = comp ? 'rgba(0, 100, 50, 0.95)' : 'rgba(10, 15, 20, 0.95)'; this.ctx.strokeStyle = comp ? '#00ff9f' : '#00f0ff'; this.ctx.lineWidth = 2;
        const r = 6; this.ctx.beginPath(); this.ctx.moveTo(bgX + r, bgY); this.ctx.lineTo(bgX + bgW - r, bgY); this.ctx.quadraticCurveTo(bgX + bgW, bgY, bgX + bgW, bgY + r); this.ctx.lineTo(bgX + bgW, bgY + bgH - r); this.ctx.quadraticCurveTo(bgX + bgW, bgY + bgH, bgX + bgW - r, bgY + bgH); this.ctx.lineTo(bgX + r, bgY + bgH); this.ctx.quadraticCurveTo(bgX, bgY + bgH, bgX, bgY + bgH - r); this.ctx.lineTo(bgX, bgY + r); this.ctx.quadraticCurveTo(bgX, bgY, bgX + r, bgY); this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();
        this.ctx.fillStyle = '#fff'; this.ctx.textBaseline = 'middle'; this.ctx.fillText(val, cx, textY + 1); this.ctx.textBaseline = 'alphabetic';
    },

    drawShopTerminal(x, y, frame) {
        const ts = this.tileSize, px = x * ts, py = y * ts;
        const cx = px + ts/2, cy = py + ts/2;
        this.ctx.save();
        
        // 1. External Casing (Bulkier/Industrial)
        // Draw slightly wider/taller than the hit-box for presence
        const casingGrad = this.ctx.createLinearGradient(px, py, px + ts, py + ts);
        casingGrad.addColorStop(0, '#1e1e24');
        casingGrad.addColorStop(0.5, '#33333d');
        casingGrad.addColorStop(1, '#121217');
        this.ctx.fillStyle = casingGrad;
        
        // Main Body (Bulkier)
        this.ctx.fillRect(px + 1, py - 2, ts - 2, ts + 2); // Slight vertical overflow
        
        // Side Supports/Pillars
        this.ctx.fillStyle = '#0a0a0f';
        this.ctx.fillRect(px, py + 2, 3, ts - 4);
        this.ctx.fillRect(px + ts - 3, py + 2, 3, ts - 4);

        // Bevel / Rim
        this.ctx.strokeStyle = '#4a4a55';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(px + 2, py - 1, ts - 4, ts);

        // 2. Main Screen Area (CRT Green)
        this.ctx.fillStyle = '#003300'; // Darker background
        this.ctx.fillRect(px + 5, py + 3, ts - 10, 16);
        
        // CRT Scanline Effect (Static)
        this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for(let i=0; i<16; i+=2) {
            this.ctx.fillRect(px + 5, py + 3 + i, ts - 10, 1);
        }

        // Animated Data Scroll (Fixed math to stay inside ts-10)
        const scrollOffset = (frame * 0.3) % 10;
        this.ctx.fillStyle = 'rgba(0, 255, 80, 0.4)';
        const screenW = ts - 10; // 22px
        for(let i=0; i<3; i++) {
            const h = 1 + Math.random() * 2;
            const sx = px + 7 + i*7; // 7, 14, 21. Max at 21+6=27. Wait, 5+22=27. Perfect.
            this.ctx.fillRect(sx, py + 4 + scrollOffset, 4, h);
        }

        // Shop Icon ($) - Golden
        this.ctx.fillStyle = '#ffd700'; // Gold
        this.ctx.font = 'bold 16px "VT323", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
        this.ctx.fillText('$', cx, py + 15);
        this.ctx.shadowBlur = 0;

        // 3. Control Panel
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(px + 4, py + 21, ts - 8, 8);
        
        // Keyboard (Illuminated keys)
        for(let i=0; i<5; i++) {
            for(let j=0; j<2; j++) {
                const isSpecial = (i + j + Math.floor(frame/15)) % 6 === 0;
                this.ctx.fillStyle = isSpecial ? '#ff8800' : '#333';
                this.ctx.fillRect(px + 6 + i*4, py + 22 + j*3, 3, 2);
            }
        }

        // 4. Status LEDs
        const ledOn = (frame % 30 < 15);
        this.ctx.fillStyle = ledOn ? '#ff3344' : '#550000';
        this.ctx.fillRect(px + ts - 8, py + 4, 2, 2); 
        this.ctx.fillStyle = '#00ff88';
        this.ctx.fillRect(px + ts - 8, py + 8, 2, 2);

        // 5. Cable connection (bottom)
        this.ctx.strokeStyle = '#111';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 4, py + ts);
        this.ctx.quadraticCurveTo(cx - 2, py + ts + 4, cx, py + ts);
        this.ctx.stroke();

        this.ctx.restore();
    },

    drawChargingStation(x, y, powered, frame) {
        const ts = this.tileSize, px = x * ts, py = y * ts;
        const cx = px + ts/2, cy = py + ts/2;
        this.ctx.save();
        
        // 1. Octagonal Pad Base
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.beginPath();
        const r = ts/2 - 2;
        for(let i=0; i<8; i++) {
            const angle = (i * Math.PI / 4) + Math.PI/8;
            const ax = cx + Math.cos(angle) * r;
            const ay = cy + Math.sin(angle) * r;
            if(i===0) this.ctx.moveTo(ax, ay);
            else this.ctx.lineTo(ax, ay);
        }
        this.ctx.closePath();
        this.ctx.fill();
        
        // Rim highlight
        this.ctx.strokeStyle = powered ? '#00f0ff' : '#333';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // 2. Inner Circuitry Lines
        if (powered) {
            this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
            this.ctx.lineWidth = 1;
            for(let i=0; i<4; i++) {
                const angle = i * Math.PI / 2;
                this.ctx.beginPath();
                this.ctx.moveTo(cx + Math.cos(angle) * 4, cy + Math.sin(angle) * 4);
                this.ctx.lineTo(cx + Math.cos(angle) * 12, cy + Math.sin(angle) * 12);
                this.ctx.stroke();
            }
        }

        // 3. Central Energy Core (embedded)
        const pulse = 0.6 + Math.sin(frame * 0.1) * 0.4;
        const coreColor = powered ? `rgba(0, 240, 255, ${pulse})` : '#222';
        this.ctx.fillStyle = coreColor;
        this.ctx.shadowBlur = powered ? 10 * pulse : 0;
        this.ctx.shadowColor = '#00f0ff';
        
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 4. Rotating Charging Ring
        if (powered) {
            this.ctx.shadowBlur = 0;
            this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
            this.ctx.setLineDash([4, 4]);
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 10, frame * 0.05, frame * 0.05 + Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }

        this.ctx.restore();
    }
});
