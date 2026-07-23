import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const regex = /(from\s+['"])(\.[^'"]*)(['"])/g;
    content = content.replace(regex, (match, p1, p2, p3) => {
        if (!p2.endsWith('.js') && !p2.endsWith('.json')) {
            return `${p1}${p2}.js${p3}`;
        }
        return match;
    });
    fs.writeFileSync(file, content, 'utf8');
});
console.log('Fixed imports!');
