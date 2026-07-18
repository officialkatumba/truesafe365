const express = require("express");
const router = express.Router();
const governanceDocumentController = require("../controllers/governanceDocumentController");
const { ensureAuthenticated } = require("../middlewares/auth");
const { ensureOwnedDocument, ensureOwnedWorkArea } = require("../middlewares/ownership");
const GovernanceDocument = require("../models/GovernanceDocument");

const ownDoc = ensureOwnedDocument(GovernanceDocument, { workAreaField: "workArea" });
const ownWorkArea = ensureOwnedWorkArea();

router.use(ensureAuthenticated);

router.get("/new/:workAreaId/:docType", ownWorkArea, governanceDocumentController.showForm);
router.post(
  "/generate/committee/:workAreaId",
  ownWorkArea,
  governanceDocumentController.generateCommitteeFormation,
);
router.post(
  "/generate/policy/:workAreaId",
  ownWorkArea,
  governanceDocumentController.generateHSPolicy,
);

router.get("/:id", ownDoc, governanceDocumentController.getDocument);
router.get("/:id/download-word", ownDoc, governanceDocumentController.downloadWord);

module.exports = router;
