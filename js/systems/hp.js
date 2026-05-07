// Circuit Breaker - HP System (Zelda-style)
// 3 hearts starting, each with 4 quarters (12 HP total)

const HPSystem = {
    maxHearts: 3,
    currentQuarters: 12,
    
    init(savedHP = null, savedMax = null) {
        if (savedMax) this.maxHearts = savedMax;
        if (savedHP !== null) this.currentQuarters = savedHP;
        else this.currentQuarters = this.maxHearts * 4;
    },

    get quartersPerHeart() { return 4; },
    get totalMaxQuarters() { return this.maxHearts * this.quartersPerHeart; },
    
    getHeartStates() {
        const hearts = [];
        let remaining = this.currentQuarters;
        for (let i = 0; i < this.maxHearts; i++) {
            const fill = Math.min(4, Math.max(0, remaining));
            hearts.push({ fill, isBroken: false });
            remaining -= 4;
        }
        return hearts;
    },
    
    /**
     * @param {number} quarters - Amount of damage in quarters
     * @returns {boolean} - True if dead (HP <= 0)
     */
    takeDamage(quarters) {
        this.currentQuarters = Math.max(0, this.currentQuarters - quarters);
        return this.currentQuarters <= 0;
    },
    
    /**
     * @param {number} quarters - Amount to heal in quarters
     */
    heal(quarters) {
        this.currentQuarters = Math.min(this.totalMaxQuarters, this.currentQuarters + quarters);
        if (window.AudioSys) AudioSys.speak('heal');
    },
    
    fullHeal() {
        this.currentQuarters = this.totalMaxQuarters;
        if (window.AudioSys) AudioSys.speak('heal');
    },
    
    addHeartContainer() {
        this.maxHearts++;
        this.currentQuarters += this.quartersPerHeart;
    },
    
    isDead() {
        return this.currentQuarters <= 0;
    }
};

if (typeof window !== 'undefined') window.HPSystem = HPSystem;
