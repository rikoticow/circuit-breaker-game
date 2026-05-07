// Circuit Breaker - Portal Spawn Position Selector
// Allows visual selection of spawn position in the destination level

class PortalSpawnSelector {
    constructor() {
        this.overlay = document.getElementById('spawn-select-overlay');
        this.canvas = document.getElementById('spawn-preview-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentCoordsDisplay = document.getElementById('spawn-current-coords');
        this.destNameDisplay = document.getElementById('spawn-dest-name');
        
        this.selectedX = null;
        this.selectedY = null;
        this.targetLevelData = null;
        this.targetLevelIdx = null;
        
        this.setupListeners();
    }
    
    setupListeners() {
        document.getElementById('spawn-close').onclick = () => this.hide();
        document.getElementById('btn-spawn-clear').onclick = () => this.clearSelection();
        document.getElementById('btn-spawn-confirm').onclick = () => this.confirm();
        
        this.canvas.onclick = (e) => this.handleCanvasClick(e);
        
        // Connect to the editor UI button
        const btn = document.getElementById('btn-select-spawn');
        if (btn) btn.onclick = () => this.show();
    }
    
    show() {
        const destInput = document.getElementById('prop-exit-lvl').value;
        if (!destInput) {
            if (typeof showModal === 'function') showModal("Selecione um nível de destino primeiro!", null, false);
            else alert("Selecione um nível de destino primeiro!");
            return;
        }
        
        // Find level index
        let idx = parseInt(destInput);
        if (isNaN(idx)) {
            idx = levelsData.findIndex(l => l.name === destInput);
        }
        
        if (idx < 0 || idx >= levelsData.length) {
            if (typeof showModal === 'function') showModal("Nível de destino inválido!", null, false);
            else alert("Nível de destino inválido!");
            return;
        }
        
        this.targetLevelIdx = idx;
        this.targetLevelData = levelsData[idx];
        this.destNameDisplay.innerText = `[${idx}] ${this.targetLevelData.name}`;
        
        // Load current selection from editor properties
        if (typeof editTargets === 'undefined' || editTargets.length === 0) return;
        const p = editTargets[0];
        const lvl = levelsData[currentLevelIdx];
        const key = `${p.x},${p.y}`;
        
        this.selectedX = lvl.links?.[`${key}_spawnX`] ?? null;
        this.selectedY = lvl.links?.[`${key}_spawnY`] ?? null;
        
        this.updateCoordsDisplay();
        this.renderPreview();
        
        this.overlay.style.display = 'flex';
    }
    
    hide() {
        this.overlay.style.display = 'none';
    }
    
    clearSelection() {
        this.selectedX = null;
        this.selectedY = null;
        this.updateCoordsDisplay();
        this.renderPreview();
    }
    
    confirm() {
        if (typeof editTargets === 'undefined' || editTargets.length === 0) return;
        const p = editTargets[0];
        const lvl = levelsData[currentLevelIdx];
        if (!lvl.links) lvl.links = {};
        const key = `${p.x},${p.y}`;
        
        if (this.selectedX !== null && this.selectedY !== null) {
            lvl.links[`${key}_spawnX`] = this.selectedX;
            lvl.links[`${key}_spawnY`] = this.selectedY;
            
            const infoEl = document.getElementById('prop-exit-spawn-info');
            const coordsEl = document.getElementById('prop-exit-spawn-coords');
            if (infoEl) infoEl.style.display = 'block';
            if (coordsEl) coordsEl.innerText = `${this.selectedX}, ${this.selectedY}`;
        } else {
            delete lvl.links[`${key}_spawnX`];
            delete lvl.links[`${key}_spawnY`];
            
            const infoEl = document.getElementById('prop-exit-spawn-info');
            if (infoEl) infoEl.style.display = 'none';
        }
        
        this.hide();
        if (typeof saveHistory === 'function') saveHistory();
    }
    
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / 32);
        const y = Math.floor((e.clientY - rect.top) / 32);
        
