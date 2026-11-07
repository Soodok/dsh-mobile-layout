import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, '..', 'lib', 'client.js');
const source = readFileSync(sourcePath, 'utf8');

const count = (pattern) => (source.match(pattern) || []).length;
const unique = (pattern) => new Set(source.match(pattern) || []).size;
const line = (name, value, scope) => console.log(`${name}: ${value} [${scope}]`);

console.log(`source: lib/client.js (${source.length} bytes) [static source]`);
const presets = ['default', 'classic', 'v2'];
line('preset markers', presets.map((preset) => `${preset}=${count(new RegExp(`data-dshm-preset[^\\n]*${preset}`, 'g')) > 0 ? 'yes' : 'no'}`).join(', '), 'token presence');
line('preset selector references', count(/data-dshm-preset/g), 'all source references to the preset data attribute');
line('bare color literals', count(/#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\([^)]*\)/g), 'raw hex/rgb/hsl literals in source, including comments and strings');
line('!important', count(/!important\b/g), 'source occurrences, including CSS strings');
line('[class*=]', count(/\[class\s*\*=/g), 'attribute-substring selector occurrences');
line('Chinese aria exact selectors', count(/aria-label\s*=\s*["'][^"']*[\u3400-\u9fff][^"']*["']/g), 'literal aria-label selectors containing CJK text');
line('official DOM insertion calls', count(/\.(?:appendChild|insertBefore|insertAdjacent(?:Element|HTML)|replaceWith)\s*\(/g), 'static calls to browser DOM insertion APIs');
line('unique data-dshm anchors', unique(/data-dshm-[a-z0-9-]+/g), 'unique self-owned data-dshm-* attribute names');
