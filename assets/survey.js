/* Сонголтын туршилтын судалгаа: оролцогчийн хуудас */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var SID = (params.get('s') || '').trim();
  var DEMO = params.has('demo');
  var PREVIEW_PARAM = params.get('preview');
  var PREVIEW = DEMO || PREVIEW_PARAM !== null;
  var API = SID ? 'https://script.google.com/macros/s/' + encodeURIComponent(SID) + '/exec' : '';
  var STORE_KEY = 'songolt:v1:' + (DEMO ? 'demo' : SID);

  var $app = document.getElementById('app');
  var $banner = document.getElementById('banner');
  var $topTitle = document.getElementById('topTitle');
  var $stepText = document.getElementById('stepText');
  var $progress = document.getElementById('progressBar');

  var CFG = null;   // нийтэлсэн тохиргоо
  var S = null;     // оролцогчийн төлөв
  var STEPS = [];
  var taskShownAt = 0;

  /* ---------- Туслах функц ---------- */

  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function paras(s) {
    return String(s || '').split(/\r?\n+/).map(function (t) { return t.trim(); }).filter(Boolean)
      .map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('');
  }
  function safeImg(src) {
    src = String(src || '');
    if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/i.test(src)) return src;
    if (/^https:\/\/[^\s"'<>]+$/i.test(src)) return src;
    if (DEMO && /^assets\/demo\/[\w.-]+$/.test(src)) return src;
    return '';
  }
  function round1(n) { return Math.round(n * 10) / 10; }
  function randInt(max) {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % max;
    }
    return Math.floor(Math.random() * max);
  }
  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = randInt(i + 1);
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function deviceType() {
    var w = window.innerWidth;
    var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (coarse && w < 700) return 'Утас';
    if (coarse) return 'Таблет';
    return 'Компьютер';
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var store = {
    load: function () {
      if (PREVIEW) return null;
      try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; }
    },
    save: function () {
      if (PREVIEW || !S) return;
      try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* хадгалах боломжгүй */ }
    },
    clear: function () {
      try { localStorage.removeItem(STORE_KEY); } catch (e) { /* алгасна */ }
    }
  };

  function fetchJSON(url, opts, timeoutMs) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 30000);
    var o = Object.assign({ redirect: 'follow', cache: 'no-store', signal: ctrl.signal }, opts || {});
    return fetch(url, o).then(function (res) {
      if (!res.ok) throw new Error('http_' + res.status);
      return res.json();
    }).finally(function () { clearTimeout(timer); });
  }

  var api = {
    config: function () {
      return DEMO ? fetchJSON('assets/demo/config.json') : fetchJSON(API + '?a=config', null, 45000);
    },
    start: function () {
      return fetchJSON(API, { method: 'POST', body: JSON.stringify({ action: 'start' }) });
    },
    submit: function (payload) {
      return fetchJSON(API, { method: 'POST', body: JSON.stringify(Object.assign({ action: 'submit' }, payload)) }, 45000);
    }
  };

  /* ---------- Тохиргооны туслах ---------- */

  function questionsOf(section) {
    return CFG.questions.filter(function (q) { return q.section === section; });
  }
  function conditionById(id) {
    for (var i = 0; i < CFG.conditions.length; i++) if (CFG.conditions[i].id === id) return CFG.conditions[i];
    return null;
  }
  function productByCode(code) {
    for (var i = 0; i < CFG.products.length; i++) if (CFG.products[i].code === code) return CFG.products[i];
    return null;
  }
  function buildSteps() {
    var s = ['intro'];
    if (questionsOf('general').length) s.push('general');
    s.push('task', 'cos');
    if (questionsOf('check').length) s.push('check');
    s.push('done');
    return s;
  }
  function nextStep(step) { return STEPS[STEPS.indexOf(step) + 1] || 'done'; }

  function newState() {
    return {
      v: 1, pid: '', condition: '', step: 'intro', answers: {}, order: [],
      startedAt: 0, reloads: 0, choice: null, device: '', viewportWidth: 0,
      completed: false, configVersion: CFG.version || ''
    };
  }

  /* ---------- Дэлгэцийн хүрээ ---------- */

  function setChrome() {
    var visible = STEPS.filter(function (s) { return s !== 'done'; });
    var idx = visible.indexOf(S ? S.step : 'intro');
    if (S && S.step === 'done') {
      $stepText.textContent = 'Дууссан';
      $progress.style.width = '100%';
    } else if (idx >= 0) {
      $stepText.textContent = (idx + 1) + ' / ' + visible.length;
      $progress.style.width = Math.round((idx / visible.length) * 100) + '%';
    }
    $app.className = 'wrap' + (S && S.step === 'task' ? ' wrap--wide' : '');
    document.body.classList.toggle('is-wide', !!(S && S.step === 'task'));
  }

  function focusTop() {
    window.scrollTo(0, 0);
    try { $app.focus({ preventScroll: true }); } catch (e) { $app.focus(); }
  }

  function renderBanner() {
    if (!PREVIEW || !CFG) return;
    var base = location.pathname + '?' + (DEMO ? 'demo=1' : 's=' + encodeURIComponent(SID)) + '&preview=';
    var chips = CFG.conditions.map(function (c) {
      return '<a class="chip" href="' + esc(base + encodeURIComponent(c.id)) + '"' + (S && S.condition === c.id ? ' aria-current="true"' : '') + '>' + esc(c.label) + '</a>';
    }).join('');
    $banner.innerHTML = '<div class="banner"><div class="banner__inner">' +
      '<span><strong>' + (DEMO ? 'Жишээ судалгаа.' : 'Урьдчилан харах горим.') + '</strong> ' +
      (DEMO ? 'Бүтээгдэхүүн, асуулт бүгд зохиомол. ' : '') + 'Хариулт хадгалагдахгүй. Нөхцөл:</span>' +
      '<span class="chips">' + chips + '</span></div></div>';
  }

  function renderLoading(text) {
    $app.innerHTML = '<p class="loading"><span class="spinner" aria-hidden="true"></span>' + esc(text || 'Ачаалж байна…') + '</p>';
  }

  function renderNotice(title, body, opts) {
    opts = opts || {};
    $stepText.textContent = '';
    $app.className = 'wrap';
    document.body.classList.remove('is-wide');
    $app.innerHTML = '<div class="notice' + (opts.error ? ' notice--error' : '') + '" role="' + (opts.error ? 'alert' : 'status') + '">' +
      '<h1 class="h2">' + esc(title) + '</h1>' + paras(body) +
      (opts.retry ? '<div class="actions"><button class="btn btn--primary" type="button" id="retryBtn">Дахин оролдох</button></div>' : '') +
      '</div>';
    if (opts.retry) document.getElementById('retryBtn').addEventListener('click', function () { location.reload(); });
    focusTop();
  }

  function render() {
    setChrome();
    renderBanner();
    switch (S.step) {
      case 'intro': return renderIntro();
      case 'general': return renderQuestions('general');
      case 'task': return renderTask();
      case 'cos': return renderQuestions('cos');
      case 'check': return renderQuestions('check');
      case 'done': return renderDone();
    }
  }

  function goTo(step) {
    S.step = step;
    store.save();
    render();
    focusTop();
  }

  /* ---------- 1. Танилцуулга ба зөвшөөрөл ---------- */

  function renderIntro() {
    var st = CFG.settings;
    $app.innerHTML =
      '<section class="step">' +
        '<h1 class="title">' + esc(st.title) + '</h1>' +
        '<div class="prose">' + paras(st.intro) + '</div>' +
        '<label class="consent" id="consentBox"><input type="checkbox" id="consent" aria-describedby="consentErr"><span>' + esc(st.consent) + '</span></label>' +
        '<p class="q__error" id="consentErr" hidden>Үргэлжлүүлэхийн тулд зөвшөөрлөө тэмдэглэнэ үү.</p>' +
        '<p class="q__error" id="startErr" role="alert" hidden></p>' +
        '<div class="actions"><button class="btn btn--primary" type="button" id="startBtn">Судалгааг эхлэх</button></div>' +
      '</section>';
    var btn = document.getElementById('startBtn');
    var box = document.getElementById('consentBox');
    var cb = document.getElementById('consent');
    var err = document.getElementById('consentErr');
    var startErr = document.getElementById('startErr');
    cb.addEventListener('change', function () { if (cb.checked) { err.hidden = true; box.classList.remove('has-error'); } });

    btn.addEventListener('click', function () {
      if (!cb.checked) {
        err.hidden = false; box.classList.add('has-error'); cb.focus();
        return;
      }
      startErr.hidden = true;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Түр хүлээнэ үү…';
      var begin = PREVIEW ? Promise.resolve({ ok: true, pid: 'PREVIEW', condition: S.condition }) : startWithRetry();
      begin.then(function (res) {
        if (!res || !res.ok) {
          if (res && res.error === 'closed') return renderNotice('Судалгаа хаагдсан байна', 'Энэ судалгаанд хариулт авах хугацаа дууссан. Сонирхсонд баярлалаа.');
          throw new Error(res && res.error || 'start_failed');
        }
        if (!conditionById(res.condition)) throw new Error('unknown_condition');
        S.pid = res.pid;
        S.condition = res.condition;
        S.startedAt = Date.now();
        goTo(nextStep('intro'));
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = 'Судалгааг эхлэх';
        startErr.textContent = 'Холболт амжилтгүй боллоо. Интернэт холболтоо шалгаад дахин дарна уу.';
        startErr.hidden = false;
      });
    });
  }

  function startWithRetry() {
    return api.start().catch(function () { return sleep(1500).then(api.start); });
  }

  /* ---------- 2, 4, 5. Асуултууд ---------- */

  function sectionMeta(section) {
    var st = CFG.settings;
    if (section === 'general') return { title: st.generalTitle || 'Ерөнхий мэдээлэл', intro: '' };
    if (section === 'cos') return { title: st.cosTitle || 'Таны сонголтын тухай', intro: st.cosIntro };
    return { title: st.checkTitle || 'Нэмэлт асуулт', intro: st.checkIntro };
  }

  function questionHtml(q, i) {
    var name = 'q_' + q.code;
    var id = 'q' + i;
    var val = S.answers[q.code];
    var legend = '<legend class="q__text" id="' + id + '_l"><span class="q__num">' + (i + 1) + '.</span><span>' + esc(q.text) +
      (q.required ? '' : ' <span class="q__opt-mark">(заавал биш)</span>') + '</span></legend>';
    var body = '';
    if (q.type === 'likert') {
      var sc = q.scale || CFG.settings.likert;
      var opts = '';
      for (var p = 1; p <= sc.points; p++) {
        opts += '<label class="likert__opt"><input type="radio" name="' + esc(name) + '" value="' + p + '"' + (val === p ? ' checked' : '') +
          ' aria-label="' + p + (p === 1 && sc.low ? ' (' + esc(sc.low) + ')' : '') + (p === sc.points && sc.high ? ' (' + esc(sc.high) + ')' : '') + '"><span aria-hidden="true">' + p + '</span></label>';
      }
      body = '<div class="likert__scale" style="--n:' + sc.points + '">' + opts + '</div>' +
        ((sc.low || sc.high) ? '<div class="likert__ends" aria-hidden="true"><span>1 = ' + esc(sc.low) + '</span><span>' + sc.points + ' = ' + esc(sc.high) + '</span></div>' : '');
    } else if (q.type === 'choice') {
      body = '<div class="options">' + q.options.map(function (o) {
        return '<label class="option"><input type="radio" name="' + esc(name) + '" value="' + esc(o) + '"' + (val === o ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
      }).join('') + '</div>';
    } else if (q.type === 'number') {
      body = '<input class="input input--short" type="text" inputmode="decimal" autocomplete="off" name="' + esc(name) + '" aria-labelledby="' + id + '_l" value="' + (val === undefined ? '' : esc(val)) + '">';
    } else {
      body = '<input class="input" type="text" maxlength="500" autocomplete="off" name="' + esc(name) + '" aria-labelledby="' + id + '_l" value="' + (val === undefined ? '' : esc(val)) + '">';
    }
    return '<fieldset class="q" data-code="' + esc(q.code) + '" data-type="' + q.type + '" data-required="' + (q.required ? 1 : 0) + '">' +
      legend + body + '<p class="q__error" hidden>' + (q.type === 'number' ? 'Тоогоор бичнэ үү.' : 'Энэ асуултад хариулна уу.') + '</p></fieldset>';
  }

  function readAnswer(fs) {
    var type = fs.getAttribute('data-type');
    if (type === 'likert' || type === 'choice') {
      var c = fs.querySelector('input:checked');
      if (!c) return undefined;
      return type === 'likert' ? Number(c.value) : c.value;
    }
    var inp = fs.querySelector('input');
    var raw = inp.value.trim();
    if (!raw) return undefined;
    if (type === 'number') {
      var n = Number(raw.replace(/\s/g, '').replace(',', '.'));
      return isFinite(n) ? n : NaN;
    }
    return raw;
  }

  function renderQuestions(section) {
    var meta = sectionMeta(section);
    var qs = questionsOf(section);
    var isLast = nextStep(section) === 'done';
    $app.innerHTML =
      '<section class="step">' +
        '<h1 class="h2">' + esc(meta.title) + '</h1>' +
        (meta.intro ? '<div class="prose section-intro lead">' + paras(meta.intro) + '</div>' : '<div class="section-intro"></div>') +
        '<form id="qForm" novalidate>' + qs.map(questionHtml).join('') +
          '<p class="q__error" id="submitErr" role="alert" hidden></p>' +
          '<div class="actions"><button class="btn btn--primary" type="submit" id="nextBtn">' + (isLast ? 'Хариултаа илгээх' : 'Үргэлжлүүлэх') + '</button></div>' +
        '</form>' +
      '</section>';

    var form = document.getElementById('qForm');
    // Текст бичих явцад (input) алдааг арилгана. Ингэснээр талбараас гарах үед
    // хуудас доош шилжиж, дараагийн товшилт буруу газар буухгүй.
    function onAnswer(e) {
      var fs = e.target.closest('.q');
      if (!fs) return;
      var v = readAnswer(fs);
      var code = fs.getAttribute('data-code');
      var valid = v !== undefined && !(typeof v === 'number' && isNaN(v));
      if (valid) S.answers[code] = v; else delete S.answers[code];
      if (valid && fs.classList.contains('has-error')) {
        fs.classList.remove('has-error');
        fs.querySelector('.q__error').hidden = true;
      }
      store.save();
    }
    form.addEventListener('input', onAnswer);
    form.addEventListener('change', onAnswer);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      Array.prototype.forEach.call(form.querySelectorAll('.q'), function (fs) {
        var v = readAnswer(fs);
        var required = fs.getAttribute('data-required') === '1';
        var bad = (required && v === undefined) || (typeof v === 'number' && isNaN(v));
        fs.classList.toggle('has-error', bad);
        fs.querySelector('.q__error').hidden = !bad;
        var code = fs.getAttribute('data-code');
        if (!bad && v !== undefined) S.answers[code] = v;
        if (bad && !firstBad) firstBad = fs;
      });
      store.save();
      if (firstBad) {
        firstBad.scrollIntoView({ block: 'center', behavior: 'auto' });
        var f = firstBad.querySelector('input');
        if (f) f.focus({ preventScroll: true });
        return;
      }
      if (isLast) submitAll(document.getElementById('nextBtn'), document.getElementById('submitErr'));
      else goTo(nextStep(section));
    });
  }

  /* ---------- 3. Бүтээгдэхүүн сонгох ---------- */

  function ensureOrder(cond) {
    var valid = CFG.products.filter(function (p) { return !cond.small.products || p.inSmall; }).map(function (p) { return p.code; });
    var same = S.order.length === valid.length && S.order.every(function (c) { return valid.indexOf(c) >= 0; });
    if (!same) {
      S.order = CFG.settings.shuffle ? shuffle(valid) : valid;
      store.save();
    }
  }

  function renderTask() {
    var cond = conditionById(S.condition);
    if (!cond) return renderNotice('Нөхцөл олдсонгүй', 'Судалгааны тохиргоо өөрчлөгдсөн байж магадгүй. Хуудсыг дахин ачаална уу.', { error: true, retry: true });
    ensureOrder(cond);
    var attrs = CFG.attributes.filter(function (a) { return !cond.small.attributes || a.inSmall; });
    S.device = deviceType();
    S.viewportWidth = window.innerWidth;
    store.save();

    var cards = S.order.map(function (code, i) {
      var p = productByCode(code);
      var specs = attrs.map(function (a) {
        return '<span class="spec"><span class="spec__k">' + esc(a.name) + '</span><span class="spec__v">' + esc(p.values[a.code]) + '</span></span>';
      }).join('');
      return '<label class="pcard" data-code="' + esc(p.code) + '">' +
        '<input class="pcard__input" type="radio" name="product" value="' + esc(p.code) + '" data-pos="' + (i + 1) + '">' +
        '<span class="pcard__media"><img src="' + esc(safeImg(p.image)) + '" alt="" width="240" height="240" decoding="async"></span>' +
        '<span class="pcard__body"><span class="pcard__name">' + esc(p.name) + '</span><span class="specs">' + specs + '</span></span>' +
        '<span class="pcard__mark" aria-hidden="true"></span>' +
      '</label>';
    }).join('');

    $app.innerHTML =
      '<section class="step step--task">' +
        '<div class="task-head"><h1 class="h2">' + esc(CFG.settings.taskTitle || 'Бүтээгдэхүүн сонгох') + '</h1><div class="prose">' + paras(CFG.settings.task) + '</div></div>' +
        '<div class="grid" id="grid" role="radiogroup" aria-label="Бүтээгдэхүүнүүд">' + cards + '</div>' +
      '</section>' +
      '<div class="choicebar"><div class="choicebar__inner">' +
        '<p class="choicebar__status" id="choiceStatus" aria-live="polite">Бүтээгдэхүүн сонгоогүй байна</p>' +
        '<button class="btn btn--primary" type="button" id="confirmBtn" disabled>Сонголтоо батлах</button>' +
      '</div></div>' +
      '<dialog class="dialog" id="confirmDlg" aria-labelledby="dlgTitle"><form method="dialog">' +
        '<h2 id="dlgTitle">Энэ бүтээгдэхүүнийг сонгох уу?</h2>' +
        '<div class="dialog__pick" id="dlgPick"></div>' +
        '<p class="fine">Баталсны дараа сонголтоо өөрчлөх боломжгүй.</p>' +
        '<div class="actions"><button class="btn" value="cancel">Буцах</button><button class="btn btn--primary" value="ok" id="dlgOk">Тийм, сонгоно</button></div>' +
      '</form></dialog>';

    var grid = document.getElementById('grid');
    var status = document.getElementById('choiceStatus');
    var confirmBtn = document.getElementById('confirmBtn');
    var dlg = document.getElementById('confirmDlg');
    var selected = null;
    var changes = 0;
    var seen = {};

    // Харсан картуудыг тоолно (50%-иас дээш харагдсан)
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) seen[en.target.getAttribute('data-code')] = true; });
      }, { threshold: 0.5 });
      Array.prototype.forEach.call(grid.children, function (c) { io.observe(c); });
    }

    // Шийдвэрийн хугацааг бүх зураг харагдсанаас хойш тоолно
    taskShownAt = 0;
    var imgs = Array.prototype.slice.call(grid.querySelectorAll('img'));
    var decoded = Promise.all(imgs.map(function (im) { return im.decode ? im.decode().catch(function () {}) : Promise.resolve(); }));
    Promise.race([decoded, sleep(4000)]).then(function () { taskShownAt = performance.now(); });

    grid.addEventListener('change', function (e) {
      var input = e.target;
      if (!input.classList.contains('pcard__input')) return;
      if (selected && selected !== input.value) changes++;
      selected = input.value;
      Array.prototype.forEach.call(grid.children, function (c) { c.classList.toggle('is-selected', c.getAttribute('data-code') === selected); });
      var p = productByCode(selected);
      status.innerHTML = 'Сонгосон: <strong>' + esc(p.name) + '</strong>';
      confirmBtn.disabled = false;
    });

    function finish() {
      var input = grid.querySelector('input:checked');
      var started = taskShownAt || performance.now();
      S.choice = {
        code: selected,
        position: Number(input.getAttribute('data-pos')),
        decisionSec: round1((performance.now() - started) / 1000),
        selectionChanges: changes,
        cardsSeen: Object.keys(seen).length
      };
      goTo(nextStep('task'));
    }

    confirmBtn.addEventListener('click', function () {
      if (!selected) return;
      var p = productByCode(selected);
      if (typeof dlg.showModal !== 'function') {
        if (window.confirm('Энэ бүтээгдэхүүнийг сонгох уу? ' + p.name)) finish();
        return;
      }
      document.getElementById('dlgPick').innerHTML = '<img src="' + esc(safeImg(p.image)) + '" alt=""><strong>' + esc(p.name) + '</strong>';
      dlg.returnValue = '';
      dlg.showModal();
      document.getElementById('dlgOk').focus();
    });
    dlg.addEventListener('close', function () {
      if (dlg.returnValue === 'ok') finish();
    });
  }

  /* ---------- Илгээх ---------- */

  function buildPayload() {
    return {
      pid: S.pid,
      condition: S.condition,
      choiceCode: S.choice.code,
      choicePosition: S.choice.position,
      decisionSec: S.choice.decisionSec,
      selectionChanges: S.choice.selectionChanges,
      cardsSeen: S.choice.cardsSeen,
      order: S.order,
      device: S.device,
      viewportWidth: S.viewportWidth,
      totalSec: round1((Date.now() - S.startedAt) / 1000),
      reloads: S.reloads || 0,
      configVersion: S.configVersion,
      answers: S.answers
    };
  }

  function submitAll(btn, errEl) {
    var payload = buildPayload();
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Илгээж байна…';
    errEl.hidden = true;

    if (PREVIEW) {
      S.lastPayload = payload;
      S.completed = true;
      return goTo('done');
    }

    var attempt = 0;
    function tryOnce() {
      attempt++;
      return api.submit(payload).then(function (res) {
        if (res && res.ok) return res;
        var e = new Error(res && res.error || 'submit_failed');
        e.fatal = !!(res && res.error && res.error !== 'server');
        throw e;
      }).catch(function (err) {
        if (err.fatal || attempt >= 3) throw err;
        return sleep(attempt * 2000).then(tryOnce);
      });
    }

    tryOnce().then(function () {
      S.completed = true;
      S.step = 'done';
      store.save();
      render();
      focusTop();
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = 'Дахин илгээх';
      if (err && err.message === 'closed') {
        errEl.textContent = 'Судалгаа хаагдсан тул хариултыг хүлээн авсангүй.';
      } else if (err && err.fatal) {
        errEl.textContent = 'Хариултыг хүлээн авсангүй (' + err.message + '). Судлаачид энэ кодыг мэдэгдэнэ үү: ' + S.pid;
      } else {
        errEl.textContent = 'Илгээж чадсангүй. Таны хариулт энэ төхөөрөмжид хадгалагдсан байгаа. Интернэт холболтоо шалгаад "Дахин илгээх" товчийг дарна уу.';
      }
      errEl.hidden = false;
    });
  }

  /* ---------- Төгсгөл ---------- */

  function renderDone() {
    var html = '<section class="step"><div class="notice" role="status">' +
      '<h1 class="h2">Баярлалаа</h1>' + paras(CFG.settings.thanks || 'Таны хариулт амжилттай хадгалагдлаа.') + '</div>';
    if (PREVIEW && S.lastPayload) {
      html += '<details class="payload" open><summary>Хадгалагдах өгөгдөл (урьдчилан харах горимд хадгалагдаагүй)</summary><pre>' +
        esc(JSON.stringify(S.lastPayload, null, 2)) + '</pre></details>' +
        '<div class="actions"><a class="btn" href="' + esc(location.pathname + location.search) + '">Дахин эхлүүлэх</a></div>';
    }
    $app.innerHTML = html + '</section>';
    if (!PREVIEW && CFG.settings.oncePerDevice === false) store.clear();
  }

  /* ---------- Эхлэл ---------- */

  function boot() {
    if (!DEMO && !/^[A-Za-z0-9_-]{20,200}$/.test(SID)) {
      return renderNotice('Холбоос дутуу байна', 'Судалгааны холбоосыг бүтнээр нь хуулж нээнэ үү. Холбоос "?s=" гэсэн хэсэгтэй байх ёстой.', { error: true });
    }
    api.config().then(function (res) {
      if (!res || !res.ok || !res.config) {
        if (res && res.error === 'not_published') return renderNotice('Судалгаа бэлэн болоогүй байна', 'Судлаач тохиргоогоо нийтэлсний дараа энэ холбоос ажиллана.', { error: true });
        throw new Error('bad_config');
      }
      CFG = res.config;
      STEPS = buildSteps();
      document.title = CFG.settings.title || 'Судалгаа';
      $topTitle.textContent = CFG.settings.title || 'Судалгаа';

      if (res.status === 'closed' && !PREVIEW) {
        return renderNotice('Судалгаа хаагдсан байна', 'Энэ судалгаанд хариулт авах хугацаа дууссан. Сонирхсонд баярлалаа.');
      }

      var saved = store.load();
      if (saved && saved.completed) {
        if (CFG.settings.oncePerDevice) {
          S = saved;
          return renderNotice('Та энэ судалгаанд оролцсон байна', 'Таны хариулт өмнө нь хадгалагдсан. Дахин бөглөх шаардлагагүй. Баярлалаа.');
        }
        store.clear();
        saved = null;
      }
      if (saved && saved.configVersion !== (CFG.version || '')) saved = null;
      if (saved && saved.pid && saved.step !== 'intro') saved.reloads = (saved.reloads || 0) + 1;
      S = saved || newState();

      if (PREVIEW) {
        var want = conditionById(PREVIEW_PARAM) ? PREVIEW_PARAM : CFG.conditions[randInt(CFG.conditions.length)].id;
        S.condition = want;
      }
      store.save();
      render();
    }).catch(function () {
      renderNotice('Судалгааг ачаалж чадсангүй', 'Интернэт холболтоо шалгаад дахин оролдоно уу. Асуудал үргэлжилбэл судлаачид мэдэгдэнэ үү.', { error: true, retry: true });
    });
  }

  boot();
})();
