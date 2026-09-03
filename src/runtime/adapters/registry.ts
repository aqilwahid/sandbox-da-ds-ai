import type { RuntimeAdapter } from '../types';
import { MockRuntimeAdapter } from './mockAdapter';
import { PyodideAdapter } from './pyodideAdapter';

// Cache active runtime instances
const adapterCache = new Map<string, RuntimeAdapter>();

export function getRuntimeAdapter(runtimeId: string, language: 'python' | 'sql' | 'javascript' = 'python'): RuntimeAdapter {
  const cacheKey = `${runtimeId}_${language}`;
  if (adapterCache.has(cacheKey)) {
    return adapterCache.get(cacheKey)!;
  }

  let adapter: RuntimeAdapter;

  switch (runtimeId) {
    case 'pyodide':
      adapter = new PyodideAdapter();
      break;
    case 'duckdb':
    case 'sql':
      adapter = new MockRuntimeAdapter('sql');
      break;
    case 'python':
      adapter = new PyodideAdapter();
      break;
    case 'mock':
    default:
      adapter = new MockRuntimeAdapter(language);
      break;
  }

  adapterCache.set(cacheKey, adapter);
  return adapter;
}

export function terminateAllRuntimes(): void {
  adapterCache.forEach((adapter) => {
    try {
      adapter.terminate();
    } catch (e) {
      console.error('Error terminating runtime adapter:', e);
    }
  });
  adapterCache.clear();
}
