/**
 * CIRCUIT BREAKER - Game Logic Engine
 * Core State Management & Energy Propagation
 */

const DIRS = { UP: 3, RIGHT: 0, DOWN: 1, LEFT: 2 };

class GameState {
    constructor() {
        this.state = 'MENU'; // MENU, PLAYING, GAMEOVER, WINNING, RESULT, REVERSING
        this.levelIndex = 0;
        this.lives = 3;
        
        // Dynamic Objects
        this.player = { x: 0, y: 0, visualX: 0, visualY: 0, dir: DIRS.DOWN, isDead: false, deathType: null, deathTimer: 0, visorTimer: 0, visorColor: null };
        this.blocks = [];
        this.wires = [];
        this.sources = [];
        this.redSources = [];
        this.targets = [];
        this.doors = [];
        this.buttons = [];
        this.purpleButtons = [];
        this.conveyors = [];
        this.quantumFloors = [];
        this.forbiddens = [];
        this.brokenCores = [];
        this.chargingStations = [];
        this.debris = [];
        this.scrapPositions = new Set();
        
        // Powered States (Calculated each move)
        this.poweredWires = new Map(); // key: x,y -> {dirs, color, charge}
        this.poweredBlocks = new Map();
        this.poweredTargets = new Map();
        this.poweredStations = new Set();
        this.poweredDoors = new Set();
        
        // Game Rules
        this.moves = 0;
        this.maxMoves = 0;
        this.time = 0;
        this.timerInterval = null;
        this.scrapCollected = 0;
        this.totalScrap = 0;
        
        // Undos
        this.historyStack = [];
        this.moveCount = 0;

        // Transition logic
        this.transitionState = 'NONE'; // NONE, CLOSING, WAITING, OPENING
        this.transitionProgress = 0;
        this.transitionLabel = '';
        this.transitionStayClosed = false;

        // Visuals
        this.camera = { x: 0, y: 0, lerp: 0.1, deadZone: { width: 120, height: 80 }, softZone: { width: 300, height: 200 }, bias: { x: 0, y: 0 } };
        this.resultTimer = 0;
        this.hitStopTimer = 0;
    }

