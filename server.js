const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

// 1. CRÉER L'APPLICATION EXPRESS D'ABORD
const app = express();
const PORT = process.env.PORT || 3000;

// 2. CONFIGURATION DES MIDDLEWARES
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "build")));

// 3. INITIALISATION DE L'API ANTHROPIC
const Anthropic = require("@anthropic-ai/sdk");
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 4. ROUTES API

// Route API pour Claude
app.post("/api/claude", async (req, res) => {
  try {
    const {
      prompt,
      model = "claude-3-5-sonnet-20241022",
      max_tokens = 4000,
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log("🤖 Requête Claude reçue:", {
      model,
      promptLength: prompt.length,
      maxTokens: max_tokens,
    });

    const response = await anthropic.messages.create({
      model: model,
      max_tokens: max_tokens,
      messages: [{ role: "user", content: prompt }],
    });

    console.log("✅ Réponse Claude reçue:", {
      responseLength: response.content[0].text.length,
      usage: response.usage,
    });

    res.json({
      content: response.content[0].text,
      usage: response.usage,
    });
  } catch (error) {
    console.error("❌ Erreur API Claude:", error);

    if (error.status === 401) {
      res.status(401).json({
        error: "Clé API invalide",
        details: "Vérifiez votre clé API Anthropic",
      });
    } else if (error.status === 429) {
      res.status(429).json({
        error: "Limite de taux dépassée",
        details: "Trop de requêtes, veuillez réessayer plus tard",
      });
    } else {
      res.status(500).json({
        error: "Erreur interne du serveur",
        details:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Une erreur est survenue",
      });
    }
  }
});

// Route pour tester la clé API
app.get("/api/test-claude", async (req, res) => {
  try {
    console.log("🔍 Test de la clé API Claude...");

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: "Clé API non configurée",
        details:
          "ANTHROPIC_API_KEY non trouvée dans les variables d'environnement",
      });
    }

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: 'Répondre simplement: "API Claude fonctionnelle"',
        },
      ],
    });

    console.log("✅ Test API Claude réussi");

    res.json({
      success: true,
      message: "Clé API Claude fonctionnelle",
      response: response.content[0].text,
      usage: response.usage,
    });
  } catch (error) {
    console.error("❌ Test API Claude échoué:", error);

    res.status(500).json({
      success: false,
      error: error.message,
      status: error.status || "unknown",
    });
  }
});

// Route de test simple
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API BearingPoint opérationnelle !",
    timestamp: new Date().toISOString(),
    server: {
      port: PORT,
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
    },
  });
});

// Route racine pour afficher le statut
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BearingPoint - API Claude</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 40px; 
                background: #f5f5f5; 
            }
            .container { 
                max-width: 800px; 
                margin: 0 auto; 
                background: white; 
                padding: 30px; 
                border-radius: 10px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            }
            h1 { color: #e31e24; text-align: center; }
            .status { 
                padding: 15px; 
                margin: 15px 0; 
                border-radius: 5px; 
                border-left: 4px solid #28a745;
                background: #d4edda; 
                color: #155724; 
            }
            .btn { 
                display: inline-block; 
                padding: 10px 20px; 
                margin: 10px 5px; 
                background: #e31e24; 
                color: white; 
                text-decoration: none; 
                border-radius: 5px; 
            }
            .btn:hover { background: #c41e3a; }
            .info { 
                background: #f8f9fa; 
                padding: 15px; 
                border-radius: 5px; 
                margin: 15px 0; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 BearingPoint - API Claude</h1>
            
            <div class="status">
                ✅ Serveur Express opérationnel !
            </div>
            
            <div class="info">
                <strong>📊 Informations:</strong><br>
                • Port: ${PORT}<br>
                • Environnement: ${process.env.NODE_ENV || "development"}<br>
                • Node.js: ${process.version}<br>
                • API Claude: ${
                  process.env.ANTHROPIC_API_KEY
                    ? "✅ Configurée"
                    : "❌ Manquante"
                }
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="/api/test" class="btn">Test API Simple</a>
                <a href="/api/test-claude" class="btn">Test API Claude</a>
            </div>
        </div>
    </body>
    </html>
  `);
});

// Servir l'application React (pour les autres routes)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// 5. DÉMARRAGE DU SERVEUR (UNE SEULE FOIS !)
app.listen(PORT, () => {
  console.log("🚀 ===============================================");
  console.log(`🚀 Serveur BearingPoint démarré sur le port ${PORT}`);
  console.log(`🌐 Application disponible: http://localhost:${PORT}`);
  console.log(`📡 API Claude: http://localhost:${PORT}/api/claude`);
  console.log(`🔍 Test API Claude: http://localhost:${PORT}/api/test-claude`);
  console.log("🚀 ===============================================");

  // Vérifier la clé API au démarrage
  if (process.env.ANTHROPIC_API_KEY) {
    console.log("🔑 Clé API Anthropic configurée");
  } else {
    console.error("❌ Clé API Anthropic manquante!");
    console.log("💡 Ajoutez ANTHROPIC_API_KEY dans votre fichier .env");
  }
});

module.exports = app;
