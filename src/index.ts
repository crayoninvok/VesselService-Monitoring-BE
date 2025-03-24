import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";


const PORT: number = parseInt(process.env.PORT || "8000");
const base_url_fe = process.env.BASE_URL_FE;

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: base_url_fe,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Initialize all routers
//const authRouter = new AuthRouter();


// Register all routes
//app.use("/api/auth", authRouter.getRouter());


// Default route
app.get("/api", (req, res) => {
  res.send("Welcome to the VessM API!");
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server is running on -> http://localhost:${PORT}/api`);
});

export default app;
