// // backend/routes/aiDocumentRoutes.js
// const express = require("express");
// const router = express.Router();
// const aiDocumentController = require("../controllers/aiDocumentController");
// const {
//   ensureAuthenticated,
//   ensureSafetyOfficer,
// } = require("../middlewares/auth");

// router.use(ensureAuthenticated, ensureSafetyOfficer);

// // Generation routes
// router.post(
//   "/generate-risk-assessment",
//   aiDocumentController.generateRiskAssessment,
// );
// router.post(
//   "/generate-ppe-requirements",
//   aiDocumentController.generatePPERequirements,
// );
// router.post("/generate-jsa", aiDocumentController.generateJSA);
// router.post("/generate-safety-talk", aiDocumentController.generateSafetyTalk);

// // Enhancement and approval
// router.post("/enhance-document", aiDocumentController.enhanceDocument);
// router.post(
//   "/approve-document/:documentType/:documentId",
//   aiDocumentController.approveDocument,
// );
// router.post("/generate-pdf", aiDocumentController.generatePDF);

// // Fetch documents
// router.get(
//   "/documents/:workAreaId",
//   aiDocumentController.getDocumentsByWorkArea,
// );

// module.exports = router;

// backend/routes/aiDocumentRoutes.js
const express = require("express");
const router = express.Router();
const aiDocumentController = require("../controllers/aiDocumentController");
const {
  ensureAuthenticated,
  ensureSafetyOfficer,
} = require("../middlewares/auth");

router.use(ensureAuthenticated, ensureSafetyOfficer);

// ==================== GET ROUTES - Forms ====================
router.get(
  "/work-areas/:workAreaId/generate-risk-assessment",
  aiDocumentController.showRiskAssessmentForm,
);

router.get(
  "/work-areas/:workAreaId/generate-ppe",
  aiDocumentController.showPPEForm,
);

router.get(
  "/work-areas/:workAreaId/generate-jsa",
  aiDocumentController.showJSAForm,
);

router.get(
  "/work-areas/:workAreaId/generate-safety-talk",
  aiDocumentController.showSafetyTalkForm,
);

// ==================== POST ROUTES - Generation ====================
router.post(
  "/generate-risk-assessment",
  aiDocumentController.generateRiskAssessment,
);

router.post(
  "/generate-ppe-requirements",
  aiDocumentController.generatePPERequirements,
);

router.post("/generate-jsa", aiDocumentController.generateJSA);

router.post("/generate-safety-talk", aiDocumentController.generateSafetyTalk);

// ==================== Enhancement and Approval ====================
router.post("/enhance-document", aiDocumentController.enhanceDocument);

router.post(
  "/approve-document/:documentType/:documentId",
  aiDocumentController.approveDocument,
);

router.post("/generate-pdf", aiDocumentController.generatePDF);

// ==================== Fetch Documents ====================
router.get(
  "/documents/:workAreaId",
  aiDocumentController.getDocumentsByWorkArea,
);

module.exports = router;
