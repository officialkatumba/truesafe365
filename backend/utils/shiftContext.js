function normalizeShiftName(shift) {
  if (!shift) return null;
  if (typeof shift === "string") return shift;
  return shift.name || null;
}

function addShiftContext(schema, options = {}) {
  const { workAreaField = "workArea", targetWorkAreasField = "targetWorkAreas" } = options;

  schema.add({
    shiftContext: {
      shifts: [
        {
          type: String,
          enum: ["morning", "afternoon", "night", "all", "unknown"],
        },
      ],
      label: String,
      source: {
        type: String,
        enum: ["work_area", "incident", "manual", "unknown"],
        default: "work_area",
      },
    },
  });

  schema.pre("validate", async function fillShiftContext(next) {
    try {
      if (this.shiftContext?.shifts?.length) return next();

      const explicitShift = this.shift || this.targetShift;
      if (explicitShift) {
        this.shiftContext = {
          shifts: [explicitShift],
          label: String(explicitShift).replace(/_/g, " "),
          source: "manual",
        };
        return next();
      }

      const workAreaId = this[workAreaField] || this[targetWorkAreasField]?.[0];
      if (!workAreaId) {
        this.shiftContext = { shifts: ["unknown"], label: "Shift not specified", source: "unknown" };
        return next();
      }

      const WorkArea = this.constructor.db.model("WorkArea");
      const workArea = await WorkArea.findById(workAreaId).select("activeShifts intake.shiftOrWorkingTime");
      const shifts = (workArea?.activeShifts || [])
        .map(normalizeShiftName)
        .filter(Boolean);

      this.shiftContext = {
        shifts: shifts.length ? shifts : ["all"],
        label: workArea?.intake?.shiftOrWorkingTime || (shifts.length ? shifts.join(", ") : "All shifts"),
        source: "work_area",
      };

      return next();
    } catch (error) {
      return next(error);
    }
  });
}

module.exports = { addShiftContext };