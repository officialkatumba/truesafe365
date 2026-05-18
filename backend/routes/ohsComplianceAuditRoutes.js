const express = require("express");
const router = express.Router();

const ohsComplianceAuditController = require("../controllers/ohsComplianceAuditController");

router.post(
  "/generate/:workAreaId",
  ohsComplianceAuditController.generateAudit,
);

router.get("/:id/interview", ohsComplianceAuditController.showInterview);

router.post(
  "/:id/submit-responses",
  ohsComplianceAuditController.submitResponsesAndScore,
);

router.get("/:id/download-word", ohsComplianceAuditController.downloadWord);

router.get("/:id", ohsComplianceAuditController.viewAudit);

module.exports = router;
