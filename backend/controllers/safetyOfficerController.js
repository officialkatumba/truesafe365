// const passport = require("passport");
// const SafetyOfficer = require("../models/SafetyOfficer");
// const User = require("../models/User");
// const Counter = require("../models/Counter");

// // GET: Show safety officer registration form
// exports.showRegisterSafetyOfficerForm = (req, res) => {
//   res.render("safety-officer/register");
// };

// // POST: Handle safety officer registration
// exports.registerSafetyOfficer = async (req, res) => {
//   try {
//     const { name, email, password, phone, bio } = req.body;

//     // Basic validation
//     if (!name || !email || !password || !phone) {
//       req.flash("error", "All required fields must be filled");
//       return res.redirect("/safety-officers/register");
//     }

//     // Check if the user already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       req.flash("error", "Email already registered");
//       return res.redirect("/safety-officers/register");
//     }

//     // Create User first
//     const user = await new Promise((resolve, reject) => {
//       User.register(
//         new User({
//           email,
//           role: "safety_officer",
//         }),
//         password,
//         (err, user) => {
//           if (err) return reject(err);
//           resolve(user);
//         },
//       );
//     });

//     // Create Safety Officer
//     const newSafetyOfficer = new SafetyOfficer({
//       name,
//       email,
//       phone,
//       bio: bio || "",
//       user: user._id,
//     });

//     await newSafetyOfficer.save();

//     // Link User to SafetyOfficer
//     user.safetyOfficer = newSafetyOfficer._id;
//     await user.save();

//     req.flash("success", "Registration successful! Please log in.");
//     return res.redirect("/api/users/login");
//   } catch (error) {
//     console.error("Registration Error:", error);
//     req.flash("error", "Registration failed. Please try again.");
//     return res.redirect("/safety-officers/register");
//   }
// };

const passport = require("passport");
const SafetyOfficer = require("../models/SafetyOfficer");
const User = require("../models/User");
const Counter = require("../models/Counter");

// GET: Show safety officer registration form
// Note: This will now ONLY be used for the old flow or as fallback
// You might want to redirect this to the new registration options
exports.showRegisterSafetyOfficerForm = (req, res) => {
  // Optional: Redirect to new registration options
  // res.redirect("/register/options");

  // Or keep for backward compatibility
  res.render("safety-officer/register");
};

// POST: Handle safety officer registration
// This now handles ONLY enterprise officers created by admin?
// Or you can keep it for simple individual officers
exports.registerSafetyOfficer = async (req, res) => {
  try {
    const { name, email, password, phone, bio } = req.body;

    // Basic validation
    if (!name || !email || !password || !phone) {
      req.flash("error", "All required fields must be filled");
      return res.redirect("/safety-officers/register");
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash("error", "Email already registered");
      return res.redirect("/safety-officers/register");
    }

    // Create User first
    const user = await new Promise((resolve, reject) => {
      User.register(
        new User({
          email,
          role: "safety_officer",
          accountType: "individual", // Mark as individual
        }),
        password,
        (err, user) => {
          if (err) return reject(err);
          resolve(user);
        },
      );
    });

    // Create Safety Officer
    const newSafetyOfficer = new SafetyOfficer({
      name,
      email,
      phone,
      bio: bio || "",
      user: user._id,
      accountType: "individual",
    });

    await newSafetyOfficer.save();

    // Link User to SafetyOfficer
    user.safetyOfficer = newSafetyOfficer._id;
    await user.save();

    req.flash("success", "Registration successful! Please log in.");
    return res.redirect("/api/users/login");
  } catch (error) {
    console.error("Registration Error:", error);
    req.flash("error", "Registration failed. Please try again.");
    return res.redirect("/safety-officers/register");
  }
};

// All other safety officer functions remain exactly as they are
// GET: Show edit profile form
exports.showEditSafetyOfficerForm = async (req, res) => {
  // ... existing code
};

// POST: Update safety officer profile
exports.updateSafetyOfficer = async (req, res) => {
  // ... existing code
};

// ... rest of your existing functions
