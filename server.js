import express from "express";
import connectDB from "./db.js";
import dotenv from "dotenv";
import cors from "cors";
import crypto from "crypto";
import url from "./models/url.js";
import indexRoutes from "./routes/index.js";
import urlRoutes from "./routes/url.js";

const app = express(); //initialize the express application

app.use(express.json());
app.use(cors());

dotenv.config();

const PORT = process.env.PORT || 5000; //defining the port for the server

connectDB();

app.use("/api", urlRoutes);
app.use("/", indexRoutes);

app.listen(PORT, () => {
  console.log(`Server is securely running on http://localhost:${PORT}`);
});
