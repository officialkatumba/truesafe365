const {
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
  ShadingType,
} = require("docx");

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function tableBorders() {
  return {
    top: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
  };
}

function headerCell(text) {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, fill: "1E3C5C" },
    borders: tableBorders(),
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20 })] })],
  });
}

function cell(text, options = {}) {
  return new TableCell({
    borders: tableBorders(),
    children: [new Paragraph({ children: [new TextRun({ text: cleanText(text), size: 20, bold: options.bold, color: options.color || "1F1F1F" })] })],
  });
}

async function generateTransportChecklistDocx({ checklist, label }) {
  const children = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: (label || "Transport Checklist").toUpperCase(), bold: true, size: 34, color: "1E3C5C" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: checklist.workArea?.name || "", bold: true, size: 24, color: "2F5597" })],
    }),
  );

  const infoRows = [
    ["Checklist No.", `#${checklist.checklistNumber}`],
    ["Driver", checklist.driverName || ""],
    ["Vehicle Registration", checklist.vehicleRegistration || "N/A"],
    ["Route", checklist.route || "N/A"],
    ["Date", new Date(checklist.date).toLocaleString("en-GB")],
    ["Result", checklist.overallResult === "pass" ? "CLEARED TO PROCEED" : "FAILED - DO NOT PROCEED"],
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: infoRows.map(
        ([lbl, value]) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 32, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: "D9E2F3" },
                borders: tableBorders(),
                children: [new Paragraph({ children: [new TextRun({ text: lbl, bold: true, size: 20, color: "1E3C5C" })] })],
              }),
              new TableCell({
                width: { size: 68, type: WidthType.PERCENTAGE },
                borders: tableBorders(),
                children: [new Paragraph({ children: [new TextRun({ text: cleanText(value), size: 20 })] })],
              }),
            ],
          }),
      ),
    }),
  );

  children.push(
    new Paragraph({
      spacing: { before: 300, after: 160 },
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "CHECKLIST ITEMS", bold: true, size: 24, color: "1E3C5C" })],
    }),
  );

  const rows = [
    new TableRow({ children: ["Item", "Critical", "Response", "Notes"].map(headerCell) }),
  ];

  checklist.items.forEach((item) => {
    rows.push(
      new TableRow({
        children: [
          cell(item.question),
          cell(item.critical ? "Yes" : "No"),
          cell(item.response?.toUpperCase(), {
            bold: true,
            color: item.critical && item.response === "no" ? "C00000" : "1F1F1F",
          }),
          cell(item.notes || ""),
        ],
      }),
    );
  });

  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));

  if (checklist.failureNotes) {
    children.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [new TextRun({ text: `Critical failures: ${checklist.failureNotes}`, bold: true, color: "C00000", size: 20 })],
      }),
    );
  }

  children.push(
    new Paragraph({
      spacing: { before: 300, after: 120 },
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: "SIGN-OFF", bold: true, size: 24, color: "1E3C5C" })],
    }),
    new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Driver Name: ______________________________", size: 20 })] }),
    new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Signature: ___________________________", size: 20 })] }),
    new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Date: _______________________________", size: 20 })] }),
  );

  const doc = new Document({
    creator: "TrueSafe365",
    title: label || "Transport Checklist",
    description: "Editable transport/logistics checklist",
    sections: [{ properties: { page: { margin: { top: 1000, right: 900, bottom: 1000, left: 900 } } }, children }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateTransportChecklistDocx };
