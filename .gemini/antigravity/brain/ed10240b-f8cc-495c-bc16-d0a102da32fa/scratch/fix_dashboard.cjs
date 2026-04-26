const fs = require('fs');
const path = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetRegex = /\{activeTab === 'network' && \(\s+<BranchesTab \/>\s+\)\}/;

if (targetRegex.test(content)) {
    const match = content.match(targetRegex)[0];
    const replacement = match + `\n\n            {activeTab === 'audit' && (\n              <AuditTab />\n            )}`;
    content = content.replace(targetRegex, replacement);
    fs.writeFileSync(path, content);
    console.log('Success (Regex)');
} else {
    console.log('Target not found with Regex');
}
