const TransportChecklist = require("../models/TransportChecklist");
const WorkArea = require("../models/WorkArea");
const checklistTemplates = require("../data/compliance/transportChecklistItems");
const { generateTransportChecklistDocx } = require("../utils/transportChecklistWordGenerator");
const { trackUsage } = require("../utils/usageTracker");

exports.showForm = async (req, res) => {
  try {
    const { workAreaId, checklistType } = req.params;
    const workArea = await WorkArea.findOne({ _id: workAreaId, officerId: req.user._id });
    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard/officer");
    }

    const template = checklistTemplates[checklistType];
    if (!template) {
      req.flash("error", "Unknown checklist type");
      return res.redirect(`/work-areas/${workAreaId}`);
    }

    res.render("transport/form", { user: req.user, workArea, checklistType, template });
  } catch (error) {
    console.error("Error loading transport checklist form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/dashboard/officer");
  }
};

exports.submitChecklist = async (req, res) => {
  try {
    const { workAreaId, checklistType } = req.params;
    const workArea = await WorkArea.findOne({ _id: workAreaId, officerId: req.user._id });
    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard/officer");
    }

    const template = checklistTemplates[checklistType];
    if (!template) {
      req.flash("error", "Unknown checklist type");
      return res.redirect(`/work-areas/${workAreaId}`);
    }

    let overallResult = "pass";
    const failureReasons = [];

    const items = template.items.map((templateItem, index) => {
      const rawResponse = req.body[`response_${index}`];
      const response = rawResponse === "yes" || rawResponse === "no" ? rawResponse : "na";
      if (templateItem.critical && response === "no") {
        overallResult = "fail";
        failureReasons.push(templateItem.question);
      }
      return {
        code: templateItem.code,
        question: templateItem.question,
        critical: templateItem.critical,
        response,
        notes: req.body[`notes_${index}`] || "",
      };
    });

    const checklist = await TransportChecklist.create({
      workArea: workArea._id,
      checklistType,
      driverName: req.body.driverName,
      vehicleRegistration: req.body.vehicleRegistration || "",
      route: req.body.route || "",
      date: req.body.date ? new Date(req.body.date) : new Date(),
      items,
      overallResult,
      failureNotes: failureReasons.join("; "),
      submittedBy: req.user._id,
    });

    await trackUsage({
      user: req.user._id,
      workArea: workArea._id,
      eventType: "checklist_submitted",
      module: "transportChecklist",
      description: `${template.label} submitted (${overallResult})`,
      relatedModel: "TransportChecklist",
      relatedId: checklist._id,
    });

    req.flash(
      overallResult === "pass" ? "success" : "error",
      overallResult === "pass"
        ? "Checklist submitted - cleared to proceed"
        : "Checklist submitted - one or more critical items failed. Do not proceed until corrected.",
    );
    res.redirect(`/transport-checklists/${checklist._id}`);
  } catch (error) {
    console.error("Error submitting transport checklist:", error);
    req.flash("error", "Error submitting checklist: " + error.message);
    res.redirect(`/work-areas/${req.params.workAreaId}`);
  }
};

exports.getChecklist = async (req, res) => {
  try {
    const checklist = await TransportChecklist.findById(req.params.id).populate("workArea", "name");
    if (!checklist) {
      req.flash("error", "Checklist not found");
      return res.redirect("/dashboard/officer");
    }

    res.render("transport/view", {
      user: req.user,
      checklist,
      label: checklistTemplates[checklist.checklistType]?.label,
    });
  } catch (error) {
    console.error("Error loading transport checklist:", error);
    req.flash("error", "Error loading checklist");
    res.redirect("/dashboard/officer");
  }
};

exports.downloadWord = async (req, res) => {
  try {
    const checklist = await TransportChecklist.findById(req.params.id).populate("workArea", "name");
    if (!checklist) {
      return res.status(404).send("Checklist not found");
    }

    const buffer = await generateTransportChecklistDocx({
      checklist,
      label: checklistTemplates[checklist.checklistType]?.label,
    });

    const fileName = `transport_checklist_${checklist.checklistNumber}.docx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.send(buffer);
  } catch (error) {
    console.error("Error downloading transport checklist:", error);
    return res.status(500).send("Error generating Word document");
  }
};
