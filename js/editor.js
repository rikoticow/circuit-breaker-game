// Circuit Breaker - Advanced Level Editor
// Built for high-fidelity map design

// 1. DUMMY GAME OBJECT (Fixes ReferenceError in graphics.js before main game load)
window.game = {
    getWireConnections: (type) => {
        // Fallback logic for graphics.js
        if (type === 'H') return [0, 2]; // RIGHT, LEFT
        if (type === 'V') return [1, 3]; // DOWN, UP
        if (type === '+') return [0, 1, 2, 3];
        if (type === 'L') return [3, 0];
        if (type === 'J') return [3, 2];
        if (type === 'C') return [1, 2];
        if (type === 'F') return [1, 0];
        if (type === 'u') return [2, 0, 3];
        if (type === 'd') return [2, 0, 1];
        if (type === 'l') return [3, 1, 2];
        if (type === 'r') return [3, 1, 0];
        return [];
    }
};
let hoveredChannel = null;

const PALETTE = [
    { title: "Estrutura", tiles: [{c: '#', n: 'Teto (Bronze)'}, {c: 'W', n: 'Parede Frontal'}, {c: 'G', n: 'Vidro Blindado'}, {c: ' ', n: 'Chão (Borracha)'}, {c: '*', n: 'Buraco/Abismo'}, {c: '@', n: 'Robô'}, {c: 'K', n: 'Estação'}] },
    { title: "Estrutura (Overlay)", tiles: [{c: 'D', n: 'Porta'}, {c: '_', n: 'Botão Industrial'}, {c: 'E', n: 'Emissor (Canhão)'}] },
    { title: "Quântico", tiles: [{c: '?', n: 'Chão Quântico'}, {c: 'Q', n: 'Catalisador'}, {c: 'O', n: 'Portal Quântico'}, {c: '!', n: 'Singularidade'}] },
    { title: "Gravidade", tiles: [{c: 'n', n: 'Gravidade N'}, {c: 's', n: 'Gravidade S'}, {c: 'e', n: 'Gravidade L'}, {c: 'w', n: 'Gravidade O'}] },
    { title: "Núcleos", tiles: [{c: 'T', n: 'Alvo'}, {c: 'B', n: 'Fonte Azul'}, {c: 'X', n: 'Fonte Vermelha'}, {c: 'Z', n: 'Quebrado'}] },

    { title: "Fios", tiles: [{c: 'H', n: 'Horiz'}, {c: 'V', n: 'Vert'}, {c: '+', n: 'Cruz'}] },
    { title: "Curvas", tiles: [{c: 'L', n: '└'}, {c: 'J', n: '┘'}, {c: 'C', n: '┐'}, {c: 'F', n: '┌'}] },
    { title: "Junções", tiles: [{c: 'u', n: '┻'}, {c: 'd', n: '┳'}, {c: 'l', n: '┫'}, {c: 'r', n: '┣'}] },
    { title: "Amplificadores", tiles: [{c: '>', n: 'Dir'}, {c: '<', n: 'Esq'}, {c: 'v', n: 'Baixo'}, {c: '^', n: 'Cima'}, {c: 'M', n: 'Prisma'}, {c: 'y', n: 'Solar'}, {c: 'p', n: 'Lunar'}] },
    { title: "Esteiras", tiles: [{c: ')', n: 'Esteira Dir'}, {c: '(', n: 'Esteira Esq'}, {c: ']', n: 'Esteira Baixo'}, {c: '[', n: 'Esteira Cima'}] },
    { title: "Coletáveis", tiles: [{c: 'S', n: 'Tralha'}] },
    { title: "Eventos", tiles: [{c: '💬', n: 'Fala/Diálogo'}, {c: '⚡', n: 'Gatilho'}] }
];

let levelsData = [];
let chaptersData = [];
let currentLevelIdx = 0;
let currentChapterIdx = 0;
let currentMap = []; // 15x20 (Base objects, wires, robot)
let currentOverlayMap = []; // 15x20 (Conveyors, Scrap)
let currentBlocksMap = []; // 15x20 (Amplifier blocks only)
let selectedTile = '#';
let activeLayer = 'base'; // base, overlays, blocks, events
let currentTool = 'brush'; // brush, eraser, rect, line, select
let isDrawing = false;
let startX = -1, startY = -1;
let historyStack = [];
let clipboard = null;
let selectionStart = null;
let selectionEnd = null;
let hoverPos = {x: 0, y: 0};
let editTargets = []; // New array for batch editing
let isTestMode = false;
let testGame = null;
let testAnimFrame = 0;
let testLastTime = 0;
let rebootConfirmTimer = null;
let originalLevels = null;

let canvas, ctx;
let mockGame = null;
let animFrame = 0;

window.onload = () => {
    // Force levels load
    levelsData = JSON.parse(JSON.stringify(LEVELS));
    if (typeof CHAPTERS !== 'undefined') {
        chaptersData = JSON.parse(JSON.stringify(CHAPTERS));
    } else {
        // Fallback: One chapter with all levels
        chaptersData = [{ name: "CAPÍTULO 1", levels: levelsData.map((_, i) => i) }];
    }
    
    canvas = document.getElementById('editor-canvas');
    ctx = canvas.getContext('2d');
    Graphics.init(canvas);
    
    // Initial mock
    mockGame = new GameState(null, true);
    window.game = mockGame;
    
    buildPalette();
    updateChapterList();
    updateLevelList();
    loadLevel(0);
    
    setupEvents();
    requestAnimationFrame(renderLoop);
};

function createTilePreview(char) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 32; tempCanvas.height = 32;
    const tCtx = tempCanvas.getContext('2d');
    const oldCtx = Graphics.ctx;
    Graphics.ctx = tCtx;
    
    if (char !== '*') Graphics.drawFloor(0, 0);
    if (char === '#') Graphics.drawCeiling(0, 0);
    else if (char === 'W') Graphics.drawWallFace(0, 0);
    else if (char === '*') Graphics.drawHole(0, 0, animFrame);
    else if (char === '@') Graphics.drawRobot(0, 0, 1, 0);
    else if (char === 'K') Graphics.drawChargingStation(0, 0, true, animFrame);
    else if (['B'].includes(char)) Graphics.drawCore(0, 0, 'B', true);
    else if (['X'].includes(char)) Graphics.drawCore(0, 0, 'X', true);
    else if (char === 'T') Graphics.drawCore(0, 0, '1', false, 1, 0, false);
    else if (char === 'Z') Graphics.drawBrokenCore(0, 0, animFrame);
    else if (char >= '1' && char <= '9') Graphics.drawCore(0, 0, char, false, parseInt(char), 0, false);
    else if (['H','V','+','L','J','C','F','u','d','l','r'].includes(char)) Graphics.drawWire(0, 0, char, null);
    else if (char === 'S') Graphics.drawScrap(0, 0, animFrame);
    else if (['>','<','^','v','y','p'].includes(char)) {
        let d = 0; if(char==='v') d=1; if(char==='<') d=2; if(char==='^') d=3;
        let ph = (char === 'y') ? 'SOLAR' : (char === 'p' ? 'LUNAR' : null);
        Graphics.drawBlock(0, 0, d * Math.PI / 2, null, 0, d, 'NORMAL', 0, ph, true);
    } else if (['(', ')', '[', ']'].includes(char)) {
        let d = 2; if(char===')') d=0; if(char==='[') d=3; if(char===']') d=1;
        Graphics.drawConveyor(0, 0, d, -1, null);
    } else if (char === 'D') {
        Graphics.drawDoor(0, 0, 'CLOSED', false, 0);
    } else if (char === '_') {
        Graphics.drawButton(0, 0, false);
    } else if (char === '?') {
        Graphics.drawQuantumFloor(0, 0, true, animFrame);
    } else if (char === 'P') {
        Graphics.drawPurpleButton(0, 0, false);
    } else if (char === 'E') {
        Graphics.drawEmitter(0, 0, 0, animFrame);
    } else if (char === 'M') {
        Graphics.drawBlock(0, 0, 0, null, 0, 0, 'PRISM');
    } else if (char === 'Q') {
        Graphics.drawCatalyst(0, 0, true, animFrame);
    } else if (char === 'G') {
        Graphics.drawGlassWall(0, 0, animFrame, true);
    } else if (char === 'O') {
        Graphics.drawPortal(0, 0, 0, animFrame, undefined);
    } else if (char === '!') {
        Graphics.drawSingularitySwitcher(0, 0, true, animFrame);
    } else if (['n', 's', 'e', 'w'].includes(char)) {
        let d = DIRS.UP;
        if (char === 's') d = DIRS.DOWN;
        if (char === 'e') d = DIRS.RIGHT;
        if (char === 'w') d = DIRS.LEFT;
        Graphics.drawGravityButton(0, 0, d, animFrame, 0, false);
    } else if (char === '💬') {
        tCtx.fillStyle = '#00ff9f';
        tCtx.font = '20px VT323';
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.fillText('💬', 16, 16);
    } else if (char === '⚡') {
        tCtx.fillStyle = '#ffcc00';
        tCtx.font = '20px VT323';
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.fillText('⚡', 16, 16);
    }

    
    Graphics.ctx = oldCtx;
    return tempCanvas;
}

function buildPalette() {
    const container = document.getElementById('palette-container');
    container.innerHTML = '';
    PALETTE.forEach(group => {
        const isAmplifierGroup = group.title === "Amplificadores";
        
        // Filter groups based on activeLayer
        const isOverlayGroup = group.title === "Esteiras" || group.title === "Coletáveis" || group.title === "Estrutura (Overlay)" || group.title === "Quântico";
        const isBlockGroup = group.title === "Amplificadores";
        const isEventGroup = group.title === "Eventos";
        const isGravityGroup = group.title === "Gravidade";
        
        if (activeLayer === 'overlays' && !isOverlayGroup && !isGravityGroup) return;
        if (activeLayer === 'blocks' && !isBlockGroup) return;
        if (activeLayer === 'events' && !isEventGroup) return;
        if (activeLayer === 'base' && (isOverlayGroup || isBlockGroup || isEventGroup || isGravityGroup)) return;

        const gDiv = document.createElement('div');
        gDiv.className = 'palette-group';
        const title = document.createElement('div');
        title.className = 'palette-group-title';
        title.innerText = group.title;
        gDiv.appendChild(title);
        
        group.tiles.forEach(t => {
            const btn = document.createElement('div');
            btn.className = 'tile-btn' + (t.c === selectedTile ? ' selected' : '');
            btn.title = t.n;
            btn.appendChild(createTilePreview(t.c));
            btn.onclick = () => {
                document.querySelectorAll('.tile-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedTile = t.c;
                if (currentTool === 'eraser' || currentTool === 'select') {
                    setTool('brush');
                }
            };
            gDiv.appendChild(btn);
        });
        container.appendChild(gDiv);
    });
}

function setLayer(layer) {
    activeLayer = layer;
    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.classList.toggle('active', btn.id === `layer-${layer}`);
    });
    
    // Set default tile for layer
    if (activeLayer === 'blocks') selectedTile = '>';
    else if (activeLayer === 'overlays') selectedTile = ')';
    else if (activeLayer === 'events') selectedTile = '💬';
    else selectedTile = '#';
    
    buildPalette();
}

function getAvailableTiles() {
    let tiles = [];
    PALETTE.forEach(group => {
        const isOverlayGroup = group.title === "Esteiras" || group.title === "Coletáveis" || group.title === "Estrutura (Overlay)" || group.title === "Quântico";
        const isBlockGroup = group.title === "Amplificadores";
        const isEventGroup = group.title === "Eventos";
        const isGravityGroup = group.title === "Gravidade";
        
        if (activeLayer === 'overlays' && (isOverlayGroup || isGravityGroup)) tiles.push(...group.tiles.map(t => t.c));
        else if (activeLayer === 'blocks' && isBlockGroup) tiles.push(...group.tiles.map(t => t.c));
        else if (activeLayer === 'events' && isEventGroup) tiles.push(...group.tiles.map(t => t.c));
        else if (activeLayer === 'base' && !isOverlayGroup && !isBlockGroup && !isEventGroup && !isGravityGroup) tiles.push(...group.tiles.map(t => t.c));
    });
    return tiles;
}

function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(b => {
        b.classList.toggle('active', b.id === `tool-${tool}`);
    });
}

