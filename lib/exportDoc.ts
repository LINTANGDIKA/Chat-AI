/**
 * Document Export Utility for Hero AI
 * Generates genuine Microsoft Word (.docx) files with native Word Equations (OMML)
 * and printable PDF documents.
 */

import JSZip from 'jszip';
import { mml2omml } from 'mathml2omml';

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function convertKatexToOmml(katexEl: Element): string | null {
  try {
    const mathEl = katexEl.querySelector('math');
    if (mathEl) {
      const clone = mathEl.cloneNode(true) as Element;
      clone.querySelectorAll('annotation').forEach((ann) => ann.remove());
      const mathmlStr = clone.outerHTML;
      const omml = mml2omml(mathmlStr);
      if (omml) return omml;
    }
  } catch (err) {
    console.warn('Hero AI: OMML conversion error:', err);
  }
  return null;
}

interface InlineStyle {
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

function parseInlineRuns(node: Node, style: InlineStyle = {}): string {
  let xml = '';

  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];

    if (child.nodeType === 3) {
      // Text node
      const text = child.textContent;
      if (text) {
        xml += '<w:r><w:rPr>';
        if (style.bold) xml += '<w:b/>';
        if (style.italic) xml += '<w:i/>';
        if (style.code) {
          xml += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:shd w:fill="F1F5F9"/><w:sz w:val="20"/>';
        }
        xml += `</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
      }
    } else if (child.nodeType === 1) {
      // Element node
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (el.classList.contains('katex')) {
        const omml = convertKatexToOmml(el);
        if (omml) {
          xml += omml;
        } else {
          const txt = el.textContent || '';
          xml += `<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">${escapeXml(txt)}</w:t></w:r>`;
        }
      } else if (tag === 'strong' || tag === 'b') {
        xml += parseInlineRuns(el, { ...style, bold: true });
      } else if (tag === 'em' || tag === 'i') {
        xml += parseInlineRuns(el, { ...style, italic: true });
      } else if (tag === 'code') {
        xml += parseInlineRuns(el, { ...style, code: true });
      } else if (tag === 'button') {
        // Skip interactive buttons
        continue;
      } else {
        xml += parseInlineRuns(el, style);
      }
    }
  }

  return xml;
}

