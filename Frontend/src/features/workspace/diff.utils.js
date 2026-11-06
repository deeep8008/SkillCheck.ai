/**
 * Pure JavaScript Delta / Comparison engine for comparing two SkillCheck analysis reports.
 * Zero external API calls, zero token cost.
 */

function normalizeText(text) {
  return (text || "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function computeReportDiff(v1, v2) {
  if (!v1 || !v2) return null;

  const v1Report = v1.report || {};
  const v2Report = v2.report || {};

  // 1. ATS Keyword & Coverage Delta
  const v1Ats = v1.ats || null;
  const v2Ats = v2.ats || null;
  let ats = null;

  if (v1Ats || v2Ats) {
    const v1Cov = v1Ats?.coverage ?? 0;
    const v2Cov = v2Ats?.coverage ?? 0;
    const v1Matched = v1Ats?.matched || [];
    const v2Matched = v2Ats?.matched || [];

    const newMatched = v2Matched.filter(kw => !v1Matched.includes(kw));
    const lostMatched = v1Matched.filter(kw => !v2Matched.includes(kw));

    ats = {
      v1Coverage: v1Ats ? v1Cov : null,
      v2Coverage: v2Ats ? v2Cov : null,
      change: (v1Ats && v2Ats) ? (v2Cov - v1Cov) : null,
      newMatched,
      lostMatched,
      totalMatchedV1: v1Matched.length,
      totalMatchedV2: v2Matched.length,
    };
  }

  // 2. Requirement Map Progress (Gaps Closed)
  const v1Reqs = v1Report.requirementMap || [];
  const v2Reqs = v2Report.requirementMap || [];

  const closedRequirements = [];
  const regressedRequirements = [];
  const maintainedRequirements = [];

  v2Reqs.forEach(v2Row => {
    const normV2 = normalizeText(v2Row.jobQuote);
    // Find closest match in v1
    const v1Match = v1Reqs.find(v1Row => {
      const normV1 = normalizeText(v1Row.jobQuote);
      return normV1 === normV2 || normV1.includes(normV2) || normV2.includes(normV1);
    });

    if (v1Match) {
      const wasClosed = (v1Match.status === "no_evidence" || v1Match.status === "unclear") && v2Row.status === "supported";
      const regressed = v1Match.status === "supported" && (v2Row.status === "no_evidence" || v2Row.status === "unclear");

      if (wasClosed) {
        closedRequirements.push({
          jobQuote: v2Row.jobQuote,
          beforeStatus: v1Match.status,
          afterStatus: v2Row.status,
          resumeQuote: v2Row.resumeQuote,
          explanation: v2Row.explanation,
        });
      } else if (regressed) {
        regressedRequirements.push({
          jobQuote: v2Row.jobQuote,
          beforeStatus: v1Match.status,
          afterStatus: v2Row.status,
          explanation: v2Row.explanation,
        });
      } else if (v2Row.status === "supported" && v1Match.status === "supported") {
        maintainedRequirements.push({
          jobQuote: v2Row.jobQuote,
        });
      }
    }
  });

  // 3. Gap Findings Resolved
  const v1Gaps = v1Report.gaps || [];
  const v2Gaps = v2Report.gaps || [];
  const v2GapKeys = new Set(v2Gaps.map(g => normalizeText(g.title)));
  const resolvedGaps = v1Gaps.filter(g => !v2GapKeys.has(normalizeText(g.title)));

  // 4. New Strengths Detected
  const v1Strengths = v1Report.strengths || [];
  const v2Strengths = v2Report.strengths || [];
  const v1StrengthKeys = new Set(v1Strengths.map(s => normalizeText(s.title)));
  const newStrengths = v2Strengths.filter(s => !v1StrengthKeys.has(normalizeText(s.title)));

  // 5. High-level Gap Counts
  const v1TotalGaps = (v1Report.gaps?.length || 0) + (v1Report.screeningConcerns?.length || 0);
  const v2TotalGaps = (v2Report.gaps?.length || 0) + (v2Report.screeningConcerns?.length || 0);
  const gapCountDelta = v1TotalGaps - v2TotalGaps; // positive means gaps went down!

  // 6. Word count stats
  const v1Words = v1.resumeText ? v1.resumeText.trim().split(/\s+/).filter(Boolean).length : 0;
  const v2Words = v2.resumeText ? v2.resumeText.trim().split(/\s+/).filter(Boolean).length : 0;

  return {
    ats,
    closedRequirements,
    regressedRequirements,
    maintainedRequirements,
    resolvedGaps,
    newStrengths,
    v1TotalGaps,
    v2TotalGaps,
    gapCountDelta,
    v1Words,
    v2Words,
    wordDelta: v2Words - v1Words,
    v1Id: v1.id,
    v2Id: v2.id,
    v1Date: v1.createdAt,
    v2Date: v2.createdAt,
    v1Role: v1.targetRole,
    v2Role: v2.targetRole,
  };
}
