import request from "supertest";
import app from "../src/index";

describe("POST /api/preview", () => {
  it("should return 400 if url missing", async () => {
    const res = await request(app).post("/api/preview").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("URL is required");
  });
});
