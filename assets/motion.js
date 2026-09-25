/* shellerville · motion kit
   - adds .ready so hero shapes and copy play their entrance
   - scroll reveals for anything below the fold at load
   - hero shapes lean toward the cursor at their own depth
   - respects prefers-reduced-motion */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('ready');
  if (reduce) return;

  // scroll reveals
  var vh = window.innerHeight;
  var items = Array.prototype.slice.call(document.querySelectorAll('.rv'));
  items.forEach(function (el) { if (el.getBoundingClientRect().top > vh * 0.92) el.classList.add('pending'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('pending'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { if (el.classList.contains('pending')) io.observe(el); });
  } else items.forEach(function (el) { el.classList.remove('pending'); });

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
