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
let currentMap = [];
let currentOverlayMap = [];
let currentBlocksMap = [];
let selectedTile = '#';
let activeLayer = 'base';
let currentTool = 'brush';
let isDrawing = false;
let startX = -1, startY = -1;
let historyStack = [];
let clipboard = null;
let selectionStart = null;
let selectionEnd = null;
let hoverPos = {x: 0, y: 0};
let editTargets = [];
let isTestMode = false;
let testGame = null;
let testAnimFrame = 0;
let testLastTime = 0;
let rebootConfirmTimer = null;
let originalLevels = null;
let canvas, ctx;
let mockGame = null;
let animFrame = 0;
let hoveredChannel = null;

// Expose core variables to window for other modules
Object.assign(window, {
    PALETTE, levelsData, chaptersData, currentLevelIdx, currentChapterIdx,
    currentMap, currentOverlayMap, currentBlocksMap, selectedTile,
    activeLayer, currentTool, isDrawing, historyStack, clipboard,
    selectionStart, selectionEnd, hoverPos, editTargets, isTestMode,
    testGame, testAnimFrame, testLastTime, rebootConfirmTimer,
    originalLevels, canvas, ctx, mockGame, animFrame, hoveredChannel
});

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
    
    setupEvents();
    requestAnimationFrame(renderLoop);
};

