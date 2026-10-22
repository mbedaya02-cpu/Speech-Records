// =====================================================================
//  "الخطة التربوية الفردية للنطق واللغة" — template ST_TP
// =====================================================================
(function () {
  const { L, O, gx, lbl, lblMany, lines, dmy, cell, nationality, AR_ORD } = window.FC;
  const S = (ar, en) => ({ ar, en });

  const TOOLS = [
    O("observation", "الملاحظة السريرية المباشرة", "Direct clinical observation"),
    O("interview", "المقابلة مع الأسرة", "Family interview"),
    O("sample", "تحليل عينة تواصل", "Communication sample analysis"),
    O("routine", "مراجعة الأداء ضمن الروتين اليومي", "Review of performance within daily routines"),
    O("case_history", "استمارة تاريخ الحالة", "Case history form"),
    O("oral_exam", "الفحص التركيبي والوظيفي لأعضاء النطق", "Structural and functional speech mechanism exam"),
    O("lang_test", "اختبار التطور اللغوي (غير مقنن)", "Language development test (non-standardized)"),
    O("artic_test", "اختبار نطق الأصوات اللغوية", "Speech sound articulation test"),
  ];
  const OK2 = [O("ok", "سليم", "Normal"), O("bad", "غير سليم", "Atypical")];
  const ORG = [O("lips", "الشفتان", "Lips"), O("tongue", "اللسان", "Tongue"), O("palate", "الحنك", "Palate"), O("jaw", "الفك", "Jaw"), O("coord", "التناسق الحركي الفموي", "Oral-motor coordination")];
  const NONE_OR = [O("none", "لا يوجد", "None"), O("present", "يوجد (اكتب الوصف)", "Present")];

  const DX = [
    S("اضطراب لغوي", "Language disorder"), S("تأخر لغوي", "Language delay"), S("تأخر لغوي استقبالي وتعبيري", "Receptive and expressive language delay"),
    S("تأخر لغة تعبيرية", "Expressive language delay"), S("اضطراب نطق", "Articulation disorder"), S("اضطراب فونولوجي", "Phonological disorder"),
    S("تأتأة", "Stuttering"), S("أبراكسيا الكلام", "Apraxia of speech"), S("صعوبات تواصل مرتبطة بطيف التوحد", "Communication difficulties associated with ASD"),
    S("صعوبات بلع وتغذية", "Feeding and swallowing difficulties"),
  ];

  const RESULTS_SUG = {
    receptive: [
      S("{يستطيع|تستطيع} اتباع الأوامر المكونة من خطوتين فقط.", "able to follow two-step directions only."),
      S("{يحتاج|تحتاج} إلى العمل على التمييز بين المذكر والمؤنث.", "needs to work on distinguishing masculine and feminine forms."),
      S("{لديه|لديها} صعوبة في الإجابة على الأسئلة {ويحتاج|وتحتاج} إلى تدريب على التمييز بين أسئلة WH دون تكرار السؤال.", "has difficulty answering questions and needs training to distinguish WH questions without repeating them."),
      S("{يتعرف|تتعرف} على العناصر المألوفة عند تسميتها.", "identifies familiar items when named."),
    ],
    expressive: [
      S("{يحتاج|تحتاج} إلى تحسين استخدام أدوات الربط داخل الجمل بشكل صحيح.", "needs to improve the correct use of conjunctions within sentences."),
      S("العمل على تطوير مهارة الطلب والتعبير عن {احتياجاته|احتياجاتها}.", "needs to develop requesting and expressing {his|her} needs."),
      S("{يعتمد|تعتمد} على الكلمات المفردة.", "relies on single words."),
      S("{يستخدم|تستخدم} جملاً من كلمتين.", "uses two-word phrases."),
    ],
    imitation: [
      S("{يقلد|تقلد} الأصوات والمقاطع البسيطة.", "imitates simple sounds and syllables."),
      S("لا {يقلد|تقلد} الأصوات بعد.", "does not yet imitate sounds."),
    ],
    articulation: [
      S("أظهرت الملاحظة والتقييم السريري وجود اضطراب في النطق يتمثل في وجود عمليات إبدال وتشويه لبعض أصوات الكلام، مما يؤثر بدرجات متفاوتة في دقة إنتاج الأصوات ووضوح الكلام. {ويحتاج|وتحتاج} {C} إلى تدريب نطقي منظم يستهدف الأصوات المتأثرة، بدءاً من مستوى الصوت المفرد والمقطع، ثم الكلمة، فالعبارة والجملة، مع العمل على تعميم الإنتاج الصحيح.",
        "Observation and clinical assessment showed an articulation disorder characterized by substitutions and distortions of some speech sounds, affecting accuracy and intelligibility to varying degrees. The child needs structured articulation training targeting the affected sounds, from isolated sounds and syllables to words, phrases, and sentences, with generalization of correct production."),
      S("نطق الأصوات مناسب للعمر.", "speech sound production is age-appropriate."),
    ],
    strengths: [
      S("{يستطيع|تستطيع} اتباع الأوامر المكونة من خطوتين.", "Able to follow two-step directions."),
      S("{يستفيد|تستفيد} من النمذجة والمساعدة اللفظية أثناء أداء المهام اللغوية.", "Benefits from modeling and verbal prompting during language tasks."),
      S("{يستطيع|تستطيع} استخدام التواصل اللفظي في المواقف الوظيفية عند توفير الدعم المناسب.", "Able to use verbal communication in functional situations with appropriate support."),
      S("{يستجيب|تستجيب} للتعزيز المادي والمعنوي، مما يمكن توظيفه لزيادة الدافعية والمشاركة في تحقيق الأهداف.", "Responds to tangible and social reinforcement, which can be used to increase motivation and participation."),
    ],
    weaknesses: [
      S("صعوبة في الإجابة على الأسئلة.", "Difficulty answering questions."),
      S("{يحتاج|تحتاج} إلى العمل على التمييز بين المذكر والمؤنث.", "Needs to work on distinguishing masculine and feminine forms."),
      S("{يحتاج|تحتاج} إلى تدريب على التمييز بين أسئلة WH دون تكرار السؤال.", "Needs training to distinguish WH questions without repeating them."),
      S("{يحتاج|تحتاج} إلى تحسين استخدام أدوات الربط داخل الجمل.", "Needs to improve the use of conjunctions within sentences."),
      S("{يحتاج|تحتاج} إلى تطوير مهارة الطلب والتعبير عن {احتياجاته|احتياجاتها}.", "Needs to develop requesting and expressing {his|her} needs."),
    ],
  };

  const JUSTIFY_DEFAULT = [
    S("أظهرت نتائج التقييم السريري وجود احتياجات واضحة في مجالات اللغة الاستقبالية والتعبيرية.", "Clinical assessment results showed clear needs in receptive and expressive language."),
    S("تؤثر هذه الصعوبات في قدرة {C} على التواصل الوظيفي والمشاركة بصورة أكثر استقلالية في المواقف اليومية والتعليمية والاجتماعية.", "These difficulties affect the child's functional communication and independent participation in daily, educational, and social situations."),
    S("{يستفيد|تستفيد} {C} من التدخل المنظم القائم على التدرج في مستوى الصعوبة، والنمذجة، والتكرار، والمساعدات اللفظية والجسدية، واستخدام الوسائل البصرية والأنشطة الوظيفية.", "The child benefits from structured intervention with graded difficulty, modeling, repetition, verbal and physical prompts, visual supports, and functional activities."),
    S("تهدف الخطة إلى رفع مستوى الاستقلالية التواصلية {للطالب|للطالبة} وتحسين {قدرته|قدرتها} على فهم اللغة واستخدامها بصورة وظيفية في المواقف اليومية.", "The plan aims to increase communicative independence and improve functional understanding and use of language in daily situations."),
    S("سيتم قياس التقدم بصورة كمية من خلال نسب الاستجابة الصحيحة وعدد المحاولات الناجحة، مع تعديل مستوى الدعم وفقاً لأداء {C} ونتائج المتابعة الدورية.", "Progress will be measured quantitatively through correct-response rates and successful trials, adjusting support according to performance and periodic follow-up."),
  ];

  // ---------- goals ----------
  const DOMAINS = [
    O("prelinguistic", "تطوير مهارات ما قبل اللغة", "Develop prelinguistic skills"),
    O("receptive", "تطوير مهارات اللغة الاستقبالية", "Develop receptive language skills"),
    O("expressive", "تطوير مهارات اللغة التعبيرية", "Develop expressive language skills"),
    O("articulation", "تحسين النطق ووضوح الكلام", "Improve articulation and speech intelligibility"),
    O("pragmatics", "تطوير مهارات التواصل الاجتماعي", "Develop social communication skills"),
    O("fluency", "تحسين الطلاقة الكلامية", "Improve speech fluency"),
    O("voice", "تحسين الصوت", "Improve voice"),
    O("oral_motor", "تحسين المهارات الفموية الحركية", "Improve oral-motor skills"),
    O("feeding", "تحسين مهارات الأكل والبلع", "Improve feeding and swallowing skills"),
    O("aac", "تطوير التواصل البديل والمعزز", "Develop augmentative and alternative communication"),
  ];
  // Long-term goal skills per domain -> "تحسين مهارة {skill} ليصل {C} إلى مستوى الكفاية المطلوبة"
  const LTG_SKILLS = {
    prelinguistic: [S("الانتباه المشترك", "joint attention"), S("التقليد الحركي والصوتي", "motor and vocal imitation"), S("تبادل الأدوار", "turn-taking"), S("الاستجابة للاسم", "responding to name")],
    receptive: [S("الاستجابة للأوامر", "following directions"), S("الإجابة على الأسئلة البسيطة", "answering simple questions"), S("فهم المفاهيم اللغوية الأساسية", "understanding basic language concepts"), S("التعرف على المفردات", "vocabulary identification")],
    expressive: [S("الطلب", "requesting"), S("تسمية العناصر", "naming items"), S("استخدام الجمل", "sentence use"), S("الوصف والسرد", "description and narration"), S("استخدام الضمائر والقواعد", "pronoun and grammar use")],
    articulation: [S("إنتاج الأصوات المتأثرة", "producing the affected sounds"), S("وضوح الكلام", "speech intelligibility")],
    pragmatics: [S("المبادرة بالتواصل", "initiating communication"), S("المحادثة", "conversation"), S("استخدام التحية والآداب الاجتماعية", "greetings and social conventions")],
    fluency: [S("الكلام بطلاقة", "fluent speech"), S("استخدام تقنيات الطلاقة", "using fluency techniques")],
    voice: [S("استخدام الصوت بشكل صحي", "healthy voice use")],
    oral_motor: [S("التحكم بحركات الشفاه واللسان والفك", "lip, tongue, and jaw control")],
    feeding: [S("المضغ", "chewing"), S("تقبّل قوامات جديدة", "accepting new textures"), S("الشرب من الكوب", "cup drinking")],
    aac: [S("استخدام وسيلة التواصل البديل", "using the AAC system")],
  };
  const CRIT_AR = "بعدد 4 مرات صحيحة من أصل 5 محاولات", CRIT_EN = "in 4 out of 5 trials";
  // Short-term goal bank (X = number / sound to fill in)
  const STG_BANK = {
    prelinguistic: [
      S(`أن {يحافظ|تحافظ} {C} على الانتباه المشترك مع الأخصائي لمدة 3 دقائق أثناء النشاط ${CRIT_AR}`, `{N} will maintain joint attention with the therapist for 3 minutes during an activity ${CRIT_EN}`),
      S(`أن {يستجيب|تستجيب} {C} {لاسمه|لاسمها} باستجابة صوتية عند ندائه ${CRIT_AR}`, `{N} will respond vocally when called by name ${CRIT_EN}`),
      S(`أن {يقلد|تقلد} {C} حركات كبرى ودقيقة بعد عرضها مباشرة ${CRIT_AR}`, `{N} will imitate gross and fine motor actions immediately after a model ${CRIT_EN}`),
      S(`أن {يقلد|تقلد} {C} الأصوات والمقاطع البسيطة ${CRIT_AR}`, `{N} will imitate simple sounds and syllables ${CRIT_EN}`),
      S(`أن {يتبادل|تتبادل} {C} الأدوار ضمن نشاط لعب تفاعلي لـ 3 أدوار متتالية ${CRIT_AR}`, `{N} will take turns in an interactive play activity for 3 consecutive turns ${CRIT_EN}`),
    ],
    receptive: [
      S(`أن {يستجيب|تستجيب} {C} لأمر من خطوة واحدة بشكل صحيح عند طلب ذلك {منه|منها} ${CRIT_AR}`, `{N} will follow a one-step direction correctly when asked ${CRIT_EN}`),
      S(`أن {يستجيب|تستجيب} {C} لأمر من خطوتين متتاليتين بشكل صحيح عند طلب ذلك {منه|منها} ${CRIT_AR}`, `{N} will follow two-step directions correctly when asked ${CRIT_EN}`),
      S(`أن {يستجيب|تستجيب} {C} لأمر من 3 خطوات متتاليات بشكل صحيح عند طلب ذلك {منه|منها} ${CRIT_AR}`, `{N} will follow three-step directions correctly when asked ${CRIT_EN}`),
      S(`أن {يشير|تشير} {C} إلى X عناصر مألوفة عند تسميتها ${CRIT_AR}`, `{N} will point to X familiar items when named ${CRIT_EN}`),
      S(`أن {يجيب|تجيب} {C} على سؤال (وين؟) عند {سؤاله|سؤالها} بشكل صحيح ${CRIT_AR}`, `{N} will answer "where" questions correctly ${CRIT_EN}`),
      S(`أن {يجيب|تجيب} {C} على الأسئلة بنعم أو لا عند طلب ذلك {منه|منها} ${CRIT_AR}`, `{N} will answer yes/no questions correctly ${CRIT_EN}`),
      S(`أن {يميز|تميز} {C} بين المذكر والمؤنث في الجمل ${CRIT_AR}`, `{N} will distinguish masculine and feminine forms in sentences ${CRIT_EN}`),
    ],
    expressive: [
      S(`أن {يطلب|تطلب} {C} الأشياء المقصودة عندما {يريدها|تريدها} من X كلمات بشكل صحيح ${CRIT_AR}`, `{N} will request desired items using X words correctly ${CRIT_EN}`),
      S(`أن {يسمي|تسمي} {C} عناصر مجموعة X (الطعام، الفواكه، الحيوانات…) ${CRIT_AR}`, `{N} will name items from category X (food, fruit, animals…) ${CRIT_EN}`),
      S(`أن {يسمي|تسمي} {C} الأفعال ضمن الصور والمواقف الحياتية ${CRIT_AR}`, `{N} will name actions in pictures and daily situations ${CRIT_EN}`),
      S(`أن {يستخدم|تستخدم} {C} صيغة الطلب "أعطني + العنصر" للتعبير عن {حاجاته|حاجاتها} ${CRIT_AR}`, `{N} will use "give me + item" to express needs ${CRIT_EN}`),
      S(`أن {يستخدم|تستخدم} {C} جملاً من كلمتين لوصف الأفعال والصور ${CRIT_AR}`, `{N} will use two-word phrases to describe actions and pictures ${CRIT_EN}`),
      S(`أن {يسمي|تسمي} {C} المفاهيم المكانية في الجملة (في، خارج، على) عند طلب ذلك {منه|منها} ${CRIT_AR}`, `{N} will use spatial concepts (in, out, on) in sentences ${CRIT_EN}`),
      S(`أن {يستخدم|تستخدم} {C} الضمائر بشكل صحيح عند تقديم عبارة أو جملة تحتوي على ضمائر ${CRIT_AR}`, `{N} will use pronouns correctly in phrases and sentences ${CRIT_EN}`),
      S(`أن {يجيب|تجيب} {C} على السؤال الشخصي "ما اسمك؟" بشكل لفظي واضح ${CRIT_AR}`, `{N} will answer "What's your name?" verbally ${CRIT_EN}`),
    ],
    articulation: [
      S(`أن {ينتج|تنتج} {C} الصوت /X/ منفرداً وفي المقاطع بشكل صحيح ${CRIT_AR}`, `{N} will produce /X/ in isolation and syllables correctly ${CRIT_EN}`),
      S(`أن {ينتج|تنتج} {C} الصوت /X/ في بداية ووسط ونهاية الكلمة بشكل صحيح ${CRIT_AR}`, `{N} will produce /X/ in initial, medial, and final word positions ${CRIT_EN}`),
      S(`أن {ينتج|تنتج} {C} الصوت /X/ في العبارات والجمل بشكل صحيح ${CRIT_AR}`, `{N} will produce /X/ in phrases and sentences ${CRIT_EN}`),
      S(`أن {يعمم|تعمم} {C} الإنتاج الصحيح للصوت /X/ في الكلام التلقائي بنسبة إتقان 80%`, `{N} will generalize correct production of /X/ in spontaneous speech with 80% accuracy`),
    ],
    pragmatics: [
      S(`أن {يبادر|تبادر} {C} بالتحية عند الدخول والخروج ${CRIT_AR}`, `{N} will initiate greetings on arrival and departure ${CRIT_EN}`),
      S(`أن {يحافظ|تحافظ} {C} على موضوع المحادثة لـ 3 تبادلات ${CRIT_AR}`, `{N} will maintain a conversation topic for 3 exchanges ${CRIT_EN}`),
      S(`أن {يطلب|تطلب} {C} المساعدة لفظياً عند الحاجة ${CRIT_AR}`, `{N} will request help verbally when needed ${CRIT_EN}`),
    ],
    fluency: [
      S(`أن {يستخدم|تستخدم} {C} الكلام البطيء السلس على مستوى الجملة ${CRIT_AR}`, `{N} will use slow, easy speech at sentence level ${CRIT_EN}`),
      S(`أن {يستخدم|تستخدم} {C} تقنية البداية السهلة للصوت ${CRIT_AR}`, `{N} will use easy onset ${CRIT_EN}`),
      S("أن تنخفض نسبة المقاطع المتأتأ فيها لدى {C} إلى أقل من X% في المحادثة", "{N} will reduce stuttered syllables to below X% in conversation"),
    ],
    voice: [S(`أن {يستخدم|تستخدم} {C} شدة صوت مناسبة في المحادثة ${CRIT_AR}`, `{N} will use appropriate vocal loudness in conversation ${CRIT_EN}`)],
    oral_motor: [
      S(`أن {يضم|تضم} {C} الشفتين {ويغلقهما|وتغلقهما} بإحكام عند الطلب ${CRIT_AR}`, `{N} will round and close lips on request ${CRIT_EN}`),
      S(`أن {يحرك|تحرك} {C} اللسان جانبياً وللأعلى عند الطلب ${CRIT_AR}`, `{N} will lateralize and elevate the tongue on request ${CRIT_EN}`),
    ],
    feeding: [
      S(`أن {يتقبل|تتقبل} {C} X أطعمة جديدة ضمن الوجبة ${CRIT_AR}`, `{N} will accept X new foods during meals ${CRIT_EN}`),
      S(`أن {يمضغ|تمضغ} {C} الطعام الصلب بنمط مضغ دوراني ${CRIT_AR}`, `{N} will chew solid food using a rotary pattern ${CRIT_EN}`),
      S(`أن {يشرب|تشرب} {C} من كوب مفتوح دون تسرب ${CRIT_AR}`, `{N} will drink from an open cup without spillage ${CRIT_EN}`),
    ],
    aac: [S(`أن {يستخدم|تستخدم} {C} تبادل الصور للطلب ${CRIT_AR}`, `{N} will use picture exchange to request ${CRIT_EN}`)],
  };

  const MATERIALS = [
    O("toys", "الألعاب والمجسمات", "Toys and models"), O("cards", "البطاقات", "Picture cards"), O("pictures", "الصور", "Pictures"),
    O("books", "القصص المصورة", "Picture books"), O("mirror", "المرآة", "Mirror"), O("tablet", "تطبيقات الأجهزة اللوحية", "Tablet apps"),
    O("oral_tools", "أدوات التمارين الفموية", "Oral-motor tools"), O("foods", "أطعمة بقوامات مختلفة", "Foods of different textures"), O("board", "لوحة التواصل", "Communication board"),
  ];
  const STRATEGIES = [
    O("verbal", "المساعدة اللفظية", "Verbal prompting"), O("physical", "المساعدة الجسدية", "Physical prompting"), O("modeling", "النمذجة", "Modeling"),
    O("repetition", "التكرار", "Repetition"), O("visual", "التلقين البصري", "Visual cues"), O("fading", "التلاشي التدريجي للمساعدة", "Prompt fading"),
    O("play", "التعلم أثناء اللعب", "Play-based learning"), O("shaping", "التشكيل", "Shaping"),
  ];
  const REINF = [O("tangible", "مادي", "Tangible"), O("social", "معنوي", "Social"), O("token", "رمزي", "Token")];
  const EVAL = [
    O("not_started", "لم يتم البدء في الهدف", "Not started"), O("training", "جار التدريب", "In progress"),
    O("partial", "تم إنجاز جزء من الهدف", "Partially achieved"), O("achieved", "أُنجز الهدف", "Achieved"),
  ];
  const evalText = (g, lang) => {
    if (g.eval === "partial" && g.pct) return lang === "ar" ? `تم انجاز ${g.pct}% من الهدف.` : `${g.pct}% of the goal achieved.`;
    const o = EVAL.find((e) => e.v === g.eval); return o ? o[lang] : "";
  };

  const NUMS = (arr) => arr.map((n) => O(String(n), String(n), String(n)));

  const form = {
    kind: "plan",
    DOMAINS, LTG_SKILLS, STG_BANK, MATERIALS, STRATEGIES, REINF, EVAL, CRIT_AR, CRIT_EN, evalText,
    sections: [
      { id: "head", title: L("بيانات الخطة", ""), fields: [
        { id: "speech_dx", type: "text", label: L("تشخيص النطق واللغة", ""), suggest: DX, replace: true },
        { id: "ot_dx", type: "text", label: L("تشخيص العلاج الوظيفي", "") },
        { id: "frequency", type: "single", label: L("عدد الجلسات الأسبوعية", ""), options: NUMS([1, 2, 3, 4, 5]) },
        { id: "duration", type: "single", label: L("مدة الجلسة (دقيقة)", ""), options: NUMS([30, 45, 60]) },
        { id: "months", type: "single", label: L("مدة الخطة (أشهر)", ""), options: NUMS([3, 4, 6, 9, 12]) },
        { id: "participants", type: "text", label: L("المشاركون في إعداد الخطة (يُضاف اسمك تلقائياً إذا تُرك فارغاً)", "") },
      ] },
      { id: "summary", title: L("ملخص التقييم", ""), fields: [
        { id: "tools", type: "multi", label: L("أدوات التقييم المستخدمة", ""), options: TOOLS },
        { id: "standardized", type: "text", label: L("المقاييس المقننة المستخدمة (إن وُجدت)", "") },
        { id: "r_receptive", type: "textarea", label: L("اللغة الاستقبالية", ""), suggest: RESULTS_SUG.receptive },
        { id: "r_expressive", type: "textarea", label: L("اللغة التعبيرية", ""), suggest: RESULTS_SUG.expressive },
        { id: "r_imitation", type: "textarea", label: L("التقليد الصوتي", ""), suggest: RESULTS_SUG.imitation },
        { id: "r_articulation", type: "textarea", label: L("النطق وإنتاج الأصوات", ""), suggest: RESULTS_SUG.articulation },
        { id: "organs", type: "matrix", label: L("فحص تركيب ووظيفة أعضاء النطق", ""), rows: ORG, groups: [{ key: "s", options: OK2 }], note: true },
        { id: "fluency", type: "single", label: L("اضطرابات الطلاقة", ""), options: NONE_OR },
        { id: "fluency_note", type: "textarea", label: L("وصف اضطراب الطلاقة", ""), show: (d) => d.fluency === "present" },
        { id: "voice", type: "single", label: L("اضطرابات الصوت", ""), options: NONE_OR },
        { id: "voice_note", type: "textarea", label: L("وصف اضطراب الصوت", ""), show: (d) => d.voice === "present" },
        { id: "feeding", type: "single", label: L("تقييم البلع والتغذية", ""), options: [O("none", "سليم", "Normal"), O("present", "توجد صعوبات (اكتب الوصف)", "Difficulties")] },
        { id: "feeding_note", type: "textarea", label: L("وصف صعوبات البلع والتغذية", ""), show: (d) => d.feeding === "present" },
        { id: "strengths", type: "list", label: L("نقاط القوة (سطر لكل نقطة)", ""), suggest: RESULTS_SUG.strengths },
        { id: "weaknesses", type: "list", label: L("نقاط الضعف (سطر لكل نقطة)", ""), suggest: RESULTS_SUG.weaknesses },
        { id: "justification", type: "list", label: L("مبررات الخطة التربوية الفردية الشاملة (سطر لكل مبرر)", ""), suggest: JUSTIFY_DEFAULT },
      ] },
      { id: "goals", title: L("الأهداف", ""), fields: [{ id: "blocks", type: "goals" }] },
      { id: "followup", title: L("المتابعة والاعتماد", ""), fields: [
        { id: "review", type: "single", label: L("المراجعة الدورية لنسب الإنجاز", ""), options: [O("monthly", "شهرية", "monthly"), O("quarterly", "ربعية", "quarterly")] },
        { id: "mastery_sessions", type: "single", label: L("يُعدّ الهدف متحققاً عند بلوغ المعيار في (جلسات متتالية)", ""), options: NUMS([2, 3]) },
        { id: "guardian", type: "text", label: L("ولي الأمر / الوصي (الاسم وصلة القرابة) — اختياري", "") },
      ] },
    ],

    defaults(pc) {
      return {
        ot_dx: "لا يوجد", frequency: "2", duration: "30", months: "6", tools: ["observation", "interview", "sample", "routine"], standardized: "لا يوجد",
        organs: { lips: { s: "ok" }, tongue: { s: "ok" }, palate: { s: "ok" }, jaw: { s: "ok" }, coord: { s: "ok" } },
        fluency: "none", voice: "none", feeding: "none", justification: JUSTIFY_DEFAULT.map((j) => gx(j.ar, pc)).join("\n"),
        blocks: [], review: "quarterly", mastery_sessions: "2",
      };
    },

    generate(d, ctx) {
      const lang = ctx.lang, ar = lang === "ar", pc = ctx.pc, p = ctx.patient, G = (s) => gx(s, pc);
      const out = ["# " + (ar ? "الخطة التربوية الفردية للنطق واللغة" : "Individualized Speech and Language Plan"), "::info4"];
      const team = d.participants || ctx.therapistName || "";
      const months = d.months || "6";
      if (ar) out.push(
        `الاسم: ${pc.full}`, `تاريخ بدء الخطة: ${dmy(ctx.startDate)}`,
        `تاريخ الميلاد: ${dmy(p.dob)}`, `المركز: ${ctx.centerShort}`,
        `العمر الزمني: ${pc.age}`, `المشاركون في اعداد الخطة: ${team}`,
        `تشخيص النطق واللغة: ${d.speech_dx || ""}`, `تشخيص العلاج الوظيفي: ${d.ot_dx || "لا يوجد"}`,
        `الجنسية: ${nationality(p.nationality, "ar")}`, `رقم الملف: ${p.file_no}`,
        `تاريخ انتهاء الخطة: ${dmy(ctx.endDate)}`, `تاريخ إعادة التقييم: ${dmy(ctx.endDate)}`,
        `عدد الجلسات الأسبوعية: ${d.frequency || ""}`, `مدة الجلسة: ${d.duration ? d.duration + " دقيقة" : ""}`,
        `الخدمة / التخصص: النطق واللغة`, `مدة الخطة: (${months}) أشهر`);
      else out.push(
        `Name: ${pc.full}`, `Plan start date: ${dmy(ctx.startDate)}`,
        `Date of birth: ${dmy(p.dob)}`, `Center: ${ctx.centerShort}`,
        `Chronological age: ${pc.age}`, `Prepared by: ${team}`,
        `Speech & language diagnosis: ${d.speech_dx || ""}`, `OT diagnosis: ${d.ot_dx && d.ot_dx !== "لا يوجد" ? d.ot_dx : "None"}`,
        `Nationality: ${nationality(p.nationality, "en")}`, `File no.: ${p.file_no}`,
        `Plan end date: ${dmy(ctx.endDate)}`, `Re-evaluation date: ${dmy(ctx.endDate)}`,
        `Sessions per week: ${d.frequency || ""}`, `Session length: ${d.duration ? d.duration + " minutes" : ""}`,
        `Service: Speech and Language`, `Plan duration: (${months}) months`);

      // Summary
      out.push("", "## " + (ar ? "ملخص التقييم:" : "Assessment Summary:"));
      out.push(G(ar ? `بعد تقييم {C} {N} {البالغ|البالغة} من العمر {AGE} في ${ctx.centerFull} بواسطة أخصائي النطق، وبتحليل النتائج تبين أن {C}:` : `Following the speech and language assessment of {N}, aged {AGE}, at ${ctx.centerFull}, the results show the following:`));
      out.push("### " + (ar ? "أدوات التقييم المستخدمة:" : "Assessment tools used:"));
      out.push(lblMany(TOOLS, d.tools, lang, pc).join(" / ") || "-");
      out.push((ar ? "المقاييس المقننة المستخدمة (إن وُجدت): " : "Standardized measures used (if any): ") + (d.standardized && !(lang === "en" && d.standardized === "لا يوجد") ? d.standardized : (ar ? "لا يوجد" : "None")));
      out.push("### " + (ar ? "نتائج تقييم النطق واللغة:" : "Speech and language results:"));
      const res = [[ar ? "اللغة الاستقبالية" : "Receptive language", d.r_receptive], [ar ? "اللغة التعبيرية" : "Expressive language", d.r_expressive],
        [ar ? "التقليد الصوتي" : "Vocal imitation", d.r_imitation], [ar ? "النطق وإنتاج الأصوات" : "Articulation and sound production", d.r_articulation]];
      res.forEach(([k, v]) => { const t = G(String(v || "").replace(/\n+/g, " ").trim()); if (t) out.push(`- **${k}:** ${t}`); });
      out.push("### " + (ar ? "فحص تركيب ووظيفة أعضاء النطق:" : "Speech mechanism structure and function:"));
      const org = ORG.filter((o) => o.v !== "coord" && (d.organs || {})[o.v]).map((o) => `${o[lang]}: ${(d.organs[o.v].s === "bad" ? (d.organs[o.v].note || (ar ? "غير سليم" : "atypical")) : (ar ? "سليم" : "normal"))}`);
      if (org.length) out.push(`- ${org.join(" / ")}`);
      const co = (d.organs || {}).coord;
      if (co) out.push(`- ${ar ? "التناسق الحركي الفموي" : "Oral-motor coordination"}: ${co.s === "bad" ? (co.note || (ar ? "غير سليم" : "atypical")) : (ar ? "سليم" : "normal")}`);
      out.push("### " + (ar ? "اضطرابات الطلاقة:" : "Fluency disorders:"));
      out.push("- " + (d.fluency === "present" ? G(d.fluency_note || "") : G(ar ? "لا يوجد أي تاريخ مرضي أو وراثي على اضطرابات الطلاقة الكلامية، كما أن {كلامه|كلامها} لا يتضمن وجود تأتأة (بأنواعها) أو سرعة في الكلام تؤثر على الكلام ووضوحه." : "No medical or family history of fluency disorders; {his|her} speech shows no stuttering or rapid rate affecting speech clarity.")));
      out.push("### " + (ar ? "اضطرابات الصوت:" : "Voice disorders:"));
      out.push("- " + (d.voice === "present" ? G(d.voice_note || "") : G(ar ? "لا يوجد أي تاريخ مرضي على اضطرابات الصوت، كما أن {صوته|صوتها} لا يتضمن علواً في الصوت أو جودة ونبرة صوت غير طبيعية ناتجة من الحنجرة تُؤثر على إنتاج الكلام." : "No history of voice disorders; {his|her} voice shows no abnormal loudness, quality, or pitch affecting speech production.")));
      out.push("### " + (ar ? "تقييم البلع والتغذية:" : "Swallowing and feeding:"));
      out.push("- " + (d.feeding === "present" ? G(d.feeding_note || "") : G(ar ? "تم فحص أعضاء النطق من حيث التركيب والوظيفة والعضلات للفكين والأسنان واللسان وسقف الحلق الصلب والرخو واللهاة، وظهر أن تركيب ووظائف أعضاء النطق {لديه|لديها} سليمة، ولم يظهر أي جانب من مشاكل البلع." : "The speech organs (jaw, teeth, tongue, hard and soft palate, uvula) were examined for structure, function, and musculature; structure and function were normal, with no swallowing difficulties observed.")));
      const listSec = (title, val) => { const ls = lines(val).map(G); if (!ls.length) return; out.push("### " + title); ls.forEach((t) => out.push(`- ${t}`)); };
      listSec(ar ? "نقاط القوة:" : "Strengths:", d.strengths);
      listSec(ar ? "نقاط الضعف:" : "Weaknesses:", d.weaknesses);
      listSec(ar ? "مبررات الخطة التربوية الفردية الشاملة:" : "Rationale for the individualized plan:", d.justification);

      // Goals
      let lastGeneral = null;
      (d.blocks || []).forEach((b) => {
        const gen = b.general_text || lbl(DOMAINS, b.general, lang, pc);
        if (gen && gen !== lastGeneral) { out.push("", `## ${ar ? "الهدف العام للخطة" : "General goal"}: ${gen}`); lastGeneral = gen; }
        const ltg = G((b.ltg && (b.ltg[lang] || b.ltg[ar ? "en" : "ar"])) || "");
        if (ltg) out.push(`**${ar ? "الهدف طويل المدى" : "Long-term goal"}: ${ltg}**`);
        const stgs = (b.stgs || []).filter((s) => (s[lang] || s.ar || s.en || "").trim());
        if (!stgs.length) return;
        out.push(ar ? "| الاهداف قصيرة المدى | المواد والأدوات اللازمة | الاستراتيجيات التدريبية | تاريخ البدء | تاريخ الانتهاء | التعزيز | التقييم |"
          : "| Short-term goal | Materials | Strategies | Start date | End date | Reinforcement | Evaluation |");
        stgs.forEach((s) => {
          out.push(`| ${cell(G(s[lang] || s[ar ? "en" : "ar"]))} | ${cell(lblMany(MATERIALS, s.materials, lang, pc).join(" / "))} | ${cell(lblMany(STRATEGIES, s.strategies, lang, pc).join(" / "))} | ${dmy(s.start || ctx.startDate)} | ${dmy(s.end || ctx.endDate)} | ${cell(lblMany(REINF, s.reinf, lang, pc).join(" / "))} | ${cell(evalText(s, lang))} |`);
        });
      });

      // Follow-up
      out.push("", "## " + (ar ? "خطة المتابعة وإعادة التقييم:" : "Follow-up and Re-evaluation Plan:"));
      const rev = d.review === "monthly" ? (ar ? "شهرية" : "monthly") : (ar ? "ربعية" : "quarterly");
      const ms = d.mastery_sessions || "2";
      if (ar) {
        out.push(`- مدة الخطة: (${months}) أشهر، من ${dmy(ctx.startDate)} إلى ${dmy(ctx.endDate)}.`);
        out.push(`- المتابعة الدورية: توثيق حالة كل هدف قصير المدى في تقرير التقدم الداخلي، ومراجعة ${rev} لنسب الإنجاز.`);
        out.push(`- تاريخ إعادة التقييم: ${dmy(ctx.endDate)}، ولا يُعمل بهذه الخطة بعد هذا التاريخ دون إعادة تقييم وتحديث معتمدين.`);
        out.push(`- مؤشر الإتقان المعتمد: يُعدّ الهدف متحققاً عند بلوغ المعيار الرقمي المحدد في ${ms === "2" ? "جلستين متتاليتين" : ms + " جلسات متتالية"} على الأقل.`);
        out.push("- أقر أنا الموقع أدناه بأن الخطة الفردية الخاصة بالمستفيد قد تمت مناقشتها وشرحها لي بطريقة واضحة ومفهومة، وأنني فهمت الأهداف والخدمات والتدخلات المقترحة وآلية المتابعة والمراجعة، وأتيحت لي الفرصة للمشاركة وطرح الأسئلة. وبناءً عليه، أوافق على تنفيذ الخطة الفردية الحالية وفقاً لما تم شرحه ومناقشته.");
      } else {
        out.push(`- Plan duration: (${months}) months, from ${dmy(ctx.startDate)} to ${dmy(ctx.endDate)}.`);
        out.push(`- Periodic follow-up: the status of each short-term goal is documented in the internal progress report, with a ${rev} review of achievement rates.`);
        out.push(`- Re-evaluation date: ${dmy(ctx.endDate)}; this plan is not to be used after this date without an approved re-evaluation and update.`);
        out.push(`- Mastery criterion: a goal is considered achieved when the specified numeric criterion is met in at least ${ms} consecutive sessions.`);
        out.push("- I, the undersigned, confirm that the individualized plan has been discussed and explained to me clearly; I understand the goals, services, proposed interventions, and the follow-up and review process, and I had the opportunity to participate and ask questions. I therefore agree to the implementation of this plan as explained.");
      }
      // Signatures
      const today = dmy(ctx.reportDate || ctx.startDate);
      out.push("", ar ? "**إعــــداد:**" : "**Prepared by:**");
      out.push(ar ? "| التخصص | الاسم | التوقيع |" : "| Specialty | Name | Signature |");
      out.push(ar ? `| أخصائي النطق واللغة | ${ctx.therapistName || ""} |  |` : `| Speech and Language Pathologist | ${ctx.therapistName || ""} |  |`);
      out.push("", ar ? "**اعتماد وموافقة الخطة الفردية**" : "**Plan approval and consent**");
      out.push(ar ? "| الصفة / الاسم | التوقيع | التاريخ |" : "| Role / Name | Signature | Date |");
      out.push(ar ? `| الأخصائي المعالج: ${ctx.therapistName || ""} |  | ${today} |` : `| Treating therapist: ${ctx.therapistName || ""} |  | ${today} |`);
      out.push(ar ? `| ولي الأمر / الوصي (الاسم وصلة القرابة): ${d.guardian || "……………"} |  | ${today} |` : `| Parent / guardian (name and relationship): ${d.guardian || "……………"} |  | ${today} |`);
      out.push(ar ? `| المشرف السريري: ${ctx.supervisor || ""} |  | ${today} |` : `| Clinical supervisor: ${ctx.supervisor || ""} |  | ${today} |`);
      return out.join("\n");
    },

    // Flat list of STGs (used by progress/discharge reports).
    allGoals(d, lang, pc) {
      const res = [];
      (d.blocks || []).forEach((b, bi) => (b.stgs || []).forEach((s, si) => {
        const t = gx(s[lang] || s.ar || s.en || "", pc);
        if (t.trim()) res.push({ key: `${bi}_${si}`, block: bi, text: t, ltg: gx((b.ltg && (b.ltg[lang] || b.ltg.ar)) || "", pc), general: b.general_text || lbl(DOMAINS, b.general, lang, pc), eval: s.eval, pct: s.pct });
      }));
      return res;
    },
    ltgText(skill, lang, pc) { return gx(lang === "ar" ? `تحسين مهارة ${skill.ar} {ليصل|لتصل} {C} إلى مستوى الكفاية المطلوبة` : `Improve ${skill.en} skills to reach the required level of competence`, pc); },
  };
  window.Forms.plan = form;
})();
