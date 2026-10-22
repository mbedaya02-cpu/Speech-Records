/* Speech department records — main app (vanilla JS, Arabic RTL UI) */
(function () {
  "use strict";
  // Backend URL: config.js, or ?api=… in the address, or saved in this browser.
  const API_KEY = "sr_api_url";
  const qApi = new URLSearchParams(location.search).get("api");
  if (qApi) { try { localStorage.setItem(API_KEY, qApi); } catch (_) {} history.replaceState(null, "", location.pathname + location.hash); }
  let API_URL = (window.APP_CONFIG && window.APP_CONFIG.apiUrl) || (() => { try { return localStorage.getItem(API_KEY) || ""; } catch (_) { return ""; } })();
  const pb = new GasPB(API_URL);
  pb.autoCancellation(false);

  const FC = window.FC, X = window.DocExport;
  const A = { ageString: FC.ageString };
  const app = document.getElementById("app");
  const S = { me: null, centers: [], settings: null, therapists: [], centerFilter: "" };
  try { S.centerFilter = localStorage.getItem("centerFilter") || ""; } catch (_) {}

  const ROLE = { admin: "مدير النظام", therapist: "أخصائي نطق", reception: "استقبال" };
  // report_type -> form kind
  const KIND = { "تقرير التقييم الأولي": "initial", "تقرير تقييم": "evaluation", "تقرير إعادة تقييم": "evaluation", "تقرير تقييم مرحلي": "progress", "تقرير خروج": "discharge", "تقرير لجهة خارجية": "external" };
  const REPORT_TYPES = Object.keys(KIND);
  const REPORT_HINT = { "تقرير التقييم الأولي": "نموذج مختصر (ST_IA)", "تقرير تقييم": "التقييم الشامل بالعربي أو الإنجليزي", "تقرير إعادة تقييم": "نفس نموذج التقييم الشامل", "تقرير تقييم مرحلي": "تقرير التقدم المرتبط بالخطة", "تقرير خروج": "عند إنهاء العلاج", "تقرير لجهة خارجية": "مدرسة / تأمين / طبيب" };
  const PLAN_STATUS = ["سارية", "تم التجديد", "منتهية", "ملغاة"];
  const PATIENT_STATUS = ["نشط", "متوقف مؤقتاً", "مُخرَّج"];

  // ------------------------------------------------------------------ utils
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const d10 = (s) => (s ? String(s).slice(0, 10) : "");
  const toPb = (d) => (d ? d + " 00:00:00.000Z" : "");
  const pad = (n) => String(n).padStart(2, "0");
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const addMonths = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
  const daysLeft = (iso) => Math.round((new Date(d10(iso) + "T00:00:00Z") - new Date(today() + "T00:00:00Z")) / 86400000);
  const isAdmin = () => S.me && S.me.role === "admin";
  const isTherapist = () => S.me && S.me.role === "therapist";
  const canClinical = () => isAdmin() || isTherapist();
  const remindBefore = () => (S.settings && S.settings.remind_before != null ? S.settings.remind_before : 1);
  const remindAfter = () => (S.settings && S.settings.remind_after != null ? S.settings.remind_after : 5);
  const reminderDays = () => remindBefore();
  const deepClone = (o) => JSON.parse(JSON.stringify(o ?? null));
  // Clinician name for documents: English name for English documents when available.
  const clinicianName = (u, lang) => { u = u || S.me; return (lang === "en" && u.name_en) ? u.name_en : (u.name || u.email); };
  function warnEnglish(patient, lang) {
    if (lang !== "en") return;
    const miss = [];
    if (!patient.full_name_en) miss.push("اسم المريض بالإنجليزي");
    if (!S.me.name_en) miss.push("اسمك بالإنجليزي (من المستخدمين)");
    if (miss.length) toast("للتقرير الإنجليزي ينقص: " + miss.join(" و "), true);
  }

  function toast(msg, err) {
    let box = document.querySelector(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; document.body.appendChild(box); }
    const t = document.createElement("div");
    t.className = "toast" + (err ? " err" : "");
    t.setAttribute("role", "status");
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), err ? 5000 : 2600);
  }
  function errText(e) {
    const data = e && e.response && e.response.data;
    if (data && typeof data === "object") {
      const parts = Object.entries(data).map(([k, v]) => `${k}: ${v && v.message ? v.message : v}`);
      if (parts.length) return parts.join(" | ");
    }
    if (e && e.status === 403) return "ليس لديك صلاحية لهذا الإجراء.";
    if (e && e.status === 404) return "غير موجود أو لا تملك صلاحية الوصول إليه.";
    return (e && e.message) || "حدث خطأ";
  }
  function duePill(days) {
    if (days < 0) return `<span class="pill danger">متأخر ${-days} يوم</span>`;
    if (days === 0) return `<span class="pill danger">اليوم</span>`;
    if (days <= 7) return `<span class="pill warn">بعد ${days} يوم</span>`;
    return `<span class="pill">بعد ${days} يوم</span>`;
  }
  function statusPill(s) {
    const map = { "سارية": "ok", "نشط": "ok", "نهائي": "ok", "مسودة": "warn", "تم التجديد": "info", "متوقف مؤقتاً": "warn", "مُخرَّج": "", "منتهية": "", "ملغاة": "" };
    return `<span class="pill ${map[s] || ""}">${esc(s || "—")}</span>`;
  }
  const centerById = (id) => S.centers.find((c) => c.id === id);
  function centerTag(id) {
    const c = centerById(id);
    if (!c) return "";
    return `<span class="nowrap"><span class="center-dot" style="background:${esc(c.color || "#999")}"></span>${esc(c.name_ar)}</span>`;
  }
  function qs() {
    const h = location.hash.split("?")[1] || "";
    return Object.fromEntries(new URLSearchParams(h));
  }
  const go = (h) => { location.hash = h; };
  const centerFilterExpr = (path) => (S.centerFilter ? pb.filter(`${path} = {:c}`, { c: S.centerFilter }) : "");
  const andF = (...xs) => xs.filter(Boolean).map((x) => `(${x})`).join(" && ");

  // dirty-state guard for editors (off in the forms preview sandbox)
  let dirty = false, sandbox = false;
  window.addEventListener("beforeunload", (e) => { if (dirty && !sandbox) { e.preventDefault(); e.returnValue = ""; } });
  let lastHash = location.hash;
  window.addEventListener("hashchange", () => {
    if (dirty && !sandbox && !confirm("لديك تغييرات غير محفوظة. هل تريد المغادرة دون حفظ؟")) {
      history.replaceState(null, "", lastHash); return;
    }
    dirty = false; lastHash = location.hash; route();
  });

  // path helpers for data binding ("answers.referral.reason", "goals.0.ar")
  function getPath(obj, path) { return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj); }
  function setPath(obj, path, val) {
    const ks = path.split("."); let o = obj;
    ks.slice(0, -1).forEach((k, i) => { if (o[k] == null || typeof o[k] !== "object") o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; });
    o[ks[ks.length - 1]] = val;
  }

  // Binds chips + inputs inside root to obj. onChange called after each change.
  function bind(root, obj, onChange) {
    root.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip[data-path]");
      if (!chip || !root.contains(chip)) return;
      const path = chip.dataset.path, v = chip.dataset.v, multi = chip.dataset.mode === "multi";
      if (multi) {
        const arr = Array.isArray(getPath(obj, path)) ? getPath(obj, path).slice() : [];
        const i = arr.indexOf(v);
        if (i >= 0) arr.splice(i, 1); else arr.push(v);
        setPath(obj, path, arr);
      } else {
        setPath(obj, path, getPath(obj, path) === v ? "" : v);
      }
      root.querySelectorAll(`.chip[data-path="${CSS.escape(path)}"]`).forEach((c) => {
        const cur = getPath(obj, path);
        c.classList.toggle("on", multi ? (cur || []).includes(c.dataset.v) : cur === c.dataset.v);
      });
      dirty = true; onChange && onChange(path);
    });
    root.addEventListener("input", (e) => {
      const el = e.target.closest("[data-path]");
      if (!el || el.classList.contains("chip") || !root.contains(el)) return;
      setPath(obj, el.dataset.path, el.type === "number" ? (el.value === "" ? "" : Number(el.value)) : el.value);
      dirty = true; onChange && onChange(el.dataset.path);
    });
  }
  function chipsHtml(path, options, value, mode, lang = "ar") {
    const cur = value ?? (mode === "multi" ? [] : "");
    return `<div class="chips">${options.map((o) => {
      const on = mode === "multi" ? (cur || []).includes(o.v) : cur === o.v;
      return `<button type="button" class="chip${on ? " on" : ""}" data-path="${esc(path)}" data-v="${esc(o.v)}" data-mode="${mode}" title="${esc(o.en || "")}">${esc(o[lang] || o.ar)}</button>`;
    }).join("")}</div>`;
  }
  function specQ(path, spec, value, extraLabel) {
    return `<div class="q"><div class="q-label">${esc(spec.label.ar)}${spec.type === "multi" ? '<span class="tag">اختيار متعدد</span>' : ""}${extraLabel || ""}</div>${chipsHtml(path, spec.options, value, spec.type || "single")}</div>`;
  }

  // ------------------------------------------------------------------ modal
  function modal(title, bodyHtml, { okText = "حفظ", onOk, wide } = {}) {
    const back = document.createElement("div");
    back.className = "modal-back";
    back.innerHTML = `<div class="modal" style="${wide ? "width:min(900px,100%)" : ""}" role="dialog" aria-modal="true">
      <div class="panel-head"><h2 class="grow">${esc(title)}</h2><button class="btn sm" data-x>✕</button></div>
      <div class="panel-body">${bodyHtml}</div>
      ${onOk ? `<div class="modal-foot"><button class="btn" data-x>إلغاء</button><button class="btn primary" data-ok>${esc(okText)}</button></div>` : ""}</div>`;
    const close = () => back.remove();
    back.addEventListener("click", (e) => { if (e.target === back || e.target.closest("[data-x]")) close(); });
    if (onOk) back.querySelector("[data-ok]").addEventListener("click", async (e) => {
      e.target.disabled = true;
      try { if ((await onOk(back)) !== false) close(); } catch (err) { toast(errText(err), true); }
      e.target.disabled = false;
    });
    document.body.appendChild(back);
    const first = back.querySelector("input,select,textarea");
    if (first) first.focus();
    return back;
  }
  const val = (root, name) => { const el = root.querySelector(`[name="${name}"]`); return el ? el.value.trim() : ""; };

  // ------------------------------------------------------------------ shell
  function shell(active, html) {
    const links = [
      ["#/", "الرئيسية", "home"],
      ["#/patients", "المرضى", "patients"],
      ["#/forms", "النماذج", "forms"],
      ...(isAdmin() ? [["#/users", "المستخدمون", "users"], ["#/audit", "سجل الحركات", "audit"], ["#/settings", "الإعدادات", "settings"]] : []),
    ];
    const centerOpts = [`<option value="">كل المراكز</option>`, ...S.centers.map((c) => `<option value="${c.id}" ${S.centerFilter === c.id ? "selected" : ""}>${esc(c.name_ar)}</option>`)].join("");
    app.innerHTML = `
      <header class="topbar">
        <a class="brand" href="#/"><span class="brand-mark">ن</span>${esc((S.settings && S.settings.system_name) || "سجلات قسم النطق")}</a>
        <nav class="nav">${links.map(([h, t, k]) => `<a href="${h}" class="${k === active ? "active" : ""}">${t}</a>`).join("")}</nav>
        <div class="spacer"></div>
        <select class="input" id="centerFilter" style="width:auto" aria-label="المركز">${centerOpts}</select>
        <div class="userbox"><span>${esc(S.me.name || S.me.email)} · ${ROLE[S.me.role] || ""}</span><button class="btn sm" id="logout">خروج</button></div>
      </header>
      <main>${html}</main>`;
    app.querySelector("#logout").onclick = () => { if (dirty && !confirm("تغييرات غير محفوظة. الخروج؟")) return; dirty = false; pb.authStore.clear(); history.replaceState(null, "", location.pathname + "#/"); lastHash = "#/"; renderLogin(); };
    app.querySelector("#centerFilter").onchange = (e) => {
      S.centerFilter = e.target.value;
      try { localStorage.setItem("centerFilter", S.centerFilter); } catch (_) {}
      route();
    };
    return app.querySelector("main");
  }

  // ------------------------------------------------------------------ login
  function renderLogin(msg) {
    app.innerHTML = `<div class="login-wrap"><div class="panel login"><div class="panel-body">
      <div class="brand" style="margin-bottom:14px"><span class="brand-mark">ن</span>سجلات قسم النطق واللغة</div>
      <h1>تسجيل الدخول</h1><p class="muted" style="margin:4px 0 18px">ادخل بحسابك الخاص. لا تشارك كلمة المرور مع أحد.</p>
      ${msg ? `<div class="err-box">${esc(msg)}</div>` : ""}
      <form id="lf">
        <div class="field"><label class="f" for="em">اسم المستخدم</label><input class="input mono" id="em" type="text" required autocomplete="username" autocapitalize="off" spellcheck="false"></div>
        <div class="field"><label class="f" for="pw">كلمة المرور</label><input class="input" id="pw" type="password" required autocomplete="current-password"></div>
        <button class="btn primary" style="width:100%" type="submit">دخول</button>
      </form>
      <div style="margin-top:14px;text-align:center"><a href="javascript:void 0" id="chgSrv" class="hint">تغيير رابط الخادم</a></div></div></div></div>`;
    app.querySelector("#chgSrv").onclick = () => window.__changeServer();
    app.querySelector("#lf").onsubmit = async (e) => {
      e.preventDefault();
      const b = e.target.querySelector("button"); b.disabled = true;
      try {
        await pb.collection("users").authWithPassword(app.querySelector("#em").value.trim(), app.querySelector("#pw").value);
        await afterLogin();
      } catch (err) {
        renderLogin(err.status === 400 ? "اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب غير مفعّل." : (err.status === 0 ? err.message : errText(err)));
      }
    };
  }

  async function afterLogin() {
    S.me = pb.authStore.record;
    const [centers, settings, therapists] = await Promise.all([
      pb.collection("centers").getFullList({ sort: "code" }),
      pb.collection("app_settings").getFirstListItem("").catch(() => null),
      pb.collection("users").getFullList({ filter: 'role = "therapist" && active = true', sort: "name" }),
    ]);
    S.centers = centers; S.settings = settings; S.therapists = therapists;
    if (S.centerFilter && !centerById(S.centerFilter)) S.centerFilter = "";
    if (!location.hash || location.hash === "#") location.hash = "#/";
    route();
  }

  // ------------------------------------------------------------------ router
  async function route() {
    if (!pb.authStore.isValid || !pb.authStore.record || pb.authStore.record.collectionName !== "users") return renderLogin();
    lastHash = location.hash;
    const h = (location.hash.slice(1).split("?")[0] || "/").split("/").filter(Boolean);
    try {
      if (!h.length) return await pageDashboard();
      sandbox = false;
      if (h[0] === "patients") return await pagePatients();
      if (h[0] === "forms") return pageForms();
      if (h[0] === "try" && h[1] === "plan") return await pageDoc("plans", "new", true);
      if (h[0] === "try" && h[1] === "report") return await pageDoc("reports", "new", true);
      if (h[0] === "patient" && h[1]) return await pagePatient(h[1]);
      if (h[0] === "plan" && h[1]) return await pageDoc("plans", h[1]);
      if (h[0] === "report" && h[1]) return await pageDoc("reports", h[1]);
      if (h[0] === "users" && isAdmin()) return await pageUsers();
      if (h[0] === "audit" && isAdmin()) return await pageAudit();
      if (h[0] === "settings" && isAdmin()) return await pageSettings();
      shell("", `<div class="panel empty">الصفحة غير موجودة.</div>`);
    } catch (err) {
      if (err && err.status === 401) { pb.authStore.clear(); return renderLogin("انتهت الجلسة، الرجاء تسجيل الدخول مجدداً."); }
      console.error(err);
      shell("", `<div class="panel empty">تعذر تحميل الصفحة: ${esc(errText(err))}</div>`);
    }
  }

  // ------------------------------------------------------------------ dashboard
  // Loads every active plan / pending report due within `ahead` days (overdue included).
  async function loadDueItems(ahead) {
    const limit = addDays(today(), ahead) + " 23:59:59.999Z";
    const cf = centerFilterExpr("patient.center");
    const notDischarged = 'patient.status != "مُخرَّج"';
    const [plans, reports] = await Promise.all([
      pb.collection("plans").getFullList({ filter: andF(pb.filter('status = "سارية" && end_date <= {:l}', { l: limit }), notDischarged, cf), sort: "end_date", expand: "patient,therapist" }),
      pb.collection("reports").getFullList({ filter: andF(pb.filter('followed_up = false && next_due != "" && next_due <= {:l}', { l: limit }), notDischarged, cf), sort: "next_due", expand: "patient,therapist" }),
    ]);
    const nextType = (t) => (["تقرير خروج", "تقرير لجهة خارجية"].includes(t) ? t : "تقرير تقييم مرحلي");
    return [
      ...plans.map((r) => ({ kind: "plan", rec: r, due: d10(r.end_date), what: `تجديد الخطة / إعادة التقييم`, p: r.expand && r.expand.patient })),
      ...reports.map((r) => ({ kind: "report", rec: r, due: d10(r.next_due), what: `تقرير مستحق (بعد ${r.report_type})`, next: nextType(r.report_type), p: r.expand && r.expand.patient })),
    ].map((i) => ({ ...i, days: daysLeft(i.due) })).sort((a, b) => a.days - b.days);
  }

  function dueRows(items) {
    return items.map((i) => `<tr>
        <td>${duePill(i.days)}${i.days < -remindAfter() ? ' <span class="pill danger">تجاوز مهلة التذكير</span>' : ""}</td>
        <td class="mono">${esc(i.p ? i.p.file_no : "")}</td>
        <td><a href="#/patient/${i.p ? i.p.id : ""}">${esc(i.p ? i.p.full_name : "")}</a></td>
        <td>${esc(i.what)}</td>
        <td class="nowrap">${esc(i.due)}</td>
        <td>${i.p ? centerTag(i.p.center) : ""}</td>
        <td>${esc(i.rec.expand && i.rec.expand.therapist ? i.rec.expand.therapist.name : "")}</td>
        <td class="nowrap">${canClinical() && i.p ? (i.kind === "plan"
          ? `<a class="btn sm primary" href="#/plan/new?patient=${i.p.id}&renew=${i.rec.id}">تجديد الخطة</a>`
          : `<a class="btn sm primary" href="#/report/new?patient=${i.p.id}&type=${encodeURIComponent(i.next)}&prev=${i.rec.id}">كتابة التقرير</a>`) : ""}
          <a class="btn sm" href="#/${i.kind}/${i.rec.id}">فتح</a></td></tr>`).join("");
  }
  const dueTable = (items) => `<div class="table-wrap"><table class="t"><thead><tr><th>الموعد</th><th>رقم الملف</th><th>المريض</th><th>المطلوب</th><th>التاريخ</th><th>المركز</th><th>الأخصائي</th><th></th></tr></thead><tbody>${dueRows(items)}</tbody></table></div>`;

  async function pageDashboard() {
    const main = shell("home", `<div class="empty">جاري التحميل…</div>`);
    const cf = centerFilterExpr("center");
    const [all, active, drafts] = await Promise.all([
      loadDueItems(30),
      pb.collection("patients").getList(1, 1, { filter: andF('status = "نشط"', cf), fields: "id" }),
      pb.collection("reports").getList(1, 50, { filter: andF('status = "مسودة"', isTherapist() ? pb.filter("therapist = {:me}", { me: S.me.id }) : "", centerFilterExpr("patient.center")), sort: "-updated", expand: "patient" }),
    ]);
    const now = all.filter((i) => i.days <= remindBefore());
    const later = all.filter((i) => i.days > remindBefore());
    const overdue = now.filter((i) => i.days < 0).length;
    main.innerHTML = `
      <div class="page-head"><div class="grow"><h1>مرحباً ${esc((S.me.name || "").split(" ")[0])}</h1><div class="muted">${today()} · التذكير يبدأ قبل ${remindBefore()} يوم من الموعد ويستمر حتى ${remindAfter()} أيام بعده</div></div>
        <a class="btn" href="#/patients">قائمة المرضى</a></div>
      <div class="grid cols-4">
        <div class="panel stat danger"><div class="num">${overdue}</div><div class="lbl">متأخرة (فات موعدها)</div></div>
        <div class="panel stat warn"><div class="num">${now.length - overdue}</div><div class="lbl">مستحقة اليوم / غداً</div></div>
        <div class="panel stat"><div class="num">${later.length}</div><div class="lbl">قادمة خلال 30 يوماً</div></div>
        <div class="panel stat ok"><div class="num">${active.totalItems}</div><div class="lbl">مرضى نشطون</div></div>
      </div>
      <div class="panel" style="margin-top:16px"><div class="panel-head"><h2 class="grow">مطلوب الآن: تجديدات وتقارير مستحقة أو متأخرة</h2></div>
        ${now.length ? dueTable(now) : `<div class="empty">لا يوجد شيء مستحق الآن. 👌</div>`}</div>
      ${later.length ? `<div class="panel"><details><summary class="panel-head" style="cursor:pointer"><h2 class="grow">قادمة خلال 30 يوماً (${later.length})</h2></summary>${dueTable(later)}</details></div>` : ""}
      ${drafts.items.length ? `<div class="panel"><div class="panel-head"><h2 class="grow">تقارير مسودة لم تُعتمد</h2></div><div class="table-wrap"><table class="t"><tbody>
        ${drafts.items.map((r) => `<tr class="click" data-go="#/report/${r.id}"><td>${esc(r.report_type)}</td><td>${esc(r.expand && r.expand.patient ? r.expand.patient.full_name : "")}</td><td class="nowrap">${d10(r.report_date)}</td><td>${statusPill(r.status)}</td></tr>`).join("")}
      </tbody></table></div></div>` : ""}`;
    main.querySelectorAll("[data-go]").forEach((tr) => tr.onclick = () => go(tr.dataset.go));
  }

  // ------------------------------------------------------------------ patients
  async function pagePatients() {
    const q = qs();
    const main = shell("patients", "");
    main.innerHTML = `
      <div class="page-head"><h1 class="grow">المرضى</h1>${isAdmin() || S.me.role === "reception" ? `<button class="btn primary" id="newP">+ مريض جديد</button>` : ""}</div>
      <div class="panel"><div class="panel-head" style="flex-wrap:wrap">
        <input class="input" id="q" placeholder="بحث بالاسم أو رقم الملف…" value="${esc(q.q || "")}" style="max-width:320px">
        <select class="input" id="st" style="width:auto"><option value="">كل الحالات</option>${PATIENT_STATUS.map((s) => `<option ${q.st === s ? "selected" : ""}>${s}</option>`).join("")}</select>
        <span class="grow"></span><span class="muted" id="count"></span></div>
        <div id="list"><div class="empty">جاري التحميل…</div></div></div>`;
    const load = async () => {
      const term = main.querySelector("#q").value.trim(), st = main.querySelector("#st").value;
      const f = andF(
        term ? pb.filter("full_name ~ {:t} || file_no ~ {:t} || full_name_en ~ {:t} || phone ~ {:t}", { t: term }) : "",
        st ? pb.filter("status = {:s}", { s: st }) : "",
        centerFilterExpr("center"));
      const res = await pb.collection("patients").getList(1, 200, { filter: f, sort: "-updated", expand: "therapists" });
      main.querySelector("#count").textContent = `${res.totalItems} مريض`;
      main.querySelector("#list").innerHTML = res.items.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>رقم الملف</th><th>الاسم</th><th>العمر</th><th>التشخيص</th><th>الأخصائي</th><th>المركز</th><th>الحالة</th></tr></thead><tbody>
        ${res.items.map((p) => `<tr class="click" data-go="#/patient/${p.id}"><td class="mono">${esc(p.file_no)}</td><td><strong>${esc(p.full_name)}</strong>${p.full_name_en ? `<div class="hint">${esc(p.full_name_en)}</div>` : ""}</td>
          <td class="nowrap">${esc(A.ageString(p.dob, today(), "ar"))}</td><td>${esc(p.diagnosis)}</td>
          <td>${esc(((p.expand && p.expand.therapists) || []).map((t) => t.name).join("، "))}</td><td>${centerTag(p.center)}</td><td>${statusPill(p.status)}</td></tr>`).join("")}
        </tbody></table></div>` : `<div class="empty">لا يوجد مرضى مطابقون.</div>`;
      main.querySelectorAll("[data-go]").forEach((tr) => tr.onclick = () => go(tr.dataset.go));
    };
    let timer;
    main.querySelector("#q").oninput = () => { clearTimeout(timer); timer = setTimeout(load, 250); };
    main.querySelector("#st").onchange = load;
    const nb = main.querySelector("#newP"); if (nb) nb.onclick = () => patientModal(null, (p) => go(`#/patient/${p.id}`));
    await load();
  }

  function patientModal(p, done) {
    p = p || { status: "نشط", center: S.centerFilter || (S.centers[0] && S.centers[0].id), therapists: [] };
    const canAssign = isAdmin() || S.me.role === "reception";
    const body = `<div class="grid cols-2">
      <div class="field"><label class="f">المركز *</label><select class="input" name="center">${S.centers.map((c) => `<option value="${c.id}" ${p.center === c.id ? "selected" : ""}>${esc(c.name_ar)}</option>`).join("")}</select></div>
      <div class="field"><label class="f">رقم الملف *</label><input class="input mono" name="file_no" value="${esc(p.file_no)}"></div>
      <div class="field"><label class="f">الاسم بالعربي *</label><input class="input" name="full_name" value="${esc(p.full_name)}"></div>
      <div class="field"><label class="f">الاسم بالإنجليزي (للتقارير الإنجليزية)</label><input class="input" dir="ltr" name="full_name_en" value="${esc(p.full_name_en)}"></div>
      <div class="field"><label class="f">تاريخ الميلاد</label><input class="input" type="date" name="dob" value="${d10(p.dob)}"></div>
      <div class="field"><label class="f">الجنس *</label><select class="input" name="gender"><option></option>${["ذكر", "أنثى"].map((g) => `<option ${p.gender === g ? "selected" : ""}>${g}</option>`).join("")}</select></div>
      <div class="field"><label class="f">الجنسية</label><input class="input" name="nationality" list="natList" value="${esc(p.nationality)}">
        <datalist id="natList">${FC.NATIONALITIES.map((n) => `<option value="${n[0]}">`).join("")}</datalist></div>
      <div class="field"><label class="f">اسم ولي الأمر</label><input class="input" name="guardian_name" value="${esc(p.guardian_name)}"></div>
      <div class="field"><label class="f">رقم الهاتف</label><input class="input mono" name="phone" value="${esc(p.phone)}"></div>
      <div class="field"><label class="f">شركة التأمين</label><input class="input" name="insurance_company" list="insList" value="${esc(p.insurance_company)}">
        <datalist id="insList"><option>Thiqa</option><option>Daman Enhanced</option><option>Daman Basic</option><option>ADNIC</option><option>نقدي (بدون تأمين)</option></datalist></div>
      <div class="field"><label class="f">رقم بطاقة التأمين</label><input class="input mono" name="insurance_no" value="${esc(p.insurance_no)}"></div>
      <div class="field"><label class="f">التشخيص المبدئي</label><input class="input" name="diagnosis" value="${esc(p.diagnosis)}"></div>
      <div class="field"><label class="f">تاريخ بدء العلاج</label><input class="input" type="date" name="start_date" value="${d10(p.start_date)}"></div>
      <div class="field"><label class="f">الحالة</label><select class="input" name="status">${PATIENT_STATUS.map((s) => `<option ${p.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
    </div>
    ${canAssign ? `<div class="field"><label class="f">الأخصائي/ون المسؤولون</label><div class="chips" id="thr">${S.therapists.map((t) => `<button type="button" class="chip ${(p.therapists || []).includes(t.id) ? "on" : ""}" data-id="${t.id}">${esc(t.name)}</button>`).join("") || '<span class="hint">لا يوجد أخصائيون بعد — أضفهم من صفحة المستخدمين.</span>'}</div></div>` : ""}
    <div class="field"><label class="f">ملاحظات</label><textarea class="input" name="notes">${esc(p.notes)}</textarea></div>`;
    const m = modal(p.id ? "تعديل بيانات المريض" : "مريض جديد", body, {
      wide: true,
      onOk: async (root) => {
        const data = {};
        ["center", "file_no", "full_name", "full_name_en", "gender", "nationality", "guardian_name", "phone", "insurance_company", "insurance_no", "diagnosis", "status", "notes"].forEach((k) => data[k] = val(root, k));
        data.dob = toPb(val(root, "dob")); data.start_date = toPb(val(root, "start_date"));
        if (canAssign) data.therapists = [...root.querySelectorAll("#thr .chip.on")].map((c) => c.dataset.id);
        if (!data.file_no || !data.full_name || !data.gender) { toast("رقم الملف والاسم والجنس مطلوبة (الجنس يحدد صياغة التقارير)", true); return false; }
        const rec = p.id ? await pb.collection("patients").update(p.id, data) : await pb.collection("patients").create(data);
        toast("تم الحفظ"); done && done(rec);
      },
    });
    const thr = m.querySelector("#thr");
    if (thr) thr.onclick = (e) => { const c = e.target.closest(".chip"); if (c) c.classList.toggle("on"); };
  }

  async function pagePatient(id) {
    const main = shell("patients", `<div class="empty">جاري التحميل…</div>`);
    const tab = qs().tab || "plans";
    const p = await pb.collection("patients").getOne(id, { expand: "therapists" });
    const [plans, reports] = await Promise.all([
      pb.collection("plans").getFullList({ filter: pb.filter("patient = {:id}", { id }), sort: "-start_date", expand: "therapist" }),
      pb.collection("reports").getFullList({ filter: pb.filter("patient = {:id}", { id }), sort: "-report_date", expand: "therapist" }),
    ]);
    const info = [
      ["رقم الملف", `<span class="mono">${esc(p.file_no)}</span>`], ["المركز", centerTag(p.center)],
      ["تاريخ الميلاد", `${d10(p.dob) || "—"} <span class="muted">(${esc(A.ageString(p.dob, today(), "ar")) || "—"})</span>`],
      ["الجنس", esc(p.gender || "—")], ["الجنسية", esc(p.nationality || "—")], ["ولي الأمر", esc(p.guardian_name || "—")], ["الهاتف", `<span class="mono">${esc(p.phone || "—")}</span>`],
      ["التأمين", esc([p.insurance_company, p.insurance_no].filter(Boolean).join(" · ") || "—")], ["التشخيص", esc(p.diagnosis || "—")],
      ["بدء العلاج", d10(p.start_date) || "—"], ["الأخصائي", esc(((p.expand && p.expand.therapists) || []).map((t) => t.name).join("، ") || "—")],
    ];
    const planRows = plans.map((r) => {
      const dl = daysLeft(r.end_date);
      return `<tr><td><a href="#/plan/${r.id}"><strong>${esc(r.plan_type)}</strong></a></td><td class="nowrap">${d10(r.start_date)} ← ${d10(r.end_date)}</td>
        <td>${statusPill(r.status)} ${r.status === "سارية" && dl <= 30 ? duePill(dl) : ""}</td><td>${centerTag(r.center)}</td>
        <td>${esc(r.expand && r.expand.therapist ? r.expand.therapist.name : "")}</td>
        <td class="nowrap"><div class="btn-row">${docButtons("plan", r)}${r.status === "سارية" && canClinical() ? `<a class="btn sm" href="#/plan/new?patient=${p.id}&renew=${r.id}">تجديد</a>` : ""}</div></td></tr>`;
    }).join("");
    const reportRows = reports.map((r) => `<tr><td><a href="#/report/${r.id}"><strong>${esc(r.report_type)}</strong></a></td><td class="nowrap">${d10(r.report_date)}</td>
        <td>${statusPill(r.status)}</td><td class="nowrap">${r.next_due ? (r.followed_up ? `<span class="pill info">تمت المتابعة</span>` : `${d10(r.next_due)} ${duePill(daysLeft(r.next_due))}`) : "—"}</td>
        <td>${centerTag(r.center)}</td><td>${esc(r.expand && r.expand.therapist ? r.expand.therapist.name : "")}</td>
        <td class="nowrap"><div class="btn-row">${docButtons("report", r)}</div></td></tr>`).join("");
    main.innerHTML = `
      <div class="crumbs"><a href="#/patients">المرضى</a> / ${esc(p.file_no)}</div>
      <div class="page-head"><div class="grow"><h1>${esc(p.full_name)} ${statusPill(p.status)}</h1>${p.full_name_en ? `<div class="muted" dir="ltr" style="text-align:right">${esc(p.full_name_en)}</div>` : ""}</div>
        <button class="btn" id="editP">تعديل البيانات</button>
        ${isAdmin() ? `<button class="btn danger" id="delP">حذف</button>` : ""}</div>
      <div class="panel"><div class="panel-body"><div class="grid cols-4">${info.map(([k, v]) => `<div><div class="hint">${k}</div><div>${v}</div></div>`).join("")}</div>
        ${p.notes ? `<div class="note-box" style="margin-top:14px">${esc(p.notes)}</div>` : ""}</div></div>
      <div class="panel">
        <div class="tabs"><button data-tab="plans" class="${tab === "plans" ? "on" : ""}">الخطط العلاجية (${plans.length})</button><button data-tab="reports" class="${tab === "reports" ? "on" : ""}">التقارير (${reports.length})</button></div>
        <div data-pane="plans" class="${tab === "plans" ? "" : "hidden"}">
          <div class="panel-head"><span class="grow muted">الخطة التربوية الفردية للنطق واللغة</span>${canClinical() ? `<a class="btn primary" href="#/plan/new?patient=${p.id}">+ خطة جديدة</a>` : ""}</div>
          ${plans.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>النوع</th><th>الفترة</th><th>الحالة</th><th>المركز</th><th>الأخصائي</th><th></th></tr></thead><tbody>${planRows}</tbody></table></div>` : `<div class="empty">لا توجد خطط بعد.</div>`}
        </div>
        <div data-pane="reports" class="${tab === "reports" ? "" : "hidden"}">
          <div class="panel-head"><span class="grow muted">تقييم أولي، تقرير تقييم، إعادة تقييم، تقييم مرحلي، خروج، أو تقرير لجهة خارجية</span>${canClinical() ? `<button class="btn primary" id="newR">+ تقرير جديد</button>` : ""}</div>
          ${reports.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>النوع</th><th>التاريخ</th><th>الحالة</th><th>التقرير التالي</th><th>المركز</th><th>الأخصائي</th><th></th></tr></thead><tbody>${reportRows}</tbody></table></div>` : `<div class="empty">لا توجد تقارير بعد.</div>`}
        </div>
      </div>`;
    main.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => {
      main.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("on", x === b));
      main.querySelectorAll("[data-pane]").forEach((x) => x.classList.toggle("hidden", x.dataset.pane !== b.dataset.tab));
      history.replaceState(null, "", `#/patient/${id}?tab=${b.dataset.tab}`); lastHash = location.hash;
    });
    main.querySelector("#editP").onclick = () => patientModal(p, () => route());
    const del = main.querySelector("#delP");
    if (del) del.onclick = async () => {
      if (!confirm(`حذف ملف ${p.full_name} نهائياً مع كل خططه وتقاريره؟ لا يمكن التراجع.`)) return;
      try { await pb.collection("patients").delete(p.id); toast("تم الحذف"); go("#/patients"); } catch (e) { toast(errText(e), true); }
    };
    const nr = main.querySelector("#newR");
    if (nr) nr.onclick = () => modal("نوع التقرير", `<div id="types" class="bank" style="max-height:none">${REPORT_TYPES.map((t) => `<button class="chip" data-t="${esc(t)}" style="text-align:start"><strong>${esc(t)}</strong><div class="hint">${esc(REPORT_HINT[t])}</div></button>`).join("")}</div>`, {})
      .querySelector("#types").addEventListener("click", (e) => {
        const c = e.target.closest(".chip"); if (!c) return;
        document.querySelector(".modal-back").remove();
        go(`#/report/new?patient=${p.id}&type=${encodeURIComponent(c.dataset.t)}`);
      });
    bindDocButtons(main, { plans, reports, patient: p });
  }

  function docButtons(kind, r) {
    return `<button class="btn sm" data-doc="${kind}:${r.id}:docx" title="تنزيل Word">Word</button><button class="btn sm" data-doc="${kind}:${r.id}:pdf" title="طباعة / حفظ PDF">PDF</button>`;
  }
  function bindDocButtons(root, { plans, reports, patient }) {
    root.querySelectorAll("[data-doc]").forEach((b) => b.onclick = async () => {
      const [kind, id, fmt] = b.dataset.doc.split(":");
      const r = (kind === "plan" ? plans : reports).find((x) => x.id === id);
      const text = kind === "plan" ? r.plan_text : r.report_text;
      if (!text) { toast("لم يتم توليد نص بعد. افتح المستند واضغط «توليد النص» ثم احفظ.", true); return; }
      const lang = (kind === "plan" ? r.plan_lang : r.report_lang) || "ar";
      const name = `${patient.file_no}_${kind === "plan" ? r.plan_type : r.report_type}_${d10(kind === "plan" ? r.start_date : r.report_date)}`;
      await exportDoc(fmt, text, lang, r.center || patient.center, name);
    });
  }

  async function exportDoc(fmt, text, lang, centerId, fileName) {
    const c = centerById(centerId);
    const logoUrl = c && c.logo ? pb.files.getURL(c, c.logo) : "";
    const opts = { lang, center: c, logoUrl, fileName: fileName.replace(/[\\/:*?"<>|]+/g, "-"), docTitle: fileName };
    try {
      if (fmt === "docx") { await X.exportDocx(text, opts); toast("تم تنزيل ملف Word"); }
      else X.exportPdf(text, opts);
    } catch (e) { console.error(e); toast("تعذر إنشاء الملف: " + e.message, true); }
  }

  // ------------------------------------------------------------------ attachments
  function filesBlock(rec, collection) {
    const files = (rec && rec.files) || [];
    return `<div class="field"><label class="f">المرفقات (نسخة موقعة، تقارير خارجية…) — PDF / Word / صور</label>
      <div class="files" id="fileList">${files.map((f) => `<span><a href="#" data-file="${esc(f)}">📎 ${esc(String(f).split("__").slice(1).join("__") || f)}</a> <button class="btn sm danger" data-rmfile="${esc(f)}" title="حذف">✕</button></span>`).join("") || '<span class="hint">لا توجد مرفقات</span>'}</div>
      <input type="file" id="newFiles" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="margin-top:8px"></div>`;
  }
  function bindFiles(root, rec, collection, state) {
    root.querySelectorAll("[data-file]").forEach((a) => a.onclick = async (e) => {
      e.preventDefault();
      try { toast("جاري فتح الملف…"); await pb.files.download(rec, a.dataset.file); } catch (err) { toast(errText(err), true); }
    });
    root.querySelectorAll("[data-rmfile]").forEach((b) => b.onclick = () => {
      state.removeFiles = state.removeFiles || [];
      state.removeFiles.push(b.dataset.rmfile);
      b.parentElement.style.opacity = .35; b.disabled = true; dirty = true;
    });
    const inp = root.querySelector("#newFiles");
    if (inp) inp.onchange = () => { dirty = true; };
  }
  function filePayload(root, state, data) {
    const inp = root.querySelector("#newFiles");
    if (inp && inp.files.length) data["files+"] = [...inp.files];
    if (state.removeFiles && state.removeFiles.length) data["files-"] = state.removeFiles;
    return data;
  }

  // ------------------------------------------------------------------ document editor (plans + all report types)
  const shortCenter = (c, lang) => (!c ? "" : lang === "ar" ? String(c.name_ar || "").replace(/^مركز\s+/, "") : (c.name_en || c.name_ar));
  const fullCenter = (c, lang) => (!c ? "" : lang === "ar" ? c.name_ar : (c.name_en || c.name_ar));

  async function pageDoc(coll, id, sb) {
    const q = qs();
    const isPlan = coll === "plans";
    sandbox = !!sb;
    let rec, patient;
    if (id === "new") {
      patient = sb ? samplePatient(q.g) : await pb.collection("patients").getOne(q.patient);
      if (isPlan) {
        const start = today();
        rec = { patient: patient.id, center: patient.center, plan_type: "الخطة التربوية الفردية", status: "سارية", start_date: toPb(start), end_date: toPb(addMonths(start, 6)), plan_lang: "ar", plan_text: "" };
        if (q.renew) {
          const prev = await pb.collection("plans").getOne(q.renew);
          const pd = deepClone(prev.plan_data) || {};
          const ns = d10(prev.end_date) || start;
          (pd.blocks || []).forEach((b) => (b.stgs || []).forEach((s) => { delete s.start; delete s.end; if (s.eval !== "achieved") s.eval = "training"; }));
          rec = { ...rec, center: prev.center || rec.center, plan_type: prev.plan_type, plan_lang: prev.plan_lang || "ar", previous: prev.id, plan_data: pd,
            start_date: toPb(ns), end_date: toPb(addMonths(ns, Number(pd.months) || 6)), sessions_approved: prev.sessions_approved };
        }
      } else {
        const type = q.type || "تقرير تقييم";
        const kind = KIND[type];
        rec = { patient: patient.id, center: patient.center, report_type: type, report_date: toPb(today()), status: "مسودة", report_lang: "ar", report_text: "",
          next_due: ["initial", "evaluation", "progress"].includes(kind) ? toPb(addMonths(today(), 6)) : "" };
        if (q.prev) rec.previous = q.prev;
      }
    } else {
      rec = await pb.collection(coll).getOne(id, { expand: "therapist" });
      patient = await pb.collection("patients").getOne(rec.patient);
    }
    const kind = isPlan ? "plan" : KIND[rec.report_type] || "external";
    const form = window.Forms[kind];
    let lang = (isPlan ? rec.plan_lang : rec.report_lang) || "ar";
    const pcAr = FC.personCtx(patient, "ar", today());
    const pcFor = (l) => FC.personCtx(patient, l, d10(isPlan ? rec.start_date : rec.report_date) || today());
    const field = isPlan ? "plan_data" : "assessment";
    const data = (rec[field] && Object.keys(rec[field]).length) ? rec[field] : Object.assign(form.defaults(pcAr), rec[field] || {});
    if (isPlan) data.blocks = data.blocks || [];
    const fstate = {};
    const readonly = !canClinical();

    // Linked plan (progress / discharge / external)
    let plans = [];
    if (form.usesPlan) {
      plans = sb ? [samplePlan(patient)] : await pb.collection("plans").getFullList({ filter: pb.filter("patient = {:p}", { p: patient.id }), sort: "-start_date" });
      if (plans.length && !rec.plan) rec.plan = (plans.find((p) => p.status === "سارية") || plans[0]).id;
    }
    const planRec = () => plans.find((p) => p.id === rec.plan);
    const planGoals = (l) => { const p = planRec(); return p && p.plan_data ? window.Forms.plan.allGoals(p.plan_data, l, pcFor(l)) : []; };
    if (kind === "progress" && id === "new" && !data.prev_level) {
      const pd = (planRec() || {}).plan_data || {};
      data.prev_level = [pd.r_receptive, pd.r_expressive, pd.r_articulation].filter(Boolean).map((t) => FC.gx(t, pcAr)).join(" ");
    }

    // ----- field renderer
    const optLabel = (f, o) => (f.chipLabel === "short" && o.short ? o.short : FC.gx(o.ar, pcAr));
    const fieldsById = {};
    function renderField(f) {
      fieldsById[f.id] = f;
      const hidden = f.show && !f.show(data) ? " hidden" : "";
      const lab = f.label && f.label.ar ? `<div class="q-label">${esc(f.label.ar)}${f.type === "multi" ? '<span class="tag">اختيار متعدد</span>' : ""}</div>` : "";
      const sugg = (f.suggest || []).length ? `<div class="chips sugg-row">${f.suggest.map((s, i) => `<button type="button" class="chip sugg" data-sugg="${f.id}" data-i="${i}" title="${esc(FC.gx(s.en || "", pcFor("en")))}">+ ${esc(FC.gx(s.ar, pcAr))}</button>`).join("")}</div>` : "";
      const v = data[f.id];
      let inner = "";
      switch (f.type) {
        case "single": case "multi":
          inner = `<div class="chips">${f.options.map((o) => {
            const on = f.type === "multi" ? (v || []).includes(o.v) : v === o.v;
            return `<button type="button" class="chip${on ? " on" : ""}" data-path="${f.id}" data-v="${esc(o.v)}" data-mode="${f.type}" title="${esc(FC.gx(o.ar, pcAr))}">${esc(optLabel(f, o))}</button>`;
          }).join("")}</div>`; break;
        case "text": inner = `<input class="input" data-path="${f.id}" value="${esc(v)}" placeholder="${esc(f.placeholder || "")}" ${f.ltr ? 'dir="ltr"' : ""}>` + sugg; break;
        case "number": inner = `<input class="input" type="number" min="0" data-path="${f.id}" value="${esc(v)}" style="max-width:180px">`; break;
        case "textarea": inner = `<textarea class="input" data-path="${f.id}" rows="3">${esc(v)}</textarea>` + sugg; break;
        case "list": inner = `<textarea class="input" data-path="${f.id}" rows="4" placeholder="سطر لكل بند">${esc(v)}</textarea>` + sugg + (f.suggestFrom ? `<div class="chips sugg-row" data-dyn="${f.suggestFrom}" data-for="${f.id}"></div>` : ""); break;
        case "matrix":
          inner = `<div class="table-wrap"><table class="t matrix"><tbody>${f.rows.map((r) => `<tr><td class="mlabel">${esc(f.rowLabel === "short" && r.short ? r.short : FC.gx(r.ar, pcAr))}</td>
            ${f.groups.map((g) => `<td>${g.label ? `<div class="hint">${esc(g.label)}</div>` : ""}<div class="chips">${g.options.map((o) => {
              const cur = ((v || {})[r.v] || {})[g.key];
              return `<button type="button" class="chip${cur === o.v ? " on" : ""}" data-path="${f.id}.${r.v}.${g.key}" data-v="${esc(o.v)}" data-mode="single">${esc(o.ar)}</button>`;
            }).join("")}</div></td>`).join("")}
            ${f.note ? `<td style="min-width:180px"><input class="input" placeholder="ملاحظة" data-path="${f.id}.${r.v}.note" value="${esc(((v || {})[r.v] || {}).note)}"></td>` : ""}</tr>`).join("")}</tbody></table></div>`; break;
        case "goals": inner = `<div id="goalsEditor"></div>`; break;
        case "plangoals": inner = `<div id="planGoals"></div>`; break;
      }
      return `<div class="q${hidden}" data-fid="${f.id}">${lab}${inner}</div>`;
    }

    const sections = form.sections;
    const sideHtml = sections.map((s, i) => `<a href="javascript:void 0" data-jump="${s.id}"><span>${esc(s.title.ar)}</span><span class="cnt" data-cnt="${s.id}"></span></a>`).join("") + `<a href="javascript:void 0" data-jump="doc"><span>النص النهائي والتصدير</span></a>`;
    const formHtml = sections.map((s, i) => `<div class="panel" id="s-${s.id}"><div class="panel-head"><h2 class="section-title grow"><span class="n">${i + 1}</span>${esc(s.title.ar)}</h2>${s.title.en ? `<span class="hint" dir="ltr">${esc(s.title.en)}</span>` : ""}</div>
      <div class="panel-body">${s.fields.map(renderField).join("")}</div></div>`).join("");

    const title = isPlan ? (id === "new" ? (rec.previous ? "تجديد الخطة التربوية الفردية" : "خطة تربوية فردية جديدة") : "الخطة التربوية الفردية") : rec.report_type;
    const topFields = isPlan ? `
        <div class="field"><label class="f">المركز (الترويسة)</label><select class="input" data-path="center">${S.centers.map((c) => `<option value="${c.id}" ${rec.center === c.id ? "selected" : ""}>${esc(c.name_ar)}</option>`).join("")}</select></div>
        <div class="field"><label class="f">نوع الخطة</label><select class="input" data-path="plan_type">${["الخطة التربوية الفردية", "أخرى"].map((t) => `<option ${rec.plan_type === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div class="field"><label class="f">حالة الخطة</label><select class="input" data-path="status">${PLAN_STATUS.map((t) => `<option ${rec.status === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div class="field"><label class="f">تاريخ بدء الخطة</label><input class="input" type="date" id="sd" value="${d10(rec.start_date)}"></div>
        <div class="field"><label class="f">تاريخ انتهاء الخطة / إعادة التقييم</label><input class="input" type="date" id="ed" value="${d10(rec.end_date)}"><div class="hint">يُحسب تلقائياً من مدة الخطة ويمكن تعديله.</div></div>
        <div class="field"><label class="f">عدد الجلسات الموافق عليها (تأمين)</label><input class="input" type="number" min="0" data-path="sessions_approved" value="${esc(rec.sessions_approved ?? "")}"></div>`
      : `
        <div class="field"><label class="f">المركز (الترويسة)</label><select class="input" data-path="center">${S.centers.map((c) => `<option value="${c.id}" ${rec.center === c.id ? "selected" : ""}>${esc(c.name_ar)}</option>`).join("")}</select></div>
        <div class="field"><label class="f">تاريخ التقرير</label><input class="input" type="date" id="rd" value="${d10(rec.report_date)}"></div>
        <div class="field"><label class="f">حالة التقرير</label><select class="input" data-path="status">${["مسودة", "نهائي"].map((t) => `<option ${rec.status === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div class="field"><label class="f">موعد التقرير التالي (للتذكير)</label><input class="input" type="date" id="nd" value="${d10(rec.next_due)}"><div class="hint">فارغ = لا يوجد تقرير لاحق. الافتراضي بعد 6 أشهر.</div></div>
        ${form.usesPlan ? `<div class="field" style="grid-column: span 2"><label class="f">الخطة المرتبطة</label>${plans.length ? `<select class="input" id="planSel">${plans.map((p) => `<option value="${p.id}" ${p.id === rec.plan ? "selected" : ""}>${esc(p.plan_type)}: ${d10(p.start_date)} ← ${d10(p.end_date)} (${esc(p.status)})</option>`).join("")}</select>` : `<div class="note-box">لا توجد خطة محفوظة لهذا المريض.</div>`}</div>` : ""}`;

    const main = shell(sb ? "forms" : "patients", "");
    main.innerHTML = `
      ${sb ? `<div class="note-box" style="margin-bottom:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><strong>وضع المعاينة:</strong> هذا النموذج كما يراه الأخصائي، على مريض تجريبي. جرّب الخيارات و«توليد النص» وWord وPDF — لا يُحفظ أي شيء.
        <span class="grow" style="flex:1"></span>المريض التجريبي:
        <a class="btn sm ${patient.gender === "ذكر" ? "primary" : ""}" href="${location.hash.replace(/[?&]g=[^&]*/, "").replace(/\?$/, "")}${location.hash.includes("?") ? "&" : "?"}g=m">طفل</a>
        <a class="btn sm ${patient.gender === "أنثى" ? "primary" : ""}" href="${location.hash.replace(/[?&]g=[^&]*/, "").replace(/\?$/, "")}${location.hash.includes("?") ? "&" : "?"}g=f">طفلة</a>
        <a class="btn sm" href="#/forms">← كل النماذج</a></div>` : ""}
      <div class="crumbs">${sb ? `<a href="#/forms">النماذج</a> / ${esc(title)}` : `<a href="#/patients">المرضى</a> / <a href="#/patient/${patient.id}?tab=${isPlan ? "plans" : "reports"}">${esc(patient.full_name)}</a> / ${esc(title)}`}</div>
      <div class="page-head"><h1 class="grow">${esc(title)} — ${esc(patient.full_name)}</h1>${rec.status ? statusPill(rec.status) : ""}
        ${rec.previous && id === "new" && isPlan ? `<span class="pill info">الأهداف منسوخة من الخطة السابقة</span>` : ""}</div>
      <div class="editor">
        <aside class="side panel"><div class="panel-body side-nav">${sideHtml}</div></aside>
        <div id="root">
          <div class="panel" id="topPanel"><div class="panel-head"><h2 class="grow">بيانات ${isPlan ? "الخطة" : "التقرير"}</h2></div><div class="panel-body"><div class="grid cols-3">${topFields}</div></div></div>
          <div id="formRoot">${formHtml}</div>
          <div class="panel" id="s-doc"><div class="panel-head"><h2 class="grow">النص النهائي والتصدير</h2><span class="hint">راجع النص وعدّله بحرية قبل الحفظ</span></div><div class="panel-body">
            <details class="hint" style="margin-bottom:8px"><summary>رموز التنسيق في النص</summary># عنوان · ## عنوان قسم · ### عنوان فرعي مسطّر · - نقطة · 1. ترقيم · **عريض** · ^^ سطر في الوسط · | جدول | · ::info2 / ::info4 / ::grid2 جداول البيانات</details>
            <textarea class="input doc" id="docText" placeholder="اختر الإجابات أعلاه ثم اضغط «توليد النص»…">${esc(isPlan ? rec.plan_text : rec.report_text)}</textarea>
            ${id !== "new" ? filesBlock(rec, coll) : ""}
          </div>
          ${readonly && !sb ? "" : `<div class="sticky-actions">
            <div class="lang-toggle" id="langT"><button data-l="ar">عربي</button><button data-l="en">English</button></div>
            <button class="btn" id="gen">توليد النص</button><span class="grow"></span>
            <button class="btn" id="wordBtn">Word</button><button class="btn" id="pdfBtn">PDF</button>
            ${sb ? `<span class="pill warn">معاينة — لا يوجد حفظ</span>` : `<button class="btn primary" id="save">حفظ</button>`}</div>`}
          </div>
        </div>
      </div>`;

    const root = main.querySelector("#root"), formRoot = main.querySelector("#formRoot"), top = main.querySelector("#topPanel");
    const docText = main.querySelector("#docText");
    bind(top, rec);
    bind(formRoot, data, (path) => { refreshShow(); updateCounts(); if (path.startsWith("gs.")) refreshDyn(); if (isPlan && path === "months") syncEnd(); });
    main.querySelectorAll("[data-jump]").forEach((a) => a.onclick = () => main.querySelector("#s-" + a.dataset.jump).scrollIntoView({ behavior: "smooth", block: "start" }));

    function refreshShow() {
      Object.values(fieldsById).forEach((f) => { if (!f.show) return; const el = formRoot.querySelector(`[data-fid="${f.id}"]`); if (el) el.classList.toggle("hidden", !f.show(data)); });
    }
    function updateCounts() {
      sections.forEach((s) => {
        const el = main.querySelector(`[data-cnt="${s.id}"]`); if (!el) return;
        const fs = s.fields.filter((f) => !["goals", "plangoals"].includes(f.type) && (!f.show || f.show(data)));
        if (!fs.length) { el.textContent = ""; return; }
        const n = fs.filter((f) => !FC.isEmpty(data[f.id])).length;
        el.textContent = `${n}/${fs.length}`; el.classList.toggle("done", n === fs.length);
      });
    }
    updateCounts();

    // suggestions (append text in the current document language)
    formRoot.addEventListener("click", (e) => {
      const b = e.target.closest(".chip.sugg"); if (!b) return;
      const f = fieldsById[b.dataset.sugg]; if (!f) return;
      const s = b.dataset.dyn ? { ar: b.dataset.text, en: b.dataset.text } : f.suggest[+b.dataset.i];
      const txt = FC.gx(s[lang] || s.ar, pcFor(lang));
      const el = formRoot.querySelector(`[data-path="${f.id}"]`);
      if (f.replace || f.type === "text") el.value = f.replace ? txt : (el.value ? el.value + "، " + txt : txt);
      else if (f.type === "list") el.value = (el.value.trim() ? el.value.replace(/\s+$/, "") + "\n" : "") + txt;
      else el.value = (el.value.trim() ? el.value.replace(/\s+$/, "") + " " : "") + txt;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // dynamic suggestions: open goals of the linked plan
    function refreshDyn() {
      formRoot.querySelectorAll("[data-dyn]").forEach((box) => {
        const gl = planGoals(lang).filter((g) => ((data.gs || {})[g.key] || {}).s !== "achieved");
        box.innerHTML = gl.length ? `<span class="hint" style="width:100%">أهداف من الخطة لم تتحقق بعد:</span>` + gl.map((g) => `<button type="button" class="chip sugg" data-sugg="${box.dataset.for}" data-dyn="1" data-text="${esc(g.text)}">+ ${esc(g.text.length > 90 ? g.text.slice(0, 90) + "…" : g.text)}</button>`).join("") : "";
      });
    }

    // plan-linked goals with status chips (progress / discharge)
    function renderPlanGoals() {
      const box = formRoot.querySelector("#planGoals"); if (!box) return;
      const f = Object.values(fieldsById).find((x) => x.type === "plangoals");
      const gl = planGoals("ar");
      data.gs = data.gs || {};
      if (!gl.length) { box.innerHTML = `<div class="note-box">${planRec() ? "الخطة المختارة لا تحتوي على أهداف قصيرة المدى." : "لا توجد خطة مرتبطة — سيُكتب التقرير بدون قائمة أهداف."}</div>`; refreshDyn(); return; }
      let last = -1;
      box.innerHTML = gl.map((g) => {
        const head = g.block !== last ? `<h3 style="margin:12px 0 6px">${esc(g.ltg || g.general)}</h3>` : ""; last = g.block;
        const cur = data.gs[g.key] || {};
        return `${head}<div class="goal-row"><div style="margin-bottom:6px">${esc(g.text)} ${g.eval ? `<span class="hint">(في الخطة: ${esc(evalLabel(g))})</span>` : ""}</div>
          <div class="chips">${f.statuses.map((o) => `<button type="button" class="chip${cur.s === o.v ? " on" : ""}" data-path="gs.${g.key}.s" data-v="${o.v}" data-mode="single">${esc(o.ar)}</button>`).join("")}
          ${f.pct ? `<input class="input" type="number" min="0" max="100" data-path="gs.${g.key}.pct" value="${esc(cur.pct)}" placeholder="% الإنجاز" style="width:120px">` : ""}</div></div>`;
      }).join("");
      refreshDyn();
    }
    const evalLabel = (g) => window.Forms.plan.evalText(g, "ar");
    renderPlanGoals();
    const ps = main.querySelector("#planSel");
    if (ps) ps.onchange = () => { rec.plan = ps.value; data.gs = {}; dirty = true; renderPlanGoals(); };

    // ----- plan: goals editor
    const PF = window.Forms.plan;
    function renderGoalsEditor() {
      const box = formRoot.querySelector("#goalsEditor"); if (!box) return;
      const pc = pcFor(lang);
      const txt = (o) => (o ? (o[lang] || o[lang === "ar" ? "en" : "ar"] || "") : "");
      box.innerHTML = (data.blocks.length ? "" : `<div class="note-box" style="margin-bottom:10px">ابدأ بإضافة هدف عام (مجال)، ثم اختر الهدف طويل المدى، ثم أضف الأهداف قصيرة المدى من البنك أو اكتبها.</div>`)
        + data.blocks.map((b, bi) => {
          const skills = PF.LTG_SKILLS[b.general] || [];
          const bank = PF.STG_BANK[b.general] || [];
          return `<div class="goal-block panel" style="box-shadow:none;margin-bottom:14px"><div class="panel-head" style="flex-wrap:wrap">
              <span class="section-title"><span class="n">${bi + 1}</span></span>
              <select class="input" data-b="${bi}" data-k="general" style="width:auto">${PF.DOMAINS.map((o) => `<option value="${o.v}" ${b.general === o.v ? "selected" : ""}>${esc(o.ar)}</option>`).join("")}</select>
              <span class="grow"></span><button class="btn sm" data-bmv="${bi}:-1">↑</button><button class="btn sm" data-bmv="${bi}:1">↓</button><button class="btn sm danger" data-brm="${bi}">حذف المجال</button></div>
            <div class="panel-body">
              <label class="f">الهدف طويل المدى</label>
              <textarea class="input" rows="2" data-b="${bi}" data-k="ltg" dir="${lang === "ar" ? "rtl" : "ltr"}">${esc(txt(b.ltg))}</textarea>
              ${skills.length ? `<div class="chips sugg-row">${skills.map((s, i) => `<button type="button" class="chip sugg" data-ltg="${bi}:${i}">+ ${esc(s.ar)}</button>`).join("")}</div>` : ""}
              <h3 style="margin:14px 0 8px">الأهداف قصيرة المدى</h3>
              ${(b.stgs || []).map((s, si) => {
                const t = txt(s); const noNum = t && !/\d/.test(t);
                const mc = (key, opts) => `<div class="chips">${opts.map((o) => `<button type="button" class="chip${(s[key] || []).includes(o.v) ? " on" : ""}" data-gchip="${bi}:${si}:${key}" data-v="${o.v}">${esc(o.ar)}</button>`).join("")}</div>`;
                return `<div class="goal-row">
                  <div class="top"><span class="num">${si + 1}</span><span class="grow" style="flex:1"></span>${noNum ? `<span class="pill warn" title="بند C9: كل هدف قصير المدى يحتاج معياراً رقمياً">⚠ بدون معيار رقمي</span>` : ""}
                    <button class="btn sm" data-smv="${bi}:${si}:-1">↑</button><button class="btn sm" data-smv="${bi}:${si}:1">↓</button><button class="btn sm danger" data-srm="${bi}:${si}">حذف</button></div>
                  <textarea class="input" rows="2" data-b="${bi}" data-s="${si}" data-k="text" dir="${lang === "ar" ? "rtl" : "ltr"}" placeholder="أن ${pc.C === "الطالبة" || pc.C === "الطفلة" ? "تـ…" : "يـ…"} ${esc(pc.C)} … بعدد 4 مرات صحيحة من أصل 5 محاولات">${esc(t)}</textarea>
                  <div class="chips sugg-row"><button type="button" class="chip sugg" data-crit="${bi}:${si}">+ ${lang === "ar" ? PF.CRIT_AR : PF.CRIT_EN}</button><button type="button" class="chip sugg" data-crit2="${bi}:${si}">+ ${lang === "ar" ? "بنسبة إتقان 80%" : "with 80% accuracy"}</button></div>
                  <div class="grid cols-2" style="margin-top:8px">
                    <div><label class="f">المواد والأدوات اللازمة</label>${mc("materials", PF.MATERIALS)}</div>
                    <div><label class="f">الاستراتيجيات التدريبية</label>${mc("strategies", PF.STRATEGIES)}</div>
                    <div><label class="f">التعزيز</label>${mc("reinf", PF.REINF)}</div>
                    <div><label class="f">التقييم</label><div class="chips">${PF.EVAL.map((o) => `<button type="button" class="chip${s.eval === o.v ? " on" : ""}" data-geval="${bi}:${si}" data-v="${o.v}">${esc(o.ar)}</button>`).join("")}
                      ${s.eval === "partial" ? `<input class="input" type="number" min="1" max="99" data-b="${bi}" data-s="${si}" data-k="pct" value="${esc(s.pct)}" placeholder="%" style="width:90px">` : ""}</div></div>
                    <div><label class="f">تاريخ البدء</label><input class="input" type="date" data-b="${bi}" data-s="${si}" data-k="start" value="${esc(s.start || d10(rec.start_date))}"></div>
                    <div><label class="f">تاريخ الانتهاء</label><input class="input" type="date" data-b="${bi}" data-s="${si}" data-k="end" value="${esc(s.end || d10(rec.end_date))}"></div>
                  </div></div>`;
              }).join("")}
              <div class="btn-row"><button class="btn" data-sadd="${bi}">+ هدف قصير فارغ</button></div>
              ${bank.length ? `<details style="margin-top:10px" open><summary class="f" style="cursor:pointer">بنك الأهداف لهذا المجال (اضغط لإضافة — استبدل X بالرقم أو الصوت)</summary><div class="bank" style="margin-top:6px">${bank.map((g, i) => `<button type="button" data-bank="${bi}:${i}">+ ${esc(FC.gx(g.ar, pcAr))}</button>`).join("")}</div></details>` : ""}
            </div></div>`;
        }).join("")
        + `<div class="btn-row"><select class="input" id="newDomain" style="width:auto">${PF.DOMAINS.map((o) => `<option value="${o.v}">${esc(o.ar)}</option>`).join("")}</select><button class="btn primary" id="addBlock">+ إضافة هدف عام</button></div>`;
    }
    function goalsHandlers() {
      const box = formRoot.querySelector("#goalsEditor"); if (!box) return;
      const get = (s) => s.split(":").map(Number);
      box.addEventListener("input", (e) => {
        const el = e.target.closest("[data-b]"); if (!el || el.tagName === "SELECT") return;
        const b = data.blocks[+el.dataset.b]; const k = el.dataset.k;
        if (el.dataset.s == null) { if (k === "ltg") { b.ltg = b.ltg || {}; b.ltg[lang] = el.value; } }
        else { const s = b.stgs[+el.dataset.s]; if (k === "text") s[lang] = el.value; else s[k] = el.value; }
        dirty = true;
      });
      box.addEventListener("change", (e) => {
        const el = e.target.closest("select[data-b]"); if (!el) return;
        data.blocks[+el.dataset.b].general = el.value; dirty = true; renderGoalsEditor();
      });
      box.addEventListener("click", (e) => {
        const t = e.target.closest("button"); if (!t) return;
        const pc = pcFor(lang), pcA = pcFor("ar"), pcE = pcFor("en");
        const ds = t.dataset;
        if (t.id === "addBlock") { data.blocks.push({ general: box.querySelector("#newDomain").value, ltg: {}, stgs: [] }); }
        else if (ds.brm != null) { if (!confirm("حذف هذا المجال بكل أهدافه؟")) return; data.blocks.splice(+ds.brm, 1); }
        else if (ds.bmv) { const [i, dd] = get(ds.bmv); const j = i + dd; if (j < 0 || j >= data.blocks.length) return; [data.blocks[i], data.blocks[j]] = [data.blocks[j], data.blocks[i]]; }
        else if (ds.ltg) { const [bi, i] = get(ds.ltg); const sk = PF.LTG_SKILLS[data.blocks[bi].general][i]; data.blocks[bi].ltg = { ar: PF.ltgText(sk, "ar", pcA), en: PF.ltgText(sk, "en", pcE) }; }
        else if (ds.sadd != null) { const b = data.blocks[+ds.sadd]; b.stgs = b.stgs || []; b.stgs.push({ ar: "", en: "", materials: [], strategies: ["verbal", "repetition"], reinf: ["tangible", "social"], eval: "not_started" }); }
        else if (ds.bank) { const [bi, i] = get(ds.bank); const g = PF.STG_BANK[data.blocks[bi].general][i]; const b = data.blocks[bi]; b.stgs = b.stgs || [];
          b.stgs.push({ ar: FC.gx(g.ar, pcA), en: FC.gx(g.en, pcE), materials: ["toys"], strategies: ["verbal", "physical", "repetition"], reinf: ["tangible", "social"], eval: "not_started" }); toast("تمت إضافة الهدف — عدّل X إن وجد"); }
        else if (ds.srm) { const [bi, si] = get(ds.srm); data.blocks[bi].stgs.splice(si, 1); }
        else if (ds.smv) { const [bi, si, dd] = get(ds.smv); const a = data.blocks[bi].stgs; const j = si + dd; if (j < 0 || j >= a.length) return; [a[si], a[j]] = [a[j], a[si]]; }
        else if (ds.gchip) { const [bi, si] = get(ds.gchip); const key = ds.gchip.split(":")[2]; const s = data.blocks[bi].stgs[si]; s[key] = s[key] || []; const k = s[key].indexOf(ds.v); if (k >= 0) s[key].splice(k, 1); else s[key].push(ds.v); }
        else if (ds.geval) { const [bi, si] = get(ds.geval); const s = data.blocks[bi].stgs[si]; s.eval = s.eval === ds.v ? "" : ds.v; }
        else if (ds.crit || ds.crit2) { const [bi, si] = get(ds.crit || ds.crit2); const s = data.blocks[bi].stgs[si]; const add = ds.crit ? (lang === "ar" ? PF.CRIT_AR : PF.CRIT_EN) : (lang === "ar" ? "بنسبة إتقان 80%" : "with 80% accuracy"); s[lang] = ((s[lang] || "").trim() + " " + add).trim(); }
        else return;
        dirty = true; renderGoalsEditor();
      });
    }
    if (isPlan) { renderGoalsEditor(); goalsHandlers(); }

    // ----- dates
    if (isPlan) {
      const sd = main.querySelector("#sd"), ed = main.querySelector("#ed");
      sd.oninput = () => { rec.start_date = toPb(sd.value); syncEnd(); dirty = true; };
      ed.oninput = () => { rec.end_date = toPb(ed.value); dirty = true; };
      var syncEnd = function () { if (sd.value && data.months) { ed.value = addMonths(sd.value, Number(data.months)); rec.end_date = toPb(ed.value); renderGoalsEditor(); } };
    } else {
      main.querySelector("#rd").oninput = (e) => { rec.report_date = toPb(e.target.value); dirty = true; };
      main.querySelector("#nd").oninput = (e) => { rec.next_due = toPb(e.target.value); dirty = true; };
    }

    // ----- language toggle
    const langT = main.querySelector("#langT");
    function setLang(l) {
      lang = l; if (isPlan) rec.plan_lang = l; else rec.report_lang = l;
      if (langT) langT.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.l === l));
      docText.dir = l === "ar" ? "rtl" : "ltr";
      if (isPlan) renderGoalsEditor();
      refreshDyn();
    }
    if (langT) langT.onclick = (e) => { const b = e.target.closest("button"); if (b && b.dataset.l !== lang) { setLang(b.dataset.l); dirty = true; toast(b.dataset.l === "en" ? "لغة المستند: English — اضغط «توليد النص»" : "لغة المستند: العربية — اضغط «توليد النص»"); } };
    setLang(lang);

    // ----- generation & export
    const therapistRec = () => (rec.expand && rec.expand.therapist) || S.me;
    const ctxFor = (l) => {
      const c = centerById(rec.center); const p = planRec();
      return { lang: l, pc: pcFor(l), patient, therapistName: clinicianName(therapistRec(), l), reportDate: d10(isPlan ? rec.start_date : rec.report_date),
        startDate: d10(rec.start_date), endDate: d10(rec.end_date), centerShort: shortCenter(c, l), centerFull: fullCenter(c, l), supervisor: c ? c.supervisor_name : "",
        reeval: rec.report_type === "تقرير إعادة تقييم", planGoals: planGoals(l), planStart: p ? d10(p.start_date) : "", planEnd: p ? d10(p.end_date) : "", planData: p ? p.plan_data : null };
    };
    const genText = () => {
      if (lang === "en") {
        const miss = [];
        if (!patient.full_name_en) miss.push("اسم المريض بالإنجليزي");
        if (!therapistRec().name_en) miss.push("اسم الأخصائي بالإنجليزي");
        if (miss.length) toast("للمستند الإنجليزي ينقص: " + miss.join(" و "), true);
      }
      return form.generate(data, ctxFor(lang));
    };
    const gen = main.querySelector("#gen");
    if (gen) gen.onclick = () => {
      if (docText.value.trim() && !confirm("سيتم استبدال النص الحالي بنص جديد مولّد من الخيارات. متابعة؟")) return;
      docText.value = genText(); dirty = true; docText.scrollIntoView({ behavior: "smooth" });
    };
    docText.oninput = () => { dirty = true; };
    const ensureText = () => { if (!docText.value.trim()) { docText.value = genText(); dirty = true; } return docText.value; };
    const fname = () => `${patient.file_no}_${isPlan ? rec.plan_type : rec.report_type}_${d10(isPlan ? rec.start_date : rec.report_date)}`;
    if (main.querySelector("#wordBtn")) {
      main.querySelector("#wordBtn").onclick = () => exportDoc("docx", ensureText(), lang, rec.center, fname());
      main.querySelector("#pdfBtn").onclick = () => exportDoc("pdf", ensureText(), lang, rec.center, fname());
    }

    // ----- save
    const save = main.querySelector("#save");
    if (save) save.onclick = async () => {
      if (!isPlan && rec.status === "نهائي" && !docText.value.trim()) { toast("لا يمكن اعتماد تقرير بدون نص. اضغط «توليد النص» أولاً.", true); return; }
      if (isPlan && (!rec.start_date || !rec.end_date)) { toast("حدد تاريخ البداية والانتهاء", true); return; }
      if (isPlan) {
        const noCrit = (data.blocks || []).flatMap((b) => b.stgs || []).filter((s) => { const t = s[lang] || s.ar || s.en || ""; return t.trim() && !/\d/.test(t); });
        if (noCrit.length && !confirm(`يوجد ${noCrit.length} هدف قصير المدى بدون معيار رقمي (بند C9 حرج). الحفظ على أي حال؟`)) return;
      }
      save.disabled = true;
      try {
        let payload;
        if (isPlan) {
          payload = { patient: patient.id, center: rec.center, plan_type: rec.plan_type, status: rec.status, start_date: rec.start_date, end_date: rec.end_date,
            sessions_approved: rec.sessions_approved === "" || rec.sessions_approved == null ? null : rec.sessions_approved, plan_lang: lang, plan_data: data, plan_text: docText.value,
            goals: PF.allGoals(data, lang, pcFor(lang)).map((g, i) => `${i + 1}. ${g.text}`).join("\n") };
        } else {
          payload = { patient: patient.id, center: rec.center, report_type: rec.report_type, report_date: rec.report_date, next_due: rec.next_due || "",
            status: rec.status, report_lang: lang, assessment: data, report_text: docText.value, plan: rec.plan || "" };
        }
        payload = filePayload(root, fstate, payload);
        if (id === "new" && rec.previous) payload.previous = rec.previous;
        const saved = id === "new" ? await pb.collection(coll).create(payload) : await pb.collection(coll).update(id, payload);
        dirty = false; toast("تم الحفظ ✓");
        if (id === "new") { history.replaceState(null, "", `#/${isPlan ? "plan" : "report"}/${saved.id}`); lastHash = location.hash; }
        route();
      } catch (e) { toast(errText(e), true); }
      save.disabled = false;
    };
    if (id !== "new") bindFiles(root, rec, coll, fstate);
    if (readonly && !sb) root.querySelectorAll("input,select,textarea,.chip,.btn").forEach((el) => el.disabled = true);
  }

  // ------------------------------------------------------------------ forms preview (sandbox)
  function samplePatient(g) {
    const female = g === "f";
    const c = centerById(S.centerFilter) || S.centers.find((x) => x.code === "BEDAYA") || S.centers[0] || {};
    return { id: "sample", center: c.id, file_no: "0000", gender: female ? "أنثى" : "ذكر", nationality: "الإماراتية",
      full_name: female ? "سارة محمد (تجريبي)" : "أحمد محمد (تجريبي)", full_name_en: female ? "Sara Mohammad (sample)" : "Ahmad Mohammad (sample)",
      dob: toPb(addMonths(today(), -50)), start_date: toPb(addMonths(today(), -6)) };
  }
  function samplePlan(patient) {
    const PF = window.Forms.plan, pa = FC.personCtx(patient, "ar"), pe = FC.personCtx(patient, "en");
    const d = PF.defaults(pa);
    d.speech_dx = "تأخر لغوي استقبالي وتعبيري"; d.r_receptive = FC.gx("{يستطيع|تستطيع} اتباع الأوامر البسيطة المكوّنة من خطوة واحدة.", pa);
    d.r_expressive = FC.gx("{يعتمد|تعتمد} على الكلمات المفردة.", pa);
    const stg = (dom, i, ev) => ({ ar: FC.gx(PF.STG_BANK[dom][i].ar, pa).replace("X", "5"), en: FC.gx(PF.STG_BANK[dom][i].en, pe).replace("X", "5"), materials: ["toys", "cards"], strategies: ["verbal", "modeling"], reinf: ["tangible", "social"], eval: ev });
    d.blocks = [
      { general: "receptive", ltg: { ar: PF.ltgText(PF.LTG_SKILLS.receptive[0], "ar", pa), en: PF.ltgText(PF.LTG_SKILLS.receptive[0], "en", pe) }, stgs: [stg("receptive", 1, "achieved"), stg("receptive", 4, "training")] },
      { general: "expressive", ltg: { ar: PF.ltgText(PF.LTG_SKILLS.expressive[0], "ar", pa), en: PF.ltgText(PF.LTG_SKILLS.expressive[0], "en", pe) }, stgs: [stg("expressive", 0, "partial"), stg("expressive", 4, "not_started")] },
    ];
    return { id: "sample-plan", plan_type: "الخطة التربوية الفردية", status: "سارية", start_date: toPb(addMonths(today(), -6)), end_date: toPb(today()), plan_data: d };
  }

  function pageForms() {
    const main = shell("forms", "");
    const card = (href, title, hint, src) => `<a class="panel form-card" href="${href}"><div class="panel-body"><h3>${esc(title)}</h3><div class="hint" style="margin-top:4px">${esc(hint)}</div>${src ? `<div class="pill" style="margin-top:10px">${esc(src)}</div>` : ""}</div></a>`;
    const T = (t) => `#/try/report?type=${encodeURIComponent(t)}`;
    main.innerHTML = `
      <div class="page-head"><div class="grow"><h1>النماذج</h1><div class="muted">افتح أي نموذج لتراه كما يستخدمه الأخصائي — على مريض تجريبي، ولا يتم حفظ أي شيء.</div></div></div>
      <div class="grid cols-3">
        ${card("#/try/plan", "الخطة التربوية الفردية للنطق واللغة", "بيانات الخطة، ملخص التقييم، الأهداف وجداولها، المتابعة والاعتماد", "نموذج ST_TP")}
        ${card(T("تقرير تقييم"), "تقرير تقييم", "التقييم الشامل بالعربي أو الإنجليزي", "Evaluation Report")}
        ${card(T("تقرير التقييم الأولي"), "تقرير التقييم الأولي", "النموذج المختصر", "نموذج ST_IA")}
        ${card(T("تقرير تقييم مرحلي"), "تقرير تقييم مرحلي", "مرتبط بأهداف الخطة (خطة تجريبية جاهزة للمعاينة)", "نموذج PRO_REP")}
        ${card(T("تقرير إعادة تقييم"), "تقرير إعادة تقييم", "نفس نموذج التقييم الشامل بعنوان إعادة تقييم", "")}
        ${card(T("تقرير خروج"), "تقرير خروج", "عند إنهاء العلاج", "")}
        ${card(T("تقرير لجهة خارجية"), "تقرير لجهة خارجية", "مدرسة / تأمين / طبيب", "")}
      </div>
      <p class="hint" style="margin-top:14px">للعمل الحقيقي: المرضى ← افتح ملف المريض ← تبويب «الخطط» أو «التقارير».</p>`;
  }

  // ------------------------------------------------------------------ users (admin)
  async function pageUsers() {
    const main = shell("users", `<div class="empty">جاري التحميل…</div>`);
    const users = await pb.collection("users").getFullList({ sort: "role,name" });
    main.innerHTML = `<div class="page-head"><h1 class="grow">المستخدمون</h1><button class="btn primary" id="newU">+ مستخدم جديد</button></div>
      <div class="panel"><div class="table-wrap"><table class="t"><thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>المراكز</th><th>الحالة</th><th></th></tr></thead><tbody>
      ${users.map((u) => `<tr><td><strong>${esc(u.name)}</strong>${u.name_en ? `<div class="hint" dir="ltr" style="text-align:right">${esc(u.name_en)}</div>` : ""}</td><td class="mono">${esc(u.username)}${u.email ? `<div class="hint">${esc(u.email)}</div>` : ""}</td><td>${esc(ROLE[u.role] || u.role)}</td>
        <td>${(u.centers || []).map(centerTag).join(" ")}</td><td>${u.active ? '<span class="pill ok">مفعّل</span>' : '<span class="pill danger">موقوف</span>'}</td>
        <td><button class="btn sm" data-u="${u.id}">تعديل</button></td></tr>`).join("")}</tbody></table></div></div>
      <p class="hint" style="margin-top:10px">إيقاف الحساب يمنع الدخول فوراً مع الإبقاء على سجلاته. الأخصائي يرى فقط المرضى المسندين إليه.</p>`;
    main.querySelector("#newU").onclick = () => userModal(null);
    main.querySelectorAll("[data-u]").forEach((b) => b.onclick = () => userModal(users.find((u) => u.id === b.dataset.u)));
  }
  function userModal(u) {
    const isNew = !u; u = u || { role: "therapist", active: true, centers: S.centers.map((c) => c.id) };
    const m = modal(isNew ? "مستخدم جديد" : "تعديل مستخدم", `<div class="grid cols-2">
      <div class="field"><label class="f">الاسم الكامل (يظهر في التقارير)</label><input class="input" name="name" value="${esc(u.name)}"></div>
      <div class="field"><label class="f">الاسم بالإنجليزي (للتقارير الإنجليزية)</label><input class="input" dir="ltr" name="name_en" value="${esc(u.name_en)}"></div>
      <div class="field"><label class="f">اسم المستخدم (للدخول) *</label><input class="input mono" name="username" dir="ltr" autocapitalize="off" value="${esc(u.username)}"></div>
      <div class="field"><label class="f">البريد الإلكتروني (لاستلام التذكيرات — اختياري)</label><input class="input mono" name="email" type="email" value="${esc(u.email)}"></div>
      <div class="field"><label class="f">الدور</label><select class="input" name="role">${Object.entries(ROLE).map(([k, v]) => `<option value="${k}" ${u.role === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label class="f">الحالة</label><select class="input" name="active"><option value="1" ${u.active ? "selected" : ""}>مفعّل</option><option value="0" ${!u.active ? "selected" : ""}>موقوف</option></select></div>
      <div class="field"><label class="f">${isNew ? "كلمة المرور" : "كلمة مرور جديدة (اتركها فارغة لعدم التغيير)"}</label><input class="input" name="password" type="password" autocomplete="new-password" minlength="8"></div>
    </div>
    <div class="field"><label class="f">المراكز</label><div class="chips" id="uc">${S.centers.map((c) => `<button type="button" class="chip ${(u.centers || []).includes(c.id) ? "on" : ""}" data-id="${c.id}">${esc(c.name_ar)}</button>`).join("")}</div></div>
    <p class="hint">كلمة المرور 8 أحرف على الأقل. أعطها للموظف شخصياً واطلب منه تغييرها.</p>`, {
      onOk: async (root) => {
        const data = { name: val(root, "name"), name_en: val(root, "name_en"), username: val(root, "username").toLowerCase(), email: val(root, "email"), role: val(root, "role"), active: val(root, "active") === "1",
          centers: [...root.querySelectorAll("#uc .chip.on")].map((c) => c.dataset.id), emailVisibility: true };
        const pw = root.querySelector('[name="password"]').value;
        if (isNew && pw.length < 8) { toast("كلمة المرور 8 أحرف على الأقل", true); return false; }
        if (pw) { data.password = pw; data.passwordConfirm = pw; }
        if (isNew) { data.verified = true; await pb.collection("users").create(data); } else await pb.collection("users").update(u.id, data);
        S.therapists = await pb.collection("users").getFullList({ filter: 'role = "therapist" && active = true', sort: "name" });
        toast("تم الحفظ"); route();
      },
    });
    m.querySelector("#uc").onclick = (e) => { const c = e.target.closest(".chip"); if (c) c.classList.toggle("on"); };
  }

  // ------------------------------------------------------------------ audit (admin)
  async function pageAudit() {
    const main = shell("audit", `<div class="empty">جاري التحميل…</div>`);
    const res = await pb.collection("audit_log").getList(1, 300, { sort: "-created" });
    const COL = { patients: "مريض", plans: "خطة", reports: "تقرير", users: "مستخدم", app_settings: "إعدادات" };
    main.innerHTML = `<div class="page-head"><h1 class="grow">سجل الحركات</h1><span class="muted">آخر ${res.items.length} من ${res.totalItems}</span></div>
      <div class="panel"><div class="table-wrap"><table class="t"><thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>النوع</th><th>التفاصيل</th><th>IP</th></tr></thead><tbody>
      ${res.items.map((a) => `<tr><td class="nowrap mono">${esc(new Date(a.created.replace(" ", "T")).toLocaleString("en-GB"))}</td><td>${esc(a.user_name)}</td><td>${esc(a.action)}</td><td>${esc(COL[a.collection_name] || a.collection_name)}</td><td>${esc(a.label)}</td><td class="mono hint">${esc(a.ip)}</td></tr>`).join("")}
      </tbody></table></div></div>`;
  }

  // ------------------------------------------------------------------ settings (admin)
  async function pageSettings() {
    const main = shell("settings", "");
    const s = S.settings || {};
    main.innerHTML = `<div class="page-head"><h1 class="grow">الإعدادات</h1></div>
      <div class="panel"><div class="panel-head"><h2 class="grow">التذكيرات</h2></div><div class="panel-body">
        <div class="grid cols-4">
          <div class="field"><label class="f">اسم النظام</label><input class="input" id="sn" value="${esc(s.system_name)}"></div>
          <div class="field"><label class="f">يبدأ التذكير قبل الموعد بـ (يوم)</label><input class="input" id="rb" type="number" min="0" max="60" value="${esc(remindBefore())}"></div>
          <div class="field"><label class="f">ويستمر بعد الموعد حتى (أيام)</label><input class="input" id="ra" type="number" min="0" max="60" value="${esc(remindAfter())}"></div>
          <div class="field"><label class="f">إرسال تذكير لكل أخصائي بمرضاه</label><select class="input" id="et"><option value="1" ${s.email_therapists ? "selected" : ""}>نعم</option><option value="0" ${!s.email_therapists ? "selected" : ""}>لا</option></select></div>
        </div>
        <div class="field"><label class="f">إيميلات تستلم الملخص اليومي الكامل (افصل بفاصلة)</label><input class="input mono" id="ne" value="${esc(s.notify_emails)}" placeholder="manager@example.com, head.slp@example.com"></div>
        <div class="btn-row"><button class="btn primary" id="saveS">حفظ</button><button class="btn" id="sendNow">إرسال التذكيرات الآن</button></div>
        <p class="note-box" style="margin-top:12px">ترسل التذكيرات تلقائياً كل يوم الساعة 8:00 صباحاً (من حساب Gmail الذي نشر Apps Script) لكل خطة أو تقرير يقع موعده ضمن هذه الفترة. يستلم كل أخصائي تذكير مرضاه إذا كان له بريد في صفحة المستخدمين.</p>
      </div></div>
      <div class="panel"><div class="panel-head"><h2 class="grow">الخادم</h2></div><div class="panel-body">
        <div class="field"><label class="f">رابط Apps Script الحالي</label><div class="mono hint" style="word-break:break-all">${esc(API_URL)}</div></div>
        <button class="btn" onclick="window.__changeServer()">تغيير رابط الخادم</button>
      </div></div>
      <div class="panel"><div class="panel-head"><h2 class="grow">المراكز والترويسة</h2><span class="hint">تظهر في رأس كل تقرير وخطة (Word و PDF)</span></div><div class="panel-body" id="centers"></div></div>`;
    main.querySelector("#saveS").onclick = async () => {
      try {
        S.settings = await pb.collection("app_settings").update(s.id, { system_name: main.querySelector("#sn").value,
          remind_before: Number(main.querySelector("#rb").value) || 0, remind_after: Number(main.querySelector("#ra").value) || 0,
          email_therapists: main.querySelector("#et").value === "1", notify_emails: main.querySelector("#ne").value });
        toast("تم الحفظ"); route();
      } catch (e) { toast(errText(e), true); }
    };
    main.querySelector("#sendNow").onclick = async (e) => {
      e.target.disabled = true;
      try {
        const r = await pb.send("/api/bedaya/send-reminders", { method: "POST" });
        toast(r.smtpEnabled ? `تم: ${r.items} عنصر مستحق، أُرسلت ${r.emailsSent} رسالة` : `${r.items} عنصر مستحق — الإيميل غير مفعّل بعد (أدخل إعدادات SMTP)`);
      } catch (err) { toast(errText(err), true); }
      e.target.disabled = false;
    };
    const box = main.querySelector("#centers");
    box.innerHTML = S.centers.map((c) => `<div class="goal-row" data-c="${c.id}">
      <div class="top"><span class="center-dot" style="background:${esc(c.color)}"></span><strong>${esc(c.name_ar)}</strong><span class="mono hint">${esc(c.code)}</span>
        <span style="flex:1"></span>${c.logo ? `<img src="${pb.files.getURL(c, c.logo)}" alt="" style="height:40px">` : '<span class="hint">لا يوجد شعار</span>'}</div>
      <div class="grid cols-3">
        <div><label class="f">الاسم بالعربي</label><input class="input" name="name_ar" value="${esc(c.name_ar)}"></div>
        <div><label class="f">الاسم بالإنجليزي</label><input class="input" dir="ltr" name="name_en" value="${esc(c.name_en)}"></div>
        <div><label class="f">لون الترويسة</label><input class="input" type="color" name="color" value="${esc(c.color || "#0f766e")}" style="height:40px;padding:3px"></div>
        <div><label class="f">العنوان</label><input class="input" name="address" value="${esc(c.address)}"></div>
        <div><label class="f">الهاتف</label><input class="input mono" name="phone" value="${esc(c.phone)}"></div>
        <div><label class="f">البريد</label><input class="input mono" name="email" value="${esc(c.email)}"></div>
        <div><label class="f">واتساب</label><input class="input mono" name="whatsapp" value="${esc(c.whatsapp)}"></div>
        <div><label class="f">المشرف السريري (يظهر في اعتماد الخطة)</label><input class="input" name="supervisor_name" value="${esc(c.supervisor_name)}"></div>
        <div><label class="f">رقم الترخيص</label><input class="input mono" name="license_no" value="${esc(c.license_no)}"></div>
        <div><label class="f">ملاحظة التذييل</label><input class="input" name="footer_note" value="${esc(c.footer_note)}" placeholder="مثال: سري – للاستخدام الطبي فقط"></div>
        <div><label class="f">الشعار (PNG أو JPG)</label><input type="file" name="logo" accept="image/png,image/jpeg"></div>
      </div>
      <div class="btn-row" style="margin-top:10px"><button class="btn primary sm" data-savec="${c.id}">حفظ المركز</button></div></div>`).join("");
    box.querySelectorAll("[data-savec]").forEach((b) => b.onclick = async () => {
      const row = box.querySelector(`[data-c="${b.dataset.savec}"]`);
      const fd = new FormData();
      ["name_ar", "name_en", "color", "address", "phone", "whatsapp", "supervisor_name", "email", "license_no", "footer_note"].forEach((k) => fd.append(k, row.querySelector(`[name="${k}"]`).value));
      const f = row.querySelector('[name="logo"]').files[0]; if (f) fd.append("logo", f);
      try {
        await pb.collection("centers").update(b.dataset.savec, fd);
        S.centers = await pb.collection("centers").getFullList({ sort: "code" });
        toast("تم حفظ المركز"); route();
      } catch (e) { toast(errText(e), true); }
    });
  }

  // ------------------------------------------------------------------ server connection
  function renderConnect(msg) {
    app.innerHTML = `<div class="login-wrap"><div class="panel login"><div class="panel-body">
      <div class="brand" style="margin-bottom:14px"><span class="brand-mark">ن</span>سجلات قسم النطق واللغة</div>
      <h1>ربط الخادم</h1><p class="muted" style="margin:4px 0 18px">الصق رابط Apps Script (Web app) الذي ينتهي بـ <span class="mono">/exec</span>. يُحفظ في هذا المتصفح.</p>
      ${msg ? `<div class="err-box">${esc(msg)}</div>` : ""}
      <form id="cf"><div class="field"><label class="f" for="api">رابط الخادم</label><input class="input mono" id="api" dir="ltr" required placeholder="https://script.google.com/macros/s/…/exec" value="${esc(API_URL)}"></div>
      <button class="btn primary" style="width:100%" type="submit">اتصال</button></form></div></div></div>`;
    app.querySelector("#cf").onsubmit = async (e) => {
      e.preventDefault();
      const url = app.querySelector("#api").value.trim();
      if (!/^https:\/\/script\.google(usercontent)?\.com\/.+/.test(url) && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(url)) return renderConnect("الرابط غير صحيح. يجب أن يبدأ بـ https://script.google.com/");
      const b = e.target.querySelector("button"); b.disabled = true; b.textContent = "جاري الفحص…";
      try {
        const r = await fetch(url, { method: "POST", body: JSON.stringify({ action: "ping" }), headers: { "Content-Type": "text/plain;charset=utf-8" } });
        let j = null; try { j = await r.json(); } catch (_) {}
        if (!j) return renderConnect(r.status === 404 ? "الرابط غير موجود (404). انسخ رابط Web app من Deploy ← Manage deployments، وتأكد أنه ينتهي بـ /exec." : "الرابط لا يعمل. تأكد أن Who has access = Anyone ثم أعد النشر.");
      } catch (_) { return renderConnect("تعذر الوصول للرابط. تأكد منه وأعد المحاولة."); }
      try { localStorage.setItem(API_KEY, url); } catch (_) {}
      location.reload();
    };
  }
  window.__changeServer = () => { try { localStorage.removeItem(API_KEY); } catch (_) {} pb.authStore.clear(); location.reload(); };

  // ------------------------------------------------------------------ boot
  (async function boot() {
    if (!API_URL) return renderConnect();
    if (!pb.authStore.isValid || !pb.authStore.record || pb.authStore.record.collectionName !== "users") return renderLogin();
    try { await pb.collection("users").authRefresh(); await afterLogin(); }
    catch (_) { pb.authStore.clear(); renderLogin("انتهت الجلسة، الرجاء تسجيل الدخول مجدداً."); }
  })();
})();
