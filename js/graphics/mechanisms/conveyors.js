Object.assign(Graphics, {
    drawConveyor(x, y, dir, frame, inDir = null, beltDist = 0, beltLength = 10, isActive = true, overHole = false) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        
        const isCorner = inDir !== null && inDir !== dir;

        // 1. BASE (Belt track) - Unified Color
        this.ctx.fillStyle = isActive ? '#2c3440' : '#1e252e';
        
        if (!isCorner) {
            // Straight belt logic: Background only between rails (28px wide)
            if (dir === DIRS.LEFT || dir === DIRS.RIGHT) {
                this.ctx.fillRect(px, py + 4, ts, ts - 8);
            } else {
                this.ctx.fillRect(px + 4, py, ts - 8, ts);
            }

            // 2. Animated Belt Texture (Lines moving)
            this.ctx.strokeStyle = isActive ? 'rgba(100, 150, 255, 0.4)' : 'rgba(70, 80, 90, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            const offset = isActive ? ((frame * 0.8) % 12) : 0;

            if (dir === DIRS.LEFT || dir === DIRS.RIGHT) {
                for (let i = -12; i < ts + 12; i += 12) {
                    const ox = i + (dir === DIRS.RIGHT ? offset : -offset);
                    if (ox >= 0 && ox <= ts) {
                        this.ctx.moveTo(px + ox, py + 4);
                        this.ctx.lineTo(px + ox, py + ts - 4);
                    }
                }
            } else {
                for (let i = -12; i < ts + 12; i += 12) {
                    const oy = i + (dir === DIRS.DOWN ? offset : -offset);
                    if (oy >= 0 && oy <= ts) {
                        this.ctx.moveTo(px + 4, py + oy);
                        this.ctx.lineTo(px + ts - 4, py + oy);
                    }
                }
            }
            this.ctx.stroke();
        } else {
            // Corner logic (Curved lines)
            this.ctx.save();
            this.ctx.translate(px + ts/2, py + ts/2);
            
            // 8-Case Matrix for Corners
            if (inDir === DIRS.RIGHT && dir === DIRS.DOWN) { /* No rot */ }
            else if (inDir === DIRS.DOWN && dir === DIRS.LEFT) this.ctx.rotate(Math.PI/2);
            else if (inDir === DIRS.LEFT && dir === DIRS.UP) this.ctx.rotate(Math.PI);
            else if (inDir === DIRS.UP && dir === DIRS.RIGHT) this.ctx.rotate(-Math.PI/2);
            else if (inDir === DIRS.RIGHT && dir === DIRS.UP) this.ctx.scale(1, -1);
            else if (inDir === DIRS.UP && dir === DIRS.LEFT) { this.ctx.rotate(-Math.PI/2); this.ctx.scale(1, -1); }
            else if (inDir === DIRS.LEFT && dir === DIRS.DOWN) { this.ctx.rotate(Math.PI); this.ctx.scale(1, -1); }
            else if (inDir === DIRS.DOWN && dir === DIRS.RIGHT) { this.ctx.rotate(Math.PI/2); this.ctx.scale(1, -1); }

            // DRAW CURVED TRACK BACKGROUND (Between rails: Radius 2 to Radius 30)
            this.ctx.beginPath();
            this.ctx.arc(-ts/2, ts/2, ts - 2, -Math.PI/2, 0);
            this.ctx.arc(-ts/2, ts/2, 2, 0, -Math.PI/2, true);
            this.ctx.closePath();
            this.ctx.fill();

            // 2. Animated Belt Texture
            this.ctx.strokeStyle = isActive ? 'rgba(100, 150, 255, 0.4)' : 'rgba(70, 80, 90, 0.3)';
            this.ctx.lineWidth = 1;

            if (isActive) {
                const angStep = 0.75; 
                const angOffset = (frame * 0.05) % angStep;

                for (let a = -Math.PI/2 - angStep; a <= 0 + angStep; a += angStep) {
                    const angle = a + angOffset;
                    if (angle >= -Math.PI/2 && angle <= 0) {
                        const cos = Math.cos(angle);
                        const sin = Math.sin(angle);
                        this.ctx.beginPath();
                        this.ctx.moveTo(-ts/2 + cos * 4, ts/2 + sin * 4);
                        this.ctx.lineTo(-ts/2 + cos * (ts - 4), ts/2 + sin * (ts - 4));
                        this.ctx.stroke();
                    }
                }
            } else {
                const angStep = 0.75;
                for (let a = -Math.PI/2; a <= 0; a += angStep) {
                    const cos = Math.cos(a);
                    const sin = Math.sin(a);
                    this.ctx.beginPath();
                    this.ctx.moveTo(-ts/2 + cos * 4, ts/2 + sin * 4);
                    this.ctx.lineTo(-ts/2 + cos * (ts - 4), ts/2 + sin * (ts - 4));
                    this.ctx.stroke();
                }
            }
            this.ctx.restore();
        }

        // 3. Side Rails
        const railColor = isActive ? '#4a5568' : '#2d3748';
        this.ctx.fillStyle = railColor;

        if (!isCorner) {
            if (dir === DIRS.LEFT || dir === DIRS.RIGHT) {
                this.ctx.fillRect(px, py, ts, 4); 
                this.ctx.fillRect(px, py + ts - 4, ts, 4);
            } else {
                this.ctx.fillRect(px, py, 4, ts);
                this.ctx.fillRect(px + ts - 4, py, 4, ts);
            }
        } else {
            this.ctx.save();
            this.ctx.translate(px + ts/2, py + ts/2);
            if (inDir === DIRS.RIGHT && dir === DIRS.DOWN) { /* No rot */ }
            else if (inDir === DIRS.DOWN && dir === DIRS.LEFT) this.ctx.rotate(Math.PI/2);
            else if (inDir === DIRS.LEFT && dir === DIRS.UP) this.ctx.rotate(Math.PI);
            else if (inDir === DIRS.UP && dir === DIRS.RIGHT) this.ctx.rotate(-Math.PI/2);
            else if (inDir === DIRS.RIGHT && dir === DIRS.UP) this.ctx.scale(1, -1);
            else if (inDir === DIRS.UP && dir === DIRS.LEFT) { this.ctx.rotate(-Math.PI/2); this.ctx.scale(1, -1); }
            else if (inDir === DIRS.LEFT && dir === DIRS.DOWN) { this.ctx.rotate(Math.PI); this.ctx.scale(1, -1); }
            else if (inDir === DIRS.DOWN && dir === DIRS.RIGHT) { this.ctx.rotate(Math.PI/2); this.ctx.scale(1, -1); }
            
            this.ctx.strokeStyle = railColor;
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.arc(-ts/2, ts/2, ts - 2, -Math.PI/2, 0);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.arc(-ts/2, ts/2, 2, -Math.PI/2, 0);
            this.ctx.stroke();
            this.ctx.restore();
        }

        // 4. Directional Arrows
        this.ctx.save();
        this.ctx.translate(px + ts/2, py + ts/2);

        if (isActive) {
            this.ctx.fillStyle = '#00f0ff';
            this.ctx.shadowColor = '#00f0ff';
            this.ctx.shadowBlur = 8;

            const cycleLength = beltLength || 10;
            const pauseLength = Math.max(4, Math.floor(cycleLength * 0.3)); 
            const totalCycle = cycleLength + pauseLength;
            
            const speed = 0.05 + (cycleLength * 0.005);
            const pingPos = ((frame * speed) % totalCycle) - 2.0; 
            
            this.ctx.globalAlpha = 0;
            if (frame === -1) {
                this.ctx.globalAlpha = 0.9;
            } else if (pingPos < cycleLength + 2) { 
                let d = Math.abs(pingPos - beltDist);
                if (inDir !== null && d > totalCycle / 2) d = Math.abs(d - totalCycle);
                this.ctx.globalAlpha = Math.max(0, 1.0 - d * 0.45) * 0.9;
            }
        } else {
            this.ctx.globalAlpha = 0;
        }

        if (isCorner) {
            if (inDir === DIRS.RIGHT && dir === DIRS.DOWN) { /* No rot */ }
            else if (inDir === DIRS.DOWN && dir === DIRS.LEFT) this.ctx.rotate(Math.PI/2);
            else if (inDir === DIRS.LEFT && dir === DIRS.UP) this.ctx.rotate(Math.PI);
            else if (inDir === DIRS.UP && dir === DIRS.RIGHT) this.ctx.rotate(-Math.PI/2);
            else if (inDir === DIRS.RIGHT && dir === DIRS.UP) this.ctx.scale(1, -1);
            else if (inDir === DIRS.UP && dir === DIRS.LEFT) { this.ctx.rotate(-Math.PI/2); this.ctx.scale(1, -1); }
            else if (inDir === DIRS.LEFT && dir === DIRS.DOWN) { this.ctx.rotate(Math.PI); this.ctx.scale(1, -1); }
            else if (inDir === DIRS.DOWN && dir === DIRS.RIGHT) { this.ctx.rotate(Math.PI/2); this.ctx.scale(1, -1); }

            this.ctx.translate(-ts/2, ts/2);
            this.ctx.rotate(-Math.PI/4); // 45 degrees
            this.ctx.translate(ts/2, 0); 
            this.ctx.rotate(Math.PI/2); // Tangent
        } else {
            if (dir === DIRS.DOWN) this.ctx.rotate(Math.PI/2);
            else if (dir === DIRS.LEFT) this.ctx.rotate(Math.PI);
            else if (dir === DIRS.UP) this.ctx.rotate(-Math.PI/2);
        }
        
        this.ctx.beginPath();
        this.ctx.moveTo(-3, -4);
        this.ctx.lineTo(3, 0);
        this.ctx.lineTo(-3, 4);
        this.ctx.fill();
        
        this.ctx.restore();
    }
});
