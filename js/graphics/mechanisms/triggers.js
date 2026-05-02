Object.assign(Graphics, {
    drawButton(x, y, isPressed, behavior = 'TIMER', charge = 0) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        let baseColor = '#1a1a0a';
        let accentColor = '#ffcc00';
        let ledR = 255, ledG = 136, ledB = 0;
        let idleColor = '#443300';

        if (behavior === 'TOGGLE') {
            baseColor = '#051a0a'; accentColor = '#10b981'; ledR = 0; ledG = 255; ledB = 100; idleColor = '#003311';
        } else if (behavior === 'PERMANENT') {
            baseColor = '#1a0505'; accentColor = '#ef4444'; ledR = 255; ledG = 50; ledB = 0; idleColor = '#330000';
        } else if (behavior === 'PRESSURE') {
            baseColor = '#10051a'; accentColor = '#a855f7'; ledR = 180; ledG = 0; ledB = 255; idleColor = '#220033';
        }

        const time = Date.now() * 0.004;
        const ledS = 2; 
        const pad = 1;
        const ledPositions = [{ x: pad, y: pad }, { x: ts - pad - ledS, y: pad }, { x: ts - pad - ledS, y: ts - pad - ledS }, { x: pad, y: ts - pad - ledS }];
        
        this.ctx.fillStyle = baseColor;
        this.ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);

        this.ctx.save();
        if (behavior === 'PRESSURE') {
            const bPad = 2;
            const bSize = ts - bPad * 2;
            this.ctx.strokeStyle = `rgba(${ledR}, ${ledG}, ${ledB}, 0.3)`;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(px + bPad, py + bPad, bSize, bSize);

            if (charge > 0) {
                this.ctx.strokeStyle = `rgb(${ledR}, ${ledG}, ${ledB})`;
                this.ctx.lineWidth = 2.5;
                this.ctx.lineCap = 'square';
                const p = charge;
                this.ctx.beginPath();
                this.ctx.moveTo(px + bPad + bSize/2, py + bPad);
                if (p > 0) this.ctx.lineTo(px + bPad + bSize/2 + (bSize/2) * (Math.min(p, 0.125) / 0.125), py + bPad);
                if (p > 0.125) this.ctx.lineTo(px + bPad + bSize, py + bPad + bSize * ((Math.min(p, 0.375) - 0.125) / 0.25));
                if (p > 0.375) this.ctx.lineTo(px + bPad + bSize - bSize * ((Math.min(p, 0.625) - 0.375) / 0.25), py + bPad + bSize);
                if (p > 0.625) this.ctx.lineTo(px + bPad, py + bPad + bSize - bSize * ((Math.min(p, 0.875) - 0.625) / 0.25));
                if (p > 0.875) this.ctx.lineTo(px + bPad + bSize * 0.5 * ((Math.min(p, 1.0) - 0.875) / 0.125), py + bPad);
                this.ctx.stroke();
            }
        } else {
            ledPositions.forEach((pos, i) => {
                let ledPulse = isPressed ? 1.0 : Math.pow(0.5 + Math.sin(time - i * 1.57) * 0.5, 3);
                const color = `rgba(${ledR}, ${ledG}, ${ledB}, ${ledPulse * 0.9})`;
                this.ctx.fillStyle = color;
                this.ctx.fillRect(px + pos.x, py + pos.y, ledS, ledS);
            });
        }
        this.ctx.restore();
        
        const cx = px + ts/2, cy = py + ts/2;
        const radius = isPressed ? 7 : 9;
        this.ctx.fillStyle = isPressed ? accentColor : idleColor;
        this.ctx.beginPath(); this.ctx.arc(cx, cy, radius, 0, Math.PI * 2); this.ctx.fill();
        
        if (isPressed) {
            this.ctx.save(); this.ctx.strokeStyle = accentColor; this.ctx.lineWidth = 2;
            this.ctx.beginPath(); this.ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2); this.ctx.stroke(); this.ctx.restore();
        } else {
            this.ctx.strokeStyle = '#2d2d2d'; this.ctx.lineWidth = 2;
            this.ctx.beginPath(); this.ctx.arc(cx, cy, radius, 0, Math.PI * 2); this.ctx.stroke();
        }
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.beginPath(); this.ctx.arc(cx - 2, cy - 2, 2, 0, Math.PI * 2); this.ctx.fill();
    },
    
    drawGravityButton(x, y, direction, frame, flashTimer, isAnySliding) {
        const px = x * this.tileSize, py = y * this.tileSize, ts = this.tileSize;
        const cx = px + ts/2, cy = py + ts/2;
        const isThisActive = flashTimer > 0, isOn = !isAnySliding || isThisActive, sinkOffset = isThisActive ? 2 : 0; 

        this.ctx.save();
        // Background plate (Dirty/Deep Rust)
        this.ctx.fillStyle = '#1a0d05'; this.ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
        this.ctx.translate(0, sinkOffset);
        
        // Button Surface (Rusted Iron)
        this.ctx.fillStyle = isThisActive ? '#4a2f1d' : '#3d2618'; 
        this.ctx.strokeStyle = '#1a0d05'; this.ctx.lineWidth = 1;
        this.ctx.beginPath(); const chamfer = 6;
        this.ctx.moveTo(px + chamfer, py + 2); this.ctx.lineTo(px + ts - chamfer, py + 2); this.ctx.lineTo(px + ts - 2, py + chamfer);
        this.ctx.lineTo(px + ts - 2, py + ts - chamfer); this.ctx.lineTo(px + ts - chamfer, py + ts - 2); this.ctx.lineTo(px + chamfer, py + ts - 2);
        this.ctx.lineTo(px + 2, py + ts - chamfer); this.ctx.lineTo(px + 2, py + chamfer); this.ctx.closePath();
        this.ctx.fill(); this.ctx.stroke();

        // Warning stripes (Corroded Hazard)
        this.ctx.save(); this.ctx.beginPath(); this.ctx.rect(px + 4, py + 4, 6, ts - 8); this.ctx.rect(px + ts - 10, py + 4, 6, ts - 8); this.ctx.clip();
        this.ctx.fillStyle = isThisActive ? '#7a451a' : '#633814'; this.ctx.fillRect(px, py, ts, ts);
        this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
        for (let i = -ts; i < ts * 2; i += 8) {
            this.ctx.beginPath(); this.ctx.moveTo(px, py + i); this.ctx.lineTo(px + ts, py + i + ts); this.ctx.lineTo(px + ts, py + i + ts + 4); this.ctx.lineTo(px, py + i + 4); this.ctx.fill();
        }
        this.ctx.restore();

        // Arrow Light
        this.ctx.save(); this.ctx.translate(cx, cy); this.ctx.rotate(direction * Math.PI / 2);
        this.ctx.globalCompositeOperation = 'screen';
        if (isOn) {
            const pulse = 0.7 + Math.sin(frame * 0.1) * 0.3;
            const seed = (x * 7.7 + y * 13.3);
            let flicker = (Math.sin(frame * 0.04 + seed) > 0.7) ? (Math.random() > 0.5 ? 1.0 : (Math.random() > 0.7 ? 0.3 : 0.0)) : 1.0;
            if (Math.random() > 0.99) flicker = 0;
            
            if (flicker <= 0) {
                this.ctx.fillStyle = 'rgba(0,0,0,0.5)'; this.ctx.beginPath(); this.ctx.moveTo(7, 0); this.ctx.lineTo(-3, -6); this.ctx.lineTo(-3, 6); this.ctx.closePath(); this.ctx.fill();
            } else {
                this.ctx.globalAlpha = flicker; this.ctx.fillStyle = '#4488ff';
                this.ctx.beginPath(); this.ctx.moveTo(7, 0); this.ctx.lineTo(-3, -6); this.ctx.lineTo(-3, 6); this.ctx.closePath();
                this.ctx.fill(); this.ctx.globalAlpha = 1.0;
            }
        } else {
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)'; this.ctx.beginPath(); this.ctx.moveTo(7, 0); this.ctx.lineTo(-3, -6); this.ctx.lineTo(-3, 6); this.ctx.closePath(); this.ctx.fill();
        }
        this.ctx.restore();

        // Rivets (Dirty/Dark)
        this.ctx.fillStyle = '#0a0502';
        [[-10, 8], [10, 8], [-10, ts-8], [10, ts-8]].forEach(p => { this.ctx.beginPath(); this.ctx.arc(cx + p[0], py + p[1], 2, 0, Math.PI * 2); this.ctx.fill(); });
        this.ctx.restore();
    },

    drawPurpleButton(x, y, isPressed, isToggle = false) {
        this.drawButton(x, y, isPressed, isToggle ? 'TOGGLE' : 'PRESSURE');
    },
    
    drawSingularitySwitcher(x, y, isSolarGlobal, frame, lightningTimer = 0, map = null, lightningSeed = 0) {
        const px = x * this.tileSize, py = y * this.tileSize, ts = this.tileSize;
        const cx = px + ts/2, cy = py + ts/2;
        
        // Color of the CURRENT dimension
        const nextColor = isSolarGlobal ? '#ffcc00' : '#bf00ff';
        const glowAlpha = 0.5 + Math.sin(frame * 0.1) * 0.3;
        
        this.ctx.save();
        // Base plate
        this.ctx.fillStyle = '#1a1a2a';
        this.ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
        this.ctx.strokeStyle = '#3a3a4a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(px + 4, py + 4, ts - 8, ts - 8);
        
        // Pulsing core
        this.ctx.fillStyle = nextColor;
        this.ctx.globalAlpha = glowAlpha;
        
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Dimensional ring
        this.ctx.globalAlpha = 1.0;
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 10 + Math.sin(frame * 0.05) * 2, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Scanlines/Interference on the button
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.beginPath();
        for (let i = -8; i < 8; i += 4) {
            this.ctx.moveTo(cx - 8, cy + i);
            this.ctx.lineTo(cx + 8, cy + i);
        }
        this.ctx.stroke();
        
        this.ctx.restore();

        if (lightningTimer > 0) {
            this.drawBouncingLightning(x, y, nextColor, frame, x + y, map, lightningTimer, lightningSeed);
        }
    },

    drawQuantumFloor(x, y, isActive, frame, flashTimer = 0, intensity = 1.0, entrySide = null, whiteGlow = 0, overHole = false) {
        const px = x * this.tileSize, py = y * this.tileSize, ts = this.tileSize;
        
        // Reduced per-tile timing variation
        const seed = (x * 12.9898 + y * 78.233);
        const freq = 0.1 + Math.abs(Math.sin(seed) * 0.03); // Tighter frequency
        const phase = (seed % 2.0); // Reduced phase shift

        this.ctx.save();
        if (isActive) {
            // Min opacity 0.15, Max 0.45
            const pulse = 0.3 + Math.sin(frame * freq + phase) * 0.15;
            const r = Math.floor(138 + (255 - 138) * whiteGlow), g = Math.floor(43 + (255 - 43) * whiteGlow), b = Math.floor(226 + (255 - 226) * whiteGlow);
            this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulse})`; this.ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
            const r2 = Math.floor(191 + (255 - 191) * whiteGlow), g2 = Math.floor(0 + (255 - 0) * whiteGlow), b2 = Math.floor(255 + (255 - 255) * whiteGlow);
            this.ctx.strokeStyle = `rgba(${r2}, ${g2}, ${b2}, ${pulse * 1.2})`; this.ctx.lineWidth = 1; this.ctx.beginPath();
            for (let i = 4; i < ts; i += 8) { this.ctx.moveTo(px + i, py + 2); this.ctx.lineTo(px + i, py + ts - 2); this.ctx.moveTo(px + 2, py + i); this.ctx.lineTo(px + ts - 2, py + i); }
            this.ctx.stroke();
            this.ctx.fillStyle = whiteGlow > 0.5 ? '#fff' : '#bf00ff'; const s = 2, t = (frame * 0.1 + seed * 0.1) % (ts - 4);
            this.ctx.fillRect(px + 2 + t, py + 2, s, s); this.ctx.fillRect(px + ts - 2 - s, py + 2 + t, s, s); this.ctx.fillRect(px + ts - 2 - s - t, py + ts - 2 - s, s, s); this.ctx.fillRect(px + 2, py + ts - 2 - s - t, s, s);
        } else {
            // Min opacity 0.12, Max 0.28
            const pulse = 0.2 + Math.sin(frame * (freq * 0.5) + phase) * 0.08;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`; this.ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${pulse * 1.1})`; this.ctx.lineWidth = 1; this.ctx.beginPath();
            this.ctx.moveTo(px + ts/2, py + 4); this.ctx.lineTo(px + ts/2, py + ts - 4); this.ctx.moveTo(px + 4, py + ts/2); this.ctx.lineTo(px + ts - 4, py + ts/2); this.ctx.stroke();
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; const cs = 3;
            this.ctx.fillRect(px + 4, py + 4, cs, 1); this.ctx.fillRect(px + 4, py + 4, 1, cs);
            this.ctx.fillRect(px + ts - 4 - cs, py + 4, cs, 1); this.ctx.fillRect(px + ts - 5, py + ts - 4, 1, cs);
            this.ctx.fillRect(px + 4, py + ts - 5, cs, 1); this.ctx.fillRect(px + 4, py + ts - 4 - cs, 1, cs);
            this.ctx.fillRect(px + ts - 4 - cs, py + ts - 5, cs, 1); this.ctx.fillRect(px + ts - 5, py + ts - 4 - cs, 1, cs);
        }
        if (flashTimer > 0 && flashTimer <= 15) {
            this.ctx.save(); const progress = 1 - (flashTimer / 15), alpha = (flashTimer / 15) * intensity;
            this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 2 * intensity; this.ctx.globalAlpha = alpha;
            const cx = px + ts / 2, cy = py + ts / 2;
            if (entrySide && (entrySide.dx !== 0 || entrySide.dy !== 0)) {
                const dist = ts * progress; this.ctx.beginPath();
                if (entrySide.dx < 0) this.ctx.moveTo(px + dist, py + 2), this.ctx.lineTo(px + dist, py + ts - 2);
                else if (entrySide.dx > 0) this.ctx.moveTo(px + ts - dist, py + 2), this.ctx.lineTo(px + ts - dist, py + ts - 2);
                else if (entrySide.dy < 0) this.ctx.moveTo(px + 2, py + dist), this.ctx.lineTo(px + ts - 2, py + dist);
                else if (entrySide.dy > 0) this.ctx.moveTo(px + 2, py + ts - dist), this.ctx.lineTo(px + ts - 2, py + ts - dist);
                this.ctx.stroke();
            } else {
                const size = ts * progress; this.ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
            }
            this.ctx.restore();
        }
        this.ctx.restore();
    },

    drawPortal(x, y, channel, frame, color = '#ffd700') {
        const ctx = this.ctx, cx = x * 32 + 16, cy = y * 32 + 16;
        
        // Per-portal seed for randomization
        const seed = (x * 17.31 + y * 11.19);
        const speedMult = 0.8 + (Math.sin(seed) * 0.4);
        const timeOffset = seed * 10;
        const localFrame = frame * speedMult + timeOffset;

        ctx.save(); ctx.translate(cx, cy);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
        glow.addColorStop(0, color + '66'); glow.addColorStop(0.6, color + '1a'); glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow; ctx.globalCompositeOperation = 'screen'; ctx.fillRect(-32, -32, 64, 64);
        
        for (let i = 0; i < 3; i++) {
            const rot = localFrame * (0.04 + i * 0.02), scale = 1.1 - i * 0.25, alpha = 0.8 - i * 0.2;
            ctx.save(); ctx.rotate(rot); ctx.scale(scale, scale); ctx.beginPath();
            for (let a = 0; a <= Math.PI * 2; a += (Math.PI * 2 / 8)) { // Reduced points from 12 to 8
                const r = 14 + Math.sin(a * 4 + localFrame * 0.1) * 3, px = Math.cos(a) * r, py = Math.sin(a) * r;
                if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 16); grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, color); grad.addColorStop(1, color + '33'); 
            ctx.strokeStyle = grad; ctx.lineWidth = 3 - i * 0.5; ctx.globalAlpha = alpha; ctx.stroke();
            if (i === 0) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 3 + Math.sin(localFrame * 0.2) * 1, 0, Math.PI * 2); ctx.fill(); }
            ctx.restore();
        }
        for (let j = 0; j < 12; j++) { // Reduced particle count from 20 to 12
            const pRot = (localFrame * 0.08 + j * (Math.PI * 2 / 12)) + Math.sin(localFrame * 0.02 + j) * 0.5, pDist = 16 + Math.sin(localFrame * 0.12 + j * 0.5) * 6;
            const px = Math.cos(pRot) * pDist, py = Math.sin(pRot) * pDist, pSize = 1.2 + Math.sin(localFrame * 0.1 + j) * 0.8;
            ctx.fillStyle = j % 2 === 0 ? color : '#ffffff'; ctx.fillRect(px - pSize/2, py - pSize/2, pSize, pSize);
        }
        ctx.restore();
    },

    drawLimboHologram(x, y, block, frame) {
        if (!block) return;
        const ctx = this.ctx, cx = x * 32 + 16, cy = y * 32 + 16;
        ctx.save(); ctx.translate(cx, cy);
        const scale = 0.6 + Math.sin(frame * 0.1) * 0.05; ctx.scale(scale, scale); ctx.rotate(block.dir * Math.PI / 2);
        ctx.globalAlpha = 0.4 + Math.sin(frame * 0.15) * 0.1;
        ctx.fillStyle = '#1a1a2a'; ctx.fillRect(-12, -12, 24, 24);
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(2, 0); ctx.lineTo(2, 8); ctx.lineTo(-2, 8); ctx.lineTo(-2, 0); ctx.lineTo(-6, 0); ctx.closePath();
        ctx.fillStyle = '#00f0ff'; ctx.fill();
        ctx.strokeStyle = '#bf00ff'; ctx.lineWidth = 1; ctx.strokeRect(-12, -12, 24, 24);
        ctx.restore();
    }
});