function updateChapterList() {
    const list = document.getElementById('chapter-list');
    list.innerHTML = '';
    
    chaptersData.forEach((chap, i) => {
        const item = document.createElement('div');
        item.style.cssText = `
            background: ${i === currentChapterIdx ? '#00ff9f' : '#222'};
            color: ${i === currentChapterIdx ? '#000' : '#fff'};
            padding: 5px 8px;
            border: 1px solid #444;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        item.innerHTML = `
            <span contenteditable="true" onblur="renameChapter(${i}, this.innerText)">${chap.name}</span>
            <button onclick="event.stopPropagation(); deleteChapter(${i})" style="background:none; border:none; color:red; cursor:pointer;">×</button>
        `;
        
        item.onclick = () => {
            currentChapterIdx = i;
            updateChapterList();
            updateLevelList();
        };
        list.appendChild(item);
    });
}

function renameChapter(idx, newName) {
    chaptersData[idx].name = newName || "Capítulo Sem Nome";
}

function deleteChapter(idx) {
    if (chaptersData.length <= 1) return;
    showModal(`Deletar capítulo "${chaptersData[idx].name}"?`, () => {
        chaptersData.splice(idx, 1);
        if (currentChapterIdx >= chaptersData.length) currentChapterIdx = chaptersData.length - 1;
        updateChapterList();
        updateLevelList();
    });
}

function updateLevelList() {
    const list = document.getElementById('level-list');
    list.innerHTML = '';
    
    // Get levels for current chapter
    const currentChapter = chaptersData[currentChapterIdx];
    if (!currentChapter) return;

    // Show levels assigned to this chapter
    currentChapter.levels.forEach((lvlIdx) => {
        const lvl = levelsData[lvlIdx];
        if (!lvl) return;

        const item = document.createElement('div');
        item.className = `level-item ${lvlIdx === currentLevelIdx ? 'active' : ''}`;
        
        // Build chapter options for dropdown
        const options = chaptersData.map((c, idx) => 
            `<option value="${idx}" ${idx === currentChapterIdx ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        item.innerHTML = `
            <div class="lvl-title">${lvlIdx}: ${lvl.name}</div>
            <div style="display: flex; gap: 5px; align-items: center; margin: 4px 0;">
                <span style="font-size: 11px; color: #666;">Cap:</span>
                <select onclick="event.stopPropagation()" onchange="event.stopPropagation(); changeChapterForLevel(${lvlIdx}, ${currentChapterIdx}, this.value)" style="font-size: 11px; background: #333; color: #fff; border: 1px solid #444; flex: 1;">
                    ${options}
                </select>
            </div>
            <div class="lvl-actions">
                <button class="action-btn" onclick="event.stopPropagation(); moveLevelInChapter(${lvlIdx}, -1)" title="Subir">🔼</button>
                <button class="action-btn" onclick="event.stopPropagation(); moveLevelInChapter(${lvlIdx}, 1)" title="Baixar">🔽</button>
                <button class="action-btn" onclick="event.stopPropagation(); removeFromChapter(${lvlIdx})" title="Remover do Capítulo" style="color: #ffaa00;">✖</button>
            </div>
        `;
        
        item.onclick = () => loadLevel(lvlIdx);
        list.appendChild(item);
    });

    // Add Separator
    const sep = document.createElement('div');
    sep.style.cssText = "color: #444; font-size: 12px; margin-top: 15px; border-top: 1px solid #333; padding-top: 5px;";
    sep.innerText = "OUTRAS FASES (DISPONÍVEIS)";
    list.appendChild(sep);

    // Show levels NOT in any chapter
    levelsData.forEach((lvl, i) => {
        const isInAnyChapter = chaptersData.some(c => c.levels.includes(i));
        if (isInAnyChapter) return;

        const item = document.createElement('div');
        item.className = `level-item ${i === currentLevelIdx ? 'active' : ''}`;
        item.style.opacity = "0.6";
        
        item.innerHTML = `
            <div class="lvl-title">${i}: ${lvl.name}</div>
            <div class="lvl-actions">
                <button class="action-btn" onclick="event.stopPropagation(); addToChapter(${i})" style="color: #00ff9f;">➕ ADD AO CAPÍTULO</button>
                <button class="action-btn" onclick="event.stopPropagation(); deleteLevel(${i})" title="Deletar" style="color: #ff4444;">🗑️</button>
            </div>
        `;
        
        item.onclick = () => loadLevel(i);
        list.appendChild(item);
    });
}

function changeChapterForLevel(lvlIdx, oldChapIdx, newChapIdx) {
    newChapIdx = parseInt(newChapIdx);
    if (oldChapIdx === newChapIdx) return;
    
    // Remove from old
    chaptersData[oldChapIdx].levels = chaptersData[oldChapIdx].levels.filter(id => id !== lvlIdx);
    
    // Add to new
    chaptersData[newChapIdx].levels.push(lvlIdx);
    
    updateLevelList();
}

function addToChapter(lvlIdx) {
    chaptersData[currentChapterIdx].levels.push(lvlIdx);
    updateLevelList();
}

function removeFromChapter(lvlIdx) {
    const chap = chaptersData[currentChapterIdx];
    chap.levels = chap.levels.filter(id => id !== lvlIdx);
    updateLevelList();
}

function moveLevelInChapter(lvlIdx, dir) {
    const chap = chaptersData[currentChapterIdx];
    const pos = chap.levels.indexOf(lvlIdx);
    const newPos = pos + dir;
    if (newPos < 0 || newPos >= chap.levels.length) return;
    
    [chap.levels[pos], chap.levels[newPos]] = [chap.levels[newPos], chap.levels[pos]];
    updateLevelList();
}

function cloneLevel(idx) {
    const clone = JSON.parse(JSON.stringify(levelsData[idx]));
    clone.name += " (Cópia)";
    levelsData.splice(idx + 1, 0, clone);
    updateLevelList();
}

function moveLevel(idx, dir) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= levelsData.length) return;
    
    const temp = levelsData[idx];
    levelsData[idx] = levelsData[newIdx];
    levelsData[newIdx] = temp;
    
    if (currentLevelIdx === idx) currentLevelIdx = newIdx;
    else if (currentLevelIdx === newIdx) currentLevelIdx = idx;
    
    updateLevelList();
}

function deleteLevel(idx) {
    if (levelsData.length <= 1) return showModal("Não é possível deletar o último nível!", null, false);
    
    showModal(`Deletar level ${idx}: ${levelsData[idx].name}?`, () => {
        levelsData.splice(idx, 1);
        if (currentLevelIdx >= levelsData.length) currentLevelIdx = levelsData.length - 1;
        loadLevel(currentLevelIdx);
    });
}

function showModal(msg, onConfirm, showCancel = true) {
    const overlay = document.getElementById('modal-overlay');
    const msgEl = document.getElementById('modal-msg');
    const btnConfirm = document.getElementById('modal-btn-confirm');
    const btnCancel = document.getElementById('modal-btn-cancel');

    msgEl.innerText = msg;
    overlay.style.display = 'flex';
    btnCancel.style.display = showCancel ? 'block' : 'none';

    btnConfirm.onclick = () => {
        overlay.style.display = 'none';
        if (onConfirm) onConfirm();
    };
    btnCancel.onclick = () => {
        overlay.style.display = 'none';
    };
}

function loadLevel(idx) {
    currentLevelIdx = idx;
    const lvl = levelsData[idx];
    document.getElementById('lvl-name').value = lvl.name;
    document.getElementById('lvl-battery').value = lvl.time || 30;
    document.getElementById('lvl-timer').value = lvl.timer || 60;
    document.getElementById('check-lvl-blackout').checked = lvl.startWithBlackout || false;
    
    // Load map into 2D array
    currentMap = lvl.map.map(row => row.split(''));
    
    const h = currentMap.length;
    const w = currentMap[0].length;
    document.getElementById('map-w').value = w;
    document.getElementById('map-h').value = h;
    
    canvas.width = w * 32;
    canvas.height = h * 32;

    // Load blocks layer
    if (lvl.blocks) {
        currentBlocksMap = lvl.blocks.map(row => row.split(''));
    } else {
        currentBlocksMap = Array(h).fill(0).map(() => Array(w).fill(' '));
    }

    // Load overlays layer
    if (lvl.overlays) {
        currentOverlayMap = lvl.overlays.map(row => row.split(''));
    } else {
        currentOverlayMap = Array(h).fill(0).map(() => Array(w).fill(' '));
    }
    
    historyStack = [JSON.parse(JSON.stringify({map: currentMap, blocks: currentBlocksMap, overlays: currentOverlayMap, dialogues: lvl.dialogues || {}, zoneTriggers: lvl.zoneTriggers || []}))];
    Graphics.clearParticles();
    updateLevelList();
    updateDialogueManager();
    updateTriggerManagerList();
    rebuildMock();
}

function resizeMap() {
    const newW = parseInt(document.getElementById('map-w').value);
    const newH = parseInt(document.getElementById('map-h').value);

    if (isNaN(newW) || isNaN(newH) || newW < 5 || newH < 5) {
        return showModal("Tamanho inválido! Mínimo 5x5.", null, false);
    }

    saveHistory();

    const oldH = currentMap.length;
    const oldW = currentMap[0].length;

    let nextMap = [];
    let nextBlocksMap = [];
    let nextOverlayMap = [];

    for (let y = 0; y < newH; y++) {
        let row = [];
        let bRow = [];
        let oRow = [];
        for (let x = 0; x < newW; x++) {
            if (y < oldH && x < oldW) {
                row.push(currentMap[y][x]);
                bRow.push(currentBlocksMap[y][x]);
                oRow.push(currentOverlayMap[y][x]);
            } else {
                row.push('#'); // Default to ceiling
                bRow.push(' ');
                oRow.push(' ');
            }
        }
        nextMap.push(row);
        nextBlocksMap.push(bRow);
        nextOverlayMap.push(oRow);
    }

    currentMap = nextMap;
    currentBlocksMap = nextBlocksMap;
    currentOverlayMap = nextOverlayMap;

    canvas.width = newW * 32;
    canvas.height = newH * 32;
    
    rebuildMock();
}

