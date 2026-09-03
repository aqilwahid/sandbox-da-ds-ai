// Dedicated Web Worker for Pyodide (Python Data Science Runtime)
import type { RunArtifact } from '../types';

interface WorkerMessageIn {
  id: string;
  type: 'INIT' | 'PRELOAD' | 'RUN' | 'RUN_CHECKER' | 'RESET';
  code?: string;
  checkerCode?: string;
  packages?: string[];
}

interface WorkerMessageOut {
  id: string;
  type: 'INIT_DONE' | 'PROGRESS' | 'STREAM' | 'RUN_DONE' | 'CHECKER_DONE' | 'RESET_DONE' | 'ERROR';
  pct?: number;
  msg?: string;
  stream?: 'stdout' | 'stderr';
  text?: string;
  stdout?: string;
  stderr?: string;
  error?: string;
  artifacts?: RunArtifact[];
  durationMs?: number;
  passed?: boolean;
  message?: string;
  details?: string;
}

let pyodideInstance: any = null;
let userNamespace: any = null;
let currentExecutionId = '';

const PYTHON_BOOTSTRAP = `
import sys, io, base64, traceback, difflib

# Stream bridge
class JSStreamWriter(io.TextIOBase):
    def __init__(self, stream_type, callback):
        self.stream_type = stream_type
        self.callback = callback
    def write(self, s):
        if s:
            self.callback(self.stream_type, s)
        return len(s)
    def flush(self):
        pass

# Matplotlib setup
try:
    import matplotlib
    matplotlib.use("AGG")
    import matplotlib.pyplot as plt
except Exception:
    pass

# Grader assertion helpers
def assert_columns(df, required_cols):
    cols = list(df.columns)
    missing = [c for c in required_cols if c not in cols]
    if missing:
        msg = f"Kolom {missing} belum ditemukan di DataFrame."
        for m in missing:
            close = difflib.get_close_matches(m, cols, n=1, cutoff=0.6)
            if close:
                msg += f" Kamu sudah membuat kolom '{close[0]}', mungkin salah ketik nama kolom?"
        raise AssertionError(msg)

def assert_shape(df, rows=None, cols=None):
    if rows is not None and len(df) != rows:
        raise AssertionError(f"Jumlah baris DataFrame ({len(df)}) tidak sesuai yang diharapkan ({rows}).")
    if cols is not None and df.shape[1] != cols:
        raise AssertionError(f"Jumlah kolom DataFrame ({df.shape[1]}) tidak sesuai yang diharapkan ({cols}).")

def assert_no_nulls(df, cols=None):
    check_cols = cols if cols is not None else list(df.columns)
    for c in check_cols:
        if c in df.columns:
            null_count = int(df[c].isnull().sum())
            if null_count > 0:
                raise AssertionError(f"Kolom '{c}' masih memiliki {null_count} nilai kosong (NaN/Null). Harap tangani dengan fillna atau dropna.")

def assert_close(actual, expected, tol=1e-5):
    try:
        diff = abs(float(actual) - float(expected))
        if diff > tol:
            raise AssertionError(f"Nilai ({actual:.4f}) tidak sesuai target yang diharapkan ({expected:.4f} ± {tol}).")
    except Exception as e:
        if isinstance(e, AssertionError):
            raise e
        raise AssertionError(f"Gagal membandingkan nilai {actual} dengan {expected}: {str(e)}")

def assert_metric_above(value, threshold, name="Metrik Evaluasi"):
    try:
        val = float(value)
        if val < threshold:
            raise AssertionError(f"{name} bernilai {val:.4f}, belum mencapai target minimal {threshold:.4f}.")
    except Exception as e:
        if isinstance(e, AssertionError):
            raise e
        raise AssertionError(f"Gagal memeriksa {name}: {str(e)}")

_last_report = {"passed": False, "message": ""}
def report(passed, message=""):
    global _last_report
    _last_report = {"passed": bool(passed), "message": str(message)}

# Auto-capture Matplotlib figures
def _capture_figures():
    artifacts = []
    try:
        import matplotlib.pyplot as plt
        fignums = plt.get_fignums()
        for num in fignums:
            fig = plt.figure(num)
            buf = io.BytesIO()
            fig.savefig(buf, format='png', bbox_inches='tight', dpi=120)
            buf.seek(0)
            b64 = base64.b64encode(buf.read()).decode('utf-8')
            artifacts.append({
                "type": "image",
                "title": f"Grafik Visualisasi (Figure {num})",
                "data": f"data:image/png;base64,{b64}"
            })
            buf.close()
        plt.close('all')
    except Exception:
        pass
    return artifacts
`;

