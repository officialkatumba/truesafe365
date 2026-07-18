const { OpenAI } = require("openai");
const GovernanceDocument = require("../models/GovernanceDocument");
const WorkArea = require("../models/WorkArea");
const {
  professionalSafetyGuidance,
} = require("../utils/aiPromptGuidance");
const {
  generateCommitteeFormationDocx,
  generateHSPolicyDocx,
} = require("../utils/governanceWordGenerator");
const { trackUsage } = require("../utils/usageTracker");
const { AI_MODEL, AI_MAX_TOKENS } = require("../utils/aiConfig");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function parseStructuredJson(text) {
  const cleaned = String(text || "")
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw error;
    return JSON.parse(match[0]);
  }
}

function parseMembers(body) {
  const names = [].concat(body.memberName || []);
  const roles = [].concat(body.memberRole || []);
  const representing = [].concat(body.memberRepresenting || []);

  return names
    .map((name, i) => ({
      name: (name || "").trim(),
      role: (roles[i] || "").trim(),
      representing: representing[i] === "employer" ? "employer" : "employee",
    }))
    .filter((member) => member.name);
}

exports.showForm = async (req, res) => {
  try {
    const { workAreaId, docType } = req.params;
    const workArea = await WorkArea.findOne({ _id: workAreaId, officerId: req.user._id });
    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard/officer");
    }
    if (!["committee_formation", "hs_policy"].includes(docType)) {
      req.flash("error", "Unknown governance document type");
      return res.redirect(`/work-areas/${workAreaId}`);
    }

    res.render("governance/form", { user: req.user, workArea, docType });
  } catch (error) {
    console.error("Error loading governance document form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/dashboard/officer");
  }
};

exports.generateCommitteeFormation = async (req, res) => {
  try {
    const { workAreaId } = req.params;
    const workArea = await WorkArea.findOne({ _id: workAreaId, officerId: req.user._id });
    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard/officer");
    }

    const members = parseMembers(req.body);
    const committee = {
      establishedDate: req.body.establishedDate ? new Date(req.body.establishedDate) : new Date(),
      meetingFrequency: req.body.meetingFrequency || "Monthly",
      healthAndSafetyRepresentative: req.body.healthAndSafetyRepresentative || "",
      members,
    };

    const prompt = `You are drafting the functions and formation procedure section of a Health and Safety Committee Formation document for a Zambian workplace, under Section 9-12 of the Occupational Health and Safety Act No. 16 of 2025.

${professionalSafetyGuidance}

WORK AREA: ${workArea.name}
COMMITTEE MEETING FREQUENCY: ${committee.meetingFrequency}
COMMITTEE MEMBERS: ${members.map((m) => `${m.name} (${m.role}, representing ${m.representing})`).join("; ") || "Not yet named"}

Return ONLY valid JSON in this exact structure:
{
  "responsibilities": ["string - committee functions per Section 11, tailored to this work area"],
  "procedures": ["string - practical steps for formation, meeting cadence, minute-keeping, and escalation of findings"]
}`;

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: AI_MAX_TOKENS.safetyTalk,
    });

    const generatedContent = parseStructuredJson(completion.choices[0].message.content);

    const doc = await GovernanceDocument.create({
      workArea: workArea._id,
      docType: "committee_formation",
      title: `Health and Safety Committee Formation - ${workArea.name}`,
      committee,
      generatedContent,
      aiModel: AI_MODEL,
      createdBy: req.user._id,
    });

    await trackUsage({
      user: req.user._id,
      workArea: workArea._id,
      eventType: "ai_generation",
      module: "governanceDocument",
      description: "Health and Safety Committee formation document generated",
      relatedModel: "GovernanceDocument",
      relatedId: doc._id,
      metadata: { model: AI_MODEL, usage: completion.usage },
    });

    req.flash("success", "Committee formation document generated");
    res.redirect(`/governance-documents/${doc._id}`);
  } catch (error) {
    console.error("Error generating committee formation document:", error);
    req.flash("error", "Error generating document: " + error.message);
    res.redirect(`/work-areas/${req.params.workAreaId}`);
  }
};

