exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();

  req.flash("error", "Please log in to access this page");
  return res.redirect("/api/users/login");
};

exports.ensureSafetyOfficer = exports.ensureAuthenticated;

exports.ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user?.role === "admin") return next();

  req.flash("error", "You do not have permission to access that page");
  return res.redirect("/dashboard/officer");
};
