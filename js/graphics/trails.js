Object.assign(Graphics, {
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
    }
});
