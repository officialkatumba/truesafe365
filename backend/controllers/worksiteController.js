// const Worksite = require("../models/Worksite");
// const WorkArea = require("../models/WorkArea");
// const SafetyOfficer = require("../models/SafetyOfficer");

// // Get all worksites for the logged-in user
// // exports.getMyWorksites = async (req, res) => {
// //   try {
// //     let worksites = [];

// //     // If user is safety officer (solo or enterprise)
// //     if (req.user.safetyOfficer) {
// //       worksites = await Worksite.find({
// //         $or: [
// //           { "assignedSafetyOfficers.officer": req.user.safetyOfficer },
// //           { "ownership.owner": req.user.safetyOfficer },
// //         ],
// //       }).populate("assignedSafetyOfficers.officer", "name email");
// //     }
// //     // If user is admin (enterprise)
// //     else if (req.user.role === "system_admin") {
// //       worksites = await Worksite.find({}).populate(
// //         "assignedSafetyOfficers.officer",
// //         "name email",
// //       );
// //     }

// //     res.render("worksites/list", {
// //       user: req.user,
// //       worksites,
// //     });
// //   } catch (error) {
// //     console.error("Error getting worksites:", error);
// //     req.flash("error", "Error loading worksites");
// //     res.redirect("/dashboard");
// //   }
// // };

// // Get all worksites for the logged-in user (with pagination)
// exports.getMyWorksites = async (req, res) => {
//   try {
//     const { search = "", status = "", page = 1, limit = 9 } = req.query;
//     const query = {};

//     // Build search query
//     if (search) {
//       query.$or = [
//         { name: { $regex: search, $options: "i" } },
//         { location: { $regex: search, $options: "i" } },
//       ];
//     }

//     if (status) {
//       query.status = status;
//     }

//     let worksites = [];
//     let total = 0;

//     // If user is safety officer (solo or enterprise)
//     if (req.user.safetyOfficer) {
//       const officerQuery = {
//         ...query,
//         $or: [
//           { "assignedSafetyOfficers.officer": req.user.safetyOfficer },
//           { "ownership.owner": req.user.safetyOfficer },
//         ],
//       };

//       total = await Worksite.countDocuments(officerQuery);
//       worksites = await Worksite.find(officerQuery)
//         .populate("assignedSafetyOfficers.officer", "name email")
//         .populate("workAreas")
//         .sort({ createdAt: -1 })
//         .skip((page - 1) * limit)
//         .limit(parseInt(limit));
//     }
//     // If user is admin (enterprise)
//     else if (req.user.role === "system_admin") {
//       total = await Worksite.countDocuments(query);
//       worksites = await Worksite.find(query)
//         .populate("assignedSafetyOfficers.officer", "name email")
//         .populate("workAreas")
//         .sort({ createdAt: -1 })
//         .skip((page - 1) * limit)
//         .limit(parseInt(limit));
//     }

//     res.render("worksites/list", {
//       user: req.user,
//       worksites,
//       search: search, // Always pass search (even if empty)
//       status: status, // Always pass status (even if empty)
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//         pages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     console.error("Error getting worksites:", error);
//     req.flash("error", "Error loading worksites");
//     res.redirect("/dashboard");
//   }
// };

// // Show create worksite form
// exports.showCreateWorksiteForm = async (req, res) => {
//   try {
//     // Get available safety officers for assignment (if admin)
//     let safetyOfficers = [];
//     if (req.user.role === "system_admin") {
//       safetyOfficers = await SafetyOfficer.find({
//         verificationStatus: "verified",
//       }).select("name email");
//     }

//     res.render("worksites/create", {
//       user: req.user,
//       safetyOfficers,
//       isSolo: req.user.isDualRole || false,
//     });
//   } catch (error) {
//     console.error("Error loading create form:", error);
//     req.flash("error", "Error loading form");
//     res.redirect("/worksites/my-worksites");
//   }
// };

