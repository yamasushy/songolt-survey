/**
 * Сонголтын туршилтын судалгаа: Google Sheets backend
 *
 * Энэ кодыг Google Sheet-ийн Extensions > Apps Script хэсэгт хуулж тавина.
 * Дэлгэрэнгүй заавар: тохируулах хуудасны 1-6 дугаар алхам.
 *
 * Хадгалах өгөгдөл: зөвхөн энэ Google Sheet болон таны Google Drive.
 * Гуравдагч этгээдийн сервер рүү юу ч илгээхгүй.
 */

var APP_VERSION = '1.2.0';
var SITE_URL = '__SITE_URL__';

var SHEET = {
  SETTINGS: 'Тохиргоо',
  ATTRS: 'Үзүүлэлт',
  PRODUCTS: 'Бүтээгдэхүүн',
  QUESTIONS: 'Асуулт',
  RESPONSES: 'Хариулт',
  STARTED: 'Эхэлсэн',
  SUMMARY: 'Тойм'
};

var YES = 'Тийм';
var NO = 'Үгүй';

// [Шошго, түлхүүр, анхны утга, тайлбар]
var SETTINGS_SPEC = [
  ['Судалгааны гарчиг', 'title', '', 'Оролцогчид хамгийн эхэнд харагдана. Заавал бөглөнө.'],
  ['Танилцуулга', 'intro', 'Энэхүү судалгаа нь хэрэглэгч бүтээгдэхүүн хэрхэн сонгодог талаар судлах зорилготой. Таны хариулт нэрээ нууцалсан хэлбэрээр зөвхөн судалгааны зорилгоор ашиглагдана.', 'Судалгааны зорилго, үргэлжлэх хугацаа, нууцлалын тухай. Өөрийн судалгаанд тохируулж засна.'],
  ['Зөвшөөрлийн текст', 'consent', 'Би судалгааны зорилгыг ойлгосон бөгөөд сайн дураараа оролцохыг зөвшөөрч байна.', 'Чагтлах нүдний хажууд харагдана.'],
  ['Ерөнхий хэсгийн гарчиг', 'generalTitle', 'Ерөнхий мэдээлэл', ''],
  ['Ерөнхий хэсгийн байрлал', 'generalPosition', 'Төгсгөлд', 'Төгсгөлд: манипуляцийн шалгалтын дараа, илгээхийн өмнө (зөвлөмж). Эхэнд: зөвшөөрлийн дараа.'],
  ['Туршлагын хэсгийн гарчиг', 'experienceTitle', 'Бүтээгдэхүүний өмнөх туршлага', 'Асуулт хуудсанд "Өмнөх туршлага" хэсгийн асуулт байвал даалгаврын өмнө тусдаа хуудсаар харагдана.'],
  ['Туршлагын хэсгийн заавар', 'experienceIntro', '', 'Хоосон байж болно.'],
  ['Даалгаврын гарчиг', 'taskTitle', 'Бүтээгдэхүүн сонгох', 'Дөрвөн нөхцөлд ижил харагдана.'],
  ['Үзүүлэлтийн тайлбарын гарчиг', 'glossaryTitle', 'Үзүүлэлтүүдийн тайлбар', 'Үзүүлэлт хуудасны "Товч тайлбар" бөглөгдсөн үед бүтээгдэхүүний дээр харагдана. 4 үзүүлэлттэй нөхцөлд зөвхөн тэр 4-ийн тайлбар харагдана.'],
  ['Даалгаврын заавар', 'task', 'Та зөөврийн цэнэглэгч худалдаж авах гэж байна гэж төсөөлнө үү. Доорх бүтээгдэхүүнүүдийг харьцуулж, өөрт хамгийн тохиромжтой гэж үзсэн нэгийг сонгоно уу.', 'Дөрвөн нөхцөлд ижил харагдана. Бүтээгдэхүүний тоог энд бичихгүй.'],
  ['COS хэсгийн гарчиг', 'cosTitle', 'Таны сонголтын тухай', ''],
  ['COS хэсгийн заавар', 'cosIntro', 'Сая хийсэн сонголтоо бодож, доорх өгүүлбэр тус бүртэй хэр санал нийлж байгаагаа үнэлнэ үү.', ''],
  ['Шалгах хэсгийн гарчиг', 'checkTitle', 'Нэмэлт асуулт', ''],
  ['Шалгах хэсгийн заавар', 'checkIntro', '', 'Хоосон байж болно.'],
  ['Талархлын текст', 'thanks', 'Судалгаанд оролцсонд баярлалаа. Таны хариулт амжилттай хадгалагдлаа.', ''],
  ['Likert түвшний тоо', 'likertPoints', '7', '5 эсвэл 7. Асуулт бүрт тусад нь өөр хэмжүүр өгч болно.'],
  ['Likert доод утгын тайлбар', 'likertLow', 'Огт санал нийлэхгүй', ''],
  ['Likert дээд утгын тайлбар', 'likertHigh', 'Бүрэн санал нийлнэ', ''],
  ['Бүтээгдэхүүний дарааллыг холих', 'shuffle', YES, 'Тийм: оролцогч бүрт санамсаргүй дараалал (байрлалын нөлөөг тэнцвэржүүлнэ). Үгүй: хүснэгтийн дарааллаар.'],
  ['Нэг төхөөрөмжөөс дахин бөглөхийг хориглох', 'oncePerDevice', YES, 'Нэг компьютер дээр олон хүн бөглөх бол Үгүй болгоно.'],
  ['Нөхцөл тус бүрийн зорилтот тоо', 'target', '', 'Нөхцөл бүрт хэдэн оролцогч бүрэн бөглөх ёстой вэ. Жишээ: 40. Хүрсэн нөхцөл автоматаар хаагдаж, оролцогчид дутуу нөхцөлд очно. Хоосон бол хязгааргүй. Хадгалмагц шууд үйлчилнэ.'],
  ['Нээлттэй нөхцөл', 'openConditions', '', 'Хоосон бол бүх нөхцөл. Зөвхөн тодорхой нөхцөлд оролцогч нэмэх бол бичнэ. Жишээ: 18x8 эсвэл 6x8, 18x8. Хадгалмагц шууд үйлчилнэ.'],
  ['Төлөв', 'status', 'Нээлттэй', 'Нээлттэй эсвэл Хаалттай. Хаалттай үед шинэ оролцогч эхлүүлэхгүй (эхэлсэн оролцогч дуусгаж илгээх боломжтой). Хадгалмагц шууд үйлчилнэ.']
];

var QUESTION_SECTIONS = { 'Өмнөх туршлага': 'experience', 'COS': 'cos', 'Шалгах': 'check', 'Ерөнхий': 'general' };
var GENERAL_POSITIONS = { 'Эхэнд': 'start', 'Төгсгөлд': 'end' };

// Тохиргоо хуудасны сонголтын жагсаалттай мөрүүд
var SETTING_DROPDOWNS = {
  shuffle: [YES, NO],
  oncePerDevice: [YES, NO],
  status: ['Нээлттэй', 'Хаалттай'],
  likertPoints: ['5', '7'],
  generalPosition: ['Төгсгөлд', 'Эхэнд']
};
var QUESTION_TYPES = { 'Сонголт': 'choice', 'Likert': 'likert', 'Текст': 'text', 'Тоо': 'number' };

