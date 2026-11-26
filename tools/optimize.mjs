#!/usr/bin/env node
// One-time asset optimizer for nelss.xyz.
// Reads masters from ~/Pictures/Website Showcase and writes responsive
// AVIF + WebP derivatives into ./assets and a technical manifest to
// ./js/manifest.json. HDR originals are copied verbatim into ./assets/hdr
// so their gain maps survive for full-size viewing. Masters are untouched.
// Re-run with: node tools/optimize.mjs
import { execFileSync } from 'node:child_process';
import {
  mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = '/Users/nels/Pictures/Website Showcase';
const TMP = join(ROOT, '.optimize-tmp');
const TARGETS = [800, 1600, 2400];

const HDR = new Set([
  '8th-sc', 'ori-ics', 'j1-fg',
  'dsc08138', 'hk-street', 'moster-towers', 'victoria-bay', 'image-3',
]);

const HERO = { dir: '', file: 'X-Pan, My Silhoette, MBS.png', slug: 'hero', widths: [1200, 2000, 3200, 4800] };

const TIMELINE = [
  ['NDP Marching towards padang.jpg', 'ndp-towards-padang'],
  ['NDP Ready to march in.jpg', 'ndp-ready'],
  ['NDP Marching in Padang with view of me.jpg', 'ndp-padang'],
  ['4 Fuji.jpg', 'fuji'],
  ['Sec Sch fg.jpg', 'sec-sch-fg'],
  ['11 SG Excos after Os.jpg', 'sg-excos'],
  ['11 SG Excos.HEIC', 'sg-excos-2023'],
  ["psl '24.jpg", 'psl-24'],
  ["tms '24.jpg", 'tms-24'],
  ['artemis alphas.jpg', 'artemis-alphas'],
  ['performance 1.jpg', 'xinyao-performance'],
  ['IMG_20261002_152316_216.jpg', 'xinyao-216'],
  ['IMG_20261002_152427_051.jpg', 'xinyao-051'],
  ['Paradigm Math tuition Friends.jpg', 'paradigm-math'],
  ['ASR eXplore @ Hong Kong.jpg', 'hk-asr'],
  ['Guys in ASR eXplore HK.jpg', 'hk-guys'],
  ['J1 Fg.jpg', 'j1-fg'],
  ['HK Gang goes hiking in SG.jpg', 'hk-hike'],
  ['8th SC Pic.jpg', '8th-sc'],
  ['3 Progs ICs.jpg', 'progs-ics'],
  ['Ori ICs.jpg', 'ori-ics'],
  ['SC FG.jpg', 'sc-fg'],
  ["Teachers' Day Planning Comm.jpg", 'teachers-day'],
];

const LENS = [
  ['HK Skyline.jpg', 'hk-skyline'],
  ['CBD from ECP.jpg', 'cbd-ecp'],
  ['Moster Towers.jpg', 'moster-towers'],
  ['Cinematic Road SG.jpg', 'cinematic-road'],
  ['Victoria Bay.jpg', 'victoria-bay'],
  ['Hills.jpg', 'hills'],
  ['2024 NDP Helicopter show.jpg', 'ndp-helicopter'],
  ['Sun behind buildings.jpg', 'sun-buildings'],
  ['CBD From Kembangan.jpg', 'cbd-kembangan'],
  ['DSC08138.jpg', 'dsc08138'],
  ['HK Street.jpg', 'hk-street'],
  ['2024 NDP Flag flypast.jpg', 'ndp-flypast'],
  ['image (3).jpg', 'image-3'],
  ['Include this pic.jpg', 'include-this-pic'],
];

const EXTRA_LENS = [
  ['shopfront-evening', 'A warmly lit shopping arcade at night'],
  ['crossing-after-dark', 'Pedestrians beneath an elevated walkway on a rainy night'],
  ['cafe-at-night', 'A softly lit café interior after dark'],
  ['sunlit-atrium', 'A sunlit modern atrium opening onto a garden'],
  ['monochrome-crossing', 'A black and white city street with pedestrians at night'],
  ['mall-after-dark', 'A multi-storey shopping centre glowing after dark'],
  ['golden-water', 'Golden reflections shimmering across dark water'],
];

const VIDEO = ['8th SC Signing Out.mp4', 'signing-out'];

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
}

