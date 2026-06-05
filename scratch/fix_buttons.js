const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('components/**/*Client.tsx');
let updatedCount = 0;

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Fix button sizes for Edit/Delete buttons which usually have h-7 w-7 p-0
  if (code.includes('h-7 w-7 p-0')) {
    code = code.replace(/h-7 w-7 p-0/g, 'h-9 w-9 p-1.5 shrink-0');
    changed = true;
  }

  // Also catch h-7 w-7 without p-0 just in case
  if (code.includes('className="h-7 w-7"')) {
    code = code.replace(/className="h-7 w-7"/g, 'className="h-9 w-9 shrink-0"');
    changed = true;
  }

  // Upgrade tiny icons inside these buttons
  if (code.includes('className="h-3.5 w-3.5"')) {
    code = code.replace(/className="h-3.5 w-3.5"/g, 'className="h-4 w-4"');
    changed = true;
  }
  if (code.includes('className="h-3 w-3"')) {
    code = code.replace(/className="h-3 w-3"/g, 'className="h-4 w-4"');
    changed = true;
  }
  if (code.includes('className="h-3.5 w-3.5 text-error"')) {
    code = code.replace(/className="h-3.5 w-3.5 text-error"/g, 'className="h-4 w-4 text-error"');
    changed = true;
  }
  if (code.includes('className="h-3.5 w-3.5 text-danger"')) {
    code = code.replace(/className="h-3.5 w-3.5 text-danger"/g, 'className="h-4 w-4 text-danger"');
    changed = true;
  }

  // Mobile visibility fix for group-hover opacity
  if (code.includes('opacity-0 group-hover:opacity-100')) {
    code = code.replace(/opacity-0 group-hover:opacity-100/g, 'opacity-100 md:opacity-0 md:group-hover:opacity-100');
    changed = true;
  }

  // Ensure button containers don't overflow on small screens by forcing wrapping or using flex shrink
  if (code.includes('<td className="py-2.5 px-3 text-right">')) {
    // If it's a table cell, let's make sure it handles multiple buttons using flex
    code = code.replace(
      /<td className="py-2.5 px-3 text-right">\s*(?:\{[^\}]+\}\s*\(\s*)?<\s*>/g,
      (match) => match.replace('text-right', 'text-right') // Actually, instead of replacing the TD, I'll add flex to the wrapper if needed, but shrink-0 on buttons usually suffices
    );
  }

  if (changed) {
    fs.writeFileSync(file, code);
    updatedCount++;
    console.log('Fixed:', file);
  }
});

console.log('Total files fixed:', updatedCount);
