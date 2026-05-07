/**
 * Shop System - Purchasing upgrades with Scrap
 */

const ShopSystem = {
    active: false,
    game: null,
    bootTimer: 0,
    lastToggleTime: 0,
    state: 'IDLE', // 'IDLE', 'OPENING', 'CLOSING', 'ACTIVE'
    selectedIndex: 0,
    
    inventory: [
        { id: 'hp_max', name: 'EXPANSÃO DE BATERIA', cost: 10, desc: '+1 Célula de Vida Máxima', icon: '🔋' },
        { id: 'shield', name: 'ESCUDO DE IMPACTO', cost: 15, desc: 'Reduz recuo de dano', icon: '🛡️' },
        { id: 'radar', name: 'MÓDULO DE RADAR', cost: 20, desc: 'Revela segredos próximos', icon: '📡' },
        { id: 'overclock', name: 'OVERCLOCK DE CPU', cost: 25, desc: 'Velocidade de movimento +10%', icon: '⚡' }
    ],

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
        this.selectedIndex = 0;
        game.inputLocked = true;
        if (window.AudioSys) AudioSys.playPortalClick();
    },

    close() {
        this.state = 'CLOSING';
        if (window.AudioSys) AudioSys.playPortalClick();
    },

    handleInput(key) {
        if (this.state !== 'ACTIVE') return;

        if (key === 'ArrowUp' || key === 'w') {
            this.selectedIndex = (this.selectedIndex - 1 + this.inventory.length) % this.inventory.length;
            if (window.AudioSys) AudioSys.buttonClick();
        } else if (key === 'ArrowDown' || key === 's') {
            this.selectedIndex = (this.selectedIndex + 1) % this.inventory.length;
            if (window.AudioSys) AudioSys.buttonClick();
        } else if (key === 'Enter' || key === ' ') {
            this.purchase();
        } else if (key === 'Escape' || key === 'e') {
            this.close();
        }
    },

    purchase() {
        const item = this.inventory[this.selectedIndex];
        const currentScrap = window.GameProgress ? GameProgress.scrapTotal : (this.game.scrapTotal || 0);
        
        if (currentScrap >= item.cost) {
            if (window.GameProgress) {
                GameProgress.scrapTotal -= item.cost;
                this.game.scrapTotal = GameProgress.scrapTotal;
            } else {
                this.game.scrapTotal -= item.cost;
            }
            this.applyUpgrade(item.id);
            if (window.AudioSys) AudioSys.speak('heal');
            console.log(`[Shop] Comprado: ${item.name}`);
        } else {
            if (window.AudioSys) AudioSys.playDenied();
            console.log(`[Shop] Sucata insuficiente para ${item.name}`);
        }
    },

    applyUpgrade(id) {
        if (!window.GameProgress) return;
        
        switch(id) {
            case 'hp_max':
                if (window.HPSystem) {
                    HPSystem.totalMaxQuarters += 4;
                    HPSystem.fullHeal();
                }
                break;
            case 'shield':
                GameProgress.shieldUnlocked = true;
                break;
            case 'radar':
                GameProgress.radarUnlocked = true;
                break;
            case 'overclock':
                GameProgress.overclockUnlocked = true;
                break;
        }
    },

    render(ctx) {
        if (this.state === 'IDLE') return;

        if (this.state === 'OPENING') {
            this.bootTimer = Math.min(100, this.bootTimer + 10);
            if (this.bootTimer >= 100) this.state = 'ACTIVE';
        } else if (this.state === 'CLOSING') {
            this.bootTimer = Math.max(0, this.bootTimer - 15);
            if (this.bootTimer <= 0) {
                this.state = 'IDLE';
                if (this.game) this.game.inputLocked = false;
                return;
            }
        }

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const w = 400;
        const h = 350;
        const x = (640 - w) / 2;
        const y = (480 - h) / 2;

        const scaleY = this.bootTimer / 100;
        ctx.translate(320, 240);
        ctx.scale(1, scaleY);
        ctx.translate(-320, -240);

        // Frame
        ctx.fillStyle = 'rgba(10, 5, 15, 0.95)';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        if (this.bootTimer >= 100) {
            // Header
            ctx.fillStyle = '#00f0ff';
            ctx.font = '28px "VT323"';
            ctx.textAlign = 'center';
            ctx.fillText('TERMINAL DE TROCA DE SUCATA', x + w/2, y + 40);

            // Scrap Balance
            ctx.font = '20px "VT323"';
            ctx.fillStyle = '#ffcc00';
            const balance = window.GameProgress ? GameProgress.scrapTotal : (this.game.scrapTotal || 0);
            ctx.fillText(`SUCATA DISPONÍVEL: ${balance}`, x + w/2, y + 70);

            // Divider
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
            ctx.beginPath(); ctx.moveTo(x + 20, y + 85); ctx.lineTo(x + w - 20, y + 85); ctx.stroke();

            // Inventory List
            let itemY = y + 110;
            this.inventory.forEach((item, index) => {
                const isSelected = index === this.selectedIndex;
                if (isSelected) {
                    ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
                    ctx.fillRect(x + 10, itemY - 5, w - 20, 45);
                    ctx.strokeStyle = '#00f0ff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x + 10, itemY - 5, w - 20, 45);
                }

                ctx.textAlign = 'left';
                ctx.font = '22px "VT323"';
                ctx.fillStyle = isSelected ? '#fff' : '#888';
                ctx.fillText(`${item.icon} ${item.name}`, x + 25, itemY + 15);

                ctx.textAlign = 'right';
                const currentScrap = window.GameProgress ? GameProgress.scrapTotal : (this.game.scrapTotal || 0);
                ctx.fillStyle = (currentScrap >= item.cost) ? '#ffcc00' : '#ff003c';
                ctx.fillText(`${item.cost} SC`, x + w - 25, itemY + 15);

                ctx.font = '16px "VT323"';
                ctx.fillStyle = isSelected ? '#00f0ff' : '#555';
                ctx.textAlign = 'left';
                ctx.fillText(item.desc, x + 50, itemY + 32);

                itemY += 50;
            });

            // Footer
            ctx.textAlign = 'center';
            ctx.font = '16px "VT323"';
            ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
            ctx.fillText('[W/S] NAVEGAR  [ESPAÇO] COMPRAR  [E] SAIR', x + w/2, y + h - 20);
        }

        ctx.restore();
    }
};

if (typeof window !== 'undefined') window.ShopSystem = ShopSystem;
