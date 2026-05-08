const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
    // CORS for external tools if needed
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Handle Level Saving
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
                        });
                    }
                }
                
                let jsContent = "// Levels definition\nvar LEVELS = [\n";
                data.levels.forEach((l, i) => {
                    jsContent += `  {\n`;
                    jsContent += `    name: ${JSON.stringify(l.name)},\n`;
                    if (l.timer !== undefined && l.timer > 0) jsContent += `    timer: ${l.timer},\n`;
                    jsContent += `    map: [\n`;
                    l.map.forEach(row => jsContent += `      ${JSON.stringify(row)},\n`);
                    jsContent += `    ]`;
                    
                    if (l.blocks && l.blocks.some(row => row.trim() !== "")) {
                        jsContent += `,\n    blocks: [\n`;
                        l.blocks.forEach(row => jsContent += `      ${JSON.stringify(row)},\n`);
                        jsContent += `    ]`;
                    }

                    if (l.overlays && l.overlays.some(row => row.trim() !== "")) {
                        jsContent += `,\n    overlays: [\n`;
                        l.overlays.forEach(row => jsContent += `      ${JSON.stringify(row)},\n`);
                        jsContent += `    ]`;
                    }

                    if (l.wireMap && l.wireMap.some(row => row.trim() !== "")) {
                        jsContent += `,\n    wireMap: [\n`;
                        l.wireMap.forEach(row => jsContent += `      ${JSON.stringify(row)},\n`);
                        jsContent += `    ]`;
                    }
                    
                    if (l.links) jsContent += `,\n    links: ${JSON.stringify(l.links)}`;
                    if (l.dialogues) jsContent += `,\n    dialogues: ${JSON.stringify(l.dialogues)}`;
                    if (l.zoneTriggers) jsContent += `,\n    zoneTriggers: ${JSON.stringify(l.zoneTriggers)}`;
                    if (l.startWithBlackout) jsContent += `,\n    startWithBlackout: true`;
                    if (l.spawnIsStation) jsContent += `,\n    spawnIsStation: true`;
                    
                    jsContent += `\n  }${i < data.levels.length - 1 ? ',' : ''}\n`;
                });
                jsContent += "];\n\n";
                
                if (data.chapters) {
                    jsContent += "var CHAPTERS = " + JSON.stringify(data.chapters, null, 2) + ";\n";
                }

                fs.writeFileSync(filePath, jsContent);
                console.log(`[Editor] Levels salvos com sucesso.`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch (err) {
                console.error('[Editor] Erro ao salvar:', err);
                res.writeHead(500);
                res.end(JSON.stringify({ status: 'error', message: err.message }));
            }
        });
        return;
    }

    // Static File Serving
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';
    if (filePath.startsWith('./favicon.ico')) {
        res.writeHead(204);
        res.end();
        return;
    }

    // Strip query string for extension matching (e.g., file.json?v=123 -> file.json)
    const cleanPath = filePath.split('?')[0];
    const extname = String(path.extname(cleanPath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    console.log(`[Server] GET: ${filePath} (${contentType})`);

    fs.readFile(cleanPath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 CIRCUIT BREAKER - Dev Server`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`💾 Auto-save ativo em levels.js\n`);
});
