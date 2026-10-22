/**
 * Db.gs — Google Sheets as a simple document store.
 *
 * Each collection is one sheet. Row 1 = headers:
 *   id | created | updated | <readable columns…> | _json1 | _json2 | …
 * The readable columns are for humans browsing the sheet only.
 * The full record (source of truth) is JSON, split over the _json columns
 * (a Sheets cell holds max 50,000 characters).
 */

var SCHEMA = {
  users:        ['username', 'name', 'name_en', 'email', 'role', 'active', 'centers'],
  centers:      ['code', 'name_ar', 'name_en', 'phone', 'email'],
  patients:     ['center', 'file_no', 'full_name', 'full_name_en', 'dob', 'gender', 'nationality', 'phone', 'insurance_company', 'status', 'therapists'],
  plans:        ['patient', 'center', 'plan_type', 'status', 'start_date', 'end_date', 'therapist'],
  reports:      ['patient', 'center', 'report_type', 'report_date', 'next_due', 'status', 'therapist'],
  audit_log:    ['user_name', 'action', 'collection_name', 'record_id', 'label', 'ip'],
  app_settings: ['system_name', 'remind_before', 'remind_after', 'notify_emails'],
};
var CHUNK = 45000;
var FIXED = ['id', 'created', 'updated'];

var Db = (function () {
  var cache = {}; // per-request cache: name -> { sheet, header, rows:[{rec,row}] }

  function ss() {
    var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (id) return SpreadsheetApp.openById(id);
    var active = SpreadsheetApp.getActiveSpreadsheet && SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
    throw new Error('Spreadsheet not configured. Run setup() first.');
  }

  function sheet(name) {
    var s = ss().getSheetByName(name);
    if (!s) {
      s = ss().insertSheet(name);
      s.getRange(1, 1, 1, FIXED.length + SCHEMA[name].length + 1).setValues([FIXED.concat(SCHEMA[name]).concat(['_json1'])]);
      s.setFrozenRows(1);
    }
    return s;
  }

  function load(name) {
    if (cache[name]) return cache[name];
    var s = sheet(name);
    var values = s.getDataRange().getValues();
    var header = values[0] || [];
    var jsonCols = [];
    header.forEach(function (h, i) { if (/^_json\d+$/.test(h)) jsonCols.push(i); });
    var rows = [];
    for (var r = 1; r < values.length; r++) {
      var v = values[r];
      if (!v[0]) continue;
      var txt = jsonCols.map(function (c) { return v[c] || ''; }).join('');
      var rec;
      try { rec = txt ? JSON.parse(txt) : {}; } catch (e) { rec = {}; }
      rec.id = String(v[0]);
      rows.push({ rec: rec, row: r + 1 });
    }
    cache[name] = { sheet: s, header: header, jsonCols: jsonCols, rows: rows };
    return cache[name];
  }

  function rowValues(name, t, rec) {
    var json = JSON.stringify(rec);
    var chunks = [];
    for (var i = 0; i < json.length; i += CHUNK) chunks.push(json.slice(i, i + CHUNK));
    if (!chunks.length) chunks.push('{}');
    // make sure the sheet has enough _json columns
    while (t.jsonCols.length < chunks.length) {
      var col = t.header.length + 1;
      t.sheet.getRange(1, col).setValue('_json' + (t.jsonCols.length + 1));
      t.header.push('_json' + (t.jsonCols.length + 1));
      t.jsonCols.push(col - 1);
    }
    var out = t.header.map(function (h, i) {
      var j = t.jsonCols.indexOf(i);
      if (j >= 0) return chunks[j] || '';
      var v = rec[h];
      if (v === undefined || v === null) return '';
      if (typeof v === 'object') v = JSON.stringify(v);
      v = String(v);
      return v.length > 2000 ? v.slice(0, 2000) + '…' : v;
    });
    return out;
  }

  function newId() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789', s = '';
    for (var i = 0; i < 15; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    return s;
  }
  function now() { return new Date().toISOString().replace('T', ' '); }

  return {
    reset: function () { cache = {}; },
    all: function (name) { return load(name).rows.map(function (x) { return x.rec; }); },
    get: function (name, id) {
      var t = load(name);
      for (var i = 0; i < t.rows.length; i++) if (t.rows[i].rec.id === id) return t.rows[i].rec;
      return null;
    },
    insert: function (name, rec) {
      var t = load(name);
      rec.id = rec.id || newId();
      rec.created = rec.created || now();
      rec.updated = now();
      var vals = rowValues(name, t, rec);
      t.sheet.appendRow(vals);
      t.rows.push({ rec: rec, row: t.sheet.getLastRow() });
      return rec;
    },
    update: function (name, rec) {
      var t = load(name);
      for (var i = 0; i < t.rows.length; i++) {
        if (t.rows[i].rec.id === rec.id) {
          rec.updated = now();
          var vals = rowValues(name, t, rec);
          t.sheet.getRange(t.rows[i].row, 1, 1, vals.length).setValues([vals]);
          t.rows[i].rec = rec;
          return rec;
        }
      }
      throw apiError(404, 'Record not found.');
    },
    remove: function (name, id) {
      var t = load(name);
      for (var i = 0; i < t.rows.length; i++) {
        if (t.rows[i].rec.id === id) {
          var row = t.rows[i].row;
          t.sheet.deleteRow(row);
          t.rows.splice(i, 1);
          t.rows.forEach(function (x) { if (x.row > row) x.row--; });
          return true;
        }
      }
      return false;
    },
    ensureSheets: function () { Object.keys(SCHEMA).forEach(sheet); },
    spreadsheet: ss,
    newId: newId,
    now: now,
  };
})();

function apiError(status, message, data) {
  var e = new Error(message);
  e.status = status;
  e.data = data || {};
  return e;
}
