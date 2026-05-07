/**
 * Circuit Breaker - Enemy System
 * Based on strict architectural guidelines: Abstract base, FSM, and modular components.
 */

// --- ENEMY BASE (THE CONTRACT) ---

/**
 * @abstract
 * Base class for all enemies in the game.
 */
class EnemyBase {
    constructor(x, y, config = {}) {
        if (this.constructor === EnemyBase) {
            throw new Error("EnemyBase is abstract and cannot be instantiated.");
        }

        // Protected attributes (encapsulated)
        this._x = x;
        this._y = y;
        this._visualX = x;
        this._visualY = y;
        this._rotation = 0;
        this._targetRotation = 0;
        this._health = config.health || 4; // Quarters (1 heart)
        this._maxHealth = this._health;
        this._speed = config.speed || 1.0; // Cells per second/tick factor
        this._damage = config.damage || 4; // Quarters
        this._dead = false;

        // FSM (State Machine)
        this._fsm = {
            state: 'PATROL', // PATROL, CHASE, ATTACK, STUNNED
            timer: 0
        };

        // Events/Hooks
        this.onDeath = null;
        this.onDamage = null;

        this._config = config;
        this._id = `enemy_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }

    get x() { return this._x; }
    get y() { return this._y; }
    get visualX() { return this._visualX; }
    get visualY() { return this._visualY; }
    get isDead() { return this._dead; }

    /**
     * @virtual
     * Main update loop for decision and execution.
     */
    update(game) {
        if (this._dead) return;

        this._fsm.timer++;
        
        // Execute state logic (Decision vs Execution separation)
        this._updateAI(game);
        
        // Update visuals (Interpolation)
        this._updateVisuals();
        
        // Collision with player
        this._checkPlayerCollision(game);
    }

    /**
     * @protected
     * Separates decision logic from execution.
     */
    _updateAI(game) {
        switch (this._fsm.state) {
            case 'PATROL':
                this.executePatrol(game);
                break;
            case 'CHASE':
                this.executeChase(game);
                break;
            case 'ATTACK':
                this.executeAttack(game);
                break;
            case 'STUNNED':
                if (this._fsm.timer > 30) {
                    this._changeState('PATROL');
                }
                break;
        }
    }

    _updateVisuals() {
        // Smooth lerp for visual position
        this._visualX += (this._x - this._visualX) * 0.15;
        this._visualY += (this._y - this._visualY) * 0.15;
    }

    _checkPlayerCollision(game) {
        const dx = Math.abs(this._visualX - game.player.visualX);
        const dy = Math.abs(this._visualY - game.player.visualY);
        
        if (dx < 0.6 && dy < 0.6 && !game.player.invulnerable) {
            this.onTouchPlayer(game);
        }
    }

    _changeState(newState) {
        if (this._fsm.state === newState) return;
        this._fsm.state = newState;
        this._fsm.timer = 0;
        this.triggerEvent('STATE_CHANGE', newState);
    }

    // --- HOOKS ---

    /** @virtual */
    executePatrol(game) {}
    /** @virtual */
    executeChase(game) {}
    /** @virtual */
    executeAttack(game) {}
    
    /** @virtual */
    onTouchPlayer(game) {
        game.takeDamage('ENEMY_TOUCH', this._damage);
        
        // --- VOZ DO INIMIGO (ATAQUE) ---
        if (typeof RobotVoice !== 'undefined') RobotVoice.speakLogistic('neutral');
        
        // Kickback or state change
        this._changeState('STUNNED');
    }

    /**
     * Standard damage handler with hook.
     */
    takeDamage(amount, game) {
        if (this._dead) return;
        
        this._health -= amount;
        this.triggerEvent('DAMAGE', { amount, current: this._health });
        
        // --- VOZ DO INIMIGO (DANO) ---
        if (typeof RobotVoice !== 'undefined') RobotVoice.speakLogistic('damage');
        
        if (this._health <= 0) {
            this.die(game);
        } else {
            this._changeState('STUNNED');
        }
    }

    die(game) {
        this._dead = true;
        this.triggerEvent('DEATH', {});
        if (this.onDeath) this.onDeath(game);
        
        // --- VOZ DO INIMIGO (MORTE) ---
        if (typeof RobotVoice !== 'undefined') RobotVoice.speakLogistic('dead');
        
        // Spawn debris/particles via Graphics system
        if (window.Graphics) {
            for(let i=0; i<8; i++) {
                Graphics.spawnParticle(
                    this._visualX * 32 + 16, 
                    this._visualY * 32 + 16, 
                    this._config.color || '#ff8800', 
                    'spark'
                );
            }
        }
    }

    triggerEvent(name, data) {
        // Dispatches event for Audio/Visual systems to react independently
        const event = new CustomEvent(`enemy_${name}`, { detail: { id: this._id, enemy: this, ...data } });
        window.dispatchEvent(event);
    }

    /** @abstract */
    draw(ctx) {
        throw new Error("draw() must be implemented in subclass.");
    }
}

// --- INTERMEDIATE ARCHETYPES ---

/**
 * Enemy that follows a fixed path defined by points.
 */
class PatrollingEnemy extends EnemyBase {
    constructor(x, y, config = {}) {
        super(x, y, config);
        this._path = config.path || [{x, y}];
        this._pathIndex = 0;
        this._pathDir = 1; // 1: forward, -1: backward (for ping-pong)
        this._loopType = config.loopType || 'LOOP'; // 'LOOP' or 'PING_PONG'
        this._moveStyle = config.moveStyle || 'CONTINUOUS'; // 'CONTINUOUS' or 'PAUSE'
        this._pauseDuration = config.pauseDuration !== undefined ? config.pauseDuration : 60; // Frames to wait (60 = 1s)
        this._pauseTimer = 0;
        this._isWaiting = false;
    }

    executePatrol(game) {
        if (!this._path || this._path.length < 2) return;
        
        if (this._isWaiting) {
            this._pauseTimer--;
            if (this._pauseTimer <= 0) {
                this._isWaiting = false;
            }
            return;
        }

        const target = this._path[this._pathIndex];
        const dx = target.x - this._x;
        const dy = target.y - this._y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Generous epsilon for grid movement to prevent overshooting
        const epsilon = 0.05;

        if (dist < epsilon) {
            // Arrived at waypoint
            this._x = target.x;
            this._y = target.y;

            if (this._moveStyle === 'PAUSE') {
                this._isWaiting = true;
                this._pauseTimer = this._pauseDuration;
            }

            this._pathIndex += this._pathDir;
            
            // Handle loop and ping-pong bounds
            if (this._pathIndex >= this._path.length || this._pathIndex < 0) {
                if (this._loopType === 'LOOP') {
                    this._pathIndex = (this._pathIndex + this._path.length) % this._path.length;
                } else {
                    this._pathDir *= -1;
                    this._pathIndex += this._pathDir * 2;
                    // Clamp to safety
                    this._pathIndex = Math.max(0, Math.min(this._path.length - 1, this._pathIndex));
                }
            }
        } else {
            // Move towards waypoint
            const moveAngle = Math.atan2(dy, dx);
            this._targetRotation = moveAngle;
            const step = (this._speed / 60); // Movement per frame
            
            if (step > dist) {
                this._x = target.x;
                this._y = target.y;
            } else {
                this._x += Math.cos(moveAngle) * step;
                this._y += Math.sin(moveAngle) * step;
            }
        }
    }
}

// --- SPECIFIC IMPLEMENTATION: LOGISTIC BOT (AMAZON KIVA STYLE) ---

class LogisticBot extends PatrollingEnemy {
    constructor(x, y, config = {}) {
        // Data-driven config
        const finalConfig = {
            health: 4,
            speed: 1.5,
            damage: 1,
            isPeaceful: false,
            ...config
        };
        // Ensure strictly boolean
        finalConfig.isPeaceful = finalConfig.isPeaceful === true;
        super(x, y, finalConfig);
        this._pulse = 0;
        this._animFrame = 0;
        this._isCarryingPlayer = false;
    }

    update(game) {
        // Parent update handles state machine and AI
        super.update(game);
        
        // Smoothly rotate towards movement direction
        let angleDiff = this._targetRotation - this._rotation;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this._rotation += angleDiff * 0.15;

        // Aesthetic updates
        this._pulse = Math.sin(Date.now() * 0.005) * 0.2 + 0.8;
        this._animFrame++;

        // Carrying Logic
        if (this._config.isPeaceful && game.player.carrier === this) {
            // Keep player on top (Logic uses integers, rendering uses visual)
            game.player.x = Math.round(this._x);
            game.player.y = Math.round(this._y);
            game.player.visualX = this._visualX;
            game.player.visualY = this._visualY;
        }
    }

    _checkPlayerCollision(game) {
        if (this._config.isPeaceful) {
            // Peaceful mode: Check for "boarding"
            const dx = Math.abs(this._visualX - game.player.visualX);
            const dy = Math.abs(this._visualY - game.player.visualY);
            
            if (dx < 0.5 && dy < 0.5) {
                if (!game.player.carrier && (game.player.detachTimer || 0) <= 0) {
                    game.player.carrier = this;
                    
                    // --- VOZ DO INIMIGO (SUBIR) ---
                    if (typeof RobotVoice !== 'undefined') RobotVoice.speakLogistic('board');
                }
            }
        } else {
            // Aggressive mode: Standard damage
            super._checkPlayerCollision(game);
        }
    }

    draw(ctx) {
        const ts = 32;
        const cx = (this._visualX + 0.5) * ts;
        const cy = (this._visualY + 0.5) * ts;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this._rotation - Math.PI / 2);

        // --- FLAT DETAIL LOGISTIC BOT ---

        // 1. Lower Base (Solid Dark Steel)
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.roundRect(-13, -10, 26, 20, 4); // Match width of shell to avoid side borders
        ctx.fill();
        
        // Side Details (Vents)
        ctx.fillStyle = '#1a252f';
        for(let i=-1; i<=1; i+=2) {
            ctx.fillRect(-14, i*6-2, 2, 4);
            ctx.fillRect(12, i*6-2, 2, 4);
        }

        // 2. Main Shell (Solid Orange)
        ctx.fillStyle = '#e67e22'; // Amazon Orange
        ctx.beginPath();
        ctx.roundRect(-13, -9, 26, 18, 4);
        ctx.fill();

        // 3. Flat Panel Details (Using solid colors for depth)
        
        // Top Secondary Plate (Lighter Orange)
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.roundRect(-10, -7, 20, 14, 2);
        ctx.fill();
        
        // Hard Panel Lines (Darker Orange)
        ctx.fillStyle = '#d35400';
        ctx.fillRect(-10, -1, 20, 2); // Horizontal seam
        ctx.fillRect(-1, -7, 2, 14);  // Vertical seam
        
        // Rivets (Solid Off-White/Grey dots)
        ctx.fillStyle = '#ecf0f1';
        [[-8,-5], [8,-5], [-8,5], [8,5]].forEach(([rx, ry]) => {
            ctx.beginPath(); ctx.arc(rx, ry, 1, 0, Math.PI*2); ctx.fill();
        });

        // 4. Top Lift Hub
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Mechanical Cross Detail (Flat)
        ctx.fillStyle = '#333';
        ctx.fillRect(-6, -1, 12, 2);
        ctx.fillRect(-1, -6, 2, 12);

        // 5. Front Sensor Array (Optical Strip with Eyes) - MOVED TO FRONT
        const sensorY = 7;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.roundRect(-8, sensorY, 16, 4, 1);
        ctx.fill();
        
        // Flat "Eyes" (Red for aggressive, Cyan for peaceful)
        ctx.fillStyle = this._config.isPeaceful ? '#00f0ff' : '#e74c3c';
        const eyeAlpha = 0.7 + Math.sin(this._pulse * Math.PI) * 0.3;
        ctx.globalAlpha = eyeAlpha;
        
        // Pulse glow for aggressive
        if (!this._config.isPeaceful) {
            ctx.shadowBlur = 10 * eyeAlpha;
            ctx.shadowColor = '#e74c3c';
        }
        
        ctx.beginPath(); ctx.arc(-4, sensorY + 2, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4, sensorY + 2, 1.5, 0, Math.PI * 2); ctx.fill();
        
        ctx.shadowBlur = 0; // RESET SHADOW
        ctx.globalAlpha = 1.0;

        // 6. Rear Maintenance Port - MOVED TO REAR
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-3, -9, 6, 1);
        
        ctx.restore();
    }
}

// --- FACTORY ---

const EnemyFactory = {
    create(x, y, type, config = {}) {
        switch (type) {
            case 'logistic':
            case '∞':
                return new LogisticBot(x, y, config);
            default:
                console.warn(`Unknown enemy type: ${type}`);
                return null;
        }
    }
};

window.EnemySystem = {
    EnemyBase,
    PatrollingEnemy,
    LogisticBot,
    EnemyFactory
};
