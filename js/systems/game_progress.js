/**
 * Game Progress System - Tracks unlocked abilities and global state.
 */

const GameProgress = {
    scrapTotal: 0,
    abilities: new Set(),
    completionSignals: new Set(),
    levelStates: {},
    
    init(savedAbilities = [], savedSignals = [], savedLevelStates = {}, savedScrap = 0) {
        this.abilities = new Set(savedAbilities || []);
        this.completionSignals = new Set(savedSignals || []);
        this.levelStates = savedLevelStates || {};
        this.scrapTotal = savedScrap || 0;
    },
    
    saveLevelState(index, state) {
        this.levelStates[index] = state;
    },
    
    getLevelState(index) {
        return this.levelStates[index] || null;
    },
    
    grantAbility(name) {
        if (this.abilities.has(name)) return false;
        this.abilities.add(name);
        console.log(`[GameProgress] Habilidade desbloqueada: ${name}`);
        
        // Visual/Audio feedback could be triggered here if global window.game exists
        if (window.AudioSys) AudioSys.playPortalClick(); 
        
        return true;
    },
    
    hasAbility(name) {
        return this.abilities.has(name);
    },

    addSignal(channel) {
        this.completionSignals.add(Number(channel));
    },

    removeSignal(channel) {
        this.completionSignals.delete(Number(channel));
    },

    hasSignal(channel) {
        return this.completionSignals.has(Number(channel));
    },

    clear() {
        this.abilities.clear();
        this.completionSignals.clear();
        this.scrapTotal = 0;
    }
};

if (typeof window !== 'undefined') window.GameProgress = GameProgress;