// // Create new worksite
// // exports.createWorksite = async (req, res) => {
// //   try {
// //     const {
// //       name,
// //       location,
// //       siteType,
// //       description,
// //       clientName,
// //       clientContact,
// //       shifts,
// //       assignedOfficers,
// //     } = req.body;

// //     // Determine ownership based on user type
// //     let ownership = {};
// //     if (req.user.isDualRole || req.user.role === "safety_officer") {
// //       // Solo user or individual officer
// //       ownership = {
// //         type: "individual",
// //         owner: req.user.safetyOfficer,
// //         createdBy: req.user._id,
// //       };
// //     } else {
// //       // Enterprise admin
// //       ownership = {
// //         type: "enterprise",
// //         createdBy: req.user._id,
// //       };
// //     }

// //     // Parse shifts if provided
// //     let shiftsArray = [];
// //     if (shifts) {
// //       try {
// //         shiftsArray = typeof shifts === "string" ? JSON.parse(shifts) : shifts;
// //       } catch (e) {
// //         shiftsArray = [];
// //       }
// //     }

// //     const newWorksite = new Worksite({
// //       name,
// //       location,
// //       siteType,
// //       description,
// //       clientName,
// //       clientContact,
// //       shifts: shiftsArray,
// //       ownership,
// //       status: "active",
// //       createdBy: req.user._id,
// //     });

// //     // Handle officer assignments
// //     if (assignedOfficers && req.user.role === "system_admin") {
// //       // Admin assigning officers
// //       const officers =
// //         typeof assignedOfficers === "string"
// //           ? JSON.parse(assignedOfficers)
// //           : [assignedOfficers];

// //       officers.forEach((officerId) => {
// //         newWorksite.assignedSafetyOfficers.push({
// //           officer: officerId,
// //           role: "assistant",
// //           assignedDate: new Date(),
// //           isActive: true,
// //         });
// //       });
// //     } else if (req.user.safetyOfficer) {
// //       // Solo user assigns themselves
// //       newWorksite.assignedSafetyOfficers.push({
// //         officer: req.user.safetyOfficer,
// //         role: "lead",
// //         isPrimary: true,
// //         assignedDate: new Date(),
// //         isActive: true,
// //       });
// //     }

// //     await newWorksite.save();

// //     // Update safety officers' worksites list
// //     for (const assignment of newWorksite.assignedSafetyOfficers) {
// //       await SafetyOfficer.findByIdAndUpdate(assignment.officer, {
// //         $addToSet: { worksites: newWorksite._id },
// //       });
// //     }

// //     req.flash("success", `Worksite "${name}" created successfully`);
// //     res.redirect(`/worksites/${newWorksite._id}`);
// //   } catch (error) {
// //     console.error("Error creating worksite:", error);
// //     req.flash("error", "Error creating worksite");
// //     res.redirect("/worksites/create");
// //   }
// // };

// // Create new worksite (updated version)
// exports.createWorksite = async (req, res) => {
//   try {
//     const {
//       name,
//       location,
//       siteType,
//       description,
//       clientName,
//       clientContact,
//       siteOverview,
//       knownChallenges,
//       shifts,
//       assignedOfficers,
//     } = req.body;

//     // Determine ownership based on user type
//     let ownership = {};
//     if (req.user.isDualRole || req.user.role === "safety_officer") {
//       ownership = {
//         type: "individual",
//         owner: req.user.safetyOfficer,
//         createdBy: req.user._id,
//       };
//     } else {
//       ownership = {
//         type: "enterprise",
//         createdBy: req.user._id,
//       };
//     }

//     // Parse shifts
//     let shiftsArray = [];
//     if (shifts) {
//       shiftsArray = Array.isArray(shifts) ? shifts : [shifts];
//     }

//     // Parse known challenges
//     let challengesArray = [];
//     if (knownChallenges) {
//       challengesArray = knownChallenges.split(",").map((c) => c.trim());
//     }

