// const mongoose = require("mongoose");
// const Counter = require("./Counter");

// const worksiteSchema = new mongoose.Schema(
//   {
//     worksiteNumber: { type: Number, unique: true },
//     name: { type: String, required: true },
//     location: { type: String, required: true },
//     siteType: {
//       type: String,
//       enum: [
//         "construction",
//         "mining",
//         "manufacturing",
//         "oil_gas",
//         "warehouse",
//         "office",
//         "other",
//       ],
//       required: true,
//     },
//     description: String,
//     clientName: String,
//     clientContact: String,

//     // Company-wide performance tracking
//     performance: {
//       overallSafetyScore: { type: Number, default: 100, min: 0, max: 100 },
//       totalIncidents: { type: Number, default: 0 },
//       totalNearMisses: { type: Number, default: 0 },
//       daysWithoutIncident: { type: Number, default: 0 },
//       lastIncidentDate: Date,
//       inspectionsConducted: { type: Number, default: 0 },
//       safetyTalksConducted: { type: Number, default: 0 },
//     },

//     // Site-wide shifts (reference only)
//     shifts: [
//       {
//         name: {
//           type: String,
//           enum: ["morning", "afternoon", "night", "rotating"],
//         },
//         startTime: String,
//         endTime: String,
//         description: String,
//       },
//     ],

//     // Supervisory: Assign safety officers to this worksite
//     assignedSafetyOfficers: [
//       {
//         officer: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "SafetyOfficer",
//           required: true,
//         },
//         role: { type: String, enum: ["lead", "assistant", "trainee"] },
//         assignedDate: { type: Date, default: Date.now },
//         endDate: Date,
//         isActive: { type: Boolean, default: true },
//         notes: String,
//       },
//     ],

//     // Supervisory: Approval queue for documents
//     pendingApprovals: [
//       {
//         documentType: {
//           type: String,
//           enum: [
//             "risk_assessment",
//             "incident_report",
//             "permit",
//             "safety_talk",
//             "jsa",
//             "ppe_checklist",
//           ],
//         },
//         documentId: {
//           type: mongoose.Schema.Types.ObjectId,
//           refPath: "pendingApprovals.documentModel",
//         },
//         documentModel: {
//           type: String,
//           enum: [
//             "RiskAssessment",
//             "Incident",
//             "Permit",
//             "SafetyTalk",
//             "JSA",
//             "PPEChecklist",
//           ],
//         },
//         submittedBy: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "SafetyOfficer",
//         },
//         submittedAt: { type: Date, default: Date.now },
//         urgency: {
//           type: String,
//           enum: ["routine", "urgent", "critical"],
//           default: "routine",
//         },
//         comments: String,
//         status: {
//           type: String,
//           enum: ["pending", "approved", "rejected"],
//           default: "pending",
//         },
//       },
//     ],

//     // Supervisory: Approved documents log
//     approvedDocuments: [
//       {
//         documentType: String,
//         documentId: { type: mongoose.Schema.Types.ObjectId },
//         documentNumber: String,
//         title: String,
//         approvedBy: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "SafetyOfficer",
//         },
//         approvedAt: Date,
//         version: Number,
//       },
//     ],

//     // Company-wide compliance checks
//     complianceStatus: [
//       {
//         regulation: String,
//         authority: String,
//         status: {
//           type: String,
//           enum: ["compliant", "non_compliant", "pending_audit", "exempt"],
//         },
//         lastChecked: Date,
//         nextCheckDue: Date,
//         checkedBy: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "SafetyOfficer",
//         },
//         findings: String,
//         correctiveActions: String,
//       },
//     ],

//     // Site-wide context for AI (supervisory level)
//     siteContext: {
//       overview: String,
//       knownChallenges: [String],
//       strategicPriorities: [String],
//       managementContacts: [
//         {
//           name: String,
//           role: String,
//           contact: String,
//         },
//       ],
//     },

//     // Work areas under this worksite
//     workAreas: [{ type: mongoose.Schema.Types.ObjectId, ref: "WorkArea" }],

//     status: {
//       type: String,
//       enum: ["active", "inactive", "under_review", "completed"],
//       default: "active",
//     },

//     // Metadata
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyOfficer" },
//     updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyOfficer" },
//   },
//   { timestamps: true },
// );

