import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Rota principal
app.get("/", (req, res) => {
  res.json({ message: "API Agenda Cheia está rodando 🚀" });
});

// Inicializa o servidor
app.listen(3000, () => {
  console.log("✅ Servidor rodando em http://localhost:3000");
});