function rebuildMock() {
    if (!mockGame) mockGame = new GameState();
    
    // Sync UI values to levelsData
    const lvl = levelsData[currentLevelIdx];
    lvl.name = document.getElementById('lvl-name').value;
    lvl.time = parseInt(document.getElementById('lvl-battery').value) || 30;
    lvl.timer = parseInt(document.getElementById('lvl-timer').value) || 60;
    lvl.startWithBlackout = document.getElementById('check-lvl-blackout').checked;
    lvl.map = currentMap.map(row => row.join(''));
    lvl.blocks = currentBlocksMap.map(row => row.join(''));
    lvl.overlays = currentOverlayMap.map(row => row.join(''));
    // dialogues are managed directly in lvl.dialogues

    // Inject level data directly into mockGame
    mockGame.map = [];
    mockGame.blocks = [];
    mockGame.targets = [];
    mockGame.forbiddens = [];
    mockGame.sources = [];
    mockGame.redSources = [];
    mockGame.wires = [];
    mockGame.scrapPositions = new Set();
    mockGame.totalScrap = 0;
    mockGame.conveyors = [];
    mockGame.doors = [];
    mockGame.buttons = [];
    mockGame.purpleButtons = [];
    mockGame.quantumFloors = [];
    mockGame.emitters = [];
    mockGame.catalysts = [];
    mockGame.portals = [];
    mockGame.glassWallsHit = new Set();
    mockGame.singularitySwitchers = [];
    mockGame.isSolarPhase = true;
    mockGame.zoneTriggers = JSON.parse(JSON.stringify(lvl.zoneTriggers || []));
    mockGame.isBlackoutActive = lvl.startWithBlackout || false;
    mockGame.blackoutAlpha = mockGame.isBlackoutActive ? 1 : 0;


    const h = currentMap.length;
    mockGame.chargingStations = [];
    mockGame.poweredStations = new Set();
    const w = currentMap[0].length;

    for (let y = 0; y < h; y++) {
        let row = [];
        for (let x = 0; x < w; x++) {
            let c = currentMap[y][x];
            row.push((c === '#' || c === '*' || c === 'W' || c === 'G') ? c : ' ');
            
            if (c === '@') {
                mockGame.player.x = x;
                mockGame.player.y = y;
                mockGame.startPos = { x, y };
            } else if (c === 'B') {
                mockGame.sources.push({ x, y });
            } else if (c === 'X') {
                mockGame.redSources.push({ x, y });
            } else if (c === 'K') {
                mockGame.chargingStations.push({ x, y });
            } else if (['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r'].includes(c)) {
                mockGame.wires.push({ x, y, type: c });
            } else if (c === 'Z') {
                mockGame.brokenCores.push({ x, y });
            } else if (c === 'G') {
                // Glass in base map
            } else if (c === 'T' || (c >= '1' && c <= '9')) {
                const req = c === 'T' ? 1 : parseInt(c);
                mockGame.targets.push({ x, y, required: req });
            } else if (c === '0') {
                mockGame.forbiddens.push({ x, y });
            } else if (['>', '<', '^', 'v'].includes(c)) {
                let dir = 0;
                if (c === '<') dir = 2;
                if (c === '^') dir = 3;
                if (c === 'v') dir = 1;
                mockGame.blocks.push({ x, y, dir });
            } else if (c === 'S') {
                mockGame.scrapPositions.add(`${x},${y}`);
                mockGame.totalScrap++;
            } else if (['(', ')', '[', ']'].includes(c)) {
                let dir = 2; // LEFT
                if (c === ')') dir = 0; // RIGHT
                if (c === '[') dir = 3; // UP
                if (c === ']') dir = 1; // DOWN
                const chan = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}`]) || 0;
                mockGame.conveyors.push({ x, y, dir, channel: chan });
            } else if (c === 'E' || c === 'M') {
                const dir = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}_dir`]) || 0;
                const chan = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}`]) || 0;
                if (c === 'E') {
                    const inverted = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}_init`]) === false;
                    mockGame.emitters.push({ x, y, dir, channel: chan, inverted });
                }
                else mockGame.blocks.push({ x, y, dir, type: 'PRISM' });
            } else if (c === 'Q') {
                mockGame.catalysts.push({ x, y, active: false });
            } else if (c === 'O') {
                const chan = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}`]) || 0;
                const pColor = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}_color`]) || '#ffd700';
                mockGame.portals.push({ x, y, channel: chan, slot: { content: null }, color: pColor });
            } else if (['n', 's', 'e', 'w'].includes(c)) {
                let gDir = DIRS.UP;
                if (c === 's') gDir = DIRS.DOWN;
                if (c === 'e') gDir = DIRS.RIGHT;
                if (c === 'w') gDir = DIRS.LEFT;
                mockGame.gravityButtons.push({ x, y, dir: gDir, flashTimer: 0 });
            } else if (c === '!') {
                mockGame.singularitySwitchers.push({ x, y, wasSteppedOn: false, lightningTimer: 0, lightningSeed: 0 });
            }






            // Load from overlay map
            let oc = currentOverlayMap[y][x];
            if (['(', ')', '[', ']'].includes(oc)) {
                let dir = 2; if (oc === ')') dir = 0; if (oc === '[') dir = 3; if (oc === ']') dir = 1;
                const chan = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}`]) || 0;
                mockGame.conveyors.push({ x, y, dir, channel: chan });
            } else if (oc === 'S') {
                mockGame.scrapPositions.add(`${x},${y}`);
                mockGame.totalScrap++;
            } else if (oc === 'D') {
                const chan = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}`]) || 0;
                mockGame.doors.push({ x, y, state: 'CLOSED', error: false, channel: chan });
            } else if (oc === '?') {
                const chan = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}`]) || 0;
                mockGame.quantumFloors.push({ x, y, active: true, channel: chan, flashTimer: 0, pulseIntensity: 1.0, entrySide: null, whiteGlow: 0 });
            } else if (oc === '_' || oc === 'P') {
                const chan = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}`]) || 0;
                const behavior = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}_behavior`]) || (oc === 'P' ? 'PRESSURE' : 'TIMER');
                const initState = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}_init`]) === true;
                mockGame.buttons.push({ x, y, isPressed: initState, channel: chan, behavior: behavior });
            } else if (oc === '!') {
                mockGame.singularitySwitchers.push({ x, y, wasSteppedOn: false, lightningTimer: 0, lightningSeed: 0 });
            } else if (oc === 'G') {
                row[x] = 'G';
            } else if (oc === 'E' || oc === 'M') {
                const dir = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}_dir`]) || 0;
                if (oc === 'E') {
                    if (!mockGame.emitters.some(e => e.x === x && e.y === y)) {
                        const inverted = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}_init`]) === false;
                        mockGame.emitters.push({ x, y, dir, inverted });
                    }
                } else {
                    if (!mockGame.blocks.some(b => b.x === x && b.y === y)) mockGame.blocks.push({ x, y, dir, type: 'PRISM' });
                }
            } else if (oc === 'O') {
                const chan = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}`]) || 0;
                const pColor = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}_color`]) || '#ffd700';
                if (!mockGame.portals.some(p => p.x === x && p.y === y)) {
                    mockGame.portals.push({ x, y, channel: chan, slot: { content: null }, color: pColor });
                }
            } else if (['n', 's', 'e', 'w'].includes(oc)) {
                let gDir = DIRS.UP;
                if (oc === 's') gDir = DIRS.DOWN;
                if (oc === 'e') gDir = DIRS.RIGHT;
                if (oc === 'w') gDir = DIRS.LEFT;
                if (!mockGame.gravityButtons.some(g => g.x === x && g.y === y)) {
                    mockGame.gravityButtons.push({ x, y, dir: gDir, flashTimer: 0 });
                }
            }

            // Also load from blocks map
            let bc = currentBlocksMap[y][x];
            if (['>', '<', '^', 'v', 'y', 'p'].includes(bc)) {
                let dir = 0;
                if (bc === '<') dir = 2;
                if (bc === '^') dir = 3;
                if (bc === 'v') dir = 1;
                // Avoid duplicates
                if (!mockGame.blocks.some(b => b.x === x && b.y === y)) {
                    let phase = null;
                    if (bc === 'y') phase = 'SOLAR';
                    if (bc === 'p') phase = 'LUNAR';
                    mockGame.blocks.push({ x, y, dir, phase });
                }
            } else if (bc === 'M') {
                const dir = (levelsData[currentLevelIdx].links && levelsData[currentLevelIdx].links[`${x},${y}_dir`]) || 0;
                if (!mockGame.blocks.some(b => b.x === x && b.y === y)) {
                    mockGame.blocks.push({ x, y, dir, type: 'PRISM' });
                }
            }
        }
        mockGame.map.push(row);
    }

    // Calculate bends and distances for editor preview
    for (let c of mockGame.conveyors) {
        c.inDir = null;
        c.beltDist = undefined;
        for (let other of mockGame.conveyors) {
            if (other === c) continue;
            let ox = other.x, oy = other.y;
            if (other.dir === DIRS.RIGHT) ox++;
            else if (other.dir === DIRS.LEFT) ox--;
            else if (other.dir === DIRS.DOWN) oy++;
            else if (other.dir === DIRS.UP) oy--;
            if (ox === c.x && oy === c.y) { c.inDir = other.dir; break; }
        }
    }

    const chains = [];
    const tracePath = (c, d, chain) => {
        c.beltDist = d;
        chain.push(c);
        let nx = c.x, ny = c.y;
        if (c.dir === DIRS.RIGHT) nx++;
        else if (c.dir === DIRS.LEFT) nx--;
        else if (c.dir === DIRS.DOWN) ny++;
        else if (c.dir === DIRS.UP) ny--;
        const next = mockGame.conveyors.find(cv => cv.x === nx && cv.y === ny);
        if (next && next.beltDist === undefined) tracePath(next, d + 1, chain);
    };

    for (let c of mockGame.conveyors) {
        if (c.inDir === null && c.beltDist === undefined) {
            const chain = [];
            tracePath(c, 0, chain);
            chains.push(chain);
        }
    }
    for (let c of mockGame.conveyors) {
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
    // Link portals and shared limboSlot
    const channelSlots = new Map();
    for (let portal of mockGame.portals) {
        const target = mockGame.portals.find(p => p.channel === portal.channel && (p.x !== portal.x || p.y !== portal.y));
        if (target) {
            portal.targetX = target.x;
            portal.targetY = target.y;
            if (!channelSlots.has(portal.channel)) {
                channelSlots.set(portal.channel, { content: null });
            }
            portal.slot = channelSlots.get(portal.channel);
        }
    }

    window.game = mockGame;
    // Ensure spawn is a station
    if (!mockGame.chargingStations.some(s => s.x === mockGame.startPos.x && s.y === mockGame.startPos.y)) {
        mockGame.chargingStations.push({ ...mockGame.startPos });
    }
    mockGame.updateEnergy();
    mockGame.updateEmitters();
    
    // Setup graphic context seed
    Graphics.initLevelContext(mockGame);
}

function saveHistory() {
    const lvl = levelsData[currentLevelIdx];
    historyStack.push(JSON.parse(JSON.stringify({
        map: currentMap, 
        blocks: currentBlocksMap, 
        overlays: currentOverlayMap,
        dialogues: lvl.dialogues || {},
        zoneTriggers: lvl.zoneTriggers || []
    })));
    if (historyStack.length > 50) historyStack.shift();
}
function undo() {
    if (historyStack.length > 1) {
        historyStack.pop();
        const state = JSON.parse(JSON.stringify(historyStack[historyStack.length - 1]));
        currentMap = state.map;
        currentBlocksMap = state.blocks;
        currentOverlayMap = state.overlays;
        levelsData[currentLevelIdx].dialogues = state.dialogues;
        levelsData[currentLevelIdx].zoneTriggers = state.zoneTriggers;
        updateDialogueManager();
        updateTriggerManagerList();
        rebuildMock();
    }
}

function getGridPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX / 32);
    const y = Math.floor((e.clientY - rect.top) * scaleY / 32);
    return {x: Math.max(0, Math.min(currentMap[0].length - 1, x)), y: Math.max(0, Math.min(currentMap.length - 1, y))};
}

function getNextRotation(c) {
    // Wires
    if (c === 'H') return 'V';
    if (c === 'V') return 'H';
    // Corners
    if (c === 'L') return 'J';
    if (c === 'J') return 'C';
    if (c === 'C') return 'F';
    if (c === 'F') return 'L';
    // Junctions
    if (c === 'u') return 'r';
    if (c === 'r') return 'd';
    if (c === 'd') return 'l';
    if (c === 'l') return 'u';
    // Amplifiers (Blocks)
    if (c === '>') return 'v';
    if (c === 'v') return '<';
    if (c === '<') return '^';
    if (c === '^') return '>';
    // Conveyors
    if (c === '(') return '[';
    if (c === '[') return ')';
    if (c === ')') return ']';
    if (c === ']') return '(';
    if (c === 'E') return 'E';
    if (c === 'M') return 'M';
    // Gravity
    if (c === 'n') return 'e';
    if (c === 'e') return 's';
    if (c === 's') return 'w';
    if (c === 'w') return 'n';
    return c;
}

