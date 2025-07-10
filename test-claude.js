#!/usr/bin/env node

require("dotenv").config();

async function testClaudeAPI() {
  console.log("🧪 TEST DÉTAILLÉ DE L'API CLAUDE\n");
  console.log("=".repeat(50));

  // Vérifier la clé API
  console.log("1. Vérification de la clé API...");
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(
      "❌ ANTHROPIC_API_KEY non trouvée dans les variables d'environnement"
    );
    console.log("💡 Ajoutez votre clé dans le fichier .env:");
    console.log("   ANTHROPIC_API_KEY=sk-ant-api03-votre-clé-ici");
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log(
    `✅ Clé API trouvée: ${apiKey.substring(0, 15)}...${apiKey.substring(
      apiKey.length - 8
    )} (${apiKey.length} caractères)`
  );

  // Vérifier le format de la clé
  if (!apiKey.startsWith("sk-ant-api")) {
    console.log(
      '⚠️  Format de clé suspect - devrait commencer par "sk-ant-api"'
    );
  }

  // Tester l'import du SDK
  console.log("\n2. Import du SDK Anthropic...");
  let Anthropic;
  try {
    const module = await import("@anthropic-ai/sdk");
    Anthropic = module.default;
    console.log("✅ SDK Anthropic importé avec succès");
  } catch (error) {
    console.log("❌ Erreur lors de l'import du SDK:", error.message);
    console.log("💡 Installez le SDK: npm install @anthropic-ai/sdk");
    process.exit(1);
  }

  // Initialiser le client
  console.log("\n3. Initialisation du client...");
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  console.log("✅ Client Anthropic initialisé");

  // Test simple
  console.log("\n4. Test de requête simple...");
  try {
    const startTime = Date.now();
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content:
            'Réponds simplement: "API Claude fonctionnelle ! Test réussi."',
        },
      ],
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log("✅ Requête réussie !");
    console.log(`📝 Réponse: ${response.content[0].text}`);
    console.log(`⏱️  Temps de réponse: ${duration}ms`);
    console.log(
      `📊 Tokens utilisés: ${response.usage.input_tokens} input + ${
        response.usage.output_tokens
      } output = ${
        response.usage.input_tokens + response.usage.output_tokens
      } total`
    );
  } catch (error) {
    console.log("❌ Erreur lors du test:", error.message);

    if (error.status) {
      console.log(`📊 Status HTTP: ${error.status}`);
    }

    if (error.status === 401) {
      console.log("💡 Erreur d'authentification - vérifiez votre clé API");
    } else if (error.status === 429) {
      console.log("💡 Limite de taux dépassée - attendez un moment");
    } else if (error.status === 400) {
      console.log("💡 Requête invalide - vérifiez les paramètres");
    } else {
      console.log("💡 Erreur inattendue - vérifiez votre connexion Internet");
    }

    process.exit(1);
  }

  // Test d'analyse business
  console.log("\n5. Test d'analyse business...");
  try {
    const businessPrompt = `
Tu es un expert en analyse commerciale. Analyse cette actualité fictive:

ACTUALITÉ:
Titre: "Schneider Electric investit 500M€ dans la cybersécurité"
Description: "L'entreprise renforce sa division sécurité pour protéger les infrastructures critiques"

OFFRES BEARINGPOINT:
- Data Security & Privacy
- Risk Management
- Compliance

Réponds au format JSON:
{
  "pertinence": "élevée/moyenne/faible",
  "opportunites": ["opportunité 1", "opportunité 2"],
  "score": 3
}
`;

    const startTime = Date.now();
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      messages: [{ role: "user", content: businessPrompt }],
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log("✅ Analyse business réussie !");
    console.log(`⏱️  Temps de réponse: ${duration}ms`);
    console.log(
      `📊 Tokens utilisés: ${
        response.usage.input_tokens + response.usage.output_tokens
      }`
    );

    // Essayer de parser le JSON
    try {
      const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log("✅ JSON parsé avec succès:", parsed);
      } else {
        console.log("⚠️  Pas de JSON trouvé dans la réponse");
        console.log("📝 Réponse complète:", response.content[0].text);
      }
    } catch (parseError) {
      console.log("⚠️  Erreur de parsing JSON:", parseError.message);
      console.log("📝 Réponse brute:", response.content[0].text);
    }
  } catch (error) {
    console.log("❌ Erreur lors du test d'analyse:", error.message);
  }

  // Test du serveur Express (si disponible)
  console.log("\n6. Test du serveur Express...");
  try {
    const fetch = (await import("node-fetch")).default;
    const response = await fetch("http://localhost:3000/api/test-claude");

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Serveur Express fonctionne !");
      console.log("📝 Réponse du serveur:", data);
    } else {
      console.log("⚠️  Serveur Express non disponible ou erreur");
    }
  } catch (error) {
    console.log("⚠️  Serveur Express non accessible:", error.message);
    console.log("💡 Démarrez le serveur: npm start");
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ TESTS TERMINÉS");
  console.log("🎉 Votre configuration Claude semble fonctionnelle !");
  console.log("\n💡 Prochaines étapes:");
  console.log("1. Démarrez le serveur: npm start");
  console.log("2. Ouvrez http://localhost:3000 dans votre navigateur");
  console.log("3. Testez les fonctionnalités d'analyse");
}

// Lancer les tests
testClaudeAPI().catch((error) => {
  console.error("❌ Erreur fatale:", error);
  process.exit(1);
});
