/// <reference lib="webworker" />
/**
 * Web Worker yang menjalankan Pyodide (CPython di WebAssembly).
 * Semua kode peserta — Python maupun SQL (DuckDB) — dieksekusi di sini,
 * terpisah dari UI sehingga halaman tetap responsif.
 */
import type { PyodideInterface, loadPyodide as LoadPyodideFn } from 'pyodide';
import runtimeSrc from './python/sandbox_runtime.py?raw';
import simulasiSrc from './python/simulasi_llm.py?raw';
import vocabSrc from './python/token_vocab.json?raw';
import type { DatasetRef } from './types';

declare const self: DedicatedWorkerGlobalScope;

type InMessage =
  | { type: 'init'; id: string; indexURL: string; packageBaseUrl: string; interruptBuffer?: Int32Array }
  | { type: 'prepare'; id: string; language: string; packages: string[]; datasets: DatasetRef[]; warmup: string[] }
  | { type: 'run'; id: string; language: string; code: string; datasets: DatasetRef[]; tables: string[] }
  | { type: 'check'; id: string; language: string; checker: string; solution: string; tables: string[] }
  | { type: 'expected'; id: string; language: string; solution: string; datasets: DatasetRef[]; tables: string[] }
  | { type: 'describe'; id: string; datasets: DatasetRef[]; tables: string[] }
  | { type: 'variable'; id: string; name: string }
  | { type: 'loadPackages'; id: string; packages: string[] }
  | { type: 'smoke'; id: string; datasets: DatasetRef[] };

const WORKDIR = '/home/pyodide';
let py: PyodideInterface | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sbx: any = null;
let currentId = '';
const loadedDatasets = new Map<string, string>();

const post = (msg: Record<string, unknown>) => self.postMessage(msg);
const progress = (id: string, msg: string, pct?: number) => post({ type: 'progress', id, msg, pct });

function friendlyPackageName(name: string) {
  const map: Record<string, string> = {
    'scikit-learn': 'scikit-learn (machine learning)',
    scipy: 'SciPy (komputasi ilmiah)',
    pandas: 'pandas (tabel data)',
    numpy: 'NumPy (array angka)',
    matplotlib: 'Matplotlib (grafik)',
    duckdb: 'DuckDB (mesin SQL)',
  };
  return map[name] || name;
}

async function ensureDatasets(id: string, datasets: DatasetRef[]) {
  for (const ds of datasets) {
    if (loadedDatasets.get(ds.name) === ds.url) continue;
    progress(id, `Mengambil dataset ${ds.file}…`);
    const res = await fetch(ds.url);
    if (!res.ok) throw new Error(`Dataset ${ds.file} gagal diunduh (HTTP ${res.status}).`);
    const buf = new Uint8Array(await res.arrayBuffer());
    py!.FS.writeFile(`${WORKDIR}/${ds.file}`, buf);
    sbx.register_dataset(ds.name, ds.file);
    loadedDatasets.set(ds.name, ds.url);
    // Tabel DuckDB yang tersimpan di cache harus dibuat ulang jika dataset berubah
    sbx.reset_sql_cache();
  }
}

async function loadPackages(id: string, packages: string[]) {
  const loaded = new Set(Object.keys(py!.loadedPackages));
  const todo = [...new Set(packages)].filter((p) => p && !loaded.has(p));
  for (let i = 0; i < todo.length; i++) {
    const name = todo[i];
    progress(id, `Memuat pustaka ${friendlyPackageName(name)}…`, Math.round((i / todo.length) * 100));
    await py!.loadPackage(name, {
      messageCallback: () => {},
      errorCallback: (m: string) => console.warn('[pyodide]', m),
    });
  }
}

