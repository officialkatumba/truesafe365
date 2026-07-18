const Incident = require("../models/Incident");
const WorkArea = require("../models/WorkArea");
const {
  createIncidentAlert,
  shouldAlertForIncident,
} = require("../utils/alertService");
const { trackUsage } = require("../utils/usageTracker");
const { handleIncidentReportedAutomation } = require("../utils/safetyAutomation");

function normalizeIncidentAccessCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

async function findWorkAreaByActiveShareCode(code) {
  const normalizedCode = normalizeIncidentAccessCode(code);
  if (!normalizedCode) return null;

  return WorkArea.findOne({
    "publicIncidentShare.code": normalizedCode,
    "publicIncidentShare.status": "active",
  });
}

exports.accessIncidentShareCode = async (req, res) => {
  try {
    const code = normalizeIncidentAccessCode(req.body.incidentAccessCode);
    const workArea = await findWorkAreaByActiveShareCode(code);

    if (!workArea) {
      req.flash("error", "Wrong Code, Contact Your Safety Officer");
      return res.redirect("/#staff-incident-report");
    }

    return res.redirect(`/incidents/public/${encodeURIComponent(code)}`);
  } catch (error) {
    console.error("Error checking incident share code:", error);
    req.flash("error", "Unable to open staff incident reporting. Please try again or contact the safety officer.");
    return res.redirect("/#staff-incident-report");
  }
};

exports.showPublicIncidentReportForm = async (req, res) => {
  try {
    const code = normalizeIncidentAccessCode(req.params.accessCode);
    const workArea = await findWorkAreaByActiveShareCode(code);

    if (!workArea) {
      req.flash("error", "Wrong Code, Contact Your Safety Officer");
      return res.redirect("/#staff-incident-report");
    }

    return res.render("incidents/public-report", {
      workArea,
      anonymous: true,
      step: 1,
      accessCode: code,
      publicAccess: true,
    });
  } catch (error) {
    console.error("Error loading public report form:", error);
    req.flash("error", "Error loading staff incident report form");
    return res.redirect("/#staff-incident-report");
  }
};

exports.submitPublicIncidentReport = async (req, res) => {
  const code = normalizeIncidentAccessCode(req.params.accessCode);
  const workArea = await findWorkAreaByActiveShareCode(code);

  if (!workArea) {
    req.flash("error", "Wrong Code, Contact Your Safety Officer");
    return res.redirect("/#staff-incident-report");
  }

  req.params.workAreaId = workArea._id.toString();
  req.publicIncidentWorkArea = workArea;
  req.publicIncidentShareCode = code;
  return exports.submitIncidentReport(req, res);
};
// ========== PUBLIC ROUTES (No Login Required) ==========

// Show public incident report form with guided steps
exports.showIncidentReportForm = async (req, res) => {
  try {
    const { workAreaId } = req.params;
    const workArea = await WorkArea.findById(workAreaId);

    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/#staff-incident-report");
    }

    res.render("incidents/public-report", {
      workArea,
      anonymous: true,
      step: 1,
    });
  } catch (error) {
    console.error("Error loading report form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/");
  }
};

