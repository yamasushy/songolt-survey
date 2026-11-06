/* Судлаачийн тохируулах хуудас */
(function () {
  'use strict';

  var SITE = location.origin + location.pathname.replace(/[^/]*$/, '');
  var URL_KEY = 'songolt:setup:url';
  var codeText = '';
  var latestVersion = '';

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function saveLocal(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* алгасна */ } }
  function loadLocal(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }

  function copyText(text, note) {
    function done() { if (note) { note.textContent = 'Хууллаа.'; setTimeout(function () { note.textContent = ''; }, 2500); } }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(done, fallback);
    }
    fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { if (note) note.textContent = 'Хуулж чадсангүй. Гараар сонгож хуулна уу.'; }
      document.body.removeChild(ta);
    }
  }

  function downloadBlob(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------- 2. Код ---------- */

  fetch('apps-script/Code.gs', { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error('http_' + r.status);
    return r.text();
  }).then(function (t) {
    codeText = t.replace("'__SITE_URL__'", "'" + SITE.replace(/\/$/, '') + "'");
    var vm = t.match(/var APP_VERSION = '([^']+)'/);
    latestVersion = vm ? vm[1] : '';
    $('codePre').textContent = codeText;
    $('codeInfo').textContent = 'Code.gs (' + codeText.split('\n').length + ' мөр)';
  }).catch(function () {
    $('codePre').textContent = 'Кодыг ачаалж чадсангүй. Хуудсыг дахин ачаална уу.';
  });

  $('copyCode').addEventListener('click', function () {
    if (codeText) copyText(codeText, $('copyNote'));
  });
  $('downloadCode').addEventListener('click', function () {
    if (codeText) downloadBlob(new Blob([codeText], { type: 'text/plain;charset=utf-8' }), 'Code.gs');
  });

  /* ---------- 7. Холболт шалгах ---------- */

  function parseDeployment(raw) {
    var s = String(raw || '').trim();
    if (!s) return { error: 'Web app URL-аа оруулна уу.' };
    if (/\/dev(\?|$)/.test(s)) return { error: 'Энэ нь туршилтын (/dev) холбоос. Deploy хийсний дараа гарах /exec-ээр төгссөн холбоосыг хуулна уу.' };
    var m = s.match(/script\.google\.com\/(?:a\/[^/]+\/)?macros\/s\/([A-Za-z0-9_-]{20,200})\/exec/);
    if (m) return { id: m[1] };
    if (/^[A-Za-z0-9_-]{40,200}$/.test(s)) return { id: s };
    return { error: 'Холбоосын хэлбэр буруу байна. https://script.google.com/macros/s/…/exec хэлбэртэй байх ёстой.' };
  }

  var form = $('connectForm');
  var input = $('apiUrl');
  var err = $('connectErr');
  var out = $('connectResult');
  var btn = $('checkBtn');

  input.value = loadLocal(URL_KEY);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    out.hidden = true;
    var p = parseDeployment(input.value);
    if (p.error) { err.textContent = p.error; err.hidden = false; input.focus(); return; }
    saveLocal(URL_KEY, input.value.trim());
    btn.disabled = true;
    btn.textContent = 'Шалгаж байна…';

    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 45000);
    fetch('https://script.google.com/macros/s/' + p.id + '/exec?a=config', { cache: 'no-store', redirect: 'follow', signal: ctrl.signal })
      .then(function (r) { return r.text(); })
      .then(function (text) {
        var data;
        try { data = JSON.parse(text); } catch (e2) { throw new Error('not_json'); }
        if (!data.ok) {
          if (data.error === 'not_published') throw new Error('not_published');
          throw new Error(data.error || 'server');
        }
        showResult(p.id, data);
      })
      .catch(function (e3) {
        var msg;
        if (e3.message === 'not_published') {
          msg = 'Холбогдлоо, гэхдээ тохиргоо нийтлэгдээгүй байна. Google Sheet дээр Судалгаа › 2. Тохиргоог шалгаж нийтлэх цэсийг дарна уу.';
        } else if (e3.name === 'AbortError') {
          msg = 'Хариу ирсэнгүй. Хэсэг хүлээгээд дахин шалгана уу.';
        } else {
          msg = 'Холбогдож чадсангүй. Deploy хийхдээ "Who has access: Anyone" сонгосон эсэх, URL бүтэн хуулагдсан эсэхийг шалгана уу.';
        }
        err.textContent = msg;
        err.hidden = false;
      })
      .finally(function () {
        clearTimeout(timer);
        btn.disabled = false;
        btn.textContent = 'Холболтыг шалгах';
      });
  });

  function showResult(id, data) {
    var cfg = data.config;
    var link = SITE + '?s=' + id;
    var bySection = { experience: 0, general: 0, cos: 0, check: 0 };
    cfg.questions.forEach(function (q) { bySection[q.section] = (bySection[q.section] || 0) + 1; });
    var closed = data.status === 'closed';
    var full = data.status === 'full';
    var badge = closed ? '<span class="badge badge--closed">Хаалттай</span>' : full ? '<span class="badge badge--closed">Дүүрсэн</span>' : '<span class="badge">Нээлттэй</span>';
    var labelOf = function (id) { var c = cfg.conditions.filter(function (x) { return x.id === id; })[0]; return c ? c.label : id; };
    var nowAssigning = Array.isArray(data.available)
      ? (data.available.length ? data.available.map(labelOf).join(', ') : 'Аль ч нөхцөлд хуваарилахгүй')
      : '';
    var outdated = latestVersion && data.backend !== latestVersion;
    var outdatedHtml = outdated
      ? '<div class="callout"><p><strong>Web app хуучин кодоор ажиллаж байна' + (data.backend ? ' (' + esc(data.backend) + ')' : '') + '.</strong> ' +
        'Хамгийн сүүлийн хувилбар нь ' + esc(latestVersion) + '. Кодоо шинэчилсний дараа Apps Script дээр <span class="ui">Deploy</span> › <span class="ui">Manage deployments</span> › харандаа дүрс › <span class="ui">Version: New version</span> › <span class="ui">Deploy</span> дарна уу. Холбоос өөрчлөгдөхгүй.</p></div>'
      : '';
    var previews = cfg.conditions.map(function (c) {
      return '<a class="chip" href="' + esc(link + '&preview=' + encodeURIComponent(c.id)) + '" target="_blank" rel="noopener">' + esc(c.label) + '</a>';
    }).join('');

    out.innerHTML =
      '<div class="result result--ok">' +
        '<h3>Холболт амжилттай ' + badge + '</h3>' +
        '<dl class="result__meta">' +
          '<dt>Гарчиг</dt><dd>' + esc(cfg.settings.title) + '</dd>' +
          '<dt>Нөхцөл</dt><dd>' + cfg.conditions.map(function (c) { return esc(c.label); }).join(', ') + '</dd>' +
          '<dt>Бүтээгдэхүүн</dt><dd>' + cfg.products.length + ' (бага нөхцөлд ' + cfg.products.filter(function (x) { return x.inSmall; }).length + ')</dd>' +
          '<dt>Үзүүлэлт</dt><dd>' + cfg.attributes.length + ' (бага нөхцөлд ' + cfg.attributes.filter(function (x) { return x.inSmall; }).length + ')</dd>' +
          '<dt>Асуулт</dt><dd>' + (bySection.experience ? 'Өмнөх туршлага ' + bySection.experience + ', ' : '') + 'COS ' + bySection.cos + ', шалгах ' + bySection.check + ', ерөнхий ' + bySection.general + (cfg.settings.generalPosition === 'start' ? ' (эхэнд)' : '') + '</dd>' +
          '<dt>Үзүүлэлтийн тайлбар</dt><dd>' + (cfg.attributes.some(function (a) { return a.desc; }) ? 'Бөглөгдсөн' : 'Байхгүй') + '</dd>' +
          '<dt>Нийтэлсэн</dt><dd>' + esc(String(cfg.version || '').replace('T', ' ')) + '</dd>' +
          (nowAssigning ? '<dt>Одоо хуваарилж буй</dt><dd>' + esc(nowAssigning) + '</dd>' : '') +
          (data.assignment ? '<dt>Хуваарилалт</dt><dd>' + esc(data.assignment) + '</dd>' : '') +
        '</dl>' + outdatedHtml +
        '<div class="share">' +
          '<div>' +
            '<label for="shareLink"><strong>Оролцогчдод илгээх холбоос</strong></label>' +
            '<div class="linkbox"><input class="input" id="shareLink" readonly value="' + esc(link) + '">' +
              '<button class="btn btn--primary btn--small" type="button" id="copyShare">Хуулах</button>' +
              '<a class="btn btn--small" href="' + esc(link) + '" target="_blank" rel="noopener">Нээх</a></div>' +
            '<p class="fine" id="shareNote" role="status"></p>' +
            '<p style="margin-top:14px"><strong>Урьдчилан харах</strong> <span class="fine">(хариулт хадгалагдахгүй)</span></p>' +
            '<div class="chips">' + previews + '</div>' +
          '</div>' +
          '<div class="qr"><div class="qr__img" id="qrBox" aria-label="Оролцогчийн холбоосын QR код" role="img"></div>' +
            '<a href="#" id="qrDownload">QR татах</a></div>' +
        '</div>' +
      '</div>';
    out.hidden = false;

    $('copyShare').addEventListener('click', function () { copyText(link, $('shareNote')); });
    $('shareLink').addEventListener('focus', function () { this.select(); });

    if (window.qrcode) {
      var qr = window.qrcode(0, 'M');
      qr.addData(link);
      qr.make();
      $('qrBox').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
      $('qrDownload').addEventListener('click', function (e) {
        e.preventDefault();
        var canvas = document.createElement('canvas');
        var n = qr.getModuleCount();
        var cell = 12, margin = 4 * cell, size = n * cell + margin * 2;
        canvas.width = canvas.height = size;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#000';
        for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(margin + c * cell, margin + r * cell, cell, cell);
        canvas.toBlob(function (b) { downloadBlob(b, 'sudalgaa-qr.png'); }, 'image/png');
      });
    } else {
      $('qrBox').parentNode.hidden = true;
    }
  }

  /* ---------- Зураг жигдлэх ---------- */

  var OUT_SIZE = 800;
  var processed = []; // {name, blob, url}
  var imgInput = $('imgInput');
  var imgStatus = $('imgStatus');
  var thumbs = $('imgThumbs');
  var imgActions = $('imgActions');

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () { resolve({ im: im, url: url }); };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      im.src = url;
    });
  }

  // Цагаан (эсвэл тунгалаг) захаас бусад хэсгийн хүрээг олно
  function contentBox(im) {
    var maxSide = 600;
    var scale = Math.min(1, maxSide / Math.max(im.naturalWidth, im.naturalHeight));
    var w = Math.max(1, Math.round(im.naturalWidth * scale));
    var h = Math.max(1, Math.round(im.naturalHeight * scale));
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(im, 0, 0, w, h);
    var d = ctx.getImageData(0, 0, w, h).data;
    var minX = w, minY = h, maxX = -1, maxY = -1;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        var a = d[i + 3];
        if (a > 16 && (d[i] < 238 || d[i + 1] < 238 || d[i + 2] < 238)) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return { x: 0, y: 0, w: im.naturalWidth, h: im.naturalHeight };
    return {
      x: minX / scale, y: minY / scale,
      w: (maxX - minX + 1) / scale, h: (maxY - minY + 1) / scale
    };
  }

  function normalise(im, trim) {
    var box = trim ? contentBox(im) : { x: 0, y: 0, w: im.naturalWidth, h: im.naturalHeight };
    var pad = trim ? OUT_SIZE * 0.1 : 0;
    var avail = OUT_SIZE - pad * 2;
    var s = Math.min(avail / box.w, avail / box.h);
    var dw = box.w * s, dh = box.h * s;
    var c = document.createElement('canvas');
    c.width = c.height = OUT_SIZE;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUT_SIZE, OUT_SIZE);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(im, box.x, box.y, box.w, box.h, (OUT_SIZE - dw) / 2, (OUT_SIZE - dh) / 2, dw, dh);
    return new Promise(function (resolve) { c.toBlob(resolve, 'image/jpeg', 0.86); });
  }

  imgInput.addEventListener('change', function () {
    var files = Array.prototype.slice.call(imgInput.files || []);
    if (!files.length) return;
    var trim = $('imgTrim').checked;
    imgStatus.textContent = files.length + ' зураг боловсруулж байна…';
    var failed = 0;
    var seq = Promise.resolve();
    files.forEach(function (f) {
      seq = seq.then(function () {
        return loadImage(f).then(function (r) {
          return normalise(r.im, trim).then(function (blob) {
            URL.revokeObjectURL(r.url);
            var base = f.name.replace(/\.[^.]+$/, '').replace(/[^\wЀ-ӿ-]+/g, '_') || 'zurag';
            var name = base + '.jpg';
            var n = 2;
            while (processed.some(function (p) { return p.name === name; })) name = base + '_' + (n++) + '.jpg';
            var url = URL.createObjectURL(blob);
            processed.push({ name: name, blob: blob, url: url });
            var div = document.createElement('div');
            div.className = 'thumb';
            div.innerHTML = '<img src="' + url + '" alt=""><a href="' + url + '" download="' + esc(name) + '">' + esc(name) + '</a>' + Math.round(blob.size / 1024) + ' KB';
            thumbs.appendChild(div);
          });
        }).catch(function () { failed++; });
      });
    });
    seq.then(function () {
      imgStatus.textContent = processed.length + ' зураг бэлэн' + (failed ? '. ' + failed + ' файлыг уншиж чадсангүй (зургийн файл биш эсвэл HEIC хэлбэртэй байж болно).' : '.');
      imgActions.hidden = processed.length === 0;
      imgInput.value = '';
    });
  });

  $('imgClear').addEventListener('click', function () {
    processed.forEach(function (p) { URL.revokeObjectURL(p.url); });
    processed = [];
    thumbs.innerHTML = '';
    imgActions.hidden = true;
    imgStatus.textContent = '';
  });

  var jszipLoading = null;
  function loadJSZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (jszipLoading) return jszipLoading;
    jszipLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'assets/vendor/jszip.min.js';
      s.onload = function () { resolve(window.JSZip); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return jszipLoading;
  }

  $('imgZip').addEventListener('click', function () {
    if (!processed.length) return;
    var b = this;
    b.disabled = true;
    loadJSZip().then(function (JSZip) {
      var zip = new JSZip();
      processed.forEach(function (p) { zip.file(p.name, p.blob); });
      return zip.generateAsync({ type: 'blob' });
    }).then(function (blob) {
      downloadBlob(blob, 'buteegdehuun-zurag.zip');
    }).catch(function () {
      imgStatus.textContent = 'ZIP үүсгэж чадсангүй. Зураг бүрийн нэр дээр дарж тус тусад нь татна уу.';
    }).finally(function () { b.disabled = false; });
  });
})();
