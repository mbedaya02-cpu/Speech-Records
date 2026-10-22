// =====================================================================
//  "تقرير تقييم" / "Evaluation Report" — follows the department template
//  (also used for "تقرير إعادة تقييم" / re-evaluation).
// =====================================================================
(function () {
  const { L, O, gx, joinList, lbl, lblMany, cap, lines, dmy, nationality, AR_COUNT, EN_COUNT, endOfReport } = window.FC;

  const TOOLS = [
    O("case_history", "استمارة التقييم (تاريخ الحالة للأطفال)", "Assessment form (pediatric case history)"),
    O("observation", "الملاحظة المباشرة وغير المباشرة", "Direct and indirect observation"),
    O("interview", "مقابلة الأهل و{N}", "Interview with the parents and {N}"),
    O("interview_parents", "مقابلة الأهل", "Interview with the parents"),
    O("oral_exam", "الفحص التركيبي والوظيفي لأعضاء جهاز النطق (غير مقنن)", "Structural and functional examination of the speech mechanism (non-standardized)"),
    O("lang_test", "اختبار للتطور اللغوي (غير مقنن / محكّي المرجع)", "Language development test (non-standardized / criterion-referenced)"),
    O("artic_test", "اختبار نطق الأصوات اللغوية (محكّي المرجع)", "Speech sound articulation test (criterion-referenced)"),
    O("sample", "تحليل عينة كلام تلقائي", "Spontaneous language sample analysis"),
  ];

  // Oral-facial table: [id, ar label, en label, normal ar, normal en]
  const ORAL = [
    ["face", "معالم نصفي الوجه", "Facial symmetry", "متماثلة", "Symmetrical"],
    ["hard_palate", "سقف الحلق الصلب", "Hard palate", "طبيعي", "Normal"],
    ["lips", "الشفاه", "Lips", "متماثلة", "Symmetrical"],
    ["soft_palate", "سقف الحلق اللين", "Soft palate", "طبيعي", "Normal"],
    ["lip_mov", "حركة الشفاه", "Lip movement", "لم يُلحظ أي أمر غير طبيعي في الحجم أو الشكل خلال الراحة والحركة", "No abnormalities observed in size or shape at rest or during movement"],
    ["saliva", "التحكم باللعاب", "Saliva control", "لم يُلحظ سيلان لعاب", "No drooling observed"],
    ["jaw", "الفك وحركته", "Jaw and its movement", "لم يُلحظ أي أمر غير طبيعي في الحجم أو الشكل أو الحركة", "No abnormalities observed in size, shape, or movement"],
    ["teeth", "الأسنان", "Teeth", "لم يُلحظ أي أمر غير طبيعي", "No abnormalities observed"],
    ["tongue", "اللسان", "Tongue", "لم يُلحظ أي أمر غير طبيعي فيما يخص اللون والشكل والحجم", "No abnormalities observed regarding color, shape, and size"],
    ["chewing", "المضغ والبلع", "Chewing and swallowing", "سليم، ولا شكوى من هذا الجانب", "Adequate; no complaint in this area"],
    ["tongue_mov", "حركة اللسان", "Tongue movement", "لم يُلحظ أي أمر غير طبيعي في الحركة خلال التقليد اللفظي والحركي", "No abnormalities observed in movement during verbal and motor imitation"],
    ["larynx", "الحنجرة", "Larynx", "حدة وعلو الصوت طبيعيان خلال الكلام", "Pitch and loudness of voice are normal during speech"],
  ];
  const ORAL_STATUS = [O("normal", "طبيعي", "Normal"), O("abnormal", "غير طبيعي", "Atypical"), O("na", "لم يُقيّم", "Not assessed")];

  const DURATION = [O("60", "ساعة كاملة", "a full hour"), O("45", "45 دقيقة", "45 minutes"), O("30", "30 دقيقة", "30 minutes")];

  const OBS = [
    O("friendly", "{C} {ودود|ودودة} في بعض الأوقات، {ويُظهر|وتُظهر} استجابات انفعالية متباينة تبعاً للموقف.", "{N} is friendly at times and shows varying emotional responses depending on the situation.", { short: "ودود / استجابات انفعالية متباينة" }),
    O("cooperative", "{أبدى|أبدت} {C} تعاوناً جيداً مع الاختصاصي طوال الجلسة.", "{N} was cooperative with the specialist throughout the session.", { short: "متعاون طوال الجلسة" }),
    O("speaks_limited", "{يتكلم|تتكلم} {C}، إلا أن {استخدامه|استخدامها} للغة يكون محدوداً ولا يتناسب مع {عمره|عمرها} الزمني من حيث السرد والتعبير المتكامل.", "{N} speaks; however, {his|her} use of language is limited and not appropriate for {his|her} chronological age in terms of narration and complete expression.", { short: "يتكلم لكن لغته محدودة" }),
    O("nonverbal", "لا {يستخدم|تستخدم} {C} الكلام بشكل وظيفي، {ويعتمد|وتعتمد} على الإيماءات والأصوات للتواصل.", "{N} does not use functional speech and relies on gestures and vocalizations to communicate.", { short: "غير لفظي / إيماءات وأصوات" }),
    O("writes", "{يستطيع|تستطيع} {C} الكتابة، {إلا أنه لا يتمكن|إلا أنها لا تتمكن} من السرد أو التعبير القصصي الشفهي بشكل مناسب.", "{N} is able to write; however, {he|she} is unable to narrate or tell a story orally in an appropriate manner.", { short: "يكتب لكن لا يسرد شفهياً" }),
    O("eye_poor", "التواصل البصري ضعيف ومتقطع.", "Eye contact is poor and inconsistent.", { short: "تواصل بصري ضعيف" }),
    O("eye_good", "التواصل البصري جيد ومناسب.", "Eye contact is good and appropriate.", { short: "تواصل بصري جيد" }),
    O("attention", "مدة الانتباه قصيرة، {ويحتاج|وتحتاج} إلى إعادة توجيه متكررة.", "Attention span is short, and {he|she} requires frequent redirection.", { short: "انتباه قصير" }),
    O("behaviors", "{يُظهر|تُظهر} {C} بعض السلوكيات غير المرغوبة مثل العناد، خاصة عند الشعور بالغضب.", "{N} shows some undesirable behaviors, such as stubbornness, especially when feeling angry.", { short: "سلوكيات غير مرغوبة (عناد)" }),
    O("commands", "{استجابته|استجابتها} للأوامر اللفظية متذبذبة، وتتحسن مع الأوامر البسيطة والمألوفة، بينما {يواجه|تواجه} صعوبة في تنفيذ الأوامر المركبة أو الجديدة.", "{His|Her} response to verbal commands is inconsistent; it improves with simple and familiar commands, while {he|she} has difficulty carrying out complex or new commands.", { short: "استجابة متذبذبة للأوامر" }),
    O("emotions", "{يُظهر|تُظهر} ضعفاً في تنظيم {انفعالاته|انفعالاتها}، وقد {يلجأ|تلجأ} إلى السلوكيات بدل التعبير اللفظي عن {احتياجاته|احتياجاتها}.", "{He|She} shows weakness in regulating {his|her} emotions and may resort to behaviors instead of verbally expressing {his|her} needs.", { short: "ضعف تنظيم الانفعالات" }),
    O("initiation", "التواصل اللفظي موجود لكنه محدود من حيث المبادرة والاستمرارية.", "Verbal communication is present but limited in terms of initiation and maintenance.", { short: "مبادرة تواصلية محدودة" }),
    O("transitions", "{يواجه|تواجه} صعوبة في الانتقال بين الأنشطة دون تهيئة مسبقة.", "{He|She} has difficulty transitioning between activities without prior preparation.", { short: "صعوبة الانتقال بين الأنشطة" }),
    O("withdraws", "قد {ينسحب|تنسحب} من النشاط أو {يرفضه|ترفضه} عند الشعور بالضغط أو عدم الفهم.", "{He|She} may withdraw from or refuse an activity when feeling pressured or when {he|she} does not understand.", { short: "ينسحب عند الضغط" }),
    O("rec_better", "اللغة الاستقبالية {لديه|لديها} أفضل من اللغة التعبيرية، إلا أنها لم تصل بعد إلى المستوى المتوقع {لعمره|لعمرها} الزمني.", "{His|Her} receptive language is better than {his|her} expressive language; however, it has not yet reached the level expected for {his|her} chronological age.", { short: "الاستقبالية أفضل من التعبيرية" }),
    O("reinforcement", "{يحتاج|تحتاج} إلى أساليب تعزيز واضحة وفورية لتحسين الاستجابة وتقليل السلوكيات غير المرغوبة.", "{He|She} needs clear and immediate reinforcement strategies to improve responsiveness and reduce undesirable behaviors.", { short: "يحتاج تعزيزاً فورياً" }),
    O("hyperactive", "{يُظهر|تُظهر} نشاطاً حركياً زائداً أثناء الجلسة.", "{He|She} shows increased motor activity during the session.", { short: "نشاط حركي زائد" }),
    O("sensory", "{يُظهر|تُظهر} سلوكيات حسية مثل تفحّص الأشياء أو الحساسية للأصوات.", "{He|She} shows sensory behaviors, such as inspecting objects or sensitivity to sounds.", { short: "سلوكيات حسية" }),
    O("echolalia", "{يردد|تردد} الكلمات والعبارات (المصاداة) بدلاً من استخدامها بشكل وظيفي.", "{He|She} repeats words and phrases (echolalia) rather than using them functionally.", { short: "مصاداة (ترديد)" }),
  ];

  const ID3 = [O("all", "تعرّف على الكل", "All"), O("some", "على البعض", "Some"), O("none", "لم يتعرّف", "None")];
  const NAME3 = [O("all", "سمّاها", "Named"), O("some", "سمّى بعضها", "Some"), O("none", "لم يسمّها", "None")];
  const SEM = [
    O("vocab", "المفردات من مختلف المجموعات اللغوية (ملابس، حيوانات، مواصلات، ألوان…)", "the vocabulary from various language categories (clothes, animals, transportation, colors…)", { short: "مفردات المجموعات" }),
    O("verbs", "الأفعال (يلعب، يستحم، يغسل…)", "the verbs (playing, bathing, washing…)", { short: "الأفعال" }),
    O("parts", "أجزاء العناصر في صور الاختبار (مثل: وين راس الأرنب؟)", "the parts of items in the test pictures (e.g., Where is the rabbit's head?)", { short: "أجزاء العناصر" }),
    O("adjectives", "الصفات (نايم، صاحي، بارد، حار…)", "the adjectives (asleep, awake, cold, hot…)", { short: "الصفات" }),
    O("quantities", "الكميات (كتير، شوي…)", "the quantities (a lot, a little…)", { short: "الكميات" }),
    O("colors", "الألوان الأساسية (أحمر، أخضر، أزرق…)", "the basic colors (red, green, blue…)", { short: "الألوان" }),
    O("adverbs", "الظروف المكانية (داخل، خارج، فوق…)", "the spatial adverbs (inside, outside, on top…)", { short: "الظروف المكانية" }),
    O("negation", "صيغة النفي في الجمل (وين اللي ما بيبكي؟)", "negation in sentences (e.g., Where is the one who is not crying?)", { short: "النفي" }),
    O("counting", "مفهوم العد ومطابقة العدد مع المعدود", "the concept of counting and matching numbers to quantities", { short: "العد" }),
  ];
  const USE3 = [O("good", "بشكل مناسب", "Appropriate"), O("partial", "جزئياً", "Inconsistent"), O("none", "لا يستخدم", "Not used")];
  const GRAM = [
    O("combine", "ربط مفردتين أو أكثر معاً", "combining two or more words"),
    O("pronouns", "الضمائر البسيطة", "simple pronouns"),
    O("plural", "صيغة الجمع", "plural forms"),
    O("negation", "صيغة النفي", "negation"),
    O("gender", "التذكير والتأنيث", "gender agreement"),
    O("tenses", "أزمنة الأفعال", "verb tenses"),
    O("preps", "حروف الجر والظروف المكانية", "prepositions and spatial adverbs"),
    O("conj", "أدوات الربط", "conjunctions"),
  ];
  const YES3 = [O("yes", "نعم", "Yes"), O("partial", "جزئياً", "Partly"), O("no", "لا", "No")];
  const PRAG = [
    O("greet", "تبادل التحية", "Greeting", { yes: L("{بادل|بادلت} {N} التحية مع الاختصاصي عندما رحّب {به|بها}.", "{N} returned the greeting with the specialist when greeted."), partial: L("{بادل|بادلت} {N} التحية مع الاختصاصي بعد التشجيع.", "{N} returned the greeting after prompting."), no: L("لم {يبادل|تبادل} {N} التحية مع الاختصاصي.", "{N} did not return the greeting.") }),
    O("story", "سرد قصة بشكل عفوي", "Spontaneous narration", { yes: L("{قام|قامت} {N} بسرد أحداث قصة بشكل عفوي.", "{N} spontaneously narrated the events of a story."), partial: L("{قام|قامت} {N} بسرد بعض أحداث القصة بمساعدة.", "{N} narrated some story events with support."), no: L("لم {يقم|تقم} {N} بسرد أحداث قصة بشكل عفوي.", "{N} did not spontaneously narrate the events of a story.") }),
    O("feelings", "التعبير عن المشاعر", "Expressing feelings", { yes: L("{عبّر|عبّرت} {N} عن {مشاعره|مشاعرها} بشكل مناسب.", "{N} expressed {his|her} feelings appropriately."), partial: L("{عبّر|عبّرت} {N} عن {مشاعره|مشاعرها} أحياناً.", "{N} expressed {his|her} feelings at times."), no: L("لم {يعبّر|تعبّر} {N} عن {مشاعره|مشاعرها} بشكل مناسب، وغالباً ما تظهر عوضاً عنها سلوكيات غير مرغوبة.", "{N} did not express {his|her} feelings appropriately, and undesirable behaviors often appear instead.") }),
    O("name", "الاستجابة للاسم", "Response to name", { yes: L("{يستجيب|تستجيب} {N} لفظياً عند {ندائه باسمه|ندائها باسمها}.", "{N} responds verbally when called by name."), partial: L("{يستجيب|تستجيب} {N} أحياناً عند {ندائه باسمه|ندائها باسمها}.", "{N} inconsistently responds when called by name."), no: L("لا {يستجيب|تستجيب} {N} عند {ندائه باسمه|ندائها باسمها}.", "{N} does not respond when called by name.") }),
    O("questions", "الإجابة عن أسئلة بسيطة", "Answering simple questions", { yes: L("{أجاب|أجابت} {N} عن الأسئلة البسيطة بشكل مناسب (كيف حالك؟، شو اسمك؟، وين ماما؟).", "{N} answered simple questions appropriately (How are you?, What's your name?, Where is mom?)."), partial: L("{أجاب|أجابت} {N} عن بعض الأسئلة البسيطة، ولم {يجب|تجب} عن بعضها (كيف حالك؟، شو اسمك؟، وين ماما؟).", "{N} answered some simple questions but not others (How are you?, What's your name?, Where is mom?)."), no: L("لم {يجب|تجب} {N} عن الأسئلة البسيطة بشكل مناسب (كيف حالك؟، شو اسمك؟، وين ماما؟).", "{N} did not answer simple questions appropriately (How are you?, What's your name?, Where is mom?).") }),
    O("commands", "الاستجابة للأوامر البسيطة", "Following simple commands", { yes: L("{استجاب|استجابت} {N} للأوامر البسيطة.", "{N} responded to simple commands."), partial: L("{استجاب|استجابت} {N} لبعض الأوامر البسيطة.", "{N} responded to some simple commands."), no: L("لم {يستجب|تستجب} {N} للأوامر البسيطة.", "{N} did not respond to simple commands.") }),
    O("bye", "التلويح عند الخروج (باي)", "Waving bye", { yes: L("{لوّح|لوّحت} {N} {بيده|بيدها} عند الخروج وتزامن معها إنتاج كلمة (باي).", "{N} waved {his|her} hand when leaving, simultaneously producing the word (bye)."), partial: L("{لوّح|لوّحت} {N} {بيده|بيدها} عند الخروج دون إنتاج لفظي.", "{N} waved when leaving without a verbal production."), no: L("لم {يلوّح|تلوّح} {N} عند الخروج.", "{N} did not wave when leaving.") }),
    O("turns", "تبادل الأدوار", "Turn-taking", { yes: L("{يتبادل|تتبادل} {N} الأدوار أثناء النشاط بشكل مناسب.", "{N} takes turns appropriately during activities."), partial: L("{يتبادل|تتبادل} {N} الأدوار بمساعدة.", "{N} takes turns with support."), no: L("لا {يتبادل|تتبادل} {N} الأدوار أثناء النشاط.", "{N} does not take turns during activities.") }),
    O("initiates", "المبادرة بالتواصل", "Initiating communication", { yes: L("{يبادر|تبادر} {N} بالتواصل مع الآخرين.", "{N} initiates communication with others."), partial: L("{يبادر|تبادر} {N} بالتواصل أحياناً.", "{N} occasionally initiates communication."), no: L("لا {يبادر|تبادر} {N} بالتواصل مع الآخرين.", "{N} does not initiate communication with others.") }),
  ];

  const ARTIC = [
    O("applied", "طُبّق الاختبار", "Administered"),
    O("not_competence", "لم يُطبّق (لا توجد كفاية لغوية)", "Not administered (insufficient language)"),
    O("not_other", "لم يُطبّق (سبب آخر)", "Not administered (other)"),
  ];
  const ERR = [O("sub", "إبدال", "substitutions"), O("omit", "حذف", "omissions"), O("dist", "تحريف (تشويه)", "distortions"), O("add", "إضافة", "additions")];
  const PROC = [
    O("fronting", "التقديم", "fronting"), O("stopping", "الإيقاف", "stopping"), O("fcd", "حذف الصامت الأخير", "final consonant deletion"),
    O("wsd", "حذف المقطع غير المنبور", "weak syllable deletion"), O("cluster", "تبسيط العناقيد", "cluster reduction"),
    O("assim", "المماثلة", "assimilation"), O("deemph", "إزالة التفخيم", "de-emphasis"), O("gliding", "الانزلاق", "gliding"),
  ];
  const INTEL = [O("full", "مفهوم تماماً", "fully intelligible"), O("mostly", "مفهوم غالباً", "mostly intelligible"), O("partly", "مفهوم جزئياً", "partially intelligible"), O("poor", "غير مفهوم غالباً", "mostly unintelligible")];

  const SEV = [
    O("", "لا يوجد", "None"), O("mild", "بسيط", "Mild"), O("mild_mod", "من بسيط إلى متوسط", "Mild to Moderate"),
    O("moderate", "متوسط", "Moderate"), O("mod_sev", "من متوسط إلى شديد", "Moderate to Severe"), O("severe", "شديد", "Severe"),
  ];
  const OTHER_DX = [
    O("artic", "اضطراب نطق", "Articulation Disorder"), O("phono", "اضطراب فونولوجي", "Phonological Disorder"),
    O("cas", "اشتباه أبراكسيا الكلام الطفولية", "Suspected Childhood Apraxia of Speech"), O("stutter", "تأتأة", "Stuttering"),
    O("social", "اضطراب التواصل الاجتماعي", "Social Communication Disorder"), O("asd", "صعوبات تواصل مرتبطة باضطراب طيف التوحد", "Communication difficulties associated with ASD"),
    O("lang_disorder", "اضطراب لغوي", "Language Disorder"), O("voice", "اضطراب صوت", "Voice Disorder"), O("feeding", "صعوبات بلع وتغذية", "Feeding and Swallowing Difficulties"),
  ];

  const PROG_FACTORS = [
    O("coop", "تعاوناً جيداً في التدريبات التجريبية", "good cooperation in the trial exercises"),
    O("accept", "تقبّلاً للاختصاصي", "acceptance of the specialist"),
    O("ready", "استعدادية جيدة للعلاج", "good readiness for therapy"),
    O("repeats", "بدء تكرار بعض الاستجابات المرجوة للأهداف التجريبية", "beginning to repeat some of the desired responses to the trial goals"),
  ];
  const PROG_SUPPORT = [
    O("early", "التدخّل المباشر والمكثف في هذا العمر", "direct and intensive intervention at this age"),
    O("home", "المتابعة المنزلية وتهيئة البيئة لتكون داعمة لتطور اللغة", "home follow-up and preparing a supportive environment for language development"),
    O("parents", "رغبة الأبوين في المشاركة الفاعلة في العملية التأهيلية", "the parents' willingness to actively participate in the rehabilitation process"),
  ];
  const PROGNOSIS = [O("good", "جيدة", "good"), O("fair", "متوسطة", "fair"), O("guarded", "محدودة", "guarded")];

  const NUMS = (arr) => arr.map((n) => O(String(n), String(n), String(n)));
  const RECS = [
    O("enroll", "إدراج {N} ببرنامج تأهيلي لغوي ونطقي لتطوير المهارات اللغوية والتواصل.", "Enroll {N} in a language and speech rehabilitation program to develop language and communication skills.", { short: "الإدراج في برنامج تأهيلي" }),
    O("parents_attend", "حضور الأهل للجلسات ومشاركتهم بالعملية التأهيلية، لنقل التدريبات للبيئة المنزلية وتعميمها وتضمينها في الحياة اليومية.", "Parents should attend the sessions and participate in the rehabilitation process, to transfer the exercises to the home environment, generalize them, and incorporate them into daily life.", { short: "حضور الأهل للجلسات" }),
    O("parent_edu", "تخصيص جزء من الجلسات لتثقيف الأهل عن تأخر اللغة وأساليب تحفيز اللغة غير المباشرة وزيادة التفاعل في البيئة المنزلية.", "Dedicate part of the sessions to educating the parents about language delay, indirect language stimulation techniques, and increasing interaction in the home environment.", { short: "تثقيف الأهل" }),
    O("screen", "تقليل وقت التعرض للشاشات واستبداله بأنشطة تفاعلية.", "Reduce screen time and replace it with interactive activities.", { short: "تقليل الشاشات" }),
    O("hearing", "إجراء تقييم سمعي شامل.", "Complete a comprehensive audiological evaluation.", { short: "تقييم سمعي" }),
    O("ot", "إحالة لتقييم العلاج الوظيفي.", "Referral for an occupational therapy evaluation.", { short: "إحالة علاج وظيفي" }),
    O("psych", "إحالة لتقييم نفسي / نمائي.", "Referral for a psychological / developmental evaluation.", { short: "إحالة نفسي/نمائي" }),
    O("aba", "إحالة لتقييم تعديل السلوك.", "Referral for a behavioral (ABA) evaluation.", { short: "إحالة تعديل سلوك" }),
  ];

  const sevKey = (v) => (SEV.find((s) => s.v === v) || SEV[0]);

  const form = {
    kind: "evaluation",
    sections: [
      { id: "tools", title: L("1. أدوات التقييم", "1. Assessment Tools"), fields: [
        { id: "tools", type: "multi", label: L("الأدوات المستخدمة", "Tools used"), options: TOOLS },
        { id: "tools_other", type: "list", label: L("أدوات / اختبارات مقننة أخرى (سطر لكل أداة)", "Other tools (one per line)") },
      ] },
      { id: "oral", title: L("2. تقييم الوجه والفكين", "2. Oral-Facial Assessment"), fields: [
        { id: "oral", type: "matrix", label: L("كل البنود «طبيعي» تلقائياً — غيّر فقط ما هو غير طبيعي واكتب الملاحظة", ""), rows: ORAL.map(([v, ar, en]) => O(v, ar, en)), groups: [{ key: "s", options: ORAL_STATUS }], note: true },
      ] },
      { id: "observation", title: L("3. الملاحظة المباشرة وغير المباشرة", "3. Direct and Indirect Observation"), fields: [
        { id: "duration", type: "single", label: L("مدة التقييم", "Duration"), options: DURATION },
        { id: "obs", type: "multi", label: L("الملاحظات (تُكتب كجمل كاملة في التقرير)", "Observations"), options: OBS, chipLabel: "short" },
        { id: "obs_other", type: "list", label: L("ملاحظات إضافية (سطر لكل ملاحظة)", "Additional observations") },
      ] },
      { id: "langtest", title: L("4. اختبار التطور اللغوي", "4. Language Development Test"), fields: [
        { id: "langtest_applied", type: "single", label: L("هل طُبّق الاختبار؟", ""), options: [O("yes", "نعم", "Yes"), O("no", "لا", "No")] },
        { id: "sem", type: "matrix", label: L("I. جانب دلالة الألفاظ (المعاني)", ""), rows: SEM, rowLabel: "short", groups: [{ key: "id", label: "التعرّف", options: ID3 }, { key: "name", label: "التسمية", options: NAME3 }], show: (d) => d.langtest_applied !== "no" },
        { id: "sem_notes", type: "list", label: L("ملاحظات إضافية للجانب الدلالي", ""), show: (d) => d.langtest_applied !== "no" },
        { id: "gram_assessed", type: "single", label: L("II. الجانب القواعدي (النحوي والصرفي)", ""), options: [O("yes", "تم تقييمه", "Assessed"), O("no", "لم يُقيّم لعدم وجود كفاية لغوية", "Not assessed")], show: (d) => d.langtest_applied !== "no" },
        { id: "gram", type: "matrix", label: L("البنود النحوية", ""), rows: GRAM, groups: [{ key: "u", options: USE3 }], show: (d) => d.langtest_applied !== "no" && d.gram_assessed === "yes" },
        { id: "prag", type: "matrix", label: L("III. الجانب الاستخدامي (العملي)", ""), rows: PRAG, groups: [{ key: "r", options: YES3 }], show: (d) => d.langtest_applied !== "no" },
        { id: "prag_notes", type: "list", label: L("ملاحظات إضافية للجانب الاستخدامي", ""), show: (d) => d.langtest_applied !== "no" },
      ] },
      { id: "artic", title: L("5. النطق", "5. Articulation"), fields: [
        { id: "artic", type: "single", label: L("اختبار نطق الأصوات اللغوية", ""), options: ARTIC },
        { id: "artic_reason", type: "text", label: L("السبب", ""), show: (d) => d.artic === "not_other" },
        { id: "intel", type: "single", label: L("وضوح الكلام", ""), options: INTEL, show: (d) => d.artic === "applied" },
        { id: "errors", type: "multi", label: L("أنواع الأخطاء", ""), options: ERR, show: (d) => d.artic === "applied" },
        { id: "processes", type: "multi", label: L("العمليات الصوتية", ""), options: PROC, show: (d) => d.artic === "applied" },
        { id: "sounds", type: "text", label: L("الأصوات المتأثرة (مثال: /ر/ /س/ /ك/)", ""), show: (d) => d.artic === "applied" },
        { id: "artic_notes", type: "textarea", label: L("ملاحظات النطق", ""), show: (d) => d.artic === "applied" },
      ] },
      { id: "langage", title: L("العمر اللغوي التطوري", "Developmental Language Age"), fields: [
        { id: "age_rec_y", type: "number", label: L("العمر الاستقبالي — سنوات", "") },
        { id: "age_rec_m", type: "number", label: L("العمر الاستقبالي — أشهر", "") },
        { id: "age_exp_y", type: "number", label: L("العمر التعبيري — سنوات", "") },
        { id: "age_exp_m", type: "number", label: L("العمر التعبيري — أشهر", "") },
        { id: "age_margin", type: "single", label: L("هامش التقدير (± أشهر)", ""), options: NUMS([1, 2, 3, 6]) },
      ] },
      { id: "dx", title: L("سابعاً: الخلاصة والتشخيص", "Seventh: Summary and Diagnosis"), fields: [
        { id: "sev_rec", type: "single", label: L("تأخر اللغة الاستقبالية", ""), options: SEV },
        { id: "sev_exp", type: "single", label: L("تأخر اللغة التعبيرية", ""), options: SEV },
        { id: "dx_other", type: "multi", label: L("تشخيصات أخرى", ""), options: OTHER_DX },
        { id: "dx_custom", type: "text", label: L("صياغة يدوية للتشخيص بالعربي (اختياري — تحل محل الصياغة التلقائية)", "") },
        { id: "dx_custom_en", type: "text", label: L("صياغة يدوية للتشخيص بالإنجليزي (اختياري)", ""), ltr: true },
      ] },
      { id: "prognosis", title: L("ثامناً: احتمالية التحسن", "Eighth: Prognosis"), fields: [
        { id: "prog_factors", type: "multi", label: L("أداء الطفل في الجلسات التجريبية", ""), options: PROG_FACTORS },
        { id: "prog_support", type: "multi", label: L("عوامل داعمة", ""), options: PROG_SUPPORT },
        { id: "prognosis", type: "single", label: L("إمكانية التحسن", ""), options: PROGNOSIS },
      ] },
      { id: "recs", title: L("تاسعاً: التوصيات", "Ninth: Recommendations"), fields: [
        { id: "sessions", type: "single", label: L("عدد الجلسات أسبوعياً", ""), options: NUMS([1, 2, 3, 4, 5]) },
        { id: "min_months", type: "single", label: L("لفترة لا تقل عن (أشهر)", ""), options: NUMS([3, 6, 9, 12]) },
        { id: "plan_months", type: "single", label: L("مدة الخطة العلاجية الفردية (أشهر)", ""), options: NUMS([3, 6, 9, 12]) },
        { id: "mid_review", type: "single", label: L("إعادة تقييم عند منتصف المدة", ""), options: [O("yes", "نعم", "Yes"), O("no", "لا", "No")] },
        { id: "reassess", type: "single", label: L("إعادة تقييم شامل بعد (أشهر)", ""), options: NUMS([3, 6, 9, 12]) },
        { id: "recs", type: "multi", label: L("توصيات إضافية", ""), options: RECS, chipLabel: "short" },
        { id: "recs_other", type: "list", label: L("توصيات أخرى (سطر لكل توصية)", "") },
      ] },
    ],

    defaults() {
      const oral = {}; ORAL.forEach(([v]) => { oral[v] = { s: "normal" }; });
      return {
        tools: ["case_history", "observation", "interview", "oral_exam", "lang_test"], oral, duration: "60", obs: [],
        langtest_applied: "yes", sem: {}, gram_assessed: "no", gram: {}, prag: {}, artic: "not_competence",
        age_margin: "3", sev_rec: "", sev_exp: "", dx_other: [], prog_factors: ["coop", "accept", "ready"], prog_support: ["home", "parents"],
        prognosis: "good", sessions: "3", min_months: "6", plan_months: "6", mid_review: "yes", reassess: "6", recs: ["enroll", "parents_attend", "parent_edu"],
      };
    },

    generate(d, ctx) {
      const lang = ctx.lang, ar = lang === "ar", pc = ctx.pc, p = ctx.patient;
      const G = (s) => gx(s, pc);
      const out = [];
      out.push("# " + (ctx.reeval ? (ar ? "تقرير إعادة تقييم" : "Re-Evaluation Report") : (ar ? "تقرير تقييم" : "Evaluation Report")));
      out.push("::info2");
      if (ar) {
        out.push(`الاسم: ${pc.full}`, `الجنسية: ${nationality(p.nationality, "ar")}`, `تاريخ الميلاد: ${dmy(p.dob)}`, `العمر الزمني: ${pc.age}`,
          `تاريخ كتابة التقرير: ${dmy(ctx.reportDate)}`, `رقم الملف: ${p.file_no}`, `المركز: ${ctx.centerShort}`);
      } else {
        out.push(`Name: ${pc.full}`, `Nationality: ${nationality(p.nationality, "en")}`, `Date of Birth: ${dmy(p.dob)}`, `Chronological Age: ${pc.age}`,
          `Report Date: ${dmy(ctx.reportDate)}`, `File No.: ${p.file_no}`, `Center: ${ctx.centerShort}`);
      }
      out.push("", "## " + (ar ? "التقييم" : "Assessment"));

      // 1. tools
      out.push("### " + (ar ? "1. أدوات التقييم:" : "1. Assessment Tools:"));
      lblMany(TOOLS, d.tools, lang, pc).forEach((t) => out.push(`- ${t}.`));
      lines(d.tools_other).forEach((t) => out.push(`- ${t}`));

      // 2. oral-facial
      out.push("### " + (ar ? "2. تقييم الوجه والفكين:" : "2. Oral-Facial Assessment:"));
      out.push("::grid2");
      ORAL.forEach(([v, lar, len, nar, nen]) => {
        const r = (d.oral || {})[v] || {};
        const s = r.s || "normal";
        let txt = s === "normal" ? (ar ? nar : nen) : s === "na" ? (ar ? "لم يتم تقييمه" : "Not assessed") : (r.note || (ar ? "غير طبيعي" : "Atypical"));
        if (s === "normal" && r.note) txt += (ar ? "، " : "; ") + r.note;
        if (v === "chewing" && s === "na") txt = ar ? "لم يتم تقييمه، ولا شكوى من هذا الجانب" : "Not assessed; no complaint in this area";
        out.push(`${ar ? lar : len}: ${txt}.`.replace(/\.\.$/, "."));
      });
      out.push("");

      // 3. observation
      out.push("### " + (ar ? "3. الملاحظة المباشرة وغير المباشرة:" : "3. Direct and Indirect Observation:"));
      const dur = lbl(DURATION, d.duration, lang, pc) || (ar ? "ساعة كاملة" : "a full hour");
      out.push(ar ? `تم التقييم في غرفة الاختصاصي، واستغرق ${dur}، وقد لوحظ خلالها ما يلي:` : `The assessment was conducted in the specialist's room and lasted ${dur}, during which the following was observed:`);
      lblMany(OBS, d.obs, lang, pc).forEach((t) => out.push(`- ${t}`));
      lines(d.obs_other).forEach((t) => out.push(`- ${G(t)}`));

      // 4. language test
      if (d.langtest_applied !== "no") {
        out.push("### " + (ar ? "4. اختبار التطور اللغوي:" : "4. Language Development Test:"));
        out.push(ar ? "**وهو اختبار لغوي (محكّي المرجع / غير مقنن) يُراعى فيه تطور الجوانب اللغوية الخمسة (الدلالي، النحوي، الصرفي، الفونولوجي، الاستخدامي) للأطفال الناطقين باللغة العربية.**"
          : "**A language test (criterion-referenced / non-standardized) that considers the development of the five language domains (semantics, syntax, morphology, phonology, pragmatics) in Arabic-speaking children.**");
        // I. semantics
        out.push("#### " + (ar ? "I. جانب دلالة الألفاظ (المعاني):" : "I. Semantics (Word Meanings):"));
        SEM.forEach((row) => {
          const r = (d.sem || {})[row.v] || {};
          if (!r.id && !r.name) return;
          out.push("- " + semSentence(row, r, lang, pc));
        });
        lines(d.sem_notes).forEach((t) => out.push(`- ${G(t)}`));
        // II. grammar
        out.push("#### " + (ar ? "II. الجانب القواعدي (النحوي والصرفي):" : "II. Grammar (Syntax and Morphology):"));
        out.push(G(ar ? "يشمل هذا الجانب قدرة {N} على ربط أكثر من مفردة معاً، والتلاعب بمحتوى الكلمات والظروف المكانية والضمائر البسيطة المتوقعة في هذا العمر وصيغ النفي والجمع وغيرها."
          : "This domain includes {N}'s ability to combine more than one word, manipulate word content, spatial adverbs, and simple pronouns expected at this age, as well as negation, plural forms, and others."));
        if (d.gram_assessed !== "yes") {
          out.push(G(ar ? "- لم يتم تقييم الجانب القواعدي (النحوي والصرفي) لعدم وجود الكفاية اللغوية {عند الطفل|عند الطفلة} التي تسمح بالتقييم."
            : "- The grammatical domain (syntax and morphology) was not assessed due to the child's lack of sufficient language competence to allow assessment."));
        } else {
          GRAM.forEach((row) => {
            const u = ((d.gram || {})[row.v] || {}).u; if (!u) return;
            const item = row[lang];
            out.push("- " + G(ar
              ? (u === "good" ? `{يستخدم|تستخدم} {N} ${item} بشكل مناسب.` : u === "partial" ? `{يستخدم|تستخدم} {N} ${item} بشكل جزئي وغير ثابت.` : `لا {يستخدم|تستخدم} {N} ${item} بعد.`)
              : (u === "good" ? `{N} uses ${item} appropriately.` : u === "partial" ? `{N} uses ${item} inconsistently.` : `{N} does not yet use ${item}.`)));
          });
        }
        // III. pragmatics
        out.push("#### " + (ar ? "III. الجانب الاستخدامي (العملي):" : "III. Pragmatics (Functional Use):"));
        PRAG.forEach((row) => {
          const r = ((d.prag || {})[row.v] || {}).r; if (!r) return;
          out.push("- " + G(row[r][lang]));
        });
        lines(d.prag_notes).forEach((t) => out.push(`- ${G(t)}`));
      }

      // 5. articulation
      out.push("### " + (ar ? "5. النطق:" : "5. Articulation:"));
      const testDesc = ar ? "اختبار نطق الأصوات اللغوية، وهو اختبار محكّي المرجع غير مقنن، ويحتوي على صور لمفردات مختلفة تشمل جميع الأصوات في (بداية الكلمة، وسط الكلمة، ونهاية الكلمة)."
        : "Speech sounds articulation test: a criterion-referenced, non-standardized test containing pictures of various words that cover all sounds in initial, medial, and final word positions.";
      if (d.artic === "not_competence") out.push(testDesc + (ar ? " لم يتم تطبيق الاختبار لعدم وجود كفاية لغوية تسمح بتطبيق الاختبار." : " The test was not administered due to insufficient language competence to allow its administration."));
      else if (d.artic === "not_other") out.push(testDesc + (ar ? ` لم يتم تطبيق الاختبار${d.artic_reason ? " بسبب " + d.artic_reason : ""}.` : ` The test was not administered${d.artic_reason ? " due to " + d.artic_reason : ""}.`));
      else {
        out.push(testDesc + (ar ? " وتبين ما يلي:" : " Results:"));
        if (d.intel) out.push(`- ${ar ? "وضوح الكلام: " : "Speech intelligibility: "}${lbl(INTEL, d.intel, lang, pc)}.`);
        const er = lblMany(ERR, d.errors, lang, pc); if (er.length) out.push(`- ${ar ? "أنواع الأخطاء: " : "Error types: "}${joinList(er, lang)}.`);
        const pr = lblMany(PROC, d.processes, lang, pc); if (pr.length) out.push(`- ${ar ? "العمليات الصوتية: " : "Phonological processes: "}${joinList(pr, lang)}.`);
        if (d.sounds) out.push(`- ${ar ? "الأصوات المتأثرة: " : "Sounds affected: "}${d.sounds}`);
        lines(d.artic_notes).forEach((t) => out.push(`- ${G(t)}`));
      }

      // developmental language age
      const ageTxt = (y, mo) => {
        y = Number(y) || 0; mo = Number(mo) || 0; if (!y && !mo) return "";
        return window.FC.ageString(null, null, lang, y * 12 + mo).replace("سنتان", "سنتين").replace("شهران", "شهرين");
      };
      const rA = ageTxt(d.age_rec_y, d.age_rec_m), eA = ageTxt(d.age_exp_y, d.age_exp_m);
      if (rA || eA) {
        const mg = Number(d.age_margin) || 3;
        const m = ar ? `± ${mg} ${mg <= 2 ? (mg === 1 ? "شهر" : "شهرين") : mg <= 10 ? "شهور" : "شهراً"}` : `± ${mg} month${mg === 1 ? "" : "s"}`;
        out.push("");
        out.push(G(ar ? `❖ استناداً إلى ما سبق، يمكن تقدير عمر {N} اللغوي التطوري (${[rA && `الاستقبالي حوالي ${rA} ${m}`, eA && `والتعبيري قرابة ${eA} ${m}`].filter(Boolean).join("، ")}).`
          : `❖ Based on the above, {N}'s developmental language age can be estimated (${[rA && `receptive approximately ${rA} ${m}`, eA && `expressive approximately ${eA} ${m}`].filter(Boolean).join(", and ")}).`));
      }

      // 7. diagnosis
      out.push("", "## " + (ar ? "سابعاً: الخلاصة والتشخيص:" : "Seventh: Summary and Diagnosis:"));
      out.push(G(ar ? "استنادًا لمجريات جلسة التقييم وخبرتنا المهنية، والفحوصات المباشرة وغير المباشرة، آخذين بعين الاعتبار إفادة وملاحظات الأهل، نستخلص بأن ({N}) {وعمره|وعمرها} {AGE}، {يبدي|تبدي} أعراضاً تتوافق مع:"
        : "Based on the course of the assessment session, our professional experience, and direct and indirect examinations, and taking into account the parents' report and observations, we conclude that ({N}), aged {AGE}, shows symptoms consistent with:"));
      const dx = diagnosis(d);
      if (ar) { if (dx.ar) out.push(`^^ ${dx.ar}`); if (dx.en) out.push(`^^ ${dx.en}`); }
      else if (dx.en) out.push(`^^ ${dx.en}`);

      // 8. prognosis
      out.push("", "## " + (ar ? "ثامناً: احتمالية التحسن:" : "Eighth: Prognosis:"));
      const f = lblMany(PROG_FACTORS, d.prog_factors, lang, pc), sp = lblMany(PROG_SUPPORT, d.prog_support, lang, pc);
      const pr = lbl(PROGNOSIS, d.prognosis, lang, pc) || (ar ? "جيدة" : "good");
      let para = "";
      if (f.length) para += G(ar ? `استناداً لنتائج التقييم وأداء {N} خلال الجلسات التشخيصية العلاجية، فقد {أظهر|أظهرت} {N} ${joinList(f, "ar")}. ` : `Based on the assessment results and {N}'s performance during the diagnostic-therapeutic sessions, {N} showed ${joinList(f, "en")}. `);
      if (sp.length) para += G(ar ? `ومع الإشارة إلى أن عمر {N} {AGE}، فإن ${joinList(sp, "ar")} تزيد من احتمالية نجاح التأهيل. ` : `Noting that {N} is {AGE} old, ${joinList(sp, "en")} increase the likelihood of successful rehabilitation. `);
      para += ar ? `وعليه؛ فإن إمكانية التحسن تُعتبر ${pr}، مع الأخذ بعين الاعتبار ضرورة التقييم المستمر للأداء والمعطيات المتعلقة بالشكوى الحالية.` : `Accordingly, the prognosis for improvement is considered ${pr}, taking into account the need for ongoing assessment of performance and of the data related to the current complaint.`;
      out.push(para);

      // 9. recommendations
      out.push("", "## " + (ar ? "تاسعاً: التوصيات" : "Ninth: Recommendations"));
      const recs = [];
      if ((d.recs || []).includes("enroll")) recs.push(lbl(RECS, "enroll", lang, pc));
      if (d.sessions) recs.push(ar ? `ينصح الاختصاصي ب${AR_COUNT[d.sessions] || d.sessions + " جلسات"} أسبوعياً${d.min_months ? `، ولفترة لا تقل عن ${d.min_months} شهور` : ""}.` : `The specialist recommends ${EN_COUNT[d.sessions] || d.sessions + " sessions"} per week${d.min_months ? ` for a period of no less than ${d.min_months} months` : ""}.`);
      if (d.plan_months) recs.push(ar ? `تحضير خطة علاجية فردية لمدة ${d.plan_months} شهور${d.mid_review === "yes" ? "، وإعادة التقييم بعد انقضاء نصف المدة للتأكد من فاعلية العلاج" : ""}.` : `Prepare an individualized treatment plan for ${d.plan_months} months${d.mid_review === "yes" ? ", with reassessment at the midpoint to ensure the effectiveness of therapy" : ""}.`);
      (d.recs || []).filter((v) => v !== "enroll").forEach((v) => recs.push(lbl(RECS, v, lang, pc)));
      if (d.reassess) recs.push(G(ar ? `إجراء إعادة تقييم شامل {للطفل|للطفلة} بعد ${d.reassess} شهور، لمراقبة التطور وتحديد مدى الحاجة لتجديد أو تمديد أو إيقاف البرنامج التأهيلي.` : `Conduct a comprehensive reassessment of the child after ${d.reassess} months to monitor progress and determine the need to renew, extend, or discontinue the rehabilitation program.`));
      lines(d.recs_other).forEach((t) => recs.push(G(t)));
      recs.forEach((t, i) => out.push(`${i + 1}. ${t}`));
      out.push(...endOfReport(ctx));
      return out.join("\n");
    },
  };

  function semSentence(row, r, lang, pc) {
    const ar = lang === "ar", item = row[lang];
    let s;
    if (ar) {
      s = r.id === "none" ? `لم {يتعرّف|تتعرّف} {N} على ${item}` : r.id === "some" ? `{تعرّف|تعرّفت} {N} على بعض ${item} بشكل مناسب` : `{تعرّف|تعرّفت} {N} على ${item} بشكل مناسب`;
      if (r.name === "all") s += "، {وسمّاها|وسمّتها}"; else if (r.name === "some") s += "، {وسمّى|وسمّت} بعضها"; else if (r.name === "none") s += "، {ولم يسمّها|ولم تسمّها}";
    } else {
      s = r.id === "none" ? `{N} did not identify ${item}` : r.id === "some" ? `{N} identified some of ${item} appropriately` : `{N} identified ${item} appropriately`;
      if (r.name === "all") s += ", and named them"; else if (r.name === "some") s += ", and named some of them"; else if (r.name === "none") s += ", but did not name them";
    }
    return gx(s + ".", pc);
  }

  function diagnosis(d) {
    if (d.dx_custom || d.dx_custom_en) return { ar: d.dx_custom || "", en: d.dx_custom_en || "" };
    const r = sevKey(d.sev_rec), e = sevKey(d.sev_exp);
    let ar = "", en = "";
    if (r.v && e.v) {
      if (r.v === e.v) { ar = `تأخر لغوي استقبالي وتعبيري ${r.ar}`; en = `${r.en} Receptive & Expressive Language Delay`; }
      else { ar = `تأخر لغوي استقبالي ${r.ar} وتعبيري ${e.ar}`; en = `${r.en} Receptive & ${e.en} Expressive Language Delay`; }
    } else if (r.v) { ar = `تأخر لغة استقبالية ${r.ar}`; en = `${r.en} Receptive Language Delay`; }
    else if (e.v) { ar = `تأخر لغة تعبيرية ${e.ar}`; en = `${e.en} Expressive Language Delay`; }
    const other = (d.dx_other || []).map((v) => OTHER_DX.find((o) => o.v === v)).filter(Boolean);
    const arAll = [ar, ...other.map((o) => o.ar)].filter(Boolean), enAll = [en, ...other.map((o) => o.en)].filter(Boolean);
    return { ar: arAll.join(" + "), en: enAll.join(" + ") };
  }

  form.diagnosis = diagnosis;
  window.Forms.evaluation = form;
})();
