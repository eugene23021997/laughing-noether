// src/components/NewsCard.js - Version modifiée pour mettre en évidence les analyses Claude

import React, { useState, useEffect } from "react";
import { prospectionService } from "../services/prospectionService";
import OpportunityModal from "./OpportunityModal";

/**
 * Composant pour afficher une carte d'actualité avec possibilité de voir les détails des opportunités
 * Version améliorée: mise en évidence des analyses Claude
 *
 * @param {Object} props - Les propriétés du composant
 * @param {Object} props.news - L'actualité à afficher
 * @param {Array} props.contacts - Liste des contacts disponibles
 * @returns {JSX.Element} Carte d'actualité
 */
const NewsCard = ({ news, contacts = [] }) => {
  const {
    news: title,
    newsDate,
    newsCategory,
    newsDescription,
    newsLink,
    offers,
    analyzed, // Propriété indiquant si l'article a été analysé par Claude
    insights, // Insights générés par Claude
  } = news;

  // État pour le modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // État pour les offres sélectionnées comme opportunités de prospection
  const [selectedOpportunities, setSelectedOpportunities] = useState([]);

  // Récupérer les opportunités sélectionnées et vérifier si nos offres sont dedans
  useEffect(() => {
    const checkSelectedOpportunities = () => {
      if (!offers) return;

      const currentlySelected = prospectionService.getSelectedOpportunities();

      const selectedOffers = offers.filter((offer) =>
        currentlySelected.some(
          (opp) =>
            opp.category === offer.category && opp.detail === offer.detail
        )
      );

      setSelectedOpportunities(
        selectedOffers.map((offer) => ({
          category: offer.category,
          detail: offer.detail,
        }))
      );
    };

    // Vérifier les opportunités déjà sélectionnées
    checkSelectedOpportunities();

    // S'abonner aux changements futurs
    const unsubscribe = prospectionService.subscribe(() => {
      checkSelectedOpportunities();
    });

    return () => unsubscribe();
  }, [offers]);

  // Fonction pour déterminer si une offre a un fort potentiel commercial
  const isHighPotentialOffer = (offer) => {
    return offer.relevanceScore === 3 && !offer.hasOpportunities;
  };

  // Trouver les offres à fort potentiel commercial
  const highPotentialOffers = offers ? offers.filter(isHighPotentialOffer) : [];
  const hasHighPotential = highPotentialOffers.length > 0;

  // Déterminer le niveau de potentiel global de l'actualité
  const getOverallPotential = () => {
    if (!offers || offers.length === 0) return 0;

    // Si au moins une offre a un fort potentiel (score 3 sans opportunités existantes)
    if (hasHighPotential) return 3;

    // Si au moins une offre a un score de 3 (mais avec opportunités existantes)
    if (offers.some((offer) => offer.relevanceScore === 3)) return 2;

    // Si au moins une offre a un score de 2
    if (offers.some((offer) => offer.relevanceScore === 2)) return 1;

    // Sinon potentiel minimal
    return 0;
  };

  const overallPotential = getOverallPotential();

  // Compter combien d'offres sont sélectionnées
  const selectedCount = selectedOpportunities.length;

  // Ouvrir la fenêtre modale
  const openModal = () => {
    setIsModalOpen(true);
  };

  // Extraire et limiter les mots-clés à 3 maximum
  const getKeywords = (categoryString) => {
    if (!categoryString) return [];
    // Diviser la chaîne par virgules, nettoyer les espaces et limiter à 3
    return categoryString
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .slice(0, 3);
  };

  // Vérifier si l'article a été analysé par Claude
  const hasClaudeAnalysis = analyzed && insights;

  return (
    <>
      <div
        className={`premium-news-card ${
          hasHighPotential ? "high-potential" : ""
        } ${hasClaudeAnalysis ? "claude-analyzed" : ""}`}
        style={{
          cursor: "pointer",
          borderLeft: hasHighPotential ? "4px solid #ec4899" : 
                     hasClaudeAnalysis ? "4px solid #6366f1" : "none",
          transition: "all 0.3s ease",
          position: "relative",
          overflow: "hidden",
        }}
        onClick={openModal}
      >
        {/* Indicateur d'analyse Claude */}
        {hasClaudeAnalysis && (
          <div className="claude-indicator">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#6366f1" strokeWidth="2" />
              <path d="M12 16L16 11H13V8L9 13H12V16Z" stroke="#6366f1" strokeWidth="2" />
            </svg>
            <span>Analysé par Claude</span>
          </div>
        )}

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

            {/* Indicateurs visuels */}
            <div
              className="premium-indicators"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              {/* Badge du nombre d'offres sélectionnées */}
              {selectedCount > 0 && (
                <div
                  style={{
                    backgroundColor: "rgba(236, 72, 153, 0.8)",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: "600",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 5px rgba(236, 72, 153, 0.5)",
                  }}
                  title={`${selectedCount} offre(s) sélectionnée(s)`}
                >
                  {selectedCount}
                </div>
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
                <svg
                  className="premium-external-link-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15 3h6v6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 14L21 3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            ) : (
              title
            )}
          </h3>

          {/* Affichage des mots-clés simplifiés - limités à 3 */}
          {newsCategory && (
            <div style={{ marginTop: "12px" }}>
              <div className="premium-keywords-container">
                {getKeywords(newsCategory).map((keyword, idx) => (
                  <span
                    key={idx}
                    className="premium-keyword-badge"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.05)",
                      color: "var(--text-secondary)",
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Résumé Claude si disponible */}
          {hasClaudeAnalysis && insights.summary && (
            <div className="claude-summary">
              <p>{insights.summary}</p>
            </div>
          )}

          {/* Description courte (aperçu) si pas d'analyse Claude */}
          {!hasClaudeAnalysis && newsDescription && (
            <p
              className="premium-news-description"
              style={{
                marginTop: "12px",
                display: "-webkit-box",
                WebkitLineClamp: "2",
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {newsDescription}
            </p>
          )}

          {/* Indicateur du nombre d'offres associées avec niveau de pertinence */}
          {offers && offers.length > 0 && (
            <div
              className="news-offers-summary"
              style={{
                marginTop: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{ fontSize: "14px", color: "var(--text-secondary)" }}
                >
                  {offers.length} offre{offers.length > 1 ? "s" : ""} associée
                  {offers.length > 1 ? "s" : ""}
                </span>

                {overallPotential > 0 && (
                  <div
                    className="pertinence-label"
                    style={{
                      fontSize: "13px",
                      color:
                        overallPotential === 3
                          ? "#059669"
                          : overallPotential === 2
                          ? "#3b82f6"
                          : "#6b7280",
                    }}
                  >
                    {overallPotential === 3
                      ? "Très pertinent"
                      : overallPotential === 2
                      ? "Pertinent"
                      : "Légèrement pertinent"}
                  </div>
                )}
              </div>

              {hasHighPotential && (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#ec4899",
                    backgroundColor: "rgba(236, 72, 153, 0.1)",
                    padding: "4px 10px",
                    borderRadius: "12px",
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
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  Opportunité à fort potentiel d'acquisition
                </div>
              )}
            </div>
          )}

          {/* Bouton "Voir détails" */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "16px",
              color: "var(--text-tertiary)",
            }}
          >
            <button
              style={{
                background: "none",
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--text-tertiary)",
                fontSize: "13px",
                cursor: "pointer",
                padding: "6px 12px",
                borderRadius: "6px",
                transition: "all 0.2s ease",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line
                  x1="12"
                  y1="8"
                  x2="12"
                  y2="16"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <line
                  x1="8"
                  y1="12"
                  x2="16"
                  y2="12"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              Voir détails
            </button>
          </div>
        </div>
      </div>

      {/* Modal pour les détails d'opportunité */}
      <OpportunityModal
        newsData={news}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contacts={contacts}
      />

      {/* Styles spécifiques pour les cartes analysées par Claude */}
      <style jsx>{`
        .premium-news-card {
          transition: all 0.3s ease;
        }

        .premium-news-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }

        .premium-news-card.high-potential {
          box-shadow: 0 0 20px rgba(236, 72, 153, 0.15);
        }

        .premium-news-card.high-potential:hover {
          box-shadow: 0 8px 25px rgba(236, 72, 153, 0.2);
        }
        
        .premium-news-card.claude-analyzed {
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.15);
          background: linear-gradient(to right, rgba(99, 102, 241, 0.03), transparent);
        }
        
        .premium-news-card.claude-analyzed:hover {
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.2);
        }
        
        .claude-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background-color: rgba(99, 102, 241, 0.1);
          border-radius: 20px;
          position: absolute;
          top: 12px;
          right: 12px;
          font-size: 12px;
          font-weight: 500;
          color: #6366f1;
        }
        
        .claude-summary {
          margin-top: 12px;
          padding: 12px;
          background-color: rgba(99, 102, 241, 0.05);
          border-radius: 8px;
          border-left: 3px solid #6366f1;
        }
        
        .claude-summary p {
          margin: 0;
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.5;
          font-style: italic;
        }
      `}</style>
    </>
  );
};

export default NewsCard;
