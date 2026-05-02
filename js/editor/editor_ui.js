// Circuit Breaker - Editor UI Module
// Handles sidebars, panels, modals, and specialized managers (Dialogues/Triggers)

Object.assign(window, {
    buildPalette,
    setLayer,
    setTool,
    updateChapterList,
    renameChapter,
    deleteChapter,
    updateLevelList,
    changeChapterForLevel,
    addToChapter,
    removeFromChapter,
    moveLevelInChapter,
    cloneLevel,
    moveLevel,
    deleteLevel,
    showModal,
    resizeMap,
    switchTab,
    updateDialogueManager,
    updateDialogueProp,
    addDialogueMessage,
    removeDialogueMessage,
    removeDialogue,
    updateTriggerManagerList,
    updateTriggerProp,
    removeTrigger,
    setupPropertyListeners,
    updatePropertyPanel
});

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

function switchTab(tabId) {
    // 1. Update Tabs UI
    document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    const clickedTab = document.querySelector(`.sidebar-tab[onclick*="${tabId}"]`);
    if (clickedTab) clickedTab.classList.add('active');

    // 2. Update Content Panes
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');

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
                    <span style="font-size: 10px; color: #aaa;">POSIÇÃO:</span>
                    <select style="flex: 1; background: #000; color: #fff; border: 1px solid #444; font-size: 11px; padding: 2px;"
                        onchange="updateDialogueProp('${key}', 'position', this.value, -1)">
                        <option value="follow" ${eventConfig.position === 'follow' ? 'selected' : ''}>Seguir Robô</option>
                        <option value="top" ${eventConfig.position === 'top' ? 'selected' : ''}>Topo (Centro)</option>
                        <option value="bottom" ${eventConfig.position === 'bottom' ? 'selected' : ''}>Rodapé (Centro)</option>
                        <option value="left" ${eventConfig.position === 'left' ? 'selected' : ''}>Esquerda</option>
                        <option value="right" ${eventConfig.position === 'right' ? 'selected' : ''}>Direita</option>
                        <option value="center" ${eventConfig.position === 'center' ? 'selected' : ''}>Centro da Tela</option>
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
                
                <div style="display: flex; align-items: center; gap: 8px; background: rgba(0,255,159,0.05); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(0,255,159,0.1);">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 11px; color: #fff; flex: 1;">
                        <input type="checkbox" ${eventConfig.autoDismiss !== false ? 'checked' : ''} onchange="updateDialogueProp('${key}', 'autoDismiss', this.checked, -1); updateDialogueManager();"> Auto-Fechar
                    </label>
                    ${eventConfig.autoDismiss !== false ? `
                        <div style="display: flex; align-items: center; gap: 3px;">
                            <input type="number" step="0.1" min="0.2" max="20" value="${(eventConfig.dismissDelay !== undefined ? eventConfig.dismissDelay : 1500) / 1000}" 
                                style="width: 38px; background: #000; color: #00ff9f; border: 1px solid #444; font-size: 10px; padding: 1px; text-align: center;"
                                onchange="updateDialogueProp('${key}', 'dismissDelay', Math.round(parseFloat(this.value) * 1000), -1)">
                            <span style="font-size: 9px; color: #888;">s</span>
                        </div>
                    ` : ''}
                </div>

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
    
    lvl.zoneTriggers.forEach((trigger, tIdx) => {
        // Migration: ensure trigger has events array
        if (!trigger.events) {
            trigger.events = [];
            if (trigger.type) {
                trigger.events.push({ type: trigger.type, action: trigger.action, channel: trigger.channel });
                delete trigger.type; delete trigger.action; delete trigger.channel;
            }
        }

        const card = document.createElement('div');
        card.className = 'trigger-card';
        card.style.cssText = 'background: #1a1a1a; border: 1px solid #333; padding: 12px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #ffcc00;';
        
        let eventsHtml = '';
        trigger.events.forEach((event, eIdx) => {
            eventsHtml += `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid #333; border-radius: 4px; padding: 8px; margin-top: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 9px; color: #888; letter-spacing: 1px;">AÇÃO #${eIdx + 1}</span>
                    <div style="display: flex; gap: 2px;">
                        <button onclick="moveTriggerEvent(${tIdx}, ${eIdx}, -1)" class="action-btn">▲</button>
                        <button onclick="moveTriggerEvent(${tIdx}, ${eIdx}, 1)" class="action-btn">▼</button>
                        <button onclick="removeTriggerEvent(${tIdx}, ${eIdx})" class="action-btn" style="color: #ff4444;">×</button>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <select onchange="updateTriggerEventProp(${tIdx}, ${eIdx}, 'type', this.value)" style="width: 100%; background: #000; color: #ffcc00; border: 1px solid #444; font-size: 11px; padding: 3px; border-radius: 3px;">
                        <option value="wait" ${event.type === 'wait' ? 'selected' : ''}>⏳ ESPERAR</option>
                        <option value="music_intensity" ${event.type === 'music_intensity' ? 'selected' : ''}>🎵 MÚSICA</option>
                        <option value="blackout" ${event.type === 'blackout' ? 'selected' : ''}>🌑 APAGÃO</option>
                        <option value="earthquake" ${event.type === 'earthquake' ? 'selected' : ''}>📳 TREMOR</option>
                        <option value="visual_sparks" ${event.type === 'visual_sparks' ? 'selected' : ''}>✨ FAÍSCAS</option>
                        <option value="security_alert" ${event.type === 'security_alert' ? 'selected' : ''}>🚨 ALERTA</option>
                        <option value="remote_signal" ${event.type === 'remote_signal' ? 'selected' : ''}>📡 SINAL</option>
                        <option value="dimension_shift" ${event.type === 'dimension_shift' ? 'selected' : ''}>🌀 DIMENSÃO</option>
                        <option value="gravity" ${event.type === 'gravity' ? 'selected' : ''}>⚛️ GRAVIDADE</option>
                        <option value="dialogue" ${event.type === 'dialogue' ? 'selected' : ''}>💬 DIÁLOGO</option>
                    </select>
                    ${renderEventActionInput(tIdx, eIdx, event)}
                </div>
            </div>
            `;
        });

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="color: #ffcc00; font-size: 12px; font-weight: bold; letter-spacing: 1px;">⚡ GATILHO [${trigger.x},${trigger.y}]</span>
                <button onclick="removeTrigger(${tIdx})" style="background: none; border: none; color: #ff4444; cursor: pointer; padding: 0; font-size: 16px;">✖</button>
            </div>
            
            <div style="display: flex; gap: 12px; background: rgba(255,204,0,0.05); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,204,0,0.1);">
                <!-- Compact Directional Controls -->
                <div style="display: grid; grid-template-columns: repeat(3, 22px); gap: 2px; align-items: center;">
                    <div></div>
                    <button onclick="growTrigger(${tIdx}, 'up', 1)" oncontextmenu="event.preventDefault(); growTrigger(${tIdx}, 'up', -1)" style="width:22px; height:22px; padding:0; font-size:10px; background:#333; color:#fff;" title="Esq: Expande / Dir: Recua">▲</button>
                    <div></div>
                    <button onclick="growTrigger(${tIdx}, 'left', 1)" oncontextmenu="event.preventDefault(); growTrigger(${tIdx}, 'left', -1)" style="width:22px; height:22px; padding:0; font-size:10px; background:#333; color:#fff;" title="Esq: Expande / Dir: Recua">◀</button>
                    <div onclick="resetTriggerSize(${tIdx})" style="text-align:center; font-size:8px; color:#ffcc00; font-weight:bold; cursor:pointer;" title="Clique para Resetar (1x1)">ÁREA</div>
                    <button onclick="growTrigger(${tIdx}, 'right', 1)" oncontextmenu="event.preventDefault(); growTrigger(${tIdx}, 'right', -1)" style="width:22px; height:22px; padding:0; font-size:10px; background:#333; color:#fff;" title="Esq: Expande / Dir: Recua">▶</button>
                    <div></div>
                    <button onclick="growTrigger(${tIdx}, 'down', 1)" oncontextmenu="event.preventDefault(); growTrigger(${tIdx}, 'down', -1)" style="width:22px; height:22px; padding:0; font-size:10px; background:#333; color:#fff;" title="Esq: Expande / Dir: Recua">▼</button>
                    <div></div>
                </div>

                <div style="flex: 1; display: flex; flex-direction: column; gap: 4px; justify-content: center;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 10px; color: #aaa;">TAMANHO:</span>
                        <span style="font-size: 11px; color: #fff; font-family: monospace; font-weight: bold;">${trigger.w || 1}x${trigger.h || 1}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 10px; color: #aaa;">RAIO:</span>
                        <input type="number" min="0" max="15" value="${trigger.radius || 0}" 
                            style="width: 35px; background: #000; color: #fff; border: 1px solid #444; font-size: 10px; padding: 1px 3px;"
                            onchange="updateTriggerProp(${tIdx}, 'radius', parseInt(this.value))">
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
                         <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 10px; color: #fff;">
                            <input type="checkbox" ${trigger.oneShot !== false ? 'checked' : ''} onchange="updateTriggerProp(${tIdx}, 'oneShot', this.checked)"> ÚNICO
                        </label>
                        <button onclick="resetTriggerSize(${tIdx})" style="font-size: 8px; background: #333; color: #aaa; border: none; padding: 2px 4px; border-radius: 2px; cursor: pointer;">RESET</button>
                    </div>
                </div>
            </div>

            <div class="trigger-events-container">
                ${eventsHtml}
            </div>

            <button onclick="addTriggerEvent(${tIdx})" style="width: 100%; background: rgba(255, 204, 0, 0.1); color: #ffcc00; border: 1px dashed #ffcc00; padding: 6px; font-size: 10px; cursor: pointer; margin-top: 8px; border-radius: 4px; font-weight: bold;">
                + ADICIONAR AÇÃO À SEQUÊNCIA
            </button>
        `;
        list.appendChild(card);
    });
}
function updateTriggerEventProp(tIdx, eIdx, prop, value) {
    const lvl = levelsData[currentLevelIdx];
    const event = lvl.zoneTriggers[tIdx]?.events[eIdx];
    if (event) {
        event[prop] = value;
        
        // If type changed, reset action to a valid default for that type
        if (prop === 'type') {
            const defaults = {
                'wait': '30',
                'music_intensity': '1',
                'blackout': 'activate',
                'security_alert': 'activate',
                'remote_signal': 'activate',
                'dimension_shift': 'toggle',
                'gravity': 'down',
                'earthquake': '30',
                'visual_sparks': '',
                'dialogue': ''
            };
            event.action = defaults[value] || '';
            if (value === 'remote_signal') event.channel = '0';
            if (value === 'earthquake') event.force = '0.8';
        }
        
        saveHistory();
        updateTriggerManagerList();
    }
}

function addTriggerEvent(tIdx) {
    const lvl = levelsData[currentLevelIdx];
    if (lvl.zoneTriggers[tIdx]) {
        lvl.zoneTriggers[tIdx].events.push({ type: 'wait', action: '30' });
        saveHistory();
        updateTriggerManagerList();
    }
}

function removeTriggerEvent(tIdx, eIdx) {
    const lvl = levelsData[currentLevelIdx];
    if (lvl.zoneTriggers[tIdx]?.events) {
        lvl.zoneTriggers[tIdx].events.splice(eIdx, 1);
        saveHistory();
        updateTriggerManagerList();
    }
}

function moveTriggerEvent(tIdx, eIdx, dir) {
    const lvl = levelsData[currentLevelIdx];
    const events = lvl.zoneTriggers[tIdx]?.events;
    if (!events) return;
    const newIdx = eIdx + dir;
    if (newIdx < 0 || newIdx >= events.length) return;
    [events[eIdx], events[newIdx]] = [events[newIdx], events[eIdx]];
    saveHistory();
    updateTriggerManagerList();
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
function growTrigger(idx, dir, amount) {
    const lvl = levelsData[currentLevelIdx];
    if (!lvl.zoneTriggers || !lvl.zoneTriggers[idx]) return;
    const t = lvl.zoneTriggers[idx];
    if (t.w === undefined) t.w = 1;
    if (t.h === undefined) t.h = 1;
    if (t.offX === undefined) t.offX = 0;
    if (t.offY === undefined) t.offY = 0;

    if (dir === 'right') {
        t.w = Math.max(1, t.w + amount);
    } else if (dir === 'down') {
        t.h = Math.max(1, t.h + amount);
    } else if (dir === 'left') {
        if (amount > 0) {
            t.offX--; t.w++;
        } else {
            if (t.w > 1) { t.offX++; t.w--; }
        }
    } else if (dir === 'up') {
        if (amount > 0) {
            t.offY--; t.h++;
        } else {
            if (t.h > 1) { t.offY++; t.h--; }
        }
    }
    
    updateTriggerManagerList();
    saveHistory();
    rebuildMock();
}

function resetTriggerSize(idx) {
    const lvl = levelsData[currentLevelIdx];
    if (!lvl.zoneTriggers || !lvl.zoneTriggers[idx]) return;
    const t = lvl.zoneTriggers[idx];
    t.w = 1; t.h = 1;
    t.offX = 0; t.offY = 0;
    updateTriggerManagerList();
    saveHistory();
    rebuildMock();
}

Object.assign(window, { moveTriggerEvent, removeTriggerEvent, addTriggerEvent, updateTriggerEventProp, removeTrigger, updateTriggerProp, growTrigger, resetTriggerSize });

function setupPropertyListeners() {
    // Dialogues
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
        const val = Math.round(parseFloat(e.target.value) * 1000) || 1500;
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

    // Channels & Numbers
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
        const affectedChannels = new Set();
        for (const target of editTargets) {
            const chan = lvl.links[`${target.x},${target.y}`] || 0;
            affectedChannels.add(chan);
            lvl.links[`${target.x},${target.y}_color`] = color;
        }
        for (let y = 0; y < currentMap.length; y++) {
            for (let x = 0; x < currentMap[y].length; x++) {
                const char = currentMap[y][x];
                const oChar = currentOverlayMap[y][x];
                if (char === 'O' || oChar === 'O') {
                    const chan = lvl.links[`${x},${y}`] || 0;
                    if (affectedChannels.has(chan)) lvl.links[`${x},${y}_color`] = color;
                }
            }
        }
        saveHistory(); rebuildMock();
    };

    document.getElementById('btn-clear-channel').onclick = () => {
        if (editTargets.length === 0) return;
        const lvl = levelsData[currentLevelIdx];
        if (!lvl.links) return;
        for (const target of editTargets) {
            const key = `${target.x},${target.y}`;
            delete lvl.links[key];
            delete lvl.links[`${key}_behavior`];
            delete lvl.links[`${key}_init`];
            delete lvl.links[`${key}_dir`];
            delete lvl.links[`${key}_color`];
        }
        saveHistory(); rebuildMock();
        document.getElementById('prop-channel').value = 0;
    };

    document.getElementById('prop-toggle').onchange = (e) => {
        if (editTargets.length === 0) return;
        const val = e.target.checked;
        const lvl = levelsData[currentLevelIdx];
        if (!lvl.links) lvl.links = {};
        for (const target of editTargets) {
            lvl.links[`${target.x},${target.y}_init`] = val;
        }
        saveHistory(); rebuildMock();
    };

    document.getElementById('prop-behavior').onchange = (e) => {
        if (editTargets.length === 0) return;
        const behavior = e.target.value;
        const lvl = levelsData[currentLevelIdx];
        if (!lvl.links) lvl.links = {};
        for (const target of editTargets) {
            const char = [currentBlocksMap[target.y][target.x], currentOverlayMap[target.y][target.x], currentMap[target.y][target.x]].find(c => c !== ' ');
            if (char === 'E' || char === 'M') lvl.links[`${target.x},${target.y}_dir`] = parseInt(behavior);
            else lvl.links[`${target.x},${target.y}_behavior`] = behavior;
        }
        saveHistory(); rebuildMock();
    };

    document.getElementById('btn-close-props').onclick = () => {
        document.getElementById('floating-props').style.display = 'none';
        editTargets = [];
    };

    document.getElementById('btn-copy-props').onclick = () => {
        if (editTargets.length === 0) return;
        const p = editTargets[0];
        const lvl = levelsData[currentLevelIdx];
        const key = `${p.x},${p.y}`;
        clipboard = {
            chan: lvl.links?.[key],
            behavior: lvl.links?.[`${key}_behavior`],
            init: lvl.links?.[`${key}_init`],
            dir: lvl.links?.[`${key}_dir`],
            color: lvl.links?.[`${key}_color`]
        };
    };

    document.getElementById('btn-paste-props').onclick = () => {
        if (editTargets.length === 0 || !clipboard) return;
        const lvl = levelsData[currentLevelIdx];
        if (!lvl.links) lvl.links = {};
        for (const target of editTargets) {
            const key = `${target.x},${target.y}`;
            if (clipboard.chan !== undefined) lvl.links[key] = clipboard.chan;
            if (clipboard.behavior !== undefined) lvl.links[`${key}_behavior`] = clipboard.behavior;
            if (clipboard.init !== undefined) lvl.links[`${key}_init`] = clipboard.init;
            if (clipboard.dir !== undefined) lvl.links[`${key}_dir`] = clipboard.dir;
            if (clipboard.color !== undefined) lvl.links[`${key}_color`] = clipboard.color;
        }
        saveHistory(); rebuildMock(); updatePropertyPanel();
    };
}
function updatePropertyPanel() {
    if (editTargets.length === 0) return;
    const p = editTargets[0];
    const lvl = levelsData[currentLevelIdx];
    const char = [currentBlocksMap[p.y][p.x], currentOverlayMap[p.y][p.x], currentMap[p.y][p.x]].find(c => c !== ' ' && c !== undefined);
    
    document.getElementById('prop-type').innerText = `TIPO: ${char || 'Vazio'}`;
    
    const isAmps = char === 'T' || (char >= '1' && char <= '9');
    document.getElementById('prop-amps').parentElement.style.display = isAmps ? 'flex' : 'none';
    if (isAmps) document.getElementById('prop-amps').value = char === 'T' ? 1 : parseInt(char);

    const hasChannel = ['D', '_', 'P', 'E', 'O', '?', '(', ')', '[', ']', 'M'].includes(char);
    document.getElementById('prop-channel-container').style.display = hasChannel ? 'flex' : 'none';
    if (hasChannel) {
        const chan = lvl.links?.[`${p.x},${p.y}`] || 0;
        document.getElementById('prop-channel').value = chan;
        document.getElementById('prop-channel-val').innerText = chan;
        updateChannelGrid();
    }

    const hasBehavior = ['_', 'P', '?', 'D'].includes(char);
    const isSpecial = char === 'E' || char === 'M';
    document.getElementById('prop-behavior-container').style.display = (hasBehavior || isSpecial) ? 'flex' : 'none';
    
    const behaviorSelect = document.getElementById('prop-behavior');
    if (hasBehavior) {
        behaviorSelect.innerHTML = `
            <option value="TIMER">🟡 TIMER</option>
            <option value="TOGGLE">🟢 TOGGLE</option>
            <option value="PERMANENT">🔴 FIXO</option>
            <option value="PRESSURE">🟣 PRESSÃO</option>
        `;
        behaviorSelect.value = lvl.links?.[`${p.x},${p.y}_behavior`] || (char === 'P' ? 'PRESSURE' : 'TIMER');
    } else if (isSpecial) {
        behaviorSelect.innerHTML = `
            <option value="0">➡️ DIREITA</option>
            <option value="1">⬇️ BAIXO</option>
            <option value="2">⬅️ ESQUERDA</option>
            <option value="3">⬆️ CIMA</option>
        `;
        behaviorSelect.value = lvl.links?.[`${p.x},${p.y}_dir`] || 0;
    }

    const hasToggle = ['D', 'E', '_', 'P'].includes(char);
    document.getElementById('prop-toggle-container').style.display = hasToggle ? 'flex' : 'none';
    if (hasToggle) {
        document.getElementById('prop-toggle').checked = lvl.links?.[`${p.x},${p.y}_init`] === true;
    }

    const isPortal = char === 'O';
    document.getElementById('prop-color-container').style.display = isPortal ? 'flex' : 'none';
    if (isPortal) {
        document.getElementById('prop-portal-color').value = lvl.links?.[`${p.x},${p.y}_color`] || '#ffd700';
    }

    const isDialogue = char === '💬';
    document.getElementById('prop-dialogue-container').style.display = isDialogue ? 'flex' : 'none';
    if (isDialogue) {
        const d = lvl.dialogues?.[`${p.x},${p.y}`] || { text: "", icon: "central", trigger: "walk", autoDismiss: true, lockPlayer: true, dismissDelay: 1500 };
        document.getElementById('prop-dialogue-text').value = d.text || "";
        document.getElementById('prop-dialogue-icon').value = d.icon || "central";
        document.getElementById('prop-dialogue-trigger').value = d.trigger || "walk";
        document.getElementById('prop-dialogue-autodismiss').checked = d.autoDismiss !== false;
        document.getElementById('prop-dialogue-delay').value = (d.dismissDelay !== undefined ? d.dismissDelay : 1500) / 1000;
        document.getElementById('prop-dialogue-lockplayer').checked = d.lockPlayer !== false;
    }
}

function updateChannelGrid() {
    const grid = document.getElementById('channel-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const lvl = levelsData[currentLevelIdx];
    const currentChan = parseInt(document.getElementById('prop-channel').value) || 0;
    
    const usedChannels = new Set();
    if (lvl.links) {
        for (const key in lvl.links) {
            if (!key.endsWith('_behavior') && !key.endsWith('_init') && !key.endsWith('_dir') && !key.endsWith('_color')) {
                usedChannels.add(parseInt(lvl.links[key]));
            }
        }
    }

    for (let i = 0; i < 30; i++) {
        const cell = document.createElement('div');
        cell.className = 'chan-cell' + (i === currentChan ? ' active' : '') + (usedChannels.has(i) ? ' in-use' : '');
        cell.innerText = i;
        cell.onclick = () => {
            document.getElementById('prop-channel').value = i;
            document.getElementById('prop-channel').dispatchEvent(new Event('input'));
            updatePropertyPanel();
        };
        grid.appendChild(cell);
    }
}
function renderEventActionInput(tIdx, eIdx, event) {
    const style = "background: #000; color: #fff; border: 1px solid #444; font-size: 11px; padding: 2px; width: 100%; border-radius: 3px;";
    
    switch (event.type) {
        case 'blackout':
        case 'security_alert':
            return `
                <select onchange="updateTriggerEventProp(${tIdx}, ${eIdx}, 'action', this.value)" style="${style}">
                    <option value="activate" ${event.action === 'activate' ? 'selected' : ''}>LIGAR (On)</option>
                    <option value="deactivate" ${event.action === 'deactivate' ? 'selected' : ''}>DESLIGAR (Off)</option>
                    ${event.type === 'blackout' ? `<option value="toggle" ${event.action === 'toggle' ? 'selected' : ''}>ALTERNAR (Toggle)</option>` : ''}
                </select>
            `;
        
        case 'music_intensity':
            return `
                <select onchange="updateTriggerEventProp(${tIdx}, ${eIdx}, 'action', this.value)" style="${style}">
                    <option value="0" ${event.action == '0' ? 'selected' : ''}>0 - Mudo</option>
                    <option value="1" ${event.action == '1' ? 'selected' : ''}>1 - Calmo</option>
                    <option value="2" ${event.action == '2' ? 'selected' : ''}>2 - Tenso</option>
                    <option value="3" ${event.action == '3' ? 'selected' : ''}>3 - Clímax</option>
                </select>
            `;

        case 'remote_signal':
            return `
                <div style="display: flex; gap: 4px;">
                    <select onchange="updateTriggerEventProp(${tIdx}, ${eIdx}, 'action', this.value)" style="${style} flex: 1;">
                        <option value="activate" ${event.action === 'activate' ? 'selected' : ''}>ATIVAR</option>
                        <option value="deactivate" ${event.action === 'deactivate' ? 'selected' : ''}>DESATIVAR</option>
                        <option value="toggle" ${event.action === 'toggle' ? 'selected' : ''}>ALTERNAR</option>
                    </select>
                    <input type="number" min="0" max="29" value="${event.channel || 0}" 
                        style="${style} width: 40px;" 
                        onchange="updateTriggerEventProp(${tIdx}, ${eIdx}, 'channel', this.value)" placeholder="Ch">
                </div>
            `;

        case 'dimension_shift':
            return `
                <select onchange="updateTriggerEventProp(${tIdx}, ${eIdx}, 'action', this.value)" style="${style}">
                    <option value="toggle" ${event.action === 'toggle' ? 'selected' : ''}>ALTERNAR (Invert)</option>
                    <option value="solar" ${event.action === 'solar' ? 'selected' : ''}>FORÇAR SOLAR</option>
                    <option value="lunar" ${event.action === 'lunar' ? 'selected' : ''}>FORÇAR LUNAR</option>
                </select>
            `;

        case 'gravity':
            return `
                <select onchange="updateTriggerEventProp(${tIdx}, ${eIdx}, 'action', this.value)" style="${style}">
                    <option value="down" ${event.action === 'down' ? 'selected' : ''}>BAIXO (Normal)</option>
                    <option value="up" ${event.action === 'up' ? 'selected' : ''}>CIMA</option>
                    <option value="left" ${event.action === 'left' ? 'selected' : ''}>ESQUERDA</option>
                    <option value="right" ${event.action === 'right' ? 'selected' : ''}>DIREITA</option>
                </select>
            `;

        case 'wait':
            return `
                <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="number" min="0" step="100" value="${event.action || 1000}" 
                        style="${style} flex: 1;" 
                        onchange="updateTriggerEventProp(${tIdx}, ${eIdx}, 'action', this.value)">
                    <span style="font-size: 9px; color: #666;">ms</span>
                </div>
            `;

        case 'earthquake':
            return `
                <div style="display: flex; gap: 4px;">
                    <input type="number" min="0" value="${event.action || 30}" 
                        style="${style} flex: 1;" 
                        onchange="updateTriggerEventProp(${tIdx}, ${eIdx}, 'action', this.value)" placeholder="Tempo (frames)">
                    <input type="number" min="0" step="0.1" value="${event.force || 0.8}" 
                        style="${style} width: 50px;" 
                        onchange="updateTriggerEventProp(${tIdx}, ${eIdx}, 'force', this.value)" placeholder="Força">
                </div>
            `;

        case 'dialogue':
            return `
                <input type="text" value="${event.action || ''}" 
                    style="${style}" 
                    onchange="updateTriggerEventProp(${tIdx}, ${eIdx}, 'action', this.value)" placeholder="Chave do Diálogo">
            `;

        default:
            return `<div style="font-size: 9px; color: #444; padding: 4px;">Sem parâmetros</div>`;
    }
}

Object.assign(window, { moveTriggerEvent, removeTriggerEvent, addTriggerEvent, updateTriggerEventProp, removeTrigger, updateTriggerProp, growTrigger, resetTriggerSize, renderEventActionInput });