function setupEvents() {
    // TEST BUTTON - HIGHEST PRIORITY
    const btnTest = document.getElementById('btn-test');
    if (btnTest) btnTest.onclick = startTest;

    document.getElementById('check-editor-music').onchange = (e) => {
        if (isTestMode) {
            if (e.target.checked) AudioSys.playGameMusic();
            else AudioSys.stopGameMusic();
        }
    };

    document.getElementById('lvl-name').oninput = () => {
        levelsData[currentLevelIdx].name = document.getElementById('lvl-name').value;
        updateLevelList();
    };
    document.getElementById('lvl-name').onchange = rebuildMock;
    document.getElementById('lvl-battery').onchange = rebuildMock;
    document.getElementById('lvl-timer').onchange = rebuildMock;
    
    document.getElementById('btn-new').onclick = () => {
        const w = parseInt(document.getElementById('map-w').value) || 20;
        const h = parseInt(document.getElementById('map-h').value) || 15;
        levelsData.push({ name: "NEW LEVEL", time: 30, map: Array(h).fill(" ".repeat(w)) });
        loadLevel(levelsData.length - 1);
        updateLevelList();
    };

    document.getElementById('layer-events').onclick = () => setLayer('events');

    document.getElementById('prop-dialogue-text').oninput = (e) => {
        if (editTargets.length === 0) return;
        const lvl = levelsData[currentLevelIdx];
        if (!lvl.dialogues) lvl.dialogues = {};
        for (const target of editTargets) {
            const key = `${target.x},${target.y}`;
            if (!lvl.dialogues[key]) lvl.dialogues[key] = { trigger: 'walk', icon: 'central', autoDismiss: true, lockPlayer: true, dismissDelay: 1500 };
            lvl.dialogues[key].text = e.target.value;
        }
    };
    document.getElementById('prop-dialogue-icon').onchange = (e) => {
        if (editTargets.length === 0) return;
        const lvl = levelsData[currentLevelIdx];
        for (const target of editTargets) {
            const key = `${target.x},${target.y}`;
            if (lvl.dialogues && lvl.dialogues[key]) lvl.dialogues[key].icon = e.target.value;
        }
    };
    document.getElementById('prop-dialogue-trigger').onchange = (e) => {
        if (editTargets.length === 0) return;
        const lvl = levelsData[currentLevelIdx];
        for (const target of editTargets) {
            const key = `${target.x},${target.y}`;
            if (lvl.dialogues && lvl.dialogues[key]) lvl.dialogues[key].trigger = e.target.value;
        }
    };
    document.getElementById('prop-dialogue-autodismiss').onchange = (e) => {
        if (editTargets.length === 0) return;
        const lvl = levelsData[currentLevelIdx];
        for (const target of editTargets) {
            const key = `${target.x},${target.y}`;
            if (lvl.dialogues && lvl.dialogues[key]) lvl.dialogues[key].autoDismiss = e.target.checked;
        }
    };
    document.getElementById('prop-dialogue-delay').oninput = (e) => {
        if (editTargets.length === 0) return;
        const lvl = levelsData[currentLevelIdx];
        const val = parseInt(e.target.value) || 1500;
        for (const target of editTargets) {
            const key = `${target.x},${target.y}`;
            if (lvl.dialogues && lvl.dialogues[key]) lvl.dialogues[key].dismissDelay = val;
        }
    };
    document.getElementById('prop-dialogue-lockplayer').onchange = (e) => {
        if (editTargets.length === 0) return;
        const lvl = levelsData[currentLevelIdx];
        for (const target of editTargets) {
            const key = `${target.x},${target.y}`;
            if (lvl.dialogues && lvl.dialogues[key]) lvl.dialogues[key].lockPlayer = e.target.checked;
        }
    };

    document.getElementById('btn-new-chapter').onclick = () => {
        chaptersData.push({ name: "NOVO CAPÍTULO", levels: [] });
        currentChapterIdx = chaptersData.length - 1;
        updateChapterList();
        updateLevelList();
    };

    document.getElementById('prop-amps').oninput = (e) => {
        if (editTargets.length === 0) return;
        const val = parseInt(e.target.value) || 1;
        for (const target of editTargets) {
            const char = currentMap[target.y][target.x];
            if (char === 'T' || (char >= '1' && char <= '9')) {
                currentMap[target.y][target.x] = val.toString();
            }
        }
        saveHistory();
        rebuildMock();
    };

    document.getElementById('prop-channel').oninput = (e) => {
        if (editTargets.length === 0) return;
        const chan = parseInt(e.target.value);
        if (isNaN(chan)) return;
        const lvl = levelsData[currentLevelIdx];
        if (!lvl.links) lvl.links = {};
        for (const target of editTargets) {
            lvl.links[`${target.x},${target.y}`] = chan;
        }
        saveHistory();
        rebuildMock();
    };

    document.getElementById('prop-portal-color').oninput = (e) => {
        if (editTargets.length === 0) return;
        const color = e.target.value;
        const lvl = levelsData[currentLevelIdx];
        if (!lvl.links) lvl.links = {};
        
        // Synchronize color for ALL portals in the same channels as the selected ones
        const affectedChannels = new Set();
        for (const target of editTargets) {
            const chan = lvl.links[`${target.x},${target.y}`] || 0;
            affectedChannels.add(chan);
            lvl.links[`${target.x},${target.y}_color`] = color;
        }

        // Apply to all other tiles on the map with the same channels
        for (let y = 0; y < currentMap.length; y++) {
            for (let x = 0; x < currentMap[y].length; x++) {
                const char = currentMap[y][x];
                const oChar = currentOverlayMap[y][x];
                if (char === 'O' || oChar === 'O') {
                    const chan = lvl.links[`${x},${y}`] || 0;
                    if (affectedChannels.has(chan)) {
                        lvl.links[`${x},${y}_color`] = color;
                    }
                }
            }
        }

        saveHistory();
        rebuildMock();
    };
    
    document.getElementById('btn-clear-channel').onclick = () => {
        if (editTargets.length === 0) return;
        const lvl = levelsData[currentLevelIdx];
        if (!lvl.links) return;
        
        for (const target of editTargets) {
            clearLinksAt(target.x, target.y);
        }
        
        saveHistory();
        rebuildMock();
        updateChannelGrid();
        
        // Update UI val
        document.getElementById('prop-channel').value = 0;
        document.getElementById('prop-channel-val').innerText = '0';
    };

    function clearLinksAt(x, y) {
        const lvl = levelsData[currentLevelIdx];
        if (!lvl.links) return;
        const key = `${x},${y}`;
        delete lvl.links[key];
        delete lvl.links[`${key}_behavior`];
        delete lvl.links[`${key}_init`];
        delete lvl.links[`${key}_dir`];
        delete lvl.links[`${key}_color`];
    }

    function updateChannelGrid() {
        const grid = document.getElementById('channel-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const lvl = levelsData[currentLevelIdx];
        const currentChan = parseInt(document.getElementById('prop-channel').value) || 0;
        
        // Scan level for used channels
        const usedChannels = new Set();
        if (lvl.links) {
            for (const key in lvl.links) {
                // Ignore behavior/init/dir keys, just look for the coordinates that store the channel
                if (!key.endsWith('_init') && !key.endsWith('_behavior') && !key.endsWith('_dir')) {
                    const val = parseInt(lvl.links[key]);
                    if (!isNaN(val)) usedChannels.add(val);
                }
            }
        }

        for (let i = 0; i < 30; i++) {
            const cell = document.createElement('div');
            cell.className = 'chan-cell';
            if (i === currentChan) cell.classList.add('active');
            if (usedChannels.has(i)) cell.classList.add('in-use');
            cell.innerText = i;
            cell.onclick = (e) => {
                e.stopPropagation();
                document.getElementById('prop-channel').value = i;
                document.getElementById('prop-channel-val').innerText = i;
                // Trigger the oninput manually to apply to all selected targets
                document.getElementById('prop-channel').dispatchEvent(new Event('input'));
                updateChannelGrid(); // Re-highlight
            };
            cell.onmouseenter = () => {
                hoveredChannel = i;
            };
            cell.onmouseleave = () => {
                hoveredChannel = null;
            };
            grid.appendChild(cell);
        }
        document.getElementById('prop-channel-val').innerText = currentChan;
        document.getElementById('prop-channel-usage').innerText = usedChannels.has(currentChan) ? 'Em uso' : 'Livre';
    }

    document.getElementById('prop-toggle').onchange = (e) => {
        if (editTargets.length === 0) return;
        const val = e.target.checked;
        const lvl = levelsData[currentLevelIdx];
        if (!lvl.links) lvl.links = {};
        for (const target of editTargets) {
            lvl.links[`${target.x},${target.y}_init`] = val;
        }
        saveHistory();
        rebuildMock();
    };

    document.getElementById('prop-behavior').onchange = (e) => {
        if (editTargets.length === 0) return;
        const behavior = e.target.value;
        const lvl = levelsData[currentLevelIdx];
        if (!lvl.links) lvl.links = {};
        for (const target of editTargets) {
            const char = [currentBlocksMap[target.y][target.x], currentOverlayMap[target.y][target.x], currentMap[target.y][target.x]].find(c => c !== ' ');
            if (char === 'E' || char === 'M') {
                lvl.links[`${target.x},${target.y}_dir`] = parseInt(behavior);
            } else {
                lvl.links[`${target.x},${target.y}_behavior`] = behavior;
            }
        }
        
        // Refresh panel visibility
        if (editTargets[0].char !== 'E') {
            document.getElementById('prop-toggle-container').style.display = (behavior === 'TOGGLE') ? 'flex' : 'none';
        }
        
        saveHistory();
        rebuildMock();
    };
    
    document.getElementById('btn-save').onclick = async () => {
        // Reorder levels based on chapters
        const orderedLevels = [];
        const newChapters = JSON.parse(JSON.stringify(chaptersData));
        let nextIdx = 0;

        // Process levels in chapters
        newChapters.forEach(chap => {
            const newLvlIndices = [];
            chap.levels.forEach(oldIdx => {
                orderedLevels.push(levelsData[oldIdx]);
                newLvlIndices.push(nextIdx++);
            });
            chap.levels = newLvlIndices;
        });

        // Add levels NOT in any chapter
        levelsData.forEach((lvl, i) => {
            const isInAnyChapter = chaptersData.some(c => c.levels.includes(i));
            if (!isInAnyChapter) {
                orderedLevels.push(lvl);
                nextIdx++;
            }
        });

        const payload = {
            levels: orderedLevels,
            chapters: newChapters
        };

        try {
            const resp = await fetch('http://localhost:3001/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const res = await resp.json();
            if (res.status === 'ok') {
                const btn = document.getElementById('btn-save');
                const oldTxt = btn.innerText;
                btn.innerText = "✅ SALVO E REORDENADO!";
                btn.style.borderColor = "#00ff9f";
                
                // Update local state to match the newly ordered list
                const oldCurrentLvl = levelsData[currentLevelIdx];
                levelsData = orderedLevels;
                chaptersData = newChapters;
                
                // Find where our current level ended up
                currentLevelIdx = levelsData.indexOf(oldCurrentLvl);
                if (currentLevelIdx === -1) currentLevelIdx = 0;
                
                updateChapterList();
                updateLevelList();
                
                setTimeout(() => { btn.innerText = oldTxt; btn.style.borderColor = ""; }, 2000);
            } else {
                showModal("Erro ao salvar: " + res.message, null, false);
            }
        } catch (err) {
            showModal("Servidor local não encontrado! Rode o 'rodar_editor.bat' para habilitar o salvamento automático.", null, false);
            console.error(err);
        }
    };

    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.onclick = () => setTool(btn.id.replace('tool-', ''));
    });

    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.onclick = () => setLayer(btn.id.replace('layer-', ''));
    });

    window.addEventListener('keydown', (e) => {
        if (isTestMode) {
            handleTestInput(e);
            return;
        }

        if (e.key === 'Escape') {
            document.getElementById('floating-props').style.display = 'none';
            editTargets = [];
        }
        if (e.ctrlKey && e.key === 'z') { undo(); e.preventDefault(); }
        if (e.ctrlKey && e.key === 'c') { copySelection(); e.preventDefault(); }
        if (e.ctrlKey && e.key === 'v') { pasteSelection(); e.preventDefault(); }

        // Layer Navigation (Cycle)
        const layers = ['base', 'overlays', 'blocks'];
        let lIdx = layers.indexOf(activeLayer);
        if (e.key.toLowerCase() === 'q') {
            lIdx = (lIdx - 1 + layers.length) % layers.length;
            setLayer(layers[lIdx]);
        } else if (e.key.toLowerCase() === 'e') {
            lIdx = (lIdx + 1) % layers.length;
            setLayer(layers[lIdx]);
        }
    });

    canvas.onwheel = (e) => {
        e.preventDefault();
        const tiles = getAvailableTiles();
        let idx = tiles.indexOf(selectedTile);
        if (idx === -1) idx = 0;
        
        if (e.deltaY > 0) idx = (idx + 1) % tiles.length;
        else idx = (idx - 1 + tiles.length) % tiles.length;
        
        selectedTile = tiles[idx];
        buildPalette();
        if (currentTool === 'eraser' || currentTool === 'select') setTool('brush');
    };

    canvas.onmousedown = (e) => {
        const p = getGridPos(e);
        
        // MIDDLE CLICK (Button 1) -> ROTATION or DIALOGUE EDITOR
        if (e.button === 1) {
            e.preventDefault();
            
            // PRIORITY: DIALOGUE EDITOR
            const lvl = levelsData[currentLevelIdx];
            if (lvl.dialogues && lvl.dialogues[`${p.x},${p.y}`]) {
                switchTab('tab-dialogues');
                const card = document.getElementById(`diag-card-${p.x}-${p.y}`);
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.style.borderColor = '#00ff9f';
                    setTimeout(() => card.style.borderColor = '#333', 2000);
                }
                return;
            }

            // FALLBACK: ROTATION (Existing logic)
            if (currentTool === 'select') {
                let targets = [];
                let inSelection = false;
                
                // Check if p is inside active selection
                if (selectionStart && selectionEnd) {
                    const x1 = Math.min(selectionStart.x, selectionEnd.x), x2 = Math.max(selectionStart.x, selectionEnd.x);
                    const y1 = Math.min(selectionStart.y, selectionEnd.y), y2 = Math.max(selectionStart.y, selectionEnd.y);
                    if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) inSelection = true;
                    
                    if (inSelection) {
                        for (let y = y1; y <= y2; y++) {
                            for (let x = x1; x <= x2; x++) {
                                // Scan all maps for interactive chars
                                const chars = [currentBlocksMap[y][x], currentOverlayMap[y][x], currentMap[y][x]];
                                for (let c of chars) {
                                    if (c === 'T' || (c >= '1' && c <= '9') || c === 'D' || c === '_' || c === 'P' || c === '?' || c === 'E' || ['(', ')', '[', ']'].includes(c)) {
                                        targets.push({x, y, char: c});
                                        break; 
                                    }
                                }
                            }
                        }
                    }
                }

                // If not in selection or selection empty, just target the clicked cell
                if (!inSelection || targets.length === 0) {
                    const checkLayers = [currentBlocksMap, currentOverlayMap, currentMap];
                    for (let map of checkLayers) {
                        const char = map[p.y][p.x];
                        if (char === 'T' || (char >= '1' && char <= '9') || char === 'D' || char === '_' || char === 'P' || char === '?' || char === 'E' || char === 'M' || char === 'O' || ['(', ')', '[', ']'].includes(char)) {
                            targets.push({x: p.x, y: p.y, char});
                            break;
                        }
                    }
                }

                // Check for dialogues in the clicked tile
                const lvl = levelsData[currentLevelIdx];
                if (lvl.dialogues && lvl.dialogues[`${p.x},${p.y}`]) {
                    targets.push({x: p.x, y: p.y, isDialogue: true});
                }

                if (targets.length > 0) {
                    editTargets = targets;
                    const primary = targets[0]; 
                    const panel = document.getElementById('floating-props');
                    const rect = canvas.getBoundingClientRect();
                    panel.style.display = 'block';
                    panel.style.left = `${rect.left + p.x * 32 - 40}px`;
                    panel.style.top = `${rect.top + p.y * 32 - 100}px`;

                    const typeLabel = targets.length > 1 ? `Múltiplos (${targets.length})` : 
                        (primary.char === 'D' ? 'Porta' : (primary.char === '?' ? 'Chão Quântico' : (primary.char === 'O' ? 'Portal Quântico' : (primary.char === 'E' ? 'Emissor (Canhão)' : (primary.char === 'M' ? 'Prisma' : (primary.char === 'T' || (primary.char >= '1' && primary.char <= '9') ? 'Núcleo Alvo' : (['(', ')', '[', ']'].includes(primary.char) ? 'Esteira' : 'Botão Industrial')))))));
                    
                    document.getElementById('prop-type').innerText = `Tipo: ${typeLabel}`;
                    
                    const hasCores = targets.some(t => t.char === 'T' || (t.char >= '1' && t.char <= '9'));
                    const hasLinkables = targets.some(t => t.char === 'D' || t.char === '_' || t.char === 'P' || t.char === '?' || t.char === 'E' || t.char === 'M' || t.char === 'O' || ['(', ')', '[', ']'].includes(t.char));
                    const hasButtons = targets.some(t => t.char === '_' || t.char === 'P');
                    const hasDialogue = targets.some(t => t.isDialogue);

                    document.getElementById('prop-amps').parentElement.style.display = hasCores ? 'flex' : 'none';
                    document.getElementById('prop-channel-container').style.display = (hasLinkables) ? 'flex' : 'none';
                    document.getElementById('prop-color-container').style.display = (primary.char === 'O') ? 'flex' : 'none';
                    document.getElementById('prop-behavior-container').style.display = (hasButtons || primary.char === 'E' || primary.char === 'M') ? 'flex' : 'none';
                    document.getElementById('prop-dialogue-container').style.display = hasDialogue ? 'flex' : 'none';
                    
                    const lvl = levelsData[currentLevelIdx];
                    if (hasCores) document.getElementById('prop-amps').value = primary.char === 'T' ? 1 : parseInt(primary.char);
                    if (hasLinkables) {
                        const chan = (lvl.links && lvl.links[`${primary.x},${primary.y}`]) || 0;
                        document.getElementById('prop-channel').value = chan;
                        updateChannelGrid();

                        // Load portal color
                        if (primary.char === 'O') {
                            const pCol = (lvl.links && lvl.links[`${primary.x},${primary.y}_color`]) || '#ffd700';
                            document.getElementById('prop-portal-color').value = pCol;
                        }
                    }
                    if (hasButtons || primary.char === 'E' || primary.char === 'M') {
                        const behaviorSelect = document.getElementById('prop-behavior');
                        if (primary.char === 'E' || primary.char === 'M') {
                            behaviorSelect.innerHTML = `
                                <option value="0">DIREITA (0)</option>
                                <option value="1">BAIXO (1)</option>
                                <option value="2">ESQUERDA (2)</option>
                                <option value="3">CIMA (3)</option>
                            `;
                            const dir = (lvl.links && lvl.links[`${primary.x},${primary.y}_dir`]) || 0;
                            behaviorSelect.value = dir;
                            
                            // SHOW INITIAL STATE TOGGLE FOR EMITTERS
                            if (primary.char === 'E') {
                                document.getElementById('prop-toggle-container').style.display = 'flex';
                                document.getElementById('prop-toggle').checked = (lvl.links && lvl.links[`${primary.x},${primary.y}_init`]) !== false;
                            } else {
                                document.getElementById('prop-toggle-container').style.display = 'none';
                            }
                        } else {
                            behaviorSelect.innerHTML = `
                                <option value="TIMER">🟡 TIMER (AMARELO)</option>
                                <option value="TOGGLE">🟢 TOGGLE (VERDE)</option>
                                <option value="PERMANENT">🔴 FIXO (VERMELHO)</option>
                                <option value="PRESSURE">🟣 PRESSÃO (ROXO)</option>
                            `;
                            const behavior = (lvl.links && lvl.links[`${primary.x},${primary.y}_behavior`]) || (primary.char === 'P' ? 'PRESSURE' : 'TIMER');
                            behaviorSelect.value = behavior;
                            document.getElementById('prop-toggle').checked = (lvl.links && lvl.links[`${primary.x},${primary.y}_init`]) === true;
                            document.getElementById('prop-toggle-container').style.display = (behavior === 'TOGGLE') ? 'flex' : 'none';
                        }
                    }
                    if (hasDialogue) {
                        const diag = lvl.dialogues[`${primary.x},${primary.y}`] || { text: "", icon: "central", trigger: "walk" };
                        document.getElementById('prop-dialogue-text').value = diag.text;
                        document.getElementById('prop-dialogue-icon').value = diag.icon;
                        document.getElementById('prop-dialogue-trigger').value = diag.trigger;
                        document.getElementById('prop-dialogue-autodismiss').checked = diag.autoDismiss !== false;
                        document.getElementById('prop-dialogue-delay').value = diag.dismissDelay || 1500;
                        document.getElementById('prop-dialogue-lockplayer').checked = diag.lockPlayer !== false;
                    }
                }
            } else {
                // NOT IN SELECT TOOL: ONLY ROTATION (NO PROPERTIES)
                let activeTarget = currentMap;
                if (activeLayer === 'overlays') activeTarget = currentOverlayMap;
                if (activeLayer === 'blocks') activeTarget = currentBlocksMap;
                
                const currentActive = activeTarget[p.y][p.x];
                const next = getNextRotation(currentActive);
                
                if (currentActive === 'E' || currentActive === 'M') {
                    const lvl = levelsData[currentLevelIdx];
                    if (!lvl.links) lvl.links = {};
                    let dir = (lvl.links[`${p.x},${p.y}_dir`] || 0);
                    lvl.links[`${p.x},${p.y}_dir`] = (dir + 1) % 4;
                    saveHistory();
                    rebuildMock();
                } else if (next !== currentActive) {
                    activeTarget[p.y][p.x] = next;
                    saveHistory();
                    rebuildMock();
                }
            }
            return;
        }

        document.getElementById('floating-props').style.display = 'none';
        editTargets = [];

        if (currentTool === 'select' || e.ctrlKey) {
            selectionStart = p; selectionEnd = p;
            isDrawing = true; return;
        }
        selectionStart = null; selectionEnd = null;
        isDrawing = true;
        startX = p.x; startY = p.y;
        
        // Drawing logic: ONLY affect active layer
        const isEraser = (e.button === 2 || currentTool === 'eraser');
        const char = isEraser ? ' ' : selectedTile;
        
        if (currentTool === 'brush' || isEraser) {
            // Clear links if we are erasing OR drawing something new over an existing tile
            const currentActive = (activeLayer === 'base' ? currentMap : (activeLayer === 'overlays' ? currentOverlayMap : currentBlocksMap))[p.y][p.x];
            if (isEraser || char !== currentActive) clearLinksAt(p.x, p.y);
            
            if (activeLayer === 'base') currentMap[p.y][p.x] = char;
            else if (activeLayer === 'overlays') currentOverlayMap[p.y][p.x] = char;
            else if (activeLayer === 'events') {
                const lvl = levelsData[currentLevelIdx];
                if (char === '💬' || (isEraser && lvl.dialogues && lvl.dialogues[`${p.x},${p.y}`])) {
                    if (!lvl.dialogues) lvl.dialogues = {};
                    if (isEraser) {
                        delete lvl.dialogues[`${p.x},${p.y}`];
                        updateDialogueManager();
                    } else {
                        if (!lvl.dialogues[`${p.x},${p.y}`]) {
                            lvl.dialogues[`${p.x},${p.y}`] = { text: "Nova fala...", icon: "central", trigger: "walk", autoDismiss: true, lockPlayer: true, dismissDelay: 1500 };
                        }
                        switchTab('tab-dialogues');
                        updateDialogueManager();
                        // Scroll to the card
                        setTimeout(() => {
                            const card = document.getElementById(`diag-card-${p.x}-${p.y}`);
                            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 50);
                    }
                } else if (char === '⚡' || (isEraser && lvl.zoneTriggers && lvl.zoneTriggers.some(t => t.x === p.x && t.y === p.y))) {
                    if (!lvl.zoneTriggers) lvl.zoneTriggers = [];
                    if (isEraser) {
                        lvl.zoneTriggers = lvl.zoneTriggers.filter(t => t.x !== p.x || t.y !== p.y);
                        updateTriggerManagerList();
                    } else {
                        if (!lvl.zoneTriggers.some(t => t.x === p.x && t.y === p.y)) {
                            lvl.zoneTriggers.push({ x: p.x, y: p.y, type: 'blackout', action: 'activate', radius: 0, oneShot: true });
                        }
                        switchTab('tab-triggers');
                        updateTriggerManagerList();
                    }
                }
            }
            else currentBlocksMap[p.y][p.x] = char;
            rebuildMock();
        }
    };

    // Disable middle click scroll and right click menu
    canvas.onauxclick = (e) => { if(e.button === 1) e.preventDefault(); };
    canvas.oncontextmenu = (e) => { e.preventDefault(); };
    
    canvas.onmousemove = (e) => {
        const p = getGridPos(e); hoverPos = p;
        let target = currentMap;
        if (activeLayer === 'overlays') target = currentOverlayMap;
        if (activeLayer === 'blocks') target = currentBlocksMap;
        document.getElementById('overlay-ui').innerText = `Coord: ${p.x},${p.y} | Sym: ${target[p.y][p.x]}`;
        
        if (isDrawing && (currentTool === 'select' || e.ctrlKey)) {
            selectionEnd = p; return;
        }
        if (isDrawing && (currentTool === 'brush' || currentTool === 'eraser')) {
            const isEraser = (e.buttons & 2 || currentTool === 'eraser');
            const char = isEraser ? ' ' : selectedTile;
            
            const currentActive = (activeLayer === 'base' ? currentMap : (activeLayer === 'overlays' ? currentOverlayMap : currentBlocksMap))[p.y][p.x];
            if (isEraser || char !== currentActive) clearLinksAt(p.x, p.y);

            if (activeLayer === 'base') currentMap[p.y][p.x] = char;
            else if (activeLayer === 'overlays') currentOverlayMap[p.y][p.x] = char;
            else currentBlocksMap[p.y][p.x] = char;
            rebuildMock();
        }
    };
    
    canvas.onmouseup = (e) => {
        if (!isDrawing) return;
        const p = getGridPos(e);
        const char = (e.button === 2 || currentTool === 'eraser') ? ' ' : selectedTile;
        
        if (currentTool === 'rect') {
            const x1 = Math.min(startX, p.x), x2 = Math.max(startX, p.x);
            const y1 = Math.min(startY, p.y), y2 = Math.max(startY, p.y);
            let target = currentMap;
            if (activeLayer === 'overlays') target = currentOverlayMap;
            if (activeLayer === 'blocks') target = currentBlocksMap;
            for(let y=y1; y<=y2; y++) for(let x=x1; x<=x2; x++) target[y][x] = char;
        } else if (currentTool === 'line') {
            let target = currentMap;
            if (activeLayer === 'overlays') target = currentOverlayMap;
            if (activeLayer === 'blocks') target = currentBlocksMap;
            if (Math.abs(p.x - startX) > Math.abs(p.y - startY)) {
                for(let x=Math.min(startX, p.x); x<=Math.max(startX, p.x); x++) target[startY][x] = char;
            } else {
                for(let y=Math.min(startY, p.y); y<=Math.max(startY, p.y); y++) target[y][startX] = char;
            }
        }
        isDrawing = false;
        saveHistory();
        rebuildMock();
    };
}

