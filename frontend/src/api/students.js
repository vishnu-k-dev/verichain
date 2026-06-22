import { api } from "./client.js";

export const studentsApi = {
  register: (payload) => api.post("/students/register", payload).then((r) => r.data),
  get: (id) => api.get(`/students/${id}`).then((r) => r.data),
  me: () => api.get("/students/me").then((r) => r.data),
};

export default studentsApi;
