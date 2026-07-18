const express = require("express");
const router = express.Router();
const transportChecklistController = require("../controllers/transportChecklistController");
const { ensureAuthenticated } = require("../middlewares/auth");
const { ensureOwnedDocument, ensureOwnedWorkArea } = require("../middlewares/ownership");
const TransportChecklist = require("../models/TransportChecklist");

const ownChecklist = ensureOwnedDocument(TransportChecklist, { workAreaField: "workArea" });
const ownWorkArea = ensureOwnedWorkArea();

router.use(ensureAuthenticated);

router.get("/new/:workAreaId/:checklistType", ownWorkArea, transportChecklistController.showForm);
router.post("/new/:workAreaId/:checklistType", ownWorkArea, transportChecklistController.submitChecklist);

router.get("/:id", ownChecklist, transportChecklistController.getChecklist);
router.get("/:id/download-word", ownChecklist, transportChecklistController.downloadWord);

module.exports = router;
