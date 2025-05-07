import * as React from "react";
const { useState, useEffect } = React;
import { prospectionService } from "../services/prospectionService";

/**
 * Composant modal pour afficher les détails d'une actualité et permettre la sélection
 * d'offres individuelles pour la prospection
 *
 * @param {Object} props - Propriétés du composant
 * @param {Object} props.newsData - Données complètes de l'actualité
 * @param {boolean} props.isOpen - Si la modal est ouverte ou non
 * @param {Function} props.onClose - Fonction appelée à la fermeture
 * @param {Array} props.contacts - Liste des contacts disponibles pour l'opportunité
 * @returns {JSX.Element|null} Composant modal ou null si fermé
 */
const OpportunityModal = ({ newsData, isOpen, onClose, contacts = [] }) => {
  // État pour les offres individuelles et contacts recommandés
  const [offerSelections, setOfferSelections] = useState({});
  const [matchingContacts, setMatchingContacts] = useState([]);
  const [selectedOfferDetails, setSelectedOfferDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialiser les sélections d'offres basées sur les sélections existantes dans le service
  useEffect(() => {
    if (!newsData || !newsData.offers) return;

    setLoading(true);

    const selectedOpportunities = prospectionService.getSelectedOpportunities();
    const selections = {};

    // Pour chaque offre associée à l'actualité
    newsData.offers.forEach((offer) => {
      const offerKey = `${offer.category}:${offer.detail}`;

      // Vérifier si l'offre est déjà sélectionnée
      const isSelected = selectedOpportunities.some(
        (opp) => opp.category === offer.category && opp.detail === offer.detail
      );

      selections[offerKey] = isSelected;
    });

    setOfferSelections(selections);
    setLoading(false);
  }, [newsData]);

  // S'abonner aux changements d'opportunités du service
  useEffect(() => {
    if (!newsData || !newsData.offers) return;

    const handleOpportunitiesChanged = (opportunities) => {
      // Mettre à jour les sélections locales
      const newSelections = { ...offerSelections };

      newsData.offers.forEach((offer) => {
        const offerKey = `${offer.category}:${offer.detail}`;
        const isSelected = opportunities.some(
          (opp) =>
            opp.category === offer.category && opp.detail === offer.detail
        );
        newSelections[offerKey] = isSelected;
      });

      setOfferSelections(newSelections);
    };

    // S'abonner aux changements
    const unsubscribe = prospectionService.subscribe(
      handleOpportunitiesChanged
    );

    return () => unsubscribe();
  }, [newsData, offerSelections]);

  // Gérer la sélection/désélection d'une offre
  const handleToggleOffer = (offer) => {
    const offerKey = `${offer.category}:${offer.detail}`;
    const isCurrentlySelected = offerSelections[offerKey];

    // Mettre à jour l'état local
    setOfferSelections({
      ...offerSelections,
      [offerKey]: !isCurrentlySelected,
    });

    // Mettre à jour le service de prospection
    if (isCurrentlySelected) {
      prospectionService.deselectOpportunity(offer);
    } else {
      const opportunityData = {
        ...offer,
        news: newsData.news,
        newsDate: newsData.newsDate,
        newsDescription: newsData.newsDescription,
        newsLink: newsData.newsLink,
      };
      prospectionService.selectOpportunity(opportunityData);
    }
  };

  // Afficher les détails d'une offre spécifique et ses contacts recommandés
  const showOfferDetails = (offer) => {
    setSelectedOfferDetails(offer);
    findMatchingContacts(offer);
  };

  // Chercher les contacts correspondant à l'offre sélectionnée
  const findMatchingContacts = (offer) => {
    if (!offer || !contacts.length) {
      setMatchingContacts([]);
      return;
    }

    setLoading(true);

    // Extraire les mots clés de l'offre et de l'actualité
    const offerKeywords = offer.detail.toLowerCase().split(/[\s,&]+/);
    const newsKeywords = `${newsData.news} ${newsData.newsDescription || ""}`
      .toLowerCase()
      .split(/[\s,&]+/);

    // Filtrer les mots-clés significatifs (plus de 3 caractères)
    const significantOfferKeywords = offerKeywords.filter((k) => k.length > 3);
    const significantNewsKeywords = newsKeywords.filter((k) => k.length > 3);

    // Créer un ensemble de mots-clés avancés pour une correspondance plus précise
    const advancedKeywords = new Set([
      // Mots-clés extraits de l'offre sélectionnée
      ...significantOfferKeywords,

      // Mots-clés contextuels liés à l'offre
      ...getContextualKeywords(offer.category, offer.detail),

      // Mots-clés contextuels liés à l'actualité
      ...getContextualKeywordsFromNews(newsData.news, newsData.newsCategory),
    ]);

    console.log("Mots-clés d'analyse:", Array.from(advancedKeywords));

    // Trouver uniquement les contacts avec correspondance directe très forte
    const relevantContacts = contacts.filter((contact) => {
      if (!contact.role) return false;

      const roleText = contact.role.toLowerCase();
      const departmentText = (contact.department || "").toLowerCase();

      let matchLevel = 0;
      let directOfferMatch = false;
      let directNewsMatch = false;
      let isDecisionMaker = false;

      // Vérifier correspondance directe avec l'offre
      significantOfferKeywords.forEach((keyword) => {
        // Correspondance exacte avec le rôle
        if (roleText.includes(keyword)) {
          matchLevel += 3;
          directOfferMatch = true;
        }
        // Correspondance avec le département
        if (departmentText.includes(keyword)) {
          matchLevel += 1;
          directOfferMatch = true;
        }
      });

      // Vérifier correspondance avec l'actualité
      significantNewsKeywords.forEach((keyword) => {
        if (keyword.length > 5) {
          // Mots-clés significatifs seulement
          if (roleText.includes(keyword)) {
            matchLevel += 2;
            directNewsMatch = true;
          }
          if (departmentText.includes(keyword)) {
            matchLevel += 1;
            directNewsMatch = true;
          }
        }
      });

      // Vérifier si c'est un rôle décisionnel
      if (
        roleText.includes("directeur") ||
        roleText.includes("director") ||
        roleText.includes("chief") ||
        roleText.includes("head") ||
        roleText.includes("président") ||
        roleText.includes("ceo") ||
        roleText.includes("cfo") ||
        roleText.includes("cio") ||
        roleText.includes("cto")
      ) {
        isDecisionMaker = true;
        matchLevel += 1; // Bonus de base pour les décideurs

        // Bonus plus élevé si le décideur a une correspondance directe
        if (directOfferMatch || directNewsMatch) {
          matchLevel += 4;
        }
      }

      // Vérifier expertise spécifique liée à l'offre
      const expertiseBonuses = getExpertiseBonusByCategory(offer.category);
      let hasExpertise = false;

      expertiseBonuses.forEach((term) => {
        if (roleText.includes(term) || departmentText.includes(term)) {
          matchLevel += 3;
          hasExpertise = true;
        }
      });

      // Stocker le niveau de correspondance pour le tri
      contact.matchLevel = matchLevel;

      // Critères très stricts pour considérer un contact comme pertinent:
      // Décideur avec correspondance directe OU Expert avec correspondance directe
      // OU Match direct élevé avec l'offre ET l'actualité
      return (
        (isDecisionMaker && (directOfferMatch || directNewsMatch)) ||
        (hasExpertise && (directOfferMatch || directNewsMatch)) ||
        (directOfferMatch && directNewsMatch && matchLevel >= 7)
      );
    });

    console.log(
      `Nombre de contacts pertinents trouvés: ${relevantContacts.length}`
    );

    // Ajouter quelques décideurs clés même s'ils ne correspondent pas aux critères ci-dessus
    // pour garantir un minimum de contacts stratégiques
    if (relevantContacts.length < 5) {
      const keyDecisionMakers = contacts.filter((contact) => {
        if (!contact.role) return false;

        const roleText = contact.role.toLowerCase();

        const isTopExecutive =
          roleText.includes("président") ||
          roleText.includes("ceo") ||
          roleText.includes("directeur général");

        // Vérifier une correspondance minimale avec l'offre
        const hasMinimalMatch = significantOfferKeywords.some((keyword) =>
          roleText.includes(keyword.substring(0, 4))
        );

        return (
          isTopExecutive &&
          hasMinimalMatch &&
          !relevantContacts.includes(contact)
        );
      });

      // Ajouter jusqu'à 3 décideurs clés
      const topDecisionMakers = keyDecisionMakers.slice(0, 3);
      topDecisionMakers.forEach((contact) => {
        contact.matchLevel = 5; // Niveau arbitraire pour les inclure
        relevantContacts.push(contact);
      });
    }

    // Limite stricte à un maximum de 15-20 contacts
    const maxContacts = Math.min(relevantContacts.length, 20);

    // Trier par niveau de pertinence
    const scoredContacts = relevantContacts
      .map((contact) => {
        const roleText = contact.role.toLowerCase();

        // Calcul final du score de pertinence pour l'affichage
        const relevanceScore = contact.matchLevel;

        // Transparence sur le calcul du score pour le débogage
        const scoreDetails = {
          matchLevel: contact.matchLevel || 0,
          offerMatch: significantOfferKeywords.some((k) => roleText.includes(k))
            ? 5
            : 0,
          newsMatch: significantNewsKeywords.some((k) => roleText.includes(k))
            ? 3
            : 0,
          expertiseBonus: getExpertiseBonusByCategory(offer.category).some(
            (term) => roleText.includes(term)
          )
            ? 3
            : 0,
          roleLevel: roleText.includes("directeur")
            ? 4
            : roleText.includes("responsable")
            ? 2
            : 0,
        };

        return {
          ...contact,
          relevanceScore: relevanceScore,
          scoreDetails: scoreDetails,
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxContacts);

    console.log(
      `Nombre final de contacts sélectionnés: ${scoredContacts.length}`
    );

    setMatchingContacts(scoredContacts);
    setLoading(false);
  };

  // Fonction pour obtenir des mots-clés contextuels selon la catégorie de l'offre
  const getContextualKeywords = (category, detail) => {
    const keywords = new Set();

    // Mots-clés par catégorie
    switch (category) {
      case "Finance & Risk":
        keywords.add("finance");
        keywords.add("financier");
        keywords.add("risque");
        keywords.add("comptable");
        keywords.add("trésorerie");
        keywords.add("audit");
        keywords.add("contrôle");
        keywords.add("conformité");
        keywords.add("compliance");
        break;
      case "Technology":
        keywords.add("technologie");
        keywords.add("informatique");
        keywords.add("digital");
        keywords.add("numérique");
        keywords.add("système");
        keywords.add("donnée");
        keywords.add("sécurité");
        keywords.add("application");
        keywords.add("cloud");
        keywords.add("architecture");
        keywords.add("innovation");
        break;
      case "Operations":
        keywords.add("opération");
        keywords.add("production");
        keywords.add("logistique");
        keywords.add("supply");
        keywords.add("chaîne");
        keywords.add("approvisionnement");
        keywords.add("fabrication");
        keywords.add("maintenance");
        keywords.add("qualité");
        keywords.add("planning");
        keywords.add("achats");
        keywords.add("sourcing");
        break;
      case "People & Strategy":
        keywords.add("stratégie");
        keywords.add("ressources");
        keywords.add("humaines");
        keywords.add("changement");
        keywords.add("talent");
        keywords.add("formation");
        keywords.add("organisation");
        keywords.add("transformation");
        keywords.add("performance");
        keywords.add("projet");
        keywords.add("programme");
        break;
      case "Customer & Growth":
        keywords.add("marketing");
        keywords.add("vente");
        keywords.add("commercial");
        keywords.add("client");
        keywords.add("expérience");
        keywords.add("marque");
        keywords.add("communication");
        keywords.add("digital");
        keywords.add("croissance");
        keywords.add("développement");
        keywords.add("produit");
        keywords.add("service");
        break;
      case "BE Capital":
        keywords.add("fusion");
        keywords.add("acquisition");
        keywords.add("investissement");
        keywords.add("transaction");
        keywords.add("m&a");
        keywords.add("capital");
        keywords.add("financement");
        keywords.add("restructuration");
        keywords.add("valorisation");
        break;
    }

    // Ajouter des mots-clés basés sur le détail de l'offre
    const detailWords = detail
      .toLowerCase()
      .split(/[\s,&-]+/)
      .filter((word) => word.length > 3);
    detailWords.forEach((word) => keywords.add(word));

    return Array.from(keywords);
  };

  // Fonction pour obtenir des mots-clés contextuels à partir de l'actualité
  const getContextualKeywordsFromNews = (newsTitle, category) => {
    const keywords = new Set();

    // Ajouter les catégories
    if (category) {
      category.split(",").forEach((cat) => {
        const trimmedCat = cat.trim().toLowerCase();
        if (trimmedCat.length > 3) {
          keywords.add(trimmedCat);
        }
      });
    }

    // Extraire des termes significatifs du titre
    const titleWords = newsTitle
      .toLowerCase()
      .split(/[\s,.:;?!()-]+/)
      .filter(
        (word) => word.length > 5 && !["schneider", "electric"].includes(word)
      );

    titleWords.forEach((word) => keywords.add(word));

    return Array.from(keywords);
  };

  // Fonction pour obtenir des termes d'expertise par catégorie
  const getExpertiseBonusByCategory = (category) => {
    switch (category) {
      case "Finance & Risk":
        return [
          "comptable",
          "contrôleur",
          "auditeur",
          "fiscal",
          "conformité",
          "trésorier",
        ];
      case "Technology":
        return [
          "architecte",
          "développeur",
          "cyber",
          "data",
          "réseau",
          "infrastructure",
        ];
      case "Operations":
        return [
          "production",
          "approvisionnement",
          "maintenance",
          "qualité",
          "lean",
          "logistique",
        ];
      case "People & Strategy":
        return [
          "talent",
          "organisation",
          "transformation",
          "conduite",
          "change",
          "projet",
        ];
      case "Customer & Growth":
        return [
          "marketing",
          "commercial",
          "vente",
          "digital",
          "produit",
          "crm",
        ];
      case "BE Capital":
        return [
          "fusion",
          "m&a",
          "transaction",
          "acquisition",
          "investissement",
          "private",
        ];
      default:
        return [];
    }
  };

  // Si la modal n'est pas ouverte ou qu'il n'y a pas d'actualité, ne rien afficher
  if (!isOpen || !newsData) return null;

  // Vérifier si cette offre a un potentiel de prospection (pertinence 3 et pas d'opportunités)
  const isHighPotentialOffer = (offer) => {
    return offer.relevanceScore === 3 && !offer.hasOpportunities;
  };

  return (
    <div className="opportunity-modal-overlay" onClick={onClose}>
      <div className="opportunity-modal" onClick={(e) => e.stopPropagation()}>
        {/* En-tête de la modal */}
        <div className="opportunity-modal-header">
          <h2>Détails de l'actualité</h2>
          <button
            className="opportunity-modal-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Corps de la modal */}
        <div className="opportunity-modal-body">
          {/* Section d'information sur l'actualité */}
          <section className="news-info-section">
            <h3 className="news-title">{newsData.news}</h3>

            <div className="news-meta">
              <span className="news-date">{newsData.date}</span>
              {newsData.category && (
                <span className="news-category">{newsData.category}</span>
              )}
              {newsData.link && (
                <a
                  href={newsData.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-link"
                >
                  Lire l'article
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
                    <path d="M15 3h6v6"></path>
                    <path d="M10 14L21 3"></path>
                  </svg>
                </a>
              )}

              {/* Badge pour indiquer que l'article a été analysé par Claude */}
              {newsData.analyzed && (
                <span className="claude-badge">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                      stroke="#6366f1"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 16L16 11H13V8L9 13H12V16Z"
                      stroke="#6366f1"
                      strokeWidth="2"
                    />
                  </svg>
                  Analysé par Claude
                </span>
              )}
            </div>

            {/* Afficher la synthèse Claude si disponible */}
            {newsData.analyzed &&
              newsData.insights &&
              newsData.insights.summary && (
                <div className="claude-summary-panel">
                  <h4>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                        stroke="#6366f1"
                        strokeWidth="2"
                      />
                      <path
                        d="M12 16L16 11H13V8L9 13H12V16Z"
                        stroke="#6366f1"
                        strokeWidth="2"
                      />
                    </svg>
                    Synthèse IA
                  </h4>
                  <p>{newsData.insights.summary}</p>
                </div>
              )}

            {/* Description originale */}
            {newsData.description && (
              <p className="news-description">{newsData.description}</p>
            )}

            {/* Opportunités identifiées par Claude */}
            {newsData.analyzed &&
              newsData.insights &&
              newsData.insights.opportunities &&
              newsData.insights.opportunities.length > 0 && (
                <div className="claude-opportunities-panel">
                  <h4>Opportunités identifiées par Claude</h4>
                  <ul>
                    {newsData.insights.opportunities.map(
                      (opportunity, index) => (
                        <li key={index}>{opportunity}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
          </section>

          {/* Interface en deux colonnes pour les offres et détails */}
          <div className="offers-detail-container">
            {/* Liste des offres associées */}
            <div className="offers-list-section">
              <h4>Offres associées</h4>

              <div className="offers-list">
                {newsData.offers &&
                  newsData.offers.map((offer, index) => {
                    const offerKey = `${offer.category}:${offer.detail}`;
                    const isSelected = offerSelections[offerKey] || false;
                    const isPotential = isHighPotentialOffer(offer);

                    return (
                      <div
                        key={index}
                        className={`offer-item ${
                          selectedOfferDetails === offer ? "active" : ""
                        } ${isPotential ? "potential" : ""}`}
                        onClick={() => showOfferDetails(offer)}
                      >
                        <div className="offer-item-header">
                          <span className="offer-category">
                            {offer.category}
                          </span>
                          <div
                            className={`relevance-badge relevance-${offer.relevanceScore}`}
                          >
                            {offer.relevanceScore}
                          </div>
                        </div>

                        <h5 className="offer-detail">{offer.detail}</h5>

                        <div className="offer-actions">
                          <button
                            className={`offer-toggle-button ${
                              isSelected ? "selected" : ""
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleOffer(offer);
                            }}
                          >
                            {isSelected ? (
                              <>
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M20 6L9 17L4 12"></path>
                                </svg>
                                Sélectionnée
                              </>
                            ) : (
                              <>
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M12 5v14M5 12h14"></path>
                                </svg>
                                Sélectionner
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Détails de l'offre sélectionnée et contacts recommandés */}
            <div className="offer-details-section">
              {selectedOfferDetails ? (
                <>
                  <div className="selected-offer-header">
                    <h4>Détails de l'offre</h4>
                    <div
                      className={`relevance-badge relevance-${selectedOfferDetails.relevanceScore}`}
                    >
                      {selectedOfferDetails.relevanceScore}
                    </div>
                  </div>

                  <div className="selected-offer-details">
                    <h5>{selectedOfferDetails.detail}</h5>
                    <p className="offer-category-label">
                      Catégorie: {selectedOfferDetails.category}
                    </p>

                    {isHighPotentialOffer(selectedOfferDetails) && (
                      <div className="potential-badge">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        Opportunité potentielle à fort potentiel d'acquisition
                      </div>
                    )}

                    {/* Contexte de l'analyse */}
                    <div
                      style={{
                        marginTop: "16px",
                        fontSize: "14px",
                        color: "#4b5563",
                      }}
                    >
                      <p>
                        Cette offre{" "}
                        <strong>{selectedOfferDetails.detail}</strong> est
                        pertinente par rapport à l'actualité{" "}
                        <strong>"{newsData.news}"</strong>.
                        {selectedOfferDetails.relevanceScore === 3 &&
                          " Cette actualité constitue une opportunité idéale pour engager une démarche commerciale sur ce sujet."}
                        {selectedOfferDetails.relevanceScore === 2 &&
                          " Cette actualité pourrait constituer une bonne entrée en matière pour aborder ce sujet."}
                      </p>
                    </div>
                  </div>

                  {/* Contacts recommandés pour cette offre */}
                  <div className="recommended-contacts">
                    <div className="recommended-contacts-header">
                      <h4>Contacts recommandés pour cette offre</h4>

                      {matchingContacts.length > 0 && !loading && (
                        <div className="contact-count">
                          {matchingContacts.length} contacts sélectionnés
                        </div>
                      )}
                    </div>

                    {/* Explication de l'analyse en cours */}
                    {loading ? (
                      <div className="contacts-loading">
                        <div className="spinner"></div>
                        <p>
                          Analyse des contacts en fonction de l'actualité et de
                          l'offre...
                        </p>
                      </div>
                    ) : matchingContacts.length > 0 ? (
                      <>
                        <div className="matching-contacts-list">
                          {matchingContacts.map((contact, index) => (
                            <div key={index} className="contact-card">
                              <div className="contact-avatar">
                                {(contact.fullName || contact.name || "")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <div className="contact-info">
                                <div className="contact-name">
                                  {contact.fullName || contact.name}
                                </div>
                                <div className="contact-role">
                                  {contact.role}
                                </div>
                                {contact.department && (
                                  <div className="contact-department">
                                    {contact.department}
                                  </div>
                                )}
                                {contact.email && (
                                  <a
                                    href={`mailto:${contact.email}`}
                                    className="contact-email"
                                  >
                                    {contact.email}
                                  </a>
                                )}
                              </div>
                              <div className="contact-score">
                                <div
                                  className={`contact-relevance-badge ${
                                    contact.relevanceScore > 12
                                      ? "high"
                                      : contact.relevanceScore > 8
                                      ? "medium"
                                      : "low"
                                  }`}
                                >
                                  {Math.min(
                                    99,
                                    Math.round(contact.relevanceScore * 7)
                                  )}
                                  %
                                </div>

                                <div className="relevance-details">
                                  {contact.scoreDetails?.offerMatch > 0 && (
                                    <span className="relevance-tag">
                                      Match direct
                                    </span>
                                  )}
                                  {contact.scoreDetails?.expertiseBonus > 0 && (
                                    <span className="relevance-tag">
                                      Expertise
                                    </span>
                                  )}
                                  {contact.scoreDetails?.roleLevel > 3 && (
                                    <span className="relevance-tag">
                                      Décideur
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="no-contacts-message">
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <p>
                          Aucun contact ne correspond précisément à cette
                          opportunité.
                        </p>
                        <button className="import-contacts-btn">
                          Importer des contacts spécifiques
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="no-offer-selected">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <p>
                    Sélectionnez une offre pour voir ses détails et les contacts
                    recommandés.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Styles CSS pour la modal */}
      <style jsx>{`
        /* Styles de base */
        .opportunity-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(5px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease-out;
        }

        .opportunity-modal {
          background-color: white;
          border-radius: 16px;
          width: 90%;
          max-width: 1100px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          animation: slideIn 0.3s ease-out;
        }

        /* En-tête */
        .opportunity-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }

        .opportunity-modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .opportunity-modal-close {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .opportunity-modal-close:hover {
          background-color: rgba(0, 0, 0, 0.05);
          color: #111827;
        }

        /* Corps de la modal */
        .opportunity-modal-body {
          padding: 24px;
        }

        /* Section d'information sur l'actualité */
        .news-info-section {
          margin-bottom: 32px;
          background-color: rgba(0, 0, 0, 0.02);
          padding: 20px;
          border-radius: 12px;
          position: relative; /* Pour le badge d'analyse */
        }

        .news-title {
          font-size: 22px;
          font-weight: 600;
          margin: 0 0 16px 0;
          color: #111827;
        }

        .news-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .news-date {
          color: #6b7280;
        }

        .news-category {
          padding: 4px 10px;
          background-color: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border-radius: 20px;
        }

        .news-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #0071f3;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .news-link:hover {
          color: #2086f5;
          text-decoration: underline;
        }

        .news-description {
          margin: 0;
          line-height: 1.6;
          color: #4b5563;
        }

        /* Conteneur à deux colonnes */
        .offers-detail-container {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 24px;
        }

        /* Liste des offres */
        .offers-list-section {
          background-color: rgba(0, 0, 0, 0.01);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .offers-list-section h4 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #4b5563;
        }

        .offers-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .offer-item {
          background-color: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
          cursor: pointer;
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .offer-item:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .offer-item.active {
          border-color: #0071f3;
          box-shadow: 0 0 0 1px rgba(0, 113, 243, 0.5),
            0 4px 12px rgba(0, 113, 243, 0.1);
        }

        .offer-item.potential {
          border-left: 3px solid #ec4899;
        }

        .offer-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .offer-category {
          font-size: 13px;
          color: #6b7280;
        }

        .relevance-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          font-weight: 600;
          font-size: 12px;
          color: white;
        }

        .relevance-1 {
          background: linear-gradient(135deg, #9ca3af, #6b7280);
        }

        .relevance-2 {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
        }

        .relevance-3 {
          background: linear-gradient(135deg, #059669, #047857);
        }

        .offer-detail {
          margin: 0 0 16px 0;
          font-size: 15px;
          font-weight: 500;
        }

        .offer-actions {
          display: flex;
          justify-content: flex-end;
        }

        .offer-toggle-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .offer-toggle-button:not(.selected) {
          background-color: rgba(236, 72, 153, 0.1);
          color: #ec4899;
        }

        .offer-toggle-button:not(.selected):hover {
          background-color: rgba(236, 72, 153, 0.2);
        }

        .offer-toggle-button.selected {
          background-color: rgba(236, 72, 153, 0.8);
          color: white;
        }

        .offer-toggle-button.selected:hover {
          background-color: rgba(236, 72, 153, 0.9);
        }

        /* Détails de l'offre sélectionnée */
        .offer-details-section {
          background-color: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .selected-offer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .selected-offer-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #4b5563;
        }

        .selected-offer-details {
          padding: 16px;
          background-color: rgba(0, 0, 0, 0.02);
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .selected-offer-details h5 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
        }

        .offer-category-label {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #6b7280;
        }

        .potential-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background-color: rgba(236, 72, 153, 0.1);
          color: #ec4899;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        /* Contacts recommandés */
        .contact-count {
          font-size: 14px;
          color: #6b7280;
        }

        /* Contact cards */
        .contact-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          background-color: rgba(0, 0, 0, 0.01);
          transition: background-color 0.2s ease;
        }

        .contact-card:hover {
          background-color: rgba(0, 0, 0, 0.03);
        }

        .contact-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0071f3, #6d28d9);
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .contact-info {
          flex: 1;
        }

        .contact-name {
          font-size: 15px;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .contact-role {
          font-size: 13px;
          color: #6b7280;
        }

        .contact-email {
          display: block;
          font-size: 12px;
          color: #0071f3;
          text-decoration: none;
          margin-top: 4px;
        }

        .contact-email:hover {
          text-decoration: underline;
        }

        .contact-score {
          display: flex;
          align-items: center;
        }

        .contact-relevance-badge {
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .contact-relevance-badge.high {
          background-color: rgba(5, 150, 105, 0.1);
          color: #059669;
        }

        .contact-relevance-badge.medium {
          background-color: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .contact-relevance-badge.low {
          background-color: rgba(107, 114, 128, 0.1);
          color: #6b7280;
        }

        .recommended-contacts-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .recommended-contacts-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #4b5563;
        }

        .contact-department {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }

        .relevance-details {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 6px;
        }

        .relevance-tag {
          font-size: 10px;
          padding: 2px 6px;
          background-color: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
          color: #6b7280;
        }

        .import-contacts-btn {
          margin-top: 16px;
          padding: 8px 16px;
          background-color: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          color: #4b5563;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .import-contacts-btn:hover {
          background-color: #e5e7eb;
        }

        /* Contacts recommandés */
        .recommended-contacts {
          flex: 1;
        }

        .recommended-contacts h4 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          color: #4b5563;
        }

        .contacts-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 0;
          color: #6b7280;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(0, 113, 243, 0.1);
          border-radius: 50%;
          border-top-color: #0071f3;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        .matching-contacts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 400px;
          overflow-y: auto;
        }

        .contact-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          background-color: rgba(0, 0, 0, 0.01);
          transition: background-color 0.2s ease;
        }

        .contact-card:hover {
          background-color: rgba(0, 0, 0, 0.03);
        }

        .contact-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0071f3, #6d28d9);
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .contact-info {
          flex: 1;
        }

        .contact-name {
          font-size: 15px;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .contact-role {
          font-size: 13px;
          color: #6b7280;
        }

        .contact-email {
          display: block;
          font-size: 12px;
          color: #0071f3;
          text-decoration: none;
          margin-top: 4px;
        }

        .contact-email:hover {
          text-decoration: underline;
        }

        .contact-score {
          display: flex;
          align-items: center;
        }

        .contact-relevance-badge {
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .contact-relevance-badge.high {
          background-color: rgba(5, 150, 105, 0.1);
          color: #059669;
        }

        .contact-relevance-badge.medium {
          background-color: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .contact-relevance-badge.low {
          background-color: rgba(107, 114, 128, 0.1);
          color: #6b7280;
        }

        .no-contacts-message,
        .no-offer-selected {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 0;
          color: #6b7280;
          text-align: center;
        }

        .no-contacts-message svg,
        .no-offer-selected svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .no-contacts-message p,
        .no-offer-selected p {
          margin: 0;
          font-size: 14px;
        }

        /* Animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .offers-detail-container {
            grid-template-columns: 1fr;
          }

          .opportunity-modal {
            width: 100%;
            max-width: none;
            border-radius: 0;
            height: 100vh;
            max-height: 100vh;
          }
        }
      `}</style>
    </div>
  );
};

export default OpportunityModal;
