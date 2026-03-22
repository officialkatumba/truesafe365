const express = require("express");
const router = express.Router();
const safetyTalkController = require("../controllers/safetyTalkController");
const { ensureAuthenticated } = require("../middlewares/auth");

router.use(ensureAuthenticated);

router.get("/", safetyTalkController.getMyTalks);
router.get("/generate/:workAreaId", safetyTalkController.showGenerateForm);
router.post("/generate/:workAreaId", safetyTalkController.generateSafetyTalk);
router.get("/:id", safetyTalkController.getSafetyTalk);
router.post("/:id/conduct", safetyTalkController.markAsConducted);
router.post("/:id/feedback", safetyTalkController.addFeedback);

module.exports = router;
