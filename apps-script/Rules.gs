/**
 * Rules.gs — who can see / change what, validation, defaults and side effects.
 * Same rules as the PocketBase version (see DEVELOPER_SPEC.md §6).
 */

var COLLECTIONS = ['users', 'centers', 'patients', 'plans', 'reports', 'audit_log', 'app_settings'];
var PROTECTED_KEYS = ['id', 'created', 'updated', 'passHash', 'salt', 'expand', 'collectionName', 'collectionId', 'password', 'passwordConfirm', 'files+', 'files-', 'verified', 'emailVisibility'];

var Rules = (function () {
  function isAdmin(u) { return u && u.role === 'admin'; }
  function isTher(u) { return u && u.role === 'therapist'; }
  function ownsPatient(u, patientId) {
    var p = patientId && Db.get('patients', patientId);
    return !!(p && (p.therapists || []).indexOf(u.id) >= 0);
  }

  function canView(coll, rec, u) {
    switch (coll) {
      case 'users': case 'centers': case 'app_settings': return true;
      case 'audit_log': return isAdmin(u);
      case 'patients': return !isTher(u) || (rec.therapists || []).indexOf(u.id) >= 0;
      case 'plans': case 'reports': return !isTher(u) || ownsPatient(u, rec.patient);
    }
    return false;
  }
  function canCreate(coll, data, u) {
    switch (coll) {
      case 'users': case 'centers': return isAdmin(u);
      case 'patients': return isAdmin(u) || u.role === 'reception';
      case 'plans': case 'reports': return isAdmin(u) || (isTher(u) && ownsPatient(u, data.patient));
    }
    return false;
  }
  function canUpdate(coll, old, data, u) {
    switch (coll) {
      case 'users': return isAdmin(u) || (old.id === u.id && !('role' in data) && !('active' in data) && !('centers' in data) && !('username' in data));
      case 'centers': case 'app_settings': return isAdmin(u);
      case 'patients': return isAdmin(u) || u.role === 'reception' || (isTher(u) && (old.therapists || []).indexOf(u.id) >= 0 && !('therapists' in data));
      case 'plans': case 'reports':
        if (isAdmin(u)) return true;
        return isTher(u) && ownsPatient(u, old.patient) && (!data.patient || ownsPatient(u, data.patient));
    }
    return false;
  }
  function canDelete(coll, rec, u) {
    return ['users', 'centers', 'patients', 'plans', 'reports'].indexOf(coll) >= 0 && isAdmin(u);
  }

  function req(errs, data, field, msg) {
    var v = data[field];
    if (v === undefined || v === null || String(v).trim() === '') errs[field] = { message: msg || 'Cannot be blank.' };
  }
  function validate(coll, rec, isNew) {
    var errs = {};
    switch (coll) {
      case 'users':
        req(errs, rec, 'username', 'اسم المستخدم مطلوب');
        if (['admin', 'therapist', 'reception'].indexOf(rec.role) < 0) errs.role = { message: 'دور غير صالح' };
        if (rec.username) {
          var dup = Db.all('users').some(function (x) { return x.id !== rec.id && String(x.username || '').toLowerCase() === String(rec.username).toLowerCase(); });
          if (dup) errs.username = { message: 'اسم المستخدم مستخدم من قبل' };
        }
        if (isNew && !rec.passHash) errs.password = { message: 'كلمة المرور مطلوبة' };
        break;
      case 'centers': req(errs, rec, 'code'); req(errs, rec, 'name_ar'); break;
      case 'patients':
        req(errs, rec, 'center', 'المركز مطلوب'); req(errs, rec, 'file_no', 'رقم الملف مطلوب'); req(errs, rec, 'full_name', 'الاسم مطلوب'); req(errs, rec, 'status');
        if (rec.center && rec.file_no) {
          var d = Db.all('patients').some(function (x) { return x.id !== rec.id && x.center === rec.center && String(x.file_no).trim() === String(rec.file_no).trim(); });
          if (d) errs.file_no = { message: 'رقم الملف موجود مسبقاً في هذا المركز' };
        }
        break;
      case 'plans': req(errs, rec, 'patient'); req(errs, rec, 'plan_type'); req(errs, rec, 'start_date'); req(errs, rec, 'end_date'); req(errs, rec, 'status'); break;
      case 'reports': req(errs, rec, 'patient'); req(errs, rec, 'report_type'); req(errs, rec, 'report_date'); req(errs, rec, 'status'); break;
    }
    if (Object.keys(errs).length) throw apiError(400, isNew ? 'Failed to create record.' : 'Failed to update record.', errs);
  }

  function label(coll, r) {
    if (!r) return '';
    if (coll === 'patients') return (r.file_no || '') + ' - ' + (r.full_name || '');
    if (coll === 'plans') return (r.plan_type || '') + ' (' + String(r.end_date || '').slice(0, 10) + ')';
    if (coll === 'reports') return (r.report_type || '') + ' (' + String(r.report_date || '').slice(0, 10) + ')';
    if (coll === 'users') return (r.name || '') + ' <' + (r.username || '') + '>';
    return '';
  }
  function audit(u, action, coll, id, lbl) {
    try {
      Db.insert('audit_log', { user: u ? u.id : '', user_name: u ? (u.name || u.username) : '', action: action, collection_name: coll, record_id: id || '', label: String(lbl || '').slice(0, 300), ip: '' });
    } catch (e) { console.log('audit failed: ' + e); }
  }

  return { canView: canView, canCreate: canCreate, canUpdate: canUpdate, canDelete: canDelete, validate: validate, label: label, audit: audit };
})();

/** Strip secrets before sending a record to the browser. */
function publicRecord(coll, rec) {
  var out = {};
  Object.keys(rec).forEach(function (k) { if (k !== 'passHash' && k !== 'salt') out[k] = rec[k]; });
  out.collectionName = coll;
  if (coll === 'users') out.hasPassword = !!rec.passHash;
  return out;
}
