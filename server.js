import express from "express";
import { authFunction } from "./routes/authRoute.js";

const app = express();
const port = 3003;

app.get("/",authFunction);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
