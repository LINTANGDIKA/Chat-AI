/**
 * Document Export Utility for Hero AI
 * Generates genuine Microsoft Word (.docx) files with native Word Equations (OMML)
 * and printable PDF documents.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import { Math as DocxMath, latexToMath } from 'docx/math';

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface InlineStyle {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

function extractLatexFromKatex(el: Element): string {
  const ann =
    el.querySelector('annotation[encoding="application/x-tex"]') ||
    el.querySelector('annotation');
  if (ann && ann.textContent) {
    return ann.textContent.trim();
  }
  const dataLatex = el.getAttribute('data-latex') || el.getAttribute('data-expr');
  if (dataLatex) return dataLatex.trim();
  return el.textContent?.trim() || '';
}

function safeLatexToMath(latex: string): (DocxMath | TextRun)[] {
  if (!latex) return [];
  try {
    const mathElements = latexToMath(latex);
    return [new DocxMath({ children: mathElements })];
  } catch (err) {
    console.warn('Hero AI: latexToMath error for:', latex, err);
    try {
      const simplified = latex
        .replace(/\\begin\{(?:aligned|matrix|bmatrix|pmatrix)\}/g, '')
        .replace(/\\end\{(?:aligned|matrix|bmatrix|pmatrix)\}/g, '')
        .replace(/&/g, ' ')
        .trim();
      const mathElements = latexToMath(simplified);
      return [new DocxMath({ children: mathElements })];
    } catch {
      return [new TextRun({ text: latex, italics: true, color: '334155' })];
    }
  }
}

function parseInlineRuns(node: Node, style: InlineStyle = {}): (TextRun | DocxMath)[] {
  const runs: (TextRun | DocxMath)[] = [];

  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];

    if (child.nodeType === 3) {
      // Text node
      const text = child.textContent;
      if (text) {
        runs.push(
          new TextRun({
            text,
            bold: style.bold,
            italics: style.italic,
            font: style.code ? 'Consolas' : 'Calibri',
            size: style.code ? 20 : 22,
            color: style.code ? '334155' : '1E293B',
            shading: style.code ? { fill: 'F1F5F9' } : undefined,
          })
        );
      }
    } else if (child.nodeType === 1) {
      // Element node
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (el.classList.contains('katex')) {
        const latex = extractLatexFromKatex(el);
        if (latex) {
          runs.push(...safeLatexToMath(latex));
        }
      } else if (tag === 'strong' || tag === 'b') {
        runs.push(...parseInlineRuns(el, { ...style, bold: true }));
      } else if (tag === 'em' || tag === 'i') {
        runs.push(...parseInlineRuns(el, { ...style, italic: true }));
      } else if (tag === 'code') {
        runs.push(...parseInlineRuns(el, { ...style, code: true }));
      } else if (tag === 'br') {
        runs.push(new TextRun({ break: 1 }));
      } else if (tag === 'button') {
        continue;
      } else {
        runs.push(...parseInlineRuns(el, style));
      }
    }
  }

  return runs;
}

function convertNodeToDocx(node: Element): (Paragraph | Table)[] {
  const tag = node.tagName.toLowerCase();
  const items: (Paragraph | Table)[] = [];

  // Skip interactive or empty items
  if (tag === 'button' || (node.classList.contains('select-none') && node.querySelector('button'))) {
    return items;
  }

  // Display math
  if (node.classList.contains('katex-display')) {
    const latex = extractLatexFromKatex(node);
    if (latex) {
      items.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 180, after: 180 },
          children: safeLatexToMath(latex),
        })
      );
    }
    return items;
  }

  if (/^h[1-6]$/.test(tag)) {
    const level =
      tag === 'h1'
        ? HeadingLevel.HEADING_1
        : tag === 'h2'
        ? HeadingLevel.HEADING_2
        : tag === 'h3'
        ? HeadingLevel.HEADING_3
        : HeadingLevel.HEADING_4;

    const runs = parseInlineRuns(node);
    if (runs.length > 0) {
      items.push(
        new Paragraph({
          heading: level,
          children: runs,
          spacing: { before: 240, after: 120 },
        })
      );
    }
    return items;
  }

  if (tag === 'p') {
    // Check if the only child is a display math
    const displayMath = node.querySelector('.katex-display');
    if (displayMath && node.children.length === 1 && !node.textContent?.replace(displayMath.textContent || '', '').trim()) {
      const latex = extractLatexFromKatex(displayMath);
      if (latex) {
        items.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 180, after: 180 },
            children: safeLatexToMath(latex),
          })
        );
        return items;
      }
    }

    const runs = parseInlineRuns(node);
    if (runs.length > 0) {
      items.push(
        new Paragraph({
          children: runs,
          spacing: { after: 120 },
        })
      );
    }
    return items;
  }

  if (tag === 'ul' || tag === 'ol') {
    const isOl = tag === 'ol';
    let idx = 1;
    for (let j = 0; j < node.children.length; j++) {
      const li = node.children[j];
      if (li.tagName.toLowerCase() === 'li') {
        const prefix = isOl ? `${idx++}. ` : '• ';
        const runs = parseInlineRuns(li);
        items.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: prefix, bold: true, color: '475569' }),
              ...runs,
            ],
          })
        );
      }
    }
    return items;
  }

  if (tag === 'blockquote') {
    const runs = parseInlineRuns(node);
    if (runs.length > 0) {
      items.push(
        new Paragraph({
          indent: { left: 400 },
          border: {
            left: { color: '7C3AED', space: 10, style: BorderStyle.SINGLE, size: 16 },
          },
          spacing: { before: 140, after: 140 },
          children: runs,
        })
      );
    }
    return items;
  }

  if (tag === 'pre') {
    const codeEl = node.querySelector('code') || node;
    const text = codeEl.textContent || '';
    const lines = text.split('\n');
    for (const line of lines) {
      items.push(
        new Paragraph({
          shading: { fill: 'F8FAFC' },
          spacing: { after: 0, line: 240 },
          children: [
            new TextRun({
              text: line || ' ',
              font: 'Consolas',
              size: 20,
              color: '334155',
            }),
          ],
        })
      );
    }
    items.push(new Paragraph({ spacing: { after: 120 } }));
    return items;
  }

  if (tag === 'hr') {
    items.push(
      new Paragraph({
        border: {
          bottom: { color: 'E2E8F0', space: 1, style: BorderStyle.SINGLE, size: 6 },
        },
        spacing: { before: 180, after: 180 },
      })
    );
    return items;
  }

  if (tag === 'table') {
    const rows: TableRow[] = [];
    const trEls = node.querySelectorAll('tr');
    for (let r = 0; r < trEls.length; r++) {
      const tr = trEls[r];
      const cells: TableCell[] = [];
      for (let c = 0; c < tr.children.length; c++) {
        const cell = tr.children[c];
        const isTh = cell.tagName.toLowerCase() === 'th';
        const runs = parseInlineRuns(cell, isTh ? { bold: true } : {});
        cells.push(
          new TableCell({
            shading: isTh ? { fill: 'F8FAFC' } : undefined,
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                children: runs.length > 0 ? runs : [new TextRun('')],
              }),
            ],
          })
        );
      }
      if (cells.length > 0) {
        rows.push(new TableRow({ children: cells }));
      }
    }
    if (rows.length > 0) {
      items.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows,
        })
      );
      items.push(new Paragraph({ spacing: { after: 140 } }));
    }
    return items;
  }

  // Generic containers: unwrap children
  if (node.children.length > 0) {
    for (let i = 0; i < node.children.length; i++) {
      items.push(...convertNodeToDocx(node.children[i]));
    }
    return items;
  }

  // Fallback for leaf text elements
  const runs = parseInlineRuns(node);
  if (runs.length > 0) {
    items.push(new Paragraph({ children: runs, spacing: { after: 120 } }));
  }

  return items;
}

/**
 * Export to a genuine Microsoft Word (.docx) document with native editable OpenXML equations
 */
