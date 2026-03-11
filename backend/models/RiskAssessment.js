const mongoose = require("mongoose");
const Counter = require("./Counter");

const riskAssessmentSchema = new mongoose.Schema(
  {
    assessmentNumber: { type: Number, unique: true },

    // Core relationship - points to WorkArea
    workArea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkArea",
      required: true,
    },

    // Basic info
    title: { type: String, required: true },
    description: String,
    assessmentDate: { type: Date, default: Date.now },
    reviewDate: Date,

    // Scope of assessment
    scope: {
      type: {
        type: String,
        enum: ["area_wide", "task_specific", "equipment_specific"],
        default: "area_wide",
      },
      workTypes: [String],
      tasks: [String],
      equipment: [String],
      shifts: [
        { type: String, enum: ["morning", "afternoon", "night", "all"] },
      ],
    },

    // Assessment team
    conductedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SafetyOfficer",
      required: true,
    },
    team: [
      {
        member: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: String,
      },
    ],

    // Hazards identified and risk ratings
    hazards: [
      {
        hazardId: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        description: { type: String, required: true },
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

        // Initial risk (before controls)
        initialRisk: {
          likelihood: {
            type: String,
            enum: ["rare", "unlikely", "possible", "likely", "almost_certain"],
          },
          consequence: {
            type: String,
            enum: [
              "insignificant",
              "minor",
              "moderate",
              "major",
              "catastrophic",
            ],
          },
          riskLevel: {
            type: String,
            enum: ["low", "medium", "high", "extreme"],
          },
          riskScore: Number,
          justification: String,
        },

        // Controls implemented
        controls: [
          {
            measure: { type: String, required: true },
            type: {
              type: String,
              enum: [
                "elimination",
                "substitution",
                "engineering",
                "administrative",
                "ppe",
                "training",
              ],
            },
            responsibleParty: String,
            implementationDate: Date,
            effectiveness: {
              type: String,
              enum: [
                "effective",
                "partially_effective",
                "ineffective",
                "pending",
              ],
            },
            verifiedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "SafetyOfficer",
            },
            verifiedAt: Date,
          },
        ],

        // Residual risk (after controls)
        residualRisk: {
          likelihood: {
            type: String,
            enum: ["rare", "unlikely", "possible", "likely", "almost_certain"],
          },
          consequence: {
            type: String,
            enum: [
              "insignificant",
              "minor",
              "moderate",
              "major",
              "catastrophic",
            ],
          },
          riskLevel: {
            type: String,
            enum: ["low", "medium", "high", "extreme"],
          },
          riskScore: Number,
          acceptable: { type: Boolean, default: false },
          justification: String,
        },

        // Who is at risk
        affectedGroups: [
          {
            group: {
              type: String,
              enum: [
                "workers",
                "supervisors",
                "contractors",
                "visitors",
                "public",
              ],
            },
            count: Number,
            details: String,
          },
        ],

        // Status
        status: {
          type: String,
          enum: ["active", "mitigated", "monitoring", "closed"],
          default: "active",
        },
        reviewRequired: { type: Boolean, default: false },
        nextReviewDate: Date,

        // Notes
        additionalNotes: String,
        references: [String],
      },
    ],

    // Risk matrix visualization data
    riskMatrix: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Overall assessment
    overallFindings: String,
    summary: String,
    recommendations: [String],

    // Action plan
    actionPlan: [
      {
        action: { type: String, required: true },
        priority: { type: String, enum: ["high", "medium", "low"] },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        deadline: Date,
        completed: { type: Boolean, default: false },
        completedDate: Date,
        completionNotes: String,
        verificationRequired: { type: Boolean, default: false },
        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SafetyOfficer",
        },
        verifiedAt: Date,
      },
    ],

    // Approvals
    approvalWorkflow: {
      required: { type: Boolean, default: true },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected", "changes_requested"],
        default: "pending",
      },
      approvals: [
        {
          approver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SafetyOfficer",
          },
          approvedAt: Date,
          comments: String,
          signature: String,
        },
      ],
      requestedChanges: String,
    },

    // Related documents
    relatedDocuments: {
      incidents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Incident" }],
      safetyTalks: [
        { type: mongoose.Schema.Types.ObjectId, ref: "SafetyTalk" },
      ],
      permits: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permit" }],
      jsas: [{ type: mongoose.Schema.Types.ObjectId, ref: "JSA" }],
    },

    // Attachments
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SafetyOfficer",
        },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // AI assistance
    aiGenerated: { type: Boolean, default: false },
    aiModel: String,
    aiContextUsed: {
      siteHistory: Boolean,
      pastIncidents: Boolean,
      previousAssessments: Boolean,
      hazardsFromWorkArea: Boolean,
    },
    aiPrompt: String,
    aiResponse: String,

    // Version control
    version: { type: Number, default: 1 },
    supersedes: { type: mongoose.Schema.Types.ObjectId, ref: "RiskAssessment" },
    revisionHistory: [
      {
        version: Number,
        date: Date,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SafetyOfficer",
        },
        changes: String,
      },
    ],

    // Status
    status: {
      type: String,
      enum: ["draft", "under_review", "approved", "active", "archived"],
      default: "draft",
    },

    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyOfficer" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyOfficer" },
  },
  { timestamps: true },
);

// Auto-increment assessment number
riskAssessmentSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "riskassessment" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );
      this.assessmentNumber = counter.seq + 3000;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model("RiskAssessment", riskAssessmentSchema);
