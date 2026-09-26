/* shellerville · motion kit
   - adds .ready so hero shapes and copy play their entrance
   - hero headline rises word by word from behind a mask
   - scroll reveals for anything below the fold at load, with grid cascades
   - photos unmask upward, the squiggle draws itself, footer wordmark rises letter by letter
   - home cards play their hover move once as they arrive
   - hero shapes lean toward the cursor at their own depth
   - respects prefers-reduced-motion */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // mobile menu toggle (runs even with reduced motion)
  var btn = document.querySelector('.menu-btn'), navEl = document.querySelector('.nav');
  if (btn && navEl) {
    function setOpen(open) { navEl.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); document.body.classList.toggle('menu-open', open); }
    btn.addEventListener('click', function () { setOpen(!navEl.classList.contains('open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    Array.prototype.forEach.call(navEl.querySelectorAll('nav a'), function (a) { a.addEventListener('click', function () { setOpen(false); }); });
  }

  // no widows: tie the last two words of every text block together (runs before the headline split)
  Array.prototype.forEach.call(document.querySelectorAll('main p, main h1, main h2, main h3, main dd, .foot .row span'), function (el) {
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), t, last = null;
    while ((t = w.nextNode())) if (/\S/.test(t.textContent)) last = t;
    if (!last) return;
    var s = last.textContent.replace(/\s+$/, ''), i = s.lastIndexOf(' ');
    if (i > 0 && s.length - i < 16) last.textContent = s.slice(0, i) + '\u00a0' + s.slice(i + 1) + last.textContent.slice(s.length);
  });

  var root = document.documentElement;
  if (reduce) { root.classList.add('ready'); return; }

  // headline: wrap every word in a mask so it can rise into place
  var h1 = document.querySelector('.hero .display');
  if (h1) {
    var n = 0;
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parts = c.textContent.split(/([ \t\n\r]+)/), frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^[ \t\n\r]+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var o = document.createElement('span'); o.className = 'w';
            var i = document.createElement('span'); i.textContent = p; i.style.animationDelay = (0.12 + n++ * 0.055) + 's';
            o.appendChild(i); frag.appendChild(o);
          });
          c.parentNode.replaceChild(frag, c);
        } else if (c.nodeType === 1) wrap(c);
      });
    })(h1);
    h1.classList.add('split');
  }

  // footer wordmark: one span per letter, dot last
  var wm = document.querySelector('.wordmark');
  if (wm) {
    var txt = wm.firstChild && wm.firstChild.nodeType === 3 ? wm.firstChild : null;
    if (txt) {
      var len = txt.textContent.length, f = document.createDocumentFragment();
      txt.textContent.split('').forEach(function (ch, k) {
        var s = document.createElement('span'); s.textContent = ch; s.style.transitionDelay = (k * 0.04) + 's'; f.appendChild(s);
      });
      wm.replaceChild(f, txt);
      var dot = wm.querySelector('i'); if (dot) dot.style.transitionDelay = (len * 0.04 + 0.15) + 's';
    }
    wm.classList.add('rv');
  }

  root.classList.add('ready');

  // cascade: items that share a grid come in one after another
  ['.cards', '.proof', '.articles', '.trio', '.exps'].forEach(function (sel) {
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (grid) {
      Array.prototype.forEach.call(grid.children, function (el, i) { el.style.transitionDelay = ((i % 3) * 0.09) + 's'; });
    });
  });

  // scroll reveals
  var vh = window.innerHeight;
  var items = Array.prototype.slice.call(document.querySelectorAll('.rv'));
  items.forEach(function (el) { if (el.getBoundingClientRect().top > vh * 0.92) el.classList.add('pending'); });
  function arrive(el) {
    el.classList.remove('pending');
    if (el.classList.contains('card')) { // play the tile's hover move once
      setTimeout(function () { el.classList.add('play'); setTimeout(function () { el.classList.remove('play'); }, 900); }, 450);
    }
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { arrive(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { if (el.classList.contains('pending')) io.observe(el); });
    // anything sitting in the last sliver of the page (the footer wordmark) can never cross the reveal line, so reveal it at the bottom
    var atEnd = function () {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        items.forEach(function (el) { if (el.classList.contains('pending')) { arrive(el); io.unobserve(el); } });
        window.removeEventListener('scroll', atEnd);
      }
    };
    window.addEventListener('scroll', atEnd, { passive: true }); atEnd();
  } else items.forEach(arrive);

  // hero depth: layers with data-depth drift toward the pointer
  var hero = document.querySelector('.hero');
  if (!hero) return;
  var layers = Array.prototype.slice.call(hero.querySelectorAll('[data-depth]'));
  var mx = 0, my = 0, raf = null;
  function paint() {
    raf = null;
    layers.forEach(function (l) { var d = +l.getAttribute('data-depth'); l.style.transform = 'translate(' + (mx * d) + 'px,' + (my * d) + 'px)'; });
  }
  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5;
    if (!raf) raf = requestAnimationFrame(paint);
  });
  hero.addEventListener('pointerleave', function () { mx = my = 0; if (!raf) raf = requestAnimationFrame(paint); });
})();
