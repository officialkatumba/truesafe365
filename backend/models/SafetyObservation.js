const mongoose = require("mongoose");

const safetyObservationSchema = new mongoose.Schema(
  {
    // Work area where observation was made
    workArea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkArea",
      required: true,
    },

    // Type of observation
    type: {
      type: String,
      enum: ["positive", "at_risk", "condition"],
      required: true,
    },

    // Observation details
    description: {
      type: String,
      required: true,
    },

    // Recommendations for improvement
    recommendations: {
      type: String,
      default: "",
    },

    // Who made the observation
    observedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Status of the observation
    status: {
      type: String,
      enum: ["open", "in_review", "closed"],
      default: "open",
    },

    // Corrective actions taken
    correctiveActions: {
      type: String,
      default: "",
    },

    // Date of observation
    date: {
      type: Date,
      default: Date.now,
    },

    // Images/attachments
    attachments: [
      {
        url: String,
        filename: String,
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("SafetyObservation", safetyObservationSchema);
