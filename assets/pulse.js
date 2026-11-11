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
