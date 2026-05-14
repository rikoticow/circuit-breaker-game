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
        this._isDying = false;
        this._deathTimer = 0;
        this._deathDir = { x: 0, y: 0 };
        this._flashTimer = 0;

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
        this._fragmentOffsets = new Map(); // Store individual fragment physics
    }
    get x() { return this._x; }
    get y() { return this._y; }
    get visualX() { return this._visualX; }
    get visualY() { return this._visualY; }
    get isDead() { return this._dead; }
    get isIntangible() { return false; }

    /**
     * @virtual
     * Main update loop for decision and execution.
     */
    update(game) {
        if (this._isDying) {
            this._deathTimer++;
            
            // Momentum Physics for fragments (with Collision & Gravity)
            this._fragmentOffsets.forEach((frag, key) => {
                // Apply friction (air vs ground)
                const friction = frag.z > 0 ? 0.98 : 0.92;
                frag.vx *= friction;
                frag.vy *= friction;
                
                // Z-Axis Physics (Gravity)
                if (frag.z === undefined) frag.z = 0;
                if (frag.vz === undefined) frag.vz = 0;
                
                if (frag.z > 0 || Math.abs(frag.vz) > 0.1) {
                    frag.vz -= 0.35; // Gravity
                    frag.z += frag.vz;
                    if (frag.z <= 0) {
                        frag.z = 0;
                        if (Math.abs(frag.vz) > 0.5) frag.vz *= -0.4; // Bounce on ground
                        else frag.vz = 0;
                        
                        frag.vx *= 0.7; // Extra friction on impact
                        frag.vy *= 0.7;
                    }
                }

                // Calculate next position in World Pixels
                const ts = 32;
                const currentWorldX = (this._visualX + 0.5) * ts + frag.x;
                const currentWorldY = (this._visualY + 0.5) * ts + frag.y;
                
                const nx = frag.x + frag.vx;
                const ny = frag.y + frag.vy;
                
                // Tile-based Collision Check
                const targetWorldX = (this._visualX + 0.5) * ts + nx;
                const targetWorldY = (this._visualY + 0.5) * ts + ny;
                const tx = Math.floor(targetWorldX / ts);
                const ty = Math.floor(targetWorldY / ts);
                
                if (game.isTileSolid(tx, ty)) {
                    // Bounce off walls
                    if (game.isTileSolid(tx, Math.floor(currentWorldY / ts))) frag.vx *= -0.5;
                    if (game.isTileSolid(Math.floor(currentWorldX / ts), ty)) frag.vy *= -0.5;
                } else {
                    frag.x = nx;
                    frag.y = ny;
                }
            });

            // Stay for 10-15s then remove
            if (this._deathTimer > 1000) this._markedForRemoval = true;
            return;
        }
        if (this._dead) return;

        this._fsm.timer++;
        
        // Execute state logic (Decision vs Execution separation)
        this._updateAI(game);
        
        // Update visuals (Interpolation)
        this._updateVisuals();
        
        // Update timers
        if (this._flashTimer > 0) this._flashTimer--;
        
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
        // Use logical coordinates during dash for more precise hit detection
        const px = game.player.isDashing ? game.player.x : game.player.visualX;
        const py = game.player.isDashing ? game.player.y : game.player.visualY;
        const dx = Math.abs(this._visualX - px);
        const dy = Math.abs(this._visualY - py);
        
        if (dx < 0.6 && dy < 0.6) {
            if (game.player.isDashing && !this._dead) {
                // Só leva dano se ainda não foi atingido por este dash específico
                if (this._lastHitDashId !== game.player.dashId) {
                    this._deathDir = { 
                        x: (this._visualX - game.player.visualX) * 1.5, 
                        y: (this._visualY - game.player.visualY) * 1.5
                    };
                    this.takeDamage(1, game);
                    this._lastHitDashId = game.player.dashId;
                    if (!this._dead) this._changeState('STUNNED');
                }
            } else if (!game.player.invulnerable && !this._dead && this._fsm.state !== 'STUNNED') {
                this.onTouchPlayer(game);
            }
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
        game.takeDamage('ENEMY_TOUCH', this._x, this._y);
        
        // --- VOZ DO INIMIGO (ATAQUE) ---
        if (typeof RobotVoice !== 'undefined') {
            const method = this._voiceMethod || 'speakLogistic';
            if (RobotVoice[method]) RobotVoice[method]('neutral', this._x, this._y);
        }
        
        // Kickback or state change
        this._changeState('STUNNED');
    }

    /**
     * Checks if there is a clear line of sight to a target position.
     * @protected
     */
    _checkLineOfSight(game, tx, ty) {
        const x1 = this._x, y1 = this._y;
        const x2 = tx, y2 = ty;
        const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const steps = Math.ceil(dist * 2);
        for (let i = 1; i < steps; i++) {
            const checkX = x1 + (x2 - x1) * (i / steps);
            const checkY = y1 + (y2 - y1) * (i / steps);
            const cx = Math.floor(checkX);
            const cy = Math.floor(checkY);
            if (game.isTileSolid(cx, cy) || game.blocks.some(b => b.x === cx && b.y === cy)) return false;
        }
        return true;
    }

    /**
     * Standard damage handler with hook.
     */
    takeDamage(amount, game) {
        if (this._dead) return;
        
        this._health -= amount;
        this.triggerEvent('DAMAGE', { amount, current: this._health });
        
        // --- ANIME IMPACT VFX ---
        if (typeof Graphics !== 'undefined' && Graphics.createAnimeImpactConfig) {
            const vx = this._visualX * 32 + 16;
            const vy = this._visualY * 32 + 16;
            const impactConfig = Graphics.createAnimeImpactConfig(vx, vy);
            Graphics.spawnParticle(vx, vy, '#fff', 'anime-impact', true, impactConfig);
            
            // --- IMPACT SFX ---
            if (window.AudioSys && AudioSys.playAnimeImpactSFX) {
                AudioSys.playAnimeImpactSFX(this._x, this._y);
            }
        }

        // --- VOZ DO INIMIGO (DANO) ---
        if (typeof RobotVoice !== 'undefined') {
            const method = this._voiceMethod || 'speakLogistic';
            if (RobotVoice[method]) RobotVoice[method]('damage', this._x, this._y);
        }
        
        if (this._health <= 0) {
            this.die(game);
        } else {
            this._changeState('STUNNED');
        }
    }
    die(game, skipSound = false) {
        if (this._isDying) return;
        this._dead = true;
        this._isDying = true;
        this._deathTimer = 0;
        
        // Se ainda não tem direção de morte (ex: morreu por laser), pega do jogador por proximidade visual
        if (!this._deathDir || (this._deathDir.x === 0 && this._deathDir.y === 0)) {
            this._deathDir = {
                x: (this._visualX - game.player.visualX) * 1.5,
                y: (this._visualY - game.player.visualY) * 1.5
            };
        }

        this.triggerEvent('DEATH', {});
        if (this.onDeath) this.onDeath(game);
        
        // --- VOZ DO INIMIGO (MORTE) ---
        if (typeof RobotVoice !== 'undefined') {
            const method = this._voiceMethod || 'speakLogistic';
            if (RobotVoice[method]) RobotVoice[method]('dead', this._x, this._y);
        }
        
        // Spawn debris/particles via Graphics system
        if (typeof Graphics !== 'undefined') {
            const vx = this._visualX * 32 + 16;
            const vy = this._visualY * 32 + 16;
            
            // 1. High impact Anime explosion
            if (Graphics.createAnimeImpactConfig) {
                const impactConfig = Graphics.createAnimeImpactConfig(vx, vy);
                Graphics.spawnParticle(vx, vy, '#fff', 'anime-impact', true, impactConfig);
            }

            // --- SOM DE EXPLOSÃO PADRÃO ---
            console.log("EnemyBase: Triggering explosion sound. skipSound =", skipSound);
            if (!skipSound && window.AudioSys && AudioSys.explosion) {
                AudioSys.explosion(false, this._x, this._y);
            }

            // 2. Sparks and Smoke (Base layer)
            for(let i=0; i<15; i++) {
                Graphics.spawnParticle(vx, vy, '#ffaa00', 'spark');
            }
            for(let i=0; i<5; i++) {
                Graphics.spawnParticle(vx, vy, '#333', 'smoke');
            }

            // --- CÓDIGO NOVO: Efeito de fogo base para todos ---
            for(let i=0; i<18; i++) { // Aumentado em ~20% (era 15)
                const p = Graphics.spawnParticle(vx, vy, '#e67e22', 'flame'); 
                if (p) p.size *= 1.2; // 20% maior
            }
            // ---------------------------------------------------
            
            // Camera Shake for impact
            if (game.screenShakeForce !== undefined) {
                game.screenShakeForce = 0.6; // Reduzido (era 12) pois multiplica pelo timer
                game.screenShakeTimer = 10;
            }
        }

        // --- SOM DE EXPLOSÃO (Movido para fora do bloco Graphics) ---
        if (!skipSound && window.AudioSys && AudioSys.explosion) {
            AudioSys.explosion(false, this._x, this._y);
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

        // Safety check for path bounds
        if (this._pathIndex < 0 || this._pathIndex >= this._path.length) {
            this._pathIndex = 0;
        }

        const target = this._path[this._pathIndex];
        if (!target) return; // Should not happen with length < 2 check but stay safe

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
            // Movimentação reta em direção ao waypoint (Permite diagonal se o alvo estiver na diagonal)
            const dx = target.x - this._x;
            const dy = target.y - this._y;
            
            const moveAngle = Math.atan2(dy, dx);
            this._targetRotation = moveAngle;
            
            const step = (this._speed / 60); // Movimento por frame
            const distToTarget = Math.sqrt(dx*dx + dy*dy);
            
            // Move em linha reta direta (diagonal tudo bem, contanto que seja reto)
            const actualStep = Math.min(distToTarget, step);
            const nextX = this._x + Math.cos(moveAngle) * actualStep;
            const nextY = this._y + Math.sin(moveAngle) * actualStep;
            
            // Checa colisão com blocos (caixas) ou paredes ao mudar de célula
            const currentCellX = Math.floor(this._x);
            const currentCellY = Math.floor(this._y);
            const nextCellX = Math.floor(nextX);
            const nextCellY = Math.floor(nextY);
            
            let canMove = true;
            if (nextCellX !== currentCellX || nextCellY !== currentCellY) {
                if (game.isTileSolid(nextCellX, nextCellY) || game.blocks.some(b => b.x === nextCellX && b.y === nextCellY)) {
                    canMove = false;
                }
            }

            if (canMove) {
                this._x = nextX;
                this._y = nextY;
            } else {
                // Obstruído: inverte a rota da patrulha para contornar ou alternar
                this._pathDir *= -1;
                this._pathIndex += this._pathDir;
                if (this._pathIndex >= this._path.length || this._pathIndex < 0) {
                    this._pathIndex = Math.max(0, Math.min(this._path.length - 1, this._pathIndex));
                }
            }
        }
    }

    /**
     * Moves towards a target in grid steps (Snappy-Step)
     * Matches player movement patterns.
     */
    _moveGrid(tx, ty, game, speedMult = 1.0) {
        const step = (this._speed * speedMult) / 60;
        
        // If we are already at the target tile, nothing to do
        if (Math.abs(this._x - tx) < 0.05 && Math.abs(this._y - ty) < 0.05) {
            this._x = tx;
            this._y = ty;
            return true;
        }

        // Determine priority axis (like the player's snappy-step)
        const dx = tx - this._x;
        const dy = ty - this._y;

        if (Math.abs(dx) > Math.abs(dy)) {
            // Move X
            const dir = Math.sign(dx);
            const nx = this._x + dir * step;
            // Check wall collision if moving to a NEW tile
            if (Math.floor(nx) !== Math.floor(this._x)) {
                if (!game.isTilePassable(Math.floor(this._x) + dir, Math.floor(this._y), [this], dir, 0, true)) {
                    return false; // Blocked by wall
                }
            }
            this._x = nx;
            this._targetRotation = dir > 0 ? 0 : Math.PI;
        } else {
            // Move Y
            const dir = Math.sign(dy);
            const ny = this._y + dir * step;
            if (Math.floor(ny) !== Math.floor(this._y)) {
                if (!game.isTilePassable(Math.floor(this._x), Math.floor(this._y) + dir, [this], 0, dir, true)) {
                    return false; // Blocked by wall
                }
            }
            this._y = ny;
            this._targetRotation = dir > 0 ? Math.PI/2 : -Math.PI/2;
        }
        return false;
    }
}

// --- SPECIFIC IMPLEMENTATION: LOGISTIC BOT (AMAZON KIVA STYLE) ---

class LogisticBot extends PatrollingEnemy {
    constructor(x, y, config = {}) {
        // Data-driven config
        const finalConfig = {
            health: 2,
            speed: 1.5,
            damage: 1,
            isPeaceful: false,
            ...config
        };
        // Ensure strictly boolean
        super(x, y, finalConfig);
        this._pulse = 0;
        this._animFrame = 0;
        this._isCarryingPlayer = false;
        this._voiceMethod = 'speakLogistic';
        this._debrisPalette = ['#e67e22', '#d35400', '#2c3e50', '#1a252f'];
    }

