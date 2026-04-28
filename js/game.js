class GameState {
    constructor(levelData = null) {
        this.levelIndex = 0;
        this.map = [];
        this.player = { x: 0, y: 0, visualX: 0, visualY: 0, dir: DIRS.DOWN, visorTimer: 0, visorColor: '#00ff41' };
        this.blocks = [];
        this.targets = [];
        this.forbiddens = [];
        this.sources = [];
        this.wires = [];
        this.conveyors = [];
        this.doors = [];
        this.buttons = [];
        this.purpleButtons = [];
        this.quantumFloors = [];
        this.emitters = [];
        this.catalysts = [];
        this.debris = [];


        this.score = 0;
        this.lives = 3;
        this.time = 0;
        this.moveCount = 0;

        this.undoStack = [];
        this.state = 'PLAYING'; // PLAYING, WINNING, GAMEOVER, VICTORY, LEVEL_COMPLETE, RESULT
        this.victoryTimer = 0;
        this.poweredWires = new Map(); // stores {dirs, color}
        this.poweredBlocks = new Map(); // stores {dir, color, active, invalid}
        this.poweredTargets = new Map();
        this.poweredDoors = new Set(); // stores coordinates "x,y" of powered doors
        
        this.audioState = { anyActive: false, progress: 0, contaminated: false };
        this.transitionLabel = 'CIRCUIT BREAKER'; // stores charge level
        this.poweredForbiddens = new Set();
        this.redSources = [];
        this.moves = 0;
        this.startPos = { x: 0, y: 0 }; // Starting position (Robot Spawn)
        this.chargingStations = []; // List of all stations (Spawn + custom 'K')
        this.isStationPowered = false; // Legacy/Global flag for UI/Audio
        this.poweredStations = new Set(); // Coordinates "x,y" of stations receiving power
        this.resultTimer = 0;
        this.hitStopTimer = 0;
        this.scrapCollected = 0;
        this.totalScrap = 0;
        this.scrapPositions = new Set();
        this.triggeredDialogues = new Set();

        // Transition system
        this.transitionState = 'WAITING'; // Start closed
        this.transitionProgress = 1;
        this.transitionStayClosed = true;
        this.transitionCallback = null;
        this.camera = {
            x: 0,
            y: 0,
            deadZone: { width: 60, height: 60 },
            softZone: { width: 200, height: 150 },
            bias: { x: 0, y: 0 },
            lerp: 0.1
        };

        if (levelData) {
            this.loadLevel(levelData);
        } else {
            this.loadLevel(0);
        }
    }

    startTransition(callback, stayClosed = false, customLabel = null) {
        if (this.transitionState !== 'NONE' && this.transitionState !== 'WAITING') return;
        
        // Use custom label if provided, otherwise determine automatically
        if (customLabel) {
            this.transitionLabel = customLabel;
        } else if (this.state === 'WINNING' || this.state === 'LEVEL_COMPLETE' || this.state === 'VICTORY') {
            this.transitionLabel = 'SUCESSO';
        } else if (this.state === 'RESULT') {
            // Result screen context: SUCCESS if not failed
            this.transitionLabel = (typeof ResultScreen !== 'undefined' && ResultScreen.failed) ? 'FALHA' : 'SUCESSO';
        } else if (stayClosed || this.lives <= 0 || this.state === 'REVERSING') {
            this.transitionLabel = 'FALHA';
        } else {
            this.transitionLabel = 'CIRCUIT BREAKER';
        }

        this.transitionState = 'CLOSING';
        this.transitionProgress = 0;
        this.transitionCallback = callback;
        this.transitionStayClosed = stayClosed;
    }

    cloneState() {
        return {
            player: { ...this.player },
            blocks: this.blocks.map(b => ({ ...b })),
            moves: this.moves,
            time: this.time,
            scrapCollected: this.scrapCollected,
            scrapPositions: new Set(this.scrapPositions),
            camera: { x: this.camera.x, y: this.camera.y },
            buttons: this.buttons.map(b => ({ ...b })),
            purpleButtons: this.purpleButtons.map(b => ({ ...b })),
            quantumFloors: this.quantumFloors.map(q => ({ ...q })),
            doors: this.doors.map(d => ({ ...d })),
            emitters: this.emitters.map(e => ({ ...e })),
            catalysts: this.catalysts.map(c => ({ ...c }))
        };
    }



    saveUndo() {
        this.undoStack.push(this.cloneState());
    }

    doUndo() {
        if (this.undoStack.length > 0) {
            const prevState = this.undoStack.pop();
            this.applyState(prevState);
            AudioSys.undo();
        }
    }

    applyState(state, snapVisuals = false) {
        if (snapVisuals) {
            this.player = { ...state.player };
            this.player.visualX = state.player.x;
            this.player.visualY = state.player.y;
            this.player.visualAngle = state.player.dir * (Math.PI / 2);
            
            this.blocks = state.blocks.map(b => ({ 
                ...b, 
                visualX: b.x, 
                visualY: b.y,
                visualAngle: b.visualAngle !== undefined ? b.visualAngle : b.dir * (Math.PI/2)
            }));
        } else {
            const vx = this.player.visualX !== undefined ? this.player.visualX : state.player.x;
            const vy = this.player.visualY !== undefined ? this.player.visualY : state.player.y;
            this.player = { ...state.player };
            this.player.visualX = vx;
            this.player.visualY = vy;
            
            // Preserve block visual states
            this.blocks = state.blocks.map((b, i) => {
                const oldB = this.blocks[i];
                const nb = { ...b };
                if (oldB) {
                    nb.visualX = oldB.visualX !== undefined ? oldB.visualX : b.x;
                    nb.visualY = oldB.visualY !== undefined ? oldB.visualY : b.y;
                    nb.vx = oldB.vx || 0;
                    nb.vy = oldB.vy || 0;
                }
                return nb;
            });
        }
        
        this.moves = state.moves;
        this.scrapCollected = state.scrapCollected;
        this.scrapPositions = new Set(state.scrapPositions);
        this.time = state.time;
        
        if (state.camera) {
            this.camera.x = state.camera.x;
            this.camera.y = state.camera.y;
        }
        if (state.buttons) {
            this.buttons = state.buttons.map(b => ({ ...b }));
        }
        if (state.purpleButtons) {
            this.purpleButtons = state.purpleButtons.map(b => ({ ...b }));
        }
        if (state.quantumFloors) {
            this.quantumFloors = state.quantumFloors.map(q => ({ ...q }));
        }
        if (state.doors) {
            this.doors = state.doors.map(d => ({ ...d }));
        }
        if (state.emitters) {
            this.emitters = state.emitters.map(e => ({ ...e }));
        }
        if (state.catalysts) {
            this.catalysts = state.catalysts.map(c => ({ ...c }));
        }
        
        this.updateEnergy();
    }

    loadLevel(indexOrData, keepLives = false) {
        let levelData;
        if (typeof indexOrData === 'object') {
            levelData = indexOrData;
            this.levelIndex = -1; // Test Mode indicator
        } else {
            if (indexOrData >= LEVELS.length) {
                this.state = 'VICTORY';
                return;
            }
            this.levelIndex = indexOrData;
            levelData = LEVELS[indexOrData];
        }
        
        this.levelData = levelData;
        this.time = levelData.timer || 60; // seconds countdown from level data
        this.moves = levelData.time; // Movements allowed (battery)
        this.moveCount = 0;
        if (!keepLives) this.lives = 3; // Restore lives only if not a respawn
        this.state = 'PLAYING';
        this.undoStack = [];
        if (window.Graphics) {
            Graphics.clearParticles();
            Graphics.clearTrails();
        }

        this.map = [];
        this.blocks = [];
        this.targets = [];
        this.forbiddens = [];
        this.sources = [];
        this.redSources = [];
        this.brokenCores = [];
        this.wires = [];
        this.conveyors = [];
        this.doors = [];
        this.buttons = [];
        this.purpleButtons = [];
        this.quantumFloors = [];
        this.emitters = [];
        this.catalysts = [];
        this.poweredDoors = new Set();

        this.scrapPositions.clear();
        this.triggeredDialogues.clear();
        this.scrapCollected = 0;
        this.totalScrap = 0;
        this.debris = []; // Initialize persistent debris
        this.chargingStations = []; 

        const charMap = levelData.map;
        const blocksMap = levelData.blocks; 

        const mapH = charMap.length;
        const mapW = charMap[0].length;

        for (let y = 0; y < mapH; y++) {
            let row = [];
            for (let x = 0; x < mapW; x++) {
                let c = charMap[y][x];
                row.push((c === '#' || c === 'W' || c === 'Q') ? c : ' ');

                if (c === '@') {
                    this.player.x = x;
                    this.player.y = y;
                    this.player.visualX = x;
                    this.player.visualY = y;
                    this.player.lastTX = x;
                    this.player.lastTY = y;
                    this.player.visualAngle = undefined;
                    this.player.isDead = false;
                    this.player.deathType = null;
                    this.startPos = { x, y };
                } else if (c === 'B') {
                    this.sources.push({ x, y });
                } else if (c === 'X') { 
                    this.redSources.push({ x, y });
                } else if (c === 'K') {
                    this.chargingStations.push({ x, y });
                } else if (['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r'].includes(c)) {
                    this.wires.push({ x, y, type: c });
                } else if (c === 'T' || (c >= '1' && c <= '9')) {
                    const req = c === 'T' ? 1 : parseInt(c);
                    this.targets.push({ x, y, required: req });
                } else if (c === 'Z') {
                    this.brokenCores.push({ x, y });
                } else if (c === '0') { 
                    this.forbiddens.push({ x, y });
                } else if (['>', '<', '^', 'v'].includes(c)) {
                    let dir = DIRS.RIGHT;
                    if (c === '<') dir = DIRS.LEFT;
                    if (c === '^') dir = DIRS.UP;
                    if (c === 'v') dir = DIRS.DOWN;
                    this.blocks.push({ x, y, dir, origX: x, origY: y });
                } else if (c === 'S') {
                    this.scrapPositions.add(`${x},${y}`);
                    this.totalScrap++;
                } else if (['(', ')', '[', ']'].includes(c)) {
                    let dir = DIRS.LEFT;
                    if (c === ')') dir = DIRS.RIGHT;
                    if (c === '[') dir = DIRS.UP;
                    if (c === ']') dir = DIRS.DOWN;
                    const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                    this.conveyors.push({ x, y, dir, channel: chan });
                } else if (c === 'D') {
                    const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                    this.doors.push({ 
                        x, y, 
                        state: 'CLOSED', 
                        visualOpen: 0,
                        error: false, 
                        closeTimer: 0, 
                        channel: chan 
                    });
                } else if (c === '_' || c === 'P') {
                    const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                    const behavior = (levelData.links && levelData.links[`${x},${y}_behavior`]) || (c === 'P' ? 'PRESSURE' : 'TIMER');
                    const initState = (levelData.links && levelData.links[`${x},${y}_init`]) === true;
                    
                    this.buttons.push({ 
                        x, y, 
                        isPressed: initState, 
                        channel: chan, 
                        behavior: behavior,
                        timer: 0,
                        wasSteppedOn: false,
                        energy: initState ? 1.0 : 0
                    });
                } else if (c === '?') {
                    const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                    this.quantumFloors.push({ x, y, active: true, channel: chan, flashTimer: 0, pulseIntensity: 1.0, whiteGlow: 0, closeTimer: 0 });
                } else if (c === 'M') {
                    const dir = (levelData.links && levelData.links[`${x},${y}_dir`]) || DIRS.RIGHT;
                    this.blocks.push({ x, y, dir, origX: x, origY: y, type: 'PRISM' });
                } else if (c === 'E') {
                    const dir = (levelData.links && levelData.links[`${x},${y}_dir`]) || DIRS.RIGHT;
                    const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                    this.emitters.push({ x, y, dir, laserTarget: null, channel: chan });
                } else if (c === 'Q') {
                    this.catalysts.push({ x, y, active: false });
                }





                if (blocksMap && blocksMap[y] && blocksMap[y][x]) {
                    let bc = blocksMap[y][x];
                    if (['>', '<', '^', 'v'].includes(bc)) {
                        let dir = DIRS.RIGHT;
                        if (bc === '<') dir = DIRS.LEFT;
                        if (bc === '^') dir = DIRS.UP;
                        if (bc === 'v') dir = DIRS.DOWN;
                        if (!this.blocks.some(b => b.x === x && b.y === y)) {
                            this.blocks.push({ x, y, dir, origX: x, origY: y });
                        }
                    } else if (['(', ')', '[', ']'].includes(bc)) {
                        let dir = DIRS.LEFT;
                        if (bc === ')') dir = DIRS.RIGHT;
                        if (bc === '[') dir = DIRS.UP;
                        if (bc === ']') dir = DIRS.DOWN;
                        if (!this.conveyors.some(c => c.x === x && c.y === y)) {
                            const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                            this.conveyors.push({ x, y, dir, channel: chan });
                        }
                    } else if (bc === 'M') {
                        const dir = (levelData.links && levelData.links[`${x},${y}_dir`]) || 0;
                        if (!this.blocks.some(b => b.x === x && b.y === y)) {
                            this.blocks.push({ x, y, dir, origX: x, origY: y, type: 'PRISM' });
                        }
                    } else if (bc === 'S') {
                        if (!this.scrapPositions.has(`${x},${y}`)) {
                            this.scrapPositions.add(`${x},${y}`);
                            this.totalScrap++;
                        }
                    }
                }

                // Check overlay map
                if (levelData.overlays && levelData.overlays[y] && levelData.overlays[y][x]) {
                    let oc = levelData.overlays[y][x];
                    if (['(', ')', '[', ']'].includes(oc)) {
                        let dir = DIRS.LEFT;
                        if (oc === ')') dir = DIRS.RIGHT;
                        if (oc === '[') dir = DIRS.UP;
                        if (oc === ']') dir = DIRS.DOWN;
                        if (!this.conveyors.some(c => c.x === x && c.y === y)) {
                            const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                            this.conveyors.push({ x, y, dir, channel: chan });
                        }
                    } else if (oc === 'S') {
                        if (!this.scrapPositions.has(`${x},${y}`)) {
                            this.scrapPositions.add(`${x},${y}`);
                            this.totalScrap++;
                        }
                    } else if (oc === 'D') {
                        const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                        if (!this.doors.some(d => d.x === x && d.y === y)) {
                            this.doors.push({ 
                                x, y, 
                                state: 'CLOSED', 
                                visualOpen: 0,
                                error: false, 
                                closeTimer: 0, 
                                channel: chan 
                            });
                        }
                    } else if (oc === '?') {
                        const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                        if (!this.quantumFloors.some(q => q.x === x && q.y === y)) {
                            this.quantumFloors.push({ x, y, active: true, channel: chan, flashTimer: 0, pulseIntensity: 1.0, whiteGlow: 0, closeTimer: 0 });
                        }
                    } else if (oc === '_' || oc === 'P') {
                        const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                        const behavior = (levelData.links && levelData.links[`${x},${y}_behavior`]) || (oc === 'P' ? 'PRESSURE' : 'TIMER');
                        const initState = (levelData.links && levelData.links[`${x},${y}_init`]) === true;

                        if (!this.buttons.some(b => b.x === x && b.y === y)) {
                            this.buttons.push({ 
                                x, y, 
                                isPressed: initState, 
                                channel: chan, 
                                behavior: behavior,
                                timer: 0,
                                wasSteppedOn: false,
                                energy: initState ? 1.0 : 0
                            });
                        }
                    } else if (oc === 'E') {
                        const dir = (levelData.links && levelData.links[`${x},${y}_dir`]) || DIRS.RIGHT;
                        const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                        if (!this.emitters.some(e => e.x === x && e.y === y)) {
                            this.emitters.push({ x, y, dir, channel: chan, laserTarget: null, isActive: true });
                        }
                    } else if (oc === 'M') {
                        const dir = (levelData.links && levelData.links[`${x},${y}_dir`]) || 0;
                        if (!this.blocks.some(b => b.x === x && b.y === y)) {
                            this.blocks.push({ x, y, dir, origX: x, origY: y, type: 'PRISM' });
                        }
                    } else if (oc === 'Q') {
                        if (!this.catalysts.some(c => c.x === x && c.y === y)) {
                            this.catalysts.push({ x, y, active: false });
                        }
                    }
                }
            }
            this.map.push(row);
        }

        // Initialize camera at player
        this.camera.x = this.player.x * 32 - 320;
        this.camera.y = this.player.y * 32 - 240;
        this.updateCamera(true); // Snap immediately
        
        this.refreshConveyorBends();
        
        // Detect Double Doors
        for (let door of this.doors) {
            // Check Right
            const right = this.doors.find(d => d.x === door.x + 1 && d.y === door.y && !d.pair);
            if (right) {
                door.pair = { x: right.x, y: right.y, side: 'LEFT' };
                right.pair = { x: door.x, y: door.y, side: 'RIGHT' };
                door.orientation = 'HORIZONTAL';
                right.orientation = 'HORIZONTAL';
            } else {
                // Check Down
                const down = this.doors.find(d => d.x === door.x && d.y === door.y + 1 && !d.pair);
                if (down) {
                    door.pair = { x: down.x, y: down.y, side: 'TOP' };
                    down.pair = { x: door.x, y: door.y, side: 'BOTTOM' };
                    door.orientation = 'VERTICAL';
                    down.orientation = 'VERTICAL';
                }
            }
        }
        // Ensure spawn is always a station
        if (!this.chargingStations.some(s => s.x === this.startPos.x && s.y === this.startPos.y)) {
            this.chargingStations.push({ ...this.startPos });
        }

        this.updateEnergy();
        this.saveUndo(); 

        if (window.AudioSys) {
            AudioSys.setMusicIntensity(2); // Levels always play the full "Action" version
            AudioSys.playGameMusic();
        }

        // Trigger start dialogues (Handled in main.js when transition finishes)
    }

    isConveyorActive(c) {
        if (!c) return false;
        const chan = Number(c.channel || 0);
        const chanButtons = this.buttons.filter(b => Number(b.channel || 0) === chan);
        // If there are NO buttons on this channel, it's ON.
        // If there ARE buttons, it's ON if at least one is pressed.
        return chanButtons.length === 0 || chanButtons.some(b => b.isPressed);
    }

    isEmitterActive(e) {
        if (!e) return false;
        const chan = Number(e.channel || 0);
        const chanButtons = this.buttons.filter(b => Number(b.channel || 0) === chan);
        return chanButtons.length === 0 || chanButtons.some(b => b.isPressed);
    }

    update() {
        if (this.player.isDead) this.player.deathTimer++;
        // Smooth player interpolation (Juicy movement)
        if (this.player.visualX === undefined) { 
            this.player.visualX = this.player.x; 
            this.player.visualY = this.player.y; 
        }
        this.player.visualX += (this.player.x - this.player.visualX) * 0.4; // 0.4 is fast and responsive
        this.player.visualY += (this.player.y - this.player.visualY) * 0.4;

        // Smooth player rotation
        if (this.player.visualAngle === undefined) this.player.visualAngle = this.player.dir * (Math.PI / 2);
        let pTargetAngle = this.player.dir * (Math.PI / 2);
        let pAngleDiff = pTargetAngle - this.player.visualAngle;
        while (pAngleDiff > Math.PI) pAngleDiff -= Math.PI * 2;
        while (pAngleDiff < -Math.PI) pAngleDiff += Math.PI * 2;
        this.player.visualAngle += pAngleDiff * 0.3;

        // Continuous trail spawning (multi-segment fill for perfect continuity)
        if (this.player.lastTX === undefined) {
            this.player.lastTX = this.player.visualX;
            this.player.lastTY = this.player.visualY;
        }
        
        let dx = this.player.visualX - this.player.lastTX;
        let dy = this.player.visualY - this.player.lastTY;
        let distMoved = Math.sqrt(dx*dx + dy*dy);
        const step = 0.05; // 1.6 pixels

        if (distMoved > step) {
            const numSegments = Math.floor(distMoved / step);
            // Check if player is on a conveyor to suppress trails
            const onConveyor = this.conveyors.some(c => c.x === this.player.x && c.y === this.player.y);
            
            for (let i = 0; i < numSegments; i++) {
                this.player.lastTX += (dx / distMoved) * step;
                this.player.lastTY += (dy / distMoved) * step;
                if (!onConveyor) {
                    Graphics.spawnTrailSegment(this.player.lastTX, this.player.lastTY, this.player.visualAngle);
                }
            }
        }

        // Smooth block interpolation (Spring physics)
        const springForce = 0.4; 
        const damping = 0.5; 
        for (let b of this.blocks) {
            if (b.visualX === undefined) { 
                b.visualX = b.x; 
                b.visualY = b.y; 
                b.vx = 0; 
                b.vy = 0; 
            }
            let ax = (b.x - b.visualX) * springForce;
            let ay = (b.y - b.visualY) * springForce;
            b.vx = (b.vx + ax) * damping;
            b.vy = (b.vy + ay) * damping;
            b.visualX += b.vx;
            b.visualY += b.vy;

            // Smooth rotation (visualAngle lerp)
            if (b.visualAngle === undefined) b.visualAngle = b.dir * (Math.PI / 2);
            let targetAngle = b.dir * (Math.PI / 2);
            let angleDiff = targetAngle - b.visualAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            b.visualAngle += angleDiff * 0.35;
        }

        // --- SMOOTH DOOR ANIMATION ---
        for (let door of this.doors) {
            if (door.visualOpen === undefined) door.visualOpen = (door.state === 'OPEN' || door.state === 'BROKEN_OPEN') ? 1 : 0;
            
            let target = (door.state === 'OPEN' || door.state === 'BROKEN_OPEN') ? 1 : 0;
            
            if (door.state === 'BROKEN_OPEN') {
                // Jittery Jammed Animation: Struggling to close but stuck
                // Oscillates between 0.7 and 0.9 with high-frequency tremors
                const tremor = (Math.random() - 0.5) * 0.05;
                const struggle = 0.8 + Math.sin(Date.now() * 0.01) * 0.1;
                target = struggle + tremor;
                
                if (Math.random() > 0.98) {
                    if (Math.random() > 0.7) AudioSys.doorGrind(); // Occasional grind sound
                }
            }

            const prevVisual = door.visualOpen;
            const speed = target === 0 ? 0.15 : 0.08;
            door.visualOpen += (target - door.visualOpen) * speed;

            // Trigger Whir at the START of closing
            if (target === 0 && prevVisual > 0.95 && door.visualOpen <= 0.95) {
                if (window.AudioSys) AudioSys.playDoorClosingWhir();
            }
            // Trigger Slam earlier in the animation to feel more immediate
            if (target === 0 && prevVisual > 0.4 && door.visualOpen <= 0.4) {
                if (window.AudioSys) AudioSys.doorSlam();
            }
            // Trigger Pneumatic Puff at the very end
            if (target === 0 && prevVisual > 0.05 && door.visualOpen <= 0.05) {
                if (window.AudioSys) AudioSys.playDoorCloseRelease();
            }
        }

        this.updateCamera();
        this.resultTimer++;

        // Update persistent debris physics
        const maxDebris = 150;
        if (this.debris.length > maxDebris) this.debris.splice(0, this.debris.length - maxDebris);
        
        const px = this.player.visualX * 32 + 16;
        const py = this.player.visualY * 32 + 16;

        for (const p of this.debris) {
            // Friction and movement
            p.vx *= 0.92;
            p.vy *= 0.92;
            p.rv *= 0.94;
            
            const nx = p.x + p.vx;
            const ny = p.y + p.vy;
            
            // Simple tile collision
            const tx = Math.floor(nx / 32);
            const ty = Math.floor(ny / 32);
            if (tx >= 0 && tx < this.map[0].length && ty >= 0 && ty < this.map.length) {
                if (this.map[ty][tx] === '#' || this.map[ty][tx] === 'W') {
                    p.vx *= -0.5; p.vy *= -0.5; // Bounce
                } else {
                    p.x = nx;
                    p.y = ny;
                }
            } else {
                p.x = nx; p.y = ny;
            }
            p.rot += p.rv;

            // Pushing by player
            const dx = p.x - px;
            const dy = p.y - py;
            const d2 = dx*dx + dy*dy;
            if (d2 < 576) { // 24px radius
                const d = Math.sqrt(d2) || 1;
                const force = (24 - d) * 0.15;
                p.vx += (dx / d) * force;
                p.vy += (dy / d) * force;
                p.rv += (Math.random() - 0.5) * 0.1;
            }

            // Pushing by blocks
            for (const b of this.blocks) {
                const bx = b.visualX * 32 + 16;
                const by = b.visualY * 32 + 16;
                const bdx = p.x - bx;
                const bdy = p.y - by;
                const bd2 = bdx*bdx + bdy*bdy;
                if (bd2 < 576) {
                    const bd = Math.sqrt(bd2) || 1;
                    const bforce = (24 - bd) * 0.15;
                    p.vx += (bdx / bd) * bforce;
                    p.vy += (bdy / bd) * bforce;
                }
            }
        }
        if (this.player.visorTimer > 0) this.player.visorTimer--;
        
        // Continuous audio update (for LFO and smooth transitions)
        if (window.AudioSys) {
            AudioSys.updateHum(this.audioState.anyActive, this.audioState.progress, this.audioState.contaminated);

            // --- Laser Audio ---
            if (this.state === 'PLAYING') {
                AudioSys.updateLaserAudio(this.emitters.filter(e => e.isActive));
            } else {
                AudioSys.updateLaserAudio([]);
            }

            // --- Conveyor Audio Loop ---
            if (this.state === 'PLAYING') {
                const conveyorsWithButtons = this.conveyors.filter(c => this.isConveyorActive(c));
                
                const playerOnConveyor = conveyorsWithButtons.some(c => c.x === this.player.x && c.y === this.player.y);
                const blockOnConveyor = this.blocks.some(b => conveyorsWithButtons.some(c => c.x === b.x && c.y === b.y));
                const conveyorActive = playerOnConveyor || blockOnConveyor;

                // 1. Shepard Tone (Continuous Illusion)
                AudioSys.updateConveyorShepard(conveyorActive);

                // 2. Gear Clicks (Frenetic)
                this.conveyorAudioTimer = (this.conveyorAudioTimer || 0) + 1;
                if (this.conveyorAudioTimer >= 4) {
                    if (conveyorActive) {
                        this.conveyorTickCount = (this.conveyorTickCount || 0) + 1;
                        AudioSys.playConveyorGear(this.conveyorTickCount % 2);
                    }
                    this.conveyorAudioTimer = 0;
                }
            } else {
                this.conveyorAudioTimer = 0;
                AudioSys.updateConveyorShepard(false);
            }
        }
        
        this.updateEmitters();
        this.updateSliding();
        if (this.state === 'PLAYING') {
            this.checkDialogues('walk');
        }

        if (this.state === 'REVERSING') {
            // Process multiple states per frame for a fast "Rewind" look
            for (let i = 0; i < 3; i++) {
                if (this.undoStack.length > 1) {
                    const prevState = this.undoStack.pop();
                    this.applyState(prevState, true); // SNAP visuals
                    if (Math.random() > 0.8) AudioSys.doorGrind();
                } else {
                    if (this.undoStack.length === 1) {
                        this.applyState(this.undoStack[0], true);
                    }
                    this.state = 'PLAYING';
                    if (this.onReverseComplete) {
                        this.onReverseComplete();
                        this.onReverseComplete = null;
                    }
                    break;
                }
            }
            return;
        }

        // AUTO-SAVE State for Precise Rewind
        // We save state if anything is moving visually or doors are animating
        let isSomethingAnimating = false;
        if (Math.abs(this.player.x - this.player.visualX) > 0.01 || Math.abs(this.player.y - this.player.visualY) > 0.01) isSomethingAnimating = true;
        for (const b of this.blocks) {
            if (Math.abs(b.x - b.visualX) > 0.01 || Math.abs(b.y - b.visualY) > 0.01) { isSomethingAnimating = true; break; }
        }
        for (const d of this.doors) {
            const target = d.state === 'OPEN' || d.state === 'BROKEN_OPEN' ? 1 : 0;
            if (Math.abs(d.visualOpen - target) > 0.01) { isSomethingAnimating = true; break; }
        }

        if (isSomethingAnimating && this.state === 'PLAYING') {
            this.saveUndo();
            // Cap stack to prevent memory issues with continuous recording
            if (this.undoStack.length > 2000) this.undoStack.shift();
        }

        if (this.state === 'WINNING') {
            this.victoryTimer--;

            // Continuous sparks on all targets
            for (const t of this.targets) {
                if (Math.random() < 0.2) {
                    Graphics.spawnParticle(t.x * 32 + 16, t.y * 32 + 16, '#00ff9f');
                }
            }

            if (this.victoryTimer <= 0) {
                this.state = 'LEVEL_COMPLETE';
                AudioSys.levelComplete();
                this.score += 1000 + Math.floor(this.time * 10);
                
                // Award stars based on percentage
                const lvl = LEVELS[this.levelIndex];
                const totalTime = lvl.timer || 60;
                const timePercent = (this.time / totalTime) * 100;
                const stars = timePercent > 50 ? 3 : (timePercent > 20 ? 2 : 1);
                
                this.economyBonus = 0;
                if (typeof LevelSelector !== 'undefined') {
                    this.economyBonus = LevelSelector.completeLevel(this.levelIndex, stars, this.moveCount);
                    
                    // Track global stats on completion
                    const lvl = LEVELS[this.levelIndex];
                    const timeSpent = (lvl.timer || 60) - Math.floor(this.time);
                    LevelSelector.trackStat('totalTime', Math.max(0, timeSpent));
                    
                    let levelAmps = 0;
                    for (const t of this.targets) levelAmps += t.required;
                    LevelSelector.trackStat('totalAmps', levelAmps);

                    let validatedWires = 0;
                    for (const pw of this.poweredWires.values()) {
                        if (pw.color === 'OCEAN') validatedWires++;
                    }
                    LevelSelector.trackStat('totalWireMeters', validatedWires);
                }
                
                // Open Result Screen instead of auto-advancing
                if (typeof ResultScreen !== 'undefined') {
                    this.state = 'RESULT';
                    ResultScreen.open(this);
                } else {
                    // Fallback: auto-advance if ResultScreen not loaded
                    this.startTransition(() => {
                        this.loadLevel(this.levelIndex + 1);
                    });
                }
            }
        }

        // Gradual Recharge Logic at any powered station
        const currentStation = this.chargingStations.find(s => s.x === this.player.x && s.y === this.player.y);
        const isAtPoweredStation = currentStation && this.poweredStations.has(`${currentStation.x},${currentStation.y}`);

        if (this.state === 'PLAYING' && isAtPoweredStation) {
            const initialMoves = LEVELS[this.levelIndex].time;
            if (this.moves < initialMoves) {
                this.rechargeTimer = (this.rechargeTimer || 0) + 1;

                // Recharge 1 unit every 7 frames (Slower, as requested)
                if (this.rechargeTimer >= 7) {
                    this.moves++;
                    if (typeof LevelSelector !== 'undefined') LevelSelector.trackStat('energyRecharged', 1);
                    this.rechargeTimer = 0;

                    if (window.AudioSys) AudioSys.rechargeTick(this.moves, initialMoves);
                    if (window.Graphics) {
                        // More visible feedback per tick
                        for (let i = 0; i < 3; i++) {
                            Graphics.spawnParticle(this.player.x * 32 + 16, this.player.y * 32 + 16, '#00ff9f', 'spark');
                        }
                    }
                }

                if (this.moves === initialMoves) {
                    if (window.AudioSys) AudioSys.corePowered();
                    if (window.Graphics) {
                        for (let i = 0; i < 15; i++) {
                            Graphics.spawnParticle(this.startPos.x * 32 + 16, this.startPos.y * 32 + 16, '#00ff9f');
                        }
                    }
                }
            }
        } else {
            this.rechargeTimer = 0;
        }

        // Update Button States
        for (let btn of this.buttons) {
            const isPlayerOn = this.player.x === btn.x && this.player.y === btn.y;
            const isBlockOn = this.blocks.some(b => b.x === btn.x && b.y === btn.y);
            const isSteppedOn = isPlayerOn || isBlockOn;
            
            const wasPressed = btn.isPressed;
            
            switch (btn.behavior) {
                case 'TIMER':
                    if (isSteppedOn) btn.timer = 45; // 1.5s duration
                    if (btn.timer > 0) btn.timer--;
                    btn.isPressed = (isSteppedOn || btn.timer > 0);
                    break;
                
                case 'TOGGLE':
                    if (isSteppedOn && !btn.wasSteppedOn) {
                        btn.isPressed = !btn.isPressed;
                        if (window.AudioSys) AudioSys.buttonClick();
                    }
                    break;
                
                case 'PERMANENT':
                    if (isSteppedOn) btn.isPressed = true;
                    break;
                
                case 'PRESSURE':
                    // Charge logic: 3 seconds to fill, 3 seconds to empty
                    const chargeSpeed = 1 / (3 * 60); 
                    if (isSteppedOn) {
                        btn.charge = Math.min(1.0, (btn.charge || 0) + chargeSpeed);
                    } else {
                        btn.charge = Math.max(0, (btn.charge || 0) - chargeSpeed);
                    }
                    
                    // Logic: Must reach 1.0 to turn ON. Stays ON until reaches 0.
                    if (btn.charge >= 1.0) btn.isActive = true;
                    if (btn.charge <= 0) btn.isActive = false;
                    
                    // Sound trigger on activation
                    if (btn.isActive && !wasPressed) {
                        if (window.AudioSys) AudioSys.buttonClick();
                    }

                    btn.isPressed = btn.isActive;
                    break;
            }

            if (isSteppedOn && !btn.wasSteppedOn) {
                if (window.AudioSys && btn.behavior !== 'TOGGLE' && btn.behavior !== 'PRESSURE') AudioSys.buttonClick();
            }
            btn.wasSteppedOn = isSteppedOn;
        }

        // Update Quantum Floor States
        const toggledChannels = new Set();
        for (let qf of this.quantumFloors) {
            const chanButtons = this.buttons.filter(b => b.channel === qf.channel);
            const anyPressed = chanButtons.some(b => b.isPressed);
            
            // Signal is now handled by the button's internal timer
            if (anyPressed) {
                qf.closeTimer = 5; // Minimal smoothing delay
            }
            
            const shouldBeOpen = anyPressed || (qf.closeTimer > 0);
            const newState = !shouldBeOpen;

            // Countdown timer if button released
            if (qf.closeTimer > 0 && !anyPressed) qf.closeTimer--;
            
            if (qf.active !== newState && !toggledChannels.has(qf.channel)) {
                if (window.AudioSys) AudioSys.playQuantumToggle(newState);
                toggledChannels.add(qf.channel);

                // CRUSH/RESPAWN LOGIC: If barrier ACTIVATES, any cube on it is shattered
                if (newState === true) {
                    const floorsOnChannel = this.quantumFloors.filter(f => f.channel === qf.channel);
                    for (let f of floorsOnChannel) {
                        const block = this.blocks.find(b => b.x === f.x && b.y === f.y);
                        if (block) {
                            if (window.AudioSys) AudioSys.playCubeCrush();
                            this.spawnDebris(block.x * 32 + 16, block.y * 32 + 16, 15, '#ed8936');
                            
                            // Respawn at original position
                            block.x = block.origX;
                            block.y = block.origY;
                            block.visualX = block.origX;
                            block.visualY = block.origY;
                            
                            this.updateEnergy(); // Recalculate energy after teleport
                        }
                    }
                }
            }
            qf.active = newState;

            // Update flash timer
            if (qf.flashTimer > 0) qf.flashTimer--;

            // Robot presence logic: change color from purple to white
            if (this.player.x === qf.x && this.player.y === qf.y) {
                // If robot is on it, maintain full white glow
                qf.whiteGlow = Math.min(qf.whiteGlow + 0.2, 1.0);
            } else {
                // Slowly return to purple (delay/decay) - slower now (0.01)
                qf.whiteGlow = Math.max(qf.whiteGlow - 0.01, 0);
            }

        }


        // Update Door States and Crunch Logic
        for (let door of this.doors) {
            const isPowered = this.poweredDoors.has(`${door.x},${door.y}`);
            // Link door to button: ALL buttons on the same channel must be pressed
            const chanButtons = this.buttons.filter(b => b.channel === door.channel);
            const anyPressed = chanButtons.some(b => b.isPressed);
            
            const shouldBeOpen = (isPowered || anyPressed);
            const wasOpen = door.state === 'OPEN' || door.state === 'BROKEN_OPEN';

            if (door.state === 'BROKEN_OPEN') continue; // Stay open forever

            if (shouldBeOpen) {
                if (door.state === 'CLOSED') {
                    if (window.AudioSys) AudioSys.playDoorOpen();
                }
                door.state = 'OPEN';
                door.closeTimer = 5; // Minimal smoothing delay
                door.error = false;
            } else {
                if (door.state === 'OPEN') {
                    if (door.closeTimer > 0) {
                        door.closeTimer--;
                    } else {
                        // Attempt to close
                        const isPlayerIn = this.player.x === door.x && this.player.y === door.y;
                        const blockIndex = this.blocks.findIndex(b => b.x === door.x && b.y === door.y);
                        
                        if (isPlayerIn) {
                            door.state = 'CLOSED';
                            this.handleDeath(true); 
                            return;
                        } else if (blockIndex !== -1) {
                            // Caught a block: DESTROY IT and Break Open
                            const b = this.blocks.splice(blockIndex, 1)[0];
                            
                            // Find an open direction for pieces to fly into
                            let deathDir = { x: 0, y: 0 };
                            const dirs = [{x:1, y:0}, {x:-1, y:0}, {x:0, y:1}, {x:0, y:-1}];
                            for (const d of dirs) {
                                const tx = b.x + d.x;
                                const ty = b.y + d.y;
                                if (tx >= 0 && tx < this.map[0].length && ty >= 0 && ty < this.map.length) {
                                    if (this.map[ty][tx] !== '#' && this.map[ty][tx] !== 'W') {
                                        deathDir = d;
                                        break;
                                    }
                                }
                            }

                            this.spawnDebris(b.x * 32 + 16, b.y * 32 + 16, 8, '#ff8800', deathDir);
                            this.spawnDebris(b.x * 32 + 16, b.y * 32 + 16, 6, '#3a3a4a', deathDir);

                            door.state = 'BROKEN_OPEN';
                            door.error = true;
                            if (window.AudioSys) AudioSys.playCubeCrush();
                            // Heavy destruction particles
                            for (let i = 0; i < 20; i++) {
                                Graphics.spawnParticle(door.x * 32 + 16, door.y * 32 + 16, '#ffcc00', 'spark');
                                Graphics.spawnParticle(door.x * 32 + 16, door.y * 32 + 16, 'rgba(100,100,100,0.5)', 'smoke');
                            }
                        } else {
                            door.state = 'CLOSED';
                        }
                    }
                }
            }
        }

        // Update Emitter States (ON/OFF via Channel)
        for (let e of this.emitters) {
            if (e.channel === 0) {
                e.isActive = true;
            } else {
                const chanButtons = this.buttons.filter(b => b.channel === e.channel);
                e.isActive = chanButtons.some(b => b.isPressed);
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

        // LOCK CONTROLS IF ON ACTIVE CONVEYOR: The player must follow the belt
        const conveyor = this.conveyors.find(c => c.x === this.player.x && c.y === this.player.y);
        if (conveyor && this.isConveyorActive(conveyor)) return;

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
            
            // Trigger Quantum Hum if stepping on a quantum floor
            const qf = this.quantumFloors.find(q => q.x === this.player.x && q.y === this.player.y);
            if (qf && window.AudioSys) {
                // Coordinate-based variation for "each tile" signature tone
                AudioSys.playQuantumHum(false, (this.player.x + this.player.y) % 4);
            }
        }

        if (!moveSuccessful) return;

        // (Trails are now handled continuously in update())

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

        // Trigger dialogues on walking
        this.checkDialogues('walk');
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
            if (b.type === 'PRISM') AudioSys.playPrismRotate();
            else AudioSys.rotate();
            this.updateEnergy();
            actionTaken = true;
        }

        // 2. Check for Target Core to activate
        if (!actionTaken) {
            const target = this.targets.find(t => t.x === tx && t.y === ty);
            if (target) {
                const tData = this.poweredTargets.get(`${tx},${ty}`) || { charge: 0, contaminated: false };

                if (tData.contaminated) {
                    // Just negative feedback, no death (as requested)
                    AudioSys.coreLost();
                    for (let i = 0; i < 10; i++) Graphics.spawnParticle(tx * 32 + 16, ty * 32 + 16, '#ff003c', 'spark');
                    actionTaken = true; // Consumes energy for trying a corrupted core
                }

                // All targets must meet their requirement and none can be contaminated
                const allMet = this.targets.every(t => {
                    const data = this.poweredTargets.get(`${t.x},${t.y}`) || { charge: 0, contaminated: false };
                    return data.charge >= t.required && !data.contaminated;
                });

                if (allMet && this.targets.length > 0) {
                    this.state = 'WINNING';
                    this.victoryTimer = 30;
                    this.hitStopTimer = 6; // Hit Stop freeze for impact!
                    this.resultTimer = 0; // Reset for flashing
                    AudioSys.corePowered();

                    for (const t of this.targets) {
                        for (let i = 0; i < 15; i++) {
                            Graphics.spawnParticle(t.x * 32 + 16, t.y * 32 + 16, '#00ff9f');
                        }
                    }
                } else {
                    AudioSys.coreLost(); // Negative feedback
                }
                // actionTaken = false; (Cores don't cost energy as per request)
            }
        }

        if (actionTaken) {
            // Smoke puffs when rotating (Costs energy)
            for (let i = 0; i < 4; i++) {
                const offsetX = (Math.random() - 0.5) * 16;
                const offsetY = (Math.random() - 0.5) * 8;
                Graphics.spawnParticle(this.player.x * 32 + 16 + offsetX, this.player.y * 32 + 24 + offsetY, 'rgba(240, 240, 240, 0.6)', 'smoke');
            }

            // Energy penalty for rotation
            this.moves--;
            this.moveCount++;
            if (typeof LevelSelector !== 'undefined') LevelSelector.trackStat('rotations', 1);
            if (this.moves <= 0) {
                this.handleDeath(false);
            }
        } else {
            // Check if we hit a core (even if it didn't cost energy, we might want a small puff)
            const isTarget = this.targets.some(t => t.x === tx && t.y === ty);
            if (isTarget) {
                for (let i = 0; i < 2; i++) {
                    const offsetX = (Math.random() - 0.5) * 8;
                    Graphics.spawnParticle(this.player.x * 32 + 16 + offsetX, this.player.y * 32 + 24, 'rgba(240, 240, 240, 0.4)', 'smoke');
                }
            }
        }
    }

    isTilePassable(x, y, ignoreObj = null, dx = 0, dy = 0) {
        if (y < 0 || y >= this.map.length || x < 0 || x >= this.map[0].length) return false;
        if (this.map[y][x] === '#' || this.map[y][x] === 'W') return false;
        
        // Convert ignoreObj to array if it's not already
        const ignores = Array.isArray(ignoreObj) ? ignoreObj : (ignoreObj ? [ignoreObj] : []);

        // Check doors
        const door = this.doors.find(d => d.x === x && d.y === y);
        if (door && door.state === 'CLOSED') return false;
        
        // Check blocks (excluding the ones moving if applicable)
        if (this.blocks.some(b => b.x === x && b.y === y && !ignores.includes(b))) return false;
        
        // Check entities
        if (this.sources.some(s => s.x === x && s.y === y)) return false;
        if (this.redSources.some(s => s.x === x && s.y === y)) return false;
        if (this.targets.some(t => t.x === x && t.y === y)) return false;
        if (this.forbiddens.some(f => f.x === x && f.y === y)) return false;
        if (this.brokenCores.some(b => b.x === x && b.y === y)) return false;
        if (this.emitters.some(e => e.x === x && e.y === y)) return false;
        
        // Check player (unless player is the one moving)
        if (this.player.x === x && this.player.y === y && !ignores.includes(this.player)) return false;
        
        // Check Quantum Floor (only for blocks)
        if (!ignores.includes(this.player)) {
            const qf = this.quantumFloors.find(q => q.x === x && q.y === y);
            if (qf && qf.active) {
                if (window.AudioSys) AudioSys.playQuantumHum(true, (x + y) % 4); // Signature tone for this tile
                qf.entrySide = { dx: -dx, dy: -dy }; // Store entry side
                this.triggerQuantumPulse(x, y, 1.0, 0, 0, new Set(), dx, dy); // Pulse the whole connected floor
                return false;
            }
        }



        return true;
    }


    updateSliding() {
        if (this.state !== 'PLAYING') return;
        
        // Player slide (Original slow speed - Heavy Robot)
        const pDist = Math.abs(this.player.x - this.player.visualX) + Math.abs(this.player.y - this.player.visualY);
        if (pDist < 0.05) {
            this.handleEntitySlide(this.player, true);
        }

        // Blocks slide (Fast transit)
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

        // Check if conveyor is powered by buttons
        if (!this.isConveyorActive(conveyor)) return; // Stopped

        // Determine direction
        let dx = 0, dy = 0;
        if (conveyor.dir === DIRS.UP) dy = -1;
        else if (conveyor.dir === DIRS.DOWN) dy = 1;
        else if (conveyor.dir === DIRS.LEFT) dx = -1;
        else if (conveyor.dir === DIRS.RIGHT) dx = 1;

        const nx = obj.x + dx;
        const ny = obj.y + dy;

        // NEW: Chain push logic for conveyors
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
            
            // LAUNCH MECHANIC: Blocks fly when exiting a belt and PUSH others in their way
            if (!isPlayer && !nextIsConveyor) {
                let launchDist = 3; 
                for (let i = 0; i < launchDist; i++) {
                    const lx = obj.x + dx;
                    const ly = obj.y + dy;
                    
                    // Check if we hit a chain of blocks during launch
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



                        // Push the chain
                        for (let j = blocksToPushLaunch.length - 1; j >= 0; j--) {
                            blocksToPushLaunch[j].x += dx;
                            blocksToPushLaunch[j].y += dy;
                        }
                        obj.x = lx;
                        obj.y = ly;
                        // Spawn some sparks at each step of the launch
                        for(let s=0; s<3; s++) Graphics.spawnParticle(obj.x * 32 + 16, obj.y * 32 + 16, '#00f0ff', 'spark');
                    } else {
                        break; // Hit a wall or immovable object
                    }
                }
                if (window.AudioSys) AudioSys.doorSlam(); // Heavy landing thud
            }

            if (isPlayer) {
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
            }
            this.updateEnergy();
        }
    }

    updateEmitters() {
        // Reset hit status for all prisms
        for (let b of this.blocks) if (b.type === 'PRISM') b.isHit = false;
        
        // Reset catalysts before tracing
        this.catalysts.forEach(c => c.active = false);

        for (const e of this.emitters) {
            if (!this.isEmitterActive(e)) {
                e.isActive = false;
                e.laserPath = [];
                continue;
            }
            e.isActive = true;
            let lx = e.x;
            let ly = e.y;
            let dx = 0, dy = 0;
            if (e.dir === DIRS.RIGHT) dx = 1;
            else if (e.dir === DIRS.LEFT) dx = -1;
            else if (e.dir === DIRS.UP) dy = -1;
            else if (e.dir === DIRS.DOWN) dy = 1;

            e.laserPath = [{ x: lx, y: ly, dx, dy }];
            let steps = 0;
            let cx = lx, cy = ly;

            while (steps < 100) {
                steps++;
                cx += dx;
                cy += dy;

                // Bounds check
                if (cx < 0 || cx >= this.map[0].length || cy < 0 || cy >= this.map.length) {
                    e.laserPath.push({ x: cx, y: cy, type: 'BOUNDS' });
                    break;
                }

                // Wall/Door check
                const char = this.map[cy][cx];
                if (char === '#' || char === 'W') {
                    e.laserPath.push({ x: cx, y: cy, type: 'WALL' });
                    break;
                }
                const catalyst = this.catalysts.find(c => c.x === cx && c.y === cy);
                if (catalyst) {
                    catalyst.active = true;
                    e.laserPath.push({ x: cx, y: cy, type: 'CATALYST' });
                    break;
                }
                const door = this.doors.find(d => d.x === cx && d.y === cy);
                if (door && door.state === 'CLOSED') {
                    e.laserPath.push({ x: cx, y: cy, type: 'DOOR' });
                    break;
                }
                
                // Player collision
                if (this.player.x === cx && this.player.y === cy && !this.player.isDead) {
                    this.handleDeath(true, 'LASER');
                    e.laserPath.push({ x: cx, y: cy, type: 'PLAYER' });
                    break;
                }

                // Block collision
                const blockIndex = this.blocks.findIndex(b => b.x === cx && b.y === cy);
                if (blockIndex !== -1) {
                    const block = this.blocks[blockIndex];
                    if (block.type === 'PRISM') {
                        const reflection = this.getPrismReflection(block, dx, dy);
                        if (reflection) {
                            block.isHit = true;
                            dx = reflection.dx;
                            dy = reflection.dy;
                            e.laserPath.push({ x: cx, y: cy, type: 'PRISM', nextDx: dx, nextDy: dy });
                            continue; // Bends and continues
                        } else {
                            e.laserPath.push({ x: cx, y: cy, type: 'BLOCK' });
                            break;
                        }
                    } else {
                        // Standard block - destroyed
                        const b = this.blocks.splice(blockIndex, 1)[0];
                        if (window.AudioSys) AudioSys.playCubeCrush();
                        this.spawnDebris(b.x * 32 + 16, b.y * 32 + 16, 12, '#00f0ff', { x: dx, y: dy });
                        for (let i = 0; i < 15; i++) {
                            Graphics.spawnParticle(b.x * 32 + 16, b.y * 32 + 16, '#00f0ff', 'spark');
                        }
                        this.updateEnergy();
                        e.laserPath.push({ x: cx, y: cy, type: 'BLOCK' });
                        break;
                    }
                }
                
                // Other Emitter collision
                if (this.emitters.some(other => other !== e && other.x === cx && other.y === cy)) {
                    e.laserPath.push({ x: cx, y: cy, type: 'EMITTER' });
                    break;
                }

                // Empty space - continue
                if (steps >= 99) {
                    e.laserPath.push({ x: cx, y: cy, type: 'NONE' });
                }
            }
            
            // Set laserTarget for AudioSys hit detection
            if (e.laserPath && e.laserPath.length > 0) {
                e.laserTarget = e.laserPath[e.laserPath.length - 1];
            } else {
                e.laserTarget = null;
            }
        }

        // Trigger energy update if ANY catalyst or prism status changed this frame
        // to ensure components like doors react immediately to lasers.
        const currentActive = this.catalysts.map(c => c.active);
        const currentPrisms = this.blocks.filter(b => b.type === 'PRISM').map(b => b.isHit);
        
        let needsUpdate = false;
        if (!this._lastCatStates || this._lastCatStates.length !== currentActive.length) {
            needsUpdate = true;
        } else {
            for (let i = 0; i < currentActive.length; i++) {
                if (currentActive[i] !== this._lastCatStates[i]) { needsUpdate = true; break; }
            }
        }
        
        if (!needsUpdate) {
            if (!this._lastPrismStates || this._lastPrismStates.length !== currentPrisms.length) {
                needsUpdate = true;
            } else {
                for (let i = 0; i < currentPrisms.length; i++) {
                    if (currentPrisms[i] !== this._lastPrismStates[i]) { needsUpdate = true; break; }
                }
            }
        }

        if (needsUpdate) {
            this.updateEnergy();
        }
        
        this._lastCatStates = currentActive;
        this._lastPrismStates = currentPrisms;
    }

    getPrismReflection(block, dx, dy) {
        // Only active if rotation is almost finished
        const targetAngle = block.dir * (Math.PI / 2);
        const currentAngle = block.visualAngle !== undefined ? block.visualAngle : targetAngle;
        
        let diff = Math.abs(currentAngle - targetAngle);
        while (diff > Math.PI) diff -= Math.PI * 2;
        if (Math.abs(diff) > 0.1) return null;

        // dx, dy is the laser direction
        // entryDir is where the laser is coming from relative to the block
        const entrySide = this.getDirectionFromVector(-dx, -dy);
        
        // ┏ (dir 1): Reflects Left <-> Down
        if (block.dir === 1) {
            if (entrySide === DIRS.LEFT) return { dx: 0, dy: 1 }; 
            if (entrySide === DIRS.DOWN) return { dx: -1, dy: 0 };
        }
        // ┗ (dir 2): Reflects Left <-> Up
        if (block.dir === 2) {
            if (entrySide === DIRS.LEFT) return { dx: 0, dy: -1 };
            if (entrySide === DIRS.UP) return { dx: -1, dy: 0 };
        }
        // ┛ (dir 3): Reflects Right <-> Up
        if (block.dir === 3) {
            if (entrySide === DIRS.RIGHT) return { dx: 0, dy: -1 };
            if (entrySide === DIRS.UP) return { dx: 1, dy: 0 };
        }
        // ┓ (dir 0): Reflects Right <-> Down
        if (block.dir === 0) {
            if (entrySide === DIRS.RIGHT) return { dx: 0, dy: 1 };
            if (entrySide === DIRS.DOWN) return { dx: 1, dy: 0 };
        }
        
        return null; // Blocked
    }

    getDirectionFromVector(dx, dy) {
        if (dx === 1) return DIRS.RIGHT;
        if (dx === -1) return DIRS.LEFT;
        if (dy === 1) return DIRS.DOWN;
        if (dy === -1) return DIRS.UP;
        return -1;
    }

    updateEnergy() {
        this.poweredWires.clear();
        this.poweredBlocks.clear();
        this.poweredTargets.clear();
        this.poweredStations.clear();
        this.isStationPowered = false;

        const visited = new Map(); // key -> max charge

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

            // Prevent self-intersection
            if (path.some(p => p.x === x && p.y === y)) return false;

            const displayColor = forceOcean ? 'OCEAN' : color;
            const key = `${x},${y},${dir},${displayColor}`;
            const prevCharge = visited.get(key);
            if (prevCharge !== undefined && prevCharge >= charge) return false;
            visited.set(key, charge);

            let reachedValidTarget = false;

            // 1. Check block
            const block = this.blocks.find(b => b.x === x && b.y === y);
            let blockBlocking = false;
            let blockActive = false;

            if (block) {
                blockBlocking = true; // Block ALWAYS dominates this tile
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

            // 2. Check Targets (Only if not blocked by a block on this tile)
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
                    // Check Station
                    if (color === 'BLUE') {
                        this.poweredStations.add(`${x},${y}`);
                        this.isStationPowered = true;
                        reachedValidTarget = true;
                    }
                }
            } 
            
            // 4. Check Doors
            if (!blockBlocking) {
                const door = this.doors.find(d => d.x === x && d.y === y);
                if (door) {
                    this.poweredDoors.add(`${x},${y}`);
                    reachedValidTarget = true;
                }
            }
            
            // 3. Check Wire
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
                    // Block is on tile and active: mark wire as powered for visuals but don't propagate
                    const pKey = `${x},${y}`;
                    this.poweredWires.set(pKey, { dirs: [block.dir], color: displayColor, charge: charge, entries: [(dir + 2) % 4] });
                }
            }

            if (reachedValidTarget && !forceOcean) {
                // Retroactively mark path as OCEAN if we found a valid target and we aren't already forcing ocean
                for (const p of path.concat({ x, y })) {
                    const pEntry = this.poweredWires.get(`${p.x},${p.y}`);
                    if (pEntry) pEntry.color = 'OCEAN';
                }
            }

            return reachedValidTarget;
        };

        // Iterative relay logic
        let changed = true;
        let relaySources = [];
        let validSources = new Set(); // Sources/Relays that reached a target

        while (changed) {
            changed = false;
            visited.clear();
            this.poweredWires.clear();
            this.poweredBlocks.clear();
            this.poweredTargets.clear();
            this.poweredDoors.clear();
            this.poweredStations.clear();
            this.poweredForbiddens.clear();
            this.isStationPowered = false;

            // Pass 1: Standard trace from all sources to find validity
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
                for (const cat of this.catalysts) {
                    if (cat.active) {
                        for (let d of [DIRS.UP, DIRS.RIGHT, DIRS.DOWN, DIRS.LEFT]) {
                            let snx = cat.x, sny = cat.y;
                            if (d === DIRS.UP) sny--;
                            else if (d === DIRS.DOWN) sny++;
                            else if (d === DIRS.LEFT) snx--;
                            else if (d === DIRS.RIGHT) snx++;
                            trace(snx, sny, d, 'BLUE', 100, [], true, true);
                        }
                    }
                }
                for (const t of relaySources) {
                    const tKey = `rel_${t.x},${t.y}`;
                    const isOcean = forceOceanMap.has(tKey);
                    const tData = this.poweredTargets.get(`${t.x},${t.y}`);
                    const skipDirs = tData ? tData.entries : [];

                    for (let d of [DIRS.UP, DIRS.RIGHT, DIRS.DOWN, DIRS.LEFT]) {
                        if (skipDirs.includes(d)) continue; // Don't send back to source

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

            // Check for newly satisfied relay targets
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

        // Power status already updated during trace

        // Update audio state for continuous loop
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
            
            // Initial burst bias
            const vx = initialDir.x * speed * 2 + Math.cos(angle) * speed;
            const vy = initialDir.y * speed * 2 + Math.sin(angle) * speed;
            
            // Irregular polygon generation
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
        
        this.resultTimer = 0; // Reset for flashing red vignette
        
        // Subtract life for BOTH cases now
        this.lives = Math.max(0, this.lives - 1);
        
        if (isHazard) {
            AudioSys.explosion();
            if (typeof LevelSelector !== 'undefined') LevelSelector.trackStat('totalDeaths', 1);
            
            // Spawn debris instead of using deathTimer for pieces
            this.spawnDebris(this.player.x * 32 + 16, this.player.y * 32 + 16, 12, '#ed8936', this.player.deathDir);
            this.spawnDebris(this.player.x * 32 + 16, this.player.y * 32 + 16, 8, '#3182ce', this.player.deathDir);
        } else {
            AudioSys.lifeLost(); // Shut down sound
            // Spawn smoke for energy out
            for (let i = 0; i < 8; i++) {
                Graphics.spawnParticle(this.player.x * 32 + 16, this.player.y * 32 + 16, 'rgba(100,100,100,0.5)', 'smoke');
            }
        }

        this.player.isDead = true;
        this.player.deathType = isHazard ? 'CRUSHED' : 'SHUTDOWN';
        this.player.deathTimer = 0;
        
        // Find an open direction for pieces to fly into
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

        // Logic flow choice:
        if (!isHazard && this.lives > 0) {
            // AUTO-RESPAWN with Fade (Battery Empty)
            setTimeout(() => {
                this.startTransition(() => {
                    this.loadLevel(this.levelIndex, true); // keepLives = true
                }, false, 'FALHA');
            }, 800);
        } else {
            // RESULT SCREEN (Hazard or No Lives Left)
            setTimeout(() => {
                if (typeof ResultScreen !== 'undefined') {
                    this.state = 'RESULT';
                    ResultScreen.open(this, true); // true = FAILED
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

        // 1. Dead Zone (No movement)
        if (Math.abs(dx) > this.camera.deadZone.width / 2) {
            moveX = dx - (Math.sign(dx) * this.camera.deadZone.width / 2);
        }
        if (Math.abs(dy) > this.camera.deadZone.height / 2) {
            moveY = dy - (Math.sign(dy) * this.camera.deadZone.height / 2);
        }

        // 2. Soft Zone (Accelerated movement)
        // If we are outside the dead zone, we calculate how far we are into the soft zone
        let lerpX = this.camera.lerp;
        let lerpY = this.camera.lerp;

        if (Math.abs(dx) > this.camera.softZone.width / 2) lerpX = 0.3; // Speed up
        if (Math.abs(dy) > this.camera.softZone.height / 2) lerpY = 0.3;

        if (snap) {
            this.camera.x += moveX;
            this.camera.y += moveY;
        } else {
            this.camera.x += moveX * lerpX;
            this.camera.y += moveY * lerpY;
        }

        // 3. Constraints (Don't scroll past map edges)
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

        // 1. Trace from starts
        const chains = [];
        for (let c of this.conveyors) {
            if (c.inDir === null && c.beltDist === undefined) {
                const chain = [];
                this._traceConveyorPath(c, 0, chain);
                chains.push(chain);
            }
        }

        // 2. Handle remaining (loops)
        for (let c of this.conveyors) {
            if (c.beltDist === undefined) {
                const chain = [];
                this._traceConveyorPath(c, 0, chain);
                chains.push(chain);
            }
        }

        // Set total length for all segments in each chain
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

    checkDialogues(triggerType) {
        if (this.isEditor) return;
        if (!this.levelData || !this.levelData.dialogues) return;
        
        for (const [coord, data] of Object.entries(this.levelData.dialogues)) {
            // Support formats
            let messages = [];
            let config = {};

            if (Array.isArray(data)) {
                messages = data;
                config = data[0] || {};
            } else if (data.messages) {
                messages = data.messages;
                config = data;
            } else {
                messages = [data];
                config = data;
            }

            if (messages.length === 0) continue;

            const trigger = config.trigger || messages[0].trigger || 'walk';
            if (trigger !== triggerType) continue;

            // Spatial check
            const [tx, ty] = coord.split(',').map(Number);
            const radius = config.radius || 0;
            const dist = Math.abs(this.player.x - tx) + Math.abs(this.player.y - ty);
            const isInside = (triggerType === 'start') ? true : (dist <= radius);

            const dialogueId = `${triggerType}_${coord}_${messages[0].text.substring(0,10)}`;
            const isOneShot = config.oneShot !== false; // Default to oneShot: true

            if (isInside) {
                // If oneShot and already triggered, skip
                if (isOneShot && this.triggeredDialogues.has(dialogueId)) continue;
                
                // If not oneShot, we trigger only if we were NOT inside previously (entering)
                // or if it was never triggered at all.
                if (!isOneShot && this.triggeredDialogues.has(dialogueId)) continue;

                const target = this.getDialogueTarget();
                if (window.Dialogue) {
                    this.triggeredDialogues.add(dialogueId);
                    
                    messages.forEach(msg => {
                        Dialogue.show(target, {
                            text: msg.text,
                            icon: msg.icon || 'central',
                            isAI: msg.icon !== 'human',
                            autoDismiss: config.autoDismiss !== false,
                            lockPlayer: config.lockPlayer !== false,
                            dismissDelay: config.dismissDelay || 1500
                        });
                    });
                }
                if (triggerType === 'walk' && radius === 0) break; 
            } else {
                // If player is OUTSIDE and it's NOT a oneShot, reset the trigger so it can fire again upon re-entry
                if (!isOneShot && this.triggeredDialogues.has(dialogueId)) {
                    this.triggeredDialogues.delete(dialogueId);
                }
            }
        }
    }

    getDialogueTarget() {
        const self = this;
        return {
            getBoundingClientRect: () => {
                const canvas = document.getElementById('gameCanvas') || 
                               document.getElementById('test-canvas') || 
                               document.getElementById('editor-canvas');
                if (!canvas) return { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 };
                
                const rect = canvas.getBoundingClientRect();
                const camX = self.camera ? self.camera.x : 0;
                const camY = self.camera ? self.camera.y : 0;
                
                const x = (self.player.visualX * 32) + rect.left - camX;
                const y = (self.player.visualY * 32) + rect.top - camY;
                
                return {
                    width: 32, height: 32,
                    top: y, left: x,
                    bottom: y + 32, right: x + 32,
                    x: x, y: y
                };
            },
            contextElement: document.body
        };
    }
}
