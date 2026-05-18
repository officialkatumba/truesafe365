const express = require("express");
const router = express.Router();

const safetyAuditScorecardController = require("../controllers/safetyAuditScorecardController");

router.post(
  "/generate/:workAreaId",
  safetyAuditScorecardController.generateAuditQuestions,
);

router.get("/:id/interview", safetyAuditScorecardController.showAuditInterview);

router.post(
  "/:id/submit-responses",
  safetyAuditScorecardController.submitResponsesAndGenerateScore,
);

router.get("/:id/download-word", safetyAuditScorecardController.downloadWord);

router.get("/:id", safetyAuditScorecardController.viewScorecard);

module.exports = router;
