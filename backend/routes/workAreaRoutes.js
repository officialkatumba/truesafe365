const express = require("express");
const router = express.Router();
const workAreaController = require("../controllers/workAreaController");
const { ensureAuthenticated } = require("../middlewares/auth");

router.use(ensureAuthenticated);

// Create routes
router.get("/create", workAreaController.showCreateWorkAreaForm);
router.post("/create", workAreaController.createWorkArea);

// View routes
router.get("/:id", workAreaController.getWorkArea);

// Edit routes
router.get("/:id/edit", workAreaController.showEditWorkAreaForm);
router.post("/:id/edit", workAreaController.updateWorkArea);

// API routes
router.get("/:id/incidents", workAreaController.getAreaIncidents);
router.get("/:id/risk-assessments", workAreaController.getAreaRiskAssessments);
router.get("/:id/safety-talks", workAreaController.getAreaSafetyTalks);

// Officer management routes
router.get(
  "/:workAreaId/manage-officers",
  workAreaController.showManageOfficersPage,
);
router.post(
  "/:workAreaId/assign-officer",
  workAreaController.assignOfficerToWorkArea,
);
router.delete(
  "/:workAreaId/assignments/:assignmentId",
  workAreaController.removeOfficerFromWorkArea,
);
router.get(
  "/:workAreaId/available-officers",
  workAreaController.getAvailableOfficersForWorkArea,
);
router.put(
  "/:workAreaId/assignments/:assignmentId",
  workAreaController.updateOfficerAssignment,
);

// Worker management routes
router.get(
  "/:workAreaId/manage-workers",
  workAreaController.showManageWorkersPage,
);
router.post(
  "/:workAreaId/assign-worker",
  workAreaController.assignWorkerToWorkArea,
);
router.delete(
  "/:workAreaId/workers/:assignmentId",
  workAreaController.removeWorkerFromWorkArea,
);
router.get(
  "/:workAreaId/available-workers",
  workAreaController.getAvailableWorkersForWorkArea,
);
router.put(
  "/:workAreaId/workers/:assignmentId",
  workAreaController.updateWorkerAssignment,
);

module.exports = router;
