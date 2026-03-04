// ─── PDF Export Utility ───────────────────────────────────────────────
// Client-side PDF generation for patient data exports.
// Creates a properly formatted PDF document using raw PDF spec.
// No external dependencies required — pure TypeScript implementation.
//
// Referenced by: PRD_PHASE3 Phase 6 / M6 (PDF/CSV export stubs)

/**
 * Escapes special PDF string characters.
 */
function pdfEscape(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f]/g, ' ');
}

/**
 * Wraps text at a given character width, returning an array of lines.
 */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current.length + word.length + 1 > maxChars && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current.length > 0 ? `${current} ${word}` : word;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

interface PdfSection {
  title: string;
  content: string | string[];
}

interface GeneratePdfOptions {
  title: string;
  subtitle?: string;
  patientName?: string;
  generatedAt?: string;
  sections: PdfSection[];
}

/**
 * Generates a PDF document as a Uint8Array using raw PDF 1.4 spec.
 * Supports multi-page documents with proper text wrapping and page breaks.
 */
export function generatePdf(options: GeneratePdfOptions): Uint8Array {
  const {
    title,
    subtitle = 'Clinical Data Export',
    patientName = 'Patient',
    generatedAt = new Date().toISOString(),
    sections,
  } = options;

  // PDF generation state
  const objects: string[] = [];
  let objectCount = 0;
  const offsets: number[] = [];

  function addObject(content: string): number {
    objectCount++;
    objects.push(content);
    return objectCount;
  }

  // ─── Build page content streams ────────────────────
  const PAGE_WIDTH = 612; // US Letter
  const PAGE_HEIGHT = 792;
  const MARGIN_LEFT = 50;
  const MARGIN_RIGHT = 50;
  const MARGIN_TOP = 50;
  const MARGIN_BOTTOM = 60;
  const LINE_HEIGHT = 14;
  const CHARS_PER_LINE = 85;
  const USABLE_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

  // Collect all text lines with formatting metadata
  interface TextLine {
    text: string;
    fontSize: number;
    bold: boolean;
    color?: string; // PDF color command
    spaceBefore?: number;
  }

  const allLines: TextLine[] = [];

  // Title
  allLines.push({
    text: title,
    fontSize: 18,
    bold: true,
    color: '0.2 0.3 0.6 rg',
    spaceBefore: 0,
  });
  allLines.push({
    text: subtitle,
    fontSize: 11,
    bold: false,
    color: '0.4 0.4 0.4 rg',
    spaceBefore: 4,
  });
  allLines.push({
    text: `Patient: ${patientName}`,
    fontSize: 10,
    bold: false,
    color: '0.3 0.3 0.3 rg',
    spaceBefore: 12,
  });
  allLines.push({
    text: `Generated: ${new Date(generatedAt).toLocaleString()}`,
    fontSize: 10,
    bold: false,
    color: '0.3 0.3 0.3 rg',
    spaceBefore: 2,
  });
  allLines.push({
    text: `HIPAA Confidential — Do Not Distribute`,
    fontSize: 8,
    bold: true,
    color: '0.8 0.2 0.2 rg',
    spaceBefore: 8,
  });

  // Separator line placeholder
  allLines.push({ text: '---', fontSize: 1, bold: false, spaceBefore: 8 });

  // Sections
  for (const section of sections) {
    allLines.push({
      text: section.title,
      fontSize: 13,
      bold: true,
      color: '0.15 0.15 0.15 rg',
      spaceBefore: 18,
    });

    const contentLines = Array.isArray(section.content)
      ? section.content
      : [section.content];

    for (const line of contentLines) {
      const wrapped = wrapText(line, CHARS_PER_LINE);
      for (let i = 0; i < wrapped.length; i++) {
        const lineText = wrapped[i] ?? '';
        allLines.push({
          text: lineText,
          fontSize: 10,
          bold: false,
          color: '0.2 0.2 0.2 rg',
          spaceBefore: i === 0 ? 6 : 2,
        });
      }
    }
  }

  // ─── Paginate lines ────────────────────────────────
  const pages: TextLine[][] = [];
  let currentPage: TextLine[] = [];
  let currentY = 0;

  for (const line of allLines) {
    const lineSpace = (line.spaceBefore ?? 0) + (line.fontSize > 12 ? 18 : LINE_HEIGHT);
    if (currentY + lineSpace > USABLE_HEIGHT && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentY = 0;
    }
    currentPage.push(line);
    currentY += lineSpace;
  }
  if (currentPage.length > 0) pages.push(currentPage);

  // ─── Create PDF objects ────────────────────────────

  // Object 1: Catalog
  addObject('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Object 2: Pages (placeholder, will be updated)
  const pagesObjIndex = addObject(''); // placeholder

  // Object 3: Font (Helvetica)
  addObject(
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
  );

  // Object 4: Font (Helvetica-Bold)
  addObject(
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
  );

  // Create page objects and content streams
  const pageObjIds: number[] = [];

  for (const pageLines of pages) {
    // Build content stream
    let stream = 'BT\n';
    let yPos = PAGE_HEIGHT - MARGIN_TOP;

    for (const line of pageLines) {
      yPos -= line.spaceBefore ?? 0;

      if (line.text === '---') {
        // Separator — draw a line
        stream += 'ET\n';
        stream += '0.8 0.8 0.8 RG\n';
        stream += `${MARGIN_LEFT} ${yPos} m ${PAGE_WIDTH - MARGIN_RIGHT} ${yPos} l S\n`;
        stream += 'BT\n';
        yPos -= 4;
        continue;
      }

      const font = line.bold ? '/F2' : '/F1';
      stream += `${font} ${line.fontSize} Tf\n`;
      if (line.color) stream += `${line.color}\n`;
      stream += `${MARGIN_LEFT} ${yPos} Td\n`;
      stream += `(${pdfEscape(line.text)}) Tj\n`;
      yPos -= line.fontSize > 12 ? 18 : LINE_HEIGHT;

      // Reset position for next absolute Td
      stream += `${-MARGIN_LEFT} ${-yPos} Td\n`;
    }

    stream += 'ET\n';

    // Footer
    stream += '0.5 0.5 0.5 rg\n';
    stream += 'BT\n';
    stream += `/F1 8 Tf\n`;
    stream += `${MARGIN_LEFT} 30 Td\n`;
    stream += `(Peacefull.ai — Confidential Patient Record) Tj\n`;
    stream += `${PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT - 60} 0 Td\n`;
    stream += `(Page ${pageObjIds.length + 1} of ${pages.length}) Tj\n`;
    stream += 'ET\n';

    const contentObjId = addObject(
      `${objectCount + 1} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`,
    );

    const pageObjId = addObject(
      `${objectCount + 1} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentObjId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj\n`,
    );

    pageObjIds.push(pageObjId);
  }

  // Update Pages object
  const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(' ');
  objects[pagesObjIndex - 1] = `2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pageObjIds.length} >>\nendobj\n`;

  // ─── Assemble PDF ─────────────────────────────────
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += objects[i];
  }

  // Cross-reference table
  const xrefOffset = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objectCount + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }

  // Trailer
  pdf += 'trailer\n';
  pdf += `<< /Size ${objectCount + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF\n';

  // Convert to Uint8Array
  const encoder = new TextEncoder();
  return encoder.encode(pdf);
}

/**
 * Generates a PDF from structured patient export data and triggers a browser download.
 */
export function downloadPatientPdf(
  data: Record<string, unknown>,
  patientName: string,
): void {
  const sections: PdfSection[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length > 0) {
      const content: string[] = [];
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          const entries = Object.entries(item as Record<string, unknown>);
          const line = entries
            .map(([k, v]) => `${k}: ${String(v ?? '—')}`)
            .join('  |  ');
          content.push(line);
        } else {
          content.push(String(item));
        }
      }
      sections.push({
        title: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
        content,
      });
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const content: string[] = [];
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        content.push(`${k}: ${String(v ?? '—')}`);
      }
      sections.push({
        title: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
        content,
      });
    } else if (value !== null && value !== undefined) {
      sections.push({
        title: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
        content: [String(value)],
      });
    }
  }

  const pdfBytes = generatePdf({
    title: 'Peacefull.ai — Patient Data Export',
    subtitle: 'Clinical Record Export',
    patientName,
    sections,
  });

  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `peacefull-export-${patientName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
