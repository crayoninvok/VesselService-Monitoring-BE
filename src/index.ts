// src/index.ts - Update with equipment router
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { AuthRouter } from "./routers/auth.router";
import { VesselRouter } from "./routers/vessel.router";
import { UserRouter } from "./routers/user.router";
import { EquipmentRouter } from "./routers/equipment.router"; // Import the new Equipment Router
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
const userRouter = new UserRouter();
const equipmentRouter = new EquipmentRouter(); // Initialize the new Equipment Router

// Initialize schedulers for AIS data
initSchedulers();

app.use("/api/auth/", authRouter.getRouter());
app.use("/api/vessels/", vesselRouter.getRouter());
app.use("/api/users/", userRouter.getRouter());
app.use("/api/equipment/", equipmentRouter.getRouter()); // Register the Equipment Router

app.get("/api", (req, res) => {
  res.send("Welcome to the API!");
});

app.listen(PORT, () => {
  console.log(`Server is running on -> http://localhost:${PORT}/api`);
});

export default app;