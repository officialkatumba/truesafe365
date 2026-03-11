const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middlewares/auth");

// Solo Practitioner Dashboard (dual-role)
router.get("/solo", ensureAuthenticated, (req, res) => {
  if (!req.user.isDualRole) {
    req.flash("error", "Access denied - Solo practitioners only");
    return res.redirect("/api/users/login");
  }
  res.render("safety-officer/dashboard-solo", {
    user: req.user,
  });
});

// Enterprise Safety Officer Dashboard
router.get("/officer", ensureAuthenticated, (req, res) => {
  if (req.user.role !== "safety_officer" || req.user.isDualRole) {
    req.flash("error", "Access denied - Enterprise safety officers only");
    return res.redirect("/api/users/login");
  }
  res.render("safety-officer/dashboard-enterprise", {
    user: req.user,
  });
});

// Enterprise Admin Dashboard
router.get("/admin", ensureAuthenticated, (req, res) => {
  if (
    req.user.role !== "system_admin" ||
    req.user.accountType !== "enterprise_admin"
  ) {
    req.flash("error", "Access denied - Enterprise admins only");
    return res.redirect("/api/users/login");
  }
  res.render("admin/dashboard", {
    user: req.user,
  });
});

module.exports = router;