    update(game) {
        if (this._isDying) {
            super.update(game);
            return;
        }
        if (this._dead) return;

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
                    if (typeof RobotVoice !== 'undefined') RobotVoice.speakLogistic('board', this._x, this._y);
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
        
        // --- SHATTER LOGIC (Procedural Division) ---
        const isDying = this._isDying;
        const dt = this._deathTimer;
        const dDir = this._deathDir;
        
        // Helper to apply procedural transformation to a component
        const applyFragment = (index, weight = 1.0) => {
            if (!isDying) return;
            
            // Interaction Physics
            const key = Math.floor(index * 10);
            if (!this._fragmentOffsets.has(key)) {
                this._fragmentOffsets.set(key, { x: 0, y: 0, vx: 0, vy: 0, weight });
            }
            const fOff = this._fragmentOffsets.get(key);

            // 1. Initial Blast (0-45 frames)
            const blastLimit = 45;
            const blastProgress = Math.min(dt / blastLimit, 1);
            const ease = 1 - Math.pow(1 - blastProgress, 3);
            const force = ease * 35 * weight;
            const angle = (index * 1.37) % (Math.PI * 2);
            const bx = (Math.cos(angle) * force) + (dDir.x * force * 1.2);
            const by = (Math.sin(angle) * force) + (dDir.y * force * 1.2);
            ctx.translate(bx + fOff.x, by + fOff.y);
            ctx.rotate(ease * index * 0.5);

            // 2. Persistence & Random Shrink (600-1000 frames)
            const shrinkStart = 600 + (index * 73) % 300; // 10s to 15s delay
            let scale = 1.0;
            if (dt > shrinkStart) {
                const shrinkProgress = Math.min((dt - shrinkStart) / 60, 1);
                scale = 1 - shrinkProgress;
            }
            ctx.scale(scale, scale);
        };

        ctx.rotate(this._rotation - Math.PI / 2);

        // --- FLAT DETAIL LOGISTIC BOT ---

        // 1. Lower Base
        ctx.save();
        applyFragment(1.1, 0.4);
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath(); ctx.roundRect(-13, -10, 13, 10, 4); ctx.fill(); // TL
        ctx.restore();

        ctx.save();
        applyFragment(1.2, 0.5);
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath(); ctx.roundRect(0, -10, 13, 10, 4); ctx.fill(); // TR
        ctx.restore();

        ctx.save();
        applyFragment(1.3, 0.6);
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath(); ctx.roundRect(-13, 0, 13, 10, 4); ctx.fill(); // BL
        ctx.restore();

        ctx.save();
        applyFragment(1.4, 0.7);
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath(); ctx.roundRect(0, 0, 13, 10, 4); ctx.fill(); // BR
        ctx.restore();
        
        // Side Details (Vents)
        ctx.save();
        applyFragment(2.1, 0.8);
        ctx.fillStyle = '#1a252f';
        ctx.fillRect(-14, -8, 2, 4);
        ctx.restore();

        ctx.save();
        applyFragment(2.2, 0.8);
        ctx.fillStyle = '#1a252f';
        ctx.fillRect(-14, 4, 2, 4);
        ctx.restore();

        ctx.save();
        applyFragment(2.3, 0.8);
        ctx.fillStyle = '#1a252f';
        ctx.fillRect(12, -8, 2, 4);
        ctx.restore();

        ctx.save();
        applyFragment(2.4, 0.8);
        ctx.fillStyle = '#1a252f';
        ctx.fillRect(12, 4, 2, 4);
        ctx.restore();

        // 2. Main Shell
        ctx.save();
        applyFragment(3, 0.6);
        ctx.fillStyle = '#e67e22'; 
        ctx.beginPath();
        ctx.roundRect(-13, -9, 26, 18, 4);
        ctx.fill();
        
        // Top Secondary Plate
        ctx.fillStyle = '#f39c12';
        ctx.beginPath();
        ctx.roundRect(-10, -7, 20, 14, 2);
        ctx.fill();
        ctx.restore();
        
        // 3. Detail lines
        ctx.save();
        applyFragment(4, 0.9);
        ctx.fillStyle = '#d35400';
        ctx.fillRect(-10, -1, 20, 2); 
        ctx.fillRect(-1, -7, 2, 14);  
        ctx.restore();
        
        // 4. Rivets
        ctx.save();
        applyFragment(5, 1.2);
        ctx.fillStyle = '#ecf0f1';
        [[-8,-5], [8,-5], [-8,5], [8,5]].forEach(([rx, ry]) => {
            ctx.beginPath(); ctx.arc(rx, ry, 1, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();

        // 5. Top Lift Hub
        ctx.save();
        applyFragment(6, 0.7);
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 6. Front Sensor Array
        ctx.save();
        applyFragment(7, 1.1);
        const sensorY = 7;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.roundRect(-8, sensorY, 16, 4, 1);
        ctx.fill();
        
        ctx.fillStyle = this._config.isPeaceful ? '#00f0ff' : '#e74c3c';
        const eyeAlpha = (0.7 + Math.sin(this._pulse * Math.PI) * 0.3) * (isDying ? (1 - dt/40) : 1);
        ctx.globalAlpha = eyeAlpha;
        
        if (!this._config.isPeaceful && !isDying) {
            ctx.shadowBlur = 10 * eyeAlpha;
            ctx.shadowColor = '#e74c3c';
        }
        
        ctx.beginPath(); ctx.arc(-4, sensorY + 2, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4, sensorY + 2, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.restore();
    }
}

// --- SPECIFIC IMPLEMENTATION: REPAIR UNIT (🔧) ---

class RepairUnit extends PatrollingEnemy {
    constructor(x, y, config = {}) {
        const finalConfig = {
            health: 4, // Stockier but balanced
            speed: 1.2, // Normal patrol speed
            damage: 2,  // Contact damage
            ...config
        };
        super(x, y, finalConfig);
        this._approachSpeed = 3.0; // Reduzido para ser menos frenético
        this._patrolSpeed = 1.5;   // Patrulha mais lenta e deliberada
        this._scanRadius = 4;
        this._resetRadius = 6;
        this._animFrame = 0;
        this._flashTimer = 0;
        this._voiceMethod = 'speakRepair';
        this._targetGridX = x;
        this._targetGridY = y;
        this._stepTimer = 0; // Pausa entre passos no grid
        this._nextVoiceTimer = 0;
        this._debrisPalette = ['#3498db', '#2980b9', '#2c3e50', '#ecf0f1'];
    }

    _updateAI(game) {
        if (!game.player) return;

        const distToPlayer = Math.sqrt(
            Math.pow(this._x - (game.player.x || 0), 2) + 
            Math.pow(this._y - (game.player.y || 0), 2)
        );

        switch (this._fsm.state) {
            case 'PATROL':
                this._executePatrolSnappy(game);
                
                // Verificação de Campo de Visão (FOV)
                if (distToPlayer < this._scanRadius) {
                    const angleToPlayer = Math.atan2(game.player.y - this._y, game.player.x - this._x);
                    let angleDiff = angleToPlayer - this._targetRotation;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                    // Só detecta se estiver num arco de ~120 graus à frente (PI/3 para cada lado)
                    if (Math.abs(angleDiff) < Math.PI / 3) {
                        this._changeState('LOCKED');
                        this._triggerVoice('Anomalia detectada', game);
                    }
                }
                break;

            case 'LOCKED':
                // Scan visual for 1s (60 frames)
                if (this._fsm.timer > 60) {
                    this._changeState('APPROACH');
                    this._triggerVoice('Iniciando correção', game);
                }
                if (distToPlayer > this._resetRadius) {
                    this._changeState('PATROL');
                }
                break;

            case 'APPROACH':
                // Check repair range FIRST to prevent getting stuck in movement logic
                if (distToPlayer < 0.7) {
                    this._changeState('REPAIR');
                    break;
                }
                
                this._moveGridSnappy(game.player.x, game.player.y, this._approachSpeed, game);
                
                if (distToPlayer > this._resetRadius) {
                    this._changeState('PATROL');
                }
                break;

            case 'REPAIR':
                this._executeRepair(game);
                break;

            case 'COOLDOWN':
                if (this._fsm.timer > 120) { // 2s
                    this._changeState('APPROACH'); // Back to chase if player still close
                }
                break;

            case 'STUNNED':
                if (this._fsm.timer > 40) {
                    this._changeState('APPROACH');
                }
                break;
        }
    }

    _changeState(newState) {
        this._fsm.state = newState;
        this._fsm.timer = 0;

        // Resetar o alvo do grid ao entrar em perseguição para evitar coordenadas antigas
        if (newState === 'APPROACH') {
            this._targetGridX = Math.round(this._x);
            this._targetGridY = Math.round(this._y);
        }
    }

    _executePatrolSnappy(game) {
        if (!this._path || this._path.length < 2) return;
        
        const target = this._path[this._pathIndex];
        const dx = target.x - this._x;
        const dy = target.y - this._y;
        const distToWaypoint = Math.sqrt(dx * dx + dy * dy);

        // Se chegou no waypoint, atualiza o índice
        if (distToWaypoint < 0.05) {
            this._pathIndex += this._pathDir;
            if (this._pathIndex >= this._path.length || this._pathIndex < 0) {
                if (this._loopType === 'LOOP') {
                    this._pathIndex = (this._pathIndex + this._path.length) % this._path.length;
                } else {
                    this._pathDir *= -1;
                    this._pathIndex += this._pathDir * 2;
                    this._pathIndex = Math.max(0, Math.min(this._path.length - 1, this._pathIndex));
                }
            }
            return;
        }

        this._moveGridSnappy(target.x, target.y, this._patrolSpeed, game);
    }

    _moveGridSnappy(targetX, targetY, speed, game) {
        // Se estiver pausado entre passos, apenas diminui o timer
        if (this._stepTimer > 0) {
            this._stepTimer--;
            return;
        }

        // Verifica distância para o alvo atual no grid
        const dtx = (this._targetGridX || this._x) - this._x;
        const dty = (this._targetGridY || this._y) - this._y;
        const distToTarget = Math.sqrt(dtx*dtx + dty*dty);

        // Se chegou ao tile alvo (ou está quase lá), define o próximo tile
        if (distToTarget < 0.05) {
            this._x = this._targetGridX;
            this._y = this._targetGridY;
            
            const dx = targetX - this._x;
            const dy = targetY - this._y;
            
            // MOVIMENTO ESTRITAMENTE CARDINAL (4 direções)
            if (dx !== 0 || dy !== 0) {
                const curGridX = Math.round(this._x);
                const curGridY = Math.round(this._y);

                if (Math.abs(dx) >= Math.abs(dy)) {
                    this._targetGridX = curGridX + Math.sign(dx);
                    this._targetGridY = curGridY;
                } else {
                    this._targetGridX = curGridX;
                    this._targetGridY = curGridY + Math.sign(dy);
                }
                
                // Pausa mecânica após atingir o tile
                this._stepTimer = 15; // Aumentado para 15 (~0.25s) para mais "peso"
            }
        }

        // Move com curva de suavização (Easing/Lerp) em direção ao próximo ponto do grid
        const dx = this._targetGridX - this._x;
        const dy = this._targetGridY - this._y;
        const moveDist = Math.sqrt(dx*dx + dy*dy);
        
        if (moveDist > 0) {
            const moveAngle = Math.atan2(dy, dx);
            this._targetRotation = moveAngle;
            
            // Fator de suavização (escalado pela velocidade)
            // 0.2 para patrulha, ~0.4 para perseguição
            const lerpFactor = Math.min(0.8, (speed / 10)); 
            
            this._x += dx * lerpFactor;
            this._y += dy * lerpFactor;
        }
    }

    _executeRepair(game) {
        // Contact attack with source-relative knockback
        if (game.takeDamage) {
            game.takeDamage('REPAIR_SHORT_CIRCUIT', this._x, this._y);
        }
        this._triggerVoice('Anomalia eliminada', game);
        this._changeState('COOLDOWN');
    }

    _triggerVoice(phrase, game) {
        // Agora apenas emite o som procedural (efeito), sem balão de texto
        if (typeof RobotVoice !== 'undefined') {
            const method = this._voiceMethod || 'speakLogistic';
            if (RobotVoice[method]) RobotVoice[method]('neutral', this._x, this._y);
        }
    }

    draw(ctx) {
        this._animFrame++;
        // Smoothly rotate towards movement direction
        let angleDiff = this._targetRotation - this._rotation;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this._rotation += angleDiff * 0.1;

        if (typeof Graphics !== 'undefined' && Graphics.drawRepairUnit) {
            Graphics.drawRepairUnit(this._visualX, this._visualY, this._rotation, game.frame, this._fsm.state, this._flashTimer, this._isDying, this._deathTimer, this._deathDir, this._fragmentOffsets);
        } else {
            // Fallback drawing if Graphics extension isn't loaded yet
            ctx.fillStyle = '#3498db';
            ctx.fillRect(this._visualX * 32 + 4, this._visualY * 32 + 4, 24, 24);
        }
    }
}

// --- DATA COURIER (📦) ---

class DataCourier extends PatrollingEnemy {
    constructor(x, y, config = {}) {
        const finalConfig = {
            speed: 2.0,
            damage: 4,
            ...config
        };
        super(x, y, finalConfig);
        this._finalConfig = finalConfig;
        
        this._fsm.state = 'DELIVER';
        this._animFrame = 0;
        this._flashTimer = 0;
        this._voiceMethod = 'speakCourier';
        this._evadeTimer = 0;
        this._dashCooldown = 0;
        this._isDashing = false;
        this._dashTimer = 0;
        this._dashDir = {x:0, y:0};
        this._dashChargeTimer = 0;
        this._isCharging = false;
        this._shootTimer = 0;
        this._debrisPalette = ['#00d4aa', '#00a088', '#2c3e50', '#ffffff'];
    }

    onTouchPlayer(game) {
        // Data Courier no longer deals contact damage, it's too fragile!
        // Instead, it panics and tries to flee
        if (typeof RobotVoice !== 'undefined') RobotVoice.speakCourier('scared', this._x, this._y);
        this._changeState('EVADE');
    }

    update(game) {
        if (this._isDying) {
            super.update(game);
            return;
        }
        if (this._dead) return;
        if (this._dashCooldown > 0) this._dashCooldown--;
        
        // Handle Dash Charging (Telegraph)
        if (this._dashChargeTimer > 0) {
            this._dashChargeTimer--;
            this._isCharging = true;
            
            // Voice at the very start of charge
            if (this._dashChargeTimer === 19 && typeof RobotVoice !== 'undefined') {
                RobotVoice.speakCourier('scared', this._x, this._y);
            }

            if (this._dashChargeTimer === 0) {
                this._isDashing = true;
                this._dashTimer = 0;
                this._isCharging = false;
            }
            
            // Bypass _updateAI while charging to stay stationary
            this._fsm.timer++;
            this._updateVisuals();
            this._checkPlayerCollision(game);
            return; 
        } else {
            if (this._isDashing) {
                this._dashTimer++;
                const step = 0.3; // 2 tiles in ~7 frames
                const nx = this._x + this._dashDir.x * step;
                const ny = this._y + this._dashDir.y * step;
                
                if (game.isTilePassable(Math.floor(nx), Math.floor(ny), [this], this._dashDir.x, this._dashDir.y, true)) {
                    this._x = nx;
                    this._y = ny;
                    
                    // Damage player on dash collision
                    const px = game.player.visualX;
                    const py = game.player.visualY;
                    if (Math.abs(this._x - px) < 0.6 && Math.abs(this._y - py) < 0.6) {
                        if (!game.player.invulnerable) {
                            game.takeDamage('ENEMY_DASH', this._x, this._y);
                            this._isDashing = false; // Stop dash on hit
                            this._changeState('COOLDOWN');
                        }
                    }
                } else {
                    this._isDashing = false;
                }
                
                if (this._dashTimer > 8) {
                    this._isDashing = false;
                    this._changeState('COOLDOWN');
                }
            }
        }
        
        super.update(game);
    }

    _updateAI(game) {
        if (!game.player) return;

        const distToPlayer = Math.sqrt(
            Math.pow(this._x - game.player.x, 2) + 
            Math.pow(this._y - game.player.y, 2)
        );

        // Verifica se o jogador está olhando para o Courier
        const angleToCourier = Math.atan2(this._y - game.player.y, this._x - game.player.x);
        const playerLookAngle = game.player.dir * (Math.PI / 2);
        let angleDiff = angleToCourier - playerLookAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        const hasLoS = this._checkLineOfSight(game, game.player.x, game.player.y);
        const isPlayerLooking = hasLoS && Math.abs(angleDiff) < Math.PI / 3 && distToPlayer < 10;

        switch (this._fsm.state) {
            case 'DELIVER':
                // Safety check for path bounds
                if (this._pathIndex < 0 || this._pathIndex >= this._path.length) {
                    this._pathIndex = 0;
                }

                const target = this._path[this._pathIndex];
                if (!target) {
                    this._changeState('EVADE'); // Failsafe
                    break;
                }

                const arrived = this._moveGrid(target.x, target.y, game);
                
                if (arrived) {
                    if (this._moveStyle === 'PAUSE') {
                        this._isWaiting = true;
                        this._pauseTimer = this._pauseDuration;
                    }
                    this._pathIndex = (this._pathIndex + this._pathDir + this._path.length) % this._path.length;
                }

                if (hasLoS) {
                    if (distToPlayer < 5) {
                        this._changeState('EVADE');
                    } else if (distToPlayer < 9) {
                        if (!isPlayerLooking) this._changeState('AMBUSH');
                        else this._changeState('SHOOT');
                    }
                }
                break;

            case 'AMBUSH':
                // Move towards player aggressively
                this._moveGrid(game.player.x, game.player.y, game, 1.2);
                this._targetRotation = Math.atan2(game.player.y - this._y, game.player.x - this._x);
                
                // If player turns around, panic and retreat!
                if (isPlayerLooking && distToPlayer < 6) {
                    if (typeof RobotVoice !== 'undefined') RobotVoice.speakCourier('scared', this._x, this._y);
                    this._changeState('EVADE');
                    return;
                }
                
                // If close enough, strike!
                if (distToPlayer < 1.3) {
                    game.takeDamage('AMBUSH_STRIKE', this._x, this._y); 
                    if (typeof RobotVoice !== 'undefined') RobotVoice.speakCourier('neutral', this._x, this._y);
                    this._changeState('EVADE'); // Run away
                }
                
                if (distToPlayer > 10) this._changeState('DELIVER');
                break;

            case 'SHOOT':
                // Face the player
                this._targetRotation = Math.atan2(game.player.y - this._y, game.player.x - this._x);
                
                if (this._fsm.timer > 40) { // Aim time
                    // Fire Fragment Purge
                    if (window.LauncherSystem && window.LauncherSystem.ProjectileFactory) {
                        const proj = window.LauncherSystem.ProjectileFactory.create(
                            this._x * 32 + 16,
                            this._y * 32 + 16,
                            this._targetRotation,
                            'data-shard',
                            5, // Velocidade restaurada (era o parâmetro speed, não damage)
                            this
                        );
                        game.projectiles.push(proj);
                        if (typeof RobotVoice !== 'undefined') RobotVoice.speakCourier('neutral', this._x, this._y);
                        this._flashTimer = 5; // Muzzle flash effect
                    }
                    this._changeState('COOLDOWN');
                }

                if (distToPlayer < 4 && hasLoS) {
                    this._changeState('EVADE');
                } else if (!isPlayerLooking && distToPlayer < 7 && hasLoS) {
                    this._changeState('AMBUSH');
                }
                break;

            case 'EVADE':
                this._executeGridEvade(game);
                
                // If player is looking away while we evade, we might strike back!
                if (!isPlayerLooking && distToPlayer < 6 && this._fsm.timer > 60) {
                    this._changeState('AMBUSH');
                    return;
                }

                if (distToPlayer > 8) this._changeState('DELIVER');
                else if (distToPlayer > 4 && this._fsm.timer > 30) this._changeState('SHOOT');
                break;

            case 'ATTACK':
                // Legacy state - redirect to EVADE
                this._changeState('EVADE');
                break;

            case 'COOLDOWN':
                this._executeGridEvade(game); 
                if (this._fsm.timer > 180) {
                    this._changeState('DELIVER');
                }
                break;

            case 'STUNNED':
                if (this._fsm.timer > 40) {
                    this._changeState('EVADE');
                }
                break;
        }
    }

    _executeGridEvade(game) {
        // Find best cardinal direction to flee
        const dirs = [
            {dx: 1, dy: 0, rot: 0}, {dx: -1, dy: 0, rot: Math.PI},
            {dx: 0, dy: 1, rot: Math.PI/2}, {dx: 0, dy: -1, rot: -Math.PI/2}
        ];
        
        let bestDir = null;
        let maxDist = -1;

        for (const d of dirs) {
            const nx = Math.floor(this._x) + d.dx;
            const ny = Math.floor(this._y) + d.dy;
            if (game.isTilePassable(nx, ny, [this], d.dx, d.dy, true)) {
                const dist = Math.pow(nx - game.player.x, 2) + Math.pow(ny - game.player.y, 2);
                if (dist > maxDist) {
                    maxDist = dist;
                    bestDir = d;
                }
            }
        }

        if (bestDir) {
            // Chance to Micro-Dash if player is close
            const dist = Math.sqrt(Math.pow(this._x - game.player.x, 2) + Math.pow(this._y - game.player.y, 2));
            if (dist < 3 && this._dashCooldown <= 0 && !this._isDashing && this._dashChargeTimer <= 0) {
                this._dashChargeTimer = 20; // 0.3s warning
                this._dashDir = {x: bestDir.dx, y: bestDir.dy};
                this._dashCooldown = 150; // Increased cooldown
                return;
            }

            const tx = Math.floor(this._x) + bestDir.dx;
            const ty = Math.floor(this._y) + bestDir.dy;
            this._moveGrid(tx, ty, game, 1.3);
        } else {
            // Trapped! Try to jitter or just wait
            this._targetRotation += 0.2;
        }
    }

    draw(ctx) {
        this._animFrame++;
        // Smoothly rotate towards movement direction
        let angleDiff = this._targetRotation - this._rotation;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this._rotation += angleDiff * 0.15;

        if (typeof Graphics !== 'undefined' && Graphics.drawDataCourier) {
            const visualState = (this._isCharging && !this._isDying) ? 'CHARGING' : this._fsm.state;
            Graphics.drawDataCourier(this._visualX, this._visualY, this._rotation, this._animFrame, visualState, this._flashTimer, this._isDying, this._deathTimer, this._deathDir, this._fragmentOffsets);
        } else {
            ctx.fillStyle = '#00d4aa';
            ctx.fillRect(this._visualX * 32 + 8, this._visualY * 32 + 8, 16, 16);
        }
    }
}

// --- WELD BOT (🔥) ---

class WeldBot extends PatrollingEnemy {
    constructor(x, y, config = {}) {
        const finalConfig = {
            health: 4,
            speed: 1.5, // Aumentado de 1.0 para 1.5 para uma perseguição mais "agressiva"
            damage: 1, // Base damage for contact, but weld has ticks
            ...config
        };
        super(x, y, finalConfig);
        this._voiceMethod = 'speakWeld'; 
        this._animFrame = 0;
        this._rotation = 0;
        this._targetRotation = 0;
        this._weldRange = 3.5;
        this._detectRange = 6;
        this._debrisPalette = ['#7f8c8d', '#c0392b', '#2c3e50', '#e67e22'];
        this._spottedPlayer = false; // Flag para evitar spam de voz ao detectar
        this._isMeltdown = false;
        this._meltdownTimer = 0;
    }

    takeDamage(amount, game) {
        if (this._dead) return;

        // Check if hit is from behind (vulnerable tanks)
        const dx = game.player.x - this._x;
        const dy = game.player.y - this._y;
        const angleToPlayer = Math.atan2(dy, dx);
        
        let angleDiff = angleToPlayer - this._rotation;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Player is behind if angleDiff is far from 0 (front)
        // abs(angleDiff) > 2.35 rad (~135 degrees) means player is in the 90-degree arc behind him
        if (Math.abs(angleDiff) > 2.35) {
            super.takeDamage(amount, game);
        } else {
            // Frontal hit: shield effect (invulneravel)
            this._flashTimer = 5; // Minimal flash to show hit was registered but absorbed
            if (this._fsm.timer % 3 === 0 && window.Graphics) {
                Graphics.spawnParticle(this._visualX * 32 + 16, this._visualY * 32 + 16, '#7f8c8d', 'spark');
            }
            // Minimal kickback or sound could be added here if desired
        }
    }

    update(game) {
        if (this._isMeltdown) {
            this._meltdownTimer++;
            
            const vx = this._x * 32 + 16;
            const vy = this._y * 32 + 16;
            
            // Efeitos de meltdown (Sparks e Smoke que o usuário confirmou que funcionam)
            if (game.frame % 3 === 0) {
                Graphics.spawnParticle(vx + (Math.random()-0.5)*20, vy + (Math.random()-0.5)*20, '#ffaa00', 'spark');
            }
            if (game.frame % 10 === 0) {
                Graphics.spawnParticle(vx, vy, '#555', 'smoke');
            }
            
            // Visual shake do bot antes de explodir
            this._visualX = this._x + (Math.random() - 0.5) * 0.15;
            this._visualY = this._y + (Math.random() - 0.5) * 0.15;

            // Clímax: Explosão e Morte real
            if (this._meltdownTimer >= 180) { // 3 segundos
                this._explode(game);
                this._isMeltdown = false;
                super.die(game, true); // True = skip standard explosion sound
            }
            return;
        }

        if (this._isDying) {
            super.update(game);
            return;
        }
        if (this._dead) return;
        super.update(game);
        this._animFrame++;
        
        // Smooth rotation
        let angleDiff = this._targetRotation - this._rotation;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this._rotation += angleDiff * 0.1;
    }

    die(game) {
        if (this._isMeltdown || this._isDying) return;
        
        // Inicia sequência de auto-destruição
        this._isMeltdown = true;
        this._meltdownTimer = 0;
        this._dead = true; // Logicamente morto (para de agir)
        
        if (typeof RobotVoice !== 'undefined') RobotVoice.speakWeld('dead', this._x, this._y);
        
        // --- WHISTLE CHARGE ---
        if (window.AudioSys && AudioSys.playMeltdownCharge) {
            AudioSys.playMeltdownCharge(3, this._x, this._y); // 3 segundos de carga
        }
        
        // Feedback imediato do dano fatal
        if (game.screenShakeForce !== undefined) {
            game.screenShakeForce = 15;
            game.screenShakeTimer = 10;
        }
    }

    _explode(game) {
        const explosionRadius = 2.5; // Distância em tiles
        const cx = this._visualX * 32 + 16;
        const cy = this._visualY * 32 + 16;

        // Visual Effects
        if (typeof Graphics !== 'undefined') {
            // Tremor de tela equilibrado
            if (game.screenShakeForce !== undefined) {
                game.screenShakeForce = 1.2; // Reduzido drasticamente (era 35)
                game.screenShakeTimer = 20;
            }

            // 1. Núcleo da Explosão (Anime Impact) - Reduzido 50%
            if (Graphics.createAnimeImpactConfig) {
                const config = Graphics.createAnimeImpactConfig(cx, cy);
                config.radius = 24; // Reduzido mais 20% (escala global menor)
                config.color = '#ff6600';
                Graphics.spawnParticle(cx, cy, '#fff', 'anime-impact', true, config);
            }

            // 2. Onda de fogo gigante (Reduzido 50%)
            for (let i = 0; i < 30; i++) { // Menos partículas (era 50)
                const p = Graphics.spawnParticle(cx, cy, '#ff4400', 'flame');
                if (p) {
                    const angle = Math.random() * Math.PI * 2;
                    const force = 3 + Math.random() * 5;
                    p.vx = Math.cos(angle) * force;
                    p.vy = Math.sin(angle) * force;
                    p.size = 6 + Math.random() * 8; // Reduzido (era 12-27)
                    p.life = 0.8;
                }
            }
            
            // 3. Faíscas Brilhantes para o "flash"
            for (let i = 0; i < 30; i++) {
                const p = Graphics.spawnParticle(cx, cy, '#ffff00', 'spark');
                if (p) {
                    p.vx *= 3;
                    p.vy *= 3;
                }
            }

            // 4. Estilhaços extras do tanque
            for (let i = 0; i < 20; i++) {
                Graphics.spawnParticle(cx, cy, this._debrisPalette[1], 'shatter');
            }

            // --- SOM DE EXPLOSÃO (GRANDE E SUJO) ---
            if (window.AudioSys && AudioSys.explosion) AudioSys.explosion(true, this._x, this._y);
        }

        // AoE Player
        if (game.player && !game.player.isDead) {
            const distToPlayer = Math.sqrt(
                Math.pow(this._x - game.player.x, 2) + 
                Math.pow(this._y - game.player.y, 2)
            );
            
            if (distToPlayer <= explosionRadius) {
                game.takeDamage('WELD_BURN', this._x, this._y);
            }
        }

        // AoE Enemies
        if (game.enemies) {
            for (const otherEnemy of game.enemies) {
                if (otherEnemy !== this && !otherEnemy._dead) {
                    const distToEnemy = Math.sqrt(
                        Math.pow(this._x - otherEnemy.x, 2) + 
                        Math.pow(this._y - otherEnemy.y, 2)
                    );
                    
                    if (distToEnemy <= explosionRadius) {
                        otherEnemy._deathDir = {
                            x: (otherEnemy.visualX - this._visualX) * 2,
                            y: (otherEnemy.visualY - this._visualY) * 2
                        };
                        otherEnemy.takeDamage(4, game); 
                    }
                }
            }
        }
    }

    _updateAI(game) {
        if (!game.player) return;

        const distToPlayer = Math.sqrt(
            Math.pow(this._x - game.player.x, 2) + 
            Math.pow(this._y - game.player.y, 2)
        );

        switch (this._fsm.state) {
            case 'PATROL':
                this.executePatrol(game);
                if (distToPlayer < this._detectRange && this._checkLineOfSight(game, game.player.x, game.player.y)) {
                    if (!this._spottedPlayer) {
                        if (typeof RobotVoice !== 'undefined') RobotVoice.speakWeld('detect', this._x, this._y);
                        this._spottedPlayer = true;
                    }
                    this._changeState('PURSUIT');
                }
                break;

            case 'PURSUIT':
                const hasLoS = this._checkLineOfSight(game, game.player.x, game.player.y);
                
                // Lógica de Raycast: Se tem linha de visão e está no alcance, ataca!
                if (hasLoS && distToPlayer < 3.2) {
                    this._changeState('DETECT');
                } else {
                    // Senão, continua se aproximando em L
                    this._executeContinuousLMovement(game);
                }

                // Desiste se o jogador fugir para muito longe ou sumir por muito tempo
                if (distToPlayer > this._detectRange * 1.5 || (!hasLoS && this._fsm.timer > 180)) {
                    if (typeof RobotVoice !== 'undefined') RobotVoice.speakWeld('secured', this._x, this._y);
                    this._spottedPlayer = false; // Reset da flag ao perder o jogador
                    this._changeState('PATROL');
                }
                break;

            case 'DETECT':
                if (this._fsm.timer === 1) {
                    // Snap à posição exata do grid ao começar a telegrafar o ataque
                    this._x = Math.round(this._x);
                    this._y = Math.round(this._y);

                    // Removido voice call aqui para evitar "Area assegurada" ao detectar o jogador
                    // Trava a rotação no grid de 90 graus apenas no primeiro frame
                    const rawAngleDet = Math.atan2(game.player.y - this._y, game.player.x - this._x);
                    this._targetRotation = Math.round(rawAngleDet / (Math.PI / 2)) * (Math.PI / 2);
                }
                
                if (this._fsm.timer > 12) { // Reduzido de 20 para 12 frames
                    this._changeState('AIM');
                }
                break;

            case 'AIM':
                // Rotação travada durante o carregamento (user request)
                if (this._fsm.timer > 12) { // Reduzido de 20 para 12 frames
                    this._changeState('WELD');
                }
                break;

            case 'WELD':
                if (this._fsm.timer === 1) {
                    if (typeof RobotVoice !== 'undefined') RobotVoice.speakWeld('weld', this._x, this._y);
                    if (window.AudioSys && AudioSys.playFlamethrower) AudioSys.playFlamethrower(5, this._x, this._y);
                }
                
                // Keep looking at the same spot once welding starts (travado)
                // this._targetRotation is NOT updated here to keep him fixed
                
                // Damage Logic
                if (this._fsm.timer % 10 === 0) { // Tick every 10 frames (~0.16s)
                    const sweep = Math.sin(this._fsm.timer * 0.15) * (Math.PI / 4);
                    this._checkWeldDamage(game, sweep);
                }

                // Visual Particles (Flamethrower effect)
                if (game.frame % 2 === 0) {
                    const sweep = Math.sin(this._fsm.timer * 0.15) * (Math.PI / 4);
                    this._spawnFlameParticles(sweep);
                }

                if (this._fsm.timer > 300) { // 5s (travado soltando chamas)
                    this._changeState('COOLDOWN');
                }
                break;

            case 'COOLDOWN':
                // Pausa quase imperceptível (2 frames) para resetar o loop de IA
                if (this._fsm.timer > 2) { 
                    if (distToPlayer < this._detectRange && this._checkLineOfSight(game, game.player.x, game.player.y)) {
                        this._changeState('PURSUIT');
                    } else {
                        if (typeof RobotVoice !== 'undefined') RobotVoice.speakWeld('secured', this._x, this._y);
                        this._spottedPlayer = false; // Reset da flag
                        this._changeState('PATROL');
                    }
                }
                break;

            case 'STUNNED':
                if (this._fsm.timer > 40) {
                    this._changeState('PATROL');
                }
                break;
        }
    }

    /**
     * Movimentação contínua em L sem depender de tiles específicos,
     * garantindo que ele nunca pare de se aproximar enquanto estiver em PURSUIT.
     */
    _executeContinuousLMovement(game) {
        const dx = game.player.x - this._x;
        const dy = game.player.y - this._y;
        const step = this._speed / 60;
        
        // Tenta o eixo com maior distância primeiro (L-shape)
        const primary = Math.abs(dx) > Math.abs(dy) ? 'X' : 'Y';
        const axes = primary === 'X' ? ['X', 'Y'] : ['Y', 'X'];
        
        for (const axis of axes) {
            let nx = this._x;
            let ny = this._y;
            let dir = 0;
            
            if (axis === 'X') {
                dir = Math.sign(dx);
                nx += dir * step;
                ny = Math.round(ny); // Trava no centro do grid
            } else {
                dir = Math.sign(dy);
                ny += dir * step;
                nx = Math.round(nx); // Trava no centro do grid
            }
            
            // Verifica se o próximo passo é passável
            // Usamos Math.floor(nx + offset) para garantir que ele não entre na parede
            const checkX = axis === 'X' ? nx + dir * 0.3 : nx;
            const checkY = axis === 'Y' ? ny + dir * 0.3 : ny;
            
            if (!game.isTileSolid(Math.floor(checkX), Math.floor(checkY))) {
                this._x = nx;
                this._y = ny;
                // Atualiza rotação para a direção do movimento
                if (axis === 'X') this._targetRotation = dir > 0 ? 0 : Math.PI;
                else this._targetRotation = dir > 0 ? Math.PI/2 : -Math.PI/2;
                return; // Sucesso
            }
        }
    }

    _spawnFlameParticles(sweepOffset = 0) {
        if (typeof Graphics === 'undefined') return;
        
        const currentRot = this._rotation + sweepOffset;
        
        // Offset from torch tip (approx 18px in the current rotation)
        const torchTipX = this._visualX * 32 + 16 + Math.cos(currentRot) * 20;
        const torchTipY = this._visualY * 32 + 16 + Math.sin(currentRot) * 20;
        
        // Spawn 2-3 particles per call for volume
        for (let i = 0; i < 3; i++) {
            const p = Graphics.spawnParticle(torchTipX, torchTipY, '#f1c40f', 'flame');
            
            // Add directional velocity based on bot rotation
            const spread = (Math.random() - 0.5) * 0.4;
            const speed = 4 + Math.random() * 4;
            p.vx = Math.cos(currentRot + spread) * speed;
            p.vy = Math.sin(currentRot + spread) * speed;
            
            // Randomize life a bit for organic look
            p.life = 0.8 + Math.random() * 0.2;
        }
    }

    _checkWeldDamage(game, sweepOffset = 0) {
        const px = game.player.x;
        const py = game.player.y;
        const currentRot = this._rotation + sweepOffset;
        
        // Direction vector of the weld
        const dx = Math.cos(currentRot);
        const dy = Math.sin(currentRot);
        
        // Player vector relative to bot
        const pdx = px - this._x;
        const pdy = py - this._y;
        const pDist = Math.sqrt(pdx*pdx + pdy*pdy);
        
        if (pDist < this._weldRange) {
            const pAngle = Math.atan2(pdy, pdx);
            let angleDiff = pAngle - currentRot;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // Cone check (~18 degrees each side = 36 degrees total)
            if (Math.abs(angleDiff) < Math.PI / 10) {
                // Check LoS specifically for the flame (can pass through low obstacles but blocked by walls)
                // In our current engine, isTileSolid blocks everything.
                if (this._checkLineOfSight(game, px, py)) {
                    game.takeDamage('WELD_BURN', this._x, this._y, 1); // 0.25 heart (1 quarter)
                }
            }
        }
    }

    draw(ctx) {
        if (typeof Graphics !== 'undefined' && Graphics.drawWeldBot) {
            const sweep = (this._fsm.state === 'WELD' && !this._isDying) ? Math.sin(this._fsm.timer * 0.15) * (Math.PI / 4) : 0;
            Graphics.drawWeldBot(this._visualX, this._visualY, this._rotation, this._animFrame, this._fsm.state, this._flashTimer, 0, sweep, this._isDying, this._deathTimer, this._deathDir, this._fragmentOffsets);
        } else {
            ctx.fillStyle = '#7f8c8d';
            ctx.fillRect(this._visualX * 32 + 4, this._visualY * 32 + 4, 24, 24);
        }
    }
}

// --- SPARK JUMPER (⚡) ---

class SparkJumper extends EnemyBase {
    constructor(x, y, config = {}) {
        const finalConfig = {
            health: 4,
            speed: 2.0,
            damage: 1, // 0.25 hearts
            color: '#f1c40f',
            ...config
        };
        super(x, y, finalConfig);
        this._fsm.state = 'PATROL';
        this._jumpTarget = null;
        this._jumpStart = null;
        this._jumpArc = 0; // 0 to 1
        this._voiceMethod = 'speakSpark';
        this._animFrame = 0;
        this._lastJumpTime = 0;
        this._rotation = 0;
        this._targetRotation = 0;
        this._surfingDir = { dx: 0, dy: 0 };
        this._debrisPalette = ['#f1c40f', '#f39c12', '#ecf0f1', '#2c3e50'];
    }

    update(game) {
        if (this._isDying) {
            super.update(game);
            return;
        }
        if (this._dead) return;
        super.update(game);
        this._animFrame++;
    }

    /**
     * Override onTouchPlayer to disable contact damage.
     * SparkJumper only deals damage via electric discharge on LAND state.
     * Disabling STUN here also prevents it from falling off-wire mid-jump.
     */
    onTouchPlayer(game) {
        // No physical contact damage for SparkJumper.
        // It's a high-voltage entity that only discharges on landing.
    }

    _updateAI(game) {
        switch (this._fsm.state) {
            case 'PATROL':
                this._executePatrol(game);
                break;
            case 'CHARGE':
                if (this._fsm.timer === 1 && typeof RobotVoice !== 'undefined') RobotVoice.speakSpark('charging', this._x, this._y);
                if (this._fsm.timer > 40) {
                    this._startJump(game);
                }
                break;
            case 'JUMP':
                this._executeJump(game);
                break;
            case 'LAND':
                if (this._fsm.timer === 1) {
                    this._executeDischarge(game);
                    if (typeof RobotVoice !== 'undefined') RobotVoice.speakSpark('discharge', this._x, this._y);
                }
                if (this._fsm.timer > 20) {
                    this._changeState('COOLDOWN');
                }
                break;
            case 'COOLDOWN':
                if (this._fsm.timer > 60) {
                    this._changeState('PATROL');
                }
                break;
            case 'STUNNED':
                if (this._fsm.timer > 30) {
                    this._changeState('PATROL');
                }
                break;
        }

        // Weakness: Red Energy
        const tx = Math.floor(this._x);
        const ty = Math.floor(this._y);
        const wire = game.wires.find(w => w.x === tx && w.y === ty);
        if (wire && game.poweredWires) {
            const p = game.poweredWires.get(`${tx},${ty}`);
            if (p && p.color === 'RED') {
                this.takeDamage(1, game);
            }
        }
    }

    _executePatrol(game) {
        // Decide whether to jump or surf
        if (this._fsm.timer > 120 + Math.random() * 60) {
            this._changeState('CHARGE');
            return;
        }

        // Surfing Logic: Move along wires smoothly
        const currentX = Math.floor(this._x);
        const currentY = Math.floor(this._y);
        
        // If at tile center, pick new direction
        const distToCenter = Math.sqrt(Math.pow(this._x - currentX, 2) + Math.pow(this._y - currentY, 2));
        if (distToCenter < 0.05 || (this._surfingDir.dx === 0 && this._surfingDir.dy === 0)) {
            this._x = currentX;
            this._y = currentY;

            // Get available wire connections
            const neighbors = [
                {dx: 1, dy: 0, rot: 0}, {dx: -1, dy: 0, rot: Math.PI}, 
                {dx: 0, dy: 1, rot: Math.PI/2}, {dx: 0, dy: -1, rot: -Math.PI/2}
            ].filter(n => {
                const nx = currentX + n.dx;
                const ny = currentY + n.dy;
                // Avoid tiles with wires that are BLOCKED by cubes
                const hasWire = game.wires.some(w => w.x === nx && w.y === ny);
                const isBlocked = game.blocks.some(b => b.x === nx && b.y === ny);
                return hasWire && !isBlocked;
            });

            if (neighbors.length > 0) {
                const sameDir = neighbors.find(n => n.dx === this._surfingDir.dx && n.dy === this._surfingDir.dy);
                this._surfingDir = sameDir && Math.random() < 0.7 ? sameDir : neighbors[Math.floor(Math.random() * neighbors.length)];
            } else {
                this._surfingDir = { dx: 0, dy: 0 };
            }
        }

        // Move
        const step = this._speed / 60;
        this._x += this._surfingDir.dx * step;
        this._y += this._surfingDir.dy * step;

        // Visual sparks while surfing
        if (this._animFrame % 10 === 0 && window.Graphics) {
            Graphics.spawnParticle(this._x * 32 + 16, this._y * 32 + 16, '#f1c40f', 'gold-spark');
        }

        // Rotate smoothly
        let angleDiff = this._targetRotation - this._rotation;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this._rotation += angleDiff * 0.2;
    }

    _startJump(game) {
        const radius = 3 + Math.floor(Math.random() * 3);
        const currentX = Math.floor(this._x);
        const currentY = Math.floor(this._y);

        // 1. Target Player ONLY if they are STRICTLY on a wire tile
        const px = Math.round(game.player.visualX);
        const py = Math.round(game.player.visualY);
        
        const isWireTile = (x, y) => {
            const char = game.map[y] && game.map[y][x];
            return "HVLJr+".includes(char);
        };

        // Only target player if they are actually on the wire tile (not just near it)
        const playerIsOnWire = isWireTile(px, py) && 
                               Math.abs(game.player.visualX - px) < 0.4 && 
                               Math.abs(game.player.visualY - py) < 0.4;

        let target = null;
        if (playerIsOnWire) {
            const distToPlayer = Math.abs(px - currentX) + Math.abs(py - currentY);
            // Target the SPECIFIC TILE where the player is, locking the jump
            if (distToPlayer >= 3 && distToPlayer <= radius + 3) {
                const flowData = game.poweredWires.get(`${px},${py}`);
                // Avoid RED energy wires (Lethal)
                if (!flowData || flowData.color !== 'RED') {
                    target = { x: px, y: py };
                }
            }
        }

        // 2. If no player target, find candidate wire tiles in range
        if (!target) {
            const candidates = game.wires.filter(w => {
                const dist = Math.abs(w.x - currentX) + Math.abs(w.y - currentY);
                if (dist < 3 || dist > radius + 2) return false;
                
                // Avoid RED energy wires
                const flowData = game.poweredWires.get(`${w.x},${w.y}`);
                if (flowData && flowData.color === 'RED') return false;
                
                // Avoid tiles occupied by cubes/blocks
                if (game.blocks.some(b => b.x === w.x && b.y === w.y)) return false;
                
                return true;
            });

            if (candidates.length > 0) {
                target = candidates[Math.floor(Math.random() * candidates.length)];
            }
        }

        if (target) {
            this._jumpTarget = target;
            this._jumpStart = { x: this._x, y: this._y };
            this._jumpArc = 0;
            
            // Set rotation to face target
            const dx = target.x - currentX;
            const dy = target.y - currentY;
            if (Math.abs(dx) > Math.abs(dy)) {
                this._targetRotation = dx > 0 ? 0 : Math.PI;
            } else if (Math.abs(dy) > 0) {
                this._targetRotation = dy > 0 ? Math.PI/2 : -Math.PI/2;
            }

            this._changeState('JUMP');
            if (typeof RobotVoice !== 'undefined') RobotVoice.speakSpark('jumping', this._x, this._y);
        } else {
            this._changeState('COOLDOWN');
        }
    }

    _executeJump(game) {
        this._jumpArc += 0.04; // ~25 frames jump
        if (this._jumpArc >= 1) {
            this._x = this._jumpTarget.x;
            this._y = this._jumpTarget.y;
            this._changeState('LAND');
            return;
        }

        // Parabolic lerp
        this._x = this._jumpStart.x + (this._jumpTarget.x - this._jumpStart.x) * this._jumpArc;
        this._y = this._jumpStart.y + (this._jumpTarget.y - this._jumpStart.y) * this._jumpArc;
        
        // Visual height (not applied to logic _x, _y)
        this._jumpVisualHeight = Math.sin(this._jumpArc * Math.PI) * 2;
    }

    _executeDischarge(game) {
        const tx = Math.floor(this._x);
        const ty = Math.floor(this._y);

        // 1. Damage Logic
        const px = game.player.visualX;
        const py = game.player.visualY;
        const pTileX = Math.round(px);
        const pTileY = Math.round(py);
        
        const isWire = (x, y) => {
            const char = game.map[y] && game.map[y][x];
            return "HVLJr+".includes(char);
        };

        const distToPlayer = Math.sqrt(Math.pow(this._x - px, 2) + Math.pow(this._y - py, 2));
        const onSameTile = (tx === pTileX && ty === pTileY);
        const onWire = isWire(pTileX, pTileY);

        // Player ONLY takes damage if on the same tile (Direct Hit) OR on a wire (AOE Electricity)
        if (distToPlayer < 1.5 && (onSameTile || onWire)) {
            game.takeDamage('ELECTRIC_DISCHARGE', this._x, this._y);
        }

        // 2. Energize Network
        if (game.energizeWireNetwork) {
            game.energizeWireNetwork(tx, ty, 120); // 2 seconds
        }

        // VFX
        if (window.Graphics) {
            // Massive standard particle explosion for maximum visibility
            for (let i = 0; i < 40; i++) {
                Graphics.spawnParticle(this._x * 32 + 16, this._y * 32 + 16, '#f1c40f', 'gold-spark');
            }
            // High impact shatter particles
            const debrisPalette = this._debrisPalette || ['#fff'];
            for (let i = 0; i < 30; i++) {
                Graphics.spawnParticle(this._visualX * 32 + 16, this._visualY * 32 + 16, debrisPalette[i % debrisPalette.length], 'shatter');
            }
        }
    }

    draw(ctx) {
        const ts = 32;
        let drawX = this._visualX;
        let drawY = this._visualY;
        
        let jumpHeight = 0;
        let scale = 1.0;
        let shadowAlpha = 0.3;
        let shadowScale = 1.0;

        if (this._fsm.state === 'JUMP') {
            jumpHeight = this._jumpVisualHeight || 0;
            scale = 1.0 + (jumpHeight * 0.035);
            shadowAlpha = 0.3 * (1 - Math.min(0.8, jumpHeight / 3));
            shadowScale = 1.0 - Math.min(0.5, jumpHeight / 4);
        } else if (this._fsm.state === 'LAND') {
            const squash = Math.max(0.7, 1.0 - (20 - this._fsm.timer) / 40);
            scale = squash;
        }

        // --- SHATTER LOGIC ---
        const isDying = this._isDying;
        const dt = this._deathTimer;
        const dDir = this._deathDir;
        
        const applyFragment = (index, weight = 1.0) => {
            if (!isDying) return;
            
            const key = Math.floor(index * 10);
            if (!this._fragmentOffsets.has(key)) {
                // Momentum Blast: Initial kick
                const angle = (index * 1.37) % (Math.PI * 2);
                const power = (Math.random() * 0.5 + 0.5) * 24 * weight; // Increased power
                const vx = Math.cos(angle) * power + (dDir.x * 0.8);
                const vy = Math.sin(angle) * power + (dDir.y * 0.8);
                // Start at current jump height (in pixels)
                const startZ = (jumpHeight || 0) * 32;
                this._fragmentOffsets.set(key, { x: 0, y: 0, z: startZ, vx, vy, vz: (Math.random() * 5), weight });
            }
            const fOff = this._fragmentOffsets.get(key);
            
            // 1. Position from physics (Y is adjusted by Z)
            ctx.translate(fOff.x, fOff.y - fOff.z);
            ctx.rotate((index * 1.37) + dt * 0.05 * (fOff.vx / 10)); // Inertial rotation

            // 2. Long Term Persistence & Random Shrink
            const shrinkStart = 600 + (index * 73) % 300;
            let fScale = 1.0;
            if (dt > shrinkStart) {
                fScale = Math.max(0, 1 - (dt - shrinkStart) / 60);
            }
            ctx.scale(fScale, fScale);
        };

        // 1. DRAW SHADOW FIRST
        if (!isDying && (this._fsm.state === 'JUMP' || this._fsm.state === 'PATROL' || this._fsm.state === 'CHARGE')) {
            const groundX = (drawX + 0.5) * ts;
            const groundY = (drawY + 0.5) * ts;
            ctx.save();
            ctx.translate(groundX, groundY);
            ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
            ctx.beginPath();
            ctx.ellipse(0, 4, 12 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        const cx = (drawX + 0.5) * ts;
        const cy = (drawY + 0.5) * ts - (jumpHeight * ts);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.rotate(this._rotation || 0);

        if (this._fsm.state === 'CHARGE' && !isDying) {
            ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
        }

        // Side rails
        ctx.save();
        applyFragment(1, 0.7);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-12, -14, 24, 4);
        ctx.fillRect(-12, 10, 24, 4);
        ctx.restore();

        // Industrial Chassis
        ctx.save();
        applyFragment(2.1, 0.4);
        ctx.fillStyle = '#f1c40f'; ctx.fillRect(-10, -10, 10, 10);
        ctx.restore();

        ctx.save();
        applyFragment(2.2, 0.5);
        ctx.fillStyle = '#f1c40f'; ctx.fillRect(0, -10, 10, 10);
        ctx.restore();

        ctx.save();
        applyFragment(2.3, 0.6);
        ctx.fillStyle = '#f1c40f'; ctx.fillRect(-10, 0, 10, 10);
        ctx.restore();

        ctx.save();
        applyFragment(2.4, 0.7);
        ctx.fillStyle = '#f1c40f'; ctx.fillRect(0, 0, 10, 10);
        ctx.restore();

        // Rivets
        ctx.save();
        applyFragment(3, 1.3);
        ctx.fillStyle = '#95a5a6';
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 0.5;
        const rs = 1.2;
        const rivetPos = [[-9, -9], [9, -9], [9, 9], [-9, 9], [0, -8], [0, 8], [-10, 0], [10, 0]];
        rivetPos.forEach(([rx, ry]) => {
            ctx.beginPath(); ctx.arc(rx, ry, rs, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        });
        ctx.restore();

        // Side Cooling Vents
        ctx.save();
        applyFragment(4, 0.9);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        for(let i=0; i<3; i++) {
            ctx.fillRect(-9, -6 + i*4, 2, 2);
            ctx.fillRect(7, -6 + i*4, 2, 2);
        }
        ctx.restore();

        // Central Core Housing
        ctx.save();
        applyFragment(5, 0.6);
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        const isCharged = (this._fsm.state === 'CHARGE' || this._fsm.state === 'LAND') && !isDying;
        ctx.fillStyle = isCharged ? '#fff' : '#00f0ff';
        if (isCharged) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#f1c40f';
        }
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(-3, 0);
        ctx.lineTo(0, 0);
        ctx.lineTo(-2, 4);
        ctx.lineTo(3, -1);
        ctx.lineTo(0, -1);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        // Front Sensors
        ctx.save();
        applyFragment(6, 1.1);
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(8, -5, 3, 2);
        ctx.fillRect(8, 3, 3, 2);
        ctx.restore();

        ctx.restore();
    }
}

// --- SPECIFIC IMPLEMENTATION: THROWN BLOCK PROJECTILE ---

class ThrownBlockProjectile {
    constructor(startX, startY, targetX, targetY, isArc, speed, source) {
        this.startX = startX;
        this.startY = startY;
        // Purifica os alvos para inteiros estritos do Grid
        this.targetX = Math.floor(targetX);
        this.targetY = Math.floor(targetY);
        
        this.x = startX * 32 + 16;
        this.y = startY * 32 + 16;
        this.targetPixelX = this.targetX * 32 + 16;
        this.targetPixelY = this.targetY * 32 + 16;
        this.isArc = isArc;
        this.speed = speed || 6;
        this.source = source;
        this.dead = false;
        this.age = 0;
        this.radius = 12;

        const dx = this.targetPixelX - this.x;
        const dy = this.targetPixelY - this.y;
        this.totalDist = Math.sqrt(dx * dx + dy * dy);
        this.angle = Math.atan2(dy, dx);
        
        if (this.isArc) {
            this.maxAge = Math.max(12, Math.floor(this.totalDist / this.speed));
        } else {
            this.vx = Math.cos(this.angle) * this.speed;
            this.vy = Math.sin(this.angle) * this.speed;
        }
    }

    update(game) {
        this.age++;
        if (this.dead) return;

        if (this.isArc) {
            const t = Math.min(1.0, this.age / this.maxAge);
            this.x = (this.startX * 32 + 16) + Math.cos(this.angle) * this.totalDist * t;
            this.y = (this.startY * 32 + 16) + Math.sin(this.angle) * this.totalDist * t;

            if (t >= 1.0) {
                this.land(game);
            }
        } else {
            this.x += this.vx;
            this.y += this.vy;

            const traveledDx = this.x - (this.startX * 32 + 16);
            const traveledDy = this.y - (this.startY * 32 + 16);
            if (Math.sqrt(traveledDx * traveledDx + traveledDy * traveledDy) >= this.totalDist) {
                this.x = this.targetPixelX;
                this.y = this.targetPixelY;
                this.land(game);
                return;
            }

            const tx = Math.floor(this.x / 32);
            const ty = Math.floor(this.y / 32);

            if (game.isTileSolid(tx, ty) || game.blocks.some(b => b.x === tx && b.y === ty)) {
                if (this.age < 10 && tx === this.startX && ty === this.startY) {
                    // Allow exiting spawn
                } else {
                    let landX = tx;
                    let landY = ty;
                    const prevX = Math.floor((this.x - this.vx) / 32);
                    const prevY = Math.floor((this.y - this.vy) / 32);
                    if (game.isTilePassable(prevX, prevY, [], 0, 0, false)) {
                        landX = prevX;
                        landY = prevY;
                    }
                    this.convertToObstacle(game, landX, landY);
                    this.dead = true;
                    return;
                }
            }

            const pdx = this.x - (game.player.visualX * 32 + 16);
            const pdy = this.y - (game.player.visualY * 32 + 16);
            if (Math.sqrt(pdx * pdx + pdy * pdy) < 16 + this.radius) {
                game.takeDamage('BRICK_HIT');
                if (window.AudioSys) AudioSys.playCubeCrush();
                if (game && game.spawnDebris) {
                    game.spawnDebris(this.x, this.y, 6, '#f39c12');
                    game.spawnDebris(this.x, this.y, 5, '#7f8c8d');
                    game.spawnDebris(this.x, this.y, 5, '#34495e');
                }
                for (let i = 0; i < 8; i++) {
                    Graphics.spawnParticle(this.x, this.y, '#f39c12', 'spark');
                }
                this.dead = true;
                return;
            }

            if (this.age > 120) {
                this.convertToObstacle(game, tx, ty);
                this.dead = true;
            }
        }
    }

    land(game) {
        this.dead = true;
        const pX = Math.floor(game.player.x);
        const pY = Math.floor(game.player.y);
        if (pX === this.targetX && pY === this.targetY) {
            game.takeDamage('BRICK_CRUSH');
            if (window.AudioSys) AudioSys.playCubeCrush();
            if (game && game.spawnDebris) {
                game.spawnDebris(this.x, this.y, 6, '#f39c12');
                game.spawnDebris(this.x, this.y, 5, '#7f8c8d');
                game.spawnDebris(this.x, this.y, 5, '#34495e');
            }
            for (let i = 0; i < 10; i++) {
                Graphics.spawnParticle(this.x, this.y, '#f39c12', 'spark');
            }
            return;
        }

        if (game.isTilePassable(this.targetX, this.targetY, [], 0, 0, false)) {
            this.convertToObstacle(game, this.targetX, this.targetY);
        } else {
            if (window.AudioSys) AudioSys.playCubeCrush();
            if (game && game.spawnDebris) {
                game.spawnDebris(this.x, this.y, 6, '#f39c12');
                game.spawnDebris(this.x, this.y, 5, '#7f8c8d');
                game.spawnDebris(this.x, this.y, 5, '#34495e');
            }
            for (let i = 0; i < 6; i++) {
                Graphics.spawnParticle(this.x, this.y, '#7f8c8d', 'spark');
            }
        }
    }

    convertToObstacle(game, tx, ty) {
        tx = Math.floor(tx);
        ty = Math.floor(ty);
        if (tx < 0 || tx >= game.map[0].length || ty < 0 || ty >= game.map.length) return;
        if (game.isTileSolid(tx, ty)) return;
        if (game.blocks.some(b => b.x === tx && b.y === ty)) return;
        if (Math.floor(game.player.x) === tx && Math.floor(game.player.y) === ty) return;

        if (window.AudioSys && AudioSys.push) AudioSys.push();
        for (let i = 0; i < 5; i++) {
            Graphics.spawnParticle(tx * 32 + 16, ty * 32 + 16, '#f39c12', 'smoke');
        }

        game.blocks.push({
            x: tx,
            y: ty,
            origX: tx,
            origY: ty,
            visualX: tx,
            visualY: ty,
            vx: 0,
            vy: 0,
            visualAngle: 0,
            dir: DIRS.DOWN,
            type: 'BRICK_OBSTACLE',
            blocksPlayer: true
        });
    }

    draw(ctx) {
        this.onDraw(ctx);
    }

    onDraw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        let heightZ = 0;
        if (this.isArc) {
            const t = Math.min(1.0, this.age / this.maxAge);
            heightZ = Math.sin(t * Math.PI) * 45;
            
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            const shadowScale = 1.0 - (heightZ / 70);
            ctx.beginPath();
            ctx.ellipse(0, 0, 10 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.translate(0, -heightZ);
        ctx.rotate(this.age * 0.2);

        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(-8, -8, 16, 16);
        ctx.fillStyle = '#34495e';
        ctx.fillRect(-8, -8, 16, 2);
        ctx.fillRect(-8, 6, 16, 2);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(-4, -4, 8, 8);
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-8, -8, 16, 16);

        ctx.restore();
    }
}

// --- SPECIFIC IMPLEMENTATION: BRICK STACK (ARTILLERY / BUILDER) ---

class BrickStack extends PatrollingEnemy {
    constructor(x, y, config = {}) {
        const finalConfig = {
            health: 3,
            speed: 1.2,
            damage: 2,
            isPeaceful: false,
            ...config
        };
        super(x, y, finalConfig);
        this._animFrame = 0;
        this._armProgress = 0;
        this._headRotationOffset = 0;
        this._nextAttackIsBarrier = false;
        this._voiceMethod = 'speakBrick';
        this._debrisPalette = ['#f39c12', '#f1c40f', '#2c3e50', '#7f8c8d'];
    }

    update(game) {
        if (this._isDying) {
            super.update(game);
            return;
        }

        this._animFrame++;
        this._visualX += (this._x - this._visualX) * 0.25;
        this._visualY += (this._y - this._visualY) * 0.25;

        let diff = this._targetRotation - this._rotation;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this._rotation += diff * 0.15;

        if (this._flashTimer > 0) this._flashTimer--;

        const px = game.player.x;
        const py = game.player.y;
        const distToPlayer = Math.sqrt(Math.pow(this._x - px, 2) + Math.pow(this._y - py, 2));

        if (distToPlayer < 1.2 && game.player.x === this._x && game.player.y === this._y && !game.player.isDead) {
            this.onTouchPlayer(game);
            return;
        }

        this._fsm.timer++;

        switch (this._fsm.state) {
            case 'PATROL':
                this.executePatrol(game);
                this._headRotationOffset = Math.sin(this._animFrame * 0.05) * 0.2;
                
                if (this._fsm.timer > 30 && !game.player.isDead && distToPlayer <= 4.5) {
                    if (this._checkLineOfSight(game, px, py)) {
                        this._changeState('DETECT');
                        if (typeof RobotVoice !== 'undefined' && RobotVoice.speakBrick) {
                            RobotVoice.speakBrick('neutral', this._x, this._y);
                        }
                    }
                }
                break;

            case 'DETECT':
                this._targetRotation = Math.atan2(py - this._y, px - this._x);
                this._headRotationOffset += (0 - this._headRotationOffset) * 0.2;
                
                // Toca a frase de ataque assim que detecta o alvo, antecipando a imponência verbal
                if (this._fsm.timer === 1 && typeof RobotVoice !== 'undefined') {
                    RobotVoice.speakBrick('attack', this._x, this._y);
                }
                
                if (this._fsm.timer >= 25) {
                    this._volleyShots = 0;
                    this._changeState('THROW_VOLLEY');
                    this._armProgress = 0;
                }
                break;

            case 'THROW_VOLLEY':
                if (this._fsm.timer === 1) {
                    this._volleyShots = 0;
                }
                
                this._targetRotation = Math.atan2(py - this._y, px - this._x);
                this._armProgress = Math.min(1.0, (this._fsm.timer % 45) / 35);
                
                if (this._fsm.timer % 45 === 18 && this._volleyShots < 3) {
                    
                    let targetX = px;
                    let targetY = py;
                    
                    // Busca ativa garantida por coordenadas desobstruídas para cercamento tático
                    if (this._volleyShots > 0) {
                        const offsets = [
                            {x: 1, y: 0}, {x: -1, y: 0},
                            {x: 0, y: 1}, {x: 0, y: -1},
                            {x: 1, y: 1}, {x: -1, y: -1}
                        ];
                        const startIdx = Math.floor(Math.random() * offsets.length);
                        for (let i = 0; i < offsets.length; i++) {
                            const off = offsets[(startIdx + i) % offsets.length];
                            const candX = px + off.x;
                            const candY = py + off.y;
                            if (game.isTilePassable(candX, candY, [], 0, 0, false) &&
                                !game.blocks.some(b => b.x === candX && b.y === candY)) {
                                targetX = candX;
                                targetY = candY;
                                break;
                            }
                        }
                    }
                    
                    const dx = targetX - this._x;
                    const dy = targetY - this._y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 4.0) {
                        targetX = Math.round(this._x + (dx / dist) * 4.0);
                        targetY = Math.round(this._y + (dy / dist) * 4.0);
                    }
                    
                    if (targetX === Math.round(this._x) && targetY === Math.round(this._y)) {
                        targetX += 1;
                    }

                    const proj = new ThrownBlockProjectile(
                        this._x, this._y, targetX, targetY, true, 4.5, this
                    );
                    game.projectiles.push(proj);
                    if (window.AudioSys && AudioSys.laserFired) AudioSys.laserFired();
                    
                    this._volleyShots++;
                    if (this._volleyShots >= 3) {
                        this._changeState('WEAK_RELOAD');
                        return;
                    }
                }
                break;

            case 'WEAK_RELOAD':
                if (this._fsm.timer === 1 && typeof RobotVoice !== 'undefined') {
                    RobotVoice.speakBrick('reload', this._x, this._y);
                }

                if (game.frame % 15 === 0 && typeof Graphics !== 'undefined') {
                    Graphics.spawnParticle(this._visualX * 32 + 16, this._visualY * 32 + 16, '#f1c40f', 'spark');
                    Graphics.spawnParticle(this._visualX * 32 + 16, this._visualY * 32 + 16, '#7f8c8d', 'smoke');
                }
                
                this._armProgress *= 0.9;
                
                if (this._fsm.timer >= 240) {
                    if (!game.player.isDead && distToPlayer <= 4.5 && this._checkLineOfSight(game, px, py)) {
                        this._changeState('THROW_ATTACK');
                    } else {
                        if (typeof RobotVoice !== 'undefined') RobotVoice.speakBrick('secured', this._x, this._y);
                        this._changeState('PATROL');
                    }
                }
                break;

            case 'THROW_ATTACK':
                this._targetRotation = Math.atan2(py - this._y, px - this._x);
                this._armProgress = this._fsm.timer / 35;
                
                if (this._fsm.timer === 18) {
                    if (typeof RobotVoice !== 'undefined') RobotVoice.speakBrick('attack', this._x, this._y);
                    
                    let targetX = px;
                    let targetY = py;
                    const dx = targetX - this._x;
                    const dy = targetY - this._y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 4.0) {
                        targetX = Math.round(this._x + (dx / dist) * 4.0);
                        targetY = Math.round(this._y + (dy / dist) * 4.0);
                    }

                    const proj = new ThrownBlockProjectile(
                        this._x, this._y, targetX, targetY, false, 4.8, this
                    );
                    game.projectiles.push(proj);
                    if (window.AudioSys && AudioSys.laserFired) AudioSys.laserFired();
                }
                
                if (this._fsm.timer >= 35) {
                    this._changeState('COOLDOWN');
                }
                break;

            case 'THROW_BARRIER':
                this._changeState('THROW_VOLLEY');
                break;

            case 'COOLDOWN':
                this._armProgress = Math.max(0, 1.0 - (this._fsm.timer / 30));
                if (this._fsm.timer >= 35) {
                    this._changeState('PATROL');
                }
                break;

            case 'STUNNED':
                this._armProgress *= 0.8;
                if (this._fsm.timer >= 25) {
                    this._changeState('PATROL');
                }
                break;
        }

        super.update(game);
    }

    _changeState(newState) {
        this._fsm.state = newState;
        this._fsm.timer = 0;
    }

    draw(ctx) {
        if (typeof Graphics !== 'undefined' && Graphics.drawBrickStack) {
            Graphics.drawBrickStack(
                this._visualX, this._visualY, this._rotation, this._animFrame,
                this._fsm.state, this._flashTimer, this._armProgress, this._headRotationOffset,
                this._isDying, this._deathTimer, this._deathDir, this._fragmentOffsets,
                ctx
            );
        }
    }
}

// --- SPECIFIC IMPLEMENTATION: CABLE SNAKE (🐍 / CAPTURADOR DE CABOS) ---

class CableSnakeSegment extends EnemyBase {
    constructor(parentSnake, segmentIndex) {
        super(parentSnake.x, parentSnake.y, {
            health: 2,
            speed: parentSnake._speed,
            damage: parentSnake._damage
        });
        this._parent = parentSnake;
        this._segmentIndex = segmentIndex; // 1, 2, 3 (Corpo), 4 (Cauda)
        this._voiceMethod = 'speakCable';
        this._debrisPalette = ['#1a1a1a', '#e74c3c', '#7f8c8d', '#bdc3c7'];
    }

    update(game) {
        if (this._isDying) {
            super.update(game);
            return;
        }
        if (this._dead) return;

        // Se o pai morreu ou foi marcado para remoção, morre junto
        if (this._parent.isDead || this._parent._markedForRemoval) {
            this._dead = true;
            this._markedForRemoval = true;
            return;
        }

        // Locomoção Snake de Grid: cada segmento pega estritamente a posição da cabeça no passado
        // O histórico armazena as células inteiras pelas quais a cabeça passou
        const hist = this._parent._gridHistory;
        if (hist && hist.length >= this._segmentIndex) {
            const pastPos = hist[this._segmentIndex - 1];
            this._x = pastPos.x;
            this._y = pastPos.y;
            this._rotation = pastPos.rot;
        } else {
            this._x = this._parent.x;
            this._y = this._parent.y;
        }

        // Interpolação super suave contínua para a célula de grid real
        this._visualX += (this._x - this._visualX) * 0.25;
        this._visualY += (this._y - this._visualY) * 0.25;

        if (this._flashTimer > 0) this._flashTimer--;

        // Se a cobra mãe estiver em resfriamento (COOLDOWN) após soltar o jogador,
        // desativa as colisões físicas do corpo para que ele escape ileso sem travamentos
        if (this._parent && this._parent._fsm.state !== 'COOLDOWN') {
            super._checkPlayerCollision(game);
        }
    }

    onTouchPlayer(game) {
        // Aplica o dano sinalizador sem recuo para permitir avanço implacável e esquartejamento
        game.takeDamage('CABLE_SNAKE_HIT', this._visualX, this._visualY);
    }

    takeDamage(amount, game) {
        if (this._dead) return;

        // Se o jogador atacar qualquer parte do corpo da cobra, o ataque/constrição dela cessa imediatamente
        if (this._parent && (this._parent._fsm.state === 'WRAP' || this._parent._fsm.state === 'GRAB' || this._parent._fsm.state === 'STRETCH')) {
            this._parent._changeState('COOLDOWN');
        }

        // Qualquer módulo da sucuri agora pode ser alvejado e destruído de forma não linear!
        this._health -= amount;
        this._flashTimer = 12;
        
        // --- ANIME IMPACT VFX ---
        if (typeof Graphics !== 'undefined' && Graphics.createAnimeImpactConfig) {
            const vx = this._visualX * 32 + 16;
            const vy = this._visualY * 32 + 16;
            const impactConfig = Graphics.createAnimeImpactConfig(vx, vy);
            Graphics.spawnParticle(vx, vy, '#fff', 'anime-impact', true, impactConfig);
            
            if (window.AudioSys && AudioSys.playAnimeImpactSFX) {
                AudioSys.playAnimeImpactSFX(this._x, this._y);
            }
        }

        if (typeof RobotVoice !== 'undefined' && RobotVoice.speakCable) {
            RobotVoice.speakCable('damage', this._x, this._y);
        }

        if (typeof Graphics !== 'undefined') {
            Graphics.spawnParticle(this._visualX * 32 + 16, this._visualY * 32 + 16, '#e74c3c', 'spark');
        }

        if (this._health <= 0) {
            this.die(game);
        }
        // Diferente de outros robôs, o dano no segmento não atordoa o movimento Snake da cabeça!
    }

    die(game) {
        if (this._isDying) return;
        super.die(game);
        
        // Ejetar fisicamente a blindagem do segmento em estilhaços metálicos persistentes pelo chão
        if (game && game.spawnDebris) {
            const vx = this._visualX * 32 + 16;
            const vy = this._visualY * 32 + 16;
            const dir = this._deathDir ? { x: Math.sign(this._deathDir.x), y: Math.sign(this._deathDir.y) } : { x: 0, y: 1 };
            
            game.spawnDebris(vx, vy, 6, '#2c3e50', dir);
            game.spawnDebris(vx, vy, 6, '#e74c3c', dir);
            game.spawnDebris(vx, vy, 4, '#1a1a1a', dir);
            game.spawnDebris(vx, vy, 4, '#bdc3c7', dir);
        }
        
        // Se o jogador explodiu um módulo durante a captura/constrição (ex: com um Dash heróico),
        // quebra instantaneamente as amarras da sucuri e libera a velocidade para destrancar o trajeto
        if (this._parent && (this._parent._fsm.state === 'WRAP' || this._parent._fsm.state === 'GRAB')) {
            this._parent._changeState('COOLDOWN');
            if (game && game.player) {
                const escapeAngle = Math.atan2(game.player.y - this._parent.y, game.player.x - this._parent.x);
                game.player.vx = Math.cos(escapeAngle) * 8.0;
                game.player.vy = Math.sin(escapeAngle) * 8.0;
            }
        }
        
        if (typeof RobotVoice !== 'undefined' && RobotVoice.speakCable) {
            RobotVoice.speakCable('dead', this._x, this._y);
        }
    }

    draw(ctx) {
        // Renderização delegada centralmente à cabeça para manter a integridade visual da trança
    }
}

class CableSnake extends PatrollingEnemy {
    constructor(x, y, config = {}) {
        super(x, y, {
            health: 3,
            speed: 1.5,
            damage: 2,
            ...config
        });
        this._voiceMethod = 'speakCable';
        this._debrisPalette = ['#1a1a1a', '#e74c3c', '#c0392b', '#7f8c8d'];
        this._fsm.state = 'PATROL';
        
        // Garante o alinhamento estrito no Grid desde o surgimento
        this._x = Math.floor(x);
        this._y = Math.floor(y);
        this._visualX = this._x;
        this._visualY = this._y;

        // Temporização discreta do Grid (ex: speed 1.5 -> passo a cada 20 frames)
        this._gridTimer = 0;
        this._gridInterval = Math.max(8, Math.floor(30 / (this._speed || 1.5)));
        
        // Histórico de posições da cabeça em células inteiras com rotações ortogonais
        this._gridHistory = [];
        for (let i = 0; i < 20; i++) {
            this._gridHistory.push({ x: this._x, y: this._y, rot: this._rotation });
        }
        
        this._initializedSegments = false;
        this._segment1 = null;
        this._segment2 = null;
        this._segment3 = null;
        this._segment4 = null;
        this._wrapTimer = 0;
        this._grabProgress = 0;
        this._grabTarget = null;
        this._animFrame = 0;
        this._wrapDamageTicks = 0;
    }

    update(game) {
        if (this._isDying) {
            super.update(game);
            return;
        }
        if (this._dead) return;

        this._animFrame++;
        this._fsm.timer++; // CORREÇÃO CRÍTICA ORIGINAL: Destranca a máquina de estados de bote!

        if (!this._initializedSegments) {
            this._initializedSegments = true;
            this._segment1 = new CableSnakeSegment(this, 1);
            this._segment2 = new CableSnakeSegment(this, 2);
            this._segment3 = new CableSnakeSegment(this, 3);
            this._segment4 = new CableSnakeSegment(this, 4);
            game.enemies.push(this._segment1, this._segment2, this._segment3, this._segment4);
            
            // Cria os nós elétricos persistentes internos para manter os cabos visíveis
            // mesmo após a destruição da blindagem dos módulos correspondentes
            this._cableVisualNodes = [];
            for (let i = 0; i < 4; i++) {
                this._cableVisualNodes.push({ x: this._x, y: this._y });
            }
        }

        // Interpolação super suave constante da cabeça para o seu tile atual
        this._visualX += (this._x - this._visualX) * 0.25;
        this._visualY += (this._y - this._visualY) * 0.25;
        
        // Atualiza a posição visual de todos os nós de cabo elétrico independentemente do estado de vida
        if (this._cableVisualNodes && this._gridHistory) {
            for (let i = 0; i < 4; i++) {
                if (this._gridHistory.length > i) {
                    const targetPos = this._gridHistory[i];
                    this._cableVisualNodes[i].x += (targetPos.x - this._cableVisualNodes[i].x) * 0.25;
                    this._cableVisualNodes[i].y += (targetPos.y - this._cableVisualNodes[i].y) * 0.25;
                } else {
                    this._cableVisualNodes[i].x += (this._x - this._cableVisualNodes[i].x) * 0.25;
                    this._cableVisualNodes[i].y += (this._y - this._cableVisualNodes[i].y) * 0.25;
                }
            }
        }

        if (this._flashTimer > 0) this._flashTimer--;

        this._updateAI(game);

        // Se estiver em COOLDOWN, omite a colisão da cabeça para assegurar passagem limpa
        if (this._fsm.state !== 'COOLDOWN') {
            super._checkPlayerCollision(game);
        }
    }

    onTouchPlayer(game) {
        // Exige um tempo de recarga severo de 90 frames em patrulha antes de poder engajar o WRAP
        // por contato físico direto. Garante que ela solte e dê margem real de fuga para o jogador!
        if (this._fsm.state === 'PATROL' && this._fsm.timer > 90) {
            super._changeState('WRAP');
            this._wrapTimer = 120;
            this._wrapDamageTicks = 0;
            if (typeof RobotVoice !== 'undefined' && RobotVoice.speakCable) {
                RobotVoice.speakCable('wrap', this._visualX, this._visualY);
            }
        } else {
            // Se o enfaixamento não engatar, aplica o dano contínuo sem empurrão
            game.takeDamage('CABLE_SNAKE_HIT', this._visualX, this._visualY);
        }
    }

    takeDamage(amount, game) {
        if (this._dead) return;

        // Se a cabeça for atacada, quebra imediatamente as amarras de constrição/mira
        if (this._fsm.state === 'WRAP' || this._fsm.state === 'GRAB' || this._fsm.state === 'STRETCH') {
            super._changeState('COOLDOWN');
        }

        // A cabeça é invulnerável enquanto existir qualquer um dos 4 segmentos do corpo
        let anyAlive = false;
        for (let i = 1; i <= 4; i++) {
            const s = this[`_segment${i}`];
            if (s && !s.isDead) {
                anyAlive = true;
                break;
            }
        }
        
        if (anyAlive) {
            if (window.AudioSys && AudioSys.buttonClick) AudioSys.buttonClick();
            this._flashTimer = 8;
            
            // --- ANIME IMPACT VFX (mesmo bloqueado, o impacto cinético empolga a tela) ---
            if (typeof Graphics !== 'undefined' && Graphics.createAnimeImpactConfig) {
                const vx = this._visualX * 32 + 16;
                const vy = this._visualY * 32 + 16;
                const impactConfig = Graphics.createAnimeImpactConfig(vx, vy);
                Graphics.spawnParticle(vx, vy, '#fff', 'anime-impact', true, impactConfig);
                
                if (window.AudioSys && AudioSys.playAnimeImpactSFX) {
                    AudioSys.playAnimeImpactSFX(this._x, this._y);
                }
            }

            if (typeof Graphics !== 'undefined') {
                for (let i = 0; i < 5; i++) {
                    Graphics.spawnParticle(this._visualX * 32 + 16, this._visualY * 32 + 16, '#9b59b6', 'spark');
                }
            }
            return;
        }

        // Aplicação de dano limpa e direta: não gera STUNNED forçado nem kickback de recuo
        // na cabeça principal para não corromper o Grid ou travar o deslocamento Snake!
        this._health -= amount;
        this.triggerEvent('DAMAGE', { amount, current: this._health });
        
        if (typeof Graphics !== 'undefined' && Graphics.createAnimeImpactConfig) {
            const vx = this._visualX * 32 + 16;
            const vy = this._visualY * 32 + 16;
            const impactConfig = Graphics.createAnimeImpactConfig(vx, vy);
            Graphics.spawnParticle(vx, vy, '#fff', 'anime-impact', true, impactConfig);
            
            if (window.AudioSys && AudioSys.playAnimeImpactSFX) {
                AudioSys.playAnimeImpactSFX(this._x, this._y);
            }
        }

        if (typeof RobotVoice !== 'undefined' && RobotVoice.speakCable) {
            RobotVoice.speakCable('damage', this._x, this._y);
        }

        if (typeof Graphics !== 'undefined') {
            Graphics.spawnParticle(this._visualX * 32 + 16, this._visualY * 32 + 16, '#e74c3c', 'spark');
        }

        if (this._health <= 0) {
            this.die(game);
        }
    }

    die(game) {
        if (this._isDying) return;
        super.die(game);
        
        // Ejetar fisicamente múltiplos estilhaços e fragmentos robustos da cabeça da cobra
        if (game && game.spawnDebris) {
            const vx = this._visualX * 32 + 16;
            const vy = this._visualY * 32 + 16;
            const dir = this._deathDir ? { x: Math.sign(this._deathDir.x), y: Math.sign(this._deathDir.y) } : { x: 0, y: 1 };
            
            game.spawnDebris(vx, vy, 10, '#1a1a1a', dir);
            game.spawnDebris(vx, vy, 8, '#c0392b', dir);
            game.spawnDebris(vx, vy, 8, '#e74c3c', dir);
            game.spawnDebris(vx, vy, 6, '#7f8c8d', dir);
        }
        
        if (typeof RobotVoice !== 'undefined' && RobotVoice.speakCable) {
            RobotVoice.speakCable('dead', this._x, this._y);
        }
    }

    _updateAI(game) {
        if (!game.player) return;

        const px = Math.floor(game.player.x);
        const py = Math.floor(game.player.y);

        switch (this._fsm.state) {
            case 'PATROL':
                this._gridTimer++;
                if (this._gridTimer >= this._gridInterval) {
                    this._gridTimer = 0;
                    
                    let nextX = this._x;
                    let nextY = this._y;
                    let hasStep = false;
                    
                    // 1. Patrulha Ortogonal Guiada se houver rota de múltiplos pontos configurada
                    if (this._path && this._path.length > 1) {
                        const target = this._path[this._pathIndex];
                        if (target) {
                            const tx = Math.floor(target.x);
                            const ty = Math.floor(target.y);
                            
                            if (this._x !== tx) {
                                nextX += Math.sign(tx - this._x);
                                hasStep = true;
                            } else if (this._y !== ty) {
                                nextY += Math.sign(ty - this._y);
                                hasStep = true;
                            } else {
                                // Atingiu o ponto do caminho, busca o próximo no próximo ciclo
                                this._pathIndex = (this._pathIndex + 1) % this._path.length;
                            }
                        }
                    } else {
                        // 2. Comportamento Snake Livre (Caça Baseada em Grid)
                        // Avalia puramente os 4 vizinhos cardeais ortogonais
                        const candidates = [
                            { x: this._x + 1, y: this._y },
                            { x: this._x - 1, y: this._y },
                            { x: this._x, y: this._y + 1 },
                            { x: this._x, y: this._y - 1 }
                        ];
                        
                        let bestCand = null;
                        let minDist = Infinity;
                        const neck = this._gridHistory[0];
                        
                        for (const cand of candidates) {
                            // Permite entrar estritamente onde o jogador se encontra sem ser bloqueado pela colisão,
                            // eliminando o sintoma de que a IA estava "evitando" o jogador nas adjacências!
                            const isPlayerCell = (cand.x === px && cand.y === py);
                            if (!isPlayerCell && !game.isTilePassable(cand.x, cand.y)) continue;
                            
                            // Regra de Ouro de Snake: não pode entrar na célula imediatamente ocupada pelo pescoço
                            if (neck && cand.x === neck.x && cand.y === neck.y) continue;
                            
                            const manhattanDist = Math.abs(cand.x - px) + Math.abs(cand.y - py);
                            if (manhattanDist < minDist) {
                                minDist = manhattanDist;
                                bestCand = cand;
                            }
                        }
                        
                        // Se estiver encurralada (só o pescoço estiver livre), permite recuar sobre si mesma
                        if (!bestCand && neck && game.isTilePassable(neck.x, neck.y)) {
                            bestCand = { x: neck.x, y: neck.y };
                        }
                        
                        if (bestCand) {
                            nextX = bestCand.x;
                            nextY = bestCand.y;
                            hasStep = true;
                        }
                    }
                    
                    // Executa o passo se o tile destino for transponível ou for a célula do jogador
                    const isTargetPlayer = (nextX === px && nextY === py);
                    if (hasStep && (isTargetPlayer || game.isTilePassable(nextX, nextY))) {
                        // Empurra a posição anterior com sua rotação para o início da fila de rastro
                        this._gridHistory.unshift({ x: this._x, y: this._y, rot: this._rotation });
                        if (this._gridHistory.length > 25) this._gridHistory.pop();
                        
                        // Atualiza rotação discreta (0, 90, 180, 270)
                        this._rotation = Math.atan2(nextY - this._y, nextX - this._x);
                        this._targetRotation = this._rotation;
                        
                        this._x = nextX;
                        this._y = nextY;
                    }
                }

                // Disparo estrito de corredor de Grid (como as cobras clássicas de Snake)
                const fsmPx = game.player.isDashing ? game.player.x : game.player.visualX;
                const fsmPy = game.player.isDashing ? game.player.y : game.player.visualY;
                
                // Extrai o vetor ortogonal exato do grid atual da cabeça
                const cosR = Math.round(Math.cos(this._rotation));
                const sinR = Math.round(Math.sin(this._rotation));
                
                let isPlayerInFrontTile = false;
                let realDist = 999;
                
                if (cosR !== 0) { // Apontando na Horizontal
                    const isForward = (fsmPx - this._visualX) * cosR > 0;
                    const isAligned = Math.abs(fsmPy - this._visualY) <= 0.65; // Tolerância estrita do corredor
                    realDist = Math.abs(fsmPx - this._visualX);
                    isPlayerInFrontTile = isForward && isAligned && realDist <= 3.8;
                } else { // Apontando na Vertical
                    const isForward = (fsmPy - this._visualY) * sinR > 0;
                    const isAligned = Math.abs(fsmPx - this._visualX) <= 0.65; // Tolerância estrita do corredor
                    realDist = Math.abs(fsmPy - this._visualY);
                    isPlayerInFrontTile = isForward && isAligned && realDist <= 3.8;
                }

                // Dispara o laser de mira estritamente na grade se o jogador entrar no corredor da morte
                if (isPlayerInFrontTile && !game.player.isDead && !game.player.invulnerable && this._fsm.timer > 60) {
                    if (super._checkLineOfSight(game, fsmPx, fsmPy)) {
                        super._changeState('STRETCH');
                        this._targetRotation = this._rotation; // Trava a mira para não inclinar/pegar de lado
                        if (typeof RobotVoice !== 'undefined' && RobotVoice.speakCable) {
                            RobotVoice.speakCable('stretch', this._visualX, this._visualY);
                        }
                    }
                }
                break;

            case 'STRETCH':
                // Mantém o feixe fixado retinho na grade durante a mira
                this._targetRotation = this._rotation;
                
                if (this._fsm.timer >= 25) {
                    const fsmPx = game.player.isDashing ? game.player.x : game.player.visualX;
                    const fsmPy = game.player.isDashing ? game.player.y : game.player.visualY;
                    
                    const cosR = Math.round(Math.cos(this._rotation));
                    const sinR = Math.round(Math.sin(this._rotation));
                    let isStillInTile = false;
                    
                    if (cosR !== 0) {
                        isStillInTile = ((fsmPx - this._visualX) * cosR > 0) && (Math.abs(fsmPy - this._visualY) <= 0.65) && (Math.abs(fsmPx - this._visualX) <= 3.8);
                    } else {
                        isStillInTile = ((fsmPy - this._visualY) * sinR > 0) && (Math.abs(fsmPx - this._visualX) <= 0.65) && (Math.abs(fsmPy - this._visualY) <= 3.8);
                    }
                    
                    if (isStillInTile && super._checkLineOfSight(game, fsmPx, fsmPy)) {
                        super._changeState('GRAB');
                        this._grabProgress = 0;
                        if (window.AudioSys && AudioSys.laserFired) AudioSys.laserFired();
                    } else {
                        super._changeState('PATROL');
                    }
                }
                break;

            case 'GRAB':
                // O chicote ejeta travado no eixo do grid
                this._targetRotation = this._rotation;
                this._grabProgress = Math.min(1.0, this._fsm.timer / 12);
                
                // --- DETECÇÃO DE AUTO-COLISÃO TRANÇADA (A língua bate nela mesma) ---
                const maxWhipLen = 3.6;
                const currentLen = maxWhipLen * this._grabProgress;
                const tipX = this._visualX + Math.cos(this._targetRotation) * currentLen;
                const tipY = this._visualY + Math.sin(this._targetRotation) * currentLen;
                
                let hitSelfSegment = null;
                for (let i = 1; i <= 4; i++) {
                    const seg = this[`_segment${i}`];
                    if (seg && !seg.isDead) {
                        const px = seg.visualX, py = seg.visualY;
                        const x1 = this._visualX, y1 = this._visualY;
                        const x2 = tipX, y2 = tipY;
                        
                        const C = x2 - x1, D = y2 - y1;
                        const lenSq = C * C + D * D;
                        let param = -1;
                        if (lenSq !== 0) {
                            param = ((px - x1) * C + (py - y1) * D) / lenSq;
                        }
                        
                        // Só acerta módulos que cruzaram efetivamente na projeção ativa e ejetada da língua
                        if (param > 0.25 && param <= 1.0) {
                            const projX = x1 + param * C;
                            const projY = y1 + param * D;
                            const distSq = (px - projX) * (px - projX) + (py - projY) * (py - projY);
                            
                            if (distSq < 0.25) { // Raio de espessura de 0.5 tiles
                                hitSelfSegment = seg;
                                break;
                            }
                        }
                    }
                }
                
                if (hitSelfSegment) {
                    // Autodestruição engatilhada: arranca instantaneamente o módulo que cruzou a língua!
                    hitSelfSegment.takeDamage(2, game);
                    super._changeState('COOLDOWN');
                    if (window.AudioSys && AudioSys.buttonClick) AudioSys.buttonClick();
                    break;
                }
                
                if (this._fsm.timer === 12) {
                    const fsmPx = game.player.isDashing ? game.player.x : game.player.visualX;
                    const fsmPy = game.player.isDashing ? game.player.y : game.player.visualY;
                    
                    const cosR = Math.round(Math.cos(this._rotation));
                    const sinR = Math.round(Math.sin(this._rotation));
                    let isTargetCaptured = false;
                    
                    if (cosR !== 0) {
                        isTargetCaptured = ((fsmPx - this._visualX) * cosR > 0) && (Math.abs(fsmPy - this._visualY) <= 0.65) && (Math.abs(fsmPx - this._visualX) <= 3.6);
                    } else {
                        isTargetCaptured = ((fsmPy - this._visualY) * sinR > 0) && (Math.abs(fsmPx - this._visualX) <= 0.65) && (Math.abs(fsmPy - this._visualY) <= 3.6);
                    }
                    
                    // Exige que o jogador esteja estritamente dentro do corredor de grid atingido pela língua
                    // Erradica o "puxão mágico" lateral se o jogador esquivou para o tile do lado
                    if (isTargetCaptured && !game.player.isDashing && !game.player.invulnerable && !game.player.isDead) {
                        super._changeState('WRAP');
                        this._wrapTimer = 120;
                        this._wrapDamageTicks = 0;
                        if (typeof RobotVoice !== 'undefined' && RobotVoice.speakCable) {
                            RobotVoice.speakCable('wrap', this._visualX, this._visualY);
                        }
                    } else {
                        super._changeState('COOLDOWN');
                    }
                }
                break;

            case 'WRAP':
                this._grabProgress = 1.0;
                if (!game.player.isDead) {
                    // O jogador mantém total autonomia de locomoção e investida!
                    // A cabeça da cobra o encara e a corda/língua elástica estica dinamicamente até ele
                    const angleToPlayer = Math.atan2(game.player.visualY - this._visualY, game.player.visualX - this._visualX);
                    this._targetRotation = angleToPlayer;
                    
                    this._wrapDamageTicks++;
                    if (this._wrapDamageTicks % 40 === 0) {
                        // Aplica choque elétrico contínuo de constrição remota
                        game.takeDamage('ELECTRIC_SHOCK', this._visualX, this._visualY);
                        if (typeof Graphics !== 'undefined') {
                            Graphics.spawnParticle(game.player.visualX * 32 + 16, game.player.visualY * 32 + 16, '#e74c3c', 'spark');
                        }
                    }
                }

                this._wrapTimer--;
                if (this._wrapTimer <= 0 || game.player.isDead) {
                    // Fim do tempo de choque: solta o cabo naturalmente sem aplicar trancos
                    super._changeState('COOLDOWN');
                    if (typeof RobotVoice !== 'undefined' && RobotVoice.speakCable) {
                        RobotVoice.speakCable('neutral', this._visualX, this._visualY);
                    }
                }
                break;

            case 'COOLDOWN':
                this._grabProgress = Math.max(0, 1.0 - (this._fsm.timer / 15));
                // Estendido para 60 frames absolutos (1 segundo) onde a cobra não atira nem agarra
                if (this._fsm.timer >= 60) {
                    super._changeState('PATROL');
                }
                break;

            case 'STUNNED':
                this._wrapTimer = 0;
                this._grabProgress = 0;
                // Suprime atordoamentos forçados da cabeça instantaneamente para que ela nunca 
                // pare de se locomover em grid para cima do jogador
                super._changeState('PATROL');
                break;
        }
    }

    draw(ctx) {
        const ts = 32;
        
        // Coleta de pontos ordenados da ponta da cauda interna (nó 3) até a cabeça
        // Garante que os cabos trançados de conexão permaneçam intactos e fluindo perfeitamente
        // mesmo nos trechos onde a blindagem dos módulos foi completamente destruída
        const points = [];
        if (this._cableVisualNodes && this._cableVisualNodes.length === 4) {
            for (let i = 3; i >= 0; i--) {
                points.push({ x: this._cableVisualNodes[i].x, y: this._cableVisualNodes[i].y });
            }
        }
        points.push({ x: this._visualX, y: this._visualY });

        // 1. Cabos trançados procedurais unindo toda a cadeia viva
        if (points.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            let trimStart = 0;
            if (this._dead && this._deathTimer !== undefined) {
                const totalLength = points.length - 1;
                // Recolhe vetorialmente o cabo da cauda em direção à cabeça
                trimStart = Math.min(totalLength, (this._deathTimer / 500) * totalLength);
            }
            
            for (let cIdx = 0; cIdx < 3; cIdx++) {
                ctx.beginPath();
                ctx.strokeStyle = cIdx === 1 ? '#e74c3c' : '#1a1a1a';
                ctx.lineWidth = cIdx === 1 ? 2.5 : 4.5;
                
                let startedPath = false;
                for (let ptIdx = 0; ptIdx < points.length - 1; ptIdx++) {
                    const pA = points[ptIdx];
                    const pB = points[ptIdx + 1];
                    const steps = 10;
                    for (let s = 0; s <= steps; s++) {
                        const t = s / steps;
                        const currentT = ptIdx + t;
                        if (currentT < trimStart) continue;

                        const lX = pA.x + (pB.x - pA.x) * t;
                        const lY = pA.y + (pB.y - pA.y) * t;
                        
                        const angle = Math.atan2(pB.y - pA.y, pB.x - pA.x);
                        const nX = Math.cos(angle + Math.PI / 2);
                        const nY = Math.sin(angle + Math.PI / 2);
                        
                        const phase = cIdx * ((Math.PI * 2) / 3);
                        const wave = Math.sin(t * Math.PI * 3 + this._animFrame * 0.1 + phase) * 4.0;
                        
                        const drawX = (lX + 0.5) * ts + nX * wave;
                        const drawY = (lY + 0.5) * ts + nY * wave;
                        
                        if (!startedPath) {
                            ctx.moveTo(drawX, drawY);
                            startedPath = true;
                        } else {
                            ctx.lineTo(drawX, drawY);
                        }
                    }
                }
                if (startedPath) ctx.stroke();
            }
            ctx.restore();
        }

        // 2. Base dos segmentos vivos
        const drawSegmentBase = (seg, isTail) => {
            if (!seg || seg.isDead) return;
            ctx.save();
            const cx = (seg.visualX + 0.5) * ts;
            const cy = (seg.visualY + 0.5) * ts;
            ctx.translate(cx, cy);
            ctx.rotate(seg._rotation);

            // Determina se este segmento possui algum segmento vivo atrás dele para feedback de invulnerabilidade
            let hasAliveBehind = false;
            for (let i = seg._segmentIndex + 1; i <= 4; i++) {
                const sBehind = this[`_segment${i}`];
                if (sBehind && !sBehind.isDead) {
                    hasAliveBehind = true;
                    break;
                }
            }

            // O círculo colorido sólido opaco foi 100% erradicado para manter a visibilidade do sprite

            if (isTail) {
                ctx.fillStyle = '#1a1a1a';
                ctx.beginPath(); ctx.roundRect(-10, -8, 16, 16, 4); ctx.fill();
                
                ctx.fillStyle = '#c0392b';
                ctx.fillRect(-6, -8, 4, 16);
                
                ctx.fillStyle = '#bdc3c7';
                ctx.fillRect(-15, -6, 5, 3);
                ctx.fillRect(-15, -1.5, 5, 3);
                ctx.fillRect(-15, 3, 5, 3);
                
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI*2); ctx.fill();
            } else {
                ctx.fillStyle = '#2c3e50';
                ctx.beginPath(); ctx.roundRect(-8, -10, 16, 20, 3); ctx.fill();
                
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(-4, -11, 8, 22);
                
                const alpha = (Math.sin(this._animFrame * 0.1) * 0.5 + 0.5);
                ctx.fillStyle = `rgba(231, 76, 60, ${alpha})`;
                ctx.beginPath(); ctx.arc(0, -5, 2, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(0, 5, 2, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        };

        // Encontra o segmento de maior índice vivo para desenhar como a ponta da cauda
        let tailDrawn = false;
        for (let i = 4; i >= 1; i--) {
            const seg = this[`_segment${i}`];
            if (seg && !seg.isDead) {
                drawSegmentBase(seg, !tailDrawn);
                tailDrawn = true;
            }
        }

        // 3. Cabo chicote Premium (Verlet Integration Física com Gravidade, Inércia e Relaxamento)
        const hcx = (this._visualX + 0.5) * ts;
        const hcy = (this._visualY + 0.5) * ts;
        
        const isWrap = this._fsm.state === 'WRAP' && typeof game !== 'undefined' && game.player;
        const isGrab = this._grabProgress > 0;

        if (isWrap || isGrab) {
            if (!this._whipPoints) {
                this._whipPoints = [];
                this._whipSegments = 12;
            }

            let endX = hcx;
            let endY = hcy;

            if (isWrap) {
                endX = (game.player.visualX + 0.5) * ts;
                endY = (game.player.visualY + 0.5) * ts;
            } else {
                const maxWhipLen = 2.2 * ts;
                const currentLen = maxWhipLen * this._grabProgress;
                endX = hcx + Math.cos(this._targetRotation) * currentLen;
                endY = hcy + Math.sin(this._targetRotation) * currentLen;
            }

            // Inicializa ou reseta os pontos se a cadeia estiver vazia
            if (this._whipPoints.length !== this._whipSegments + 1) {
                this._whipPoints = [];
                for (let i = 0; i <= this._whipSegments; i++) {
                    const t = i / this._whipSegments;
                    const px = hcx + (endX - hcx) * t;
                    const py = hcy + (endY - hcy) * t;
                    this._whipPoints.push({ x: px, y: py, oldX: px, oldY: py });
                }
            }

            // --- FÍSICA DA CORDA ---
            const currentDist = Math.hypot(endX - hcx, endY - hcy);
            // Em WRAP, dá uma folga de 25 pixels para a gravidade gerar um arco/barriga pendular delicioso.
            // Em GRAB, a corda fica tensa esticando em direção ao bote.
            const desiredTotalLength = isWrap ? Math.max(currentDist + 25, 50) : currentDist;
            const segmentLength = desiredTotalLength / this._whipSegments;

            // 1. Integração de Verlet (Gravidade e Inércia)
            for (let i = 1; i < this._whipSegments; i++) {
                const p = this._whipPoints[i];
                const vx = (p.x - p.oldX) * 0.85; // Atrito/Damping
                const vy = (p.y - p.oldY) * 0.85;

                p.oldX = p.x;
                p.oldY = p.y;
                p.x += vx;
                p.y += vy + 1.8; // Gravidade puxando os cabos pesados para o chão
            }

            // 2. Múltiplas iterações de relaxamento (Constraints) para consistência
            for (let iter = 0; iter < 12; iter++) {
                for (let i = 0; i < this._whipSegments; i++) {
                    const p1 = this._whipPoints[i];
                    const p2 = this._whipPoints[i + 1];
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const dist = Math.hypot(dx, dy) || 0.001;
                    
                    const diff = segmentLength - dist;
                    const percent = (diff / dist) * 0.5;
                    const ox = dx * percent;
                    const oy = dy * percent;

                    if (i !== 0) { p1.x -= ox; p1.y -= oy; }
                    if (i + 1 !== this._whipSegments) { p2.x += ox; p2.y += oy; }
                }
                // Força o pino inicial (Boca) e final (Alvo)
                this._whipPoints[0].x = hcx; this._whipPoints[0].y = hcy;
                this._whipPoints[this._whipSegments].x = endX; this._whipPoints[this._whipSegments].y = endY;
            }

            // --- RENDERIZAÇÃO VISUAL PREMIUM ---
            ctx.save();
            
            // Sombra/Base espessa do chicote
            ctx.beginPath();
            ctx.moveTo(this._whipPoints[0].x, this._whipPoints[0].y);
            for (let i = 1; i <= this._whipSegments; i++) ctx.lineTo(this._whipPoints[i].x, this._whipPoints[i].y);
            ctx.strokeStyle = 'rgba(26, 26, 26, 0.6)';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            // Cabo elétrico principal
            ctx.beginPath();
            ctx.moveTo(this._whipPoints[0].x, this._whipPoints[0].y);
            for (let i = 1; i <= this._whipSegments; i++) ctx.lineTo(this._whipPoints[i].x, this._whipPoints[i].y);
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 4;
            ctx.stroke();

            // Núcleo incandescente de energia
            ctx.beginPath();
            ctx.moveTo(this._whipPoints[0].x, this._whipPoints[0].y);
            for (let i = 1; i <= this._whipSegments; i++) ctx.lineTo(this._whipPoints[i].x, this._whipPoints[i].y);
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 2]);
            ctx.stroke();

            // Desenho da Garra/Conector final na ponta do chicote
            const prevP = this._whipPoints[this._whipSegments - 1];
            const plugAngle = Math.atan2(endY - prevP.y, endX - prevP.x);
            
            ctx.translate(endX, endY);
            ctx.rotate(plugAngle);
            ctx.fillStyle = '#bdc3c7';
            ctx.fillRect(-6, -5, 8, 10);
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath(); ctx.arc(3, 0, 3.5, 0, Math.PI*2); ctx.fill();

            // Se em WRAP, renderiza os anéis elétricos asfixiantes ao redor do jogador
            if (isWrap) {
                ctx.rotate(-plugAngle);
                ctx.strokeStyle = '#e74c3c';
                ctx.lineWidth = 2.5;
                ctx.setLineDash([]);
                const ringPhase = this._animFrame * 0.15;
                ctx.beginPath();
                ctx.ellipse(0, 0, 18, 12, ringPhase, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();
        } else {
            // Limpa a cache de física quando a língua não está ejetada
            this._whipPoints = null;
        }

        // 4. Cabeça
        ctx.save();
        ctx.translate(hcx, hcy);
        ctx.rotate(this._rotation);

        if (this._dead && this._deathTimer !== undefined) {
            if (this._deathTimer > 600) {
                const headScale = Math.max(0, 1.0 - (this._deathTimer - 600) / 60);
                if (headScale === 0) { ctx.restore(); return; }
                ctx.scale(headScale, headScale);
            }
        }

        // A cabeça checa ativamente se qualquer um dos 4 segmentos existe para aplicar feedback de escudo
        let anyAlive = false;
        for (let i = 1; i <= 4; i++) {
            const s = this[`_segment${i}`];
            if (s && !s.isDead) {
                anyAlive = true;
                break;
            }
        }

        // A carcaça nunca mais é apagada pelo círculo roxo/branco intrusivo

        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.roundRect(-12, -11, 24, 22, 6);
        ctx.fill();

        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.roundRect(-6, -8, 16, 16, 3);
        ctx.fill();

        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-2, -12, 6, 2);
        ctx.fillRect(-2, 10, 6, 2);

        ctx.fillStyle = '#e74c3c';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#e74c3c';
        
        ctx.beginPath(); ctx.arc(6, -5, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(6, 5, 2.5, 0, Math.PI*2); ctx.fill();
        
        if (this._fsm.state === 'STRETCH' || this._fsm.state === 'GRAB') {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(8, 0, 1.5, 0, Math.PI*2); ctx.fill();
        }
        
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(12, -6, 4, 3);
        ctx.fillRect(12, 3, 4, 3);

        ctx.restore();
    }
}

// --- SPECIFIC IMPLEMENTATION: GLITCH WALKER (👻 / ENTIDADE INSTÁVEL) ---

class GlitchWalker extends PatrollingEnemy {
    constructor(x, y, config = {}) {
        super(x, y, {
            health: 3, // 3 quarters
            speed: 1.8, // Rápido ao patrulhar/atacar
            damage: 2, // 0.5 hearts por ataque
            ...config
        });
        this._voiceMethod = 'speakGlitch';
        this._debrisPalette = ['#9b59b6', '#00ffcc', '#4a154b', '#2c3e50'];
        this._fsm.state = 'PATROL';
        
        this._opacity = 1.0;
        this._portalScale = 0;
        this._teleportInterval = 120 + Math.floor(Math.random() * 120); // Mais agressivo, 2 a 4 segundos
        this._teleportDuration = 60 + Math.floor(Math.random() * 90); // Rápido oculto, 1 a 2.5 segundos
        this._targetTeleportX = x;
        this._targetTeleportY = y;
        this._attackDashTarget = null;
        this._animFrame = 0;

        // Controle detalhado de Variantes de Ataque
        this._attackVariant = 0; // 0: Simples, 1: 3 investidas seguidas, 2: Bote-Teleporte triplo
        this._dashCount = 0;
        this._dashSubState = 'DASHING'; // 'DASHING', 'PAUSING', 'FAST_FADE', 'FAST_FADE_IN'
        this._dashSubTimer = 0;
    }

    update(game) {
        if (this._isDying) {
            this._portalScale = 0;
            super.update(game);
            return;
        }
        if (this._dead) return;

        this._animFrame++;
        
        // Garante visibilidade se o estado sair do loop de ataque/portal por stun/interrupções
        if (this._fsm.state === 'PATROL' || this._fsm.state === 'CHASE' || this._fsm.state === 'STUNNED') {
            this._opacity = 1.0;
            this._portalScale = 0;
        }

        super.update(game);

        // Suaviza a rotação
        let angleDiff = this._targetRotation - this._rotation;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this._rotation += angleDiff * 0.2;

        // Rastro cibernético com a própria arte da entidade no ataque
        if (this._fsm.state === 'ATTACK' && typeof Graphics !== 'undefined' && Graphics.spawnGlitchEcho) {
            if (this._animFrame % 2 === 0) {
                Graphics.spawnGlitchEcho(this._visualX, this._visualY, this._rotation, this._animFrame, this._fsm.state);
            }
        }
    }

    _prepareDashTarget(game) {
        if (game && game.player) {
            this._attackDashTarget = { x: game.player.x, y: game.player.y };
            const angle = Math.atan2(game.player.y - this._y, game.player.x - this._x);
            this._targetRotation = angle;
        } else {
            this._attackDashTarget = null;
        }
    }

    _updateAI(game) {
        switch (this._fsm.state) {
            case 'PATROL':
                super.executePatrol(game);
                
                // 1. GATILHO IMEDIATO ASSIM QUE DETECTAR O JOGADOR
                if (game && game.player && !game.player.isDead) {
                    const dx = this._x - game.player.x;
                    const dy = this._y - game.player.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    // Raio ampliado de detecção imediata com linha de visão
                    if (dist <= 5.5 && this._checkLineOfSight(game, game.player.x, game.player.y)) {
                        this._changeState('FADE');
                        if (typeof RobotVoice !== 'undefined' && RobotVoice.speakGlitch) {
                            RobotVoice.speakGlitch('fade', this._visualX, this._visualY);
                        }
                        return;
                    }
                }
                
                // Gatilho por tempo caso esteja fora da linha de visão
                if (this._fsm.timer > this._teleportInterval) {
                    this._changeState('FADE');
                    if (typeof RobotVoice !== 'undefined' && RobotVoice.speakGlitch) {
                        RobotVoice.speakGlitch('fade', this._visualX, this._visualY);
                    }
                }
                break;

            case 'FADE':
                // Desaparecimento ultra-rápido (35 frames total)
                if (this._fsm.timer <= 12) {
                    this._portalScale = this._fsm.timer / 12;
                    this._opacity = 1.0;
                } else if (this._fsm.timer <= 24) {
                    this._portalScale = 1.0;
                    this._opacity = 1.0 - ((this._fsm.timer - 12) / 12);
                } else if (this._fsm.timer <= 35) {
                    this._opacity = 0.0;
                    this._portalScale = 1.0 - ((this._fsm.timer - 24) / 11);
                } else {
                    this._portalScale = 0.0;
                    this._opacity = 0.0;
                    
                    this._selectTeleportTarget(game);
                    
                    this._teleportDuration = 60 + Math.floor(Math.random() * 90); // 1 a 2.5 segundos oculto
                    this._changeState('TELEPORT');
                    if (typeof RobotVoice !== 'undefined' && RobotVoice.speakGlitch) {
                        RobotVoice.speakGlitch('teleport', this._visualX, this._visualY);
                    }
                }
                break;

            case 'TELEPORT':
                this._portalScale = 0.0;
                this._opacity = 0.0;
                if (this._fsm.timer > this._teleportDuration) {
                    this._x = this._targetTeleportX;
                    this._y = this._targetTeleportY;
                    this._visualX = this._x;
                    this._visualY = this._y;
                    
                    // Sorteio dinâmico das 3 variantes de ataque
                    const r = Math.random();
                    if (r < 0.35) this._attackVariant = 0; // 35% Simples
                    else if (r < 0.70) this._attackVariant = 1; // 35% 3 Investidas consecutivas
                    else this._attackVariant = 2; // 30% Combo Investida-Teleporte Triplo

                    this._dashCount = 0;
                    this._changeState('FADE_IN');
                    if (typeof RobotVoice !== 'undefined' && RobotVoice.speakGlitch) {
                        RobotVoice.speakGlitch('reappear', this._visualX, this._visualY);
                    }
                }
                break;

            case 'FADE_IN':
                // Emerge ultra-rápido (30 frames total)
                if (this._fsm.timer <= 10) {
                    this._portalScale = this._fsm.timer / 10;
                    this._opacity = 0.0;
                } else if (this._fsm.timer <= 20) {
                    this._portalScale = 1.0;
                    this._opacity = (this._fsm.timer - 10) / 10;
                } else if (this._fsm.timer <= 30) {
                    this._opacity = 1.0;
                    this._portalScale = 1.0 - ((this._fsm.timer - 20) / 10);
                } else {
                    this._opacity = 1.0;
                    this._portalScale = 0.0;
                    
                    this._prepareDashTarget(game);
                    this._dashSubState = 'DASHING';
                    this._dashSubTimer = 0;
                    this._changeState('ATTACK');
                    if (typeof RobotVoice !== 'undefined' && RobotVoice.speakGlitch) {
                        RobotVoice.speakGlitch('attack', this._visualX, this._visualY);
                    }
                }
                break;

            case 'ATTACK':
                this._dashSubTimer++;
                
                if (this._dashSubState === 'DASHING') {
                    // Executa o bote por 18 frames
                    if (this._dashSubTimer <= 18 && this._attackDashTarget) {
                        const dx = this._attackDashTarget.x - this._x;
                        const dy = this._attackDashTarget.y - this._y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist > 0.1) {
                            const moveAngle = Math.atan2(dy, dx);
                            this._targetRotation = moveAngle;
                            const dashSpeed = 6.0 / 60; // Bote altamente letal e veloz
                            const step = Math.min(dist, dashSpeed);
                            const nextX = this._x + Math.cos(moveAngle) * step;
                            const nextY = this._y + Math.sin(moveAngle) * step;
                            
                            const cx = Math.floor(nextX);
                            const cy = Math.floor(nextY);
                            if (!game.isTileSolid(cx, cy) && !game.blocks.some(b => b.x === cx && b.y === cy)) {
                                this._x = nextX;
                                this._y = nextY;
                            }
                        }
                    } else {
                        // Investida concluída
                        this._dashCount++;
                        
                        if (this._attackVariant === 0) {
                            // Variante 0: Ataque simples (1 investida e recua)
                            this._changeState('COOLDOWN');
                        } else if (this._attackVariant === 1) {
                            // Variante 1: 3 investidas seguidas
                            if (this._dashCount < 3) {
                                this._dashSubState = 'PAUSING';
                                this._dashSubTimer = 0;
                            } else {
                                this._changeState('COOLDOWN');
                            }
                        } else if (this._attackVariant === 2) {
                            // Variante 2: Bote-Teleporte Triplo
                            if (this._dashCount < 3) {
                                this._dashSubState = 'FAST_FADE';
                                this._dashSubTimer = 0;
                            } else {
                                this._changeState('COOLDOWN');
                            }
                        }
                    }
                }
                else if (this._dashSubState === 'PAUSING') {
                    // Pequena pausa (12 frames) reajustando direção do jogador
                    if (this._dashSubTimer > 12) {
                        this._prepareDashTarget(game);
                        this._dashSubState = 'DASHING';
                        this._dashSubTimer = 0;
                    }
                }
                else if (this._dashSubState === 'FAST_FADE') {
                    // Desaparece como fantasma instantaneamente (10 frames)
                    this._opacity = Math.max(0, 1.0 - (this._dashSubTimer / 10));
                    if (this._dashSubTimer >= 10) {
                        this._opacity = 0.0;
                        this._selectTeleportTarget(game);
                        this._x = this._targetTeleportX;
                        this._y = this._targetTeleportY;
                        this._visualX = this._x;
                        this._visualY = this._y;
                        
                        this._dashSubState = 'FAST_FADE_IN';
                        this._dashSubTimer = 0;
                    }
                }
                else if (this._dashSubState === 'FAST_FADE_IN') {
                    // Reaparece de surpresa (10 frames)
                    this._opacity = Math.min(1.0, this._dashSubTimer / 10);
                    if (this._dashSubTimer >= 10) {
                        this._opacity = 1.0;
                        this._prepareDashTarget(game);
                        this._dashSubState = 'DASHING';
                        this._dashSubTimer = 0;
                        if (typeof RobotVoice !== 'undefined' && RobotVoice.speakGlitch) {
                            RobotVoice.speakGlitch('attack', this._visualX, this._visualY);
                        }
                    }
                }
                break;

            case 'COOLDOWN':
                // Se completou a Variante 2 (Combo muito intenso), fica um pouco mais parado/vulnerável
                const targetDuration = (this._attackVariant === 2) ? 90 : 45;
                if (this._fsm.timer > targetDuration) {
                    this._teleportInterval = 120 + Math.floor(Math.random() * 120);
                    this._changeState('PATROL');
                }
                break;

            default:
                super._updateAI(game);
                break;
        }
    }

    _selectTeleportTarget(game) {
        if (!game || !game.player || !game.map || !game.map[0]) return;
        
        const px = game.player.x;
        const py = game.player.y;
        const pDir = game.player.dir;
        
        let sightAngle = 0;
        if (pDir === 0) sightAngle = 0;
        else if (pDir === 1) sightAngle = Math.PI / 2;
        else if (pDir === 2) sightAngle = Math.PI;
        else if (pDir === 3) sightAngle = -Math.PI / 2;

        const validCandidates = [];
        const fallbackCandidates = [];

        const mapH = game.map.length;
        const mapW = game.map[0].length;

        for (let ty = Math.max(0, Math.floor(py - 6)); ty <= Math.min(mapH - 1, Math.floor(py + 6)); ty++) {
            for (let tx = Math.max(0, Math.floor(px - 6)); tx <= Math.min(mapW - 1, Math.floor(px + 6)); tx++) {
                const dx = tx - px;
                const dy = ty - py;
                const dist = Math.sqrt(dx*dx + dy*dy);
                // Raio estrito de reaparecimento: muito próximo (no máximo 3 tiles), porém mantendo margem para não fundir no jogador
                if (dist >= 1.5 && dist <= 3.0) {
                    if (!game.isTileSolid(tx, ty) && !game.blocks.some(b => b.x === tx && b.y === ty)) {
                        const targetAngle = Math.atan2(dy, dx);
                        let angleDiff = Math.abs(targetAngle - sightAngle);
                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                        angleDiff = Math.abs(angleDiff);
                        
                        const isBlindSpot = angleDiff >= Math.PI / 3;

                        if (isBlindSpot) {
                            validCandidates.push({ x: tx, y: ty });
                        } else {
                            fallbackCandidates.push({ x: tx, y: ty });
                        }
                    }
                }
            }
        }

        if (validCandidates.length > 0) {
            const chosen = validCandidates[Math.floor(Math.random() * validCandidates.length)];
            this._targetTeleportX = chosen.x;
            this._targetTeleportY = chosen.y;
        } else if (fallbackCandidates.length > 0) {
            const chosen = fallbackCandidates[Math.floor(Math.random() * fallbackCandidates.length)];
            this._targetTeleportX = chosen.x;
            this._targetTeleportY = chosen.y;
        } else {
            this._targetTeleportX = this._x;
            this._targetTeleportY = this._y;
        }
    }

    get isIntangible() {
        return this._opacity <= 0.2 || this._fsm.state === 'TELEPORT' || this._fsm.state === 'FADE';
    }

    _checkPlayerCollision(game) {
        if (this.isIntangible) return;
        super._checkPlayerCollision(game);
    }

    takeDamage(amount, game) {
        if (this._fsm.state === 'TELEPORT') return;
        super.takeDamage(amount, game);
    }

    draw(ctx) {
        if (typeof Graphics !== 'undefined' && Graphics.drawGlitchWalker) {
            Graphics.drawGlitchWalker(
                this._visualX, 
                this._visualY, 
                this._rotation, 
                this._animFrame, 
                this._fsm.state, 
                this._flashTimer, 
                this._opacity, 
                this._portalScale, 
                this._isDying, 
                this._deathTimer, 
                this._deathDir, 
                this._fragmentOffsets, 
                ctx
            );
        }
    }
}

// --- FACTORY ---

const EnemyFactory = {
    create(x, y, type, config = {}) {
        switch (type) {
            case 'logistic':
            case '∞':
            default:
                return new LogisticBot(x, y, config);
            case 'repair':
            case '∆':
                return new RepairUnit(x, y, config);
            case 'courier':
            case '░':
                return new DataCourier(x, y, config);
            case 'spark':
            case '®':
                return new SparkJumper(x, y, config);
            case 'weld':
            case '£':
                return new WeldBot(x, y, config);
            case 'brick':
            case '▒':
            case '🧱':
                return new BrickStack(x, y, config);
            case 'cable':
            case '§':
                return new CableSnake(x, y, config);
            case 'glitch':
            case 'ʬ':
                return new GlitchWalker(x, y, config);
        }
    }
};

window.EnemySystem = {
    EnemyBase,
    PatrollingEnemy,
    LogisticBot,
    RepairUnit,
    DataCourier,
    EnemyFactory,
    BrickStack,
    CableSnake,
    CableSnakeSegment,
    GlitchWalker
};

