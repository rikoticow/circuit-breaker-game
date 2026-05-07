/**
 * Modular Projectile Launcher System
 * Follows strict architectural guidelines for Circuit Breaker.
 */

// --- BASE ABSTRACTIONS (THE CONTRACTS) ---

/**
 * @abstract
 * Base class for all launcher entities.
 */
class LauncherBase {
    constructor(x, y, config = {}) {
        if (this.constructor === LauncherBase) {
            throw new Error("LauncherBase is abstract and cannot be instantiated.");
        }

        // Protected properties
        this._x = x;
        this._y = y;
        this._config = {
            dir: DIRS.DOWN,
            fireRate: 60, // frames between shots
            projectileType: config.type === 'box' ? 'box' : (config.type === 'antimatter' ? 'antimatter' : 'energy'),
            speed: 4,
            autoRotate: config.autoRotate || 0, // 0 (off), 4, or 8
            rotateDir: config.rotateDir || 'CW', // 'CW' or 'CCW'
            rotateEvery: config.rotateEvery || 1, // shots before rotating
            ...config
        };

        this._stateMachine = {
            state: 'INITIAL_DELAY',
            timer: 0
        };

        // Initial angle based on dir
        const startAngle = this._config.dir * (Math.PI / 2);
        this._visuals = {
            angle: startAngle,
            targetAngle: startAngle,
            flash: 0
        };

        this._rotationTimer = 0;
        this._shotsFired = 0;
    }

    get x() { return this._x; }
    get y() { return this._y; }

    // Hook for custom update logic
    onUpdate(game) {}

    // Hook for custom render logic
    onDraw(ctx, visuals) {}

    // Hook for firing logic
    onFire(game) {
        const proj = ProjectileFactory.create(
            this._x * 32 + 16, 
            this._y * 32 + 16, 
            this._visuals.targetAngle, // Use the current logic target angle
            this._config.projectileType,
            this._config.speed || 4
        );
        game.projectiles.push(proj);

        // Track shots for rotation frequency
        if (this._config.autoRotate > 0) {
            this._shotsFired++;
            if (this._shotsFired >= this._config.rotateEvery) {
                this._shotsFired = 0;
                this._rotationTimer = 10; // ~160ms recoil delay
            }
        }
    }

    update(game) {
        this.onUpdate(game);
        
        // Handle scheduled rotation
        if (this._rotationTimer > 0) {
            this._rotationTimer--;
            if (this._rotationTimer === 0) {
                const step = (Math.PI * 2) / this._config.autoRotate;
                const direction = this._config.rotateDir === 'CCW' ? -1 : 1;
                this._visuals.targetAngle += step * direction;
            }
        }

        this._updateFSM(game);
        this._updateVisuals();
    }

    _updateFSM(game) {
        const fsm = this._stateMachine;
        
        // Handle channel logic
        const chan = this._config.channel;
        if (chan !== undefined && chan !== null && chan !== 0) {
            const isGlobalActive = typeof GameProgress !== 'undefined' && GameProgress.hasSignal(chan);
            const isActive = (game.remoteSignals && game.remoteSignals.has(chan)) || isGlobalActive;
            
            // If not active, stay in IDLE and don't increment timer
            if (!isActive) {
                fsm.state = 'IDLE';
                fsm.timer = 0;
                return;
            }
        }

        fsm.timer++;

        switch (fsm.state) {
            case 'INITIAL_DELAY':
                this._visuals.chargeRatio = 0;
                if (fsm.timer >= (this._config.initialDelay || 0)) {
                    fsm.state = 'IDLE';
                    fsm.timer = 0;
                }
                break;
            case 'IDLE':
                this._visuals.chargeRatio = fsm.timer / this._config.fireRate;
                if (fsm.timer >= this._config.fireRate) {
                    fsm.state = 'CHARGING';
                    fsm.timer = 0;
                }
                break;
            case 'CHARGING':
                this._visuals.chargeRatio = 1.0;
                if (fsm.timer >= 20) { // Prep animation
                    this.onFire(game);
                    fsm.state = 'FIRING';
                    fsm.timer = 0;
                }
                break;
            case 'FIRING':
                this._visuals.chargeRatio = 1.0;
                this._visuals.flash = 1.0;
                fsm.state = 'COOLDOWN';
                fsm.timer = 0;
                break;
            case 'COOLDOWN':
                this._visuals.chargeRatio = 0;
                if (fsm.timer >= 10) {
                    fsm.state = 'IDLE';
                    fsm.timer = 0;
                }
                break;
        }
    }

