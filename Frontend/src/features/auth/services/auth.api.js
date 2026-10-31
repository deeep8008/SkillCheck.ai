import axios from "axios";

export async function register({ username, email, password }) {
  const response = await axios.post("/auth/register", { username, email, password }, { timeout: 15000 });
  return response.data;
}

export async function login({ identifier, password }) {
  const response = await axios.post("/auth/login", { identifier, password }, { timeout: 15000 });
  return response.data;
}

export async function getSession({ signal } = {}) {
  const response = await axios.get("/auth/me", { signal, timeout: 15000 });
  return response.data.user;
}

export async function logout() {
  await axios.post("/auth/logout", {}, { timeout: 15000 });
}
