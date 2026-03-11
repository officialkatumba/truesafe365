const SafetyOfficer = require("../models/SafetyOfficer");
const User = require("../models/User");
const Worksite = require("../models/Worksite");
const crypto = require("crypto");

// Show registration options page
exports.showRegistrationOptions = (req, res) => {
  res.render("registration/options");
};

// Show solo registration form
exports.showSoloRegistrationForm = (req, res) => {
  res.render("registration/solo");
};

// Handle solo registration (Admin + Safety Officer in one)
exports.registerSolo = async (req, res) => {
  try {
    const { name, email, password, phone, companyName, bio } = req.body;

    // Basic validation
    if (!name || !email || !password || !phone) {
      req.flash("error", "All required fields must be filled");
      return res.redirect("/register/solo");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash("error", "Email already registered");
      return res.redirect("/register/solo");
    }

    // Step 1: Create Safety Officer profile
    const newSafetyOfficer = new SafetyOfficer({
      name,
      email,
      phone,
      bio: bio || `Solo practitioner at ${companyName || "Independent"}`,
      verificationStatus: "verified", // Auto-verify solo users
      accountType: "solo",
    });

    await newSafetyOfficer.save();

    // Step 2: Create User with dual roles
    const user = await new Promise((resolve, reject) => {
      User.register(
        new User({
          email,
          role: "system_admin", // Primary role is admin
          secondaryRole: "safety_officer",
          isDualRole: true,
          accountType: "solo",
          safetyOfficer: newSafetyOfficer._id,
        }),
        password,
        (err, user) => {
          if (err) reject(err);
          resolve(user);
        },
      );
    });

    // Step 3: Link back
    newSafetyOfficer.user = user._id;
    await newSafetyOfficer.save();

    // Step 4: Create default worksite for solo user
    const defaultWorksite = new Worksite({
      name: companyName
        ? `${companyName} - Main Site`
        : `${name}'s First Worksite`,
      location: "To be specified",
      siteType: "other",
      description: "My default worksite",
      ownership: {
        type: "individual",
        owner: newSafetyOfficer._id,
        createdBy: user._id,
      },
      assignedSafetyOfficers: [
        {
          officer: newSafetyOfficer._id,
          role: "lead",
          isPrimary: true,
          assignedDate: new Date(),
        },
      ],
      createdBy: user._id,
      status: "active",
    });

    await defaultWorksite.save();

    // Add worksite to officer
    newSafetyOfficer.worksites.push(defaultWorksite._id);
    await newSafetyOfficer.save();

    req.flash(
      "success",
      "Solo account created! You are both Admin and Safety Officer.",
    );
    return res.redirect("/api/users/login");
  } catch (error) {
    console.error("Solo registration error:", error);
    req.flash("error", "Registration failed. Please try again.");
    return res.redirect("/register/solo");
  }
};

// Show enterprise admin registration form
exports.showEnterpriseAdminForm = (req, res) => {
  res.render("registration/enterprise-admin");
};

// Handle enterprise admin registration
exports.registerEnterpriseAdmin = async (req, res) => {
  try {
    const { name, email, password, companyName, companySize } = req.body;

    // Basic validation
    if (!name || !email || !password || !companyName) {
      req.flash("error", "All required fields must be filled");
      return res.redirect("/register/enterprise-admin");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash("error", "Email already registered");
      return res.redirect("/register/enterprise-admin");
    }

    // Create User as pure admin
    const user = await new Promise((resolve, reject) => {
      User.register(
        new User({
          email,
          role: "system_admin",
          accountType: "enterprise_admin",
          // You might want to store company info in a separate Company model
          companyName,
          companySize,
        }),
        password,
        (err, user) => {
          if (err) reject(err);
          resolve(user);
        },
      );
    });

    req.flash(
      "success",
      "Enterprise admin account created! You can now create worksites and safety officers.",
    );
    return res.redirect("/api/users/login");
  } catch (error) {
    console.error("Enterprise admin registration error:", error);
    req.flash("error", "Registration failed. Please try again.");
    return res.redirect("/register/enterprise-admin");
  }
};

// Admin creates a safety officer (enterprise only)
exports.adminCreateSafetyOfficer = async (req, res) => {
  try {
    const { name, email, phone, bio, assignToWorksite } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash("error", "Email already registered");
      return res.redirect("/admin/safety-officers/create");
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(6).toString("hex"); // e.g., "a1b2c3d4"

    // Create Safety Officer profile
    const newSafetyOfficer = new SafetyOfficer({
      name,
      email,
      phone,
      bio: bio || "",
      verificationStatus: "verified", // Auto-verify when created by admin
      accountType: "enterprise_officer",
      createdBy: req.user._id,
    });

    await newSafetyOfficer.save();

    // Create User as pure safety officer
    const user = await new Promise((resolve, reject) => {
      User.register(
        new User({
          email,
          role: "safety_officer",
          accountType: "enterprise_officer",
          safetyOfficer: newSafetyOfficer._id,
          createdBy: req.user._id,
        }),
        tempPassword,
        (err, user) => {
          if (err) reject(err);
          resolve(user);
        },
      );
    });

    // Link back
    newSafetyOfficer.user = user._id;
    await newSafetyOfficer.save();

    // If worksite specified, assign them
    if (assignToWorksite) {
      const worksite = await Worksite.findById(assignToWorksite);
      if (worksite) {
        worksite.assignedSafetyOfficers.push({
          officer: newSafetyOfficer._id,
          role: "assistant",
          assignedDate: new Date(),
          isActive: true,
        });
        await worksite.save();

        newSafetyOfficer.worksites.push(worksite._id);
        await newSafetyOfficer.save();
      }
    }

    // TODO: Send email with temporary password
    // await sendWelcomeEmail(email, tempPassword);

    req.flash(
      "success",
      `Safety officer ${name} created successfully. Temporary password: ${tempPassword}`,
    );
    return res.redirect("/admin/safety-officers");
  } catch (error) {
    console.error("Admin create safety officer error:", error);
    req.flash("error", "Failed to create safety officer");
    return res.redirect("/admin/safety-officers/create");
  }
};