// Хариултын хүснэгтийн тогтмол баганууд (дарааллыг өөрчлөхгүй)
var FIXED_COLUMNS = [
  ['submittedAt', 'Илгээсэн огноо'],
  ['pid', 'Оролцогчийн код'],
  ['condition', 'Нөхцөл'],
  ['nProducts', 'Бүтээгдэхүүний тоо'],
  ['nAttributes', 'Үзүүлэлтийн тоо'],
  ['choiceCode', 'Сонгосон бүтээгдэхүүний код'],
  ['choiceName', 'Сонгосон бүтээгдэхүүний нэр'],
  ['choicePosition', 'Сонгосон байрлал'],
  ['decisionSec', 'Шийдвэр гаргах хугацаа (сек)'],
  ['selectionChanges', 'Сонголт өөрчилсөн тоо'],
  ['cardsSeen', 'Харсан бүтээгдэхүүний тоо'],
  ['order', 'Харуулсан дараалал'],
  ['device', 'Төхөөрөмж'],
  ['viewportWidth', 'Дэлгэцийн өргөн (px)'],
  ['totalSec', 'Нийт хугацаа (сек)'],
  ['reloads', 'Хуудас дахин ачаалсан тоо'],
  ['configVersion', 'Тохиргооны хувилбар'],
  ['assignment', 'Хуваарилалт']
];

var ATTR_DESC_HEADER = 'Товч тайлбар (оролцогчид харагдана)';

var STARTED_HEADER = ['Оролцогчийн код', 'Нөхцөл', 'Эхэлсэн огноо', 'Дууссан огноо', 'Хуваарилалт'];

// Эхэлсэн боловч дуусаагүй оролцогчийг энэ хугацааны турш "явж байгаа" гэж тооцно.
// Үүнээс хойш дуусаагүй бол орхисон гэж үзээд тухайн нөхцөлд шинэ оролцогч хуваарилна.
var IN_PROGRESS_MINUTES = 30;

var SHEET_ORDER = [SHEET.SETTINGS, SHEET.ATTRS, SHEET.PRODUCTS, SHEET.QUESTIONS, SHEET.RESPONSES, SHEET.STARTED, SHEET.SUMMARY];

var MAX_TEXT = 2000;
var MAX_IMAGE_BYTES = 1500000;
var WARN_IMAGE_BYTES = 400000;

/* ----------------------------------------------------------------------
 * Цэс
 * -------------------------------------------------------------------- */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Судалгаа')
    .addItem('1. Загвар хуудсуудыг үүсгэх', 'setupSheets')
    .addItem('2. Тохиргоог шалгаж нийтлэх', 'publishConfig')
    .addItem('3. Оролцогчийн холбоос харах', 'showParticipantLink')
    .addToUi();
}

/* ----------------------------------------------------------------------
 * 1. Загвар хуудсууд
 * -------------------------------------------------------------------- */

function sheetBuilders_() {
  var b = {};
  b[SHEET.SETTINGS] = buildSettingsSheet_;
  b[SHEET.ATTRS] = buildAttrsSheet_;
  b[SHEET.PRODUCTS] = buildProductsSheet_;
  b[SHEET.QUESTIONS] = buildQuestionsSheet_;
  b[SHEET.RESPONSES] = buildResponsesSheet_;
  b[SHEET.STARTED] = buildStartedSheet_;
  b[SHEET.SUMMARY] = buildSummaryPlaceholder_;
  return b;
}

/**
 * Хуудсыг нэрээр нь авна. Байхгүй бол загвараар нь үүсгэнэ.
 * Веб апп болон цэс аль аль нь үүгээр дамжина, тиймээс хуудас дутуу байсан ч алдаа гарахгүй.
 */
function getSheet_(name) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (sh) return sh;
  sh = ss.insertSheet(name, ss.getSheets().length);
  var builder = sheetBuilders_()[name];
  if (builder) builder(sh);
  return sh;
}

function setupSheets() {
  var ss = SpreadsheetApp.getActive();
  var ui = SpreadsheetApp.getUi();
  var builders = sheetBuilders_();
  var created = [];
  var skipped = [];
  var failed = [];

  SHEET_ORDER.forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (sh && sh.getLastRow() > 0) { skipped.push(name); return; }
    try {
      if (!sh) sh = ss.insertSheet(name, ss.getSheets().length);
      builders[name](sh);
      created.push(name);
    } catch (err) {
      failed.push(name + ': ' + (err && err.message ? err.message : err));
    }
  });

  // Анхдагч хоосон "Sheet1"-ийг устгах
  ['Sheet1', 'Хуудас1', 'Лист1'].forEach(function (n) {
    var sh = ss.getSheetByName(n);
    if (sh && sh.getLastRow() === 0 && ss.getSheets().length > 1) {
      try { ss.deleteSheet(sh); } catch (e) { /* устгах боломжгүй бол үлдээнэ */ }
    }
  });
  var migrated = migrateSheets_();
  var first = ss.getSheetByName(SHEET.SETTINGS);
  if (first) first.activate();

  var ready = SHEET_ORDER.filter(function (n) { return !!ss.getSheetByName(n); }).length;
  var msg = 'Бэлэн хуудас: ' + ready + ' / ' + SHEET_ORDER.length + '\n\n';
  if (created.length) msg += 'Үүсгэсэн: ' + created.join(', ') + '\n\n';
  if (skipped.length) msg += 'Өгөгдөлтэй тул хөндөөгүй: ' + skipped.join(', ') + '\n\n';
  if (migrated.length) msg += migrated.join('\n') + '\n\n';
  if (failed.length) {
    msg += 'Алдаа гарсан:\n' + failed.join('\n') + '\n\nЭнэ мэдээллийг судалгааны хуудсыг бэлдсэн хүнд илгээнэ үү.';
    ui.alert('Зарим хуудас үүссэнгүй', msg, ui.ButtonSet.OK);
    return;
  }
  msg += 'Дараагийн алхам: Тохиргоо, Үзүүлэлт, Бүтээгдэхүүн, Асуулт хуудсуудыг бөглөөд "2. Тохиргоог шалгаж нийтлэх" цэсийг дарна уу.';
  ui.alert('Загвар бэлэн боллоо', msg, ui.ButtonSet.OK);
}

/**
 * Хуучин хувилбараар үүссэн Тохиргоо хуудсанд шинэ тохиргооны мөрийг нэмнэ.
 */
function ensureSettingsRows_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET.SETTINGS);
  if (!sh || sh.getLastRow() === 0) return [];
  var labels = sh.getRange(1, 1, sh.getLastRow(), 1).getDisplayValues().map(function (r) { return String(r[0]).trim(); });
  var added = [];
  SETTINGS_SPEC.forEach(function (spec) {
    if (labels.indexOf(spec[0]) >= 0) return;
    var r = sh.getLastRow() + 1;
    sh.getRange(r, 1, 1, 3).setValues([[spec[0], spec[2], spec[3]]]);
    sh.getRange(r, 1).setFontWeight('bold');
    sh.getRange(r, 2, 1, 2).setWrap(true).setVerticalAlignment('top');
    sh.getRange(r, 3).setFontColor('#5e6a65');
    if (SETTING_DROPDOWNS[spec[1]]) setDropdown_(sh.getRange(r, 2), SETTING_DROPDOWNS[spec[1]]);
    added.push(spec[0]);
  });
  return added;
}

function ensureStartedHeader_(sh) {
  var lc = Math.max(sh.getLastColumn(), STARTED_HEADER.length);
  var header = sh.getRange(1, 1, 1, lc).getDisplayValues()[0];
  var changed = false;
  STARTED_HEADER.forEach(function (h, i) { if (!header[i]) { header[i] = h; changed = true; } });
  if (changed) {
    sh.getRange(1, 1, 1, header.length).setValues([header]);
    styleHeader_(sh, header.length);
  }
}

function buildResponsesSheet_(sh) {
  sh.getRange(1, 1, 1, FIXED_COLUMNS.length).setValues([FIXED_COLUMNS.map(function (c) { return c[1]; })]);
  styleHeader_(sh, FIXED_COLUMNS.length);
}

