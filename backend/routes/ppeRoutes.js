const express = require("express");
const router = express.Router();
const ppeController = require("../controllers/ppeController");
const { ensureAuthenticated } = require("../middlewares/auth");

router.use(ensureAuthenticated);

router.get("/checklists/:workAreaId", ppeController.getChecklists);
router.get(
  "/checklists/new/:workAreaId",
  ppeController.showCreateChecklistForm,
);
router.post("/checklists/new/:workAreaId", ppeController.createChecklist);
router.get("/checklists/:id", ppeController.getChecklist);
router.post("/checklists/:id/sign", ppeController.signChecklist);

module.exports = router;
