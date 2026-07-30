/*
 * Renders the agreement markdown into a print-ready HTML (US Letter) for Chromium print-to-PDF.
 *   node build_html.js <input.md> <output.html>
 */
const fs = require("fs");
const [, , mdPath, outPath] = process.argv;

let md = fs
  .readFileSync(mdPath, "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/^\s*```.*$/gm, "")
  .replace(/<br\s*\/?>/gi, "")
  .replace(/<\/?(?:p|div|span|em|strong|u|b|i)\b[^>]*>/gi, "");

const esc = (s) => s.replace(/&(?!(amp|lt|gt|nbsp|mdash|ndash);)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) =>
  esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/(_{8,})/g, '<span class="blank">$1</span>');

const lines = md.split("\n");
const out = [];
let title = "Consultation Fee Agreement";
let inList = false;
const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };

for (let i = 0; i < lines.length; i++) {
  const raw = lines[i];
  const line = raw.trim();
  if (!line) { closeList(); continue; }

  if (/^#\s+/.test(line) && out.length === 0) { title = line.replace(/^#\s+/, "").trim(); continue; }
  if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { closeList(); out.push('<hr>'); continue; }
  if (/^###\s+/.test(line)) { closeList(); out.push(`<h3>${inline(line.replace(/^###\s+/, ""))}</h3>`); continue; }
  if (/^##\s+/.test(line)) { closeList(); out.push(`<h2>${inline(line.replace(/^##\s+/, ""))}</h2>`); continue; }
  if (/^#\s+/.test(line)) { closeList(); out.push(`<h2>${inline(line.replace(/^#\s+/, ""))}</h2>`); continue; }

  const b = line.match(/^[-*+]\s+(.*)$/);
  if (b) { if (!inList) { out.push("<ul>"); inList = true; } out.push(`<li>${inline(b[1])}</li>`); continue; }

  closeList();
  const cls = [];
  if (/_{8,}/.test(line)) cls.push("sig");
  if (/^\([a-z]|^\([ivx]+\)/i.test(line)) cls.push("clause");
  out.push(`<p${cls.length ? ` class="${cls.join(" ")}"` : ""}>${inline(line)}</p>`);
}
closeList();

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: Letter; margin: 0.85in 0.95in 0.8in 0.95in; }
  * { box-sizing: border-box; }
  body { font-family: Calibri, "Segoe UI", Arial, sans-serif; font-size: 10.5pt; line-height: 1.45;
         color: #111; margin: 0; }
  .doctitle { text-align: center; font-size: 16pt; font-weight: 700; color: #15166b;
              letter-spacing: .3px; text-transform: uppercase; margin: 0 0 4px; }
  .rule { border: 0; border-top: 2px solid #15166b; margin: 0 0 16px; }
  .brandbar { display: flex; justify-content: space-between; font-size: 8pt; color: #666;
              letter-spacing: .6px; text-transform: uppercase; border-bottom: 1px solid #ddd;
              padding-bottom: 4px; margin-bottom: 14px; }
  .brandbar strong { color: #15166b; }
  h2 { font-size: 11pt; color: #15166b; margin: 15px 0 5px; page-break-after: avoid; }
  h3 { font-size: 10.5pt; margin: 11px 0 4px; page-break-after: avoid; }
  p  { margin: 0 0 7px; text-align: left; orphans: 2; widows: 2; }
  p.clause { padding-left: .35in; text-indent: -.35in; }
  p.sig { text-align: left; margin: 0 0 9px; }
  ul { margin: 0 0 8px; padding-left: .3in; }
  li { margin: 0 0 4px; }
  hr { border: 0; border-top: 1px solid #ccc; margin: 13px 0; }
  .blank { letter-spacing: -.5px; }
  .foot { position: fixed; bottom: -0.55in; left: 0; right: 0; font-size: 7.5pt; color: #666;
          border-top: 1px solid #ddd; padding-top: 4px; }
</style></head>
<body>
  <div class="brandbar"><strong>SPC Homes LLC</strong><span>Off-Market Acquisitions · DFW &amp; Houston</span></div>
  <div class="doctitle">${esc(title)}</div>
  <hr class="rule">
  ${out.join("\n  ")}
  <div class="foot">SPC Homes LLC &nbsp;|&nbsp; 4742 Benbrook Blvd, Fort Worth, TX 76116 &nbsp;|&nbsp; 817-697-2534</div>
</body></html>`;

fs.writeFileSync(outPath, html);
console.log("wrote " + outPath + " (" + html.length + " bytes, " + out.length + " blocks)");
