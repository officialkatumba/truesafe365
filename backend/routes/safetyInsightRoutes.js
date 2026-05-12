const express = require("express");
const router = express.Router();
const safetyInsightController = require("../controllers/safetyInsightController");

// Generate AI insight for a work area
router.post(
  "/generate/:workAreaId",
  safetyInsightController.generateSafetyInsight,
);

// View full insight
router.get("/:id", safetyInsightController.getSafetyInsight);

module.exports = router;