function loadLevel(idx) {
    currentLevelIdx = idx;
    const lvl = levelsData[idx];
    document.getElementById('lvl-name').value = lvl.name;
    document.getElementById('lvl-battery').value = lvl.time || 30;
    document.getElementById('lvl-timer').value = lvl.timer || 60;
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
    
    historyStack = [JSON.parse(JSON.stringify({map: currentMap, blocks: currentBlocksMap, overlays: currentOverlayMap, dialogues: lvl.dialogues || {}, zoneTriggers: lvl.zoneTriggers || []}))];
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
    lvl.time = parseInt(document.getElementById('lvl-battery').value) || 30;
    lvl.timer = parseInt(document.getElementById('lvl-timer').value) || 60;
    lvl.startWithBlackout = document.getElementById('check-lvl-blackout').checked;
    lvl.map = currentMap.map(row => row.join(''));
    lvl.blocks = currentBlocksMap.map(row => row.join(''));
    lvl.overlays = currentOverlayMap.map(row => row.join(''));

    mockGame.map = []; mockGame.blocks = []; mockGame.targets = []; mockGame.forbiddens = [];
    mockGame.sources = []; mockGame.redSources = []; mockGame.wires = [];
    mockGame.scrapPositions = new Set(); mockGame.totalScrap = 0; mockGame.conveyors = [];
    mockGame.doors = []; mockGame.buttons = []; mockGame.purpleButtons = [];
    mockGame.quantumFloors = []; mockGame.emitters = []; mockGame.catalysts = [];
    mockGame.portals = []; mockGame.glassWallsHit = new Set();
    mockGame.singularitySwitchers = []; mockGame.isSolarPhase = true;
    mockGame.zoneTriggers = JSON.parse(JSON.stringify(lvl.zoneTriggers || []));
    mockGame.isBlackoutActive = lvl.startWithBlackout || false;
    mockGame.blackoutAlpha = mockGame.isBlackoutActive ? 1 : 0;
    mockGame.chargingStations = []; mockGame.poweredStations = new Set();

    const h = currentMap.length;
    const w = currentMap[0].length;

    for (let y = 0; y < h; y++) {
        let row = [];
        for (let x = 0; x < w; x++) {
            let c = currentMap[y][x];
            row.push((c === '#' || c === '*' || c === 'W' || c === 'G') ? c : ' ');
            
            if (c === '@') { mockGame.player.x = x; mockGame.player.y = y; mockGame.startPos = { x, y }; }
            else if (c === 'B') mockGame.sources.push({ x, y });
            else if (c === 'X') mockGame.redSources.push({ x, y });
            else if (c === 'K') mockGame.chargingStations.push({ x, y });
            else if (['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r'].includes(c)) mockGame.wires.push({ x, y, type: c });
            else if (c === 'Z') mockGame.brokenCores.push({ x, y });
            else if (c === 'T' || (c >= '1' && c <= '9')) mockGame.targets.push({ x, y, required: c === 'T' ? 1 : parseInt(c) });
            else if (c === '0') mockGame.forbiddens.push({ x, y });
            else if (['>', '<', '^', 'v'].includes(c)) {
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
            } else if (c === '!') mockGame.singularitySwitchers.push({ x, y, wasSteppedOn: false, lightningTimer: 0, lightningSeed: 0 });

            let oc = currentOverlayMap[y][x];
            if (['(', ')', '[', ']'].includes(oc)) {
                let dir = 2; if (oc === ')') dir = 0; if (oc === '[') dir = 3; if (oc === ']') dir = 1;
                const chan = (lvl.links && lvl.links[`${x},${y}`]) || 0;
                mockGame.conveyors.push({ x, y, dir, channel: chan });
            } else if (oc === 'S') { mockGame.scrapPositions.add(`${x},${y}`); mockGame.totalScrap++; }
            else if (oc === 'D') {
                const chan = (lvl.links && lvl.links[`${x},${y}`]) || 0;
                mockGame.doors.push({ x, y, state: 'CLOSED', error: false, channel: chan });
            } else if (oc === '?') {
                const chan = (lvl.links && lvl.links[`${x},${y}`]) || 0;
                mockGame.quantumFloors.push({ x, y, active: true, channel: chan, flashTimer: 0, pulseIntensity: 1.0, entrySide: null, whiteGlow: 0 });
            } else if (oc === '_' || oc === 'P') {
                const chan = (lvl.links && lvl.links[`${x},${y}`]) || 0;
                const behavior = (lvl.links && lvl.links[`${x},${y}_behavior`]) || (oc === 'P' ? 'PRESSURE' : 'TIMER');
                const initState = (lvl.links && lvl.links[`${x},${y}_init`]) === true;
                mockGame.buttons.push({ x, y, isPressed: initState, channel: chan, behavior: behavior });
            } else if (oc === 'G') row[x] = 'G';
            else if (oc === 'E' || oc === 'M') {
                const dir = (lvl.links && lvl.links[`${x},${y}_dir`]) || 0;
                if (oc === 'E' && !mockGame.emitters.some(e => e.x === x && e.y === y)) {
                    const inverted = (lvl.links && lvl.links[`${x},${y}_init`]) === false;
                    mockGame.emitters.push({ x, y, dir, inverted });
                } else if (!mockGame.blocks.some(b => b.x === x && b.y === y)) mockGame.blocks.push({ x, y, dir, type: 'PRISM' });
            } else if (oc === 'O' && !mockGame.portals.some(p => p.x === x && p.y === y)) {
                const chan = (lvl.links && lvl.links[`${x},${y}`]) || 0;
                const pColor = (lvl.links && lvl.links[`${x},${y}_color`]) || '#ffd700';
                mockGame.portals.push({ x, y, channel: chan, slot: { content: null }, color: pColor });
            }

            let bc = currentBlocksMap[y][x];
            if (['>', '<', '^', 'v', 'y', 'p'].includes(bc)) {
                let dir = 0; if (bc === '<') dir = 2; if (bc === '^') dir = 3; if (bc === 'v') dir = 1;
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
    mockGame.updateEnergy(); mockGame.updateEmitters();
    Graphics.initLevelContext(mockGame);
}

function saveHistory() {
    const lvl = levelsData[currentLevelIdx];
    historyStack.push(JSON.parse(JSON.stringify({
        map: currentMap, blocks: currentBlocksMap, overlays: currentOverlayMap,
        dialogues: lvl.dialogues || {}, zoneTriggers: lvl.zoneTriggers || []
    })));
    if (historyStack.length > 50) historyStack.shift();
}

function undo() {
    if (historyStack.length > 1) {
        historyStack.pop();
        const state = JSON.parse(JSON.stringify(historyStack[historyStack.length - 1]));
        currentMap = state.map; currentBlocksMap = state.blocks; currentOverlayMap = state.overlays;
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
        if (c === '#') { Graphics.drawCeiling(x, y); ctx.restore(); return; }
        else if (c === 'W') { Graphics.drawWallFace(x, y); ctx.restore(); return; }
        else if (c === '*') {
            let mask = 0; const map = currentMap;
            if (y > 0 && map[y-1][x] === '*') mask |= 1;
            if (x < map[0].length - 1 && map[y][x+1] === '*') mask |= 2;
            if (y < map.length - 1 && map[y+1][x] === '*') mask |= 4;
            if (x > 0 && map[y][x-1] === '*') mask |= 8;
            Graphics.drawHole(x, y, mask);
        } else Graphics.drawFloor(x, y);
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
        let dir = 0; if(c==='v') dir=1; if(c==='<') dir=2; if(c==='^') dir=3;
        Graphics.drawBlock(x, y, dir * Math.PI / 2, mockGame.poweredBlocks.get(`${x},${y}`), 0, dir, 'NORMAL', 0, c==='y'?'SOLAR':(c==='p'?'LUNAR':null), mockGame.isSolarPhase);
    } else if (['(', ')', '[', ']'].includes(c)) {
        let dir = 2; if(c===')') dir=0; if(c==='[') dir=3; if(c===']') dir=1;
        const conv = mockGame.conveyors.find(cv => cv.x === x && cv.y === y);
        Graphics.drawConveyor(x, y, dir, animFrame, conv?.inDir, conv?.beltDist || 0, conv?.beltLength || 10, true, currentMap[y][x] === '*');
    } else if (c === 'D') {
        const door = mockGame.doors.find(d => d.x === x && d.y === y);
        Graphics.drawDoor(x, y, door?.state || 'CLOSED', door?.error || false, animFrame, door?.orientation, door?.pair?.side);
    } else if (c === '_' || c === 'P') {
        const btn = mockGame.buttons.find(b => b.x === x && b.y === y);
        Graphics.drawButton(x, y, btn?.isPressed || false, btn?.behavior || (c === 'P' ? 'PRESSURE' : 'TIMER'), btn?.charge || 0);
    } else if (c === 'E') Graphics.drawEmitter(x, y, mockGame.emitters.find(e => e.x === x && e.y === y)?.dir || 0, animFrame);
    else if (c === 'M') Graphics.drawBlock(x, y, (mockGame.blocks.find(b => b.x === x && b.y === y)?.dir || 0) * (Math.PI/2), null, 0, 0, 'PRISM');
    else if (c === 'O') {
        const p = mockGame.portals.find(p => p.x === x && p.y === y);
        Graphics.drawPortal(x, y, p?.channel || 0, animFrame, p?.color || '#ffd700');
    } else if (c === '💬') { ctx.fillStyle = '#00ff9f'; ctx.font = '20px VT323'; ctx.textAlign = 'center'; ctx.fillText('💬', x*32+16, y*32+24); }
    else if (c === '⚡') { ctx.fillStyle = '#ffcc00'; ctx.font = '20px VT323'; ctx.textAlign = 'center'; ctx.fillText('⚡', x*32+16, y*32+24); }
    ctx.restore();
}

function renderLoop() {
    if (isTestMode || !mockGame) return requestAnimationFrame(renderLoop);
    Graphics.clear();
    const h = currentMap.length, w = currentMap[0].length;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const bc = currentMap[y][x];
        if (bc !== '#' && bc !== 'W') drawChar(x, y, bc); else Graphics.drawFloor(x, y);
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
        if (currentMap[y][x] === '#' || currentMap[y][x] === 'W') drawChar(x, y, currentMap[y][x]);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const lvl = levelsData[currentLevelIdx];
        if (lvl.dialogues?.[`${x},${y}`]) { ctx.fillStyle = '#00ff9f'; ctx.font = '20px VT323'; ctx.textAlign = 'center'; ctx.fillText('💬', x*32+16, y*32+24); }
        if (lvl.zoneTriggers?.some(t => t.x === x && t.y === y)) { ctx.fillStyle = '#ffcc00'; ctx.font = '20px VT323'; ctx.textAlign = 'center'; ctx.fillText('⚡', x*32+16, y*32+24); }
    }
    for (const gb of ghostBlocks) drawChar(gb.x, gb.y, gb.c, 0.4, true);
    if (!isDrawing && currentTool !== 'select') drawChar(hoverPos.x, hoverPos.y, currentTool === 'eraser' ? ' ' : selectedTile, 0.5);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 1;
    for(let x=0; x<=w*32; x+=32) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h*32); ctx.stroke(); }
    for(let y=0; y<=h*32; y+=32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w*32,y); ctx.stroke(); }
    if (selectionStart && selectionEnd) {
        const x1 = Math.min(selectionStart.x, selectionEnd.x), x2 = Math.max(selectionStart.x, selectionEnd.x);
        const y1 = Math.min(selectionStart.y, selectionEnd.y), y2 = Math.max(selectionStart.y, selectionEnd.y);
        ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.strokeRect(x1*32, y1*32, (x2-x1+1)*32, (y2-y1+1)*32); ctx.setLineDash([]);
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
    setupPropertyListeners();
    document.getElementById('lvl-name').oninput = () => { levelsData[currentLevelIdx].name = document.getElementById('lvl-name').value; updateLevelList(); };
    document.getElementById('lvl-name').onchange = rebuildMock;
    document.getElementById('lvl-battery').onchange = rebuildMock;
    document.getElementById('lvl-timer').onchange = rebuildMock;
    document.getElementById('btn-new').onclick = () => {
        const w = parseInt(document.getElementById('map-w').value) || 20, h = parseInt(document.getElementById('map-h').value) || 15;
        levelsData.push({ name: "NEW LEVEL", time: 30, map: Array(h).fill(" ".repeat(w)) });
        loadLevel(levelsData.length - 1); updateLevelList();
    };
    document.getElementById('btn-save').onclick = async () => {
        // Save logic (fetch http://localhost:3001/save)
        const orderedLevels = [];
        const newChapters = JSON.parse(JSON.stringify(chaptersData));
        let nextIdx = 0;
        newChapters.forEach(chap => {
            const newLvlIndices = [];
            chap.levels.forEach(oldIdx => { orderedLevels.push(levelsData[oldIdx]); newLvlIndices.push(nextIdx++); });
            chap.levels = newLvlIndices;
        });
        levelsData.forEach((lvl, i) => { if (!chaptersData.some(c => c.levels.includes(i))) { orderedLevels.push(lvl); nextIdx++; } });
        try {
            const resp = await fetch('http://localhost:3001/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ levels: orderedLevels, chapters: newChapters }) });
            if ((await resp.json()).status === 'ok') {
                levelsData = orderedLevels; chaptersData = newChapters; updateChapterList(); updateLevelList();
                const btn = document.getElementById('btn-save'); const old = btn.innerText; btn.innerText = "✅ SALVO!"; setTimeout(() => btn.innerText = old, 2000);
            }
        } catch (e) { showModal("Erro ao salvar!"); }
    };
    canvas.onmousedown = (e) => {
        const p = getGridPos(e);
        if (e.button === 1) { // Middle Click
            e.preventDefault();
            if (levelsData[currentLevelIdx].dialogues?.[`${p.x},${p.y}`]) {
                switchTab('tab-dialogues');
                const card = document.getElementById(`diag-card-${p.x}-${p.y}`);
                if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.style.borderColor = '#00ff9f'; setTimeout(() => card.style.borderColor = '#333', 2000); }
                return;
            }
            // Rotation logic
            const map = activeLayer === 'base' ? currentMap : (activeLayer === 'overlays' ? currentOverlayMap : currentBlocksMap);
            map[p.y][p.x] = getNextRotation(map[p.y][p.x]);
            saveHistory(); rebuildMock(); return;
        }
        isDrawing = true; startX = p.x; startY = p.y;
        if (currentTool === 'brush' || e.button === 2) {
            const char = (e.button === 2) ? ' ' : selectedTile;
            const map = activeLayer === 'base' ? currentMap : (activeLayer === 'overlays' ? currentOverlayMap : currentBlocksMap);
            map[p.y][p.x] = char;
            if (activeLayer === 'events' && char === '💬') {
                const lvl = levelsData[currentLevelIdx];
                if (!lvl.dialogues) lvl.dialogues = {};
                if (!lvl.dialogues[`${p.x},${p.y}`]) lvl.dialogues[`${p.x},${p.y}`] = { text: "Nova fala...", icon: "central", trigger: "walk" };
                updateDialogueManager();
            }
            rebuildMock();
        }
    };
    canvas.onmousemove = (e) => {
        const p = getGridPos(e); hoverPos = p;
        if (isDrawing && (currentTool === 'brush' || e.buttons & 2)) {
            const char = (e.buttons & 2) ? ' ' : selectedTile;
            const map = activeLayer === 'base' ? currentMap : (activeLayer === 'overlays' ? currentOverlayMap : currentBlocksMap);
            map[p.y][p.x] = char; rebuildMock();
        }
    };
    canvas.onmouseup = () => { isDrawing = false; saveHistory(); };
    window.addEventListener('keydown', (e) => {
        if (isTestMode) { handleTestInput(e); return; }
        if (e.ctrlKey && e.key === 'z') undo();
    });
}

Object.assign(window, { loadLevel, rebuildMock, saveHistory, undo, getGridPos, getNextRotation, drawChar, renderLoop, setupEvents });
