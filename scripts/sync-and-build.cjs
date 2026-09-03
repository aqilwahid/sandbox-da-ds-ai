const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = path.resolve(__dirname, '..');
const SCRATCH_DIR = 'C:\\Users\\HYPE R Series\\.gemini\\antigravity-ide\\brain\\bf513ea1-0ea8-42e1-9e8a-6ae8c4cfaa0a\\scratch';

console.log('🔄 Menyinkronkan file proyek ke scratch build directory...');

const itemsToCopy = [
  'src',
  'content',
  'public',
  'scripts',
  'index.html',
  'vite.config.ts',
  'tailwind.config.cjs',
  'postcss.config.cjs',
  'tsconfig.json',
  'package.json',
];

for (const item of itemsToCopy) {
  const srcPath = path.join(PROJECT_DIR, item);
  const dstPath = path.join(SCRATCH_DIR, item);
  if (fs.existsSync(srcPath)) {
    fs.cpSync(srcPath, dstPath, { recursive: true, force: true });
    console.log(`  ✓ ${item}`);
  }
}

console.log('\n🚀 Menjalankan build produksi (tsc + vite build)...');
execSync('npm run build', {
  cwd: SCRATCH_DIR,
  stdio: 'inherit',
  shell: true,
});

console.log('\n📦 Menyalin dist/ kembali ke direktori proyek...');
const scratchDist = path.join(SCRATCH_DIR, 'dist');
const projectDist = path.join(PROJECT_DIR, 'dist');

if (fs.existsSync(scratchDist)) {
  fs.cpSync(scratchDist, projectDist, { recursive: true, force: true });
  console.log('✅ Folder dist/ berhasil diperbarui dan siap di-serve!');
}
