const express = require("express");
const router = express.Router();
const incidentController = require("../controllers/incidentController");
const { ensureAuthenticated } = require("../middlewares/auth");

// Public incident reporting (no login required for workers)
router.get("/report/:workAreaId", incidentController.showIncidentReportForm);
router.post("/report/:workAreaId", incidentController.submitIncidentReport);

// Protected routes
router.use(ensureAuthenticated);
router.get("/", incidentController.getMyIncidents);
router.get("/:id", incidentController.getIncident);
router.get("/:id/edit", incidentController.showEditIncidentForm);
router.post("/:id/edit", incidentController.updateIncident);
router.post("/:id/investigate", incidentController.addInvestigation);

module.exports = router;
