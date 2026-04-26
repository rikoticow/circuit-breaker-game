/**
 * CIRCUIT BREAKER - Database de Níveis
 * Gerado automaticamente pelo Editor em 26/04/2026, 15:45:00
 */

const LEVELS = [
    {
        name: "CONEXÃO INICIAL",
        time: 30,
        timer: 60,
        map: [
            "####################",
            "#                  #",
            "#   @              #",
            "#                  #",
            "#                  #",
            "#                  #",
            "#                  #",
            "#                  #",
            "#                  #",
            "#                  #",
            "#                  #",
            "#                  #",
            "#                  #",
            "#                  #",
            "####################",
        ],
        blocks: [
            "                    ",
            "                    ",
            "                    ",
            "      >             ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
        ],
        overlays: [
            "                    ",
            "                    ",
            "    B H H H H H T   ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
            "                    ",
        ]
    }
];

const CHAPTERS = [
    {
        name: "SETOR DE MONTAGEM",
        levels: [0],
        map: [
            { lvlIdx: 0, x: 100, y: 100 },
        ]
    }
];

// Export for Node environments if needed
if (typeof module !== 'undefined') module.exports = { LEVELS, CHAPTERS };
