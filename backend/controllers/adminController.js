const User = require("../models/User");
const SafetyOfficer = require("../models/SafetyOfficer");
const Worksite = require("../models/Worksite");
const WorkArea = require("../models/WorkArea");
const Incident = require("../models/Incident");
const RiskAssessment = require("../models/RiskAssessment");
const Permit = require("../models/Permit");
const bcrypt = require("bcrypt"); // or require('bcryptjs') if you installed that

// Show admin dashboard
exports.showAdminDashboard = async (req, res) => {
  try {
    // Get counts for dashboard stats
    const totalSafetyOfficers = await SafetyOfficer.countDocuments();
    const verifiedOfficers = await SafetyOfficer.countDocuments({
      verificationStatus: "verified",
    });
    const pendingOfficers = await SafetyOfficer.countDocuments({
      verificationStatus: "pending",
    });

    const totalWorksites = await Worksite.countDocuments();
    const activeWorksites = await Worksite.countDocuments({ status: "active" });

    const totalWorkAreas = await WorkArea.countDocuments();
    const activeWorkAreas = await WorkArea.countDocuments({ status: "active" });

    const totalIncidents = await Incident.countDocuments();
    const criticalIncidents = await Incident.countDocuments({
      severity: "critical",
    });

    // Get recent worksites
    const recentWorksites = await Worksite.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("assignedSafetyOfficers.officer", "name email");

    // Get pending verifications
    const pendingVerifications = await SafetyOfficer.find({
      verificationStatus: "pending",
    })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get pending approvals across worksites
    const worksitesWithPendingApprovals = await Worksite.find({
      "pendingApprovals.status": "pending",
    })
      .populate("pendingApprovals.submittedBy", "name email")
      .limit(10);

    // Flatten pending approvals for display
    const pendingApprovals = [];
    worksitesWithPendingApprovals.forEach((worksite) => {
      worksite.pendingApprovals.forEach((approval) => {
        if (approval.status === "pending") {
          pendingApprovals.push({
            ...approval.toObject(),
            worksiteName: worksite.name,
            worksiteId: worksite._id,
          });
        }
      });
    });

    // Get safety officer assignment stats
    const officerAssignments = await Worksite.aggregate([
      { $unwind: "$assignedSafetyOfficers" },
      {
        $group: {
          _id: "$assignedSafetyOfficers.officer",
          worksiteCount: { $sum: 1 },
          worksites: { $push: { name: "$name", id: "$_id" } },
        },
      },
      {
        $lookup: {
          from: "safetyofficers",
          localField: "_id",
          foreignField: "_id",
          as: "officerDetails",
        },
      },
      { $limit: 10 },
    ]);

    res.render("admin/dashboard", {
      user: req.user,
      stats: {
        totalSafetyOfficers,
        verifiedOfficers,
        pendingOfficers,
        totalWorksites,
        activeWorksites,
        totalWorkAreas,
        activeWorkAreas,
        totalIncidents,
        criticalIncidents,
      },
      recentWorksites,
      pendingVerifications,
      pendingApprovals: pendingApprovals.slice(0, 10),
      officerAssignments,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    req.flash("error", "Error loading dashboard");
    res.redirect("/");
  }
};

// List all safety officers
exports.listSafetyOfficers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.verificationStatus = status;
    }

    const officers = await SafetyOfficer.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("worksites", "name location");

    const total = await SafetyOfficer.countDocuments(query);

    // Get assignment counts for each officer
    const officerIds = officers.map((o) => o._id);
    const assignments = await Worksite.aggregate([
      { $unwind: "$assignedSafetyOfficers" },
      { $match: { "assignedSafetyOfficers.officer": { $in: officerIds } } },
      {
        $group: {
          _id: "$assignedSafetyOfficers.officer",
          worksiteCount: { $sum: 1 },
          workAreaCount: { $sum: { $size: "$workAreas" } },
        },
      },
    ]);

    const assignmentMap = {};
    assignments.forEach((a) => {
      assignmentMap[a._id.toString()] = a;
    });

    res.render("admin/safety-officers/list", {
      user: req.user,
      officers,
      assignmentMap,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      search,
      status,
    });
  } catch (error) {
    console.error("Error listing safety officers:", error);
    req.flash("error", "Error loading safety officers");
    res.redirect("/admin/dashboard");
  }
};

// View single safety officer
// exports.viewSafetyOfficer = async (req, res) => {
//   try {
//     const officer = await SafetyOfficer.findById(req.params.id).populate({
//       path: "worksites",
//       populate: { path: "workAreas" },
//     });