// // Auto-increment worksite number
// worksiteSchema.pre("save", async function (next) {
//   if (this.isNew) {
//     try {
//       const counter = await Counter.findByIdAndUpdate(
//         { _id: "worksite" },
//         { $inc: { seq: 1 } },
//         { new: true, upsert: true },
//       );
//       this.worksiteNumber = counter.seq + 1000;
//     } catch (err) {
//       return next(err);
//     }
//   }
//   next();
// });

// // Method to update overall performance stats
// worksiteSchema.methods.updatePerformanceStats = async function () {
//   const WorkArea = mongoose.model("WorkArea");
//   const workAreas = await WorkArea.find({ worksite: this._id });

//   let totalIncidents = 0;
//   let totalNearMisses = 0;
//   let totalSafetyScore = 0;

//   workAreas.forEach((area) => {
//     totalIncidents += area.statistics?.incidents || 0;
//     totalNearMisses += area.statistics?.nearMisses || 0;
//     totalSafetyScore += area.statistics?.safetyScore || 100;
//   });

//   this.performance.totalIncidents = totalIncidents;
//   this.performance.totalNearMisses = totalNearMisses;
//   this.performance.overallSafetyScore =
//     workAreas.length > 0
//       ? Math.round(totalSafetyScore / workAreas.length)
//       : 100;

//   await this.save();
// };

// module.exports = mongoose.model("Worksite", worksiteSchema);

// // models/Worksite.js
// const mongoose = require("mongoose");

// const worksiteSchema = new mongoose.Schema(
//   {
//     // ==================== BASIC INFORMATION ====================
//     name: { type: String, required: true },
//     location: { type: String, required: true },
//     siteType: {
//       type: String,
//       enum: [
//         "construction",
//         "mining",
//         "manufacturing",
//         "oil_gas",
//         "warehouse",
//         "office",
//         "agriculture",
//         "other",
//       ],
//       required: true,
//     },
//     description: String,

//     // ==================== CLIENT INFORMATION ====================
//     clientName: String,
//     clientContact: String,
//     clientEmail: String,

//     // ==================== PROJECT DETAILS ====================
//     projectDuration: {
//       startDate: Date,
//       expectedEndDate: Date,
//       estimatedDurationMonths: Number,
//     },

//     // ==================== WORKFORCE DETAILS ====================
//     workforce: {
//       estimatedTotalWorkers: { type: Number, default: 0 },
//       estimatedPeakWorkers: { type: Number, default: 0 },
//       breakdown: {
//         skilled: Number,
//         semiSkilled: Number,
//         unskilled: Number,
//         contractors: Number,
//       },
//       shifts: [
//         {
//           name: { type: String, enum: ["morning", "afternoon", "night"] },
//           startTime: String,
//           endTime: String,
//           workerCount: Number,
//         },
//       ],
//     },

//     // ==================== SITE CHARACTERISTICS ====================
//     siteCharacteristics: {
//       totalArea: { type: Number, unit: { type: String, default: "hectares" } }, // in hectares
//       elevation: String,
//       terrain: {
//         type: String,
//         enum: [
//           "flat",
//           "gentle_slope",
//           "steep_slope",
//           "mountainous",
//           "undulating",
//         ],
//         default: "flat",
//       },
//       soilType: {
//         type: String,
//         enum: ["clay", "sandy", "loamy", "rocky", "mixed", "unknown"],
//         default: "unknown",
//       },
//       vegetation: {
//         type: String,
//         enum: ["cleared", "sparse", "moderate", "dense", "forest", "grassland"],
//         default: "cleared",
//       },
//       proximityToWater: {
//         type: String,
//         enum: [
//           "on_site",
//           "within_100m",
//           "within_500m",
//           "within_1km",
//           "beyond_1km",
//           "none",
//         ],
//         default: "none",
//       },
//       waterBodyType: {
//         type: String,
//         enum: [
//           "river",
//           "stream",
//           "lake",
//           "dam",
//           "wetland",
//           "groundwater",
//           "not_applicable",
//         ],
//         default: "not_applicable",
//       },
//       protectedAreaProximity: {
//         isInProtectedArea: { type: Boolean, default: false },
//         protectedAreaType: {
//           type: String,
//           enum: [
//             "national_park",
//             "game_management_area",
//             "forest_reserve",
//             "wetland",
//             "heritage_site",
//             "none",
//           ],
//           default: "none",
//         },
//         distanceFromProtectedArea: String,
//       },
//     },

