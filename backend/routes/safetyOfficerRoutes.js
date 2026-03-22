const express = require("express");
const router = express.Router();
const safetyOfficerController = require("../controllers/safetyOfficerController");
const {
  ensureAuthenticated,
  ensureSafetyOfficer,
} = require("../middlewares/auth");

// All routes require authentication and safety officer role
router.use(ensureAuthenticated, ensureSafetyOfficer);

// Dashboard
router.get("/dashboard", safetyOfficerController.showDashboard);

// Incident management
router.post("/incidents", safetyOfficerController.reportIncident);

// Risk assessment
router.post("/risk-assessments", safetyOfficerController.createRiskAssessment);

// Safety talks
router.post(
  "/safety-talks/generate",
  safetyOfficerController.generateSafetyTalk,
);

// PPE checklists
router.post("/ppe-checklists", safetyOfficerController.createPPEChecklist);

// Safety observations
router.post("/observations", safetyOfficerController.createObservation);

module.exports = router;