// Submit public incident report (anonymous or named)
exports.submitIncidentReport = async (req, res) => {
  try {
    const { workAreaId } = req.params;
    const {
      // Step 1: Basic Info
      type,
      severity,
      dateTime,
      location,
      locationDetails,
      shift,
      workTypeAtTime,

      // Step 2: Description
      description,
      immediateAction,

      // Step 3: Injuries (if incident)
      injuriesOccurred,
      injuryDescription,
      injuredPersonName,
      injuryType,
      bodyPart,
      treatmentRequired,
      hospitalVisit,
      timeOffWork,
      daysOff,
      firstAidProvided,
      ambulanceCalled,

      // Step 4: For near-misses
      potentialConsequences,
      whyDidNotHappen,

      // Step 5: Equipment involved
      equipmentName,
      equipmentCondition,
      equipmentInspected,

      // Step 6: Contributing Factors
      weatherConditions,
      lighting,
      noise,
      contributingFactors,
      witnessObservations,
      reporterComments,

      // Step 7: Reporter Info
      reporterName,
      reporterContact,
      anonymous,
      confirmedAccuracy,
    } = req.body;

    const shareCodeUsed = req.publicIncidentShareCode;
    const workArea = req.publicIncidentWorkArea || (await WorkArea.findById(workAreaId));
    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/#staff-incident-report");
    }

    // Build equipment array
    const equipmentInvolved = [];
    if (equipmentName && equipmentName.trim()) {
      equipmentInvolved.push({
        name: equipmentName,
        condition: equipmentCondition || "unknown",
        wasInspected: equipmentInspected === "yes",
      });
    }

    // Build injuries object
    let injuries = null;
    if (injuriesOccurred === "yes" || type === "incident") {
      injuries = {
        occurred: true,
        description: injuryDescription || description,
        injuredPersons: [],
        firstAidProvided: firstAidProvided === "yes",
        ambulanceCalled: ambulanceCalled === "yes",
      };

      if (injuredPersonName || injuryType) {
        injuries.injuredPersons.push({
          name:
            anonymous === "true" ? "Anonymous" : injuredPersonName || "Worker",
          injuryType: injuryType || "Unknown",
          bodyPart: bodyPart || "Unknown",
          treatmentRequired: treatmentRequired || "Not specified",
          hospitalVisit: hospitalVisit === "yes",
          timeOffWork: timeOffWork === "yes",
          daysOff: daysOff ? parseInt(daysOff) : 0,
        });
      }
    }

    // Build AI context
    const aiContext = {
      weatherConditions: weatherConditions || "",
      lighting: lighting || "",
      noise: noise || "",
      contributingFactors: contributingFactors || "",
      witnessObservations: witnessObservations || "",
      reporterComments: reporterComments || "",
    };

    const newIncident = new Incident({
      workArea: workAreaId,
      shift: shift || "unknown",
      reportedBy: anonymous === "true" ? "anonymous" : "worker",
      reporterName:
        anonymous === "true" ? null : reporterName || "Anonymous Worker",
      reporterContact: anonymous === "true" ? null : reporterContact,
      type,
      severity: severity || "medium",
      dateTime: dateTime ? new Date(dateTime) : new Date(),
      location: location || workArea.name,
      locationDetails: locationDetails || "",
      description,
      immediateAction: immediateAction || "",
      workTypeAtTime: workTypeAtTime || "unknown",
      equipmentInvolved,
      aiContext,
      injuries,
      potentialConsequences:
        type === "near_miss" ? potentialConsequences : null,
      whyDidNotHappen: type === "near_miss" ? whyDidNotHappen : null,
      anonymous: anonymous === "true",
      publicAccess: shareCodeUsed
        ? {
            codeUsed: shareCodeUsed,
            accessedAt: new Date(),
          }
        : undefined,
      status: "reported",
    });

    await newIncident.save();

    if (!workArea.documents) workArea.documents = {};
    if (!workArea.documents.incidents) workArea.documents.incidents = [];
    workArea.documents.incidents.push(newIncident._id);

    if (shareCodeUsed) {
      await Incident.updateOne(
        { _id: newIncident._id },
        { $set: { "publicAccess.consumedAt": new Date() } },
      );
      await workArea.recordIncidentShareCodeUse(newIncident._id);
    } else {
      await workArea.save();
    }

    await trackUsage({
      user: req.user?._id,
      workArea: workArea._id,
      eventType: "incident_reported",
      module: "incidents",
      description: `${type} reported in ${workArea.name}`,
      relatedModel: "Incident",
      relatedId: newIncident._id,
      metadata: { severity: newIncident.severity, anonymous: newIncident.anonymous },
    });

    if (shouldAlertForIncident(newIncident)) {
      await createIncidentAlert({
        incident: newIncident,
        createdBy: req.user?._id,
      });
    }

    await handleIncidentReportedAutomation(newIncident);

    req.flash(
      "success",
      "✓ Incident reported successfully! Thank you for helping keep our workplace safe. A safety officer will review your report.",
    );
    res.redirect(`/incidents/thank-you?type=${type}`);
  } catch (error) {
    console.error("Error submitting incident:", error);
    req.flash("error", "Error submitting incident: " + error.message);
    if (req.publicIncidentShareCode) {
      return res.redirect(`/incidents/public/${encodeURIComponent(req.publicIncidentShareCode)}`);
    }
    res.redirect(`/incidents/report/${req.params.workAreaId}`);
  }
};

