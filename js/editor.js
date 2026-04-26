/**
 * CIRCUIT BREAKER - Level Editor Logic
 */

let levelsData = LEVELS;
let chaptersData = CHAPTERS;
let currentLevelIdx = 0;
let activeLayer = 'base'; // base, overlays, blocks
let selectedTile = '#';
let currentTool = 'brush';

function initEditor() {
    const canvas = document.getElementById('editor-canvas');
    const ctx = canvas.getContext('2d');
    
    // Palette Setup
    const baseTiles = ['#', ' ', '@', 'B', 'X', 'T', '1', '2', '3', 'Z', 'K'];
    const overlayTiles = ['H', 'V', '+', 'L', 'J', 'C', 'F', 'u', 'd', 'l', 'r', 'D', '_', 'P', '(', ')', '[', ']', '?'];
    const blockTiles = ['>', '<', '^', 'v'];

    const paletteEl = document.getElementById('palette');
    function buildPalette() {
        paletteEl.innerHTML = '';
        let tiles = baseTiles;
        if (activeLayer === 'overlays') tiles = overlayTiles;
        if (activeLayer === 'blocks') tiles = blockTiles;

        tiles.forEach(t => {
            const opt = document.createElement('div');
            opt.className = 'tile-opt' + (selectedTile === t ? ' active' : '');
            opt.innerText = t;
            opt.onclick = () => {
                selectedTile = t;
                buildPalette();
            };
            paletteEl.appendChild(opt);
        });
    }

    buildPalette();

    document.getElementById('btn-save').onclick = async () => {
        const payload = {
            levels: levelsData,
            chapters: chaptersData
        };
        try {
            const resp = await fetch('http://localhost:3001/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            alert("Salvo com sucesso!");
        } catch (e) {
            alert("Erro ao conectar com servidor do editor.");
        }
    };
}

window.onload = initEditor;
