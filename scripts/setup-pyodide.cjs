const fs = require('fs');
const path = require('path');

const SCRATCH_PYODIDE = 'C:\\Users\\HYPE R Series\\.gemini\\antigravity-ide\\brain\\bf513ea1-0ea8-42e1-9e8a-6ae8c4cfaa0a\\scratch\\node_modules\\pyodide';
const PUBLIC_PYODIDE = path.resolve(__dirname, '..', 'public', 'pyodide');
const PUBLIC_DATASETS = path.resolve(__dirname, '..', 'public', 'datasets');

if (!fs.existsSync(PUBLIC_PYODIDE)) {
  fs.mkdirSync(PUBLIC_PYODIDE, { recursive: true });
}

if (!fs.existsSync(PUBLIC_DATASETS)) {
  fs.mkdirSync(PUBLIC_DATASETS, { recursive: true });
}

console.log('📦 Menyalin file core Pyodide ke public/pyodide ...');
const filesToCopy = [
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
];

for (const file of filesToCopy) {
  const src = path.join(SCRATCH_PYODIDE, file);
  const dst = path.join(PUBLIC_PYODIDE, file);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dst, { force: true });
    const stat = fs.statSync(dst);
    console.log(`  ✓ ${file} (${Math.round(stat.size / 1024)} KB)`);
  } else {
    console.warn(`  ⚠️ ${file} tidak ditemukan di ${src}`);
  }
}

console.log('✅ Pyodide core assets siap di-host secara lokal.');
