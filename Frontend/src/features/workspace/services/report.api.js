import axios from "axios";

export async function listReports(page = 1, signal) {
  const response = await axios.get("/reports", { params: { page }, signal, timeout: 15000 });
  return response.data;
}

export async function getReport(id, signal) {
  const response = await axios.get(`/reports/${encodeURIComponent(id)}`, { signal, timeout: 15000 });
  return response.data;
}
