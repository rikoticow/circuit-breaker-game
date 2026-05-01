const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/save') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const jsDir = path.join(__dirname, 'js');
                const filePath = path.join(jsDir, 'levels.js');
                const backupDir = path.join(__dirname, 'levels_backup');

                // 1. Create Backup
                if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
                if (fs.existsSync(filePath)) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const backupPath = path.join(backupDir, `levels_backup_${timestamp}.js`);
                    fs.copyFileSync(filePath, backupPath);
                    console.log(`[Backup] Criado: ${backupPath}`);

                    // 2. Rotate Backups (Max 15)
                    const backups = fs.readdirSync(backupDir)
                        .filter(f => f.startsWith('levels_backup_'))
                        .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
                        .sort((a, b) => a.time - b.time);

                    if (backups.length > 15) {
                        const toRemove = backups.slice(0, backups.length - 15);
                        toRemove.forEach(f => {
                            fs.unlinkSync(path.join(backupDir, f.name));
                            console.log(`[Backup] Removido antigo: ${f.name}`);
                        });
                    }
                }
                
                let jsContent = "// Levels definition\nvar LEVELS = [\n";
                data.levels.forEach((l, i) => {
                    jsContent += `  {\n    name: "${l.name}",\n    time: ${l.time},\n    timer: ${l.timer || 60},\n    map: [\n`;
                    l.map.forEach(row => jsContent += `      "${row}",\n`);
                    jsContent += `    ]`;
                    
                    // Only save blocks layer if it exists and is not just empty space
                    if (l.blocks && l.blocks.some(row => row.trim() !== "")) {
                        jsContent += `,\n    blocks: [\n`;
                        l.blocks.forEach(row => jsContent += `      "${row}",\n`);
                        jsContent += `    ]`;
                    }

                    // Only save overlays layer if it exists and is not just empty space
                    if (l.overlays && l.overlays.some(row => row.trim() !== "")) {
                        jsContent += `,\n    overlays: [\n`;
                        l.overlays.forEach(row => jsContent += `      "${row}",\n`);
                        jsContent += `    ]`;
                    }
                    
                    if (l.links) {
                        jsContent += `,\n    links: ${JSON.stringify(l.links)}`;
                    }
                    
                    // Save dialogues if they exist
                    if (l.dialogues) {
                        jsContent += `,\n    dialogues: ${JSON.stringify(l.dialogues)}`;
                    }

                    // Save zoneTriggers if they exist
                    if (l.zoneTriggers && l.zoneTriggers.length > 0) {
                        jsContent += `,\n    zoneTriggers: ${JSON.stringify(l.zoneTriggers)}`;
                    }

                    // Save blackout settings
                    if (l.startWithBlackout) {
                        jsContent += `,\n    startWithBlackout: true`;
                    }
                    
                    jsContent += `\n  }${i < data.levels.length - 1 ? ',' : ''}\n`;
                });
                jsContent += "];\n\n";
                
                // 3. Save Chapters
                if (data.chapters) {
                    jsContent += "var CHAPTERS = " + JSON.stringify(data.chapters, null, 2) + ";\n";
                }

                fs.writeFileSync(filePath, jsContent);
                console.log(`[Editor] Levels salvos com sucesso em ${filePath}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch (err) {
                console.error('[Editor] Erro ao salvar:', err);
                res.writeHead(500);
                res.end(JSON.stringify({ status: 'error', message: err.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor do Editor rodando em http://localhost:${PORT}`);
    console.log(`Pronto para salvar automaticamente em levels.js`);
});
