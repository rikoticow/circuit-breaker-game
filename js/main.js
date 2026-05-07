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
    
    // Force initial context for the first level
    Graphics.initLevelContext(game);
    
    LevelSelector.init();
    GameProgress.init();

    // Initial Start Gesture (Fixes AudioContext autoplay policy)
    let initTime = Date.now();
    const globalAudioResume = () => {
        if (window.audioCtx && audioCtx.state !== 'running') {
            audioCtx.resume();
        }
    };
    document.addEventListener('keydown', globalAudioResume);
    document.addEventListener('mousedown', globalAudioResume);

    const shopHandler = (e) => {
        if (typeof ShopSystem !== 'undefined' && (ShopSystem.active || ShopSystem.state !== 'IDLE')) {
            ShopSystem.handleInput(e.key);
            return true;
        }
        return false;
    };
    document.addEventListener('keydown', (e) => {
        if (shopHandler(e)) return;
    });

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

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') game.isShiftHeld = true;
    });
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') game.isShiftHeld = false;
    });

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

        // Stats Terminal input intercept
        if (window.StatsTerminal && StatsTerminal.state !== 'IDLE') {
            const key = e.key.toLowerCase();
            if (e.key === ' ' || key === 'spacebar' || key === 'e' || key === 'Escape') {
                StatsTerminal.close();
            }
            return;
        }

        if (game.state === 'PLAYING') {
            if (game.inputLocked) {
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
                    lives: HPSystem.currentQuarters / 4,
                    hp: HPSystem.currentQuarters,
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
            const key = e.key.toLowerCase();
            if (key === 'arrowup' || key === 'w') game.movePlayer(0, -1);
            else if (key === 'arrowdown' || key === 's') game.movePlayer(0, 1);
            else if (key === 'arrowleft' || key === 'a') game.movePlayer(-1, 0);
            else if (key === 'arrowright' || key === 'd') game.movePlayer(1, 0);
            else if (e.key === ' ' || key === 'spacebar' || key === 'e') game.interact();
            else if (key === 'q') game.toggleGrab();
            else if (key === 'z') game.doUndo();
            else if (key === 'r') {
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
            else if (key === 'p') {
                Graphics.clearParticles();
                game.loadLevel(game.levelIndex + 1);
            }
        } else if (game.state === 'LEVEL_COMPLETE') {
            // Already handled automatically in game.update
        } else if (game.state === 'GAMEOVER') {
            if (key === 'r') {
                Graphics.clearParticles();
                game.score = 0;
                HPSystem.fullHeal();
                game.loadLevel(0);

                // Open the door
                game.transitionState = 'OPENING';
                game.transitionStayClosed = false;
            }
        } else if (game.state === 'VICTORY') {
            if (key === 'r') {
                game.startTransition(() => {
                    HPSystem.fullHeal();
                    game.score = 0;
                    game.loadLevel(0);
                });
            }
        }
    });

    // Time loop (Counts DOWN)
    setInterval(() => {
        if (game.state === 'PLAYING' && game.time > 0 && game.transitionState === 'NONE' && !LevelSelector.active && !StatsTerminal.active) {
            // "se o circuito for validado o tempo para se desvalidado continua"
            if (!game.isExitOpen) {
                game.time--;
                if (window.AudioSys && AudioSys.timerTick) AudioSys.timerTick(game.time);
                if (game.time === 0) {
                    game.handleDeath(false);
                }
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
window.glitchTimer = 0;
let cycleTimer = 600; 
window.currentDisplayMode = 0; 

function updateUI() {
    // Level change glitch trigger
    if (lastLevelIndex !== game.levelIndex) {
        lastLevelIndex = game.levelIndex;
        window.glitchTimer = 80;
        cycleTimer = 600;
        currentDisplayMode = 1;
    }

    // Cycle logic every 10s (Display Mode)
    cycleTimer--;
    if (cycleTimer <= 0) {
        cycleTimer = 600;
        currentDisplayMode = (currentDisplayMode + 1) % 2;
        window.glitchTimer = 80;
    }

    if (window.glitchTimer > 0) {
        window.glitchTimer--;
    }

    // Overlay logic (Death/Result screens)
    const overlay = document.getElementById('screen-overlay');
    if (!overlay) return;

    if (game.state === 'PLAYING' || game.state === 'WINNING' || game.state === 'REVERSING') {
        overlay.classList.add('hidden');
    } else if (game.state === 'RESULT') {
        overlay.classList.add('hidden');
    } else {
        overlay.classList.remove('hidden');
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

const TICK_RATE = 60;
const TICK_TIME = 1000 / TICK_RATE;
let accumulator = 0;

function gameLoop(timestamp) {
    if (!lastTime) {
        lastTime = timestamp;
        requestAnimationFrame(gameLoop);
        return;
    }

    const frameTime = timestamp - lastTime;
    lastTime = timestamp;

    accumulator += Math.min(frameTime, 100);

    while (accumulator >= TICK_TIME) {
        updateGameLogic();
        accumulator -= TICK_TIME;
    }

    renderGameVisuals();
    requestAnimationFrame(gameLoop);
}

function updateGameLogic() {
    animFrame++;

    // === LEVEL SELECTOR MODE ===
    if (LevelSelector.active) {
        LevelSelector.update();
        if (game.transitionState !== 'NONE') {
            updateTransitionLogic();
        }
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
        return; // Skip updates
    }

    game.update();
    if (window.Dialogue) Dialogue.update();
    updateTransitionLogic();
}

function renderGameVisuals() {
    const ctx = Graphics.ctx;
    if (!game.map || !game.map[0]) return;
    const mapH = game.map.length;
    const mapW = game.map[0].length;
    
    Graphics.clear();

    if (LevelSelector.active) {
        LevelSelector.render(ctx);
        if (game.transitionState !== 'NONE') {
            Graphics.drawDoorTransition(game, game.transitionProgress);
        }
        updateUI();
        return;
    }

    ctx.save();
    
    // Screen Shake applied via centralized game state
    const sx = game.shakeOffset ? game.shakeOffset.x : 0;
    const sy = game.shakeOffset ? game.shakeOffset.y : 0;

    // Safety: ensure camera is never NaN
    if (isNaN(game.camera.x)) game.camera.x = 0;
    if (isNaN(game.camera.y)) game.camera.y = 0;

    ctx.translate(-Math.floor(game.camera.x) + sx, -Math.floor(game.camera.y) + sy);

    // Visible tile bounds (Culling)
    const startX = Math.floor(game.camera.x / 32);
    const endX = Math.ceil((game.camera.x + 640) / 32);
    const startY = Math.floor(game.camera.y / 32);
    const endY = Math.ceil((game.camera.y + 480) / 32);

    // Draw Static Background (Floors, Holes, Walls, Ceilings, Energy Pillars)
    Graphics.drawStaticBackground(game, startX, endX, startY, endY, animFrame);

    // Pass 0.5: Draw Fog of War (Discovery)
    Graphics.drawFogOfWar(game);

    // Pass 1.0: Draw World Labels (Proximity-based)
    if (game.worldLabels) {
        for (const lbl of game.worldLabels) {
            const dx = game.player.visualX - lbl.x;
            const dy = game.player.visualY - lbl.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Starts appearing at dist 4, fully visible at dist 2
            let alpha = 0;
            if (dist <= 2) alpha = 1;
            else if (dist < 4) alpha = 1 - (dist - 2) / 2;
            
            if (alpha > 0) {
                Graphics.drawWorldLabel(lbl.x, lbl.y, lbl.text, lbl.color, alpha, 0.3);
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
    
    // Pass 1.055: Draw Ambient Particles (Dust/Scrap on floor)
    Graphics.drawAmbientParticles(game.ambientParticles);

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

    
    // Pass 1.08: Draw Gravity Buttons
    for (const gb of game.gravityButtons) {
        const isSliding = game.gravitySlidingDir !== null;
        Graphics.drawGravityButton(gb.x, gb.y, gb.dir, animFrame, gb.flashTimer, isSliding);
    }

    // Pass 1.09: Draw Shop Terminals
    if (game.shopTerminals) {
        for (const st of game.shopTerminals) {
            Graphics.drawShopTerminal(st.x, st.y, animFrame);
        }
    }

    // Pass 1.095: Draw Projectiles (Below Launchers to hide spawn)
    for (const p of game.projectiles) {
        p.draw(ctx);
    }

    // Pass 1.096: Draw Launchers
    for (const l of game.launchers) {
        l.draw(ctx);
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

    // Pass 1.8: Draw Doors - MOVED to after player for better occlusion

    // Pass 2: Draw Scrap (Static in background but some have animations?) 
    // Actually scrap is dynamic, let's keep it here but without walls loop
    for (let y = Math.max(0, startY); y < Math.min(mapH, endY); y++) {
        for (let x = Math.max(0, startX); x < Math.min(mapW, endX); x++) {
            if (game.scrapPositions.has(`${x},${y}`)) {
                Graphics.drawScrap(x, y, animFrame);
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

    // Draw Broken Cores (purely visual)
    for (const bc of game.brokenCores) {
        Graphics.drawBrokenCore(bc.x, bc.y, animFrame);
    }

    // Draw Solid Blocks
    const outOfPhaseBlocks = [];
    for (const b of game.blocks) {
        const isOutOfPhase = b.phase && ((b.phase === 'SOLAR' && !game.isSolarPhase) || (b.phase === 'LUNAR' && game.isSolarPhase));
        if (isOutOfPhase) {
            outOfPhaseBlocks.push(b);
            continue;
        }
        const powerData = game.poweredBlocks.get(`${b.x},${b.y}`) || null;
        const dist = Math.sqrt((b.x - b.visualX) ** 2 + (b.y - b.visualY) ** 2);
        Graphics.drawBlock(b.visualX, b.visualY, b.visualAngle, powerData, dist, b.dir, b.type, b.fallTimer || 0, b.phase, game.isSolarPhase);
    }


    // Draw Player
    if (game.state !== 'GAMEOVER') {
        const visorColor = game.player.visorTimer > 0 ? game.player.visorColor : null;
        // Calculate velocity for squash and stretch
        const vx = game.player.x - game.player.visualX;
        const vy = game.player.y - game.player.visualY;
        Graphics.drawRobot(game.player.visualX, game.player.visualY, game.player.dir, animFrame, visorColor, vx, vy, game.player.isDead, game.player.deathType, game.player.deathTimer, game.player.deathDir, game.player.isGrabbing, game.player.flashTimer);
    }

    // Pass 3.0: Draw Doors (Drawn after player to occlude them when entering)
    for (const d of game.doors) {
        const exitChan = game.levelData.exitChannel || 99;
        const isExit = (d.channel == exitChan) || (d.exitTo !== undefined) || d.isExit;
        Graphics.drawDoor(d.x, d.y, d.state, d.error, animFrame, d.orientation, d.pair ? d.pair.side : null, d.visualOpen, isExit, d.unlocked);
    }

    // --- SINGULAR CORES (Drawn above everything) ---
    ctx.save();
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
    
    // Singularity Switchers still use 'lighter' for their specific effects inside the function if needed,
    // but here we call them in default mode or manage their own state.
    for (const sw of game.singularitySwitchers) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        Graphics.drawSingularitySwitcher(sw.x, sw.y, game.isSolarPhase, animFrame, sw.lightningTimer, game.map, sw.lightningSeed);
        ctx.restore();
    }
    ctx.restore();
    
    // Pass 2.05: Draw Persistent Debris (Irregular pieces on floor)
    for (const p of game.debris) {
        Graphics.drawDebris(p);
    }


    // Pass 2.07: Draw Glass Walls (Drawn AFTER lasers to look translucent on top)
    for (let y = Math.max(0, startY); y < Math.min(mapH, endY); y++) {
        for (let x = Math.max(0, startX); x < Math.min(mapW, endX); x++) {
            if (game.map[y][x] === 'G') {
                const isHit = game.glassWallsHit.has(`${x},${y}`);
                Graphics.drawGlassWall(x, y, animFrame, isHit);
            }
        }
    }

    // Pass 3.0: Solar Portals (Top Layer)
    for (const p of game.portals) {
        Graphics.drawPortal(p.x, p.y, p.channel, animFrame, p.color);
        // Draw content if any
        if (p.slot && p.slot.content) {
            Graphics.drawLimboHologram(p.x, p.y, p.slot.content, animFrame);
        }
    }

    // Pass 3.1: Projectiles
    for (const p of game.projectiles) {
        p.onDraw(ctx);
    }

    // FINAL PASS: Out-of-phase holographic blocks (Above EVERYTHING in ADD mode)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of outOfPhaseBlocks) {
        Graphics.drawBlock(b.visualX, b.visualY, b.visualAngle, null, 0, b.dir, b.type, 0, b.phase, game.isSolarPhase);
    }
    ctx.restore();

    for (const t of game.targets) {
        const key = `${t.x},${t.y}`;
        const data = game.poweredTargets.get(key) || { charge: 0, contaminated: false };
        Graphics.drawCoreRequirement(t.x, t.y, t.required, data.charge);
    }

    
    // Draw Gravity Overlay (Force field visual)
    if (game.gravityOverlayAlpha > 0) {
        Graphics.drawGravityOverlay(game.lastGravityDir, animFrame, game.gravityOverlayAlpha);
    }

    // Draw Blackout (Fog of War)
    Graphics.drawBlackout(game);

    // Draw Lasers and Particles ABOVE the blackout (Emissive light)
    for (const e of game.emitters) {
        Graphics.drawLaser(e, animFrame, game.transitionState === 'NONE');
    }
    Graphics.drawParticles(game);

    ctx.restore();

    // Draw Transition Door (Above Everything)
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

    if (window.StatsTerminal && StatsTerminal.state !== 'IDLE') {
        StatsTerminal.render(ctx);
    }

    if (window.ShopSystem && ShopSystem.state !== 'IDLE') {
        ShopSystem.render(ctx);
    }

    // VHS Rewind Effect overlay
    if (game.state === 'REVERSING') {
        Graphics.drawVHSEffect();
    }

    updateUI();
}

// Start
window.onload = init;
