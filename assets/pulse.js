/* shellerville · pulse
   the small live touches that sit on top of the motion kit (load after motion.js)
   - home: a greeting that knows what time it is, opening the lede
   - home: the yellow sun sits where the real one would be right now
   - home: the last word of the headline swaps through a short list, then settles
   - lab: an experiment card plays a silent loop on hover when it has one (data-loop on .ph)
   - respects prefers-reduced-motion: greeting and sun still set, nothing moves */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- greeting + sun, both off the visitor's own clock
  var hello = document.querySelector('.hero .hello');
  var sun = document.querySelector('.hero .sun-pos');
  function greeting(h) {
    if (h < 3) return 'Still up. Bold choice.';
    if (h < 6) return "You're up early. So am I.";
    if (h < 12) return 'Good morning.';
    if (h < 17) return 'Good afternoon.';
    if (h < 21) return 'Good evening.';
    return 'Still up. Bold choice.';
  }
  // hour of day -> sun height in the hero art (410 is the resting spot on the dome, 625 is fully behind it)
  var path = [[0, 625], [3, 625], [4.5, 500], [6, 440], [9, 340], [12, 260], [14, 250], [17, 330], [19, 440], [21, 560], [22, 625], [24, 625]];
  function sunY(h) {
    for (var i = 1; i < path.length; i++) {
      if (h <= path[i][0]) {
        var a = path[i - 1], b = path[i];
        return a[1] + (b[1] - a[1]) * ((h - a[0]) / (b[0] - a[0]));
      }
    }
    return 625;
  }
  function tick() {
    var now = new Date(), h = now.getHours() + now.getMinutes() / 60;
    if (hello) hello.textContent = greeting(h) + ' ';
    if (sun) sun.style.transform = 'translateY(' + Math.round(sunY(h) - 410) + 'px)';
  }
  if (hello || sun) {
    if (hello) hello.textContent = greeting(new Date().getHours()) + ' ';
    // let the sun rise with the rest of the art first, then travel to where it belongs
    if (reduce) tick(); else setTimeout(tick, 700);
    setInterval(tick, 10 * 60 * 1000);
  }

  if (reduce) return;

  // ---- headline: swap the last word, underline it, land back on the first one
  var swap = document.querySelector('.hero .swap');
  var mask = swap && swap.querySelector('.w');
  var first = mask && mask.firstElementChild;
  if (first) {
    var words = [first], i = 0;
    (swap.getAttribute('data-words') || '').split(',').forEach(function (t) {
      t = t.trim(); if (!t) return;
      var s = document.createElement('span');
      s.className = 'alt'; s.textContent = t; s.setAttribute('aria-hidden', 'true');
      mask.appendChild(s); words.push(s);
    });
    first.classList.add('on');
    mask.classList.add('rot');
    var next = function () {
      var cur = words[i], nxt = words[(i + 1) % words.length];
      cur.style.animation = 'none'; // hand the word over from its entrance animation
      cur.classList.remove('on', 'u'); cur.classList.add('out');
      nxt.classList.add('on');
      setTimeout(function () { nxt.classList.add('u'); }, 380);
      setTimeout(function () { cur.classList.add('snap'); cur.classList.remove('out'); void cur.offsetWidth; cur.classList.remove('snap'); }, 760);
      i = (i + 1) % words.length;
      if (i !== 0) setTimeout(next, 2500); // one full loop, then it rests
    };
    setTimeout(function () { first.classList.add('u'); }, 1600);
    if (words.length > 1) setTimeout(next, 4000);
  }

  // ---- lab: silent loop on hover, only for cards that have one
  Array.prototype.forEach.call(document.querySelectorAll('.exp .ph[data-loop]'), function (ph) {
    var card = ph.closest('.exp'), v = null;
    card.addEventListener('pointerenter', function () {
      if (!v) {
        v = document.createElement('video');
        v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
        v.setAttribute('aria-hidden', 'true'); v.src = ph.getAttribute('data-loop');
        ph.appendChild(v);
      }
      var p = v.play();
      if (p && p.then) p.then(function () { card.classList.add('playing'); }).catch(function () {});
    });
    card.addEventListener('pointerleave', function () { card.classList.remove('playing'); if (v) v.pause(); });
  });
})();