    loadLevel(index, keepLives = false) {
        if (index < 0 || index >= LEVELS.length) return;
        this.levelIndex = index;
        const lvl = LEVELS[index];

        this.state = 'PLAYING';
        if (!keepLives) this.lives = 3;
        this.moves = lvl.time;
        this.maxMoves = lvl.time;
        this.time = lvl.timer || 60;
        this.scrapCollected = 0;
        this.moveCount = 0;
        this.historyStack = [];
        this.debris = [];
        this.player.isDead = false;
        this.player.deathTimer = 0;
        this.player.deathType = null;
        this.camera.bias = { x: 0, y: 0 };
        this.hitStopTimer = 0;
        
        // Clear old state
        this.blocks = [];
        this.wires = [];
        this.sources = [];
        this.redSources = [];
        this.targets = [];
        this.doors = [];
        this.buttons = [];
        this.purpleButtons = [];
        this.conveyors = [];
        this.quantumFloors = [];
        this.forbiddens = [];
        this.brokenCores = [];
        this.chargingStations = [];
        this.scrapPositions.clear();

        // 1. Parse Map
        const mapH = lvl.map.length;
        const mapW = lvl.map[0].length;
        this.map = lvl.map.map(row => row.split(''));

        for (let y = 0; y < mapH; y++) {
            for (let x = 0; x < mapW; x++) {
                const char = this.map[y][x];
                if (char === '@') {
                    this.player.x = x; this.player.y = y;
                    this.player.visualX = x; this.player.visualY = y;
                    this.map[y][x] = ' '; // Clear start pos
                } else if (char === 'B') {
                    this.sources.push({ x, y, color: 'BLUE' });
                } else if (char === 'X') {
                    this.redSources.push({ x, y, color: 'RED' });
                } else if (char === 'T' || (char >= '1' && char <= '9')) {
                    this.targets.push({ x, y, required: char === 'T' ? 1 : parseInt(char) });
                } else if (char === 'S') {
                    this.scrapPositions.add(`${x},${y}`);
                    this.map[y][x] = ' ';
                } else if (char === 'Z') {
                    this.brokenCores.push({ x, y });
                } else if (char === 'K') {
                    this.chargingStations.push({ x, y });
                }
            }
        }
        this.totalScrap = this.scrapPositions.size;

        // 2. Parse Overlays (Wires/Static Logic)
        if (lvl.overlays) {
            for (let y = 0; y < lvl.overlays.length; y++) {
                const row = lvl.overlays[y];
                for (let x = 0; x < row.length; x++) {
                    const char = row[x];
                    if (['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r'].includes(char)) {
                        this.wires.push({ x, y, type: char });
                    } else if (char === 'D') {
                        // Multi-tile doors
                        let orientation = 'VERTICAL';
                        if ((row[x-1] === '#' || row[x+1] === '#') && lvl.map[y][x-1] === '#' && lvl.map[y][x+1] === '#') orientation = 'HORIZONTAL';
                        
                        const door = { x, y, state: 'CLOSED', error: false, orientation };
                        this.doors.push(door);
                    } else if (char === '_') {
                        const isToggle = lvl.links && lvl.links[`${x},${y}_toggle`];
                        this.buttons.push({ x, y, isPressed: false, isToggle: !!isToggle });
                    } else if (char === 'P') {
                        const isToggle = lvl.links && lvl.links[`${x},${y}_toggle`];
                        this.purpleButtons.push({ x, y, isPressed: false, isToggle: !!isToggle });
                    } else if (['(', ')', '[', ']'].includes(char)) {
                        let dir = DIRS.RIGHT;
                        if (char === '(') dir = DIRS.LEFT;
                        if (char === '[') dir = DIRS.UP;
                        if (char === ']') dir = DIRS.DOWN;
                        this.conveyors.push({ x, y, dir });
                    } else if (char === '?') {
                        this.quantumFloors.push({ x, y, active: true, flashTimer: 0, pulseIntensity: 1.0, entrySide: null, whiteGlow: 0 });
                    }
                }
            }
        }

        // Pair up doors
        this._pairDoors();

        // 3. Parse Blocks
        if (lvl.blocks) {
            for (let y = 0; y < lvl.blocks.length; y++) {
                const row = lvl.blocks[y];
                for (let x = 0; x < row.length; x++) {
                    const char = row[x];
                    let dir = -1;
                    if (char === '>') dir = DIRS.RIGHT;
                    else if (char === '<') dir = DIRS.LEFT;
                    else if (char === '^') dir = DIRS.UP;
                    else if (char === 'v') dir = DIRS.DOWN;
                    if (dir !== -1) {
                        this.blocks.push({ x, y, visualX: x, visualY: y, dir, visualAngle: dir * Math.PI / 2 });
                    }
                }
            }
        }

        // Initialize HUD elements
        document.getElementById('level-name').innerText = lvl.name;
        document.getElementById('score').innerText = `0/${this.totalScrap}`;
        this._updateHUDSegments();

        this.updateEnergy();
        this.updateCamera(true);
        this.refreshConveyorBends();
        
        // Start Timer
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (this.state === 'PLAYING' && this.transitionState === 'NONE') {
                this.time--;
                if (this.time <= 0) this.handleDeath(true); // Explode on timeout
            }
        }, 1000);

        if (window.Graphics) Graphics.clearTrails();
    }

    _pairDoors() {
        for (let i = 0; i < this.doors.length; i++) {
            const d1 = this.doors[i];
            if (d1.pair) continue;
            for (let j = i + 1; j < this.doors.length; j++) {
                const d2 = this.doors[j];
                if (d2.pair) continue;
                // Adjacent check
                if (Math.abs(d1.x - d2.x) + Math.abs(d1.y - d2.y) === 1) {
                    d1.pair = d2; d2.pair = d1;
                    // Assign sides
                    if (d1.x < d2.x) { d1.side = 'LEFT'; d2.side = 'RIGHT'; d1.orientation = 'VERTICAL'; d2.orientation = 'VERTICAL'; }
                    else if (d1.x > d2.x) { d1.side = 'RIGHT'; d2.side = 'LEFT'; d1.orientation = 'VERTICAL'; d2.orientation = 'VERTICAL'; }
                    else if (d1.y < d2.y) { d1.side = 'TOP'; d2.side = 'BOTTOM'; d1.orientation = 'HORIZONTAL'; d2.orientation = 'HORIZONTAL'; }
                    else { d1.side = 'BOTTOM'; d2.side = 'TOP'; d1.orientation = 'HORIZONTAL'; d2.orientation = 'HORIZONTAL'; }
                }
            }
        }
    }

    _updateHUDSegments() {
        // Amps Bar
        let totalReq = 0;
        this.targets.forEach(t => totalReq += t.required);
        const ampsBar = document.getElementById('amps-bar');
        ampsBar.innerHTML = '';
        for (let i = 0; i < totalReq; i++) {
            const seg = document.createElement('div');
            seg.className = 'segment empty';
            ampsBar.appendChild(seg);
        }

        // Lives Bar
        const livesBar = document.getElementById('lives-bar');
        livesBar.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const seg = document.createElement('div');
            seg.className = i < this.lives ? 'segment' : 'segment empty';
            livesBar.appendChild(seg);
        }
    }

    update() {
        if (this.hitStopTimer > 0) {
            this.hitStopTimer--;
            return;
        }

        // 1. Interpolations
        const lerp = 0.25;
        this.player.visualX += (this.player.x - this.player.visualX) * lerp;
        this.player.visualY += (this.player.y - this.player.visualY) * lerp;
        
        // Spawn robot trails when moving fast
        const pSpeed = Math.sqrt((this.player.x - this.player.visualX)**2 + (this.player.y - this.player.visualY)**2);
        if (pSpeed > 0.05 && Math.random() > 0.5) {
            Graphics.spawnTrailSegment(this.player.visualX, this.player.visualY, this.player.dir * Math.PI/2);
        }

        this.blocks.forEach(b => {
            b.visualX += (b.x - b.visualX) * lerp;
            b.visualY += (b.y - b.visualY) * lerp;
            
            // Angle interpolation (handle wraparound)
            let targetAngle = b.dir * Math.PI / 2;
            let diff = targetAngle - b.visualAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            b.visualAngle += diff * 0.2;
        });

        // 2. Systems Update
        this.updateSliding();
        this.updateHUD();
        this.updateTransition();
        this.updateCamera();

        if (this.state === 'REVERSING') this.updateReverse();
        if (this.state === 'WINNING') this.updateWinning();
        
        // Debris Physics
        this.debris.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            p.vx *= 0.95; p.vy *= 0.95;
            p.rot += p.rv;
        });

        // Interactive Object Animation
        this.quantumFloors.forEach(qf => {
            if (qf.flashTimer > 0) qf.flashTimer--;
            // Intensity pulsing
            qf.pulseIntensity = 0.8 + Math.sin(Date.now() / 200) * 0.2;
        });

        if (this.player.visorTimer > 0) this.player.visorTimer--;
        if (this.resultTimer < 100) this.resultTimer++;
    }

    updateHUD() {
        const timeEl = document.getElementById('time');
        const min = Math.floor(this.time / 60);
        const sec = this.time % 60;
        timeEl.innerText = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

        const energyBar = document.getElementById('energy-bar');
        const pct = (this.moves / this.maxMoves) * 100;
        energyBar.style.width = `${pct}%`;
        document.getElementById('power-count').innerText = this.moves;

        // Amps segments
        const ampsBar = document.getElementById('amps-bar');
        let totalCurrent = 0;
        this.targets.forEach(t => {
            const data = this.poweredTargets.get(`${t.x},${t.y}`);
            totalCurrent += data ? Math.min(t.required, data.charge) : 0;
        });
        for (let i = 0; i < ampsBar.children.length; i++) {
            ampsBar.children[i].className = i < totalCurrent ? 'segment' : 'segment empty';
        }

        // Lives segments
        const livesBar = document.getElementById('lives-bar');
        for (let i = 0; i < 3; i++) {
            livesBar.children[i].className = i < this.lives ? 'segment' : 'segment empty';
        }
    }

    updateTransition() {
        const speed = 0.05;
        if (this.transitionState === 'CLOSING') {
            this.transitionProgress += speed;
            if (this.transitionProgress >= 1) {
                this.transitionProgress = 1;
                this.transitionState = 'WAITING';
                if (this.transitionCallback) this.transitionCallback();
                if (!this.transitionStayClosed) this.transitionState = 'OPENING';
            }
        } else if (this.transitionState === 'OPENING') {
            this.transitionProgress -= speed;
            if (this.transitionProgress <= 0) {
                this.transitionProgress = 0;
                this.transitionState = 'NONE';
            }
        }
    }

    startTransition(callback, label = 'SYNCHRONIZING...', stayClosed = false) {
        this.transitionState = 'CLOSING';
        this.transitionProgress = 0;
        this.transitionCallback = callback;
        this.transitionLabel = label;
        this.transitionStayClosed = stayClosed;
        if (window.AudioSys) AudioSys.doorSlam();
    }

    updateWinning() {
        this.victoryTimer--;
        if (this.victoryTimer <= 0) {
            this.state = 'RESULT';
            if (typeof ResultScreen !== 'undefined') ResultScreen.open(this);
        }
    }

    updateReverse() {
        if (this.historyStack.length === 0) {
            this.state = 'PLAYING';
            if (this.onReverseComplete) this.onReverseComplete();
            return;
        }

        const state = this.historyStack.pop();
        this._applyState(state);
        
        // Visual glitch/rewind feedback
        for (let i = 0; i < 3; i++) {
            Graphics.spawnParticle(this.player.visualX * 32 + 16, this.player.visualY * 32 + 16, '#00f0ff', 'spark');
        }

        if (this.historyStack.length === 0 || Math.random() > 0.7) {
            this.state = 'PLAYING';
            if (this.onReverseComplete) this.onReverseComplete();
            this.updateEnergy();
        }
    }

    saveUndo() {
        const state = {
            player: { x: this.player.x, y: this.player.y, dir: this.player.dir },
            blocks: this.blocks.map(b => ({ x: b.x, y: b.y, dir: b.dir })),
            moves: this.moves,
            buttons: this.buttons.map(b => ({ x: b.x, y: b.y, isPressed: b.isPressed })),
            purpleButtons: this.purpleButtons.map(b => ({ x: b.x, y: b.y, isPressed: b.isPressed })),
            doors: this.doors.map(d => ({ x: d.x, y: d.y, state: d.state })),
            quantumFloors: this.quantumFloors.map(q => ({ x: q.x, y: q.y, active: q.active }))
        };
        this.historyStack.push(state);
        if (this.historyStack.length > 50) this.historyStack.shift();
    }

    doUndo() {
        if (this.historyStack.length === 0 || this.player.isDead) return;
        this.state = 'REVERSING';
        if (window.AudioSys) AudioSys.reverse();
    }

    _applyState(s) {
        this.player.x = s.player.x;
        this.player.y = s.player.y;
        this.player.dir = s.player.dir;
        this.moves = s.moves;
        s.blocks.forEach((sb, i) => {
            this.blocks[i].x = sb.x;
            this.blocks[i].y = sb.y;
            this.blocks[i].dir = sb.dir;
        });
        s.buttons.forEach((sb, i) => this.buttons[i].isPressed = sb.isPressed);
        if (s.purpleButtons) s.purpleButtons.forEach((sb, i) => this.purpleButtons[i].isPressed = sb.isPressed);
        s.doors.forEach((sd, i) => this.doors[i].state = sd.state);
        if (s.quantumFloors) s.quantumFloors.forEach((sq, i) => this.quantumFloors[i].active = sq.active);
        this.updateEnergy();
    }

    updateObjects() {
        // Handle physical interactions (buttons/doors)
        const entities = [this.player, ...this.blocks];
        
        // 1. Physical Buttons (Yellow)
        for (const btn of this.buttons) {
            const occupied = entities.some(e => e.x === btn.x && e.y === btn.y);
            if (occupied && !btn.isPressed) {
                btn.isPressed = true;
                if (window.AudioSys) AudioSys.buttonClick(true);
                this.triggerLink(btn.x, btn.y, true);
            } else if (!occupied && btn.isPressed && !btn.isToggle) {
                btn.isPressed = false;
                if (window.AudioSys) AudioSys.buttonClick(false);
                this.triggerLink(btn.x, btn.y, false);
            }
        }

        // 2. Purple Buttons (Manual Interact only)
        // Handled in interact()

        // 3. Doors vs Blocks (Crush check)
        for (const door of this.doors) {
            if (door.state === 'CLOSED') {
                const blockIdx = this.blocks.findIndex(b => b.x === door.x && b.y === door.y);
                if (blockIdx !== -1) {
                    const b = this.blocks[blockIdx];
                    // DESTROY BLOCK
                    this.blocks.splice(blockIdx, 1);
                    this.spawnDebris(b.x * 32 + 16, b.y * 32 + 16, 10, '#3a3a4a');
                    this.spawnDebris(b.x * 32 + 16, b.y * 32 + 16, 6, '#ff8800');
                    door.state = 'BROKEN_OPEN';
                    door.error = true;
                    if (window.AudioSys) AudioSys.coreLost();
                }
                
                if (this.player.x === door.x && this.player.y === door.y) {
                    this.handleDeath(true); // Crushed player
                }
            }
        }
    }

    triggerLink(x, y, state) {
        const lvl = LEVELS[this.levelIndex];
        const linkChannel = lvl.links && lvl.links[`${x},${y}`];
        if (linkChannel === undefined) return;

        // Find all doors with same channel
        for (let dx = 0; dx < lvl.overlays[0].length; dx++) {
            for (let dy = 0; dy < lvl.overlays.length; dy++) {
                if (lvl.overlays[dy][dx] === 'D') {
                    const doorChannel = lvl.links[`${dx},${dy}`];
                    if (doorChannel === linkChannel) {
                        const door = this.doors.find(d => d.x === dx && d.y === dy);
                        if (!door || door.state === 'BROKEN_OPEN') continue;

                        const wasOpen = door.state === 'OPEN';
                        if (state) {
                            // Try to open
                            door.state = 'OPEN';
                            if (!wasOpen && window.AudioSys) AudioSys.doorOpen();
                        } else {
                            // Try to close (Check for obstruction)
                            const blocked = [this.player, ...this.blocks].some(e => e.x === door.x && e.y === door.y);
                            if (blocked) {
                                // CRUSH LOGIC:
                                if (this.player.x === door.x && this.player.y === door.y) {
                                    this.handleDeath(true);
                                } else {
                                    // Destroy block
                                    const bIdx = this.blocks.findIndex(b => b.x === door.x && b.y === door.y);
                                    if (bIdx !== -1) {
                                        const b = this.blocks[bIdx];
                                        this.blocks.splice(bIdx, 1);
                                        
                                        // Death Dir for particles
                                        let deathDir = {x:0, y:0};
                                        if (door.orientation === 'HORIZONTAL') {
                                            // Slams from top/bottom
                                            deathDir.y = 0; 
                                            // Find adjacent open space for debris
                                            if (this.isTilePassable(b.x + 1, b.y)) deathDir.x = 1;
                                            else if (this.isTilePassable(b.x - 1, b.y)) deathDir.x = -1;
                                        } else {
                                            // Slams from left/right
                                            deathDir.x = 0;
                                            if (this.isTilePassable(b.x, b.y + 1)) deathDir.y = 1;
                                            else if (this.isTilePassable(b.x, b.y - 1)) deathDir.y = -1;
                                        }

                                        this.spawnDebris(b.x * 32 + 16, b.y * 32 + 16, 8, '#ff8800', deathDir);
                                        this.spawnDebris(b.x * 32 + 16, b.y * 32 + 16, 6, '#3a3a4a', deathDir);

                                        door.state = 'BROKEN_OPEN';
                                        door.error = true;
                                        if (window.AudioSys) AudioSys.coreLost();
                                        // Heavy destruction particles
                                        for (let i = 0; i < 20; i++) {
                                            Graphics.spawnParticle(door.x * 32 + 16, door.y * 32 + 16, '#ffcc00', 'spark');
                                            Graphics.spawnParticle(door.x * 32 + 16, door.y * 32 + 16, 'rgba(100,100,100,0.5)', 'smoke');
                                        }
                                    } else {
                                        door.state = 'CLOSED';
                                        if (wasOpen && window.AudioSys) AudioSys.doorSlam();
                                    }
                                }
                            } else {
                                door.state = 'CLOSED';
                                if (wasOpen && window.AudioSys) AudioSys.doorSlam();
                            }
                        }
                    }
                }
            }
        }
    }

    triggerQuantumPulse(x, y, power = 1.0, delay = 0, distance = 0, visited = new Set(), dx = 0, dy = 0) {
        const key = `${x},${y}`;
        if (visited.has(key)) return;
        visited.add(key);

        const qf = this.quantumFloors.find(q => q.x === x && q.y === y);
        if (!qf) return;

        // ONLY trigger if not already pulsing (prevents stutter when holding keys)
        if (qf.flashTimer > 0 && distance === 0) return;

        // Sequence: 15 is active frames + delay
        qf.flashTimer = 15 + delay;
        qf.pulseIntensity = power;
        
        // Store the direction the pulse is coming from for the line animation
        qf.entrySide = { dx: -dx, dy: -dy };

        // Stop after 3 tiles of propagation
        if (distance >= 3 || power < 0.2) return;

        // Propagate to neighbors
        const neighbors = [
            { x: x + 1, y: y }, { x: x - 1, y: y },
            { x: x, y: y + 1 }, { x: x, y: y - 1 }
        ];

        for (const n of neighbors) {
            this.triggerQuantumPulse(n.x, n.y, power * 0.75, delay + 4, distance + 1, visited, dx, dy);
        }
    }

    movePlayer(dx, dy) {
        if (this.state !== 'PLAYING' || this.transitionState !== 'NONE' || this.player.isDead) return;

        // Prevent movement if already in motion (manual or sliding)
        const pDist = Math.abs(this.player.x - this.player.visualX) + Math.abs(this.player.y - this.player.visualY);
        if (pDist > 0.6) return; // Increased from 0.1 for faster repeat moves

        const nx = this.player.x + dx;
        const ny = this.player.y + dy;

        // LOCK CONTROLS IF ON CONVEYOR: The player must follow the belt
        const onConveyor = this.conveyors.some(c => c.x === this.player.x && c.y === this.player.y);
        if (onConveyor) return;

        if (this.map[ny][nx] === '#' || this.map[ny][nx] === 'W') return;

        const ox = this.player.x;
        const oy = this.player.y;

        let targetDir = DIRS.DOWN;
        if (dx > 0) targetDir = DIRS.RIGHT;
        if (dx < 0) targetDir = DIRS.LEFT;
        if (dy < 0) targetDir = DIRS.UP;

        this.player.dir = targetDir;

        let moveSuccessful = false;

        // Check block push (support multiple blocks in a row)
        let blocksToPush = [];
        let scanX = nx, scanY = ny;
        while (true) {
            const b = this.blocks.find(block => block.x === scanX && block.y === scanY);
            if (b) {
                blocksToPush.push(b);
                scanX += dx; scanY += dy;
            } else { break; }
        }

        if (blocksToPush.length > 0) {
            // Check if every block in the chain can move to its next tile (e.g. not into a Quantum Floor)
            // We pass the whole chain as ignored objects so they don't block each other
            const allBlocksCanMove = blocksToPush.every(b => this.isTilePassable(b.x + dx, b.y + dy, blocksToPush, dx, dy));
            
            if (this.isTilePassable(scanX, scanY, [this.player, ...blocksToPush], dx, dy) && allBlocksCanMove) {
                this.saveUndo();
                for (let i = blocksToPush.length - 1; i >= 0; i--) {
                    blocksToPush[i].x += dx;
                    blocksToPush[i].y += dy;
                }
                this.player.x = nx;
                this.player.y = ny;
                AudioSys.push();
                this.updateEnergy();
                moveSuccessful = true;
            }
        } else if (this.isTilePassable(nx, ny, this.player)) {
            this.saveUndo();
            this.player.x = nx;
            this.player.y = ny;
            AudioSys.move();
            this.updateEnergy();
            moveSuccessful = true;
        }

        if (!moveSuccessful) return;

        // Smoke puffs left behind at OLD position
        for (let i = 0; i < 5; i++) {
            const offsetX = (Math.random() - 0.5) * 16;
            const offsetY = (Math.random() - 0.5) * 8;
            Graphics.spawnParticle(ox * 32 + 16 + offsetX, oy * 32 + 24 + offsetY, 'rgba(240, 240, 240, 0.6)', 'smoke');
        }

        // Energy penalty for movement
        this.moves--;
        this.moveCount++;
        if (typeof LevelSelector !== 'undefined') LevelSelector.trackStat('robotMoves', 1);
        
        // Collect scrap
        const posKey = `${nx},${ny}`;
        if (this.scrapPositions.has(posKey)) {
            this.scrapPositions.delete(posKey);
            this.scrapCollected++;
            if (typeof LevelSelector !== 'undefined') LevelSelector.trackStat('totalScrap', 1);
            if (window.AudioSys) AudioSys.playScrapCollect();
            for (let i = 0; i < 6; i++) {
                Graphics.spawnParticle(nx * 32 + 16, ny * 32 + 16, '#ffcc00', 'spark');
            }
        }

        if (this.moves <= 0) {
            this.handleDeath(false);
        }
    }

    interact() {
        if (this.state !== 'PLAYING' || this.transitionState !== 'NONE' || this.player.isDead) return;
        
        // Lock interaction if on conveyor
        const onConveyor = this.conveyors.some(c => c.x === this.player.x && c.y === this.player.y);
        if (onConveyor) return;

        let actionTaken = false;

        // Find adjacent tile in player direction
        let tx = this.player.x;
        let ty = this.player.y;
        if (this.player.dir === DIRS.UP) ty--;
        if (this.player.dir === DIRS.DOWN) ty++;
        if (this.player.dir === DIRS.LEFT) tx--;
        if (this.player.dir === DIRS.RIGHT) tx++;

        // 1. Check for Block to rotate
        const b = this.blocks.find(b => b.x === tx && b.y === ty);
        if (b) {
            this.saveUndo();
            b.dir = (b.dir + 1) % 4;
            this.player.visorTimer = 15;
            this.player.visorColor = '#00ff41'; // Success Green
            AudioSys.rotate();
            this.updateEnergy();
            actionTaken = true;
        }

        // 2. Check for Target Core to activate
        if (!actionTaken) {
            const target = this.targets.find(t => t.x === tx && t.y === ty);
            if (target) {
                const tData = this.poweredTargets.get(`${tx},${ty}`) || { charge: 0, contaminated: false };

                if (tData.contaminated) {
                    AudioSys.coreLost();
                    for (let i = 0; i < 10; i++) Graphics.spawnParticle(tx * 32 + 16, ty * 32 + 16, '#ff003c', 'spark');
                    actionTaken = true; // Consumes energy for trying a corrupted core
                }

                const allMet = this.targets.every(t => {
                    const data = this.poweredTargets.get(`${t.x},${t.y}`) || { charge: 0, contaminated: false };
                    return data.charge >= t.required && !data.contaminated;
                });

                if (allMet && this.targets.length > 0) {
                    this.state = 'WINNING';
                    this.victoryTimer = 30;
                    this.hitStopTimer = 6;
                    this.resultTimer = 0;
                    AudioSys.corePowered();

                    for (const t of this.targets) {
                        for (let i = 0; i < 15; i++) {
                            Graphics.spawnParticle(t.x * 32 + 16, t.y * 32 + 16, '#00ff9f');
                        }
                    }
                } else {
                    AudioSys.coreLost();
                }
            }
        }

        if (actionTaken) {
            for (let i = 0; i < 4; i++) {
                const offsetX = (Math.random() - 0.5) * 16;
                const offsetY = (Math.random() - 0.5) * 8;
                Graphics.spawnParticle(this.player.x * 32 + 16 + offsetX, this.player.y * 32 + 24 + offsetY, 'rgba(240, 240, 240, 0.6)', 'smoke');
            }

            this.moves--;
            this.moveCount++;
            if (typeof LevelSelector !== 'undefined') LevelSelector.trackStat('rotations', 1);
            if (this.moves <= 0) {
                this.handleDeath(false);
            }
        }
    }

    isTilePassable(x, y, ignoreObj = null, dx = 0, dy = 0) {
        if (y < 0 || y >= this.map.length || x < 0 || x >= this.map[0].length) return false;
        if (this.map[y][x] === '#' || this.map[y][x] === 'W') return false;
        
        const ignores = Array.isArray(ignoreObj) ? ignoreObj : (ignoreObj ? [ignoreObj] : []);

        const door = this.doors.find(d => d.x === x && d.y === y);
        if (door && door.state === 'CLOSED') return false;
        
        if (this.blocks.some(b => b.x === x && b.y === y && !ignores.includes(b))) return false;
        
        if (this.sources.some(s => s.x === x && s.y === y)) return false;
        if (this.redSources.some(s => s.x === x && s.y === y)) return false;
        if (this.targets.some(t => t.x === x && t.y === y)) return false;
        if (this.forbiddens.some(f => f.x === x && f.y === y)) return false;
        if (this.brokenCores.some(b => b.x === x && b.y === y)) return false;
        
        if (this.player.x === x && this.player.y === y && !ignores.includes(this.player)) return false;
        
        if (!ignores.includes(this.player)) {
            const qf = this.quantumFloors.find(q => q.x === x && q.y === y);
            if (qf && qf.active) {
                qf.entrySide = { dx: -dx, dy: -dy };
                this.triggerQuantumPulse(x, y, 1.0, 0, 0, new Set(), dx, dy);
                return false;
            }
        }

        return true;
    }

    updateSliding() {
        if (this.state !== 'PLAYING') return;
        
        const pDist = Math.abs(this.player.x - this.player.visualX) + Math.abs(this.player.y - this.player.visualY);
        if (pDist < 0.05) {
            this.handleEntitySlide(this.player, true);
        }

        for (const b of this.blocks) {
            const bDist = Math.abs(b.x - b.visualX) + Math.abs(b.y - b.visualY);
            if (bDist < 0.2) {
                this.handleEntitySlide(b, false);
            }
        }
    }

    handleEntitySlide(obj, isPlayer) {
        const conveyor = this.conveyors.find(c => c.x === obj.x && c.y === obj.y);
        if (!conveyor) return;

        let dx = 0, dy = 0;
        if (conveyor.dir === DIRS.UP) dy = -1;
        else if (conveyor.dir === DIRS.DOWN) dy = 1;
        else if (conveyor.dir === DIRS.LEFT) dx = -1;
        else if (conveyor.dir === DIRS.RIGHT) dx = 1;

        const nx = obj.x + dx;
        const ny = obj.y + dy;

        let blocksToPush = [];
        let scanX = nx, scanY = ny;
        while (true) {
            const b = this.blocks.find(block => block.x === scanX && block.y === scanY);
            if (b && b !== obj) {
                blocksToPush.push(b);
                scanX += dx; scanY += dy;
            } else { break; }
        }

        if (blocksToPush.length > 0) {
            const allBlocksCanMove = blocksToPush.every(b => this.isTilePassable(b.x + dx, b.y + dy, blocksToPush, dx, dy));
            if (this.isTilePassable(scanX, scanY, [obj, ...blocksToPush], dx, dy) && allBlocksCanMove) {
                for (let i = blocksToPush.length - 1; i >= 0; i--) {
                    blocksToPush[i].x += dx;
                    blocksToPush[i].y += dy;
                }
                obj.x = nx;
                obj.y = ny;
                if (isPlayer && window.AudioSys) AudioSys.conveyorSlide();
                this.updateEnergy();
            }
            return;
        }

        if (this.isTilePassable(nx, ny, obj)) {
            obj.x = nx;
            obj.y = ny;
            if (isPlayer && window.AudioSys) AudioSys.conveyorSlide();
            
            const nextIsConveyor = this.conveyors.some(c => c.x === nx && c.y === ny);
            
            if (!isPlayer && !nextIsConveyor) {
                let launchDist = 3; 
                for (let i = 0; i < launchDist; i++) {
                    const lx = obj.x + dx;
                    const ly = obj.y + dy;
                    
                    let blocksToPushLaunch = [];
                    let sx = lx, sy = ly;
                    while (true) {
                        const b = this.blocks.find(block => block.x === sx && block.y === sy);
                        if (b && b !== obj) {
                            blocksToPushLaunch.push(b);
                            sx += dx; sy += dy;
                        } else { break; }
                    }

                    const allBlocksCanMoveLaunch = blocksToPushLaunch.every(b => this.isTilePassable(b.x + dx, b.y + dy, blocksToPushLaunch, dx, dy));
                    const selfCanMove = this.isTilePassable(obj.x + dx, obj.y + dy, obj, dx, dy);

                    if (this.isTilePassable(sx, sy, [obj, ...blocksToPushLaunch], dx, dy) && allBlocksCanMoveLaunch && selfCanMove) {
                        for (let j = blocksToPushLaunch.length - 1; j >= 0; j--) {
                            blocksToPushLaunch[j].x += dx;
                            blocksToPushLaunch[j].y += dy;
                        }
                        obj.x = lx;
                        obj.y = ly;
                        for(let s=0; s<3; s++) Graphics.spawnParticle(obj.x * 32 + 16, obj.y * 32 + 16, '#00f0ff', 'spark');
                    } else {
                        break;
                    }
                }
                if (window.AudioSys) AudioSys.doorSlam();
            }

            if (isPlayer) {
                const posKey = `${nx},${ny}`;
                if (this.scrapPositions.has(posKey)) {
                    this.scrapPositions.delete(posKey);
                    this.scrapCollected++;
                    if (typeof LevelSelector !== 'undefined') LevelSelector.trackStat('totalScrap', 1);
                    if (window.AudioSys) AudioSys.playScrapCollect();
                    for (let i = 0; i < 6; i++) {
                        Graphics.spawnParticle(nx * 32 + 16, ny * 32 + 16, '#ffcc00', 'spark');
                    }
                }
            }
            this.updateEnergy();
        }
    }

    updateEnergy() {
        this.poweredWires.clear();
        this.poweredBlocks.clear();
        this.poweredTargets.clear();
        this.poweredStations.clear();
        this.isStationPowered = false;

        const visited = new Map();

        const checkValidOutput = (nx, ny) => {
            if (ny < 0 || ny >= this.map.length || nx < 0 || nx >= this.map[0].length) return false;
            return (
                this.wires.some(w => w.x === nx && w.y === ny) ||
                this.blocks.some(b => b.x === nx && b.y === ny) ||
                this.targets.some(t => t.x === nx && t.y === ny) ||
                this.sources.some(s => s.x === nx && s.y === ny) ||
                this.redSources.some(s => s.x === nx && s.y === ny) ||
                this.forbiddens.some(f => f.x === nx && f.y === ny) ||
                this.doors.some(d => d.x === nx && d.y === ny) ||
                this.chargingStations.some(s => s.x === nx && s.y === ny)
            );
        };

        const trace = (x, y, dir, color, charge, path = [], forceOcean = false, isInjection = false) => {
            if (y < 0 || y >= this.map.length || x < 0 || x >= this.map[0].length) return false;
            if (this.map[y][x] === '#' || this.map[y][x] === 'W') return false; 

            if (path.some(p => p.x === x && p.y === y)) return false;

            const displayColor = forceOcean ? 'OCEAN' : color;
            const key = `${x},${y},${dir},${displayColor}`;
            const prevCharge = visited.get(key);
            if (prevCharge !== undefined && prevCharge >= charge) return false;
            visited.set(key, charge);

            let reachedValidTarget = false;

            const block = this.blocks.find(b => b.x === x && b.y === y);
            let blockBlocking = false;
            let blockActive = false;

            if (block) {
                blockBlocking = true;
                const entryDir = (dir + 2) % 4;
                const isInvalid = block.dir === entryDir; 
                const isCorrectEntry = !isInvalid; 

                let nx = x, ny = y;
                if (block.dir === DIRS.UP) ny--;
                else if (block.dir === DIRS.DOWN) ny++;
                else if (block.dir === DIRS.LEFT) nx--;
                else if (block.dir === DIRS.RIGHT) nx++;

                const hasOutput = checkValidOutput(nx, ny);
                blockActive = isCorrectEntry && hasOutput;

                this.poweredBlocks.set(`${x},${y}`, { dir: block.dir, color: displayColor, invalid: isInvalid, active: blockActive, isOcean: forceOcean });

                if (blockActive) {
                    if (trace(nx, ny, block.dir, color, charge + 1, path.concat({ x, y }), forceOcean, true)) {
                        reachedValidTarget = true;
                    }
                } else if (isInvalid) {
                    for (const p of path.concat({ x, y })) {
                        const pEntry = this.poweredWires.get(`${p.x},${p.y}`);
                        if (pEntry && pEntry.color !== 'OCEAN') pEntry.color = 'YELLOW';
                    }
                }
            } 

            if (!blockBlocking) {
                const target = this.targets.find(t => t.x === x && t.y === y);
                if (target) {
                    const tKey = `${x},${y}`;
                    const data = this.poweredTargets.get(tKey) || { charge: 0, contaminated: false, entries: [], chargesBySide: {} };
                    const entrySide = (dir + 2) % 4;

                    if (color === 'RED') {
                        data.contaminated = true;
                    } else {
                        data.chargesBySide[entrySide] = Math.max(data.chargesBySide[entrySide] || 0, charge);
                        data.charge = Object.values(data.chargesBySide).reduce((a, b) => a + b, 0);
                    }

                    if (!data.entries.includes(entrySide)) data.entries.push(entrySide);
                    this.poweredTargets.set(tKey, data);

                    if (!data.contaminated && data.charge >= target.required) {
                        reachedValidTarget = true;
                    }
                } else if (this.chargingStations.some(s => s.x === x && s.y === y)) {
                    if (color === 'BLUE') {
                        this.poweredStations.add(`${x},${y}`);
                        this.isStationPowered = true;
                        reachedValidTarget = true;
                    }
                }
            } 
            
            if (!blockBlocking) {
                const door = this.doors.find(d => d.x === x && d.y === y);
                if (door) {
                    this.poweredDoors.add(`${x},${y}`);
                    reachedValidTarget = true;
                }
            }
            
            const wire = this.wires.find(w => w.x === x && w.y === y);
            if (wire) {
                if (!blockBlocking) {
                    const canEnter = isInjection || this.wireHasConnection(wire.type, (dir + 2) % 4);
                    if (canEnter) {
                        const outDirs = this.getWireConnections(wire.type).filter(d => d !== (dir + 2) % 4);
                        const pKey = `${x},${y}`;
                        const entry = this.poweredWires.get(pKey) || { dirs: [], color: displayColor, charge: 0, entries: [] };
                        for (let out of outDirs) {
                            if (!entry.dirs.includes(out)) entry.dirs.push(out);
                        }
                        const entrySide = (dir + 2) % 4;
                        if (!entry.entries.includes(entrySide)) entry.entries.push(entrySide);

                        entry.color = displayColor;
                        entry.charge = Math.max(entry.charge, charge);
                        this.poweredWires.set(pKey, entry);

                        for (let out of outDirs) {
                            let nx = x, ny = y;
                            if (out === DIRS.UP) ny--;
                            if (out === DIRS.DOWN) ny++;
                            if (out === DIRS.LEFT) nx--;
                            if (out === DIRS.RIGHT) nx++;
                            if (trace(nx, ny, out, color, charge, path.concat({ x, y }), forceOcean)) {
                                reachedValidTarget = true;
                            }
                        }
                    }
                } else if (blockActive) {
                    const pKey = `${x},${y}`;
                    this.poweredWires.set(pKey, { dirs: [block.dir], color: displayColor, charge: charge, entries: [(dir + 2) % 4] });
                }
            }

            if (reachedValidTarget && !forceOcean) {
                for (const p of path.concat({ x, y })) {
                    const pEntry = this.poweredWires.get(`${p.x},${p.y}`);
                    if (pEntry) pEntry.color = 'OCEAN';
                }
            }

            return reachedValidTarget;
        };

        let changed = true;
        let relaySources = [];
        let validSources = new Set();

        while (changed) {
            changed = false;
            visited.clear();
            this.poweredWires.clear();
            this.poweredBlocks.clear();
            this.poweredTargets.clear();

            const startAll = (forceOceanMap) => {
                for (const src of this.sources) {
                    const sKey = `src_${src.x},${src.y}`;
                    const isOcean = forceOceanMap.has(sKey);
                    for (let d of [DIRS.UP, DIRS.RIGHT, DIRS.DOWN, DIRS.LEFT]) {
                        let snx = src.x, sny = src.y;
                        if (d === DIRS.UP) sny--;
                        else if (d === DIRS.DOWN) sny++;
                        else if (d === DIRS.LEFT) snx--;
                        else if (d === DIRS.RIGHT) snx++;
                        if (trace(snx, sny, d, 'BLUE', 0, [], isOcean, true)) {
                            if (!isOcean) { validSources.add(sKey); changed = true; }
                        }
                    }
                }
                for (const src of this.redSources) {
                    for (let d of [DIRS.UP, DIRS.RIGHT, DIRS.DOWN, DIRS.LEFT]) {
                        let snx = src.x, sny = src.y;
                        if (d === DIRS.UP) sny--;
                        else if (d === DIRS.DOWN) sny++;
                        else if (d === DIRS.LEFT) snx--;
                        else if (d === DIRS.RIGHT) snx++;
                        trace(snx, sny, d, 'RED', 0, [], false, true);
                    }
                }
                for (const t of relaySources) {
                    const tKey = `rel_${t.x},${t.y}`;
                    const isOcean = forceOceanMap.has(tKey);
                    const tData = this.poweredTargets.get(`${t.x},${t.y}`);
                    const skipDirs = tData ? tData.entries : [];

                    for (let d of [DIRS.UP, DIRS.RIGHT, DIRS.DOWN, DIRS.LEFT]) {
                        if (skipDirs.includes(d)) continue;

                        let snx = t.x, sny = t.y;
                        if (d === DIRS.UP) sny--;
                        else if (d === DIRS.DOWN) sny++;
                        else if (d === DIRS.LEFT) snx--;
                        else if (d === DIRS.RIGHT) snx++;
                        if (trace(snx, sny, d, 'BLUE', 0, [], isOcean, false)) {
                            if (!isOcean) { validSources.add(tKey); changed = true; }
                        }
                    }
                }
            };

            startAll(validSources);

            for (const t of this.targets) {
                const tKey = `${t.x},${t.y}`;
                const data = this.poweredTargets.get(tKey);
                if (data && data.charge >= t.required && !data.contaminated) {
                    if (!relaySources.some(rs => rs.x === t.x && rs.y === t.y)) {
                        relaySources.push(t);
                        changed = true;
                    }
                }
            }
        }

        let anyActive = false;
        let isContaminated = false;
        for (const pb of this.poweredBlocks.values()) {
            if (pb.active) {
                anyActive = true;
                if (pb.color === 'RED') isContaminated = true;
            }
        }
        
        let totalReq = 0;
        let totalCurrent = 0;
        for (const t of this.targets) {
            totalReq += t.required;
            const data = this.poweredTargets.get(`${t.x},${t.y}`);
            totalCurrent += data ? Math.min(t.required, data.charge) : 0;
        }
        const progress = totalReq > 0 ? totalCurrent / totalReq : 0;
        
        this.audioState = { anyActive, progress, contaminated: isContaminated };
        this.checkWinCondition();
    }

    wireHasConnection(type, side) {
        return this.getWireConnections(type).includes(side);
    }

    getWireConnections(type) {
        if (type === 'H') return [DIRS.LEFT, DIRS.RIGHT];
        if (type === 'V') return [DIRS.UP, DIRS.DOWN];
        if (type === '+') return [DIRS.UP, DIRS.DOWN, DIRS.LEFT, DIRS.RIGHT];
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

    checkWinCondition() {
        if (this.state !== 'PLAYING') return;
    }

    spawnDebris(x, y, count, color, initialDir = {x:0,y:0}) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            
            const vx = initialDir.x * speed * 2 + Math.cos(angle) * speed;
            const vy = initialDir.y * speed * 2 + Math.sin(angle) * speed;
            
            const vertices = [];
            const vCount = 3 + Math.floor(Math.random() * 3);
            const size = 3 + Math.random() * 5;
            for (let v = 0; v < vCount; v++) {
                const va = (v / vCount) * Math.PI * 2;
                const vr = size * (0.5 + Math.random() * 0.5);
                vertices.push({ x: Math.cos(va) * vr, y: Math.sin(va) * vr });
            }

            this.debris.push({
                x, y, vx, vy,
                rot: Math.random() * Math.PI * 2,
                rv: (Math.random() - 0.5) * 0.5,
                vertices,
                color
            });
        }
    }

    handleDeath(isHazard = false) {
        if (this.transitionState !== 'NONE' || this.state === 'REVERSING' || this.state === 'GAMEOVER' || this.state === 'RESULT') return;
        
        this.resultTimer = 0;
        this.lives = Math.max(0, this.lives - 1);
        
        if (isHazard) {
            AudioSys.explosion();
            if (typeof LevelSelector !== 'undefined') LevelSelector.trackStat('totalDeaths', 1);
            this.spawnDebris(this.player.x * 32 + 16, this.player.y * 32 + 16, 12, '#ed8936', this.player.deathDir);
            this.spawnDebris(this.player.x * 32 + 16, this.player.y * 32 + 16, 8, '#3182ce', this.player.deathDir);
        } else {
            AudioSys.lifeLost();
            for (let i = 0; i < 8; i++) {
                Graphics.spawnParticle(this.player.x * 32 + 16, this.player.y * 32 + 16, 'rgba(100,100,100,0.5)', 'smoke');
            }
        }

        this.player.isDead = true;
        this.player.deathType = isHazard ? 'CRUSHED' : 'SHUTDOWN';
        this.player.deathTimer = 0;
        
        this.player.deathDir = { x: 0, y: 0 };
        if (isHazard) {
            const dirs = [{x:1, y:0}, {x:-1, y:0}, {x:0, y:1}, {x:0, y:-1}];
            for (const d of dirs) {
                const tx = this.player.x + d.x;
                const ty = this.player.y + d.y;
                if (tx >= 0 && tx < this.map[0].length && ty >= 0 && ty < this.map.length) {
                    const tile = this.map[ty][tx];
                    const isDoor = this.doors.some(dr => dr.x === tx && dr.y === ty);
                    if (tile !== '#' && tile !== 'W' && !isDoor) {
                        this.player.deathDir = d;
                        break;
                    }
                }
            }
        }

        if (!isHazard && this.lives > 0) {
            setTimeout(() => {
                this.startTransition(() => {
                    this.loadLevel(this.levelIndex, true);
                });
            }, 800);
        } else {
            setTimeout(() => {
                if (typeof ResultScreen !== 'undefined') {
                    this.state = 'RESULT';
                    ResultScreen.open(this, true);
                }
            }, 1000);
        }
    }

    startReverse(callback) {
        this.state = 'REVERSING';
        this.onReverseComplete = callback;
    }

    updateCamera(snap = false) {
        const targetX = this.player.x * 32 + 16 + this.camera.bias.x;
        const targetY = this.player.y * 32 + 16 + this.camera.bias.y;

        const screenCenterX = this.camera.x + 320;
        const screenCenterY = this.camera.y + 240;

        const dx = targetX - screenCenterX;
        const dy = targetY - screenCenterY;

        let moveX = 0;
        let moveY = 0;

        if (Math.abs(dx) > this.camera.deadZone.width / 2) {
            moveX = dx - (Math.sign(dx) * this.camera.deadZone.width / 2);
        }
        if (Math.abs(dy) > this.camera.deadZone.height / 2) {
            moveY = dy - (Math.sign(dy) * this.camera.deadZone.height / 2);
        }

        let lerpX = this.camera.lerp;
        let lerpY = this.camera.lerp;

        if (Math.abs(dx) > this.camera.softZone.width / 2) lerpX = 0.3;
        if (Math.abs(dy) > this.camera.softZone.height / 2) lerpY = 0.3;

        if (snap) {
            this.camera.x += moveX;
            this.camera.y += moveY;
        } else {
            this.camera.x += moveX * lerpX;
            this.camera.y += moveY * lerpY;
        }

        const mapW = this.map[0].length * 32;
        const mapH = this.map.length * 32;
        
        this.camera.x = Math.max(0, Math.min(this.camera.x, mapW - 640));
        this.camera.y = Math.max(0, Math.min(this.camera.y, mapH - 480));
    }

    refreshConveyorBends() {
        for (let c of this.conveyors) {
            c.inDir = null;
            c.beltDist = undefined;
            c.beltLength = 0;
            for (let other of this.conveyors) {
                if (other === c) continue;
                let ox = other.x, oy = other.y;
                if (other.dir === DIRS.RIGHT) ox++;
                else if (other.dir === DIRS.LEFT) ox--;
                else if (other.dir === DIRS.DOWN) oy++;
                else if (other.dir === DIRS.UP) oy--;
                
                if (ox === c.x && oy === c.y) {
                    c.inDir = other.dir;
                    break;
                }
            }
        }

        const chains = [];
        for (let c of this.conveyors) {
            if (c.inDir === null && c.beltDist === undefined) {
                const chain = [];
                this._traceConveyorPath(c, 0, chain);
                chains.push(chain);
            }
        }

        for (let c of this.conveyors) {
            if (c.beltDist === undefined) {
                const chain = [];
                this._traceConveyorPath(c, 0, chain);
                chains.push(chain);
            }
        }

        for (const chain of chains) {
            const len = chain.length;
            for (const c of chain) c.beltLength = len;
        }
    }

    _traceConveyorPath(c, d, chain) {
        c.beltDist = d;
        chain.push(c);
        let nx = c.x, ny = c.y;
        if (c.dir === DIRS.RIGHT) nx++;
        else if (c.dir === DIRS.LEFT) nx--;
        else if (c.dir === DIRS.DOWN) ny++;
        else if (c.dir === DIRS.UP) ny--;

        const next = this.conveyors.find(cv => cv.x === nx && cv.y === ny);
        if (next && next.beltDist === undefined) {
            this._traceConveyorPath(next, d + 1, chain);
        }
    }
}
