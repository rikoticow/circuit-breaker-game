Object.assign(Graphics, {
    drawEmitter(x, y, dir, frame) {
        const px = x * this.tileSize, py = y * this.tileSize, ts = this.tileSize;
        this.ctx.save(); this.ctx.translate(px + ts/2, py + ts/2); this.ctx.rotate(dir * Math.PI/2);
        this.ctx.fillStyle = '#1a1a1a'; this.ctx.beginPath(); this.ctx.arc(0, 0, 14, 0, Math.PI * 2); this.ctx.fill();
        const grad = this.ctx.createLinearGradient(0, -12, 0, 12); grad.addColorStop(0, '#2d3436'); grad.addColorStop(0.5, '#636e72'); grad.addColorStop(1, '#2d3436');
        this.ctx.fillStyle = grad; this.ctx.fillRect(-12, -10, 24, 20);
        this.ctx.strokeStyle = '#000'; this.ctx.lineWidth = 1; this.ctx.strokeRect(-12, -10, 24, 20); this.ctx.strokeRect(-4, -10, 8, 20);
        this.ctx.fillStyle = '#34495e'; this.ctx.fillRect(8, -12, 6, 24); this.ctx.strokeRect(8, -12, 6, 24);
        this.ctx.fillStyle = `rgba(191, 0, 255, ${0.6 + Math.sin(frame * 0.4) * 0.3})`; this.ctx.fillRect(10, -6, 4, 12);
        this.ctx.shadowBlur = 15; this.ctx.shadowColor = '#bf00ff'; this.ctx.fillStyle = '#fff'; this.ctx.beginPath(); this.ctx.arc(14, 0, 3 + Math.sin(frame * 0.5) * 2, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.shadowBlur = 0; this.ctx.fillStyle = '#2c3e50'; this.ctx.fillRect(-14, -8, 2, 16);
        this.ctx.restore();
    },

    drawLaser(e, frame) {
        if (!e.laserPath || e.laserPath.length < 2) return;
        const ts = this.tileSize, pixelPath = [];
        for (let i = 0; i < e.laserPath.length; i++) {
            const node = e.laserPath[i]; let px = node.x * ts + 16, py = node.y * ts + 16;
            if (i === 0) {
                let ox = 0, oy = 0; if (e.dir === DIRS.RIGHT) ox = 14; else if (e.dir === DIRS.LEFT) ox = -14; else if (e.dir === DIRS.UP) oy = -14; else if (e.dir === DIRS.DOWN) oy = 14;
                px += ox; py += oy;
            } else if (i === e.laserPath.length - 1) {
                const prev = e.laserPath[i-1], dx = node.x - prev.x, dy = node.y - prev.y, edgeOffset = 2;
                if (dx > 0) px = node.x * ts - edgeOffset; else if (dx < 0) px = (node.x + 1) * ts + edgeOffset; else if (dy > 0) py = node.y * ts - edgeOffset; else if (dy < 0) py = (node.y + 1) * ts + edgeOffset;
            }
            pixelPath.push({ x: px, y: py });
        }
        this.ctx.save();
        const flicker = (Math.random() - 0.5) * 10, beamIntensity = 0.4 + Math.random() * 0.4, targetNode = e.laserPath[e.laserPath.length - 1];
        this.ctx.shadowBlur = 15 + Math.random() * 10; this.ctx.shadowColor = '#bf00ff'; this.ctx.strokeStyle = `rgba(191, 0, 255, ${0.1 * beamIntensity})`; this.ctx.lineWidth = 24 + flicker; this.ctx.lineCap = 'round'; this.ctx.lineJoin = 'round';
        this.ctx.beginPath(); this.ctx.moveTo(pixelPath[0].x, pixelPath[0].y); for (let i = 1; i < pixelPath.length; i++) this.ctx.lineTo(pixelPath[i].x, pixelPath[i].y); this.ctx.stroke();
        this.ctx.strokeStyle = `rgba(230, 180, 255, ${0.8 * beamIntensity})`; this.ctx.lineWidth = 2; this.ctx.shadowBlur = 0;
        this.ctx.beginPath(); this.ctx.moveTo(pixelPath[0].x, pixelPath[0].y);
        for (let i = 0; i < pixelPath.length - 1; i++) {
            const start = pixelPath[i], end = pixelPath[i+1], segments = 8, sdx = (end.x - start.x) / segments, sdy = (end.y - start.y) / segments, isVert = Math.abs(end.x - start.x) < 1;
            for (let j = 1; j < segments; j++) this.ctx.lineTo(start.x + sdx * j + (isVert ? (Math.random() - 0.5) * 12 : 0), start.y + sdy * j + (!isVert ? (Math.random() - 0.5) * 12 : 0));
            this.ctx.lineTo(end.x, end.y);
        }
        this.ctx.stroke();
        this.ctx.strokeStyle = `rgba(191, 0, 255, ${0.6 * beamIntensity})`; this.ctx.lineWidth = 8 + (Math.random() - 0.5) * 4;
        this.ctx.beginPath(); this.ctx.moveTo(pixelPath[0].x, pixelPath[0].y); for (let i = 1; i < pixelPath.length; i++) this.ctx.lineTo(pixelPath[i].x, pixelPath[i].y); this.ctx.stroke();
        this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 4 + (Math.random() - 0.5) * 2;
        this.ctx.beginPath(); this.ctx.moveTo(pixelPath[0].x, pixelPath[0].y); for (let i = 1; i < pixelPath.length; i++) this.ctx.lineTo(pixelPath[i].x, pixelPath[i].y); this.ctx.stroke();
        if (targetNode.type !== 'NONE') {
            const tx = pixelPath[pixelPath.length - 1].x, ty = pixelPath[pixelPath.length - 1].y, flareSize = 10 + Math.random() * 15;
            const grad = this.ctx.createRadialGradient(tx, ty, 0, tx, ty, flareSize); grad.addColorStop(0, '#fff'); grad.addColorStop(0.3, 'rgba(191, 0, 255, 0.8)'); grad.addColorStop(1, 'rgba(191, 0, 255, 0)');
            this.ctx.fillStyle = grad; this.ctx.beginPath(); this.ctx.arc(tx, ty, flareSize, 0, Math.PI * 2); this.ctx.fill();
            if (frame % 2 === 0) { this.spawnParticle(tx, ty, '#bf00ff', 'spark'); if (Math.random() > 0.5) this.spawnParticle(tx, ty, '#ffffff', 'spark'); }
            this.ctx.strokeStyle = 'rgba(255,255,255,0.5)'; this.ctx.lineWidth = 1;
            for(let i=0; i<6; i++) { const ang = Math.random() * Math.PI * 2, l = 5 + Math.random() * 15; this.ctx.beginPath(); this.ctx.moveTo(tx, ty); this.ctx.lineTo(tx + Math.cos(ang)*l, ty + Math.sin(ang)*l); this.ctx.stroke(); }
        }
        this.ctx.restore();
    }
});
