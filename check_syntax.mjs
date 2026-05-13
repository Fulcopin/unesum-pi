import { readFileSync } from 'fs';
const code = readFileSync('app/dashboard/admin/editor-syllabus/page.tsx', 'utf8');
const lines = code.split('\n');
let depth = 0;
for(let i=0; i<lines.length; i++) {
  for(const ch of lines[i]) {
    if(ch==='{') depth++;
    else if(ch==='}') depth--;
  }
  if(depth < 1 && i > 50) {
    console.log('Depth went to', depth, 'at line', i+1, ':', lines[i].trim().substring(0,100));
  }
}
console.log('Final depth:', depth, '(should be 0 if outer brace of component closed)');
console.log('Total lines:', lines.length);