function copySelection() {
    if (!selectionStart || !selectionEnd) return;
    const x1 = Math.min(selectionStart.x, selectionEnd.x), x2 = Math.max(selectionStart.x, selectionEnd.x);
    const y1 = Math.min(selectionStart.y, selectionEnd.y), y2 = Math.max(selectionStart.y, selectionEnd.y);
    let target = currentMap;
    if (activeLayer === 'overlays') target = currentOverlayMap;
    if (activeLayer === 'blocks') target = currentBlocksMap;
    clipboard = [];
    for(let y=y1; y<=y2; y++) {
        let row = [];
        for(let x=x1; x<=x2; x++) row.push(target[y][x]);
        clipboard.push(row);
    }
}

function pasteSelection() {
    if (!clipboard) return;
    let target = currentMap;
    if (activeLayer === 'overlays') target = currentOverlayMap;
    if (activeLayer === 'blocks') target = currentBlocksMap;
    for(let y=0; y<clipboard.length; y++) {
        for(let x=0; x<clipboard[y].length; x++) {
            const tx = hoverPos.x + x, ty = hoverPos.y + y;
            if (tx < currentMap[0].length && ty < currentMap.length) target[ty][tx] = clipboard[y][x];
        }
    }
    saveHistory(); rebuildMock();
}

