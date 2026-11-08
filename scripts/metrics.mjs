#!/usr/bin/env node
/**
 * 源码级稳定性指标（静态口径，不是运行时测量）。
 *
 *   node scripts/metrics.mjs
 *
 * 每个指标都要写明口径：这里统计的是 lib/client.js 的**源码文本**，
 * 不等于运行时 DOM 行为。颜色一项与 scripts/check-colors.mjs 共用分类器，
 * 因此 controlled / exempt / raw 三个数字可以直接对得上。
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scanColors } from './lib/color-scan.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, '..', 'lib', 'client.js');
const source = readFileSync(sourcePath, 'utf8');

const count = (pattern) => (source.match(pattern) || []).length;
const unique = (pattern) => new Set(source.match(pattern) || []).size;
const line = (name, value, scope) => console.log(`${name}: ${value} [${scope}]`);

const colors = scanColors(source);
const presets = ['default', 'classic', 'v2'];

console.log(`source: lib/client.js (${source.length} UTF-16 code units) [static source]`);
line(
  'preset markers',
  presets.map((preset) => `${preset}=${count(new RegExp(`data-dshm-preset[^\\n]*${preset}`, 'g')) > 0 ? 'yes' : 'no'}`).join(', '),
  'token presence',
);
line('preset selector references', count(/data-dshm-preset/g), 'all source references to the preset data attribute');
line('color literals (total)', colors.total, 'raw hex/rgb/hsl literals in source text');
line('color literals (controlled)', colors.controlled, 'fallback values inside var(token, fallback)');
line('color literals (exempt)', colors.exempt.length, 'explicit TOKEN-OK exemptions (palette, debug, token definitions)');
line('color literals (raw)', colors.raw.length, 'uncontrolled literals; must stay 0');
line('!important', count(/!important\b/g), 'source occurrences, including CSS strings');
line('[class*=]', count(/\[class\s*\*=/g), 'attribute-substring selector occurrences');
line('Chinese aria exact selectors', count(/aria-label\s*=\s*["'][^"']*[\u3400-\u9fff][^"']*["']/g), 'literal aria-label selectors containing CJK text');
line('DOM insertion calls', count(/\.(?:appendChild|insertBefore|insertAdjacent(?:Element|HTML)|replaceWith)\s*\(/g), 'static calls to browser DOM insertion APIs; targets are not resolved');
line('unique data-dshm anchors', unique(/data-dshm-[a-z0-9-]+/g), 'unique self-owned data-dshm-* attribute names');
