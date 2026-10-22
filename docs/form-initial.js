// =====================================================================
//  "تقرير التقييم الأولي" (short initial assessment) — template ST_IA
// =====================================================================
(function () {
  const { L, O, gx, lines, dmy } = window.FC;

  const S = (ar, en) => ({ ar, en });
  const SUG = {
    general: [
      S("بعد إجراء مختلف أنواع التقييمات وتحليل البيانات التي تم جمعها، لوحظ أن {N} {لديه|لديها} اضطرابات من ناحية اللغة التعبيرية.", "After conducting the assessments and analyzing the data collected, {N} was observed to have difficulties in expressive language."),
      S("لوحظ أن {N} {لديه|لديها} تأخر في اللغة الاستقبالية والتعبيرية مقارنة بعمره الزمني.", "{N} shows a delay in receptive and expressive language compared to {his|her} chronological age."),
      S("لوحظ وجود صعوبات في وضوح الكلام تؤثر على فهم الآخرين {له|لها}.", "Speech intelligibility difficulties were observed that affect others' understanding of {him|her}."),
      S("{أبدى|أبدت} {N} تعاوناً جيداً خلال جلسة التقييم.", "{N} was cooperative during the assessment session."),
    ],
    expressive: [
      S("{يستطيع|تستطيع} إنتاج جمل لكن بأخطاء لغوية ملحوظة.", "able to produce sentences but with noticeable language errors."),
      S("ضعف في استخدام الضمائر.", "weak use of pronouns."),
      S("استخدام غير دقيق للقواعد النحوية.", "inaccurate use of grammar."),
      S("{يعتمد|تعتمد} على الكلمات المفردة في التعبير.", "relies on single words to express {himself|herself}."),
      S("{يتواصل|تتواصل} بالإيماءات والأصوات دون كلام وظيفي.", "communicates with gestures and vocalizations without functional speech."),
      S("مخزون المفردات التعبيرية محدود مقارنة بالعمر.", "limited expressive vocabulary for age."),
    ],
    receptive: [
      S("{يستطيع|تستطيع} اتباع الأوامر البسيطة المكوّنة من خطوة واحدة.", "able to follow simple one-step directions."),
      S("{يواجه|تواجه} صعوبة في اتباع الأوامر المركبة.", "has difficulty following complex directions."),
      S("{يواجه|تواجه} صعوبة في فهم الأسئلة (ماذا، أين، مَن).", "has difficulty understanding WH questions (what, where, who)."),
      S("{يتعرف|تتعرف} على العناصر المألوفة عند تسميتها.", "identifies familiar items when named."),
    ],
    articulation: [
      S("وجود عمليات إبدال وتشويه لبعض أصوات الكلام تؤثر على وضوح الكلام.", "substitution and distortion of some speech sounds affecting intelligibility."),
      S("نطق الأصوات مناسب للعمر.", "speech sound production is age-appropriate."),
    ],
    strengths: [
      S("{يستطيع|تستطيع} إنتاج جمل.", "able to produce sentences."),
      S("{يستفيد|تستفيد} من النمذجة والمساعدة اللفظية.", "benefits from modeling and verbal prompting."),
      S("{يستجيب|تستجيب} للتعزيز المادي والمعنوي.", "responds to tangible and social reinforcement."),
      S("{متعاون|متعاونة} {ولديه|ولديها} دافعية للتعلم.", "cooperative and motivated to learn."),
      S("فهم جيد للأوامر البسيطة.", "good understanding of simple directions."),
    ],
    difficulties: [
      S("أخطاء لغوية ملحوظة في الجمل.", "noticeable language errors in sentences."),
      S("ضعف في استخدام الضمائر.", "weak use of pronouns."),
      S("استخدام غير دقيق للقواعد النحوية.", "inaccurate use of grammar."),
      S("صعوبة في الإجابة على الأسئلة.", "difficulty answering questions."),
      S("ضعف في وضوح الكلام.", "reduced speech intelligibility."),
      S("محدودية المبادرة بالتواصل.", "limited initiation of communication."),
    ],
    needs: [
      S("تحسين اللغة التعبيرية لدى {C} بما يتناسب مع {عمره|عمرها}.", "Improve the child's expressive language to an age-appropriate level."),
      S("تحسين اللغة الاستقبالية لدى {C}.", "Improve the child's receptive language."),
      S("تحسين وضوح الكلام ونطق الأصوات.", "Improve speech intelligibility and sound production."),
      S("تحسين مهارات التواصل الاجتماعي.", "Improve social communication skills."),
      S("تحسين مهارات ما قبل اللغة (الانتباه المشترك، التقليد، تبادل الأدوار).", "Improve prelinguistic skills (joint attention, imitation, turn-taking)."),
      S("تحسين الطلاقة الكلامية.", "Improve speech fluency."),
      S("تحسين مهارات المضغ والبلع.", "Improve chewing and swallowing skills."),
    ],
  };
  const OK2 = [O("ok", "سليم", "Normal"), O("bad", "غير سليم", "Atypical")];
  const ORG = [O("tongue", "اللسان", "Tongue"), O("palate", "الحنك", "Palate"), O("jaw", "الفك", "Jaw"), O("lips", "الشفتان", "Lips")];

  const form = {
    kind: "initial",
    sections: [
      { id: "main", title: L("نتائج التقييم الأولي", "Initial assessment findings"), fields: [
        { id: "general", type: "textarea", label: L("الملاحظة العامة", ""), suggest: SUG.general },
        { id: "expressive", type: "textarea", label: L("اللغة التعبيرية", ""), suggest: SUG.expressive },
        { id: "receptive", type: "textarea", label: L("اللغة الاستقبالية (اختياري)", ""), suggest: SUG.receptive },
        { id: "articulation", type: "textarea", label: L("النطق (اختياري)", ""), suggest: SUG.articulation },
        { id: "organs", type: "matrix", label: L("أعضاء النطق والمهارات الحركية الفموية", ""), rows: ORG, groups: [{ key: "s", options: OK2 }], note: true },
        { id: "voice", type: "single", label: L("الصوت", ""), options: [O("ok", "طبيعي", "Normal"), O("bad", "يوجد اضطراب (اكتب الملاحظة)", "Atypical")] },
        { id: "voice_note", type: "text", label: L("ملاحظة الصوت", ""), show: (d) => d.voice === "bad" },
        { id: "feeding", type: "single", label: L("البلع والتغذية", ""), options: [O("ok", "لا توجد مشاكل", "No problems"), O("bad", "توجد صعوبات (اكتب الملاحظة)", "Difficulties")] },
        { id: "feeding_note", type: "text", label: L("ملاحظة البلع", ""), show: (d) => d.feeding === "bad" },
      ] },
      { id: "sw", title: L("نقاط القوة والصعوبات", "Strengths and difficulties"), fields: [
        { id: "strengths", type: "list", label: L("نقاط القوة (سطر لكل نقطة)", ""), suggest: SUG.strengths },
        { id: "difficulties", type: "list", label: L("الصعوبات الملاحظة (سطر لكل نقطة)", ""), suggest: SUG.difficulties },
        { id: "needs", type: "list", label: L("يحتاج إلى تحسين المهارات التالية (سطر لكل مهارة)", ""), suggest: SUG.needs },
      ] },
      { id: "team", title: L("المشاركون في إعداد التقرير", "Report contributors"), fields: [
        { id: "ot_name", type: "text", label: L("أخصائي العلاج الوظيفي (اختياري)", "") },
        { id: "sped_name", type: "text", label: L("معلم التربية الخاصة (اختياري)", "") },
      ] },
    ],

    defaults() {
      return { organs: { tongue: { s: "ok" }, palate: { s: "ok" }, jaw: { s: "ok" } }, voice: "ok", feeding: "ok" };
    },

    generate(d, ctx) {
      const lang = ctx.lang, ar = lang === "ar", pc = ctx.pc, G = (s) => gx(s, pc);
      const out = ["# " + (ar ? "تقرير التقييم الأولي" : "Initial Assessment Report"), "::info4"];
      const team = [ctx.therapistName, d.ot_name, d.sped_name].filter(Boolean).join(ar ? "، " : ", ");
      if (ar) out.push(`الاسم: ${pc.full}`, `تاريخ إعداد التقرير: ${dmy(ctx.reportDate)}`, `تاريخ الميلاد: ${dmy(ctx.patient.dob)}`, `المركز: ${ctx.centerShort}`, `العمر الزمني: ${pc.age}`, `المشاركون في اعداد التقرير: ${team}`);
      else out.push(`Name: ${pc.full}`, `Report date: ${dmy(ctx.reportDate)}`, `Date of birth: ${dmy(ctx.patient.dob)}`, `Center: ${ctx.centerShort}`, `Chronological age: ${pc.age}`, `Prepared by: ${team}`);
      out.push("");
      out.push(G(ar ? "تم إجراء التقييم الأولي {للطفل|للطفلة} {FULL}، حيث تم تحليل بيانات التقييم وتبين النتائج التالية:" : "An initial assessment was conducted for {FULL}; the assessment data were analyzed and the results are as follows:"));
      const item = (k, v) => { const t = G(String(v || "").replace(/\n+/g, " ").trim()); if (t) out.push(`- **${k}:** ${t}`); };
      item(ar ? "الملاحظة العامة" : "General observation", d.general);
      item(ar ? "اللغة الاستقبالية" : "Receptive language", d.receptive);
      item(ar ? "اللغة التعبيرية" : "Expressive language", d.expressive);
      item(ar ? "النطق" : "Articulation", d.articulation);
      const org = ORG.filter((o) => (d.organs || {})[o.v] && (d.organs || {})[o.v].s).map((o) => {
        const r = d.organs[o.v];
        return `${o[lang]}: ${r.s === "ok" ? (ar ? "سليم" : "normal") : (r.note || (ar ? "غير سليم" : "atypical"))}`;
      });
      if (org.length) item(ar ? "أعضاء النطق والمهارات الحركية الفموية" : "Speech organs and oral-motor skills", org.join(" / "));
      item(ar ? "الصوت" : "Voice", d.voice === "bad" ? d.voice_note || (ar ? "يوجد اضطراب في الصوت." : "Voice difficulties noted.")
        : (ar ? "لا يوجد أي تاريخ مرضي على اضطرابات الصوت، كما أن {صوته|صوتها} لا يتضمن علواً في الصوت أو جودة ونبرة صوت غير طبيعية ناتجة من الحنجرة تُؤثر على إنتاج الكلام."
              : "No history of voice disorders; {his|her} voice shows no abnormal loudness, quality, or pitch affecting speech production."));
      item(ar ? "البلع والتغذية" : "Swallowing and feeding", d.feeding === "bad" ? d.feeding_note || (ar ? "توجد صعوبات في البلع والتغذية." : "Swallowing/feeding difficulties noted.")
        : (ar ? "لا يوجد لدى {N} مشاكل بلع." : "{N} has no swallowing problems."));
      const s = lines(d.strengths).map(G), w = lines(d.difficulties).map(G);
      if (s.length) item(ar ? "نقاط القوة" : "Strengths", s.join(" "));
      if (w.length) item(ar ? "الصعوبات الملاحظة" : "Observed difficulties", w.join(" "));
      const needs = lines(d.needs).map(G);
      if (needs.length) {
        out.push("", G(ar ? "**تبين أن {الطفل|الطفلة} {يحتاج|تحتاج} إلى تحسين المهارات التالية:**" : "**The child needs to improve the following skills:**"));
        needs.forEach((t) => out.push(`- ${t}`));
      }
      out.push("", ar ? "**إعــــداد:**" : "**Prepared by:**");
      out.push(ar ? "| التخصص | الاسم | التوقيع |" : "| Specialty | Name | Signature |");
      out.push(ar ? `| أخصائي العلاج الوظيفي | ${d.ot_name || ""} |  |` : `| Occupational Therapist | ${d.ot_name || ""} |  |`);
      out.push(ar ? `| أخصائي النطق واللغة | ${ctx.therapistName || ""} |  |` : `| Speech and Language Pathologist | ${ctx.therapistName || ""} |  |`);
      out.push(ar ? `| معلم التربية الخاصة | ${d.sped_name || ""} |  |` : `| Special Education Teacher | ${d.sped_name || ""} |  |`);
      return out.join("\n");
    },
  };
  window.Forms.initial = form;
})();
