const RiskAssessment = require("../models/RiskAssessment");
const WorkArea = require("../models/WorkArea");
const SafetyOfficer = require("../models/SafetyOfficer");
const Worksite = require("../models/Worksite");

// Show create risk assessment form
exports.showCreateForm = async (req, res) => {
  try {
    const { workAreaId } = req.params;
    const workArea = await WorkArea.findById(workAreaId).populate("worksite");

    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard");
    }

    res.render("risk-assessments/create", {
      user: req.user,
      workArea,
    });
  } catch (error) {
    console.error("Error loading create form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/dashboard");
  }
};

// Create new risk assessment
exports.createRiskAssessment = async (req, res) => {
  try {
    const { workAreaId } = req.params;
    const {
      title,
      description,
      scope,
      hazards,
      overallFindings,
      recommendations,
      actionPlan,
    } = req.body;

    const workArea = await WorkArea.findById(workAreaId);
    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard");
    }

    // Parse hazards if provided as JSON string
    let hazardsArray = [];
    if (hazards) {
      try {
        hazardsArray =
          typeof hazards === "string" ? JSON.parse(hazards) : hazards;
      } catch (e) {
        hazardsArray = [];
      }
    }

    // Parse action plan
    let actionPlanArray = [];
    if (actionPlan) {
      try {
        actionPlanArray =
          typeof actionPlan === "string" ? JSON.parse(actionPlan) : actionPlan;
      } catch (e) {
        actionPlanArray = [];
      }
    }

    const newAssessment = new RiskAssessment({
      workArea: workAreaId,
      title,
      description,
      scope: scope ? { type: scope, workTypes: [] } : { type: "area_wide" },
      conductedBy: req.user.safetyOfficer,
      assessmentDate: new Date(),
      hazards: hazardsArray,
      overallFindings,
      recommendations: recommendations ? recommendations.split("\n") : [],
      actionPlan: actionPlanArray,
      status: "draft",
    });

    await newAssessment.save();

    // Add to work area's documents
    workArea.documents.riskAssessments.push(newAssessment._id);
    await workArea.save();

    req.flash("success", "Risk assessment created successfully");
    res.redirect(`/risk-assessments/${newAssessment._id}`);
  } catch (error) {
    console.error("Error creating risk assessment:", error);
    req.flash("error", "Error creating risk assessment");
    res.redirect(`/risk-assessments/new/${req.params.workAreaId}`);
  }
};

// View single risk assessment
exports.getRiskAssessment = async (req, res) => {
  try {
    const assessment = await RiskAssessment.findById(req.params.id)
      .populate("workArea", "name worksite")
      .populate("conductedBy", "name")
      .populate("approvals.approver", "name");

    if (!assessment) {
      req.flash("error", "Risk assessment not found");
      return res.redirect("/dashboard");
    }

    res.render("risk-assessments/view", {
      user: req.user,
      assessment,
    });
  } catch (error) {
    console.error("Error viewing risk assessment:", error);
    req.flash("error", "Error loading assessment");
    res.redirect("/dashboard");
  }
};

// Show edit form
exports.showEditForm = async (req, res) => {
  try {
    const assessment = await RiskAssessment.findById(req.params.id).populate(
      "workArea",
    );

    if (!assessment) {
      req.flash("error", "Risk assessment not found");
      return res.redirect("/dashboard");
    }

    res.render("risk-assessments/edit", {
      user: req.user,
      assessment,
    });
  } catch (error) {
    console.error("Error loading edit form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/dashboard");
  }
};

// Update risk assessment
exports.updateRiskAssessment = async (req, res) => {
  try {
    const assessment = await RiskAssessment.findById(req.params.id);

    if (!assessment) {
      req.flash("error", "Risk assessment not found");
      return res.redirect("/dashboard");
    }

    const {
      title,
      description,
      hazards,
      overallFindings,
      recommendations,
      actionPlan,
      status,
    } = req.body;

    if (title) assessment.title = title;
    if (description) assessment.description = description;
    if (overallFindings) assessment.overallFindings = overallFindings;
    if (recommendations)
      assessment.recommendations = recommendations.split("\n");
    if (status) assessment.status = status;

    if (hazards) {
      try {
        assessment.hazards =
          typeof hazards === "string" ? JSON.parse(hazards) : hazards;
      } catch (e) {}
    }

    if (actionPlan) {
      try {
        assessment.actionPlan =
          typeof actionPlan === "string" ? JSON.parse(actionPlan) : actionPlan;
      } catch (e) {}
    }

    await assessment.save();

    req.flash("success", "Risk assessment updated successfully");
    res.redirect(`/risk-assessments/${assessment._id}`);
  } catch (error) {
    console.error("Error updating risk assessment:", error);
    req.flash("error", "Error updating assessment");
    res.redirect(`/risk-assessments/${req.params.id}/edit`);
  }
};

// Approve risk assessment
exports.approveAssessment = async (req, res) => {
  try {
    const assessment = await RiskAssessment.findById(req.params.id);

    if (!assessment) {
      req.flash("error", "Risk assessment not found");
      return res.redirect("/dashboard");
    }

    const { comments } = req.body;

    assessment.approvalWorkflow = {
      required: true,
      status: "approved",
      approvals: [
        {
          approver: req.user.safetyOfficer || req.user._id,
          approvedAt: new Date(),
          comments,
        },
      ],
    };

    assessment.status = "approved";
    await assessment.save();

    // If this is an enterprise setup, add to worksite pending approvals
    if (
      req.user.role === "safety_officer" &&
      req.user.accountType === "enterprise_officer"
    ) {
      const workArea = await WorkArea.findById(assessment.workArea).populate(
        "worksite",
      );
      const Worksite = require("../models/Worksite");
      const worksite = await Worksite.findById(workArea.worksite._id);

      worksite.pendingApprovals.push({
        documentType: "risk_assessment",
        documentId: assessment._id,
        documentModel: "RiskAssessment",
        documentNumber: assessment.assessmentNumber,
        title: assessment.title,
        submittedBy: req.user.safetyOfficer,
        urgency: "routine",
        status: "pending",
      });

      await worksite.save();
    }

    req.flash("success", "Risk assessment approved and sent for review");
    res.redirect(`/risk-assessments/${assessment._id}`);
  } catch (error) {
    console.error("Error approving assessment:", error);
    req.flash("error", "Error approving assessment");
    res.redirect(`/risk-assessments/${req.params.id}`);
  }
};
