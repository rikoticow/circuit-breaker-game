Object.assign(Graphics, {
    drawEmitter(x, y, dir, frame) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        this.ctx.save();
        this.ctx.translate(px + ts / 2, py + ts / 2);
        this.ctx.rotate(dir * Math.PI / 2);

        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 14, 0, Math.PI * 2);
        this.ctx.fill();

        const grad = this.ctx.createLinearGradient(0, -12, 0, 12);
        grad.addColorStop(0, '#2d3436');
        grad.addColorStop(0.5, '#636e72');
        grad.addColorStop(1, '#2d3436');

        this.ctx.fillStyle = grad;
        this.ctx.fillRect(-12, -10, 24, 20);

        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(-12, -10, 24, 20);
        this.ctx.strokeRect(-4, -10, 8, 20);

        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(8, -12, 6, 24);
        this.ctx.strokeRect(8, -12, 6, 24);

        this.ctx.fillStyle = `rgba(191, 0, 255, ${0.6 + Math.sin(frame * 0.4) * 0.3})`;
        this.ctx.fillRect(10, -6, 4, 12);

        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(14, 0, 3 + Math.sin(frame * 0.5) * 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(-14, -8, 2, 16);
        this.ctx.restore();
    },

    drawLaser(e, frame, allowParticles = true) {
        if (!e.laserPath || e.laserPath.length < 2) return;
        const ts = this.tileSize;
        const pixelPath = [];

        for (let i = 0; i < e.laserPath.length; i++) {
            const node = e.laserPath[i];
            let px = node.x * ts + 16;
            let py = node.y * ts + 16;
            if (i === 0) {
                let ox = 0, oy = 0;
                if (e.dir === DIRS.RIGHT) ox = 14;
                else if (e.dir === DIRS.LEFT) ox = -14;
                else if (e.dir === DIRS.UP) oy = -14;
                else if (e.dir === DIRS.DOWN) oy = 14;
                px += ox;
                py += oy;
            } else if (i === e.laserPath.length - 1) {
                const prev = e.laserPath[i - 1];
                const dx = node.x - prev.x;
                const dy = node.y - prev.y;
                const edgeOffset = 2;
                if (dx > 0) px = node.x * ts - edgeOffset;
                else if (dx < 0) px = (node.x + 1) * ts + edgeOffset;
                else if (dy > 0) py = node.y * ts - edgeOffset;
                else if (dy < 0) py = (node.y + 1) * ts + edgeOffset;
            }
            pixelPath.push({ x: px, y: py });
        }

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';
        
        // --- Visual Variation (Subtle Jitter & Pulse) ---
        const time = frame * 0.5;
        const pulse = Math.sin(time) * 0.5 + 0.5;
        const targetNode = e.laserPath[e.laserPath.length - 1];

        // 1. Core Border (Translucent purple with subtle pulsating width)
        this.ctx.strokeStyle = 'rgba(191, 0, 255, 0.5)';
        this.ctx.lineWidth = 7 + pulse * 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        // Minimal jitter to the start point
        const startJitter = Math.sin(time * 1.1) * 0.3;
        this.ctx.moveTo(pixelPath[0].x + startJitter, pixelPath[0].y + startJitter);
        
        for (let i = 1; i < pixelPath.length; i++) {
            // Very subtle vibration offset
            const segmentJitterX = Math.sin(time * 1.5 + i * 2.0) * 0.3;
            const segmentJitterY = Math.cos(time * 1.3 + i * 1.7) * 0.3;
            this.ctx.lineTo(pixelPath[i].x + segmentJitterX, pixelPath[i].y + segmentJitterY);
        }
        this.ctx.stroke();

        // 2. Inner Beam (Semi-transparent White core, slightly thinner)
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + pulse * 0.2})`;
        this.ctx.lineWidth = 2 + pulse * 1.5;
        this.ctx.stroke();

        const type = targetNode.type;
        if (type === 'WALL' || type === 'DOOR' || type === 'PLAYER') {
            const tx = pixelPath[pixelPath.length - 1].x;
            const ty = pixelPath[pixelPath.length - 1].y;
            
            if (frame % 2 === 0 && allowParticles) {
                this.spawnParticle(tx, ty, '#bf00ff', 'spark');
                if (Math.random() > 0.4) this.spawnParticle(tx, ty, '#ffffff', 'spark');
            }

            // Translucent Flare (Additive matching)
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.beginPath();
            this.ctx.arc(tx, ty, 4, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = 'rgba(191, 0, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(tx, ty, 8, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }
});
