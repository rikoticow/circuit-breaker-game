// Circuit Breaker - Procedural Dungeon Generator Module
// Implements "Ultimate Dungeon Lab" logic adapted for the Circuit Breaker Editor

window.DungeonGenerator = {
    EMPTY: 0,
    FLOOR: 1,
    DOOR: 2,
    CORRIDOR: 3,
    
    SECTOR_THEMES: {
        'bronze': { name: 'Bronze (Retro)', floor: ' ', wall: 'W', ceil: '#' },
        'lab': { name: 'Laboratório (Asséptico)', floor: 'a', wall: 'f', ceil: 'A' },
        'tech': { name: 'High-Tech (Cyan)', floor: 'c', wall: 'h', ceil: 'Y' },
        'log': { name: 'Logística (Industrial)', floor: 'o', wall: '{', ceil: '}' },
        'opt': { name: 'Óptico (Vidro)', floor: 't', wall: 'g', ceil: 'N' },
        'proc': { name: 'Processamento (Logístico)', floor: '\u03C3', wall: '\u03A3', ceil: '\u03A9' },
        'real': { name: 'Realidade (Multicolor)', floor: '&', wall: ':', ceil: '=' }
    },

    _rng: null,

    mulberry32(seed) {
        return function() {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    },

    init() {
        const btnGen = document.getElementById('btn-gen');
        const tabBtn = document.getElementById('tab-btn-procedural');
        const close = document.getElementById('gen-close');
        const run = document.getElementById('btn-gen-run');
        const newSeedBtn = document.getElementById('btn-gen-new-seed');

        // Populate Sector Select
        const sectorSelect = document.getElementById('gen-setor');
        if (sectorSelect) {
            sectorSelect.innerHTML = '';
            for (const key in this.SECTOR_THEMES) {
                const opt = document.createElement('option');
                opt.value = key;
                opt.innerText = this.SECTOR_THEMES[key].name;
                sectorSelect.appendChild(opt);
            }
        }

        if (btnGen) {
            btnGen.onclick = () => {
                if (tabBtn) tabBtn.style.display = 'block';
                if (window.switchTab) window.switchTab('tab-procedural');
                this.generate(); // Initial preview
            };
        }
        
        if (close) {
            close.onclick = () => {
                if (tabBtn) tabBtn.style.display = 'none';
                if (window.switchTab) window.switchTab('tab-structure');
            };
        }
        
        if (newSeedBtn) {
            newSeedBtn.onclick = () => {
                document.getElementById('gen-seed').value = Math.floor(Math.random() * 999999);
                this.generate();
            };
        }
        
        if (run) {
            run.innerHTML = '💾 APLICAR NO MAPA';
            run.onclick = () => {
                saveHistory(); 
                this.generate(); // Commit
                if (tabBtn) tabBtn.style.display = 'none';
                if (window.switchTab) window.switchTab('tab-structure');
                if (window.AudioUI) window.AudioUI.play('click');
            };
        }

        // Real-time Update Listeners
        const panel = document.getElementById('tab-procedural');
        const inputs = panel.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                if (this._genTimeout) clearTimeout(this._genTimeout);
                this._genTimeout = setTimeout(() => this.generate(), 50);
            });
        });

        window.toggleGenPanels = () => {
            const algo = document.getElementById('gen-algo').value;
            document.getElementById('gen-panel-grid').style.display = algo === 'grid' ? 'block' : 'none';
            document.getElementById('gen-panel-random').style.display = algo === 'random' ? 'block' : 'none';
            this.generate(false);
        };
    },

    generate() {
        const seed = parseInt(document.getElementById('gen-seed').value) || 12345;
        this._rng = this.mulberry32(seed);

        const algo = document.getElementById('gen-algo').value;
        const rows = currentMap.length;
        const cols = currentMap[0].length;
        
        let internalGrid = Array(rows).fill().map(() => Array(cols).fill(this.EMPTY));
        let rooms = [];

        if (algo === 'grid') {
            rooms = this.runGridPartition(internalGrid, cols, rows);
        } else {
            rooms = this.runRandomPlacement(internalGrid, cols, rows);
        }

        this.applyErosion(internalGrid, cols, rows);
        
        // Always commit for preview
        this.commitToMap(internalGrid, rooms, cols, rows);
        
        rebuildMock();
    },

    runGridPartition(grid, cols, rows) {
        const divisions = parseInt(document.getElementById('gen-divisions').value);
        const fillMin = parseInt(document.getElementById('gen-fill-min').value) / 100;
        const fillMax = parseInt(document.getElementById('gen-fill-max').value) / 100;
        const jitter = parseInt(document.getElementById('gen-jitter').value) / 100;
        const spacing = parseInt(document.getElementById('gen-spacing').value);
        const connChance = parseInt(document.getElementById('gen-connections').value) / 100;
        
        const padding = 2; // Mandatory border for perspective walls and aesthetic
        const availCols = cols - (padding * 2);
        const availRows = rows - (padding * 2);

        const cellW = Math.floor(availCols / divisions);
        const cellH = Math.floor(availRows / divisions);
        
        // Center the grid within the available padded area
        const offsetX_Grid = padding + Math.floor((availCols - (cellW * divisions)) / 2);
        const offsetY_Grid = padding + Math.floor((availRows - (cellH * divisions)) / 2);

        const rooms = [];

        for (let cy = 0; cy < divisions; cy++) {
            for (let cx = 0; cx < divisions; cx++) {
                const maxW = cellW - spacing;
                const maxH = cellH - spacing;
                if (maxW < 3 || maxH < 3) continue;

                // Use range for fill
                const w = Math.max(3, Math.floor(maxW * (fillMin + this._rng() * (fillMax - fillMin))));
                const h = Math.max(3, Math.floor(maxH * (fillMin + this._rng() * (fillMax - fillMin))));

                const maxOffsetX = (cellW - w - spacing);
                const maxOffsetY = (cellH - h - spacing);
                
                // Center room within cell as base, then apply jitter
                const baseOffsetX = Math.max(0, Math.floor(maxOffsetX / 2));
                const baseOffsetY = Math.max(0, Math.floor(maxOffsetY / 2));
                
                const jitterX = maxOffsetX > 0 ? Math.floor((this._rng() - 0.5) * maxOffsetX * jitter) : 0;
                const jitterY = maxOffsetY > 0 ? Math.floor((this._rng() - 0.5) * maxOffsetY * jitter) : 0;

                const x = offsetX_Grid + cx * cellW + Math.floor(spacing/2) + baseOffsetX + jitterX;
                const y = offsetY_Grid + cy * cellH + Math.floor(spacing/2) + baseOffsetY + jitterY;

                const room = { x, y, w, h, cx: Math.floor(x + w/2), cy: Math.floor(y + h/2), cellX: cx, cellY: cy };
                rooms.push(room);
                this.carveRoom(grid, room, rows, cols);
            }
        }

        // Connect Grid Neighbors with connection chance
        for (let i = 0; i < rooms.length; i++) {
            const r1 = rooms[i];
            const right = rooms.find(r => r.cellX === r1.cellX + 1 && r.cellY === r1.cellY);
            const bottom = rooms.find(r => r.cellX === r1.cellX && r.cellY === r1.cellY + 1);

            if (right && this._rng() < connChance) this.carvePath(grid, {x: r1.cx, y: r1.cy}, {x: right.cx, y: right.cy}, rows, cols);
            if (bottom && this._rng() < connChance) this.carvePath(grid, {x: r1.cx, y: r1.cy}, {x: bottom.cx, y: bottom.cy}, rows, cols);
        }

        return rooms;
    },

    runRandomPlacement(grid, cols, rows) {
        const attempts = parseInt(document.getElementById('gen-attempts').value);
        const gravity = parseInt(document.getElementById('gen-gravity').value) / 100;
        const overlap = document.getElementById('gen-overlap').checked;
        const spacing = parseInt(document.getElementById('gen-spacing').value);
        const sizeMin = parseInt(document.getElementById('gen-rand-min').value) || 4;
        const sizeMax = parseInt(document.getElementById('gen-rand-max').value) || 10;
        const padding = 2;
        
        const rooms = [];
        const mapCX = cols / 2;
        const mapCY = rows / 2;

        for (let i = 0; i < attempts; i++) {
            const w = sizeMin + Math.floor(this._rng() * (sizeMax - sizeMin + 1));
            const h = sizeMin + Math.floor(this._rng() * (sizeMax - sizeMin + 1));

            let rx = spacing + Math.floor(this._rng() * (cols - w - spacing * 2));
            let ry = spacing + Math.floor(this._rng() * (rows - h - spacing * 2));

            let x = Math.floor(rx * (1 - gravity) + (mapCX - w/2) * gravity);
            let y = Math.floor(ry * (1 - gravity) + (mapCY - h/2) * gravity);

            // Clamp to padding
            x = Math.max(padding, Math.min(cols - w - padding, x));
            y = Math.max(padding, Math.min(rows - h - padding, y));

            let overlaps = false;
            if (!overlap) {
                for (let r of rooms) {
                    if (!(x + w + spacing <= r.x || x >= r.x + r.w + spacing || 
                          y + h + spacing <= r.y || y >= r.y + r.h + spacing)) {
                        overlaps = true; break;
                    }
                }
            }

            if (!overlaps) {
                const room = { x, y, w, h, cx: Math.floor(x + w/2), cy: Math.floor(y + h/2) };
                if (rooms.length > 0) {
                    const prev = rooms[rooms.length - 1];
                    this.carvePath(grid, {x: room.cx, y: room.cy}, {x: prev.cx, y: prev.cy}, rows, cols);
                }
                rooms.push(room);
                this.carveRoom(grid, room, rows, cols);
            }
        }
        return rooms;
    },

    carveRoom(grid, room, rows, cols) {
        for (let r = room.y; r < room.y + room.h; r++) {
            for (let c = room.x; c < room.x + room.w; c++) {
                if (r >= 0 && r < rows && c >= 0 && c < cols) {
                    grid[r][c] = this.FLOOR;
                }
            }
        }
    },

    carvePath(grid, start, end, rows, cols) {
        let cx = start.x;
        let cy = start.y;
        while (cx !== end.x) {
            if (cy >= 0 && cy < rows && cx >= 0 && cx < cols) {
                if (grid[cy][cx] === this.EMPTY) grid[cy][cx] = this.CORRIDOR;
            }
            cx += (end.x > cx) ? 1 : -1;
        }
        while (cy !== end.y) {
            if (cy >= 0 && cy < rows && cx >= 0 && cx < cols) {
                if (grid[cy][cx] === this.EMPTY) grid[cy][cx] = this.CORRIDOR;
            }
            cy += (end.y > cy) ? 1 : -1;
        }
    },

    applyErosion(grid, cols, rows) {
        const level = parseInt(document.getElementById('gen-erosion').value);
        if (level === 0) return;

        const chance = (level / 100) * 0.7;
        const passes = Math.ceil(level / 25);

        for (let p = 0; p < passes; p++) {
            let toRemove = [];
            for (let y = 1; y < rows - 1; y++) {
                for (let x = 1; x < cols - 1; x++) {
                    if (grid[y][x] === this.FLOOR || grid[y][x] === this.CORRIDOR) {
                        let emptyNeighbors = 0;
                        if (grid[y-1][x] === this.EMPTY) emptyNeighbors++;
                        if (grid[y+1][x] === this.EMPTY) emptyNeighbors++;
                        if (grid[y][x-1] === this.EMPTY) emptyNeighbors++;
                        if (grid[y][x+1] === this.EMPTY) emptyNeighbors++;

                        if (emptyNeighbors >= 2 && this._rng() < chance) {
                            toRemove.push({x, y});
                        }
                    }
                }
            }
            toRemove.forEach(t => grid[t.y][t.x] = this.EMPTY);
        }
    },

    commitToMap(grid, rooms, cols, rows) {
        const setor = document.getElementById('gen-setor').value;
        const genScrap = document.getElementById('gen-scrap').checked;
        const genTargets = document.getElementById('gen-targets').checked;
        const genLabels = document.getElementById('gen-labels').checked;
        const useFog = document.getElementById('gen-fog').checked;
        const fogRadius = parseInt(document.getElementById('gen-fog-radius').value);

        const lvl = levelsData[currentLevelIdx];
        lvl.fogOfWar = useFog;
        lvl.discoveryRadius = fogRadius;
        lvl.rooms = rooms.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h }));

        const theme = this.SECTOR_THEMES[setor] || this.SECTOR_THEMES['bronze'];
        let floorChar = theme.floor;
        let wallChar = theme.wall;
        let ceilChar = theme.ceil;

        // Reset Maps
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                currentMap[y][x] = ceilChar;
                currentOverlayMap[y][x] = ' ';
                currentBlocksMap[y][x] = ' ';
                currentWiresMap[y][x] = ' ';
            }
        }

        // Apply Internal Grid
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const val = grid[y][x];
                if (val === this.FLOOR || val === this.CORRIDOR) {
                    currentMap[y][x] = floorChar;
                } else if (val === this.EMPTY) {
                    // WALL PERSPECTIVE RULE: 
                    // Walls are ONLY generated above floors to create the "top face" perspective.
                    // Sides and bottom edges transition directly to ceiling/empty space.
                    let isWall = false;
                    if (y < rows - 1 && grid[y + 1][x] !== this.EMPTY) {
                        isWall = true;
                    }
                    
                    currentMap[y][x] = isWall ? wallChar : ceilChar;
                }
            }
        }

        // Place Player
        if (rooms.length > 0) {
            const startRoom = rooms[0];
            currentMap[startRoom.cy][startRoom.cx] = floorChar;
            currentOverlayMap[startRoom.cy][startRoom.cx] = '@';
        }

        // Place Extras
        rooms.forEach((r, idx) => {
            if (idx === 0) return; // Skip start room
            
            // Random Target
            if (genTargets && Math.random() < 0.3) {
                currentOverlayMap[r.cy][r.cx] = 'T';
            }
            
            // Random Scrap
            if (genScrap) {
                const scrapCount = 1 + Math.floor(Math.random() * 3);
                for(let i=0; i<scrapCount; i++) {
                    const sx = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
                    const sy = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
                    if (currentOverlayMap[sy][sx] === ' ') currentOverlayMap[sy][sx] = 'S';
                }
            }

            // Random Labels
            if (genLabels && Math.random() < 0.2) {
                const lx = r.x + Math.floor(r.w/2);
                const ly = r.y + Math.floor(r.h/2);
                currentOverlayMap[ly][lx] = '!';
                const lvl = levelsData[currentLevelIdx];
                if (!lvl.links) lvl.links = {};
                lvl.links[`${lx},${ly}_label`] = `SETOR ${String.fromCharCode(65 + (idx % 26))}${idx}`;
            }
        });
    }
};
