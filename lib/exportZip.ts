/**
 * Project ZIP Export Utility for Hero AI
 * Detects multiple project files from markdown code blocks
 * and bundles them into an organized .zip archive using JSZip.
 */

import JSZip from 'jszip';

export interface ProjectFile {
  path: string;
  name: string;
  content: string;
  language: string;
}

function extractFilenameFromHeading(text: string): string | null {
  const clean = text.trim();
  const match =
    clean.match(/(?:#{1,6}\s+|(?:\d+\.|\*|-)\s+|file:\s*|berkas:\s*|nama file:\s*)*(?:`|\*\*|\*)([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9_-]+)(?:`|\*\*|\*)/i) ||
    clean.match(/(?:#{1,6}\s+|(?:\d+\.|\*|-)\s+|file:\s*|berkas:\s*|nama file:\s*)+([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9_-]+)/i);

  if (match) {
    const candidate = match[1].replace(/^[./\\]+/, '').trim();
    if (/^[a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9_-]+$/.test(candidate) && !candidate.endsWith('.')) {
      return candidate;
    }
  }
  return null;
}

/**
 * Parses markdown text to extract all structured project files
 */
export function extractProjectFiles(markdown: string): ProjectFile[] {
  if (!markdown) return [];

  const files: ProjectFile[] = [];
  const lines = markdown.split('\n');

  const codeBlockStartRegex = /^```([a-zA-Z0-9_-]+)?(?:\s+|:)(?:filename=["']?([^"'\s]+)["']?|file=["']?([^"'\s]+)["']?|([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+))?/i;
  const plainFenceRegex = /^```([a-zA-Z0-9_-]+)?$/;

  let inCodeBlock = false;
  let currentLang = 'text';
  let currentPath = '';
  let currentLines: string[] = [];
  let precedingHeading = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!inCodeBlock) {
      const headingFilename = extractFilenameFromHeading(trimmed);
      if (headingFilename) {
        precedingHeading = headingFilename;
      }

      if (trimmed.startsWith('```')) {
        inCodeBlock = true;
        currentLines = [];
        currentLang = 'text';
        currentPath = '';

        const metaMatch = trimmed.match(codeBlockStartRegex);
        if (metaMatch) {
          currentLang = metaMatch[1] || 'text';
          currentPath = metaMatch[2] || metaMatch[3] || metaMatch[4] || '';
        } else {
          const plainMatch = trimmed.match(plainFenceRegex);
          if (plainMatch && plainMatch[1]) {
            currentLang = plainMatch[1];
          }
        }

        if (!currentPath && precedingHeading) {
          currentPath = precedingHeading;
          precedingHeading = '';
        }
      }
    } else {
      if (trimmed === '```') {
        inCodeBlock = false;
        let content = currentLines.join('\n');

        // Check first line inside code block if still no filename detected
        if (!currentPath && currentLines.length > 0) {
          const firstLine = currentLines[0].trim();
          const commentMatch = firstLine.match(
            /^(?:\/\/|#|\/\*|<!--)\s*(?:filepath:\s*|file:\s*)?`?([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)`?(?:\s*\*\/|\s*-->)?$/i
          );
          if (commentMatch) {
            currentPath = commentMatch[1];
            content = currentLines.slice(1).join('\n').trim();
          }
        }

        if (currentPath) {
          const cleanPath = currentPath
            .replace(/^[./\\]+/, '')
            .replace(/[/\\]+/g, '/');

          if (/^[a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+$/.test(cleanPath)) {
            const fileName = cleanPath.split('/').pop() || cleanPath;
            // Prevent duplicate entries of the exact same path
            const existingIdx = files.findIndex((f) => f.path === cleanPath);
            if (existingIdx >= 0) {
              files[existingIdx] = {
                path: cleanPath,
                name: fileName,
                content: content.trim(),
                language: currentLang,
              };
            } else {
              files.push({
                path: cleanPath,
                name: fileName,
                content: content.trim(),
                language: currentLang,
              });
            }
          }
        }

        precedingHeading = '';
      } else {
        currentLines.push(line);
      }
    }
  }

  return files;
}

/**
 * Compresses all project files into a .zip archive and triggers browser download
 */
export async function exportProjectToZip(
  files: ProjectFile[],
  projectTitle: string = 'hero-ai-project'
) {
  if (typeof window === 'undefined' || files.length === 0) return;

  const zip = new JSZip();

  // Add each file to its relative path in the zip
  files.forEach((file) => {
    zip.file(file.path, file.content);
  });

  // Auto-generate README.md if not included by AI
  const hasReadme = files.some(
    (f) => f.path.toLowerCase() === 'readme.md' || f.name.toLowerCase() === 'readme.md'
  );

  if (!hasReadme) {
    const isNode = files.some((f) => f.path.includes('package.json'));
    const isPython = files.some(
      (f) => f.path.includes('requirements.txt') || f.path.endsWith('.py')
    );

    let readmeText = `# ${projectTitle}\n\nProyek ini dibuat dan dibundle secara otomatis oleh **Hero AI**.\n\n`;

    if (isNode) {
      readmeText += `## Cara Menjalankan Proyek:\n\n1. Pastikan Node.js (v18+) sudah terinstal di komputer Anda.\n2. Buka terminal di folder proyek ini.\n3. Jalankan perintah instalasi dependensi:\n\`\`\`bash\nnpm install\n\`\`\`\n4. Jalankan server pengembangan:\n\`\`\`bash\nnpm run dev\n# atau: npm start\n\`\`\`\n5. Buka browser di [http://localhost:3000](http://localhost:3000).\n`;
    } else if (isPython) {
      readmeText += `## Cara Menjalankan Proyek:\n\n1. Buka terminal di folder proyek ini.\n2. Install dependensi (jika ada file requirements.txt):\n\`\`\`bash\npip install -r requirements.txt\n\`\`\`\n3. Jalankan aplikasi:\n\`\`\`bash\npython main.py\n\`\`\`\n`;
    } else {
      readmeText += `## Cara Menjalankan:\n\nEkstrak seluruh berkas di dalam arsip zip ini ke dalam satu folder, lalu buka file utama (misal: \`index.html\`) langsung di browser Anda.\n`;
    }

    zip.file('README.md', readmeText);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeTitle =
    projectTitle
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'project';

  a.href = url;
  a.download = `${safeTitle}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a single file directly to the user's computer
 */
export function downloadSingleFile(file: ProjectFile) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name || file.path.split('/').pop() || 'file.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
