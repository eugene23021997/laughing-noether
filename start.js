#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const net = require("net");
require("dotenv").config();

console.log("🚀 Démarrage de l'application BearingPoint...\n");

// Fonction pour tester si un port est libre
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.listen(port, () => {
      server.close(() => {
        resolve(true); // Port libre
      });
    });

    server.on("error", () => {
      resolve(false); // Port occupé
    });
  });
}

// Fonction pour trouver un port libre
async function findFreePort(startPort = 3001) {
  for (let port = startPort; port <= startPort + 10; port++) {
    const isFree = await isPortFree(port);
    if (isFree) {
      return port;
    }
  }
  return null;
}

// Fonction pour afficher les informations de diagnostic
function displayDiagnostics() {
  console.log("=".repeat(60));
  console.log("📊 DIAGNOSTIC DE L'APPLICATION");
  console.log("=".repeat(60));

  // Vérifier Node.js
  console.log(`📦 Version Node.js: ${process.version}`);
  console.log(`🔧 Environnement: ${process.env.NODE_ENV || "development"}`);
  console.log(`📍 Répertoire: ${process.cwd()}`);

  // Vérifier les variables d'environnement
  console.log("\n🔑 VARIABLES D'ENVIRONNEMENT:");
  if (process.env.ANTHROPIC_API_KEY) {
    const key = process.env.ANTHROPIC_API_KEY;
    console.log(
      `✅ ANTHROPIC_API_KEY: ${key.substring(0, 10)}...${key.substring(
        key.length - 10
      )} (${key.length} caractères)`
    );
  } else {
    console.log("❌ ANTHROPIC_API_KEY: Non configurée");
  }

  console.log(`📡 PORT: ${process.env.PORT || "auto-détection"}`);
  console.log(`🌐 NODE_ENV: ${process.env.NODE_ENV || "development"}`);

  // Vérifier les fichiers essentiels
  console.log("\n📁 FICHIERS ESSENTIELS:");
  const essentialFiles = ["package.json", "server.js", ".env"];

  essentialFiles.forEach((file) => {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - MANQUANT`);
    }
  });

  // Vérifier package.json
  console.log("\n📦 DÉPENDANCES CRITIQUES:");
  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const dependencies =
      { ...packageJson.dependencies, ...packageJson.devDependencies } || {};

    const criticalDeps = ["express", "cors", "dotenv", "@anthropic-ai/sdk"];

    criticalDeps.forEach((dep) => {
      if (dependencies[dep]) {
        console.log(`✅ ${dep}: ${dependencies[dep]}`);
      } else {
        console.log(`❌ ${dep}: Non installé`);
      }
    });
  } catch (error) {
    console.log("❌ Erreur lors de la lecture de package.json");
  }

  console.log("\n" + "=".repeat(60));
}

// Fonction pour vérifier la clé API
async function testAnthropicAPI() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("❌ Impossible de tester l'API - Clé manquante");
    return false;
  }

  try {
    console.log("🔍 Test de la clé API Anthropic...");

    // Import dynamique pour éviter les erreurs si le module n'est pas installé
    const { default: Anthropic } = await import("@anthropic-ai/sdk");

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 50,
      messages: [{ role: "user", content: 'Répondre: "Test API réussi"' }],
    });

    console.log("✅ Test API réussi:", response.content[0].text);
    console.log(
      `📊 Tokens utilisés: ${
        response.usage.input_tokens + response.usage.output_tokens
      }`
    );
    return true;
  } catch (error) {
    console.log("❌ Test API échoué:", error.message);

    if (error.status === 401) {
      console.log("💡 Vérifiez que votre clé API est correcte");
    } else if (error.status === 429) {
      console.log("💡 Limite de taux dépassée - attendez un moment");
    } else if (error.code === "MODULE_NOT_FOUND") {
      console.log(
        "💡 Module @anthropic-ai/sdk non installé - exécutez npm install"
      );
    }

    return false;
  }
}

// Fonction pour gérer les ports (version douce)
async function handlePortSelection() {
  console.log("\n🔧 SÉLECTION DU PORT:");

  // Ports à tester dans l'ordre
  const portsToTest = [3000, 3001, 3002, 8080, 8081, 5000, 5001];

  for (const port of portsToTest) {
    console.log(`🔍 Test du port ${port}...`);
    const isFree = await isPortFree(port);

    if (isFree) {
      console.log(`✅ Port ${port} disponible`);
      return port;
    } else {
      console.log(`❌ Port ${port} occupé`);
    }
  }

  // Si aucun port prédéfini n'est libre, chercher automatiquement
  console.log("🔍 Recherche d'un port libre...");
  const freePort = await findFreePort(3000);

  if (freePort) {
    console.log(`✅ Port libre trouvé: ${freePort}`);
    return freePort;
  } else {
    console.log("❌ Aucun port libre trouvé");
    return null;
  }
}

// Fonction pour créer/mettre à jour le fichier .env
function updateEnvFile(port) {
  console.log("\n📝 MISE À JOUR DU FICHIER .env:");

  let envContent = "";

  // Lire le fichier .env existant s'il existe
  if (fs.existsSync(".env")) {
    envContent = fs.readFileSync(".env", "utf8");
  }

  // Mettre à jour ou ajouter le port
  if (envContent.includes("PORT=")) {
    envContent = envContent.replace(/PORT=\d+/, `PORT=${port}`);
  } else {
    envContent += `\nPORT=${port}`;
  }

  // Ajouter une clé API par défaut si elle n'existe pas
  if (!envContent.includes("ANTHROPIC_API_KEY=")) {
    envContent += "\nANTHROPIC_API_KEY=sk-ant-api03-votre-clé-ici";
  }

  // Ajouter NODE_ENV si il n'existe pas
  if (!envContent.includes("NODE_ENV=")) {
    envContent += "\nNODE_ENV=development";
  }

  fs.writeFileSync(".env", envContent.trim());
  console.log(`✅ Fichier .env mis à jour avec PORT=${port}`);
}

// Fonction pour afficher les instructions finales
function displayFinalInstructions(port) {
  console.log("\n🎯 INSTRUCTIONS FINALES:");
  console.log("1. Configurez votre clé API dans le fichier .env:");
  console.log("   ANTHROPIC_API_KEY=votre-clé-ici");
  console.log("");
  console.log("2. Démarrez le serveur:");
  console.log("   npm start");
  console.log("");
  console.log("🌐 URLs importantes:");
  console.log(`   Application: http://localhost:${port}`);
  console.log(`   Test API: http://localhost:${port}/api/test-claude`);
  console.log(`   API Claude: http://localhost:${port}/api/claude`);
}

// Fonction principale
async function main() {
  try {
    displayDiagnostics();

    // Sélectionner un port libre
    const availablePort = await handlePortSelection();
    if (!availablePort) {
      console.log("❌ Impossible de trouver un port libre");
      process.exit(1);
    }

    // Mettre à jour le fichier .env
    updateEnvFile(availablePort);

    // Recharger les variables d'environnement
    require("dotenv").config();

    console.log("\n🧪 TEST DE L'API ANTHROPIC:");
    const apiWorking = await testAnthropicAPI();

    if (!apiWorking) {
      console.log("\n⚠️  PROBLÈME DÉTECTÉ AVEC L'API CLAUDE");
      displayFinalInstructions(availablePort);
      console.log("\n❌ Configurez votre clé API avant de continuer");
      process.exit(1);
    }

    console.log("\n✅ DIAGNOSTIC TERMINÉ - Configuration prête !");
    console.log(
      `🚀 Vous pouvez maintenant démarrer votre serveur sur le port ${availablePort}`
    );

    displayFinalInstructions(availablePort);
  } catch (error) {
    console.error("❌ Erreur lors du diagnostic:", error.message);
    process.exit(1);
  }
}

// Gestion des erreurs globales (version simplifiée)
process.on("uncaughtException", (error) => {
  console.error("❌ Erreur non gérée:", error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Promesse rejetée:", reason);
  process.exit(1);
});

// Lancer le diagnostic
main();