//     const newWorksite = new Worksite({
//       name,
//       location,
//       siteType,
//       description,
//       clientName,
//       clientContact,
//       shifts: shiftsArray.map((shift) => ({
//         name: shift,
//         startTime: "08:00",
//         endTime: "17:00",
//       })),
//       ownership,
//       siteContext: {
//         overview: siteOverview || "",
//         knownChallenges: challengesArray,
//         strategicPriorities: [],
//         managementContacts: [],
//       },
//       status: "active",
//       createdBy: req.user._id,
//     });

//     // Handle officer assignments
//     if (assignedOfficers && req.user.role === "system_admin") {
//       const officers = Array.isArray(assignedOfficers)
//         ? assignedOfficers
//         : [assignedOfficers];

//       officers.forEach((officerId) => {
//         newWorksite.assignedSafetyOfficers.push({
//           officer: officerId,
//           role: "assistant",
//           assignedDate: new Date(),
//           isActive: true,
//         });
//       });
//     } else if (req.user.safetyOfficer) {
//       // Solo user assigns themselves
//       newWorksite.assignedSafetyOfficers.push({
//         officer: req.user.safetyOfficer,
//         role: "lead",
//         isPrimary: true,
//         assignedDate: new Date(),
//         isActive: true,
//       });
//     }

//     await newWorksite.save();

//     // Update safety officers' worksites list
//     for (const assignment of newWorksite.assignedSafetyOfficers) {
//       await SafetyOfficer.findByIdAndUpdate(assignment.officer, {
//         $addToSet: { worksites: newWorksite._id },
//       });
//     }

//     req.flash(
//       "success",
//       `Worksite "${name}" created successfully! You can now add work areas.`,
//     );
//     res.redirect(`/worksites/${newWorksite._id}`);
//   } catch (error) {
//     console.error("Error creating worksite:", error);
//     req.flash("error", "Error creating worksite");
//     res.redirect("/worksites/create");
//   }
// };

// // View single worksite
// exports.getWorksite = async (req, res) => {
//   try {
//     const worksite = await Worksite.findById(req.params.id)
//       .populate("assignedSafetyOfficers.officer", "name email")
//       .populate("workAreas")
//       .populate("teamMembers.officer", "name email");

//     if (!worksite) {
//       req.flash("error", "Worksite not found");
//       return res.redirect("/worksites/my-worksites");
//     }

//     // Check access
//     const hasAccess = await checkWorksiteAccess(req.user, worksite);
//     if (!hasAccess) {
//       req.flash("error", "You don't have access to this worksite");
//       return res.redirect("/worksites/my-worksites");
//     }

//     // Get work areas for this worksite
//     const workAreas = await WorkArea.find({ worksite: worksite._id }).populate(
//       "assignedSafetyOfficers.officer",
//       "name email",
//     );

//     res.render("worksites/view", {
//       user: req.user,
//       worksite,
//       workAreas,
//     });
//   } catch (error) {
//     console.error("Error viewing worksite:", error);
//     req.flash("error", "Error loading worksite");
//     res.redirect("/worksites/my-worksites");
//   }
// };

// // Show edit worksite form
// exports.showEditWorksiteForm = async (req, res) => {
//   try {
//     const worksite = await Worksite.findById(req.params.id);

//     if (!worksite) {
//       req.flash("error", "Worksite not found");
//       return res.redirect("/worksites/my-worksites");
//     }

//     // Check edit permission
//     const canEdit = await checkWorksiteEditPermission(req.user, worksite);
//     if (!canEdit) {
//       req.flash("error", "You don't have permission to edit this worksite");
//       return res.redirect(`/worksites/${worksite._id}`);
//     }

//     const safetyOfficers = await SafetyOfficer.find({
//       verificationStatus: "verified",
//     }).select("name email");

//     res.render("worksites/edit", {
//       user: req.user,
//       worksite,
//       safetyOfficers,
//     });
//   } catch (error) {
//     console.error("Error loading edit form:", error);
//     req.flash("error", "Error loading form");
//     res.redirect("/worksites/my-worksites");
//   }
// };

