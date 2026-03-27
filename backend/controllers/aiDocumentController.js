// backend/controllers/aiDocumentController.js
const { OpenAI } = require("openai");
const WorkArea = require("../models/WorkArea");
const Worksite = require("../models/Worksite");
const RiskAssessment = require("../models/RiskAssessment");
const SafetyTalk = require("../models/SafetyTalk");
const Incident = require("../models/Incident");
const PPEChecklist = require("../models/PPEChecklist");
const JSA = require("../models/JSA");
const PDFDocument = require("pdfkit");
const fs = require("fs");

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper: Get comprehensive work area context
async function getComprehensiveWorkAreaContext(workAreaId) {
  const workArea = await WorkArea.findById(workAreaId)
    .populate("worksite", "name location siteType clientName")
    .populate("assignedSafetyOfficers.officer", "name email officerNumber");

  // Get approved documents for context
  const approvedRiskAssessments = await RiskAssessment.find({
    workArea: workAreaId,
    status: "approved",
    approvalStatus: "approved",
  })
    .sort({ createdAt: -1 })
    .limit(3);

  const approvedSafetyTalks = await SafetyTalk.find({
    workArea: workAreaId,
    status: "conducted",
  })
    .sort({ createdAt: -1 })
    .limit(3);

  const approvedIncidents = await Incident.find({
    workArea: workAreaId,
    status: "closed",
  })
    .sort({ createdAt: -1 })
    .limit(5);

  const approvedPPEChecklists = await PPEChecklist.find({
    workArea: workAreaId,
    status: "completed",
  })
    .sort({ createdAt: -1 })
    .limit(2);

  return {
    workArea: {
      id: workArea._id,
      name: workArea.name,
      code: workArea.code,
      description: workArea.description,
      location: workArea.location,
      status: workArea.status,
      currentWorkTypes: workArea.currentWorkTypes,
      activeShifts: workArea.activeShifts,
      statistics: workArea.statistics,
      initialContext: workArea.initialContext,
    },
    worksite: workArea.worksite,
    existingHazards: workArea.identifiedHazards || [],
    safetyObservations: workArea.safetyObservations || [],
    concernsRegister: workArea.concernsRegister || [],
    approvedDocuments: {
      riskAssessments: approvedRiskAssessments,
      safetyTalks: approvedSafetyTalks,
      incidents: approvedIncidents,
      ppeChecklists: approvedPPEChecklists,
    },
  };
}

