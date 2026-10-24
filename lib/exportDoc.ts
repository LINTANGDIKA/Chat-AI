/**
 * Document Export Utility for Hero AI
 * Exports formatted AI messages to PDF and Microsoft Word (.doc)
 * Featuring native Word Math (OMML) conversion for KaTeX equations.
 */

import { mml2omml } from 'mathml2omml';

/**
 * Clean and process DOM/HTML for Microsoft Word export.
 * Specifically converts KaTeX formulas into native Office Math (OMML) tags (<m:oMath>)
 * and strips duplicate MathML/LaTeX annotation tags to prevent "RRR" / raw LaTeX bugs.
 */
function processHtmlForWord(content: HTMLElement | string): string {
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

  // 1. Remove all interactive buttons (copy, export, etc.)
  container.querySelectorAll('button').forEach((btn) => btn.remove());

  // 2. Convert KaTeX formulas into native Office Math (OMML)
  const katexNodes = Array.from(container.querySelectorAll('.katex'));
  for (const katexEl of katexNodes) {
    try {
      const isDisplay =
        katexEl.classList.contains('katex-display') ||
        !!katexEl.closest('.katex-display');

      const mathEl = katexEl.querySelector('math');
      if (mathEl) {
        const mathClone = mathEl.cloneNode(true) as Element;
        // Strip annotation tag to avoid duplicate raw LaTeX code appearing in Word
        mathClone.querySelectorAll('annotation').forEach((ann) => ann.remove());

        const mathmlStr = mathClone.outerHTML;
        const omml = mml2omml(mathmlStr);

        if (omml) {
          const wrapper = document.createElement('span');
          wrapper.innerHTML = isDisplay
            ? `<m:oMathPara>${omml}</m:oMathPara>`
            : omml;

          const displayParent = katexEl.closest('.katex-display');
          if (displayParent && displayParent !== katexEl) {
            displayParent.replaceWith(wrapper);
          } else {
            katexEl.replaceWith(wrapper);
          }
          continue;
        }
      }
    } catch (err) {
      console.warn('Hero AI: Failed to convert math to OMML, falling back:', err);
    }

    // Fallback: If OMML conversion fails, extract ONLY the clean visible text
    // NEVER leave both .katex-mathml and .katex-html in Word!
    const katexHtml = katexEl.querySelector('.katex-html');
    const cleanText = katexHtml
      ? (katexHtml as HTMLElement).innerText
      : (katexEl as HTMLElement).innerText;

    const fallbackSpan = document.createElement('span');
    fallbackSpan.setAttribute(
      'style',
      "font-family: 'Cambria Math', 'Cambria', serif; font-style: italic;"
    );
    fallbackSpan.textContent = cleanText || '';

    const displayParent = katexEl.closest('.katex-display');
    if (displayParent && displayParent !== katexEl) {
      displayParent.replaceWith(fallbackSpan);
    } else {
      katexEl.replaceWith(fallbackSpan);
    }
  }

  return container.innerHTML;
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

export function exportToWord(content: HTMLElement | string, title = 'Dokumen Hero AI') {
  const cleanHtml = processHtmlForWord(content);

  const formattedDate = new Date().toLocaleDateString('id-ID', {
    dateStyle: 'full',
  });

  const wordHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns:m='http://schemas.openxmlformats.org/officeDocument/2006/math'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4 portrait;
      margin: 2.5cm 2.5cm 2.5cm 2.5cm;
    }
    body {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1e293b;
    }
    m\\:oMath, m\\:oMathPara {
      font-family: 'Cambria Math', 'Cambria', serif;
    }
    .doc-header {
      border-bottom: 2pt solid #7c3aed;
      padding-bottom: 8pt;
      margin-bottom: 18pt;
    }
    .doc-title {
      font-size: 20pt;
      font-weight: bold;
      color: #0f172a;
      margin: 0;
    }
    .doc-meta {
      font-size: 9pt;
      color: #64748b;
      margin-top: 4pt;
    }
    h1 {
      font-size: 17pt;
      font-weight: bold;
      color: #0f172a;
      margin-top: 18pt;
      margin-bottom: 8pt;
      border-bottom: 1pt solid #e2e8f0;
      padding-bottom: 4pt;
    }
    h2 {
      font-size: 14pt;
      font-weight: bold;
      color: #1e293b;
      margin-top: 14pt;
      margin-bottom: 6pt;
    }
    h3 {
      font-size: 12pt;
      font-weight: bold;
      color: #334155;
      margin-top: 12pt;
      margin-bottom: 4pt;
    }
    p {
      margin-top: 0;
      margin-bottom: 8pt;
    }
    ul, ol {
      margin-top: 0;
      margin-bottom: 8pt;
      padding-left: 20pt;
    }
    li {
      margin-bottom: 3pt;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12pt 0;
      font-size: 10pt;
    }
    th, td {
      border: 1pt solid #cbd5e1;
      padding: 6pt 8pt;
      text-align: left;
    }
    th {
      background-color: #f8fafc;
      font-weight: bold;
    }
    pre {
      background-color: #f1f5f9;
      border: 1pt solid #e2e8f0;
      border-radius: 4pt;
      padding: 8pt 10pt;
      font-family: 'Consolas', monospace;
      font-size: 9.5pt;
      margin: 10pt 0;
    }
    code {
      font-family: 'Consolas', monospace;
      font-size: 9.5pt;
      background-color: #f1f5f9;
      padding: 2pt 4pt;
      border-radius: 2pt;
    }
    blockquote {
      border-left: 3pt solid #7c3aed;
      padding-left: 10pt;
      margin: 8pt 0;
      color: #64748b;
      font-style: italic;
      background-color: #f8fafc;
    }
    hr {
      border: none;
      border-top: 1pt solid #e2e8f0;
      margin: 16pt 0;
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <h1 class="doc-title">${title}</h1>
    <div class="doc-meta">Dibuat dengan Hero AI &bull; ${formattedDate}</div>
  </div>
  ${cleanHtml}
</body>
</html>`;

  const blob = new Blob(['\ufeff' + wordHtml], {
    type: 'application/msword;charset=utf-8',
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
  a.download = `${safeFilename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  <title>${title}</title>
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
    <h1 class="doc-title">${title}</h1>
    <div class="doc-meta">Dibuat dengan Hero AI &bull; ${formattedDate}</div>
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
