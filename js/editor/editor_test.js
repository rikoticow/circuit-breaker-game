// Circuit Breaker - Editor Test Mode Module
// Handles the simulation of the game within the editor environment

Object.assign(window, {
    startTest,
    stopTest,
    handleTestInput,
    testLoop,
    updateTestUI
});

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
        timer: (document.getElementById('lvl-timer') ? parseInt(document.getElementById('lvl-timer').value) : 0) || 0,
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
    
    if (window.GameProgress) GameProgress.clear();
    
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
    
    testGame.maxMoves = 0;
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
    if (window.Dialogue) Dialogue.update();
    
    // Render
    Graphics.clear();
    const ctx = Graphics.ctx;
    
    // Center camera and apply shake
    ctx.save();
    const sx = testGame.shakeOffset ? testGame.shakeOffset.x : 0;
    const sy = testGame.shakeOffset ? testGame.shakeOffset.y : 0;
    ctx.translate(-Math.floor(testGame.camera.x) + sx, -Math.floor(testGame.camera.y) + sy);

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
    if (testGame.worldLabels) {
        for (const lbl of testGame.worldLabels) {
            const dx = testGame.player.visualX - lbl.x;
            const dy = testGame.player.visualY - lbl.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            let alpha = 0;
            if (dist <= 2) alpha = 1;
            else if (dist < 4) alpha = 1 - (dist - 2) / 2;
            
            if (alpha > 0) {
                Graphics.drawWorldLabel(lbl.x, lbl.y, lbl.text, lbl.color, alpha);
            }
        }
    }

    if (testGame.shopTerminals) {
        for (const st of testGame.shopTerminals) {
            Graphics.drawShopTerminal(st.x, st.y, testAnimFrame);
        }
    }

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

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const c = testGame.map[y][x];
        }
    }

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
        const exitChan = testGame.levelData.exitChannel || 99;
        const isExit = (d.channel == exitChan) || (d.exitTo !== undefined) || d.isExit;
        Graphics.drawDoor(d.x, d.y, d.state, d.error, testAnimFrame, d.orientation, d.pair ? d.pair.side : null, d.visualOpen, isExit);
    }

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const c = testGame.map[y][x];
            if (c === '#') Graphics.drawCeiling(x, y);
            else if (c === 'W') Graphics.drawWallFace(x, y);
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
    
    // Pass 3.0: High-Layer Solar Portals (Glow over everything)
    for (const p of testGame.portals) {
        Graphics.drawPortal(p.x, p.y, p.channel, testAnimFrame, p.color);
    }
    for (const t of testGame.targets) {
        const d = testGame.poweredTargets.get(`${t.x},${t.y}`) || { charge: 0 };
        Graphics.drawCoreRequirement(t.x, t.y, t.required, d.charge);
    }

    // Draw Lasers and Particles
    for (const e of testGame.emitters) {
        Graphics.drawLaser(e, testAnimFrame);
    }
    Graphics.drawParticles(testGame);
    
    // Draw Blackout (Fog of War) - Handled internally (Pass 1: World, Pass 2: Screen)
    Graphics.drawBlackout(testGame);

    ctx.restore();
    
    // --- DRAW SCREEN SPACE (HUD, UI) ---

    // Draw HUD (including security alert pulse) - purely screen space
    Graphics.drawHUD(testGame);

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
    }    const timeEl = document.getElementById('ui-time');
    if (timeEl) {
        let min = Math.floor(testGame.time / 60);
        let sec = testGame.time % 60;
        timeEl.innerText = `${min.toString().padStart(2, '0')}:${sec < 10 ? '0' : ''}${sec}`;
    }

    const scoreEl = document.getElementById('ui-score');
    if (scoreEl) scoreEl.innerText = `${testGame.scrapCollected}/${testGame.totalScrap}`;

    updateBar('lives-bar', testGame.lives, 3);
    
    // updateBar('energy-bar-seg', testGame.moves, maxMoves); // REMOVED
    // document.getElementById('ui-power-count').innerText = testGame.moves.toString().padStart(2, '0'); // REMOVED

    let totalReq = 0;
    let totalCurrent = 0;
    for (const t of testGame.targets) {
        totalReq += t.required;
        const data = testGame.poweredTargets.get(`${t.x},${t.y}`);
        totalCurrent += Math.min(t.required, data ? data.charge : 0);
    }
    updateBar('amps-bar', totalCurrent, totalReq);
}
