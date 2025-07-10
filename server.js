const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

// Créer l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration des middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "build")));

// Initialisation de l'API Anthropic
const Anthropic = require("@anthropic-ai/sdk");
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    if (process.env.LOG_CLAUDE_REQUESTS === "true") {
      console.log("🤖 Requête Claude:", {
        model,
        promptLength: prompt.length,
        maxTokens: max_tokens,
      });
    }

    const response = await anthropic.messages.create({
      model: model,
      max_tokens: max_tokens,
      messages: [{ role: "user", content: prompt }],
    });

    if (process.env.LOG_CLAUDE_REQUESTS === "true") {
      console.log("✅ Réponse Claude:", {
        responseLength: response.content[0].text.length,
        usage: response.usage,
      });
    }

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

// Route de test de l'API
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API BearingPoint opérationnelle",
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
        <title>BearingPoint - Suivi de compte</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                margin: 0; 
                padding: 40px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
            }
            .container { 
                max-width: 800px; 
                margin: 0 auto; 
                background: rgba(255, 255, 255, 0.1); 
                padding: 40px; 
                border-radius: 20px; 
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            h1 { 
                color: white; 
                text-align: center; 
                margin-bottom: 30px;
                font-size: 2.5em;
            }
            .status { 
                padding: 20px; 
                margin: 20px 0; 
                border-radius: 10px; 
                background: rgba(76, 175, 80, 0.2);
                border: 1px solid rgba(76, 175, 80, 0.3);
                color: #c8e6c9;
            }
            .info { 
                background: rgba(255, 255, 255, 0.1); 
                padding: 20px; 
                border-radius: 10px; 
                margin: 20px 0; 
                backdrop-filter: blur(5px);
            }
            .feature {
                margin: 15px 0;
                padding: 10px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            .feature:last-child {
                border-bottom: none;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 BearingPoint - Suivi de compte</h1>
            
            <div class="status">
                ✅ Application opérationnelle
            </div>
            
            <div class="info">
                <h3>📊 Informations système</h3>
                <div class="feature">Port: ${PORT}</div>
                <div class="feature">Environnement: ${
                  process.env.NODE_ENV || "development"
                }</div>
                <div class="feature">Node.js: ${process.version}</div>
                <div class="feature">API Claude: ${
                  process.env.ANTHROPIC_API_KEY
                    ? "✅ Configurée"
                    : "❌ Manquante"
                }</div>
            </div>

            <div class="info">
                <h3>🎯 Fonctionnalités</h3>
                <div class="feature">📰 Analyse d'actualités Schneider Electric</div>
                <div class="feature">🤖 Intelligence artificielle avec Claude</div>
                <div class="feature">👥 Extraction et gestion de contacts</div>
                <div class="feature">🎯 Identification d'opportunités commerciales</div>
                <div class="feature">📊 Tableaux de bord analytiques</div>
            </div>
        </div>
    </body>
    </html>
  `);
});

// Servir l'application React pour toutes les autres routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log("🚀 ===============================================");
  console.log(`🚀 Application BearingPoint démarrée sur le port ${PORT}`);
  console.log(`🌐 Application: http://localhost:${PORT}`);
  console.log(`📡 API Claude: http://localhost:${PORT}/api/claude`);
  console.log("🚀 ===============================================");

  if (process.env.ANTHROPIC_API_KEY) {
    console.log("🔑 API Claude configurée");
  } else {
    console.warn("⚠️  Clé API Claude manquante - configurez ANTHROPIC_API_KEY");
  }
});

module.exports = app;
