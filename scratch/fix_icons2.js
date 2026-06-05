const fs = require('fs');
const glob = require('glob');

const files = glob.sync('components/**/*.tsx');
let updated = 0;

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  let changed = false;

  const fallback = '((props: any) => <svg {...props} />)';

  if (code.includes('AlertTriangle : "svg"')) {
    code = code.replace(/\(typeof AlertTriangle !== "undefined" \? AlertTriangle : "svg"\)/g, fallback);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, code);
    updated++;
    console.log('Fixed TypeScript error in', file);
  }
});

console.log('Total files fixed:', updated);
