export function analysisFailure(error, now = Date.now()) {
  if (!error.response) {
    return {
      message: "The connection ended before the result was confirmed. Check My analyses before trying again; your report may already have been saved.",
      checkHistory: true,
      retryAfter: 30
    };
  }
  const value = String(error.response.headers?.["retry-after"] || "");
  const seconds = /^\d+$/.test(value) ? Number(value) : Math.ceil((Date.parse(value) - now) / 1000);
  return {
    message: error.response.data?.message || "Could not complete analysis. Please try again later.",
    checkHistory: false,
    retryAfter: Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 86400) : 0
  };
}

export function priorityEdits(report) {
  const rank = { high: 0, medium: 1, low: 2 };
  const seen = new Set();
  return [...report.gaps, ...report.screeningConcerns, ...report.strengths]
    .filter(item => Object.hasOwn(rank, item.priority))
    .sort((a, b) => rank[a.priority] - rank[b.priority])
    .filter(item => {
      const key = item.suggestion.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 3);
}