function domToDocxXml(container: Element): string {
  let bodyXml = '';

  for (let i = 0; i < container.children.length; i++) {
    const node = container.children[i];
    const tag = node.tagName.toLowerCase();

    // Skip interactive button bars
    if (tag === 'button' || node.classList.contains('select-none') && node.querySelector('button')) {
      continue;
    }

    if (node.classList.contains('katex-display')) {
      const omml = convertKatexToOmml(node);
      if (omml) {
        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="160" w:after="160"/></w:pPr><m:oMathPara>${omml}</m:oMathPara></w:p>`;
      }
    } else if (/^h[1-6]$/.test(tag)) {
      const level = tag === 'h1' ? 'Heading1' : tag === 'h2' ? 'Heading2' : 'Heading3';
      const runs = parseInlineRuns(node);
      bodyXml += `<w:p><w:pPr><w:pStyle w:val="${level}"/></w:pPr>${runs}</w:p>`;
    } else if (tag === 'p') {
      const displayMath = node.querySelector('.katex-display');
      if (displayMath && node.children.length === 1) {
        const omml = convertKatexToOmml(displayMath);
        if (omml) {
          bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="160" w:after="160"/></w:pPr><m:oMathPara>${omml}</m:oMathPara></w:p>`;
          continue;
        }
      }
      const runs = parseInlineRuns(node);
      if (runs.trim()) {
        bodyXml += `<w:p>${runs}</w:p>`;
      }
    } else if (tag === 'ul' || tag === 'ol') {
      const isOl = tag === 'ol';
      let idx = 1;
      for (let j = 0; j < node.children.length; j++) {
        const li = node.children[j];
        if (li.tagName.toLowerCase() === 'li') {
          const prefix = isOl ? `${idx++}. ` : '• ';
          const runs = parseInlineRuns(li);
          bodyXml += `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:ind w:left="400"/></w:pPr><w:r><w:t xml:space="preserve">${prefix}</w:t></w:r>${runs}</w:p>`;
        }
      }
    } else if (tag === 'pre') {
      // Code block
      const codeEl = node.querySelector('code') || node;
      const text = codeEl.textContent || '';
      const lines = text.split('\n');
      for (const line of lines) {
        bodyXml += `<w:p><w:pPr><w:pStyle w:val="CodeBlock"/><w:shd w:fill="F8FAFC"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`;
      }
    } else if (tag === 'blockquote') {
      const runs = parseInlineRuns(node);
      bodyXml += `<w:p><w:pPr><w:ind w:left="400"/><w:pBdr><w:left w:val="single" w:sz="18" w:space="10" w:color="7C3AED"/></w:pBdr><w:shd w:fill="F8FAFC"/><w:spacing w:before="120" w:after="120"/></w:pPr>${runs}</w:p>`;
    } else if (tag === 'hr') {
      bodyXml += `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="E2E8F0"/></w:pBdr><w:spacing w:before="240" w:after="240"/></w:pPr></w:p>`;
    } else if (tag === 'table') {
      bodyXml += `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:left w:val="none"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:right w:val="none"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>`;
      const rows = node.querySelectorAll('tr');
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        bodyXml += `<w:tr>`;
        for (let c = 0; c < row.children.length; c++) {
          const cell = row.children[c];
          const isTh = cell.tagName.toLowerCase() === 'th';
          const runs = parseInlineRuns(cell, isTh ? { bold: true } : {});
          bodyXml += `<w:tc><w:tcPr><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tcMar>${isTh ? '<w:shd w:fill="F8FAFC"/>' : ''}</w:tcPr><w:p>${runs}</w:p></w:tc>`;
        }
        bodyXml += `</w:tr>`;
      }
      bodyXml += `</w:tbl>`;
    } else {
      const runs = parseInlineRuns(node);
      if (runs.trim()) {
        bodyXml += `<w:p>${runs}</w:p>`;
      }
    }
  }

  return bodyXml;
}

/**
 * Export to a genuine Microsoft Word (.docx) document with native editable OpenXML equations
 */
export async function exportToWord(content: HTMLElement | string, title = 'Dokumen Hero AI') {
  if (typeof window === 'undefined') return;

  let container: Element;
  if (typeof content === 'string') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    container = doc.body;
  } else {
    container = content.cloneNode(true) as Element;
  }

  const formattedDate = new Date().toLocaleDateString('id-ID', {
    dateStyle: 'full',
  });

  const bodyXml = domToDocxXml(container);

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Title"/><w:pBdr><w:bottom w:val="single" w:sz="16" w:space="8" w:color="7C3AED"/></w:pBdr><w:spacing w:after="240"/></w:pPr>
      <w:r><w:t>${escapeXml(title)}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:spacing w:after="280"/></w:pPr>
      <w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>Dibuat dengan Hero AI &bull; ${escapeXml(formattedDate)}</w:t></w:r>
    </w:p>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:color w:val="1E293B"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="280" w:lineRule="auto" w:after="140"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="40"/>
      <w:szCs w:val="40"/>
      <w:color w:val="0F172A"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:spacing w:before="360" w:after="160"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/><w:color w:val="0F172A"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr><w:spacing w:before="280" w:after="120"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/><w:color w:val="1E293B"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="334155"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/>
    <w:pPr><w:spacing w:after="100"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="CodeBlock">
    <w:name w:val="Code Block"/>
    <w:pPr><w:ind w:left="200" w:right="200"/></w:pPr>
  </w:style>
</w:styles>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', relsXml);
  zip.file('word/_rels/document.xml.rels', docRelsXml);
  zip.file('word/styles.xml', stylesXml);
  zip.file('word/document.xml', documentXml);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

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
