(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var table = document.getElementById("workAreaTable");
    if (!table) return;

    var searchInput = document.getElementById("workAreaSearch");
    var statusSelect = document.getElementById("workAreaStatusFilter");
    var fromDateInput = document.getElementById("workAreaFromDate");
    var toDateInput = document.getElementById("workAreaToDate");
    var countLabel = document.getElementById("workAreaFilterCount");
    var noMatches = document.getElementById("workAreaNoMatches");

    var rows = Array.prototype.slice.call(table.querySelectorAll("tbody tr[data-name]"));
    if (!rows.length) return;

    function applyFilters() {
      var search = (searchInput.value || "").trim().toLowerCase();
      var status = statusSelect.value;
      var fromDate = fromDateInput.value;
      var toDate = toDateInput.value;
      var visibleCount = 0;

      rows.forEach(function (row) {
        var matchesSearch =
          !search ||
          row.dataset.name.indexOf(search) !== -1 ||
          row.dataset.location.indexOf(search) !== -1;

        var matchesStatus = !status || row.dataset.status === status;

        var created = row.dataset.created;
        var matchesFrom = !fromDate || created >= fromDate;
        var matchesTo = !toDate || created <= toDate;

        var visible = matchesSearch && matchesStatus && matchesFrom && matchesTo;
        row.style.display = visible ? "" : "none";
        if (visible) visibleCount += 1;
      });

      if (countLabel) {
        countLabel.textContent =
          search || status || fromDate || toDate
            ? "Showing " + visibleCount + " of " + rows.length + " work areas"
            : "";
      }

      if (noMatches) {
        noMatches.classList.toggle("d-none", visibleCount !== 0 || rows.length === 0);
      }
    }

    [searchInput, statusSelect, fromDateInput, toDateInput].forEach(function (el) {
      if (el) el.addEventListener("input", applyFilters);
    });
  });
})();
