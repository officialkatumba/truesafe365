const Permit = require("../models/Permit");
const WorkArea = require("../models/WorkArea");
const SafetyOfficer = require("../models/SafetyOfficer");

// Show create permit form
exports.showCreateForm = async (req, res) => {
  try {
    const { workAreaId } = req.params;
    const workArea = await WorkArea.findById(workAreaId).populate("worksite");

    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard");
    }

    res.render("permits/create", {
      user: req.user,
      workArea,
    });
  } catch (error) {
    console.error("Error loading create form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/dashboard");
  }
};

// Create new permit
exports.createPermit = async (req, res) => {
  try {
    const { workAreaId } = req.params;
    const {
      permitType,
      title,
      description,
      workType,
      specificLocation,
      validFrom,
      validTo,
      workers,
      hazards,
      ppeRequirements,
      preWorkChecklist,
    } = req.body;

    const workArea = await WorkArea.findById(workAreaId);
    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard");
    }

    // Parse arrays if provided as JSON strings
    const parseJSON = (data) => {
      try {
        return typeof data === "string" ? JSON.parse(data) : data || [];
      } catch {
        return [];
      }
    };

    const newPermit = new Permit({
      workArea: workAreaId,
      permitType,
      title,
      description,
      workType,
      specificLocation: {
        description: specificLocation,
      },
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
      workers: parseJSON(workers),
      hazards: parseJSON(hazards),
      ppeRequirements: parseJSON(ppeRequirements),
      preWorkChecklist: parseJSON(preWorkChecklist),
      status: "draft",
      createdBy: req.user.safetyOfficer,
    });

    await newPermit.save();

    // Add to work area's active permits
    workArea.activePermits.push(newPermit._id);
    await workArea.save();

    req.flash("success", "Permit created successfully");
    res.redirect(`/permits/${newPermit._id}`);
  } catch (error) {
    console.error("Error creating permit:", error);
    req.flash("error", "Error creating permit");
    res.redirect(`/permits/new/${req.params.workAreaId}`);
  }
};

// View single permit
exports.getPermit = async (req, res) => {
  try {
    const permit = await Permit.findById(req.params.id)
      .populate("workArea", "name worksite")
      .populate("createdBy", "name")
      .populate("authorizations.received.authorizer", "name");

    if (!permit) {
      req.flash("error", "Permit not found");
      return res.redirect("/dashboard");
    }

    res.render("permits/view", {
      user: req.user,
      permit,
    });
  } catch (error) {
    console.error("Error viewing permit:", error);
    req.flash("error", "Error loading permit");
    res.redirect("/dashboard");
  }
};

// Approve permit
exports.approvePermit = async (req, res) => {
  try {
    const permit = await Permit.findById(req.params.id);

    if (!permit) {
      req.flash("error", "Permit not found");
      return res.redirect("/dashboard");
    }

    const { comments } = req.body;

    permit.authorizations.received.push({
      authorizer: req.user.safetyOfficer || req.user._id,
      role: req.user.role,
      date: new Date(),
      comments,
    });

    // Check if all required authorizations are received
    // This is simplified - you might have a more complex approval workflow
    permit.status = "issued";

    await permit.save();

    req.flash("success", "Permit approved and issued");
    res.redirect(`/permits/${permit._id}`);
  } catch (error) {
    console.error("Error approving permit:", error);
    req.flash("error", "Error approving permit");
    res.redirect(`/permits/${req.params.id}`);
  }
};

// Complete permit
exports.completePermit = async (req, res) => {
  try {
    const permit = await Permit.findById(req.params.id);

    if (!permit) {
      req.flash("error", "Permit not found");
      return res.redirect("/dashboard");
    }

    const { workCompleted, areaLeftSafe, remarks } = req.body;

    permit.completion = {
      completedAt: new Date(),
      completedBy: req.user.safetyOfficer,
      workCompleted: workCompleted === "true",
      areaLeftSafe: areaLeftSafe === "true",
      remarks,
    };

    permit.status = "completed";

    await permit.save();

    req.flash("success", "Permit completed successfully");
    res.redirect(`/permits/${permit._id}`);
  } catch (error) {
    console.error("Error completing permit:", error);
    req.flash("error", "Error completing permit");
    res.redirect(`/permits/${req.params.id}`);
  }
};

// Cancel permit
exports.cancelPermit = async (req, res) => {
  try {
    const permit = await Permit.findById(req.params.id);

    if (!permit) {
      req.flash("error", "Permit not found");
      return res.redirect("/dashboard");
    }

    const { reason } = req.body;

    permit.cancellation = {
      cancelledAt: new Date(),
      cancelledBy: req.user.safetyOfficer || req.user._id,
      reason,
    };

    permit.status = "cancelled";

    await permit.save();

    req.flash("success", "Permit cancelled");
    res.redirect(`/permits/${permit._id}`);
  } catch (error) {
    console.error("Error cancelling permit:", error);
    req.flash("error", "Error cancelling permit");
    res.redirect(`/permits/${req.params.id}`);
  }
};
