const mongoose = require("mongoose");
const { addShiftContext } = require("../utils/shiftContext");
const Counter = require("./Counter");
const { addAiReviewFields } = require("../utils/aiReviewSchema");

const ppeChecklistSchema = new mongoose.Schema(
  {
    checklistNumber: {
      type: Number,
      unique: true,
    },

    workArea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkArea",
      required: true,
    },

    // Checklist details
    title: {
      type: String,
      required: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    // AI-generated PPE items
    ppeItems: [
      {
        item: {
          type: String,
          required: true,
        },

        customItem: {
          type: String,
          default: "",
        },

        required: {
          type: Boolean,
          default: true,
        },

        condition: {
          type: String,
          default: "Good",
        },

        quantity: {
          type: String,
          default: "As needed",
        },

        reason: {
          type: String,
          default: "",
        },
      },
    ],

    // AI-generated inspection checklist
    inspectionItems: [
      {
        item: {
          type: String,
          required: true,
        },

        passCriteria: {
          type: String,
          required: true,
        },
      },
    ],

    // Status
    status: {
      type: String,
      enum: ["draft", "active", "completed", "archived"],
      default: "active",
    },

    // Who generated/prepared the checklist
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Completion details
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    completedAt: {
      type: Date,
    },

    // Optional AI metadata
    aiGenerated: {
      type: Boolean,
      default: true,
    },

    aiModel: {
      type: String,
      default: "",
    },

    generationPrompt: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

addShiftContext(ppeChecklistSchema, {});
addAiReviewFields(ppeChecklistSchema);

// Auto-increment checklist number
ppeChecklistSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "ppechecklist" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );

      this.checklistNumber = counter.seq + 6000;
    } catch (err) {
      return next(err);
    }
  }

  next();
});

module.exports = mongoose.model("PPEChecklist", ppeChecklistSchema);
