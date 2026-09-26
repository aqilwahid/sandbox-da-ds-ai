/**
 * Validasi struktur konten latihan (dijalankan otomatis sebelum build).
 *   npm run validate:content
 */
import fs from 'node:fs';
import path from 'node:path';
import { validateExercises } from '../src/content/validator';
import { checkVisuals } from '../src/content/visualCheck';
import { DATASET_DIR, loadContent } from './lib/content-files';

const { exercises, datasets, parseErrors } = loadContent();
const errors: string[] = parseErrors.map((e) => `[${e.file}] ${e.message}`);
const warnings: string[] = [];

const result = validateExercises(exercises, datasets);
for (const issue of result.issues) {
  const where = issue.file ? `[${issue.file.replace(/^\//, '')}] ` : '';
  (issue.type === 'error' ? errors : warnings).push(where + issue.message);
}

const visuals = checkVisuals(exercises);
for (const issue of visuals.issues) {
  const where = issue.file ? `[${issue.file.replace(/^\//, '')}] ` : '';
  (issue.type === 'error' ? errors : warnings).push(where + issue.message);
}

for (const [name, info] of Object.entries(datasets)) {
  if (!fs.existsSync(path.join(DATASET_DIR, info.file))) {
    errors.push(`[content/datasets.yaml] File dataset "${info.file}" (${name}) tidak ada di public/datasets.`);
  }
}

const byTrack = exercises.reduce<Record<string, number>>((acc, ex) => {
  acc[ex.track] = (acc[ex.track] || 0) + 1;
  return acc;
}, {});

console.log(`🔍 Validasi konten: ${exercises.length} latihan (${Object.entries(byTrack).map(([k, v]) => `${k}: ${v}`).join(', ')}), ${Object.keys(datasets).length} dataset, ${visuals.count} blok visual`);
for (const w of warnings) console.warn(`  ⚠️  ${w}`);
if (errors.length) {
  console.error(`\n❌ ${errors.length} error konten:`);
  errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}`));
  console.error('\nPerbaiki error di atas sebelum build.\n');
  process.exit(1);
}
console.log('✅ Konten valid.');
