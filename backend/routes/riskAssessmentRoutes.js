const express = require("express");
const router = express.Router();
const riskAssessmentController = require("../controllers/riskAssessmentController");
const { ensureAuthenticated } = require("../middlewares/auth");

router.use(ensureAuthenticated);

router.get("/new/:workAreaId", riskAssessmentController.showCreateForm);
router.post("/new/:workAreaId", riskAssessmentController.createRiskAssessment);
router.get("/:id", riskAssessmentController.getRiskAssessment);
router.get("/:id/edit", riskAssessmentController.showEditForm);
router.post("/:id/edit", riskAssessmentController.updateRiskAssessment);
router.post("/:id/approve", riskAssessmentController.approveAssessment);

module.exports = router;
