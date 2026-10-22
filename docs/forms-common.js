// =====================================================================
//  Shared helpers for all forms (evaluation, initial, plan, progress…)
//
//  Text placeholders inside option / sentence strings:
//    {N}        child's first name
//    {FULL}     child's full name
//    {C}        "الطفل/الطفلة/الطالب/الطالبة" (ar) or first name (en)
//    {AGE}      chronological age in words
//    {a|b}      a for male, b for female  (e.g. {يستطيع|تستطيع}, {he|she})
//    {ت}        text added only for female (e.g. تعرّف{ت})
// =====================================================================
(function () {
  const L = (ar, en) => ({ ar, en });
  const O = (v, ar, en, extra) => Object.assign({ v, ar, en }, extra || {});

  function joinList(items, lang) {
    items = items.filter(Boolean);
    if (items.length <= 1) return items.join("");
    if (lang === "ar") return items.slice(0, -1).join("، ") + " و" + items[items.length - 1];
    if (items.length === 2) return items.join(" and ");
    return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
  }

  function ageParts(dobIso, atIso) {
    if (!dobIso) return null;
    const d = new Date(String(dobIso).slice(0, 10) + "T00:00:00Z");
    const a = new Date(String(atIso || new Date().toISOString()).slice(0, 10) + "T00:00:00Z");
    let months = (a.getUTCFullYear() - d.getUTCFullYear()) * 12 + (a.getUTCMonth() - d.getUTCMonth());
    if (a.getUTCDate() < d.getUTCDate()) months--;
    if (months < 0 || isNaN(months)) return null;
    return { y: Math.floor(months / 12), m: months % 12, total: months };
  }

  function ageString(dobIso, atIso, lang, totalMonths) {
    const p = totalMonths != null ? { y: Math.floor(totalMonths / 12), m: totalMonths % 12 } : ageParts(dobIso, atIso);
    if (!p) return "";
    const { y, m } = p;
    if (lang === "ar") {
      const yW = y === 0 ? "" : y === 1 ? "سنة" : y === 2 ? "سنتان" : y <= 10 ? `${y} سنوات` : `${y} سنة`;
      const mW = m === 0 ? "" : m === 1 ? "شهر" : m === 2 ? "شهران" : m <= 10 ? `${m} أشهر` : `${m} شهراً`;
      return [yW, mW].filter(Boolean).join(" و") || "أقل من شهر";
    }
    const yW = y ? `${y} year${y === 1 ? "" : "s"}` : "", mW = m ? `${m} month${m === 1 ? "" : "s"}` : "";
    return [yW, mW].filter(Boolean).join(" and ") || "less than a month";
  }

  // Common nationalities (stored in Arabic, translated for English documents).
  const NATIONALITIES = [
    ["الإماراتية", "Emirati"], ["السعودية", "Saudi"], ["العمانية", "Omani"], ["القطرية", "Qatari"], ["البحرينية", "Bahraini"], ["الكويتية", "Kuwaiti"],
    ["اليمنية", "Yemeni"], ["الأردنية", "Jordanian"], ["السورية", "Syrian"], ["اللبنانية", "Lebanese"], ["الفلسطينية", "Palestinian"], ["العراقية", "Iraqi"],
    ["المصرية", "Egyptian"], ["السودانية", "Sudanese"], ["الليبية", "Libyan"], ["التونسية", "Tunisian"], ["الجزائرية", "Algerian"], ["المغربية", "Moroccan"],
    ["الصومالية", "Somali"], ["الموريتانية", "Mauritanian"], ["الهندية", "Indian"], ["الباكستانية", "Pakistani"], ["البنغلاديشية", "Bangladeshi"],
    ["الفلبينية", "Filipino"], ["الإيرانية", "Iranian"], ["التركية", "Turkish"], ["البريطانية", "British"], ["الأمريكية", "American"], ["الكندية", "Canadian"],
  ];
  const nationality = (ar, lang) => {
    if (!ar || lang === "ar") return ar || "";
    const n = NATIONALITIES.find((x) => x[0] === ar || x[0] === "ال" + ar || x[0].replace(/^ال/, "") === ar);
    return n ? n[1] : ar;
  };

  // Builds the substitution context for a patient.
  function personCtx(patient, lang, atIso) {
    const female = (patient && patient.gender) === "أنثى";
    const full = lang === "ar" ? (patient.full_name || "") : (patient.full_name_en || patient.full_name || "");
    const first = full.split(/\s+/)[0] || (lang === "ar" ? (female ? "الطفلة" : "الطفل") : "the child");
    const age = ageParts(patient.dob, atIso);
    const student = age && age.y >= 6;
    const C = lang === "ar" ? (student ? (female ? "الطالبة" : "الطالب") : (female ? "الطفلة" : "الطفل")) : first;
    return { female, first, full, C, age: ageString(patient.dob, atIso, lang) };
  }

  // Replace placeholders in a template string.
  function gx(str, pc) {
    if (str == null) return "";
    return String(str)
      .replace(/\{N\}/g, pc.first).replace(/\{FULL\}/g, pc.full).replace(/\{C\}/g, pc.C).replace(/\{AGE\}/g, pc.age)
      .replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, a, b) => (pc.female ? b : a))
      .replace(/\{([^{}|NCA][^{}|]*)\}/g, (_, x) => (pc.female ? x : ""));
  }

  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const lines = (s) => String(s || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const optOf = (opts, v) => (opts || []).find((o) => o.v === v);
  const lbl = (opts, v, lang, pc) => { const o = optOf(opts, v); return o ? gx(o[lang] || o.ar, pc) : ""; };
  const lblMany = (opts, arr, lang, pc) => (arr || []).map((v) => lbl(opts, v, lang, pc)).filter(Boolean);
  const isEmpty = (v) => v == null || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);
  const d10 = (s) => (s ? String(s).slice(0, 10) : "");
  const dmy = (s) => { s = d10(s); if (!s) return ""; const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };
  const cell = (s) => String(s == null ? "" : s).replace(/\|/g, "/").replace(/\r?\n/g, " ");
  const AR_ORD = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"];
  const EN_ORD = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const AR_COUNT = { 1: "جلسة واحدة", 2: "جلستين", 3: "ثلاث جلسات", 4: "أربع جلسات", 5: "خمس جلسات", 6: "ست جلسات" };
  const EN_COUNT = { 1: "one session", 2: "two sessions", 3: "three sessions", 4: "four sessions", 5: "five sessions", 6: "six sessions" };

  // Signature line used at the end of reports.
  const endOfReport = (ctx) => ctx.lang === "ar"
    ? ["", "^^ - انتهى التقرير -", "", "**اختصاصي النطق واللغة**", ctx.therapistName || ""]
    : ["", "^^ - End of Report -", "", "**Speech and Language Pathologist**", ctx.therapistName || ""];

  window.FC = { L, O, joinList, ageParts, ageString, NATIONALITIES, nationality, personCtx, gx, cap, lines, optOf, lbl, lblMany, isEmpty, d10, dmy, cell,
    AR_ORD, EN_ORD, AR_COUNT, EN_COUNT, endOfReport };
  window.Forms = window.Forms || {};
})();
