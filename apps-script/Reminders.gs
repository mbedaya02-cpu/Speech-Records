/**
 * Reminders.gs — plan renewals and due reports.
 * Window: from remind_before days before the due date until remind_after days after it.
 * Daily trigger at 08:00 (project time zone Asia/Dubai) calls dailyReminders().
 */

function todayIso_() {
  return Utilities.formatDate(new Date(), 'Asia/Dubai', 'yyyy-MM-dd');
}
function addDaysIso_(iso, n) {
  var d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
function daysBetween_(a, b) {
  return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
}
function settings_() { return Db.all('app_settings')[0] || {}; }

function dueItems_(aheadDays) {
  var today = todayIso_();
  var limit = addDaysIso_(today, aheadDays) + ' 23:59:59.999Z';
  var items = [];
  Db.all('plans').forEach(function (r) {
    if (r.status === 'سارية' && r.end_date && r.end_date <= limit) items.push({ kind: 'plan', rec: r, due: String(r.end_date).slice(0, 10), type: 'تجديد الخطة / إعادة التقييم' });
  });
  Db.all('reports').forEach(function (r) {
    if (r.followed_up !== true && r.next_due && r.next_due <= limit) items.push({ kind: 'report', rec: r, due: String(r.next_due).slice(0, 10), type: 'تقرير مستحق (بعد ' + r.report_type + ')' });
  });
  return items.map(function (i) {
    var p = Db.get('patients', i.rec.patient) || {};
    i.patient = p; i.daysLeft = daysBetween_(today, i.due);
    return i;
  }).filter(function (i) { return i.patient.status !== 'مُخرَّج'; })
    .sort(function (a, b) { return a.daysLeft - b.daysLeft; });
}

function itemsTable_(items) {
  var rows = items.map(function (i) {
    var color = i.daysLeft < 0 ? '#b42318' : '#b54708';
    var when = i.daysLeft < 0 ? 'متأخر ' + (-i.daysLeft) + ' يوم' : i.daysLeft === 0 ? 'اليوم' : 'بعد ' + i.daysLeft + ' يوم';
    var td = 'style="padding:6px 10px;border-bottom:1px solid #eee"';
    return '<tr><td ' + td + '>' + (i.patient.file_no || '') + '</td><td ' + td + '>' + (i.patient.full_name || '') + '</td><td ' + td + '>' + i.type +
      '</td><td ' + td + '>' + i.due + '</td><td ' + td + ' style="color:' + color + ';font-weight:bold;padding:6px 10px">' + when + '</td></tr>';
  }).join('');
  return '<table dir="rtl" style="border-collapse:collapse;font-family:Tahoma,Arial;font-size:14px"><tr style="background:#f2f4f7">' +
    '<th style="padding:6px 10px">رقم الملف</th><th style="padding:6px 10px">المريض</th><th style="padding:6px 10px">المطلوب</th><th style="padding:6px 10px">التاريخ</th><th style="padding:6px 10px">الحالة</th></tr>' + rows + '</table>';
}

function sendReminders() {
  var s = settings_();
  var before = s.remind_before == null ? 1 : Number(s.remind_before);
  var after = s.remind_after == null ? 5 : Number(s.remind_after);
  var items = dueItems_(before).filter(function (i) { return i.daysLeft >= -after; });
  var result = { items: items.length, emailsSent: 0, smtpEnabled: true, recipients: [] };
  if (!items.length) return result;
  var name = s.system_name || 'سجلات قسم النطق';
  var messages = [];
  var admins = String(s.notify_emails || '').split(/[,;\s]+/).filter(function (x) { return x.indexOf('@') > 0; });
  if (admins.length) messages.push({ to: admins.join(','), items: items, title: 'ملخص التجديدات والتقارير المستحقة' });
  if (s.email_therapists !== false) {
    var byT = {};
    items.forEach(function (i) { (i.patient.therapists || []).forEach(function (t) { (byT[t] = byT[t] || []).push(i); }); });
    Object.keys(byT).forEach(function (tid) {
      var t = Db.get('users', tid);
      if (t && t.active === true && t.email) messages.push({ to: t.email, items: byT[tid], title: 'تذكير: ' + byT[tid].length + ' مستحق لمرضاك' });
    });
  }
  messages.forEach(function (m) {
    result.recipients.push(m.to);
    try {
      MailApp.sendEmail({
        to: m.to, subject: m.title + ' - ' + name,
        htmlBody: '<div dir="rtl" style="font-family:Tahoma,Arial"><p>السلام عليكم،</p><p>هذه قائمة الخطط والتقارير المستحقة أو المتأخرة (حتى ' + after + ' أيام بعد موعدها):</p>' +
          itemsTable_(m.items) + '<p style="color:#667085;font-size:12px">رسالة تلقائية من ' + name + '</p></div>',
      });
      result.emailsSent++;
    } catch (e) { console.log('email failed: ' + e); }
  });
  return result;
}

/** Called by the daily time-driven trigger. */
function dailyReminders() {
  Db.reset();
  console.log(JSON.stringify(sendReminders()));
}

/** Creates (or recreates) the 08:00 daily trigger. */
function installReminderTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'dailyReminders') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyReminders').timeBased().everyDays(1).atHour(8).create();
}
