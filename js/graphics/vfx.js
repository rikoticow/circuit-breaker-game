Object.assign(Graphics, {
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
            const jitterX = (Math.random() - 0.5) * 10;
            const jitterY = (Math.random() - 0.5) * 10;
            ctx.lineTo(startX + dx * pct + jitterX, startY + dy * pct + jitterY);
        }
        
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    },

    drawDoorTransition(game, progress) {
        if (!this.tCtx) return;
        this.tCtx.clearRect(0, 0, 640, 560);
        if (progress <= 0) return;
        
        const ctx = this.tCtx, w = 320, h = 560;
        const lx = -w + w * progress, rx = 640 - w * progress;

        ctx.save();
        if (progress < 1) { ctx.fillStyle = `rgba(0,0,0,${progress * 0.8})`; ctx.fillRect(0, 0, 640, 560); }
        let status = game.transitionLabel || 'CIRCUIT BREAKER', prompt = '';
        if (game.transitionState === 'WAITING' && progress === 1 && game.transitionStayClosed) prompt = 'APERTE PARA CONTINUAR';
        this.drawDoorHalf(ctx, lx, 0, w, h, true, status, prompt);
        this.drawDoorHalf(ctx, rx, 0, w, h, false, status, prompt);
        if (progress > 0.85 && progress < 1.0) {
            if (Math.random() > 0.4) this.spawnParticle(320, Math.random() * h, '#ffcc00', 'spark', true);
            if (Math.random() > 0.2) this.spawnParticle(320 + (Math.random()-0.5)*20, Math.random() * h, '#111', 'smoke');
            if (Math.random() > 0.8) this.spawnParticle(320, Math.random() * h, '#00f0ff', 'spark', true);
        }
        ctx.restore();
    },

    drawDoorHalf(ctx, x, y, w, h, isLeft, statusText, promptText = '') {
        ctx.fillStyle = '#1c1e22'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#25282e'; ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
        ctx.fillStyle = '#111215'; ctx.fillRect(x + (isLeft ? 40 : w - 80), y, 40, h);
        ctx.fillStyle = '#2a2d34'; ctx.fillRect(x + (isLeft ? 44 : w - 76), y, 4, h);
        for (let i = 0; i < 4; i++) {
            const by = 60 + i * 110; ctx.fillStyle = '#181a1e'; ctx.fillRect(x, by, w, 40);
            ctx.fillStyle = '#0a0a0c'; ctx.fillRect(x + w/2 - 2, by + 6, 4, 4); ctx.fillRect(x + w/2 - 2, by + 30, 4, 4);
        }
        const lockW = 60, lockH = 100, lockY = h/2 - lockH/2;
        ctx.fillStyle = '#2c3138';
        if (isLeft) {
            ctx.fillRect(x + w - lockW, lockY, lockW, lockH);
            ctx.fillStyle = '#111'; ctx.fillRect(x + w - lockW + 10, lockY + 10, 30, 20);
            ctx.fillStyle = '#00ff00'; ctx.fillRect(x + w - lockW + 12, lockY + 18, 26, 2); ctx.fillRect(x + w - lockW + 20, lockY + 14, 10, 10);
        } else {
            ctx.fillRect(x, lockY, lockW, lockH); ctx.fillStyle = '#0a0a0c'; ctx.fillRect(x + 10, lockY + 30, 40, 40);
            const sW = 200, sH = 80, sX = x + (w - sW) / 2, sY = h / 2 - 120;
            ctx.fillStyle = '#111'; ctx.fillRect(sX - 4, sY - 4, sW + 8, sH + 8);
            let sC = '#002244', tC = '#00f0ff';
            if (statusText === 'SUCESSO') { sC = '#004422'; tC = '#00ff9f'; }
            else if (statusText === 'FALHA') { sC = '#440011'; tC = '#ff003c'; }
            ctx.fillStyle = sC; ctx.fillRect(sX, sY, sW, sH);
            ctx.save();
            if (Math.random() > 0.05) {
                ctx.fillStyle = tC; ctx.textAlign = 'center';
                if (promptText) {
                    ctx.font = 'bold 16px "VT323", monospace'; ctx.fillText(statusText, sX + sW/2, sY + 25);
                    const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5; ctx.globalAlpha = 0.5 + pulse * 0.5; ctx.font = 'bold 18px "VT323", monospace'; ctx.fillText(promptText, sX + sW/2, sY + 55);
                } else {
                    ctx.font = 'bold 24px "VT323", monospace'; ctx.textBaseline = 'middle'; ctx.fillText(statusText, sX + sW/2, sY + sH/2);
                }
                ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
                for(let i=0; i<sH; i+=3) ctx.fillRect(sX, sY + i, sW, 1);
            }
            ctx.restore();
        }
        if (isLeft) { ctx.fillStyle = '#050505'; ctx.fillRect(x + w - 4, y, 4, h); }
    },

    drawReverseEffect(frame) {
        const W = this.ctx.canvas.width, H = this.ctx.canvas.height;
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 20, 40, 0.2)'; this.ctx.fillRect(0, 0, W, H);
        this.ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
        for (let i = 0; i < 5; i++) { this.ctx.fillRect(0, (frame * 5 + i * 100) % H, W, Math.random() * 20); }
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        for (let y = 0; y < H; y += 4) { this.ctx.fillRect(0, y, W, 2); }
        this.ctx.font = 'bold 24px "VT323", monospace'; this.ctx.textAlign = 'right'; this.ctx.fillStyle = '#00f0ff';
        if (Math.floor(frame / 10) % 2 === 0) { this.ctx.fillText("<< REVERSÃO QUÂNTICA", W - 20, 40); }
        for (let i = 0; i < 20; i++) { this.ctx.fillStyle = 'rgba(255,255,255,0.1)'; this.ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
        this.ctx.restore();
    },

    drawVHSEffect() {
        const ctx = this.ctx, w = 640, h = 480;
        ctx.fillStyle = 'rgba(18, 16, 16, 0.2)'; for (let i = 0; i < h; i += 3) { ctx.fillRect(0, i, w, 1); }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) { ctx.fillRect(0, Math.random() * h, w, 1 + Math.random() * 2); }
        if (Math.random() > 0.8) {
            ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.3; ctx.drawImage(ctx.canvas, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2); ctx.restore();
        }
        ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "VT323", monospace'; ctx.textAlign = 'left';
        if (Math.floor(Date.now() / 200) % 2 === 0) { ctx.fillText('PLAY  -16x', 40, 50); ctx.fillText('<< REW', 40, 80); }
        const d = new Date(); ctx.fillText(`00:04:${d.getSeconds().toString().padStart(2, '0')}:${Math.floor(d.getMilliseconds()/10).toString().padStart(2, '0')}`, 40, h - 40);
        for (let i = 0; i < 50; i++) { ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
    },
    
    drawGravityOverlay(direction, frame, globalAlpha) {
        this.ctx.save();
        const ts = 64, width = this.ctx.canvas.width, height = this.ctx.canvas.height;
        let dx = 0, dy = 0, rot = 0;
        if (direction === 0) { dx = 1; rot = 0; } else if (direction === 1) { dy = 1; rot = Math.PI/2; } else if (direction === 2) { dx = -1; rot = Math.PI; } else if (direction === 3) { dy = -1; rot = -Math.PI/2; }
        const scrollOffset = (frame * 4) % ts; this.ctx.lineWidth = 1.5;
        for (let gy = -ts * 2; gy < height + ts * 2; gy += ts * 0.8) {
            const rowOffset = (Math.floor(gy / (ts * 0.8)) % 2 === 0) ? ts / 2 : 0;
            for (let gx = -ts * 2; gx < width + ts * 2; gx += ts) {
                const seed = (Math.abs(Math.sin(gx * 1.5 + gy * 2.7))); if (seed > globalAlpha) continue;
                const px = gx + rowOffset + (dx * scrollOffset), py = gy + (dy * scrollOffset), opacity = 0.2 + (seed * 0.3);
                this.ctx.strokeStyle = `rgba(0, 200, 255, ${opacity * globalAlpha})`;
                this.ctx.save(); this.ctx.translate(px, py); this.ctx.rotate(rot);
                this.ctx.beginPath(); this.ctx.moveTo(-12, 0); this.ctx.lineTo(12, 0); this.ctx.lineTo(6, -4); this.ctx.moveTo(12, 0); this.ctx.lineTo(6, 4); this.ctx.stroke();
                this.ctx.restore();
            }
        }
        this.ctx.globalAlpha = globalAlpha;
        const g = this.ctx.createLinearGradient(dx !== 0 ? (dx > 0 ? 0 : width) : 0, dy !== 0 ? (dy > 0 ? 0 : height) : 0, dx !== 0 ? (dx > 0 ? width : 0) : 0, dy !== 0 ? (dy > 0 ? height : 0) : 0);
        g.addColorStop(0, 'rgba(0, 100, 255, 0.15)'); g.addColorStop(1, 'transparent');
        this.ctx.fillStyle = g; this.ctx.fillRect(0, 0, width, height);
        this.ctx.restore();
    },

    drawBouncingLightning(tx, ty, color, frame, seed, map, lightningTimer = 0, lightningSeed = 0) {
        const ts = this.tileSize;
        const ctx = this.ctx;
        const cx = (tx + 0.5) * ts, cy = (ty + 0.5) * ts;
        const progress = (30 - lightningTimer) / 30;
        
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const numRays = 8;
        // Use the dynamic lightningSeed for the shuffle
        const s = lightningSeed || seed;
        const rayOrder = [0, 1, 2, 3, 4, 5, 6, 7].sort((a, b) => {
            return Math.sin(s * (a + 1)) - Math.sin(s * (b + 1));
        });

        for (let i = 0; i < numRays; i++) {
            const r = rayOrder[i];
            const rayThreshold = i / numRays; // Orderly time, random direction
            if (progress < rayThreshold) continue;

            let curX = cx, curY = cy;
            // More chaotic initial angle
            let ang = (r / numRays) * Math.PI * 2 + (Math.sin(seed + r) * 0.5);
            let dist = 160 + Math.random() * 120; 
            
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.0 + Math.random() * 1.5;
            // Fast fade out
            ctx.globalAlpha = Math.max(0, (1.0 - (progress - rayThreshold) * 3)) * (0.6 + Math.random() * 0.4);
            
            if (ctx.globalAlpha <= 0) continue;

            ctx.moveTo(curX, curY);
            
            let lastX = curX, lastY = curY;
            for (let b = 0; b < 6; b++) { // Up to 6 bounces
                let step = 30 + Math.random() * 50;
                if (step > dist) step = dist;
                
                let nx = curX + Math.cos(ang) * step;
                let ny = curY + Math.sin(ang) * step;
                
                let ntx = Math.floor(nx / ts), nty = Math.floor(ny / ts);
                let hit = false;
                if (map && map[nty] && (map[nty][ntx] === '#' || map[nty][ntx] === 'W' || map[nty][ntx] === 'G')) hit = true;
                if (ntx < 0 || ntx >= 40 || nty < 0 || nty >= 40) hit = true; 

                if (hit) {
                    for(let p=0; p<5; p++) this.spawnParticle(curX, curY, '#ffffff', 'micro-spark');
                    
                    for (let attempt = 0; attempt < 4; attempt++) {
                        ang += Math.PI * 0.5 + Math.random() * Math.PI;
                        let testX = curX + Math.cos(ang) * 10;
                        let testY = curY + Math.sin(ang) * 10;
                        let ttx = Math.floor(testX / ts), tty = Math.floor(testY / ts);
                        if (!(map && map[tty] && (map[tty][ttx] === '#' || map[tty][ttx] === 'W' || map[tty][ttx] === 'G'))) break;
                    }
                    
                    dist -= 20;
                    curX += Math.cos(ang) * 4;
                    curY += Math.sin(ang) * 4;
                } else {
                    const segs = 4;
                    for (let s = 1; s <= segs; s++) {
                        let p = s / segs;
                        let jx = (Math.random() - 0.5) * 14;
                        let jy = (Math.random() - 0.5) * 14;
                        ctx.lineTo(curX + (nx - curX) * p + jx, curY + (ny - curY) * p + jy);
                    }
                    curX = nx; curY = ny; dist -= step;
                    lastX = curX; lastY = curY;
                }
                if (dist <= 0) break;
            }
            ctx.stroke();
            
            for(let p=0; p<3; p++) this.spawnParticle(lastX, lastY, '#ffffff', 'micro-spark');
            ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.5; ctx.stroke();
        }
        ctx.restore();
    }
});
