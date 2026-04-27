// ============================================================
// LEVEL SELECTOR - Circuit Breaker
// Retro CRT industrial level map with circuit-board aesthetics
// ============================================================

const LevelSelector = {
    active: false,
    selectedNode: 0,
    chapterIndex: 0,
    animFrame: 0,
    particles: [],
    robotBob: 0,
    scrollOffset: 0,
    targetScroll: 0,
    robotX: 0,
    robotY: 0,
    targetNode: 0, // Node the robot is moving towards
    moveProgress: 1, // 1 = reached targetNode
    prevNode: 0, // Node the robot started moving from
    robotDir: 1, // 0:UP, 1:RIGHT, 2:DOWN, 3:LEFT
    errorTimer: 0, // For flashing red when trying to enter locked level
    selectedSidebarItem: 0, // 0:DADOS, 1:FERRAMENTAS, 2:ENERGIA, 3:SISTEMA
    
    // Chapter Unlock Animation
    chapterUnlockActive: false,
    chapterUnlockTimer: 0,
    chapterUnlockTarget: -1, // Which chapter index just got unlocked
    chapterUnlockParticles: [],
    pendingChapterUnlock: false,

    // Global Stats
    stats: {
        robotMoves: 0,
        rotations: 0,
        totalTime: 0,
        totalDeaths: 0,
        totalAmps: 0,
        totalScrap: 0,
        totalWireMeters: 0,
        energyRecharged: 0
    },

    // Per-level progress (stars, unlocked, completed)
    progress: [],
    chapters: [],
    nodePositions: [],
    showStats: false, // Toggled by 'E' in DADOS tab
    panelProgress: 0, // 0 to 1 for sliding animation

    init() {
        // 1. Initialize progress for all levels
        this.progress = [];
        for (let i = 0; i < LEVELS.length; i++) {
            this.progress.push({
                unlocked: i === 0,
                completed: false,
                stars: 0,
                bestMoves: 999
            });
        }
        this.loadProgress();
        this.loadStats();

        // 2. Dynamic Chapter Definition (From levels.js)
        if (typeof CHAPTERS !== 'undefined') {
            this.chapters = JSON.parse(JSON.stringify(CHAPTERS));
        } else {
            this.chapters = [{ name: "CAPÍTULO 1", levels: Array.from({length: LEVELS.length}, (_, i) => i) }];
        }

        // 3. Generate Maps for each Chapter
        this.chapterMaps = [];
        const stepX = 110;
        const startX = 130;
        const baseY = 250;
        const amplitude = 60;

        this.chapters.forEach((chap, cIdx) => {
            const nodes = [];
            chap.levels.forEach((lvlIdx, i) => {
                nodes.push({
                    lvlIdx: lvlIdx,
                    x: startX + i * stepX,
                    y: baseY + Math.sin(i * 1.2 + cIdx * 5) * amplitude
                });
            });
            this.chapterMaps.push(nodes);
        });

        // 4. Initial state
        this.chapterIndex = 0;
        this.selectedInChapter = 0; // Index within the chapter's levels array
        const startNode = this.chapterMaps[0][0];
        this.robotX = startNode.x;
        this.robotY = startNode.y;
    },

    open(currentLevel) {
        this.active = true;
        
        // Find which chapter this level belongs to
        let chapIdx = 0;
        let inChapIdx = 0;
        for (let i = 0; i < this.chapters.length; i++) {
            const idx = this.chapters[i].levels.indexOf(currentLevel);
            if (idx !== -1) {
                chapIdx = i;
                inChapIdx = idx;
                break;
            }
        }

        this.chapterIndex = chapIdx;
        this.selectedInChapter = inChapIdx;
        this.particles = [];
        this.animFrame = 0;
        
        // Snap robot
        const node = this.chapterMaps[this.chapterIndex][this.selectedInChapter];
        this.robotX = node.x;
        this.robotY = node.y;
        this.showStats = false;
        this.panelProgress = 0;

        // Cover HTML UI with hazard stripes
        document.getElementById('ui-top')?.classList.add('covered');
        document.getElementById('ui-bottom')?.classList.add('covered');

        if (window.AudioSys) {
            AudioSys.setMusicIntensity(0); // Menu stays atmospheric (Ambient only)
            AudioSys.playGameMusic();
            AudioSys.updateHum(false, 0, false); // Silence electrical hum in menu
        }

        // Trigger pending chapter unlock animation
        if (this.pendingChapterUnlock && this.chapterUnlockTarget > 0) {
            // SWITCH TO THE NEW CHAPTER IMMEDIATELY
            this.chapterIndex = this.chapterUnlockTarget;
            this.selectedInChapter = 0;
            const node = this.chapterMaps[this.chapterIndex][0];
            this.robotX = node.x;
            this.robotY = node.y;
            this.scrollOffset = 0;
            this.targetScroll = 0;

            this.chapterUnlockActive = true;
            this.chapterUnlockTimer = 0;
            this.chapterUnlockParticles = [];
            this.pendingChapterUnlock = false;
            
            if (window.AudioSys) {
                AudioSys.playChapterUnlock();
            }
        }
    },

    close() {
        this.active = false;

        // Uncover HTML UI
        document.getElementById('ui-top')?.classList.remove('covered');
        document.getElementById('ui-bottom')?.classList.remove('covered');

        if (window.AudioSys) {
            AudioSys.setMusicIntensity(2); // Resume level music at full intensity
            AudioSys.playGameMusic(); // Ensure it keeps playing
        }
    },

    completeLevel(index, stars, movesUsed = 999) {
        if (index < 0 || index >= this.progress.length) return 0;
        
        let economyBonus = 0;
        const p = this.progress[index];
        
        // Calculate efficiency bonus (only on improvements)
        if (p.completed && movesUsed < p.bestMoves) {
            economyBonus = (p.bestMoves - movesUsed) * 10;
        }

        p.completed = true;
        p.stars = Math.max(p.stars, stars);
        p.bestMoves = Math.min(p.bestMoves, movesUsed);

        // Unlock next ONLY if it's in the same chapter
        if (index + 1 < this.progress.length) {
            const currentChapIdx = this._getChapterOfLevel(index);
            const nextChapIdx = this._getChapterOfLevel(index + 1);
            
            if (currentChapIdx === nextChapIdx) {
                this.progress[index + 1].unlocked = true;
            }
        }

        // Check if this meeting the 70% criteria unlocks the next chapter
        this._checkChapterUnlock(index);

        this.saveProgress();
        return economyBonus;
    },

    _getChapterOfLevel(lvlIdx) {
        for (let i = 0; i < this.chapters.length; i++) {
            if (this.chapters[i].levels.includes(lvlIdx)) return i;
        }
        return -1;
    },

    _checkChapterUnlock(completedLevelIdx) {
        const ci = this._getChapterOfLevel(completedLevelIdx);
        if (ci === -1) return;

        // 1. Check if 70% of energy cells in this chapter are earned
        const earned = this.getChapterStars(ci);
        const total = this.getChapterMaxStars(ci);
        const ratio = earned / total;
        if (ratio < 0.7) return;

        // 2. Check if ALL levels in this chapter are completed
        const chap = this.chapters[ci];
        const allLevelsDone = chap.levels.every(li => this.progress[li] && this.progress[li].completed);
        if (!allLevelsDone) return;

        // Check if there's a next chapter to unlock
        const nextChapIdx = ci + 1;
        if (nextChapIdx >= this.chapters.length) return;

        const nextChap = this.chapters[nextChapIdx];
        const firstLevelOfNext = nextChap.levels[0];

        // If the first level of the next chapter is still locked, unlock it and trigger animation
        if (firstLevelOfNext !== undefined && 
            this.progress[firstLevelOfNext] && 
            !this.progress[firstLevelOfNext].unlocked) {
            
            this.progress[firstLevelOfNext].unlocked = true;
            
            // Schedule unlock animation
            this.chapterUnlockTarget = nextChapIdx;
            this.pendingChapterUnlock = true;
        }
    },

    saveProgress() {
        localStorage.setItem('circuit_breaker_progress', JSON.stringify(this.progress));
        this.saveStats();
    },

    saveStats() {
        localStorage.setItem('circuit_breaker_stats', JSON.stringify(this.stats));
    },

    loadStats() {
        const saved = localStorage.getItem('circuit_breaker_stats');
        if (saved) {
            try {
                this.stats = { ...this.stats, ...JSON.parse(saved) };
            } catch (e) { console.error("Failed to load stats", e); }
        }
    },

    trackStat(name, value) {
        if (this.stats[name] !== undefined) {
            this.stats[name] += value;
            this.saveStats();
        }
    },

    loadProgress() {
        const saved = localStorage.getItem('circuit_breaker_progress');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                // Merge data to ensure new levels or fields don't break
                data.forEach((d, i) => {
                    if (this.progress[i]) {
                        this.progress[i] = { ...this.progress[i], ...d };
                    }
                });
            } catch (e) {
                console.error("Failed to load progress", e);
            }
        }
    },

    getTotalStars() {
        return this.progress.reduce((sum, p) => sum + p.stars, 0);
    },

    getMaxStars() {
        return this.progress.length * 3;
    },

    getChapterStars(chapterIdx) {
        const chap = this.chapters[chapterIdx];
        if (!chap) return 0;
        return chap.levels.reduce((sum, li) => sum + (this.progress[li]?.stars || 0), 0);
    },

    getChapterMaxStars(chapterIdx) {
        const chap = this.chapters[chapterIdx];
        if (!chap) return 0;
        return chap.levels.length * 3;
    },

    isChapterUnlocked(idx) {
        if (idx === 0) return true; // First chapter always unlocked
        const chap = this.chapters[idx];
        if (!chap) return false;
        // Chapter is unlocked if its first level is unlocked
        const firstLvlIdx = chap.levels[0];
        return this.progress[firstLvlIdx]?.unlocked || false;
    },

    handleInput(key) {
        if (!this.active) return false;

        // Block input during chapter unlock animation
        if (this.chapterUnlockActive) {
            // Allow skipping after the text has appeared (frame 120+)
            if (this.chapterUnlockTimer >= 120) {
                this.chapterUnlockTimer = 239; // Jump to just before auto-transition
            }
            return true;
        }

        // Sidebar Navigation (UP/DOWN)
        if (key === 'ArrowUp' || key === 'w') {
            if (this.selectedSidebarItem > 0) {
                this.selectedSidebarItem--;
                this.showStats = false; // Hide stats when moving
                if (window.AudioSys) AudioSys.selectorMove();
            }
            return true;
        }
        if (key === 'ArrowDown' || key === 's') {
            if (this.selectedSidebarItem < 3) {
                this.selectedSidebarItem++;
                this.showStats = false; // Hide stats when moving
                if (window.AudioSys) AudioSys.selectorMove();
            }
            return true;
        }

        // Sidebar Action (Enter)
        if (key === 'Enter') {
            if (this.selectedSidebarItem === 0) {
                this.showStats = !this.showStats; // Toggle stats view
                if (window.AudioSys) AudioSys.move();
            } else {
                if (window.AudioSys) AudioSys.coreLost(); // Disabled sound
            }
            return true;
        }

        // Level Navigation (LEFT/RIGHT/SPACE)
        if (this.selectedSidebarItem === 0) {
            const isUnlocked = this.isChapterUnlocked(this.chapterIndex);
            const currentMap = this.chapterMaps[this.chapterIndex];

            if (key === 'ArrowLeft' || key === 'a') {
                if (!isUnlocked) {
                    if (window.AudioSys) AudioSys.coreLost();
                    return true;
                }
                if (this.selectedInChapter > 0) {
                    this.prevNode = this.selectedInChapter;
                    this.selectedInChapter--;
                    this.moveProgress = 0;
                    if (window.AudioSys) AudioSys.selectorMove();
                }
                return true;
            }
            if (key === 'ArrowRight' || key === 'd') {
                if (!isUnlocked) {
                    if (window.AudioSys) AudioSys.coreLost();
                    return true;
                }
                if (this.selectedInChapter < currentMap.length - 1) {
                    this.prevNode = this.selectedInChapter;
                    this.selectedInChapter++;
                    this.moveProgress = 0;
                    if (window.AudioSys) AudioSys.selectorMove();
                }
                return true;
            }
            if (key === ' ') {
                if (!isUnlocked) {
                    if (window.AudioSys) AudioSys.coreLost();
                    return true;
                }
                const node = currentMap[this.selectedInChapter];
                const p = this.progress[node.lvlIdx];
                if (p && p.unlocked) {
                    if (window.AudioSys) AudioSys.corePowered();
                    return 'SELECT_' + node.lvlIdx;
                } else {
                    this.errorTimer = 30; // Flash red
                    if (window.AudioSys) AudioSys.coreLost();
                }
                return true;
            }
        }

        // Chapter Navigation (Q/E)
        if (key === 'q' || key === 'Q') {
            if (this.chapterIndex > 0) {
                this.chapterIndex--;
                this.selectedInChapter = 0;
                this.moveProgress = 1; // Instant snap
                const node = this.chapterMaps[this.chapterIndex][0];
                this.robotX = node.x;
                this.robotY = node.y;
                if (window.AudioSys) AudioSys.chapterSwitch();
            }
            return true;
        }
        if (key === 'e' || key === 'E') {
            if (this.chapterIndex < this.chapters.length - 1) {
                this.chapterIndex++;
                this.selectedInChapter = 0;
                this.moveProgress = 1;
                const node = this.chapterMaps[this.chapterIndex][0];
                this.robotX = node.x;
                this.robotY = node.y;
                if (window.AudioSys) AudioSys.chapterSwitch();
            }
            return true;
        }

        if (key === 'Escape') {
            return 'CLOSE';
        }
        return true;
    },

    update() {
        if (!this.active) return;
        this.animFrame++;

        // --- Robot Path Movement Logic ---
        if (this.moveProgress < 1) {
            this.moveProgress += 0.04; // Slower, more deliberate travel
            if (this.moveProgress > 1) this.moveProgress = 1;

            const cMap = this.chapterMaps[this.chapterIndex];
            const i = Math.min(this.prevNode, this.selectedInChapter);
            const j = Math.max(this.prevNode, this.selectedInChapter);
            const a = cMap[i];
            const b = cMap[j];
            const midX = (a.x + b.x) / 2;
            
            const forward = this.selectedInChapter > this.prevNode;
            const p = forward ? this.moveProgress : (1 - this.moveProgress);

            if (p < 0.33) {
                const subT = p / 0.33;
                this.robotX = a.x + (midX - a.x) * subT;
                this.robotY = a.y;
                this.robotDir = (midX > a.x) ? DIRS.RIGHT : DIRS.LEFT;
            } else if (p < 0.66) {
                const subT = (p - 0.33) / 0.33;
                this.robotX = midX;
                this.robotY = a.y + (b.y - a.y) * subT;
                this.robotDir = (b.y > a.y) ? DIRS.DOWN : DIRS.UP;
            } else {
                const subT = (p - 0.66) / 0.34;
                this.robotX = midX + (b.x - midX) * subT;
                this.robotY = b.y;
                this.robotDir = (b.x > midX) ? DIRS.RIGHT : DIRS.LEFT;
            }
            
            // If moving backwards (selected < prev), flip the calculated directions
            if (!forward) {
                if (this.robotDir === DIRS.RIGHT) this.robotDir = DIRS.LEFT;
                else if (this.robotDir === DIRS.LEFT) this.robotDir = DIRS.RIGHT;
                else if (this.robotDir === DIRS.UP) this.robotDir = DIRS.DOWN;
                else if (this.robotDir === DIRS.DOWN) this.robotDir = DIRS.UP;
            }
        } else {
            const cMap = this.chapterMaps[this.chapterIndex];
            const n = cMap[this.selectedInChapter];
            this.robotX = n.x;
            this.robotY = n.y;
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Horizontal Scrolling (Track the visual robot position)
        this.targetScroll = Math.max(0, this.robotX - 320); 
        this.scrollOffset += (this.targetScroll - this.scrollOffset) * 0.1;

        this.robotBob = Math.sin(this.animFrame * 0.08) * 3;
        if (this.errorTimer > 0) this.errorTimer--;

        // Animate Panel Expansion
        const targetProgress = (this.selectedSidebarItem === 0 && this.showStats) ? 1 : 0;
        this.panelProgress += (targetProgress - this.panelProgress) * 0.15;

        // Chapter Unlock Animation
        if (this.chapterUnlockActive) {
            this.chapterUnlockTimer++;

            // Generate electrical particles (from far away)
            if (this.chapterUnlockTimer < 60) {
                for (let i = 0; i < 6; i++) {
                    const cx = 320, cy = 240;
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 400 + Math.random() * 200; // Outside screen
                    this.chapterUnlockParticles.push({
                        x: cx + Math.cos(angle) * dist,
                        y: cy + Math.sin(angle) * dist,
                        vx: (cx - (cx + Math.cos(angle) * dist)) * 0.03, // Faster convergence
                        vy: (cy - (cy + Math.sin(angle) * dist)) * 0.03,
                        life: 1.2,
                        size: 3 + Math.random() * 4,
                        color: Math.random() > 0.5 ? '#00f0ff' : '#00ff9f'
                    });
                }
            }

            // Explosion at frame 60
            if (this.chapterUnlockTimer === 60) {
                const cx = 320, cy = 240;
                for (let i = 0; i < 50; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 2 + Math.random() * 8;
                    this.chapterUnlockParticles.push({
                        x: cx,
                        y: cy,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 1.0,
                        size: 2 + Math.random() * 3,
                        color: Math.random() > 0.5 ? '#00f0ff' : '#fff'
                    });
                }
                if (window.AudioSys) AudioSys.playTone(800, 'sine', 0.2, 0.15);
            }

            // Update particles
            for (let i = this.chapterUnlockParticles.length - 1; i >= 0; i--) {
                const p = this.chapterUnlockParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.012;
                if (p.life <= 0) this.chapterUnlockParticles.splice(i, 1);
            }

            // Sound effect at key moment (Reveal)
            if (this.chapterUnlockTimer === 60 && window.AudioSys) {
                AudioSys.braam();
            }

            // Auto-transition ends animation
            if (this.chapterUnlockTimer >= 240) {
                this.chapterUnlockActive = false;
                // Chapter is already set in open()
            }
        }
    },

    render(ctx) {
        if (!this.active) return;
        const W = 640, H = 480;

        ctx.save();

        // === BACKGROUND ===
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#12101c');
        bgGrad.addColorStop(0.5, '#1a1528');
        bgGrad.addColorStop(1, '#0e0c18');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Circuit grid pattern
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 32) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y < H; y += 32) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // === CRT FRAME ===
        this._drawCRTFrame(ctx, W, H);

        // === CHAPTER HEADER ===
        this._drawChapterHeader(ctx, W);

        // === SIDEBAR ===
        this._drawSidebar(ctx, W, H);

        // === CONTENT AREA (MAP + PANELS) ===
        const panelWidth = 240;
        const mapShift = this.panelProgress * panelWidth;

        ctx.save();
        ctx.translate(mapShift, 0); // PUSH MAP TO THE RIGHT

        // === CIRCUIT PATH ===
        ctx.save();
        ctx.translate(-this.scrollOffset, 0);

        const isChapterUnlocked = this.isChapterUnlocked(this.chapterIndex);
        
        if (isChapterUnlocked) {
            this._drawCircuitPath(ctx);

            // === NODES ===
            const currentMap = this.chapterMaps[this.chapterIndex];
            if (currentMap) {
                for (let i = 0; i < currentMap.length; i++) {
                    this._drawNode(ctx, i);
                }
            }

            // === ROBOT ===
            this._drawSelectorRobot(ctx);
        } else {
            // Chapter is locked: Draw a static "OFFLINE" notice in the map area
            ctx.font = '24px "VT323", monospace';
            ctx.fillStyle = '#ff003c';
            ctx.textAlign = 'center';
            ctx.globalAlpha = 0.5 + Math.sin(this.animFrame * 0.1) * 0.2;
            ctx.fillText('SISTEMA OFFLINE - ENERGIA INSUFICIENTE', 320, 240);
            ctx.globalAlpha = 1.0;
        }

        // === PARTICLES ===
        this._drawParticles(ctx);
        ctx.restore();
        ctx.restore(); // End of mapShift

        // === DADOS OVERLAY (Stats) ===
        if (this.panelProgress > 0.01) {
            this._drawStatsPanel(ctx, W, H, panelWidth);
        }

        // === BOTTOM BAR ===
        this._drawBottomBar(ctx, W, H);

        // === CRT OVERLAY ===
        this._drawCRTOverlay(ctx, W, H);

        // === CHAPTER UNLOCK ANIMATION ===
        if (this.chapterUnlockActive) {
            this._drawChapterUnlock(ctx, W, H);
        }

        ctx.restore();
    },

    _drawChapterUnlock(ctx, W, H) {
        const t = this.chapterUnlockTimer;
        const chap = this.chapters[this.chapterUnlockTarget];
        if (!chap) return;

        ctx.save();

        // 1. Dark overlay (Starts solid black, fades after explosion)
        let overlayAlpha = 1.0;
        if (t > 60) {
            overlayAlpha = Math.max(0, 1.0 - (t - 60) * 0.015);
        }
        ctx.fillStyle = `rgba(0, 5, 10, ${overlayAlpha})`;
        ctx.fillRect(0, 0, W, H);

        // 2. Electrical particles (drawn on top of darkness)
        for (const p of this.chapterUnlockParticles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // 3. Central electrical flash (frame 55-70)
        if (t > 55 && t < 90) {
            const flashAlpha = Math.max(0, 1 - (t - 55) / 35);
            ctx.fillStyle = `rgba(0, 240, 255, ${flashAlpha * 0.3})`;
            ctx.fillRect(0, 0, W, H);

            // Central burst
            const burstR = (t - 55) * 8;
            const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, burstR);
            grad.addColorStop(0, `rgba(0, 255, 159, ${flashAlpha * 0.6})`);
            grad.addColorStop(0.5, `rgba(0, 240, 255, ${flashAlpha * 0.3})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
        }

        // 4. "SETOR DESBLOQUEADO" text (appears at frame 60+)
        if (t >= 60) {
            const textAlpha = Math.min(1, (t - 60) / 30);
            const cx = W / 2;

            // Hazard line separators
            ctx.globalAlpha = textAlpha * 0.5;
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - 160, H / 2 - 35);
            ctx.lineTo(cx + 160, H / 2 - 35);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - 160, H / 2 + 30);
            ctx.lineTo(cx + 160, H / 2 + 30);
            ctx.stroke();
            ctx.globalAlpha = 1;

            // Small label
            ctx.globalAlpha = textAlpha;
            ctx.font = '16px "VT323", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#00f0ff';
            ctx.fillText('▸ NOVO SETOR DESBLOQUEADO ◂', cx, H / 2 - 20);

            // Big chapter number
            const sectorNum = String(this.chapterUnlockTarget + 1).padStart(2, '0');
            ctx.font = 'bold 48px "VT323", monospace';
            ctx.fillStyle = '#00ff9f';
            ctx.shadowColor = '#00ff9f';
            ctx.shadowBlur = 20 + Math.sin(t * 0.08) * 5;
            ctx.fillText(`SETOR ${sectorNum}`, cx, H / 2 + 10);
            ctx.shadowBlur = 0;

            // Chapter name
            ctx.font = '22px "VT323", monospace';
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 8;
            ctx.fillText(chap.name, cx, H / 2 + 45);
            ctx.shadowBlur = 0;

            ctx.globalAlpha = 1;
        }

        // 5. "Press any key" hint (frame 180+)
        if (t >= 180) {
            const blinkAlpha = (Math.sin(t * 0.1) * 0.3 + 0.7);
            ctx.globalAlpha = blinkAlpha;
            ctx.font = '14px "VT323", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#666';
            ctx.fillText('CONECTANDO AO NOVO SETOR...', W / 2, H / 2 + 85);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    },

    _drawCRTFrame(ctx, W, H) {
        // Vignette
        const vig = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 400);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        // Rusty metal border
        ctx.strokeStyle = '#3a3028';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, W - 6, H - 6);
        ctx.strokeStyle = '#2a2218';
        ctx.lineWidth = 2;
        ctx.strokeRect(6, 6, W - 12, H - 12);

        // Rivets in corners
        const rivetPositions = [
            [12, 12], [W - 16, 12], [12, H - 16], [W - 16, H - 16],
            [W / 2 - 2, 12], [W / 2 - 2, H - 16]
        ];
        for (const [rx, ry] of rivetPositions) {
            ctx.fillStyle = '#555040';
            ctx.beginPath();
            ctx.arc(rx, ry, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3a3528';
            ctx.beginPath();
            ctx.arc(rx, ry, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    _drawChapterHeader(ctx, W) {
        const chap = this.chapters[this.chapterIndex];
        if (!chap) return;

        const isUnlocked = this.isChapterUnlocked(this.chapterIndex);

        const cy = 40;
        ctx.font = '36px "VT323", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;
        ctx.fillText(`SETOR ${String(this.chapterIndex + 1).padStart(2, '0')}`, W / 2 + 20, cy);
        ctx.shadowBlur = 0;

        ctx.font = '18px "VT323", monospace';
        ctx.fillStyle = isUnlocked ? '#00ff9f' : '#444';
        ctx.shadowColor = isUnlocked ? '#00ff9f' : 'transparent';
        ctx.shadowBlur = 8;
        ctx.fillText(isUnlocked ? chap.name : "???", W / 2 + 20, cy + 24);
        ctx.shadowBlur = 0;

        // Navigation arrows
        const arrowY = cy - 5;
        const arrowPulse = Math.sin(this.animFrame * 0.05) * 3;
        ctx.fillStyle = '#00f0ff';
        // Left arrow
        ctx.beginPath();
        ctx.moveTo(W / 2 - 120 - arrowPulse, arrowY);
        ctx.lineTo(W / 2 - 105, arrowY - 10);
        ctx.lineTo(W / 2 - 105, arrowY + 10);
        ctx.closePath();
        ctx.fill();
        // Right arrow
        ctx.beginPath();
        ctx.moveTo(W / 2 + 155 + arrowPulse, arrowY);
        ctx.lineTo(W / 2 + 140, arrowY - 10);
        ctx.lineTo(W / 2 + 140, arrowY + 10);
        ctx.closePath();
        ctx.fill();
    },

    // Removed redundant _drawSidebar

    _drawCircuitPath(ctx) {
        const nodes = this.chapterMaps[this.chapterIndex];
        if (!nodes) return;
        for (let i = 0; i < nodes.length - 1; i++) {
            const a = nodes[i], b = nodes[i + 1];
            const isComplete = this.progress[a.lvlIdx] && this.progress[a.lvlIdx].completed;

            // Manhattan Routing points
            const midX = (a.x + b.x) / 2;
            const points = [
                { x: a.x, y: a.y },
                { x: midX, y: a.y },
                { x: midX, y: b.y },
                { x: b.x, y: b.y }
            ];

            // Wire Colors (matching js/graphics.js)
            let color, borderColor;
            if (isComplete) {
                color = '#00f0ff'; // OCEAN Cyan
                borderColor = '#005588';
            } else {
                color = '#ff6a00'; // Industrial Orange
                borderColor = '#883300';
            }

            ctx.save();
            
            const drawPath = (width, strokeStyle, shadow = false) => {
                ctx.lineWidth = width;
                ctx.strokeStyle = strokeStyle;
                if (shadow) {
                    ctx.shadowColor = strokeStyle;
                    ctx.shadowBlur = 10;
                } else {
                    ctx.shadowBlur = 0;
                }
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let j = 1; j < points.length; j++) {
                    ctx.lineTo(points[j].x, points[j].y);
                }
                ctx.stroke();
            };

            // 1. Black Border
            drawPath(14, '#000');

            // 2. Main Pipe Body
            drawPath(10, borderColor);

            // 3. Inner Core
            drawPath(6, color, isComplete);

            // 4. Central Highlight Strip
            drawPath(2, 'rgba(255, 255, 255, 0.4)');

            // 5. Flowing Energy for completed paths
            if (isComplete) {
                const numDots = 4;
                const speed = 0.015;
                const tBase = (this.animFrame * speed) % 1;
                
                // Calculate total path length for proper interpolation
                const segments = [
                    Math.abs(midX - a.x),
                    Math.abs(b.y - a.y),
                    Math.abs(b.x - midX)
                ];
                const totalLen = segments[0] + segments[1] + segments[2];

                ctx.fillStyle = '#fff';
                for (let j = 0; j < numDots; j++) {
                    const t = (tBase + j / numDots) % 1;
                    let d = t * totalLen;
                    let px, py;

                    if (d < segments[0]) {
                        px = a.x + d;
                        py = a.y;
                    } else if (d < segments[0] + segments[1]) {
                        px = midX;
                        const localD = d - segments[0];
                        py = a.y + (b.y > a.y ? localD : -localD);
                    } else {
                        const localD = d - segments[0] - segments[1];
                        px = midX + localD;
                        py = b.y;
                    }
                    
                    ctx.shadowColor = '#fff';
                    ctx.shadowBlur = 5;
                    ctx.beginPath();
                    ctx.arc(px, py, 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }

            // Solder points at nodes
            ctx.fillStyle = isComplete ? '#aaffff' : '#444';
            ctx.beginPath(); ctx.arc(a.x, a.y, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();

            ctx.restore();
        }
    },

    _drawNode(ctx, index) {
        const cMap = this.chapterMaps[this.chapterIndex];
        const node = cMap[index];
        const n = node;
        const p = this.progress[node.lvlIdx];
        const isSelected = this.selectedInChapter === index;
        const isLocked = !p.unlocked;
        const isCompleted = p.completed;

        const radius = 30;
        const ts = radius * 2;
        const pulse = isSelected ? Math.sin(this.animFrame * 0.08) * 4 : 0;

        ctx.save();
        ctx.translate(n.x, n.y);

        // Core Colors (matching js/graphics.js)
        let coreColor;
        if (isLocked) {
            coreColor = '#0a0a0a'; // Unpowered/Off state
        } else if (isSelected) {
            coreColor = '#00f0ff'; // Cyan for current/selected
        } else if (isCompleted) {
            coreColor = '#00ff41'; // Vibrant Neon Green for completed
        } else {
            coreColor = '#005522'; // Deeper Idle green for unlocked but not done
        }

        // 1. Support Claws (Diagonal brackets)
        ctx.fillStyle = '#444';
        const clawSize = 8;
        const clawOffset = radius - 8;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
            ctx.fillRect(sx * clawOffset - clawSize / 2, sy * clawOffset - clawSize / 2, clawSize, clawSize);
            ctx.fillStyle = '#666';
            ctx.fillRect(sx * clawOffset - 2, sy * clawOffset - 2, 4, 4);
            ctx.fillStyle = '#444';
        });

        // Glow for selected
        if (isSelected && !isLocked) {
            ctx.shadowColor = coreColor;
            ctx.shadowBlur = 15 + pulse;
        }

        // 2. Base Plate
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(0, 0, radius - 4, 0, Math.PI * 2);
        ctx.fill();

        // 3. Core Primary Circle
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(0, 0, radius - 8, 0, Math.PI * 2);
        ctx.fill();

        // 4. Inner Highlight (Ring)
        ctx.strokeStyle = isLocked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius - 12, 0, Math.PI * 2);
        ctx.stroke();

        // 5. Center Glow Point
        if (!isLocked) {
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = (isSelected ? 0.9 : 0.6);
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        ctx.shadowBlur = 0;

        // Number or Locked State (Now at the TOP)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelY = -radius - 15; // Position above the core

        if (isLocked) {
            ctx.font = '11px "VT323", monospace';
            ctx.fillStyle = '#ff003c';
            ctx.fillText('BLOQUEADO', 0, labelY);
        } else {
            ctx.font = 'bold 20px "VT323", monospace';
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            const levelName = LEVELS[node.lvlIdx]?.name || `LEVEL ${node.lvlIdx + 1}`;
            ctx.fillText(levelName, 0, labelY);
            ctx.shadowBlur = 0;
        }

        // Star banner (keep at bottom or adjust?)
        if (!isLocked) {
            const bannerY = radius + 6;
            const bannerW = 50, bannerH = 16;

            ctx.fillStyle = 'rgba(180, 20, 40, 0.9)';
            ctx.beginPath();
            ctx.moveTo(-bannerW / 2, bannerY);
            ctx.lineTo(bannerW / 2, bannerY);
            ctx.lineTo(bannerW / 2 - 4, bannerY + bannerH);
            ctx.lineTo(-bannerW / 2 + 4, bannerY + bannerH);
            ctx.closePath();
            ctx.fill();

            const starCount = p.stars;
            for (let s = 0; s < 3; s++) {
                const sx = -14 + s * 14;
                const sy = bannerY + bannerH / 2;
                ctx.fillStyle = s < starCount ? '#00f0ff' : '#223344'; // Cyan for energy
                if (s < starCount) {
                    ctx.shadowColor = '#00f0ff';
                    ctx.shadowBlur = 5;
                }
                this._drawEnergyBolt(ctx, sx, sy, 10);
                ctx.shadowBlur = 0;
            }
        }

        // Sparks for selected node ONLY when robot has arrived
        if (isSelected && !isLocked && this.moveProgress === 1) {
            if (this.animFrame % 3 === 0) { // More frequent
                for (let i = 0; i < 2; i++) { // Two at a time
                    const angle = Math.random() * Math.PI * 2;
                    const dist = radius - 4;
                    this.particles.push({
                        x: n.x + Math.cos(angle) * dist,
                        y: n.y + Math.sin(angle) * dist,
                        vx: Math.cos(angle) * (1 + Math.random() * 2),
                        vy: Math.sin(angle) * (1 + Math.random() * 2),
                        life: 0.6 + Math.random() * 0.4,
                        color: Math.random() > 0.3 ? '#00f0ff' : '#fff'
                    });
                }
            }
        }

        ctx.restore();
    },

    _drawSelectorRobot(ctx) {
        // Use the actual game robot drawing logic
        // We use the interpolated robotX/robotY and robotDir
        const px = (this.robotX - 16) / 32;
        const py = (this.robotY - 16) / 32;
        
        // Error flash logic (oscillates between red and default)
        let colorOverride = null;
        if (this.errorTimer > 0) {
            const isRed = Math.floor(this.errorTimer / 4) % 2 === 0;
            if (isRed) colorOverride = '#ff003c'; // Error Red
        }

        ctx.save();
        Graphics.drawRobot(px, py, this.robotDir, this.animFrame, colorOverride);
        ctx.restore();
    },

    _drawParticles(ctx) {
        for (const p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, 3, 3);
        }
        ctx.globalAlpha = 1.0;
    },

    _drawSidebar(ctx, W, H) {
        const sideW = 80;
        const startY = 80;
        const itemH = 70;

        // Panel background
        ctx.fillStyle = 'rgba(15, 10, 25, 0.95)';
        ctx.fillRect(0, 40, sideW, H - 90);
        
        // Edge line
        ctx.strokeStyle = '#302540';
        ctx.lineWidth = 2;
        ctx.strokeRect(-2, 40, sideW + 2, H - 90);

        const items = ['DADOS', 'FERRAM.', 'ENERGIA', 'SISTEMA'];
        ctx.textAlign = 'center';

        for (let i = 0; i < items.length; i++) {
            const iy = startY + i * itemH;
            const isSelected = this.selectedSidebarItem === i;
            const isDisabled = i > 0;
            
            // Highlight bar for selected
            if (isSelected) {
                const grad = ctx.createLinearGradient(0, iy - 30, sideW, iy - 30);
                grad.addColorStop(0, 'rgba(0, 240, 255, 0.3)');
                grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, iy - 30, sideW, itemH);
                
                // Selection indicator
                ctx.fillStyle = '#00f0ff';
                ctx.fillRect(0, iy - 30, 3, itemH);
            }

            // Icon Placeholder (Square instead of emoji)
            ctx.strokeStyle = isSelected ? '#00f0ff' : (isDisabled ? '#2a2038' : '#444');
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.strokeRect(sideW / 2 - 15, iy - 15, 30, 30);

            // Icon Content
            if (isSelected) {
                ctx.fillStyle = '#00f0ff';
                ctx.globalAlpha = 0.5 + Math.sin(this.animFrame * 0.1) * 0.2;
                ctx.fillRect(sideW / 2 - 10, iy - 10, 20, 20);
                ctx.globalAlpha = 1.0;
            }

            // Label
            ctx.font = '12px "VT323", monospace';
            if (isSelected) {
                ctx.fillStyle = '#fff';
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 10;
            } else {
                ctx.fillStyle = isDisabled ? '#444' : '#888';
                ctx.shadowBlur = 0;
            }
            
            ctx.fillText(items[i], sideW / 2, iy + 30);
            ctx.shadowBlur = 0;

            // "DISABLED" small text
            if (isDisabled && isSelected) {
                ctx.font = '8px "VT323", monospace';
                ctx.fillStyle = '#ff003c';
                ctx.fillText('OFFLINE', sideW / 2, iy + 40);
            }
        }
    },

    _drawStatsPanel(ctx, W, H, panelWidth) {
        const sideW = 80;
        const px = sideW + 10;
        const py = 85;
        const pw = (panelWidth - 20) * this.panelProgress; // Animate width
        const ph = H - 150;
        
        if (pw < 10) return;

        ctx.save();
        // Clipping to avoid overflow during animation
        ctx.beginPath();
        ctx.rect(px, py, pw, ph);
        ctx.clip();

        // Glass panel
        ctx.fillStyle = 'rgba(10, 30, 40, 0.9)';
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, pw, ph);

        // Title
        ctx.font = 'bold 18px "VT323", monospace';
        ctx.fillStyle = '#00f0ff';
        ctx.textAlign = 'left';
        ctx.fillText('ESTATÍSTICAS GERAIS', px + 20, py + 35);
        ctx.fillRect(px + 20, py + 45, pw - 40, 1);

        // Stats
        ctx.font = '16px "VT323", monospace';
        const stats = [
            { label: 'DESLOCAMENTOS ROBÔ', val: this.stats.robotMoves },
            { label: 'ROTAÇÕES DE BLOCOS', val: this.stats.rotations },
            { label: 'TEMPO DE SINCRONIA', val: this._formatTime(this.stats.totalTime) },
            { label: 'FALHAS DO SISTEMA', val: this.stats.totalDeaths },
            { label: 'AMPERES SINCRONIZADOS', val: this.stats.totalAmps },
            { label: 'SUCATA COLETADA', val: this.stats.totalScrap },
            { label: 'FIOS VALIDADOS (M)', val: this.stats.totalWireMeters },
            { label: 'ENERGIA RECARREGADA', val: this.stats.energyRecharged },
            { label: 'CÉLULAS DE ENERGIA', val: `${this.getTotalStars()}/${this.getMaxStars()}` }
        ];

        for (let i = 0; i < stats.length; i++) {
            const sy = py + 60 + i * 19;
            ctx.fillStyle = '#888';
            ctx.fillText(stats[i].label, px + 20, sy);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.fillText(stats[i].val, px + pw - 20, sy);
            ctx.textAlign = 'left';
        }
        
        // Rivets in panel corners
        ctx.fillStyle = '#444';
        [[px+5, py+5], [px+pw-5, py+5], [px+5, py+ph-5], [px+pw-5, py+ph-5]].forEach(([rx, ry]) => {
            ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI*2); ctx.fill();
        });

        ctx.restore();
    },

    _formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },

    _drawBottomBar(ctx, W, H) {
        const barY = H - 50;
        const barH = 40;

        // Background
        ctx.fillStyle = 'rgba(0, 60, 80, 0.85)';
        ctx.fillRect(0, barY, W, barH);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, barY);
        ctx.lineTo(W, barY);
        ctx.stroke();

        // Left: Stars progress (Now CHAPTER SPECIFIC)
        const totalStars = this.getChapterStars(this.chapterIndex);
        const maxStars = this.getChapterMaxStars(this.chapterIndex);

        // Energy count
        ctx.fillStyle = '#00f0ff';
        this._drawEnergyBolt(ctx, 20, barY + 22, 12);
        
        ctx.font = '16px "VT323", monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${totalStars}/${maxStars}`, 32, barY + 26);

        // Progress bar
        const pbx = 75, pby = barY + 14, pbw = 100, pbh = 12;
        this._drawSegmentedBar(ctx, pbx, pby, pbw, pbh, totalStars, maxStars, '#00f0ff');

        // Right: Circuit cores progress
        const completedCount = this.progress.filter(p => p.completed).length;
        
        // Label
        ctx.font = 'bold 14px "VT323", monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#00ff9f';
        ctx.fillText('SYNC', W - 20, barY + 26);

        // Value
        ctx.font = '16px "VT323", monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${completedCount}/${LEVELS.length}`, W - 70, barY + 26);

        // Progress bar
        const cpx = W - 210, cpy = barY + 14, cpw = 100, cph = 12;
        this._drawSegmentedBar(ctx, cpx, cpy, cpw, cph, completedCount, LEVELS.length, '#00ff9f');
    },

    _drawSegmentedBar(ctx, x, y, w, h, current, max, color) {
        // Outer Container
        ctx.fillStyle = '#000';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        const padding = 1;
        const innerX = x + padding;
        const innerY = y + padding;
        const innerW = w - padding * 2;
        const innerH = h - padding * 2;
        const gap = 1;

        if (max <= 0) return;

        const segW = (innerW - (max - 1) * gap) / max;

        for (let i = 0; i < max; i++) {
            const sx = innerX + i * (segW + gap);
            const isEmpty = i >= current;

            if (isEmpty) {
                // Empty segment
                ctx.fillStyle = '#222';
                ctx.fillRect(sx, innerY, segW, innerH);
                ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                ctx.lineWidth = 1;
                ctx.strokeRect(sx, innerY, segW, innerH);
            } else {
                // Filled segment
                ctx.fillStyle = color;
                ctx.fillRect(sx, innerY, segW, innerH);

                // Highlights/Shadows (matching HUD CSS)
                ctx.fillStyle = 'rgba(255,255,255,0.3)'; // Top/Left highlight
                ctx.fillRect(sx, innerY, segW, 1);
                ctx.fillRect(sx, innerY, 1, innerH);

                ctx.fillStyle = 'rgba(0,0,0,0.3)'; // Bottom/Right shadow
                ctx.fillRect(sx, innerY + innerH - 1, segW, 1);
                ctx.fillRect(sx + segW - 1, innerY, 1, innerH);

                // Outer segment border
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                ctx.strokeRect(sx, innerY, segW, innerH);
            }
        }
    },

    _drawCRTOverlay(ctx, W, H) {
        // Scanlines
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        for (let y = 0; y < H; y += 3) {
            ctx.fillRect(0, y, W, 1);
        }

        // Subtle noise
        if (this.animFrame % 2 === 0) {
            for (let i = 0; i < 30; i++) {
                ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
                ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
            }
        }
    },

    _drawEnergyBolt(ctx, x, y, size) {
        const scale = size / 40;
        const pts = [
            { x: -14, y: -20 }, // Top Left
            { x: 12,  y: -20 }, // Top Right
            { x: 2,   y: -2 },  // Mid Right (In)
            { x: 16,  y: -2 },  // Mid Right (Out)
            { x: -4,  y: 25 },  // Bottom Tip
            { x: 4,   y: 4 },   // Mid Left (In)
            { x: -16, y: 4 }    // Mid Left (Out)
        ];

        const drawPath = (ox = 0, oy = 0) => {
            ctx.beginPath();
            ctx.moveTo(x + (pts[0].x + ox) * scale, y + (pts[0].y + oy) * scale);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(x + (pts[i].x + ox) * scale, y + (pts[i].y + oy) * scale);
            }
            ctx.closePath();
        };

        const originalFill = ctx.fillStyle;

        // 1. 3D DEPTH (Blocky offset)
        ctx.fillStyle = '#9b4d00'; // Industrial Bronze
        drawPath(3, 3);
        ctx.fill();

        // 2. OUTER BLACK OUTLINE
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3 * scale;
        drawPath();
        ctx.stroke();

        // 3. MAIN BODY
        ctx.fillStyle = originalFill;
        drawPath();
        ctx.fill();

        // 4. Highlight (if it's not a dark color)
        if (originalFill !== '#223344' && originalFill !== '#050810') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1.5 * scale;
            ctx.beginPath();
            ctx.moveTo(x + (pts[0].x + 3) * scale, y + (pts[0].y + 3) * scale);
            ctx.lineTo(x + (pts[1].x - 6) * scale, y + (pts[1].y + 3) * scale);
            ctx.stroke();
        }
    }
};
