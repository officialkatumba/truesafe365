const SafetyTalk = require("../models/SafetyTalk");
const WorkArea = require("../models/WorkArea");
const Incident = require("../models/Incident");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get all safety talks for officer
exports.getMyTalks = async (req, res) => {
  try {
    const workAreas = await WorkArea.find({
      "assignedSafetyOfficers.officer": req.user.safetyOfficer,
    }).select("_id");

    const workAreaIds = workAreas.map((wa) => wa._id);

    const talks = await SafetyTalk.find({
      targetWorkAreas: { $in: workAreaIds },
    })
      .sort({ date: -1 })
      .populate("targetWorkAreas", "name")
      .populate("conductedBy", "name");

    res.render("safety-talks/list", {
      user: req.user,
      talks,
    });
  } catch (error) {
    console.error("Error getting safety talks:", error);
    req.flash("error", "Error loading safety talks");
    res.redirect("/dashboard");
  }
};

// Show generate form
exports.showGenerateForm = async (req, res) => {
  try {
    const { workAreaId } = req.params;
    const workArea = await WorkArea.findById(workAreaId).populate("worksite");

    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard");
    }

    // Get recent incidents for this work area
    const recentIncidents = await Incident.find({
      workArea: workAreaId,
    })
      .sort({ createdAt: -1 })
      .limit(5);

    res.render("safety-talks/generate", {
      user: req.user,
      workArea,
      recentIncidents,
    });
  } catch (error) {
    console.error("Error loading generate form:", error);
    req.flash("error", "Error loading form");
    res.redirect("/dashboard");
  }
};

