let game;
let lastTime = 0;
let animFrame = 0;
let rebootConfirmTimer = null;
let selectorConfirmTimer = null;

function init() {
    const canvas = document.getElementById('gameCanvas');
    Graphics.init(canvas);

    game = new GameState();
    window.game = game; // Essential for Dialogue system to find the active game
    LevelSelector.init();

    // Initial Start Gesture (Fixes AudioContext autoplay policy)
    let initTime = Date.now();
    const globalAudioResume = () => {
        if (window.audioCtx && audioCtx.state !== 'running') {
            audioCtx.resume();
        }
    };
    document.addEventListener('keydown', globalAudioResume);
    document.addEventListener('mousedown', globalAudioResume);

    const startHandler = (e) => {
        // Ignore very early clicks/keys (likely focus or accidental)
        if (Date.now() - initTime < 500) return;

        if (game.transitionState === 'WAITING' && game.transitionProgress === 1) {
            globalAudioResume();
            game.transitionState = 'OPENING';
            game.transitionStayClosed = false;
            document.removeEventListener('keydown', startHandler);
            document.removeEventListener('mousedown', startHandler);
        }
    };
    document.addEventListener('keydown', startHandler);
    document.addEventListener('mousedown', startHandler);

    // Controls

    document.addEventListener('keydown', (e) => {
        // DEBUG RESET SHORTCUT: Ctrl + Shift + Backspace
        if (e.ctrlKey && e.shiftKey && e.key === 'Backspace') {
            console.log("DEBUG: Resetting persistent data...");
            localStorage.clear();
            location.reload();
            return;
        }

        // Level Selector input intercept
        if (LevelSelector.active) {
            const result = LevelSelector.handleInput(e.key);
            if (result === 'CLOSE') {
                LevelSelector.close();
                return;
            }
            if (typeof result === 'string' && result.startsWith('SELECT_')) {
                const lvl = parseInt(result.replace('SELECT_', ''));
                // Start transition first, close selector ONLY when doors are closed
                game.startTransition(() => {
                    game.loadLevel(lvl);
                    LevelSelector.close();
                }, false, 'CIRCUIT BREAKER');
            }
            return;
        }

        // Result Screen input intercept
        if (ResultScreen.active) {
            const result = ResultScreen.handleInput(e.key);
            if (result === 'REPLAY') {
                game.startTransition(() => {
                    ResultScreen.close();
                    game.loadLevel(game.levelIndex);
                });
            } else if (result === 'NEXT_LEVEL') {
                game.startTransition(() => {
                    ResultScreen.close();
                    // If a new chapter was unlocked, force going to the selector to show the animation
                    if (LevelSelector.pendingChapterUnlock) {
                        LevelSelector.open(game.levelIndex);
                    } else if (game.levelIndex + 1 < LEVELS.length) {
                        game.loadLevel(game.levelIndex + 1);
                    } else {
                        LevelSelector.open(game.levelIndex);
                    }
                });
            } else if (result === 'MAIN_MENU') {
                game.startTransition(() => {
                    ResultScreen.close();
                    LevelSelector.open(game.levelIndex);
                }, false, 'CIRCUIT BREAKER');
            }
            return;
        }

        if (game.state === 'PLAYING') {
            if (game.inputLocked) {
                // If there's a manual dismiss dialogue, the Enter key is handled by Dialogue.js
                // but we block movement here
                return;
            }
            if (e.key === 'ç') {
                console.log("DEBUG: Instant 3-Star Win");
                game.time = (LEVELS[game.levelIndex].timer || 60); // Set max time for stars
                game.state = 'LEVEL_COMPLETE';
                AudioSys.levelComplete();
                const bonus = LevelSelector.completeLevel(game.levelIndex, 3, game.moveCount);
                game.economyBonus = bonus;
                ResultScreen.open({
                    levelIndex: game.levelIndex,
                    time: game.time,
                    lives: game.lives,
                    stars: 3,
                    score: game.score,
                    economyBonus: bonus
                });
                return;
            }
            if (e.key === 'Escape') {
                if (selectorConfirmTimer) {
                    // 2nd press: Open Level Selector with transition
                    clearTimeout(selectorConfirmTimer);
                    selectorConfirmTimer = null;
                    document.getElementById('notification-bar').classList.remove('show');

                    game.startTransition(() => {
                        LevelSelector.open(game.levelIndex);
                    }, false, 'CIRCUIT BREAKER');
                } else {
                    // 1st press: Show warning
                    const notify = document.getElementById('notification-bar');
                    if (notify) {
                        const msg = notify.querySelector('.message') || notify;
                        msg.textContent = 'O PROGRESSO SERÁ PERDIDO - APERTE ESC NOVAMENTE PARA SAIR';
                        notify.classList.add('show');
                    }
                    AudioSys.rebootWarning();

                    selectorConfirmTimer = setTimeout(() => {
                        selectorConfirmTimer = null;
                        if (notify) notify.classList.remove('show');
                    }, 3000);
                }
                return;
            }
            if (e.key === 'ArrowUp' || e.key === 'w') game.movePlayer(0, -1);
            else if (e.key === 'ArrowDown' || e.key === 's') game.movePlayer(0, 1);
            else if (e.key === 'ArrowLeft' || e.key === 'a') game.movePlayer(-1, 0);
            else if (e.key === 'ArrowRight' || e.key === 'd') game.movePlayer(1, 0);
            else if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'e' || e.key === 'E') game.interact();
            else if (e.key === 'z' || e.key === 'Z') game.doUndo();
            else if (e.key === 'r' || e.key === 'R') {
                if (rebootConfirmTimer) {
                    // 2nd press within 3s: Actually Reboot
                    clearTimeout(rebootConfirmTimer);
                    rebootConfirmTimer = null;
                    document.getElementById('notification-bar').classList.remove('show');
                    Graphics.clearParticles();
                    game.startReverse(() => {
                        game.loadLevel(game.levelIndex, true);
                    });
                } else {
                    // 1st press: Show warning
                    const notify = document.getElementById('notification-bar');
                    if (notify) {
                        const msg = notify.querySelector('.message') || notify;
                        msg.textContent = 'REVERSÃO QUANTICA = REINICIAR NÍVEL';
                        notify.classList.add('show');
                    }
                    AudioSys.rebootWarning();

                    rebootConfirmTimer = setTimeout(() => {
                        rebootConfirmTimer = null;
                        if (notify) notify.classList.remove('show');
                    }, 3000);
                }
            }
            else if (e.key === 'p' || e.key === 'P') {
                Graphics.clearParticles();
                game.loadLevel(game.levelIndex + 1);
            }
        } else if (game.state === 'LEVEL_COMPLETE') {
            // Already handled automatically in game.update
        } else if (game.state === 'GAMEOVER') {
            if (e.key === 'r' || e.key === 'R') {
                Graphics.clearParticles();
                game.score = 0;
                game.lives = 3;
                game.loadLevel(0);

                // Open the door
                game.transitionState = 'OPENING';
                game.transitionStayClosed = false;
            }
        } else if (game.state === 'VICTORY') {
            if (e.key === 'r' || e.key === 'R') {
                game.startTransition(() => {
                    game.lives = 3;
                    game.score = 0;
                    game.loadLevel(0);
                });
            }
        }
    });

    // Time loop (Counts DOWN)
    setInterval(() => {
        if (game.state === 'PLAYING' && game.time > 0 && game.transitionState === 'NONE' && !LevelSelector.active) {
            game.time--;
            if (game.time === 0) {
                game.handleDeath(false);
            }
        }
    }, 1000);

    requestAnimationFrame(gameLoop);
}