function buildStartedSheet_(sh) {
  sh.getRange(1, 1, 1, STARTED_HEADER.length).setValues([STARTED_HEADER]);
  styleHeader_(sh, STARTED_HEADER.length);
  sh.setColumnWidths(1, STARTED_HEADER.length, 170);
}

function buildSummaryPlaceholder_(sh) {
  sh.getRange(1, 1).setValue('Тойм хэсэг "2. Тохиргоог шалгаж нийтлэх" цэсийг ажиллуулсны дараа бөглөгдөнө.');
}

function setNotes_(sh, col, lines) {
  sh.getRange(1, col).setValue('Тайлбар').setFontWeight('bold').setBackground('#e6ece9');
  sh.getRange(2, col, lines.length, 1)
    .setValues(lines.map(function (l) { return [l]; }))
    .setWrap(false).setVerticalAlignment('top').setFontColor('#5e6a65');
  sh.setColumnWidth(col - 1, 24);
  sh.setColumnWidth(col, 520);
}

function buildSettingsSheet_(sh) {
  var rows = [['Тохиргоо', 'Утга', 'Тайлбар']];
  SETTINGS_SPEC.forEach(function (s) { rows.push([s[0], s[2], s[3]]); });
  sh.getRange(1, 1, rows.length, 3).setValues(rows);
  styleHeader_(sh, 3);
  sh.setColumnWidth(1, 260);
  sh.setColumnWidth(2, 460);
  sh.setColumnWidth(3, 380);
  sh.getRange(2, 1, rows.length - 1, 1).setFontWeight('bold');
  sh.getRange(2, 2, rows.length - 1, 2).setWrap(true).setVerticalAlignment('top');
  sh.getRange(2, 3, rows.length - 1, 1).setFontColor('#5e6a65');
  var keys = SETTINGS_SPEC.map(function (s) { return s[1]; });
  Object.keys(SETTING_DROPDOWNS).forEach(function (k) { setDropdown_(sh.getRange(2 + keys.indexOf(k), 2), SETTING_DROPDOWNS[k]); });
  sh.getRange(2 + keys.indexOf('title'), 2).setBackground('#fff4d6');
}

function buildAttrsSheet_(sh) {
  var rows = [['Код', 'Үзүүлэлтийн нэр', '4 үзүүлэлттэй нөхцөлд харуулах', ATTR_DESC_HEADER]];
  for (var i = 1; i <= 8; i++) rows.push(['У' + i, '', i <= 4 ? YES : NO, '']);
  sh.getRange(1, 1, rows.length, 4).setValues(rows);
  styleHeader_(sh, 4);
  sh.setColumnWidth(1, 70);
  sh.setColumnWidth(2, 240);
  sh.setColumnWidth(3, 200);
  sh.setColumnWidth(4, 420);
  sh.getRange(2, 2, 8, 1).setBackground('#fff4d6');
  sh.getRange(2, 4, 8, 1).setBackground('#fff4d6').setWrap(true);
  setNotes_(sh, 6, [
    'Үзүүлэлтүүд картан дээр болон тайлбарын хэсэгт энэ дарааллаар харагдана.',
    '"4 үзүүлэлттэй нөхцөлд харуулах" баганад бага нөхцөлд харагдах үзүүлэлтийг Тийм гэж тэмдэглэнэ.',
    'Товч тайлбар: 1 өгүүлбэр, үнэлгээгүй (сайн, муу гэж хэлэхгүй). Хоосон бол тайлбарын хэсэг харагдахгүй.',
    'Үзүүлэлт нэмбэл энд мөр нэмж, Бүтээгдэхүүн хуудсанд мөн багана нэмнэ.'
  ]);
  setDropdown_(sh.getRange(2, 3, 8, 1), [YES, NO]);
}

function buildProductsSheet_(sh) {
  var header = ['Код', 'Бүтээгдэхүүний нэр', 'Зураг (Drive холбоос эсвэл https URL)', '6 бүтээгдэхүүнтэй нөхцөлд харуулах'];
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  // Үзүүлэлтийн нэрийг толгойд автоматаар харуулна
  for (var i = 1; i <= 8; i++) {
    sh.getRange(1, header.length + i).setFormula("=IF('" + SHEET.ATTRS + "'!B" + (i + 1) + "=\"\",\"У" + i + "\",'" + SHEET.ATTRS + "'!A" + (i + 1) + "&\": \"&'" + SHEET.ATTRS + "'!B" + (i + 1) + ")");
  }
  var rows = [];
  for (var p = 1; p <= 18; p++) {
    rows.push(['Б' + (p < 10 ? '0' + p : p), '', '', p <= 6 ? YES : NO]);
  }
  sh.getRange(2, 1, rows.length, 4).setValues(rows);
  styleHeader_(sh, header.length + 8);
  sh.setColumnWidth(1, 60);
  sh.setColumnWidth(2, 200);
  sh.setColumnWidth(3, 280);
  sh.setColumnWidth(4, 150);
  sh.setColumnWidths(5, 8, 140);
  sh.setFrozenColumns(2);
  setDropdown_(sh.getRange(2, 4, 18, 1), [YES, NO]);
  sh.getRange(2, 2, 18, 2).setBackground('#fff4d6');
  sh.getRange(2, 5, 18, 8).setBackground('#fff4d6');
}

function buildQuestionsSheet_(sh) {
  var rows = [['Хэсэг', 'Код', 'Асуулт', 'Төрөл', 'Сонголтууд', 'Заавал хариулах']];
  rows.push(['Ерөнхий', 'NAS', 'Таны нас', 'Тоо', '', YES]);
  rows.push(['Ерөнхий', 'HUIS', 'Таны хүйс', 'Сонголт', 'Эрэгтэй; Эмэгтэй; Хариулахгүй', YES]);
  for (var i = 1; i <= 8; i++) rows.push(['COS', 'COS' + i, '[COS хэмжүүрийн ' + i + ' дэх өгүүлбэрийг энд бичнэ]', 'Likert', '', YES]);
  rows.push(['Шалгах', 'MC1', '[Manipulation check-ийн 1 дэх асуултыг энд бичнэ]', 'Likert', '', YES]);
  rows.push(['Шалгах', 'MC2', '[Manipulation check-ийн 2 дахь асуултыг энд бичнэ]', 'Likert', '', YES]);
  sh.getRange(1, 1, rows.length, 6).setValues(rows);
  styleHeader_(sh, 6);
  sh.setColumnWidth(1, 90);
  sh.setColumnWidth(2, 80);
  sh.setColumnWidth(3, 460);
  sh.setColumnWidth(4, 90);
  sh.setColumnWidth(5, 300);
  sh.setColumnWidth(6, 130);
  sh.getRange(2, 3, rows.length - 1, 1).setWrap(true);
  // Тайлбарыг асуултын баганаас тусад нь (H баганад) бичнэ. Dropdown-тэй нүдэнд текст бичихгүй.
  setNotes_(sh, 8, [
    'Асуулт нэмэх: шинэ мөр нэмээд Хэсэг, Код, Асуулт, Төрлийг бөглөнө. Кодыг өөрчлөх шаардлагагүй. Дараа нь "2. Тохиргоог шалгаж нийтлэх" цэсийг дахин дарна.',
    'Хуудасны дараалал: Өмнөх туршлага > Бүтээгдэхүүн сонгох > COS > Шалгах > Ерөнхий. Ерөнхий хэсгийг Тохиргоо хуудаснаас эхэнд шилжүүлж болно.',
    'Асуултууд хэсэг бүрийн дотор энэ хүснэгтийн дарааллаар харагдана.',
    'Сонголт төрөл: сонголтуудыг цэг таслалаар (;) тусгаарлана. Жишээ: Эрэгтэй; Эмэгтэй',
    'Likert төрөл: хоосон бол Тохиргоо хуудасны хэмжүүрийг ашиглана. Өөр хэмжүүр хэрэгтэй бол: 7; Маш цөөн; Маш олон',
    'Код: хариултын хүснэгтийн баганын нэр болно. Давхардахгүй, латин үсэг ба тоо ашиглахыг зөвлөе (жишээ: BOLOVSROL).',
    '[ ] хаалттай текстийг өөрийн асуултаар солихгүй бол нийтлэх үед алдаа заана.'
  ]);
  setQuestionDropdowns_(sh);
}

