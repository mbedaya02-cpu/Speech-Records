# سجلات قسم النطق واللغة — بداية / ألباين

نظام لملفات المرضى والخطط والتقارير وتذكيرات التجديد لقسم النطق واللغة.

- **الموقع (الواجهة):** مجلد `docs/`، ويُنشر مجاناً على **GitHub Pages**.
- **الخادم وقاعدة البيانات:** مجلد `apps-script/`، ويعمل على **Google Apps Script + Google Sheets** من حسابك.

> ⚠️ **نسخة تجريبية ببيانات وهمية فقط.** بيانات Google محفوظة خارج الإمارات. لا تُدخل بيانات مرضى حقيقية قبل موافقة الإدارة ومراجعة متطلبات ADHICS.

---

## الجزء 1: الخادم (Apps Script) — مرة واحدة، حوالي 10 دقائق

1. افتح **script.google.com** ← **New project** (مشروع جديد) ← سمّه `Speech Records`.
2. **ملف الإعدادات:** ⚙️ **Project Settings** ← فعّل **Show "appsscript.json" manifest file in editor**. ارجع للمحرر، افتح `appsscript.json`، احذف ما فيه والصق محتوى `apps-script/appsscript.json`.
3. **ملفات الكود:** اضغط **+** بجانب Files ← **Script**، وأنشئ هذه الملفات (الاسم بدون `.gs`)، والصق في كل ملف محتوى الملف المقابل من مجلد `apps-script/`:
   `Code` · `Db` · `Filter` · `Auth` · `Rules` · `Reminders` · `Setup` · `Logos`
   (احذف محتوى ملف `Code.gs` الافتراضي أولاً.)
4. **التهيئة:** من القائمة العلوية اختر الدالة **`setup`** ← **Run**:
   - اضغط **Review permissions** ← اختر حسابك ← **Advanced** ← **Go to Speech Records (unsafe)** ← **Allow**. هذا طبيعي لأن السكربت ملكك.
   - افتح **Execution log** وانسخ **كلمة مرور المدير** (اسم المستخدم: `admin`).
   - سيتم إنشاء ملف Google Sheet اسمه **Speech Records - Database** في Drive.
5. *(اختياري للتجربة)* شغّل الدالة **`seedDemo`**، فتُضاف 6 حالات وهمية وحسابا `therapist1` و`therapist2` (كلمة المرور `Demo@12345`).
6. **النشر:** **Deploy** ← **New deployment** ← ⚙️ ← **Web app**:
   - **Execute as:** Me
   - **Who has access:** Anyone
   - **Deploy**، ثم انسخ **Web app URL** (ينتهي بـ `/exec`).

> كلما عدّلت كود Apps Script لاحقاً: **Deploy ← Manage deployments ← ✏️ ← Version: New version ← Deploy**. بدون هذه الخطوة يبقى الرابط على النسخة القديمة.

---

## الجزء 2: الموقع على GitHub Pages — حوالي 5 دقائق

1. على **github.com** ← **New repository** ← الاسم مثلاً `speech-records` ← **Public** ← **Create repository**.
   (GitHub Pages المجاني يتطلب أن يكون المستودع Public. الكود لا يحتوي أي بيانات أو كلمات مرور، فكل البيانات في Google Sheet الخاص بك.)
2. اضغط **uploading an existing file**، واسحب **كل محتويات** هذا المجلد (`docs`، `apps-script`، `README.md`، `.gitignore`) ← **Commit changes**.
3. **Settings** ← **Pages** ← **Source:** Deploy from a branch ← **Branch:** `main` ومجلد **`/docs`** ← **Save**.
4. بعد دقيقة إلى دقيقتين يظهر الرابط: `https://اسم-حسابك.github.io/speech-records/`

## الجزء 3: الربط

- افتح رابط GitHub Pages، فتظهر شاشة **ربط الخادم**. الصق رابط `/exec` ← **اتصال**.
  (أو ضع الرابط مرة واحدة في `docs/config.js` داخل `apiUrl`، ليفتح مباشرة على كل الأجهزة.)
- ادخل بـ `admin` وكلمة المرور من الخطوة 4.
- **غيّر كلمة المرور فوراً:** المستخدمون ← تعديل.

---

## الاستخدام

- **المستخدمون:** أضف كل أخصائي (اسم مستخدم + كلمة مرور + الدور + المراكز + إيميل لاستلام التذكيرات).
- **المرضى:** مريض جديد ← المركز، رقم الملف، الاسم، **الجنس** (يحدد صياغة التقارير)، الأخصائي.
- **الخطط والتقارير:** من ملف المريض ← اختر من الخيارات ← **توليد النص** ← راجع ← **حفظ** ← **Word** أو **PDF**.
- **النماذج:** معاينة أي نموذج على مريض تجريبي بدون حفظ.
- **التذكيرات:** في الصفحة الرئيسية + إيميل يومي الساعة 8:00 من حساب Gmail (قبل الموعد بيوم وحتى 5 أيام بعده).
- **المرفقات:** تُحفظ في مجلد **Speech Records - Attachments** في Drive.

## ملاحظات

- **قاعدة البيانات** هي ملف Google Sheet، وكل تبويب فيه جدول. **لا تعدّل الأعمدة `_json` يدوياً**؛ فهي المصدر الحقيقي للبيانات، والأعمدة الأخرى للعرض فقط.
- **نسيت كلمة مرور المدير؟** شغّل الدالة `resetAdminPassword` في Apps Script وانسخ الجديدة من Execution log.
- **الحدود:** Apps Script مناسب لقسم واحد (عشرات المستخدمين ومئات المرضى). كل عملية تستغرق 1–3 ثوانٍ.
- **النسخ الاحتياطي:** File ← Make a copy لملف الـ Sheet دورياً، أو File ← Download.

## بنية المشروع

```
apps-script/   Code.gs (API) · Db.gs (Sheets) · Filter.gs · Auth.gs · Rules.gs (الصلاحيات)
               Reminders.gs (التذكيرات) · Setup.gs (التهيئة) · Logos.gs · appsscript.json
docs/          index.html · app.js · app.css · gas-client.js (الاتصال بالخادم) · config.js
               forms-common.js · form-evaluation.js · form-initial.js · form-plan.js · form-reports.js
               export.js (Word/PDF) · docx.iife.js (مكتبة Word)
```
