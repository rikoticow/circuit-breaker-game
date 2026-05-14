Object.assign(Graphics, {
    spawnParticle(x, y, color, type = 'spark', hasLight = false, config = null) {
        const p = {
            x: x, y: y,
            vx: type === 'smoke' ? (Math.random() - 0.5) * 0.4 : (type === 'flame' ? (Math.random() - 0.5) * 1.5 : (type === 'micro-spark' ? (Math.random() - 0.5) * 6 : (type === 'debris' ? (Math.random() - 0.5) * 8 : (type === 'shatter' ? (Math.random() - 0.5) * 10 : (type === 'anime-impact' ? 0 : (Math.random() - 0.5) * 5))))),
            vy: type === 'smoke' ? -0.2 - Math.random() * 0.3 : (type === 'flame' ? (Math.random() - 0.5) * 1.5 : (type === 'micro-spark' ? (Math.random() - 0.5) * 6 : (type === 'debris' ? (Math.random() - 0.5) * 8 : (type === 'shatter' ? (Math.random() - 0.5) * 10 : (type === 'anime-impact' ? 0 : (Math.random() - 0.5) * 5))))),
            life: 1.0,
            maxLife: 1.0,
            color: color,
            type: type,
            hasLight: hasLight,
            config: config,
            size: type === 'micro-spark' ? 1 + Math.random() : (type === 'smoke' ? 2 + Math.random() * 3 : (type === 'flame' ? 4 + Math.random() * 4 : (type === 'shatter' ? 4 + Math.random() * 6 : 4))),
            rot: Math.random() * Math.PI * 2,
            vr: type === 'shatter' ? (Math.random() - 0.5) * 0.4 : 0
        };

        if (type === 'shatter') {
            const s = p.size;
            p.points = [
                {x: -s/2, y: -s/2},
                {x: s/2, y: -s/4},
                {x: -s/4, y: s/2}
            ];
            // Randomize life to stagger removal
            p.life = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
            p.maxLife = p.life;
        }

        this.particles.push(p);
        return p;
    },

    drawParticles(game = null) {
        if (!game) return;
        const gravityDir = game.gravitySlidingDir;
        const map = game.map;

        // Clear VFX buffer once per frame
        if (this.vfxCtx) {
            this.vfxCtx.clearRect(0, 0, this.vfxCanvas.width, this.vfxCanvas.height);
        }

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
            } else if (p.type === 'shatter') {
                p.vx *= 0.92;
                p.vy *= 0.92;
                p.vr *= 0.94;
                
                // If it hits "ground" speed, it becomes grounded
                if (Math.abs(p.vx) < 0.1 && Math.abs(p.vy) < 0.1) {
                    p.grounded = true;
                }

                if (p.grounded) {
                    // Apply high friction when grounded instead of hard reset
                    p.vx *= 0.8;
                    p.vy *= 0.8;
                    p.vr *= 0.5;
                    
                    // Update positions after grounded physics
                    p.x += p.vx;
                    p.y += p.vy;
                } else {
                    p.x = nx;
                    p.y = ny;
                }
            } else {
                p.x = nx;
                p.y = ny;
            }

            // Update rotation
            if (p.vr !== 0) p.rot += p.vr;

            p.life -= p.type === 'micro-spark' ? 0.1 : (p.type === 'smoke' ? 0.01 : (p.type === 'flame' ? 0.03 : (p.type === 'anime-impact' ? 0.03 : (p.type === 'shatter' ? 0.001 : 0.05))));
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            if (p.type === 'anime-impact') {
                const t = 1.0 - p.life;
                this.drawAnimeImpact(p.x, p.y, t, p.config, game, p.color);
            } else if (p.type === 'shatter') {
                const progress = 1 - (p.life / p.maxLife);
                const scale = progress < 0.9 ? 1.0 : Math.max(0, (1.0 - progress) * 10); // Shrink only in last 10%
                
                this.ctx.save();
                this.ctx.globalAlpha = 1.0;
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.rot);
                this.ctx.scale(scale, scale);
                
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.moveTo(p.points[0].x, p.points[0].y);
                this.ctx.lineTo(p.points[1].x, p.points[1].y);
                this.ctx.lineTo(p.points[2].x, p.points[2].y);
                this.ctx.closePath();
                this.ctx.fill();
                
                // Metallic shine
                this.ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                
                this.ctx.restore();
            } else {
                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = p.life;

                if (p.type === 'smoke' || p.type === 'flame') {
                    const progress = 1 - p.life; 
                    const scale = Math.sin(progress * Math.PI);
                    const currentSize = Math.abs(p.size * scale);
                    
                    if (p.type === 'flame') {
                        // Dynamic color ramp for flames
                        if (p.life > 0.8) this.ctx.fillStyle = '#fff';
                        else if (p.life > 0.5) this.ctx.fillStyle = '#f1c40f'; // Yellow
                        else if (p.life > 0.3) this.ctx.fillStyle = '#e67e22'; // Orange
                        else this.ctx.fillStyle = '#d35400'; // Dark Orange/Red
                        
                        this.ctx.globalAlpha = p.life * 0.8;
                    }

                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Add glow for flames
                    if (p.type === 'flame') {
                        this.ctx.shadowBlur = 8 * p.life;
                        this.ctx.shadowColor = this.ctx.fillStyle;
                        this.ctx.fill();
                        this.ctx.shadowBlur = 0;
                    }
                } else if (p.type === 'spark' || p.type === 'micro-spark' || p.type === 'gold-spark') {
                    this.ctx.strokeStyle = p.color;
                    this.ctx.lineWidth = p.type === 'micro-spark' ? 1.2 : (p.type === 'gold-spark' ? 3.5 : 2.5);
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x, p.y);
                    const length = p.type === 'micro-spark' ? 1.0 : (p.type === 'gold-spark' ? 2.0 : 1.5);
                    this.ctx.lineTo(p.x - p.vx * length, p.y - p.vy * length);
                    this.ctx.stroke();
                } else {
                    this.ctx.fillRect(p.x, p.y, p.size, p.size);
                }
            }
        }


        // Blit VFX buffer once per frame
        if (this.vfxCtx) {
            this.ctx.save();
            this.ctx.globalAlpha = 1.0; // Ensure full opacity for the buffer blit
            this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Screen space
            this.ctx.drawImage(this.vfxCanvas, 0, 0);
            this.ctx.restore();
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
