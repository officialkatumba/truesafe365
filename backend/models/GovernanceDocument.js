const mongoose = require("mongoose");

const governanceDocumentSchema = new mongoose.Schema(
  {
    workArea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkArea",
      required: true,
    },

    docType: {
      type: String,
      enum: ["committee_formation", "hs_policy"],
      required: true,
    },

    title: { type: String, required: true },

    // Health and Safety Committee formation (Section 9, OHS Act No. 16 of 2025)
    committee: {
      establishedDate: Date,
      meetingFrequency: { type: String, default: "Monthly" },
      employeeRepresentative: String,
      healthAndSafetyRepresentative: String,
      members: [
        {
          name: String,
          role: String,
          representing: {
            type: String,
            enum: ["employer", "employee"],
            default: "employee",
          },
        },
      ],
    },

    // CEO-signed Health and Safety Policy (Section 14, OHS Act No. 16 of 2025)
    policy: {
      ceoName: String,
      ceoTitle: { type: String, default: "Chief Executive Officer" },
      effectiveDate: Date,
      reviewDate: Date,
    },

    aiGenerated: { type: Boolean, default: true },
    aiModel: { type: String, default: "gpt-4o-mini" },
    generatedContent: {
      introduction: String,
      commitments: [String],
      responsibilities: [String],
      procedures: [String],
      closingStatement: String,
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("GovernanceDocument", governanceDocumentSchema);
