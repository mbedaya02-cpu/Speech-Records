// =====================================================================
//  Progress report ("تقرير تقييم مرحلي" — template PRO_REP),
//  discharge report and external (on-request) report.
// =====================================================================
(function () {
  const { L, O, gx, lbl, lblMany, lines, dmy, nationality, joinList, AR_ORD, EN_ORD, endOfReport } = window.FC;
  const S = (ar, en) => ({ ar, en });
  const NUMS = (arr) => arr.map((n) => O(String(n), String(n), String(n)));

  const GOAL_STATUS = [
    O("achieved", "تحقق", "Achieved"), O("progress", "تقدم ملحوظ", "Good progress"), O("partial", "تحقق جزئياً", "Partially achieved"),
    O("not", "لم يتحقق", "Not achieved"), O("stopped", "أُوقف", "Discontinued"),
  ];

  // Header table shared by progress / discharge / external
  function header(title, ctx, extra) {
    const ar = ctx.lang === "ar", pc = ctx.pc, p = ctx.patient;
    const out = ["# " + title, "::info2"];
    if (ar) out.push(`الاسم: ${pc.full}`, `الجنسية: ${nationality(p.nationality, "ar")}`, `تاريخ الميلاد: ${dmy(p.dob)}`, `العمر الزمني: ${pc.age}`);
    else out.push(`Name: ${pc.full}`, `Nationality: ${nationality(p.nationality, "en")}`, `Date of Birth: ${dmy(p.dob)}`, `Chronological Age: ${pc.age}`);
    (extra || []).forEach((x) => out.push(x));
    return out;
  }

  // --------------------------------------------------------------- progress
  const EXPECTED = [
    S("زيادة تدريجية في طول الجمل مع تحسين البنية النحوية.", "Gradual increase in sentence length with improved grammatical structure."),
    S("تحسين القدرة على الإجابة على أسئلة أكثر.", "Improved ability to answer more questions."),
    S("تحسين وضوح الكلام بشكل عام.", "Improved overall speech intelligibility."),
    S("تعميم المهارات اللغوية في البيئات المختلفة مثل المنزل والمواقف اليومية.", "Generalization of language skills across settings such as home and daily situations."),
    S("زيادة المخزون اللغوي الاستقبالي والتعبيري.", "Expanded receptive and expressive vocabulary."),
    S("تحسين مهارات التواصل الاجتماعي والمبادرة.", "Improved social communication and initiation."),
  ];
  const PROG_RECS = [
    S("الاستمرار في التدريب المنزلي باستخدام جمل بسيطة وواضحة.", "Continue home practice using simple, clear sentences."),
    S("استخدام الوسائل البصرية والأنشطة التفاعلية لدعم الفهم.", "Use visual supports and interactive activities to support understanding."),
    S("تشجيع {C} على التعبير التلقائي دون تصحيح مباشر، مع تقديم نماذج لغوية صحيحة.", "Encourage spontaneous expression without direct correction, while providing correct language models."),
    S("ممارسة تدريبات النطق اليومية لاستهداف صوت /X/.", "Daily articulation practice targeting the /X/ sound."),
    S("تعزيز استخدام اللغة بشكل وظيفي في الحياة اليومية.", "Promote functional use of language in daily life."),
    S("الاستمرار في الجلسات العلاجية بنفس الوتيرة.", "Continue therapy sessions at the same frequency."),
    S("تحديث الخطة العلاجية بأهداف جديدة.", "Update the treatment plan with new goals."),
  ];

  const progress = {
    kind: "progress",
    usesPlan: true,
    sections: [
      { id: "prev", title: L("المستوى السابق للأداء", ""), fields: [
        { id: "prev_level", type: "textarea", label: L("وصف المستوى عند بدء الخطة (يُعبّأ تلقائياً من الخطة ويمكن تعديله)", "") },
      ] },
      { id: "goals", title: L("الأهداف السابقة وحالتها", ""), fields: [{ id: "gs", type: "plangoals", statuses: GOAL_STATUS, pct: true }] },
      { id: "current", title: L("المستوى الحالي للأداء", ""), fields: [
        { id: "current_level", type: "textarea", label: L("وصف المستوى الحالي (اتركه فارغاً لتوليد ملخص تلقائي من حالة الأهداف)", "") },
        { id: "current_goals", type: "list", label: L("الأهداف الحالية تشمل (سطر لكل هدف) — اضغط على هدف من الخطة لإضافته", ""), suggestFrom: "openGoals" },
      ] },
      { id: "next", title: L("الأهداف المتوقعة للفترة القادمة", ""), fields: [
        { id: "next_days", type: "single", label: L("خلال (يوماً) القادمة", ""), options: NUMS([30, 60, 90, 180]) },
        { id: "expected", type: "list", label: L("من المتوقع تحقيق ما يلي (سطر لكل بند)", ""), suggest: EXPECTED },
      ] },
      { id: "recs", title: L("التوصيات", ""), fields: [
        { id: "recs", type: "list", label: L("التوصيات (سطر لكل توصية)", ""), suggest: PROG_RECS },
      ] },
    ],
    defaults() { return { gs: {}, next_days: "30" }; },
    generate(d, ctx) {
      const lang = ctx.lang, ar = lang === "ar", pc = ctx.pc, G = (s) => gx(s, pc);
      const out = header(ar ? "تقرير تقييم مرحلي" : "Progress Report", ctx,
        ar ? [`تاريخ بدء الخطة: ${dmy(ctx.planStart)}`, `المركز: ${ctx.centerShort}`, `رقم الملف: ${ctx.patient.file_no}`, `تاريخ التقرير: ${dmy(ctx.reportDate)}`]
           : [`Plan Start Date: ${dmy(ctx.planStart)}`, `Center: ${ctx.centerShort}`, `File No.: ${ctx.patient.file_no}`, `Report Date: ${dmy(ctx.reportDate)}`]);
      if ((d.prev_level || "").trim()) out.push("", "## " + (ar ? "المستوى السابق للأداء:" : "Previous Level of Performance:"), G(d.prev_level.trim()));

      const goals = ctx.planGoals || [];
      if (goals.length) {
        out.push("", "## " + (ar ? "الأهداف السابقة تشمل:" : "Previous Goals Included:"));
        let lastBlock = -1, n = 0;
        goals.forEach((g) => {
          if (g.block !== lastBlock) {
            lastBlock = g.block;
            const head = g.ltg || g.general;
            if (head) out.push(`**${ar ? `المرحلة ${AR_ORD[n] || n + 1}` : `Phase ${EN_ORD[n] || n + 1}`} — ${head}:**`);
            n++;
          }
          out.push(`- ${g.text}`);
        });
      }

      out.push("", "## " + (ar ? "المستوى الحالي للأداء:" : "Current Level of Performance:"));
      if ((d.current_level || "").trim()) out.push(G(d.current_level.trim()));
      else if (goals.length) {
        const st = (g) => ((d.gs || {})[g.key] || {}).s;
        const ach = goals.filter((g) => st(g) === "achieved"), prog = goals.filter((g) => ["progress", "partial"].includes(st(g))), not = goals.filter((g) => st(g) === "not");
        const ratio = (ach.length + prog.length) / goals.length;
        out.push(G(ar
          ? `{أظهر|أظهرت} {C} ${ratio >= 0.5 ? "تقدّمًا ملحوظًا في معظم الأهداف السابقة مع بقاء حاجة إلى الترسيخ والتعميم" : "تقدّمًا محدوداً في الأهداف السابقة"}، حيث تحقق ${ach.length} من أصل ${goals.length} أهداف.`
          : `{N} has shown ${ratio >= 0.5 ? "noticeable progress in most of the previous goals, with a continued need for consolidation and generalization" : "limited progress in the previous goals"}; ${ach.length} of ${goals.length} goals were achieved.`));
        const pctOf = (g) => ((d.gs || {})[g.key] || {}).pct;
        if (ach.length) { out.push(ar ? "**الأهداف المتحققة:**" : "**Achieved goals:**"); ach.forEach((g) => out.push(`- ${g.text}`)); }
        if (prog.length) { out.push(ar ? "**أهداف قيد التحقق:**" : "**Goals in progress:**"); prog.forEach((g) => out.push(`- ${g.text}${pctOf(g) ? (ar ? ` (نسبة الإنجاز ${pctOf(g)}%)` : ` (${pctOf(g)}% achieved)`) : ""}`)); }
        if (not.length) { out.push(ar ? "**أهداف لم تتحقق بعد:**" : "**Goals not yet achieved:**"); not.forEach((g) => out.push(`- ${g.text}`)); }
      }
      const cur = lines(d.current_goals).map(G);
      if (cur.length) { out.push("", "## " + (ar ? "الأهداف الحالية تشمل:" : "Current Goals Include:")); cur.forEach((t) => out.push(`- ${t}`)); }
      const exp = lines(d.expected).map(G);
      if (exp.length) {
        out.push("", "## " + (ar ? "الأهداف المتوقعة للفترة القادمة:" : "Expected Goals for the Next Period:"));
        out.push(ar ? `خلال (${d.next_days || 30}) يوماً القادمة، من المتوقع تحقيق ما يلي:` : `Within the next (${d.next_days || 30}) days, the following are expected:`);
        exp.forEach((t) => out.push(`- ${t}`));
      }
      const recs = lines(d.recs).map(G);
      if (recs.length) { out.push("", "## " + (ar ? "التوصيات:" : "Recommendations:")); recs.forEach((t) => out.push(`- ${t}`)); }
      out.push("", ar ? "^^ -- نهاية التقرير --" : "^^ -- End of Report --", "", `**${ar ? "اختصاصي النطق واللغة" : "Speech and Language Pathologist"}:** ${ctx.therapistName || ""}`);
      return out.join("\n");
    },
  };

  // --------------------------------------------------------------- discharge
  const REASONS = [
    O("goals", "تحقيق أهداف الخطة العلاجية", "the treatment goals were achieved"),
    O("age", "وصول المهارات لمستوى مناسب للعمر", "skills reached an age-appropriate level"),
    O("plateau", "ثبات المستوى دون تقدم إضافي رغم العلاج", "progress plateaued despite therapy"),
    O("family", "بناءً على طلب الأسرة", "the family requested discharge"),
    O("relocation", "الانتقال إلى مكان آخر", "the family relocated"),
    O("attendance", "عدم الالتزام بالحضور", "attendance was irregular"),
    O("transfer", "التحويل إلى جهة أخرى", "the case was transferred to another provider"),
    O("insurance", "انتهاء التغطية التأمينية", "insurance coverage ended"),
  ];
  const DC_STATUS = [
    O("wnl", "مهارات ضمن الحدود الطبيعية للعمر", "skills within normal limits for age"),
    O("improved", "تحسن ملحوظ مع بقاء صعوبات بسيطة", "significant improvement with mild residual difficulties"),
    O("partial", "تحسن جزئي", "partial improvement"),
    O("no_change", "لا تغيير ملحوظ", "no significant change"),
  ];
  const DC_RECS = [
    S("الاستمرار في تطبيق الاستراتيجيات المنزلية لتعميم المهارات المكتسبة.", "Continue home strategies to generalize acquired skills."),
    S("متابعة ومراقبة الأداء بعد 3–6 أشهر.", "Monitor performance with a follow-up in 3–6 months."),
    S("التنسيق مع المدرسة لدعم استخدام المهارات في البيئة الصفية.", "Coordinate with the school to support use of skills in the classroom."),
    S("العودة للعلاج عند ظهور صعوبات جديدة.", "Return to therapy if new concerns arise."),
  ];
  const discharge = {
    kind: "discharge",
    usesPlan: true,
    sections: [
      { id: "info", title: L("معلومات العلاج", ""), fields: [
        { id: "total", type: "number", label: L("إجمالي الجلسات المقدمة", "") },
        { id: "reason", type: "multi", label: L("سبب الخروج", ""), options: REASONS },
        { id: "status", type: "single", label: L("الحالة عند الخروج", ""), options: DC_STATUS },
      ] },
      { id: "goals", title: L("حالة أهداف الخطة عند الخروج", ""), fields: [{ id: "gs", type: "plangoals", statuses: GOAL_STATUS }] },
      { id: "summary", title: L("ملخص ونصائح", ""), fields: [
        { id: "summary", type: "textarea", label: L("ملخص الحالة عند الخروج", "") },
        { id: "recs", type: "list", label: L("التوصيات (سطر لكل توصية)", ""), suggest: DC_RECS },
      ] },
    ],
    defaults() { return { gs: {}, reason: [], status: "" }; },
    generate(d, ctx) {
      const lang = ctx.lang, ar = lang === "ar", pc = ctx.pc, G = (s) => gx(s, pc);
      const out = header(ar ? "تقرير الخروج" : "Discharge Report", ctx,
        ar ? [`تاريخ بدء العلاج: ${dmy(ctx.patient.start_date || ctx.planStart)}`, `المركز: ${ctx.centerShort}`, `رقم الملف: ${ctx.patient.file_no}`, `تاريخ الخروج: ${dmy(ctx.reportDate)}`]
           : [`Therapy Start Date: ${dmy(ctx.patient.start_date || ctx.planStart)}`, `Center: ${ctx.centerShort}`, `File No.: ${ctx.patient.file_no}`, `Discharge Date: ${dmy(ctx.reportDate)}`]);
      const r = lblMany(REASONS, d.reason, lang, pc);
      out.push("", "## " + (ar ? "سبب الخروج:" : "Reason for Discharge:"));
      out.push(G(ar ? `تم إنهاء خدمات علاج النطق واللغة {للطفل|للطفلة} {N}${d.total ? ` بعد تلقي ${d.total} جلسة` : ""}${r.length ? ` بسبب ${joinList(r, "ar")}` : ""}.`
        : `Speech and language therapy services for {N} are being discontinued${d.total ? ` after ${d.total} sessions` : ""}${r.length ? ` because ${joinList(r, "en")}` : ""}.`));
      const goals = ctx.planGoals || [];
      if (goals.length) {
        out.push("", "## " + (ar ? "الأهداف التي تم العمل عليها:" : "Goals Addressed:"));
        out.push(ar ? "| الهدف | الحالة عند الخروج |" : "| Goal | Status at discharge |");
        goals.forEach((g) => out.push(`| ${g.text.replace(/\|/g, "/")} | ${lbl(GOAL_STATUS, ((d.gs || {})[g.key] || {}).s, lang, pc)} |`));
      }
      const st = lbl(DC_STATUS, d.status, lang, pc);
      if (st || (d.summary || "").trim()) {
        out.push("", "## " + (ar ? "الحالة عند الخروج:" : "Status at Discharge:"));
        if (st) out.push(ar ? `الحالة عند الخروج: ${st}.` : `Status at discharge: ${st}.`);
        if ((d.summary || "").trim()) out.push(G(d.summary.trim()));
      }
      const recs = lines(d.recs).map(G);
      if (recs.length) { out.push("", "## " + (ar ? "التوصيات:" : "Recommendations:")); recs.forEach((t, i) => out.push(`${i + 1}. ${t}`)); }
      out.push(...endOfReport(ctx));
      return out.join("\n");
    },
  };

  // --------------------------------------------------------------- external
  const RECIPIENT = [
    O("whom", "إلى من يهمه الأمر", "To Whom It May Concern"), O("school", "المدرسة", "The School"), O("insurance", "شركة التأمين", "The Insurance Company"),
    O("physician", "الطبيب المعالج", "The Treating Physician"), O("parents", "ولي الأمر", "The Parent/Guardian"),
  ];
  const PURPOSE = [
    O("enrolled", "إثبات تلقي العلاج في المركز", "confirm that the patient is receiving therapy at our center"),
    O("diagnosis", "توضيح التشخيص الحالي", "clarify the current diagnosis"),
    O("progress", "تقديم تحديث حول التقدم", "provide a progress update"),
    O("necessity", "تبرير الحاجة الطبية لاستمرار العلاج", "justify the medical necessity of continued therapy"),
    O("accommodation", "طلب تسهيلات ودعم مدرسي", "request school accommodations and support"),
  ];
  const INCLUDE = [
    O("dx", "التشخيص من الخطة الحالية", "diagnosis"), O("service", "عدد الجلسات ومدة الخطة", "service details"), O("goals", "الأهداف الحالية", "current goals"),
  ];
  const external = {
    kind: "external",
    usesPlan: true,
    sections: [
      { id: "main", title: L("محتوى التقرير", ""), fields: [
        { id: "recipient", type: "single", label: L("الجهة المرسل إليها", ""), options: RECIPIENT },
        { id: "recipient_name", type: "text", label: L("اسم الجهة بالتحديد (اختياري)", "") },
        { id: "purpose", type: "multi", label: L("الغرض", ""), options: PURPOSE },
        { id: "include", type: "multi", label: L("المحتوى المضمّن من الخطة", ""), options: INCLUDE },
        { id: "body", type: "textarea", label: L("نص إضافي", "") },
      ] },
    ],
    defaults() { return { recipient: "whom", purpose: ["enrolled"], include: ["dx", "service"] }; },
    generate(d, ctx) {
      const lang = ctx.lang, ar = lang === "ar", pc = ctx.pc, G = (s) => gx(s, pc);
      const out = header(ar ? "تقرير نطق ولغة" : "Speech and Language Report", ctx,
        ar ? [`رقم الملف: ${ctx.patient.file_no}`, `تاريخ التقرير: ${dmy(ctx.reportDate)}`, `المركز: ${ctx.centerShort}`]
           : [`File No.: ${ctx.patient.file_no}`, `Report Date: ${dmy(ctx.reportDate)}`, `Center: ${ctx.centerShort}`]);
      const to = d.recipient_name || lbl(RECIPIENT, d.recipient, lang, pc);
      out.push("");
      if (to) out.push(`**${d.recipient === "whom" && !d.recipient_name ? to + (ar ? "،" : ",") : (ar ? "إلى: " : "To: ") + to}**`);
      const since = ctx.patient.start_date ? (ar ? ` منذ ${dmy(ctx.patient.start_date)}` : ` since ${dmy(ctx.patient.start_date)}`) : "";
      out.push(G(ar ? `نفيدكم بأن {FULL} (رقم الملف ${ctx.patient.file_no}) {يتلقى|تتلقى} خدمات علاج النطق واللغة في ${ctx.centerFull}${since}.`
        : `This is to confirm that {FULL} (file no. ${ctx.patient.file_no}) is receiving speech and language therapy services at ${ctx.centerFull}${since}.`));
      const purp = lblMany(PURPOSE, (d.purpose || []).filter((v) => v !== "enrolled"), lang, pc);
      if (purp.length) out.push(ar ? `يهدف هذا التقرير إلى ${joinList(purp, "ar")}.` : `The purpose of this report is to ${joinList(purp, "en")}.`);
      const pd = ctx.planData || {};
      const inc = d.include || [];
      if (inc.includes("dx") && pd.speech_dx) out.push("", "## " + (ar ? "التشخيص:" : "Diagnosis:"), pd.speech_dx);
      if (inc.includes("service") && ctx.planStart) {
        out.push("", "## " + (ar ? "الخدمة الحالية:" : "Current Services:"));
        out.push(ar ? `${pd.frequency ? `${window.FC.AR_COUNT[pd.frequency] || pd.frequency + " جلسات"} أسبوعياً` : "جلسات علاج نطق ولغة"}${pd.duration ? `، مدة الجلسة ${pd.duration} دقيقة` : ""}، ضمن خطة فردية من ${dmy(ctx.planStart)} إلى ${dmy(ctx.planEnd)}.`
          : `${pd.frequency ? `${pd.frequency} session(s) per week` : "Speech and language therapy sessions"}${pd.duration ? `, ${pd.duration} minutes each` : ""}, under an individualized plan from ${dmy(ctx.planStart)} to ${dmy(ctx.planEnd)}.`);
      }
      if (inc.includes("goals") && (ctx.planGoals || []).length) { out.push("", "## " + (ar ? "الأهداف الحالية:" : "Current Goals:")); ctx.planGoals.forEach((g, i) => out.push(`${i + 1}. ${g.text}`)); }
      if ((d.body || "").trim()) out.push("", G(d.body.trim()));
      out.push("", ar ? "أُعطي هذا التقرير بناءً على طلب ولي الأمر دون أدنى مسؤولية على المركز تجاه الغير." : "This report was issued at the family's request.");
      out.push(...endOfReport(ctx));
      return out.join("\n");
    },
  };

  window.Forms.progress = progress;
  window.Forms.discharge = discharge;
  window.Forms.external = external;
  window.Forms.GOAL_STATUS = GOAL_STATUS;
})();
