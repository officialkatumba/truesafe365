const express = require("express");
const router = express.Router();
const worksiteController = require("../controllers/worksiteController");
const { ensureAuthenticated } = require("../middlewares/auth");

// All worksite routes require authentication
router.use(ensureAuthenticated);

// Worksite management
router.get("/my-worksites", worksiteController.getMyWorksites);
router.get("/create", worksiteController.showCreateWorksiteForm);
router.post("/create", worksiteController.createWorksite);
router.get("/:id", worksiteController.getWorksite);
router.get("/:id/edit", worksiteController.showEditWorksiteForm);
router.post("/:id/edit", worksiteController.updateWorksite);

// Sharing (for solo users)
router.post("/:id/share", worksiteController.shareWorksite);

module.exports = router;
