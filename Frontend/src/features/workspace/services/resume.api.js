import axios from "axios";

export async function extractResume(file) {
  const body = new FormData();
  body.append("resume", file);
  // Let the browser add the multipart boundary to the Content-Type header.
  const response = await axios.post("/resumes", body, { timeout: 60000 });
  return response.data;
}

export async function analyseResume({ resumeText, targetRole, jobDescription }) {
  const response = await axios.post("/resumes/analyze", { resumeText, targetRole, jobDescription }, { timeout: 65000 });
  return response.data;
}
