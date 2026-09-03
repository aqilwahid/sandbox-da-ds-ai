// Dedicated Web Worker for Mock Runtime
import type { RunArtifact, TableArtifactData } from '../types';

interface WorkerMessageIn {
  id: string;
  type: 'INIT' | 'PRELOAD' | 'RUN' | 'RUN_CHECKER' | 'RESET';
  code?: string;
  checkerCode?: string;
  packages?: string[];
}

interface WorkerMessageOut {
  id: string;
  type: 'INIT_DONE' | 'PROGRESS' | 'RUN_DONE' | 'CHECKER_DONE' | 'RESET_DONE' | 'ERROR';
  pct?: number;
  msg?: string;
  stdout?: string;
  stderr?: string;
  error?: string;
  artifacts?: RunArtifact[];
  durationMs?: number;
  passed?: boolean;
  message?: string;
  details?: string;
}

let userExecutionHistory: string[] = [];

self.onmessage = async (e: MessageEvent<WorkerMessageIn>) => {
  const { id, type, code, checkerCode, packages } = e.data;

  try {
    switch (type) {
      case 'INIT': {
        const steps = [
          { pct: 15, msg: 'Memuat WebAssembly mock core...' },
          { pct: 45, msg: 'Mengalokasikan heap memory di Web Worker...' },
          { pct: 75, msg: 'Menyiapkan context isolasi...' },
          { pct: 100, msg: 'Runtime Mock siap.' },
        ];

        for (const step of steps) {
          self.postMessage({ id, type: 'PROGRESS', pct: step.pct, msg: step.msg } as WorkerMessageOut);
          await new Promise((r) => setTimeout(r, 60));
        }

        self.postMessage({ id, type: 'INIT_DONE' } as WorkerMessageOut);
        break;
      }

      case 'PRELOAD': {
        if (packages && packages.length > 0) {
          for (let i = 0; i < packages.length; i++) {
            const pkg = packages[i];
            const pct = Math.round(((i + 1) / packages.length) * 100);
            self.postMessage({
              id,
              type: 'PROGRESS',
              pct,
              msg: `Memuat paket: ${pkg}...`,
            } as WorkerMessageOut);
            await new Promise((r) => setTimeout(r, 50));
          }
        }
        self.postMessage({ id, type: 'INIT_DONE' } as WorkerMessageOut);
        break;
      }

      case 'RUN': {
        const startTime = performance.now();
        const codeToRun = code || '';
        userExecutionHistory.push(codeToRun);

        // Test hook for infinite loop timeout testing
        if (codeToRun.includes('__TEST_INFINITE_LOOP__') || codeToRun.includes('while True: pass')) {
          // Intentionally block the worker thread indefinitely to test manager.terminate()
          // eslint-disable-next-line no-constant-condition
          while (true) {
            // Busy loop blocking message queue
          }
        }

        // Test hook for simulated runtime error
        if (codeToRun.includes('__TEST_ERROR__')) {
          const durationMs = Math.round(performance.now() - startTime);
          self.postMessage({
            id,
            type: 'RUN_DONE',
            stdout: '',
            stderr: 'SyntaxError: invalid syntax (line 1)\nNameError: variable is not defined',
            error: 'Runtime execution error',
            durationMs,
          } as WorkerMessageOut);
          return;
        }

        // Simulate execution output
        const stdoutLines: string[] = [];
        const stderrLines: string[] = [];
        const artifacts: RunArtifact[] = [];

        // Check if code contains SQL-like keywords or Python
        const isSql = /SELECT|FROM|WHERE|GROUP BY|SUM|COUNT|AVG/i.test(codeToRun);

        if (isSql) {
          stdoutLines.push('Kueri SQL berhasil dieksekusi.');
          stdoutLines.push(`Baris diproses: 5 baris.`);

          // Generate sample table artifact
          const tableData: TableArtifactData = {
            columns: ['kategori', 'total_unit', 'total_pendapatan', 'avg_harga'],
            rows: [
              ['Elektronik', 154, 452000000, 2935000],
              ['Pakaian', 320, 128000000, 400000],
              ['Buku', 85, 12750000, 150000],
              ['Makanan & Minuman', 640, 38400000, 60000],
              ['Otomotif', 28, 98000000, 3500000],
            ],
          };

          artifacts.push({
            type: 'table',
            title: 'Hasil Query Agregasi',
            data: tableData,
          });
        } else {
          stdoutLines.push('[Output Eksekusi Python]');
          stdoutLines.push(`>>> Kode dieksekusi (${codeToRun.split('\n').length} baris)`);
          
          if (codeToRun.includes('print(')) {
            const matches = codeToRun.match(/print\((.*?)\)/g);
            if (matches) {
              matches.forEach((m) => {
                const inner = m.replace(/print\(|\)/g, '').replace(/["']/g, '');
                stdoutLines.push(`=> ${inner}`);
              });
            }
          } else {
            stdoutLines.push('Hasil komputasi: Sukses.');
          }

          artifacts.push({
            type: 'json',
            title: 'Variable State Snapshot',
            data: {
              status: 'success',
              runtime: 'MockPythonWorker',
              vars_evaluated: {
                total_records: 1250,
                memory_usage_kb: 412,
                computed_at: new Date().toISOString(),
              },
            },
          });
        }

        const durationMs = Math.round(performance.now() - startTime) + 18;

        self.postMessage({
          id,
          type: 'RUN_DONE',
          stdout: stdoutLines.join('\n'),
          stderr: stderrLines.join('\n'),
          artifacts,
          durationMs,
        } as WorkerMessageOut);
        break;
      }

      case 'RUN_CHECKER': {
        const lastCode = userExecutionHistory[userExecutionHistory.length - 1] || '';
        
        let passed = true;
        let message = 'Selamat! Semua test case grading berhasil dilewati.';
        let details = `Evaluasi grader (${checkerCode ? 'custom assertion' : 'default'}): Semua 3 assertion lulus tanpa error.`;

        if (!lastCode.trim()) {
          passed = false;
          message = 'Kode masih kosong. Tulis solusi terlebih dahulu sebelum dinilai.';
          details = 'Checker error: input code is empty.';
        } else if (lastCode.includes('__FAIL_TEST__')) {
          passed = false;
          message = 'Test case #2 gagal: Hasil agregasi tidak sesuai expected value.';
          details = 'Expected: 452000000, Got: 0 (AssertionError at line 4)';
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
        userExecutionHistory = [];
        self.postMessage({ id, type: 'RESET_DONE' } as WorkerMessageOut);
        break;
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({
      id,
      type: 'ERROR',
      error: message,
    } as WorkerMessageOut);
  }
};
