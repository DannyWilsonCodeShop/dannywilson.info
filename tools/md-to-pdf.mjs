#!/usr/bin/env node
/**
 * Converts a markdown resume into a print-ready, ATS-friendly PDF.
 *
 * Usage:
 *   node tools/md-to-pdf.mjs <input.md> [output.pdf]
 *
 * Pipeline: markdown -> styled HTML -> PDF (via headless Google Chrome).
 * No npm dependencies required.
 */

import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join, basename, resolve } from 'path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ---------- Minimal, dependency-free Markdown -> HTML ----------
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(text) {
  // Escape first, then apply inline formatting on the escaped text.
  let t = escapeHtml(text);
  // Links [label](url)
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Bold **text**
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic *text* (avoid matching bold leftovers)
  t = t.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  // Inline code `text`
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  return t;
}

function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let inList = false;

  const closeList = () => {
    if (inList) { out.push('</ul>'); inList = false; }
  };

  for (let raw of lines) {
    const line = raw.replace(/\s+$/, '');

    if (line.trim() === '') { closeList(); continue; }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) { closeList(); out.push('<hr/>'); continue; }

    // Headings
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }

    // List items
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(li[1])}</li>`);
      continue;
    }

    // Paragraph (treat trailing two-space as line context; keep simple)
    closeList();
    out.push(`<p>${inline(line.trim())}</p>`);
  }
  closeList();
  return out.join('\n');
}

// ---------- HTML template with print CSS ----------
function wrapHtml(bodyHtml, title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  @page { size: Letter; margin: 0.5in 0.6in; }
  * { box-sizing: border-box; }
  body {
    font-family: "Helvetica Neue", Arial, "Segoe UI", sans-serif;
    color: #1a1a1a;
    font-size: 10pt;
    line-height: 1.32;
    margin: 0;
  }
  h1 {
    font-size: 19pt;
    margin: 0 0 1px 0;
    letter-spacing: 0.5px;
    color: #0f2b46;
  }
  /* The line right after H1 is the title/role line */
  h1 + p { margin: 0 0 1px 0; font-weight: 600; color: #2a6090; font-size: 10.5pt; }
  h2 {
    font-size: 11pt;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #0f2b46;
    border-bottom: 1.5px solid #2a6090;
    padding-bottom: 2px;
    margin: 10px 0 4px 0;
  }
  h3 {
    font-size: 10.3pt;
    margin: 7px 0 1px 0;
    color: #15314f;
  }
  p { margin: 2px 0 3px 0; }
  ul { margin: 2px 0 4px 0; padding-left: 16px; }
  li { margin: 1px 0; }
  a { color: #2a6090; text-decoration: none; }
  code {
    background: #eef2f6;
    padding: 1px 4px;
    border-radius: 3px;
    font-family: "SF Mono", Menlo, Consolas, monospace;
    font-size: 9.5pt;
  }
  hr { border: none; border-top: 0.5px solid #d0d7de; margin: 6px 0; }
  strong { color: #15314f; }
  /* Avoid breaking a role entry awkwardly across pages */
  h3 { break-after: avoid; }
  h2 { break-after: avoid; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

// ---------- Main ----------
const inputArg = process.argv[2];
if (!inputArg) {
  console.error('Usage: node tools/md-to-pdf.mjs <input.md> [output.pdf]');
  process.exit(1);
}
const inputPath = resolve(inputArg);
if (!existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

const outputPath = resolve(process.argv[3] || inputPath.replace(/\.md$/i, '.pdf'));
const md = readFileSync(inputPath, 'utf8');
const title = basename(inputPath).replace(/\.md$/i, '');
const html = wrapHtml(mdToHtml(md), title);

// Write temp HTML, then let Chrome print it to PDF.
const tmp = mkdtempSync(join(tmpdir(), 'resume-'));
const htmlPath = join(tmp, 'resume.html');
writeFileSync(htmlPath, html, 'utf8');

if (!existsSync(CHROME)) {
  console.error(`Google Chrome not found at: ${CHROME}`);
  console.error('Edit the CHROME constant in this script to point at your browser.');
  process.exit(1);
}

try {
  execFileSync(CHROME, [
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${outputPath}`,
    `file://${htmlPath}`,
  ], { stdio: 'pipe' });
  console.log(`✅ PDF created: ${outputPath}`);
} catch (err) {
  console.error('Chrome PDF generation failed:', err.message);
  process.exit(1);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
