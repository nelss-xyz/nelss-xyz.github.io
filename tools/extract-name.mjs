#!/usr/bin/env node
// Extracts the animated "Nelson" name SVG from the old CRA homepage and
// writes it to js/name-svg.js as window.NAME_SVG. One-time.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = '/Users/nels/Documents/Projects/slenplayz.github.io new homepage/src/components/NameSVG.js';

const src = readFileSync(SRC, 'utf8');
const viewBox = (src.match(/viewBox="([^"]+)"/) || [])[1];
const ds = [...src.matchAll(/\bd="([^"]+)"/g)].map((m) => m[1].replace(/\s+/g, ' ').trim());

if (!viewBox || ds.length !== 2) {
  console.error('Unexpected source: viewBox=' + viewBox + ' paths=' + ds.length);
  process.exit(1);
}

const paths = ds.map((d, i) => '<path class="nl-' + (i + 1) + '" d="' + d + '"/>').join('');
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox +
  '" role="img" aria-label="Nelson" preserveAspectRatio="xMidYMid meet">' + paths + '</svg>';

writeFileSync(join(ROOT, 'js', 'name-svg.js'), 'window.NAME_SVG = ' + JSON.stringify(svg) + ';\n');
console.log('wrote js/name-svg.js (' + svg.length + ' bytes, ' + ds.length + ' paths)');
