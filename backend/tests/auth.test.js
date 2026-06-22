import { describe, it, expect, beforeAll } from "@jest/globals";
import request from "supertest";

let app;

beforeAll(async () => {
  const { createApp } = await import("../src/app.js");
  app = createApp();
});

describe("Auth API", () => {
  const creds = { email: "employer@example.com", password: "supersecret1", role: "verifier" };

  describe("POST /api/auth/register", () => {
    it("registers a verifier and returns a token pair", async () => {
      const res = await request(app).post("/api/auth/register").send(creds);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
      expect(res.body.user).toMatchObject({ email: creds.email, role: "verifier" });
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it("rejects a duplicate email", async () => {
      await request(app).post("/api/auth/register").send(creds);
      const res = await request(app).post("/api/auth/register").send(creds);
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("EMAIL_TAKEN");
    });

    it("rejects a weak password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "a@b.com", password: "short", role: "verifier" });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("WEAK_PASSWORD");
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in with correct credentials", async () => {
      await request(app).post("/api/auth/register").send(creds);
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: creds.email, password: creds.password });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
    });

    it("rejects a wrong password", async () => {
      await request(app).post("/api/auth/register").send(creds);
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: creds.email, password: "wrongpassword" });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns the profile for a valid token", async () => {
      const reg = await request(app).post("/api/auth/register").send(creds);
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${reg.body.accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(creds.email);
    });

    it("rejects a missing token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });
  });
});
