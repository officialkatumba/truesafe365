const mongoose = require("mongoose");
const Counter = require("./Counter");

const transportChecklistSchema = new mongoose.Schema(
  {
    checklistNumber: { type: Number, unique: true },

    workArea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkArea",
      required: true,
    },

    checklistType: {
      type: String,
      enum: ["pre_trip_fatigue", "pre_start_inspection"],
      required: true,
    },

    driverName: { type: String, required: true },
    vehicleRegistration: String,
    route: String,
    date: { type: Date, default: Date.now },

    items: [
      {
        code: String,
        question: String,
        critical: { type: Boolean, default: false },
        response: {
          type: String,
          enum: ["yes", "no", "na"],
          default: "na",
        },
        notes: String,
      },
    ],

    overallResult: {
      type: String,
      enum: ["pass", "fail"],
      default: "pass",
    },
    failureNotes: String,

    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

transportChecklistSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: "transportchecklist" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );
      this.checklistNumber = counter.seq + 8000;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model("TransportChecklist", transportChecklistSchema);
