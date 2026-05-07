// Circuit Breaker - Advanced Level Editor Core Engine
// Main module for map state, history, and rendering

// 1. DUMMY GAME OBJECT (Fixes ReferenceError in graphics.js before main game load)
window.game = {
    getWireConnections: (type) => {
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

const PALETTE = [
    { title: "Estrutura", tiles: [{c: '#', n: 'Teto Bronze (Proc)'}, {c: 'W', n: 'Parede Frontal'}, {c: 'G', n: 'Vidro Blindado'}, {c: ' ', n: 'Chão Padrão'}, {c: '*', n: 'Buraco/Abismo'}] },
    { title: "Setor: Laboratório", tiles: [{c: 'a', n: 'Chão Asséptico'}, {c: 'A', n: 'Teto Asséptico (Proc)'}, {c: 'f', n: 'Parede Laboratório'}, {c: 'i', n: 'Parede Tubo Líquido'}] },
    { title: "Setor: Logística", tiles: [{c: 'o', n: 'Chão Placas Metal'}, {c: ',', n: 'Chão Tátil Amarelo'}, {c: '}', n: 'Teto Logístico (Proc)'}, {c: '{', n: 'Parede Estantes Caixas'}, {c: '~', n: 'Parede Estantes Sucata'}] },
    { title: "Setor: Industrial", tiles: [{c: 'b', n: 'Chão Gradeado'}, {c: 'I', n: 'Teto Pesado'}, {c: 'j', n: 'Parede Ind. Gradeada'}, {c: 'k', n: 'Parede Ind. Pesada'}] },
    { title: "Setor: High-Tech", tiles: [{c: 'c', n: 'Chão Técnico'}, {c: 'Y', n: 'Teto Composto (Proc)'}, {c: 'h', n: 'Parede Modular'}, {c: 'm', n: 'Parede Tronco Eng.'}] },
    { title: "Setor: Realidade", tiles: [{c: '&', n: 'Chão Multicolorido'}, {c: '=', n: 'Teto Realidade (Proc)'}, {c: ':', n: 'Parede Modular (M)'}, {c: ';', n: 'Parede Conduíte (M)'}] },
    { title: "Setor: Óptico", tiles: [{c: 't', n: 'Chão Óptico'}, {c: 'g', n: 'Parede Óptica'}, {c: 'N', n: 'Teto Óptico (Proc)'}] },
    { title: "Setor: Compilador", tiles: [{c: 'z', n: 'Chão Compilador'}, {c: 'q', n: 'Parede Compilador'}, {c: 'x', n: 'Teto Compilador'}] },
    { title: "Setor: Processamento", tiles: [{c: 'Σ', n: 'Parede Ind. Sólida'}, {c: 'σ', n: 'Piso Perfurado Log.'}, {c: 'ρ', n: 'Piso Tátil Rosa'}, {c: 'π', n: 'Parede Servidor'}, {c: 'Ω', n: 'Teto Modular (Proc)'}] },
    { title: "Setor: Quântico", tiles: [{c: '.', n: 'Abismo de Vácuo'}, {c: "'", n: 'Chão Quântico (Rúnico)'}, {c: '"', n: 'Parede Quântica (Circuito)'}, {c: '|', n: 'Teto Quântico (Mandala)'}] },
    { title: "Estrutura (Overlay)", tiles: [{c: '@', n: 'Robô'}, {c: 'K', n: 'Estação'}, {c: 'D', n: 'Porta'}, {c: 'U', n: 'Porta de Saída'}, {c: '_', n: 'Botão Industrial'}, {c: 'E', n: 'Emissor (Canhão)'}, {c: 'R', n: 'Lançador Modular'}, {c: '$', n: 'Loja'}, {c: '%', n: 'Botão Singularidade'}] },
    { title: "Quântico", tiles: [{c: '?', n: 'Chão Quântico'}, {c: 'Q', n: 'Catalisador'}, {c: 'O', n: 'Portal Quântico'}] },
    { title: "Gravidade", tiles: [{c: 'n', n: 'Gravidade N'}, {c: 's', n: 'Gravidade S'}, {c: 'e', n: 'Gravidade L'}, {c: 'w', n: 'Gravidade O'}] },
    { title: "Núcleos", tiles: [{c: 'T', n: 'Alvo'}, {c: 'B', n: 'Fonte Azul'}, {c: 'X', n: 'Fonte Vermelha'}, {c: 'Z', n: 'Quebrado'}] },
    { title: "Fios (Rede)", tiles: [
        {c: 'H', n: 'Horiz'}, {c: 'V', n: 'Vert'}, {c: '+', n: 'Cruz'},
        {c: 'L', n: '└'}, {c: 'J', n: '┘'}, {c: 'C', n: '┐'}, {c: 'F', n: '┌'},
        {c: 'u', n: '┻'}, {c: 'd', n: '┳'}, {c: 'l', n: '┫'}, {c: 'r', n: '┣'}
    ] },
    { title: "Amplificadores", tiles: [{c: '>', n: 'Dir'}, {c: '<', n: 'Esq'}, {c: 'v', n: 'Baixo'}, {c: '^', n: 'Cima'}, {c: 'M', n: 'Prisma'}, {c: 'y', n: 'Solar'}, {c: 'p', n: 'Lunar'}] },
    { title: "Esteiras", tiles: [{c: ')', n: 'Esteira Dir'}, {c: '(', n: 'Esteira Esq'}, {c: ']', n: 'Esteira Baixo'}, {c: '[', n: 'Esteira Cima'}] },
    { title: "Coletáveis", tiles: [{c: 'S', n: 'Tralha'}] },
    { title: "Eventos", tiles: [{c: '💬', n: 'Fala/Diálogo'}, {c: '⚡', n: 'Gatilho'}, {c: '!', n: 'Rótulo'}] }
];

window.levelsData = [];
window.chaptersData = [];
window.currentLevelIdx = 0;
window.currentChapterIdx = 0;
window.currentMap = [];
window.currentOverlayMap = [];
window.currentBlocksMap = [];
window.currentWiresMap = [];
window.selectedTile = '#';
window.activeLayer = 'base';
window.currentTool = 'brush';
window.isDrawing = false;
window.startX = -1;
window.startY = -1;
window.historyStack = [];
window.clipboard = null;
window.selectionStart = null;
window.selectionEnd = null;
window.hoverPos = {x: 0, y: 0};
window.editTargets = [];
window.isTestMode = false;
window.testGame = null;
window.testAnimFrame = 0;
window.testLastTime = 0;
window.rebootConfirmTimer = null;
window.originalLevels = null;
window.canvas = null;
window.ctx = null;
window.mockGame = null;
window.animFrame = 0;
window.hoveredChannel = null;

window.onload = () => {
    levelsData = JSON.parse(JSON.stringify(LEVELS));
    if (typeof CHAPTERS !== 'undefined') {
        chaptersData = JSON.parse(JSON.stringify(CHAPTERS));
    } else {
        chaptersData = [{ name: "CAPÍTULO 1", levels: levelsData.map((_, i) => i) }];
    }
    
    canvas = document.getElementById('editor-canvas');
    ctx = canvas.getContext('2d');
    Graphics.init(canvas);
    
    mockGame = new GameState(null, true);
    window.game = mockGame;
    
    buildPalette();
    updateChapterList();
    updateLevelList();
    loadLevel(0);
    
    DungeonGenerator.init();
    setupEvents();
    requestAnimationFrame(renderLoop);
};

function loadLevel(idx) {
    currentLevelIdx = idx;
    const lvl = levelsData[idx];
    document.getElementById('lvl-name').value = lvl.name;
    const timerInput = document.getElementById('lvl-timer');
    if (timerInput) timerInput.value = lvl.timer || 0;
    document.getElementById('check-lvl-blackout').checked = lvl.startWithBlackout || false;
    
    currentMap = lvl.map.map(row => row.split(''));
    const h = currentMap.length;
    const w = currentMap[0].length;
    document.getElementById('map-w').value = w;
    document.getElementById('map-h').value = h;
    
    canvas.width = w * 32;
    canvas.height = h * 32;

    if (lvl.blocks) currentBlocksMap = lvl.blocks.map(row => row.split(''));
    else currentBlocksMap = Array(h).fill(0).map(() => Array(w).fill(' '));

    if (lvl.overlays) currentOverlayMap = lvl.overlays.map(row => row.split(''));
    else currentOverlayMap = Array(h).fill(0).map(() => Array(w).fill(' '));

    if (lvl.wireMap) currentWiresMap = lvl.wireMap.map(row => row.split(''));
    else currentWiresMap = Array(h).fill(0).map(() => Array(w).fill(' '));
    
    historyStack = [JSON.parse(JSON.stringify({map: currentMap, blocks: currentBlocksMap, overlays: currentOverlayMap, wireMap: currentWiresMap, dialogues: lvl.dialogues || {}, zoneTriggers: lvl.zoneTriggers || []}))];
    Graphics.clearParticles();
    updateLevelList();
    updateDialogueManager();
    updateTriggerManagerList();
    rebuildMock();
}

function rebuildMock() {
    if (!mockGame) mockGame = new GameState();
    
    const lvl = levelsData[currentLevelIdx];
    lvl.name = document.getElementById('lvl-name').value;
    const timerInput = document.getElementById('lvl-timer');
    if (timerInput) lvl.timer = parseInt(timerInput.value) || 0;
    lvl.startWithBlackout = document.getElementById('check-lvl-blackout').checked;
    lvl.map = currentMap.map(row => row.join(''));
    lvl.blocks = currentBlocksMap.map(row => row.join(''));
    lvl.overlays = currentOverlayMap.map(row => row.join(''));
    lvl.wireMap = currentWiresMap.map(row => row.join(''));

    mockGame.map = []; mockGame.blocks = []; mockGame.targets = []; mockGame.forbiddens = [];
    mockGame.sources = []; mockGame.redSources = []; mockGame.wires = [];
    mockGame.scrapPositions = new Set(); mockGame.totalScrap = 0; mockGame.conveyors = [];
    mockGame.doors = []; mockGame.buttons = []; mockGame.purpleButtons = [];
    mockGame.quantumFloors = []; mockGame.emitters = []; mockGame.catalysts = [];
    mockGame.portals = []; mockGame.glassWallsHit = new Set();
    mockGame.singularitySwitchers = []; mockGame.isSolarPhase = true;
    mockGame.brokenCores = []; mockGame.gravityButtons = [];
    mockGame.zoneTriggers = JSON.parse(JSON.stringify(lvl.zoneTriggers || []));
    mockGame.isBlackoutActive = lvl.startWithBlackout || false;
    mockGame.blackoutAlpha = mockGame.isBlackoutActive ? 1 : 0;
    mockGame.chargingStations = []; mockGame.poweredStations = new Set();
    mockGame.brokenCores = []; mockGame.gravityButtons = [];
    mockGame.shopTerminals = []; mockGame.worldLabels = [];
    mockGame.launchers = [];
    mockGame.projectiles = [];

    const h = currentMap.length;
    const w = currentMap[0].length;

    for (let y = 0; y < h; y++) {
        let row = [];
        for (let x = 0; x < w; x++) {
            let c = currentMap[y][x];
            const isWallOrFloor = (c === '#' || c === '*' || c === 'W' || c === 'G' || c === 'a' || c === 'b' || c === 'c' || c === 'A' || c === 'I' || c === 'Y' || c === 'f' || c === 'i' || c === 'j' || c === 'k' || c === 'h' || c === 'm' || c === 'g' || c === 't' ||
                                 c === 'x' || c === 'z' || c === 'q' || c === 'N' || c === 'o' || c === ',' || c === '{' || c === '}' || c === '&' || c === '=' || c === ':' || c === ';' ||
                                 c === 'Σ' || c === 'σ' || c === 'π' || c === 'Ω' ||
                                 c === 'B' || c === 'X' || c === 'T' || c === 'Z' || (c >= '1' && c <= '9'));
            row.push(isWallOrFloor ? c : ' ');
            
            if (c === '@') { mockGame.player.x = x; mockGame.player.y = y; mockGame.startPos = { x, y }; }
            else if (c === 'B') mockGame.sources.push({ x, y });
            else if (c === 'X') mockGame.redSources.push({ x, y });
            else if (c === 'K') mockGame.chargingStations.push({ x, y });
            else if (['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r'].includes(c)) mockGame.wires.push({ x, y, type: c });
            else if (c === 'Z') mockGame.brokenCores.push({ x, y });
            else if (c === 'T' || (c >= '1' && c <= '9')) mockGame.targets.push({ x, y, required: c === 'T' ? 1 : parseInt(c) });
            else if (c === '0') mockGame.forbiddens.push({ x, y });

            let wc = currentWiresMap[y][x];
            if (['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r'].includes(wc)) mockGame.wires.push({ x, y, type: wc });

            else if (c === 'D' || c === 'U') {
                const isExit = (c === 'U');
                const chan = (lvl.links && lvl.links[`${x},${y}`]) || (isExit ? 99 : 0);
                const exitTo = lvl.links && lvl.links[`${x},${y}_exitTo`];
                mockGame.doors.push({ x, y, state: 'CLOSED', error: false, channel: chan, isExit: isExit, exitTo: exitTo });
            } else if (['>', '<', '^', 'v'].includes(c)) {
                let dir = 0; if (c === '<') dir = 2; if (c === '^') dir = 3; if (c === 'v') dir = 1;
                mockGame.blocks.push({ x, y, dir });
            } else if (c === 'S') { mockGame.scrapPositions.add(`${x},${y}`); mockGame.totalScrap++; }
            else if (['(', ')', '[', ']'].includes(c)) {
                let dir = 2; if (c === ')') dir = 0; if (c === '[') dir = 3; if (c === ']') dir = 1;
                const chan = (lvl.links && lvl.links[`${x},${y}`]) || 0;
                mockGame.conveyors.push({ x, y, dir, channel: chan });
            } else if (c === 'E' || c === 'M') {
                const dir = (lvl.links && lvl.links[`${x},${y}_dir`]) || 0;
                const chan = (lvl.links && lvl.links[`${x},${y}`]) || 0;
                if (c === 'E') {
                    const inverted = (lvl.links && lvl.links[`${x},${y}_init`]) === false;
                    mockGame.emitters.push({ x, y, dir, channel: chan, inverted });
                } else mockGame.blocks.push({ x, y, dir, type: 'PRISM' });
            } else if (c === 'Q') mockGame.catalysts.push({ x, y, active: false });
            else if (c === 'O') {
                const chan = (lvl.links && lvl.links[`${x},${y}`]) || 0;
                const pColor = (lvl.links && lvl.links[`${x},${y}_color`]) || '#ffd700';
                mockGame.portals.push({ x, y, channel: chan, slot: { content: null }, color: pColor });
            } else if (['n', 's', 'e', 'w'].includes(c)) {
                let gDir = DIRS.UP; if (c === 's') gDir = DIRS.DOWN; if (c === 'e') gDir = DIRS.RIGHT; if (c === 'w') gDir = DIRS.LEFT;
                mockGame.gravityButtons.push({ x, y, dir: gDir, flashTimer: 0 });
            } else if (c === '!') {
                const labelText = (lvl.links && lvl.links[`${x},${y}_label`]);
                const labelColor = (lvl.links && lvl.links[`${x},${y}_labelColor`]) || '#00f0ff';
                if (labelText) mockGame.worldLabels.push({ x, y, text: labelText, color: labelColor });
                else mockGame.worldLabels.push({ x, y, text: '!', color: '#ff00ff' });
            }
            else if (c === '$') mockGame.shopTerminals.push({ x, y });
            else if (c === 'R') {
                const launcherConfig = (lvl.links && lvl.links[`${x},${y}_launcher`]) || {};
                const launcher = LauncherFactory.create(x, y, launcherConfig);
                mockGame.launchers.push(launcher);
            }

            let oc = currentOverlayMap[y][x];
            if (oc === '@') { mockGame.player.x = x; mockGame.player.y = y; mockGame.startPos = { x, y }; }
            else if (oc === 'K') mockGame.chargingStations.push({ x, y });
            if (['(', ')', '[', ']'].includes(oc)) {
                let dir = 2; if (oc === ')') dir = 0; if (oc === '[') dir = 3; if (oc === ']') dir = 1;
                const chan = (lvl.links && lvl.links[`${x},${y}`]) || 0;
                mockGame.conveyors.push({ x, y, dir, channel: chan });
            } else if (oc === 'S') { mockGame.scrapPositions.add(`${x},${y}`); mockGame.totalScrap++; }
            else if (oc === 'D' || oc === 'U') {
                const isExit = (oc === 'U');
                const chan = (lvl.links && lvl.links[`${x},${y}`]) || (isExit ? 99 : 0);
                const exitTo = lvl.links && lvl.links[`${x},${y}_exitTo`];
                mockGame.doors.push({ x, y, state: 'CLOSED', error: false, channel: chan, isExit: isExit, exitTo: exitTo });
            } else if (oc === '?') {
                const chan = (lvl.links && lvl.links[`${x},${y}`]) || 0;
                mockGame.quantumFloors.push({ x, y, active: true, channel: chan, flashTimer: 0, pulseIntensity: 1.0, entrySide: null, whiteGlow: 0 });
            } else if (oc === '_' || oc === 'P') {
                const chan = (lvl.links && lvl.links[`${x},${y}`]) || 0;
                const behavior = (lvl.links && lvl.links[`${x},${y}_behavior`]) || (oc === 'P' ? 'PRESSURE' : 'TIMER');
                const initState = (lvl.links && lvl.links[`${x},${y}_init`]) === true;
                mockGame.buttons.push({ x, y, isPressed: initState, channel: chan, behavior: behavior });
            } else if (oc === '#' || oc === 'W' || oc === 'G' || oc === 'f' || oc === 'i' || oc === 'j' || oc === 'k' || oc === 'h' || oc === 'm' || oc === '{' ||
                       oc === 'B' || oc === 'X' || oc === 'T' || oc === 'Z' || (oc >= '1' && oc <= '9')) {
                row[x] = oc;
            }
            else if (oc === 'E' || oc === 'M') {
                const dir = (lvl.links && lvl.links[`${x},${y}_dir`]) || 0;
                if (oc === 'E' && !mockGame.emitters.some(e => e.x === x && e.y === y)) {
                    const inverted = (lvl.links && lvl.links[`${x},${y}_init`]) === false;
                    mockGame.emitters.push({ x, y, dir, inverted });
                } else if (!mockGame.blocks.some(b => b.x === x && b.y === y)) mockGame.blocks.push({ x, y, dir, type: 'PRISM' });
            } else if (oc === 'B' && !mockGame.sources.some(s => s.x === x && s.y === y)) mockGame.sources.push({ x, y });
            else if (oc === 'X' && !mockGame.redSources.some(s => s.x === x && s.y === y)) mockGame.redSources.push({ x, y });
            else if (oc === 'Z' && !mockGame.brokenCores.some(s => s.x === x && s.y === y)) mockGame.brokenCores.push({ x, y });
            else if ((oc === 'T' || (oc >= '1' && oc <= '9')) && !mockGame.targets.some(t => t.x === x && t.y === y)) {
                mockGame.targets.push({ x, y, required: oc === 'T' ? 1 : parseInt(oc) });
            } else if (oc === 'O' && !mockGame.portals.some(p => p.x === x && p.y === y)) {
                const chan = (lvl.links && lvl.links[`${x},${y}`]) || 0;
                const pColor = (lvl.links && lvl.links[`${x},${y}_color`]) || '#ffd700';
                mockGame.portals.push({ x, y, channel: chan, slot: { content: null }, color: pColor });
            } else if (oc === '$') {
                mockGame.shopTerminals.push({ x, y });
            } else if (oc === 'R') {
                const launcherConfig = (lvl.links && lvl.links[`${x},${y}_launcher`]) || {};
                launcherConfig.channel = (lvl.links && lvl.links[`${x},${y}`]) || 0;
                launcherConfig.dir = (lvl.links && lvl.links[`${x},${y}_dir`]) || 0;
                const launcher = LauncherFactory.create(x, y, launcherConfig);
                mockGame.launchers.push(launcher);
            } else if (oc === '!') {
                const labelText = (lvl.links && lvl.links[`${x},${y}_label`]);
                const labelColor = (lvl.links && lvl.links[`${x},${y}_labelColor`]) || '#00f0ff';
                if (labelText) mockGame.worldLabels.push({ x, y, text: labelText, color: labelColor });
                else mockGame.worldLabels.push({ x, y, text: '!', color: '#ff00ff' });
            }

            let bc = currentBlocksMap[y][x];
            if (['>', '<', '^', 'v', 'y', 'p'].includes(bc)) {
                let dir = (lvl.links && lvl.links[`${x},${y}_dir`]);
                if (dir === undefined) {
                    dir = 0; if (bc === '<') dir = 2; if (bc === '^') dir = 3; if (bc === 'v') dir = 1;
                }
                if (!mockGame.blocks.some(b => b.x === x && b.y === y)) {
                    let phase = bc === 'y' ? 'SOLAR' : (bc === 'p' ? 'LUNAR' : null);
                    mockGame.blocks.push({ x, y, dir, phase });
                }
            } else if (bc === 'M') {
                const dir = (lvl.links && lvl.links[`${x},${y}_dir`]) || 0;
                if (!mockGame.blocks.some(b => b.x === x && b.y === y)) mockGame.blocks.push({ x, y, dir, type: 'PRISM' });
            }
        }
        mockGame.map.push(row);
    }
    
    // Detect Double Doors for Editor Rendering
    for (let door of mockGame.doors) {
        if (door.pair) continue;
        const right = mockGame.doors.find(d => d.x === door.x + 1 && d.y === door.y && !d.pair);
        if (right) {
            door.pair = { x: right.x, y: right.y, side: 'LEFT' };
            right.pair = { x: door.x, y: door.y, side: 'RIGHT' };
            door.orientation = 'HORIZONTAL';
            right.orientation = 'HORIZONTAL';
        } else {
            const down = mockGame.doors.find(d => d.x === door.x && d.y === door.y + 1 && !d.pair);
            if (down) {
                door.pair = { x: down.x, y: down.y, side: 'TOP' };
                down.pair = { x: door.x, y: door.y, side: 'BOTTOM' };
                door.orientation = 'VERTICAL';
                down.orientation = 'VERTICAL';
            }
        }
    }

    // Process conveyors, portals, etc.
    for (let c of mockGame.conveyors) {
        c.inDir = null; c.beltDist = undefined;
        for (let other of mockGame.conveyors) {
            if (other === c) continue;
            let ox = other.x, oy = other.y;
            if (other.dir === DIRS.RIGHT) ox++; else if (other.dir === DIRS.LEFT) ox--;
            else if (other.dir === DIRS.DOWN) oy++; else if (other.dir === DIRS.UP) oy--;
            if (ox === c.x && oy === c.y) { c.inDir = other.dir; break; }
        }
    }
    const tracePath = (c, d) => {
        c.beltDist = d;
        let nx = c.x, ny = c.y;
        if (c.dir === DIRS.RIGHT) nx++; else if (c.dir === DIRS.LEFT) nx--;
        else if (c.dir === DIRS.DOWN) ny++; else if (c.dir === DIRS.UP) ny--;
        const next = mockGame.conveyors.find(cv => cv.x === nx && cv.y === ny);
        if (next && next.beltDist === undefined) tracePath(next, d + 1);
    };
    for (let c of mockGame.conveyors) { if (c.inDir === null && c.beltDist === undefined) tracePath(c, 0); }
    for (let c of mockGame.conveyors) { if (c.beltDist === undefined) tracePath(c, 0); }

    const channelSlots = new Map();
    for (let portal of mockGame.portals) {
        const target = mockGame.portals.find(p => p.channel === portal.channel && (p.x !== portal.x || p.y !== portal.y));
        if (target) {
            portal.targetX = target.x; portal.targetY = target.y;
            if (!channelSlots.has(portal.channel)) channelSlots.set(portal.channel, { content: null });
            portal.slot = channelSlots.get(portal.channel);
        }
    }

    if (!mockGame.chargingStations.some(s => s.x === mockGame.startPos.x && s.y === mockGame.startPos.y)) mockGame.chargingStations.push({ ...mockGame.startPos });
    mockGame.updateEmitters();
    Graphics.initLevelContext(mockGame);
    Graphics.bakedLevelKey = null; // Force re-bake on next frame
}

function saveHistory() {
    const lvl = levelsData[currentLevelIdx];
    historyStack.push(JSON.parse(JSON.stringify({
        map: currentMap, blocks: currentBlocksMap, overlays: currentOverlayMap, wireMap: currentWiresMap,
        dialogues: lvl.dialogues || {}, zoneTriggers: lvl.zoneTriggers || []
    })));
    if (historyStack.length > 50) historyStack.shift();
}

function undo() {
    if (historyStack.length > 1) {
        historyStack.pop();
        const state = JSON.parse(JSON.stringify(historyStack[historyStack.length - 1]));
        currentMap = state.map; currentBlocksMap = state.blocks; currentOverlayMap = state.overlays; currentWiresMap = state.wireMap || Array(currentMap.length).fill(0).map(() => Array(currentMap[0].length).fill(' '));
        levelsData[currentLevelIdx].dialogues = state.dialogues;
        levelsData[currentLevelIdx].zoneTriggers = state.zoneTriggers;
        updateDialogueManager(); updateTriggerManagerList();
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

function getLinePoints(x1, y1, x2, y2) {
    let points = [];
    let dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
    let sx = (x1 < x2) ? 1 : -1, sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy;
    while (true) {
        points.push({ x: x1, y: y1 });
        if (x1 === x2 && y1 === y2) break;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x1 += sx; }
        if (e2 < dx) { err += dx; y1 += sy; }
    }
    return points;
}

function getNextRotation(c) {
    if (c === 'H') return 'V'; if (c === 'V') return 'H';
    if (c === 'L') return 'J'; if (c === 'J') return 'C'; if (c === 'C') return 'F'; if (c === 'F') return 'L';
    if (c === 'u') return 'r'; if (c === 'r') return 'd'; if (c === 'd') return 'l'; if (c === 'l') return 'u';
    if (c === '>') return 'v'; if (c === 'v') return '<'; if (c === '<') return '^'; if (c === '^') return '>';
    if (c === '(') return '['; if (c === '[') return ')'; if (c === ')') return ']'; if (c === ']') return '(';
    if (c === 'n') return 'e'; if (c === 'e') return 's'; if (c === 's') return 'w'; if (c === 'w') return 'n';
    return c;
}

function drawChar(x, y, c, alpha = 1.0, isSecondLayer = false) {
    ctx.save(); ctx.globalAlpha = alpha;
    if (!isSecondLayer) {
        if (c === 'N') {
            let mask = 0; const map = currentMap;
            if (y > 0 && map[y-1][x] === 'N') mask |= 1;
            if (x < map[0].length - 1 && map[y][x+1] === 'N') mask |= 2;
            if (y < map.length - 1 && map[y+1][x] === 'N') mask |= 4;
            if (x > 0 && map[y][x-1] === 'N') mask |= 8;
            Graphics.drawOpticalCeiling(x, y, mask);
            ctx.restore(); return;
        } else if (c === 'Y') {
            let mask = 0; const map = currentMap;
            if (y > 0 && map[y-1][x] === 'Y') mask |= 1;
            if (x < map[0].length - 1 && map[y][x+1] === 'Y') mask |= 2;
            if (y < map.length - 1 && map[y+1][x] === 'Y') mask |= 4;
            if (x > 0 && map[y][x-1] === 'Y') mask |= 8;
            Graphics.drawHighTechCeiling(x, y, mask);
            ctx.restore(); return;
        } else if (c === '#') {
            let mask = 0; const map = currentMap;
            if (y > 0 && map[y-1][x] === '#') mask |= 1;
            if (x < map[0].length - 1 && map[y][x+1] === '#') mask |= 2;
            if (y < map.length - 1 && map[y+1][x] === '#') mask |= 4;
            if (x > 0 && map[y][x-1] === '#') mask |= 8;
            Graphics.drawBronzeCeiling(x, y, mask);
            ctx.restore(); return;
        } else if (c === 'A') {
            let mask = 0; const map = currentMap;
            if (y > 0 && map[y-1][x] === 'A') mask |= 1;
            if (x < map[0].length - 1 && map[y][x+1] === 'A') mask |= 2;
            if (y < map.length - 1 && map[y+1][x] === 'A') mask |= 4;
            if (x > 0 && map[y][x-1] === 'A') mask |= 8;
            Graphics.drawLabCeiling(x, y, mask);
            ctx.restore(); return;
        } else if (c === '}') {
            let mask = 0; const map = currentMap;
            if (y > 0 && map[y-1][x] === '}') mask |= 1;
            if (x < map[0].length - 1 && map[y][x+1] === '}') mask |= 2;
            if (y < map.length - 1 && map[y+1][x] === '}') mask |= 4;
            if (x > 0 && map[y][x-1] === '}') mask |= 8;
            Graphics.drawLogisticCeiling(x, y, mask);
            ctx.restore(); return;
        } else if (c === '=') {
            let mask = 0; const map = currentMap;
            if (y > 0 && map[y-1][x] === '=') mask |= 1;
            if (x < map[0].length - 1 && map[y][x+1] === '=') mask |= 2;
            if (y < map.length - 1 && map[y+1][x] === '=') mask |= 4;
            if (x > 0 && map[y][x-1] === '=') mask |= 8;
            Graphics.drawRealityCeiling(x, y, mask);
            ctx.restore(); return;
        } else if (c === '|') {
            let mask = 0; const map = currentMap;
            if (y > 0 && map[y-1][x] === '|') mask |= 1;
            if (x < map[0].length - 1 && map[y][x+1] === '|') mask |= 2;
            if (y < map.length - 1 && map[y+1][x] === '|') mask |= 4;
            if (x > 0 && map[y][x-1] === '|') mask |= 8;
            Graphics.drawQuantumCeiling(x, y, mask);
            ctx.restore(); return;
        } else if (c === 'Ω') {
            let mask = 0; const map = currentMap;
            if (y > 0 && map[y-1][x] === 'Ω') mask |= 1;
            if (x < map[0].length - 1 && map[y][x+1] === 'Ω') mask |= 2;
            if (y < map.length - 1 && map[y+1][x] === 'Ω') mask |= 4;
            if (x > 0 && map[y][x-1] === 'Ω') mask |= 8;
            Graphics.drawProcessingCeiling(x, y, mask);
            ctx.restore(); return;
        } else if (c === 'I' || c === 'x') { Graphics.drawCeiling(x, y, c); ctx.restore(); return; }
        else if (c === 'W' || c === 'f' || c === 'i' || c === 'j' || c === 'k' || c === 'h' || c === 'm' || c === 'g' || c === 'q' || c === '{' || c === '~' || c === ':' || c === ';' || c === '"' || c === 'π' || c === '\u03A3') { Graphics.drawWallFace(x, y, c); ctx.restore(); return; }
        else if (c === '*') {
            let mask = 0; const map = currentMap;
            if (y > 0 && map[y-1][x] === '*') mask |= 1;
            if (x < map[0].length - 1 && map[y][x+1] === '*') mask |= 2;
            if (y < map.length - 1 && map[y+1][x] === '*') mask |= 4;
            if (x > 0 && map[y][x-1] === '*') mask |= 8;
            Graphics.drawHole(x, y, mask);
        } else if (c === '.') {
            let mask = 0; const map = currentMap;
            if (y > 0 && map[y-1][x] === '.') mask |= 1;
            if (x < map[0].length - 1 && map[y][x+1] === '.') mask |= 2;
            if (y < map.length - 1 && map[y+1][x] === '.') mask |= 4;
            if (x > 0 && map[y][x-1] === '.') mask |= 8;
            Graphics.drawVacuumAbyss(x, y, mask);
        } else if (c === ',') {
            let mask = 0; const map = currentMap;
            if (y > 0 && map[y-1][x] === ',') mask |= 1;
            if (x < map[0].length - 1 && map[y][x+1] === ',') mask |= 2;
            if (y < map.length - 1 && map[y+1][x] === ',') mask |= 4;
            if (x > 0 && map[y][x-1] === ',') mask |= 8;
            Graphics.drawFloor(x, y, ',', mask);
        } else if (c === '\u03C3') {
            let mask = 0; const map = currentMap;
            const structuralChars = ['#', 'W', 'A', 'I', 'Y', 'f', 'i', 'j', 'k', 'h', 'm', 'G', 'g', 'x', 'q', 'N', '\"', '|', ':', ';', '{', '~', '}', '=', '\u03A3', '\u03C0', '\u03A9'];
            const isS = (tx, ty) => {
                if (ty < 0 || ty >= map.length || tx < 0 || tx >= map[0].length) return true;
                const nc = map[ty][tx];
                return structuralChars.includes(nc) || nc === '*' || nc === '.';
            };
            if (isS(x, y - 1)) mask |= 1;
            if (isS(x + 1, y)) mask |= 2;
            if (isS(x, y + 1)) mask |= 4;
            if (isS(x - 1, y)) mask |= 8;
            Graphics.drawFloor(x, y, '\u03C3', mask);
        } else if (c === '\u03C1') {
            let mask = 0; const map = currentMap;
            if (y > 0 && map[y-1][x] === '\u03C1') mask |= 1;
            if (x < map[0].length - 1 && map[y][x+1] === '\u03C1') mask |= 2;
            if (y < map.length - 1 && map[y+1][x] === '\u03C1') mask |= 4;
            if (x > 0 && map[y][x-1] === '\u03C1') mask |= 8;
            Graphics.drawFloor(x, y, '\u03C1', mask);
        } else {
            const fChar = ['a', 'b', 'c', 't', 'z', 'o', ',', '&', "'"].includes(c) ? c : ' ';
            Graphics.drawFloor(x, y, fChar);
        }
    }
    if (c === '@') {
        const powered = mockGame.poweredStations.has(`${x},${y}`);
        Graphics.drawChargingStation(x, y, powered, animFrame);
        Graphics.drawRobot(x, y, mockGame.player.dir, animFrame);
    } else if (c === 'K') Graphics.drawChargingStation(x, y, mockGame.poweredStations.has(`${x},${y}`), animFrame);
    else if (c === 'B') Graphics.drawCore(x, y, 'B', true);
    else if (c === 'X') Graphics.drawCore(x, y, 'X', true);
    else if (c === 'Z') Graphics.drawBrokenCore(x, y, animFrame);
    else if (c === 'T' || (c >= '1' && c <= '9')) {
        const d = mockGame.poweredTargets.get(`${x},${y}`) || { charge: 0, contaminated: false };
        const req = c === 'T' ? 1 : parseInt(c);
        Graphics.drawCore(x, y, c, d.charge >= req, req, d.charge, d.contaminated);
    } else if (['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r'].includes(c)) Graphics.drawWire(x, y, c, mockGame.poweredWires.get(`${x},${y}`), animFrame);
    else if (c === 'S') Graphics.drawScrap(x, y, animFrame);
    else if (['>', '<', '^', 'v', 'y', 'p'].includes(c)) {
        let dir = (levelsData[currentLevelIdx].links?.[`${x},${y}_dir`]);
        if (dir === undefined) {
            dir = 0; if(c==='v') dir=1; if(c==='<') dir=2; if(c==='^') dir=3;
        }
        Graphics.drawBlock(x, y, dir * Math.PI / 2, mockGame.poweredBlocks.get(`${x},${y}`), 0, dir, 'NORMAL', 0, c==='y'?'SOLAR':(c==='p'?'LUNAR':null), mockGame.isSolarPhase);
    } else if (['(', ')', '[', ']'].includes(c)) {
        let dir = 2; if(c===')') dir=0; if(c==='[') dir=3; if(c===']') dir=1;
        const conv = mockGame.conveyors.find(cv => cv.x === x && cv.y === y);
        Graphics.drawConveyor(x, y, dir, animFrame, conv?.inDir, conv?.beltDist || 0, conv?.beltLength || 10, true, currentMap[y][x] === '*');
    } else if (c === 'D' || c === 'U') {
        const door = mockGame.doors.find(d => d.x === x && d.y === y);
        Graphics.drawDoor(x, y, door?.state || 'CLOSED', door?.error || false, animFrame, door?.orientation, door?.pair?.side, null, c === 'U');
    } else if (c === '_' || c === 'P') {
        const btn = mockGame.buttons.find(b => b.x === x && b.y === y);
        Graphics.drawButton(x, y, btn?.isPressed || false, btn?.behavior || (c === 'P' ? 'PRESSURE' : 'TIMER'), btn?.charge || 0);
    } else if (c === 'E') Graphics.drawEmitter(x, y, mockGame.emitters.find(e => e.x === x && e.y === y)?.dir || 0, animFrame);
    else if (c === 'R') {
        const launcher = mockGame.launchers.find(l => l._x === x && l._y === y);
        if (launcher) launcher.draw(ctx);
        else {
            const color = '#00f0ff';
            ctx.strokeStyle = color; ctx.lineWidth = 2;
            ctx.strokeRect(x * 32 + 8, y * 32 + 8, 16, 16);
        }
    }
    else if (c === 'M') Graphics.drawBlock(x, y, (mockGame.blocks.find(b => b.x === x && b.y === y)?.dir || 0) * (Math.PI/2), null, 0, 0, 'PRISM');
    else if (c === 'O') {
        const p = mockGame.portals.find(p => p.x === x && p.y === y);
        Graphics.drawPortal(x, y, p?.channel || 0, animFrame, p?.color || '#ffd700');
    } else if (c === '?') {
        const qf = mockGame.quantumFloors.find(f => f.x === x && f.y === y);
        Graphics.drawQuantumFloor(x, y, qf?.active !== false, animFrame);
    } else if (c === 'Q') Graphics.drawCatalyst(x, y, true, animFrame);
    else if (c === 'G') Graphics.drawGlassWall(x, y, animFrame, true);
    else if (c === '!') {
        const lvl = levelsData[currentLevelIdx];
        const labelText = (lvl.links && lvl.links[`${x},${y}_label`]) || "!";
        const labelColor = (lvl.links && lvl.links[`${x},${y}_labelColor`]) || "#00f0ff";
        Graphics.drawWorldLabel(x, y, labelText, labelColor, 1.0, 0.3);
    }
    else if (c === '$') Graphics.drawShopTerminal(x, y, animFrame);
    else if (c === '%') {
        const sw = mockGame.singularitySwitchers.find(s => s.x === x && s.y === y);
        Graphics.drawSingularitySwitcher(x, y, mockGame.isSolarPhase, animFrame, sw?.lightningTimer || 0);
    }
    else if (['n', 's', 'e', 'w'].includes(c)) {
        let d = DIRS.UP; if (c === 's') d = DIRS.DOWN; if (c === 'e') d = DIRS.RIGHT; if (c === 'w') d = DIRS.LEFT;
        Graphics.drawGravityButton(x, y, d, animFrame, 0, false);
    } else if (c === '💬') { ctx.fillStyle = '#00ff9f'; ctx.font = '20px VT323'; ctx.textAlign = 'center'; ctx.fillText('💬', x*32+16, y*32+24); }
    else if (c === '⚡') { ctx.fillStyle = '#ffcc00'; ctx.font = '20px VT323'; ctx.textAlign = 'center'; ctx.fillText('⚡', x*32+16, y*32+24); }
    ctx.restore();
}

function renderLoop() {
    const lvl = levelsData[currentLevelIdx];
    if (isTestMode || !mockGame) return requestAnimationFrame(renderLoop);
    Graphics.clear();
    const h = currentMap.length, w = currentMap[0].length;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const c = currentMap[y][x];
        const oc = currentOverlayMap[y][x];
        // If there's an overlay tile that suppresses floor (like a nucleus), 
        // we might want to skip the base floor if the base is just a space.
        const suppressesFloor = ['B', 'X', 'T', 'Z', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(oc);
        if (c === ' ' && suppressesFloor) {
            // Draw nothing in base, let overlay handle it
        } else {
            drawChar(x, y, c);
        }
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const wc = currentWiresMap[y][x]; if (wc !== ' ') drawChar(x, y, wc, 1.0, true);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const oc = currentOverlayMap[y][x]; if (oc !== ' ') drawChar(x, y, oc, 1.0, true);
    }
    const ghostBlocks = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const bc = currentBlocksMap[y][x]; if (bc === ' ') continue;
        if ((bc === 'y' && !mockGame.isSolarPhase) || (bc === 'p' && mockGame.isSolarPhase)) { ghostBlocks.push({x, y, c: bc}); continue; }
        drawChar(x, y, bc, 1.0, true);
    }
    for (const e of mockGame.emitters) Graphics.drawLaser(e, animFrame);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const c = currentMap[y][x];
        const oc = currentOverlayMap[y][x];
        const wallChars = ['#', 'W', 'f', 'i', 'j', 'k', 'h', 'm', 'G', 'x', 'q', '{', ':', ';', '=', '"', '|', 'π', 'Ω'];
        if (wallChars.includes(c)) drawChar(x, y, c);
        if (wallChars.includes(oc)) drawChar(x, y, oc);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (lvl.dialogues?.[`${x},${y}`]) { ctx.fillStyle = '#00ff9f'; ctx.font = '20px VT323'; ctx.textAlign = 'center'; ctx.fillText('💬', x*32+16, y*32+24); }
        if (lvl.zoneTriggers?.some(t => t.x === x && t.y === y)) { ctx.fillStyle = '#ffcc00'; ctx.font = '20px VT323'; ctx.textAlign = 'center'; ctx.fillText('⚡', x*32+16, y*32+24); }
    }
    
    // Render Trigger Areas
    if (lvl.zoneTriggers) {
        lvl.zoneTriggers.forEach(t => {
            ctx.save();
            if (t.w !== undefined && t.h !== undefined) {
                ctx.fillStyle = 'rgba(255, 204, 0, 0.15)';
                ctx.strokeStyle = 'rgba(255, 204, 0, 0.6)';
                ctx.setLineDash([5, 5]);
                ctx.lineWidth = 2;
                const ox = (t.offX || 0);
                const oy = (t.offY || 0);
                ctx.fillRect((t.x + ox) * 32, (t.y + oy) * 32, t.w * 32, t.h * 32);
                ctx.strokeRect((t.x + ox) * 32, (t.y + oy) * 32, t.w * 32, t.h * 32);
            } else if (t.radius > 0) {
                ctx.beginPath();
                ctx.arc(t.x * 32 + 16, t.y * 32 + 16, t.radius * 32, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 204, 0, 0.15)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 204, 0, 0.6)';
                ctx.setLineDash([5, 5]);
                ctx.stroke();
            }
            ctx.restore();
        });
    }
    for (const gb of ghostBlocks) drawChar(gb.x, gb.y, gb.c, 0.4, true);
    if (!isDrawing && currentTool !== 'select') drawChar(hoverPos.x, hoverPos.y, currentTool === 'eraser' ? ' ' : selectedTile, 0.5);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 1;
    for(let x=0; x<=w*32; x+=32) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h*32); ctx.stroke(); }
    for(let y=0; y<=h*32; y+=32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w*32,y); ctx.stroke(); }
    if (selectionStart && selectionEnd) {
        ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        if (currentTool === 'line') {
            ctx.beginPath();
            ctx.moveTo(selectionStart.x * 32 + 16, selectionStart.y * 32 + 16);
            ctx.lineTo(selectionEnd.x * 32 + 16, selectionEnd.y * 32 + 16);
            ctx.stroke();
        } else {
            const x1 = Math.min(selectionStart.x, selectionEnd.x), x2 = Math.max(selectionStart.x, selectionEnd.x);
            const y1 = Math.min(selectionStart.y, selectionEnd.y), y2 = Math.max(selectionStart.y, selectionEnd.y);
            ctx.strokeRect(x1 * 32, y1 * 32, (x2 - x1 + 1) * 32, (y2 - y1 + 1) * 32);
        }
        ctx.setLineDash([]);
    }
    if (hoveredChannel !== null) {
        const lvl = levelsData[currentLevelIdx];
        if (lvl?.links) {
            ctx.save(); ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 4;
            const pulse = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
            for (const key in lvl.links) {
                if (!key.endsWith('_init') && !key.endsWith('_behavior') && parseInt(lvl.links[key]) === hoveredChannel) {
                    const [cx, cy] = key.split(',').map(Number);
                    ctx.strokeRect(cx*32+1, cy*32+1, 30, 30);
                }
            }
            ctx.restore();
        }
    }
    animFrame++; requestAnimationFrame(renderLoop);
}

