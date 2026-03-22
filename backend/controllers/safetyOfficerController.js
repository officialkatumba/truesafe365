const Incident = require("../models/Incident");
const RiskAssessment = require("../models/RiskAssessment");
const SafetyTalk = require("../models/SafetyTalk");
const PPEChecklist = require("../models/PPEChecklist");
const SafetyObservation = require("../models/SafetyObservation");
const Worksite = require("../models/Worksite");
const WorkArea = require("../models/WorkArea");
const SafetyOfficer = require("../models/SafetyOfficer");

// Show safety officer dashboard
exports.showDashboard = async (req, res) => {
  try {
    const officer = await SafetyOfficer.findOne({ user: req.user._id })
      .populate("worksites")
      .populate("workAreas");

    if (!officer) {
      req.flash("error", "Safety officer profile not found");
      return res.redirect("/");
    }

    // Get assigned worksites and work areas
    const assignedWorksites = await Worksite.find({
      "assignedSafetyOfficers.officer": officer._id,
      "assignedSafetyOfficers.isActive": true,
    });

    const workAreas = await WorkArea.find({
      "assignedSafetyOfficers.officer": officer._id,
      "assignedSafetyOfficers.isActive": true,
    }).populate("worksite", "name");

    // Get statistics
    const stats = {
      incidentsReported: await Incident.countDocuments({
        reportedBy: officer._id,
      }),
      safetyTalks: await SafetyTalk.countDocuments({
        conductedBy: officer._id,
      }),
      riskAssessments: await RiskAssessment.countDocuments({
        assessedBy: officer._id,
      }),
      ppeChecks: await PPEChecklist.countDocuments({
        conductedBy: officer._id,
      }),
    };

    // Get recent activities
    const recentIncidents = await Incident.find({ reportedBy: officer._id })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentAssessments = await RiskAssessment.find({
      assessedBy: officer._id,
    })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentActivities = [
      ...recentIncidents.map((i) => ({
        ...i.toObject(),
        type: "incident",
        link: `/safety-officer/incidents/${i._id}`,
      })),
      ...recentAssessments.map((a) => ({
        ...a.toObject(),
        type: "assessment",
        link: `/safety-officer/risk-assessments/${a._id}`,
      })),
    ].sort((a, b) => b.createdAt - a.createdAt);

    res.render("safety-officer/dashboard", {
      user: req.user,
      officer,
      assignedWorksites,
      workAreas,
      stats,
      recentActivities,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    req.flash("error", "Error loading dashboard");
    res.redirect("/");
  }
};

// Report Incident
exports.reportIncident = async (req, res) => {
  try {
    const {
      workAreaId,
      incidentType,
      severity,
      title,
      description,
      immediateActions,
      requiresInvestigation,
    } = req.body;

    const officer = await SafetyOfficer.findOne({ user: req.user._id });

    const incident = new Incident({
      workArea: workAreaId,
      type: incidentType,
      severity,
      title,
      description,
      immediateActions,
      reportedBy: officer._id,
      reportedAt: new Date(),
      status: "reported",
      requiresInvestigation: requiresInvestigation === "true",
    });

    await incident.save();

    // Update officer stats
    await SafetyOfficer.findByIdAndUpdate(officer._id, {
      $inc: { incidentsReported: 1 },
    });

    req.flash("success", "Incident reported successfully");
    res.redirect("/safety-officer/dashboard");
  } catch (error) {
    console.error("Error reporting incident:", error);
    req.flash("error", "Error reporting incident");
    res.redirect("/safety-officer/dashboard");
  }
};

// Create Risk Assessment
exports.createRiskAssessment = async (req, res) => {
  try {
    const { workAreaId, activity, hazards, riskLevels, controls } = req.body;

    const officer = await SafetyOfficer.findOne({ user: req.user._id });

    const hazardsArray = [];
    if (hazards) {
      for (let i = 0; i < hazards.length; i++) {
        hazardsArray.push({
          hazard: hazards[i],
          riskLevel: riskLevels[i],
          controls: controls[i],
        });
      }
    }

    const assessment = new RiskAssessment({
      workArea: workAreaId,
      activity,
      hazards: hazardsArray,
      assessedBy: officer._id,
      assessmentDate: new Date(),
      status: "draft",
    });

    await assessment.save();

    req.flash("success", "Risk assessment created successfully");
    res.redirect("/safety-officer/dashboard");
  } catch (error) {
    console.error("Error creating risk assessment:", error);
    req.flash("error", "Error creating risk assessment");
    res.redirect("/safety-officer/dashboard");
  }
};

// Generate Safety Talk
exports.generateSafetyTalk = async (req, res) => {
  try {
    const { workAreaId, topic, focusArea } = req.body;

    const officer = await SafetyOfficer.findOne({ user: req.user._id });
    const workArea = await WorkArea.findById(workAreaId).populate("worksite");

    // Generate AI-powered safety talk content
    let talkContent = generateSafetyTalkContent(topic, focusArea, workArea);

    const safetyTalk = new SafetyTalk({
      workArea: workAreaId,
      title: topic || `Safety Talk - ${new Date().toLocaleDateString()}`,
      content: talkContent,
      focusArea,
      conductedBy: officer._id,
      date: new Date(),
      status: "scheduled",
    });

    await safetyTalk.save();

    req.flash("success", "Safety talk generated successfully");
    res.redirect("/safety-officer/dashboard");
  } catch (error) {
    console.error("Error generating safety talk:", error);
    req.flash("error", "Error generating safety talk");
    res.redirect("/safety-officer/dashboard");
  }
};

// Create PPE Checklist
exports.createPPEChecklist = async (req, res) => {
  try {
    const { workAreaId, shift, ppeItems, observations } = req.body;

    const officer = await SafetyOfficer.findOne({ user: req.user._id });

    const checklist = new PPEChecklist({
      workArea: workAreaId,
      shift,
      ppeItems: ppeItems || [],
      observations,
      conductedBy: officer._id,
      date: new Date(),
      status: "completed",
    });

    await checklist.save();

    req.flash("success", "PPE checklist submitted successfully");
    res.redirect("/safety-officer/dashboard");
  } catch (error) {
    console.error("Error creating PPE checklist:", error);
    req.flash("error", "Error creating PPE checklist");
    res.redirect("/safety-officer/dashboard");
  }
};

// Create Safety Observation
exports.createObservation = async (req, res) => {
  try {
    const { workAreaId, type, description, recommendations } = req.body;

    const officer = await SafetyOfficer.findOne({ user: req.user._id });

    const observation = new SafetyObservation({
      workArea: workAreaId,
      type,
      description,
      recommendations,
      observedBy: officer._id,
      date: new Date(),
    });

    await observation.save();

    req.flash("success", "Safety observation recorded successfully");
    res.redirect("/safety-officer/dashboard");
  } catch (error) {
    console.error("Error creating observation:", error);
    req.flash("error", "Error creating observation");
    res.redirect("/safety-officer/dashboard");
  }
};

// Helper function to generate safety talk content
function generateSafetyTalkContent(topic, focusArea, workArea) {
  const templates = {
    general: `Today's safety topic focuses on maintaining a safe work environment at ${workArea?.name || "our work area"}. Remember that safety is everyone's responsibility. Always be aware of your surroundings and report any hazards immediately. Stay vigilant and look out for your colleagues.`,

    ppe: `Personal Protective Equipment (PPE) is your last line of defense against workplace hazards. Always inspect your PPE before use. Ensure hard hats are not damaged, safety glasses are clean, and gloves are free from tears. Remember: No PPE = No work!`,

    hazard: `Hazard identification is crucial for preventing incidents. Take 5 minutes before starting any task to identify potential hazards. Ask yourself: What could go wrong? What safeguards are in place? What can I do to make this task safer?`,

    emergency: `Emergency preparedness saves lives. Know your emergency exits, assembly points, and emergency contacts. If you discover a fire, sound the alarm immediately. Never assume someone else has reported an emergency.`,

    ergonomics: `Good ergonomics prevent musculoskeletal injuries. Take regular breaks, stretch your muscles, and use proper lifting techniques. Keep your work area organized to avoid trips and falls.`,
  };

  return templates[focusArea] || templates.general;
}
