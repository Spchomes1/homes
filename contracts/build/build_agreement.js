/*
 * Renders the Consultation Fee Agreement markdown into a signable US-Letter .docx.
 *   node build_agreement.js <input.md> <output.docx>
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TabStopType,
  BorderStyle, Header, Footer, PageNumber, LevelFormat, convertInchesToTwip,
} = require(path.join(__dirname, "node_modules", "docx"));

const [, , mdPath, outPath] = process.argv;
const md = fs.readFileSync(mdPath, "utf8");

const FONT = "Calibri";
const NAVY = "15166B";
const GREY = "555555";

/* ---------- inline markdown (**bold**, *italic*) -> TextRun[] ---------- */
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|__[^_\s][^_]*__(?![_])|\*[^*]+\*)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(new TextRun({ ...base, text: text.slice(last, m.index) }));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(new TextRun({ ...base, text: tok.slice(2, -2), bold: true }));
    else if (tok.startsWith("__")) out.push(new TextRun({ ...base, text: tok.slice(2, -2), bold: true }));
    else out.push(new TextRun({ ...base, text: tok.slice(1, -1), italics: true }));
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(new TextRun({ ...base, text: text.slice(last) }));
  return out.length ? out : [new TextRun({ ...base, text: "" })];
}

const body = (text, opts = {}) =>
  new Paragraph({
    children: runs(text, { font: FONT, size: 21 }),
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { after: opts.after ?? 140, line: 264 },
    indent: opts.indent,
    keepNext: opts.keepNext,
  });

const lines = md
  .replace(/\r\n/g, "\n")
  .replace(/^\s*```.*$/gm, "")          // stray fences
  .replace(/<br\s*\/?>/gi, "")          // stray HTML line breaks
  .replace(/<\/?(?:p|div|span|em|strong|u|b|i)\b[^>]*>/gi, "")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&mdash;/gi, "—")
  .split("\n");
const children = [];
let i = 0;

/* ---------- title ---------- */
while (i < lines.length && !lines[i].trim()) i++;
let title = "CONSULTATION FEE AGREEMENT";
if (lines[i] && /^#\s+/.test(lines[i])) { title = lines[i].replace(/^#\s+/, "").trim(); i++; }

children.push(new Paragraph({
  children: [new TextRun({ text: title.toUpperCase(), bold: true, font: FONT, size: 30, color: NAVY })],
  alignment: AlignmentType.CENTER,
  spacing: { after: 60 },
}));
children.push(new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 4 } },
  spacing: { after: 220 },
}));

/* ---------- body ---------- */
const isRule = (l) => /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l) && !/_{6,}/.test(l);
const isSigLine = (l) => /_{8,}/.test(l);

for (; i < lines.length; i++) {
  const raw = lines[i];
  const line = raw.trim();

  if (!line) continue;

  if (isRule(line)) {
    children.push(new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 6 } },
      spacing: { before: 100, after: 160 },
    }));
    continue;
  }

  // ## Section heading
  if (/^##\s+/.test(line) && !/^###/.test(line)) {
    children.push(new Paragraph({
      children: runs(line.replace(/^##\s+/, ""), { bold: true, font: FONT, size: 22, color: NAVY }),
      spacing: { before: 240, after: 90 },
      keepNext: true,
    }));
    continue;
  }
  // ### Sub-heading
  if (/^###\s+/.test(line)) {
    children.push(new Paragraph({
      children: runs(line.replace(/^###+\s+/, ""), { bold: true, font: FONT, size: 21 }),
      spacing: { before: 160, after: 70 },
      keepNext: true,
    }));
    continue;
  }
  // stray H1 mid-document
  if (/^#\s+/.test(line)) {
    children.push(new Paragraph({
      children: runs(line.replace(/^#\s+/, ""), { bold: true, font: FONT, size: 24, color: NAVY }),
      spacing: { before: 260, after: 100 },
      keepNext: true,
    }));
    continue;
  }

  // blockquote -> indented italic note
  if (/^>\s?/.test(line)) {
    children.push(body(line.replace(/^>\s?/, ""), {
      indent: { left: convertInchesToTwip(0.3) },
      align: AlignmentType.LEFT,
    }));
    continue;
  }

  // bullets
  const bullet = line.match(/^[-*+]\s+(.*)$/);
  if (bullet) {
    const depth = Math.min(2, Math.floor((raw.length - raw.trimStart().length) / 2));
    children.push(new Paragraph({
      children: runs(bullet[1], { font: FONT, size: 21 }),
      bullet: { level: depth },
      spacing: { after: 90, line: 264 },
      alignment: AlignmentType.LEFT,
    }));
    continue;
  }

  // signature / fill-in lines: keep left-aligned, tighter, never justified
  if (isSigLine(line)) {
    children.push(body(line, { align: AlignmentType.LEFT, after: 90 }));
    continue;
  }

  // (a) (b) lettered sub-clauses -> hanging indent
  const lettered = line.match(/^\(([a-z]|[ivx]+)\)\s+/i);
  if (lettered) {
    children.push(body(line, {
      indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.35) },
    }));
    continue;
  }

  children.push(body(line));
}

/* ---------- document ---------- */
const doc = new Document({
  creator: "SPC Homes LLC",
  title: title,
  description: "Consultation Fee Agreement — 3011 Harlan Dr, Mesquite, TX 75150",
  numbering: {
    config: [{
      reference: "bullets",
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.2) } } } },
      ],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: {
          top: convertInchesToTwip(0.9), bottom: convertInchesToTwip(0.85),
          left: convertInchesToTwip(0.95), right: convertInchesToTwip(0.95),
        },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [new TextRun({ text: "SPC HOMES LLC", bold: true, font: FONT, size: 16, color: NAVY }),
                     new TextRun({ text: "\tOFF-MARKET ACQUISITIONS · DFW & HOUSTON", font: FONT, size: 16, color: GREY })],
          tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
          spacing: { after: 40 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 4 } },
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          children: [
            new TextRun({ text: "SPC Homes LLC  |  4742 Benbrook Blvd, Fort Worth, TX 76116  |  817-697-2534", font: FONT, size: 15, color: GREY }),
            new TextRun({ text: "\tPage ", font: FONT, size: 15, color: GREY }),
            new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 15, color: GREY }),
            new TextRun({ text: " of ", font: FONT, size: 15, color: GREY }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 15, color: GREY }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 4 } },
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("wrote " + outPath + " (" + buf.length + " bytes, " + children.length + " blocks)");
});