function setupEvents() {
    const btnTest = document.getElementById('btn-test');
    document.getElementById('btn-test').onclick = startTest;
    canvas.oncontextmenu = (e) => e.preventDefault();
    canvas.onwheel = (e) => {
        e.preventDefault();
        const delta = Math.sign(e.deltaY);
        
        if (e.shiftKey) {
            // Cycle tools
            const tools = ['brush', 'eraser', 'rect', 'line', 'select'];
            let idx = tools.indexOf(currentTool);
            idx = (idx + delta + tools.length) % tools.length;
            setTool(tools[idx]);
        } else {
            // Cycle tiles in current layer
            const validTiles = [];
            PALETTE.forEach(group => {
                const isOverlayGroup = group.title === "Esteiras" || group.title === "Coletáveis" || group.title === "Estrutura (Overlay)" || group.title === "Quântico" || group.title === "Núcleos";
                const isBlockGroup = group.title === "Amplificadores";
                const isWireGroup = group.title === "Fios (Rede)";
                const isEventGroup = group.title === "Eventos";
                const isGravityGroup = group.title === "Gravidade";
                
                if (activeLayer === 'overlays' && (isOverlayGroup || isGravityGroup)) group.tiles.forEach(t => validTiles.push(t.c));
                else if (activeLayer === 'blocks' && isBlockGroup) group.tiles.forEach(t => validTiles.push(t.c));
                else if (activeLayer === 'wires' && isWireGroup) group.tiles.forEach(t => validTiles.push(t.c));
                else if (activeLayer === 'events' && isEventGroup) group.tiles.forEach(t => validTiles.push(t.c));
                else if (activeLayer === 'base' && (!isOverlayGroup && !isBlockGroup && !isEventGroup && !isGravityGroup && !isWireGroup)) group.tiles.forEach(t => validTiles.push(t.c));
            });
            
            if (validTiles.length > 0) {
                let idx = validTiles.indexOf(selectedTile);
                if (idx === -1) idx = 0;
                idx = (idx + delta + validTiles.length) % validTiles.length;
                selectedTile = validTiles[idx];
                buildPalette();
            }
        }
    };
    setupPropertyListeners();
    document.getElementById('lvl-name').oninput = () => { levelsData[currentLevelIdx].name = document.getElementById('lvl-name').value; updateLevelList(); };
    document.getElementById('lvl-name').onchange = rebuildMock;
    const tIn = document.getElementById('lvl-timer');
    if (tIn) tIn.onchange = rebuildMock;
    document.getElementById('btn-new').onclick = () => {
        const w = parseInt(document.getElementById('map-w').value) || 20, h = parseInt(document.getElementById('map-h').value) || 15;
        levelsData.push({ name: "NEW LEVEL", map: Array(h).fill(" ".repeat(w)) });
        loadLevel(levelsData.length - 1); updateLevelList();
    };
    document.getElementById('btn-save').onclick = async () => {
        // Force rebuild to ensure all inputs are captured
        rebuildMock();

        // Save logic (fetch http://localhost:3001/save)
        const orderedLevels = [];
        const newChapters = JSON.parse(JSON.stringify(chaptersData));
        let nextIdx = 0;
        newChapters.forEach(chap => {
            const newLvlIndices = [];
            chap.levels.forEach(oldIdx => { 
                if (levelsData[oldIdx]) {
                    orderedLevels.push(levelsData[oldIdx]); 
                    newLvlIndices.push(nextIdx++); 
                }
            });
            chap.levels = newLvlIndices;
        });
        
        // Add levels not in chapters
        levelsData.forEach((lvl, i) => { 
            if (!chaptersData.some(c => c.levels.includes(i))) { 
                orderedLevels.push(lvl); 
                nextIdx++; 
            } 
        });

        try {
            const resp = await fetch('http://localhost:3001/save', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ levels: orderedLevels, chapters: newChapters }) 
            });
            if ((await resp.json()).status === 'ok') {
                levelsData = orderedLevels; 
                chaptersData = newChapters; 
                updateChapterList(); 
                updateLevelList();
                const btn = document.getElementById('btn-save'); 
                const old = btn.innerText; 
                btn.innerText = "✅ SALVO!"; 
                setTimeout(() => btn.innerText = old, 2000);
            }
        } catch (e) { showModal("Erro ao salvar!"); }
    };
    canvas.onmousedown = (e) => {
        const p = getGridPos(e);
        if (e.button === 1) { // Middle Click
            e.preventDefault();
            if (levelsData[currentLevelIdx].dialogues?.[`${p.x},${p.y}`]) {
                switchTab('tab-dialogues');
                setTimeout(() => {
                    const card = document.getElementById(`diag-card-${p.x}-${p.y}`);
                    if (card) { 
                        card.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
                        card.style.borderColor = '#00ff9f'; 
                        card.style.boxShadow = '0 0 15px rgba(0, 255, 159, 0.4)';
                        setTimeout(() => { card.style.borderColor = '#333'; card.style.boxShadow = ''; }, 2000); 
                    }
                }, 100);
                return;
            }
            if (levelsData[currentLevelIdx].zoneTriggers?.some(t => t.x === p.x && t.y === p.y)) {
                switchTab('tab-triggers');
                setTimeout(() => {
                    const list = document.getElementById('trigger-manager-list');
                    const cards = list.querySelectorAll('.trigger-card');
                    for (const card of cards) {
                        if (card.innerText.includes(`GATILHO [${p.x},${p.y}]`)) {
                            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            card.style.borderColor = '#ffcc00';
                            card.style.boxShadow = '0 0 15px rgba(255, 204, 0, 0.4)';
                            setTimeout(() => { card.style.borderColor = '#333'; card.style.boxShadow = ''; }, 2000);
                            break;
                        }
                    }
                }, 100);
                return;
            }
            // Rotation logic
            const map = activeLayer === 'base' ? currentMap : (activeLayer === 'overlays' ? currentOverlayMap : (activeLayer === 'wires' ? currentWiresMap : currentBlocksMap));
            const char = map[p.y][p.x];
            
            if (['E', 'M', 'y', 'p', 'R'].includes(char)) {
                const lvl = levelsData[currentLevelIdx];
                if (!lvl.links) lvl.links = {};
                const key = `${p.x},${p.y}_dir`;
                lvl.links[key] = ((lvl.links[key] || 0) + 1) % 4;
            } else {
                map[p.y][p.x] = getNextRotation(char);
            }
            saveHistory(); rebuildMock(); return;
        }
        
        isDrawing = true; startX = p.x; startY = p.y;
        
        if (currentTool === 'select' || currentTool === 'rect' || currentTool === 'line') {
            selectionStart = { ...p };
            selectionEnd = { ...p };
            if (currentTool === 'select') {
                editTargets = [];
                document.getElementById('floating-props').style.display = 'none';
            }
        } else if (currentTool === 'brush' || e.button === 2) {
            const char = (e.button === 2) ? ' ' : selectedTile;
            const map = (activeLayer === 'base') ? currentMap : (activeLayer === 'overlays' ? currentOverlayMap : (activeLayer === 'wires' ? currentWiresMap : currentBlocksMap));
            map[p.y][p.x] = char;
            if (activeLayer === 'events') {
                const lvl = levelsData[currentLevelIdx];
                if (char === '💬') {
                    if (!lvl.dialogues) lvl.dialogues = {};
                    if (!lvl.dialogues[`${p.x},${p.y}`]) lvl.dialogues[`${p.x},${p.y}`] = { text: "Nova fala...", icon: "central", trigger: "walk" };
                    updateDialogueManager();
                } else if (char === '⚡') {
                    if (!lvl.zoneTriggers) lvl.zoneTriggers = [];
                    if (!lvl.zoneTriggers.some(t => t.x === p.x && t.y === p.y)) {
                        lvl.zoneTriggers.push({ x: p.x, y: p.y, radius: 0, oneShot: true, events: [] });
                    }
                    updateTriggerManagerList();
                }
            }
            rebuildMock();
        }
    };
    canvas.onmousemove = (e) => {
        const p = getGridPos(e); hoverPos = p;
        
        // Update Overlay UI
        const overlay = document.getElementById('overlay-ui');
        if (overlay) {
            const char = currentMap[p.y]?.[p.x] || ' ';
            const ovChar = currentOverlayMap[p.y]?.[p.x] || ' ';
            const blChar = currentBlocksMap[p.y]?.[p.x] || ' ';
            let sym = char;
            if (ovChar !== ' ') sym += ` + ${ovChar}`;
            if (blChar !== ' ') sym += ` + ${blChar}`;
            overlay.innerText = `Coord: ${p.x},${p.y} | Sym: [${sym}]`;
        }

        if (!isDrawing) return;

        if (currentTool === 'select' || currentTool === 'rect' || currentTool === 'line') {
            selectionEnd = { ...p };
        } else if (currentTool === 'brush' || e.buttons & 2) {
            const char = (e.buttons & 2) ? ' ' : selectedTile;
            const map = (activeLayer === 'base') ? currentMap : (activeLayer === 'overlays' ? currentOverlayMap : (activeLayer === 'wires' ? currentWiresMap : currentBlocksMap));
            map[p.y][p.x] = char; rebuildMock();
        }
    };
    canvas.onmouseup = () => {
        if (!isDrawing) return;
        isDrawing = false;

        if (currentTool === 'select' && selectionStart && selectionEnd) {
            const x1 = Math.min(selectionStart.x, selectionEnd.x), x2 = Math.max(selectionStart.x, selectionEnd.x);
            const y1 = Math.min(selectionStart.y, selectionEnd.y), y2 = Math.max(selectionStart.y, selectionEnd.y);
            editTargets = [];
            for (let y = y1; y <= y2; y++) {
                for (let x = x1; x <= x2; x++) {
                    editTargets.push({ x, y });
                }
            }
            if (editTargets.length > 0) {
                const props = document.getElementById('floating-props');
                props.style.display = 'block';
                // Adjust position to viewport
                const rect = canvas.getBoundingClientRect();
                const x = (selectionEnd.x * 32) + rect.left + 40;
                const y = (selectionEnd.y * 32) + rect.top;
                props.style.left = `${Math.min(window.innerWidth - 300, x)}px`;
                props.style.top = `${Math.min(window.innerHeight - 400, y)}px`;
                updatePropertyPanel();
            }
        } else if ((currentTool === 'rect' || currentTool === 'line') && selectionStart && selectionEnd) {
            const map = (activeLayer === 'base') ? currentMap : (activeLayer === 'overlays' ? currentOverlayMap : (activeLayer === 'wires' ? currentWiresMap : currentBlocksMap));
            if (currentTool === 'rect') {
                const x1 = Math.min(selectionStart.x, selectionEnd.x), x2 = Math.max(selectionStart.x, selectionEnd.x);
                const y1 = Math.min(selectionStart.y, selectionEnd.y), y2 = Math.max(selectionStart.y, selectionEnd.y);
                for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) map[y][x] = selectedTile;
            } else {
                const points = getLinePoints(selectionStart.x, selectionStart.y, selectionEnd.x, selectionEnd.y);
                points.forEach(pt => { if (map[pt.y]) map[pt.y][pt.x] = selectedTile; });
            }
            selectionStart = null; selectionEnd = null;
            saveHistory(); rebuildMock();
        } else {
            saveHistory();
        }
    };
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F3') {
            e.preventDefault();
            if (isTestMode) stopTest();
            else startTest();
            return;
        }

        if (isTestMode) { handleTestInput(e); return; }

        if (e.key === 'Escape') {
            document.getElementById('floating-props').style.display = 'none';
            editTargets = [];
            // If in input, blur it
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                document.activeElement.blur();
            }
            return;
        }

        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        if (e.ctrlKey && e.key === 'z') undo();
        
        // Copy-Paste Tiles
        if (e.ctrlKey && e.key === 'c') {
            if (selectionStart && selectionEnd) {
                const x1 = Math.min(selectionStart.x, selectionEnd.x), x2 = Math.max(selectionStart.x, selectionEnd.x);
                const y1 = Math.min(selectionStart.y, selectionEnd.y), y2 = Math.max(selectionStart.y, selectionEnd.y);
                const lvl = levelsData[currentLevelIdx];
                
                const data = {
                    w: x2 - x1 + 1, h: y2 - y1 + 1,
                    tiles: [], links: {}
                };
                
                for (let y = y1; y <= y2; y++) {
                    const row = [];
                    for (let x = x1; x <= x2; x++) {
                        const tileData = {
                            b: currentMap[y][x],
                            o: currentOverlayMap[y][x],
                            w: currentWiresMap[y][x],
                            l: currentBlocksMap[y][x]
                        };
                        row.push(tileData);
                        
                        // Copy properties
                        const key = `${x},${y}`;
                        const prefixes = ['', '_behavior', '_init', '_isGlobal', '_dir', '_color', '_exitTo', '_spawnX', '_spawnY', '_label', '_labelColor'];
                        prefixes.forEach(p => {
                            if (lvl.links?.[key + p] !== undefined) {
                                data.links[`${x-x1},${y-y1}${p}`] = lvl.links[key + p];
                            }
                        });
                        // Copy dialogues
                        if (lvl.dialogues?.[key]) data.links[`${x-x1},${y-y1}_dialogue`] = lvl.dialogues[key];
                    }
                    data.tiles.push(row);
                }
                window.clipboardData = data;
                console.log("Copiado!", data);
            }
        }
        
        if (e.ctrlKey && e.key === 'v') {
            if (window.clipboardData) {
                const data = window.clipboardData;
                const p = hoverPos;
                const lvl = levelsData[currentLevelIdx];
                if (!lvl.links) lvl.links = {};
                if (!lvl.dialogues) lvl.dialogues = {};
                
                saveHistory();
                for (let y = 0; y < data.h; y++) {
                    for (let x = 0; x < data.w; x++) {
                        const ty = p.y + y, tx = p.x + x;
                        if (ty < currentMap.length && tx < currentMap[0].length) {
                            const tile = data.tiles[y][x];
                            currentMap[ty][tx] = tile.b;
                            currentOverlayMap[ty][tx] = tile.o;
                            currentWiresMap[ty][tx] = tile.w;
                            currentBlocksMap[ty][tx] = tile.l;
                            
                            // Paste properties
                            const oldKey = `${x},${y}`;
                            const newKey = `${tx},${ty}`;
                            const prefixes = ['', '_behavior', '_init', '_isGlobal', '_dir', '_color', '_exitTo', '_spawnX', '_spawnY', '_label', '_labelColor'];
                            prefixes.forEach(pref => {
                                if (data.links[oldKey + pref] !== undefined) {
                                    lvl.links[newKey + pref] = data.links[oldKey + pref];
                                }
                            });
                            // Paste dialogues
                            if (data.links[oldKey + '_dialogue']) {
                                lvl.dialogues[newKey] = JSON.parse(JSON.stringify(data.links[oldKey + '_dialogue']));
                            }
                        }
                    }
                }
                rebuildMock();
                console.log("Colado!");
            }
        }

        const key = e.key.toLowerCase();
        if (key === 'q') setLayer('base');
        if (key === 'w') setLayer('overlays');
        if (key === 'e') setLayer('blocks');
        if (key === 'r') setLayer('events');
        if (key === 'f') setLayer('wires');
    });
}

Object.assign(window, { loadLevel, rebuildMock, saveHistory, undo, getGridPos, getNextRotation, drawChar, renderLoop, setupEvents, getLinePoints });