// // Update worksite
// exports.updateWorksite = async (req, res) => {
//   try {
//     const worksite = await Worksite.findById(req.params.id);

//     if (!worksite) {
//       req.flash("error", "Worksite not found");
//       return res.redirect("/worksites/my-worksites");
//     }

//     // Update fields
//     const {
//       name,
//       location,
//       siteType,
//       description,
//       clientName,
//       clientContact,
//       status,
//     } = req.body;

//     worksite.name = name || worksite.name;
//     worksite.location = location || worksite.location;
//     worksite.siteType = siteType || worksite.siteType;
//     worksite.description = description || worksite.description;
//     worksite.clientName = clientName || worksite.clientName;
//     worksite.clientContact = clientContact || worksite.clientContact;
//     worksite.status = status || worksite.status;

//     await worksite.save();

//     req.flash("success", "Worksite updated successfully");
//     res.redirect(`/worksites/${worksite._id}`);
//   } catch (error) {
//     console.error("Error updating worksite:", error);
//     req.flash("error", "Error updating worksite");
//     res.redirect(`/worksites/${req.params.id}/edit`);
//   }
// };

// // Share worksite with another officer (for solo users)
// exports.shareWorksite = async (req, res) => {
//   try {
//     const { worksiteId } = req.params;
//     const { officerEmail, role } = req.body;

//     const worksite = await Worksite.findById(worksiteId);

//     // Verify solo ownership
//     if (
//       worksite.ownership.owner.toString() !== req.user.safetyOfficer.toString()
//     ) {
//       return res.status(403).json({ error: "Not authorized" });
//     }

//     const officer = await SafetyOfficer.findOne({ email: officerEmail });
//     if (!officer) {
//       return res.status(404).json({ error: "Officer not found" });
//     }

//     // Check if already shared
//     const alreadyShared = worksite.teamMembers.some(
//       (m) => m.officer.toString() === officer._id.toString(),
//     );

//     if (alreadyShared) {
//       return res.status(400).json({ error: "Officer already has access" });
//     }

//     worksite.teamMembers.push({
//       officer: officer._id,
//       role: role || "viewer",
//       addedBy: req.user.safetyOfficer,
//       addedAt: new Date(),
//     });

//     await worksite.save();

//     // Add to officer's worksites
//     officer.worksites.push(worksite._id);
//     await officer.save();

//     req.flash("success", `Worksite shared with ${officer.name}`);
//     res.redirect(`/worksites/${worksiteId}`);
//   } catch (error) {
//     console.error("Error sharing worksite:", error);
//     req.flash("error", "Error sharing worksite");
//     res.redirect(`/worksites/${req.params.worksiteId}`);
//   }
// };

// // Helper functions
// async function checkWorksiteAccess(user, worksite) {
//   if (user.role === "system_admin") return true;
//   if (user.safetyOfficer) {
//     // Check if assigned, owner, or team member
//     return (
//       worksite.assignedSafetyOfficers.some(
//         (a) => a.officer.toString() === user.safetyOfficer.toString(),
//       ) ||
//       worksite.ownership.owner?.toString() === user.safetyOfficer.toString() ||
//       worksite.teamMembers?.some(
//         (m) => m.officer.toString() === user.safetyOfficer.toString(),
//       )
//     );
//   }
//   return false;
// }

// async function checkWorksiteEditPermission(user, worksite) {
//   if (user.role === "system_admin") return true;
//   if (user.safetyOfficer) {
//     // Owners and lead officers can edit
//     return (
//       worksite.ownership.owner?.toString() === user.safetyOfficer.toString() ||
//       worksite.assignedSafetyOfficers.some(
//         (a) =>
//           a.officer.toString() === user.safetyOfficer.toString() &&
//           a.role === "lead",
//       )
//     );
//   }
//   return false;
// }

const Worksite = require("../models/Worksite");
const WorkArea = require("../models/WorkArea");
const SafetyOfficer = require("../models/SafetyOfficer");