function drawChar(x, y, c, alpha = 1.0, isSecondLayer = false) {
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // 1. Draw Static Layer (Only if it's the base layer)
    if (!isSecondLayer) {
        if (c === '#') {
            Graphics.drawCeiling(x, y);
            ctx.restore();
            return; 
        } else if (c === 'W') {
            Graphics.drawWallFace(x, y);
            ctx.restore();
            return;
        } else if (c === '*') {
            let mask = 0;
            const map = currentMap;
            if (y > 0 && map[y-1][x] === '*') mask |= 1;
            if (x < map[0].length - 1 && map[y][x+1] === '*') mask |= 2;
            if (y < map.length - 1 && map[y+1][x] === '*') mask |= 4;
            if (x > 0 && map[y][x-1] === '*') mask |= 8;
            Graphics.drawHole(x, y, mask);
        } else {
            Graphics.drawFloor(x, y);
        }
    }
    
    // Draw entities based on char
    if (c === '@') {
        const powered = mockGame.poweredStations.has(`${x},${y}`);
        Graphics.drawChargingStation(x, y, powered, animFrame);
        Graphics.drawRobot(x, y, mockGame.player.dir, animFrame);
    } else if (c === 'K') {
        const powered = mockGame.poweredStations.has(`${x},${y}`);
        Graphics.drawChargingStation(x, y, powered, animFrame);
    } else if (c === 'B') {
        Graphics.drawCore(x, y, 'B', true);
    } else if (c === 'X') {
        Graphics.drawCore(x, y, 'X', true);
    } else if (c === 'Z') {
        Graphics.drawBrokenCore(x, y, animFrame);
    } else if (c === 'T' || (c >= '1' && c <= '9')) {
        const d = mockGame.poweredTargets.get(`${x},${y}`) || { charge: 0, contaminated: false };
        const req = c === 'T' ? 1 : parseInt(c);
        Graphics.drawCore(x, y, c, d.charge >= req, req, d.charge, d.contaminated);
    } else if (['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r'].includes(c)) {
        const flow = mockGame.poweredWires.get(`${x},${y}`) || null;
        Graphics.drawWire(x, y, c, flow, animFrame);
    } else if (c === 'S') {
        Graphics.drawScrap(x, y, animFrame);
    } else if (['>', '<', '^', 'v', 'y', 'p'].includes(c)) {
        const flow = mockGame.poweredBlocks.get(`${x},${y}`) || null;
        let dir = 0; if(c==='v') dir=1; if(c==='<') dir=2; if(c==='^') dir=3;
        let phase = null;
        if (c === 'y') phase = 'SOLAR';
        else if (c === 'p') phase = 'LUNAR';
        Graphics.drawBlock(x, y, dir * Math.PI / 2, flow, 0, dir, 'NORMAL', 0, phase, mockGame.isSolarPhase);
    } else if (['(', ')', '[', ']'].includes(c)) {
        let dir = 2; if(c===')') dir=0; if(c==='[') dir=3; if(c===']') dir=1;
        // Find conveyor in mockGame to get inDir, beltDist and beltLength
        const conv = (window.game && window.game.conveyors) ? window.game.conveyors.find(cv => cv.x === x && cv.y === y) : null;
        const isActive = (window.game && conv) ? window.game.isConveyorActive(conv) : true;
        const overHole = (window.game && window.game.map[y] && window.game.map[y][x] === '*');
        Graphics.drawConveyor(x, y, dir, animFrame, conv ? conv.inDir : null, conv ? conv.beltDist : 0, conv ? conv.beltLength : 10, isActive, overHole);
    } else if (c === 'D') {
        const door = mockGame.doors ? mockGame.doors.find(d => d.x === x && d.y === y) : null;
        if (door) Graphics.drawDoor(x, y, door.state, door.error, animFrame, door.orientation, door.pair ? door.pair.side : null);
        else Graphics.drawDoor(x, y, 'CLOSED', false, 0);
    } else if (c === '_' || c === 'P') {
        const btn = mockGame.buttons ? mockGame.buttons.find(b => b.x === x && b.y === y) : null;
        if (btn) Graphics.drawButton(x, y, btn.isPressed, btn.behavior, btn.charge || 0);
        else Graphics.drawButton(x, y, false, (c === 'P' ? 'PRESSURE' : 'TIMER'), 0);
    } else if (c === '!') {
        Graphics.drawSingularitySwitcher(x, y, mockGame.isSolarPhase, animFrame, 0, mockGame.map, 0);
    } else if (c === 'E') {
        const emitter = mockGame.emitters ? mockGame.emitters.find(e => e.x === x && e.y === y) : null;
        const dir = emitter ? emitter.dir : 0;
        Graphics.drawEmitter(x, y, dir, animFrame);
    } else if (c === '?') {
        const qf = mockGame.quantumFloors ? mockGame.quantumFloors.find(q => q.x === x && q.y === y) : null;
        Graphics.drawQuantumFloor(x, y, qf ? qf.active : true, animFrame, qf ? qf.flashTimer : 0, qf ? qf.pulseIntensity : 1.0, qf ? qf.entrySide : null, qf ? qf.whiteGlow : 0);
    } else if (c === 'Q') {
        const cat = mockGame.catalysts ? mockGame.catalysts.find(q => q.x === x && q.y === y) : null;
        Graphics.drawCatalyst(x, y, cat ? cat.active : false, animFrame);
    } else if (c === 'M') {
        const block = mockGame.blocks ? mockGame.blocks.find(b => b.x === x && b.y === y) : null;
        const dir = block ? block.dir : 0;
        Graphics.drawBlock(x, y, dir * (Math.PI / 2), null, 0, dir, (c === 'M' ? 'PRISM' : 'NORMAL'), 0);
    } else if (c === 'G') {
        const isHit = (mockGame.glassWallsHit && mockGame.glassWallsHit.has(`${x},${y}`)) || true; // Always on in editor for effect
        Graphics.drawGlassWall(x, y, animFrame, isHit);
    } else if (c === 'O') {
        const portal = mockGame.portals ? mockGame.portals.find(p => p.x === x && p.y === y) : null;
        const channel = portal ? portal.channel : 0;
        const color = portal ? portal.color : '#ffd700';
        const hasBlock = portal && portal.slot && portal.slot.content;
        Graphics.drawPortal(x, y, channel, animFrame, color);
        if (hasBlock) {
            Graphics.drawLimboHologram(x, y, portal.slot.content, animFrame);
        }
    } else if (['n', 's', 'e', 'w'].includes(c)) {
        let d = DIRS.UP;
        if (c === 's') d = DIRS.DOWN;
        if (c === 'e') d = DIRS.RIGHT;
        if (c === 'w') d = DIRS.LEFT;
        Graphics.drawGravityButton(x, y, d, animFrame, 0, false);
    } else if (c === '💬') {
        ctx.fillStyle = '#00ff9f';
        ctx.font = '20px VT323';
        ctx.textAlign = 'center';
        ctx.fillText('💬', x * 32 + 16, y * 32 + 24);
    } else if (c === '⚡') {
        ctx.fillStyle = '#ffcc00';
        ctx.font = '20px VT323';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10; ctx.shadowColor = '#ffcc00';
        ctx.fillText('⚡', x * 32 + 16, y * 32 + 24);
        ctx.shadowBlur = 0;
    }

    ctx.restore();
}

function renderLoop() {
    if (isTestMode) return requestAnimationFrame(renderLoop);
    if (!mockGame) return requestAnimationFrame(renderLoop);
    
    Graphics.clear();
    
    // 1. Draw Background
    
    const h = currentMap.length;
    const w = currentMap[0].length;
    
    // 2. Draw ALL layers in Passes (Matches main.js logic for occlusion)
    
    // PASS 1: Floor and Base Char (not walls)
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const baseC = currentMap[y][x];
            if (baseC !== '#' && baseC !== 'W') {
                drawChar(x, y, baseC);
            } else {
                Graphics.drawFloor(x, y);
            }
        }
    }

    // PASS 2: Overlays
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const oc = currentOverlayMap[y][x];
            if (oc !== ' ') drawChar(x, y, oc, 1.0, true);
        }
    }



    // PASS 4: In-Phase Blocks
    const ghostBlocks = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const bc = currentBlocksMap[y][x];
            if (bc === ' ') continue;
            
            const isOutOfPhase = (bc === 'y' && !mockGame.isSolarPhase) || (bc === 'p' && mockGame.isSolarPhase);
            if (isOutOfPhase) {
                ghostBlocks.push({x, y, c: bc});
                continue;
            }
            drawChar(x, y, bc, 1.0, true);
        }
    }

    // PASS 3: Lasers (Above blocks)
    if (mockGame.emitters) {
        for (const e of mockGame.emitters) {
            Graphics.drawLaser(e, animFrame);
        }
    }

    // PASS 5: Structural Walls/Ceiling (Opaque)
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const baseC = currentMap[y][x];
            if (baseC === '#' || baseC === 'W') {
                drawChar(x, y, baseC);
            }
        }
    }

    // PASS 5.5: Glass Walls (Above Lasers)
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (currentMap[y][x] === 'G') {
                drawChar(x, y, 'G', 1.0, true);
            }
        }
    }

    // PASS 6: Dialogue Icons
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const lvl = levelsData[currentLevelIdx];
            if (lvl.dialogues && lvl.dialogues[`${x},${y}`]) {
                ctx.save();
                ctx.fillStyle = '#00ff9f';
                ctx.font = '20px VT323';
                ctx.textAlign = 'center';
                ctx.shadowBlur = 10; ctx.shadowColor = '#00ff9f';
                ctx.fillText('💬', x * 32 + 16, y * 32 + 24);
                ctx.restore();
            }
            // PASS 6.5: Zone Triggers
            const hasTrigger = lvl.zoneTriggers && lvl.zoneTriggers.some(t => t.x === x && t.y === y);
            if (hasTrigger) {
                ctx.save();
                ctx.fillStyle = '#ffcc00';
                ctx.font = '20px VT323';
                ctx.textAlign = 'center';
                ctx.shadowBlur = 10; ctx.shadowColor = '#ffcc00';
                ctx.fillText('⚡', x * 32 + 16, y * 32 + 24);
                ctx.restore();
            }
        }
    }

    // PASS 7: Ghost Blocks (Top Layer)
    for (const gb of ghostBlocks) {
        drawChar(gb.x, gb.y, gb.c, 1.0, true);
    }

    // 3. Draw Preview (Ghost Tile)
    if (!isDrawing && currentTool !== 'select') {
        const char = currentTool === 'eraser' ? ' ' : selectedTile;
        drawChar(hoverPos.x, hoverPos.y, char, 0.5);
    }

    // 4. Grid Overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 1;
    for(let x=0; x<=w*32; x+=32) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h*32); ctx.stroke(); }
    for(let y=0; y<=h*32; y+=32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w*32,y); ctx.stroke(); }

    // 5. Selection Overlay
    if (selectionStart && selectionEnd) {
        const x1 = Math.min(selectionStart.x, selectionEnd.x), x2 = Math.max(selectionStart.x, selectionEnd.x);
        const y1 = Math.min(selectionStart.y, selectionEnd.y), y2 = Math.max(selectionStart.y, selectionEnd.y);
        ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        ctx.strokeRect(x1 * 32, y1 * 32, (x2 - x1 + 1) * 32, (y2 - y1 + 1) * 32);
        ctx.setLineDash([]);
    }

    // 6. Draw Particles (Smoke/Sparks)
    Graphics.drawParticles();

    // 7. Channel Highlight (GODOT STYLE INSPECTOR)
    if (hoveredChannel !== null) {
        const lvl = levelsData[currentLevelIdx];
        if (lvl && lvl.links) {
            ctx.save();
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 4;
            const pulse = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
            ctx.globalAlpha = 0.4 + pulse * 0.5;
            
            for (const key in lvl.links) {
                if (!key.endsWith('_init') && !key.endsWith('_behavior')) {
                    if (parseInt(lvl.links[key]) === hoveredChannel) {
                        const [cx, cy] = key.split(',').map(Number);
                        // Pulse rect
                        ctx.strokeRect(cx * 32 + 1, cy * 32 + 1, 30, 30);
                        
                        // Inner fill
                        ctx.fillStyle = '#00f0ff';
                        ctx.globalAlpha = 0.1 * (0.5 + pulse * 0.5);
                        ctx.fillRect(cx * 32 + 2, cy * 32 + 2, 28, 28);
                        
                        // Label
                        ctx.globalAlpha = 1.0;
                        ctx.fillStyle = '#fff';
                        ctx.font = 'bold 12px VT323, monospace';
                        ctx.fillText(`CH:${hoveredChannel}`, cx * 32 + 4, cy * 32 + 14);
                    }
                }
            }
            ctx.restore();
        }
    }

    animFrame++;
    requestAnimationFrame(renderLoop);
}

// === TEST MODE ENGINE ===

