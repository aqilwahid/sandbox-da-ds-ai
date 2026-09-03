import yaml from 'js-yaml';
import type { Exercise, ExerciseFrontmatter, ExerciseSections, TrackId } from './types';

export function parseExerciseMarkdown(rawContent: string, filePath: string): Exercise {
  const normalized = rawContent.replace(/\r\n/g, '\n');
  const frontmatterMatch = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    throw new Error(`File ${filePath} tidak memiliki format frontmatter YAML valid (--- ... ---).`);
  }

  const [, rawYaml, rawBody] = frontmatterMatch;
  let frontmatter: ExerciseFrontmatter;

  try {
    const parsed = yaml.load(rawYaml) as any;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Frontmatter kosong atau bukan objek valid');
    }

    frontmatter = {
      id: String(parsed.id || '').trim(),
      track: (parsed.track || 'analyst') as TrackId,
      title: String(parsed.title || '').trim(),
      estimatedMinutes: Number(parsed.estimatedMinutes) || 10,
      runtime: String(parsed.runtime || 'mock').trim(),
      packages: Array.isArray(parsed.packages) ? parsed.packages.map(String) : [],
      datasets: Array.isArray(parsed.datasets) ? parsed.datasets.map(String) : [],
      prerequisites: Array.isArray(parsed.prerequisites) ? parsed.prerequisites.map(String) : [],
    };
  } catch (err: any) {
    throw new Error(`Gagal parse YAML frontmatter pada ${filePath}: ${err.message}`);
  }

  // Parse H2 sections
  // Format: ## <section_name>
  const sectionRegex = /^##\s+([a-zA-Z0-9_-]+)\s*$/gm;
  const sections: ExerciseSections = {
    instruksi: '',
    starter: '',
    solusi: '',
    checker: '',
    hints: [],
  };

  const matches: { name: string; index: number; contentStartIndex: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(rawBody)) !== null) {
    matches.push({
      name: match[1].toLowerCase(),
      index: match.index,
      contentStartIndex: match.index + match[0].length,
    });
  }

  const hintMap = new Map<number, string>();

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : rawBody.length;
    const content = rawBody.slice(current.contentStartIndex, nextIndex).trim();

    if (current.name === 'instruksi') {
      sections.instruksi = content;
    } else if (current.name === 'starter') {
      // Remove codeblock wrapper if present
      sections.starter = cleanCodeBlock(content);
    } else if (current.name === 'solusi') {
      sections.solusi = cleanCodeBlock(content);
    } else if (current.name === 'checker') {
      sections.checker = cleanCodeBlock(content);
    } else if (current.name.startsWith('hint-')) {
      const hintNum = parseInt(current.name.replace('hint-', ''), 10);
      if (!isNaN(hintNum)) {
        hintMap.set(hintNum, content);
      }
    }
  }

  // Sort hints numerically (hint-1, hint-2, hint-3)
  const sortedHintKeys = Array.from(hintMap.keys()).sort((a, b) => a - b);
  sections.hints = sortedHintKeys.map((k) => hintMap.get(k)!);

  // Extract order and slug from filename if possible (e.g., content/analyst/01-sql-agregasi.md)
  const pathParts = filePath.replace(/\\/g, '/').split('/');
  const filename = pathParts[pathParts.length - 1] || '';
  const fileMatch = filename.match(/^(\d+)-(.*)\.md$/);
  const order = fileMatch ? parseInt(fileMatch[1], 10) : 99;
  const slug = fileMatch ? fileMatch[2] : filename.replace(/\.md$/, '');

  return {
    id: frontmatter.id,
    frontmatter,
    sections,
    filePath,
    track: frontmatter.track,
    order,
    slug,
  };
}

function cleanCodeBlock(content: string): string {
  // If content is surrounded by ```...```, remove the code fence
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/);
  if (fenceMatch) {
    return fenceMatch[1];
  }
  return trimmed;
}
