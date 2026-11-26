// Refresh EXIF and capture dates without changing or re-encoding any image.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = '/Users/nels/Pictures/Website Showcase';
const optimizer = readFileSync(resolve(root, 'tools/optimize.mjs'), 'utf8');
const mappings = [...optimizer.matchAll(/\[(['"])(.*?)\1, '([^']+)'\]/g)].filter(m => /\.(jpg|HEIC)$/i.test(m[2]));
const manifest = JSON.parse(readFileSync(resolve(root, 'js/manifest.json')));
const supplied = {'ndp-towards-padang':'2023-08','ndp-ready':'2023-08','ndp-padang':'2023-08','progs-ics':'2026-01','fuji':'2024-07','psl-24':'2024-03','xinyao-performance':'2026-06','xinyao-216':'2026-06','xinyao-051':'2026-06'};
const extraImages = [
  ['shopfront-evening', 'RAW_1795162519693 (2).jpg'],
  ['crossing-after-dark', 'RAW_1794825062425_hasselblad (2).jpg'],
  ['cafe-at-night', 'RAW_1794824955266 (1).jpg'],
  ['sunlit-atrium', 'RAW_1793694830001.jpg'],
  ['monochrome-crossing', 'RAW_1793457418563 (2).jpg'],
  ['mall-after-dark', 'RAW_1793354693589 (1).jpg'],
  ['golden-water', 'IMG20261119183953 (1).jpg'],
];
const entries = mappings.map(([, , filename, slug]) => {
  const dir = optimizer.indexOf(filename) < optimizer.indexOf('const LENS') ? 'Biography' : 'Photography';
  return {slug, filename, path:resolve(source,dir,filename), source:`${dir}/${filename}`};
});
entries.push(...extraImages.map(([slug]) => ({slug, filename:slug + '.jpg', path:resolve(root,'assets/originals',slug + '.jpg'), source:`assets/originals/${slug}.jpg`})));
for (const {slug, filename, path, source:sourceName} of entries) {
  const m = JSON.parse(execFileSync('exiftool',['-j','-ImageWidth','-ImageHeight','-Make','-Model','-FocalLength','-FNumber','-ExposureTime','-ISO','-DateTimeOriginal',path],{encoding:'utf8'}))[0];
  const image = manifest.images[slug] || {w:m.ImageWidth,h:m.ImageHeight,widths:[800],hdr:false,formats:['webp']};
  image.source = sourceName;
  image.caption = filename.replace(/\.(jpg|HEIC)$/i,'').replace(/\bfg\b/gi,'friend group').replace(/\bPic\b/g,'').replace(/\s+/g,' ').trim();
  image.captureDate = supplied[slug] || (m.DateTimeOriginal?.slice(0,10).replaceAll(':','-')) || null;
  image.dateSource = supplied[slug] ? 'user' : image.captureDate ? 'DateTimeOriginal' : 'unknown';
  delete m.SourceFile;
  image.rawExif = m;
  const model = m.Model === 'ILCE-6000' ? 'Sony α6000' : m.Model === 'DSC-W310' ? 'Sony DSC-W310' : (m.Make === 'OPPO' || /Find X9 Pro/.test(m.Model || '')) ? 'OPPO Find X9 Pro' : m.Model;
  image.camera = model || null;
  const parts = [model];
  if(m.FocalLength) parts.push(m.FocalLength.replace(/\.0 mm$/,'mm').replace(/ mm$/,'mm'));
  if(m.FNumber) parts.push(`f/${m.FNumber}`);
  if(m.ExposureTime) parts.push(`${m.ExposureTime}s`);
  if(m.ISO) parts.push(`ISO ${m.ISO}`);
  image.exif = parts.filter(Boolean).join(' · ') || null;
  if (slug === 'include-this-pic') image.original = 'assets/originals/include-this-pic.jpg';
  manifest.images[slug] = image;
}
manifest.video.captureDate='2026-07';manifest.video.dateSource='user';
manifest.video.caption='8th sc signing out.';
const orientationMeta = JSON.parse(execFileSync('exiftool', ['-j', '-CreateDate', resolve(source, 'Biography', 'see u @ ori tmr.mp4')], {encoding:'utf8'}))[0];
manifest.videos = {
  'signing-out': manifest.video,
  orientation: {
    slug: 'orientation',
    mp4: 'assets/video/orientation.mp4',
    poster: 'assets/video/orientation-poster.webp',
    caption: 'see u @ ori tmr',
    captureDate: orientationMeta.CreateDate?.slice(0,10).replaceAll(':','-') || null,
    dateSource: orientationMeta.CreateDate ? 'CreateDate' : 'unknown',
  },
};
writeFileSync(resolve(root,'js/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
writeFileSync(resolve(root,'js/manifest.js'),'window.MANIFEST = '+JSON.stringify(manifest)+';\n');
console.log(`Metadata refreshed; ${mappings.length} source images checked.`);
