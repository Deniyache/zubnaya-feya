/* Главный экран «Зубная Фея»: появление, параллакс от курсора и скролла.
   Без библиотек. Уважает prefers-reduced-motion. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Один общий цикл вместо событий scroll: на телефонах и во встроенных
  // просмотрщиках scroll-события часто не доходят до window.
  var tickers = [];
  (function loop() {
    for (var t = 0; t < tickers.length; t++) tickers[t]();
    requestAnimationFrame(loop);
  })();

  // Меню на телефоне
  var btn = document.querySelector('.menu-btn');
  if (btn) {
    btn.addEventListener('click', function () {
      var open = root.classList.toggle('menu-open');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Закрыть' : 'Меню';
    });
    document.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        root.classList.remove('menu-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = 'Меню';
      });
    });
  }

  // Появление: ждём главную фею, но не дольше 1.6 с
  var ready = false;
  function go() { if (ready) return; ready = true; root.classList.add('is-ready'); }
  var hero = document.querySelector('.fairy img');
  if (hero && !hero.complete) { hero.addEventListener('load', go); hero.addEventListener('error', go); }
  else go();
  setTimeout(go, 1600);


  // Блок 2: слова зачёркиваются по скроллу
  var fearsEl = document.querySelector('.fears');
  if (fearsEl && !reduce) {
    var words = Array.prototype.slice.call(fearsEl.querySelectorAll('.fw'));
    var fairy = fearsEl.querySelector('.fears-fairy .in');
    var endEl = fearsEl.querySelector('.fears-end');
    var order = [0, 3, 2, 5, 1, 6, 4, 7]; // порядок вычёркивания
    var cur = -1, ticking = false;
    var clamp01 = function (v) { return Math.max(0, Math.min(1, v)); };
    var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
    var upd = function () {
      ticking = false;
      var r = fearsEl.getBoundingClientRect();
      var span = fearsEl.offsetHeight - window.innerHeight;
      var p = clamp01(-r.top / span);
      if (Math.abs(p - cur) < 0.0004) return;
      cur = p;
      order.forEach(function (wi, n) {
        var s = 0.06 + n * 0.095;
        words[wi].style.setProperty('--k', ease(clamp01((p - s) / 0.08)).toFixed(3));
      });
      fairy.style.setProperty('--fy', (-(p - 0.5) * 60).toFixed(1) + 'px');
      fairy.style.setProperty('--fr', ((p - 0.5) * 6).toFixed(2) + 'deg');
      var e = ease(clamp01((p - 0.84) / 0.12)).toFixed(3);
      endEl.style.setProperty('--end', e);
      endEl.style.visibility = e === '0.000' ? 'hidden' : 'visible';
    };
    tickers.push(upd);
    window.addEventListener('resize', upd);
    upd();
  }

  // Блок 3: горизонтальная лента услуг от вертикального скролла
  var svc = document.querySelector('.svc');
  if (svc && !reduce) {
    var track = svc.querySelector('.svc-track');
    var nums = Array.prototype.slice.call(svc.querySelectorAll('.num'));
    var dist = 0, ticking3 = false;
    var measure = function () {
      dist = Math.max(0, track.scrollWidth - window.innerWidth);
      svc.style.height = Math.round(dist * 1.05 + window.innerHeight) + 'px';
    };
    var upd3 = function () {
      ticking3 = false;
      var r = svc.getBoundingClientRect();
      var span = svc.offsetHeight - window.innerHeight;
      var p = Math.max(0, Math.min(1, -r.top / span));
      var x = -p * dist;
      track.style.setProperty('--tx', x.toFixed(1) + 'px');
      // номера чуть отстают от карточек: параллакс внутри ленты
      for (var i = 0; i < nums.length; i++) {
        var card = nums[i].parentNode, cx = card.offsetLeft + x + card.offsetWidth / 2 - window.innerWidth / 2;
        nums[i].style.setProperty('--np', (-cx * 0.12).toFixed(1));
      }
    };
    var lastTop3 = null;
    tickers.push(function () { var t = svc.getBoundingClientRect().top; if (t !== lastTop3) { lastTop3 = t; upd3(); } });
    window.addEventListener('resize', function () { measure(); upd3(); });
    window.addEventListener('load', function () { measure(); upd3(); });
    measure(); upd3();
  }

  // Блок 4: линия рисуется, фея летит по ней
  var route = document.getElementById('route');
  if (route) {
    var rFairy = route.querySelector('.route-fairy');
    var mq = window.matchMedia('(max-width: 860px)');
    var rSvg = route.querySelector('.route-svg');
    var lines = route.querySelectorAll('.route-line');
    var rI = 0, tbl = [], Ls = 1, N = 360;
    var setupRoute = function () {
      rI = mq.matches ? 1 : 0;
      var rr = route.getBoundingClientRect(), w = rr.width, h = rr.height;
      var path = lines[rI], L = path.getTotalLength();
      tbl = []; Ls = 0;
      var prev = null;
      for (var s = 0; s <= N; s++) {
        var pt = path.getPointAtLength(L * s / N);
        var X = pt.x / 1000 * w, Y = pt.y / 1800 * h;
        if (prev) Ls += Math.sqrt((X - prev.x) * (X - prev.x) + (Y - prev.y) * (Y - prev.y));
        prev = { x: X, y: Y };
        tbl.push({ x: X, y: Y, l: Ls });
      }
      for (var q = 0; q < lines.length; q++) {
        lines[q].style.strokeDasharray = Ls;
        lines[q].style.strokeDashoffset = reduce ? 0 : Ls;
      }
      lastP = -1;
    };
    var pointAt = function (len) {
      var lo = 0, hi = tbl.length - 1;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (tbl[mid].l < len) lo = mid; else hi = mid; }
      var a = tbl[lo], b = tbl[hi], k = b.l === a.l ? 0 : (len - a.l) / (b.l - a.l);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    };
    var visitEl = document.getElementById('priem');
    var lastP = -1;
    setupRoute();
    mq.addEventListener ? mq.addEventListener('change', setupRoute) : mq.addListener(setupRoute);
    var drawRoute = function () {
      var rr = route.getBoundingClientRect();
      var p = reduce ? 1 : Math.max(0, Math.min(1, (window.innerHeight * 0.62 - rr.top) / (rr.height * 0.92)));
      if (Math.abs(p - lastP) < 0.0005) return; lastP = p;
      var len = Ls * p;
      lines[rI].style.strokeDashoffset = (Ls * (1 - p)).toFixed(1);
      var a = pointAt(len), b = pointAt(Math.min(Ls, len + 8)), c = pointAt(Math.max(0, len - 8));
      var lean = Math.max(-14, Math.min(14, (b.x - c.x) * 0.9));
      var fw = rFairy.offsetWidth, fh = rFairy.offsetHeight;
      rFairy.style.transform = 'translate3d(' + (a.x - fw * 0.5).toFixed(1) + 'px,' + (a.y - fh * 0.5).toFixed(1) + 'px,0) rotate(' + lean.toFixed(1) + 'deg)';
    };
    if (!reduce) tickers.push(drawRoute); else drawRoute();
    window.addEventListener('resize', setupRoute);
    window.addEventListener('load', setupRoute);
  }

  // Блок 5: цифры выскакивают и расходятся в стороны при скролле
  var numsEl = document.querySelector('.nums');
  if (numsEl) {
    var nrows = numsEl.querySelectorAll('.nrow');
    var lastN = null;
    var updN = function () {
      var r = numsEl.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.78) numsEl.classList.add('in');
      if (reduce || r.top === lastN) return; lastN = r.top;
      var p = Math.max(-0.5, Math.min(1.5, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
      var d = (p - 0.5) * 7;
      nrows[0].style.setProperty('--drift', (-d).toFixed(2) + 'vw');
      nrows[1].style.setProperty('--drift', d.toFixed(2) + 'vw');
    };
    tickers.push(updN);
  }

  // Блок 6: овалы плывут с разной скоростью
  var docsEl = document.querySelector('.docs');
  if (docsEl && !reduce) {
    var docItems = Array.prototype.map.call(docsEl.querySelectorAll('.doc'), function (el, i) { return { el: el, k: [-70, 50, -40, 80, -90, 60][i % 6] }; });
    var lastD = null;
    tickers.push(function () {
      var r = docsEl.getBoundingClientRect();
      if (r.top === lastD) return; lastD = r.top;
      var p = Math.max(0, Math.min(1, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
      var narrow = window.innerWidth <= 860 ? 0.35 : 1;
      for (var i = 0; i < docItems.length; i++) docItems[i].el.style.setProperty('--py', ((p - 0.5) * docItems[i].k * narrow).toFixed(1) + 'px');
    });
  }

  // Блок 7: чек печатается из щели по мере скролла
  var cenyEl = document.querySelector('.ceny');
  if (cenyEl && !reduce) {
    var rwrap = cenyEl.querySelector('.rwrap');
    var lastKey = '';
    tickers.push(function () {
      var r = rwrap.getBoundingClientRect();
      // высота чека без раскрытого списка: чтобы он не «допечатывался» заново при открытии
      var more = rwrap.querySelector('.more');
      var hc = r.height - (more && more.open ? more.offsetHeight - more.firstElementChild.offsetHeight : 0);
      var key = r.top.toFixed(1) + '|' + hc.toFixed(0) + '|' + window.innerHeight;
      if (key === lastKey) return; lastKey = key;
      var p = Math.max(0, Math.min(1, (window.innerHeight * 0.62 - r.top) / Math.max(1, hc)));
      rwrap.style.setProperty('--print', p.toFixed(4));
      rwrap.classList.toggle('done', p > 0.985);
    });
  }

  // Блок 8: стикеры «приклеиваются» по мере скролла
  // Положение считаем по layout (offsetTop), без transform: иначе анимация сдвигает элемент и сама себя раскачивает.
  var otzEl = document.querySelector('.otz');
  if (otzEl && !reduce) {
    var wall = otzEl.querySelector('.wall');
    var notes = Array.prototype.slice.call(otzEl.querySelectorAll('.note'));
    var lastO = '';
    var smq = window.matchMedia('(max-width: 860px)');
    tickers.push(function () {
      var wt = wall.getBoundingClientRect().top;
      var key = wt.toFixed(0) + '|' + window.innerHeight + '|' + smq.matches;
      if (key === lastO) return; lastO = key;
      for (var i = 0; i < notes.length; i++) {
        if (smq.matches) { notes[i].style.removeProperty('--k'); continue; }
        var t = wt + notes[i].offsetTop;
        var k = Math.max(0, Math.min(1, (window.innerHeight * 0.95 - t) / (window.innerHeight * 0.22)));
        notes[i].style.setProperty('--k', (1 - Math.pow(1 - k, 3)).toFixed(3));
      }
    });
  }

  // Блок 9: фея с меткой подлетает к карте
  var kontEl = document.querySelector('.kont');
  if (kontEl && !reduce) {
    var kf = kontEl.querySelector('.kfairy'), kmapEl = kontEl.querySelector('.kmap'), lastK = '';
    tickers.push(function () {
      var t = kontEl.getBoundingClientRect().top + kmapEl.offsetTop; // layout, без transform
      var key = t.toFixed(0) + '|' + window.innerHeight;
      if (key === lastK) return; lastK = key;
      var k = Math.max(0, Math.min(1, (window.innerHeight * 0.92 - t) / (window.innerHeight * 0.5)));
      kf.style.setProperty('--k', (1 - Math.pow(1 - k, 3)).toFixed(3));
    });
  }

  // Подвал: надпись подгоняется по ширине под любой шрифт
  (function () {
    var gp = document.querySelector('.giant-panel');
    if (!gp) return;
    var gt = gp.querySelector('.gt');
    function fit() {
      gp.style.fontSize = '100px';
      var w = gt.getBoundingClientRect().width;
      if (w > 0) gp.style.fontSize = (100 * gp.clientWidth * 0.94 / w).toFixed(2) + 'px';
    }
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('load', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  })();

  // Блок 10: фея поднимается из-за надписи в конце страницы
  var footEl = document.querySelector('.foot');
  if (footEl && !reduce) {
    var pfs = footEl.querySelectorAll('.foot-fairy, .foot-hands'), panel = footEl.querySelector('.giant-panel'), lastF = '';
    tickers.push(function () {
      var r = panel.getBoundingClientRect(); // панель не двигается
      var key = r.top.toFixed(0) + '|' + window.innerHeight;
      if (key === lastF) return; lastF = key;
      var k = Math.max(0, Math.min(1, (window.innerHeight - r.top) / Math.max(1, r.height * 0.75)));
      for (var q = 0; q < pfs.length; q++) pfs[q].style.setProperty('--k', (1 - Math.pow(1 - k, 3)).toFixed(3));
    });
  }

  if (reduce) return;

  var layers = Array.prototype.map.call(document.querySelectorAll('.layer'), function (el) {
    var d = (el.dataset.depth || '0,0').split(',').map(Number);
    return { el: el, dx: d[0], dy: d[1], s: parseFloat(el.dataset.scroll || '0') };
  });
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var mx = 0, my = 0, tx = 0, ty = 0, sy = 0, tsy = 0, running = false;
  var heroEl = document.querySelector('.hero');

  function frame() {
    mx += (tx - mx) * 0.07;
    my += (ty - my) * 0.07;
    sy += (tsy - sy) * 0.12;
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      L.el.style.transform = 'translate3d(' + (mx * L.dx).toFixed(2) + 'px,' + (my * L.dy - sy * L.s).toFixed(2) + 'px,0)';
    }
    var settle = Math.abs(tx - mx) < 0.001 && Math.abs(ty - my) < 0.001 && Math.abs(tsy - sy) < 0.1;
    if (settle) { running = false; } else { requestAnimationFrame(frame); }
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

  if (!coarse) {
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
      kick();
    }, { passive: true });
  }

  function onScroll() {
    var h = heroEl.offsetHeight;
    var v = Math.max(0, Math.min(-heroEl.getBoundingClientRect().top, h * 1.2));
    if (v !== tsy) { tsy = v; kick(); }
  }
  tickers.push(onScroll);
})();

/* Когда шрифты загрузились, размеры текста меняются: пересчитываем раскладку всех блоков */
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(function () { window.dispatchEvent(new Event('resize')); });
}
