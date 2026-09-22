const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const filesToUpdate = execSync('git grep -l "localStorage.*Item(\'token\'" frontend/src', { encoding: 'utf8' })
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

for (const file of filesToUpdate) {
    let content = fs.readFileSync(file, 'utf8');

    // Calculate relative path to tokenService
    const dir = path.dirname(file);
    let relativePath = path.relative(dir, 'frontend/src/services/tokenService');
    relativePath = relativePath.replace(/\\/g, '/'); // Windows path to posix
    if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
    }

    // Add import statement
    if (!content.includes('import {') || !content.includes('tokenService')) {
        let importStatement = `import { setToken, getToken, removeToken } from '${relativePath}';\n`;
        // Insert after the last import statement or at the top
        const lastImportIndex = content.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
            const nextLineIndex = content.indexOf('\n', lastImportIndex);
            content = content.slice(0, nextLineIndex + 1) + importStatement + content.slice(nextLineIndex + 1);
        } else {
            content = importStatement + content;
        }
    }

    // Replace usages
    content = content.replace(/localStorage\.setItem\('token',\s*(.+?)\)/g, 'setToken($1)');
    content = content.replace(/localStorage\.getItem\('token'\)/g, 'getToken()');
    content = content.replace(/localStorage\.removeItem\('token'\)/g, 'removeToken()');
    
    // Also userToken just in case ReviewModal has it: localStorage.getItem('userToken') -> getToken()
    // In ReviewModal: localStorage.getItem('token') || localStorage.getItem('userToken')
    // Let's manually replace `|| localStorage.getItem('userToken')` with empty since userToken isn't stored elsewhere anyway.
    content = content.replace(/ \|\| localStorage\.getItem\('userToken'\)/g, '');

    fs.writeFileSync(file, content);
    console.log('Updated', file);
}