//     // ==================== ACTIVITIES & OPERATIONS ====================
//     activities: {
//       primaryActivities: [
//         {
//           activity: String,
//           description: String,
//           duration: String,
//           equipmentUsed: [String],
//         },
//       ],

//       workAtHeights: {
//         isPresent: { type: Boolean, default: false },
//         maxHeight: Number, // in meters
//         activities: [String],
//         fallProtectionType: [String],
//       },

//       confinedSpaces: {
//         isPresent: { type: Boolean, default: false },
//         spaces: [
//           {
//             type: String,
//             location: String,
//             entryPoints: Number,
//             hazards: [String],
//           },
//         ],
//       },

//       heavyEquipment: {
//         isPresent: { type: Boolean, default: false },
//         equipment: [
//           {
//             type: String,
//             quantity: Number,
//             operators: Number,
//             certificationRequired: Boolean,
//           },
//         ],
//       },

//       hazardousSubstances: {
//         isPresent: { type: Boolean, default: false },
//         substances: [
//           {
//             name: String,
//             quantity: String,
//             storageLocation: String,
//             safetyDataSheetAvailable: Boolean,
//             ppeRequired: [String],
//           },
//         ],
//       },

//       excavation: {
//         isPresent: { type: Boolean, default: false },
//         maxDepth: Number,
//         shoringRequired: Boolean,
//         soilType: String,
//         utilitiesNearby: [String],
//       },

//       electricalWork: {
//         isPresent: { type: Boolean, default: false },
//         voltageLevels: [String],
//         liveWork: Boolean,
//         lockoutTagoutRequired: Boolean,
//       },

//       hotWork: {
//         isPresent: { type: Boolean, default: false },
//         types: [String],
//         fireWatchRequired: Boolean,
//         permitRequired: Boolean,
//       },

//       demolition: {
//         isPresent: { type: Boolean, default: false },
//         structureType: String,
//         method: String,
//         explosivesUsed: Boolean,
//       },
//     },

//     // ==================== ENVIRONMENTAL CONSIDERATIONS ====================
//     environmentalConsiderations: {
//       wasteManagement: {
//         hasPlan: { type: Boolean, default: false },
//         wasteTypes: [String],
//         disposalMethod: String,
//         recyclingProgram: Boolean,
//       },

//       airQuality: {
//         hasDust: { type: Boolean, default: false },
//         hasEmissions: { type: Boolean, default: false },
//         monitoringRequired: Boolean,
//         controlMeasures: [String],
//       },

//       noiseControl: {
//         highNoiseActivities: [String],
//         noiseMonitoringRequired: Boolean,
//         hearingProtectionRequired: Boolean,
//         controlMeasures: [String],
//       },

//       waterUsage: {
//         source: String,
//         estimatedUsage: Number,
//         treatmentRequired: Boolean,
//         dischargePoint: String,
//         dischargeTreatment: String,
//       },

//       biodiversity: {
//         sensitiveSpeciesNearby: { type: Boolean, default: false },
//         speciesList: [String],
//         mitigationMeasures: [String],
//       },
//     },

//     // ==================== HEALTH & SAFETY RESOURCES ====================
//     safetyResources: {
//       hasSafetyOfficer: { type: Boolean, default: false },
//       safetyOfficerCount: Number,
//       hasSafetyCommittee: { type: Boolean, default: false },
//       committeeMembers: Number,

//       firstAid: {
//         hasFirstAidRoom: { type: Boolean, default: false },
//         firstAidBoxes: Number,
//         trainedFirstAiders: Number,
//       },

//       fireSafety: {
//         fireExtinguishers: Number,
//         fireHoses: Number,
//         fireAlarms: Boolean,
//         sprinklerSystem: Boolean,
//         evacuationPlan: Boolean,
//         assemblyPoint: Boolean,
//       },

//       medicalFacilities: {
//         onSiteClinic: { type: Boolean, default: false },
//         nearestHospital: String,
//         emergencyTransport: String,
//         emergencyContact: String,
//       },
//     },