function setQuestionDropdowns_(sh) {
  var n = Math.max(sh.getLastRow(), 1) + 100;
  setDropdown_(sh.getRange(2, 1, n, 1), Object.keys(QUESTION_SECTIONS));
  setDropdown_(sh.getRange(2, 4, n, 1), Object.keys(QUESTION_TYPES));
  setDropdown_(sh.getRange(2, 6, n, 1), [YES, NO]);
}

/**
 * Хуучин хувилбараар үүссэн хуудсуудыг шинэ бүтэцтэй нийцүүлнэ.
 * Өгөгдлийг хөндөхгүй: зөвхөн толгой мөр, сонголтын жагсаалтыг шинэчилнэ.
 */
function migrateSheets_() {
  var ss = SpreadsheetApp.getActive();
  var notes = [];
  var added = ensureSettingsRows_();
  if (added.length) notes.push('Тохиргоо хуудсанд нэмсэн мөр: ' + added.join(', '));
  var q = ss.getSheetByName(SHEET.QUESTIONS);
  // Хуучин хувилбарын жагсаалт шинэ хэсгийн нэрийг хориглодог байсан
  if (q && q.getLastRow() > 0) setQuestionDropdowns_(q);
  var a = ss.getSheetByName(SHEET.ATTRS);
  if (a && a.getLastRow() > 0 && !String(a.getRange(1, 4).getDisplayValue()).trim()) {
    a.getRange(1, 4).setValue(ATTR_DESC_HEADER).setFontWeight('bold').setBackground('#e6ece9').setWrap(true);
    a.setColumnWidth(4, 420);
    var last = Math.max(a.getLastRow(), 2);
    a.getRange(2, 4, Math.min(last - 1, 8), 1).setBackground('#fff4d6').setWrap(true);
    notes.push('Үзүүлэлт хуудсанд "Товч тайлбар" багана (D) нэмсэн');
  }
  var st = ss.getSheetByName(SHEET.STARTED);
  if (st) ensureStartedHeader_(st);
  return notes;
}

function styleHeader_(sh, cols) {
  var r = sh.getRange(1, 1, 1, cols);
  r.setFontWeight('bold').setBackground('#e6ece9').setWrap(true).setVerticalAlignment('middle');
  sh.setFrozenRows(1);
}

function setDropdown_(range, values) {
  // Буруу утгыг хориглохгүй, зөвхөн анхааруулна. Хориглосон үед скрипт болон хуулж тавих (paste) үйлдэл
  // алдаа өгдөг. Утгын зөв эсэхийг "2. Тохиргоог шалгаж нийтлэх" цэс шалгана.
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(true).build();
  range.setDataValidation(rule);
}

/* ----------------------------------------------------------------------
 * 2. Шалгаж нийтлэх
 * -------------------------------------------------------------------- */

function publishConfig() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActive();
  migrateSheets_();
  var missing = [SHEET.SETTINGS, SHEET.ATTRS, SHEET.PRODUCTS, SHEET.QUESTIONS].filter(function (n) { return !ss.getSheetByName(n); });
  if (missing.length) {
    ui.alert('Хуудас дутуу', 'Дараах хуудас олдсонгүй: ' + missing.join(', ') + '\n\nЭхлээд "1. Загвар хуудсуудыг үүсгэх" цэсийг ажиллуулна уу.', ui.ButtonSet.OK);
    return;
  }

  var raw = {
    settings: readSheet_(SHEET.SETTINGS),
    attrs: readSheet_(SHEET.ATTRS),
    products: readSheet_(SHEET.PRODUCTS),
    questions: readSheet_(SHEET.QUESTIONS)
  };
  var result = buildConfig_(raw, resolveImage_);

  if (result.errors.length) {
    ui.alert('Нийтлэх боломжгүй: ' + result.errors.length + ' алдаа',
      result.errors.slice(0, 25).map(function (e) { return '• ' + e; }).join('\n') +
      (result.errors.length > 25 ? '\n... болон бусад ' + (result.errors.length - 25) + ' алдаа' : '') +
      '\n\nАлдааг засаад дахин нийтэлнэ үү.', ui.ButtonSet.OK);
    return;
  }

  var config = result.config;
  config.version = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  var json = JSON.stringify(config);
  if (json.length > 9000000) {
    ui.alert('Зураг хэт том', 'Нийт хэмжээ ' + Math.round(json.length / 1048576) + ' MB байна. Зургуудыг тохируулах хуудасны "Зураг жигдлэх" хэрэгслээр багасгаад дахин оруулна уу.', ui.ButtonSet.OK);
    return;
  }
  saveConfigFile_(json);

  var props = PropertiesService.getScriptProperties();
  props.setProperty('VALIDATION', JSON.stringify(result.validation));

  ensureResponseHeaders_(result.validation.questionCodes);
  ensureStartedHeader_(getSheet_(SHEET.STARTED));
  buildSummarySheet_(config.conditions);

  // Шууд үйлчлэх тохиргоог (зорилт, нээлттэй нөхцөл) шалгана
  var ids = config.conditions.map(function (c) { return c.id; });
  var live = liveSettings_();
  var avail = availableConditions_(ids, live, tallyStarted_([], ids, Date.now(), IN_PROGRESS_MINUTES));
  if (avail.error) result.warnings.unshift(avail.error + ' Засахгүй бол шинэ оролцогч эхлүүлж чадахгүй.');

  var msg = 'Нөхцөл: ' + config.conditions.map(function (c) { return c.id; }).join(', ') + '\n' +
    'Бүтээгдэхүүн: ' + config.products.length + ', үзүүлэлт: ' + config.attributes.length + ', асуулт: ' + config.questions.length + '\n' +
    'Хэмжээ: ' + (json.length / 1048576).toFixed(2) + ' MB\n';
  if (result.warnings.length) {
    msg += '\nАнхааруулга:\n' + result.warnings.slice(0, 15).map(function (w) { return '• ' + w; }).join('\n') + '\n';
  }
  var url = webAppUrl_();
  msg += url
    ? '\nХүснэгтийн өөрчлөлт оролцогчдод шууд харагдана. Кодоо шинэчилсэн бол Apps Script дээр Deploy > Manage deployments > засах > Version: New version > Deploy хийнэ.'
    : '\nДараагийн алхам: Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).';
  ui.alert('Амжилттай нийтэллээ', msg, ui.ButtonSet.OK);
}

function readSheet_(name) {
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) return [];
  var lr = sh.getLastRow();
  var lc = sh.getLastColumn();
  if (lr < 1 || lc < 1) return [];
  return sh.getRange(1, 1, lr, lc).getDisplayValues();
}

/**
 * Цэвэр функц: хүснэгтийн өгөгдлөөс тохиргоо үүсгэж шалгана.
 * imageResolver(raw, label, errors, warnings) -> string
 */