exports.generateHSPolicy = async (req, res) => {
  try {
    const { workAreaId } = req.params;
    const workArea = await WorkArea.findOne({ _id: workAreaId, officerId: req.user._id });
    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard/officer");
    }

    const policy = {
      ceoName: req.body.ceoName || "",
      ceoTitle: req.body.ceoTitle || "Chief Executive Officer",
      effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : new Date(),
      reviewDate: req.body.reviewDate ? new Date(req.body.reviewDate) : undefined,
    };

    const activeHazards = (workArea.identifiedHazards || [])
      .filter((h) => h.status === "active")
      .map((h) => `${h.hazard} (${h.riskLevel})`)
      .join("; ");

    const prompt = `You are drafting a CEO-signed Health and Safety Policy for a Zambian workplace, required under Section 14 of the Occupational Health and Safety Act No. 16 of 2025.

${professionalSafetyGuidance}

WORK AREA: ${workArea.name}
MAIN ACTIVITY: ${workArea.intake?.mainActivity || workArea.description || "Not specified"}
KNOWN ACTIVE HAZARDS: ${activeHazards || "None recorded yet"}
CEO / SIGNATORY: ${policy.ceoName || "Not yet named"}, ${policy.ceoTitle}

Return ONLY valid JSON in this exact structure:
{
  "introduction": "string - opening policy statement committing management to health and safety, in the CEO's voice",
  "commitments": ["string - specific, practical commitments covering safe systems of work, PPE, training, emergency arrangements, and worker consultation"],
  "responsibilities": ["string - responsibilities of management, supervisors, safety officer, and workers"],
  "procedures": ["string - how the policy will be implemented, displayed, communicated, and reviewed"],
  "closingStatement": "string - short closing statement reinforcing management commitment"
}`;

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: AI_MAX_TOKENS.safetyTalk,
    });

    const generatedContent = parseStructuredJson(completion.choices[0].message.content);

    const doc = await GovernanceDocument.create({
      workArea: workArea._id,
      docType: "hs_policy",
      title: `Health and Safety Policy - ${workArea.name}`,
      policy,
      generatedContent,
      aiModel: AI_MODEL,
      createdBy: req.user._id,
    });

    await trackUsage({
      user: req.user._id,
      workArea: workArea._id,
      eventType: "ai_generation",
      module: "governanceDocument",
      description: "Health and Safety Policy document generated",
      relatedModel: "GovernanceDocument",
      relatedId: doc._id,
      metadata: { model: AI_MODEL, usage: completion.usage },
    });

    req.flash("success", "Health and Safety Policy document generated");
    res.redirect(`/governance-documents/${doc._id}`);
  } catch (error) {
    console.error("Error generating H&S policy document:", error);
    req.flash("error", "Error generating document: " + error.message);
    res.redirect(`/work-areas/${req.params.workAreaId}`);
  }
};

exports.getDocument = async (req, res) => {
  try {
    const doc = await GovernanceDocument.findById(req.params.id).populate("workArea", "name");
    if (!doc) {
      req.flash("error", "Document not found");
      return res.redirect("/dashboard/officer");
    }

    res.render("governance/view", { user: req.user, doc });
  } catch (error) {
    console.error("Error loading governance document:", error);
    req.flash("error", "Error loading document");
    res.redirect("/dashboard/officer");
  }
};

exports.downloadWord = async (req, res) => {
  try {
    const doc = await GovernanceDocument.findById(req.params.id).populate("workArea", "name identifiedHazards intake description");
    if (!doc) {
      return res.status(404).send("Document not found");
    }

    const buffer =
      doc.docType === "committee_formation"
        ? await generateCommitteeFormationDocx({ workArea: doc.workArea, doc })
        : await generateHSPolicyDocx({ workArea: doc.workArea, doc });

    const fileName = `${doc.docType}_${doc._id}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    return res.send(buffer);
  } catch (error) {
    console.error("Error downloading governance document:", error);
    return res.status(500).send("Error generating Word document");
  }
};
