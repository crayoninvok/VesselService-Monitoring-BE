// src/index.ts (or wherever your main app is)
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { AuthRouter } from "./routers/auth.router";
import { VesselRouter } from "./routers/vessel.router";
import initSchedulers from "./schedulers/ais-update.scheduler";

const PORT: number = 8000;
const base_url_fe = process.env.BASE_URL_FE;
const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: base_url_fe,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Initialize routers
const authRouter = new AuthRouter();
const vesselRouter = new VesselRouter();

// Initialize schedulers for AIS data
initSchedulers();

app.use("/api/auth/", authRouter.getRouter());
app.use("/api/vessels/", vesselRouter.getRouter());

app.get("/api", (req, res) => {
  res.send("Welcome to the API!");
});

app.listen(PORT, () => {
  console.log(`Server is running on -> http://localhost:${PORT}/api`);
});

export default app;