function buildConfig_(raw, imageResolver) {
  var errors = [];
  var warnings = [];
  var t = function (v) { return String(v === undefined || v === null ? '' : v).trim(); };
  var isYes = function (v) { return t(v).toLowerCase() === YES.toLowerCase(); };

  // Тохиргоо
  var settings = {};
  var labelToKey = {};
  SETTINGS_SPEC.forEach(function (s) { labelToKey[s[0]] = s[1]; settings[s[1]] = s[2]; });
  (raw.settings || []).slice(1).forEach(function (r) {
    var key = labelToKey[t(r[0])];
    if (key) settings[key] = t(r[1]);
  });
  if (!settings.title) errors.push('Тохиргоо: "Судалгааны гарчиг" хоосон байна.');
  var points = parseInt(settings.likertPoints, 10);
  if ([5, 7].indexOf(points) < 0) { errors.push('Тохиргоо: "Likert түвшний тоо" 5 эсвэл 7 байх ёстой.'); points = 7; }
  var status = t(settings.status) === 'Хаалттай' ? 'closed' : 'open';
  var generalPosition = GENERAL_POSITIONS[t(settings.generalPosition)];
  if (!generalPosition) { errors.push('Тохиргоо: "Ерөнхий хэсгийн байрлал" нь Эхэнд эсвэл Төгсгөлд байх ёстой.'); generalPosition = 'end'; }
  var cfgSettings = {
    title: settings.title,
    intro: settings.intro,
    consent: settings.consent || 'Би судалгаанд оролцохыг зөвшөөрч байна.',
    generalTitle: settings.generalTitle,
    generalPosition: generalPosition,
    experienceTitle: settings.experienceTitle,
    experienceIntro: settings.experienceIntro,
    glossaryTitle: settings.glossaryTitle,
    taskTitle: settings.taskTitle,
    task: settings.task,
    cosTitle: settings.cosTitle,
    cosIntro: settings.cosIntro,
    checkTitle: settings.checkTitle,
    checkIntro: settings.checkIntro,
    thanks: settings.thanks,
    likert: { points: points, low: settings.likertLow, high: settings.likertHigh },
    shuffle: isYes(settings.shuffle),
    oncePerDevice: isYes(settings.oncePerDevice)
  };

  // Үзүүлэлт
  var attributes = [];
  var attrCodes = {};
  (raw.attrs || []).slice(1).forEach(function (r, i) {
    var code = t(r[0]);
    var name = t(r[1]);
    if (!code && !name) return;
    if (!name && !t(r[2]) && code.length > 20) return; // тайлбар мөр
    if (!code || !/^[^\s]{1,20}$/.test(code)) { errors.push('Үзүүлэлт ' + (i + 2) + ' дугаар мөр: код хоосон, хэт урт эсвэл зайтай байна.'); return; }
    if (attrCodes[code]) { errors.push('Үзүүлэлт: "' + code + '" код давхардсан.'); return; }
    if (!name) { errors.push('Үзүүлэлт ' + code + ': нэр хоосон байна.'); return; }
    attrCodes[code] = true;
    var desc = t(r[3]);
    if (desc.length > 300) warnings.push('Үзүүлэлт ' + code + ': тайлбар ' + desc.length + ' тэмдэгт. 1 өгүүлбэрт (150 орчим тэмдэгт) багтаахыг зөвлөе.');
    attributes.push({ code: code, name: name, inSmall: isYes(r[2]), desc: desc });
  });
  var nAttrSmall = attributes.filter(function (a) { return a.inSmall; }).length;
  var nDesc = attributes.filter(function (a) { return a.desc; }).length;
  if (nDesc && nDesc < attributes.length) {
    errors.push('Үзүүлэлт: товч тайлбар ' + attributes.length + '-аас ' + nDesc + '-д нь л бөглөгдсөн. Нөхцөлүүдийг тэнцүү байлгахын тулд бүгдийг бөглөх эсвэл бүгдийг хоосон үлдээнэ.');
  }
  if (attributes.length < 2) errors.push('Үзүүлэлт: дор хаяж 2 үзүүлэлт шаардлагатай.');
  if (attributes.length && (nAttrSmall < 1 || nAttrSmall >= attributes.length)) {
    errors.push('Үзүүлэлт: "4 үзүүлэлттэй нөхцөлд харуулах" баганад 1-ээс ' + (attributes.length - 1) + ' хүртэлх мөрийг Тийм гэж тэмдэглэнэ. Одоо ' + nAttrSmall + ' байна.');
  }

  // Бүтээгдэхүүн
  var products = [];
  var prodCodes = {};
  var rows = (raw.products || []).slice(1);
  rows.forEach(function (r, i) {
    var code = t(r[0]);
    var name = t(r[1]);
    var img = t(r[2]);
    var rest = r.slice(4, 4 + attributes.length).map(t).join('');
    if (!name && !img && !rest) return; // хоосон мөр
    var label = 'Бүтээгдэхүүн ' + (code || ((i + 2) + ' дугаар мөр'));
    if (!code) { errors.push(label + ': код хоосон байна.'); return; }
    if (prodCodes[code]) { errors.push('Бүтээгдэхүүн: "' + code + '" код давхардсан.'); return; }
    prodCodes[code] = true;
    if (!name) errors.push(label + ': нэр хоосон байна.');
    if (!img) errors.push(label + ': зураг оруулаагүй байна.');
    var values = {};
    attributes.forEach(function (a, j) {
      var v = t(r[4 + j]);
      if (!v) errors.push(label + ': "' + a.name + '" үзүүлэлтийн утга хоосон байна.');
      values[a.code] = v;
    });
    var image = img ? imageResolver(img, label, errors, warnings) : '';
    products.push({ code: code, name: name, image: image, inSmall: isYes(r[3]), values: values });
  });
  var nProdSmall = products.filter(function (p) { return p.inSmall; }).length;
  if (products.length < 2) errors.push('Бүтээгдэхүүн: дор хаяж 2 бүтээгдэхүүн шаардлагатай.');
  if (products.length && (nProdSmall < 1 || nProdSmall >= products.length)) {
    errors.push('Бүтээгдэхүүн: "6 бүтээгдэхүүнтэй нөхцөлд харуулах" баганад 1-ээс ' + (products.length - 1) + ' хүртэлх мөрийг Тийм гэж тэмдэглэнэ. Одоо ' + nProdSmall + ' байна.');
  }
  if (products.length === 18 && nProdSmall !== 6) warnings.push('Бага нөхцөлд ' + nProdSmall + ' бүтээгдэхүүн тэмдэглэгдсэн (таны загварт 6).');
  if (attributes.length === 8 && nAttrSmall !== 4) warnings.push('Бага нөхцөлд ' + nAttrSmall + ' үзүүлэлт тэмдэглэгдсэн (таны загварт 4).');

  // Гадны URL-ийн анхааруулгыг нэгтгэнэ
  var ext = warnings.filter(function (w) { return w.indexOf('EXTURL:') === 0; }).map(function (w) { return w.slice(7); });
  if (ext.length) {
    warnings = warnings.filter(function (w) { return w.indexOf('EXTURL:') !== 0; });
    warnings.push(ext.length + ' бүтээгдэхүүний зураг гадны URL-аас ачаалагдана (' + ext.slice(0, 6).join(', ') + (ext.length > 6 ? '…' : '') + '). Тухайн сайт зургаа хаавал харагдахгүй болно. Drive-д байршуулахыг зөвлөе.');
  }

  // Асуулт
  var reserved = {};
  FIXED_COLUMNS.forEach(function (c) { reserved[c[0].toLowerCase()] = true; reserved[c[1].toLowerCase()] = true; });
  var questions = [];
  var qCodes = {};
  (raw.questions || []).slice(1).forEach(function (r, i) {
    var sectionLabel = t(r[0]);
    var code = t(r[1]);
    var text = t(r[2]);
    if (!sectionLabel && !code && !text) return;
    if (!QUESTION_SECTIONS[sectionLabel]) {
      if (!code && !t(r[3])) return; // тайлбар мөр
      errors.push('Асуулт ' + (i + 2) + ' дугаар мөр: "Хэсэг" нь ' + Object.keys(QUESTION_SECTIONS).join(', ') + '-ын аль нэг байх ёстой (одоо: "' + sectionLabel + '").');
      return;
    }
    var label = 'Асуулт ' + (code || ((i + 2) + ' дугаар мөр'));
    if (!code) { errors.push(label + ': код хоосон байна.'); return; }
    if (!/^[A-Za-z0-9_Ѐ-ӿ-]{1,40}$/.test(code)) { errors.push(label + ': код зөвхөн үсэг, тоо, _ тэмдэгт агуулна.'); return; }
    if (qCodes[code.toLowerCase()]) { errors.push('Асуулт: "' + code + '" код давхардсан.'); return; }
    if (reserved[code.toLowerCase()]) { errors.push(label + ': энэ кодыг систем ашигладаг. Өөр код сонгоно уу.'); return; }
    qCodes[code.toLowerCase()] = true;
    if (!text) { errors.push(label + ': асуултын текст хоосон байна.'); return; }
    if (/^\[.*\]$/.test(text)) { errors.push(label + ': "' + text + '" загвар текстийг өөрийн асуултаар солино уу.'); return; }
    var type = QUESTION_TYPES[t(r[3])];
    if (!type) { errors.push(label + ': төрөл нь Сонголт, Likert, Текст, Тоо-ын аль нэг байх ёстой.'); return; }
    var q = { section: QUESTION_SECTIONS[sectionLabel], code: code, text: text, type: type, required: t(r[5]) === '' ? true : isYes(r[5]) };
    var opt = t(r[4]);
    if (type === 'choice') {
      q.options = opt.split(';').map(t).filter(function (x) { return x; });
      if (q.options.length < 2) errors.push(label + ': Сонголт төрөлд дор хаяж 2 сонголт цэг таслалаар тусгаарлан бичнэ.');
    } else if (type === 'likert') {
      if (opt) {
        var parts = opt.split(';').map(t);
        var p = parseInt(parts[0], 10);
        if (!(p >= 2 && p <= 11)) errors.push(label + ': Likert хэмжүүрийг "7; доод тайлбар; дээд тайлбар" хэлбэрээр бичнэ.');
        else q.scale = { points: p, low: parts[1] || '', high: parts[2] || '' };
      }
    }
    questions.push(q);
  });
  if (!questions.some(function (q) { return q.section === 'cos'; })) errors.push('Асуулт: COS хэсэгт дор хаяж нэг асуулт шаардлагатай.');

  // Нөхцөлүүд
  var conditions = [];
  if (products.length && attributes.length) {
    [nProdSmall, products.length].forEach(function (np) {
      [nAttrSmall, attributes.length].forEach(function (na) {
        conditions.push({ id: np + 'x' + na, label: np + ' × ' + na, products: np, attributes: na, small: { products: np === nProdSmall, attributes: na === nAttrSmall } });
      });
    });
  }

  var validation = {
    conditions: {},
    productNames: {},
    questionCodes: questions.map(function (q) { return q.code; })
  };
  conditions.forEach(function (c) {
    validation.conditions[c.id] = {
      nProducts: c.products,
      nAttributes: c.attributes,
      codes: products.filter(function (p) { return !c.small.products || p.inSmall; }).map(function (p) { return p.code; })
    };
  });
  products.forEach(function (p) { validation.productNames[p.code] = p.name.slice(0, 80); });

  return {
    errors: errors,
    warnings: warnings,
    validation: validation,
    config: {
      app: 'songolt-survey',
      appVersion: APP_VERSION,
      status: status,
      settings: cfgSettings,
      attributes: attributes,
      products: products,
      questions: questions,
      conditions: conditions
    }
  };
}

