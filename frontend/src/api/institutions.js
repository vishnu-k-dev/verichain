import { api } from "./client.js";

export const institutionsApi = {
  create: (payload) => api.post("/institutions/register", payload).then((r) => r.data),
  list: () => api.get("/institutions").then((r) => r.data),
  approve: (id) => api.patch(`/institutions/${id}/approve`).then((r) => r.data),
  students: (id) => api.get(`/institutions/${id}/students`).then((r) => r.data),
  me: () => api.get("/institutions/me").then((r) => r.data),
  allUsers: () => api.get("/institutions/admin/users").then((r) => r.data),
};

export default institutionsApi;