    _updateVisuals() {
        // Smooth rotation towards targetAngle (no longer forced by dir config every frame)
        let diff = this._visuals.targetAngle - this._visuals.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this._visuals.angle += diff * 0.15;

        if (this._visuals.flash > 0) this._visuals.flash *= 0.9;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this._x * 32 + 16, this._y * 32 + 16);
        ctx.rotate(this._visuals.angle);
        
        this.onDraw(ctx, this._visuals);
        
        ctx.restore();
    }
}

/**
 * @abstract
 * Base class for all projectiles.
 */
class ProjectileBase {
    constructor(x, y, angleOrDir, speed) {
        if (this.constructor === ProjectileBase) {
            throw new Error("ProjectileBase is abstract and cannot be instantiated.");
        }
        this.x = x;
        this.y = y;
        
        // If it's a small integer 0-3, treat as DIRS index, otherwise treat as raw radians
        this.angle = (typeof angleOrDir === 'number' && angleOrDir >= 0 && angleOrDir <= 3 && Number.isInteger(angleOrDir)) 
                     ? angleOrDir * (Math.PI / 2) 
                     : angleOrDir;

        this.speed = speed;
        this.dead = false;
        this.radius = 8;
        this.life = 300; // frames before auto-destruction
        this.startX = Math.floor(x / 32);
        this.startY = Math.floor(y / 32);
        this.age = 0;
    }

    update(game) {
        const vx = Math.cos(this.angle) * this.speed;
        const vy = Math.sin(this.angle) * this.speed;
        
        this.x += vx;
        this.y += vy;
        this.life--;
        this.age++;
        if (this.life <= 0) this.dead = true;

        this.onUpdate(game);
        this._checkCollisions(game);
    }

    _checkCollisions(game) {
        const tx = Math.floor(this.x / 32);
        const ty = Math.floor(this.y / 32);

        // Wall collision
        if (game.isTileSolid(tx, ty)) {
            // Ignore own launcher tile during the first few frames to allow exit
            if (this.age < 10 && tx === this.startX && ty === this.startY) {
                // Pass through
            } else {
                this.onHit(game, 'WALL');
                this.dead = true;
                return;
            }
        }

        // Block collision
        for (const b of game.blocks) {
            if (tx === b.x && ty === b.y) {
                this.onHit(game, 'BLOCK');
                this.dead = true;
                return;
            }
        }

        // Player collision
        const pdx = this.x - (game.player.visualX * 32 + 16);
        const pdy = this.y - (game.player.visualY * 32 + 16);
        if (Math.sqrt(pdx*pdx + pdy*pdy) < 16 + this.radius) {
            this.onHit(game, 'PLAYER');
            this.dead = true;
        }
    }

    onUpdate(game) {}
    onDraw(ctx) {}
    
    draw(ctx) {
        this.onDraw(ctx);
    }

    onHit(game, target) {
        if (target === 'PLAYER') {
            game.takeDamage('PROJECTILE');
        }
        // VFX
        for (let i = 0; i < 5; i++) {
            Graphics.spawnParticle(this.x, this.y, this.color || '#fff', 'spark');
        }
    }
}

// --- INTERMEDIATE ARCHETYPES (THE SPECIALIZATION) ---

class EnergyLauncher extends LauncherBase {
    onDraw(ctx, visuals) {
        const color = '#00f0ff';
        const charge = visuals.chargeRatio || 0;
        const charging = this._stateMachine.state === 'CHARGING';
        
        // --- Circular Base (Brushed Steel Plate) ---
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        const baseGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 16);
        baseGrad.addColorStop(0, '#777');
        baseGrad.addColorStop(0.8, '#444');
        baseGrad.addColorStop(1, '#222');
        ctx.fillStyle = baseGrad;
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        
        // Metallic Plating Texture
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        for(let i=0; i<4; i++) {
            ctx.beginPath(); ctx.arc(0, 0, 16 - i*3, 0, Math.PI*2); ctx.stroke();
        }