function extractDriveId_(s) {
  var m = s.match(/drive\.google\.com\/file\/d\/([-\w]{20,})/) ||
    s.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?(?:.*&)?id=([-\w]{20,})/) ||
    s.match(/docs\.google\.com\/uc\?(?:.*&)?id=([-\w]{20,})/);
  if (m) return m[1];
  if (/^[-\w]{25,}$/.test(s)) return s;
  return null;
}

function resolveImage_(rawValue, label, errors, warnings) {
  var s = String(rawValue).trim();
  var id = extractDriveId_(s);
  if (id) {
    try {
      var blob = DriveApp.getFileById(id).getBlob();
      var type = blob.getContentType();
      if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/i.test(type)) {
        errors.push(label + ': Drive дахь файл зураг биш байна (' + type + ').');
        return '';
      }
      var bytes = blob.getBytes();
      if (bytes.length > MAX_IMAGE_BYTES) {
        errors.push(label + ': зураг хэт том (' + Math.round(bytes.length / 1024) + ' KB). "Зураг жигдлэх" хэрэгслээр багасгана уу.');
        return '';
      }
      if (bytes.length > WARN_IMAGE_BYTES) warnings.push(label + ': зураг ' + Math.round(bytes.length / 1024) + ' KB. 200 KB-аас бага бол хурдан ачаална.');
      return 'data:' + type + ';base64,' + Utilities.base64Encode(bytes);
    } catch (err) {
      errors.push(label + ': Drive файлыг нээж чадсангүй. Холбоос зөв эсэх, энэ Google бүртгэлээр нээгддэг эсэхийг шалгана уу.');
      return '';
    }
  }
  if (/^https:\/\/\S+$/i.test(s)) {
    warnings.push('EXTURL:' + label.replace('Бүтээгдэхүүн ', ''));
    return s;
  }
  errors.push(label + ': зургийн холбоос буруу. Google Drive холбоос эсвэл https:// эхлэлтэй URL оруулна.');
  return '';
}

function saveConfigFile_(json) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('CONFIG_FILE_ID');
  var file = null;
  if (id) {
    try {
      file = DriveApp.getFileById(id);
      if (file.isTrashed()) file = null;
    } catch (e) { file = null; }
  }
  if (file) {
    file.setContent(json);
    return;
  }
  file = DriveApp.createFile('songolt-survey-config.json', json, 'application/json');
  props.setProperty('CONFIG_FILE_ID', file.getId());
  try {
    var parents = DriveApp.getFileById(SpreadsheetApp.getActive().getId()).getParents();
    if (parents.hasNext()) file.moveTo(parents.next());
  } catch (e) { /* байршлыг солих боломжгүй бол үндсэн хавтаст үлдэнэ */ }
}

function ensureResponseHeaders_(questionCodes) {
  var sh = getSheet_(SHEET.RESPONSES);
  var lc = Math.max(sh.getLastColumn(), 1);
  var header = sh.getRange(1, 1, 1, lc).getValues()[0].map(String);
  var wanted = FIXED_COLUMNS.map(function (c) { return c[1]; }).concat(questionCodes);
  if (header.join('') === '') header = [];
  wanted.forEach(function (h) { if (header.indexOf(h) < 0) header.push(h); });
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  styleHeader_(sh, header.length);
}

