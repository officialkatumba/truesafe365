const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { ensureAuthenticated, ensureAdmin } = require("../middlewares/auth");

// All admin routes require authentication and admin role
router.use(ensureAuthenticated, ensureAdmin);

// Dashboard
// router.get("/dashboard", adminController.showAdminDashboard);

// Safety Officer management
router.get("/safety-officers", adminController.listSafetyOfficers);
router.get("/safety-officers/:id", adminController.viewSafetyOfficer);
router.post("/safety-officers/:id/verify", adminController.verifySafetyOfficer);

// Worksite management
router.get("/worksites", adminController.listWorksites);
router.get("/worksites/create", adminController.showCreateWorksiteForm);
router.post("/worksites/create", adminController.createWorksite);
router.get("/worksites/:id", adminController.viewWorksite);
router.post(
  "/worksites/:worksiteId/assign-officer",
  adminController.assignOfficerToWorksite,
);

// Work Area assignments
router.post(
  "/work-areas/:workAreaId/assign-officer",
  adminController.assignOfficerToWorkArea,
);

// Approval workflow
router.post(
  "/worksites/:worksiteId/approvals/:approvalId",
  adminController.processApproval,
);

// Analytics
router.get("/analytics", adminController.getAnalytics);

module.exports = router;