        // Industrial Bolts
        ctx.fillStyle = '#888';
        for(let i=0; i<4; i++) {
            const ang = i * Math.PI/2 + Math.PI/4;
            ctx.beginPath(); ctx.arc(Math.cos(ang)*13, Math.sin(ang)*13, 1.8, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#333'; ctx.lineWidth = 0.5; ctx.stroke();
        }

        // --- Core Housing (Plated) ---
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();

        // --- High-Tech Titanium Barrel ---
        ctx.save();
        // Barrel Body (Segmented Plates)
        ctx.fillStyle = '#444';
        ctx.fillRect(4, -8, 12, 16);
        ctx.fillStyle = '#333';
        ctx.fillRect(16, -7, 6, 14);
        
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(4, -8, 12, 16);
        ctx.strokeRect(16, -7, 6, 14);

        // Glowing Core Line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(18, 0); ctx.stroke();

        // Cooling Fins (Metal Plates)
        ctx.fillStyle = '#555';
        for(let i=0; i<3; i++) {
            ctx.fillRect(7 + i*4, -10, 1.5, 20);
        }

        // Energy Muzzle Shroud
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.moveTo(18, -8); ctx.lineTo(24, -10); ctx.lineTo(24, 10); ctx.lineTo(18, 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();

        // --- Clockwork Charge Ring ---
        if (charge > 0) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 7.5, -Math.PI/2, -Math.PI/2 + (charge * Math.PI*2));
            ctx.stroke();
            
            // Glowing tip of the clock hand
            const handX = Math.cos(-Math.PI/2 + (charge * Math.PI*2)) * 7.5;
            const handY = Math.sin(-Math.PI/2 + (charge * Math.PI*2)) * 7.5;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(handX, handY, 2, 0, Math.PI*2); ctx.fill();
        }

        // Charge indicator (Linear Intensity)
        if (charge > 0) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = charge;
            ctx.shadowBlur = charge * 12;
            ctx.shadowColor = color;
            ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
        }

        if (visuals.flash > 0) {
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = visuals.flash;
            ctx.beginPath(); ctx.arc(22, 0, 20 * visuals.flash, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
}

class MechanicalLauncher extends LauncherBase {
    onDraw(ctx, visuals) {
        const color = '#ffd700'; // Industrial Gold
        const charge = visuals.chargeRatio || 0;
        
        // --- Heavy Iron Base (Plated) ---
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        const ironGrad = ctx.createLinearGradient(-16, -16, 16, 16);
        ironGrad.addColorStop(0, '#444');
        ironGrad.addColorStop(0.5, '#222');
        ironGrad.addColorStop(1, '#333');
        ctx.fillStyle = ironGrad;
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Octagonal Plating detail
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<8; i++) {
            const ang = i * Math.PI/4;
            const r = 14;
            if(i===0) ctx.moveTo(Math.cos(ang)*r, Math.sin(ang)*r);
            else ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r);
        }
        ctx.closePath();
        ctx.stroke();

        // --- Hydraulic Reinforced Assembly ---
        ctx.fillStyle = '#333';
        ctx.fillRect(-11, -11, 22, 22);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(-11, -11, 22, 22);

        // --- Double Piston Heavy Barrel ---
        ctx.fillStyle = '#222'; // Dark metal
        ctx.fillRect(0, -12, 20, 24);
        ctx.strokeStyle = '#444';
        ctx.strokeRect(0, -12, 20, 24);

        // Pistons (Chrome look)
        const chromeGrad = ctx.createLinearGradient(4, -8, 4, -2);
        chromeGrad.addColorStop(0, '#aaa');
        chromeGrad.addColorStop(0.5, '#eee');
        chromeGrad.addColorStop(1, '#888');
        ctx.fillStyle = chromeGrad;
        ctx.fillRect(4, -9, 15, 7);
        ctx.fillRect(4, 2, 15, 7);
        
        // Reinforcement Bands
        ctx.fillStyle = color;
        ctx.fillRect(6, -13, 3, 26);
        ctx.fillRect(15, -13, 3, 26);

        // Heavy Bolts on barrel
        ctx.fillStyle = '#666';
        ctx.beginPath(); ctx.arc(10, 0, 1.5, 0, Math.PI*2); ctx.fill();

        // Status Light (Intensity based on charge)
        const lightIntensity = charge; 
        
        ctx.fillStyle = '#ff003c';
        ctx.globalAlpha = lightIntensity;
        ctx.shadowBlur = charge * 16;
        ctx.shadowColor = '#ff003c';
        ctx.beginPath(); ctx.arc(-7, 0, 3.5, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;

        if (visuals.flash > 0) {
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = visuals.flash;
            ctx.fillRect(20, -14, 10, 28);
            ctx.globalAlpha = 1.0;
        }
    }
}

