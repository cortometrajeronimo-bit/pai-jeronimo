const fs = require('fs');
const glob = require('glob');

const files = glob.sync('components/**/*.tsx');
let updated = 0;

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  let changed = false;

  const badFallback = '\\(\\(props: any\\) => <svg \\{\\.\\.\\.props\\} />\\)';
  const goodFallback = '((props: React.SVGProps<SVGSVGElement>) => <svg {...props} />)';

  if (code.match(new RegExp(badFallback))) {
    code = code.replace(new RegExp(badFallback, 'g'), goodFallback);
    // ensure React is imported if needed, but Next.js 14 doesn't need React import for JSX, though for types we might need to use `import type * as React from "react";` or we can just use `React.SVGProps`. Since it's a global `React` type in TS, it works.
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, code);
    updated++;
    console.log('Fixed ESLint error in', file);
  }
});

console.log('Total files fixed:', updated);