//     // ==================== COMPLIANCE STATUS (WILL BE POPULATED BY AI LATER) ====================
//     complianceStatus: {
//       overallScore: { type: Number, default: 0, min: 0, max: 100 },
//       sections: [
//         {
//           act: String,
//           sectionNumber: String,
//           title: String,
//           status: {
//             type: String,
//             enum: ["not_started", "in_progress", "completed", "not_applicable"],
//             default: "not_started",
//           },
//           progress: { type: Number, default: 0, min: 0, max: 100 },
//           completedAt: Date,
//           notes: String,
//         },
//       ],
//     },

//     // ==================== ASSIGNMENTS ====================
//     assignedSafetyOfficers: [
//       {
//         officer: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyOfficer" },
//         role: { type: String, enum: ["lead", "assistant", "trainee"] },
//         assignedDate: { type: Date, default: Date.now },
//         isActive: { type: Boolean, default: true },
//       },
//     ],

//     workAreas: [{ type: mongoose.Schema.Types.ObjectId, ref: "WorkArea" }],

//     ownership: {
//       type: {
//         type: String,
//         enum: ["individual", "enterprise"],
//         default: "enterprise",
//       },
//       owner: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyOfficer" },
//       createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     },

//     status: {
//       type: String,
//       enum: ["draft", "active", "on_hold", "completed", "archived"],
//       default: "draft",
//     },

//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//   },
//   { timestamps: true },
// );

// module.exports = mongoose.model("Worksite", worksiteSchema);

// models/Worksite.js
const mongoose = require("mongoose");

