import React, { useState } from "react";
import { ExternalLinkIcon } from "./Icons";
import KeywordsList from "./KeywordsList";

/**
 * Composant pour afficher une carte d'actualité avec argumentaires de pertinence
 * @param {Object} props - Les propriétés du composant
 * @param {Object} props.news - L'actualité à afficher
 * @returns {JSX.Element} Carte d'actualité
 */
const NewsCard = ({ news }) => {
  const {
    news: title,
    newsDate,
    newsCategory,
    newsDescription,
    newsLink,
    offers,
  } = news;

  // États pour l'expansion de la carte et la sélection d'offre
  const [expanded, setExpanded] = useState(false);
  const [selectedOfferIndex, setSelectedOfferIndex] = useState(null);

  // Fonction pour déterminer si une offre a un fort potentiel commercial
  const isHighPotentialOffer = (offer) => {
    return offer.relevanceScore === 3 && !offer.hasOpportunities;
  };

  // Trouver les offres à fort potentiel commercial
  const highPotentialOffers = offers ? offers.filter(isHighPotentialOffer) : [];
  const hasHighPotential = highPotentialOffers.length > 0;

  // Fonction pour basculer l'expansion de la carte
  const toggleExpanded = () => {
    setExpanded(!expanded);
    // Réinitialiser l'offre sélectionnée lors de la fermeture
    if (expanded) {
      setSelectedOfferIndex(null);
    }
  };

  // Fonction pour gérer le clic sur une offre et afficher son argumentaire
  const handleOfferClick = (index, event) => {
    event.stopPropagation(); // Empêcher la propagation du clic à la carte
    setSelectedOfferIndex(selectedOfferIndex === index ? null : index);
  };

  // Extraction des mots-clés à partir de la catégorie
  const extractKeywords = (categoryString) => {
    if (!categoryString) return [];
    // Diviser la chaîne par virgules et nettoyer les espaces
    return categoryString.split(",").map((k) => k.trim());
  };

  // Générer un argumentaire de pertinence court et précis
  const generateRelevanceArgument = (offer) => {
    // Les argumentaires spécifiques selon le contenu de l'actualité

    // Pour l'actualité sur la fuite de données de Schneider Electric
    if (
      title.includes("fuite de données") ||
      title.includes("cybersécurité") ||
      newsCategory.includes("Cybersécurité")
    ) {
      if (
        offer.category === "Technology" &&
        offer.detail.includes("Data Security")
      ) {
        return '→ Pertinence 3/3: Fuite de données Schneider = besoin immédiat en sécurité des données.\n→ Mots-clés dans l\'article: "piratée", "ransomware", "vol de données".\n→ Opportunité: audit de sécurité et plan de remédiation.';
      }
      if (
        offer.category === "Finance & Risk" &&
        offer.detail.includes("Compliance")
      ) {
        return '→ Pertinence 3/3: Incident de sécurité = risques RGPD pour Schneider.\n→ Article mentionne: "vol de données" = obligation légale de notification.\n→ Opportunité: accompagnement conformité post-incident.';
      }
    }

    // Pour les actualités sur les data centers ou l'IA
    else if (
      title.includes("data centers") ||
      title.includes("centres de données") ||
      title.includes("IA") ||
      (newsCategory &&
        (newsCategory.includes("Data Centers") || newsCategory.includes("IA")))
    ) {
      if (
        offer.category === "Technology" &&
        offer.detail.includes("Data, Analytics")
      ) {
        return '→ Pertinence 3/3: Article mentionne "700M$ pour l\'IA" et "data centers".\n→ Besoin explicite d\'expertise en architectures de données pour l\'IA.\n→ Opportunité: conseil en data platforms pour IA générative.';
      }
    }

    // Pour les actualités sur les acquisitions/fusions
    else if (
      title.includes("acquiert") ||
      title.includes("acquisition") ||
      (newsCategory && newsCategory.includes("Acquisition"))
    ) {
      if (
        offer.category === "BE Capital" &&
        offer.detail.includes("Capital M&A")
      ) {
        return "→ Pertinence 3/3: Acquisition mentionnée.\n→ Besoin explicite d'intégration dans secteur concerné.\n→ Opportunité: conseil en intégration post-acquisition.";
      }
    }

    // Argumentaires par défaut basés sur le niveau de pertinence
    if (offer.relevanceScore === 3) {
      return `→ Pertinence 3/3: L'article traite directement de l'offre mentionnée.\n→ Mots-clés liés à notre offre ${offer.detail} présents dans l'actualité.\n→ Opportunité: proposition directe sur cette problématique prioritaire.`;
    } else if (offer.relevanceScore === 2) {
      return `→ Pertinence 2/3: L'article aborde indirectement notre domaine d'expertise.\n→ Lien identifié entre l'actualité et notre offre ${offer.detail}.\n→ Opportunité: approche complémentaire aux enjeux principaux.`;
    } else {
      return `→ Pertinence 1/3: Thématique périphérique à notre expertise.\n→ Connexion contextuelle possible avec notre offre ${offer.detail}.\n→ Opportunité: point d'entrée pour une discussion plus large.`;
    }
  };

  return (
    <div
      className={`premium-news-card ${
        hasHighPotential ? "high-potential" : ""
      }`}
      onClick={toggleExpanded}
      style={{
        cursor: "pointer",
        borderLeft: hasHighPotential ? "4px solid #ec4899" : "none",
        transition: "all 0.2s ease",
      }}
    >
      <div className="premium-news-card-content">
        {/* En-tête de la carte - Date et indicateur de potentiel */}
        <div
          className="premium-news-meta"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span className="premium-news-date">{newsDate}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Indicateur visuel discret d'opportunité de prospection */}
            {hasHighPotential && (
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: "#ec4899",
                  boxShadow: "0 0 5px rgba(236, 72, 153, 0.5)",
                }}
                title="Opportunité de prospection"
              ></div>
            )}
          </div>
        </div>

        {/* Titre de l'actualité */}
        <h3 className="premium-news-title" style={{ marginTop: "8px" }}>
          {newsLink ? (
            <a
              href={newsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="premium-news-link"
              onClick={(e) => e.stopPropagation()} // Empêcher l'expansion au clic sur le lien
            >
              {title}
              <ExternalLinkIcon className="premium-external-link-icon" />
            </a>
          ) : (
            title
          )}
        </h3>

        {/* Affichage des mots-clés */}
        <div style={{ marginTop: "12px" }}>
          <KeywordsList keywords={newsCategory} />
        </div>

        {/* Description courte (visible uniquement en mode expanded) */}
        {newsDescription && expanded && (
          <p
            className="premium-news-description"
            style={{
              marginTop: "12px",
              transition: "all 0.3s ease",
            }}
          >
            {newsDescription}
          </p>
        )}

        {/* Indicateur de prospection simplifié */}
        {hasHighPotential && !expanded && (
          <div
            style={{
              color: "#ec4899",
              fontSize: "14px",
              fontWeight: "500",
              marginTop: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 16L16 11H13V8L9 13H12V16Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Opportunité de prospection identifiée
          </div>
        )}

        {/* Indicateur d'expansion */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "12px",
            color: "var(--text-tertiary)",
          }}
        >
          {expanded ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 15L12 9L6 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* Contenu détaillé (visible uniquement en mode expanded) */}
        {expanded && offers && offers.length > 0 && (
          <div
            className="premium-offers-section"
            style={{
              marginTop: "16px",
              padding: "16px",
              backgroundColor: "rgba(0, 0, 0, 0.02)",
              borderRadius: "8px",
            }}
          >
            <h4 className="premium-section-title">
              Offres associées à cette actualité
            </h4>

            {/* Afficher d'abord les offres à fort potentiel */}
            {highPotentialOffers.length > 0 && (
              <div
                style={{
                  marginBottom: "16px",
                  marginTop: "12px",
                }}
              >
                <h5
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    marginBottom: "8px",
                    color: "#ec4899",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 16L16 11H13V8L9 13H12V16Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Offres à fort potentiel de prospection
                </h5>

                {highPotentialOffers.map((offer, index) => {
                  const offerIndex = offers.indexOf(offer);
                  const isSelected = selectedOfferIndex === offerIndex;

                  return (
                    <div
                      key={`high-potential-${index}`}
                      onClick={(e) => handleOfferClick(offerIndex, e)}
                      style={{
                        padding: "12px",
                        marginBottom: "8px",
                        backgroundColor: "white",
                        borderRadius: "8px",
                        borderLeft: "3px solid #ec4899",
                        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        transform: isSelected ? "translateX(4px)" : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span style={{ fontWeight: "600" }}>
                          {offer.category}
                        </span>
                        <div
                          className={`premium-relevance-badge relevance-${offer.relevanceScore}`}
                          title="Niveau de pertinence"
                        >
                          {offer.relevanceScore}
                        </div>
                      </div>
                      <div style={{ marginBottom: "8px" }}>{offer.detail}</div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#ec4899",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Aucun projet en cours - Potentiel business inexploité
                      </div>

                      {/* Argumentaire de pertinence - visible uniquement lorsque l'offre est sélectionnée */}
                      {isSelected && (
                        <div
                          style={{
                            marginTop: "12px",
                            padding: "12px",
                            backgroundColor: "rgba(236, 72, 153, 0.05)",
                            borderRadius: "6px",
                            border: "1px dashed rgba(236, 72, 153, 0.2)",
                            fontSize: "13px",
                            animation: "fadeIn 0.3s ease",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginBottom: "8px",
                              fontWeight: "600",
                              color: "#111827",
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M21 11.5C21 16.75 16.75 21 11.5 21C6.25 21 2 16.75 2 11.5C2 6.25 6.25 2 11.5 2"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M22 22L20 20"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M15.5 8H15.51"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M17.5 5C18.3284 5 19 4.32843 19 3.5C19 2.67157 18.3284 2 17.5 2C16.6716 2 16 2.67157 16 3.5C16 4.32843 16.6716 5 17.5 5Z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Argumentaire de pertinence
                          </div>
                          {generateRelevanceArgument(offer)}
                        </div>
                      )}

                      {/* Indicateur discret de clic */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginTop: "8px",
                          fontSize: "12px",
                          color: "var(--text-tertiary)",
                          fontStyle: "italic",
                        }}
                      >
                        {isSelected
                          ? "Cliquez pour masquer l'argumentaire"
                          : "Cliquez pour afficher l'argumentaire"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Afficher ensuite les autres offres dans un format plus compact */}
            {offers.filter((offer) => !isHighPotentialOffer(offer)).length >
              0 && (
              <>
                <h5
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    marginBottom: "8px",
                    marginTop: "16px",
                    color: "var(--text-secondary)",
                  }}
                >
                  Autres offres associées
                </h5>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  {offers
                    .filter((offer) => !isHighPotentialOffer(offer))
                    .map((offer, index) => {
                      const offerIndex = offers.indexOf(offer);
                      const isSelected = selectedOfferIndex === offerIndex;

                      return (
                        <div
                          key={index}
                          onClick={(e) => handleOfferClick(offerIndex, e)}
                          style={{
                            padding: "10px",
                            backgroundColor: "white",
                            borderRadius: "8px",
                            fontSize: "13px",
                            cursor: "pointer",
                            border: isSelected
                              ? "1px solid rgba(59, 130, 246, 0.3)"
                              : "1px solid transparent",
                            boxShadow: isSelected
                              ? "0 2px 12px rgba(59, 130, 246, 0.1)"
                              : "none",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "6px",
                            }}
                          >
                            <span style={{ fontWeight: "500" }}>
                              {offer.category}
                            </span>
                            <div
                              className={`premium-relevance-badge relevance-${offer.relevanceScore}`}
                              style={{ transform: "scale(0.8)" }}
                            >
                              {offer.relevanceScore}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {offer.detail}
                          </div>

                          {/* Marqueur discret indiquant qu'on peut cliquer */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              marginTop: "6px",
                              fontSize: "11px",
                              color: "var(--text-tertiary)",
                              fontStyle: "italic",
                            }}
                          >
                            {isSelected ? "Masquer" : "Argumentaire"}
                          </div>

                          {/* Argumentaire de pertinence - visible uniquement lorsque sélectionné */}
                          {isSelected && (
                            <div
                              style={{
                                marginTop: "8px",
                                padding: "8px",
                                backgroundColor: "rgba(59, 130, 246, 0.05)",
                                borderRadius: "6px",
                                border: "1px dashed rgba(59, 130, 246, 0.2)",
                                fontSize: "12px",
                                animation: "fadeIn 0.3s ease",
                              }}
                            >
                              {generateRelevanceArgument(offer)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Style pour l'animation d'apparition */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default NewsCard;
