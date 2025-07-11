const express = require("express");
const path = require("path");
const cors = require("cors");
const net = require("net");
require("dotenv").config();

// Créer l'application Express
const app = express();

/**
 * Teste si un port est disponible
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    
    server.on('error', () => resolve(false));
  });
}

/**
 * Trouve le premier port disponible dans une liste
 */
async function findAvailablePort(preferredPorts = [3001, 3002, 8080, 8081, 5000, 5001]) {
  console.log("🔍 Recherche d'un port disponible...");
  
  for (const port of preferredPorts) {
    const available = await isPortAvailable(port);
    if (available) {
      console.log(`✅ Port ${port} disponible`);
      return port;
    } else {
      console.log(`❌ Port ${port} occupé`);
    }
  }
  
  // Si aucun port préféré n'est disponible, chercher automatiquement
  for (let port = 3003; port <= 3020; port++) {
    const available = await isPortAvailable(port);
    if (available) {
      console.log(`✅ Port libre trouvé: ${port}`);
      return port;
    }
  }
  
  throw new Error('Aucun port disponible trouvé');
}

/**
 * Configuration CORS intelligente
 */
function createCorsOptions(serverPort) {
  return {
    origin: function (origin, callback) {
      // Autoriser les requêtes sans origin (applications mobiles, tests, etc.)
      if (!origin) return callback(null, true);
      
      // Liste dynamique des origines autorisées
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        `http://localhost:${serverPort}`,
        `http://127.0.0.1:${serverPort}`,
        // Ajouter d'autres ports courants
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:8080',
        // Domaines de production
        'https://votre-domaine.com',
        'https://www.votre-domaine.com'
      ];
      
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.log(`⚠️  Origin non autorisée: ${origin}`);
        callback(null, true); // En développement, autoriser quand même
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With', 
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma',
      'Access-Control-Allow-Origin'
    ],
    optionsSuccessStatus: 200
  };
}

/**
 * Initialise le serveur avec gestion intelligente des ports
 */
