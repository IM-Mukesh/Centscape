import express from "express";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import previewRoute from "./routes/preview";

const app = express();
app.use(bodyParser.json());

// 10 req/min on preview
const previewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded" },
});

app.use("/api/preview", previewLimiter);
app.use("/api", previewRoute);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "working everything fine" });
});

// Local only
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// Vercel handler
export default app;
