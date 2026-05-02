Object.assign(Graphics, {
    drawDoor(x, y, state, isError, frame, orientation, side, openPct = null) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;

        if (state === 'OPEN' || state === 'BROKEN_OPEN') {
            this.ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
            this.ctx.fillRect(px, py, ts, ts);
        }

        this.ctx.save();
        if (openPct === null) {
            openPct = (state === 'OPEN' || state === 'BROKEN_OPEN') ? 1 : 0;
        }
        let ox = 0, oy = 0;
        const dist = ts * 0.9;

        if (side === 'LEFT') ox = -dist * openPct;
        else if (side === 'RIGHT') ox = dist * openPct;
        else if (side === 'TOP') oy = -dist * openPct;
        else if (side === 'BOTTOM') oy = dist * openPct;
        else oy = -dist * openPct;

        this.ctx.translate(px + ox, py + oy);
        this.ctx.fillStyle = '#2d3748';
        this.ctx.fillRect(0, 0, ts, ts);
        
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 2;
        
        let bx = 2, by = 2, bw = ts - 4, bh = ts - 4;
        if (side === 'LEFT') { bw = ts - 2; }
        else if (side === 'RIGHT') { bx = 0; bw = ts - 2; }
        else if (side === 'TOP') { bh = ts - 2; }
        else if (side === 'BOTTOM') { by = 0; bh = ts - 2; }
        
        this.ctx.beginPath();
        if (side === 'LEFT') {
            this.ctx.moveTo(bx + bw, by); this.ctx.lineTo(bx, by); this.ctx.lineTo(bx, by + bh); this.ctx.lineTo(bx + bw, by + bh);
        } else if (side === 'RIGHT') {
            this.ctx.moveTo(bx, by); this.ctx.lineTo(bx + bw, by); this.ctx.lineTo(bx + bw, by + bh); this.ctx.lineTo(bx, by + bh);
        } else if (side === 'TOP') {
            this.ctx.moveTo(bx, by + bh); this.ctx.lineTo(bx, by); this.ctx.lineTo(bx + bw, by); this.ctx.lineTo(bx + bw, by + bh);
        } else if (side === 'BOTTOM') {
            this.ctx.moveTo(bx, by); this.ctx.lineTo(bx, by + bh); this.ctx.lineTo(bx + bw, by + bh); this.ctx.lineTo(bx + bw, by);
        } else {
            this.ctx.rect(bx, by, bw, bh);
        }
        this.ctx.stroke();
        
        this.ctx.save();
        this.ctx.beginPath();
        let cpx = 4, cpy = 4, cpw = ts - 8, cph = ts - 8;
        if (side === 'LEFT') { cpw = ts - 4; }
        else if (side === 'RIGHT') { cpx = 0; cpw = ts - 4; }
        else if (side === 'TOP') { cph = ts - 4; }
        else if (side === 'BOTTOM') { cpy = 0; cph = ts - 4; }
        this.ctx.rect(cpx, cpy, cpw, cph);
        this.ctx.clip();
        
        const stripeW = 8;
        for (let i = -ts; i < ts * 2; i += stripeW * 2) {
            this.ctx.fillStyle = '#ffcc00';
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0); this.ctx.lineTo(i + stripeW, 0); this.ctx.lineTo(i + stripeW - ts, ts); this.ctx.lineTo(i - ts, ts);
            this.ctx.fill();
            this.ctx.fillStyle = '#111';
            const j = i + stripeW;
            this.ctx.beginPath();
            this.ctx.moveTo(j, 0); this.ctx.lineTo(j + stripeW, 0); this.ctx.lineTo(j + stripeW - ts, ts); this.ctx.lineTo(j - ts, ts);
            this.ctx.fill();
        }
        this.ctx.restore();

        if (state === 'BROKEN_OPEN') {
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.moveTo(4, 4); this.ctx.lineTo(12, 12); this.ctx.lineTo(8, 20); this.ctx.lineTo(15, 28);
            this.ctx.moveTo(12, 12); this.ctx.lineTo(22, 10); this.ctx.lineTo(28, 15);
            this.ctx.stroke();

            if (Math.random() > 0.94) {
                const edgePos = 4 + Math.random() * (ts - 8);
                let sx = 0, sy = 0;
                if (side === 'LEFT') { sx = ts - 2; sy = edgePos; }
                else if (side === 'RIGHT') { sx = 2; sy = edgePos; }
                else if (side === 'TOP') { sx = edgePos; sy = ts - 2; }
                else if (side === 'BOTTOM') { sx = edgePos; sy = 2; }
                else { sx = edgePos; sy = ts - 2; }
                for(let i=0; i<2; i++) this.spawnParticle(px + ox + sx, py + oy + sy, '#ffcc00', 'spark', true);
            }
        } else if (isError) {
            if (Math.floor(frame / 10) % 2 === 0) {
                this.ctx.save();
                this.ctx.fillStyle = '#ffcc00';
                this.ctx.beginPath();
                this.ctx.arc(ts/2, ts/2, 6, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
        }
        
        if (openPct > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = openPct * 0.5;
            this.ctx.strokeStyle = '#00f0ff';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            if (side === 'LEFT' || side === 'RIGHT') {
                this.ctx.moveTo(0, 0); this.ctx.lineTo(0, ts);
                this.ctx.moveTo(ts, 0); this.ctx.lineTo(ts, ts);
            } else {
                this.ctx.moveTo(0, 0); this.ctx.lineTo(ts, 0);
                this.ctx.moveTo(0, ts); this.ctx.lineTo(ts, ts);
            }
            this.ctx.stroke();
            this.ctx.restore();
        }
        this.ctx.restore();
    }
});
