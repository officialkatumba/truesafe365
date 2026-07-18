const Incident = require("../models/Incident");
const JSA = require("../models/JSA");

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function topHazardCategory(workArea, since) {
  const recentActiveHazards = (workArea.identifiedHazards || []).filter(
    (h) => h.status === "active" && (!h.identifiedDate || new Date(h.identifiedDate) >= since),
  );

  if (!recentActiveHazards.length) return null;

  const counts = {};
  recentActiveHazards.forEach((h) => {
    const label = h.hazard || h.category || "Unspecified hazard";
    counts[label] = (counts[label] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
}

// Aggregates hazards, near-misses, and JSA activity from the past week to
// surface the officer's top 3 highest-risk work areas for quick attention.
async function computeTopRiskAreas(workAreas) {
  if (!workAreas?.length) return [];

  const since = new Date(Date.now() - ONE_WEEK_MS);
  const workAreaIds = workAreas.map((wa) => wa._id);

  const [nearMissCounts, incidentCounts, jsaCounts] = await Promise.all([
    Incident.aggregate([
      { $match: { workArea: { $in: workAreaIds }, type: "near_miss", createdAt: { $gte: since } } },
      { $group: { _id: "$workArea", count: { $sum: 1 } } },
    ]),
    Incident.aggregate([
      { $match: { workArea: { $in: workAreaIds }, type: "incident", createdAt: { $gte: since } } },
      { $group: { _id: "$workArea", count: { $sum: 1 } } },
    ]),
    JSA.aggregate([
      { $match: { workArea: { $in: workAreaIds }, createdAt: { $gte: since } } },
      { $group: { _id: "$workArea", count: { $sum: 1 } } },
    ]),
  ]);

  const toMap = (rows) => new Map(rows.map((r) => [String(r._id), r.count]));
  const nearMissMap = toMap(nearMissCounts);
  const incidentMap = toMap(incidentCounts);
  const jsaMap = toMap(jsaCounts);

  const scored = workAreas.map((workArea) => {
    const activeHighRiskHazards = (workArea.identifiedHazards || []).filter(
      (h) => h.status === "active" && ["high", "critical"].includes(h.riskLevel),
    ).length;

    const nearMisses = nearMissMap.get(String(workArea._id)) || 0;
    const incidents = incidentMap.get(String(workArea._id)) || 0;
    const jsaActivity = jsaMap.get(String(workArea._id)) || 0;

    const score = activeHighRiskHazards * 3 + incidents * 3 + nearMisses * 2 + jsaActivity * 0.5;

    const topHazard = topHazardCategory(workArea, since);

    return {
      workArea,
      score,
      activeHighRiskHazards,
      nearMisses,
      incidents,
      jsaActivity,
      topHazardLabel: topHazard ? topHazard[0] : null,
    };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

module.exports = { computeTopRiskAreas };
