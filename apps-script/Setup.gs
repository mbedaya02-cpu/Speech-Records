/**
 * Setup.gs — run setup() ONCE from the Apps Script editor.
 *
 *  1. Creates the Google Sheet "Speech Records - Database" (in your Drive) with one tab per table.
 *  2. Seeds the two centers (Bedaya, Alpine) with logos and contact details, and the settings.
 *  3. Creates the first admin user. Username: admin. Password: printed in the Execution log.
 *  4. Installs the daily 08:00 reminder trigger.
 *
 * Other helpers you can run from the editor:
 *  - seedDemo()            add fake demo therapists + patients (testing only)
 *  - resetAdminPassword()  set a new random password for "admin" (printed in the log)
 */

var CENTERS_SEED = [
  { code: 'BEDAYA', name_ar: 'مركز بداية للتدريب والتأهيل', name_en: 'Bedaya Rehabilitation and Training Center', phone: '03 751 0337',
    whatsapp: '+971 56 950 7172', email: 'info@bedayarehab.com', address: 'العين، الإمارات العربية المتحدة', supervisor_name: 'محمد حيمور',
    color: '#2f7d4a', license_no: '', footer_note: '' },
  { code: 'ALPINE', name_ar: 'مركز ألباين الطبي', name_en: 'Alpine Medical Center', phone: '+971 3 785 7537',
    whatsapp: '', email: 'infowebsite@alpine.ae', address: 'العين - المويعي - عود بن صقحان', supervisor_name: '',
    color: '#7b2d63', license_no: '', footer_note: '' },
];

function setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SPREADSHEET_ID')) {
    var ss = SpreadsheetApp.create('Speech Records - Database');
    props.setProperty('SPREADSHEET_ID', ss.getId());
    var first = ss.getSheets()[0];
    Db.reset();
    Db.ensureSheets();
    try { ss.deleteSheet(first); } catch (_) {}
  }
  Db.reset();
  Db.ensureSheets();

  CENTERS_SEED.forEach(function (c) {
    var existing = Db.all('centers').filter(function (x) { return x.code === c.code; })[0];
    if (!existing) { var rec = JSON.parse(JSON.stringify(c)); rec.logo = LOGOS[c.code] || ''; Db.insert('centers', rec); }
  });
  if (!Db.all('app_settings').length) {
    Db.insert('app_settings', { system_name: 'سجلات قسم النطق واللغة', remind_before: 1, remind_after: 5, notify_emails: '', email_therapists: true });
  }

  var password = null;
  if (!Auth.findByIdentity('admin')) {
    password = randomPassword_();
    var admin = { username: 'admin', name: 'مدير النظام', name_en: 'Administrator', email: '', role: 'admin', active: true,
      centers: Db.all('centers').map(function (c) { return c.id; }) };
    Auth.setPassword(admin, password);
    Db.insert('users', admin);
  }
  try { installReminderTrigger(); } catch (e) { console.log('Trigger not installed: ' + e); }

  var msg = 'Setup complete.\nSpreadsheet: ' + Db.spreadsheet().getUrl() +
    (password ? '\n\nAdmin login →  username: admin   password: ' + password + '\n(change it after the first login)' : '\n\nAdmin user already exists.');
  console.log(msg);
  return msg;
}

function resetAdminPassword() {
  Db.reset();
  var u = Auth.findByIdentity('admin');
  if (!u) throw new Error('No admin user. Run setup() first.');
  var pw = randomPassword_();
  Auth.setPassword(u, pw);
  u.active = true;
  Db.update('users', u);
  console.log('New admin password: ' + pw);
  return pw;
}

function randomPassword_() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', s = '';
  for (var i = 0; i < 10; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s + '@' + Math.floor(Math.random() * 90 + 10);
}

/** Fake demo data for testing only. Demo therapists: therapist1 / therapist2, password Demo@12345 */
function seedDemo() {
  Db.reset();
  var centers = Db.all('centers');
  if (!centers.length) throw new Error('Run setup() first.');
  var ids = centers.map(function (c) { return c.id; });
  function mkUser(username, name) {
    var u = Auth.findByIdentity(username);
    if (u) return u;
    u = { username: username, name: name, name_en: '', email: '', role: 'therapist', active: true, centers: ids };
    Auth.setPassword(u, 'Demo@12345');
    return Db.insert('users', u);
  }
  var t1 = mkUser('therapist1', 'أخصائية تجريبية 1'), t2 = mkUser('therapist2', 'أخصائي تجريبي 2');
  var today = todayIso_();
  var rows = [
    ['DEMO-001', 'طفل تجريبي أ', 'ذكر', 'تأخر لغوي تعبيري', -5],
    ['DEMO-002', 'طفلة تجريبية ب', 'أنثى', 'اضطراب صوتي', 1],
    ['DEMO-003', 'طفل تجريبي ج', 'ذكر', 'اضطراب طيف التوحد', 10],
    ['DEMO-004', 'طفلة تجريبية د', 'أنثى', 'تأتأة', 25],
    ['DEMO-005', 'طفل تجريبي هـ', 'ذكر', 'تأخر لغوي مختلط', 60],
    ['DEMO-006', 'طفلة تجريبية و', 'أنثى', 'عسر بلع / تغذية', 90],
  ];
  rows.forEach(function (r, i) {
    if (Db.all('patients').some(function (p) { return p.file_no === r[0]; })) return;
    var ther = i % 2 ? t2.id : t1.id;
    var p = Db.insert('patients', { center: ids[i % ids.length], file_no: r[0], full_name: r[1], gender: r[2], diagnosis: r[3], nationality: 'الإماراتية',
      insurance_company: 'ثقة (تجريبي)', guardian_name: 'ولي أمر تجريبي', phone: '050000000' + i, therapists: [ther], status: 'نشط',
      dob: addDaysIso_(today, -(900 + i * 200)) + ' 00:00:00.000Z', start_date: addDaysIso_(today, -120) + ' 00:00:00.000Z' });
    Db.insert('plans', { patient: p.id, center: p.center, plan_type: 'الخطة التربوية الفردية', status: 'سارية', therapist: ther, sessions_approved: 24,
      start_date: addDaysIso_(today, r[4] - 180) + ' 00:00:00.000Z', end_date: addDaysIso_(today, r[4]) + ' 00:00:00.000Z', files: [] });
    Db.insert('reports', { patient: p.id, center: p.center, report_type: 'تقرير تقييم', status: 'نهائي', therapist: ther, report_lang: 'ar',
      report_text: 'تقرير تجريبي.', report_date: addDaysIso_(today, -170) + ' 00:00:00.000Z', next_due: addDaysIso_(today, r[4] + 2) + ' 00:00:00.000Z', followed_up: false, files: [] });
  });
  console.log('Demo data added. Therapist logins: therapist1 / therapist2  (password Demo@12345)');
}
