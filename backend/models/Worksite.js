const mongoose = require("mongoose");
const Counter = require("./Counter");

const worksiteSchema = new mongoose.Schema(
  {
    worksiteNumber: { type: Number, unique: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    siteType: {
      type: String,
      enum: [
        "construction",
        "mining",
        "manufacturing",
        "oil_gas",
        "warehouse",
        "office",
        "other",
      ],
      required: true,
    },
    description: String,
    clientName: String,
    clientContact: String,

    // Company-wide performance tracking
    performance: {
      overallSafetyScore: { type: Number, default: 100, min: 0, max: 100 },
      totalIncidents: { type: Number, default: 0 },
      totalNearMisses: { type: Number, default: 0 },
      daysWithoutIncident: { type: Number, default: 0 },
      lastIncidentDate: Date,
      inspectionsConducted: { type: Number, default: 0 },
      safetyTalksConducted: { type: Number, default: 0 },
    },

    // Site-wide shifts (reference only)
    shifts: [
      {
        name: {
          type: String,
          enum: ["morning", "afternoon", "night", "rotating"],
        },
        startTime: String,
        endTime: String,
        description: String,
      },
    ],

    // Supervisory: Assign safety officers to this worksite
    assignedSafetyOfficers: [
      {
        officer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SafetyOfficer",
          required: true,
        },
        role: { type: String, enum: ["lead", "assistant", "trainee"] },
        assignedDate: { type: Date, default: Date.now },
        endDate: Date,
        isActive: { type: Boolean, default: true },
        notes: String,
      },
    ],

    // Supervisory: Approval queue for documents
    pendingApprovals: [
      {
        documentType: {
          type: String,
          enum: [
            "risk_assessment",
            "incident_report",
            "permit",
            "safety_talk",
            "jsa",
            "ppe_checklist",
          ],
        },
        documentId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "pendingApprovals.documentModel",
        },
        documentModel: {
          type: String,
          enum: [
            "RiskAssessment",
            "Incident",
            "Permit",
            "SafetyTalk",
            "JSA",
            "PPEChecklist",
          ],
        },
        submittedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SafetyOfficer",
        },
        submittedAt: { type: Date, default: Date.now },
        urgency: {
          type: String,
          enum: ["routine", "urgent", "critical"],
          default: "routine",
        },
        comments: String,
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
      },
    ],

    // Supervisory: Approved documents log
    approvedDocuments: [
      {
        documentType: String,
        documentId: { type: mongoose.Schema.Types.ObjectId },
        documentNumber: String,
        title: String,
        approvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SafetyOfficer",
        },
        approvedAt: Date,
        version: Number,
      },
    ],

    // Company-wide compliance checks
    complianceStatus: [
      {
        regulation: String,
        authority: String,
        status: {
          type: String,
          enum: ["compliant", "non_compliant", "pending_audit", "exempt"],
        },
        lastChecked: Date,
        nextCheckDue: Date,
        checkedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SafetyOfficer",
        },
        findings: String,
        correctiveActions: String,
      },
    ],

    // Site-wide context for AI (supervisory level)
    siteContext: {
      overview: String,
      knownChallenges: [String],
      strategicPriorities: [String],
      managementContacts: [
        {
          name: String,
          role: String,
          contact: String,
        },
      ],
    },

    // Work areas under this worksite
    workAreas: [{ type: mongoose.Schema.Types.ObjectId, ref: "WorkArea" }],

    status: {
      type: String,
      enum: ["active", "inactive", "under_review", "completed"],
      default: "active",
    },

    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyOfficer" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyOfficer" },
  },
  { timestamps: true },
);

// Auto-increment worksite number
worksiteSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "worksite" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );
      this.worksiteNumber = counter.seq + 1000;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Method to update overall performance stats
worksiteSchema.methods.updatePerformanceStats = async function () {
  const WorkArea = mongoose.model("WorkArea");
  const workAreas = await WorkArea.find({ worksite: this._id });

  let totalIncidents = 0;
  let totalNearMisses = 0;
  let totalSafetyScore = 0;

  workAreas.forEach((area) => {
    totalIncidents += area.statistics?.incidents || 0;
    totalNearMisses += area.statistics?.nearMisses || 0;
    totalSafetyScore += area.statistics?.safetyScore || 100;
  });

  this.performance.totalIncidents = totalIncidents;
  this.performance.totalNearMisses = totalNearMisses;
  this.performance.overallSafetyScore =
    workAreas.length > 0
      ? Math.round(totalSafetyScore / workAreas.length)
      : 100;

  await this.save();
};

module.exports = mongoose.model("Worksite", worksiteSchema);
