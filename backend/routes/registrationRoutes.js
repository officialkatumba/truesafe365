const express = require("express");
const router = express.Router();
const registrationController = require("../controllers/registrationController");
const { ensureAuthenticated, ensureAdmin } = require("../middlewares/auth");

// Public registration routes
router.get("/options", registrationController.showRegistrationOptions);
router.get("/solo", registrationController.showSoloRegistrationForm);
router.post("/solo", registrationController.registerSolo);
router.get("/enterprise-admin", registrationController.showEnterpriseAdminForm);
router.post(
  "/enterprise-admin",
  registrationController.registerEnterpriseAdmin,
);

// Protected admin route for creating safety officers
router.post(
  "/admin/create-officer",
  ensureAuthenticated,
  ensureAdmin,
  registrationController.adminCreateSafetyOfficer,
);

module.exports = router;