async function initializeServer() {
  try {
    // Déterminer le port à utiliser
    let PORT;
    
    if (process.env.PORT && !isNaN(process.env.PORT)) {
      // Vérifier si le port dans .env est disponible
      const envPort = parseInt(process.env.PORT);
      const available = await isPortAvailable(envPort);
      
      if (available) {
        PORT = envPort;
        console.log(`✅ Utilisation du port défini dans .env: ${PORT}`);
      } else {
        console.log(`❌ Port ${envPort} (défini dans .env) occupé`);
        PORT = await findAvailablePort();
        console.log(`🔄 Basculement vers le port ${PORT}`);
      }
    } else {
      // Pas de PORT défini, chercher automatiquement
      PORT = await findAvailablePort();
    }

    // Configuration CORS avec le port déterminé
    const corsOptions = createCorsOptions(PORT);
    
    // Appliquer les middlewares
    app.use(cors(corsOptions));
    app.use(express.json({ limit: "10mb" }));
    app.use(express.static(path.join(__dirname, "build")));

    // Headers de sécurité supplémentaires
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
      res.header('Access-Control-Allow-Credentials', 'true');
      
      // Log des requêtes en développement
      if (process.env.NODE_ENV === 'development') {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
      }
      
      next();
    });

    // Gestion des requêtes OPTIONS
    app.options('*', cors(corsOptions));

    // Initialisation de l'API Anthropic
    let anthropic = null;
    try {
      const Anthropic = require("@anthropic-ai/sdk");
      anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log("🤖 API Anthropic initialisée");
    } catch (error) {
      console.log("⚠️  API Anthropic non initialisée:", error.message);
    }

    // Route de test de santé
    app.get("/api/health", (req, res) => {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.json({
        success: true,
        message: "Serveur opérationnel",
        timestamp: new Date().toISOString(),
        server: {
          port: PORT,
          environment: process.env.NODE_ENV || "development",
          uptime: process.uptime(),
          nodeVersion: process.version
        },
        configuration: {
          apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
          corsEnabled: true,
          origin: req.headers.origin || 'none'
        }
      });
    });

    // Route API pour Claude avec gestion d'erreurs robuste
    app.post("/api/claude", async (req, res) => {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      
      try {
        const { prompt, model = "claude-3-5-sonnet-20241022", max_tokens = 4000 } = req.body;

        // Validation des entrées
        if (!prompt) {
          return res.status(400).json({ 
            success: false,
            error: "Prompt requis",
            details: "Le paramètre 'prompt' est obligatoire"
          });
        }

        if (!anthropic) {
          return res.status(500).json({
            success: false,
            error: "Service Claude non disponible",
            details: "L'API Anthropic n'est pas correctement initialisée"
          });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
          return res.status(500).json({
            success: false,
            error: "Clé API manquante",
            details: "Configurez ANTHROPIC_API_KEY dans votre fichier .env"
          });
        }

        // Log de la requête
        if (process.env.LOG_CLAUDE_REQUESTS === "true") {
          console.log("🤖 Requête Claude:", {
            model,
            promptLength: prompt.length,
            maxTokens: max_tokens,
            timestamp: new Date().toISOString()
          });
        }

        // Appel à l'API Claude
        const response = await anthropic.messages.create({
          model: model,
          max_tokens: max_tokens,
          messages: [{ role: "user", content: prompt }],
        });

        // Log de la réponse
        if (process.env.LOG_CLAUDE_REQUESTS === "true") {
          console.log("✅ Réponse Claude:", {
            responseLength: response.content[0].text.length,
            usage: response.usage,
            timestamp: new Date().toISOString()
          });
        }

        res.json({
          success: true,
          content: response.content[0].text,
          usage: response.usage,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error("❌ Erreur API Claude:", error);

        let errorResponse = {
          success: false,
          error: "Erreur interne",
          timestamp: new Date().toISOString()
        };

        // Gestion spécifique des erreurs Anthropic
        if (error.status === 401) {
          errorResponse = {
            ...errorResponse,
            error: "Clé API invalide",
            details: "Vérifiez votre clé API Anthropic dans le fichier .env"
          };
        } else if (error.status === 429) {
          errorResponse = {
            ...errorResponse,
            error: "Limite de débit dépassée",
            details: "Trop de requêtes, veuillez patienter avant de réessayer"
          };
        } else if (error.status === 400) {
          errorResponse = {
            ...errorResponse,
            error: "Requête invalide",
            details: error.message || "Vérifiez les paramètres de votre requête"
          };
        } else {
          errorResponse.details = process.env.NODE_ENV === "development" 
            ? error.message 
            : "Une erreur inattendue s'est produite";
        }

        res.status(error.status || 500).json(errorResponse);
      }
    });

    // Route de test Claude
    app.get("/api/test-claude", async (req, res) => {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      
      try {
        if (!anthropic) {
          return res.status(500).json({
            success: false,
            error: "Service Claude non disponible",
            details: "L'API Anthropic n'est pas initialisée"
          });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
          return res.status(500).json({
            success: false,
            error: "Clé API manquante", 
            details: "Configurez ANTHROPIC_API_KEY dans votre fichier .env"
          });
        }

        console.log("🧪 Test de l'API Claude...");
        
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 50,
          messages: [{ role: "user", content: 'Répondre simplement: "Test API réussi"' }],
        });

        res.json({
          success: true,
          message: "Test API Claude réussi",
          response: response.content[0].text,
          usage: response.usage,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error("❌ Échec du test Claude:", error);
        
        res.status(500).json({
          success: false,
          error: "Test API Claude échoué",
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Route principale avec informations détaillées
    app.get("/", (req, res) => {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      
      res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>BearingPoint - API Server</title>
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
                    max-width: 900px; 
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
                .warning {
                    background: rgba(255, 193, 7, 0.2);
                    border: 1px solid rgba(255, 193, 7, 0.3);
                    color: #fff3cd;
                }
                .success {
                    background: rgba(76, 175, 80, 0.2);
                    border: 1px solid rgba(76, 175, 80, 0.3);
                    color: #c8e6c9;
                }
                a { color: #bbdefb; text-decoration: none; }
                a:hover { text-decoration: underline; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 BearingPoint API Server</h1>
                
                <div class="status">
                    ✅ Serveur Express opérationnel sur le port ${PORT}
                </div>
                
                <div class="grid">
                    <div class="info">
                        <h3>📊 Informations Serveur</h3>
                        <div class="feature">Port: ${PORT}</div>
                        <div class="feature">Environnement: ${process.env.NODE_ENV || "development"}</div>
                        <div class="feature">Node.js: ${process.version}</div>
                        <div class="feature">Uptime: ${Math.floor(process.uptime())}s</div>
                        <div class="feature">Requête Origin: ${req.headers.origin || 'direct'}</div>
                    </div>

                    <div class="info">
                        <h3>🤖 Status API Claude</h3>
                        <div class="feature">Clé API: ${process.env.ANTHROPIC_API_KEY ? "✅ Configurée" : "❌ Manquante"}</div>
                        <div class="feature">Service: ${anthropic ? "✅ Initialisé" : "❌ Non initialisé"}</div>
                        <div class="feature">CORS: ✅ Configuré</div>
                        <div class="feature">Logs: ${process.env.LOG_CLAUDE_REQUESTS === "true" ? "✅ Activés" : "❌ Désactivés"}</div>
                    </div>
                </div>

                ${!process.env.ANTHROPIC_API_KEY ? `
                <div class="info warning">
                    <h3>⚠️ Configuration Requise</h3>
                    <p>Pour utiliser l'API Claude, configurez votre clé API :</p>
                    <p><strong>ANTHROPIC_API_KEY=sk-ant-api03-votre-clé-ici</strong></p>
                    <p>dans le fichier .env, puis redémarrez le serveur.</p>
                </div>
                ` : ''}

                <div class="info">
                    <h3>🔗 Endpoints Disponibles</h3>
                    <div class="feature"><a href="/api/health">GET /api/health</a> - Status du serveur</div>
                    <div class="feature"><a href="/api/test-claude">GET /api/test-claude</a> - Test API Claude</div>
                    <div class="feature">POST /api/claude - Requêtes Claude (JSON)</div>
                </div>

                <div class="info">
                    <h3>🌐 URLs Recommandées</h3>
                    <div class="feature">React App: <a href="http://localhost:3000">http://localhost:3000</a></div>
                    <div class="feature">API Server: <a href="http://localhost:${PORT}">http://localhost:${PORT}</a></div>
                    <div class="feature">Health Check: <a href="http://localhost:${PORT}/api/health">http://localhost:${PORT}/api/health</a></div>
                </div>
            </div>
        </body>
        </html>
      `);
    });

    // Route pour servir l'app React (catch-all)
    app.get("*", (req, res) => {
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.sendFile(path.join(__dirname, "build", "index.html"));
    });

    // Gestionnaire d'erreur global
    app.use((err, req, res, next) => {
      console.error("❌ Erreur serveur:", err);
      
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.status(500).json({
        success: false,
        error: "Erreur interne du serveur",
        details: process.env.NODE_ENV === "development" ? err.message : "Une erreur est survenue",
        timestamp: new Date().toISOString()
      });
    });

    // Démarrage du serveur
    const server = app.listen(PORT, () => {
      console.log("\n🚀 ===============================================");
      console.log(`🚀 SERVEUR BEARINGPOINT DÉMARRÉ`);
      console.log(`🚀 Port: ${PORT}`);
      console.log(`🚀 ===============================================\n`);
      
      console.log("🌐 URLs disponibles:");
      console.log(`   📱 React App (attendu): http://localhost:3000`);
      console.log(`   🖥️  API Server: http://localhost:${PORT}`);
      console.log(`   🧪 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`   🤖 Test Claude: http://localhost:${PORT}/api/test-claude\n`);
      
      if (process.env.ANTHROPIC_API_KEY) {
        console.log("🔑 ✅ API Claude configurée");
      } else {
        console.log("🔑 ⚠️  Clé API Claude manquante");
        console.log("   💡 Ajoutez ANTHROPIC_API_KEY=votre-clé-ici dans .env");
      }
      
      console.log("🌐 ✅ CORS configuré pour le développement");
      console.log(`⏱️  Uptime: ${Math.floor(process.uptime())}s\n`);
    });

    // Gestion gracieuse de l'arrêt
    process.on('SIGTERM', () => {
      console.log('\n🛑 Arrêt du serveur...');
      server.close(() => {
        console.log('✅ Serveur arrêté proprement');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\n🛑 Arrêt du serveur (Ctrl+C)...');
      server.close(() => {
        console.log('✅ Serveur arrêté proprement');
        process.exit(0);
      });
    });

    return PORT;

  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation du serveur:", error);
    process.exit(1);
  }
}

// Lancement du serveur
if (require.main === module) {
  initializeServer().catch(console.error);
}

module.exports = app;
