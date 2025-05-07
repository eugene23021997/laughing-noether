const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Active CORS pour permettre les requêtes cross-origin
app.use(
  cors({
    origin: "https://3pv9tm-3000.csb.app",
  })
);

// Sert les fichiers statiques du build React
app.use(express.static(path.join(__dirname, "build")));

// Route pour l'API Claude/Anthropic (ajoutez votre logique ici)
app.post("/api/anthropic/messages", async (req, res) => {
  try {
    // Ici, vous implémenteriez la logique pour appeler l'API Anthropic
    // Par exemple avec fetch ou axios

    // Code d'exemple (à adapter selon vos besoins)
    // const response = await fetch('https://api.anthropic.com/v1/messages', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'X-API-Key': process.env.ANTHROPIC_API_KEY,
    //     'anthropic-version': '2023-06-01'
    //   },
    //   body: JSON.stringify(req.body)
    // });
    // const data = await response.json();
    // res.json(data);

    // Version simplifiée pour test
    res.json({ content: [{ text: "Réponse de test du serveur" }] });
  } catch (error) {
    console.error("Erreur API Anthropic:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Pour toutes les autres requêtes, renvoie l'app React
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
