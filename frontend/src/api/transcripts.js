import { api } from "./client.js";

export const transcriptsApi = {
  list: () => api.get("/transcripts").then((r) => r.data),

  get: (id) => api.get(`/transcripts/${id}`).then((r) => r.data),

  byStudent: (studentId) =>
    api.get(`/transcripts/student/${studentId}`).then((r) => r.data),

  issue: ({ studentId, title, file }, onUploadProgress) => {
    const form = new FormData();
    form.append("studentId", studentId);
    if (title) form.append("title", title);
    form.append("file", file);
    return api
      .post("/transcripts/issue", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress,
      })
      .then((r) => r.data);
  },

  revoke: (id) => api.post(`/transcripts/${id}/revoke`).then((r) => r.data),

  downloadUrl: (id) =>
    `${import.meta.env.VITE_API_URL || "/api"}/transcripts/${id}/download`,
};

export default transcriptsApi;
