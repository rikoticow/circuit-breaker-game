/**
 * CIRCUIT BREAKER - Level Selector Menu
 * CRT Style navigation for sectors and levels.
 */

const LevelSelector = {
    chapterIndex: 0,
    selectedInChapter: 0,
    animFrame: 0,
    progress: [], // Array of { unlocked: bool, completed: bool, stars: int }
    
    // Chapter layout data (Setores)
    chapterMaps: [
        [
            { lvlIdx: 0, x: 160, y: 150 },
            { lvlIdx: 1, x: 320, y: 150 },
            { lvlIdx: 2, x: 480, y: 150 },
            { lvlIdx: 3, x: 320, y: 300 }
        ]
    ],

    init() {
        this.loadProgress();
    },

    loadProgress() {
        const saved = localStorage.getItem('circuit_breaker_progress');
        if (saved) {
            this.progress = JSON.parse(saved);
        } else {
            // Init empty progress
            this.progress = LEVELS.map((l, i) => ({
                unlocked: i === 0,
                completed: false,
                stars: 0
            }));
            this.saveProgress();
        }
    },

    saveProgress() {
        localStorage.setItem('circuit_breaker_progress', JSON.stringify(this.progress));
    },

    handleInput(e) {
        const currentChapter = this.chapterMaps[this.chapterIndex];
        if (e.key === 'ArrowRight') this.selectedInChapter = (this.selectedInChapter + 1) % currentChapter.length;
        if (e.key === 'ArrowLeft') this.selectedInChapter = (this.selectedInChapter - 1 + currentChapter.length) % currentChapter.length;
    },

    getSelectedLevelIdx() {
        return this.chapterMaps[this.chapterIndex][this.selectedInChapter].lvlIdx;
    },

    trackStat(name, val) {
        // Track global stats if needed
    },

    getChapterStars(idx) { return 0; },
    getChapterMaxStars(idx) { return 0; },
    getTotalStars() { return 0; },
    getMaxStars() { return 0; }
};
