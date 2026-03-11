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

// module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },

  // Primary role (for login/authentication)
  role: {
    type: String,
    enum: ["system_admin", "safety_officer", "supervisor", "worker"],
    required: true,
  },

  // For solo users who are both admin and officer
  isDualRole: { type: Boolean, default: false },
  secondaryRole: {
    type: String,
    enum: ["system_admin", "safety_officer", null],
    default: null,
  },

  // References
  safetyOfficer: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyOfficer" },

  // Track if this is a solo practitioner
  accountType: {
    type: String,
    enum: ["solo", "enterprise_officer", "enterprise_admin"],
    default: "solo",
  },

  // Who created this account (for enterprise)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  hadLoggedIn: { type: Boolean, default: false },

  // Password reset fields
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});

userSchema.plugin(passportLocalMongoose, {
  usernameField: "email",
  errorMessages: {
    UserExistsError: "A user with the given email already exists",
  },
});

// Method to check if user has admin privileges
userSchema.methods.hasAdminPrivileges = function () {
  return this.role === "system_admin" || this.secondaryRole === "system_admin";
};

// Method to get effective roles
userSchema.methods.getEffectiveRoles = function () {
  const roles = [this.role];
  if (this.secondaryRole) roles.push(this.secondaryRole);
  return roles;
};

module.exports = mongoose.model("User", userSchema);
