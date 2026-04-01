const fs = require('fs');
const path = require('path');

// Find all tsx files recursively
function findTsx(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory() && f !== 'node_modules' && f !== '.git') {
      results = results.concat(findTsx(full));
    } else if (f.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

const files = findTsx('.');
let totalFixes = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  
  // Fix 1: "> Observations:" and "> Reasoning:" as JSX text (in AnalysisResults.tsx)
  // Pattern: </p>>  where the second > is text content 
  content = content.replace(/(<\/p>)> Observations:/g, '$1&gt; Observations:');
  content = content.replace(/(<\/p>)> Reasoning:/g, '$1&gt; Reasoning:');
  
  // Fix 2: (>32k tokens) in PresentationSlides.tsx  
  content = content.replace(/\(>32k tokens\)/g, '(&gt;32k tokens)');
  
  // Fix 3: More general - look for closing tag > followed by > as text
  // This pattern: "font-bold">>{space} which is a closing tag > followed by literal > text
  content = content.replace(/(font-bold">)> /g, '$1&gt; ');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed: ${file}`);
    totalFixes++;
  }
}

console.log(`Total files fixed: ${totalFixes}`);
