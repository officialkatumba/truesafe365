const WorkArea = require("../models/WorkArea");
const Worksite = require("../models/Worksite");
const SafetyOfficer = require("../models/SafetyOfficer");
const Incident = require("../models/Incident");
const RiskAssessment = require("../models/RiskAssessment");
const SafetyTalk = require("../models/SafetyTalk");

// Show create work area form
exports.showCreateWorkAreaForm = async (req, res) => {
  try {
    const { worksiteId } = req.query;

    let worksites = [];
    if (worksiteId) {
      const worksite = await Worksite.findById(worksiteId);
      if (worksite) worksites = [worksite];
    } else {
      // Get worksites user has access to
      worksites = await Worksite.find({
        $or: [
          { "assignedSafetyOfficers.officer": req.user.safetyOfficer },
          { "ownership.owner": req.user.safetyOfficer },
        ],
      });
    }

    res.render("work-areas/create", {
      user: req.user,
      worksites,
      preselectedWorksite: worksiteId,
    });
  } catch (error) {
    console.error("Error loading create form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/dashboard");
  }
};

// Create new work area
exports.createWorkArea = async (req, res) => {
  try {
    const {
      worksiteId,
      name,
      code,
      location,
      description,
      status,
      plannedStart,
      plannedEnd,
      currentWorkTypes,
      shifts,
    } = req.body;

    // Verify user has access to worksite
    const worksite = await Worksite.findById(worksiteId);
    if (!worksite) {
      req.flash("error", "Worksite not found");
      return res.redirect("/work-areas/create");
    }

    const hasAccess = await checkWorksiteAccess(req.user, worksite);
    if (!hasAccess) {
      req.flash("error", "You don't have access to this worksite");
      return res.redirect("/work-areas/create");
    }

    // Parse work types
    let workTypesArray = [];
    if (currentWorkTypes) {
      try {
        workTypesArray =
          typeof currentWorkTypes === "string"
            ? JSON.parse(currentWorkTypes)
            : currentWorkTypes;
      } catch (e) {
        workTypesArray = [];
      }
    }

    // Parse shifts
    let shiftsArray = [];
    if (shifts) {
      try {
        shiftsArray = typeof shifts === "string" ? JSON.parse(shifts) : shifts;
      } catch (e) {
        shiftsArray = [];
      }
    }

    const newWorkArea = new WorkArea({
      worksite: worksiteId,
      name,
      code: code || `${worksite.name}-${Date.now()}`,
      location,
      description,
      status: status || "planned",
      plannedStart,
      plannedEnd,
      currentWorkTypes: workTypesArray.map((wt) => ({
        ...wt,
        startDate: wt.startDate || new Date(),
        isActive: true,
      })),
      activeShifts: shiftsArray,
      assignedSafetyOfficers: [
        {
          officer: req.user.safetyOfficer,
          shift: "all",
          isPrimary: true,
          assignedFrom: new Date(),
          isActive: true,
        },
      ],
      statistics: {
        incidents: 0,
        nearMisses: 0,
        safetyScore: 100,
        daysWithoutIncident: 0,
      },
    });

    await newWorkArea.save();

    // Add to worksite's work areas
    worksite.workAreas.push(newWorkArea._id);
    await worksite.save();

    req.flash("success", `Work area "${name}" created successfully`);
    res.redirect(`/work-areas/${newWorkArea._id}`);
  } catch (error) {
    console.error("Error creating work area:", error);
    req.flash("error", "Error creating work area");
    res.redirect("/work-areas/create");
  }
};

// View single work area
exports.getWorkArea = async (req, res) => {
  try {
    const workArea = await WorkArea.findById(req.params.id)
      .populate("worksite", "name location")
      .populate("assignedSafetyOfficers.officer", "name email")
      .populate("activePermits");

    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard");
    }

    // Get recent incidents
    const recentIncidents = await Incident.find({ workArea: workArea._id })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get active risk assessments
    const activeAssessments = await RiskAssessment.find({
      workArea: workArea._id,
      status: "active",
    }).limit(5);

    res.render("work-areas/view", {
      user: req.user,
      workArea,
      recentIncidents,
      activeAssessments,
    });
  } catch (error) {
    console.error("Error viewing work area:", error);
    req.flash("error", "Error loading work area");
    res.redirect("/dashboard");
  }
};

// Show edit work area form
exports.showEditWorkAreaForm = async (req, res) => {
  try {
    const workArea = await WorkArea.findById(req.params.id).populate(
      "worksite",
    );

    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard");
    }

    res.render("work-areas/edit", {
      user: req.user,
      workArea,
    });
  } catch (error) {
    console.error("Error loading edit form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/dashboard");
  }
};

// Update work area
exports.updateWorkArea = async (req, res) => {
  try {
    const workArea = await WorkArea.findById(req.params.id);

    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard");
    }

    const {
      name,
      location,
      description,
      status,
      currentWorkTypes,
      identifiedHazards,
    } = req.body;

    workArea.name = name || workArea.name;
    workArea.location = location || workArea.location;
    workArea.description = description || workArea.description;
    workArea.status = status || workArea.status;

    if (currentWorkTypes) {
      try {
        workArea.currentWorkTypes =
          typeof currentWorkTypes === "string"
            ? JSON.parse(currentWorkTypes)
            : currentWorkTypes;
      } catch (e) {}
    }

    if (identifiedHazards) {
      try {
        workArea.identifiedHazards =
          typeof identifiedHazards === "string"
            ? JSON.parse(identifiedHazards)
            : identifiedHazards;
      } catch (e) {}
    }

    await workArea.save();

    req.flash("success", "Work area updated successfully");
    res.redirect(`/work-areas/${workArea._id}`);
  } catch (error) {
    console.error("Error updating work area:", error);
    req.flash("error", "Error updating work area");
    res.redirect(`/work-areas/${req.params.id}/edit`);
  }
};

// Get incidents for a work area
exports.getAreaIncidents = async (req, res) => {
  try {
    const workArea = await WorkArea.findById(req.params.id);
    if (!workArea) {
      return res.status(404).json({ error: "Work area not found" });
    }

    const incidents = await Incident.find({ workArea: workArea._id }).sort({
      createdAt: -1,
    });

    res.json(incidents);
  } catch (error) {
    console.error("Error getting area incidents:", error);
    res.status(500).json({ error: "Error loading incidents" });
  }
};

// Get risk assessments for a work area
exports.getAreaRiskAssessments = async (req, res) => {
  try {
    const workArea = await WorkArea.findById(req.params.id);
    if (!workArea) {
      return res.status(404).json({ error: "Work area not found" });
    }

    const assessments = await RiskAssessment.find({
      workArea: workArea._id,
    }).sort({ createdAt: -1 });

    res.json(assessments);
  } catch (error) {
    console.error("Error getting risk assessments:", error);
    res.status(500).json({ error: "Error loading assessments" });
  }
};

// Get safety talks for a work area
exports.getAreaSafetyTalks = async (req, res) => {
  try {
    const workArea = await WorkArea.findById(req.params.id);
    if (!workArea) {
      return res.status(404).json({ error: "Work area not found" });
    }

    const talks = await SafetyTalk.find({
      targetWorkAreas: workArea._id,
    }).sort({ date: -1 });

    res.json(talks);
  } catch (error) {
    console.error("Error getting safety talks:", error);
    res.status(500).json({ error: "Error loading safety talks" });
  }
};
