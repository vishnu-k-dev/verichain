import { api } from "./client.js";

export const verifyApi = {
  byId: (transcriptId) =>
    api
      .get(`/verify/${transcriptId}`)
      // 404 returns a structured NOT_FOUND body — surface it, don't throw.
      .then((r) => r.data)
      .catch((e) => {
        if (e.response?.status === 404 && e.response.data) return e.response.data;
        throw e;
      }),

  byUpload: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post("/verify/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data)
      .catch((e) => {
        if (e.response?.status === 404 && e.response.data) return e.response.data;
        throw e;
      });
  },

  documentUrl: (transcriptId) =>
    `${import.meta.env.VITE_API_URL || "/api"}/verify/${transcriptId}/document`,
};

export default verifyApi;
