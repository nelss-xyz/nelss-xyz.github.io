# Nelson's personal site

A single scrolling portfolio in HTML, CSS, and vanilla JavaScript. No React, Svelte, package installation, or application build is needed. Serve this folder directly; the existing CNAME and GitHub Pages `.nojekyll` remain in place.

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765.

The sequence is hero → projects → achievements and experiences → event photo journal → photography → contact. The animated handwritten name comes from the original React homepage. The X-Pan photograph provides the opening's visual identity. The event journal pairs personal stories with related photographs in their natural aspect ratios; the photography gallery follows a curated sequence from dusk through streets and daylight to a quiet classroom image. The interface stays near monochrome.

The previous site combined a React landing page, a Svelte project list, and several older standalone experiments with different navigation and visual styles. A single typography, spacing, and navigation system makes the new page feel coherent. Old projects remain under `legacy/`, without links from the portfolio.

References: [Rauno Freiberg](https://rauno.me/) for careful interaction and concise navigation; [Brian Lovin](https://brianlovin.com/) for a direct personal introduction and a focused project list. These are directions for restraint and personality, rather than copied layouts.

## Editing

- `index.html`: page structure and hero.
- `css/styles.css`: responsive layout and near-monochrome interface.
- `js/data.js`: projects, contact links, event stories and photo selection, and photography order.
- `js/manifest.json` / `js/manifest.js`: image dimensions, EXIF, dates, and responsive files.
- `js/main.js`: rendering, section markers, and keyboard-accessible lightbox.

JavaScript populates project and photo collections. The HTML includes a notice for visitors with JavaScript disabled. No framework runtime is used. Fonts load from Google Fonts with local font fallbacks.

## Original files and metadata

Masters in `/Users/nels/Pictures/Website Showcase` are read only by the asset scripts. Eight HDR masters are copied verbatim into `assets/hdr`; their embedded gain maps remain intact. The DSC-W310 classroom original is also copied verbatim into `assets/originals` to retain its real EXIF. Responsive previews are separate files. Gallery and lightbox image display widths are capped at half the source width, giving a conservative limit for low-resolution pictures on high-density displays.

`node tools/read-metadata.mjs` refreshes EXIF and dates without re-encoding images. Dates use `DateTimeOriginal`, except the user's overrides: biography NDP photos August 2023, 3 Progs ICs January 2026, 4 Fuji July 2024, PSL March 2024, Xinyao June 2026, and signing out July 2026. Photography NDP images retain their actual August 2024 metadata. All selected journal dates are known. Captions derive from filenames; photography has descriptive accessibility text but no visible captions.

`node tools/optimize.mjs` regenerates responsive previews using exiftool, ffmpeg, cwebp, and macOS sips. It does not overwrite the masters. The signing-out and orientation videos are separate 720p derivatives with audio and native playback controls. Each plays muted when at least 35% visible, pauses when outside the viewport, when the page is hidden, or when the lightbox opens. A sound button enables audio after a click. Reduced-motion preferences disable automatic playback. The eight HDR originals are offered on demand from the lightbox; HDR rendering depends on the viewing browser and display.

Validation: desktop and phone browser checks, section navigation, lightbox EXIF, keyboard focus wrapping and Escape, responsive asset existence, video audio stream, and SHA-256 / byte comparison against all original files. No page errors or horizontal overflow observed at tested sizes.
