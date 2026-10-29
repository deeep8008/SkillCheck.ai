import axios from "axios";

export async function register({ username, email, password }) {
  const response = await axios.post("/auth/register", { username, email, password });
  return response.data;
}

export async function login({ identifier, password }) {
  const response = await axios.post("/auth/login", { identifier, password });
  return response.data;
}