function buildSummarySheet_(conditions) {
  var ss = SpreadsheetApp.getActive();
  var sh = getSheet_(SHEET.SUMMARY);
  sh.clear();
  var resp = "'" + SHEET.RESPONSES + "'";
  var started = "'" + SHEET.STARTED + "'";
  var settings = "'" + SHEET.SETTINGS + "'";
  var targetLabel = settingLabel_('target');
  var rows = [['Нөхцөл', 'Эхэлсэн', 'Дууссан', 'Дуусгасан хувь', 'Шийдвэрийн дундаж хугацаа (сек)', 'Зорилт', 'Дутуу']];
  conditions.forEach(function (c, i) {
    var r = i + 2;
    rows.push([
      c.id,
      '=COUNTIF(' + started + '!B:B,A' + r + ')',
      '=COUNTIF(' + resp + '!C:C,A' + r + ')',
      '=IFERROR(C' + r + '/B' + r + ',"")',
      '=IFERROR(AVERAGEIF(' + resp + '!C:C,A' + r + ',' + resp + '!I:I),"")',
      '=IFERROR(VALUE(VLOOKUP("' + targetLabel + '",' + settings + '!A:B,2,FALSE)),"")',
      '=IF(F' + r + '="","",MAX(0,F' + r + '-C' + r + '))'
    ]);
  });
  var n = conditions.length + 2;
  rows.push(['Нийт', '=SUM(B2:B' + (n - 1) + ')', '=SUM(C2:C' + (n - 1) + ')', '=IFERROR(C' + n + '/B' + n + ',"")', '=IFERROR(AVERAGE(' + resp + '!I2:I),"")',
    '=IF(COUNT(F2:F' + (n - 1) + ')=0,"",SUM(F2:F' + (n - 1) + '))', '=IF(COUNT(G2:G' + (n - 1) + ')=0,"",SUM(G2:G' + (n - 1) + '))']);
  sh.getRange(1, 1, rows.length, 7).setValues(rows);
  styleHeader_(sh, 7);
  sh.getRange(2, 4, rows.length - 1, 1).setNumberFormat('0%');
  sh.getRange(2, 5, rows.length - 1, 1).setNumberFormat('0.0');
  sh.getRange(rows.length, 1, 1, 7).setFontWeight('bold');
  sh.setColumnWidth(1, 120);
  sh.setColumnWidths(2, 6, 150);
  sh.getRange(rows.length + 2, 1, 3, 1).setValues([
    ['Эхэлсэн: зөвшөөрлөө өгч нөхцөлд хуваарилагдсан оролцогч. Дууссан: бүх асуултад хариулж илгээсэн оролцогч.'],
    ['Зорилт, Дутуу: Тохиргоо хуудасны "' + targetLabel + '" бөглөгдсөн үед харагдана.'],
    ['Шинэ оролцогч дууссан болон сүүлийн ' + IN_PROGRESS_MINUTES + ' минутад эхэлсэн оролцогчийн тоо хамгийн бага нөхцөлд хуваарилагдана.']
  ]).setFontColor('#5e6a65');
}

/* ----------------------------------------------------------------------
 * 3. Холбоос
 * -------------------------------------------------------------------- */

function webAppUrl_() {
  try {
    var url = ScriptApp.getService().getUrl();
    if (url && /\/exec$/.test(url)) return url;
  } catch (e) { /* нийтлээгүй */ }
  return '';
}

function deploymentIdFromUrl_(url) {
  var m = String(url || '').match(/\/macros\/s\/([-\w]+)\/exec/);
  return m ? m[1] : '';
}

function showParticipantLink() {
  var ui = SpreadsheetApp.getUi();
  var url = webAppUrl_();
  if (!url) {
    ui.alert('Веб апп нийтлэгдээгүй байна', 'Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone) гэж нийтэлсний дараа энэ цэсийг дахин дарна уу.', ui.ButtonSet.OK);
    return;
  }
  var id = deploymentIdFromUrl_(url);
  var site = SITE_URL.indexOf('__') === 0 ? '' : SITE_URL.replace(/\/+$/, '');
  var msg = 'Веб аппын URL:\n' + url + '\n\n';
  if (site && id) {
    msg += 'Оролцогчдод илгээх холбоос:\n' + site + '/?s=' + id + '\n\n' +
      'Урьдчилан харах (хариулт хадгалагдахгүй):\n' + site + '/?s=' + id + '&preview=1';
  } else {
    msg += 'Тохируулах хуудсанд энэ URL-ийг оруулж оролцогчийн холбоосоо авна уу.';
  }
  ui.alert('Холбоос', msg, ui.ButtonSet.OK);
}

/* ----------------------------------------------------------------------
 * Веб апп (оролцогчийн хуудас эндээс өгөгдөл авна)
 * -------------------------------------------------------------------- */

