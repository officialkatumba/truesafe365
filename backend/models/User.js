// const mongoose = require("mongoose");
// const passportLocalMongoose = require("passport-local-mongoose");

// const userSchema = new mongoose.Schema({
//   email: { type: String, unique: true, required: true },
//   role: {
//     type: String,
//     enum: ["system_admin", "safety_officer", "supervisor", "worker"],
//     required: true,
//   },
//   safetyOfficer: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyOfficer" },
//   hadLoggedIn: { type: Boolean, default: false },

//   // 🔐 Forgot/reset password fields
//   resetPasswordToken: String,
//   resetPasswordExpires: Date,
// });

// // 🔑 Passport-Local Mongoose plugin
// userSchema.plugin(passportLocalMongoose, {
//   usernameField: "email",
//   errorMessages: {
//     UserExistsError: "A user with the given email already exists",
//   },
// });

// // module.exports = mongoose.model("User", userSchema);

// const mongoose = require("mongoose");
// const passportLocalMongoose = require("passport-local-mongoose");

// const userSchema = new mongoose.Schema({
//   email: { type: String, unique: true, required: true },

//   // Primary role (for login/authentication)
//   role: {
//     type: String,
//     enum: ["system_admin", "safety_officer", "supervisor", "worker"],
//     required: true,
//   },

//   // References
//   safetyOfficer: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyOfficer" },

//   // Track if this is a solo practitioner
//   accountType: {
//     type: String,
//     enum: ["enterprise_officer", "enterprise_admin"],
//     default: "enterprise_admin",
//   },
//   safetyOfficer: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "SafetyOfficer",
//     sparse: true,
//   },

//   // Who created this account (for enterprise)
//   createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

//   hadLoggedIn: { type: Boolean, default: false },

//   // Password reset fields
//   resetPasswordToken: String,
//   resetPasswordExpires: Date,
// });

// userSchema.plugin(passportLocalMongoose, {
//   usernameField: "email",
//   errorMessages: {
//     UserExistsError: "A user with the given email already exists",
//   },
// });

// // Method to check if user has admin privileges
// userSchema.methods.hasAdminPrivileges = function () {
//   return this.role === "system_admin" || this.secondaryRole === "system_admin";
// };

// // Method to get effective roles
// userSchema.methods.getEffectiveRoles = function () {
//   const roles = [this.role];
//   if (this.secondaryRole) roles.push(this.secondaryRole);
//   return roles;
// };

// module.exports = mongoose.model("User", userSchema);

// const mongoose = require("mongoose");
// const passportLocalMongoose = require("passport-local-mongoose");

// const userSchema = new mongoose.Schema(
//   {
//     email: {
//       type: String,
//       unique: true,
//       required: true,
//     },

//     name: {
//       type: String,
//       required: true,
//     },

//     // Role determines what the user can do
//     role: {
//       type: String,
//       enum: ["system_admin", "safety_officer", "supervisor", "worker"],
//       required: true,
//       default: "worker",
//     },

//     // Reference to SafetyOfficer profile (only for safety_officer role)
//     safetyOfficer: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "SafetyOfficer",
//       sparse: true,
//     },

//     // Who created this account (for enterprise)
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },

//     // Account status
//     isActive: {
//       type: Boolean,
//       default: true,
//     },

//     hadLoggedIn: {
//       type: Boolean,
//       default: false,
//     },

//     // Password reset fields
//     resetPasswordToken: String,
//     resetPasswordExpires: Date,
//   },
//   {
//     timestamps: true,
//   },
// );

// // Passport-Local Mongoose plugin
// userSchema.plugin(passportLocalMongoose, {
//   usernameField: "email",
//   errorMessages: {
//     UserExistsError: "A user with the given email already exists",
//   },
// });

// // Method to check if user is admin
// userSchema.methods.isAdmin = function () {
//   return this.role === "system_admin";
// };

// // Method to check if user is safety officer
// userSchema.methods.isSafetyOfficer = function () {
//   return this.role === "safety_officer";
// };

// module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    // Role determines what the user can do
    role: {
      type: String,
      enum: ["system_admin", "safety_officer", "supervisor", "worker"],
      required: true,
      default: "worker",
    },

    // Company Information (for enterprise admin)
    companyName: {
      type: String,
      default: null,
    },
    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "500+"],
      default: null,
    },
    companyRegistrationNumber: {
      type: String,
      default: null,
    },
    companyAddress: {
      type: String,
      default: null,
    },
    companyPhone: {
      type: String,
      default: null,
    },

    // Company PIN system
    companyPin: {
      type: String,
      sparse: true,
      default: null,
    },
    companyPinExpiresAt: {
      type: Date,
      default: null,
    },
    companyPinUsedBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        usedAt: { type: Date, default: Date.now },
      },
    ],
    maxPinUses: {
      type: Number,
      default: 1, // Can be changed for multiple uses
    },

    // Company membership
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
      default: null,
    },

    // Reference to SafetyOfficer profile (only for safety_officer role)
    safetyOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SafetyOfficer",
      sparse: true,
    },

    // Add these to your userSchema if not already there
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    mustChangePassword: {
      type: Boolean,
      default: true,
    },

    // Who created this account (for enterprise)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },

    hadLoggedIn: {
      type: Boolean,
      default: false,
    },

    // Password reset fields
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
  },
);

// Passport-Local Mongoose plugin
userSchema.plugin(passportLocalMongoose, {
  usernameField: "email",
  errorMessages: {
    UserExistsError: "A user with the given email already exists",
  },
});

// Method to check if user is admin
userSchema.methods.isAdmin = function () {
  return this.role === "system_admin";
};

// Method to check if user is safety officer
userSchema.methods.isSafetyOfficer = function () {
  return this.role === "safety_officer";
};

module.exports = mongoose.model("User", userSchema);
