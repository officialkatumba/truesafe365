// const express = require("express");
// const router = express.Router();
// const safetyTalkController = require("../controllers/safetyTalkController");
// const { ensureAuthenticated } = require("../middlewares/auth");

// router.use(ensureAuthenticated);

// router.get("/", safetyTalkController.getMyTalks);
// router.get("/generate/:workAreaId", safetyTalkController.showGenerateForm);
// router.post("/generate/:workAreaId", safetyTalkController.generateSafetyTalk);
// router.get("/:id", safetyTalkController.getSafetyTalk);
// router.post("/:id/conduct", safetyTalkController.markAsConducted);
// router.post("/:id/feedback", safetyTalkController.addFeedback);

// module.exports = router;

const express = require("express");
const router = express.Router();
const safetyOfficerController = require("../controllers/safetyOfficerController");
const { ensureAuthenticated } = require("../middlewares/auth");

// GET: Show safety officer registration form
router.get("/register", safetyOfficerController.showRegisterSafetyOfficerForm);

// POST: Handle safety officer registration
router.post("/register", safetyOfficerController.registerSafetyOfficer);

// GET: Safety Officer Dashboard (original/fallback)
router.get("/dashboard", ensureAuthenticated, (req, res) => {
  if (req.user.role !== "safety_officer") {
    req.flash("error", "Access denied");
    return res.redirect("/api/users/login");
  }
  res.render("safety-officer/dashboard", {
    user: req.user,
  });
});

// 🆕 GET: Solo Practitioner Dashboard (dual-role)
router.get("/dashboard-solo", ensureAuthenticated, (req, res) => {
  // Check if user is a solo practitioner (has dual role)
  if (!req.user.isDualRole) {
    req.flash("error", "Access denied - Solo practitioners only");
    return res.redirect("/api/users/login");
  }
  res.render("safety-officer/dashboard-solo", {
    user: req.user,
  });
});

// 🆕 GET: Enterprise Safety Officer Dashboard
router.get("/dashboard-enterprise", ensureAuthenticated, (req, res) => {
  // Check if user is an enterprise safety officer (not dual role)
  if (req.user.role !== "safety_officer" || req.user.isDualRole) {
    req.flash("error", "Access denied - Enterprise safety officers only");
    return res.redirect("/api/users/login");
  }
  res.render("safety-officer/dashboard-enterprise", {
    user: req.user,
  });
});

// GET: Show edit profile form
router.get(
  "/edit",
  ensureAuthenticated,
  safetyOfficerController.showEditSafetyOfficerForm,
);

// POST: Update safety officer profile
router.post(
  "/edit",
  ensureAuthenticated,
  safetyOfficerController.updateSafetyOfficer,
);

module.exports = router;
