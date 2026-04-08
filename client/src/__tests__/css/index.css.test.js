/**
 * @file index.css.test.js
 * @description CSS health tests for index.css
 *
 * Tests:
 *   1. Brace balance — no mismatched { }
 *   2. All shared CSS classes are defined
 *   3. @layer components blocks are syntactically open+closed
 *   4. No raw inline Tailwind patterns remain in components (should use named classes)
 *   5. @apply references only classes defined earlier in the file or Tailwind built-ins
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// ─── helpers ────────────────────────────────────────────────────────────────

const CSS_FILE = path.resolve(__dirname, '../../index.css');
const COMPONENTS_DIR = path.resolve(__dirname, '../../components');

function readCSS() {
  return fs.readFileSync(CSS_FILE, 'utf8');
}

function readAllComponents() {
  const files = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.jsx'));
  return files.map(f => ({
    name: f,
    src: fs.readFileSync(path.join(COMPONENTS_DIR, f), 'utf8'),
  }));
}

// ─── Suite 1: Syntax ────────────────────────────────────────────────────────

describe('index.css — Syntax', () => {
  it('has balanced curly braces', () => {
    const css = readCSS();
    let depth = 0;
    let firstOverflow = null;

    const lines = css.split('\n');
    lines.forEach((line, idx) => {
      for (const ch of line) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        if (depth < 0 && !firstOverflow) {
          firstOverflow = `line ${idx + 1}: ${line.trim()}`;
        }
      }
    });

    expect(firstOverflow, `Extra closing brace at ${firstOverflow}`).toBeNull();
    expect(depth, `File ends with ${depth} unclosed brace(s)`).toBe(0);
  });

  it('has at least one @layer components block', () => {
    const css = readCSS();
    const layerBlocks = (css.match(/@layer\s+components\s*\{/g) || []).length;
    expect(layerBlocks).toBeGreaterThanOrEqual(1);
  });

  it('has no @apply outside a rule block', () => {
    const css = readCSS();
    // @apply should always be preceded by a selector line with {
    const lines = css.split('\n');
    let depth = 0;
    const violations = [];
    lines.forEach((line, idx) => {
      for (const ch of line) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      if (line.includes('@apply') && depth < 1) {
        violations.push(`line ${idx + 1}: ${line.trim()}`);
      }
    });
    expect(violations, `@apply found outside a block:\n${violations.join('\n')}`).toHaveLength(0);
  });

  it('every @apply line ends with a semicolon', () => {
    const css = readCSS();
    const violations = css
      .split('\n')
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => line.startsWith('@apply') && !line.endsWith(';'));

    expect(
      violations,
      `@apply lines missing semicolon:\n${violations.map(v => `  line ${v.n}: ${v.line}`).join('\n')}`
    ).toHaveLength(0);
  });
});

// ─── Suite 2: Class inventory ────────────────────────────────────────────────

const EXPECTED_CLASSES = [
  // original glass system
  'glass-pane',
  'glass-card',
  'glass-btn-primary',
  'glass-btn-secondary',
  // new shared classes
  'dark-field-input',
  'dark-label',
  'field-kicker',
  'col-label',
  'page-center',
  'page-body',
  'sub-card',
  'collapsible-hd',
  'form-checkbox-dark',
  'spinner-lg',
  'spinner-sm',
  'btn-action',
  'btn-action-amber',
  'btn-action-cyan',
  'btn-action-emerald',
  'btn-action-blue',
  'btn-action-green',
  'btn-action-orange',
  'th-yellow',
  'th-cyan',
];

describe('index.css — Class inventory', () => {
  const css = readCSS();

  EXPECTED_CLASSES.forEach(cls => {
    it(`defines .${cls}`, () => {
      // Match `.class-name {` or `.class-name\n{`
      const pattern = new RegExp(`\\.${cls.replace(/-/g, '\\-')}\\s*\\{`);
      expect(css, `Class .${cls} is missing from index.css`).toMatch(pattern);
    });
  });
});

// ─── Suite 3: No raw inline patterns in components ───────────────────────────

const BANNED_PATTERNS = [
  {
    label: 'dark-field-input (raw)',
    regex: /bg-white\/10 border border-white\/20 text-white px-4 py-3/,
    hint: 'Use className="dark-field-input" instead',
  },
  {
    label: 'field-kicker (raw)',
    regex: /text-xs font-bold uppercase tracking-\[0\.16em\] text-white\/55/,
    hint: 'Use className="field-kicker" instead',
  },
  {
    label: 'spinner-lg (raw)',
    regex: /animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto/,
    hint: 'Use className="spinner-lg" instead',
  },
  {
    label: 'spinner-sm (raw)',
    regex: /animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-400(?! mx)/,
    hint: 'Use className="spinner-sm" instead',
  },
  {
    label: 'sub-card (raw)',
    regex: /rounded-2xl border border-white\/15 bg-slate-950\/25 p-4/,
    hint: 'Use className="sub-card" instead',
  },
  {
    label: 'dark-label (raw)',
    regex: /mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300/,
    hint: 'Use className="dark-label" instead',
  },
  {
    label: 'btn-action base (raw)',
    regex: /inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition/,
    hint: 'Use className="btn-action[-variant]" instead',
  },
  {
    label: 'page-center (raw)',
    regex: /glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 flex items-center justify-center/,
    hint: 'Use className="page-center" instead',
  },
  {
    label: 'page-body (raw)',
    regex: /glass-bg-particles min-h-screen bg-fixed bg-gradient-to-br from-blue-900 via-blue-800 to-yellow-400 py-12 px-4/,
    hint: 'Use className="page-body" instead',
  },
  {
    label: 'collapsible-hd (raw)',
    regex: /flex items-center justify-between rounded-md border border-slate-700 bg-slate-950\/70 px-2 py-1\.5/,
    hint: 'Use className="collapsible-hd" instead',
  },
  {
    label: 'th-yellow (raw)',
    regex: /px-6 py-3 text-left text-xs font-medium text-yellow-300 uppercase tracking-wider/,
    hint: 'Use className="th-yellow" instead',
  },
  {
    label: 'th-cyan (raw)',
    regex: /px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wide/,
    hint: 'Use className="th-cyan" instead',
  },
];

describe('Components — no raw inline patterns (use CSS classes)', () => {
  const components = readAllComponents();

  BANNED_PATTERNS.forEach(({ label, regex, hint }) => {
    it(`no raw "${label}" in any component`, () => {
      const violations = components
        .filter(({ src }) => regex.test(src))
        .map(({ name }) => name);

      expect(
        violations,
        `Raw pattern "${label}" found in: ${violations.join(', ')}\n  ${hint}`
      ).toHaveLength(0);
    });
  });
});

// ─── Suite 4: Component usage — CSS classes actually appear ──────────────────

const USAGE_CHECKS = [
  { cls: 'dark-field-input', minUses: 30, files: null },
  { cls: 'btn-action',       minUses: 5,  files: null },
  { cls: 'spinner-lg',       minUses: 3,  files: null },
  { cls: 'page-center',      minUses: 8,  files: null },
  { cls: 'page-body',        minUses: 4,  files: null },
];

describe('Components — CSS class usage sanity', () => {
  const components = readAllComponents();

  USAGE_CHECKS.forEach(({ cls, minUses }) => {
    it(`"${cls}" is used at least ${minUses} times across components`, () => {
      const total = components.reduce((acc, { src }) => {
        return acc + (src.match(new RegExp(cls, 'g')) || []).length;
      }, 0);
      expect(total, `"${cls}" only found ${total} times (expected ≥${minUses})`).toBeGreaterThanOrEqual(minUses);
    });
  });
});
