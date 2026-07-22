import express from 'express';
import cors from "cors";
import downloadRoute from "../src/routes/download.js"


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use('/', downloadRoute);

function printRoutes(stack: any[], prefix = "") {
  stack.forEach((layer: any) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(",").toUpperCase();
      console.log(methods, prefix + layer.route.path);
    } else if (layer.name === "router" && layer.handle.stack) {
      printRoutes(layer.handle.stack, prefix);
    }
  });
}

printRoutes(app.router.stack);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));