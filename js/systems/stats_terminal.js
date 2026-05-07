/**
 * Stats Terminal System - CRT Terminal Overlay
 * Displays level statistics and robot status.
 */

const StatsTerminal = {
    active: false,
    game: null,
    bootTimer: 0,
    lastToggleTime: 0,
    state: 'IDLE', // 'IDLE', 'OPENING', 'CLOSING', 'ACTIVE'
    
    toggle(game) {
        if (Date.now() - this.lastToggleTime < 300) return;
        this.lastToggleTime = Date.now();

        if (this.state === 'ACTIVE') this.close();
        else if (this.state === 'IDLE') this.open(game);
    },

    open(game) {
        this.state = 'OPENING';
        this.game = game;
        this.bootTimer = 0;
        game.inputLocked = true;
        if (window.AudioSys) AudioSys.playPortalClick();
    },

    close() {
        this.state = 'CLOSING';
        if (window.AudioSys) AudioSys.playPortalClick();
    },

    formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    render(ctx) {
        if (this.state === 'IDLE') return;

        if (this.state === 'OPENING') {
            this.bootTimer = Math.min(100, this.bootTimer + 8);
            if (this.bootTimer >= 100) this.state = 'ACTIVE';
        } else if (this.state === 'CLOSING') {
            this.bootTimer = Math.max(0, this.bootTimer - 15);
            if (this.bootTimer <= 0) {
                this.state = 'IDLE';
                if (this.game) this.game.inputLocked = false;
                this.active = false;
                return;
            }
        }

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const w = 300;
        const h = 340;
        const x = (640 - w) / 2;
        const y = (480 - h) / 2;

        // --- Terminal Frame ---
        ctx.fillStyle = 'rgba(5, 10, 15, 0.98)';
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
        ctx.lineWidth = 1;
        
        // Opening animation (Scale Y from center)
        const scaleY = this.bootTimer / 100;
        ctx.translate(320, 240);
        ctx.scale(1, scaleY);
        ctx.translate(-320, -240);

        // Soft outer glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0, 240, 255, 0.2)';
        ctx.fillRect(x, y, w, h);
        ctx.shadowBlur = 0;
        ctx.strokeRect(x, y, w, h);

        // Stats Content
        if (this.bootTimer >= 100) {
            this.drawContent(ctx, x, y, w, h);
        }

        // CRT Scanlines (very subtle)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for (let i = 0; i < h; i += 3) {
            ctx.fillRect(x, y + i, w, 1);
        }

        ctx.restore();
    },

    drawContent(ctx, x, y, w, h) {
        const stats = window.LevelSelector ? LevelSelector.stats : {
            robotMoves: 0, rotations: 0, totalTime: 0, totalDeaths: 0,
            totalAmps: 0, totalScrap: 0, totalWireMeters: 0, energyRecharged: 0
        };

        const hp = window.HPSystem ? HPSystem : { currentQuarters: 0, totalMaxQuarters: 12 };

        const items = [
            { label: 'DESLOCAMENTOS ROBÔ', val: stats.robotMoves },
            { label: 'ROTAÇÕES DE BLOCOS', val: stats.rotations },
            { label: 'TEMPO DE SINCRONIA', val: this.formatTime(stats.totalTime) },
            { label: 'FALHAS DO SISTEMA', val: stats.totalDeaths },
            { label: 'AMPERES SINCRONIZADOS', val: stats.totalAmps },
            { label: 'SUCATA COLETADA', val: stats.totalScrap },
            { label: 'FIOS VALIDADOS (M)', val: stats.totalWireMeters },
            { label: 'ENERGIA RECARREGADA', val: stats.energyRecharged },
            { label: 'CÉLULAS DE ENERGIA', val: `${hp.currentQuarters}/${hp.totalMaxQuarters}` }
        ];

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Title
        ctx.font = '24px "VT323"';
        ctx.fillStyle = '#00f0ff';
        ctx.fillText('ESTATÍSTICAS GERAIS', x + 15, y + 20);

        // Divider
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 15, y + 55);
        ctx.lineTo(x + w - 15, y + 55);
        ctx.stroke();

        // List
        ctx.font = '20px "VT323"';
        let curY = y + 75;
        const lineSpacing = 26;

        items.forEach(item => {
            // Label
            ctx.fillStyle = '#888';
            ctx.textAlign = 'left';
            ctx.fillText(item.label, x + 15, curY);

            // Value
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'right';
            ctx.fillText(item.val.toString(), x + w - 15, curY);

            curY += lineSpacing;
        });

        // Prompt
        ctx.textAlign = 'center';
        ctx.font = '16px "VT323"';
        ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
        const blink = Math.floor(Date.now() / 500) % 2 === 0 ? '[ ESPAÇO PARA FECHAR ]' : '  ESPAÇO PARA FECHAR  ';
        ctx.fillText(blink, x + w / 2, y + h - 25);
    }
};

if (typeof window !== 'undefined') window.StatsTerminal = StatsTerminal;
