import express from "express";
import bodyParser from "body-parser";
import previewRoute from "./routes/preview";
import rateLimit from "express-rate-limit";

const app = express();
app.use(bodyParser.json());

// rate limiter: 10 req / minute per IP for the preview endpoint
const previewLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded" },
});

app.use("/api/preview", previewLimiter);
app.get("/health", (req, res) => {
  res.json({ message: "working everything fine" });
});
app.use("/api", previewRoute);

// ✅ Local development: start server
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

// ✅ Export for Vercel (serverless function handler)
export default app;
