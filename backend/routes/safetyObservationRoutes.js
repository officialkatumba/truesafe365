const express = require("express");
const router = express.Router();
const safetyObservationController = require("../controllers/safetyObservationController");
const { ensureAuthenticated } = require("../middlewares/auth");

router.use(ensureAuthenticated);

router.get("/", safetyObservationController.getObservations);
router.get("/create/:workAreaId", safetyObservationController.showCreateForm);
router.post(
  "/create/:workAreaId",
  safetyObservationController.createObservation,
);
router.get("/:id", safetyObservationController.getObservation);
router.post("/:id/update", safetyObservationController.updateObservation);
router.get(
  "/api/workarea/:workAreaId",
  safetyObservationController.getWorkAreaObservations,
);

module.exports = router;
