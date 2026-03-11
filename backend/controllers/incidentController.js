const Incident = require("../models/Incident");
const WorkArea = require("../models/WorkArea");
const SafetyOfficer = require("../models/SafetyOfficer");

// Show public incident report form (no login required)
exports.showIncidentReportForm = async (req, res) => {
  try {
    const { workAreaId } = req.params;
    const workArea = await WorkArea.findById(workAreaId).populate(
      "worksite",
      "name",
    );

    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/");
    }

    res.render("incidents/public-report", {
      workArea,
      anonymous: true,
    });
  } catch (error) {
    console.error("Error loading report form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/");
  }
};

// Submit public incident report (anonymous)
exports.submitIncidentReport = async (req, res) => {
  try {
    const { workAreaId } = req.params;
    const {
      type,
      severity,
      description,
      location,
      dateTime,
      immediateAction,
      reporterName,
      anonymous,
    } = req.body;

    const workArea = await WorkArea.findById(workAreaId);
    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/");
    }

    const newIncident = new Incident({
      workArea: workAreaId,
      reportedBy: anonymous ? "anonymous" : "worker",
      reporterName: anonymous ? null : reporterName,
      type,
      severity,
      description,
      location,
      dateTime: dateTime || new Date(),
      immediateAction,
      anonymous: anonymous === "true",
      status: "reported",
    });

    await newIncident.save();

    // Update work area statistics will happen via post-save hook

    req.flash(
      "success",
      "Incident reported successfully. Thank you for helping keep our workplace safe!",
    );
    res.redirect(`/incidents/thank-you`);
  } catch (error) {
    console.error("Error submitting incident:", error);
    req.flash("error", "Error submitting incident");
    res.redirect(`/incidents/report/${req.params.workAreaId}`);
  }
};

// Thank you page
exports.thankYou = (req, res) => {
  res.render("incidents/thank-you");
};

// Get incidents for logged-in safety officer
exports.getMyIncidents = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;

    // Get work areas this officer manages
    const workAreas = await WorkArea.find({
      "assignedSafetyOfficers.officer": req.user.safetyOfficer,
    }).select("_id");

    const workAreaIds = workAreas.map((wa) => wa._id);

    const query = { workArea: { $in: workAreaIds } };
    if (status) query.status = status;
    if (type) query.type = type;

    const incidents = await Incident.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("workArea", "name");

    const total = await Incident.countDocuments(query);

    res.render("incidents/list", {
      user: req.user,
      incidents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      filters: { status, type },
    });
  } catch (error) {
    console.error("Error getting incidents:", error);
    req.flash("error", "Error loading incidents");
    res.redirect("/dashboard");
  }
};

// View single incident
exports.getIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate("workArea", "name worksite")
      .populate("reportedByUser", "email")
      .populate("investigation.conductedBy", "name")
      .populate("reviewedBy", "name");

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
    const incident = await Incident.findById(req.params.id);

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

// Update incident
exports.updateIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      req.flash("error", "Incident not found");
      return res.redirect("/incidents");
    }

    const { severity, description, status, correctiveActions } = req.body;

    if (severity) incident.severity = severity;
    if (description) incident.description = description;
    if (status) incident.status = status;

    if (correctiveActions) {
      try {
        incident.correctiveActions =
          typeof correctiveActions === "string"
            ? JSON.parse(correctiveActions)
            : correctiveActions;
      } catch (e) {}
    }

    await incident.save();

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
      conductedBy: req.user.safetyOfficer,
      investigationDate: new Date(),
      rootCause,
      contributingFactors: contributingFactors
        ? contributingFactors.split(",")
        : [],
      findings,
      recommendations: recommendations ? recommendations.split("\n") : [],
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