// Thank you page
exports.thankYou = (req, res) => {
  const { type } = req.query;
  res.render("incidents/thank-you", { type });
};

// ========== SAFETY OFFICER ROUTES (Requires Login) ==========

// Get incidents list with filters
exports.getMyIncidents = async (req, res) => {
  try {
    const { status, type, severity, page = 1, limit = 20 } = req.query;

    // Get work areas this officer manages
    const workAreas = await WorkArea.find({ officerId: req.user._id }).select("_id name");

    const workAreaIds = workAreas.map((wa) => wa._id);

    const query = { workArea: { $in: workAreaIds } };
    if (status && status !== "all") query.status = status;
    if (type && type !== "all") query.type = type;
    if (severity && severity !== "all") query.severity = severity;

    const incidents = await Incident.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("workArea", "name");

    const total = await Incident.countDocuments(query);

    // Get statistics for dashboard
    const stats = {
      total: await Incident.countDocuments({ workArea: { $in: workAreaIds } }),
      pending: await Incident.countDocuments({
        workArea: { $in: workAreaIds },
        status: "reported",
      }),
      investigating: await Incident.countDocuments({
        workArea: { $in: workAreaIds },
        status: "under_investigation",
      }),
      resolved: await Incident.countDocuments({
        workArea: { $in: workAreaIds },
        status: "resolved",
      }),
      incidents: await Incident.countDocuments({
        workArea: { $in: workAreaIds },
        type: "incident",
      }),
      nearMisses: await Incident.countDocuments({
        workArea: { $in: workAreaIds },
        type: "near_miss",
      }),
    };

    res.render("incidents/list", {
      user: req.user,
      incidents,
      workAreas,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      filters: { status, type, severity },
    });
  } catch (error) {
    console.error("Error getting incidents:", error);
    req.flash("error", "Error loading incidents");
    res.redirect("/dashboard");
  }
};

// View single incident with full details
exports.getIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate("workArea", "name")
      .populate("reportedByUser", "email name")
      .populate("investigation.conductedBy", "name")
      .populate("reviewedBy", "name")
      .populate("correctiveActions.assignedTo", "name email")
      .populate("correctiveActions.verifiedBy", "name");

    if (!incident) {
      req.flash("error", "Incident not found");
      return res.redirect("/incidents");
    }

    res.render("incidents/view", {
      user: req.user,
      incident,
    });
  } catch (error) {
    console.error("Error viewing incident:", error);
    req.flash("error", "Error loading incident");
    res.redirect("/incidents");
  }
};

// Show edit incident form
exports.showEditIncidentForm = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id).populate(
      "workArea",
      "name",
    );

    if (!incident) {
      req.flash("error", "Incident not found");
      return res.redirect("/incidents");
    }

    res.render("incidents/edit", {
      user: req.user,
      incident,
    });
  } catch (error) {
    console.error("Error loading edit form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/incidents");
  }
};

// Update incident details
exports.updateIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      req.flash("error", "Incident not found");
      return res.redirect("/incidents");
    }

    const {
      severity,
      description,
      status,
      immediateAction,
      locationDetails,
      isLTI,
      isRecordable,
      lostTimeDays,
    } = req.body;

    if (severity) incident.severity = severity;
    if (description) incident.description = description;
    if (status) incident.status = status;
    if (immediateAction) incident.immediateAction = immediateAction;
    if (locationDetails) incident.locationDetails = locationDetails;

    const checkboxOn = (value) =>
      Array.isArray(value) ? value.includes("yes") : value === "yes";

    if (isLTI !== undefined || isRecordable !== undefined) {
      incident.classification = {
        isLTI: checkboxOn(isLTI),
        isRecordable: checkboxOn(isRecordable),
        lostTimeDays: lostTimeDays ? parseInt(lostTimeDays, 10) || 0 : 0,
        classifiedBy: req.user._id,
        classifiedAt: new Date(),
      };
    }

    await incident.save();

    if (shouldAlertForIncident(incident)) {
      await createIncidentAlert({
        incident,
        createdBy: req.user?._id,
      });
    }

    req.flash("success", "Incident updated successfully");
    res.redirect(`/incidents/${incident._id}`);
  } catch (error) {
    console.error("Error updating incident:", error);
    req.flash("error", "Error updating incident");
    res.redirect(`/incidents/${req.params.id}/edit`);
  }
};

