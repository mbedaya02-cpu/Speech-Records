/**
 * Code.gs — JSON API for the Speech Records website.
 *
 * Deploy as a Web App: Execute as "Me", Who has access "Anyone".
 * The website (GitHub Pages) sends POST requests with a JSON body:
 *   { action, token, collection, id, data, filter, sort, expand, page, perPage, ... }
 * and receives { ok:true, result } or { ok:false, error:{ status, message, data } }.
 */

function doGet() {
  return json({ ok: true, result: { app: 'speech-records', version: 1, time: new Date().toISOString() } });
}

function doPost(e) {
  var body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json({ ok: false, error: { status: 400, message: 'Invalid JSON.' } }); }
  Db.reset();
  var lock = null;
  try {
    var write = ['create', 'update', 'delete', 'auth', 'sendReminders'].indexOf(body.action) >= 0;
    if (write) { lock = LockService.getScriptLock(); lock.waitLock(25000); }
    return json({ ok: true, result: handle(body) });
  } catch (err) {
    var status = err.status || 500;
    if (status === 500) console.error(err && err.stack || err);
    return json({ ok: false, error: { status: status, message: status === 500 ? 'Server error: ' + err.message : err.message, data: err.data || {} } });
  } finally {
    if (lock) try { lock.releaseLock(); } catch (_) {}
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handle(b) {
  if (b.action === 'auth') {
    var res = Auth.login(b.identity, b.password);
    Rules.audit(res.user, 'تسجيل دخول', 'users', res.user.id, Rules.label('users', res.user));
    return { token: res.token, record: publicRecord('users', res.user) };
  }

  var u = Auth.userFromToken(b.token);
  if (!u) throw apiError(401, 'The request requires valid authorization.');

  switch (b.action) {
    case 'refresh': return { token: b.token, record: publicRecord('users', u) };
    case 'logout': Auth.logout(b.token); return true;
    case 'list': return list(u, b);
    case 'one': return one(u, b);
    case 'create': return create(u, b);
    case 'update': return update(u, b);
    case 'delete': return remove(u, b);
    case 'fileData': return fileData(u, b);
    case 'sendReminders':
      if (u.role !== 'admin') throw apiError(403, 'للمدير فقط.');
      return sendReminders();
  }
  throw apiError(400, 'Unknown action.');
}

function checkColl(c) { if (COLLECTIONS.indexOf(c) < 0) throw apiError(400, 'Unknown collection.'); return c; }

// ------------------------------------------------------------------ read
function list(u, b) {
  var coll = checkColl(b.collection);
  var match = Filter.compile(b.filter);
  var items = Db.all(coll).filter(function (r) { return Rules.canView(coll, r, u) && match(coll, r); });
  sortRecords(items, b.sort);
  var total = items.length;
  var perPage = Math.max(1, Math.min(Number(b.perPage) || 100000, 100000));
  var page = Math.max(1, Number(b.page) || 1);
  items = items.slice((page - 1) * perPage, page * perPage);
  return {
    page: page, perPage: perPage, totalItems: total, totalPages: Math.ceil(total / perPage),
    items: items.map(function (r) { return withExpand(coll, r, b.expand, u); }),
  };
}

function one(u, b) {
  var coll = checkColl(b.collection);
  var r = Db.get(coll, b.id);
  if (!r || !Rules.canView(coll, r, u)) throw apiError(404, "The requested resource wasn't found.");
  if (['patients', 'plans', 'reports'].indexOf(coll) >= 0) Rules.audit(u, 'عرض', coll, r.id, Rules.label(coll, r));
  return withExpand(coll, r, b.expand, u);
}

function sortRecords(items, sort) {
  if (!sort) return;
  var keys = String(sort).split(',').map(function (s) { s = s.trim(); return s.charAt(0) === '-' ? { k: s.slice(1), d: -1 } : { k: s.replace(/^\+/, ''), d: 1 }; });
  items.sort(function (a, b) {
    for (var i = 0; i < keys.length; i++) {
      var x = a[keys[i].k], y = b[keys[i].k];
      x = x === undefined || x === null ? '' : x; y = y === undefined || y === null ? '' : y;
      if (typeof x !== 'number' || typeof y !== 'number') { x = String(x); y = String(y); }
      if (x < y) return -1 * keys[i].d;
      if (x > y) return 1 * keys[i].d;
    }
    return 0;
  });
}

function withExpand(coll, r, expand, u) {
  var out = publicRecord(coll, r);
  if (!expand) return out;
  out.expand = {};
  String(expand).split(',').forEach(function (f) {
    f = f.trim();
    var rel = RELATIONS[coll] && RELATIONS[coll][f];
    if (!rel || !r[f]) return;
    if (Array.isArray(r[f])) {
      out.expand[f] = r[f].map(function (id) { return Db.get(rel, id); }).filter(Boolean).map(function (x) { return publicRecord(rel, x); });
    } else {
      var x = Db.get(rel, r[f]);
      if (x) out.expand[f] = publicRecord(rel, x);
    }
  });
  return out;
}

// ------------------------------------------------------------------ write
function cleanData(data) {
  var out = {};
  Object.keys(data || {}).forEach(function (k) { if (PROTECTED_KEYS.indexOf(k) < 0) out[k] = data[k]; });
  return out;
}

function create(u, b) {
  var coll = checkColl(b.collection);
  var data = b.data || {};
  var rec = cleanData(data);
  if (!Rules.canCreate(coll, rec, u)) throw apiError(400, 'Failed to create record.');

  if (coll === 'users') {
    if (rec.active === undefined) rec.active = true;
    Auth.setPassword(rec, data.password);
  }
  if (coll === 'patients' && !rec.status) rec.status = 'نشط';
  if (coll === 'plans' || coll === 'reports') {
    if (!rec.therapist) rec.therapist = u.id;
    if (!rec.center) { var p = Db.get('patients', rec.patient); if (p) rec.center = p.center; }
    rec.files = [];
    applyFiles(rec, data);
  }
  if (coll === 'centers') checkLogo(rec);
  Rules.validate(coll, rec, true);
  Db.insert(coll, rec);

  // renewal chaining
  if (rec.previous && coll === 'plans') { var pp = Db.get('plans', rec.previous); if (pp) { pp.status = 'تم التجديد'; Db.update('plans', pp); } }
  if (rec.previous && coll === 'reports') { var pr = Db.get('reports', rec.previous); if (pr) { pr.followed_up = true; Db.update('reports', pr); } }

  Rules.audit(u, 'إضافة', coll, rec.id, Rules.label(coll, rec));
  return withExpand(coll, rec, '', u);
}

function update(u, b) {
  var coll = checkColl(b.collection);
  var old = Db.get(coll, b.id);
  if (!old || !Rules.canView(coll, old, u)) throw apiError(404, "The requested resource wasn't found.");
  var data = b.data || {};
  var changes = cleanData(data);
  if (!Rules.canUpdate(coll, old, changes, u)) {
    if (coll === 'users' && data.password && old.id === u.id && Object.keys(changes).length === 0) { /* password-only self change */ }
    else throw apiError(403, 'ليس لديك صلاحية لهذا الإجراء.');
  }
  var rec = JSON.parse(JSON.stringify(old));
  Object.keys(changes).forEach(function (k) { rec[k] = changes[k]; });
  if (coll === 'users' && data.password) Auth.setPassword(rec, data.password);
  if (coll === 'plans' || coll === 'reports') applyFiles(rec, data);
  if (coll === 'centers') checkLogo(rec);
  Rules.validate(coll, rec, false);
  Db.update(coll, rec);
  Rules.audit(u, 'تعديل', coll, rec.id, Rules.label(coll, rec));
  return withExpand(coll, rec, '', u);
}

function remove(u, b) {
  var coll = checkColl(b.collection);
  var rec = Db.get(coll, b.id);
  if (!rec || !Rules.canView(coll, rec, u)) throw apiError(404, "The requested resource wasn't found.");
  if (!Rules.canDelete(coll, rec, u)) throw apiError(403, 'ليس لديك صلاحية لهذا الإجراء.');
  if (coll === 'patients') {
    ['plans', 'reports'].forEach(function (c) {
      Db.all(c).filter(function (x) { return x.patient === rec.id; }).forEach(function (x) { trashFiles(x.files); Db.remove(c, x.id); });
    });
  }
  if (coll === 'plans' || coll === 'reports') trashFiles(rec.files);
  Db.remove(coll, rec.id);
  Rules.audit(u, 'حذف', coll, rec.id, Rules.label(coll, rec));
  return true;
}

function checkLogo(rec) {
  if (rec.logo && (String(rec.logo).indexOf('data:image/') !== 0 || String(rec.logo).length > 4000000)) {
    throw apiError(400, 'Invalid logo.', { logo: { message: 'الشعار يجب أن يكون صورة PNG/JPG أقل من 3MB' } });
  }
}

// ------------------------------------------------------------------ attachments (Google Drive)
function filesFolder() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FILES_FOLDER_ID');
  if (id) try { return DriveApp.getFolderById(id); } catch (_) {}
  var f = DriveApp.createFolder('Speech Records - Attachments');
  props.setProperty('FILES_FOLDER_ID', f.getId());
  return f;
}

