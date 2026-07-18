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
  if (!value) return "";

  return String(value)
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/#{1,6}\s?/g, "")
    .replace(/`/g, "")
    .replace(/_{2,}/g, "")
    .replace(/-{3,}/g, "")
    .replace(/\[|\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tableBorders() {
  return {
    top: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
  };
}

function createParagraph(text, options = {}) {
  return new Paragraph({
    spacing: { after: options.after ?? 140, before: options.before ?? 0, line: 276 },
    alignment: options.alignment || AlignmentType.LEFT,
    children: [
      new TextRun({
        text: cleanText(text),
        bold: options.bold || false,
        italics: options.italics || false,
        size: options.size || 22,
        color: options.color || "1F1F1F",
      }),
    ],
  });
}

function createMainHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 160 },
    border: { bottom: { color: "1E3C5C", space: 6, style: BorderStyle.SINGLE, size: 8 } },
    children: [
      new TextRun({ text: cleanText(text).toUpperCase(), bold: true, size: 28, color: "1E3C5C" }),
    ],
  });
}

function createBullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 100, line: 276 },
    children: [new TextRun({ text: cleanText(text), size: 22, color: "1F1F1F" })],
  });
}

function createTitleBlock(mainTitle, subTitle) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: mainTitle, bold: true, size: 38, color: "1E3C5C" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: cleanText(subTitle), bold: true, size: 26, color: "2F5597" })],
    }),
  ];
}

function createSignatureBlock(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (row) =>
        new TableRow({
          children: [
            new TableCell({
              borders: tableBorders(),
              children: [
                createParagraph(row.label, { bold: true, color: "1E3C5C" }),
                createParagraph("Name: ______________________________"),
                createParagraph("Signature: ___________________________"),
                createParagraph("Date: _______________________________"),
              ],
            }),
          ],
        }),
    ),
  });
}

async function generateCommitteeFormationDocx({ workArea, doc }) {
  const committee = doc.committee || {};
  const children = [];

  children.push(
    ...createTitleBlock(
      "HEALTH AND SAFETY COMMITTEE FORMATION",
      `${workArea.name} — Occupational Health and Safety Act No. 16 of 2025, Section 9`,
    ),
  );

  children.push(
    createParagraph(
      `In accordance with Section 9 of the Occupational Health and Safety Act No. 16 of 2025, this workplace hereby establishes a Health and Safety Committee within thirty (30) days of commencing operations or employing ten (10) or more persons, whichever applies. This editable Word document was generated as a starting draft; the Safety Officer should review, complete, and file it as evidence of committee formation.`,
      { italics: true, color: "666666" },
    ),
  );

  children.push(createMainHeading("Committee Details"));
  const detailRows = [
    ["Work Area / Site", workArea.name],
    ["Date Established", committee.establishedDate ? new Date(committee.establishedDate).toLocaleDateString("en-GB") : "____________________"],
    ["Meeting Frequency", committee.meetingFrequency || "Monthly"],
    ["Health and Safety Representative", committee.healthAndSafetyRepresentative || "____________________"],
  ];
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: detailRows.map(
        ([label, value]) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 35, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: "D9E2F3" },
                borders: tableBorders(),
                children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22, color: "1E3C5C" })] })],
              }),
              new TableCell({
                width: { size: 65, type: WidthType.PERCENTAGE },
                borders: tableBorders(),
                children: [new Paragraph({ children: [new TextRun({ text: cleanText(value), size: 22 })] })],
              }),
            ],
          }),
      ),
    }),
  );

  children.push(createMainHeading("Committee Membership"));
  children.push(
    createParagraph(
      "Section 10 requires equal representation of employer and employee representatives, with employee representatives chosen by employees or a trade union.",
    ),
  );

  const memberRows = [
    new TableRow({
      children: ["Name", "Role", "Representing"].map(
        (heading) =>
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: "D9E2F3" },
            borders: tableBorders(),
            children: [new Paragraph({ children: [new TextRun({ text: heading, bold: true, color: "1E3C5C", size: 22 })] })],
          }),
      ),
    }),
  ];

  const members = committee.members?.length ? committee.members : [{}, {}, {}, {}];
  members.forEach((member) => {
    memberRows.push(
      new TableRow({
        children: [member.name || "", member.role || "", member.representing || ""].map(
          (value) =>
            new TableCell({
              borders: tableBorders(),
              children: [new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: cleanText(value), size: 22 })] })],
            }),
        ),
      }),
    );
  });
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: memberRows }));

  if (doc.generatedContent?.responsibilities?.length) {
    children.push(createMainHeading("Committee Functions (Section 11)"));
    doc.generatedContent.responsibilities.forEach((item) => children.push(createBullet(item)));
  }

  if (doc.generatedContent?.procedures?.length) {
    children.push(createMainHeading("Formation and Reporting Procedure"));
    doc.generatedContent.procedures.forEach((item) => children.push(createBullet(item)));
  }

  children.push(createMainHeading("Sign-Off"));
  children.push(
    createSignatureBlock([
      { label: "Established By (Safety Officer):" },
      { label: "Health and Safety Representative:" },
    ]),
  );

  const docx = new Document({
    creator: "TrueSafe365",
    title: doc.title,
    description: "Editable Health and Safety Committee Formation document",
    sections: [{ properties: { page: { margin: { top: 1000, right: 900, bottom: 1000, left: 900 } } }, children }],
  });

  return Packer.toBuffer(docx);
}

async function generateHSPolicyDocx({ workArea, doc }) {
  const policy = doc.policy || {};
  const content = doc.generatedContent || {};
  const children = [];

  children.push(
    ...createTitleBlock(
      "HEALTH AND SAFETY POLICY",
      `${workArea.name} — Occupational Health and Safety Act No. 16 of 2025, Section 14`,
    ),
  );

  children.push(
    createParagraph(
      "This editable Word document was generated as a starting draft for the mandatory site Health and Safety Policy required under Section 14 of the Occupational Health and Safety Act No. 16 of 2025. The Chief Executive Officer must review, personalize, sign, display, and communicate this policy to all workers.",
      { italics: true, color: "666666" },
    ),
  );

  if (content.introduction) {
    children.push(createMainHeading("Policy Statement"));
    children.push(createParagraph(content.introduction));
  }

  if (content.commitments?.length) {
    children.push(createMainHeading("Our Commitments"));
    content.commitments.forEach((item) => children.push(createBullet(item)));
  }

  if (content.responsibilities?.length) {
    children.push(createMainHeading("Roles and Responsibilities"));
    content.responsibilities.forEach((item) => children.push(createBullet(item)));
  }

  if (content.procedures?.length) {
    children.push(createMainHeading("Implementation and Review"));
    content.procedures.forEach((item) => children.push(createBullet(item)));
  }

  if (content.closingStatement) {
    children.push(createMainHeading("Closing Statement"));
    children.push(createParagraph(content.closingStatement));
  }

  children.push(createMainHeading("Approval"));
  const approvalRows = [
    ["Effective Date", policy.effectiveDate ? new Date(policy.effectiveDate).toLocaleDateString("en-GB") : "____________________"],
    ["Next Review Date", policy.reviewDate ? new Date(policy.reviewDate).toLocaleDateString("en-GB") : "____________________"],
  ];
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: approvalRows.map(
        ([label, value]) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 35, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: "D9E2F3" },
                borders: tableBorders(),
                children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22, color: "1E3C5C" })] })],
              }),
              new TableCell({
                width: { size: 65, type: WidthType.PERCENTAGE },
                borders: tableBorders(),
                children: [new Paragraph({ children: [new TextRun({ text: cleanText(value), size: 22 })] })],
              }),
            ],
          }),
      ),
    }),
  );

  children.push(
    createParagraph(
      "This policy must be signed by the Chief Executive Officer, displayed prominently at the workplace, and disseminated to all workers, as required by Section 14(2)(a)-(d).",
      { before: 200, italics: true, color: "666666" },
    ),
  );

  children.push(
    createSignatureBlock([{ label: `${policy.ceoTitle || "Chief Executive Officer"} (${policy.ceoName || "Name"}):` }]),
  );

  const docx = new Document({
    creator: "TrueSafe365",
    title: doc.title,
    description: "Editable Health and Safety Policy document",
    sections: [{ properties: { page: { margin: { top: 1000, right: 900, bottom: 1000, left: 900 } } }, children }],
  });

  return Packer.toBuffer(docx);
}

module.exports = {
  generateCommitteeFormationDocx,
  generateHSPolicyDocx,
};
