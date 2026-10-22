// =====================================================================
//  Word (.docx) and PDF export in the department's template style.
//
//  Markup produced by the forms (and editable by the therapist):
//    # Title                centered bold title
//    ## Heading             bold section heading
//    ### Sub-heading        bold + underlined
//    #### Sub-sub-heading   bold + underlined (indented)
//    - item                 bullet
//    1. item                numbered line
//    ^^ text                centered bold line
//    **text**               bold (whole line or inline)
//    ::info2 / ::info4 / ::grid2   block of "Label: value" lines until a blank line
//         info2 = 2 cells per row, "Label: value" bold, grey (evaluation / progress header)
//         info4 = label | value | label | value, labels shaded blue (plan / initial header)
//         grid2 = 2 cells per row, label bold (oral-facial table)
//    | a | b | c |          table; first row = header (shaded)
// =====================================================================
(function () {
  const INFO2_FILL = "F2F2F2", INFO4_FILL = "9CC2E5", HEAD_FILL = "9CC2E5";

  function parse(text) {
    const src = String(text || "").split(/\r?\n/);
    const blocks = [];
    let i = 0;
    while (i < src.length) {
      const line = src[i].replace(/\s+$/, "");
      const t = line.trim();
      if (!t) { i++; continue; }
      const m = t.match(/^::(info2|info4|grid2)$/);
      if (m) {
        const rows = []; i++;
        while (i < src.length && src[i].trim() && !src[i].trim().startsWith("#") && !src[i].trim().startsWith("::")) {
          const s = src[i].trim(); const k = s.indexOf(":");
          rows.push(k > 0 ? [s.slice(0, k).trim(), s.slice(k + 1).trim()] : ["", s]);
          i++;
        }
        blocks.push({ t: m[1], rows }); continue;
      }
      if (t.startsWith("|")) {
        const rows = [];
        while (i < src.length && src[i].trim().startsWith("|")) {
          const cells = src[i].trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
          if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
          i++;
        }
        blocks.push({ t: "table", rows }); continue;
      }
      if (t.startsWith("#### ")) blocks.push({ t: "h4", text: t.slice(5) });
      else if (t.startsWith("### ")) blocks.push({ t: "h3", text: t.slice(4) });
      else if (t.startsWith("## ")) blocks.push({ t: "h2", text: t.slice(3) });
      else if (t.startsWith("# ")) blocks.push({ t: "title", text: t.slice(2) });
      else if (t.startsWith("^^ ")) blocks.push({ t: "center", text: t.slice(3) });
      else if (/^[-•]\s+/.test(t)) blocks.push({ t: "bullet", text: t.replace(/^[-•]\s+/, "") });
      else if (/^\d+[.)]\s+/.test(t)) blocks.push({ t: "num", n: t.match(/^(\d+)/)[1], text: t.replace(/^\d+[.)]\s+/, "") });
      else blocks.push({ t: "p", text: t });
      i++;
    }
    return blocks;
  }

  // "**bold** rest" -> [{t, b}]
  function inline(text) {
    const parts = []; const re = /\*\*(.+?)\*\*/g; let last = 0, m;
    while ((m = re.exec(text))) { if (m.index > last) parts.push({ t: text.slice(last, m.index), b: false }); parts.push({ t: m[1], b: true }); last = re.lastIndex; }
    if (last < text.length) parts.push({ t: text.slice(last), b: false });
    return parts.length ? parts : [{ t: "", b: false }];
  }
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const inlineHtml = (s) => inline(s).map((p) => (p.b ? `<b>${esc(p.t)}</b>` : esc(p.t))).join("");
  const isSigTable = (rows) => rows.length && rows[0].some((c) => /التوقيع|Signature/.test(c));
  const contactLine = (c, rtl) => [c && c.phone, c && c.whatsapp && (rtl ? "واتساب: " : "WhatsApp: ") + c.whatsapp, c && c.email, c && c.address].filter(Boolean).join("   |   ");

  // ------------------------------------------------------------------ PDF (print)
  function toPrintHtml(text, opts) {
    const { lang, center, logoUrl, docTitle } = opts;
    const rtl = lang === "ar";
    const body = parse(text).map((b) => {
      switch (b.t) {
        case "title": return `<h1>${inlineHtml(b.text)}</h1>`;
        case "h2": return `<h2>${inlineHtml(b.text)}</h2>`;
        case "h3": return `<h3>${inlineHtml(b.text)}</h3>`;
        case "h4": return `<h4>${inlineHtml(b.text)}</h4>`;
        case "center": return `<p class="center"><b>${inlineHtml(b.text)}</b></p>`;
        case "bullet": return `<p class="bullet">${inlineHtml(b.text)}</p>`;
        case "num": return `<p class="num"><span>${esc(b.n)}.</span> ${inlineHtml(b.text)}</p>`;
        case "p": return `<p>${inlineHtml(b.text)}</p>`;
        case "info2": case "grid2": {
          let r = ""; for (let i = 0; i < b.rows.length; i += 2) {
            const c = (x) => (x ? (b.t === "info2" ? `<td class="i2"><b>${esc(x[0])}${x[0] ? ":" : ""} ${esc(x[1])}</b></td>` : `<td><b>${esc(x[0])}${x[0] ? ":" : ""}</b> ${esc(x[1])}</td>`) : `<td class="${b.t === "info2" ? "i2" : ""}"></td>`);
            r += `<tr>${c(b.rows[i])}${c(b.rows[i + 1])}</tr>`;
          }
          return `<table class="${b.t}">${r}</table>`;
        }
        case "info4": {
          let r = ""; for (let i = 0; i < b.rows.length; i += 2) {
            const a = b.rows[i], c = b.rows[i + 1] || ["", ""];
            r += `<tr><th>${esc(a[0])}</th><td>${esc(a[1])}</td><th>${esc(c[0])}</th><td>${esc(c[1])}</td></tr>`;
          }
          return `<table class="info4">${r}</table>`;
        }
        case "table": {
          const [h, ...rest] = b.rows; const sig = isSigTable(b.rows);
          return `<table class="grid${sig ? " sig" : ""}"><thead><tr>${h.map((c) => `<th>${inlineHtml(c)}</th>`).join("")}</tr></thead><tbody>${rest.map((r) => `<tr>${h.map((_, k) => `<td>${inlineHtml(r[k] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
        }
      }
      return "";
    }).join("\n");
    const names = center ? `<div class="cn">${esc(center.name_ar)}</div><div class="cn en">${esc(center.name_en || "")}</div>` : "";
    return `<!doctype html><html lang="${lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${esc(docTitle || "")}</title>
<style>
  @page { size: A4; margin: 12mm 13mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", "Traditional Arabic", "Arial", serif; font-size: 12pt; line-height: 1.5; color: #000; margin: 0; }
  .lh { text-align: center; margin-bottom: 8px; }
  .lh img { height: 72px; width: auto; }
  .cn { font-weight: bold; font-size: 14pt; } .cn.en { font-size: 11pt; direction: ltr; }
  h1 { font-size: 15pt; text-align: center; margin: 4px 0 10px; }
  h2 { font-size: 13pt; margin: 14px 0 4px; page-break-after: avoid; }
  h3 { font-size: 12pt; margin: 10px 0 3px; text-decoration: underline; page-break-after: avoid; }
  h4 { font-size: 12pt; margin: 8px 18px 3px; text-decoration: underline; page-break-after: avoid; }
  p { margin: 0 0 4px; text-align: justify; }
  p.center { text-align: center; margin: 6px 0; }
  p.bullet { padding-${rtl ? "right" : "left"}: 22px; position: relative; }
  p.bullet::before { content: "•"; position: absolute; ${rtl ? "right" : "left"}: 6px; }
  p.num { padding-${rtl ? "right" : "left"}: 22px; } p.num span { display: inline-block; min-width: 18px; margin-${rtl ? "right" : "left"}: -22px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; }
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid #000; padding: 4px 6px; text-align: ${rtl ? "right" : "left"}; vertical-align: top; font-size: 11pt; }
  table.info2 td.i2 { background: #${INFO2_FILL}; text-align: center; width: 50%; }
  table.grid2 td { width: 50%; }
  table.info4 th { background: #${INFO4_FILL}; width: 18%; font-weight: normal; }
  table.info4 td { width: 32%; }
  table.grid th { background: #${HEAD_FILL}; font-weight: bold; text-align: center; }
  table.sig td { height: 46px; }
  .foot { position: fixed; bottom: -11mm; left: 0; right: 0; text-align: center; font-size: 8pt; color: #555; }
</style></head><body>
<div class="lh">${logoUrl ? `<img src="${esc(logoUrl)}" alt="">` : names}</div>
${body}
<div class="foot">${esc(contactLine(center, rtl))}${center && center.footer_note ? "<br>" + esc(center.footer_note) : ""}</div>
<script>window.onload=()=>{setTimeout(()=>window.print(),350)}<\/script>
</body></html>`;
  }

  function exportPdf(text, opts) {
    const w = window.open("", "_blank");
    if (!w) { alert(opts.lang === "ar" ? "اسمح بالنوافذ المنبثقة لهذا الموقع ثم أعد المحاولة." : "Please allow pop-ups and try again."); return; }
    w.document.open(); w.document.write(toPrintHtml(text, opts)); w.document.close();
  }

  // ------------------------------------------------------------------ Word (.docx)
  async function buildDocx(text, opts) {
    const d = window.docx;
    const { lang, center, logo } = opts;
    const rtl = lang === "ar";
    const FONT = "Times New Roman", SZ = 24;
    const AL = rtl ? d.AlignmentType.RIGHT : d.AlignmentType.LEFT;
    const runs = (txt, o = {}) => inline(txt).map((p) => new d.TextRun({ text: p.t, bold: o.bold || p.b, boldComplexScript: o.bold || p.b, underline: o.underline ? {} : undefined,
      font: { ascii: FONT, hAnsi: FONT, cs: FONT }, size: o.size || SZ, sizeComplexScript: o.size || SZ, rightToLeft: rtl, color: o.color }));
    const P = (txt, o = {}) => new d.Paragraph({
      bidirectional: rtl, alignment: o.align || (o.justify ? d.AlignmentType.JUSTIFIED : AL),
      spacing: { before: o.before || 0, after: o.after ?? 80, line: 276 }, keepNext: !!o.keepNext,
      indent: o.indent ? (rtl ? { right: o.indent, hanging: o.hanging || 0 } : { left: o.indent, hanging: o.hanging || 0 }) : undefined,
      children: runs(txt, o),
    });
    const B = { style: d.BorderStyle.SINGLE, size: 4, color: "000000" };
    const borders = { top: B, bottom: B, left: B, right: B };
    const C = (txt, o = {}) => new d.TableCell({
      borders, width: o.w ? { size: o.w, type: d.WidthType.PERCENTAGE } : undefined,
      shading: o.fill ? { fill: o.fill, type: d.ShadingType.CLEAR, color: "auto" } : undefined,
      margins: { top: 40, bottom: 40, left: 80, right: 80 }, verticalAlign: d.VerticalAlign.CENTER,
      children: [P(txt, { bold: o.bold, size: o.size || 22, after: 0, align: o.center ? d.AlignmentType.CENTER : undefined })],
    });
    const T = (rows, widths) => new d.Table({ width: { size: 100, type: d.WidthType.PERCENTAGE }, visuallyRightToLeft: rtl, rows,
      columnWidths: widths ? widths.map((w) => Math.round(w * 95)) : undefined });

    const kids = [];
    for (const b of parse(text)) {
      switch (b.t) {
        case "title": kids.push(P(b.text, { bold: true, size: 30, align: d.AlignmentType.CENTER, after: 160 })); break;
        case "h2": kids.push(P(b.text, { bold: true, size: 26, before: 200, after: 60, keepNext: true })); break;
        case "h3": kids.push(P(b.text, { bold: true, underline: true, before: 120, after: 40, keepNext: true })); break;
        case "h4": kids.push(P(b.text, { bold: true, underline: true, before: 100, after: 40, keepNext: true, indent: 360 })); break;
        case "center": kids.push(P(b.text, { bold: true, align: d.AlignmentType.CENTER, before: 60, after: 60 })); break;
        case "bullet": kids.push(new d.Paragraph({ bidirectional: rtl, alignment: d.AlignmentType.JUSTIFIED, spacing: { after: 40, line: 276 },
          indent: rtl ? { right: 540, hanging: 270 } : { left: 540, hanging: 270 }, children: [new d.TextRun({ text: "•\t", font: FONT, size: SZ, rightToLeft: rtl }), ...runs(b.text)],
          tabStops: [{ type: rtl ? d.TabStopType.RIGHT : d.TabStopType.LEFT, position: 540 }] })); break;
        case "num": kids.push(P(`${b.n}. ${b.text}`, { indent: 360, hanging: 360, after: 40, justify: true })); break;
        case "p": kids.push(P(b.text, { justify: true })); break;
        case "info2": case "grid2": {
          const rows = [];
          for (let i = 0; i < b.rows.length; i += 2) {
            const cellOf = (x) => x ? (b.t === "info2" ? C(`**${x[0]}${x[0] ? ":" : ""} ${x[1]}**`, { fill: INFO2_FILL, w: 50, center: true }) : C(`**${x[0]}${x[0] ? ":" : ""}** ${x[1]}`, { w: 50 }))
              : C("", { fill: b.t === "info2" ? INFO2_FILL : undefined, w: 50 });
            rows.push(new d.TableRow({ cantSplit: true, children: [cellOf(b.rows[i]), cellOf(b.rows[i + 1])] }));
          }
          kids.push(T(rows, [50, 50]), P("", { after: 60 })); break;
        }
        case "info4": {
          const rows = [];
          for (let i = 0; i < b.rows.length; i += 2) {
            const a = b.rows[i], c = b.rows[i + 1] || ["", ""];
            rows.push(new d.TableRow({ cantSplit: true, height: { value: 420, rule: d.HeightRule.ATLEAST }, children: [
              C(a[0], { fill: INFO4_FILL, w: 18 }), C(a[1], { w: 32 }), C(c[0], { fill: INFO4_FILL, w: 18 }), C(c[1], { w: 32 }),
            ] }));
          }
          kids.push(T(rows, [18, 32, 18, 32]), P("", { after: 60 })); break;
        }
        case "table": {
          const n = Math.max(...b.rows.map((r) => r.length));
          const sig = isSigTable(b.rows);
          const avg = Array.from({ length: n }, (_, k) => b.rows.reduce((s, r) => s + Math.min(70, (r[k] || "").length), 0) / b.rows.length + 4);
          const tot = avg.reduce((s, x) => s + x, 0);
          const isDateCol = (k) => b.rows.slice(1).some((r) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test((r[k] || "").trim()));
          let widths = avg.map((x, k) => Math.max(isDateCol(k) ? 13 : 8, Math.round((x / tot) * 100)));
          const sum = widths.reduce((s, x) => s + x, 0);
          if (sum > 100) { const big = widths.indexOf(Math.max(...widths)); widths[big] -= sum - 100; }
          const rows = b.rows.map((r, ri) => new d.TableRow({
            tableHeader: ri === 0, cantSplit: true, height: sig && ri > 0 ? { value: 700, rule: d.HeightRule.ATLEAST } : undefined,
            children: Array.from({ length: n }, (_, k) => C(r[k] || "", ri === 0 ? { fill: HEAD_FILL, bold: true, center: true, w: widths[k], size: 20 } : { w: widths[k], size: 20 })),
          }));
          kids.push(T(rows, widths), P("", { after: 60 })); break;
        }
      }
    }

    // Header: centered logo (or names), like the templates
    const head = [];
    if (logo && logo.data) {
      const h = 62, w = Math.round((logo.w / logo.h) * h);
      head.push(new d.Paragraph({ alignment: d.AlignmentType.CENTER, children: [new d.ImageRun({ data: logo.data, type: logo.type, transformation: { width: w, height: h } })] }));
    } else if (center) {
      head.push(P(center.name_ar, { bold: true, size: 28, align: d.AlignmentType.CENTER, after: 0 }));
      if (center.name_en) head.push(new d.Paragraph({ alignment: d.AlignmentType.CENTER, children: [new d.TextRun({ text: center.name_en, bold: true, size: 22, font: FONT })] }));
    }
    const pageWord = rtl ? ["صفحة ", " من "] : ["Page ", " of "];
    const foot = [
      new d.Paragraph({ alignment: d.AlignmentType.CENTER, bidirectional: rtl, children: [
        new d.TextRun({ text: pageWord[0], size: 18, font: FONT, rightToLeft: rtl }), new d.TextRun({ children: [d.PageNumber.CURRENT], size: 18, font: FONT }),
        new d.TextRun({ text: pageWord[1], size: 18, font: FONT, rightToLeft: rtl }), new d.TextRun({ children: [d.PageNumber.TOTAL_PAGES], size: 18, font: FONT }),
      ] }),
    ];
    const cl = contactLine(center, rtl);
    if (cl) foot.push(new d.Paragraph({ alignment: d.AlignmentType.CENTER, bidirectional: rtl, children: [new d.TextRun({ text: cl, size: 15, color: "555555", font: FONT, rightToLeft: rtl })] }));
    if (center && center.footer_note) foot.push(new d.Paragraph({ alignment: d.AlignmentType.CENTER, bidirectional: rtl, children: [new d.TextRun({ text: center.footer_note, size: 15, color: "555555", font: FONT, rightToLeft: rtl })] }));

    return new d.Document({
      creator: "Speech Records",
      styles: { default: { document: { run: { font: FONT, size: SZ } } } },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1950, bottom: 1100, left: 900, right: 900, header: 500, footer: 450 } } },
        headers: { default: new d.Header({ children: head }) },
        footers: { default: new d.Footer({ children: foot }) },
        children: kids,
      }],
    });
  }

  async function loadLogo(url) {
    if (!url) return null;
    try {
      const buf = await (await fetch(url)).arrayBuffer();
      const dims = await new Promise((res) => { const im = new Image(); im.onload = () => res([im.width, im.height]); im.onerror = () => res([300, 80]); im.src = url; });
      return { data: buf, w: dims[0], h: dims[1], type: (/\.png($|\?)/i.test(url) || /^data:image\/png/i.test(url)) ? "png" : "jpg" };
    } catch (_) { return null; }
  }

  async function exportDocx(text, opts) {
    const logo = opts.logo || (await loadLogo(opts.logoUrl));
    const doc = await buildDocx(text, { ...opts, logo });
    const blob = await window.docx.Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (opts.fileName || "document") + ".docx";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  window.DocExport = { parse, inline, toPrintHtml, exportPdf, exportDocx, buildDocx };
})();