function applyFiles(rec, data) {
  rec.files = rec.files || [];
  var remove = data['files-'] || [];
  if (remove.length) {
    rec.files = rec.files.filter(function (n) { return remove.indexOf(n) < 0; });
    trashFiles(remove);
  }
  var add = data['files+'] || [];
  if (add.length) {
    if (rec.files.length + add.length > 5) throw apiError(400, 'Too many files.', { files: { message: 'الحد الأقصى 5 مرفقات' } });
    var allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    var folder = filesFolder();
    add.forEach(function (f) {
      if (allowed.indexOf(f.mime) < 0) throw apiError(400, 'File type not allowed.', { files: { message: 'نوع الملف غير مسموح: ' + f.name } });
      var bytes = Utilities.base64Decode(f.base64);
      if (bytes.length > 20 * 1024 * 1024) throw apiError(400, 'File too large.', { files: { message: 'الملف أكبر من 20MB: ' + f.name } });
      var file = folder.createFile(Utilities.newBlob(bytes, f.mime, f.name));
      rec.files.push(file.getId() + '__' + String(f.name).replace(/__/g, '_'));
    });
  }
}

function trashFiles(names) {
  (names || []).forEach(function (n) {
    try { DriveApp.getFileById(String(n).split('__')[0]).setTrashed(true); } catch (_) {}
  });
}

function fileData(u, b) {
  var coll = checkColl(b.collection);
  var rec = Db.get(coll, b.id);
  if (!rec || !Rules.canView(coll, rec, u) || (rec.files || []).indexOf(b.name) < 0) throw apiError(404, "The requested resource wasn't found.");
  var file = DriveApp.getFileById(String(b.name).split('__')[0]);
  var blob = file.getBlob();
  return { name: String(b.name).split('__').slice(1).join('__'), mime: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
}