function startTest() {
    // 1. Resume audio
    if (typeof audioCtx !== 'undefined' && audioCtx.state !== 'running') {
        audioCtx.resume();
    }

    if (document.getElementById('check-editor-music').checked) {
        AudioSys.playGameMusic();
    } else {
        AudioSys.stopGameMusic();
    }

    // 2. Capture EXACT current editor view
    const currentLvlData = levelsData[currentLevelIdx] || {};
    const lvl = {
        name: document.getElementById('lvl-name').value || "NÍVEL EM EDIÇÃO",
        time: parseInt(document.getElementById('lvl-battery').value) || 30,
        timer: parseInt(document.getElementById('lvl-timer').value) || 60,
        map: currentMap.map(row => row.join('')),
        blocks: currentBlocksMap.map(row => row.join('')),
        overlays: currentOverlayMap.map(row => row.join('')),
        links: JSON.parse(JSON.stringify(currentLvlData.links || {})),
        dialogues: JSON.parse(JSON.stringify(currentLvlData.dialogues || {})),
        startWithBlackout: document.getElementById('check-lvl-blackout').checked,
        zoneTriggers: JSON.parse(JSON.stringify(currentLvlData.zoneTriggers || []))
    };

    console.log("Iniciando Teste:", lvl.name);

    // 3. Prepare Environment
    isTestMode = true;
    document.getElementById('test-overlay').style.display = 'flex';
    
    // 4. Mock LEVELS BEFORE GameState
    if (!originalLevels) originalLevels = LEVELS;
    LEVELS = [lvl];
    
    // 5. Create and Force Load
    testGame = new GameState(null, true);
    window.game = testGame; // SET THIS BEFORE DIALOGUES
    
    testGame.levelIndex = 0;
    testGame.originalLevelIndex = currentLevelIdx;
    testGame.loadLevel(0); // Force load now that LEVELS is [lvl]
    testGame.checkDialogues('start');
    
    testGame.maxMoves = lvl.time;
    testGame.transitionState = 'NONE';
    testGame.transitionProgress = 0;
    
    // 6. Graphics Setup
    const testCanvas = document.getElementById('test-canvas');
    Graphics.init(testCanvas);
    Graphics.initLevelContext(testGame);
    
    testAnimFrame = 0;
    testLastTime = performance.now();
    requestAnimationFrame(testLoop);
}

function stopTest() {
    isTestMode = false;
    document.getElementById('test-overlay').style.display = 'none';
    
    // Restore Original Levels
    if (originalLevels) {
        LEVELS = originalLevels;
        originalLevels = null;
    }

    // Restore Editor context
    Graphics.init(canvas);
    window.game = mockGame;
    AudioSys.stopGameMusic();
}

function handleTestInput(e) {
    if (e.key === 'Escape') {
        stopTest();
        return;
    }

    if (testGame.state === 'PLAYING') {
        if (testGame.inputLocked) return;
        if (e.key === 'ArrowUp' || e.key === 'w') testGame.movePlayer(0, -1);
        else if (e.key === 'ArrowDown' || e.key === 's') testGame.movePlayer(0, 1);
        else if (e.key === 'ArrowLeft' || e.key === 'a') testGame.movePlayer(-1, 0);
        else if (e.key === 'ArrowRight' || e.key === 'd') testGame.movePlayer(1, 0);
        else if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'e' || e.key === 'E') testGame.interact();
        else if (e.key === 'Shift') testGame.toggleGrab();
        else if (e.key === 'z' || e.key === 'Z') testGame.doUndo();
        else if (e.key === 'r' || e.key === 'R') {
            if (rebootConfirmTimer) {
                clearTimeout(rebootConfirmTimer);
                rebootConfirmTimer = null;
                document.getElementById('test-notification').style.opacity = '0';
                Graphics.clearParticles();
                testGame.loadLevel(0); // Level 0 is our temporary test level
                testGame.transitionState = 'NONE';
                testGame.transitionProgress = 0;
            } else {
                document.getElementById('test-notification').style.opacity = '1';
                rebootConfirmTimer = setTimeout(() => {
                    rebootConfirmTimer = null;
                    document.getElementById('test-notification').style.opacity = '0';
                }, 2000);
            }
        }
    }
}

function testLoop(timestamp) {
    if (!isTestMode) return;

    const dt = timestamp - testLastTime;
    testLastTime = timestamp;
    testAnimFrame++;

    testGame.update();
    
    // Render
    Graphics.clear();
    const ctx = Graphics.ctx;
    
    // Center camera if map is larger than 640x480 (optional for editor test)
    ctx.save();
    ctx.translate(-Math.floor(testGame.camera.x), -Math.floor(testGame.camera.y));

    // Pass 1: Floor
    const h = testGame.map.length;
    const w = testGame.map[0].length;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const c = testGame.map[y][x];
            if (c === '*') {
                let mask = 0;
                if (y > 0 && testGame.map[y-1][x] === '*') mask |= 1;
                if (x < w - 1 && testGame.map[y][x+1] === '*') mask |= 2;
                if (y < h - 1 && testGame.map[y+1][x] === '*') mask |= 4;
                if (x > 0 && testGame.map[y][x-1] === '*') mask |= 8;
                Graphics.drawHole(x, y, mask);
            } else if (c !== '#' && c !== 'W') Graphics.drawFloor(x, y);
        }
    }

    // Entities (Simplified for test loop, reusing logic from main.js)
    for (const wr of testGame.wires) {
        const flow = testGame.poweredWires.get(`${wr.x},${wr.y}`) || null;
        Graphics.drawWire(wr.x, wr.y, wr.type, flow, testAnimFrame);
    }

    Graphics.drawTrails();
    for (const qf of testGame.quantumFloors) Graphics.drawQuantumFloor(qf.x, qf.y, qf.active, testAnimFrame, qf.flashTimer, qf.pulseIntensity, qf.entrySide, qf.whiteGlow);
    for (const btn of testGame.buttons) Graphics.drawButton(btn.x, btn.y, btn.isPressed, btn.behavior, btn.charge || 0);
    const isTestSliding = testGame && testGame.gravitySlidingDir !== null;
    for (const gb of testGame.gravityButtons) Graphics.drawGravityButton(gb.x, gb.y, gb.dir, testAnimFrame, gb.flashTimer, isTestSliding);
    for (const sw of testGame.singularitySwitchers) Graphics.drawSingularitySwitcher(sw.x, sw.y, testGame.isSolarPhase, testAnimFrame, sw.lightningTimer, testGame.map, sw.lightningSeed);

    for (const s of testGame.chargingStations) {
        const powered = testGame.poweredStations.has(`${s.x},${s.y}`);
        Graphics.drawChargingStation(s.x, s.y, powered, testAnimFrame);
    }
    for (const c of testGame.conveyors) {
        const isActive = testGame.isConveyorActive(c);
        const overHole = (testGame.map[c.y] && testGame.map[c.y][c.x] === '*');
        Graphics.drawConveyor(c.x, c.y, c.dir, testAnimFrame, c.inDir, c.beltDist, c.beltLength, isActive, overHole);
    }



    // Pass 1.8: Draw Doors (Drawn before walls/ceilings so they stay below them)
    for (const d of testGame.doors) {
        Graphics.drawDoor(d.x, d.y, d.state, d.error, testAnimFrame, d.orientation, d.pair ? d.pair.side : null, d.visualOpen);
    }

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const c = testGame.map[y][x];
            if (c === '#') Graphics.drawCeiling(x, y);
            else if (c === 'W') Graphics.drawWallFace(x, y);
            else if (c === 'G') {
                // Skip for now, draw after lasers
            }
            if (testGame.scrapPositions.has(`${x},${y}`)) Graphics.drawScrap(x, y, testAnimFrame);
        }
    }

    // Pass 2.02: Draw Emitters (Structures)
    for (const e of testGame.emitters) {
        Graphics.drawEmitter(e.x, e.y, e.dir, testAnimFrame);
    }

    // Pass 2.03: Draw Quantum Catalysts (Entity Loop)
    for (const cat of testGame.catalysts) {
        Graphics.drawCatalyst(cat.x, cat.y, cat.active, testAnimFrame);
    }

    // Pass 2.04 (Removed, moved to Top Layer)

    // Safety Pass: Draw from map if not in array (ensures visibility)
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (testGame.map[y][x] === 'Q' && !testGame.catalysts.some(c => c.x === x && c.y === y)) {
                Graphics.drawCatalyst(x, y, false, testAnimFrame);
            }
        }
    }

    for (const s of testGame.sources) Graphics.drawCore(s.x, s.y, 'B', true);
    for (const s of testGame.redSources) Graphics.drawCore(s.x, s.y, 'X', true);
    for (const t of testGame.targets) {
        const d = testGame.poweredTargets.get(`${t.x},${t.y}`) || { charge: 0, contaminated: false };
        Graphics.drawCore(t.x, t.y, 'T', d.charge >= t.required && !d.contaminated, t.required, d.charge, d.contaminated);
    }
    for (const bc of testGame.brokenCores) Graphics.drawBrokenCore(bc.x, bc.y, testAnimFrame);

    for (const b of testGame.blocks) {
        const power = testGame.poweredBlocks.get(`${b.x},${b.y}`) || null;
        const dist = Math.sqrt((b.x - b.visualX) ** 2 + (b.y - b.visualY) ** 2);
        const ph = b.phase || null;
        Graphics.drawBlock(b.visualX, b.visualY, b.visualAngle, power, dist, b.dir, b.type, b.fallTimer || 0, ph, testGame.isSolarPhase);
    }

    // Pass 2.06: Draw Lasers (Above blocks)
    for (const e of testGame.emitters) {
        Graphics.drawLaser(e, testAnimFrame);
    }

    // Pass 2.07: Draw Glass Walls (Above Lasers)
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (testGame.map[y][x] === 'G') {
                const isHit = testGame.glassWallsHit.has(`${x},${y}`);
                Graphics.drawGlassWall(x, y, testAnimFrame, isHit);
            }
        }
    }

    if (testGame.state !== 'GAMEOVER') {
        const vx = testGame.player.x - testGame.player.visualX;
        const vy = testGame.player.y - testGame.player.visualY;
        Graphics.drawRobot(testGame.player.visualX, testGame.player.visualY, testGame.player.dir, testAnimFrame, null, vx, vy, testGame.player.isDead, testGame.player.deathType, testGame.player.deathTimer, testGame.player.deathDir, testGame.player.isGrabbing);
    }

    for (const p of testGame.debris) Graphics.drawDebris(p);
    Graphics.drawParticles();
    
    // Pass 3.0: High-Layer Solar Portals (Glow over everything)
    for (const p of testGame.portals) {
        Graphics.drawPortal(p.x, p.y, p.channel, testAnimFrame, p.color);
    }
    for (const t of testGame.targets) {
        const d = testGame.poweredTargets.get(`${t.x},${t.y}`) || { charge: 0 };
        Graphics.drawCoreRequirement(t.x, t.y, t.required, d.charge);
    }

    ctx.restore();
    
    // Draw Blackout (Fog of War)
    Graphics.drawBlackout(testGame);
    
    // Draw HUD manually (editor doesn't use the HTML bars for test)
    updateTestUI();

    requestAnimationFrame(testLoop);
}

function updateBar(id, current, max) {
    const bar = document.getElementById(id);
    if (!bar) return;
    if (bar.children.length !== max) {
        bar.innerHTML = '';
        for (let i = 0; i < max; i++) {
            const seg = document.createElement('div');
            seg.className = 'segment';
            bar.appendChild(seg);
        }
    }
    for (let i = 0; i < bar.children.length; i++) {
        bar.children[i].classList.toggle('empty', i >= current);
    }
}

function updateTestUI() {
    const levelNameEl = document.getElementById('ui-level-name');
    if (levelNameEl) {
        const lvlName = document.getElementById('lvl-name').value || "NÍVEL DE TESTE";
        levelNameEl.innerText = lvlName.toUpperCase();
    }

    const timeEl = document.getElementById('ui-time');
    if (timeEl) {
        let min = Math.floor(testGame.time / 60);
        let sec = testGame.time % 60;
        timeEl.innerText = `${min.toString().padStart(2, '0')}:${sec < 10 ? '0' : ''}${sec}`;
    }

    const scoreEl = document.getElementById('ui-score');
    if (scoreEl) scoreEl.innerText = `${testGame.scrapCollected}/${testGame.totalScrap}`;

    updateBar('lives-bar', testGame.lives, 3);
    
    const maxMoves = testGame.maxMoves || 30;
    updateBar('energy-bar-seg', testGame.moves, maxMoves);
    document.getElementById('ui-power-count').innerText = testGame.moves.toString().padStart(2, '0');

    let totalReq = 0;
    let totalCurrent = 0;
    for (const t of testGame.targets) {
        totalReq += t.required;
        const data = testGame.poweredTargets.get(`${t.x},${t.y}`);
        totalCurrent += Math.min(t.required, data ? data.charge : 0);
    }
    updateBar('amps-bar', totalCurrent, totalReq);
}

function switchTab(tabId) {
    // 1. Update Tabs UI
    document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    const clickedTab = document.querySelector(`.sidebar-tab[onclick*="${tabId}"]`);
    if (clickedTab) clickedTab.classList.add('active');

    // 2. Update Content Panes
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    const target = document.getElementById(tabId);
    if (target) target.style.display = tabId === 'tab-dialogues' ? 'flex' : 'block';

    if (tabId === 'tab-dialogues') {
        updateDialogueManager();
    }
    if (tabId === 'tab-triggers') {
        updateTriggerManagerList();
    }
}

