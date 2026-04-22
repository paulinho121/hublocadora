import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.match(/\bitalic\b/)) {
        let newContent = content.replace(/(?:\s+italic\b)|(?:\bitalic\s+)/g, '');
        // Fallback for just 'italic'
        newContent = newContent.replace(/\bitalic\b/g, '');
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Done removing italic!');
