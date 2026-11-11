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

  // ---- every hero: drag the shapes, double-click to recolor, or make a mess
  var hero = document.querySelector('.hero');
  var art = hero && hero.querySelector('.hero-art');
  var svg = art && art.querySelector('svg');
  var layers = svg ? Array.prototype.slice.call(svg.querySelectorAll('.depth')) : [];
  if (layers.length) {
    var NS = 'http://www.w3.org/2000/svg', grabs = [], messy = false;
    layers.forEach(function (d) {
      var g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'grab');
      while (d.firstChild) g.appendChild(d.firstChild);
      d.appendChild(g);
      grabs.push({ el: g, x: 0, y: 0, r: 0 });
    });
    var put = function (o) { o.el.style.transform = 'translate(' + o.x + 'px,' + o.y + 'px) rotate(' + o.r + 'deg)'; };
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'mess';
    var label = function () {
      btn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        (messy ? '<path d="M2.5 8a5.5 5.5 0 1 0 1.8-4.1M2.5 2.5v3h3"/>' : '<path d="M2 5c2-3 4 3 6 0s4 3 6 0M2 11c2-3 4 3 6 0s4 3 6 0"/>') +
        '</svg>' + (messy ? 'Tidy up' : 'Make a mess');
    };
    label(); hero.appendChild(btn);
    var busy = function () { art.classList.add('busy'); clearTimeout(busy.t); busy.t = setTimeout(function () { art.classList.remove('busy'); }, 1200); };
    btn.addEventListener('click', function () {
      var vb = svg.viewBox.baseVal, w = vb.width || 600, h = vb.height || 700;
      busy();
      grabs.forEach(function (o, i) {
        o.el.style.transitionDelay = (i * 0.05) + 's';
        if (messy) { o.x = o.y = o.r = 0; }
        else {
          o.x = Math.round((Math.random() * 0.7 - 0.55) * w);
          o.y = Math.round((Math.random() * 0.5 - 0.32) * h);
          o.r = [-90, 0, 90, 180][Math.floor(Math.random() * 4)] + Math.round(Math.random() * 30 - 15);
        }
        put(o);
      });
      messy = !messy; label();
    });
    if (fine) {
      svg.classList.add('playable');
      grabs.forEach(function (o) {
        var g = o.el, sx, sy, ox, oy, k, held = false;
        g.addEventListener('pointerdown', function (e) {
          var m = svg.getScreenCTM(); k = m && m.a ? 1 / m.a : 1;
          held = true; sx = e.clientX; sy = e.clientY; ox = o.x; oy = o.y;
          g.style.transitionDelay = '0s'; g.classList.add('held'); art.classList.add('busy');
          try { g.setPointerCapture(e.pointerId); } catch (err) {}
          e.preventDefault();
        });
        g.addEventListener('pointermove', function (e) {
          if (!held) return;
          o.x = ox + (e.clientX - sx) * k; o.y = oy + (e.clientY - sy) * k; put(o);
        });
        var drop = function () {
          if (!held) return; held = false; g.classList.remove('held'); art.classList.remove('busy');
          o.r += Math.round(Math.random() * 16 - 8); put(o); // lands a little crooked, like a paper cutout
          if (!messy) { messy = true; label(); }
        };
        g.addEventListener('pointerup', drop); g.addEventListener('pointercancel', drop);
        g.addEventListener('dblclick', function () {
          var shape = Array.prototype.filter.call(g.querySelectorAll('[fill]'), function (n) { return COLORS.indexOf((n.getAttribute('fill') || '').toUpperCase()) > -1; })[0];
          if (!shape) return;
          shape.setAttribute('fill', COLORS[(COLORS.indexOf(shape.getAttribute('fill').toUpperCase()) + 1) % COLORS.length]);
        });
      });
      // one small wiggle so people know the art is theirs to move
      setTimeout(function () { var o = grabs[grabs.length - 2] || grabs[0]; o.el.classList.add('hint'); setTimeout(function () { o.el.classList.remove('hint'); }, 1100); }, 2600);
    }
  }

  // ---- home: click the greeting to move the clock (and the sun)
  var hello = document.querySelector('.hero .hello'), sun = document.querySelector('.hero .sun-pos');
  if (hello) {
    var stops = [[4.5, "You're up early. So am I.", 500], [9, 'Good morning.', 340], [14, 'Good afternoon.', 250], [19, 'Good evening.', 440], [23, 'Still up. Bold choice.', 625]];
    var hNow = new Date().getHours(), at = 0;
    stops.forEach(function (s, i) { if (hNow >= s[0] - 1.5) at = i; });
    if (hNow < 3) at = 4;
    hello.setAttribute('role', 'button'); hello.setAttribute('tabindex', '0'); hello.setAttribute('title', 'Change the time of day');
    var jump = function () {
      at = (at + 1) % stops.length;
      hello.textContent = stops[at][1] + ' ';
      if (sun) sun.style.transform = 'translateY(' + (stops[at][2] - 410) + 'px)';
    };
    hello.addEventListener('click', jump);
    hello.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jump(); } });
  }

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