function updateDialogueManager() {
    const list = document.getElementById('dialogue-manager-list');
    if (!list) return;
    
    const lvl = levelsData[currentLevelIdx];
    list.innerHTML = '';

    if (!lvl.dialogues || Object.keys(lvl.dialogues).length === 0) {
        list.innerHTML = '<div style="color: #666; font-style: italic; text-align: center; margin-top: 20px;">Nenhum diálogo nesta fase.<br><br>Use a ferramenta de 💬 FALAS para adicionar.</div>';
        return;
    }

    const sortedKeys = Object.keys(lvl.dialogues).sort((a, b) => {
        const [ax, ay] = a.split(',').map(Number);
        const [bx, by] = b.split(',').map(Number);
        return ay !== by ? ay - by : ax - bx;
    });

    sortedKeys.forEach(key => {
        const rawData = lvl.dialogues[key];
        let eventConfig = {};
        let messages = [];

        if (Array.isArray(rawData)) {
            messages = rawData;
            eventConfig = {
                trigger: rawData[0]?.trigger || 'walk',
                radius: rawData[0]?.radius || 0,
                oneShot: rawData[0]?.oneShot !== false,
                lockPlayer: rawData[0]?.lockPlayer !== false,
                autoDismiss: rawData[0]?.autoDismiss !== false
            };
        } else if (rawData.messages) {
            messages = rawData.messages;
            eventConfig = rawData;
        } else {
            messages = [rawData];
            eventConfig = rawData;
        }

        const [x, y] = key.split(',');
        
        const card = document.createElement('div');
        card.id = `diag-card-${x}-${y}`;
        card.style.background = '#1a1a1a';
        card.style.border = '1px solid #333';
        card.style.borderRadius = '4px';
        card.style.padding = '10px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '8px';
        card.style.transition = 'border-color 0.3s';

        let messagesHtml = '';
        messages.forEach((diag, idx) => {
            messagesHtml += `
            <div class="diag-message-entry" style="border-left: 2px solid #333; padding-left: 8px; margin-bottom: 12px; position: relative;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-size: 10px; color: #555;">MENSAGEM #${idx + 1}</span>
                    ${messages.length > 1 ? `<button onclick="removeDialogueMessage('${key}', ${idx})" style="background: none; border: none; color: #ff0055; cursor: pointer; font-size: 10px; padding: 0 4px;">[REMOVER]</button>` : ''}
                </div>
                <textarea style="width: 100%; height: 45px; background: #000; color: #fff; border: 1px solid #444; font-size: 12px; padding: 4px; resize: vertical; font-family: 'Inter', sans-serif;" 
                    oninput="updateDialogueProp('${key}', 'text', this.value, ${idx})">${diag.text}</textarea>
                
                <div style="display: flex; gap: 10px; margin-top: 4px;">
                    <select style="background: #222; color: #fff; border: 1px solid #444; font-size: 11px; padding: 1px; flex: 1;" 
                        onchange="updateDialogueProp('${key}', 'icon', this.value, ${idx})">
                        <option value="central" ${diag.icon === 'central' ? 'selected' : ''}>Ícone: Central</option>
                        <option value="ai" ${diag.icon === 'ai' ? 'selected' : ''}>Ícone: IA</option>
                        <option value="human" ${diag.icon === 'human' ? 'selected' : ''}>Ícone: Humano</option>
                        <option value="alert" ${diag.icon === 'alert' ? 'selected' : ''}>Ícone: Alerta</option>
                    </select>
                </div>
            </div>
            `;
        });

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222; padding-bottom: 5px; margin-bottom: 8px;">
                <span style="color: #00ff9f; font-size: 11px; font-weight: bold;">COORD: ${x}, ${y}</span>
                <button onclick="removeDialogue('${key}')" style="background: none; border: none; color: #ff0055; cursor: pointer; padding: 0; font-size: 14px;">✖</button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; background: #222; padding: 8px; border-radius: 4px;">
                <div style="grid-column: span 2;">
                    <select style="width: 100%; background: #000; color: #00ff9f; border: 1px solid #00ff9f; font-size: 11px; padding: 3px; font-weight: bold;"
                        onchange="updateDialogueProp('${key}', 'trigger', this.value, -1)">
                        <option value="walk" ${eventConfig.trigger === 'walk' ? 'selected' : ''}>GATILHO: AO PISAR (WALK)</option>
                        <option value="start" ${eventConfig.trigger === 'start' ? 'selected' : ''}>GATILHO: AO INICIAR (START)</option>
                    </select>
                </div>
                
                <div style="grid-column: span 2; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 5px;">
                    <span style="font-size: 10px; color: #aaa;">RAIO DA ÁREA:</span>
                    <input type="number" min="0" max="10" value="${eventConfig.radius || 0}" 
                        style="width: 40px; background: #000; color: #fff; border: 1px solid #444; font-size: 11px; padding: 2px;"
                        onchange="updateDialogueProp('${key}', 'radius', parseInt(this.value), -1)">
                    <span style="font-size: 9px; color: #666;">(0 = apenas o tile)</span>
                </div>

                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 11px; color: #fff;">
                    <input type="checkbox" ${eventConfig.lockPlayer !== false ? 'checked' : ''} onchange="updateDialogueProp('${key}', 'lockPlayer', this.checked, -1)"> Travar Robô
                </label>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 11px; color: #fff;">
                    <input type="checkbox" ${eventConfig.autoDismiss !== false ? 'checked' : ''} onchange="updateDialogueProp('${key}', 'autoDismiss', this.checked, -1)"> Auto-Fechar
                </label>
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 11px; color: #00ff9f; grid-column: span 2; border-top: 1px solid #333; padding-top: 5px; margin-top: 2px;">
                    <input type="checkbox" ${eventConfig.oneShot !== false ? 'checked' : ''} onchange="updateDialogueProp('${key}', 'oneShot', this.checked, -1)"> Disparo Único (One-Shot)
                </label>
            </div>
            
            <div class="messages-container">
                ${messagesHtml}
            </div>

            <button onclick="addDialogueMessage('${key}')" style="width: 100%; background: rgba(0, 255, 159, 0.1); color: #00ff9f; border: 1px dashed #00ff9f; padding: 8px; font-size: 11px; cursor: pointer; margin-top: 5px; border-radius: 4px; font-weight: bold;">
                + ADICIONAR NOVA CAIXA NA SEQUÊNCIA
            </button>
        `;
        list.appendChild(card);
    });
}

function updateDialogueProp(key, prop, value, idx = 0) {
    const lvl = levelsData[currentLevelIdx];
    if (!lvl.dialogues[key]) return;
    
    if (Array.isArray(lvl.dialogues[key])) {
        const oldArr = lvl.dialogues[key];
        lvl.dialogues[key] = {
            trigger: oldArr[0]?.trigger || 'walk',
            radius: oldArr[0]?.radius || 0,
            oneShot: oldArr[0]?.oneShot !== false,
            lockPlayer: oldArr[0]?.lockPlayer !== false,
            autoDismiss: oldArr[0]?.autoDismiss !== false,
            messages: oldArr
        };
    } else if (!lvl.dialogues[key].messages) {
        const oldObj = lvl.dialogues[key];
        lvl.dialogues[key] = {
            trigger: oldObj.trigger || 'walk',
            radius: oldObj.radius || 0,
            oneShot: oldObj.oneShot !== false,
            lockPlayer: oldObj.lockPlayer !== false,
            autoDismiss: oldObj.autoDismiss !== false,
            messages: [oldObj]
        };
    }

    if (idx === -1) {
        lvl.dialogues[key][prop] = value;
    } else {
        if (lvl.dialogues[key].messages[idx]) {
            lvl.dialogues[key].messages[idx][prop] = value;
            if (prop === 'icon') {
                lvl.dialogues[key].messages[idx].isAI = value !== 'human';
            }
        }
    }
    saveHistory();
}

function addDialogueMessage(key) {
    const lvl = levelsData[currentLevelIdx];
    if (!lvl.dialogues[key]) return;
    
    if (Array.isArray(lvl.dialogues[key])) {
        const oldArr = lvl.dialogues[key];
        lvl.dialogues[key] = {
            trigger: oldArr[0]?.trigger || 'walk',
            radius: oldArr[0]?.radius || 0,
            oneShot: oldArr[0]?.oneShot !== false,
            lockPlayer: oldArr[0]?.lockPlayer !== false,
            autoDismiss: oldArr[0]?.autoDismiss !== false,
            messages: oldArr
        };
    } else if (!lvl.dialogues[key].messages) {
        const oldObj = lvl.dialogues[key];
        lvl.dialogues[key] = {
            trigger: oldObj.trigger || 'walk',
            radius: oldObj.radius || 0,
            oneShot: oldObj.oneShot !== false,
            lockPlayer: oldObj.lockPlayer !== false,
            autoDismiss: oldObj.autoDismiss !== false,
            messages: [oldObj]
        };
    }
    
    const messages = lvl.dialogues[key].messages;
    const last = messages[messages.length - 1];
    const newMsg = JSON.parse(JSON.stringify(last));
    newMsg.text = "Próxima fala...";
    
    messages.push(newMsg);
    updateDialogueManager();
    saveHistory();
}

function removeDialogueMessage(key, idx) {
    const lvl = levelsData[currentLevelIdx];
    if (lvl.dialogues && lvl.dialogues[key]) {
        const messages = lvl.dialogues[key].messages || lvl.dialogues[key];
        if (Array.isArray(messages)) {
            messages.splice(idx, 1);
            if (messages.length === 0) {
                delete lvl.dialogues[key];
                rebuildMock();
            }
        }
        updateDialogueManager();
        saveHistory();
    }
}

function removeDialogue(key) {
    const lvl = levelsData[currentLevelIdx];
    if (lvl.dialogues && lvl.dialogues[key]) {
        delete lvl.dialogues[key];
        updateDialogueManager();
        saveHistory();
        rebuildMock();
    }
}

function updateTriggerManagerList() {
    const list = document.getElementById('trigger-manager-list');
    if (!list) return;
    list.innerHTML = '';
    
    const lvl = levelsData[currentLevelIdx];
    if (!lvl.zoneTriggers || lvl.zoneTriggers.length === 0) {
        list.innerHTML = '<div style="color: #666; font-style: italic; text-align: center; margin-top: 20px;">Nenhum gatilho de zona nesta fase.<br><br>Use a ferramenta de ⚡ GATILHOS para adicionar.</div>';
        return;
    }
    
    lvl.zoneTriggers.forEach((trigger, idx) => {
        const card = document.createElement('div');
        card.style.cssText = 'background: #1a1a1a; border: 1px solid #333; padding: 10px; border-radius: 4px;';
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="color: #ffcc00; font-size: 11px; font-weight: bold;">GATILHO: ${trigger.x}, ${trigger.y}</span>
                <button onclick="removeTrigger(${idx})" style="background: none; border: none; color: #ff0055; cursor: pointer; padding: 0; font-size: 14px;">✖</button>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; gap: 5px;">
                    <select onchange="updateTriggerProp(${idx}, 'type', this.value)" style="flex: 1; background: #000; color: #ffcc00; border: 1px solid #444; font-size: 11px; padding: 2px;">
                        <option value="blackout" ${trigger.type === 'blackout' ? 'selected' : ''}>APAGÃO (Blackout)</option>
                    </select>
                    <select onchange="updateTriggerProp(${idx}, 'action', this.value)" style="flex: 1; background: #000; color: #fff; border: 1px solid #444; font-size: 11px; padding: 2px;">
                        <option value="activate" ${trigger.action === 'activate' ? 'selected' : ''}>ATIVAR</option>
                        <option value="deactivate" ${trigger.action === 'deactivate' ? 'selected' : ''}>DESATIVAR</option>
                        <option value="toggle" ${trigger.action === 'toggle' ? 'selected' : ''}>ALTERNAR</option>
                    </select>
                </div>
                
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 10px; color: #aaa;">RAIO:</span>
                    <input type="number" min="0" max="10" value="${trigger.radius || 0}" 
                        style="width: 40px; background: #000; color: #fff; border: 1px solid #444; font-size: 11px; padding: 2px;"
                        onchange="updateTriggerProp(${idx}, 'radius', parseInt(this.value))">
                    
                    <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 10px; color: #fff; margin-left: auto;">
                        <input type="checkbox" ${trigger.oneShot !== false ? 'checked' : ''} onchange="updateTriggerProp(${idx}, 'oneShot', this.checked)"> Único
                    </label>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

function updateTriggerProp(idx, prop, value) {
    const lvl = levelsData[currentLevelIdx];
    if (lvl.zoneTriggers && lvl.zoneTriggers[idx]) {
        lvl.zoneTriggers[idx][prop] = value;
        saveHistory();
    }
}

function removeTrigger(idx) {
    const lvl = levelsData[currentLevelIdx];
    if (lvl.zoneTriggers) {
        lvl.zoneTriggers.splice(idx, 1);
        updateTriggerManagerList();
        saveHistory();
        rebuildMock();
    }
}

window.removeTrigger = removeTrigger;
window.updateTriggerProp = updateTriggerProp;
window.removeDialogue = removeDialogue;
window.addDialogueMessage = addDialogueMessage;
window.removeDialogueMessage = removeDialogueMessage;
window.updateDialogueProp = updateDialogueProp;
window.switchTab = switchTab;