//     if (!officer) {
//       req.flash("error", "Safety officer not found");
//       return res.redirect("/admin/safety-officers");
//     }

//     // Get all worksites this officer is assigned to
//     const assignedWorksites = await Worksite.find({
//       "assignedSafetyOfficers.officer": officer._id,
//     }).populate("workAreas");

//     // Get work areas this officer manages
//     const workAreas = await WorkArea.find({
//       "assignedSafetyOfficers.officer": officer._id,
//     }).populate("worksite", "name");

//     // Get recent activity
//     const recentIncidents = await Incident.find({
//       workArea: { $in: workAreas.map((wa) => wa._id) },
//     })
//       .sort({ createdAt: -1 })
//       .limit(10)
//       .populate("workArea", "name");

//     const recentAssessments = await RiskAssessment.find({
//       workArea: { $in: workAreas.map((wa) => wa._id) },
//     })
//       .sort({ createdAt: -1 })
//       .limit(5);

//     res.render("admin/safety-officers/view", {
//       user: req.user,
//       officer,
//       assignedWorksites,
//       workAreas,
//       recentIncidents,
//       recentAssessments,
//     });
//   } catch (error) {
//     console.error("Error viewing safety officer:", error);
//     req.flash("error", "Error loading safety officer details");
//     res.redirect("/admin/safety-officers");
//   }
// };

