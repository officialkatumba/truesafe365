const PPEChecklist = require("../models/PPEChecklist");
const WorkArea = require("../models/WorkArea");
const SafetyOfficer = require("../models/SafetyOfficer");

// Get PPE checklists for a work area
exports.getChecklists = async (req, res) => {
  try {
    const { workAreaId } = req.params;

    const checklists = await PPEChecklist.find({ workArea: workAreaId }).sort({
      createdAt: -1,
    });

    res.render("ppe/list", {
      user: req.user,
      checklists,
      workAreaId,
    });
  } catch (error) {
    console.error("Error getting PPE checklists:", error);
    req.flash("error", "Error loading checklists");
    res.redirect("/dashboard");
  }
};

// Show create checklist form
exports.showCreateChecklistForm = async (req, res) => {
  try {
    const { workAreaId } = req.params;
    const workArea = await WorkArea.findById(workAreaId).populate("worksite");

    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard");
    }

    res.render("ppe/create", {
      user: req.user,
      workArea,
    });
  } catch (error) {
    console.error("Error loading create form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/dashboard");
  }
};

// Create new PPE checklist
exports.createChecklist = async (req, res) => {
  try {
    const { workAreaId } = req.params;
    const {
      title,
      applicableTasks,
      applicableShifts,
      ppeItems,
      inspectionItems,
    } = req.body;

    const workArea = await WorkArea.findById(workAreaId);
    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard");
    }

    // Parse arrays
    const parseJSON = (data) => {
      try {
        return typeof data === "string" ? JSON.parse(data) : data || [];
      } catch {
        return [];
      }
    };

    const checklist = new PPEChecklist({
      workArea: workAreaId,
      title: title || `${workArea.name} PPE Checklist`,
      applicableTasks: parseJSON(applicableTasks),
      applicableShifts: parseJSON(applicableShifts) || [
        "morning",
        "afternoon",
        "night",
      ],
      ppeItems: parseJSON(ppeItems),
      inspectionItems: parseJSON(inspectionItems),
      createdBy: req.user.safetyOfficer,
      status: "draft",
    });

    await checklist.save();

    req.flash("success", "PPE checklist created successfully");
    res.redirect(`/ppe/checklists/${checklist._id}`);
  } catch (error) {
    console.error("Error creating PPE checklist:", error);
    req.flash("error", "Error creating checklist");
    res.redirect(`/ppe/checklists/new/${req.params.workAreaId}`);
  }
};

// View single checklist
exports.getChecklist = async (req, res) => {
  try {
    const checklist = await PPEChecklist.findById(req.params.id)
      .populate("workArea", "name worksite")
      .populate("createdBy", "name")
      .populate("inspectionItems.inspectedBy", "name")
      .populate("workerSignoffs.workerId", "name");

    if (!checklist) {
      req.flash("error", "PPE checklist not found");
      return res.redirect("/dashboard");
    }

    res.render("ppe/view", {
      user: req.user,
      checklist,
    });
  } catch (error) {
    console.error("Error viewing PPE checklist:", error);
    req.flash("error", "Error loading checklist");
    res.redirect("/dashboard");
  }
};

// Sign off on checklist (worker acknowledgment)
exports.signChecklist = async (req, res) => {
  try {
    const checklist = await PPEChecklist.findById(req.params.id);

    if (!checklist) {
      req.flash("error", "PPE checklist not found");
      return res.redirect("/dashboard");
    }

    const { workerName, shift, acknowledged, comments } = req.body;

    // If user is logged in, associate with their ID
    const signoff = {
      workerId: req.user?._id || null,
      name: workerName || req.user?.safetyOfficer?.name,
      shift,
      acknowledged: acknowledged === "true",
      signedAt: new Date(),
      comments,
    };

    checklist.workerSignoffs.push(signoff);
    await checklist.save();

    req.flash("success", "Thank you for acknowledging the PPE requirements");
    res.redirect(`/ppe/checklists/${checklist._id}`);
  } catch (error) {
    console.error("Error signing PPE checklist:", error);
    req.flash("error", "Error signing checklist");
    res.redirect(`/ppe/checklists/${req.params.id}`);
  }
};