/* ---------- play: things you can touch ---------- */
(function () {
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var COLORS = ['#EB1000', '#FFBE00', '#EE93AC', '#0887A0', '#198F51', '#F2EFE9'];

  // ---- every hero: drag the shapes, double-click to recolor, make a mess
  // ---- heroes marked data-builder also get a tray: add shapes and doodles, resize, spin, recolor, save a PNG
  // hero = the box that holds the controls, art = the wrapper around the svg, frame = the box a saved PNG covers,
  // fixed = the tray is always open (the lab's hero kit)
  var stage = function (hero, art, frame, fixed) {
  var svg = art && art.querySelector('svg');
  var layers = svg ? Array.prototype.slice.call(svg.querySelectorAll('.depth')) : [];
  if (layers.length) {
    var NS = 'http://www.w3.org/2000/svg', grabs = [], messy = false, picked = null, tools = null, nextColor = 0;
    var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
    var mk = function (tag, attrs) { var n = document.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); return n; };
    var el = function (tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html) n.innerHTML = html; return n; };
    var icon = function (d) { return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
    var put = function (o) { o.el.style.transform = 'translate(' + o.x + 'px,' + o.y + 'px) rotate(' + o.r + 'deg) scale(' + o.s + ')'; };
    var paintable = function (g) {
      var all = g.querySelectorAll('[fill],[stroke]'), i;
      for (i = 0; i < all.length; i++) if (COLORS.indexOf((all[i].getAttribute('fill') || '').toUpperCase()) > -1) return [all[i], 'fill'];
      for (i = 0; i < all.length; i++) if (COLORS.indexOf((all[i].getAttribute('stroke') || '').toUpperCase()) > -1) return [all[i], 'stroke'];
      return null;
    };
    var recolor = function (o) { var p = paintable(o.el); if (p) p[0].setAttribute(p[1], COLORS[(COLORS.indexOf(p[0].getAttribute(p[1]).toUpperCase()) + 1) % COLORS.length]); };

    layers.forEach(function (d) {
      var g = mk('g', { 'class': 'grab' });
      while (d.firstChild) g.appendChild(d.firstChild);
      d.appendChild(g);
      var o = { el: g, x: 0, y: 0, r: 0, s: 1, paint: [] };
      each(g.querySelectorAll('[fill]'), function (n) { o.paint.push([n, n.getAttribute('fill')]); });
      grabs.push(o);
    });

    var bar = el('div', 'play-bar'); hero.appendChild(bar);
    var btn = el('button', 'mess'); btn.type = 'button'; bar.appendChild(btn);
    var label = function () {
      btn.innerHTML = icon(messy ? '<path d="M2.5 8a5.5 5.5 0 1 0 1.8-4.1M2.5 2.5v3h3"/>' : '<path d="M2 5c2-3 4 3 6 0s4 3 6 0M2 11c2-3 4 3 6 0s4 3 6 0"/>') + (messy ? 'Tidy up' : 'Make a mess');
    };
    label();
    var busy = function () { art.classList.add('busy'); clearTimeout(busy.t); busy.t = setTimeout(function () { art.classList.remove('busy'); }, 1200); };
    var place = function () {
      if (!tools) return;
      if (!picked || !hero.classList.contains('building')) { tools.hidden = true; return; }
      tools.hidden = false;
      var r = picked.el.getBoundingClientRect(), h = hero.getBoundingClientRect(), w = tools.offsetWidth;
      tools.style.left = Math.max(8, Math.min(h.width - w - 8, r.left + r.width / 2 - h.left - w / 2)) + 'px';
      tools.style.top = Math.max(8, r.top - h.top - 48) + 'px';
    };
    var follow = function () { [0, 350, 950].forEach(function (t) { setTimeout(place, t); }); };
    var pick = function (o) { if (picked) picked.el.classList.remove('picked'); picked = o; if (o) o.el.classList.add('picked'); place(); };
    var tidy = function () {
      grabs = grabs.filter(function (o) { if (o.added) { o.el.parentNode.removeChild(o.el); return false; } return true; });
      grabs.forEach(function (o, i) {
        o.el.style.display = ''; o.gone = false; o.el.style.transitionDelay = (i * 0.05) + 's';
        o.x = o.y = o.r = 0; o.s = 1; o.paint.forEach(function (p) { p[0].setAttribute('fill', p[1]); }); put(o);
      });
      pick(null); messy = false; label();
    };
    btn.addEventListener('click', function () {
      busy();
      if (messy) { tidy(); return; }
      var vb = svg.viewBox.baseVal, w = vb.width || 600, h = vb.height || 700;
      grabs.forEach(function (o, i) {
        o.el.style.transitionDelay = (i * 0.05) + 's';
        o.x = Math.round((Math.random() * 0.7 - 0.55) * w);
        o.y = Math.round((Math.random() * 0.5 - 0.32) * h);
        o.r = [-90, 0, 90, 180][Math.floor(Math.random() * 4)] + Math.round(Math.random() * 30 - 15);
        put(o);
      });
      messy = true; label(); follow();
    });

    if (fine) {
      svg.classList.add('playable');
      var arm = function (o) {
        var g = o.el, sx, sy, ox, oy, k, held = false, moved = false;
        g.addEventListener('pointerdown', function (e) {
          var m = svg.getScreenCTM(); k = m && m.a ? 1 / m.a : 1;
          held = true; moved = false; sx = e.clientX; sy = e.clientY; ox = o.x; oy = o.y;
          g.style.transitionDelay = '0s'; g.classList.add('held'); art.classList.add('busy');
          pick(o); if (tools) tools.hidden = true;
          try { g.setPointerCapture(e.pointerId); } catch (err) {}
          e.preventDefault();
        });
        g.addEventListener('pointermove', function (e) {
          if (!held) return;
          if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 3) moved = true;
          o.x = ox + (e.clientX - sx) * k; o.y = oy + (e.clientY - sy) * k; put(o);
        });
        var drop = function () {
          if (!held) return; held = false; g.classList.remove('held'); art.classList.remove('busy');
          if (moved) { o.r += Math.round(Math.random() * 16 - 8); put(o); if (!messy) { messy = true; label(); } } // lands a little crooked, like a paper cutout
          follow();
        };
        g.addEventListener('pointerup', drop); g.addEventListener('pointercancel', drop);
        g.addEventListener('dblclick', function () { recolor(o); });
      };
      grabs.forEach(arm);
      // one small wiggle so people know the art is theirs to move
      setTimeout(function () { var o = grabs[grabs.length - 2] || grabs[0]; o.el.classList.add('hint'); setTimeout(function () { o.el.classList.remove('hint'); }, 1100); }, 2600);

      if (hero.hasAttribute('data-builder')) {
        // the kit: plain shapes drawn here, doodles borrowed from the page itself
        var kit = [
          ['Circle', '<circle r="90"/>'],
          ['Half circle', '<path d="M-110 55a110 110 0 0 1 220 0z"/>'],
          ['Quarter ring', '<path d="M-110 -110A220 220 0 0 0 110 110V22A132 132 0 0 1 -22 -110Z"/>'],
          ['Pill', '<rect x="-130" y="-32" width="260" height="64" rx="32"/>'],
          ['Block', '<rect x="-70" y="-115" width="140" height="230"/>'],
          ['Diamond', '<path d="M0 -110 110 0 0 110 -110 0z"/>'],
          ['Dot', '<circle r="34"/>']
        ].map(function (k) { return { name: k[0], geo: k[1] }; });
        each(document.querySelectorAll('[data-doodle]'), function (src) {
          var t = mk('g', {}); each(src.children, function (n) { t.appendChild(n.cloneNode(true)); });
          svg.appendChild(t); var bb = t.getBBox(), s = 170 / Math.max(bb.width, bb.height, 1);
          t.setAttribute('transform', 'scale(' + s + ') translate(' + (-(bb.x + bb.width / 2)) + ' ' + (-(bb.y + bb.height / 2)) + ')');
          svg.removeChild(t); kit.push({ name: src.getAttribute('data-doodle'), doodle: t });
        });
        var ink = function (g, shape, hole) { // one color for the drawing, another for any knocked-out holes
          each(g.querySelectorAll('*'), function (n) {
            var f = (n.getAttribute('fill') || '').toLowerCase(), st = (n.getAttribute('stroke') || '').toLowerCase();
            if (f && f !== 'none') n.setAttribute('fill', f === '#000' ? hole : shape);
            if (st && st !== 'none') n.setAttribute('stroke', shape);
          });
          return g;
        };
        var draw = function (item, color) {
          if (item.doodle) return ink(item.doodle.cloneNode(true), color || '#F2EFE9', color ? '#fff' : '#000');
          var g = mk('g', {}); g.innerHTML = item.geo; g.firstChild.setAttribute('fill', color || COLORS[nextColor++ % COLORS.length]); return g;
        };
        var add = function (item) {
          var vb = svg.viewBox.baseVal, g = mk('g', { 'class': 'grab added' }), inner = mk('g', { 'class': 'pop-in' });
          inner.appendChild(draw(item)); g.appendChild(inner); svg.appendChild(g);
          var o = { el: g, added: true, paint: [], s: 1,
            x: vb.x + vb.width * (0.12 + Math.random() * 0.6), y: vb.y + vb.height * (0.3 + Math.random() * 0.45),
            r: item.doodle ? Math.round(Math.random() * 30 - 15) : [0, 90, 180, 270][Math.floor(Math.random() * 4)] };
          g.style.transition = 'none'; put(o); void g.getBoundingClientRect(); g.style.transition = '';
          grabs.push(o); arm(o); pick(o); follow(); messy = true; label();
        };

        var build = el('button', 'mess build'); build.type = 'button'; bar.insertBefore(build, btn);
        var tray = el('div', 'tray'); tray.hidden = true; hero.appendChild(tray);
        var row = el('div', 'tray-kit'); tray.appendChild(row);
        kit.forEach(function (item) {
          var b = el('button'); b.type = 'button'; b.setAttribute('aria-label', 'Add ' + item.name.toLowerCase()); b.title = item.name;
          var th = mk('svg', { viewBox: '-140 -140 280 280', 'aria-hidden': 'true' }); th.appendChild(draw(item, '#000')); b.appendChild(th);
          b.addEventListener('click', function () { add(item); }); row.appendChild(b);
        });
        var note2 = el('p', 'tray-note'); note2.textContent = hero.getAttribute('data-builder') || ''; tray.appendChild(note2);
        var acts = el('div', 'tray-acts'); tray.appendChild(acts);
        var wipe = el('button', '', 'Start from scratch'); wipe.type = 'button'; acts.appendChild(wipe);
        var keep = el('button', '', 'Save it as a PNG'); keep.type = 'button'; acts.appendChild(keep);
        var open = function (on) {
          hero.classList.toggle('building', on); tray.hidden = !on;
          build.innerHTML = icon(on ? '<path d="M3 8.5l3.5 3.5L13 4.5"/>' : '<path d="M8 3v10M3 8h10"/>') + (on ? 'Done' : 'Build your own');
          if (!on) pick(null); else place();
        };
        open(false);
        if (fixed) { open(true); bar.parentNode.removeChild(bar); btn.className = ''; acts.insertBefore(btn, wipe); }
        build.addEventListener('click', function () { open(tray.hidden); });
        wipe.addEventListener('click', function () {
          grabs = grabs.filter(function (o) { if (o.added) { o.el.parentNode.removeChild(o.el); return false; } o.el.style.display = 'none'; o.gone = true; return true; });
          pick(null); messy = true; label();
        });

        tools = el('div', 'shape-tools'); tools.hidden = true; hero.appendChild(tools);
        [['Smaller', '<path d="M3 8h10"/>', function (o) { o.s = Math.max(0.3, o.s / 1.25); }],
         ['Bigger', '<path d="M8 3v10M3 8h10"/>', function (o) { o.s = Math.min(3.2, o.s * 1.25); }],
         ['Spin', '<path d="M13.5 8a5.5 5.5 0 1 1-1.8-4.1M13.5 2.5v3h-3"/>', function (o) { o.r += 45; }],
         ['New color', '<circle cx="8" cy="8" r="5" fill="currentColor"/>', function (o) { recolor(o); }],
         ['Remove', '<path d="M4 4l8 8M12 4l-8 8"/>', function (o) {
           if (o.added) { o.el.parentNode.removeChild(o.el); grabs.splice(grabs.indexOf(o), 1); } else { o.el.style.display = 'none'; o.gone = true; }
           pick(null);
         }]].forEach(function (t) {
          var b = el('button', '', icon(t[1])); b.type = 'button'; b.setAttribute('aria-label', t[0]); b.title = t[0];
          b.addEventListener('click', function () { if (!picked) return; var o = picked; o.el.style.transitionDelay = '0s'; t[2](o); if (picked) { put(o); follow(); } if (!messy) { messy = true; label(); } });
          tools.appendChild(b);
        });
        hero.addEventListener('pointerdown', function (e) { if (!e.target.closest('.grab,.shape-tools,.tray,.play-bar')) pick(null); });

        // flatten what is on screen into one picture: every shape with its final position, on the hero color
        keep.addEventListener('click', function () {
          var hr = frame.getBoundingClientRect(), W = Math.round(hr.width), H = Math.round(hr.height);
          var out = mk('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H });
          out.appendChild(mk('rect', { width: W, height: H, fill: getComputedStyle(frame).backgroundColor }));
          each(svg.querySelectorAll('path,circle,rect,ellipse,polygon'), function (n) {
            if (n.closest('defs,clipPath') || !n.getClientRects().length) return;
            var m = n.getScreenCTM(), cs = getComputedStyle(n), c = n.cloneNode(false);
            c.removeAttribute('class'); c.removeAttribute('style');
            c.setAttribute('transform', 'matrix(' + [m.a, m.b, m.c, m.d, m.e - hr.left, m.f - hr.top].join(' ') + ')');
            c.setAttribute('fill', cs.fill); c.setAttribute('stroke', cs.stroke); c.setAttribute('stroke-width', cs.strokeWidth);
            c.setAttribute('stroke-linecap', cs.strokeLinecap); c.setAttribute('stroke-linejoin', cs.strokeLinejoin);
            out.appendChild(c);
          });
          var url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(out)], { type: 'image/svg+xml' })), img = new Image();
          img.onload = function () {
            var cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2;
            cv.getContext('2d').drawImage(img, 0, 0, W * 2, H * 2); URL.revokeObjectURL(url);
            cv.toBlob(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'my-shellerville-hero.png'; document.body.appendChild(a); a.click(); a.remove(); }, 'image/png');
          };
          img.src = url;
        });
      }
    }
  }
  };
  var heroEl = document.querySelector('.hero');
  if (heroEl) stage(heroEl, heroEl.querySelector('.hero-art'), heroEl, false);
  Array.prototype.forEach.call(document.querySelectorAll('.herokit'), function (k) { var a = k.querySelector('.stage-art'); stage(k, a, a, true); });

  // ---- footer: wordmark letters jump under the cursor, the dot boings on click
  var wm = document.querySelector('.wordmark');
  if (wm) {
    wm.addEventListener('pointerenter', function () {
      Array.prototype.forEach.call(wm.querySelectorAll('span,i'), function (s) { s.style.transitionDelay = '0s'; });
      wm.classList.add('live');
    });
    var dot = wm.querySelector('i');
    if (dot) dot.addEventListener('click', function () { wm.classList.add('live'); dot.classList.remove('boing'); void dot.offsetWidth; dot.classList.add('boing'); });
  }

  if (!fine || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ---- lab: cards tilt toward the cursor and their titles decode
  var GLYPHS = '#*+=/<>[]%&';
  Array.prototype.forEach.call(document.querySelectorAll('.exp'), function (card) {
    var title = card.querySelector('.h3'), text = title && title.childNodes.length === 1 && title.firstChild.nodeType === 3 ? title.textContent : null, timer;
    card.addEventListener('pointerenter', function () {
      card.style.transitionDelay = '0s';
      if (!text) return;
      title.setAttribute('aria-label', text);
      var step = 0; clearInterval(timer);
      timer = setInterval(function () {
        step++;
        var done = Math.floor(step / 2), out = text.slice(0, done);
        for (var i = done; i < text.length; i++) out += text.charAt(i) === ' ' ? ' ' : GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
        title.textContent = out;
        if (done >= text.length) { clearInterval(timer); title.textContent = text; }
      }, 28);
    });
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      card.classList.add('tilt');
      card.style.transform = 'translateY(-10px) rotateX(' + (-py * 7).toFixed(2) + 'deg) rotateY(' + (px * 9).toFixed(2) + 'deg)';
    });
    card.addEventListener('pointerleave', function () {
      card.classList.remove('tilt'); card.style.transform = '';
      if (text) { clearInterval(timer); title.textContent = text; }
    });
  });
})();