function exifOf(path) {
  const out = execFileSync('exiftool', [
    '-j', '-ImageWidth', '-ImageHeight', '-Make', '-Model', '-LensModel',
    '-FocalLength', '-FNumber', '-ExposureTime', '-ISO', path,
  ], { encoding: 'utf8' });
  return JSON.parse(out)[0] || {};
}

function cameraName(m) {
  const model = (m.Model || '').trim();
  const make = (m.Make || '').trim();
  if (model === 'ILCE-6000') return 'Sony \u03b16000';
  if (model === 'DSC-W310') return 'Sony DSC-W310';
  if (make === 'OPPO' || /Find X9/.test(model)) return 'OPPO Find X9 Pro';
  return model || make || null;
}

function exifLine(m, hdr) {
  const cam = cameraName(m);
  if (!cam) return null;
  const parts = [cam];
  const isOppo = cam.includes('OPPO');
  const focal = m.FocalLength ? String(m.FocalLength).replace(/\s*mm$/, '') : null;
  if (focal && !isOppo) parts.push(focal + 'mm');
  if (m.FNumber) parts.push('f/' + m.FNumber);
  if (m.ExposureTime) parts.push(String(m.ExposureTime).replace(/\s*s$/, '') + 's');
  if (m.ISO) parts.push('ISO ' + m.ISO);
  return parts.join(' \u00b7 ');
}

function widthsFor(srcW) {
  const list = TARGETS.filter((w) => w <= srcW);
  if (srcW <= 2400 && !list.includes(srcW)) list.push(srcW);
  if (!list.length) list.push(srcW);
  return [...new Set(list)].sort((a, b) => a - b);
}

function encode(src, outDir, slug, hdr, overrideWidths) {
  const meta = exifOf(src);
  const master = src;
  if (/\.heic$/i.test(src)) {
    const converted = join(TMP, slug + '.jpg');
    run('sips', ['-s', 'format', 'jpeg', src, '--out', converted]);
    src = converted;
  }
  const srcW = Number(meta.ImageWidth);
  const srcH = Number(meta.ImageHeight);
  const widths = (overrideWidths || widthsFor(srcW)).filter((w) => w <= srcW);
  const out = { w: srcW, h: srcH, widths, exif: null, camera: cameraName(meta), hdr: !!hdr };
  out.exif = exifLine(meta, hdr);
  for (const width of widths) {
    const avif = join(outDir, slug + '-' + width + '.avif');
    const webp = join(outDir, slug + '-' + width + '.webp');
    run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src,
      '-vf', 'scale=' + width + ':-2', '-c:v', 'libsvtav1', '-preset', '8',
      '-crf', '32', '-frames:v', '1', avif]);
    run('cwebp', ['-quiet', '-q', '82', '-m', '6', '-resize', String(width), '0', src, '-o', webp]);
  }
  const lq = join(TMP, slug + '-lq.webp');
  run('cwebp', ['-quiet', '-q', '25', '-m', '6', '-resize', '24', '0', src, '-o', lq]);
  out.lqip = 'data:image/webp;base64,' + readFileSync(lq).toString('base64');
  if (hdr) {
    const orig = join(ROOT, 'assets', 'hdr', slug + '.jpg');
    copyFileSync(master, orig);
    out.original = 'assets/hdr/' + slug + '.jpg';
  }
  return out;
}

