/* nelss.xyz — rendering, lightbox, reveals */
(function () {
  'use strict';

  var M = window.MANIFEST;
  var S = window.SITE;
  var IMG = M.images;
  document.documentElement.classList.add('js-ready');

  function srcset(slug, ext) {
    return IMG[slug].widths.map(function (w) {
      return 'assets/img/' + slug + '-' + w + '.' + ext + ' ' + w + 'w';
    }).join(', ');
  }

  function picture(slug, alt, sizes, eager) {
    var m = IMG[slug];
    var biggest = m.widths[m.widths.length - 1];
    var load = eager ? 'eager' : 'lazy';
    return (
      '<picture>' +
        (m.formats && !m.formats.includes('avif') ? '' : '<source type="image/avif" sizes="' + sizes + '" srcset="' + srcset(slug, 'avif') + '">') +
        '<source type="image/webp" sizes="' + sizes + '" srcset="' + srcset(slug, 'webp') + '">' +
        '<img src="assets/img/' + slug + '-' + biggest + '.webp" width="' + m.w + '" height="' + m.h +
          '" loading="' + load + '" decoding="async" alt="' + esc(alt || '') + '">' +
      '</picture>'
    );
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mediaButton(opts) {
    var sizes = opts.sizes;
    var label = opts.alt || opts.caption || 'photograph';
    return '<button class="media-btn" type="button" data-slug="' + opts.slug + '" data-group="' + opts.group +
      '" data-alt="' + esc(opts.alt || '') + '" data-date="' + esc(opts.date || '') +
      '" data-caption="' + esc(opts.caption || '') + '" style="max-width:' + Math.floor(IMG[opts.slug].w / 2) + 'px;margin-inline:auto" aria-label="View: ' + esc(label) + '">' +
      picture(opts.slug, opts.alt, sizes, opts.eager) + '</button>';
  }

  /* ---------- work ---------- */
  function renderWork() {
    document.getElementById('work-grid').innerHTML = S.work.map(function (p) {
      var links = p.links.map(function (l) {
        return '<a href="' + l.href + '" target="_blank" rel="noopener">' + esc(l.label) + ' ↗</a>';
      }).join('');
      return '<article class="work__item reveal">' +
        '<span class="work__no">' + esc(p.no) + '</span>' +
        '<div class="work__heading"><h3>' + esc(p.title) + '</h3>' +
          '<span class="work__subtitle">' + esc(p.subtitle) + '</span></div>' +
        '<p class="work__description">' + esc(p.blurb) + '</p>' +
        '<div class="links">' + links + '</div>' +
      '</article>';
    }).join('');

  }

  /* ---------- timeline ---------- */
  function renderTimeline() {
    document.getElementById('timeline').innerHTML = S.timeline.map(function (event, index) {
      var photos = event.items.map(function (slug) {
        var m = IMG[slug];
        var date = m.captureDate || '';
        var displayDate = date ? new Date(date + (date.length === 7 ? '-01' : '') + 'T12:00:00Z').toLocaleDateString('en-SG',{month:'short',year:'numeric',timeZone:'UTC'}) : '';
        var caption = (m.caption || '').toLowerCase();
        var showCaption = event.showCaptions !== false && !(event.hideCaptions || []).includes(slug);
        return '<figure class="memory-photo' + (m.h > m.w ? ' memory-photo--portrait' : '') + '">' +
          mediaButton({slug:slug,group:'life',alt:caption,sizes:'(min-width:850px) 320px, 45vw',date:displayDate,caption:showCaption ? caption : ''}) +
          '<figcaption>' + (showCaption ? esc(caption) : '') + '<time datetime="' + esc(date) + '">' + esc(displayDate) + '</time></figcaption></figure>';
      }).join('');
      var clip = event.video ? (M.videos || {})[event.video] || M.video : null;
      var clipDate = clip && clip.captureDate ? new Date(clip.captureDate + (clip.captureDate.length === 7 ? '-01' : '') + 'T12:00:00Z').toLocaleDateString('en-SG',{month:'short',year:'numeric',timeZone:'UTC'}).toLowerCase() : '';
      var video = clip ? '<figure class="memory-video"><div class="tl__video">' +
        '<video src="' + clip.mp4 + '" poster="' + clip.poster + '" muted loop playsinline preload="metadata" controls aria-label="' + esc(clip.caption || '8th sc signing out.') + '"></video></div>' +
        '<figcaption><span>' + esc(clip.caption || '8th sc signing out.') + (clipDate ? ' · ' + esc(clipDate) : '') + '</span><button class="video-sound" type="button" aria-pressed="false">Turn sound on ↗</button></figcaption></figure>' : '';
      return '<li class="memory-event" id="memory-' + index + '"><article class="memory-event__layout">' +
        '<div class="memory-event__story reveal"><span class="memory-event__period">' + esc(event.period) + '</span>' +
        '<h3>' + esc(event.title) + '</h3><p>' + esc(event.text) + '</p>' +
        (event.link ? '<a class="memory-event__link" href="' + esc(event.link.href) + '" target="_blank" rel="noopener">' + esc(event.link.label) + '</a>' : '') + '</div>' +
        '<div class="memory-event__gallery reveal" data-count="' + event.items.length + '">' + video + photos + '</div></article></li>';
    }).join('');
  }

  var syncMemoryVideo = function () {};
  function setupMemoryVideo() {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var syncs = [];
    document.querySelectorAll('.memory-video').forEach(function (figure) {
      var video = figure.querySelector('video');
      var sound = figure.querySelector('.video-sound');
      var inView = false;
      function sync() {
        if (inView && !document.hidden && document.getElementById('lightbox').hidden && !reduceMotion.matches) {
          var attempt = video.play();
          if (attempt) attempt.catch(function () {});
        } else video.pause();
      }
      syncs.push(sync);
      sound.addEventListener('click', function () {
        video.muted = !video.muted;
        var attempt = video.play();
        if (attempt) attempt.catch(function () {});
      });
      video.addEventListener('volumechange', function () {
        var audible = !video.muted && video.volume > 0;
        sound.textContent = audible ? 'Mute sound' : 'Turn sound on ↗';
        sound.setAttribute('aria-pressed', String(audible));
      });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          inView = entries[0].isIntersecting && entries[0].intersectionRatio >= .35;
          sync();
        }, {threshold:[0,.35]}).observe(video);
      }
    });
    syncMemoryVideo = function () { syncs.forEach(function (sync) { sync(); }); };
    document.addEventListener('visibilitychange', syncMemoryVideo);
    reduceMotion.addEventListener('change', syncMemoryVideo);
  }

  /* ---------- lens ---------- */
  function renderLens() {
    document.getElementById('lens-grid').innerHTML = S.lens.map(function (item) {
      var m = IMG[item.slug];
      var line = m.exif ? '<span class="exif">' + esc(m.exif) + '</span>' : '';
      var orientation = m.w >= m.h ? ' lens__landscape' : ' lens__portrait';
      return '<figure class="reveal lens__figure' + orientation + '" style="max-width:' + Math.floor(m.w / 2) + 'px">' + mediaButton({
        slug: item.slug, group: 'lens', alt: item.alt,
        sizes: '(min-width:720px) 46vw, 100vw',
      }) + line + '</figure>';
    }).join('');
  }

  /* ---------- contact ---------- */
  function renderContact() {
    var c = S.contact;
    var out = [];
    if (c.email) out.push('<a href="mailto:' + c.email + '">Email</a>');
    if (c.github) out.push('<a href="' + c.github + '" target="_blank" rel="noopener">GitHub ↗</a>');
    document.getElementById('contact-links').innerHTML = out.join('');
    document.getElementById('year').textContent = new Date().getFullYear();
  }

  /* ---------- reveal ---------- */
  function setupReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- lightbox ---------- */
  var returnFocus;
  var lb, lbImg, lbMeta, lbOrig, groups = { life: [], lens: [] }, cur = { group: null, i: 0 };

  function collectGroup(group) {
    return Array.prototype.slice.call(
      document.querySelectorAll('.media-btn[data-group="' + group + '"]')
    );
  }

  function open(group, i) {
    groups[group] = collectGroup(group);
    cur = { group: group, i: i };
    returnFocus = document.activeElement;
    show();
    lb.hidden = false;
    syncMemoryVideo();
    document.querySelector('main').inert = true;
    document.getElementById('rail').inert = true;
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { document.getElementById('lb-close').focus(); }, 0);
  }

  function close() {
    lb.classList.remove('is-open');
    lb.hidden = true;
    syncMemoryVideo();
    document.body.style.overflow = '';
    document.querySelector('main').inert = false;
    document.getElementById('rail').inert = false;
    if (returnFocus) returnFocus.focus();
  }

  function move(d) {
    var list = groups[cur.group];
    cur.i = (cur.i + d + list.length) % list.length;
    show();
  }

  function show() {
    var list = groups[cur.group];
    var btn = list[cur.i];
    var slug = btn.getAttribute('data-slug');
    var m = IMG[slug];
    var biggest = m.widths[m.widths.length - 1];
    lbImg.srcset = 'assets/img/' + slug + '-' + biggest + '.webp';
    lbImg.src = 'assets/img/' + slug + '-' + biggest + '.webp';
    lbImg.alt = btn.getAttribute('data-alt') || '';
    lbImg.style.setProperty('--image-max-width', Math.floor(m.w / 2) + 'px');
    lbImg.style.setProperty('--image-max-height', Math.floor(m.h / 2) + 'px');
    var bits = [];
    var date = btn.getAttribute('data-date');
    var caption = btn.getAttribute('data-caption');
    if (date) bits.push(date);
    if (caption) bits.push(caption);
    if (cur.group === 'lens' && m.exif) bits.push(m.exif);
    lbMeta.textContent = bits.join('  ·  ');
    lbOrig.innerHTML = m.original
      ? '<a href="' + m.original + '" target="_blank" rel="noopener">View original' + (m.hdr ? ' (HDR)' : '') + ' ↗</a>'
      : '';
    var many = list.length > 1;
    document.getElementById('lb-prev').hidden = !many;
    document.getElementById('lb-next').hidden = !many;
  }

  function setupLightbox() {
    lb = document.getElementById('lightbox');
    lbImg = document.getElementById('lb-img');
    lbMeta = document.getElementById('lb-meta');
    lbOrig = document.getElementById('lb-original');

    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.media-btn') : null;
      if (btn) {
        var list = collectGroup(btn.getAttribute('data-group'));
        open(btn.getAttribute('data-group'), list.indexOf(btn));
      }
    });
    document.getElementById('lb-close').addEventListener('click', close);
    document.getElementById('lb-prev').addEventListener('click', function () { move(-1); });
    document.getElementById('lb-next').addEventListener('click', function () { move(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb__stage')) close(); });

    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Tab') {
        var focusable = Array.from(lb.querySelectorAll('button:not([hidden]), a[href]'));
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') move(-1);
      else if (e.key === 'ArrowRight') move(1);
    });
  }

  /* ---------- hero name + rail nav ---------- */
  function renderName() {
    var el = document.getElementById('hero-name');
    if (el && window.NAME_SVG) el.innerHTML = window.NAME_SVG;
  }

  function renderRail() {
    var secs = Array.prototype.slice.call(document.querySelectorAll('[data-section]'));
    document.getElementById('rail').innerHTML = secs.map(function (s) {
      var label = s.getAttribute('data-section');
      return '<button class="rail__btn" type="button" data-target="' + s.id +
        '" aria-label="go to ' + esc(label) + '">' +
        '<span class="rail__label">' + esc(label) + '</span>' +
        '<span class="rail__dot"></span></button>';
    }).join('');
    return secs;
  }

  function setupNav(secs) {
    var rail = document.getElementById('rail');
    var currentIndex = 0;
    var suppressClick = false;
    function goTo(id) {
      var el = document.getElementById(id);
      if (!el) return;
      activate(id);
      var behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      if (id === 'top') window.scrollTo({top:0, behavior:behavior});
      else el.scrollIntoView({behavior:behavior, block:'start'});
    }
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-target]') : null;
      if (!t) return;
      if (suppressClick && e.detail > 0 && rail.contains(t)) { suppressClick = false; return; }
      goTo(t.getAttribute('data-target'));
    });

    var btns = {};
    Array.prototype.forEach.call(document.querySelectorAll('.rail__btn'), function (b) {
      btns[b.getAttribute('data-target')] = b;
    });
    function activate(id) {
      currentIndex = secs.findIndex(function (s) { return s.id === id; });
      Object.keys(btns).forEach(function (k) { btns[k].classList.toggle('is-active', k === id); if(k === id) btns[k].setAttribute('aria-current','location'); else btns[k].removeAttribute('aria-current'); });
    }
    var wheelTotal = 0;
    var wheelTime = 0;
    var wheelUntil = 0;
    rail.addEventListener('wheel', function (e) {
      if (e.ctrlKey) return;
      e.preventDefault();
      var now = performance.now();
      if (now < wheelUntil) return;
      if (now - wheelTime > 180) wheelTotal = 0;
      wheelTime = now;
      wheelTotal += e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      if (Math.abs(wheelTotal) < 30) return;
      var next = Math.max(0, Math.min(secs.length - 1, currentIndex + (wheelTotal > 0 ? 1 : -1)));
      wheelTotal = 0;
      wheelUntil = now + 650;
      goTo(secs[next].id);
    }, {passive:false});
    var drag = null;
    function clearDrag() {
      drag = null;
      rail.classList.remove('is-dragging');
      document.body.classList.remove('rail-dragging');
    }
    function selectAt(y) {
      var closest = secs.reduce(function (best, section) {
        var rect = btns[section.id].getBoundingClientRect();
        var distance = Math.abs(y - (rect.top + rect.height / 2));
        return !best || distance < best.distance ? {id:section.id, distance:distance} : best;
      }, null);
      if (closest.id !== secs[currentIndex].id) goTo(closest.id);
    }
    rail.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      suppressClick = false;
      drag = {id:e.pointerId, y:e.clientY, moved:false};
      rail.classList.add('is-dragging');
      document.body.classList.add('rail-dragging');
      rail.setPointerCapture(e.pointerId);
    });
    rail.addEventListener('pointermove', function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      if (Math.abs(e.clientY - drag.y) > 6) drag.moved = true;
      if (drag.moved) selectAt(e.clientY);
    });
    function finishDrag(e) {
      if (!drag || drag.id !== e.pointerId) return;
      // Pointer capture retargets clicks to the rail, so handle taps here too.
      selectAt(e.clientY);
      suppressClick = true;
      clearDrag();
    }
    rail.addEventListener('pointerup', finishDrag);
    rail.addEventListener('pointercancel', clearDrag);
    rail.addEventListener('lostpointercapture', clearDrag);
    window.addEventListener('blur', clearDrag);
    document.addEventListener('visibilitychange', function () { if (document.hidden) clearDrag(); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) activate(en.target.id); });
      }, { rootMargin: '-49% 0px -49% 0px', threshold: 0 });
      secs.forEach(function (s) { io.observe(s); });
    }
    window.addEventListener('scroll', function () {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        activate(secs[secs.length - 1].id);
      }
    }, { passive: true });
    activate(secs[0].id);
  }

  // Use Singapore's calendar date so the age changes on 1 February locally.
  function updateAge() {
    var parts = new Intl.DateTimeFormat('en', {timeZone:'Asia/Singapore',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date());
    var date = {};
    parts.forEach(function (p) { if (p.type !== 'literal') date[p.type] = Number(p.value); });
    document.getElementById('age').textContent = date.year - 2008 - (date.month < 2 ? 1 : 0);
  }

  /* ---------- boot ---------- */
  updateAge();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) updateAge(); });
  renderName();
  var sections = renderRail();
  renderWork();
  renderTimeline();
  renderLens();
  renderContact();
  setupReveal();
  setupLightbox();
  setupMemoryVideo();
  setupNav(sections);
})();
