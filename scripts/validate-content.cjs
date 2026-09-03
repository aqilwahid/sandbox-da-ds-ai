const fs = require('fs');
const path = require('path');

let yaml;
try {
  yaml = require('js-yaml');
} catch {
  yaml = null;
}

const CONTENT_DIR = path.resolve(__dirname, '..', 'content');

console.log('🔍 [Content Validator] Memeriksa format konten latihan di /content ...');

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.md')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function parseYamlFallback(rawYaml) {
  const result = {};
  const lines = rawYaml.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let val = trimmed.slice(colonIdx + 1).trim();

    // Remove comments after value if any (e.g., track: analyst # analyst | datascience)
    const commentIdx = val.indexOf('#');
    if (commentIdx !== -1) {
      val = val.slice(0, commentIdx).trim();
    }

    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim();
      result[key] = inner ? inner.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')) : [];
    } else if (/^\d+$/.test(val)) {
      result[key] = parseInt(val, 10);
    } else {
      result[key] = val.replace(/^['"]|['"]$/g, '');
    }
  }
  return result;
}

function parseMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    throw new Error(`File tidak memiliki frontmatter YAML valid (--- ... ---).`);
  }

  const [, rawYaml, rawBody] = frontmatterMatch;
  let parsed = null;

  if (yaml && typeof yaml.load === 'function') {
    try {
      parsed = yaml.load(rawYaml);
    } catch {
      parsed = parseYamlFallback(rawYaml);
    }
  } else {
    parsed = parseYamlFallback(rawYaml);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Frontmatter kosong atau bukan objek valid');
  }

  const frontmatter = {
    id: String(parsed.id || '').trim(),
    track: String(parsed.track || '').trim(),
    title: String(parsed.title || '').trim(),
    estimatedMinutes: Number(parsed.estimatedMinutes) || 10,
    runtime: String(parsed.runtime || 'mock').trim(),
    packages: Array.isArray(parsed.packages) ? parsed.packages.map(String) : [],
    datasets: Array.isArray(parsed.datasets) ? parsed.datasets.map(String) : [],
    prerequisites: Array.isArray(parsed.prerequisites) ? parsed.prerequisites.map(String) : [],
  };

  const sectionRegex = /^##\s+([a-zA-Z0-9_-]+)\s*$/gm;
  const sections = {
    instruksi: '',
    starter: '',
    solusi: '',
    checker: '',
    hints: [],
  };

  const matches = [];
  let match;
  while ((match = sectionRegex.exec(rawBody)) !== null) {
    matches.push({
      name: match[1].toLowerCase(),
      index: match.index,
      contentStartIndex: match.index + match[0].length,
    });
  }

  const hintMap = new Map();
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : rawBody.length;
    const sContent = rawBody.slice(current.contentStartIndex, nextIndex).trim();

    if (current.name === 'instruksi') sections.instruksi = sContent;
    else if (current.name === 'starter') sections.starter = sContent;
    else if (current.name === 'solusi') sections.solusi = sContent;
    else if (current.name === 'checker') sections.checker = sContent;
    else if (current.name.startsWith('hint-')) {
      const hNum = parseInt(current.name.replace('hint-', ''), 10);
      if (!isNaN(hNum)) hintMap.set(hNum, sContent);
    }
  }

  const sortedHints = Array.from(hintMap.keys()).sort((a, b) => a - b);
  sections.hints = sortedHints.map((k) => hintMap.get(k));

  return {
    id: frontmatter.id,
    frontmatter,
    sections,
    filePath,
  };
}

function runValidation() {
  const files = getAllFiles(CONTENT_DIR);
  if (files.length === 0) {
    console.warn('⚠️ Tidak ada file markdown di direktori /content.');
    return;
  }

  const exercises = [];
  const errors = [];
  const idMap = new Map();

  for (const f of files) {
    const relPath = path.relative(path.resolve(__dirname, '..'), f);
    try {
      const ex = parseMarkdownFile(f);
      exercises.push(ex);

      if (!ex.id) {
        errors.push(`[${relPath}] Frontmatter "id" wajib diisi.`);
        continue;
      }

      if (idMap.has(ex.id)) {
        const other = idMap.get(ex.id);
        errors.push(
          `[${relPath}] ID duplikat: "${ex.id}" sudah digunakan di "${path.relative(path.resolve(__dirname, '..'), other.filePath)}". ID harus unik secara global.`
        );
      } else {
        idMap.set(ex.id, ex);
      }

      if (!['analyst', 'datascience', 'ai'].includes(ex.frontmatter.track)) {
        errors.push(`[${relPath}] Track "${ex.frontmatter.track}" tidak valid. Track yang diizinkan: analyst, datascience, ai.`);
      }

      if (!ex.frontmatter.title) {
        errors.push(`[${relPath}] Frontmatter "title" wajib diisi.`);
      }

      // Check sections
      if (!ex.sections.instruksi) errors.push(`[${relPath}] Section wajib "## instruksi" hilang atau kosong.`);
      if (ex.sections.starter === undefined) errors.push(`[${relPath}] Section wajib "## starter" hilang.`);
      if (!ex.sections.solusi) errors.push(`[${relPath}] Section wajib "## solusi" hilang atau kosong.`);
      if (!ex.sections.checker) errors.push(`[${relPath}] Section wajib "## checker" hilang atau kosong.`);
    } catch (e) {
      errors.push(`[${relPath}] Gagal membaca file: ${e.message}`);
    }
  }

  // Check prerequisites existence
  for (const ex of exercises) {
    const relPath = path.relative(path.resolve(__dirname, '..'), ex.filePath);
    for (const prereq of ex.frontmatter.prerequisites) {
      if (!idMap.has(prereq)) {
        errors.push(`[${relPath}] Prerequisite "${prereq}" tidak ditemukan di modul manapun.`);
      }
    }
  }

  // Check cycle
  const adj = new Map();
  exercises.forEach((ex) => adj.set(ex.id, ex.frontmatter.prerequisites));

  const visited = new Set();
  const inStack = new Set();
  const cycles = [];

  function checkCycle(currentId, pathArr) {
    visited.add(currentId);
    inStack.add(currentId);
    pathArr.push(currentId);

    const neighbors = adj.get(currentId) || [];
    for (const neighbor of neighbors) {
      if (!idMap.has(neighbor)) continue;

      if (!visited.has(neighbor)) {
        checkCycle(neighbor, [...pathArr]);
      } else if (inStack.has(neighbor)) {
        const cycleStartIndex = pathArr.indexOf(neighbor);
        const cycle = [...pathArr.slice(cycleStartIndex), neighbor];
        cycles.push(cycle);
      }
    }
    inStack.delete(currentId);
  }

  for (const ex of exercises) {
    if (!visited.has(ex.id)) {
      checkCycle(ex.id, []);
    }
  }

  for (const cycle of cycles) {
    errors.push(`Terdeteksi siklus prasyarat (circular prerequisite cycle): ${cycle.join(' -> ')}`);
  }

  if (errors.length > 0) {
    console.error('\n❌ VALIDASI KONTEN GAGAL (' + errors.length + ' kesalahan ditemukan):\n');
    errors.forEach((err, idx) => console.error(`  ${idx + 1}. ${err}`));
    console.error('\nPerbaiki error konten di atas sebelum melakukan build produksi.\n');
    process.exit(1);
  }

  console.log(`✅ [Content Validator] Sukses! Semua ${exercises.length} latihan valid dan bebas konflik.`);
}

runValidation();