const worksiteSchema = new mongoose.Schema(
  {
    // ==================== BASIC INFORMATION ====================
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
        "agriculture",
        "other",
      ],
      required: true,
    },
    description: String,

    // ==================== CLIENT INFORMATION ====================
    clientName: String,
    clientContact: String,
    clientEmail: String,

    // ==================== PROJECT DETAILS ====================
    projectDuration: {
      startDate: Date,
      expectedEndDate: Date,
      estimatedDurationMonths: Number,
    },

    // ==================== WORKFORCE DETAILS ====================
    workforce: {
      estimatedTotalWorkers: { type: Number, default: 0 },
      estimatedPeakWorkers: { type: Number, default: 0 },
      breakdown: {
        skilled: Number,
        semiSkilled: Number,
        unskilled: Number,
        contractors: Number,
      },
      shifts: [
        {
          name: { type: String, enum: ["morning", "afternoon", "night"] },
          startTime: String,
          endTime: String,
          workerCount: Number,
        },
      ],
    },

    // ==================== SITE CHARACTERISTICS ====================
    siteCharacteristics: {
      totalArea: Number,
      terrain: {
        type: String,
        enum: [
          "flat",
          "gentle_slope",
          "steep_slope",
          "mountainous",
          "undulating",
        ],
        default: "flat",
      },
      soilType: {
        type: String,
        enum: ["clay", "sandy", "loamy", "rocky", "mixed", "unknown"],
        default: "unknown",
      },
      proximityToWater: {
        type: String,
        enum: [
          "on_site",
          "within_100m",
          "within_500m",
          "within_1km",
          "beyond_1km",
          "none",
        ],
        default: "none",
      },
      waterBodyType: {
        type: String,
        enum: [
          "river",
          "stream",
          "lake",
          "dam",
          "wetland",
          "groundwater",
          "not_applicable",
        ],
        default: "not_applicable",
      },
      protectedAreaProximity: {
        isInProtectedArea: { type: Boolean, default: false },
        protectedAreaType: {
          type: String,
          enum: [
            "national_park",
            "game_management_area",
            "forest_reserve",
            "wetland",
            "heritage_site",
            "none",
          ],
          default: "none",
        },
      },
    },

    // ==================== ACTIVITIES & OPERATIONS ====================
    activities: {
      primaryActivities: [
        {
          activity: String,
          description: String,
          equipmentUsed: [String],
        },
      ],

      workAtHeights: {
        isPresent: { type: Boolean, default: false },
        maxHeight: Number,
        activities: [String],
        fallProtectionType: [String],
      },

      confinedSpaces: {
        isPresent: { type: Boolean, default: false },
        spaces: [
          {
            type: String,
            location: String,
            entryPoints: Number,
            hazards: [String],
          },
        ],
      },

      heavyEquipment: {
        isPresent: { type: Boolean, default: false },
        equipment: [
          {
            type: String,
            quantity: Number,
            operators: Number,
            certificationRequired: Boolean,
          },
        ],
      },

      hazardousSubstances: {
        isPresent: { type: Boolean, default: false },
        substances: [
          {
            name: String,
            quantity: String,
            storageLocation: String,
            safetyDataSheetAvailable: Boolean,
            ppeRequired: [String],
          },
        ],
      },

      excavation: {
        isPresent: { type: Boolean, default: false },
        maxDepth: Number,
        shoringRequired: Boolean,
        soilType: String,
        utilitiesNearby: [String],
      },

      electricalWork: {
        isPresent: { type: Boolean, default: false },
        voltageLevels: [String],
        liveWork: Boolean,
        lockoutTagoutRequired: Boolean,
      },

      hotWork: {
        isPresent: { type: Boolean, default: false },
        types: [String],
        fireWatchRequired: Boolean,
        permitRequired: Boolean,
      },

      demolition: {
        isPresent: { type: Boolean, default: false },
        structureType: String,
        method: String,
        explosivesUsed: Boolean,
      },
    },

    // ==================== ENVIRONMENTAL CONSIDERATIONS ====================
    environmentalConsiderations: {
      wasteManagement: {
        hasPlan: { type: Boolean, default: false },
        wasteTypes: [String],
        disposalMethod: String,
        recyclingProgram: Boolean,
      },

      airQuality: {
        hasDust: { type: Boolean, default: false },
        hasEmissions: { type: Boolean, default: false },
        monitoringRequired: Boolean,
        controlMeasures: [String],
      },

      noiseControl: {
        highNoiseActivities: [String],
        noiseMonitoringRequired: Boolean,
        hearingProtectionRequired: Boolean,
        controlMeasures: [String],
      },

      waterUsage: {
        source: String,
        estimatedUsage: Number,
        treatmentRequired: Boolean,
        dischargePoint: String,
        dischargeTreatment: String,
      },

      biodiversity: {
        sensitiveSpeciesNearby: { type: Boolean, default: false },
        speciesList: [String],
        mitigationMeasures: [String],
      },
    },

    // ==================== HEALTH & SAFETY RESOURCES ====================
    safetyResources: {
      hasSafetyOfficer: { type: Boolean, default: false },
      safetyOfficerCount: Number,
      hasSafetyCommittee: { type: Boolean, default: false },
      committeeMembers: Number,

      firstAid: {
        hasFirstAidRoom: { type: Boolean, default: false },
        firstAidBoxes: Number,
        trainedFirstAiders: Number,
      },

      fireSafety: {
        fireExtinguishers: Number,
        fireHoses: Number,
        fireAlarms: Boolean,
        sprinklerSystem: Boolean,
        evacuationPlan: Boolean,
        assemblyPoint: Boolean,
      },

      medicalFacilities: {
        onSiteClinic: { type: Boolean, default: false },
        nearestHospital: String,
        emergencyTransport: String,
        emergencyContact: String,
      },
    },

    // ==================== COMPLIANCE STATUS ====================
    complianceStatus: {
      overallScore: { type: Number, default: 0, min: 0, max: 100 },
      sections: [
        {
          act: String,
          sectionNumber: String,
          title: String,
          status: {
            type: String,
            enum: ["not_started", "in_progress", "completed", "not_applicable"],
            default: "not_started",
          },
          progress: { type: Number, default: 0, min: 0, max: 100 },
          completedAt: Date,
          notes: String,
        },
      ],
    },

    // ==================== ASSIGNMENTS ====================
    assignedSafetyOfficers: [
      {
        officer: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyOfficer" },
        role: { type: String, enum: ["lead", "assistant", "trainee"] },
        assignedDate: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
      },
    ],

    workAreas: [{ type: mongoose.Schema.Types.ObjectId, ref: "WorkArea" }],

    ownership: {
      type: {
        type: String,
        enum: ["individual", "enterprise"],
        default: "enterprise",
      },
      owner: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyOfficer" },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    status: {
      type: String,
      enum: ["draft", "active", "on_hold", "completed", "archived"],
      default: "draft",
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Worksite", worksiteSchema);
