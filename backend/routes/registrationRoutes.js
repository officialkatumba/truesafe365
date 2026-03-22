// const express = require("express");
// const router = express.Router();
// const registrationController = require("../controllers/registrationController");
// const { ensureAuthenticated, ensureAdmin } = require("../middlewares/auth");

// // Public registration routes
// router.get("/options", registrationController.showRegistrationOptions);
// router.get("/solo", registrationController.showSoloRegistrationForm);
// router.post("/solo", registrationController.registerSolo);
// router.get("/enterprise-admin", registrationController.showEnterpriseAdminForm);
// router.post(
//   "/enterprise-admin",
//   registrationController.registerEnterpriseAdmin,
// );

// // Protected admin route for creating safety officers
// // router.post(
// //   "/admin/create-officer",
// //   ensureAuthenticated,
// //   ensureAdmin,
// //   registrationController.adminCreateSafetyOfficer,
// // );

// module.exports = router;

// backend/routes/registrationRoutes.js

const express = require("express");
const router = express.Router();
const registrationController = require("../controllers/registrationController");

// Registration options
router.get("/options", registrationController.showRegistrationOptions);

// Enterprise admin registration
router.get("/enterprise-admin", registrationController.showEnterpriseAdminForm);
router.post(
  "/enterprise-admin",
  registrationController.registerEnterpriseAdmin,
);

// Safety officer joining with PIN
router.get(
  "/safety-officer/join",
  registrationController.showSafetyOfficerJoinForm,
);
router.post("/safety-officer/join", registrationController.joinSafetyOfficer);

// Worker joining with PIN
router.get("/worker/join", registrationController.showWorkerJoinForm);
router.post("/worker/join", registrationController.joinWorker);

module.exports = router;
