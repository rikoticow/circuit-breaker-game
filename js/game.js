class GameState {
    constructor(levelData = null, isEditor = false) {
        this.isEditor = isEditor;
        this.levelIndex = 0;
        this.map = [];
        this.player = { 
            x: 0, y: 0, 
            prevX: 0, prevY: 0,
            visualX: 0, visualY: 0, 
            dir: DIRS.DOWN, 
            visorTimer: 0, 
            visorColor: '#00f0ff', 
            grabbedBlock: null, 
            isGrabbing: false,
            invulnerable: false,
            flashTimer: 0,
            knockbackDelay: 0,
            knockbackTarget: null
        };
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
        this.portals = [];
        this.gravityButtons = [];
        this.debris = [];
        this.brokenCores = [];
        this.glassWallsHit = new Set();
        this.isSolarPhase = true;
        this.singularitySwitchers = [];
        this.screenShakeTimer = 0;
        this.screenShakeForce = 0.8;
        this.gravitySlidingDir = null;
        this.lastGravityDir = 0;
        this.gravityAcceleration = 0;
        this.gravityStepTimer = 0;
        this.gravityOverlayAlpha = 0;
        this.ambientParticles = [];
        this.isBlackoutActive = false;
        this.blackoutAlpha = 0;
        this.zoneTriggers = [];
        this.remoteSignals = new Set();
        this.isSecurityAlert = false;
        this.alertPulse = 0;
        this.alarmTimer = 0;
        this.activeSequences = [];
        this.frame = 0;
        this.lasersNeedUpdate = true; // Initial calculation required
        this.launchers = [];
        this.projectiles = [];


        this.score = 0;
        this.time = 0;
        this.moveCount = 0;
        HPSystem.init();

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
        this.shopTerminals = [];
        this.scrapTotal = GameProgress ? GameProgress.scrapTotal : 0;
        this.totalScrap = 0;
        this.scrapPositions = new Set();
        this.triggeredDialogues = new Set();
        this.lastStationKey = null; // Track current station for entry effects

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
        this.discovered = new Set();
        this.fogOfWar = false;
        this.discoveryRadius = 5;
        this.rooms = [];

        if (levelData) {
            this.loadLevel(levelData);
        } else {
            this.loadLevel(0);
        }
    }

    updateDiscovery() {
        if (!this.fogOfWar) return;
        const px = Math.floor(this.player.x);
        const py = Math.floor(this.player.y);
        
        // 1. Room Discovery (Instant reveal of entire room)
        if (this.rooms && this.rooms.length > 0) {
            for (const r of this.rooms) {
                // Check if player is inside room bounds
                if (px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h) {
                    for (let ry = r.y; ry < r.y + r.h; ry++) {
                        for (let rx = r.x; rx < r.x + r.w; rx++) {
                            this.discovered.add(`${rx},${ry}`);
                        }
                    }
                }
            }
        }

        // 2. Proximity Discovery (Small radius for corridors)
        const r = 2; // Fixed small radius for corridors
        for (let y = py - r; y <= py + r; y++) {
            for (let x = px - r; x <= px + r; x++) {
                const dx = x - px;
                const dy = y - py;
                if (dx * dx + dy * dy <= r * r) {
                    this.discovered.add(`${x},${y}`);
                }
            }
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

    get isExitOpen() {
        return this.doors.some(d => d.isExit && (d.state === 'OPEN' || d.state === 'BROKEN_OPEN'));
    }

    cloneState() {
        return {
            player: { 
                ...this.player, 
                grabbedBlock: this.player.grabbedBlock ? this.blocks.indexOf(this.player.grabbedBlock) : null 
            },
            blocks: this.blocks.map(b => ({ ...b })),
            moves: this.moves,
            time: this.time,
            hp: window.HPSystem ? HPSystem.currentQuarters : 12,
            scrapCollected: this.scrapCollected,
            scrapPositions: new Set(this.scrapPositions),
            camera: { x: this.camera.x, y: this.camera.y },
            buttons: this.buttons.map(b => ({ ...b })),
            purpleButtons: this.purpleButtons.map(b => ({ ...b })),
            quantumFloors: this.quantumFloors.map(q => ({ ...q })),
            doors: this.doors.map(d => ({ ...d })),
            emitters: this.emitters.map(e => ({ ...e })),
            catalysts: this.catalysts.map(c => ({ ...c })),
            portals: this.portals.map(p => {
                const np = { ...p };
                if (p.slot) {
                    // Deep clone the slot and its content if it's a block
                    np.slot = { content: p.slot.content ? { ...p.slot.content } : null };
                }
                return np;
            }),
            conveyors: this.conveyors.map(c => ({ ...c })),
            singularitySwitchers: this.singularitySwitchers.map(s => ({ ...s })),
            gravityButtons: this.gravityButtons.map(g => ({ ...g })),
            isSolarPhase: this.isSolarPhase,
            isSecurityAlert: this.isSecurityAlert,
            zoneTriggers: this.zoneTriggers.map(t => ({ ...t })),
            remoteSignals: new Set(this.remoteSignals)
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
        if (!state) return;

        // Restore triggers and signals
        if (state.zoneTriggers) this.zoneTriggers = state.zoneTriggers.map(t => ({ ...t }));
        if (state.remoteSignals) this.remoteSignals = new Set(state.remoteSignals);
        this.activeSequences = []; // Clear running sequences on state restore
        this.isSecurityAlert = state.isSecurityAlert || false;

        // 1. Restore blocks first
        this.blocks = (state.blocks || []).map((b) => {
            const nb = { ...b };
            // Ensure physics flags are clean unless specifically restored
            nb.isFalling = b.isFalling || false;
            nb.fallTimer = b.fallTimer || 0;
            
            // Reset velocities to prevent NaN propagation or visual jumping
            nb.vx = 0;
            nb.vy = 0;

            if (snapVisuals) {
                nb.visualX = b.x;
                nb.visualY = b.y;
                nb.visualAngle = b.dir * (Math.PI / 2);
            } else {
                const oldB = this.blocks ? this.blocks.find(ob => ob.origX === nb.origX && ob.origY === nb.origY) : null;
                if (oldB && (oldB.type === nb.type || (!oldB.type && !nb.type))) {
                    nb.visualX = oldB.visualX;
                    nb.visualY = oldB.visualY;
                    nb.visualAngle = oldB.visualAngle;
                    nb.isHit = b.isHit;
                } else {
                    nb.visualX = b.x;
                    nb.visualY = b.y;
                    nb.visualAngle = b.dir * (Math.PI / 2);
                }
            }
            return nb;
        });

        // 2. Restore Player
        const vx = snapVisuals ? state.player.x : (this.player.visualX !== undefined ? this.player.visualX : state.player.x);
        const vy = snapVisuals ? state.player.y : (this.player.visualY !== undefined ? this.player.visualY : state.player.y);
        
        this.player = { ...state.player };
        if (state.player.grabbedBlock !== null && state.player.grabbedBlock !== undefined && state.player.grabbedBlock >= 0) {
            this.player.grabbedBlock = this.blocks[state.player.grabbedBlock];
        } else {
            this.player.grabbedBlock = null;
        }
        this.player.visualX = vx;
        this.player.visualY = vy;
        this.player.vx = 0;
        this.player.vy = 0;
        if (snapVisuals) this.player.visualAngle = state.player.dir * (Math.PI / 2);

        // 3. Restore HP
        if (state.hp !== undefined && window.HPSystem) {
            HPSystem.currentQuarters = state.hp;
        }

        // 4. Restore everything else
        this.moves = state.moves;
        this.scrapCollected = state.scrapCollected;
        this.scrapPositions = new Set(state.scrapPositions);
        this.time = state.time;
        this.camera.x = state.camera.x;
        this.camera.y = state.camera.y;

        this.buttons = (state.buttons || []).map(b => ({ ...b }));
        this.purpleButtons = (state.purpleButtons || []).map(b => ({ ...b }));
        this.quantumFloors = (state.quantumFloors || []).map(q => ({ ...q }));
        this.conveyors = (state.conveyors || []).map(c => ({ ...c }));
        
        // Portals need to preserve the shared slot reference but restore its content
        this.portals.forEach(p => {
            const savedPortal = (state.portals || []).find(sp => sp.x === p.x && sp.y === p.y);
            if (savedPortal && savedPortal.slot && p.slot) {
                if (savedPortal.slot.content) {
                    p.slot.content = { ...savedPortal.slot.content };
                    // Ensure visuals for blocks inside slots are also correctly placed
                    p.slot.content.visualX = p.x;
                    p.slot.content.visualY = p.y;
                } else {
                    p.slot.content = null;
                }
            }
        });
        
        this.singularitySwitchers = (state.singularitySwitchers || []).map(s => ({ ...s }));
        
        this.doors = (state.doors || []).map(d => {
            const nd = { ...d };
            const oldD = this.doors.find(od => od.x === d.x && od.y === d.y);
            if (oldD) {
                nd.visualOpen = snapVisuals ? d.visualOpen : oldD.visualOpen;
            }
            return nd;
        });

        this.emitters = (state.emitters || []).map(e => ({ ...e }));
        this.catalysts = (state.catalysts || []).map(c => ({ ...c }));
        this.gravityButtons = (state.gravityButtons || []).map(g => ({ ...g }));
        this.isSolarPhase = state.isSolarPhase !== undefined ? state.isSolarPhase : true;
        this.isSecurityAlert = state.isSecurityAlert || false;

        this.updateEnergy();
    }

    captureLevelState() {
        return {
            buttons: this.buttons.map(b => ({ x: b.x, y: b.y, isPressed: b.isPressed, energy: b.energy })),
            purpleButtons: this.purpleButtons.map(b => ({ x: b.x, y: b.y, isPressed: b.isPressed, energy: b.energy })),
            doors: this.doors.map(d => ({ x: d.x, y: d.y, state: d.state, visualOpen: d.visualOpen })),
            blocks: this.blocks.map(b => ({ x: b.x, y: b.y, visualX: b.visualX, visualY: b.visualY, dir: b.dir })),
            scrap: Array.from(this.scrapPositions),
            dialogues: Array.from(this.triggeredDialogues)
        };
    }

    applyLevelState(state) {
        if (!state) return;
        
        if (state.buttons) {
            state.buttons.forEach(sb => {
                const b = this.buttons.find(btn => btn.x === sb.x && btn.y === sb.y);
                if (b) { b.isPressed = sb.isPressed; b.energy = sb.energy; }
            });
        }
        if (state.purpleButtons) {
            state.purpleButtons.forEach(sb => {
                const b = this.purpleButtons.find(btn => btn.x === sb.x && btn.y === sb.y);
                if (b) { b.isPressed = sb.isPressed; b.energy = sb.energy; }
            });
        }
        if (state.doors) {
            state.doors.forEach(sd => {
                const d = this.doors.find(door => door.x === sd.x && door.y === sd.y);
                if (d) { d.state = sd.state; d.visualOpen = sd.visualOpen; }
            });
        }
        if (state.blocks && state.blocks.length === this.blocks.length) {
            state.blocks.forEach((sb, i) => {
                this.blocks[i].x = sb.x;
                this.blocks[i].y = sb.y;
                this.blocks[i].visualX = sb.visualX;
                this.blocks[i].visualY = sb.visualY;
                this.blocks[i].dir = sb.dir;
            });
        }
        if (state.scrap) {
            this.scrapPositions = new Set(state.scrap);
            this.scrapCollected = Math.max(0, this.totalScrap - this.scrapPositions.size);
        }
        if (state.dialogues) {
            this.triggeredDialogues = new Set(state.dialogues);
        }
        
        this.updateEnergy();
    }


    loadLevel(indexOrData, keepLives = false, customSpawn = null) {
        // Resolve index if it's a string name
        let targetIndex = indexOrData;
        if (typeof indexOrData === 'string') {
            targetIndex = LEVELS.findIndex(l => l.name === indexOrData);
        }

        // Save previous level state ONLY if we are moving to a DIFFERENT level
        // (Resets/Deaths shouldn't overwrite the persistent 'good' state)
        if (this.levelData && this.levelIndex !== undefined && this.levelIndex !== -1 && this.levelIndex !== targetIndex) {
            if (window.GameProgress) {
                GameProgress.saveLevelState(this.levelIndex, this.captureLevelState());
            }
        }
        let levelData;
        if (typeof indexOrData === 'object') {
            levelData = indexOrData;
            this.levelIndex = -1; // Test Mode indicator
        } else {
            if (typeof indexOrData === 'string') {
                const idx = LEVELS.findIndex(l => l.name === indexOrData);
                if (idx !== -1) indexOrData = idx;
                else {
                    console.error(`Level not found: ${indexOrData}`);
                    // Fallback to level 0 or current if string search fails
                    indexOrData = 0; 
                }
            }

            if (indexOrData >= LEVELS.length) {
                this.state = 'VICTORY';
                return;
            }
            this.levelIndex = indexOrData;
            levelData = LEVELS[indexOrData];
        }
        
        this.levelData = levelData;
        this.time = -1; // Reset timer before loading new data
        this.time = (levelData.timer && levelData.timer > 0) ? levelData.timer : -1; 
        this.moves = 999; 
        this.moveCount = 0;
        this.isSolarPhase = true; 
        if (!keepLives) HPSystem.fullHeal(); 
        this.state = 'PLAYING';
        this.warmupFrames = 60; // 1 second of particle suppression after opening
        this.undoStack = [];
        this.lastCheckpointIndex = 0;
        this.visitedStations = new Set();
        this.glassWallsHit = new Set();

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
        this.portals = [];
        this.gravityButtons = [];
        this.glassWallsHit = new Set();
        this.poweredDoors = new Set();
        this.singularitySwitchers = [];
        this.zoneTriggers = [];
        this.activeSequences = [];
        this.alarmTimer = 0;
        this.launchers = [];
        this.projectiles = [];

        this.scrapPositions.clear();
        this.triggeredDialogues.clear();
        this.worldLabels = levelData.worldLabels || [];
        this.scrapCollected = 0;
        this.totalScrap = 0;
        this.debris = []; // Initialize persistent debris
        this.chargingStations = []; 
        this.shopTerminals = [];
        this.isBlackoutActive = levelData.startWithBlackout || false;
        this.blackoutAlpha = this.isBlackoutActive ? 1 : 0;
        this.fogOfWar = levelData.fogOfWar || false;
        this.rooms = levelData.rooms || [];
        this.discovered.clear();
        if (this.fogOfWar) {
            this.discoveryRadius = levelData.discoveryRadius || 5;
            this.updateDiscovery();
        }
        this.remoteSignals.clear();
        this.remoteChannels = new Set();
        if (levelData.zoneTriggers) {
            this.zoneTriggers = JSON.parse(JSON.stringify(levelData.zoneTriggers));
            for (const trigger of this.zoneTriggers) {
                // Check new sequence-based triggers
                if (trigger.events) {
                    for (const event of trigger.events) {
                        if (event.type === 'remote_signal' && event.channel !== undefined) {
                            this.remoteChannels.add(Number(event.channel));
                        }
                    }
                } 
                // Check legacy single-event triggers
                else if (trigger.type === 'remote_signal' && trigger.channel !== undefined) {
                    this.remoteChannels.add(Number(trigger.channel));
                }
            }
        }
        this.isSecurityAlert = false;
        this.alertPulse = 0;

        const rawMap = levelData.map;
        const blocksMap = levelData.blocks; 

        const mapH = rawMap.length;
        const mapW = rawMap[0].length;

        this.worldLabels = [...(levelData.worldLabels || [])];
        const charMap = rawMap;

        for (let y = 0; y < mapH; y++) {
            let row = [];
            for (let x = 0; x < mapW; x++) {
                let c = charMap[y][x];
                let oc = (levelData.overlays && levelData.overlays[y]) ? levelData.overlays[y][x] : ' ';
                let wc = (levelData.wireMap && levelData.wireMap[y]) ? levelData.wireMap[y][x] : ' ';
                
                // Base static collision/rendering layer
                // We keep the structural layer (walls, floors, holes) in this.map
                // Interactive entities (B, X, T, @, etc.) will be stored in their own lists
                const isStructural = (c === '#' || c === 'W' || c === '*' || c === '.' || c === 'G' || c === 'A' || c === 'I' || c === 'Y' || c === 'x' || c === 'z' || c === 'q' || c === 'f' || c === 'i' || c === 'j' || c === 'k' || c === 'h' || c === 'm' || c === 'a' || c === 'b' || c === 'c' || c === 'g' || c === 't' || c === 'N' || c === 'o' || c === ',' || c === '{' || c === '~' || c === '}' || c === '&' || c === '=' || c === ':' || c === ';' || c === '"' || c === '|' || c === "'" || c === '\u03A3' || c === '\u03C3' || c === '\u03C1' || c === '\u03C0' || c === '\u03A9');
                const isOverlayStructural = (oc === '#' || oc === 'W' || oc === '*' || oc === '.' || oc === 'G' || oc === 'A' || oc === 'I' || oc === 'Y' || oc === 'x' || oc === 'z' || oc === 'q' || oc === 'f' || oc === 'i' || oc === 'j' || oc === 'k' || oc === 'h' || oc === 'm' || oc === 'g' || oc === 't' || oc === 'N' || oc === '&' || oc === '=' || oc === ':' || oc === ';' || oc === '"' || oc === '|' || oc === "'" || oc === '\u03A3' || oc === '\u03C3' || oc === '\u03C1' || oc === '\u03C0' || oc === '\u03A9');
                
                let finalChar = ' ';
                if (isOverlayStructural) finalChar = oc;
                else if (isStructural) finalChar = c;
                
                row.push(finalChar);

                if (c === '!' || oc === '!') {
                    const labelText = (levelData.links && levelData.links[`${x},${y}_label`]);
                    if (labelText) {
                        this.worldLabels.push({
                            x: x,
                            y: y,
                            text: labelText,
                            color: '#00f0ff'
                        });
                    }
                } else if (c === '@' || oc === '@') {
                    const startX = (customSpawn && customSpawn.x !== undefined) ? customSpawn.x : x;
                    const startY = (customSpawn && customSpawn.y !== undefined) ? customSpawn.y : y;
                    
                    this.player.x = startX;
                    this.player.y = startY;
                    this.player.prevX = startX;
                    this.player.prevY = startY;
                    this.player.visualX = startX;
                    this.player.visualY = startY;
                    this.player.lastTX = startX;
                    this.player.lastTY = startY;
                    this.player.visualAngle = undefined;
                    this.player.isDead = false;
                    this.player.deathType = null;
                    this.startPos = { x: startX, y: startY };
                    // Only add a charging station at spawn if explicitly set in level metadata
                    if (levelData.spawnIsStation) {
                        this.chargingStations.push({ x: startX, y: startY });
                    }
                } else if (c === 'B' || oc === 'B') {
                    this.sources.push({ x, y });
                } else if (c === 'X' || oc === 'X') { 
                    this.redSources.push({ x, y });
                } else if (c === 'K' || oc === 'K') {
                    this.chargingStations.push({ x, y });
                } else if (['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r'].includes(c) || ['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r'].includes(oc) || ['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r'].includes(wc)) {
                    const wireType = ['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r'].includes(wc) ? wc : (['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r'].includes(oc) ? oc : c);
                    this.wires.push({ x, y, type: wireType });
                } else if (c === 'R' || oc === 'R') {
                    const launcherConfig = (levelData.links && levelData.links[`${x},${y}_launcher`]) || {};
                    launcherConfig.channel = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                    launcherConfig.dir = (levelData.links && levelData.links[`${x},${y}_dir`]) || 0;
                    const launcher = LauncherFactory.create(x, y, launcherConfig);
                    this.launchers.push(launcher);
                } else if (c === 'T' || (c >= '1' && c <= '9') || oc === 'T' || (oc >= '1' && oc <= '9')) {
                    const targetChar = (oc === 'T' || (oc >= '1' && oc <= '9')) ? oc : c;
                    const req = targetChar === 'T' ? 1 : parseInt(targetChar);
                    this.targets.push({ x, y, required: req });
                } else if (c === 'Z' || oc === 'Z') {
                    this.brokenCores.push({ x, y });
                } else if (c === '0' || oc === '0') { 
                    this.forbiddens.push({ x, y });
                } else if (['>', '<', '^', 'v'].includes(c) || ['>', '<', '^', 'v'].includes(oc)) {
                    const blockChar = ['>', '<', '^', 'v'].includes(oc) ? oc : c;
                    let dir = DIRS.RIGHT;
                    if (blockChar === '<') dir = DIRS.LEFT;
                    if (blockChar === '^') dir = DIRS.UP;
                    if (blockChar === 'v') dir = DIRS.DOWN;
                    this.blocks.push({ x, y, dir, origX: x, origY: y });
                } else if (c === 'S' || oc === 'S') {
                    this.scrapPositions.add(`${x},${y}`);
                    this.totalScrap++;
                } else if (['(', ')', '[', ']'].includes(c) || ['(', ')', '[', ']'].includes(oc)) {
                    const convChar = ['(', ')', '[', ']'].includes(oc) ? oc : c;
                    let dir = DIRS.LEFT;
                    if (convChar === ')') dir = DIRS.RIGHT;
                    if (convChar === '[') dir = DIRS.UP;
                    if (convChar === ']') dir = DIRS.DOWN;
                    const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                    this.conveyors.push({ x, y, dir, channel: chan });
                } else if (c === 'D' || c === 'U' || oc === 'D' || oc === 'U') {
                    const doorChar = (oc === 'D' || oc === 'U') ? oc : c;
                    const isExit = (doorChar === 'U');
                    const chan = (levelData.links && levelData.links[`${x},${y}`]) || (isExit ? 99 : 0);
                    const exitTo = (levelData.links && levelData.links[`${x},${y}_exitTo`]);
                    const spawnX = (levelData.links && levelData.links[`${x},${y}_spawnX`]);
                    const spawnY = (levelData.links && levelData.links[`${x},${y}_spawnY`]);
                    const initOpen = (levelData.links && levelData.links[`${x},${y}_init`]) === true;
                    this.doors.push({ 
                        x, y, 
                        state: initOpen ? 'OPEN' : 'CLOSED', 
                        visualOpen: initOpen ? 1.0 : 0,
                        initOpen: initOpen,
                        error: false, 
                        closeTimer: 0, 
                        channel: chan,
                        exitTo: exitTo,
                        spawnX: spawnX,
                        spawnY: spawnY,
                        isExit: isExit
                    });
                } else if (c === '_' || c === 'P' || oc === '_' || oc === 'P') {
                    const buttonChar = (oc === '_' || oc === 'P') ? oc : c;
                    const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                    const behavior = (levelData.links && levelData.links[`${x},${y}_behavior`]) || (buttonChar === 'P' ? 'PRESSURE' : 'TIMER');
                    const initState = (levelData.links && levelData.links[`${x},${y}_init`]) === true;
                    const isGlobal = (levelData.links && levelData.links[`${x},${y}_isGlobal`]) === true;
                    
                    // If global, the source of truth is GameProgress.signals
                    let startingPressed = initState;
                    if (isGlobal && window.GameProgress && GameProgress.hasSignal(chan)) {
                        startingPressed = true;
                    }

                    this.buttons.push({ 
                        x, y, 
                        isPressed: startingPressed, 
                        channel: chan, 
                        behavior: behavior,
                        timer: 0,
                        wasSteppedOn: false,
                        energy: startingPressed ? 1.0 : 0,
                        charge: startingPressed ? 1.0 : 0,
                        isActive: startingPressed,
                        isGlobal: isGlobal
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
                    const inverted = (levelData.links && levelData.links[`${x},${y}_init`]) === false;
                    this.emitters.push({ x, y, dir, laserTarget: null, channel: chan, inverted });
                } else if (c === 'Q') {
                    this.catalysts.push({ x, y, active: false });
                } else if (c === 'O') {
                    const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                    const pCol = (levelData.links && levelData.links[`${x},${y}_color`]) || '#ffd700';
                    this.portals.push({ 
                        x, y, 
                        channel: chan,
                        color: pCol,
                        visualRotation: 0
                    });
                } else if (['n', 's', 'e', 'w'].includes(c)) {
                    let gDir = DIRS.UP;
                    if (c === 's') gDir = DIRS.DOWN;
                    if (c === 'e') gDir = DIRS.RIGHT;
                    if (c === 'w') gDir = DIRS.LEFT;
                    this.gravityButtons.push({ x, y, dir: gDir, flashTimer: 0 });
                } else if (c === '$') {
                    this.shopTerminals.push({ x, y });
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
                    } else if (bc === 'y') {
                        this.blocks.push({ x, y, dir: DIRS.RIGHT, origX: x, origY: y, phase: 'SOLAR' });
                    } else if (bc === 'p') {
                        this.blocks.push({ x, y, dir: DIRS.RIGHT, origX: x, origY: y, phase: 'LUNAR' });
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
                    } else if (oc === 'D' || oc === 'U') {
                        const isExit = (oc === 'U');
                        const chan = (levelData.links && levelData.links[`${x},${y}`]) || (isExit ? 99 : 0);
                        if (!this.doors.some(d => d.x === x && d.y === y)) {
                            const exitTo = (levelData.links && levelData.links[`${x},${y}_exitTo`]);
                            this.doors.push({ 
                                x, y, 
                                state: 'CLOSED', 
                                visualOpen: 0,
                                error: false, 
                                closeTimer: 0, 
                                channel: chan,
                                exitTo: exitTo,
                                isExit: isExit
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
                                energy: initState ? 1.0 : 0,
                                charge: initState ? 1.0 : 0,
                                isActive: initState
                            });
                        }
                    } else if (oc === 'E') {
                        const dir = (levelData.links && levelData.links[`${x},${y}_dir`]) || DIRS.RIGHT;
                        const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                        const inverted = (levelData.links && levelData.links[`${x},${y}_init`]) === false;
                        if (!this.emitters.some(e => e.x === x && e.y === y)) {
                            this.emitters.push({ x, y, dir, channel: chan, laserTarget: null, isActive: true, inverted });
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
                    } else if (oc === 'O') {
                        const chan = (levelData.links && levelData.links[`${x},${y}`]) || 0;
                        const pCol = (levelData.links && levelData.links[`${x},${y}_color`]) || '#ffd700';
                        if (!this.portals.some(p => p.x === x && p.y === y)) {
                            this.portals.push({ 
                                x, y, 
                                channel: chan,
                                color: pCol,
                                visualRotation: 0
                            });
                        }
                    } else if (['n', 's', 'e', 'w'].includes(oc)) {
                        let gDir = DIRS.UP;
                        if (oc === 's') gDir = DIRS.DOWN;
                        if (oc === 'e') gDir = DIRS.RIGHT;
                        if (oc === 'w') gDir = DIRS.LEFT;
                        if (!this.gravityButtons.some(g => g.x === x && g.y === y)) {
                            this.gravityButtons.push({ x, y, dir: gDir, flashTimer: 0 });
                        }
                    } else if (oc === 'G') {
                        row[x] = 'G';
                    } else if (oc === '%') {
                        if (!this.singularitySwitchers.some(s => s.x === x && s.y === y)) {
                            this.singularitySwitchers.push({ x, y, wasSteppedOn: false, lightningTimer: 0 });
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

        // Link portals and shared limboSlot
        const channelSlots = new Map(); // channel -> { limboSlot }
        for (let portal of this.portals) {
            const target = this.portals.find(p => p.channel === portal.channel && (p.x !== portal.x || p.y !== portal.y));
            if (target) {
                portal.targetX = target.x;
                portal.targetY = target.y;
                
                // Share a single limboSlot reference for the channel
                if (!channelSlots.has(portal.channel)) {
                    channelSlots.set(portal.channel, { content: null });
                }
                portal.slot = channelSlots.get(portal.channel);
            }
        }

        // Ensure spawn is a station ONLY if configured
        if (this.levelData.spawnIsStation) {
            if (!this.chargingStations.some(s => s.x === this.startPos.x && s.y === this.startPos.y)) {
                this.chargingStations.push({ ...this.startPos });
            }
        }

        this.updateEnergy();
        
        // Apply persistent state if it exists
        if (this.levelIndex !== -1 && window.GameProgress) {
            const savedState = GameProgress.getLevelState(this.levelIndex);
            if (savedState) this.applyLevelState(savedState);
        }

        this.saveUndo(); 

        if (window.Graphics) {
            Graphics.initLevelContext(this);
            Graphics.bakeBackground(this);
            Graphics.clearParticles();
            Graphics.clearTrails();
        }

        if (window.AudioSys && !this.isEditor) {
            AudioSys.setMusicIntensity(2); // Levels always play the full "Action" version
            AudioSys.playGameMusic(this.levelIndex);
        }


        // Trigger start dialogues (Handled in main.js when transition finishes)
        
        // Initialize Ambient Floor Particles (Dust/    { title: "Setor: Logística", tiles: [{c: 'o', n: 'Chão Placas Metal'}, {c: ',', n: 'Chão Tátil Amarelo'}, {c: '}', n: 'Teto Logístico (Proc)'}, {c: '{', n: 'Parede Estantes Caixas'}, {c: '~', n: 'Parede Estantes Sucata'}] }, bits)
        this.ambientParticles = [];
        for (let y = 0; y < this.map.length; y++) {
            for (let x = 0; x < this.map[0].length; x++) {
                // If it's a floor tile (empty space in map)
                if (this.map[y][x] === ' ') {
                    const count = 1 + Math.floor(Math.random() * 2);
                    for (let i = 0; i < count; i++) {
                        // Random size (20% larger than before)
                        const baseSize = 1.2 + Math.random() * 2.2;
                        
                        // More random colors (Industrial palette: Grays, dark blues, rust)
                        const colors = ['#555566', '#333344', '#222233', '#4a3d35', '#3c3c3c'];
                        const col = colors[Math.floor(Math.random() * colors.length)];
                        
                        // Random shapes: rect, circle, triangle, cross
                        const shapes = ['rect', 'circle', 'triangle', 'cross'];
                        const shape = shapes[Math.floor(Math.random() * shapes.length)];

                        this.ambientParticles.push({
                            x: x * 32 + Math.random() * 32,
                            y: y * 32 + Math.random() * 32,
                            vx: 0, vy: 0,
                            size: baseSize,
                            color: col,
                            shape: shape,
                            rot: Math.random() * Math.PI * 2
                        });
                    }
                }
            }
        }
    }

    isConveyorActive(c) {
        if (!c) return false;
        const chan = Number(c.channel || 0);
        const chanButtons = this.buttons.filter(b => Number(b.channel || 0) === chan);
        const isGlobalActive = window.GameProgress && GameProgress.hasSignal(chan);
        const isRemoteActive = this.remoteSignals.has(chan) || isGlobalActive;
        const hasRemoteTrigger = this.remoteChannels && this.remoteChannels.has(chan);

        // If there are NO physical buttons AND no possibility of remote control, it's ON by default.
        if (chanButtons.length === 0 && !hasRemoteTrigger) return true;
        
        // Otherwise, it is ON only if ANY of its triggers (physical or remote) are active.
        return (chanButtons.length > 0 && chanButtons.every(b => b.isPressed)) || isRemoteActive;
    }

    isEmitterActive(e) {
        if (!e) return false;
        const chan = Number(e.channel || 0);
        const chanButtons = this.buttons.filter(b => Number(b.channel || 0) === chan);
        const isGlobalActive = window.GameProgress && GameProgress.hasSignal(chan);
        const isRemoteActive = this.remoteSignals.has(chan) || isGlobalActive;
        const hasRemoteTrigger = this.remoteChannels && this.remoteChannels.has(chan);
        
        // Logic for Hazards (Normally ON):
        // If NO buttons AND no remote trigger, it is ON by default.
        // If it HAS buttons OR a remote trigger, it is OFF unless ANY of them are active.
        let active;
        if (chanButtons.length === 0 && !hasRemoteTrigger) {
            active = true;
        } else {
            active = (chanButtons.length > 0 && chanButtons.every(b => b.isPressed)) || isRemoteActive;
        }
        
        // If inverted, flip the final logic.
        if (e.inverted) active = !active;
        
        return active;
    }

    update() {
        this.frame++;
        this.updateSequences();
        if (window.Dialogue) Dialogue.update();
        if (this.player.isDead) this.player.deathTimer++;
        
        // --- RANDOM ROBOT SPEECH ---
        if (this.state === 'PLAYING' && !this.player.isDead && Math.random() < 0.0005) {
            if (window.AudioSys) AudioSys.speak('neutral');
        }
        
        // --- KNOCKBACK DELAY LOGIC ---
        if (this.player.knockbackDelay > 0) {
            this.player.knockbackDelay--;
            if (this.player.knockbackDelay === 0 && this.player.knockbackTarget) {
                this.player.x = this.player.knockbackTarget.x;
                this.player.y = this.player.knockbackTarget.y;
                this.player.knockbackTarget = null;
            }
        }

        // Update Gravity Overlay Alpha
        if (this.gravitySlidingDir !== null) {
            this.gravityOverlayAlpha = Math.min(1, this.gravityOverlayAlpha + 0.1);
        } else {
            this.gravityOverlayAlpha = Math.max(0, this.gravityOverlayAlpha - 0.05);
        }

        // Blackout Alpha Interpolation (1.5 - 2s fade in)
        if (this.isBlackoutActive) {
            this.blackoutAlpha = Math.min(1, this.blackoutAlpha + 0.015);
        } else {
            this.blackoutAlpha = Math.max(0, this.blackoutAlpha - 0.02);
        }

        // Security Alert Pulse (Rhythmic sine)
        if (this.isSecurityAlert) {
            this.alertPulse += 0.05;
        } else {
            this.alertPulse = 0;
        }

        // Smooth player interpolation (Juicy movement)
        if (this.player.visualX === undefined) { 
            this.player.visualX = this.player.x; 
            this.player.visualY = this.player.y; 
        }
        let moveLerp = 0.4;
        if (this.isShiftHeld && window.GameProgress && GameProgress.hasAbility('run')) {
            moveLerp = 0.6; // Faster catchup for sprint
        }
        this.player.visualX += (this.player.x - this.player.visualX) * moveLerp; 
        this.player.visualY += (this.player.y - this.player.visualY) * moveLerp;

        // --- PORTAL TELEPORTATION (Visual Continuity Logic) ---
        const pPortal = this.portals.find(p => p.x === this.player.x && p.y === this.player.y);
        if (pPortal && this.player.isTeleporting) {
            const distToCenter = Math.abs(this.player.x - this.player.visualX) + Math.abs(this.player.y - this.player.visualY);
            if (distToCenter < 0.15) {
                const dx = this.player.teleportDir?.dx || 0;
                const dy = this.player.teleportDir?.dy || 0;
                const oldX = this.player.x;
                const oldY = this.player.y;
                
                this.player.x = pPortal.targetX + dx;
                this.player.y = pPortal.targetY + dy;
                this.player.visualX = pPortal.targetX;
                this.player.visualY = pPortal.targetY;
                this.player.lastTX = this.player.x;
                this.player.lastTY = this.player.y;
                this.player.isTeleporting = false;

                if (window.AudioSys) AudioSys.playPortalWarp();
                // MASSIVE DYNAMIC BURST (120 particles)
                const entryColor = pPortal.color || '#ffd700';
                const targetPortal = this.portals.find(p => p.x === this.player.x && p.y === this.player.y);
                const exitColor = (targetPortal ? targetPortal.color : entryColor);
                
                for (let i = 0; i < 120; i++) {
                    const pColEntry = Math.random() > 0.4 ? entryColor : '#ffffff';
                    const pColExit = Math.random() > 0.4 ? exitColor : '#ffffff';
                    Graphics.spawnParticle(oldX * 32 + 16, oldY * 32 + 16, pColEntry, 'spark');
                    Graphics.spawnParticle(this.player.x * 32 + 16, this.player.y * 32 + 16, pColExit, 'spark');
                }
                this.updateEnergy();
            }
        }

        // --- LAUNCHERS & PROJECTILES ---
        this.updateLaunchers();
        this.updateProjectiles();

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
                if (!onConveyor && !this.player.isTeleporting) {
                    Graphics.spawnTrailSegment(this.player.lastTX, this.player.lastTY, this.player.visualAngle);
                }
            }
        }
        
        if (this.warmupFrames > 0) this.warmupFrames--;
        
        // Ambient Portal Particles (High Intensity)
        if (this.transitionState === 'NONE' && this.warmupFrames === 0) {
            for (const p of this.portals) {
                if (Math.random() < 0.15) {
                    const pColor = p.color || '#ffd700';
                    Graphics.spawnParticle(p.x * 32 + 16 + (Math.random()-0.5)*20, p.y * 32 + 16 + (Math.random()-0.5)*20, pColor, 'spark');
                }
            }
        }

        // --- HOLE COLLISION (DEATH) ---
        if (!this.player.isDead) {
            const px = Math.round(this.player.visualX);
            const py = Math.round(this.player.visualY);
            if (this.map[py] && (this.map[py][px] === '*' || this.map[py][px] === '.')) {
                const qf = this.quantumFloors.find(q => q.x === px && q.y === py);
                const bridged = (qf && qf.active) || this.conveyors.some(cv => cv.x === px && cv.y === py && !cv.disabled);
                if (!bridged) {
                    // Only trigger death when sufficiently centered in the hole
                    const distToCenter = Math.abs(this.player.visualX - px) + Math.abs(this.player.visualY - py);
                    if (distToCenter < 0.1) {
                        this.handleDeath(true, 'HOLE');
                    }
                }
            }
        }

        // Smooth block interpolation
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            let b = this.blocks[i];
            
            if (this.gravitySlidingDir) {
                // LINEAR SLIDE for gravity (Perfectly smooth, no jitter)
                const baseSpeed = 0.2;
                const accelSpeed = this.gravityAcceleration * 0.08;
                const totalSpeed = baseSpeed + accelSpeed;
                
                const dx = b.x - b.visualX;
                const dy = b.y - b.visualY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > 0.01) {
                    b.visualX += (dx/dist) * Math.min(totalSpeed, dist);
                    b.visualY += (dy/dist) * Math.min(totalSpeed, dist);
                    b.vx = 0; b.vy = 0; // Clear velocity for when gravity ends
                } else {
                    b.visualX = b.x;
                    b.visualY = b.y;
                }
            } else {
                // SPRING PHYSICS for normal pushes
                const springForce = 0.4; 
                const damping = 0.5; 
                
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
            }

            if (b.isFalling) {
                b.fallTimer = (b.fallTimer || 0) + 0.05;
                if (b.fallTimer >= 1.0) {
                    this.blocks.splice(i, 1);
                    continue;
                }
            } else {
                // Check for hole
                const bx = Math.round(b.visualX);
                const by = Math.round(b.visualY);
                if (this.map[by] && (this.map[by][bx] === '*' || this.map[by][bx] === '.')) {
                    const qf = this.quantumFloors.find(q => q.x === bx && q.y === by);
                    const bridged = (qf && qf.active) || this.conveyors.some(cv => cv.x === bx && cv.y === by && !cv.disabled);
                    if (!bridged) {
                        const distToCenter = Math.abs(b.visualX - bx) + Math.abs(b.visualY - by);
                        const distToTarget = Math.abs(b.visualX - b.x) + Math.abs(b.visualY - b.y);
                        // INVINCIBILITY: Only fall if we have reached our logical target tile
                        if (distToCenter < 0.1 && distToTarget < 0.2) {
                            b.isFalling = true;
                            b.fallTimer = 0;
                            if (window.AudioSys) AudioSys.playFall();
                        }
                    }
                }

                // --- BLOCK PORTAL TELEPORTATION ---
                if (b.isTeleporting) {
                    const bPortal = this.portals.find(p => p.x === b.x && p.y === b.y);
                    const distToCenter = Math.abs(b.x - b.visualX) + Math.abs(b.y - b.visualY);
                    if (bPortal && distToCenter < 0.15) {
                        const tdx = b.teleportDir?.dx || 0;
                        const tdy = b.teleportDir?.dy || 0;
                        const oldX = b.x;
                        const oldY = b.y;

                        b.x = bPortal.targetX + tdx;
                        b.y = bPortal.targetY + tdy;
                        b.visualX = bPortal.targetX;
                        b.visualY = bPortal.targetY;
                        b.vx = 0; b.vy = 0; 
                        b.isTeleporting = false;

                        if (window.AudioSys) AudioSys.playPortalWarp();
                        // MASSIVE BLOCK BURST
                        for (let i = 0; i < 80; i++) {
                            const pCol = Math.random() > 0.5 ? '#ffd700' : '#ffaa00';
                            Graphics.spawnParticle(oldX * 32 + 16, oldY * 32 + 16, pCol, 'spark');
                            Graphics.spawnParticle(b.x * 32 + 16, b.y * 32 + 16, pCol, 'spark');
                        }
                        this.updateEnergy();
                    }
                }
            }

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
        
        // Update Ambient Particles (Dust)
        const prx = this.player.visualX * 32 + 16;
        const pry = this.player.visualY * 32 + 16;
        
        for (let i = this.ambientParticles.length - 1; i >= 0; i--) {
            const p = this.ambientParticles[i];
            // 1. Gravity influence
            if (this.gravitySlidingDir !== null) {
                const strength = 0.1;
                if (this.gravitySlidingDir === DIRS.UP) p.vy -= strength;
                if (this.gravitySlidingDir === DIRS.DOWN) p.vy += strength;
                if (this.gravitySlidingDir === DIRS.LEFT) p.vx -= strength;
                if (this.gravitySlidingDir === DIRS.RIGHT) p.vx += strength;
            }

            // 2. Player displacement (Robot kick)
            const dx = p.x - prx;
            const dy = p.y - pry;
            const distSq = dx*dx + dy*dy;
            if (distSq < 1600) { // 40px radius
                const dist = Math.sqrt(distSq);
                const force = (40 - dist) * 0.02;
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            }

            // 3. Movement and Friction
            p.vx *= 0.85;
            p.vy *= 0.85;
            
            const nx = p.x + p.vx;
            const ny = p.y + p.vy;
            const tx = Math.floor(nx / 32);
            const ty = Math.floor(ny / 32);
            
            // Wall/Hole Collision
            if (this.map[ty] && (this.map[ty][tx] === '*' || this.map[ty][tx] === '.')) {
                // Fall into hole (Delete)
                this.ambientParticles.splice(i, 1);
                continue;
            } else if (this.map[ty] && ['#', 'W', 'A', 'I', 'Y', 'f', 'i', 'j', 'k', 'h', 'm', 'G'].includes(this.map[ty][tx])) {
                p.vx *= -0.5;
                p.vy *= -0.5;
            } else {
                p.x = nx;
                p.y = ny;
            }
        }

        for (let i = this.debris.length - 1; i >= 0; i--) {
            const p = this.debris[i];
            // Apply Gravity influence to debris
            if (this.gravitySlidingDir !== null) {
                const strength = 0.5;
                if (this.gravitySlidingDir === DIRS.UP) p.vy -= strength;
                if (this.gravitySlidingDir === DIRS.DOWN) p.vy += strength;
                if (this.gravitySlidingDir === DIRS.LEFT) p.vx -= strength;
                if (this.gravitySlidingDir === DIRS.RIGHT) p.vx += strength;
            }

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
                if (this.map[ty][tx] === '*' || this.map[ty][tx] === '.') {
                    // Fall into hole
                    this.debris.splice(i, 1);
                    continue;
                } else if (['#', 'W', 'A', 'I', 'Y', 'f', 'i', 'j', 'k', 'h', 'm', 'G'].includes(this.map[ty][tx])) {
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
            const dx = p.x - prx;
            const dy = p.y - pry;
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
        
        // Handle invulnerability flash timer
        if (this.player.flashTimer > 0) {
            this.player.flashTimer--;
            if (this.player.flashTimer === 0) this.player.invulnerable = false;
        }
        
        // Continuous audio update (for LFO and smooth transitions)
        if (window.AudioSys) {
            AudioSys.updateHum(this.audioState.anyActive, this.audioState.progress, this.audioState.contaminated);

            // --- Laser Audio moved after updateEmitters ---
            if (this.state !== 'PLAYING') {
                AudioSys.updateLaserAudio([]);
            }

            // --- Conveyor Audio Loop ---
            if (this.state === 'PLAYING') {
                const conveyorsWithButtons = this.conveyors.filter(c => this.isConveyorActive(c));
                
                const playerOnConveyor = conveyorsWithButtons.some(c => c.x === this.player.x && c.y === this.player.y);
                const blockOnConveyor = this.blocks.some(b => (!b.phase || (b.phase === 'SOLAR' && this.isSolarPhase) || (b.phase === 'LUNAR' && !this.isSolarPhase)) && conveyorsWithButtons.some(c => c.x === b.x && c.y === b.y));
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
        
        
        // --- Optimized Emitter Updates ---
        // Only update if requested by an event OR if something is currently moving/rotating
        const isMotion = (Math.abs(this.player.visualX - this.player.x) > 0.01 || Math.abs(this.player.visualY - this.player.y) > 0.01) || 
                         this.blocks.some(b => Math.abs(b.visualX - b.x) > 0.01 || Math.abs(b.visualY - b.y) > 0.01 || Math.abs((b.visualAngle || (b.dir * Math.PI / 2)) - (b.dir * Math.PI / 2)) > 0.01);

        if (this.lasersNeedUpdate || isMotion) {
            // Update energy flow during motion to keep wires (at least logically) in sync
            this.updateEnergy();
            this.updateEmitters();
            this.lasersNeedUpdate = false;
        } else if (this.wasMotion && !isMotion) {
            // Final update when everything settles for maximum precision
            this.updateEnergy();
            this.updateEmitters();
        }
        this.wasMotion = isMotion;
        
        // --- Laser Audio (After state update) ---
        if (window.AudioSys && this.state === 'PLAYING') {
            AudioSys.updateLaserAudio(this.emitters.filter(e => e.isActive));
        }
        
        this.updateSliding();
        if (this.fogOfWar) this.updateDiscovery();
        if (this.state === 'PLAYING') {
            this.checkDialogues('walk');
        }

        if (this.state === 'REVERSING') {
            // Process multiple states per frame for a fast "Rewind" look
            const stopAt = (this.lastCheckpointIndex || 0);
            for (let i = 0; i < 3; i++) {
                if (this.undoStack.length > stopAt + 1) {
                    const prevState = this.undoStack.pop();
                    this.applyState(prevState, true); // SNAP visuals
                } else {
                    // We've reached the checkpoint/start state
                    if (this.undoStack.length === stopAt + 1) {
                        this.applyState(this.undoStack[stopAt], true);
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

        // Force save if on a powered charging station to ensure checkpoint updates
        const onPoweredStation = this.chargingStations.some(s => s.x === this.player.x && s.y === this.player.y && this.poweredStations.has(`${s.x},${s.y}`));
        if (onPoweredStation) isSomethingAnimating = true;

        if (isSomethingAnimating && this.state === 'PLAYING' && !this.player.isDead) {
            this.saveUndo();
            // Cap stack to prevent memory issues with continuous recording
            if (this.undoStack.length > 2000) {
                this.undoStack.shift();
                if (this.lastCheckpointIndex > 0) this.lastCheckpointIndex--;
            }
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
                this.score += 1000 + (this.time > 0 ? Math.floor(this.time * 10) : 0);
                
                // Award stars based on percentage
                const lvl = LEVELS[this.levelIndex];
                const totalTime = (lvl && lvl.timer) ? lvl.timer : 0;
                const timePercent = totalTime > 0 ? (this.time / totalTime) * 100 : 100;
                const stars = timePercent > 50 ? 3 : (timePercent > 20 ? 2 : 1);
                
                this.economyBonus = 0;
                if (typeof LevelSelector !== 'undefined') {
                    this.economyBonus = LevelSelector.completeLevel(this.levelIndex, stars, this.moveCount);
                    
                    // Track global stats on completion
                    const timeSpent = (totalTime > 0) ? (totalTime - Math.floor(this.time)) : 0;
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
            }

            // --- HP RECHARGE ---
            if (HPSystem.currentQuarters < HPSystem.totalMaxQuarters) {
                this.hpRechargeTimer = (this.hpRechargeTimer || 0) + 1;
                // Recharge 1 quarter every 15 frames
                if (this.hpRechargeTimer >= 15) {
                    HPSystem.heal(1);
                    this.hpRechargeTimer = 0;
                    if (window.Graphics) {
                        for (let i = 0; i < 2; i++) {
                            Graphics.spawnParticle(this.player.x * 32 + 16, this.player.y * 32 + 16, '#ff003c', 'spark');
                        }
                    }
                }
            }

            // --- CHECKPOINT MARKING ---
            const sKey = `${currentStation.x},${currentStation.y}`;
            // Update checkpoint continuously while on a powered station
            this.lastCheckpointIndex = Math.max(0, this.undoStack.length - 1);
            
            // Trigger effects only on ENTRY
            if (this.lastStationKey !== sKey) {
                this.lastStationKey = sKey;
                if (window.AudioSys) AudioSys.playPortalClick();
                
                if (window.Graphics) {
                    for (let i = 0; i < 8; i++) {
                        Graphics.spawnParticle(this.player.x * 32 + 16, this.player.y * 32 + 16, '#00f0ff', 'circle');
                    }
                }
            }
        } else {
            this.rechargeTimer = 0;
            this.lastStationKey = null; // Reset when leaving station
        }

        // Update Button States
        for (let btn of this.buttons) {
            const isPlayerOn = this.player.x === btn.x && this.player.y === btn.y;
            const isBlockOn = this.blocks.some(b => b.x === btn.x && b.y === btn.y && (!b.phase || (b.phase === 'SOLAR' && this.isSolarPhase) || (b.phase === 'LUNAR' && !this.isSolarPhase)));
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

            if (btn.isPressed !== wasPressed) {
                // --- NEW: GLOBAL SIGNAL SYNC ---
                if (btn.isGlobal && window.GameProgress) {
                    if (btn.isPressed) GameProgress.addSignal(btn.channel);
                    else GameProgress.removeSignal(btn.channel);
                }

                this.updateEnergy();
                this.lasersNeedUpdate = true;
            }

            if (isSteppedOn && !btn.wasSteppedOn) {
                if (window.AudioSys && btn.behavior !== 'TOGGLE' && btn.behavior !== 'PRESSURE') AudioSys.buttonClick();
            }
            btn.wasSteppedOn = isSteppedOn;
        }

        // Update Quantum Floor States
        const toggledChannels = new Set();
        for (let qf of this.quantumFloors) {
            const qfChan = Number(qf.channel || 0);
            const chanButtons = this.buttons.filter(b => Number(b.channel || 0) === qfChan);
            const isGlobalActive = window.GameProgress && GameProgress.hasSignal(qfChan);
            const isRemoteActive = this.remoteSignals.has(qfChan) || isGlobalActive;
            const allPressed = (chanButtons.length > 0 && chanButtons.every(b => b.isPressed)) || isRemoteActive;
            
            // Signal is now handled by the button's internal timer
            if (allPressed) {
                qf.closeTimer = 5; // Minimal smoothing delay
            }
            
            const shouldBeOpen = allPressed || (qf.closeTimer > 0);
            const newState = !shouldBeOpen;

            // Countdown timer if button released
            if (qf.closeTimer > 0 && !allPressed) qf.closeTimer--;
            
            if (qf.active !== newState && !toggledChannels.has(qf.channel)) {
                if (window.AudioSys) AudioSys.playQuantumToggle(newState);
                toggledChannels.add(qf.channel);

                // CRUSH/RESPAWN LOGIC: If barrier ACTIVATES, any cube on it is shattered
                if (newState === true) {
                    const floorsOnChannel = this.quantumFloors.filter(f => f.channel === qf.channel);
                    for (let f of floorsOnChannel) {
                        const block = this.blocks.find(b => b.x === f.x && b.y === f.y && (!b.phase || (b.phase === 'SOLAR' && this.isSolarPhase) || (b.phase === 'LUNAR' && !this.isSolarPhase)));
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
            const dChan = Number(door.channel || 0);
            const isPowered = this.poweredDoors.has(`${door.x},${door.y}`);
            // Link door to button: ALL buttons on the same channel must be pressed
            const chanButtons = this.buttons.filter(b => Number(b.channel || 0) === dChan);
            const allPressed = chanButtons.length > 0 && chanButtons.every(b => b.isPressed);
            const isGlobalActive = window.GameProgress && GameProgress.hasSignal(dChan);
            const isRemoteActive = this.remoteSignals.has(dChan) || isGlobalActive;
            
            door.unlocked = (isPowered || allPressed || isRemoteActive || door.initOpen);
            
            // Exit doors don't open automatically, they just unlock (green light)
            const shouldBeOpen = door.isExit ? door.forceOpen : door.unlocked;
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
                        const blockIndex = this.blocks.findIndex(b => b.x === door.x && b.y === door.y && (!b.phase || (b.phase === 'SOLAR' && this.isSolarPhase) || (b.phase === 'LUNAR' && !this.isSolarPhase)));
                        
                        if (isPlayerIn) {
                            // If it's an exit sequence, don't kill the player
                            if (this.player.isEnteringExit) {
                                door.state = 'CLOSED';
                                return;
                            }
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

        // Update screen shake
        this.shakeOffset = { x: 0, y: 0 };
        if (this.screenShakeTimer > 0) {
            const intensity = this.screenShakeTimer * (this.screenShakeForce || 0.8); 
            this.shakeOffset.x = (Math.random() - 0.5) * intensity;
            this.shakeOffset.y = (Math.random() - 0.5) * intensity;
            this.screenShakeTimer--;
        }

        // Update blackout alpha
        if (this.isBlackoutActive) {
            if (this.blackoutAlpha < 1) this.blackoutAlpha = Math.min(1, this.blackoutAlpha + 0.05);
        } else {
            if (this.blackoutAlpha > 0) this.blackoutAlpha = Math.max(0, this.blackoutAlpha - 0.05);
        }

        // Update alert pulse
        if (this.isSecurityAlert) {
            this.alertPulse += 0.1;
            
            // Loop Alarm Audio
            if (!this.alarmTimer || this.alarmTimer <= 0) {
                if (window.AudioSys && AudioSys.playAlarm) AudioSys.playAlarm();
                this.alarmTimer = 48; // ~0.8 seconds at 60fps
            }
            this.alarmTimer--;
        } else {
            this.alarmTimer = 0;
            this.alertPulse = 0;
        }

        // Emitter states are now managed exclusively by updateEmitters()
        // which is called every frame to support inverted logic and path calculation.
        
        // Update Gravity Buttons
        for (let gb of this.gravityButtons) {
            if (gb.flashTimer > 0) gb.flashTimer--;
        }

        // Update Singularity Switchers
        for (let sw of this.singularitySwitchers) {
            if (sw.lightningTimer > 0) sw.lightningTimer--;
            const isPlayerOn = this.player.x === sw.x && this.player.y === sw.y;
            const isBlockOn = this.blocks.some(b => b.x === sw.x && b.y === sw.y && (!b.phase || (b.phase === 'SOLAR' && this.isSolarPhase) || (b.phase === 'LUNAR' && !this.isSolarPhase)));
            const isSteppedOn = isPlayerOn || isBlockOn;

            if (isSteppedOn && !sw.wasSteppedOn) {
                // Check for telefrag prevention
                const blocksThatWillMaterialize = this.blocks.filter(b => 
                    (this.isSolarPhase ? b.phase === 'LUNAR' : b.phase === 'SOLAR')
                );
                
                // If the player is on a tile that will materialize a block, try to push player or block away
                const telefragBlock = blocksThatWillMaterialize.find(b => b.x === this.player.x && b.y === this.player.y);
                
                if (telefragBlock) {
                    // Try to push player to nearest free tile
                    const dirs = [{x:1, y:0}, {x:-1, y:0}, {x:0, y:1}, {x:0, y:-1}];
                    let foundSafe = false;
                    for (const d of dirs) {
                        if (this.isTilePassable(this.player.x + d.x, this.player.y + d.y)) {
                            this.player.x += d.x;
                            this.player.y += d.y;
                            foundSafe = true;
                            break;
                        }
                    }
                    
                    if (!foundSafe) {
                        // Switcher is locked
                        if (window.AudioSys) AudioSys.buttonClick(); // Play a generic click for failure
                        sw.wasSteppedOn = isSteppedOn;
                        continue;
                    }
                }

                this.isSolarPhase = !this.isSolarPhase;
                
                // NEW: Force release grabbed block if it becomes intangible
                if (this.player.grabbedBlock) {
                    const b = this.player.grabbedBlock;
                    const isOutOfPhase = b.phase && ((b.phase === 'SOLAR' && !this.isSolarPhase) || (b.phase === 'LUNAR' && this.isSolarPhase));
                    if (isOutOfPhase) {
                        this.player.grabbedBlock = null;
                        this.player.isGrabbing = false;
                        this.player.visorTimer = 15;
                        this.player.visorColor = '#ffcc00'; 
                        if (window.AudioSys) AudioSys.playPortalClick();
                        
                        // Particle feedback for the "pop" of losing the grip
                        for (let i = 0; i < 8; i++) {
                            Graphics.spawnParticle(this.player.visualX * 32 + 16, this.player.visualY * 32 + 16, '#bf00ff', 'spark');
                        }
                    }
                }

                sw.lightningTimer = 30;
                sw.lightningSeed = Math.random() * 1000;
                if (window.AudioSys) AudioSys.playDimensionInversion();
                this.screenShakeTimer = 20;
                this.updateEnergy();
            }
            sw.wasSteppedOn = isSteppedOn;
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
        if (this.state !== 'PLAYING' || this.transitionState !== 'NONE' || this.player.isDead || this.player.invulnerable || this.gravitySlidingDir !== null) return;

        const pDist = Math.abs(this.player.x - this.player.visualX) + Math.abs(this.player.y - this.player.visualY);
        let threshold = 0.6;
        if (this.isShiftHeld && window.GameProgress && GameProgress.hasAbility('run')) {
            threshold = 0.8; // Allow next move sooner if sprinting
        }
        if (pDist > threshold) return; 

        let targetDir = DIRS.DOWN;
        if (dx > 0) targetDir = DIRS.RIGHT;
        if (dx < 0) targetDir = DIRS.LEFT;
        if (dy < 0) targetDir = DIRS.UP;
        if (dy > 0) targetDir = DIRS.DOWN;

        // Update direction immediately (Visual feedback even if blocked)
        if (!this.player.grabbedBlock) {
            this.player.dir = targetDir;
        }

        const nx = this.player.x + dx;
        const ny = this.player.y + dy;

        const conveyor = this.conveyors.find(c => c.x === this.player.x && c.y === this.player.y);
        if (conveyor && this.isConveyorActive(conveyor)) return;

        const structuralChars = ['#', 'W', 'A', 'I', 'Y', 'f', 'i', 'j', 'k', 'h', 'm', 'G', 'g', 'x', 'q', 'N', '\"', '|', ':', ';', '{', '~', '}', '=', '\u03A3', '\u03C0', '\u03A9'];
        const isStructural = this.map[ny] === undefined || this.map[ny][nx] === undefined || structuralChars.includes(this.map[ny][nx]);
        const isLauncher = this.launchers.some(l => l.x === nx && l.y === ny);
        
        if (isStructural || isLauncher) return;

        const ox = this.player.x;
        const oy = this.player.y;
        this.player.prevX = ox;
        this.player.prevY = oy;

        // GRAB LOGIC: If grabbing, we move as a unit.
        if (this.player.grabbedBlock) {
            const b = this.player.grabbedBlock;
            const bnx = b.x + dx;
            const bny = b.y + dy;
            
            const playerCanMove = this.isTilePassable(nx, ny, [b], dx, dy, true);
            const blockCanMove = this.isTilePassable(bnx, bny, [this.player], dx, dy, false);

            if (playerCanMove && blockCanMove) {
                this.saveUndo();
                
                // Move block
                const bPortal = this.portals.find(p => p.x === bnx && p.y === bny);
                if (bPortal) {
                    b.x = bPortal.targetX + dx;
                    b.y = bPortal.targetY + dy;
                    b.visualX = b.x; b.visualY = b.y;
                } else {
                    b.x = bnx;
                    b.y = bny;
                }

                // Move player
                const pPortal = this.portals.find(p => p.x === nx && p.y === ny);
                if (pPortal) {
                    this.player.x = pPortal.targetX + dx;
                    this.player.y = pPortal.targetY + dy;
                    this.player.visualX = this.player.x;
                    this.player.visualY = this.player.y;
                } else {
                    this.player.x = nx;
                    this.player.y = ny;
                }

                // Update orientation ONLY if moving forward (don't flip while reversing/strafing)
                if (targetDir === this.player.dir) {
                    this.player.dir = targetDir;
                }

                AudioSys.push(); 
                this.updateEnergy();
                this.finishMove(ox, oy);
                return;
            } else {
                return; 
            }
        }

        let moveSuccessful = false;

        let blocksToPush = [];
        let scanX = nx, scanY = ny;
        while (true) {
            const portal = this.portals.find(p => p.x === scanX && p.y === scanY);
            if (portal) {
                scanX = portal.targetX + dx;
                scanY = portal.targetY + dy;
            }

            const b = this.blocks.find(block => block.x === scanX && block.y === scanY && (!block.phase || (block.phase === 'SOLAR' && this.isSolarPhase) || (block.phase === 'LUNAR' && !this.isSolarPhase)));
            if (b) {
                if (blocksToPush.includes(b)) break; 
                blocksToPush.push(b);
                scanX += dx; scanY += dy;
            } else { break; }
        }

        if (blocksToPush.length > 0) {
            if (blocksToPush.length > 1 && window.GameProgress && !GameProgress.hasAbility('multi_push')) {
                this.player.visorTimer = 20;
                this.player.visorColor = '#ff0055';
                if (window.AudioSys && AudioSys.playDenied) AudioSys.playDenied();
                return;
            }
            // PRISM manipulation check (Módulo de Óptica)
            if (blocksToPush.some(b => b.type === 'PRISM') && window.GameProgress && !GameProgress.hasAbility('manipulate_prisms')) {
                this.player.visorTimer = 20;
                this.player.visorColor = '#ff0055';
                if (window.AudioSys && AudioSys.playDenied) AudioSys.playDenied();
                return;
            }
            const allBlocksCanMove = blocksToPush.every(b => this.isTilePassable(b.x + dx, b.y + dy, blocksToPush, dx, dy, false));
            
            if (allBlocksCanMove) {
                this.saveUndo();
                for (let i = blocksToPush.length - 1; i >= 0; i--) {
                    const b = blocksToPush[i];
                    let targetX = b.x + dx;
                    let targetY = b.y + dy;

                    const portal = this.portals.find(p => p.x === targetX && p.y === targetY);
                    if (portal) {
                        b.x = targetX;
                        b.y = targetY;
                        b.isTeleporting = true;
                        b.teleportDir = { dx, dy };
                    } else {
                        b.x = targetX;
                        b.y = targetY;
                    }
                }

                const pPortal = this.portals.find(p => p.x === nx && p.y === ny);
                if (pPortal) {
                    if (window.GameProgress && !GameProgress.hasAbility('portal_travel')) {
                        // Knockback away from portal
                        this.takeDamage('PORTAL_COLLAPSE', -dx, -dy);
                        if (window.AudioSys && AudioSys.playDenied) AudioSys.playDenied();
                        return;
                    }
                    this.player.x = pPortal.targetX + dx;
                    this.player.y = pPortal.targetY + dy;
                    this.player.visualX = this.player.x;
                    this.player.visualY = this.player.y;
                    if (window.AudioSys) AudioSys.playPortalWarp();
                } else {
                    this.player.x = nx;
                    this.player.y = ny;
                }
                AudioSys.push();
                this.updateEnergy();
                moveSuccessful = true;
            }
        } else if (this.isTilePassable(nx, ny, this.player, dx, dy, true)) {
            this.saveUndo();
            this.player.x = nx;
            this.player.y = ny;
            AudioSys.move();
            this.updateEnergy();
            moveSuccessful = true;
            
            const qf = this.quantumFloors.find(q => q.x === this.player.x && q.y === this.player.y);
            if (qf && window.AudioSys) {
                AudioSys.playQuantumHum(false, (this.player.x + this.player.y) % 4);
            }

            const portal = this.portals.find(p => p.x === this.player.x && p.y === this.player.y);
            if (portal) {
                if (window.GameProgress && !GameProgress.hasAbility('portal_travel')) {
                    this.handleDeath(true, 'PORTAL_COLLAPSE');
                    return;
                }
                this.player.isTeleporting = true;
                this.player.teleportDir = { dx, dy };
            }
        } else {
            const isHole = this.map[ny] && this.map[ny][nx] === '*';
            if (isHole) {
                const qf = this.quantumFloors.find(q => q.x === nx && q.y === ny);
                const isBridged = (qf && qf.active) || this.conveyors.some(cv => cv.x === nx && cv.y === ny && !cv.disabled);
                if (!isBridged) {
                    this.handleDeath(true, 'HOLE');
                    return;
                }
            }
        }

        if (moveSuccessful) {
            this.checkZoneTriggers();
            this.finishMove(ox, oy);
        }
    }

    checkZoneTriggers() {
        for (let i = this.zoneTriggers.length - 1; i >= 0; i--) {
            const trigger = this.zoneTriggers[i];
            let inside = false;
            const radius = trigger.radius || 0;
            const offX = trigger.offX || 0;
            const offY = trigger.offY || 0;
            
            if (trigger.w !== undefined && trigger.h !== undefined) {
                inside = (this.player.x >= trigger.x + offX && this.player.x < trigger.x + offX + trigger.w &&
                          this.player.y >= trigger.y + offY && this.player.y < trigger.y + offY + trigger.h);
            } else if (radius > 0) {
                const dist = Math.sqrt(Math.pow(this.player.x - trigger.x, 2) + Math.pow(this.player.y - trigger.y, 2));
                inside = (dist <= radius);
            } else {
                inside = (this.player.x === trigger.x && this.player.y === trigger.y);
            }

            if (inside) {
                let fired = false;
                
                // --- NEW: Sequence-based triggers ---
                if (trigger.events && trigger.events.length > 0) {
                    this.activeSequences.push({
                        events: JSON.parse(JSON.stringify(trigger.events)),
                        index: 0,
                        waitTimer: 0,
                        origin: { x: trigger.x, y: trigger.y }
                    });
                    fired = true;
                } else {
                    // Legacy single-event trigger (for backward compatibility)
                    this.executeEvent({
                        type: trigger.type,
                        action: trigger.action,
                        channel: trigger.channel,
                        x: trigger.x,
                        y: trigger.y
                    });
                    fired = true;
                }
                
                // If it fired and is one-shot, remove it so it doesn't fire again
                if (fired && trigger.oneShot !== false) {
                    this.zoneTriggers.splice(i, 1);
                }
            }
        }
    }

    executeEvent(event) {
        switch (event.type) {
            case 'blackout':
                if (event.action === 'activate') {
                    this.isBlackoutActive = true;
                    if (window.AudioSys) AudioSys.playBlackoutStart();
                } else if (event.action === 'deactivate') {
                    this.isBlackoutActive = false;
                    if (window.AudioSys) AudioSys.playBlackoutEnd();
                } else if (event.action === 'toggle') {
                    this.isBlackoutActive = !this.isBlackoutActive;
                    if (window.AudioSys) {
                        if (this.isBlackoutActive) AudioSys.playBlackoutStart();
                        else AudioSys.playBlackoutEnd();
                    }
                }
                break;
            
            case 'music_intensity':
                if (window.AudioSys && AudioSys.setIntensity) {
                    AudioSys.setIntensity(parseFloat(event.action) || 0);
                }
                break;
            
            case 'move_player_to_exit':
                this.saveUndo();
                this.player.x = event.x;
                this.player.y = event.y;
                // Don't update visualX/Y to allow smooth slide if we want, 
                // but here we just want the player "inside" the tile
                break;
            
            case 'close_exit_door':
                const exDoor = this.doors.find(d => d.x === this.player.x && d.y === this.player.y && d.isExit);
                if (exDoor) {
                    exDoor.forceOpen = false;
                    if (window.AudioSys) AudioSys.playDoorOpen(); // Door close sound is usually same or similar
                }
                break;
            
            case 'level_complete':
                const exitDoor = this.doors.find(d => d.x === this.player.x && d.y === this.player.y && d.isExit);
                const targetLvl = (exitDoor && exitDoor.exitTo !== undefined) ? exitDoor.exitTo : this.levelIndex + 1;
                
                // NEW: Get custom spawn if defined on the exit door
                let customSpawn = null;
                if (exitDoor && exitDoor.spawnX !== undefined && exitDoor.spawnY !== undefined) {
                    customSpawn = { x: Number(exitDoor.spawnX), y: Number(exitDoor.spawnY) };
                }

                this.startTransition(() => {
                    this.loadLevel(targetLvl, false, customSpawn);
                }, false, (exitDoor && exitDoor.exitTo !== undefined) ? null : "SETOR COMPLETO");
                break;
                const intensity = parseInt(event.action);
                if (!isNaN(intensity) && window.AudioSys) {
                    AudioSys.setMusicIntensity(intensity);
                }
                break;

            case 'remote_signal':
                const chan = parseInt(event.channel || 0);
                if (event.action === 'activate') this.remoteSignals.add(chan);
                else if (event.action === 'deactivate') this.remoteSignals.delete(chan);
                else if (event.action === 'toggle') {
                    if (this.remoteSignals.has(chan)) this.remoteSignals.delete(chan);
                    else this.remoteSignals.add(chan);
                }
                break;
            
            case 'global_signal':
                const gChan = parseInt(event.channel || 0);
                if (window.GameProgress) {
                    if (event.action === 'activate') GameProgress.addSignal(gChan);
                    else if (event.action === 'deactivate') GameProgress.removeSignal(gChan);
                    else if (event.action === 'toggle') {
                        if (GameProgress.hasSignal(gChan)) GameProgress.removeSignal(gChan);
                        else GameProgress.addSignal(gChan);
                    }
                }
                break;

            case 'grant_ability':
                if (window.GameProgress) {
                    GameProgress.grantAbility(event.action);
                    if (window.AudioSys) AudioSys.playChapterUnlock();
                }
                break;

            case 'increase_max_hp':
                if (window.HPSystem) {
                    HPSystem.addHeartContainer();
                    if (window.AudioSys) AudioSys.playChapterUnlock();
                    this.player.visorTimer = 40;
                    this.player.visorColor = '#00ffcc'; // Cyan for HP
                }
                break;

            case 'dimension_shift':
                if (event.action === 'toggle') this.isSolarPhase = !this.isSolarPhase;
                else if (event.action === 'solar') this.isSolarPhase = true;
                else if (event.action === 'lunar') this.isSolarPhase = false;
                if (window.AudioSys) AudioSys.playDimensionInversion();
                this.screenShakeTimer = 20;
                break;

            case 'earthquake':
                this.screenShakeTimer = parseInt(event.action || 30);
                this.screenShakeForce = parseFloat(event.force || 0.8);
                if (window.AudioSys && AudioSys.playEarthquake) AudioSys.playEarthquake();
                break;

            case 'gravity':
                const dirMap = { 'up': DIRS.UP, 'down': DIRS.DOWN, 'left': DIRS.LEFT, 'right': DIRS.RIGHT };
                const gDir = dirMap[event.action] || DIRS.DOWN;
                this.triggerGravity(gDir);
                break;

            case 'visual_sparks':
                const sx = event.x !== undefined ? event.x : this.player.x;
                const sy = event.y !== undefined ? event.y : this.player.y;
                for (let j = 0; j < 15; j++) {
                    if (window.Graphics) Graphics.spawnParticle(sx * 32 + 16, sy * 32 + 16, '#ffcc00', 'spark');
                }
                if (window.AudioSys && AudioSys.playSpark) AudioSys.playSpark();
                break;

            case 'security_alert':
                console.log("EVENT: security_alert", event.action);
                this.isSecurityAlert = (event.action === 'activate');
                if (this.isSecurityAlert && window.AudioSys && AudioSys.playAlarm) AudioSys.playAlarm();
                break;

            case 'dialogue':
                if (window.Dialogue && event.action) {
                    this.triggerDialogue(event.action); // event.action would be the key "x,y"
                }
                break;
        }
    }

    updateSequences() {
        for (let i = this.activeSequences.length - 1; i >= 0; i--) {
            const seq = this.activeSequences[i];
            
            if (seq.waitTimer > 0) {
                seq.waitTimer--;
                continue;
            }

            if (seq.index < seq.events.length) {
                const event = seq.events[seq.index];
                
                // Auto-fill x/y from sequence origin if missing
                if (event.x === undefined) event.x = seq.origin.x;
                if (event.y === undefined) event.y = seq.origin.y;

                if (event.type === 'wait') {
                    seq.waitTimer = parseInt(event.action || 30);
                    seq.index++; // Move past wait immediately
                } else {
                    this.executeEvent(event);
                    seq.index++;
                }
            } else {
                this.activeSequences.splice(i, 1);
            }
        }
    }

    finishMove(ox, oy) {
        for (let i = 0; i < 5; i++) {
            const offsetX = (Math.random() - 0.5) * 16;
            const offsetY = (Math.random() - 0.5) * 8;
            Graphics.spawnParticle(ox * 32 + 16 + offsetX, oy * 32 + 24 + offsetY, 'rgba(240, 240, 240, 0.6)', 'smoke');
        }
        
        // Force release block if on ACTIVE conveyor (Robot or Block)
        const robotConv = this.conveyors.find(c => c.x === this.player.x && c.y === this.player.y);
        const blockConv = this.player.grabbedBlock ? this.conveyors.find(c => c.x === this.player.grabbedBlock.x && c.y === this.player.grabbedBlock.y) : null;
        
        const robotOnActiveConv = robotConv && this.isConveyorActive(robotConv);
        const blockOnActiveConv = blockConv && this.isConveyorActive(blockConv);
        
        if ((robotOnActiveConv || blockOnActiveConv) && this.player.isGrabbing) {
            this.player.grabbedBlock = null;
            this.player.isGrabbing = false;
            this.player.visorTimer = 10;
            this.player.visorColor = '#ffcc00'; 
            if (window.AudioSys) AudioSys.playPortalClick();
        }

        // Check Gravity Buttons
        if (this.gravitySlidingDir === null) {
            const gb = this.gravityButtons.find(g => g.x === this.player.x && g.y === this.player.y);
            if (gb) {
                gb.flashTimer = 30; 
                this.triggerGravity(gb.dir);
                if (window.AudioSys) AudioSys.buttonClick();
            }
        }

        // Collect scrap
        const posKey = `${this.player.x},${this.player.y}`;
        if (this.scrapPositions.has(posKey)) {
            this.scrapPositions.delete(posKey);
            this.scrapCollected++;
            if (window.GameProgress) {
                GameProgress.scrapTotal++;
                this.scrapTotal = GameProgress.scrapTotal; // Keep local sync for systems that use it
            }
            if (typeof LevelSelector !== 'undefined') LevelSelector.trackStat('totalScrap', 1);
            if (window.AudioSys) AudioSys.playScrapCollect();
            for (let i = 0; i < 6; i++) {
                Graphics.spawnParticle(this.player.x * 32 + 16, this.player.y * 32 + 16, '#ffcc00', 'spark');
            }
        }

        // this.moves--; // REMOVED: No more energy consumption
        this.moveCount++;
        if (typeof LevelSelector !== 'undefined') LevelSelector.trackStat('robotMoves', 1);
        
        // if (this.moves <= 0) {
        //     this.handleDeath(false);
        // }

        // --- ROOM NAVIGATION ---
        const door = this.doors.find(d => d.x === this.player.x && d.y === this.player.y && (d.state === 'OPEN' || d.state === 'BROKEN_OPEN'));
        if (door) {
            const exitChan = this.levelData.exitChannel || 99;
            const isExitDoor = (door.channel == exitChan) || (door.exitTo !== undefined) || door.isExit || (this.map[door.y][door.x] === 'U') || (this.levelData.overlays && this.levelData.overlays[door.y] && this.levelData.overlays[door.y][door.x] === 'U');
            
            if (isExitDoor) {
                const targetLvl = door.exitTo !== undefined ? door.exitTo : this.levelIndex + 1;
                const spawnPos = (door.spawnX !== undefined && door.spawnY !== undefined) ? { x: door.spawnX, y: door.spawnY } : null;
                this.startTransition(() => {
                    this.loadLevel(targetLvl, false, spawnPos);
                }, false, door.exitTo ? null : "SETOR COMPLETO");
            } else if (door.exitTo !== undefined) {
                const targetLvl = door.exitTo;
                const spawnPos = (door.spawnX !== undefined && door.spawnY !== undefined) ? { x: door.spawnX, y: door.spawnY } : null;
                this.startTransition(() => {
                    this.loadLevel(targetLvl, false, spawnPos);
                });
            }
        }

        this.checkDialogues('walk');
    }

    toggleGrab() {
        if (this.state !== 'PLAYING' || this.transitionState !== 'NONE' || this.player.isDead) return;

        // Check for ability
        if (window.GameProgress && !GameProgress.hasAbility('grab')) {
            this.player.visorTimer = 20;
            this.player.visorColor = '#ff0055'; // Error Red
            return;
        }

        if (this.player.grabbedBlock) {
            this.player.grabbedBlock = null;
            this.player.isGrabbing = false;
            this.player.visorTimer = 10;
            this.player.visorColor = '#ffcc00'; 
            if (window.AudioSys) AudioSys.playPortalClick(); 
            return;
        }

        let tx = this.player.x, ty = this.player.y;
        if (this.player.dir === DIRS.UP) ty--;
        else if (this.player.dir === DIRS.DOWN) ty++;
        else if (this.player.dir === DIRS.LEFT) tx--;
        else if (this.player.dir === DIRS.RIGHT) tx++;

        const b = this.blocks.find(block => block.x === tx && block.y === ty && (!block.phase || (block.phase === 'SOLAR' && this.isSolarPhase) || (block.phase === 'LUNAR' && !this.isSolarPhase)));
        
        if (b) {
            this.player.grabbedBlock = b;
            this.player.isGrabbing = true;
            this.player.visorTimer = 15;
            this.player.visorColor = '#00f0ff'; 
            if (window.AudioSys) AudioSys.playPortalClick();
        } else {
            this.player.visorTimer = 10;
            this.player.visorColor = '#ff003c'; 
        }
    }

    interact() {
        if (this.state !== 'PLAYING' || this.transitionState !== 'NONE' || this.player.isDead) return;
        
        // Find adjacent tile in player direction
        let tx = this.player.x, ty = this.player.y;
        if (this.player.dir === DIRS.UP) ty--;
        else if (this.player.dir === DIRS.DOWN) ty++;
        else if (this.player.dir === DIRS.LEFT) tx--;
        else if (this.player.dir === DIRS.RIGHT) tx++;

        // Check for Charging Station (Terminal)
        const station = this.chargingStations.find(s => s.x === this.player.x && s.y === this.player.y);
        if (station) {
            if (window.StatsTerminal) {
                StatsTerminal.toggle(this);
                return;
            }
        }

        // Check Shop interaction (Adjacent)
        const shop = this.shopTerminals.find(s => s.x === tx && s.y === ty);
        if (shop) {
            if (window.ShopSystem) ShopSystem.toggle(this);
            return;
        }

        // Lock interaction if on conveyor
        const onConveyor = this.conveyors.some(c => c.x === this.player.x && c.y === this.player.y);
        if (onConveyor) return;

        let actionTaken = false;



        // 1. Check for Block or Portal to interact
        const portal = this.portals.find(p => p.x === tx && p.y === ty);
        if (portal && portal.slot) {
            if (portal.slot.content) {
                // Try to extract block behind the portal
                const outX = tx + (this.player.dir === DIRS.RIGHT ? 1 : (this.player.dir === DIRS.LEFT ? -1 : 0));
                const outY = ty + (this.player.dir === DIRS.DOWN ? 1 : (this.player.dir === DIRS.UP ? -1 : 0));
                
                if (this.isTilePassable(outX, outY, null, 0, 0, false)) {
                    this.saveUndo();
                    const b = portal.slot.content;
                    b.x = outX;
                    b.y = outY;
                    b.visualX = outX;
                    b.visualY = outY;
                    b.lastTX = outX; // Prevent trail lines
                    b.lastTY = outY;
                    this.blocks.push(b);
                    portal.slot.content = null;
                    if (window.AudioSys) AudioSys.playPortalWarp();
                    this.updateEnergy();
                    actionTaken = true;
                } else {
                    // Extraction blocked: Twist block in limbo instead
                    this.saveUndo();
                    portal.slot.content.dir = (portal.slot.content.dir + 1) % 4;
                    if (window.AudioSys) AudioSys.playPortalClick();
                    this.updateEnergy();
                    actionTaken = true;
                }
            }
        }

        const b = this.blocks.find(b => b.x === tx && b.y === ty && (!b.phase || (b.phase === 'SOLAR' && this.isSolarPhase) || (b.phase === 'LUNAR' && !this.isSolarPhase)));
        if (b && !actionTaken) {
            // Ability check for Prisms
            if (b.type === 'PRISM' && window.GameProgress && !GameProgress.hasAbility('manipulate_prisms')) {
                this.player.visorTimer = 20;
                this.player.visorColor = '#ff0055'; // Error Red
                return;
            }

            this.saveUndo();
            b.dir = (b.dir + 1) % 4;
            this.player.visorTimer = 15;
            this.player.visorColor = '#00ff41'; // Success Green
            if (b.type === 'PRISM') AudioSys.playPrismRotate();
            else AudioSys.rotate();
            this.updateEnergy();
            actionTaken = true;
        }

        // 1.5 Check for Exit Door interaction
        if (!actionTaken) {
            const door = this.doors.find(d => d.x === tx && d.y === ty && d.isExit);
            if (door && door.unlocked && door.state === 'CLOSED') {
                door.forceOpen = true; // Trigger opening
                this.player.isEnteringExit = true; // Block movement
                
                // Sequence: Open -> Wait -> Move Player -> Close -> Transition
                this.activeSequences.push({
                    origin: { x: door.x, y: door.y },
                    index: 0,
                    waitTimer: 0,
                    events: [
                        { type: 'wait', action: 25 }, // Wait for door to open visually
                        { type: 'move_player_to_exit', x: door.x, y: door.y },
                        { type: 'wait', action: 10 },
                        { type: 'close_exit_door' },
                        { type: 'wait', action: 20 },
                        { type: 'level_complete' }
                    ]
                });
                if (window.AudioSys) AudioSys.playDoorOpen();
                actionTaken = true;
            } else if (door && !door.unlocked) {
                // Denied feedback
                this.player.visorTimer = 20;
                this.player.visorColor = '#ff0055';
                if (window.AudioSys && AudioSys.playDenied) AudioSys.playDenied();
                actionTaken = true;
            }
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
                    // Win condition is now handled by checkWinCondition -> remoteSignals.add(exitChannel)
                    // We just give feedback here
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

        // 3. Check for Emitter to rotate
        if (!actionTaken) {
            const emitter = this.emitters.find(e => e.x === tx && e.y === ty);
            if (emitter) {
                if (window.GameProgress && !GameProgress.hasAbility('rotate_emitters')) {
                    this.player.visorTimer = 20;
                    this.player.visorColor = '#ff0055'; // Error Red
                    if (window.AudioSys && AudioSys.playDenied) AudioSys.playDenied();
                    return;
                }
                this.saveUndo();
                emitter.dir = (emitter.dir + 1) % 4;
                this.player.visorTimer = 15;
                this.player.visorColor = '#00ff41'; // Success Green
                if (window.AudioSys) AudioSys.rotate();
                this.lasersNeedUpdate = true;
                actionTaken = true;
            }
        }

        // 4. Check for Singularity Switcher to toggle
        if (!actionTaken) {
            const switcher = this.singularitySwitchers.find(s => s.x === tx && s.y === ty);
            if (switcher) {
                if (window.GameProgress && !GameProgress.hasAbility('singularity_interaction')) {
                    this.player.visorTimer = 20;
                    this.player.visorColor = '#ff0055'; // Error Red
                    if (window.AudioSys && AudioSys.playDenied) AudioSys.playDenied();
                    return;
                }
                this.saveUndo();
                this.isSolarPhase = !this.isSolarPhase;
                switcher.lightningTimer = 20;
                this.player.visorTimer = 20;
                this.player.visorColor = this.isSolarPhase ? '#ffd700' : '#bf00ff';
                if (window.AudioSys) AudioSys.playGravityShift(); // Reusing gravity sound for phase shift
                this.lasersNeedUpdate = true;
                actionTaken = true;
            }
        }

        if (actionTaken) {
            // Smoke puffs when rotating
            for (let i = 0; i < 4; i++) {
                const offsetX = (Math.random() - 0.5) * 16;
                const offsetY = (Math.random() - 0.5) * 8;
                Graphics.spawnParticle(this.player.x * 32 + 16 + offsetX, this.player.y * 32 + 24 + offsetY, 'rgba(240, 240, 240, 0.6)', 'smoke');
            }

            this.moveCount++;
            if (typeof LevelSelector !== 'undefined') LevelSelector.trackStat('rotations', 1);
            this.lasersNeedUpdate = true;
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

    updateLaunchers() {
        if (this.state !== 'PLAYING') return;
        this.launchers.forEach(l => l.update(this));
    }

    updateProjectiles() {
        if (this.state === 'REVERSING') return;
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(this);
            if (p.dead) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    isTileSolid(x, y) {
        if (y < 0 || y >= this.map.length || x < 0 || x >= this.map[0].length) return true;
        const c = this.map[y][x];
        const structuralChars = ['#', 'W', 'A', 'I', 'Y', 'f', 'i', 'j', 'k', 'h', 'm', 'G', 'g', 'x', 'q', 'N', '\"', '|', ':', ';', '{', '~', '}', '=', '\u03A3', '\u03C0', '\u03A9'];
        if (structuralChars.includes(c)) return true;
        
        if (this.launchers.some(l => l.x === x && l.y === y)) return true;
        
        if (this.doors.some(d => d.x === x && d.y === y && d.state === 'CLOSED')) return true;
        if (this.targets.some(t => t.x === x && t.y === y)) return true;
        if (this.sources.some(s => s.x === x && s.y === y)) return true;
        if (this.redSources.some(s => s.x === x && s.y === y)) return true;
        if (this.forbiddens.some(f => f.x === x && f.y === y)) return true;
        if (this.emitters.some(e => e.x === x && e.y === y)) return true;
        
        return false;
    }

    isTilePassable(x, y, ignoreObj = null, dx = 0, dy = 0, isRobot = false) {
        if (y < 0 || y >= this.map.length || x < 0 || x >= this.map[0].length) return false;
        
        // Portal Pass-through recursion
        if (dx !== 0 || dy !== 0) {
            const portal = this.portals.find(p => p.x === x && p.y === y);
            if (portal) {
                // If entering a portal, check the exit tile of its pair
                return this.isTilePassable(portal.targetX + dx, portal.targetY + dy, ignoreObj, dx, dy, isRobot);
            }
        }

        const structuralChars = ['#', 'W', 'A', 'I', 'Y', 'f', 'i', 'j', 'k', 'h', 'm', 'G', 'g', 'x', 'q', 'N', '\"', '|', ':', ';', '{', '~', '}', '=', '\u03A3', '\u03C0', '\u03A9'];
        if (structuralChars.includes(this.map[y][x]) && !this.portals.some(p => p.x === x && p.y === y)) return false;
        
        if (this.launchers.some(l => l.x === x && l.y === y)) return false;
        
        // Convert ignoreObj to array if it's not already
        const ignores = Array.isArray(ignoreObj) ? ignoreObj : (ignoreObj ? [ignoreObj] : []);

        // Check doors
        const door = this.doors.find(d => d.x === x && d.y === y);
        if (door && door.state === 'CLOSED') return false;
        
        // Check blocks (excluding the ones moving if applicable)
        if (this.blocks.some(b => b.x === x && b.y === y && !ignores.includes(b) && !b.isFalling && (!b.phase || (b.phase === 'SOLAR' && this.isSolarPhase) || (b.phase === 'LUNAR' && !this.isSolarPhase)))) return false;
        
        // Check entities
        if (this.sources.some(s => s.x === x && s.y === y)) return false;
        if (this.redSources.some(s => s.x === x && s.y === y)) return false;
        if (this.targets.some(t => t.x === x && t.y === y)) return false;
        if (this.forbiddens.some(f => f.x === x && f.y === y)) return false;
        if (this.brokenCores.some(b => b.x === x && b.y === y)) return false;
        if (this.emitters.some(e => e.x === x && e.y === y)) return false;
        if (this.shopTerminals.some(s => s.x === x && s.y === y)) return false;
        
        // Check Singularity Switchers (Blocks cannot enter)
        if (!isRobot && this.singularitySwitchers.some(s => s.x === x && s.y === y)) return false;
        
        // Check player (unless player is the one moving)
        if (this.player.x === x && this.player.y === y && !ignores.includes(this.player)) return false;
        
        // Check Hole (*) and Quantum Bridge interaction
        const isHole = this.map[y][x] === '*';
        const qf = this.quantumFloors.find(q => q.x === x && q.y === y);
        
        if (isHole) {
            // Holes are now physically passable so entities can move INTO them and fall
            return true;
        } else if (qf && qf.active) {
            // Quantum Barrier: Robot can pass, blocks are blocked
            if (isRobot) return true;
            
            if (window.AudioSys && !ignores.includes(this.player)) {
                AudioSys.playQuantumHum(true, (x + y) % 4); 
            }
            if (qf.flashTimer <= 0) {
                qf.entrySide = { dx: -dx, dy: -dy }; 
                this.triggerQuantumPulse(x, y, 1.0, 0, 0, new Set(), dx, dy);
            }
            return false;
        }
        
        // Check Portals
        const portal = this.portals.find(p => p.x === x && p.y === y);
        if (portal && portal.slot && portal.slot.content) return false;

        return true;
    }

    triggerGravity(direction) {
        if (this.state !== 'PLAYING') return;
        this.gravitySlidingDir = direction;
        this.lastGravityDir = direction;
        this.gravityAcceleration = 0;
        if (window.AudioSys) AudioSys.playGravityShift();
        this.screenShakeTimer = 15;
    }

    updateGravitySliding() {
        if (this.gravitySlidingDir === null) return;

        // Ensure blocks are mostly settled before next logical step
        const anyMoving = this.blocks.some(b => {
            const dist = Math.abs(b.x - b.visualX) + Math.abs(b.y - b.visualY);
            return dist > 0.05; // Tight threshold for linear move
        });
        if (anyMoving) return;

        // Accelerate: decrease delay between steps
        this.gravityAcceleration += 0.3;

        // 1. ORDER BLOCKS
        let sortedBlocks = [...this.blocks];
        const dir = this.gravitySlidingDir;
        if (dir === DIRS.RIGHT) sortedBlocks.sort((a, b) => b.x - a.x);
        else if (dir === DIRS.LEFT) sortedBlocks.sort((a, b) => a.x - b.x);
        else if (dir === DIRS.DOWN) sortedBlocks.sort((a, b) => b.y - a.y);
        else if (dir === DIRS.UP) sortedBlocks.sort((a, b) => a.y - b.y);

        let dx = 0, dy = 0;
        if (dir === DIRS.RIGHT) dx = 1;
        if (dir === DIRS.LEFT) dx = -1;
        if (dir === DIRS.DOWN) dy = 1;
        if (dir === DIRS.UP) dy = -1;

        let anyMovedThisStep = false;

        // 2. MOVE EACH BLOCK BY ONE TILE
        for (let b of sortedBlocks) {
            // Ignore blocks on ACTIVE conveyors (Active conveyors override gravity)
            const conv = this.conveyors.find(c => c.x === b.x && c.y === b.y);
            if (conv && this.isConveyorActive(conv)) continue;

            let nx = b.x + dx;
            let ny = b.y + dy;

            if (this.isTilePassable(nx, ny, b, dx, dy, false)) {
                const portal = this.portals.find(p => p.x === nx && p.y === ny);
                if (portal) {
                    const oldX = b.x;
                    const oldY = b.y;
                    
                    // Instant snap logical and visual positions
                    b.x = portal.targetX + dx;
                    b.y = portal.targetY + dy;
                    b.visualX = b.x;
                    b.visualY = b.y;
                    
                    if (window.AudioSys) AudioSys.playPortalWarp();
                    
                    // Immediate teleport particles at both ends
                    for (let i = 0; i < 20; i++) {
                        const pCol = Math.random() > 0.5 ? '#ffd700' : '#ffaa00';
                        Graphics.spawnParticle(oldX * 32 + 16, oldY * 32 + 16, pCol, 'spark');
                        Graphics.spawnParticle(b.x * 32 + 16, b.y * 32 + 16, pCol, 'spark');
                    }
                    
                    anyMovedThisStep = true;
                } else {
                    b.x = nx;
                    b.y = ny;
                    anyMovedThisStep = true;
                }
            }
        }

        if (!anyMovedThisStep) {
            this.gravitySlidingDir = null;
            this.gravityAcceleration = 0;
            this.gravityStepTimer = 0;
            this.updateEnergy();
        } else {
            // Keep the triggering button active while sliding
            const activeGB = this.gravityButtons.find(g => g.x === this.player.x && g.y === this.player.y);
            if (activeGB) activeGB.flashTimer = 10;

            this.updateEnergy(); // Update energy during each step of gravity sliding
            
            if (this.screenShakeTimer < 3) this.screenShakeTimer = 3;
            if (window.AudioSys && AudioSys.doorGrind) {
                AudioSys.doorGrind();
            }
        }
    }


    updateSliding() {
        if (this.state !== 'PLAYING') return;
        
        // Handle Gravity Sliding
        this.updateGravitySliding();

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
            const b = this.blocks.find(block => block.x === scanX && block.y === scanY && (!block.phase || (block.phase === 'SOLAR' && this.isSolarPhase) || (block.phase === 'LUNAR' && !this.isSolarPhase)));
            if (b && b !== obj) {
                blocksToPush.push(b);
                scanX += dx; scanY += dy;
            } else { break; }
        }

        if (blocksToPush.length > 0) {
            if (blocksToPush.length > 1 && window.GameProgress && !GameProgress.hasAbility('multi_push')) {
                this.player.visorTimer = 20;
                this.player.visorColor = '#ff0055';
                return;
            }
            const allBlocksCanMove = blocksToPush.every(b => this.isTilePassable(b.x + dx, b.y + dy, blocksToPush, dx, dy, false));
            if (this.isTilePassable(scanX, scanY, [obj, ...blocksToPush], dx, dy, isPlayer) && allBlocksCanMove) {



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

        if (this.isTilePassable(nx, ny, obj, dx, dy, isPlayer)) {
            if (isPlayer) {
                this.player.prevX = obj.x;
                this.player.prevY = obj.y;
            }
            obj.x = nx;
            obj.y = ny;
            // PORTAL SWALLOW (Conveyor)
            const portal = this.portals.find(p => p.x === nx && p.y === ny);
            if (portal && portal.slot && !portal.slot.content && !isPlayer) {
                portal.slot.content = obj;
                this.blocks = this.blocks.filter(b => b !== obj);
                if (window.AudioSys) AudioSys.playPortalWarp();
                this.updateEnergy();
                return;
            }

            obj.x = nx;
            obj.y = ny;
            if (isPlayer && window.AudioSys) {
                AudioSys.conveyorSlide();
                // Force release block if being moved by conveyor
                if (obj.isGrabbing) {
                    obj.grabbedBlock = null;
                    obj.isGrabbing = false;
                    obj.visorTimer = 10;
                    obj.visorColor = '#ffcc00'; 
                    if (window.AudioSys) AudioSys.playPortalClick();
                }
            }
            
            const nextIsConveyor = this.conveyors.some(c => c.x === nx && c.y === ny);
            
            // LAUNCH MECHANIC: Blocks fly when exiting a belt and PUSH others in their way
            if (!isPlayer && !nextIsConveyor) {
                let launchDist = 3; 
                for (let i = 0; i < launchDist; i++) {
                    const lx = obj.x + dx;
                    const ly = obj.y + dy;
                    
                    // Check if player is in the way
                    if (this.player.x === lx && this.player.y === ly) {
                        if (this.isTilePassable(lx + dx, ly + dy, this.player, dx, dy, true)) {
                            this.player.x += dx;
                            this.player.y += dy;
                            obj.x = lx;
                            obj.y = ly;
                            if (window.AudioSys) AudioSys.push();
                            // for(let s=0; s<5; s++) Graphics.spawnParticle(lx * 32 + 16, ly * 32 + 16, '#fff', 'spark'); // REMOVED as per user request
                        } else {
                            break; // Player blocked
                        }
                        continue;
                    }

                    // Check if we hit a chain of blocks during launch
                    let blocksToPushLaunch = [];
                    let sx = lx, sy = ly;
                    while (true) {
                        const b = this.blocks.find(block => block.x === sx && block.y === sy && (!block.phase || (block.phase === 'SOLAR' && this.isSolarPhase) || (block.phase === 'LUNAR' && !this.isSolarPhase)));
                        if (b && b !== obj) {
                            blocksToPushLaunch.push(b);
                            sx += dx; sy += dy;
                        } else { break; }
                    }

                    const allBlocksCanMoveLaunch = blocksToPushLaunch.every(b => this.isTilePassable(b.x + dx, b.y + dy, blocksToPushLaunch, dx, dy, false));
                    const selfCanMove = this.isTilePassable(obj.x + dx, obj.y + dy, obj, dx, dy, false);

                    if (this.isTilePassable(sx, sy, [obj, ...blocksToPushLaunch], dx, dy, false) && allBlocksCanMoveLaunch && selfCanMove) {
                        // Push the chain
                        for (let j = blocksToPushLaunch.length - 1; j >= 0; j--) {
                            const lb = blocksToPushLaunch[j];
                            const lnx = lb.x + dx;
                            const lny = lb.y + dy;
                            const lportal = this.portals.find(p => p.x === lnx && p.y === lny);
                            
                            if (lportal) {
                                lb.x = lnx; 
                                lb.y = lny;
                                lb.isTeleporting = true;
                                lb.teleportDir = { dx, dy };
                            } else {
                                lb.x += dx;
                                lb.y += dy;
                            }
                        }

                        // Pusher block movement
                        const selfPortal = this.portals.find(p => p.x === lx && p.y === ly);
                        if (selfPortal) {
                            obj.x = lx;
                            obj.y = ly;
                            obj.isTeleporting = true;
                            obj.teleportDir = { dx, dy };
                            this.updateEnergy();
                            return; 
                        } else {
                            obj.x = lx;
                            obj.y = ly;
                        }
                        // Spawn some sparks at each step of the launch (Golden) - Skip for Prisms
                        if (obj.type !== 'PRISM') {
                            for(let s=0; s<3; s++) Graphics.spawnParticle(obj.x * 32 + 16, obj.y * 32 + 16, '#ffcc00', 'spark');
                        }
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
        } else if (!isPlayer && this.player.x === nx && this.player.y === ny) {
            // PUSH PLAYER (on conveyor)
            if (this.isTilePassable(nx + dx, ny + dy, this.player, dx, dy, true)) {
                this.player.x += dx;
                this.player.y += dy;
                obj.x = nx;
                obj.y = ny;
                if (window.AudioSys) AudioSys.push();
                this.updateEnergy();
            }
        } else {
            obj.x = nx;
            obj.y = ny;
            this.lasersNeedUpdate = true;
        }
    }

    updateEmitters() {
        // Reset hit status for all prisms
        for (let b of this.blocks) if (b.type === 'PRISM') b.isHit = false;
        
        // Reset catalysts before tracing
        this.catalysts.forEach(c => c.active = false);
        this.glassWallsHit.clear();

        for (const e of this.emitters) {
            if (!this.isEmitterActive(e)) {
                e.isActive = false;
                e.laserPath = [];
                e.laserTarget = null;
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
                if (char === 'G') {
                    this.glassWallsHit.add(`${cx},${cy}`);
                    // Continue laser path through glass
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
                    this.handleDeath(true, 'LASER', dx, dy);
                    e.laserPath.push({ x: cx, y: cy, type: 'PLAYER' });
                    break;
                }

                // Block collision
                const blockIndex = this.blocks.findIndex(b => b.x === cx && b.y === cy && (!b.phase || (b.phase === 'SOLAR' && this.isSolarPhase) || (b.phase === 'LUNAR' && !this.isSolarPhase)));
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
                            e.laserPath.push({ x: cx, y: cy, type: 'PRISM_HIT' });
                            break;
                        }
                    } else {
                        // Standard block - destroyed
                        const b = this.blocks.splice(blockIndex, 1)[0];
                        if (window.AudioSys) AudioSys.playCubeCrush();
                        this.spawnDebris(b.x * 32 + 16, b.y * 32 + 16, 12, '#bf00ff', { x: dx, y: dy });
                        for (let i = 0; i < 15; i++) {
                            Graphics.spawnParticle(b.x * 32 + 16, b.y * 32 + 16, '#bf00ff', 'spark');
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
                this.blocks.some(b => b.x === nx && b.y === ny && (!b.phase || (b.phase === 'SOLAR' && this.isSolarPhase) || (b.phase === 'LUNAR' && !this.isSolarPhase))) ||
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
            if (this.map[y][x] === '#' || this.map[y][x] === 'W' || this.map[y][x] === 'G') return false; 

            // Prevent self-intersection
            if (path.some(p => p.x === x && p.y === y)) return false;

            const displayColor = forceOcean ? 'OCEAN' : color;
            const key = `${x},${y},${dir},${displayColor}`;
            const prevCharge = visited.get(key);
            if (prevCharge !== undefined && prevCharge >= charge) return false;
            visited.set(key, charge);

            let reachedValidTarget = false;

            // 1. Check block
            const block = this.blocks.find(b => b.x === x && b.y === y && (!b.phase || (b.phase === 'SOLAR' && this.isSolarPhase) || (b.phase === 'LUNAR' && !this.isSolarPhase)));
            let blockBlocking = false;
            let blockActive = false;

            if (block) {
                blockBlocking = true; // Block ALWAYS dominates this tile
                const entryDir = (dir + 2) % 4;
                const isInvalid = block.dir === entryDir; 
                const isCorrectEntry = !isInvalid; 

                const isParallel = entryDir === (block.dir + 2) % 4;
                const hasSideways = window.GameProgress && GameProgress.hasAbility('sideways_transmission') && block.type !== 'PRISM';

                let outputDirs = [];
                if (isParallel) {
                    outputDirs.push(block.dir);
                } else if (hasSideways) {
                    outputDirs.push(block.dir); // Allow L-shape
                }
                
                // Diffuse to sides if has ability
                if (hasSideways) {
                    const s1 = (block.dir + 1) % 4;
                    const s2 = (block.dir + 3) % 4;
                    if (s1 !== entryDir) outputDirs.push(s1);
                    if (s2 !== entryDir) outputDirs.push(s2);
                }

                for (const outDir of outputDirs) {
                    let nx = x, ny = y;
                    if (outDir === DIRS.UP) ny--;
                    else if (outDir === DIRS.DOWN) ny++;
                    else if (outDir === DIRS.LEFT) nx--;
                    else if (outDir === DIRS.RIGHT) nx++;

                    const hasOutput = checkValidOutput(nx, ny);
                    if (isCorrectEntry && hasOutput) {
                        blockActive = true;
                        if (trace(nx, ny, outDir, color, charge + 1, path.concat({ x, y }), forceOcean, true)) {
                            reachedValidTarget = true;
                        }
                    }
                }

                this.poweredBlocks.set(`${x},${y}`, { dir: block.dir, color: displayColor, invalid: isInvalid, active: blockActive, isOcean: forceOcean });

                if (isInvalid) {
                    for (const p of path.concat({ x, y })) {
                        const pEntry = this.poweredWires.get(`${p.x},${p.y}`);
                        if (pEntry && pEntry.color !== 'OCEAN') pEntry.color = 'YELLOW';
                    }
                }
            } 
            
            // 1.5 Check Portal
            const portal = this.portals.find(p => p.x === x && p.y === y);
            if (portal && !blockBlocking) {
                const limboBlock = portal.slot ? portal.slot.content : null;
                
                if (limboBlock) {
                    // REDIRECTION MODE: Act like a block at Portal B
                    const entryDir = (dir + 2) % 4;
                    const isInvalid = limboBlock.dir === entryDir;
                    const isCorrectEntry = !isInvalid;
                    
                    if (isCorrectEntry) {
                        let nx = portal.targetX, ny = portal.targetY;
                        if (limboBlock.dir === DIRS.UP) ny--;
                        else if (limboBlock.dir === DIRS.DOWN) ny++;
                        else if (limboBlock.dir === DIRS.LEFT) nx--;
                        else if (limboBlock.dir === DIRS.RIGHT) nx++;
                        
                        if (trace(nx, ny, limboBlock.dir, color, charge + 1, path.concat({ x, y }), forceOcean, true)) {
                            reachedValidTarget = true;
                        }
                    } else if (isInvalid) {
                        for (const p of path.concat({ x, y })) {
                            const pEntry = this.poweredWires.get(`${p.x},${p.y}`);
                            if (pEntry && pEntry.color !== 'OCEAN') pEntry.color = 'YELLOW';
                        }
                    }
                } else {
                    // TUNNEL MODE: Teleport to Portal B and continue in SAME direction
                    let nx = portal.targetX, ny = portal.targetY;
                    if (dir === DIRS.UP) ny--;
                    else if (dir === DIRS.DOWN) ny++;
                    else if (dir === DIRS.LEFT) nx--;
                    else if (dir === DIRS.RIGHT) nx++;
                    
                    if (trace(nx, ny, dir, color, charge, path.concat({ x, y }), forceOcean, true)) {
                        reachedValidTarget = true;
                    }
                }
                // Portals block normal propagation on their tile (they are nodes)
                blockBlocking = true;
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
        this.lasersNeedUpdate = true;
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
        
        const allMet = this.targets.length > 0 && this.targets.every(t => {
            const data = this.poweredTargets.get(`${t.x},${t.y}`) || { charge: 0, contaminated: false };
            return data.charge >= t.required && !data.contaminated;
        });

        if (allMet) {
            const exitChan = this.levelData.exitChannel || 99;
            const isGlobalActive = window.GameProgress && GameProgress.hasSignal(exitChan);
            if (!this.remoteSignals.has(exitChan) && !isGlobalActive) {
                this.remoteSignals.add(exitChan);
                // Trigger visual feedback once
                this.hitStopTimer = 6;
                if (window.AudioSys) AudioSys.corePowered();
            }
        } else {
            const exitChan = this.levelData.exitChannel || 99;
            const isGlobalActive = window.GameProgress && GameProgress.hasSignal(exitChan);
            if (this.remoteSignals.has(exitChan) || isGlobalActive) {
                this.remoteSignals.delete(exitChan);
            }
        }
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

    takeDamage(type, kdx = 0, kdy = 0) {
        if (this.player.invulnerable || this.state === 'REVERSING') return;
        
        const damageTable = { 
            LASER: 4, 
            CRUSHED: 8, 
            HOLE: 12, 
            SHUTDOWN: 12, 
            PORTAL_COLLAPSE: 6, 
            ENERGY_HIT: 4, 
            MECHANICAL_HIT: 2, 
            VOID_HIT: 12 
        };
        const dmg = damageTable[type] || 4;
        const died = HPSystem.takeDamage(dmg);
        
        // Audio + visual feedback
        if (window.AudioSys) AudioSys.lifeLost();
        this.player.flashTimer = 20;  // ~0.3s of invulnerability (Reduced to prevent laser skipping)
        this.player.invulnerable = true;
        this.resultTimer = 0; // Trigger vignette
        
        // Knockback Logic
        if (!died) {
            // "sempre seja para o lado contrário de onde o robô está olhando"
            let rdx = 0, rdy = 0;
            if (this.player.dir === DIRS.RIGHT) rdx = -1;
            else if (this.player.dir === DIRS.LEFT) rdx = 1;
            else if (this.player.dir === DIRS.UP) rdy = 1;
            else if (this.player.dir === DIRS.DOWN) rdy = -1;

            let tx = this.player.x + rdx;
            let ty = this.player.y + rdy;

            // Store target for delayed application (to show the "hit" impact visually)
            let finalTarget = null;

            // Try to move opposite to facing direction first
            if ((tx !== this.player.x || ty !== this.player.y) && this.isTilePassable(tx, ty, this.player, rdx, rdy, true)) {
                finalTarget = { x: tx, y: ty };
            } else {
                // Fallback: expulsion to previous position to ensure area isolation
                if (this.player.prevX !== undefined && (this.player.prevX !== this.player.x || this.player.prevY !== this.player.y)) {
                    if (this.isTilePassable(this.player.prevX, this.player.prevY, this.player, 0, 0, true)) {
                        finalTarget = { x: this.player.prevX, y: this.player.prevY };
                    }
                }
            }

            if (finalTarget) {
                this.player.knockbackTarget = finalTarget;
                this.player.knockbackDelay = 8; // Stay on the hazard tile for 8 frames to show the impact
            }
        }

        if (typeof LevelSelector !== 'undefined') LevelSelector.trackStat('totalDeaths', 1);
        
        if (died) {
            this.triggerDeath(type);
        } else {
            // Screen shake for hit
            this.screenShakeTimer = 15;
            this.screenShakeForce = 2.0;
            if (window.AudioSys) AudioSys.speak('damage');
        }
    }

    triggerDeath(type) {
        if (this.state === 'REVERSING') return;
        
        this.player.isDead = true;
        this.player.deathType = type;
        this.player.deathTimer = 0;
        
        if (window.AudioSys) AudioSys.speak('dead');

        // Find an open direction for pieces to fly into
        this.player.deathDir = { x: 0, y: 0 };
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

        // Visual Explosion / Particles
        if (type === 'LASER' || type === 'CRUSHED') {
            if (window.AudioSys) AudioSys.explosion();
            this.spawnDebris(this.player.x * 32 + 16, this.player.y * 32 + 16, 12, '#ed8936', this.player.deathDir);
            this.spawnDebris(this.player.x * 32 + 16, this.player.y * 32 + 16, 8, '#3182ce', this.player.deathDir);
        } else if (type === 'HOLE') {
            if (window.AudioSys) AudioSys.playFall();
        } else if (type === 'PORTAL_COLLAPSE') {
            if (window.AudioSys) AudioSys.explosion(); // High energy collapse
            this.spawnDebris(this.player.x * 32 + 16, this.player.y * 32 + 16, 20, '#bf00ff', {x:0, y:0});
        }

        setTimeout(() => {
            this.startReverse(() => {
                this.player.isDead = false;
                this.player.invulnerable = false;
                this.player.flashTimer = 0;
                
                // Final safety sync to ensure all visuals are snapped and velocities cleared
                const finalState = this.undoStack[this.lastCheckpointIndex || 0];
                if (finalState) {
                    this.applyState(finalState, true);
                }
                
                HPSystem.fullHeal();
                // showDeathComment(type) will be implemented in Fase 4
            });
        }, 800);
    }

    handleDeath(isHazard = false, type = null, kdx = 0, kdy = 0) {
        if (this.transitionState !== 'NONE' || this.state === 'REVERSING' || this.state === 'GAMEOVER' || this.state === 'RESULT' || this.player.isDead) return;
        
        const deathType = type || (isHazard ? 'CRUSHED' : 'SHUTDOWN');
        const isInstantDeath = (deathType === 'HOLE' || deathType === 'SHUTDOWN');
        
        if (isInstantDeath) {
            HPSystem.currentQuarters = 0;
            this.triggerDeath(deathType);
        } else {
            this.takeDamage(deathType, kdx, kdy);
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

                this.triggeredDialogues.add(dialogueId);
                this.triggerDialogue(coord);
                
                if (triggerType === 'walk' && radius === 0) break; 
            } else {
                // If player is OUTSIDE and it's NOT a oneShot, reset the trigger so it can fire again upon re-entry
                if (!isOneShot && this.triggeredDialogues.has(dialogueId)) {
                    this.triggeredDialogues.delete(dialogueId);
                }
            }
        }
    }

    triggerDialogue(key) {
        if (!this.levelData || !this.levelData.dialogues) return;
        const data = this.levelData.dialogues[key];
        if (!data) return;

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

        if (messages.length === 0) return;

        const target = this.getDialogueTarget();
        if (window.Dialogue) {
            messages.forEach(msg => {
                Dialogue.show(target, {
                    text: msg.text,
                    icon: msg.icon || 'central',
                    isAI: (msg.icon !== 'human' && msg.icon !== 'central_human'),
                    speed: msg.speed || config.speed || undefined,
                    position: msg.pos || msg.position || config.pos || config.position || 'center',
                    autoDismiss: msg.autoDismiss !== undefined ? msg.autoDismiss : (config.autoDismiss !== false),
                    lockPlayer: msg.lockPlayer !== undefined ? msg.lockPlayer : (config.lockPlayer !== false),
                    dismissDelay: msg.dismissDelay !== undefined ? msg.dismissDelay : (config.dismissDelay !== undefined ? config.dismissDelay : 1500)
                });
            });
        }
    }


    getDialogueTarget() {
        const self = this;
        const canvas = document.getElementById('gameCanvas') || 
                       document.getElementById('test-canvas') || 
                       document.getElementById('editor-canvas');
        
        return {
            getBoundingClientRect: () => {
                if (!canvas) return { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0 };
                
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