async function handle(msg: InMessage) {
  const { id } = msg;
  switch (msg.type) {
    case 'init': {
      progress(id, 'Mengunduh mesin Python (WebAssembly)…', 10);
      // Loader diambil dari folder yang sama dengan inti Pyodide → versinya selalu cocok
      const mod = (await import(/* @vite-ignore */ `${msg.indexURL}pyodide.mjs`)) as { loadPyodide: typeof LoadPyodideFn };
      py = await mod.loadPyodide({
        indexURL: msg.indexURL,
        packageBaseUrl: msg.packageBaseUrl,
        env: { HOME: WORKDIR },
        stdout: (s: string) => post({ type: 'stream', id: currentId, kind: 'stdout', text: s + '\n' }),
        stderr: (s: string) => post({ type: 'stream', id: currentId, kind: 'stderr', text: s + '\n' }),
      } as Parameters<typeof LoadPyodideFn>[0]);
      progress(id, 'Menyiapkan lingkungan sandbox…', 80);
      py.FS.mkdirTree(WORKDIR);
      py.FS.writeFile(`${WORKDIR}/sandbox_runtime.py`, runtimeSrc);
      py.FS.writeFile(`${WORKDIR}/simulasi_llm.py`, simulasiSrc);
      py.FS.writeFile(`${WORKDIR}/token_vocab.json`, vocabSrc);
      py.runPython(`import sys\nif '${WORKDIR}' not in sys.path: sys.path.insert(0, '${WORKDIR}')`);
      py.registerJsModule('sbx_js', {
        emit: (kind: string, text: string) => post({ type: 'stream', id: currentId, kind, text }),
      });
      sbx = py.pyimport('sandbox_runtime');
      const info = JSON.parse(sbx.setup('{}'));
      py.runPython('import sbx_js, sandbox_runtime\nsandbox_runtime.set_emitter(sbx_js.emit)');
      let canInterrupt = false;
      if (msg.interruptBuffer) {
        try {
          py.setInterruptBuffer(msg.interruptBuffer);
          canInterrupt = true;
        } catch {
          canInterrupt = false;
        }
      }
      progress(id, 'Python siap.', 100);
      post({ type: 'done', id, result: { python: info.python, canInterrupt, version: py.version } });
      break;
    }
    case 'prepare': {
      await ensureDatasets(id, msg.datasets);
      const pkgs = [...msg.packages];
      if (msg.language === 'sql') pkgs.push('duckdb');
      await loadPackages(id, pkgs);
      if (msg.warmup.length) {
        await py!.loadPackagesFromImports(msg.warmup.join('\n'), { messageCallback: () => {} });
        progress(id, 'Menghangatkan pustaka…');
        sbx.warmup(JSON.stringify(msg.warmup));
      }
      if (msg.language === 'sql') {
        // Buat tabel DuckDB lebih awal supaya Run pertama instan
        sbx.describe_tables(JSON.stringify(msg.datasets.map((d) => d.name)));
      }
      post({ type: 'done', id, result: { loaded: Object.keys(py!.loadedPackages) } });
      break;
    }
    case 'run': {
      await ensureDatasets(id, msg.datasets);
      if (msg.language === 'sql') {
        await loadPackages(id, ['duckdb']);
      } else {
        const before = Object.keys(py!.loadedPackages).length;
        await py!.loadPackagesFromImports(msg.code, {
          messageCallback: (m: string) => {
            if (/^Loading/i.test(m)) progress(id, 'Memuat pustaka yang diimpor…');
          },
        });
        if (Object.keys(py!.loadedPackages).length !== before) progress(id, 'Pustaka siap.');
      }
      currentId = id;
      post({ type: 'started', id });
      const raw =
        msg.language === 'sql' ? sbx.run_sql(msg.code, JSON.stringify(msg.tables)) : sbx.run_python(msg.code);
      currentId = '';
      post({ type: 'done', id, result: JSON.parse(raw) });
      break;
    }
    case 'check': {
      const raw = sbx.run_checker(msg.checker, msg.language, msg.solution, JSON.stringify(msg.tables));
      post({ type: 'done', id, result: JSON.parse(raw) });
      break;
    }
    case 'expected': {
      await ensureDatasets(id, msg.datasets);
      await loadPackages(id, msg.language === 'sql' ? ['duckdb'] : []);
      const raw = sbx.expected_output(msg.language, msg.solution, JSON.stringify(msg.tables));
      post({ type: 'done', id, result: JSON.parse(raw) });
      break;
    }
    case 'describe': {
      await ensureDatasets(id, msg.datasets);
      await loadPackages(id, ['duckdb']);
      post({ type: 'done', id, result: JSON.parse(sbx.describe_tables(JSON.stringify(msg.tables))) });
      break;
    }
    case 'variable': {
      post({ type: 'done', id, result: JSON.parse(sbx.get_variable(msg.name)) });
      break;
    }
    case 'loadPackages': {
      await loadPackages(id, msg.packages);
      post({ type: 'done', id, result: { loaded: Object.keys(py!.loadedPackages) } });
      break;
    }
    case 'smoke': {
      await ensureDatasets(id, msg.datasets);
      const checks: { name: string; ok: boolean; detail: string; ms: number }[] = [];
      const t = (name: string, fn: () => string) => {
        const t0 = performance.now();
        try {
          checks.push({ name, ok: true, detail: fn(), ms: Math.round(performance.now() - t0) });
        } catch (e) {
          checks.push({ name, ok: false, detail: String((e as Error).message || e), ms: Math.round(performance.now() - t0) });
        }
      };
      t('SQL (DuckDB)', () => {
        const r = JSON.parse(sbx.run_sql("SELECT kategori, COUNT(*) AS n FROM penjualan GROUP BY kategori ORDER BY n DESC LIMIT 1", '["penjualan"]'));
        if (!r.ok) throw new Error(r.error?.message || 'gagal');
        return `kategori teramai: ${r.displays[0].rows[0][0]}`;
      });
      t('pandas', () => {
        const r = JSON.parse(sbx.run_python("import pandas as pd\ndf = pd.read_csv('properti.csv')\ndf.shape"));
        if (!r.ok) throw new Error(r.error?.message || 'gagal');
        return `properti.csv terbaca (${r.variables.find((v: { name: string }) => v.name === 'df')?.summary ?? ''})`;
      });
      t('matplotlib', () => {
        const r = JSON.parse(sbx.run_python('import matplotlib.pyplot as plt\nplt.plot([1, 3, 2])\nplt.title("uji")'));
        if (!r.ok || !r.figures.length) throw new Error(r.error?.message || 'grafik tidak terbentuk');
        return 'grafik berhasil dibuat';
      });
      t('scikit-learn', () => {
        const r = JSON.parse(
          sbx.run_python('from sklearn.linear_model import LinearRegression\nm = LinearRegression().fit([[1],[2],[3]], [2,4,6])\nround(float(m.coef_[0]), 2)'),
        );
        if (!r.ok) throw new Error(r.error?.message || 'gagal');
        return 'model berhasil dilatih';
      });
      post({ type: 'done', id, result: { checks } });
      break;
    }
  }
}

let queue: Promise<void> = Promise.resolve();
self.onmessage = (e: MessageEvent<InMessage>) => {
  const msg = e.data;
  queue = queue.then(async () => {
    try {
      await handle(msg);
    } catch (err) {
      currentId = '';
      const message = err instanceof Error ? err.message : String(err);
      post({ type: 'error', id: msg.id, error: message });
    }
  });
};