// Generate safety talk using AI
exports.generateSafetyTalk = async (req, res) => {
  try {
    const { workAreaId } = req.params;
    const { topic, focusAreas, duration } = req.body;

    const workArea = await WorkArea.findById(workAreaId).populate("worksite");

    if (!workArea) {
      req.flash("error", "Work area not found");
      return res.redirect("/dashboard");
    }

    // Get recent incidents
    const recentIncidents = await Incident.find({
      workArea: workAreaId,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get active hazards
    const activeHazards = workArea.identifiedHazards.filter(
      (h) => h.status === "active",
    );

    // Build prompt for AI
    const prompt = `
You are a professional safety officer creating a daily safety talk for a work area.

Work Area: ${workArea.name}
Worksite: ${workArea.worksite.name}
Current Work Types: ${workArea.currentWorkTypes.map((wt) => wt.workType).join(", ")}

Recent Incidents (last 30 days):
${recentIncidents.map((i) => `- ${i.type}: ${i.description} (${i.severity} severity)`).join("\n")}

Active Hazards:
${activeHazards.map((h) => `- ${h.hazard} (${h.riskLevel} risk)`).join("\n")}

Topic requested: ${topic || "General safety awareness"}
Focus areas: ${focusAreas || "All areas"}

Create a comprehensive safety talk that includes:
1. An engaging title
2. Opening statement (2-3 sentences)
3. 3-5 main points with practical examples
4. 2-3 discussion questions for workers
5. Key takeaways
6. Closing reminder

Make it practical, engaging, and specific to this work area's current conditions.
Keep the talk to approximately ${duration || 10} minutes when presented.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const aiContent = completion.choices[0].message.content;

    // Parse AI response into sections (simplified parsing)
    const sections = {
      opening: "",
      mainPoints: [],
      discussionQuestions: [],
      keyTakeaways: [],
      closing: "",
    };

    // Simple parsing logic (you can enhance this)
    const lines = aiContent.split("\n");
    let currentSection = "opening";

    lines.forEach((line) => {
      if (
        line.toLowerCase().includes("main point") ||
        line.toLowerCase().includes("point")
      ) {
        currentSection = "mainPoints";
        if (line.trim() && !line.toLowerCase().includes("main point")) {
          sections.mainPoints.push(line.trim());
        }
      } else if (line.toLowerCase().includes("discussion question")) {
        currentSection = "discussionQuestions";
      } else if (line.toLowerCase().includes("takeaway")) {
        currentSection = "keyTakeaways";
      } else if (line.toLowerCase().includes("closing")) {
        currentSection = "closing";
        if (line.trim() && !line.toLowerCase().includes("closing")) {
          sections.closing += line.trim() + " ";
        }
      } else {
        if (line.trim()) {
          if (currentSection === "opening") {
            sections.opening += line.trim() + " ";
          } else if (currentSection === "mainPoints") {
            sections.mainPoints.push(line.trim());
          } else if (currentSection === "discussionQuestions") {
            sections.discussionQuestions.push(line.trim());
          } else if (currentSection === "keyTakeaways") {
            sections.keyTakeaways.push(line.trim());
          } else if (currentSection === "closing") {
            sections.closing += line.trim() + " ";
          }
        }
      }
    });

    // Create safety talk
    const safetyTalk = new SafetyTalk({
      talkNumber: await getNextTalkNumber(),
      targetWorkAreas: [workAreaId],
      targetShifts: ["all"],
      conductedBy: req.user.safetyOfficer,
      aiGenerated: true,
      aiModel: "gpt-4",
      generationDate: new Date(),
      title: lines[0]?.replace(/^#+\s*/, "") || `${workArea.name} Safety Talk`,
      content: aiContent,
      sections,
      basedOn: {
        recentIncidents: recentIncidents.map((i) => i._id),
        identifiedHazards: activeHazards.map((h) => h.hazardId),
        aiReasoning: "Generated based on recent incidents and active hazards",
      },
      date: new Date(),
      duration: parseInt(duration) || 10,
      topics: [topic || "general safety"],
      status: "draft",
    });

    await safetyTalk.save();

    // Add to work area's documents
    workArea.documents.safetyTalks.push(safetyTalk._id);
    await workArea.save();

    req.flash("success", "Safety talk generated successfully!");
    res.redirect(`/safety-talks/${safetyTalk._id}`);
  } catch (error) {
    console.error("Error generating safety talk:", error);
    req.flash("error", "Error generating safety talk");
    res.redirect(`/safety-talks/generate/${req.params.workAreaId}`);
  }
};

// View single safety talk
exports.getSafetyTalk = async (req, res) => {
  try {
    const talk = await SafetyTalk.findById(req.params.id)
      .populate("targetWorkAreas", "name worksite")
      .populate("conductedBy", "name")
      .populate("basedOn.recentIncidents", "incidentNumber type severity");

    if (!talk) {
      req.flash("error", "Safety talk not found");
      return res.redirect("/safety-talks");
    }

    res.render("safety-talks/view", {
      user: req.user,
      talk,
    });
  } catch (error) {
    console.error("Error viewing safety talk:", error);
    req.flash("error", "Error loading safety talk");
    res.redirect("/safety-talks");
  }
};

// Mark talk as conducted
exports.markAsConducted = async (req, res) => {
  try {
    const talk = await SafetyTalk.findById(req.params.id);

    if (!talk) {
      req.flash("error", "Safety talk not found");
      return res.redirect("/safety-talks");
    }

    const { attendeeCount, notes } = req.body;

    talk.status = "conducted";
    talk.date = new Date();
    talk.attendance.totalAttendees = attendeeCount || 0;

    if (notes) {
      talk.effectiveness = {
        comments: notes,
        reviewedBy: req.user.safetyOfficer,
        reviewedAt: new Date(),
      };
    }

    await talk.save();

    // Update safety officer's stats
    const SafetyOfficer = require("../models/SafetyOfficer");
    await SafetyOfficer.findByIdAndUpdate(req.user.safetyOfficer, {
      $inc: { safetyTalksConducted: 1 },
    });

    req.flash("success", "Safety talk marked as conducted");
    res.redirect(`/safety-talks/${talk._id}`);
  } catch (error) {
    console.error("Error marking talk as conducted:", error);
    req.flash("error", "Error updating safety talk");
    res.redirect(`/safety-talks/${req.params.id}`);
  }
};

// Add feedback to talk
exports.addFeedback = async (req, res) => {
  try {
    const talk = await SafetyTalk.findById(req.params.id);

    if (!talk) {
      return res.status(404).json({ error: "Safety talk not found" });
    }

    const { rating, comment, anonymous } = req.body;

    talk.feedback.push({
      workerId: anonymous ? null : req.user?._id,
      anonymous: anonymous === "true",
      rating: parseInt(rating),
      comment,
      date: new Date(),
    });

    await talk.save();

    res.json({ success: true, message: "Feedback added successfully" });
  } catch (error) {
    console.error("Error adding feedback:", error);
    res.status(500).json({ error: "Error adding feedback" });
  }
};

// Helper function to get next talk number
async function getNextTalkNumber() {
  const Counter = require("../models/Counter");
  const counter = await Counter.findByIdAndUpdate(
    { _id: "safetytalk" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return counter.seq + 5000;
}
