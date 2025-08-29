import express from "express";
import bodyParser from "body-parser";
import previewRoute from "./routes/preview";
import rateLimit from "express-rate-limit";

const app = express();
app.use(bodyParser.json());

const previewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded" },
});

app.use("/api/preview", previewLimiter);
app.use("/api", previewRoute);
app.get("/api/health", (req, res) => {
  res.json({ message: "working everything fine" });
});
app.listen(4000, () => {
  console.log("listning..");
});
export default app;
