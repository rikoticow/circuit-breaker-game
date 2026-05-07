Object.assign(Graphics, {
    drawShopTerminal(x, y, frame) {
        const px = x * this.tileSize;
        const py = y * this.tileSize;
        const ts = this.tileSize;
        const cx = px + ts / 2;
        const cy = py + ts / 2;

        this.ctx.save();

        // 1. Base Terminal Body (Dark Steel)
        this.ctx.fillStyle = '#1a1a24';
        this.ctx.strokeStyle = '#3a3a4a';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);
        this.ctx.strokeRect(px + 4, py + 4, ts - 8, ts - 8);

        // 2. Glowing Screen Area
        const screenPulse = 0.3 + Math.sin(frame * 0.1) * 0.1;
        this.ctx.fillStyle = `rgba(0, 240, 255, ${screenPulse})`;
        this.ctx.fillRect(px + 8, py + 8, ts - 16, 12);
        
        // Screen border
        this.ctx.strokeStyle = '#00f0ff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(px + 8, py + 8, ts - 16, 12);

        // 3. "$" Symbol on screen
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('$', cx, py + 14);

        // 4. Keyboard/Interface Area
        this.ctx.fillStyle = '#0a0a0f';
        this.ctx.fillRect(px + 8, py + 22, ts - 16, 6);
        
        // Buttons LEDs
        const ledPulse = Math.sin(frame * 0.2) > 0;
        this.ctx.fillStyle = ledPulse ? '#ffcc00' : '#443300';
        this.ctx.fillRect(px + 10, py + 24, 2, 2);
        this.ctx.fillStyle = !ledPulse ? '#00ff88' : '#004422';
        this.ctx.fillRect(px + 14, py + 24, 2, 2);

        // 5. Ambient Glow
        this.ctx.globalCompositeOperation = 'screen';
        const glow = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
        glow.addColorStop(0, 'rgba(0, 240, 255, 0.2)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = glow;
        this.ctx.fillRect(px - 10, py - 10, ts + 20, ts + 20);

        this.ctx.restore();
    }
});