// Generate Risk Assessment with AI
exports.generateRiskAssessment = async (req, res) => {
  try {
    const {
      workAreaId,
      activityDescription,
      hazardsIdentified,
      affectedGroups,
      existingControls,
      weatherConditions,
      equipmentInvolved,
      personnelCount,
      experienceLevel,
      previousIncidents,
      specificConcerns,
      regulatoryRequirements,
    } = req.body;

    const context = await getComprehensiveWorkAreaContext(workAreaId);

    // Build comprehensive prompt
    const prompt = `
You are a senior Health and Safety Officer with 20+ years of experience in high-risk industries. You are known for producing thorough, practical, and legally compliant risk assessments.

## WORK AREA INFORMATION
- **Work Area:** ${context.workArea.name} (${context.workArea.code || "No code"})
- **Location:** ${context.workArea.location?.zone || "Not specified"}
- **Worksite:** ${context.worksite.name} (${context.worksite.siteType})
- **Current Status:** ${context.workArea.status}
- **Work Types:** ${context.workArea.currentWorkTypes?.map((w) => w.workType).join(", ") || "Various"}

## USER INPUTS
- **Activity Description:** ${activityDescription || "General work activities"}
- **Hazards Identified:** ${hazardsIdentified || "Based on site observations"}
- **Affected Groups:** ${affectedGroups || "Workers, supervisors, contractors"}
- **Existing Controls:** ${existingControls || "Standard site controls"}
- **Weather Conditions:** ${weatherConditions || "Normal conditions"}
- **Equipment Involved:** ${equipmentInvolved || "Standard site equipment"}
- **Personnel Count:** ${personnelCount || "10-20 workers"}
- **Experience Level:** ${experienceLevel || "Mixed (experienced and new workers)"}
- **Previous Incidents:** ${previousIncidents || "No specific recent incidents"}
- **Specific Concerns:** ${specificConcerns || "General safety awareness"}
- **Regulatory Requirements:** ${regulatoryRequirements || "OSHA, ISO 45001, local regulations"}

## REFERENCE FROM APPROVED DOCUMENTS
${
  context.approvedDocuments.riskAssessments.length > 0
    ? `
**Previously Approved Risk Assessments:**
${context.approvedDocuments.riskAssessments
  .map(
    (ra) => `
- ${ra.title}: Key controls - ${ra.overallFindings?.substring(0, 200)}...
`,
  )
  .join("")}
`
    : "No previous risk assessments available."
}

${
  context.approvedDocuments.incidents.length > 0
    ? `
**Recent Incidents for Reference:**
${context.approvedDocuments.incidents
  .map(
    (inc) => `
- ${inc.type} (${inc.severity}): ${inc.description?.substring(0, 150)}...
`,
  )
  .join("")}
`
    : "No recent incidents recorded."
}

## EXISTING HAZARDS IN WORK AREA
${context.existingHazards.map((h) => `- ${h.hazard} (Risk Level: ${h.riskLevel})`).join("\n") || "No existing hazards recorded."}

Generate a comprehensive Risk Assessment document with the following sections:

### 1. Executive Summary
Brief overview of the assessment, key findings, and overall risk level.

### 2. Scope and Methodology
- Activities covered in this assessment
- Assessment methodology used
- Personnel consulted

### 3. Detailed Hazard Analysis (for each hazard)
For each major hazard, provide:
- **Hazard Description:** Clear description of the hazard
- **Risk Rating (Before Controls):** Likelihood (Rare/Unlikely/Possible/Likely/Almost Certain) and Consequence (Insignificant/Minor/Moderate/Major/Catastrophic)
- **Risk Score:** Numerical score (1-25)
- **Existing Controls:** What's currently in place
- **Effectiveness:** How effective are current controls?
- **Recommended Additional Controls:** Specific, actionable measures
- **Responsible Party:** Who implements these controls?
- **Deadline:** Realistic implementation timeline
- **Residual Risk Rating:** After controls are implemented

### 4. Risk Matrix Summary
- Heat map of risks by category
- Highest priority risks requiring immediate action

### 5. Control Measures Summary
- Engineering controls needed
- Administrative controls needed
- PPE requirements with specifications
- Training requirements

### 6. Emergency Procedures
Specific emergency response for identified risks

### 7. Monitoring and Review
- How often to monitor controls
- Review schedule
- Key performance indicators

### 8. Action Plan
Table format with:
- Action item
- Priority (High/Medium/Low)
- Responsible person
- Due date
- Status

### 9. Approvals
Space for signatures and dates

Use professional safety language, reference specific regulations (OSHA 1926, ISO 45001:2018), and provide practical, actionable recommendations. Be thorough but concise.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a senior HSE consultant specializing in construction and industrial safety. Your risk assessments are known for being thorough, practical, and legally compliant. You use clear, actionable language and reference specific standards.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4500,
    });

    const generatedContent = completion.choices[0].message.content;

    // Create draft risk assessment
    const riskAssessment = new RiskAssessment({
      workArea: workAreaId,
      title: `Risk Assessment - ${context.workArea.name} - ${new Date().toLocaleDateString()}`,
      description:
        activityDescription ||
        `Comprehensive risk assessment for ${context.workArea.name}`,
      assessmentDate: new Date(),
      conductedBy: req.user.safetyOfficer,
      scope: {
        type: "area_wide",
        workTypes:
          context.workArea.currentWorkTypes?.map((w) => w.workType) || [],
        shifts: context.workArea.activeShifts?.map((s) => s.name) || [],
      },
      status: "draft",
      aiGenerated: true,
      aiPrompt: prompt,
      aiResponse: generatedContent,
      createdBy: req.user.safetyOfficer,
    });

    await riskAssessment.save();

    res.json({
      success: true,
      documentId: riskAssessment._id,
      documentType: "risk_assessment",
      content: generatedContent,
      title: riskAssessment.title,
      message:
        "Risk assessment generated successfully. Review and approve to finalize.",
    });
  } catch (error) {
    console.error("Error generating risk assessment:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Generate PPE Requirements & Checklist
exports.generatePPERequirements = async (req, res) => {
  try {
    const {
      workAreaId,
      activities,
      hazards,
      existingPPE,
      complianceIssues,
      workerCount,
      specialRequirements,
      temperatureConditions,
    } = req.body;

    const context = await getComprehensiveWorkAreaContext(workAreaId);

    // Get latest approved risk assessment for reference
    const latestRiskAssessment = await RiskAssessment.findOne({
      workArea: workAreaId,
      status: "approved",
      approvalStatus: "approved",
    }).sort({ createdAt: -1 });

    const prompt = `
You are a PPE specialist and safety professional. Generate a comprehensive PPE Requirements and Checklist based on the following:

## WORK AREA: ${context.workArea.name}
## WORKSITE: ${context.worksite.name} (${context.worksite.siteType})

## USER INPUT
- **Activities:** ${activities || "General work activities"}
- **Hazards:** ${hazards || "Standard site hazards"}
- **Existing PPE Provided:** ${existingPPE || "Standard PPE available"}
- **Compliance Issues:** ${complianceIssues || "None reported"}
- **Worker Count:** ${workerCount || "Varies by shift"}
- **Special Requirements:** ${specialRequirements || "None"}
- **Temperature Conditions:** ${temperatureConditions || "Variable"}

${
  latestRiskAssessment
    ? `
## REFERENCE - APPROVED RISK ASSESSMENT
The latest approved risk assessment identifies these key hazards requiring PPE:
${latestRiskAssessment.hazards?.map((h) => `- ${h.description} (Risk Level: ${h.initialRisk?.riskLevel || h.riskLevel})`).join("\n") || "Multiple hazards identified"}
`
    : ""
}

## CURRENT HAZARDS IN WORK AREA
${context.existingHazards.map((h) => `- ${h.hazard} (Risk Level: ${h.riskLevel})`).join("\n") || "General construction hazards"}

Generate a comprehensive PPE Requirements document with:

### 1. PPE Requirements Table
| Body Part | Required PPE | Specification | Quantity per Worker | Inspection Frequency | Replacement Schedule |
|-----------|--------------|---------------|---------------------|---------------------|---------------------|
(Provide detailed entries for head, eyes, face, hearing, respiratory, hands, feet, body, fall protection)

### 2. Task-Specific PPE Matrix
For each activity/task, specify required PPE:
- Task/Activity
- Required PPE
- When to wear
- Special notes

### 3. PPE Inspection Checklist
Detailed checklist for inspecting each PPE item:
- Inspection criteria
- Common defects to look for
- Pass/fail criteria
- Action when failed

### 4. PPE Issue and Tracking Log
- Worker name
- PPE item issued
- Date issued
- Size
- Condition
- Expiry date
- Return/Replace date

### 5. Compliance Monitoring Plan
- How to monitor PPE compliance
- Frequency of spot checks
- Corrective action process
- Documentation requirements

### 6. Training Requirements
- PPE training topics
- Frequency
- Competency assessment

### 7. Emergency PPE Provisions
- Emergency response PPE
- Location and quantity

### 8. Procurement Specifications
- Recommended brands/models
- Standards compliance (ANSI, CSA, etc.)

Make this document practical, actionable, and specific to ${context.worksite.siteType} work environments.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a PPE specialist with expertise in industrial safety equipment standards. You provide detailed, practical PPE recommendations that are compliant with ANSI, CSA, and ISO standards.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const generatedContent = completion.choices[0].message.content;

    const ppeChecklist = new PPEChecklist({
      worksite: context.worksite._id,
      workArea: workAreaId,
      createdBy: req.user.safetyOfficer,
      title: `PPE Requirements - ${context.workArea.name} - ${new Date().toLocaleDateString()}`,
      date: new Date(),
      ppeItems: [], // Will be populated from parsing
      status: "draft",
      aiGenerated: true,
      aiContent: generatedContent,
      aiPrompt: prompt,
    });

    await ppeChecklist.save();

    res.json({
      success: true,
      documentId: ppeChecklist._id,
      documentType: "ppe_checklist",
      content: generatedContent,
      title: ppeChecklist.title,
      message: "PPE requirements generated successfully.",
    });
  } catch (error) {
    console.error("Error generating PPE requirements:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Generate JSA (Job Safety Analysis)
exports.generateJSA = async (req, res) => {
  try {
    const {
      workAreaId,
      jobTask,
      equipmentUsed,
      workersAssigned,
      supervisionLevel,
      environmentConditions,
      timeConstraints,
      previousIssues,
      specialPermits,
    } = req.body;

    const context = await getComprehensiveWorkAreaContext(workAreaId);

    const latestRiskAssessment = await RiskAssessment.findOne({
      workArea: workAreaId,
      status: "approved",
    }).sort({ createdAt: -1 });

    const prompt = `
You are a safety professional with expertise in Job Safety Analysis. Generate a comprehensive JSA for:

## JOB TASK: ${jobTask || "General work activity"}

## WORK AREA: ${context.workArea.name}
## WORKSITE: ${context.worksite.name}

## USER INPUT
- **Equipment Used:** ${equipmentUsed || "Standard tools and equipment"}
- **Workers Assigned:** ${workersAssigned || "Qualified workers"}
- **Supervision Level:** ${supervisionLevel || "Adequate supervision"}
- **Environment Conditions:** ${environmentConditions || "Standard conditions"}
- **Time Constraints:** ${timeConstraints || "Normal schedule"}
- **Previous Issues:** ${previousIssues || "None reported"}
- **Special Permits:** ${specialPermits || "None required"}

${
  latestRiskAssessment
    ? `
## REFERENCE HAZARDS FROM RISK ASSESSMENT
${latestRiskAssessment.hazards?.map((h) => `- ${h.description}`).join("\n") || "General hazards identified"}
`
    : ""
}

Create a detailed JSA with:

### 1. Job/Task Overview
- Task description
- Location
- Personnel involved
- Duration estimate

### 2. Step-by-Step Analysis (Table format)
| Step | Task Description | Potential Hazards | Risk Level | Controls Required | Responsible Person |
|------|------------------|-------------------|------------|-------------------|-------------------|
(Provide 5-10 detailed steps with comprehensive analysis)

### 3. Required Permits
- Permit type
- Issuing authority
- Validity period
- Conditions

### 4. Required Training/Certifications
- Specific training needed
- Certification requirements
- Competency verification

### 5. Required PPE
- Specific PPE for this task
- Special considerations

### 6. Emergency Procedures
- Task-specific emergencies
- Response actions
- Emergency contacts

### 7. Sign-off Section
- Job supervisor signature
- Safety officer review
- Worker acknowledgment

Ensure the analysis is thorough, practical, and accounts for the specific hazards in ${context.worksite.siteType} environments.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a JSA specialist who creates detailed, step-by-step job safety analyses that are practical and easy to follow.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 3500,
    });

    const generatedContent = completion.choices[0].message.content;

    const jsa = new JSA({
      worksite: context.worksite._id,
      workArea: workAreaId,
      createdBy: req.user.safetyOfficer,
      jobTitle: jobTask,
      jobDescription: generatedContent,
      status: "draft",
      aiGenerated: true,
    });

    await jsa.save();

    res.json({
      success: true,
      documentId: jsa._id,
      documentType: "jsa",
      content: generatedContent,
      title: `JSA - ${jobTask}`,
      message: "Job Safety Analysis generated successfully.",
    });
  } catch (error) {
    console.error("Error generating JSA:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Generate Safety Talk
exports.generateSafetyTalk = async (req, res) => {
  try {
    const {
      workAreaId,
      topic,
      recentIncident,
      targetAudience,
      duration,
      keyPoints,
      interactiveElements,
    } = req.body;

    const context = await getComprehensiveWorkAreaContext(workAreaId);

    const recentIncidentData = recentIncident
      ? await Incident.findById(recentIncident)
      : null;

    const prompt = `
You are a safety trainer with expertise in delivering engaging, memorable safety talks. Create a 5-10 minute safety talk for:

## TOPIC: ${topic || "General Site Safety"}

## WORK AREA: ${context.workArea.name}
## TARGET AUDIENCE: ${targetAudience || "Workers, supervisors, contractors"}
## DURATION: ${duration || "5-10 minutes"}
## KEY POINTS TO COVER: ${keyPoints || "Core safety principles"}

${
  recentIncidentData
    ? `
## REFERENCE INCIDENT TO ADDRESS
- Type: ${recentIncidentData.type}
- Severity: ${recentIncidentData.severity}
- What happened: ${recentIncidentData.description?.substring(0, 300)}
- Lessons learned: ${recentIncidentData.lessonsLearned || "To be discussed"}
`
    : ""
}

## CURRENT WORK AREA HAZARDS
${context.existingHazards.map((h) => `- ${h.hazard}`).join("\n") || "General hazards"}

Create an engaging safety talk with:

### 1. Opening Hook (30-60 seconds)
A compelling story, statistic, or question to grab attention

### 2. Main Message (3-5 minutes)
- Key safety points
- Why this matters
- Real examples relevant to the work area

### 3. Interactive Discussion Points
At least 3 discussion questions to engage workers:
- Question 1 with expected responses
- Question 2 with expected responses
- Question 3 with expected responses

### 4. Call to Action
Specific actions workers should take after the talk

### 5. Key Takeaways
3-5 bullet points summarizing the talk

### 6. Quiz Questions
2-3 simple questions to check understanding

### 7. Closing Statement
Memorable closing that reinforces the message

Make the talk conversational, relatable, and tailored to the ${context.worksite.siteType} environment. Use real-world examples from the industry.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an engaging safety trainer who creates memorable, interactive safety talks that workers actually remember and apply.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 2500,
    });

    const generatedContent = completion.choices[0].message.content;

    const safetyTalk = new SafetyTalk({
      workArea: workAreaId,
      title: topic || `Safety Talk - ${new Date().toLocaleDateString()}`,
      content: generatedContent,
      conductedBy: req.user.safetyOfficer,
      date: new Date(),
      status: "draft",
      isAIGenerated: true,
    });

    await safetyTalk.save();

    res.json({
      success: true,
      documentId: safetyTalk._id,
      documentType: "safety_talk",
      content: generatedContent,
      title: safetyTalk.title,
      message: "Safety talk generated successfully.",
    });
  } catch (error) {
    console.error("Error generating safety talk:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Enhance/Edit Document with AI
exports.enhanceDocument = async (req, res) => {
  try {
    const { documentType, documentId, userInstructions } = req.body;

    let document, currentContent, prompt;

    switch (documentType) {
      case "risk_assessment":
        document = await RiskAssessment.findById(documentId);
        currentContent = document.aiResponse || JSON.stringify(document);
        break;
      case "jsa":
        document = await JSA.findById(documentId);
        currentContent = document.jobDescription;
        break;
      case "safety_talk":
        document = await SafetyTalk.findById(documentId);
        currentContent = document.content;
        break;
      case "ppe_checklist":
        document = await PPEChecklist.findById(documentId);
        currentContent = document.aiContent || JSON.stringify(document);
        break;
    }

    prompt = `
You are a senior safety professional. I have a ${documentType.replace("_", " ")} document that needs improvement based on specific feedback.

## CURRENT DOCUMENT:
${currentContent}

## USER INSTRUCTIONS FOR IMPROVEMENT:
${userInstructions}

Please enhance this document by:
1. Addressing the specific instructions provided
2. Adding more detail where needed
3. Improving clarity and practicality
4. Ensuring compliance with industry standards
5. Maintaining professional safety language
6. Adding specific, actionable recommendations

Return the complete enhanced document with the same structure but improved content.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a senior safety professional who improves safety documents based on user feedback. You add practical details, ensure compliance, and enhance clarity.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4500,
    });

    const enhancedContent = completion.choices[0].message.content;

    // Update document based on type
    switch (documentType) {
      case "risk_assessment":
        document.aiResponse = enhancedContent;
        document.aiEnhancementHistory = document.aiEnhancementHistory || [];
        document.aiEnhancementHistory.push({
          instruction: userInstructions,
          enhancedAt: new Date(),
          version: (document.version || 1) + 1,
        });
        document.version = (document.version || 1) + 1;
        break;
      case "jsa":
        document.jobDescription = enhancedContent;
        document.enhancementHistory = document.enhancementHistory || [];
        document.enhancementHistory.push({
          instruction: userInstructions,
          date: new Date(),
        });
        break;
      case "safety_talk":
        document.content = enhancedContent;
        document.enhancementHistory = document.enhancementHistory || [];
        document.enhancementHistory.push({
          instruction: userInstructions,
          date: new Date(),
        });
        break;
      case "ppe_checklist":
        document.aiContent = enhancedContent;
        document.enhancementHistory = document.enhancementHistory || [];
        document.enhancementHistory.push({
          instruction: userInstructions,
          date: new Date(),
        });
        break;
    }

    await document.save();

    res.json({
      success: true,
      enhancedContent: enhancedContent,
      message:
        "Document enhanced successfully. Please review the improvements.",
    });
  } catch (error) {
    console.error("Error enhancing document:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Approve Document
exports.approveDocument = async (req, res) => {
  try {
    const { documentType, documentId } = req.params;

    let document;

    switch (documentType) {
      case "risk_assessment":
        document = await RiskAssessment.findById(documentId);
        document.status = "approved";
        document.approvalStatus = "approved";
        document.approvedBy = req.user.safetyOfficer;
        document.approvedAt = new Date();
        break;
      case "jsa":
        document = await JSA.findById(documentId);
        document.status = "active";
        document.approvedBy = req.user.safetyOfficer;
        document.approvedAt = new Date();
        break;
      case "safety_talk":
        document = await SafetyTalk.findById(documentId);
        document.status = "conducted";
        document.approvedBy = req.user.safetyOfficer;
        document.approvedAt = new Date();
        break;
      case "ppe_checklist":
        document = await PPEChecklist.findById(documentId);
        document.status = "completed";
        document.approvedBy = req.user.safetyOfficer;
        document.approvedAt = new Date();
        break;
    }

    await document.save();

    res.json({
      success: true,
      message: "Document approved and finalized successfully.",
    });
  } catch (error) {
    console.error("Error approving document:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Generate PDF from content
exports.generatePDF = async (req, res) => {
  try {
    const { documentType, documentId, title, content } = req.body;

    const doc = new PDFDocument({ margin: 50 });
    const filename = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Add company header
    doc
      .fontSize(20)
      .text("TrueSafe Safety Management System", { align: "center" });
    doc.fontSize(12).text(`Document: ${title}`, { align: "center" });
    doc
      .fontSize(10)
      .text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown();

    // Add horizontal line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Add content
    doc.fontSize(11);
    const lines = content.split("\n");
    lines.forEach((line) => {
      if (line.startsWith("#")) {
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(line.replace(/^#+/, ""), { underline: true });
        doc.fontSize(11).font("Helvetica");
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        doc.text("• " + line.substring(2), { indent: 20 });
      } else if (line.match(/^\d+\./)) {
        doc.font("Helvetica-Bold").text(line);
        doc.font("Helvetica");
      } else if (line.trim() === "") {
        doc.moveDown();
      } else {
        doc.text(line);
      }
    });

    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all generated documents for a work area
exports.getDocumentsByWorkArea = async (req, res) => {
  try {
    const { workAreaId } = req.params;

    const riskAssessments = await RiskAssessment.find({
      workArea: workAreaId,
    }).sort({ createdAt: -1 });
    const safetyTalks = await SafetyTalk.find({ workArea: workAreaId }).sort({
      createdAt: -1,
    });
    const ppeChecklists = await PPEChecklist.find({
      workArea: workAreaId,
    }).sort({ createdAt: -1 });
    const jsas = await JSA.find({ workArea: workAreaId }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      documents: {
        riskAssessments,
        safetyTalks,
        ppeChecklists,
        jsas,
      },
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// backend/controllers/aiDocumentController.js
// Add these methods to your existing aiDocumentController

// Show Risk Assessment Generation Form
exports.showRiskAssessmentForm = async (req, res) => {
  try {
    const workArea = await WorkArea.findById(req.params.workAreaId).populate(
      "worksite",
      "name location siteType",
    );

    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard");
    }

    res.render("work-areas/generate-risk-assessment", {
      user: req.user,
      workArea: workArea,
      title: "Generate Risk Assessment",
    });
  } catch (error) {
    console.error("Error loading risk assessment form:", error);
    req.flash("error", "Error loading form");
    res.redirect(`/work-areas/${req.params.workAreaId}`);
  }
};

// Show PPE Requirements Generation Form
exports.showPPEForm = async (req, res) => {
  try {
    const workArea = await WorkArea.findById(req.params.workAreaId).populate(
      "worksite",
      "name location siteType",
    );

    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard");
    }

    res.render("work-areas/generate-ppe", {
      user: req.user,
      workArea: workArea,
      title: "Generate PPE Requirements",
    });
  } catch (error) {
    console.error("Error loading PPE form:", error);
    req.flash("error", "Error loading form");
    res.redirect(`/work-areas/${req.params.workAreaId}`);
  }
};

// Show JSA Generation Form
exports.showJSAForm = async (req, res) => {
  try {
    const workArea = await WorkArea.findById(req.params.workAreaId).populate(
      "worksite",
      "name location siteType",
    );

    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard");
    }

    res.render("work-areas/generate-jsa", {
      user: req.user,
      workArea: workArea,
      title: "Generate Job Safety Analysis",
    });
  } catch (error) {
    console.error("Error loading JSA form:", error);
    req.flash("error", "Error loading form");
    res.redirect(`/work-areas/${req.params.workAreaId}`);
  }
};

// Show Safety Talk Generation Form
exports.showSafetyTalkForm = async (req, res) => {
  try {
    const workArea = await WorkArea.findById(req.params.workAreaId).populate(
      "worksite",
      "name location siteType",
    );

    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard");
    }

    res.render("work-areas/generate-safety-talk", {
      user: req.user,
      workArea: workArea,
      title: "Generate Safety Talk",
    });
  } catch (error) {
    console.error("Error loading safety talk form:", error);
    req.flash("error", "Error loading form");
    res.redirect(`/work-areas/${req.params.workAreaId}`);
  }
};
