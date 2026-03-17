import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, BorderStyle, WidthType, AlignmentType } from "docx";
import { saveAs } from "./saveAs";

// Parse the markdown report into structured sections
interface ReportSection {
  type: "heading1" | "heading2" | "text" | "bullet" | "tableRow" | "divider";
  content: string;
  cells?: string[];
  bold?: boolean;
}

export function parseReport(report: string): ReportSection[] {
  const lines = report.split("\n");
  const sections: ReportSection[] = [];
  for (const line of lines) {
    if (line.startsWith("# ")) {
      sections.push({ type: "heading1", content: line.slice(2).trim() });
    } else if (line.startsWith("## ")) {
      sections.push({ type: "heading2", content: line.slice(3).trim() });
    } else if (line.startsWith("*   ")) {
      sections.push({ type: "bullet", content: line.replace(/^\*\s+/, "").replace(/\*\*/g, "").trim() });
    } else if (line.startsWith("| ") && line.includes("|") && !/^\|[\s|:\-]+\|$/.test(line.trim())) {
      const cells = line.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length > 0) sections.push({ type: "tableRow", content: line, cells });
    } else if (line.startsWith("---")) {
      sections.push({ type: "divider", content: "" });
    } else if (line.trim()) {
      sections.push({ type: "text", content: line.replace(/\*\*/g, "").trim() });
    }
  }
  return sections;
}

// ── PDF Export ──────────────────────────────────────────────────────────────
export function downloadAsPDF(report: string, title: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 20;

  const checkPage = (needed = 8) => {
    if (y + needed > 280) { doc.addPage(); y = 20; }
  };

  const sections = parseReport(report);
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (!tableRows.length) return;
    const colCount = Math.max(tableHeaders.length, ...tableRows.map(r => r.length));
    const colW = contentW / colCount;

    // Header row
    doc.setFillColor(30, 58, 138);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    checkPage(10);
    doc.rect(margin, y, contentW, 8, "F");
    tableHeaders.forEach((h, i) => {
      doc.text(h.slice(0, 20), margin + i * colW + 2, y + 5.5);
    });
    y += 8;

    // Data rows
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "normal");
    tableRows.forEach((row, ri) => {
      checkPage(8);
      if (ri % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(margin, y, contentW, 7, "F"); }
      row.forEach((cell, i) => {
        doc.text(String(cell).slice(0, 22), margin + i * colW + 2, y + 5);
      });
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, y, contentW, 7, "S");
      y += 7;
    });

    tableHeaders = [];
    tableRows = [];
    inTable = false;
    y += 4;
  };

  for (const s of sections) {
    if (s.type !== "tableRow" && inTable) flushTable();

    if (s.type === "heading1") {
      checkPage(14);
      doc.setFillColor(30, 58, 138);
      doc.rect(0, y - 4, pageW, 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(s.content, pageW / 2, y + 5, { align: "center" });
      doc.setTextColor(30, 30, 30);
      y += 16;
    } else if (s.type === "heading2") {
      checkPage(10);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text(s.content, margin, y);
      doc.setDrawColor(30, 58, 138);
      doc.line(margin, y + 1.5, margin + contentW, y + 1.5);
      doc.setTextColor(30, 30, 30);
      y += 8;
    } else if (s.type === "bullet") {
      checkPage(7);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(`• ${s.content}`, contentW - 5);
      lines.forEach((l: string) => { checkPage(6); doc.text(l, margin + 4, y); y += 5.5; });
    } else if (s.type === "text") {
      checkPage(7);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(s.content, contentW);
      lines.forEach((l: string) => { checkPage(6); doc.text(l, margin, y); y += 5.5; });
    } else if (s.type === "divider") {
      checkPage(5);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, margin + contentW, y);
      y += 5;
    } else if (s.type === "tableRow" && s.cells) {
      if (!inTable) {
        tableHeaders = s.cells;
        inTable = true;
      } else {
        tableRows.push(s.cells);
      }
    }
  }
  if (inTable) flushTable();

  doc.save(`MoM_${title.replace(/\s+/g, "_")}.pdf`);
}

// ── Word Export ─────────────────────────────────────────────────────────────
export async function downloadAsWord(report: string, title: string) {
  const sections = parseReport(report);
  const children: any[] = [];

  let tableHeaders: string[] = [];
  let tableDataRows: string[][] = [];
  let inTable = false;

  const flushTable = () => {
    if (!tableHeaders.length) return;
    const rows = [
      new TableRow({
        children: tableHeaders.map(h =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 18 })], alignment: AlignmentType.CENTER })],
            shading: { fill: "1E3A8A" },
          })
        ),
      }),
      ...tableDataRows.map((row, ri) =>
        new TableRow({
          children: row.map(cell =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: cell, size: 18 })] })],
              shading: ri % 2 === 0 ? { fill: "F5F7FA" } : undefined,
            })
          ),
        })
      ),
    ];
    children.push(new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
        insideH: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
        insideV: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
      },
    }));
    children.push(new Paragraph({ text: "" }));
    tableHeaders = [];
    tableDataRows = [];
    inTable = false;
  };

  for (const s of sections) {
    if (s.type !== "tableRow" && inTable) flushTable();

    if (s.type === "heading1") {
      children.push(new Paragraph({ text: s.content, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }));
    } else if (s.type === "heading2") {
      children.push(new Paragraph({ text: s.content, heading: HeadingLevel.HEADING_2 }));
    } else if (s.type === "bullet") {
      children.push(new Paragraph({ children: [new TextRun({ text: `• ${s.content}`, size: 20 })], indent: { left: 360 } }));
    } else if (s.type === "text") {
      children.push(new Paragraph({ children: [new TextRun({ text: s.content, size: 20 })] }));
    } else if (s.type === "divider") {
      children.push(new Paragraph({ text: "", border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } } }));
    } else if (s.type === "tableRow" && s.cells) {
      if (!inTable) { tableHeaders = s.cells; inTable = true; }
      else tableDataRows.push(s.cells);
    }
  }
  if (inTable) flushTable();

  const docx = new Document({
    sections: [{ children }],
    styles: {
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", run: { color: "1E3A8A", size: 32, bold: true } },
        { id: "Heading2", name: "Heading 2", run: { color: "1E3A8A", size: 24, bold: true } },
      ],
    },
  });

  const blob = await Packer.toBlob(docx);
  saveAs(blob, `MoM_${title.replace(/\s+/g, "_")}.docx`);
}
