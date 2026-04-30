Object.assign(Graphics, {
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

    drawParticles(game = null) {
        if (!game) return;
        const gravityDir = game.gravitySlidingDir;
        const map = game.map;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            
            // Apply Subtle Gravity Influence
            if (gravityDir !== null) {
                const strength = 0.15; // Reduced strength
                if (gravityDir === DIRS.UP) p.vy -= strength;
                if (gravityDir === DIRS.DOWN) p.vy += strength;
                if (gravityDir === DIRS.LEFT) p.vx -= strength;
                if (gravityDir === DIRS.RIGHT) p.vx += strength;
            }

            const nx = p.x + p.vx;
            const ny = p.y + p.vy;
            
            // Wall/Ceiling Collision (Bounce)
            const tx = Math.floor(nx / 32);
            const ty = Math.floor(ny / 32);
            if (map[ty] && (map[ty][tx] === '#' || map[ty][tx] === 'W')) {
                p.vx *= -0.4; // Bounce back
                p.vy *= -0.4;
            } else {
                p.x = nx;
                p.y = ny;
            }

            p.life -= p.type === 'smoke' ? 0.01 : 0.05;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;

            if (p.type === 'smoke') {
                const progress = 1 - p.life; 
                const scale = Math.sin(progress * Math.PI);
                const currentSize = Math.abs(p.size * scale);
                
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (p.type === 'spark') {
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = 2.5;
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
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

    drawAmbientParticles(particles) {
        if (!particles) return;
        this.ctx.save();
        for (const p of particles) {
            this.ctx.fillStyle = p.color;
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rot || 0);
            
            const s = p.size;
            if (p.shape === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, s/2, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (p.shape === 'triangle') {
                this.ctx.beginPath();
                this.ctx.moveTo(0, -s/2);
                this.ctx.lineTo(s/2, s/2);
                this.ctx.lineTo(-s/2, s/2);
                this.ctx.closePath();
                this.ctx.fill();
            } else if (p.shape === 'cross') {
                this.ctx.fillRect(-s/2, -1, s, 2);
                this.ctx.fillRect(-1, -s/2, 2, s);
            } else { // rect
                this.ctx.fillRect(-s/2, -s/2, s, s);
            }
            
            this.ctx.restore();
        }
        this.ctx.restore();
    }
});
