const express = require("express");
const router = express.Router();

const emergencyProtocolController = require("../controllers/emergencyProtocolController");

router.post(
  "/generate/:workAreaId",
  emergencyProtocolController.generateEmergencyProtocol,
);

router.get("/:id/download-word", emergencyProtocolController.downloadWord);

router.get("/:id", emergencyProtocolController.getEmergencyProtocol);

module.exports = router;
