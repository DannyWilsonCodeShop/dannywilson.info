#!/usr/bin/env node
/**
 * Converts a markdown resume into an ATS-friendly Microsoft Word (.docx) file.
 *
 * Usage:
 *   node tools/md-to-docx.mjs <input.md> [output.docx]
 *
 * A .docx is a ZIP of XML parts. This builds a minimal, valid OOXML document
 * using only Node's built-in zlib — no external dependencies.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { deflateRawSync } from 'zlib';
import { basename, resolve } from 'path';

// ---------- Minimal ZIP writer (store + deflate) ----------
function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const content = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const compressed = deflateRawSync(content);
    const crc = crc32(content);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, nameBuf, compressed);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(8, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt16LE(0, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(compressed.length, 20);
    cen.writeUInt32LE(content.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt16LE(0, 30);
    cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34);
    cen.writeUInt16LE(0, 36);
    cen.writeUInt32LE(0, 38);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, nameBuf);

    offset += local.length + nameBuf.length + compressed.length;
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const c of central) centralSize += c.length;

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, ...central, end]);
}

// ---------- XML helpers ----------
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Parse inline **bold**, *italic*, [link](url), `code` into runs.
function inlineRuns(text) {
  const runs = [];
  let i = 0;
  const pushText = (t, opts = {}) => {
    if (!t) return;
    runs.push({ text: t, ...opts });
  };
  // Simple sequential tokenizer
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)]+)\))|(`([^`]+)`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) pushText(text.slice(last, m.index));
    if (m[1]) pushText(m[2], { bold: true });
    else if (m[3]) pushText(m[4], { italic: true });
    else if (m[5]) pushText(m[6], { link: true }); // render link label (ATS reads text)
    else if (m[8]) pushText(m[9], { mono: true });
    last = re.lastIndex;
  }
  if (last < text.length) pushText(text.slice(last));
  return runs.length ? runs : [{ text }];
}

function runXml(run) {
  const props = [];
  if (run.bold) props.push('<w:b/>');
  if (run.italic) props.push('<w:i/>');
  if (run.link) props.push('<w:color w:val="2A6090"/>');
  if (run.mono) props.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>');
  const rPr = props.length ? `<w:rPr>${props.join('')}</w:rPr>` : '';
  return `<w:r>${rPr}<w:t xml:space="preserve">${esc(run.text)}</w:t></w:r>`;
}

function para(runs, { style, bullet, sizeHalfPt, color, spaceBefore, spaceAfter } = {}) {
  const pPr = [];
  if (bullet) pPr.push('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>');
  const spacing = `<w:spacing w:before="${spaceBefore ?? 0}" w:after="${spaceAfter ?? 60}"/>`;
  pPr.push(spacing);
  const rPrShared = [];
  if (sizeHalfPt) rPrShared.push(`<w:sz w:val="${sizeHalfPt}"/>`);
  if (color) rPrShared.push(`<w:color w:val="${color}"/>`);
  const runXmls = runs.map(r => {
    // merge shared run props by injecting color/size
    const extra = [];
    if (color) extra.push(`<w:color w:val="${color}"/>`);
    if (sizeHalfPt) extra.push(`<w:sz w:val="${sizeHalfPt}"/>`);
    const base = [];
    if (r.bold) base.push('<w:b/>');
    if (r.italic) base.push('<w:i/>');
    if (r.mono) base.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>');
    const rPr = (base.length || extra.length) ? `<w:rPr>${base.join('')}${extra.join('')}</w:rPr>` : '';
    return `<w:r>${rPr}<w:t xml:space="preserve">${esc(r.text)}</w:t></w:r>`;
  }).join('');
  return `<w:p><w:pPr>${pPr.join('')}</w:pPr>${runXmls}</w:p>`;
}

// ---------- Markdown -> docx body ----------
function buildBody(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const body = [];
  let firstH1Done = false;
  let prevWasH1 = false;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (line.trim() === '') { prevWasH1 = false; continue; }
    if (/^---+$/.test(line.trim())) { prevWasH1 = false; continue; }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const runs = inlineRuns(h[2]);
      if (level === 1) {
        body.push(para(runs, { sizeHalfPt: 40, color: '0F2B46', spaceAfter: 20 }));
        firstH1Done = true;
        prevWasH1 = true;
      } else if (level === 2) {
        body.push(para(runs, { sizeHalfPt: 24, color: '0F2B46', spaceBefore: 160, spaceAfter: 60 }));
        prevWasH1 = false;
      } else {
        body.push(para(runs, { sizeHalfPt: 22, color: '15314F', spaceBefore: 120, spaceAfter: 20 }));
        prevWasH1 = false;
      }
      continue;
    }

    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      body.push(para(inlineRuns(li[1]), { bullet: true, spaceAfter: 30 }));
      prevWasH1 = false;
      continue;
    }

    // Role/title line directly after the H1 name
    if (prevWasH1) {
      body.push(para(inlineRuns(line.trim()), { sizeHalfPt: 22, color: '2A6090', spaceAfter: 40 }));
      prevWasH1 = false;
      continue;
    }

    body.push(para(inlineRuns(line.trim()), { spaceAfter: 60 }));
  }
  return body.join('');
}

// ---------- OOXML parts ----------
function documentXml(bodyXml) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${bodyXml}
<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="864" w:bottom="720" w:left="864" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>
</w:body>
</w:document>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0">
<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/>
<w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:lvl>
</w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="20"/><w:color w:val="1A1A1A"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
</w:styles>`;

// ---------- Main ----------
const inputArg = process.argv[2];
if (!inputArg) {
  console.error('Usage: node tools/md-to-docx.mjs <input.md> [output.docx]');
  process.exit(1);
}
const inputPath = resolve(inputArg);
if (!existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}
const outputPath = resolve(process.argv[3] || inputPath.replace(/\.md$/i, '.docx'));

const md = readFileSync(inputPath, 'utf8');
const bodyXml = buildBody(md);
const docXml = documentXml(bodyXml);

const buf = zip([
  { name: '[Content_Types].xml', data: CONTENT_TYPES },
  { name: '_rels/.rels', data: RELS },
  { name: 'word/document.xml', data: docXml },
  { name: 'word/_rels/document.xml.rels', data: DOC_RELS },
  { name: 'word/numbering.xml', data: NUMBERING },
  { name: 'word/styles.xml', data: STYLES },
]);

writeFileSync(outputPath, buf);
console.log(`✅ DOCX created: ${outputPath}`);