export async function exportToWord(content: HTMLElement | string, title = 'Dokumen Hero AI') {
  if (typeof window === 'undefined') return;

  let container: HTMLElement;
  if (typeof content === 'string') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    container = doc.body;
  } else {
    container = content.cloneNode(true) as HTMLElement;
  }

  // Remove interactive buttons before processing
  container.querySelectorAll('button').forEach((b) => b.remove());

  const formattedDate = new Date().toLocaleDateString('id-ID', {
    dateStyle: 'full',
  });

  const bodyItems: (Paragraph | Table)[] = [];

  // Document Title Header
  bodyItems.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
      border: {
        bottom: { color: '7C3AED', space: 8, style: BorderStyle.SINGLE, size: 16 },
      },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Dibuat dengan Hero AI • ${formattedDate}`,
          italics: true,
          color: '64748B',
          size: 18,
        }),
      ],
      spacing: { after: 320 },
    })
  );

  // Convert all DOM nodes to DOCX elements
  for (let i = 0; i < container.children.length; i++) {
    const converted = convertNodeToDocx(container.children[i]);
    bodyItems.push(...converted);
  }

  // Create standard Word Document with default styles
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22, // 11pt
            color: '1E293B',
          },
          paragraph: {
            spacing: {
              line: 280,
              after: 120,
            },
          },
        },
        title: {
          run: {
            font: 'Calibri',
            size: 36, // 18pt
            bold: true,
            color: '0F172A',
          },
          paragraph: {
            spacing: {
              after: 240,
            },
          },
        },
        heading1: {
          run: {
            font: 'Calibri',
            size: 28, // 14pt
            bold: true,
            color: '0F172A',
          },
          paragraph: {
            spacing: {
              before: 280,
              after: 140,
            },
          },
        },
        heading2: {
          run: {
            font: 'Calibri',
            size: 24, // 12pt
            bold: true,
            color: '1E293B',
          },
          paragraph: {
            spacing: {
              before: 220,
              after: 100,
            },
          },
        },
        heading3: {
          run: {
            font: 'Calibri',
            size: 22, // 11pt
            bold: true,
            color: '334155',
          },
          paragraph: {
            spacing: {
              before: 180,
              after: 80,
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: bodyItems,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeFilename =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'dokumen-hero-ai';

  a.href = url;
  a.download = `${safeFilename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Clean and process DOM/HTML for PDF print export.
 */
function processHtmlForPdf(content: HTMLElement | string): string {
  let container: HTMLElement;

  if (typeof content === 'string') {
    if (typeof window !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      container = doc.body;
    } else {
      return content;
    }
  } else {
    container = content.cloneNode(true) as HTMLElement;
  }

  // Remove interactive buttons
  container.querySelectorAll('button').forEach((b) => b.remove());
  return container.innerHTML;
}

export function exportToPdf(content: HTMLElement | string, title = 'Dokumen Hero AI') {
  const cleanHtml = processHtmlForPdf(content);

  const formattedDate = new Date().toLocaleDateString('id-ID', {
    dateStyle: 'full',
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup diblokir oleh browser. Harap izinkan popup di browser Anda untuk mengunduh PDF.');
    return;
  }

  const printDocument = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <style>
    @page {
      size: A4 portrait;
      margin: 20mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
      margin: 0;
    }
    .doc-header {
      border-bottom: 2px solid #7c3aed;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .doc-title {
      font-size: 22pt;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .doc-meta {
      font-size: 9pt;
      color: #64748b;
      margin-top: 6pt;
    }
    h1, h2, h3, h4 {
      color: #0f172a;
      page-break-after: avoid;
    }
    h1 {
      font-size: 16pt;
      margin-top: 20pt;
      margin-bottom: 8pt;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4pt;
    }
    h2 {
      font-size: 13.5pt;
      margin-top: 16pt;
      margin-bottom: 6pt;
    }
    h3 {
      font-size: 12pt;
      margin-top: 12pt;
      margin-bottom: 4pt;
    }
    p {
      margin-top: 0;
      margin-bottom: 10pt;
    }
    ul, ol {
      margin-top: 0;
      margin-bottom: 10pt;
      padding-left: 24pt;
    }
    li {
      margin-bottom: 4pt;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 14pt 0;
      font-size: 10pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6pt 10pt;
      text-align: left;
    }
    th {
      background-color: #f8fafc;
      font-weight: 600;
    }
    pre {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10pt 12pt;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9.5pt;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9.5pt;
      background-color: #f1f5f9;
      padding: 2pt 4pt;
      border-radius: 4px;
    }
    blockquote {
      border-left: 3px solid #7c3aed;
      padding-left: 12pt;
      margin: 12pt 0;
      color: #475569;
      font-style: italic;
      background: #f8fafc;
      page-break-inside: avoid;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 18pt 0;
    }
    .katex {
      font-size: 1.1em;
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <h1 class="doc-title">${escapeXml(title)}</h1>
    <div class="doc-meta">Dibuat dengan Hero AI &bull; ${escapeXml(formattedDate)}</div>
  </div>
  ${cleanHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(printDocument);
  printWindow.document.close();
}
