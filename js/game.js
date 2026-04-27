// Core Game Engine for Circuit Breaker
// Handles state, physics, and energy logic

const DIRS = { RIGHT: 0, DOWN: 1, LEFT: 2, UP: 3 };

class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.levelIndex = 0;
        this.map = [];
        this.blocks = [];
        this.targets = [];
        this.forbiddens = [];
        this.sources = [];
        this.redSources = [];
        this.wires = [];
        this.brokenCores = [];
        this.scrapPositions = new Set();
        this.totalScrap = 0;
        this.scrapCollected = 0;
        this.conveyors = [];
        this.doors = [];
        this.buttons = [];
        this.purpleButtons = [];
        this.quantumFloors = [];
        this.debris = []; // Persistent crushed pieces

        this.player = {
            x: 0, y: 0, dir: DIRS.DOWN, 
            visualX: 0, visualY: 0, 
            visorTimer: 0, visorColor: '#00f0ff',
            isDead: false, deathType: null, deathTimer: 0, deathDir: null
        };
        this.moves = 30;
        this.moveCount = 0;
        this.time = 60;
        this.score = 0;
        this.lives = 3;
        this.state = 'PLAYING';
        this.history = [];
        this.economyBonus = 0;

        this.poweredWires = new Map();
        this.poweredBlocks = new Map();
        this.poweredTargets = new Map();
        this.poweredStations = new Set();

        this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
        this.transitionState = 'WAITING'; // WAITING, OPENING, NONE, CLOSING
        this.transitionProgress = 1.0;
        this.transitionLabel = 'CIRCUIT BREAKER';
        this.transitionCallback = null;
        this.transitionStayClosed = true; // Initial start
        
        this.hitStopTimer = 0;
    }

    loadLevel(idx, isReboot = false) {
        this.levelIndex = idx;
        const level = LEVELS[idx];
        if (!level) return;

        this.map = level.map.map(row => row.split(''));
        this.time = level.timer || 60;
        this.moves = level.time || 30;
        this.maxMoves = this.moves;
        this.moveCount = 0;
        this.history = [];
        this.debris = [];
        this.poweredStations.clear();
        this.scrapPositions.clear();
        this.totalScrap = 0;
        this.scrapCollected = 0;
        
        this.sources = [];
        this.redSources = [];
        this.targets = [];
        this.forbiddens = [];
        this.wires = [];
        this.brokenCores = [];
        this.blocks = [];
        this.conveyors = [];
        this.doors = [];
        this.buttons = [];
        this.purpleButtons = [];
        this.quantumFloors = [];
        this.chargingStations = [];

        const h = this.map.length;
        const w = this.map[0].length;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const c = this.map[y][x];
                if (c === '@') {
                    this.player.x = x; this.player.y = y;
                    this.player.visualX = x; this.player.visualY = y;
                    this.startPos = { x, y };
                    this.map[y][x] = ' ';
                } else if (c === 'B') this.sources.push({ x, y });
                else if (c === 'X') this.redSources.push({ x, y });
                else if (c === 'T' || (c >= '1' && c <= '9')) {
                    const req = (c === 'T' ? 1 : parseInt(c));
                    this.targets.push({ x, y, required: req });
                }
                else if (c === 'Z') this.brokenCores.push({ x, y });
                else if (['H','V','+','L','J','C','F','u','d','l','r'].includes(c)) {
                    this.wires.push({ x, y, type: c });
                } else if (c === 'K') {
                    this.chargingStations.push({ x, y });
                }
            }
        }

        // Always add spawn as a station
        if (!this.chargingStations.some(s => s.x === this.startPos.x && s.y === this.startPos.y)) {
            this.chargingStations.push({ ...this.startPos });
        }

        // Overlays
        if (level.overlays) {
            for (let y = 0; y < level.overlays.length; y++) {
                for (let x = 0; x < level.overlays[0].length; x++) {
                    const c = level.overlays[y][x];
                    if (['(', ')', '[', ']'].includes(c)) {
                        let dir = DIRS.LEFT;
                        if (c === ')') dir = DIRS.RIGHT;
                        if (c === '[') dir = DIRS.UP;
                        if (c === ']') dir = DIRS.DOWN;
                        this.conveyors.push({ x, y, dir, inDir: null, beltDist: 0, beltLength: 1 });
                    } else if (c === 'S') {
                        this.scrapPositions.add(`${x},${y}`);
                        this.totalScrap++;
                    } else if (c === 'D') {
                        const chan = (level.links && level.links[`${x},${y}`]) || 0;
                        this.doors.push({ x, y, state: 'CLOSED', visualOpen: 0, error: false, channel: chan, orientation: 'V' });
                    } else if (c === '_') {
                        const chan = (level.links && level.links[`${x},${y}`]) || 0;
                        const isTog = (level.links && level.links[`${x},${y}_toggle`]) === true;
                        this.buttons.push({ x, y, isPressed: false, channel: chan, isToggle: isTog });
                    } else if (c === 'P') {
                        const chan = (level.links && level.links[`${x},${y}`]) || 0;
                        const isTog = (level.links && level.links[`${x},${y}_toggle`]) === true;
                        this.purpleButtons.push({ x, y, isPressed: false, channel: chan, isToggle: isTog });
                    } else if (c === '?') {
                        const chan = (level.links && level.links[`${x},${y}`]) || 0;
                        this.quantumFloors.push({ 
                            x, y, active: true, channel: chan, 
                            flashTimer: 0, pulseIntensity: 1.0, entrySide: null, whiteGlow: 0,
                            restoreTimer: 0 // Delay to reactivate
                        });
                    }
                }
            }
        }

        // Setup Conveyor connectivity
        this._linkConveyors();

        // Blocks Layer
        if (level.blocks) {
            for (let y = 0; y < level.blocks.length; y++) {
                for (let x = 0; x < level.blocks[0].length; x++) {
                    const c = level.blocks[y][x];
                    if (['>', '<', '^', 'v'].includes(c)) {
                        let dir = DIRS.RIGHT;
                        if (c === '<') dir = DIRS.LEFT;
                        if (c === '^') dir = DIRS.UP;
                        if (c === 'v') dir = DIRS.DOWN;
                        this.blocks.push({ x, y, dir, visualX: x, visualY: y, visualAngle: dir * (Math.PI / 2) });
                    }
                }
            }
        }

        this.player.isDead = false;
        this.player.deathTimer = 0;
        this.state = 'PLAYING';
        this.updateEnergy();
        this.camera.x = this.player.x * 32 - 320 + 16;
        this.camera.y = this.player.y * 32 - 240 + 16;
        
        if (!isReboot) AudioSys.playGameMusic();
        AudioSys.setMusicIntensity(1);
    }

    _linkConveyors() {
        // Determine inDirs for corners
        for (const c of this.conveyors) {
            c.inDir = null;
            c.beltDist = undefined;
            for (const other of this.conveyors) {
                if (other === c) continue;
                let ox = other.x, oy = other.y;
                if (other.dir === DIRS.RIGHT) ox++;
                else if (other.dir === DIRS.LEFT) ox--;
                else if (other.dir === DIRS.DOWN) oy++;
                else if (other.dir === DIRS.UP) oy--;
                if (ox === c.x && oy === c.y) { c.inDir = other.dir; break; }
            }
        }

        // Trace paths for scrolling animation alignment
        const tracePath = (c, d, chain) => {
            c.beltDist = d;
            chain.push(c);
            let nx = c.x, ny = c.y;
            if (c.dir === DIRS.RIGHT) nx++;
            else if (c.dir === DIRS.LEFT) nx--;
            else if (c.dir === DIRS.DOWN) ny++;
            else if (c.dir === DIRS.UP) ny--;
            const next = this.conveyors.find(cv => cv.x === nx && cv.y === ny);
            if (next && next.beltDist === undefined) tracePath(next, d + 1, chain);
        };

        const chains = [];
        for (const c of this.conveyors) {
            if (c.inDir === null && c.beltDist === undefined) {
                const chain = [];
                tracePath(c, 0, chain);
                chains.push(chain);
            }
        }
        // Handle loops
        for (const c of this.conveyors) {
            if (c.beltDist === undefined) {
                const chain = [];
                tracePath(c, 0, chain);
                chains.push(chain);
            }
        }
        for (const chain of chains) {
            const len = chain.length;
            for (const c of chain) c.beltLength = len;
        }
    }

    update() {
        if (this.state === 'GAMEOVER' || this.state === 'WINNING') return;

        // Spring Physics for Blocks
        for (const b of this.blocks) {
            b.visualX += (b.x - b.visualX) * 0.2;
            b.visualY += (b.y - b.visualY) * 0.2;
            
            // Shortest path angle lerp
            let targetAngle = b.dir * (Math.PI / 2);
            let diff = targetAngle - b.visualAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            b.visualAngle += diff * 0.2;
        }

        // Visual Lerp for Player
        this.player.visualX += (this.player.x - this.player.visualX) * 0.25;
        this.player.visualY += (this.player.y - this.player.visualY) * 0.25;
        if (this.player.visorTimer > 0) this.player.visorTimer--;

        // Death logic
        if (this.player.isDead) {
            this.player.deathTimer++;
            if (this.player.deathTimer > 60) {
                this.lives--;
                if (this.lives <= 0) {
                    this.state = 'GAMEOVER';
                    ResultScreen.open(this, true);
                } else {
                    this.loadLevel(this.levelIndex, true);
                }
            }
            return;
        }

        // Camera
        this.camera.targetX = this.player.visualX * 32 - 320 + 16;
        this.camera.targetY = this.player.visualY * 32 - 240 + 16;
        this.camera.x += (this.camera.targetX - this.camera.x) * 0.1;
        this.camera.y += (this.camera.targetY - this.camera.y) * 0.1;

        // Button logic (unpressed if nothing on top)
        for (const btn of this.buttons) {
            const onTop = (this.player.x === btn.x && this.player.y === btn.y) || 
                          this.blocks.some(b => b.x === btn.x && b.y === btn.y);
            
            if (onTop && !btn.isPressed) {
                btn.isPressed = true;
                AudioSys.playTone(300, 'sine', 0.1, 0.1);
                this.updateEnergy();
            } else if (!onTop && btn.isPressed && !btn.isToggle) {
                btn.isPressed = false;
                this.updateEnergy();
            }
        }
        for (const btn of this.purpleButtons) {
            const onTop = (this.player.x === btn.x && this.player.y === btn.y) || 
                          this.blocks.some(b => b.x === btn.x && b.y === btn.y);
            
            if (onTop && !btn.isPressed) {
                btn.isPressed = true;
                AudioSys.playTone(400, 'sine', 0.1, 0.1);
                this.updateEnergy();
            } else if (!onTop && btn.isPressed && !btn.isToggle) {
                btn.isPressed = false;
                this.updateEnergy();
            }
        }

        // Quantum Floor Restore Timer
        for (const qf of this.quantumFloors) {
            const onTop = (this.player.x === qf.x && this.player.y === qf.y) || 
                          this.blocks.some(b => b.x === qf.x && b.y === qf.y);
            
            if (onTop) {
                qf.restoreTimer = 90; // 1.5s @ 60fps
            } else if (qf.restoreTimer > 0) {
                qf.restoreTimer--;
            }
        }

        // Door visual state
        for (const d of this.doors) {
            const target = (d.state === 'OPEN') ? 1.0 : 0.0;
            d.visualOpen += (target - d.visualOpen) * 0.15;
        }

        // Scrap collection
        if (this.scrapPositions.has(`${this.player.x},${this.player.y}`)) {
            this.scrapPositions.delete(`${this.player.x},${this.player.y}`);
            this.scrapCollected++;
            AudioSys.collect();
            Graphics.spawnSparks(this.player.x * 32 + 16, this.player.y * 32 + 16, '#ffcc00');
        }
    }

    startTransition(callback, stayClosed = false, label = 'CIRCUIT BREAKER') {
        if (this.transitionState !== 'NONE') return;
        this.transitionState = 'CLOSING';
        this.transitionProgress = 0;
        this.transitionCallback = callback;
        this.transitionStayClosed = stayClosed;
        this.transitionLabel = label;
    }

    startReverse(callback) {
        this.state = 'REVERSING';
        AudioSys.playTone(100, 'sawtooth', 0.8, 0.3);
        setTimeout(() => {
            callback();
            this.state = 'PLAYING';
        }, 1000);
    }

    saveHistory() {
        const snap = {
            px: this.player.x, py: this.player.y, pd: this.player.dir,
            moves: this.moves,
            blocks: this.blocks.map(b => ({ x: b.x, y: b.y, d: b.dir })),
            scrap: new Set(this.scrapPositions),
            scrapCount: this.scrapCollected,
            buttons: this.buttons.map(b => b.isPressed),
            purple: this.purpleButtons.map(b => b.isPressed)
        };
        this.history.push(snap);
        if (this.history.length > 50) this.history.shift();
    }

    doUndo() {
        if (this.history.length === 0 || this.state !== 'PLAYING') return;
        const snap = this.history.pop();
        this.player.x = snap.px; this.player.y = snap.py; this.player.dir = snap.pd;
        this.moves = snap.moves;
        this.scrapPositions = snap.scrap;
        this.scrapCollected = snap.scrapCount;
        snap.blocks.forEach((bSnap, i) => {
            this.blocks[i].x = bSnap.x;
            this.blocks[i].y = bSnap.y;
            this.blocks[i].dir = bSnap.d;
        });
        snap.buttons.forEach((p, i) => this.buttons[i].isPressed = p);
        snap.purple.forEach((p, i) => this.purpleButtons[i].isPressed = p);
        
        AudioSys.playTone(200, 'sine', 0.1, 0.1);
        this.updateEnergy();
    }

    movePlayer(dx, dy) {
        if (this.state !== 'PLAYING' || this.player.isDead) return;
        
        const nx = this.player.x + dx;
        const ny = this.player.y + dy;

        // Face direction first
        if (dx === 1) this.player.dir = DIRS.RIGHT;
        if (dx === -1) this.player.dir = DIRS.LEFT;
        if (dy === 1) this.player.dir = DIRS.DOWN;
        if (dy === -1) this.player.dir = DIRS.UP;

        // Check bounds & wall
        if (ny < 0 || ny >= this.map.length || nx < 0 || nx >= this.map[0].length) return;
        if (this.map[ny][nx] === '#' || this.map[ny][nx] === 'W') return;

        // Check Doors
        const door = this.doors.find(d => d.x === nx && d.y === ny);
        if (door && door.state === 'CLOSED') {
            AudioSys.playTone(150, 'sawtooth', 0.1, 0.15);
            return;
        }

        // Check Block
        const block = this.blocks.find(b => b.x === nx && b.y === ny);
        if (block) {
            if (this._moveBlock(block, dx, dy)) {
                this._finishMove(nx, ny);
            }
        } else {
            this._finishMove(nx, ny);
        }
    }

    _moveBlock(block, dx, dy) {
        const nx = block.x + dx;
        const ny = block.y + dy;

        if (ny < 0 || ny >= this.map.length || nx < 0 || nx >= this.map[0].length) return false;
        if (this.map[ny][nx] === '#' || this.map[ny][nx] === 'W') return false;

        // Door check for block
        const door = this.doors.find(d => d.x === nx && d.y === ny);
        if (door && door.state === 'CLOSED') return false;

        // Other block check
        if (this.blocks.some(b => b !== block && b.x === nx && b.y === ny)) return false;

        // Check Quantum Crush (Block being pushed into an INACTIVE quantum floor)
        const qf = this.quantumFloors.find(q => q.x === nx && q.y === ny);
        if (qf && !qf.active) {
            this._handleBlockCrush(block);
            return true; // The block "moved" into destruction
        }

        block.x = nx;
        block.y = ny;
        return true;
    }

    _handleBlockCrush(block) {
        AudioSys.playTone(80, 'sawtooth', 0.4, 0.3);
        Graphics.spawnExplosion(block.x * 32 + 16, block.y * 32 + 16, '#00f0ff');
        
        // Remove block and record debris
        this.blocks = this.blocks.filter(b => b !== block);
        this.debris.push({
            x: block.x * 32 + 8 + Math.random() * 16,
            y: block.y * 32 + 8 + Math.random() * 16,
            angle: Math.random() * Math.PI * 2,
            size: 6 + Math.random() * 10
        });

        this.hitStopTimer = 10;
        this.updateEnergy();
    }

    _finishMove(nx, ny) {
        this.saveHistory();
        this.player.x = nx;
        this.player.y = ny;
        this.moves--;
        this.moveCount++;
        
        // Quantum Floor Interaction
        const qf = this.quantumFloors.find(q => q.x === nx && q.y === ny);
        if (qf && !qf.active) {
            this.handleDeath(true, 'CRUSH', nx, ny);
        }

        AudioSys.move();
        this.updateEnergy();

        if (this.moves <= 0) {
            // Check if we are on a station
            if (!this.poweredStations.has(`${this.player.x},${this.player.y}`)) {
                this.handleDeath(false, 'BATTERY');
            }
        }
    }

    handleDeath(isInstant = false, type = 'BATTERY', x = null, y = null) {
        if (this.player.isDead) return;
        this.player.isDead = true;
        this.player.deathType = type;
        this.player.deathTimer = 0;
        
        if (type === 'CRUSH') {
            AudioSys.playTone(100, 'sawtooth', 0.4, 0.4);
            Graphics.spawnExplosion(x * 32 + 16, y * 32 + 16, '#00f0ff');
            this.hitStopTimer = 15;
        } else {
            AudioSys.playTone(300, 'square', 0.5, 0.2);
        }
    }

    interact() {
        if (this.state !== 'PLAYING') return;
        const block = this.blocks.find(b => b.x === this.player.x && b.y === this.player.y);
        if (block) {
            this.saveHistory();
            block.dir = (block.dir + 1) % 4;
            AudioSys.rotate();
            this.updateEnergy();
        }
    }

    updateEnergy() {
        this.poweredWires.clear();
        this.poweredBlocks.clear();
        this.poweredTargets.clear();
        this.poweredStations.clear();

        const queue = [];
        
        // 1. Collect Sources (Blue & Red)
        for (const s of this.sources) queue.push({ x: s.x, y: s.y, type: 'BLUE' });
        for (const s of this.redSources) queue.push({ x: s.x, y: s.y, type: 'RED' });

        const visited = new Set();
        while (queue.length > 0) {
            const { x, y, type } = queue.shift();
            const key = `${x},${y}`;
            if (visited.has(key + type)) continue;
            visited.add(key + type);

            // Power stations
            if (this.chargingStations.some(s => s.x === x && s.y === y)) {
                this.poweredStations.add(key);
            }

            // Power Targets
            const target = this.targets.find(t => t.x === x && t.y === y);
            if (target) {
                let data = this.poweredTargets.get(key);
                if (!data) { data = { charge: 0, contaminated: false }; this.poweredTargets.set(key, data); }
                if (type === 'BLUE') data.charge++;
                else data.contaminated = true;
            }

            // Propagate through Wires
            const wire = this.wires.find(w => w.x === x && w.y === y);
            if (wire) {
                let flow = this.poweredWires.get(key);
                if (!flow) { flow = new Set(); this.poweredWires.set(key, flow); }
                flow.add(type);

                const connections = this.getWireConnections(wire.type);
                for (const d of connections) {
                    let nx = x, ny = y;
                    if (d === DIRS.RIGHT) nx++; else if (d === DIRS.LEFT) nx--;
                    else if (d === DIRS.DOWN) ny++; else if (d === DIRS.UP) ny--;
                    queue.push({ x: nx, y: ny, type });
                }
            }

            // Propagate through Blocks (Amplifiers)
            const block = this.blocks.find(b => b.x === x && b.y === y);
            if (block) {
                let bflow = this.poweredBlocks.get(key);
                if (!bflow) { bflow = new Set(); this.poweredBlocks.set(key, bflow); }
                bflow.add(type);

                let nx = x, ny = y;
                if (block.dir === DIRS.RIGHT) nx++; else if (block.dir === DIRS.LEFT) nx--;
                else if (block.dir === DIRS.DOWN) ny++; else if (block.dir === DIRS.UP) ny--;
                queue.push({ x: nx, y: ny, type });
            }
        }

        // Logic for Interactive Objects (Doors, Quantum Floors)
        const activeChannels = new Set();
        // Check if all targets in a channel are satisfied
        const channelStatus = new Map(); // channel -> {req, cur}
        for (const t of this.targets) {
            const chan = this._getChannelAt(t.x, t.y);
            let stats = channelStatus.get(chan);
            if (!stats) { stats = { req: 0, cur: 0 }; channelStatus.set(chan, stats); }
            stats.req += t.required;
            const data = this.poweredTargets.get(`${t.x},${t.y}`);
            if (data && !data.contaminated) stats.cur += Math.min(t.required, data.charge);
        }

        for (const [chan, stats] of channelStatus) {
            if (stats.cur >= stats.req) activeChannels.add(chan);
        }

        // Buttons also activate channels
        for (const b of this.buttons) if (b.isPressed) activeChannels.add(b.channel);
        for (const b of this.purpleButtons) if (b.isPressed) activeChannels.add(b.channel);

        // Update Doors
        for (const d of this.doors) {
            d.state = activeChannels.has(d.channel) ? 'OPEN' : 'CLOSED';
        }

        // Update Quantum Floors
        for (const qf of this.quantumFloors) {
            const shouldBeActive = !activeChannels.has(qf.channel);
            
            if (qf.active && !shouldBeActive) {
                // Deactivating
                qf.active = false;
                qf.whiteGlow = 1.0;
                AudioSys.playTone(200, 'sine', 0.2, 0.1);
            } else if (!qf.active && shouldBeActive) {
                // Check restore timer (1.5s delay)
                if (qf.restoreTimer <= 0) {
                    qf.active = true;
                    qf.whiteGlow = 1.0;
                    AudioSys.playTone(400, 'sine', 0.2, 0.1);
                    
                    // CRUSH CHECK: If player or block is here when it reactivates
                    if (this.player.x === qf.x && this.player.y === qf.y) {
                        this.handleDeath(true, 'CRUSH', qf.x, qf.y);
                    }
                    const blockOnTop = this.blocks.find(b => b.x === qf.x && b.y === qf.y);
                    if (blockOnTop) {
                        this._handleBlockCrush(blockOnTop);
                    }
                }
            }
        }

        // Check Win Condition
        let allDone = this.targets.length > 0;
        for (const t of this.targets) {
            const data = this.poweredTargets.get(`${t.x},${t.y}`);
            if (!data || data.charge < t.required || data.contaminated) {
                allDone = false; break;
            }
        }

        if (allDone && this.state === 'PLAYING') {
            this.state = 'LEVEL_COMPLETE';
            AudioSys.levelComplete();
            const stars = this._calculateStars();
            const bonus = LevelSelector.completeLevel(this.levelIndex, stars, this.moveCount);
            this.economyBonus = bonus;
            
            setTimeout(() => {
                ResultScreen.open(this);
            }, 1000);
        }
    }

    _calculateStars() {
        const lvl = LEVELS[this.levelIndex];
        const totalTime = lvl.timer || 60;
        const timePercent = (this.time / totalTime) * 100;
        return timePercent > 50 ? 3 : (timePercent > 20 ? 2 : 1);
    }

    _getChannelAt(x, y) {
        const lvl = LEVELS[this.levelIndex];
        return (lvl.links && lvl.links[`${x},${y}`]) || 0;
    }

    getWireConnections(type) {
        if (type === 'H') return [DIRS.RIGHT, DIRS.LEFT];
        if (type === 'V') return [DIRS.DOWN, DIRS.UP];
        if (type === '+') return [DIRS.RIGHT, DIRS.DOWN, DIRS.LEFT, DIRS.UP];
        if (type === 'L') return [DIRS.UP, DIRS.RIGHT];
        if (type === 'J') return [DIRS.UP, DIRS.LEFT];
        if (type === 'C') return [DIRS.DOWN, DIRS.LEFT];
        if (type === 'F') return [DIRS.DOWN, DIRS.RIGHT];
        if (type === 'u') return [DIRS.LEFT, DIRS.RIGHT, DIRS.UP];
        if (type === 'd') return [DIRS.LEFT, DIRS.RIGHT, DIRS.DOWN];
        if (type === 'l') return [DIRS.UP, DIRS.DOWN, DIRS.LEFT];
        if (type === 'r') return [DIRS.UP, DIRS.DOWN, DIRS.RIGHT];
        return [];
    }
}

window.GameState = GameState;