function updateBar(id, current, max) {
    const bar = document.getElementById(id);
    if (!bar) return;

    // Only rebuild if count changed
    if (bar.children.length !== max) {
        bar.innerHTML = '';
        for (let i = 0; i < max; i++) {
            const seg = document.createElement('div');
            seg.className = 'segment';
            bar.appendChild(seg);
        }
    }

    // Update classes
    for (let i = 0; i < bar.children.length; i++) {
        const isNowEmpty = i >= current;
        const hasEmptyClass = bar.children[i].classList.contains('empty');
        if (isNowEmpty !== hasEmptyClass) {
            bar.children[i].classList.toggle('empty', isNowEmpty);
        }
    }
}

let lastLevelIndex = -1;
let levelDisplayName = "";
let glitchTimer = 0;
let cycleTimer = 600; // 10 seconds @ 60fps
let currentDisplayMode = 0; // 0: Number, 1: Name

function updateUI() {
    const levelNameEl = document.getElementById('ui-level-name');
    const timeEl = document.getElementById('ui-time');
    const scoreEl = document.getElementById('ui-score');

    if (levelNameEl) {
        const lvl = LEVELS[game.levelIndex];
        const targetName = lvl ? lvl.name.toUpperCase() : "LABORATÓRIO";
        const levelNumStr = `NÍVEL ${(game.levelIndex + 1).toString().padStart(2, '0')}`;

        // Reset and trigger glitch on level change
        if (lastLevelIndex !== game.levelIndex) {
            lastLevelIndex = game.levelIndex;
            glitchTimer = 80; // Slower: 1.3s
            cycleTimer = 600;
            currentDisplayMode = 1; // Start with name on load
        }

        // Cycle logic every 10s
        cycleTimer--;
        if (cycleTimer <= 0) {
            cycleTimer = 600;
            currentDisplayMode = (currentDisplayMode + 1) % 2;
            glitchTimer = 80; // Slower switch
        }

        if (glitchTimer > 0) {
            glitchTimer--;
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@!%&*";
            const targetStr = (currentDisplayMode === 1) ? targetName : levelNumStr;
            const prevStr = (currentDisplayMode === 1) ? levelNumStr : targetName;

            let result = "";
            const totalProgress = 1 - (glitchTimer / 80);

            for (let i = 0; i < targetStr.length; i++) {
                // Determine the life cycle of this specific character's transition
                const charStart = (i / targetStr.length) * 0.5; // Starts at 0% to 50% of animation
                const charLock = charStart + 0.3; // Locks 30% later

                if (totalProgress < charStart) {
                    // Still showing old character (or space if out of bounds)
                    result += prevStr[i] || " ";
                } else if (totalProgress < charLock) {
                    // Glitching/Scrambling
                    result += chars[Math.floor(Math.random() * chars.length)];
                } else {
                    // Locked in!
                    result += targetStr[i];
                }
            }
            levelNameEl.innerText = result;
        } else {
            levelNameEl.innerText = (currentDisplayMode === 1) ? targetName : levelNumStr;
        }
    }
    if (scoreEl) scoreEl.innerText = `${game.scrapCollected}/${game.totalScrap}`;

    if (timeEl) {
        let min = Math.floor(game.time / 60);
        let sec = game.time % 60;
        timeEl.innerText = `${min.toString().padStart(2, '0')}:${sec < 10 ? '0' : ''}${sec}`;

        // Dynamic Color based on percentage (matching Result Screen logic)
        const lvl = LEVELS[game.levelIndex];
        const totalTime = (lvl ? lvl.timer : 60) || 60;
        const timePercent = (game.time / totalTime) * 100;

        if (timePercent > 50) {
            timeEl.style.color = 'var(--neon-green)';
            timeEl.style.textShadow = '0 0 5px var(--neon-green)';
        } else if (timePercent > 20) {
            timeEl.style.color = '#ffcc00'; // Yellow/Gold
            timeEl.style.textShadow = '0 0 5px #ffcc00';
        } else {
            timeEl.style.color = 'var(--neon-red)';
            timeEl.style.textShadow = '0 0 5px var(--neon-red)';
        }
    }

    // Lives Bar (Fixed 3 slots, empty slots are black)
    updateBar('lives-bar', game.lives, 3);

    // Power Bar (1:1 Movement units)
    const levelData = LEVELS[game.levelIndex];
    const maxMoves = levelData ? levelData.time : 100;
    updateBar('energy-bar-seg', game.moves, maxMoves);

    const powerCountEl = document.getElementById('ui-power-count');
    if (powerCountEl) powerCountEl.innerText = game.moves.toString().padStart(2, '0');

    // Amps Bar (Progress)
    let totalReq = 0;
    let totalCurrent = 0;
    for (const t of game.targets) {
        totalReq += t.required;
        const data = game.poweredTargets.get(`${t.x},${t.y}`);
        const charge = data ? data.charge : 0;
        totalCurrent += Math.min(t.required, charge);
    }
    updateBar('amps-bar', totalCurrent, totalReq);

    // Overlay
    const overlay = document.getElementById('screen-overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayText = document.getElementById('overlay-text');

    if (game.state === 'PLAYING' || game.state === 'WINNING' || game.state === 'REVERSING') {
        overlay.classList.add('hidden');
        document.getElementById('game-container').classList.remove('flash-red');
    } else if (game.state === 'RESULT') {
        overlay.classList.add('hidden');
    } else {
        overlay.classList.remove('hidden');
        if (game.state === 'GAMEOVER') {
            overlay.classList.add('hidden');
            document.getElementById('game-container').classList.remove('flash-red');
        } else if (game.state === 'LEVEL_COMPLETE') {
            overlay.classList.add('hidden'); // No text
        } else if (game.state === 'VICTORY') {
            overlay.classList.add('hidden'); // No text
        }
    }
}

function updateTransitionLogic() {
    if (game.transitionState === 'CLOSING') {
        game.transitionProgress += 0.04;
        if (animFrame % 5 === 0) AudioSys.doorGrind();
        if (game.transitionProgress >= 1) {
            game.transitionProgress = 1;
            game.transitionState = 'WAITING';
            AudioSys.doorSlam();

            // Clear trails behind closed doors
            Graphics.clearTrails();

            if (game.transitionCallback) {
                game.transitionCallback();
                game.transitionCallback = null;
            }

            if (!game.transitionStayClosed) {
                setTimeout(() => {
                    game.transitionState = 'OPENING';
                }, 600);
            }
        }
    } else if (game.transitionState === 'OPENING') {
        game.transitionProgress -= 0.04;
        if (animFrame % 5 === 0) AudioSys.doorGrind();
        if (game.transitionProgress <= 0) {
            game.transitionProgress = 0;
            game.transitionState = 'NONE';
            game.transitionLabel = 'CIRCUIT BREAKER';
            
            // dialogues are triggered in main.js after transition ends
            game.checkDialogues('start');
        }
    }
}

function gameLoop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    animFrame++;

    // === LEVEL SELECTOR MODE ===
    if (LevelSelector.active) {
        LevelSelector.update();
        const ctx = Graphics.ctx;
        LevelSelector.render(ctx);

        // Render transition doors OVER the selector if active
        if (game.transitionState !== 'NONE') {
            updateTransitionLogic();
            Graphics.drawDoorTransition(game, game.transitionProgress);
        }

        requestAnimationFrame(gameLoop);
        return;
    }

    if (ResultScreen.active && game.transitionState === 'NONE') {
        const result = ResultScreen.update();
        if (result === 'NEXT_LEVEL') {
            game.startTransition(() => {
                ResultScreen.close();
                // If a new chapter was unlocked, force going to the selector to show the animation
                if (LevelSelector.pendingChapterUnlock) {
                    LevelSelector.open(game.levelIndex);
                } else if (game.levelIndex + 1 < LEVELS.length) {
                    game.loadLevel(game.levelIndex + 1);
                } else {
                    LevelSelector.open(game.levelIndex);
                }
            });
        }
    } else if (ResultScreen.active) {
        // Still update for animations, but ignore return value
        ResultScreen.update();
    }

    // HIT STOP (Frame Freeze)
    if (game.hitStopTimer && game.hitStopTimer > 0) {
        game.hitStopTimer--;
        requestAnimationFrame(gameLoop);
        return; // Skip ALL updates and rendering!
    }

    game.update();
    updateTransitionLogic();

    const mapH = game.map.length;
    const mapW = game.map[0].length;

    Graphics.clear();

    const ctx = Graphics.ctx;
    ctx.save();
    ctx.translate(-Math.floor(game.camera.x), -Math.floor(game.camera.y));

    // Visible tile bounds (Culling)
    const startX = Math.floor(game.camera.x / 32);
    const endX = Math.ceil((game.camera.x + 640) / 32);
    const startY = Math.floor(game.camera.y / 32);
    const endY = Math.ceil((game.camera.y + 480) / 32);

    // Pass 1: Draw Floors and Holes
    for (let y = Math.max(0, startY); y < Math.min(mapH, endY); y++) {
        for (let x = Math.max(0, startX); x < Math.min(mapW, endX); x++) {
            const c = game.map[y][x];
            if (c === '*') {
                let mask = 0;
                if (y > 0 && game.map[y-1][x] === '*') mask |= 1;
                if (x < mapW - 1 && game.map[y][x+1] === '*') mask |= 2;
                if (y < mapH - 1 && game.map[y+1][x] === '*') mask |= 4;
                if (x > 0 && game.map[y][x-1] === '*') mask |= 8;
                Graphics.drawHole(x, y, mask);
            } else if (c !== '#' && c !== 'W') {
                Graphics.drawFloor(x, y);
            }
        }
    }

    // Pass 1.01: Draw Wires (On floor, below trails/quantum/conveyors)
    for (const w of game.wires) {
        const flowDirs = game.poweredWires.get(`${w.x},${w.y}`) || null;
        Graphics.drawWire(w.x, w.y, w.type, flowDirs, animFrame);
    }

    // Pass 1.05: Draw Tread Trails (Directly on floor, below EVERYTHING else)
    Graphics.drawTrails();

    // Pass 1.06: Draw Quantum Floors (Above trails)
    for (const qf of game.quantumFloors) {
        if (qf.x >= startX && qf.x <= endX && qf.y >= startY && qf.y <= endY) {
            const overHole = game.map[qf.y] && game.map[qf.y][qf.x] === '*';
            Graphics.drawQuantumFloor(qf.x, qf.y, qf.active, animFrame, qf.flashTimer, qf.pulseIntensity, qf.entrySide, qf.whiteGlow, overHole);
        }
    }

    // Pass 1.07: Draw Buttons (On floor/quantum fields)
    for (const btn of game.buttons) {
        Graphics.drawButton(btn.x, btn.y, btn.isPressed, btn.behavior, btn.charge || 0);
    }

    // Pass 1.1: Draw Charging Stations (Spawn + Extras)
    for (const s of game.chargingStations) {
        const powered = game.poweredStations.has(`${s.x},${s.y}`);
        Graphics.drawChargingStation(s.x, s.y, powered, animFrame);
    }

    // Pass 1.5: Draw Conveyors (Above floor, below trails/objects)
    for (const c of game.conveyors) {
        if (c.x >= startX && c.x <= endX && c.y >= startY && c.y <= endY) {
            const isActive = game.isConveyorActive(c);
            const overHole = game.map[c.y][c.x] === '*';
            Graphics.drawConveyor(c.x, c.y, c.dir, animFrame, c.inDir, c.beltDist, c.beltLength, isActive, overHole);
        }
    }

    // Pass 1.8: Draw Doors (Drawn before walls/ceilings so they stay below them)
    for (const d of game.doors) {
        Graphics.drawDoor(d.x, d.y, d.state, d.error, animFrame, d.orientation, d.pair ? d.pair.side : null, d.visualOpen);
    }

    // Pass 1.85: Draw Lasers (Above doors/conveyors, below walls)
    for (const e of game.emitters) {
        Graphics.drawLaser(e, animFrame);
    }

    // Pass 2: Draw Objects, Walls, and Ceiling
    for (let y = Math.max(0, startY); y < Math.min(mapH, endY); y++) {
        for (let x = Math.max(0, startX); x < Math.min(mapW, endX); x++) {
            const c = game.map[y][x];
            if (c === '#') {
                Graphics.drawCeiling(x, y);
            } else if (c === 'W') {
                Graphics.drawWallFace(x, y);
            } else if (c === 'G') {
                const isHit = game.glassWallsHit.has(`${x},${y}`);
                Graphics.drawGlassWall(x, y, animFrame, isHit);
            } else {
                // Draw scrap if present
                if (game.scrapPositions.has(`${x},${y}`)) {
                    Graphics.drawScrap(x, y, animFrame);
                }
            }
        }
    }

    // Pass 2.02: Draw Emitters (Structures)
    for (const e of game.emitters) {
        Graphics.drawEmitter(e.x, e.y, e.dir, animFrame);
    }

    // Pass 2.03: Draw Quantum Catalysts
    for (const cat of game.catalysts) {
        Graphics.drawCatalyst(cat.x, cat.y, cat.active, animFrame);
    }

    // Pass 2.04 (Removed, moved to Pass 3.0)

    // Draw Cores
    for (const s of game.sources) {
        Graphics.drawCore(s.x, s.y, 'B', true);
    }
    for (const s of game.redSources) {
        Graphics.drawCore(s.x, s.y, 'X', true);
    }
    for (const t of game.targets) {
        const key = `${t.x},${t.y}`;
        const data = game.poweredTargets.get(key) || { charge: 0, contaminated: false };
        const powered = data.charge >= t.required && !data.contaminated;
        Graphics.drawCore(t.x, t.y, 'T', powered, t.required, data.charge, data.contaminated);
    }
    for (const f of game.forbiddens) {
        Graphics.drawCore(f.x, f.y, 'X', false);
    }

    // Draw Broken Cores (purely visual)
    for (const bc of game.brokenCores) {
        Graphics.drawBrokenCore(bc.x, bc.y, animFrame);
    }

        // Draw Blocks (Spring Physics)
    for (const b of game.blocks) {
        const powerData = game.poweredBlocks.get(`${b.x},${b.y}`) || null;
        const dist = Math.sqrt((b.x - b.visualX) ** 2 + (b.y - b.visualY) ** 2);
        // Pass both visualAngle (for the arrow) and logical b.dir (for the lightning)
        Graphics.drawBlock(b.visualX, b.visualY, b.visualAngle, powerData, dist, b.dir, b.type, b.fallTimer || 0);
    }


    // Draw Player
    if (game.state !== 'GAMEOVER') {
        const visorColor = game.player.visorTimer > 0 ? game.player.visorColor : null;
        // Calculate velocity for squash and stretch
        const vx = game.player.x - game.player.visualX;
        const vy = game.player.y - game.player.visualY;
        Graphics.drawRobot(game.player.visualX, game.player.visualY, game.player.dir, animFrame, visorColor, vx, vy, game.player.isDead, game.player.deathType, game.player.deathTimer, game.player.deathDir);
    }
    
    // Pass 2.05: Draw Persistent Debris (Irregular pieces on floor)
    for (const p of game.debris) {
        Graphics.drawDebris(p);
    }

    // Pass 2.08: Draw Particles (Now behind doors)
    Graphics.drawParticles();
    // Pass 3.0: Solar Portals (Top Layer)
    for (const p of game.portals) {
        Graphics.drawPortal(p.x, p.y, p.channel, animFrame, p.color);
    }

    // FINAL PASS: Core Requirements (Always on top of robot/smoke)
    for (const t of game.targets) {
        const key = `${t.x},${t.y}`;
        const data = game.poweredTargets.get(key) || { charge: 0, contaminated: false };
        Graphics.drawCoreRequirement(t.x, t.y, t.required, data.charge);
    }

    ctx.restore();

    // Draw Transition Door
    if (game.transitionState !== 'NONE') {
        Graphics.drawDoorTransition(game, game.transitionProgress);
    }

    // Draw HUD
    Graphics.drawHUD(game);

    // Draw Reverse Overlay
    if (game.state === 'REVERSING') {
        Graphics.drawReverseEffect(animFrame);
    }

    if (ResultScreen.active) {
        ResultScreen.render(ctx);
    }

    // VHS Rewind Effect overlay
    if (game.state === 'REVERSING') {
        Graphics.drawVHSEffect();
    }

    updateUI();

    requestAnimationFrame(gameLoop);
}

// Start
window.onload = init;