        if (x >= 0 && x < this.targetLevelData.map[0].length && y >= 0 && y < this.targetLevelData.map.length) {
            this.selectedX = x;
            this.selectedY = y;
            this.updateCoordsDisplay();
            this.renderPreview();
        }
    }
    
    updateCoordsDisplay() {
        if (this.selectedX !== null && this.selectedY !== null) {
            this.currentCoordsDisplay.innerText = `${this.selectedX}, ${this.selectedY}`;
            this.currentCoordsDisplay.style.color = "#00ff9f";
        } else {
            this.currentCoordsDisplay.innerText = "Auto (Padrão)";
            this.currentCoordsDisplay.style.color = "#fff";
        }
    }
    
    renderPreview() {
        const lvl = this.targetLevelData;
        const h = lvl.map.length;
        const w = lvl.map[0].length;
        
        this.canvas.width = w * 32;
        this.canvas.height = h * 32;
        
        const oldCtx = Graphics.ctx;
        Graphics.ctx = this.ctx;
        
        // 1. Prepare a Mini-Mock for the target level to handle complex rendering (doors, wires, etc)
        const targetMock = {
            player: { x: -1, y: -1, dir: 1 },
            map: [], doors: [], conveyors: [], wires: [], targets: [], 
            sources: [], redSources: [], poweredWires: new Map(), 
            poweredTargets: new Map(), poweredStations: new Set(),
            emitters: [], portals: [], blocks: [], quantumFloors: [],
            catalysts: [], worldLabels: [], chargingStations: [],
            shopTerminals: [], gravityButtons: [], isSolarPhase: true
        };

        const charMap = lvl.map.map(row => row.split(''));
        const blockMap = lvl.blocks ? lvl.blocks.map(row => row.split('')) : Array(h).fill(0).map(() => Array(w).fill(' '));
        const overlayMap = lvl.overlays ? lvl.overlays.map(row => row.split('')) : Array(h).fill(0).map(() => Array(w).fill(' '));

        // 2. Populate Mini-Mock
        for (let y = 0; y < h; y++) {
            let row = [];
            for (let x = 0; x < w; x++) {
                const c = charMap[y][x];
                const oc = overlayMap[y][x];
                const bc = blockMap[y][x];
                
                row.push((c === '#' || c === 'W' || c === 'G' || c === '*') ? c : ' ');
                
                const processChar = (char, isOverlay) => {
                    if (char === 'D' || char === 'U') {
                        const isExit = (char === 'U');
                        const chan = (lvl.links && lvl.links[`${x},${y}`]) || (isExit ? 99 : 0);
                        targetMock.doors.push({ x, y, state: 'CLOSED', channel: chan, isExit: isExit });
                    } else if (['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r'].includes(char)) {
                        targetMock.wires.push({ x, y, type: char });
                    } else if (['(', ')', '[', ']'].includes(char)) {
                        let dir = 2; if (char === ')') dir = 0; if (char === '[') dir = 3; if (char === ']') dir = 1;
                        targetMock.conveyors.push({ x, y, dir });
                    } else if (char === 'K') {
                        targetMock.chargingStations.push({ x, y });
                    } else if (char === '@') {
                        targetMock.player.x = x; targetMock.player.y = y;
                        targetMock.chargingStations.push({ x, y });
                    } else if (char === 'B') targetMock.sources.push({ x, y });
                    else if (char === 'X') targetMock.redSources.push({ x, y });
                    else if (char === 'T' || (char >= '1' && char <= '9')) {
                        targetMock.targets.push({ x, y, required: char === 'T' ? 1 : parseInt(char) });
                    } else if (char === 'E' || char === 'M') {
                        const dir = (lvl.links && lvl.links[`${x},${y}_dir`]) || 0;
                        if (char === 'E') targetMock.emitters.push({ x, y, dir });
                        else targetMock.blocks.push({ x, y, dir, type: 'PRISM' });
                    } else if (['>', '<', '^', 'v', 'y', 'p'].includes(char)) {
                        let dir = (lvl.links && lvl.links[`${x},${y}_dir`]);
                        if (dir === undefined) {
                            dir = 0; if(char==='v') dir=1; if(char==='<') dir=2; if(char==='^') dir=3;
                        }
                        let phase = char === 'y' ? 'SOLAR' : (char === 'p' ? 'LUNAR' : null);
                        targetMock.blocks.push({ x, y, dir, phase });
                    } else if (char === 'O') {
                        const chan = (lvl.links && lvl.links[`${x},${y}`]) || 0;
                        const pColor = (lvl.links && lvl.links[`${x},${y}_color`]) || '#ffd700';
                        targetMock.portals.push({ x, y, channel: chan, color: pColor });
                    } else if (char === 'Q') targetMock.catalysts.push({ x, y });
                    else if (char === '?') targetMock.quantumFloors.push({ x, y, active: true });
                    else if (char === '$') targetMock.shopTerminals.push({ x, y });
                    else if (['n', 's', 'e', 'w'].includes(char)) {
                        let gDir = 3; if (char === 's') gDir = 1; if (char === 'e') gDir = 0; if (char === 'w') gDir = 2;
                        targetMock.gravityButtons.push({ x, y, dir: gDir });
                    } else if (char === '!') {
                        const labelText = (lvl.links && lvl.links[`${x},${y}_label`]) || "!";
                        const labelColor = (lvl.links && lvl.links[`${x},${y}_labelColor`]) || "#00f0ff";
                        targetMock.worldLabels.push({ x, y, text: labelText, color: labelColor });
                    }
                };

                processChar(c, false);
                processChar(oc, true);
                processChar(bc, false);
            }
            targetMock.map.push(row);
        }

        // 3. Post-Process Mini-Mock (Doors & Conveyors)
        for (let door of targetMock.doors) {
            if (door.pair) continue;
            const right = targetMock.doors.find(d => d.x === door.x + 1 && d.y === door.y && !d.pair);
            if (right) {
                door.pair = { x: right.x, y: right.y, side: 'LEFT' };
                right.pair = { x: door.x, y: door.y, side: 'RIGHT' };
                door.orientation = 'HORIZONTAL'; right.orientation = 'HORIZONTAL';
            } else {
                const down = targetMock.doors.find(d => d.x === door.x && d.y === door.y + 1 && !d.pair);
                if (down) {
                    door.pair = { x: down.x, y: down.y, side: 'TOP' };
                    down.pair = { x: door.x, y: door.y, side: 'BOTTOM' };
                    door.orientation = 'VERTICAL'; down.orientation = 'VERTICAL';
                }
            }
        }
        for (let c of targetMock.conveyors) {
            c.inDir = null; c.beltDist = 0;
            for (let other of targetMock.conveyors) {
                if (other === c) continue;
                let ox = other.x, oy = other.y;
                if (other.dir === 0) ox++; else if (other.dir === 2) ox--;
                else if (other.dir === 1) oy++; else if (other.dir === 3) oy--;
                if (ox === c.x && oy === c.y) { c.inDir = other.dir; break; }
            }
        }

        // 4. Render
        Graphics.initLevelContext({ levelIndex: this.targetLevelIdx });
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const drawLocalChar = (x, y, char, alpha = 1.0) => {
            if (!char || char === ' ') {
                this.ctx.save();
                this.ctx.globalAlpha = alpha;
                Graphics.drawFloor(x, y, ' ');
                this.ctx.restore();
                return;
            }

            this.ctx.save();
            this.ctx.globalAlpha = alpha;

            // 1. Structural Dispatchers
            if (['#', 'A', 'I', 'x', 'Y', '}', '\u03A9', '|', '='].includes(char)) {
                Graphics.drawCeiling(x, y, char);
            } else if (['W', 'f', 'i', 'j', 'k', 'h', 'm', 'g', 'q', '{', '~', '\"', '\u03C0', ':', ';'].includes(char)) {
                Graphics.drawWallFace(x, y, char);
            } else if (['a', 'b', 'c', 't', 'z', 'o', '&', '\u03A3', '\''].includes(char)) {
                Graphics.drawFloor(x, y, char);
            } else if (char === ',') {
                Graphics.drawFloor(x, y, ',', 0); // Logistic Tatile
            } else if (char === '*') {
                Graphics.drawHole(x, y, 0);
            } else if (char === '.') {
                Graphics.drawVacuumAbyss(x, y, 0);
            } else if (char === 'G') {
                Graphics.drawFloor(x, y, ' ');
                Graphics.drawGlassWall(x, y, 0, true);
            } 
            // 2. Entity/Object Dispatchers
            else if (char === 'B') Graphics.drawCore(x, y, 'B', true);
            else if (char === 'X') Graphics.drawCore(x, y, 'X', true);
            else if (char === 'T' || (char >= '1' && char <= '9')) {
                const req = char === 'T' ? 1 : parseInt(char);
                Graphics.drawCore(x, y, char, false, req, 0);
            } else if (char === 'Z') Graphics.drawBrokenCore(x, y, 0);
            else if (char === 'K') Graphics.drawChargingStation(x, y, false, 0);
            else if (char === '@') {
                Graphics.drawChargingStation(x, y, false, 0);
                this.ctx.globalAlpha *= 0.5;
                Graphics.drawRobot(x, y, 1, 0);
            } else if (['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r'].includes(char)) {
                Graphics.drawWire(x, y, char, false, 0);
            } else if (['(', ')', '[', ']'].includes(char)) {
                let d = 2; if (char === ')') d = 0; if (char === '[') d = 3; if (char === ']') d = 1;
                const conv = targetMock.conveyors.find(cv => cv.x === x && cv.y === y);
                Graphics.drawConveyor(x, y, d, 0, conv?.inDir, 0, 10, true, charMap[y][x] === '*');
            } else if (char === 'D' || char === 'U') {
                const door = targetMock.doors.find(d => d.x === x && d.y === y);
                Graphics.drawDoor(x, y, 'CLOSED', false, 0, door?.orientation, door?.pair?.side, null, char === 'U');
            } else if (char === '_' || char === 'P') {
                Graphics.drawButton(x, y, false, char === 'P' ? 'PRESSURE' : 'TIMER', 0);
            } else if (char === 'E' || char === 'M') {
                const d = (lvl.links && lvl.links[`${x},${y}_dir`]) || 0;
                if (char === 'E') Graphics.drawEmitter(x, y, d, 0);
                else Graphics.drawBlock(x, y, d * Math.PI/2, null, 0, d, 'PRISM');
            } else if (['>', '<', '^', 'v', 'y', 'p'].includes(char)) {
                let d = (lvl.links && lvl.links[`${x},${y}_dir`]);
                if (d === undefined) {
                    d = 0; if(char==='v') d=1; if(char==='<') d=2; if(char==='^') d=3;
                }
                let phase = char === 'y' ? 'SOLAR' : (char === 'p' ? 'LUNAR' : null);
                Graphics.drawBlock(x, y, d * Math.PI / 2, false, 0, d, 'NORMAL', 0, phase, true);
            } else if (char === 'O') {
                const p = targetMock.portals.find(p => p.x === x && p.y === y);
                Graphics.drawPortal(x, y, p?.channel || 0, 0, p?.color || '#ffd700');
            } else if (char === 'Q') Graphics.drawCatalyst(x, y, true, 0);
            else if (char === '?') Graphics.drawQuantumFloor(x, y, true, 0);
            else if (char === '$') Graphics.drawShopTerminal(x, y, 0);
            else if (char === 'S') Graphics.drawScrap(x, y, 0);
            else if (char === '0') Graphics.drawCore(x, y, '0', false, 0, 0);
            else if (['n', 's', 'e', 'w'].includes(char)) {
                let d = 3; if (char === 's') d = 1; if (char === 'e') d = 0; if (char === 'w') d = 2;
                Graphics.drawGravityButton(x, y, d, 0, 0, false);
            } else if (char === '!') {
                const label = targetMock.worldLabels.find(l => l.x === x && l.y === y);
                Graphics.drawWorldLabel(x, y, label?.text || '!', label?.color || '#00f0ff', 1.0, 0.3);
            }
            this.ctx.restore();
        };

        // Render Layers
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                drawLocalChar(x, y, charMap[y][x]);
                if (overlayMap[y][x] !== ' ') drawLocalChar(x, y, overlayMap[y][x]);
                if (blockMap[y][x] !== ' ') drawLocalChar(x, y, blockMap[y][x]);
            }
        }

        // Draw selection highlight
        if (this.selectedX !== null && this.selectedY !== null) {
            this.ctx.strokeStyle = '#00ff9f';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(this.selectedX * 32 + 2, this.selectedY * 32 + 2, 28, 28);
            this.ctx.fillStyle = 'rgba(0, 255, 159, 0.3)';
            this.ctx.fillRect(this.selectedX * 32, this.selectedY * 32, 32, 32);
            this.ctx.fillStyle = '#00ff9f';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('📍', this.selectedX * 32 + 16, this.selectedY * 32 + 24);
        }
        
        Graphics.ctx = oldCtx;
    }
}

// Wait for load to initialize
window.addEventListener('load', () => {
    window.spawnSelector = new PortalSpawnSelector();
});
