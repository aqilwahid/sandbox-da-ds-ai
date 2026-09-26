#!/usr/bin/env node
/**
 * Menyiapkan file Pyodide (Python di WebAssembly) di public/pyodide/.
 *
 *   node scripts/setup-pyodide.mjs              Salin inti Pyodide dari node_modules (otomatis saat `npm install`).
 *   node scripts/setup-pyodide.mjs --offline    + unduh semua paket Python yang dipakai latihan (±60 MB)
 *                                               → kelas bisa berjalan TANPA internet (server lokal/LAN).
 *   node scripts/setup-pyodide.mjs --clean      Hapus paket offline (kembali memakai CDN).
 *
 * Opsi tambahan untuk --offline:
 *   --mirror <url>    Sumber paket (default: CDN jsDelivr resmi Pyodide).
 *   --from <folder>   Salin paket dari folder hasil ekstrak pyodide-<versi>.tar.bz2 (tanpa internet),
 *                     diunduh dari https://github.com/pyodide/pyodide/releases
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'node_modules', 'pyodide');
const OUT = path.join(ROOT, 'public', 'pyodide');
const CORE = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
// Paket yang dipakai latihan (dependensinya ikut dihitung otomatis dari pyodide-lock.json)
const PACKAGES = ['duckdb', 'pandas', 'matplotlib', 'scikit-learn', 'scipy', 'statsmodels'];

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const opt = (f) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};

function log(msg) {
  process.stdout.write(msg + '\n');
}

function copyCore() {
  if (!fs.existsSync(SRC)) {
    log('⚠️  node_modules/pyodide belum ada. Jalankan `npm install` terlebih dahulu.');
    process.exit(0);
  }
  const version = JSON.parse(fs.readFileSync(path.join(SRC, 'package.json'), 'utf-8')).version;
  fs.mkdirSync(OUT, { recursive: true });
  let copied = 0;
  for (const f of CORE) {
    const from = path.join(SRC, f);
    const to = path.join(OUT, f);
    if (!fs.existsSync(from)) {
      log(`⚠️  ${f} tidak ditemukan di paket pyodide`);
      continue;
    }
    const same = fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size;
    if (!same) {
      fs.copyFileSync(from, to);
      copied++;
    }
  }
  log(`🐍 Pyodide ${version}: inti siap di public/pyodide (${copied} file diperbarui).`);
  return version;
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function resolveClosure(lock, names) {
  const out = new Set();
  const visit = (n) => {
    const key = n.toLowerCase();
    const pkg = lock.packages[key];
    if (!pkg) {
      log(`⚠️  Paket "${n}" tidak ada di pyodide-lock.json`);
      return;
    }
    if (out.has(key)) return;
    out.add(key);
    (pkg.depends || []).forEach(visit);
  };
  names.forEach(visit);
  return [...out].sort();
}

async function fetchWithRetry(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr;
}

async function offline(version) {
  const lock = JSON.parse(fs.readFileSync(path.join(OUT, 'pyodide-lock.json'), 'utf-8'));
  const names = resolveClosure(lock, PACKAGES);
  const from = opt('--from');
  const mirror = (opt('--mirror') || `https://cdn.jsdelivr.net/pyodide/v${version}/full/`).replace(/\/?$/, '/');
  log(`📦 Menyiapkan ${names.length} paket untuk mode offline (${from ? `dari folder ${from}` : `dari ${mirror}`}) …`);
  let total = 0;
  let done = 0;
  const failed = [];
  const queue = [...names];
  const worker = async () => {
    while (queue.length) {
      const name = queue.shift();
      const pkg = lock.packages[name];
      const dest = path.join(OUT, pkg.file_name);
      try {
        if (fs.existsSync(dest) && sha256(fs.readFileSync(dest)) === pkg.sha256) {
          total += fs.statSync(dest).size;
          done++;
          continue;
        }
        const buf = from ? fs.readFileSync(path.join(from, pkg.file_name)) : await fetchWithRetry(mirror + pkg.file_name);
        if (sha256(buf) !== pkg.sha256) throw new Error('checksum tidak cocok');
        fs.writeFileSync(dest, buf);
        total += buf.length;
        done++;
        log(`  ✓ ${pkg.file_name} (${(buf.length / 1048576).toFixed(1)} MB) [${done}/${names.length}]`);
      } catch (e) {
        failed.push(`${name}: ${e.message}`);
        log(`  ✗ ${name}: ${e.message}`);
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  if (failed.length) {
    log(`\n❌ ${failed.length} paket gagal. Periksa koneksi lalu jalankan ulang (paket yang sudah ada tidak diunduh lagi).`);
    process.exit(1);
  }
  const manifest = {
    version,
    createdAt: new Date().toISOString(),
    packages: names,
    files: names.map((n) => lock.packages[n].file_name),
    totalBytes: total,
  };
  fs.writeFileSync(path.join(OUT, 'offline-manifest.json'), JSON.stringify(manifest, null, 2));
  log(`\n✅ Mode offline siap: ${names.length} paket, ${(total / 1048576).toFixed(1)} MB di public/pyodide.`);
  log('   Aplikasi otomatis memakai paket lokal ini. Jalankan `npm run build && npm run serve:lan` untuk kelas via LAN.');
}

function clean() {
  if (!fs.existsSync(OUT)) return;
  let n = 0;
  for (const f of fs.readdirSync(OUT)) {
    if (f.endsWith('.whl') || f.endsWith('.zip') && f !== 'python_stdlib.zip' || f === 'offline-manifest.json' || f.endsWith('.metadata')) {
      fs.rmSync(path.join(OUT, f));
      n++;
    }
  }
  log(`🧹 ${n} file paket offline dihapus. Aplikasi akan memakai CDN.`);
}

const version = copyCore();
if (has('--clean')) clean();
else if (has('--offline')) await offline(version);
