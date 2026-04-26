const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const LEVELS_FILE = path.join(__dirname, 'js', 'levels.js');

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/save') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                // 1. Create Backup
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupPath = path.join(__dirname, 'js', `levels_backup_${timestamp}.js`);
                if (fs.existsSync(LEVELS_FILE)) {
                    fs.copyFileSync(LEVELS_FILE, backupPath);
                }

                // 2. Format JS file content
                const jsContent = formatLevelsJS(data.levels, data.chapters);
                
                // 3. Write to file
                fs.writeFileSync(LEVELS_FILE, jsContent, 'utf8');

                console.log(`[${new Date().toLocaleTimeString()}] Níveis salvos com sucesso. Backup criado.`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok', message: 'Salvo com sucesso' }));
            } catch (err) {
                console.error('Erro ao salvar:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: err.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

function formatLevelsJS(levels, chapters) {
    let out = `/**\n * CIRCUIT BREAKER - Database de Níveis\n * Gerado automaticamente pelo Editor em ${new Date().toLocaleString()}\n */\n\n`;
    
    out += `const LEVELS = [\n`;
    levels.forEach((lvl, i) => {
        out += `    {\n`;
        out += `        name: "${lvl.name}",\n`;
        out += `        time: ${lvl.time},\n`;
        out += `        timer: ${lvl.timer || 60},\n`;
        out += `        map: [\n`;
        lvl.map.forEach(row => out += `            "${row}",\n`);
        out += `        ],\n`;
        
        if (lvl.blocks) {
            out += `        blocks: [\n`;
            lvl.blocks.forEach(row => out += `            "${row}",\n`);
            out += `        ],\n`;
        }

        if (lvl.overlays) {
            out += `        overlays: [\n`;
            lvl.overlays.forEach(row => out += `            "${row}",\n`);
            out += `        ],\n`;
        }

        if (lvl.links) {
            out += `        links: ${JSON.stringify(lvl.links, null, 12).replace(/}$/, '        }')},\n`;
        }

        out += `    }${i < levels.length - 1 ? ',' : ''}\n`;
    });
    out += `];\n\n`;

    out += `const CHAPTERS = [\n`;
    chapters.forEach((chap, i) => {
        out += `    {\n`;
        out += `        name: "${chap.name}",\n`;
        out += `        levels: [${chap.levels.join(', ')}],\n`;
        out += `        map: [\n`;
        chap.map.forEach(node => {
            out += `            { lvlIdx: ${node.lvlIdx}, x: ${node.x}, y: ${node.y} },\n`;
        });
        out += `        ]\n`;
        out += `    }${i < chapters.length - 1 ? ',' : ''}\n`;
    });
    out += `];\n\n`;

    out += `// Export for Node environments if needed\nif (typeof module !== 'undefined') module.exports = { LEVELS, CHAPTERS };\n`;
    
    return out;
}

server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`CIRCUIT BREAKER - Servidor do Editor`);
    console.log(`Rodando em: http://localhost:${PORT}`);
    console.log(`========================================\n`);
});