function main() {
  rmSync(TMP, { recursive: true, force: true });
  for (const d of ['assets/img', 'assets/hdr', 'assets/originals', 'assets/video', 'js']) {
    mkdirSync(join(ROOT, d), { recursive: true });
  }
  mkdirSync(TMP, { recursive: true });

  // Pass image slugs to add or refresh only those derivatives.
  const selected = process.argv.slice(2);
  if (selected.length) {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'js/manifest.json')));
    const entries = [...TIMELINE.map(([file, slug]) => [slug, join(SRC, 'Biography', file)]),
      ...LENS.map(([file, slug]) => [slug, join(SRC, 'Photography', file)]),
      ...EXTRA_LENS.map(([slug]) => [slug, join(ROOT, 'assets', 'originals', slug + '.jpg')])];
    for (const slug of selected) {
      const entry = entries.find(item => item[0] === slug);
      if (!entry) throw new Error('Unknown image slug: ' + slug);
      console.log('  ' + slug);
      manifest.images[slug] = encode(entry[1],
        join(ROOT, 'assets/img'), slug, HDR.has(slug));
    }
    writeFileSync(join(ROOT, 'js/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    writeFileSync(join(ROOT, 'js/manifest.js'), 'window.MANIFEST = ' + JSON.stringify(manifest) + ';\n');
    rmSync(TMP, { recursive: true, force: true });
    return;
  }

  const manifest = { images: {}, video: null };

  console.log('hero...');
  manifest.images[HERO.slug] = encode(
    join(SRC, HERO.file), join(ROOT, 'assets', 'img'), HERO.slug, false, HERO.widths,
  );

  console.log('timeline...');
  for (const [file, slug] of TIMELINE) {
    console.log('  ' + slug);
    manifest.images[slug] = encode(
      join(SRC, 'Biography', file), join(ROOT, 'assets', 'img'), slug, HDR.has(slug),
    );
  }

  console.log('lens...');
  for (const [file, slug] of LENS) {
    console.log('  ' + slug);
    manifest.images[slug] = encode(
      join(SRC, 'Photography', file), join(ROOT, 'assets', 'img'), slug, HDR.has(slug),
    );
  }

  console.log('additional lens photos...');
  for (const [slug] of EXTRA_LENS) {
    console.log('  ' + slug);
    manifest.images[slug] = encode(join(ROOT, 'assets', 'originals', slug + '.jpg'),
      join(ROOT, 'assets', 'img'), slug, HDR.has(slug));
  }

  copyFileSync(join(SRC, 'Photography', 'Include this pic.jpg'), join(ROOT, 'assets/originals/include-this-pic.jpg'));

  console.log('video...');
  const vsrc = join(SRC, 'Biography', VIDEO[0]);
  const vdir = join(ROOT, 'assets', 'video');
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', vsrc,
    '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-crf', '28', '-preset', 'slow',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '128k', join(vdir, 'signing-out.mp4')]);
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '1', '-i', vsrc,
    '-vf', 'scale=1280:-2', '-frames:v', '1', join(vdir, 'signing-out-poster.jpg')]);
  run('cwebp', ['-quiet', '-q', '82', join(vdir, 'signing-out-poster.jpg'),
    '-o', join(vdir, 'signing-out-poster.webp')]);
  manifest.video = {
    slug: 'signing-out',
    mp4: 'assets/video/signing-out.mp4',
    poster: 'assets/video/signing-out-poster.webp',
  };

  const orientationSource = join(SRC, 'Biography', 'see u @ ori tmr.mp4');
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', orientationSource,
    '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-crf', '28', '-preset', 'slow',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '128k', join(vdir, 'orientation.mp4')]);
  const orientationPoster = join(TMP, 'orientation-poster.jpg');
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '1', '-i', orientationSource,
    '-vf', 'scale=1280:-2', '-frames:v', '1', orientationPoster]);
  run('cwebp', ['-quiet', '-q', '82', orientationPoster, '-o', join(vdir, 'orientation-poster.webp')]);

  writeFileSync(join(ROOT, 'js', 'manifest.json'), JSON.stringify(manifest, null, 1));
  writeFileSync(join(ROOT, 'js', 'manifest.js'),
    'window.MANIFEST = ' + JSON.stringify(manifest) + ';\n');
  rmSync(TMP, { recursive: true, force: true });
  console.log('done ->', Object.keys(manifest.images).length, 'images');
}

main();
await import('./read-metadata.mjs');