function doGet(e) {
  var a = (e && e.parameter && e.parameter.a) || '';
  try {
    if (a === 'config') return configOutput_();
    return json_({ ok: true, service: 'songolt-survey', backend: APP_VERSION });
  } catch (err) {
    return json_({ ok: false, error: 'server', message: String(err && err.message || err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'start') return json_(startParticipant_());
    if (body.action === 'submit') return json_(saveResponse_(body));
    return json_({ ok: false, error: 'bad_action' });
  } catch (err) {
    return json_({ ok: false, error: 'server', message: String(err && err.message || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function settingLabel_(key) {
  for (var i = 0; i < SETTINGS_SPEC.length; i++) if (SETTINGS_SPEC[i][1] === key) return SETTINGS_SPEC[i][0];
  return '';
}

/**
 * Нийтлэхгүйгээр шууд үйлчлэх тохиргоо (төлөв, зорилтот тоо, нээлттэй нөхцөл).
 */
function liveSettings_() {
  var rows = readSheet_(SHEET.SETTINGS);
  var byLabel = {};
  for (var i = 1; i < rows.length; i++) byLabel[String(rows[i][0]).trim()] = String(rows[i][1]).trim();
  return {
    status: byLabel[settingLabel_('status')] === 'Хаалттай' ? 'closed' : 'open',
    target: byLabel[settingLabel_('target')] || '',
    open: byLabel[settingLabel_('openConditions')] || ''
  };
}

/**
 * Цэвэр функц: "18 x 8", "18×8", "18х8" (кирилл х) зэргийг "18x8" болгоно.
 */
function normalizeCondition_(s) {
  return String(s || '').toLowerCase().replace(/[\u00d7\u0445*]/g, 'x').replace(/\s+/g, '');
}

/**
 * Цэвэр функц: Эхэлсэн хуудасны мөрүүдээс нөхцөл тус бүрийн тоог гаргана.
 * done: дууссан, active: сүүлийн windowMin минутад эхэлсэн боловч дуусаагүй.
 */
function tallyStarted_(rows, ids, nowMs, windowMin) {
  var t = {};
  ids.forEach(function (id) { t[id] = { started: 0, done: 0, active: 0 }; });
  rows.forEach(function (r) {
    var c = String(r[1]);
    if (!t[c]) return;
    t[c].started++;
    if (r[3]) { t[c].done++; return; }
    var s = r[2] && typeof r[2].getTime === 'function' ? r[2].getTime() : Date.parse(r[2]);
    if (s && nowMs - s < windowMin * 60000) t[c].active++;
  });
  return t;
}

/**
 * Цэвэр функц: шинэ оролцогчид хуваарилж болох нөхцөлүүдийг тодорхойлно.
 */
function availableConditions_(ids, live, tally) {
  var res = { candidates: [], error: '', mode: 'Бүх нөхцөл', full: [] };
  var pool = ids.slice();
  if (live.open) {
    var wanted = live.open.split(/[,;]/).map(normalizeCondition_).filter(function (x) { return x; });
    var bad = wanted.filter(function (w) { return ids.indexOf(w) < 0; });
    if (bad.length || !wanted.length) {
      res.error = 'Тохиргоо: "' + settingLabel_('openConditions') + '" буруу (' + (bad.join(', ') || live.open) + '). Боломжит утга: ' + ids.join(', ') + '.';
      return res;
    }
    pool = ids.filter(function (id) { return wanted.indexOf(id) >= 0; });
    res.mode = 'Хязгаарласан: ' + pool.join(', ');
  }
  if (live.target) {
    var target = Number(String(live.target).replace(/\s/g, ''));
    if (!(target > 0) || Math.floor(target) !== target) {
      res.error = 'Тохиргоо: "' + settingLabel_('target') + '" эерэг бүхэл тоо байх ёстой (одоо: ' + live.target + ').';
      return res;
    }
    res.full = pool.filter(function (id) { return tally[id].done + tally[id].active >= target; });
    pool = pool.filter(function (id) { return res.full.indexOf(id) < 0; });
    if (res.full.length) res.mode += '; дүүрсэн: ' + res.full.join(', ');
  }
  res.candidates = pool;
  return res;
}

function allocationState_(validation) {
  var ids = Object.keys(validation.conditions);
  var live = liveSettings_();
  var sh = getSheet_(SHEET.STARTED);
  var lr = sh.getLastRow();
  var rows = lr > 1 ? sh.getRange(2, 1, lr - 1, 4).getValues() : [];
  var tally = tallyStarted_(rows, ids, Date.now(), IN_PROGRESS_MINUTES);
  return { ids: ids, live: live, tally: tally, avail: availableConditions_(ids, live, tally), sheet: sh };
}

function configOutput_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('CONFIG_FILE_ID');
  var validation = JSON.parse(props.getProperty('VALIDATION') || 'null');
  if (!id || !validation) return json_({ ok: false, error: 'not_published' });
  var raw;
  try {
    raw = DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8');
  } catch (err) {
    return json_({ ok: false, error: 'not_published' });
  }
  var st = allocationState_(validation);
  var status = st.live.status;
  if (status === 'open' && !st.avail.error && !st.avail.candidates.length) status = 'full';
  var meta = { status: status, backend: APP_VERSION, available: st.avail.candidates, assignment: st.avail.error || st.avail.mode };
  var text = JSON.stringify(meta);
  text = '{"ok":true,' + text.slice(1, -1) + ',"config":' + raw + '}';
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Цэвэр функц: хамгийн цөөн оролцогчтой нөхцөлийг сонгоно (тэнцвэл санамсаргүй).
 */
function chooseCondition_(ids, counts, rand) {
  var min = Infinity;
  ids.forEach(function (id) { min = Math.min(min, counts[id] || 0); });
  var pool = ids.filter(function (id) { return (counts[id] || 0) === min; });
  return pool[Math.floor(rand() * pool.length) % pool.length];
}

function startParticipant_() {
  var props = PropertiesService.getScriptProperties();
  var validation = JSON.parse(props.getProperty('VALIDATION') || 'null');
  if (!validation) return { ok: false, error: 'not_published' };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var st = allocationState_(validation);
    if (st.live.status === 'closed') return { ok: false, error: 'closed' };
    if (st.avail.error) return { ok: false, error: 'bad_settings', message: st.avail.error };
    if (!st.avail.candidates.length) return { ok: false, error: 'full' };
    // Дууссан + одоо бөглөж буй оролцогч хамгийн цөөн нөхцөлийг сонгоно (тэнцвэл санамсаргүй)
    var load = {};
    st.avail.candidates.forEach(function (c) { load[c] = st.tally[c].done + st.tally[c].active; });
    var condition = chooseCondition_(st.avail.candidates, load, Math.random);
    var pid = Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase();
    ensureStartedHeader_(st.sheet);
    st.sheet.appendRow([pid, condition, new Date(), '', st.avail.mode]);
    return { ok: true, pid: pid, condition: condition };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Цэвэр функц: хүснэгтэд аюулгүй бичих утга болгоно (томьёо оруулахаас хамгаална).
 */
function cleanCell_(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return isFinite(v) ? v : '';
  if (typeof v === 'boolean') return v ? YES : NO;
  var s = String(v).slice(0, MAX_TEXT).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (/^[=+\-@\t\r|]/.test(s)) s = "'" + s;
  return s;
}

function num_(v, digits) {
  var n = Number(v);
  if (!isFinite(n)) return '';
  var f = Math.pow(10, digits || 0);
  return Math.round(n * f) / f;
}

/**
 * Цэвэр функц: илгээсэн өгөгдлөөс хүснэгтийн мөрийн утгуудыг гаргана.
 */
function buildResponseRecord_(body, validation, now, assignment) {
  var cond = validation.conditions[body.condition];
  if (!cond) return { error: 'bad_condition' };
  var choice = String(body.choiceCode || '');
  if (cond.codes.indexOf(choice) < 0) return { error: 'bad_choice' };
  var answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
  var rec = {
    submittedAt: now,
    pid: cleanCell_(body.pid),
    condition: body.condition,
    nProducts: cond.nProducts,
    nAttributes: cond.nAttributes,
    choiceCode: cleanCell_(choice),
    choiceName: cleanCell_(validation.productNames[choice] || ''),
    choicePosition: num_(body.choicePosition, 0),
    decisionSec: num_(body.decisionSec, 1),
    selectionChanges: num_(body.selectionChanges, 0),
    cardsSeen: num_(body.cardsSeen, 0),
    order: cleanCell_(Array.isArray(body.order) ? body.order.join(',') : ''),
    device: cleanCell_(body.device),
    viewportWidth: num_(body.viewportWidth, 0),
    totalSec: num_(body.totalSec, 1),
    reloads: num_(body.reloads, 0),
    configVersion: cleanCell_(body.configVersion),
    assignment: cleanCell_(assignment || '')
  };
  var byHeader = {};
  FIXED_COLUMNS.forEach(function (c) { byHeader[c[1]] = rec[c[0]]; });
  validation.questionCodes.forEach(function (code) {
    var v = answers[code];
    byHeader[code] = typeof v === 'number' ? num_(v, 4) : cleanCell_(v);
  });
  return { byHeader: byHeader };
}

function saveResponse_(body) {
  // Судалгаа хаагдсан ч эхэлсэн оролцогчийн хариултыг хүлээн авна
  var props = PropertiesService.getScriptProperties();
  var validation = JSON.parse(props.getProperty('VALIDATION') || 'null');
  if (!validation) return { ok: false, error: 'not_published' };
  var pid = String(body.pid || '');
  if (!/^[A-F0-9]{12}$/.test(pid)) return { ok: false, error: 'bad_pid' };

  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var ss = SpreadsheetApp.getActive();
    var started = getSheet_(SHEET.STARTED);
    var cell = started.getRange('A:A').createTextFinder(pid).matchEntireCell(true).findNext();
    if (!cell) return { ok: false, error: 'unknown_participant' };
    var row = cell.getRow();
    var startedRow = started.getRange(row, 1, 1, 5).getValues()[0];
    if (startedRow[3]) return { ok: true, duplicate: true };
    if (String(startedRow[1]) !== String(body.condition)) return { ok: false, error: 'condition_mismatch' };

    var now = new Date();
    var built = buildResponseRecord_(body, validation, now, startedRow[4]);
    if (built.error) return { ok: false, error: built.error };

    var sh = getSheet_(SHEET.RESPONSES);
    var lc = Math.max(sh.getLastColumn(), 1);
    var header = sh.getRange(1, 1, 1, lc).getValues()[0].map(String);
    Object.keys(built.byHeader).forEach(function (h) {
      if (header.indexOf(h) < 0) {
        header.push(h);
        sh.getRange(1, header.length).setValue(h);
      }
    });
    var out = header.map(function (h) { return built.byHeader.hasOwnProperty(h) ? built.byHeader[h] : ''; });
    sh.appendRow(out);
    started.getRange(row, 4).setValue(now);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