// View single safety officer
exports.viewSafetyOfficer = async (req, res) => {
  try {
    const officer = await SafetyOfficer.findById(req.params.id).populate({
      path: "worksites",
      populate: { path: "workAreas" },
    });

    if (!officer) {
      req.flash("error", "Safety officer not found");
      return res.redirect("/admin/safety-officers");
    }

    // Get all worksites this officer is assigned to
    const assignedWorksites = await Worksite.find({
      "assignedSafetyOfficers.officer": officer._id,
    }).populate("workAreas");

    // Get work areas this officer manages
    const workAreas = await WorkArea.find({
      "assignedSafetyOfficers.officer": officer._id,
    }).populate("worksite", "name");

    // Get recent activity
    const recentIncidents = await Incident.find({
      workArea: { $in: workAreas.map((wa) => wa._id) },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("workArea", "name");

    const recentAssessments = await RiskAssessment.find({
      workArea: { $in: workAreas.map((wa) => wa._id) },
    })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get available worksites for assignment modal (exclude already assigned ones)
    const assignedWorksiteIds = assignedWorksites.map((w) => w._id);
    const availableWorksites = await Worksite.find({
      status: "active",
      _id: { $nin: assignedWorksiteIds }, // Exclude already assigned worksites
    }).select("name location");

    res.render("admin/safety-officers/view", {
      user: req.user,
      officer,
      assignedWorksites,
      workAreas,
      recentIncidents,
      recentAssessments,
      availableWorksites, // This was missing!
      success: req.flash("success"),
      error: req.flash("error"),
      info: req.flash("info"),
    });
  } catch (error) {
    console.error("Error viewing safety officer:", error);
    req.flash("error", "Error loading safety officer details");
    res.redirect("/admin/safety-officers");
  }
};

// Verify safety officer
exports.verifySafetyOfficer = async (req, res) => {
  try {
    const officer = await SafetyOfficer.findById(req.params.id);

    if (!officer) {
      req.flash("error", "Safety officer not found");
      return res.redirect("/admin/safety-officers");
    }

    officer.verificationStatus = "verified";
    officer.verifiedBy = req.user._id;
    await officer.save();

    req.flash(
      "success",
      `Safety officer ${officer.name} verified successfully`,
    );
    res.redirect(`/admin/safety-officers/${officer._id}`);
  } catch (error) {
    console.error("Error verifying safety officer:", error);
    req.flash("error", "Error verifying safety officer");
    res.redirect("/admin/safety-officers");
  }
};

// Show create worksite form
exports.showCreateWorksiteForm = async (req, res) => {
  try {
    // Get all verified safety officers for assignment
    const safetyOfficers = await SafetyOfficer.find({
      verificationStatus: "verified",
    }).select("name email officerNumber");

    res.render("admin/worksites/create", {
      user: req.user,
      safetyOfficers,
    });
  } catch (error) {
    console.error("Error loading create worksite form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/admin/dashboard");
  }
};

// Create new worksite
exports.createWorksite = async (req, res) => {
  try {
    const {
      name,
      location,
      siteType,
      description,
      clientName,
      clientContact,
      shifts,
      assignedOfficers,
      siteContext,
    } = req.body;

    // Parse shifts if provided as JSON
    let shiftsArray = [];
    if (shifts) {
      try {
        shiftsArray = typeof shifts === "string" ? JSON.parse(shifts) : shifts;
      } catch (e) {
        shiftsArray = [];
      }
    }

    // Parse assigned officers
    let officersArray = [];
    if (assignedOfficers) {
      try {
        officersArray =
          typeof assignedOfficers === "string"
            ? JSON.parse(assignedOfficers)
            : assignedOfficers;
      } catch (e) {
        officersArray = [];
      }
    }

    // Parse site context
    let siteContextObj = {};
    if (siteContext) {
      try {
        siteContextObj =
          typeof siteContext === "string"
            ? JSON.parse(siteContext)
            : siteContext;
      } catch (e) {
        siteContextObj = { overview: siteContext };
      }
    }

    const newWorksite = new Worksite({
      name,
      location,
      siteType,
      description,
      clientName,
      clientContact,
      shifts: shiftsArray,
      assignedSafetyOfficers: officersArray.map((officer) => ({
        officer: officer.id,
        role: officer.role || "assistant",
        assignedDate: new Date(),
        isActive: true,
      })),
      siteContext: siteContextObj,
      status: "active",
      createdBy: req.user._id,
    });

    await newWorksite.save();

    // Update each assigned safety officer's worksites list
    for (const assignment of officersArray) {
      await SafetyOfficer.findByIdAndUpdate(assignment.id, {
        $addToSet: { worksites: newWorksite._id },
      });
    }

    req.flash("success", `Worksite "${name}" created successfully`);
    res.redirect(`/admin/worksites/${newWorksite._id}`);
  } catch (error) {
    console.error("Error creating worksite:", error);
    req.flash("error", "Error creating worksite");
    res.redirect("/admin/worksites/create");
  }
};

// List all worksites
exports.listWorksites = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { clientName: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const worksites = await Worksite.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("assignedSafetyOfficers.officer", "name email")
      .populate("workAreas");

    const total = await Worksite.countDocuments(query);

    res.render("admin/worksites/list", {
      user: req.user,
      worksites,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      search,
      status,
    });
  } catch (error) {
    console.error("Error listing worksites:", error);
    req.flash("error", "Error loading worksites");
    res.redirect("/admin/dashboard");
  }
};

// View single worksite
exports.viewWorksite = async (req, res) => {
  try {
    const worksite = await Worksite.findById(req.params.id)
      .populate("assignedSafetyOfficers.officer", "name email phone")
      .populate({
        path: "workAreas",
        populate: {
          path: "assignedSafetyOfficers.officer",
          select: "name email",
        },
      })
      .populate("pendingApprovals.submittedBy", "name email");

    if (!worksite) {
      req.flash("error", "Worksite not found");
      return res.redirect("/admin/worksites");
    }

    // Get all safety officers for potential reassignment
    const availableOfficers = await SafetyOfficer.find({
      verificationStatus: "verified",
    }).select("name email officerNumber");

    // Get worksite statistics
    const workAreaIds = worksite.workAreas.map((wa) => wa._id);

    const incidentStats = await Incident.aggregate([
      { $match: { workArea: { $in: workAreaIds } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          critical: {
            $sum: { $cond: [{ $eq: ["$severity", "critical"] }, 1, 0] },
          },
          high: { $sum: { $cond: [{ $eq: ["$severity", "high"] }, 1, 0] } },
        },
      },
    ]);

    res.render("admin/worksites/view", {
      user: req.user,
      worksite,
      availableOfficers,
      stats: incidentStats[0] || { total: 0, critical: 0, high: 0 },
    });
  } catch (error) {
    console.error("Error viewing worksite:", error);
    req.flash("error", "Error loading worksite details");
    res.redirect("/admin/worksites");
  }
};

// Assign safety officer to worksite
exports.assignOfficerToWorksite = async (req, res) => {
  try {
    const { worksiteId } = req.params;
    const { officerId, role } = req.body;

    const worksite = await Worksite.findById(worksiteId);
    if (!worksite) {
      return res
        .status(404)
        .json({ success: false, message: "Worksite not found" });
    }

    // Check if already assigned
    const alreadyAssigned = worksite.assignedSafetyOfficers.some(
      (a) => a.officer.toString() === officerId && a.isActive,
    );

    if (alreadyAssigned) {
      return res.status(400).json({
        success: false,
        message: "Officer already assigned to this worksite",
      });
    }

    worksite.assignedSafetyOfficers.push({
      officer: officerId,
      role: role || "assistant",
      assignedDate: new Date(),
      isActive: true,
    });

    await worksite.save();

    // Update safety officer's worksites list
    await SafetyOfficer.findByIdAndUpdate(officerId, {
      $addToSet: { worksites: worksiteId },
    });

    res.json({ success: true, message: "Officer assigned successfully" });
  } catch (error) {
    console.error("Error assigning officer:", error);
    res
      .status(500)
      .json({ success: false, message: "Error assigning officer" });
  }
};

// Assign safety officer to work area
exports.assignOfficerToWorkArea = async (req, res) => {
  try {
    const { workAreaId } = req.params;
    const { officerId, shift, isPrimary } = req.body;

    const workArea = await WorkArea.findById(workAreaId);
    if (!workArea) {
      return res
        .status(404)
        .json({ success: false, message: "Work area not found" });
    }

    // Check if already assigned to this shift
    const alreadyAssigned = workArea.assignedSafetyOfficers.some(
      (a) =>
        a.officer.toString() === officerId && a.shift === shift && a.isActive,
    );

    if (alreadyAssigned) {
      return res.status(400).json({
        success: false,
        message: "Officer already assigned to this shift",
      });
    }

    // If setting as primary, unset other primaries for this shift
    if (isPrimary) {
      workArea.assignedSafetyOfficers.forEach((a) => {
        if (a.shift === shift) {
          a.isPrimary = false;
        }
      });
    }

    workArea.assignedSafetyOfficers.push({
      officer: officerId,
      shift,
      isPrimary: isPrimary || false,
      assignedFrom: new Date(),
      isActive: true,
    });

    await workArea.save();

    res.json({
      success: true,
      message: "Officer assigned to work area successfully",
    });
  } catch (error) {
    console.error("Error assigning officer to work area:", error);
    res
      .status(500)
      .json({ success: false, message: "Error assigning officer" });
  }
};

// Approve/reject document
exports.processApproval = async (req, res) => {
  try {
    const { worksiteId, approvalId } = req.params;
    const { action, comments } = req.body;

    const worksite = await Worksite.findById(worksiteId);
    if (!worksite) {
      req.flash("error", "Worksite not found");
      return res.redirect("/admin/dashboard");
    }

    const approval = worksite.pendingApprovals.id(approvalId);
    if (!approval) {
      req.flash("error", "Approval request not found");
      return res.redirect(`/admin/worksites/${worksiteId}`);
    }

    approval.status = action; // "approved" or "rejected"
    approval.comments = comments;

    // If approved, move to approved documents
    if (action === "approved") {
      worksite.approvedDocuments.push({
        documentType: approval.documentType,
        documentId: approval.documentId,
        documentNumber: approval.documentNumber,
        title: approval.title,
        approvedBy: req.user._id,
        approvedAt: new Date(),
      });
    }

    await worksite.save();

    req.flash("success", `Document ${action} successfully`);
    res.redirect(`/admin/worksites/${worksiteId}`);
  } catch (error) {
    console.error("Error processing approval:", error);
    req.flash("error", "Error processing approval");
    res.redirect("/admin/dashboard");
  }
};

// Get system-wide analytics
exports.getAnalytics = async (req, res) => {
  try {
    const { timeframe = "month" } = req.query;

    let dateFilter = {};
    const now = new Date();

    if (timeframe === "week") {
      dateFilter = { $gte: new Date(now.setDate(now.getDate() - 7)) };
    } else if (timeframe === "month") {
      dateFilter = { $gte: new Date(now.setMonth(now.getMonth() - 1)) };
    } else if (timeframe === "quarter") {
      dateFilter = { $gte: new Date(now.setMonth(now.getMonth() - 3)) };
    } else if (timeframe === "year") {
      dateFilter = { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) };
    }

    // Incidents by severity
    const incidentsBySeverity = await Incident.aggregate([
      { $match: dateFilter ? { createdAt: dateFilter } : {} },
      {
        $group: {
          _id: "$severity",
          count: { $sum: 1 },
        },
      },
    ]);

    // Incidents by work type
    const incidentsByWorkType = await Incident.aggregate([
      { $match: dateFilter ? { createdAt: dateFilter } : {} },
      {
        $group: {
          _id: "$workTypeAtTime",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Safety officer performance
    const officerPerformance = await SafetyOfficer.aggregate([
      {
        $project: {
          name: 1,
          email: 1,
          incidentsReported: 1,
          safetyTalksConducted: 1,
          worksitesManaged: { $size: "$worksites" },
        },
      },
      { $sort: { incidentsReported: -1 } },
      { $limit: 10 },
    ]);

    // Worksite safety scores
    const worksiteScores = await Worksite.aggregate([
      {
        $project: {
          name: 1,
          safetyScore: "$performance.overallSafetyScore",
          incidentCount: "$performance.totalIncidents",
          daysWithoutIncident: "$performance.daysWithoutIncident",
        },
      },
      { $sort: { safetyScore: 1 } },
      { $limit: 10 },
    ]);

    res.render("admin/analytics", {
      user: req.user,
      timeframe,
      incidentsBySeverity,
      incidentsByWorkType,
      officerPerformance,
      worksiteScores,
    });
  } catch (error) {
    console.error("Error getting analytics:", error);
    req.flash("error", "Error loading analytics");
    res.redirect("/admin/dashboard");
  }
};

// Show create safety officer form
exports.showCreateSafetyOfficerForm = async (req, res) => {
  try {
    // Get worksites for the assignment dropdown
    const worksites = await Worksite.find({ status: "active" })
      .select("name location")
      .sort({ name: 1 });

    res.render("admin/safety-officers/create", {
      user: req.user,
      worksites,
      title: "Create Safety Officer",
    });
  } catch (error) {
    console.error("Error loading create safety officer form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/admin/safety-officers");
  }
};

// Process create safety officer form
// exports.adminCreateSafetyOfficer = async (req, res) => {
//   try {
//     const { name, email, phone, bio, assignToWorksite } = req.body;

//     // Check if officer already exists
//     const existingOfficer = await SafetyOfficer.findOne({ email });
//     if (existingOfficer) {
//       req.flash("error", "A safety officer with this email already exists");
//       return res.redirect("/admin/safety-officers/create");
//     }

//     // Generate a temporary password
//     const tempPassword =
//       Math.random().toString(36).slice(-8) +
//       Math.random().toString(36).slice(-8).toUpperCase();

//     // Generate officer number
//     const officerCount = await SafetyOfficer.countDocuments();
//     const officerNumber = `SO${String(officerCount + 1).padStart(5, "0")}`;

//     // Create new safety officer
//     const newOfficer = new SafetyOfficer({
//       name,
//       email,
//       phone,
//       bio,
//       officerNumber,
//       password: tempPassword, // Make sure to hash this!
//       verificationStatus: "pending",
//       createdBy: req.user._id,
//       createdAt: new Date(),
//     });

//     // Hash the password if you're using bcrypt (you should be)
//     // const bcrypt = require('bcrypt');
//     // newOfficer.password = await bcrypt.hash(tempPassword, 10);

//     await newOfficer.save();

//     // If worksite assignment was selected
//     if (assignToWorksite) {
//       const worksite = await Worksite.findById(assignToWorksite);
//       if (worksite) {
//         worksite.assignedSafetyOfficers.push({
//           officer: newOfficer._id,
//           role: "assistant",
//           assignedDate: new Date(),
//           isActive: true,
//         });
//         await worksite.save();

//         // Update officer's worksites list
//         newOfficer.worksites.push(worksite._id);
//         await newOfficer.save();
//       }
//     }

//     // TODO: Send email with credentials
//     // await sendCredentialsEmail(email, tempPassword);

//     req.flash(
//       "success",
//       `Safety officer ${name} created successfully. Temporary password: ${tempPassword}`,
//     );
//     res.redirect(`/admin/safety-officers/${newOfficer._id}`);
//   } catch (error) {
//     console.error("Error creating safety officer:", error);
//     req.flash("error", "Error creating safety officer");
//     res.redirect("/admin/safety-officers/create");
//   }
// };

// Process create safety officer form
// exports.adminCreateSafetyOfficer = async (req, res) => {
//   try {
//     const { name, email, phone, bio, assignToWorksite } = req.body;

//     // Check if officer already exists
//     const existingOfficer = await SafetyOfficer.findOne({ email });
//     if (existingOfficer) {
//       req.flash("error", "A safety officer with this email already exists");
//       return res.redirect("/admin/safety-officers/create");
//     }

//     // Generate a temporary password
//     const tempPassword =
//       Math.random().toString(36).slice(-8) +
//       Math.random().toString(36).slice(-8).toUpperCase();

//     // Generate officer number as STRING with prefix
//     const officerCount = await SafetyOfficer.countDocuments();
//     const officerNumber = `SO${String(officerCount + 1).padStart(5, "0")}`; // "SO00001"

//     // Create new safety officer - AUTO-VERIFIED since admin creates them
//     const newOfficer = new SafetyOfficer({
//       name,
//       email,
//       phone,
//       bio,
//       officerNumber, // Now a string "SO00001"
//       password: tempPassword,
//       verificationStatus: "verified", // Auto-verified!
//       verifiedBy: req.user._id, // Track who created/verified them
//       verifiedAt: new Date(),
//       createdBy: req.user._id,
//       createdAt: new Date(),
//     });

//     // Hash the password
//     const bcrypt = require("bcrypt");
//     newOfficer.password = await bcrypt.hash(tempPassword, 10);

//     await newOfficer.save();

//     // If worksite assignment was selected
//     if (assignToWorksite) {
//       const worksite = await Worksite.findById(assignToWorksite);
//       if (worksite) {
//         worksite.assignedSafetyOfficers.push({
//           officer: newOfficer._id,
//           role: "assistant",
//           assignedDate: new Date(),
//           isActive: true,
//         });
//         await worksite.save();

//         // Update officer's worksites list
//         newOfficer.worksites.push(worksite._id);
//         await newOfficer.save();
//       }
//     }

//     req.flash(
//       "success",
//       `Safety officer ${name} created successfully and auto-verified. Temporary password: ${tempPassword}`,
//     );
//     res.redirect(`/admin/safety-officers/${newOfficer._id}`);
//   } catch (error) {
//     console.error("Error creating safety officer:", error);
//     req.flash("error", "Error creating safety officer");
//     res.redirect("/admin/safety-officers/create");
//   }
// };

exports.adminCreateSafetyOfficer = async (req, res) => {
  try {
    const { name, email, phone, bio, assignToWorksite } = req.body;

    // Check if user already exists in User collection
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash("error", "A user with this email already exists");
      return res.redirect("/admin/safety-officers/create");
    }

    // Check if officer already exists
    const existingOfficer = await SafetyOfficer.findOne({ email });
    if (existingOfficer) {
      req.flash("error", "A safety officer with this email already exists");
      return res.redirect("/admin/safety-officers/create");
    }

    // Generate a temporary password
    const tempPassword =
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-8).toUpperCase();

    // Hash the password
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Generate officer number as STRING with prefix
    const officerCount = await SafetyOfficer.countDocuments();
    const officerNumber = `SO${String(officerCount + 1).padStart(5, "0")}`; // "SO00001"

    // Create User account first
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: "safety_officer",
      isActive: true,
      createdBy: req.user._id,
      createdAt: new Date(),
    });

    await newUser.save();

    // Create new safety officer with reference to user
    const newOfficer = new SafetyOfficer({
      name,
      email,
      phone,
      bio,
      officerNumber,
      password: hashedPassword, // Store hashed password
      verificationStatus: "verified",
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      createdBy: req.user._id,
      user: newUser._id, // Link to User account
      isActive: true,
    });

    await newOfficer.save();

    // Update User with reference to SafetyOfficer (optional)
    newUser.safetyOfficer = newOfficer._id;
    await newUser.save();

    // If worksite assignment was selected
    if (assignToWorksite) {
      const worksite = await Worksite.findById(assignToWorksite);
      if (worksite) {
        worksite.assignedSafetyOfficers.push({
          officer: newOfficer._id,
          role: "assistant",
          assignedDate: new Date(),
          isActive: true,
        });
        await worksite.save();

        // Update officer's worksites list
        newOfficer.worksites.push(worksite._id);
        await newOfficer.save();
      }
    }

    req.flash(
      "success",
      `Safety officer ${name} created successfully. They can login with email and temporary password: ${tempPassword}`,
    );
    res.redirect(`/admin/safety-officers/${newOfficer._id}`);
  } catch (error) {
    console.error("Error creating safety officer:", error);

    // Cleanup: If User was created but SafetyOfficer failed, delete the User
    if (error.name === "ValidationError" || error.code === 11000) {
      // Attempt to find and delete the user if it was created
      try {
        const user = await User.findOne({ email: req.body.email });
        if (user) {
          await User.deleteOne({ _id: user._id });
        }
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
    }

    req.flash("error", "Error creating safety officer");
    res.redirect("/admin/safety-officers/create");
  }
};