// Add investigation to incident
exports.addInvestigation = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      req.flash("error", "Incident not found");
      return res.redirect("/incidents");
    }

    const { rootCause, contributingFactors, findings, recommendations } =
      req.body;

    incident.investigation = {
      conducted: true,
      conductedBy: req.user._id,
      investigationDate: new Date(),
      rootCause: rootCause || "",
      contributingFactors: contributingFactors
        ? contributingFactors.split(",").map((f) => f.trim())
        : [],
      findings: findings || "",
      recommendations: recommendations
        ? recommendations.split("\n").filter((r) => r.trim())
        : [],
    };

    incident.status = "under_investigation";
    await incident.save();

    req.flash("success", "Investigation added successfully");
    res.redirect(`/incidents/${incident._id}`);
  } catch (error) {
    console.error("Error adding investigation:", error);
    req.flash("error", "Error adding investigation");
    res.redirect(`/incidents/${req.params.id}`);
  }
};

// Add corrective action
exports.addCorrectiveAction = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      req.flash("error", "Incident not found");
      return res.redirect("/incidents");
    }

    const { action, assignedToName, deadline, priority } = req.body;

    incident.correctiveActions.push({
      action,
      assignedToName: assignedToName || "To be assigned",
      deadline: deadline ? new Date(deadline) : null,
      priority: priority || "medium",
      completed: false,
    });

    incident.status = "action_taken";
    await incident.save();

    req.flash("success", "Corrective action added successfully");
    res.redirect(`/incidents/${incident._id}`);
  } catch (error) {
    console.error("Error adding corrective action:", error);
    req.flash("error", "Error adding corrective action");
    res.redirect(`/incidents/${req.params.id}`);
  }
};

// Mark corrective action as complete
exports.completeCorrectiveAction = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    const { actionId, notes } = req.body;

    if (!incident) {
      req.flash("error", "Incident not found");
      return res.redirect("/incidents");
    }

    const action = incident.correctiveActions.id(actionId);
    if (action) {
      action.completed = true;
      action.completedDate = new Date();
      action.completionNotes = notes || "";
      action.verifiedBy = req.user._id;
      action.verifiedAt = new Date();
    }

    // Check if all actions are completed
    const allCompleted = incident.correctiveActions.every(
      (a) => a.completed === true,
    );
    if (allCompleted) {
      incident.status = "resolved";
    }

    await incident.save();

    req.flash("success", "Corrective action marked as complete");
    res.redirect(`/incidents/${incident._id}`);
  } catch (error) {
    console.error("Error completing action:", error);
    req.flash("error", "Error completing action");
    res.redirect(`/incidents/${req.params.id}`);
  }
};

// Close incident (final step)
exports.closeIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    const { lessonsLearned } = req.body;

    if (!incident) {
      req.flash("error", "Incident not found");
      return res.redirect("/incidents");
    }

    incident.status = "closed";
    incident.lessonsLearned = lessonsLearned || "";
    incident.reviewedBy = req.user._id;
    incident.reviewedAt = new Date();

    await incident.save();

    req.flash("success", "Incident closed successfully");
    res.redirect(`/incidents/${incident._id}`);
  } catch (error) {
    console.error("Error closing incident:", error);
    req.flash("error", "Error closing incident");
    res.redirect(`/incidents/${req.params.id}`);
  }
};

// Get incidents for dashboard widget
exports.getRecentIncidents = async (req, res) => {
  try {
    const workAreaId = req.params.workAreaId;
    const incidents = await Incident.find({ workArea: workAreaId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("incidentNumber type severity description createdAt status");

    res.json({ success: true, incidents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

