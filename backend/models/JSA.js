const mongoose = require("mongoose");
const Counter = require("./Counter");

const jsaSchema = new mongoose.Schema(
  {
    jsaNumber: { type: Number, unique: true },

    workArea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkArea",
      required: true,
    },

    title: { type: String, required: true },
    jobTask: { type: String, required: true },
    location: String,
    date: { type: Date, default: Date.now },
    shift: {
      type: String,
      enum: ["morning", "afternoon", "night", "all"],
      default: "all",
    },

    preparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // FIXED: quantity as String, not Number
    requiredPPE: [
      {
        item: { type: String, required: true },
        quantity: { type: String, default: "As needed" }, // Changed to String
        condition: { type: String, default: "Good" },
      },
    ],

    requiredTraining: [String],
    requiredCertifications: [String],

    toolsAndEquipment: [
      {
        name: String,
        condition: String,
        inspected: { type: Boolean, default: false },
      },
    ],

    humanSections: {
      type: {
        jobSteps: { type: String, default: "" },
        hazardAnalysis: { type: String, default: "" },
        controlMeasures: { type: String, default: "" },
        emergencyProcedures: { type: String, default: "" },
        approvalSection: { type: String, default: "" },
      },
      default: {},
    },

    aiSections: {
      type: {
        jobSteps: {
          content: { type: String, default: "" },
          confirmed: { type: Boolean, default: false },
        },
        hazardAnalysis: {
          content: { type: String, default: "" },
          confirmed: { type: Boolean, default: false },
        },
        controlMeasures: {
          content: { type: String, default: "" },
          confirmed: { type: Boolean, default: false },
        },
        emergencyProcedures: {
          content: { type: String, default: "" },
          confirmed: { type: Boolean, default: false },
        },
        approvalSection: {
          content: { type: String, default: "" },
          confirmed: { type: Boolean, default: false },
        },
      },
      default: {},
    },

    activeVersion: {
      type: {
        jobSteps: { type: String, enum: ["human", "ai"], default: "human" },
        hazardAnalysis: {
          type: String,
          enum: ["human", "ai"],
          default: "human",
        },
        controlMeasures: {
          type: String,
          enum: ["human", "ai"],
          default: "human",
        },
        emergencyProcedures: {
          type: String,
          enum: ["human", "ai"],
          default: "human",
        },
        approvalSection: {
          type: String,
          enum: ["human", "ai"],
          default: "human",
        },
      },
      default: {},
    },

    sectionConfirmed: {
      type: {
        jobSteps: { type: Boolean, default: false },
        hazardAnalysis: { type: Boolean, default: false },
        controlMeasures: { type: Boolean, default: false },
        emergencyProcedures: { type: Boolean, default: false },
        approvalSection: { type: Boolean, default: false },
      },
      default: {},
    },

    consolidatedJSA: {
      content: { type: String, default: "" },
      pdfUrl: { type: String, default: "" },
      pdfUploaded: { type: Boolean, default: false },
      generatedAt: Date,
    },

    overallStatus: {
      allSectionsConfirmed: { type: Boolean, default: false },
      consolidatedGenerated: { type: Boolean, default: false },
    },

    aiGenerated: { type: Boolean, default: false },
    aiModel: String,

    status: {
      type: String,
      enum: [
        "draft",
        "under_review",
        "approved",
        "active",
        "archived",
        "completed",
      ],
      default: "draft",
    },

    validFrom: Date,
    validTo: Date,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

jsaSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "jsa" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );
      this.jsaNumber = counter.seq + 6000;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model("JSA", jsaSchema);
