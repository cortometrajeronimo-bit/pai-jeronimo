const fs = require('fs');
const glob = require('glob');

const files = glob.sync('components/**/*.tsx');
let updated = 0;

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace `const Icon = meta.icon;` with `const Icon = meta?.icon || AlertTriangle;`
  // Make sure AlertTriangle is imported if used.
  if (code.includes('const Icon = meta.icon;')) {
    code = code.replace(/const Icon = meta\.icon;/g, 'const Icon = meta?.icon || (typeof AlertTriangle !== "undefined" ? AlertTriangle : "svg");');
    changed = true;
  }

  if (code.includes('const Icon = g.icon;')) {
    code = code.replace(/const Icon = g\.icon;/g, 'const Icon = g?.icon || (typeof AlertTriangle !== "undefined" ? AlertTriangle : "svg");');
    changed = true;
  }

  // Find any destructuring of icon from potentially undefined things
  // {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
  // If the item itself is undefined, this throws.
  // We can change it to: {NAV_ITEMS.map((item) => { const Icon = item?.icon; ...
  // Actually, NAV_ITEMS can't have undefined elements.

  if (changed) {
    fs.writeFileSync(file, code);
    updated++;
    console.log('Fixed icon access in', file);
  }
});

console.log('Total files fixed:', updated);
