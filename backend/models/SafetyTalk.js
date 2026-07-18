const mongoose = require("mongoose");
const { addShiftContext } = require("../utils/shiftContext");
const Counter = require("./Counter");

const safetyTalkSchema = new mongoose.Schema(
  {
    talkNumber: { type: Number, unique: true },

    // Target work areas
    targetWorkAreas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WorkArea",
      },
    ],

    // Talk details
    title: { type: String, required: true },
    content: { type: String, required: true },
    duration: { type: Number, default: 5 }, // minutes
    topics: [String],

    // Structured sections for display
    sections: {
      opening: String,
      mainPoints: [String],
      discussionQuestions: [String],
      supervisorVerification: [String],
      keyTakeaways: [String],
      closing: String,
    },

    // Who created/generated it
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    conductedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    date: { type: Date, default: Date.now },

    // Status
    status: {
      type: String,
      enum: ["draft", "published", "conducted", "archived"],
      default: "draft",
    },

    // Attendance tracking
    attendance: {
      totalAttendees: { type: Number, default: 0 },
      attendees: [
        {
          name: String,
          role: String,
          department: String,
        },
      ],
    },

    // Feedback from workers
    feedback: [
      {
        workerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        anonymous: { type: Boolean, default: false },
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        date: { type: Date, default: Date.now },
      },
    ],

    // Effectiveness tracking
    effectiveness: {
      rating: { type: Number, min: 1, max: 5 },
      comments: String,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reviewedAt: Date,
    },

    review: {
      status: {
        type: String,
        enum: ["pending", "confirmed", "changes_required"],
        default: "pending",
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reviewedAt: Date,
      comments: String,
      history: [
        {
          comments: { type: String, required: true },
          submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          submittedAt: { type: Date, default: Date.now },
          generatedVersion: Number,
        },
      ],
    },

    // AI revision tracking
    version: { type: Number, default: 1 },
    previousVersions: [
      {
        version: Number,
        title: String,
        content: String,
        sections: mongoose.Schema.Types.Mixed,
        officerComments: String,
        generatedAt: Date,
      },
    ],

    // AI generation metadata
    aiGenerated: { type: Boolean, default: true },
    aiModel: String,
    generationDate: { type: Date, default: Date.now },
    basedOn: {
      recentIncidents: [
        { type: mongoose.Schema.Types.ObjectId, ref: "Incident" },
      ],
      identifiedHazards: [{ type: mongoose.Schema.Types.ObjectId }],
      riskAssessments: [
        { type: mongoose.Schema.Types.ObjectId, ref: "RiskAssessment" },
      ],
      previousTalks: [
        { type: mongoose.Schema.Types.ObjectId, ref: "SafetyTalk" },
      ],
      aiPrompt: String,
      aiReasoning: String,
    },

    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Auto-increment talk number
safetyTalkSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "safetytalk" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );
      this.talkNumber = counter.seq + 5000;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

addShiftContext(safetyTalkSchema, { workAreaField: "workArea", targetWorkAreasField: "targetWorkAreas" });

module.exports = mongoose.model("SafetyTalk", safetyTalkSchema);
