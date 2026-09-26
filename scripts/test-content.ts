/**
 * Uji otomatis semua latihan dengan runtime Python yang SAMA dengan di browser.
 *
 *   npm run test:content                  # semua latihan
 *   npm run test:content -- da-03         # hanya latihan yang id-nya mengandung "da-03"
 *   npm run test:content -- --verbose     # tampilkan detail penilaian
 *
 * Untuk setiap latihan dipastikan:
 *   1. Kode SOLUSI berjalan tanpa error dan LULUS checker.
 *   2. Kode STARTER tidak langsung lulus (peserta memang harus mengerjakan sesuatu).
 *
 * Paket Pyodide diambil dari folder lokal (PYODIDE_PACKAGES, atau public/pyodide jika sudah
 * menjalankan `npm run setup:offline`); jika tidak ada, diunduh otomatis dari CDN dan di-cache.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { DATASET_DIR, ROOT, loadContent } from './lib/content-files';
import type { Exercise } from '../src/content/types';

const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const filters = args.filter((a) => !a.startsWith('-'));

function pickPackageDir(): { cacheDir: string; note: string } {
  const env = process.env.PYODIDE_PACKAGES;
  if (env && fs.existsSync(env)) return { cacheDir: path.resolve(env), note: `lokal (${env})` };
  const pub = path.join(ROOT, 'public', 'pyodide');
  if (fs.existsSync(path.join(pub, 'offline-manifest.json'))) return { cacheDir: pub, note: 'lokal (public/pyodide)' };
  const cache = path.join(ROOT, 'node_modules', '.cache', 'pyodide-packages');
  fs.mkdirSync(cache, { recursive: true });
  return { cacheDir: cache, note: 'CDN + cache (node_modules/.cache/pyodide-packages)' };
}

type Json = Record<string, any>;

async function main() {
  const { exercises, datasets, parseErrors } = loadContent();
  if (parseErrors.length) {
    parseErrors.forEach((e) => console.error(`❌ ${e.file}: ${e.message}`));
    process.exit(1);
  }
  const selected = filters.length
    ? exercises.filter((ex) => filters.some((f) => ex.id.includes(f) || ex.track === f))
    : exercises;
  if (!selected.length) {
    console.error('Tidak ada latihan yang cocok dengan filter:', filters.join(', '));
    process.exit(1);
  }

  const { cacheDir, note } = pickPackageDir();
  console.log(`🐍 Memuat Pyodide (paket: ${note}) ...`);
  const t0 = Date.now();
  const py: PyodideInterface = await loadPyodide({ packageCacheDir: cacheDir });
  console.log(`   Pyodide ${py.version} siap dalam ${((Date.now() - t0) / 1000).toFixed(1)} dtk`);

  const rtDir = path.join(ROOT, 'src', 'runtime', 'python');
  py.FS.mkdirTree('/home/pyodide');
  for (const f of ['sandbox_runtime.py', 'simulasi_llm.py', 'token_vocab.json']) {
    py.FS.writeFile(`/home/pyodide/${f}`, fs.readFileSync(path.join(rtDir, f), 'utf-8'));
  }
  py.runPython("import sys\nif '/home/pyodide' not in sys.path: sys.path.insert(0, '/home/pyodide')");
  const sbx = py.pyimport('sandbox_runtime');
  sbx.setup('{}');

  for (const [name, info] of Object.entries(datasets)) {
    const p = path.join(DATASET_DIR, info.file);
    if (fs.existsSync(p)) {
      py.FS.writeFile(`/home/pyodide/${info.file}`, fs.readFileSync(p));
      sbx.register_dataset(name, info.file);
    }
  }

  const results: { ex: Exercise; ok: boolean; notes: string[]; ms: number }[] = [];
  for (const ex of selected) {
    const notes: string[] = [];
    const started = Date.now();
    let ok = true;
    const tables = JSON.stringify(ex.frontmatter.datasets);
    try {
      const pkgs = [...ex.frontmatter.packages];
      if (ex.language === 'sql') pkgs.push('duckdb');
      if (pkgs.length) await py.loadPackage(pkgs, { messageCallback: () => {} });
      await py.loadPackagesFromImports(
        [ex.sections.starter, ex.sections.solusi, ex.sections.checker].join('\n'),
        { messageCallback: () => {} },
      );
      sbx.warmup(JSON.stringify([ex.sections.solusi]));

      const run = (code: string): Json =>
        JSON.parse(ex.language === 'sql' ? sbx.run_sql(code, tables) : sbx.run_python(code));
      const check = (): Json =>
        JSON.parse(sbx.run_checker(ex.sections.checker, ex.language, ex.sections.solusi, tables));

      // 1) Solusi harus lulus
      sbx.clear_solution_cache();
      const solRun = run(ex.sections.solusi);
      if (!solRun.ok) {
        ok = false;
        notes.push(`SOLUSI error: ${solRun.error?.type}: ${solRun.error?.message} (baris ${solRun.error?.line})`);
      } else {
        const solCheck = check();
        if (!solCheck.passed) {
          ok = false;
          const failed = (solCheck.tests || []).filter((t: Json) => !t.passed);
          notes.push(`SOLUSI tidak lulus checker: ${solCheck.message}`);
          failed.forEach((t: Json) => notes.push(`   ✗ ${t.label}${t.detail ? ' — ' + t.detail : ''}`));
          if (solCheck.internalError) notes.push(`   internal: ${solCheck.internalError}`);
        } else if (verbose) {
          (solCheck.tests || []).forEach((t: Json) => notes.push(`   ✓ ${t.label}`));
        }
        const nDisp = (solRun.displays || []).length;
        const nFig = (solRun.figures || []).length;
        if (verbose) notes.push(`   tampilan: ${nDisp} tabel/teks, ${nFig} grafik, ${solRun.durationMs} ms`);
      }

      // 2) Starter tidak boleh langsung lulus
      const stRun = run(ex.sections.starter);
      if (stRun.ok) {
        const stCheck = check();
        if (stCheck.passed) {
          ok = false;
          notes.push('STARTER langsung lulus — checker terlalu longgar atau starter sudah berisi jawaban.');
        } else if (verbose) {
          notes.push(`   starter: ${stCheck.passedCount}/${stCheck.totalCount} kriteria (${stCheck.message})`);
        }
      } else if (verbose) {
        notes.push(`   starter error (wajar): ${stRun.error?.type}: ${stRun.error?.message}`);
      }
    } catch (e) {
      ok = false;
      notes.push(`EXCEPTION: ${(e as Error).message}`);
    }
    results.push({ ex, ok, notes, ms: Date.now() - started });
    const icon = ok ? '✅' : '❌';
    console.log(`${icon} ${ex.id.padEnd(34)} ${String(Date.now() - started).padStart(6)} ms`);
    if (!ok || verbose) notes.forEach((n) => console.log(`     ${n}`));
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} latihan lulus uji.`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
