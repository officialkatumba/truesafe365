const mongoose = require("mongoose");
const Counter = require("./Counter");

const workAreaSchema = new mongoose.Schema(
  {
    workAreaNumber: { type: Number, unique: true },

    // Parent worksite
    worksite: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worksite",
      required: true,
    },

    // Basic info
    name: { type: String, required: true },
    code: { type: String, unique: true }, // e.g., "NS-FND-01"
    description: String,

    // Location within worksite
    location: {
      zone: String,
      level: String,
      coordinates: String,
      accessPoints: [String],
    },

    // Current status
    status: {
      type: String,
      enum: ["planned", "active", "on_hold", "completed", "inspecting"],
      default: "planned",
    },

    // Schedule
    plannedStart: Date,
    plannedEnd: Date,
    actualStart: Date,
    actualEnd: Date,

    // Current work types (can change over time)
    currentWorkTypes: [
      {
        workType: {
          type: String,
          enum: [
            "excavation",
            "foundation",
            "structural",
            "masonry",
            "roofing",
            "electrical",
            "plumbing",
            "hvac",
            "finishing",
            "landscaping",
            "demolition",
            "painting",
            "welding",
            "scaffolding",
            "general",
          ],
        },
        startDate: Date,
        endDate: Date,
        isActive: { type: Boolean, default: true },
        supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        contractor: {
          name: String,
          contact: String,
          supervisor: String,
        },
      },
    ],

    // Assigned personnel
    assignedSafetyOfficers: [
      {
        officer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SafetyOfficer",
          required: true,
        },
        shift: {
          type: String,
          enum: ["morning", "afternoon", "night", "rotating"],
        },
        isPrimary: { type: Boolean, default: false },
        assignedFrom: Date,
        assignedTo: Date,
        isActive: { type: Boolean, default: true },
      },
    ],

    // Shifts operating in this area
    activeShifts: [
      {
        name: { type: String, enum: ["morning", "afternoon", "night"] },
        supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        workerCount: Number,
        startTime: String,
        endTime: String,
      },
    ],

    // AREA-SPECIFIC HAZARDS
    identifiedHazards: [
      {
        hazardId: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        hazard: { type: String, required: true },
        category: {
          type: String,
          enum: [
            "physical",
            "chemical",
            "biological",
            "ergonomic",
            "psychosocial",
            "electrical",
            "mechanical",
          ],
        },
        riskLevel: {
          type: String,
          enum: ["low", "medium", "high", "critical"],
        },
        likelihood: {
          type: String,
          enum: ["rare", "unlikely", "possible", "likely", "almost_certain"],
        },
        consequence: {
          type: String,
          enum: ["insignificant", "minor", "moderate", "major", "catastrophic"],
        },
        controls: String,
        identifiedDate: { type: Date, default: Date.now },
        identifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SafetyOfficer",
        },
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SafetyOfficer",
        },
        reviewedDate: Date,
        status: {
          type: String,
          enum: ["active", "mitigated", "monitoring", "closed"],
          default: "active",
        },
        affectedShifts: [
          { type: String, enum: ["morning", "afternoon", "night", "all"] },
        ],
        closedDate: Date,
        closedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SafetyOfficer",
        },
        notes: String,
      },
    ],

    // AREA-SPECIFIC EQUIPMENT
    equipment: [
      {
        equipmentId: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        name: { type: String, required: true },
        type: String,
        model: String,
        serialNumber: String,
        identificationNumber: String,
        location: String,
        status: {
          type: String,
          enum: ["operational", "maintenance", "out_of_service", "retired"],
          default: "operational",
        },
        lastInspection: Date,
        nextInspection: Date,
        inspectedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SafetyOfficer",
        },
        operator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        notes: String,
        inspectionHistory: [
          {
            date: Date,
            inspector: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "SafetyOfficer",
            },
            findings: String,
            passed: Boolean,
            nextInspectionDate: Date,
          },
        ],
      },
    ],

    // Active permits in this area
    activePermits: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permit" }],

    // Statistics for this area
    statistics: {
      incidents: { type: Number, default: 0 },
      nearMisses: { type: Number, default: 0 },
      safetyTalks: { type: Number, default: 0 },
      riskAssessments: { type: Number, default: 0 },
      daysWithoutIncident: { type: Number, default: 0 },
      lastIncidentDate: Date,
      safetyScore: { type: Number, default: 100, min: 0, max: 100 },
      workerHours: { type: Number, default: 0 },
      inspectionsPassed: { type: Number, default: 0 },
      inspectionsFailed: { type: Number, default: 0 },
    },

    // Area-specific AI context
    aiContext: {
      currentPhase: String,
      criticalActivities: [String],
      recentChanges: String,
      upcomingRisks: [String],
      workerFeedback: [
        {
          date: Date,
          comment: String,
          topic: String,
        },
      ],
    },

    // Documents created for this area (references)
    documents: {
      incidents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Incident" }],
      riskAssessments: [
        { type: mongoose.Schema.Types.ObjectId, ref: "RiskAssessment" },
      ],
      safetyTalks: [
        { type: mongoose.Schema.Types.ObjectId, ref: "SafetyTalk" },
      ],
      permits: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permit" }],
      jsas: [{ type: mongoose.Schema.Types.ObjectId, ref: "JSA" }],
      ppeChecklists: [
        { type: mongoose.Schema.Types.ObjectId, ref: "PPEChecklist" },
      ],
    },

    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyOfficer" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyOfficer" },
  },
  { timestamps: true },
);

// Auto-increment work area number
workAreaSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "workarea" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );
      this.workAreaNumber = counter.seq + 2000;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Method to update statistics
workAreaSchema.methods.updateStatistics = async function (incidentType) {
  if (incidentType === "incident") {
    this.statistics.incidents += 1;
    this.statistics.lastIncidentDate = new Date();
    this.statistics.daysWithoutIncident = 0;
  } else if (incidentType === "nearMiss") {
    this.statistics.nearMisses += 1;
  }

  // Recalculate safety score
  const totalEvents = this.statistics.incidents + this.statistics.nearMisses;
  if (totalEvents > 0) {
    const score = Math.max(
      0,
      100 - this.statistics.incidents * 5 - this.statistics.nearMisses * 1,
    );
    this.statistics.safetyScore = Math.min(100, score);
  }

  await this.save();

  // Update parent worksite stats
  const Worksite = mongoose.model("Worksite");
  const worksite = await Worksite.findById(this.worksite);
  if (worksite) {
    await worksite.updatePerformanceStats();
  }
};

module.exports = mongoose.model("WorkArea", workAreaSchema);