class VoidLauncher extends LauncherBase {
    onDraw(ctx, visuals) {
        const color = '#bf00ff'; // Quantum Purple
        const charge = visuals.chargeRatio || 0;
        
        // --- Heavy Void Chassis (Chrome & Steel) ---
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        const chromeGrad = ctx.createLinearGradient(-16, -16, 16, 16);
        chromeGrad.addColorStop(0, '#333');
        chromeGrad.addColorStop(0.5, '#0a0a0a');
        chromeGrad.addColorStop(1, '#444');
        ctx.fillStyle = chromeGrad;
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Technical Ring with Bolts
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = '#666';
        for(let i=0; i<6; i++) {
            const ang = i * Math.PI/3;
            ctx.beginPath(); ctx.arc(Math.cos(ang)*15, Math.sin(ang)*15, 1.2, 0, Math.PI*2); ctx.fill();
        }

        // --- Magnetic Containment Clamps ---
        ctx.fillStyle = '#222';
        for(let i=0; i<4; i++) {
            const ang = i * Math.PI/2 + Math.PI/4;
            ctx.save();
            ctx.rotate(ang);
            ctx.fillRect(8, -3, 6, 6);
            ctx.strokeStyle = '#555';
            ctx.strokeRect(8, -3, 6, 6);
            // Energy conduit on clamp
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(10, -1, 3, 2);
            ctx.restore();
        }

        // --- Segmented Accelerator Barrel ---
        ctx.save();
        // Barrel Rail (Dark Carbon Fiber look)
        ctx.fillStyle = '#111';
        ctx.fillRect(4, -9, 18, 18);
        ctx.strokeStyle = '#333';
        ctx.strokeRect(4, -9, 18, 18);
        
        // Magnetic Coils
        ctx.fillStyle = '#2a2a2a';
        for(let i=0; i<3; i++) {
            ctx.fillRect(6 + i*5, -11, 3, 22);
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(6 + i*5, -11, 3, 22);
        }

        // Plasma Vents
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(18, -7, 4, 14);
        ctx.globalAlpha = 1.0;

        // Barrel Tip (Aperture opening with charge)
        ctx.fillStyle = '#000';
        const apertureSize = 9 + (charge * 4); 
        ctx.beginPath();
        ctx.moveTo(20, -apertureSize); ctx.lineTo(26, -14); ctx.lineTo(26, 14); ctx.lineTo(20, apertureSize);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();

        // --- Internal Energy Meter (Power Line) ---
        const lineMaxHalfWidth = 6;
        const currentHalfWidth = lineMaxHalfWidth * charge;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        
        // Horizontal Power Line (Grows from center)
        ctx.beginPath();
        ctx.moveTo(-currentHalfWidth, 0);
        ctx.lineTo(currentHalfWidth, 0);
        ctx.stroke();
        
        // Faint chamber glow (scales with charge)
        ctx.globalAlpha = charge * 0.3;
        ctx.fillStyle = color;
        ctx.fillRect(-6, -8, 12, 16);
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;

        // Orbiting containment fields
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.3;
        for(let i=0; i<2; i++) {
            ctx.save();
            ctx.rotate(Date.now()*0.001 * (i===0?1:-1));
            ctx.beginPath(); ctx.ellipse(0, 0, 16, 6, 0, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }
        ctx.globalAlpha = 1.0;

        if (visuals.flash > 0) {
            ctx.fillStyle = color;
            ctx.globalAlpha = visuals.flash;
            ctx.beginPath(); ctx.arc(22, 0, 30 * visuals.flash, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
}

// --- SPECIFIC IMPLEMENTATIONS (THE VARIANTS) ---

class EnergyBallProjectile extends ProjectileBase {
    constructor(x, y, dir, speed) {
        super(x, y, dir, speed);
        this.color = '#00f0ff';
        this.radius = 6;
    }

    onDraw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    onHit(game, target) {
        if (target === 'PLAYER') {
            game.takeDamage('ENERGY_HIT');
        }
        super.onHit(game, target);
    }
}

class BoxProjectile extends ProjectileBase {
    constructor(x, y, dir, speed) {
        super(x, y, dir, speed);
        this.color = '#ffd700';
        this.radius = 10;
        this.rotationOffset = Math.random() * Math.PI * 2;
    }

    onDraw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Dynamic rotation based on age for predictable, smooth spin
        ctx.rotate(this.rotationOffset + this.age * 0.15);
        
        // --- Cardboard Box Aesthetic ---
        ctx.fillStyle = '#d2b48c'; // Cardboard Tan
        ctx.fillRect(-10, -10, 20, 20);
        
        // Box Flaps (Darker Tan)
        ctx.fillStyle = '#c1a073';
        ctx.fillRect(-10, -10, 20, 4); // Top flap
        ctx.fillRect(-10, 6, 20, 4);  // Bottom flap
        
        // Tape (Grayish/Clear)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(-2, -10, 4, 20);
        
        // Box Edges
        ctx.strokeStyle = '#a68a64';
        ctx.lineWidth = 1;
        ctx.strokeRect(-10, -10, 20, 20);
        
        // Handling Label (Fragile/Arrows)
        ctx.fillStyle = '#443322';
        ctx.font = '8px Arial';
        ctx.fillText('↑↑', -4, 4);

        ctx.restore();
    }

    onHit(game, target) {
        if (target === 'PLAYER') {
            game.takeDamage('MECHANICAL_HIT');
        }
        super.onHit(game, target);
    }
}

class AntimatterProjectile extends ProjectileBase {
    constructor(x, y, dir, speed) {
        super(x, y, dir, speed);
        this.color = '#bf00ff';
        this.radius = 8;
    }

    onDraw(ctx) {
        const time = this.age * 0.12;
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Unstable core
        for (let i = 0; i < 4; i++) {
            const angle = time + (i * Math.PI / 2);
            const ox = Math.cos(angle * 1.5) * 6;
            const oy = Math.sin(angle * 0.8) * 6;
            
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(ox, oy, 6 + Math.sin(time) * 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Central spark
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(0, 0, 3 + Math.cos(time * 5) * 1, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    onHit(game, target) {
        if (target === 'PLAYER') {
            game.takeDamage('VOID_HIT');
        }
        super.onHit(game, target);
    }
}

// --- FACTORIES AND REGISTRY ---

const ProjectileFactory = {
    create(x, y, angle, type, speed) {
        switch (type) {
            case 'box': return new BoxProjectile(x, y, angle, speed);
            case 'antimatter': return new AntimatterProjectile(x, y, angle, speed);
            case 'energy':
            default:
                return new EnergyBallProjectile(x, y, angle, speed);
        }
    }
};

const LauncherFactory = {
    create(x, y, config) {
        const type = config.type || config.projectileType || 'energy';
        switch (type) {
            case 'box': return new MechanicalLauncher(x, y, config);
            case 'antimatter': return new VoidLauncher(x, y, config);
            case 'energy':
            default:
                return new EnergyLauncher(x, y, config);
        }
    }
};

// Export to window for game access
window.LauncherSystem = {
    LauncherFactory,
    ProjectileFactory
};