// ===== HELPER FUNCTIONS - MUST BE DEFINED FIRST =====
async function checkWorksiteAccess(user, worksite) {
  if (user.role === "system_admin") return true;
  if (user.safetyOfficer) {
    // Check if assigned as safety officer
    return (
      worksite.assignedSafetyOfficers.some(
        (a) => a.officer.toString() === user.safetyOfficer.toString(),
      ) ||
      worksite.ownership.owner?.toString() === user.safetyOfficer.toString()
    );
  }
  return false;
}

async function checkWorksiteEditPermission(user, worksite) {
  if (user.role === "system_admin") return true;
  if (user.safetyOfficer) {
    // Owners and lead officers can edit
    return (
      worksite.ownership.owner?.toString() === user.safetyOfficer.toString() ||
      worksite.assignedSafetyOfficers.some(
        (a) =>
          a.officer.toString() === user.safetyOfficer.toString() &&
          a.role === "lead",
      )
    );
  }
  return false;
}

// ===== CONTROLLER FUNCTIONS =====

// Get all worksites for the logged-in user (with pagination)
exports.getMyWorksites = async (req, res) => {
  try {
    const { search = "", status = "", page = 1, limit = 9 } = req.query;
    const query = {};

    // Build search query
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    let worksites = [];
    let total = 0;

    // If user is safety officer (solo or enterprise)
    if (req.user.safetyOfficer) {
      const officerQuery = {
        ...query,
        $or: [
          { "assignedSafetyOfficers.officer": req.user.safetyOfficer },
          { "ownership.owner": req.user.safetyOfficer },
        ],
      };

      total = await Worksite.countDocuments(officerQuery);
      worksites = await Worksite.find(officerQuery)
        .populate("assignedSafetyOfficers.officer", "name email")
        .populate("workAreas")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
    }
    // If user is admin (enterprise)
    else if (req.user.role === "system_admin") {
      total = await Worksite.countDocuments(query);
      worksites = await Worksite.find(query)
        .populate("assignedSafetyOfficers.officer", "name email")
        .populate("workAreas")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
    }

    res.render("worksites/list", {
      user: req.user,
      worksites,
      search: search,
      status: status,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting worksites:", error);
    req.flash("error", "Error loading worksites");
    res.redirect("/dashboard");
  }
};

// Show create worksite form
exports.showCreateWorksiteForm = async (req, res) => {
  try {
    // Get available safety officers for assignment (if admin)
    let safetyOfficers = [];
    if (req.user.role === "system_admin") {
      safetyOfficers = await SafetyOfficer.find({
        verificationStatus: "verified",
      }).select("name email");
    }

    res.render("worksites/create", {
      user: req.user,
      safetyOfficers,
      isSolo: req.user.isDualRole || false,
    });
  } catch (error) {
    console.error("Error loading create form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/worksites/my-worksites");
  }
};

// Create new worksite (updated version)
exports.createWorksite = async (req, res) => {
  try {
    const {
      name,
      location,
      siteType,
      description,
      clientName,
      clientContact,
      siteOverview,
      knownChallenges,
      shifts,
      assignedOfficers,
    } = req.body;

    // Determine ownership based on user type
    let ownership = {};
    if (req.user.isDualRole || req.user.role === "safety_officer") {
      ownership = {
        type: "individual",
        owner: req.user.safetyOfficer,
        createdBy: req.user._id,
      };
    } else {
      ownership = {
        type: "enterprise",
        createdBy: req.user._id,
      };
    }

    // Parse shifts
    let shiftsArray = [];
    if (shifts) {
      shiftsArray = Array.isArray(shifts) ? shifts : [shifts];
    }

    // Parse known challenges
    let challengesArray = [];
    if (knownChallenges) {
      challengesArray = knownChallenges.split(",").map((c) => c.trim());
    }

    const newWorksite = new Worksite({
      name,
      location,
      siteType,
      description,
      clientName,
      clientContact,
      shifts: shiftsArray.map((shift) => ({
        name: shift,
        startTime: "08:00",
        endTime: "17:00",
      })),
      ownership,
      siteContext: {
        overview: siteOverview || "",
        knownChallenges: challengesArray,
        strategicPriorities: [],
        managementContacts: [],
      },
      status: "active",
      createdBy: req.user._id,
    });

    // Handle officer assignments
    if (assignedOfficers && req.user.role === "system_admin") {
      const officers = Array.isArray(assignedOfficers)
        ? assignedOfficers
        : [assignedOfficers];

      officers.forEach((officerId) => {
        newWorksite.assignedSafetyOfficers.push({
          officer: officerId,
          role: "assistant",
          assignedDate: new Date(),
          isActive: true,
        });
      });
    } else if (req.user.safetyOfficer) {
      // Solo user assigns themselves
      newWorksite.assignedSafetyOfficers.push({
        officer: req.user.safetyOfficer,
        role: "lead",
        isPrimary: true,
        assignedDate: new Date(),
        isActive: true,
      });
    }

    await newWorksite.save();

    // Update safety officers' worksites list
    for (const assignment of newWorksite.assignedSafetyOfficers) {
      await SafetyOfficer.findByIdAndUpdate(assignment.officer, {
        $addToSet: { worksites: newWorksite._id },
      });
    }

    req.flash(
      "success",
      `Worksite "${name}" created successfully! You can now add work areas.`,
    );
    res.redirect(`/worksites/${newWorksite._id}`);
  } catch (error) {
    console.error("Error creating worksite:", error);
    req.flash("error", "Error creating worksite");
    res.redirect("/worksites/create");
  }
};

// View single worksite
exports.getWorksite = async (req, res) => {
  try {
    const worksite = await Worksite.findById(req.params.id)
      .populate("assignedSafetyOfficers.officer", "name email")
      .populate("workAreas");

    if (!worksite) {
      req.flash("error", "Worksite not found");
      return res.redirect("/worksites/my-worksites");
    }

    // Check access
    const hasAccess = await checkWorksiteAccess(req.user, worksite);
    if (!hasAccess) {
      req.flash("error", "You don't have access to this worksite");
      return res.redirect("/worksites/my-worksites");
    }

    // Get work areas for this worksite with their assigned officers
    const workAreas = await WorkArea.find({ worksite: worksite._id }).populate(
      "assignedSafetyOfficers.officer",
      "name email",
    );

    res.render("worksites/view", {
      user: req.user,
      worksite,
      workAreas,
    });
  } catch (error) {
    console.error("Error viewing worksite:", error);
    req.flash("error", "Error loading worksite");
    res.redirect("/worksites/my-worksites");
  }
};

// Show edit worksite form
exports.showEditWorksiteForm = async (req, res) => {
  try {
    const worksite = await Worksite.findById(req.params.id);

    if (!worksite) {
      req.flash("error", "Worksite not found");
      return res.redirect("/worksites/my-worksites");
    }

    // Check edit permission
    const canEdit = await checkWorksiteEditPermission(req.user, worksite);
    if (!canEdit) {
      req.flash("error", "You don't have permission to edit this worksite");
      return res.redirect(`/worksites/${worksite._id}`);
    }

    const safetyOfficers = await SafetyOfficer.find({
      verificationStatus: "verified",
    }).select("name email");

    res.render("worksites/edit", {
      user: req.user,
      worksite,
      safetyOfficers,
    });
  } catch (error) {
    console.error("Error loading edit form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/worksites/my-worksites");
  }
};

// Update worksite
// exports.updateWorksite = async (req, res) => {
//   try {
//     const worksite = await Worksite.findById(req.params.id);

//     if (!worksite) {
//       req.flash("error", "Worksite not found");
//       return res.redirect("/worksites/my-worksites");
//     }

//     // Update fields
//     const {
//       name,
//       location,
//       siteType,
//       description,
//       clientName,
//       clientContact,
//       status,
//     } = req.body;

//     worksite.name = name || worksite.name;
//     worksite.location = location || worksite.location;
//     worksite.siteType = siteType || worksite.siteType;
//     worksite.description = description || worksite.description;
//     worksite.clientName = clientName || worksite.clientName;
//     worksite.clientContact = clientContact || worksite.clientContact;
//     worksite.status = status || worksite.status;

//     await worksite.save();

//     req.flash("success", "Worksite updated successfully");
//     res.redirect(`/worksites/${worksite._id}`);
//   } catch (error) {
//     console.error("Error updating worksite:", error);
//     req.flash("error", "Error updating worksite");
//     res.redirect(`/worksites/${req.params.id}/edit`);
//   }
// };

// Update worksite
exports.updateWorksite = async (req, res) => {
  try {
    const worksite = await Worksite.findById(req.params.id);

    if (!worksite) {
      req.flash("error", "Worksite not found");
      return res.redirect("/worksites/my-worksites");
    }

    // Update fields
    const {
      name,
      location,
      siteType,
      description,
      clientName,
      clientContact,
      status,
      siteOverview,
      knownChallenges,
      shifts,
    } = req.body;

    // Basic info updates
    worksite.name = name || worksite.name;
    worksite.location = location || worksite.location;
    worksite.siteType = siteType || worksite.siteType;
    worksite.description = description || worksite.description;
    worksite.clientName = clientName || worksite.clientName;
    worksite.clientContact = clientContact || worksite.clientContact;
    worksite.status = status || worksite.status;

    // Update site context for AI
    if (!worksite.siteContext) {
      worksite.siteContext = {};
    }

    if (siteOverview !== undefined) {
      worksite.siteContext.overview = siteOverview;
    }

    if (knownChallenges !== undefined) {
      // Parse known challenges (split by commas and trim)
      worksite.siteContext.knownChallenges = knownChallenges
        ? knownChallenges
            .split(",")
            .map((c) => c.trim())
            .filter((c) => c)
        : [];
    }

    // Update shifts
    let shiftsArray = [];
    if (shifts) {
      shiftsArray = Array.isArray(shifts) ? shifts : [shifts];

      // Convert to the format expected by the schema
      worksite.shifts = shiftsArray.map((shift) => ({
        name: shift,
        startTime: "08:00",
        endTime: "17:00",
      }));
    } else {
      // If no shifts selected, clear the array
      worksite.shifts = [];
    }

    await worksite.save();

    req.flash("success", "Worksite updated successfully");
    res.redirect(`/worksites/${worksite._id}`);
  } catch (error) {
    console.error("Error updating worksite:", error);
    req.flash("error", "Error updating worksite");
    res.redirect(`/worksites/${req.params.id}/edit`);
  }
};

// Share worksite with another officer (for solo users)
exports.shareWorksite = async (req, res) => {
  try {
    const { worksiteId } = req.params;
    const { officerEmail, role } = req.body;

    const worksite = await Worksite.findById(worksiteId);

    // Verify solo ownership
    if (
      worksite.ownership.owner.toString() !== req.user.safetyOfficer.toString()
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const officer = await SafetyOfficer.findOne({ email: officerEmail });
    if (!officer) {
      return res.status(404).json({ error: "Officer not found" });
    }

    // Check if already shared
    const alreadyShared = worksite.teamMembers?.some(
      (m) => m.officer.toString() === officer._id.toString(),
    );

    if (alreadyShared) {
      return res.status(400).json({ error: "Officer already has access" });
    }

    worksite.teamMembers.push({
      officer: officer._id,
      role: role || "viewer",
      addedBy: req.user.safetyOfficer,
      addedAt: new Date(),
    });

    await worksite.save();

    // Add to officer's worksites
    officer.worksites.push(worksite._id);
    await officer.save();

    req.flash("success", `Worksite shared with ${officer.name}`);
    res.redirect(`/worksites/${worksiteId}`);
  } catch (error) {
    console.error("Error sharing worksite:", error);
    req.flash("error", "Error sharing worksite");
    res.redirect(`/worksites/${req.params.worksiteId}`);
  }
};