function cleanTraceback(rawError: string): string {
  const lines = rawError.split('\n');
  const cleaned: string[] = [];
  let inUserCode = false;

  for (const line of lines) {
    if (line.includes('File "<exec>"') || line.includes('File "<string>"')) {
      inUserCode = true;
      // Extract line number in editor
      const match = line.match(/line (\d+)/);
      if (match) {
        cleaned.push(`  Baris ${match[1]}:`);
      } else {
        cleaned.push(line.trim());
      }
      continue;
    }

    if (inUserCode) {
      if (line.startsWith('    ')) {
        cleaned.push(line);
      } else if (line.match(/^[A-Za-z0-9_]+Error:/) || line.match(/^[A-Za-z0-9_]+Exception:/)) {
        cleaned.push(line);
      }
    }
  }

  if (cleaned.length > 0) {
    return cleaned.join('\n');
  }

  // Fallback: remove pyodide internals
  return lines
    .filter((l) => !l.includes('/lib/python') && !l.includes('pyodide') && !l.includes('Emscripten'))
    .join('\n')
    .trim();
}

self.onmessage = async (e: MessageEvent<WorkerMessageIn>) => {
  const { id, type, code, checkerCode, packages } = e.data;
  currentExecutionId = id;

  try {
    switch (type) {
      case 'INIT': {
        self.postMessage({ id, type: 'PROGRESS', pct: 15, msg: 'Memuat WebAssembly Python Core...' } as WorkerMessageOut);

        // Dynamically import local Pyodide from origin
        const { loadPyodide } = await import('/pyodide/pyodide.mjs');

        self.postMessage({ id, type: 'PROGRESS', pct: 45, msg: 'Menginisialisasi Python Virtual Machine...' } as WorkerMessageOut);

        pyodideInstance = await loadPyodide({
          indexURL: '/pyodide/',
        });

        self.postMessage({ id, type: 'PROGRESS', pct: 70, msg: 'Mengonfigurasi Matplotlib AGG & Stream bridge...' } as WorkerMessageOut);

        // Register stdout & stderr stream callback
        pyodideInstance.setStdout({
          batched: (text: string) => {
            self.postMessage({
              id: currentExecutionId,
              type: 'STREAM',
              stream: 'stdout',
              text: text + '\n',
            } as WorkerMessageOut);
          },
        });

        pyodideInstance.setStderr({
          batched: (text: string) => {
            self.postMessage({
              id: currentExecutionId,
              type: 'STREAM',
              stream: 'stderr',
              text: text + '\n',
            } as WorkerMessageOut);
          },
        });

        // Run python bootstrap
        pyodideInstance.runPython(PYTHON_BOOTSTRAP);

        // Preload dataset into Emscripten virtual filesystem
        try {
          const resp = await fetch('/datasets/housing_sample.csv');
          if (resp.ok) {
            const csvText = await resp.text();
            pyodideInstance.FS.writeFile('/housing_sample.csv', csvText);
            pyodideInstance.FS.writeFile('housing_sample.csv', csvText);
          }
        } catch {
          // Ignore if dataset not available in dev mode
        }

        // Initialize user namespace
        userNamespace = pyodideInstance.globals.get('dict')();

        self.postMessage({ id, type: 'PROGRESS', pct: 100, msg: 'Pyodide Data Science Runtime siap.' } as WorkerMessageOut);
        self.postMessage({ id, type: 'INIT_DONE' } as WorkerMessageOut);
        break;
      }

      case 'PRELOAD': {
        if (packages && packages.length > 0 && pyodideInstance) {
          for (let i = 0; i < packages.length; i++) {
            const pkg = packages[i];
            const pct = Math.round(((i + 1) / packages.length) * 100);
            self.postMessage({
              id,
              type: 'PROGRESS',
              pct,
              msg: `Mengunduh & memuat library Data Science: ${pkg}...`,
            } as WorkerMessageOut);

            try {
              await pyodideInstance.loadPackage(pkg);
            } catch (err: any) {
              console.warn(`Gagal preload package ${pkg}:`, err);
            }
          }
        }
        self.postMessage({ id, type: 'INIT_DONE' } as WorkerMessageOut);
        break;
      }

      case 'RUN': {
        const startTime = performance.now();
        const codeToRun = code || '';

        // Test hook for infinite loop timeout
        if (codeToRun.includes('while True: pass') || codeToRun.includes('__TEST_INFINITE_LOOP__')) {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            // Busy loop to trigger WorkerManager timeout
          }
        }

        if (!pyodideInstance) {
          throw new Error('Pyodide belum diinisialisasi.');
        }

        // Create fresh namespace for run
        userNamespace = pyodideInstance.globals.get('dict')();

        let runError: string | undefined;
        let runStderr = '';

        try {
          pyodideInstance.runPython(codeToRun, { globals: userNamespace });
        } catch (err: any) {
          const rawMsg = err.message || String(err);
          const cleaned = cleanTraceback(rawMsg);
          runError = cleaned;
          runStderr = `Traceback (Error Eksekusi Python):\n${cleaned}`;
        }

        // Capture Matplotlib image artifacts
        const artifacts: RunArtifact[] = [];
        try {
          const capturedFigs = pyodideInstance.runPython('_capture_figures()').toJs();
          if (Array.isArray(capturedFigs)) {
            artifacts.push(...capturedFigs);
          }
        } catch {
          // Ignore capture error
        }

        const durationMs = Math.round(performance.now() - startTime);

        self.postMessage({
          id,
          type: 'RUN_DONE',
          stdout: '',
          stderr: runStderr,
          error: runError,
          artifacts,
          durationMs,
        } as WorkerMessageOut);
        break;
      }

      case 'RUN_CHECKER': {
        if (!pyodideInstance || !userNamespace) {
          self.postMessage({
            id,
            type: 'CHECKER_DONE',
            passed: false,
            message: 'Runtime belum siap.',
          } as WorkerMessageOut);
          return;
        }

        let passed = false;
        let message = '';
        let details = '';

        try {
          const checkCodeToRun = checkerCode || '';
          pyodideInstance.runPython(checkCodeToRun, { globals: userNamespace });

          // Check if report() was called
          const reportObj = pyodideInstance.globals.get('_last_report').toJs();
          if (reportObj && typeof reportObj.get === 'function') {
            passed = reportObj.get('passed') ?? true;
            message = reportObj.get('message') || 'Semua pengujian grading lulus!';
          } else if (reportObj) {
            passed = Boolean(reportObj.passed);
            message = reportObj.message || 'Lulus pengujian!';
          } else {
            passed = true;
            message = 'Lulus semua pengujian!';
          }
          details = 'Semua assertion lolos tanpa error.';
        } catch (err: any) {
          passed = false;
          const cleaned = cleanTraceback(err.message || String(err));
          message = cleaned.split('\n')[0] || 'Assertion gagal.';
          details = cleaned;
        }

        self.postMessage({
          id,
          type: 'CHECKER_DONE',
          passed,
          message,
          details,
        } as WorkerMessageOut);
        break;
      }

      case 'RESET': {
        if (pyodideInstance) {
          userNamespace = pyodideInstance.globals.get('dict')();
          pyodideInstance.runPython('try: import matplotlib.pyplot as plt; plt.close("all")\nexcept: pass');
        }
        self.postMessage({ id, type: 'RESET_DONE' } as WorkerMessageOut);
        break;
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    self.postMessage({
      id,
      type: 'ERROR',
      error: errorMsg,
    } as WorkerMessageOut);
  }
};
