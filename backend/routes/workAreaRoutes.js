const express = require("express");
const router = express.Router();
const workAreaController = require("../controllers/workAreaController");
const { ensureAuthenticated } = require("../middlewares/auth");

router.use(ensureAuthenticated);

router.get("/create", workAreaController.showCreateWorkAreaForm);
router.post("/create", workAreaController.createWorkArea);
router.get("/:id", workAreaController.getWorkArea);
router.get("/:id/edit", workAreaController.showEditWorkAreaForm);
router.post("/:id/edit", workAreaController.updateWorkArea);

// Area-specific actions
router.get("/:id/incidents", workAreaController.getAreaIncidents);
router.get("/:id/risk-assessments", workAreaController.getAreaRiskAssessments);
router.get("/:id/safety-talks", workAreaController.getAreaSafetyTalks);

module.exports = router;
