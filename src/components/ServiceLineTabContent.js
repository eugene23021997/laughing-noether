import React, { useState, useMemo, useEffect } from "react";
import { InfoIcon } from "./Icons";
import { prospectionService } from "../services/prospectionService";
import OpportunityModal from "./OpportunityModal";

/**
 * Composant pour afficher l'onglet des lignes de service et leurs actualités associées
 * Modifié pour utiliser le système de fenêtre modale au lieu des dépliants synchronisés
 *
 * @param {Object} props - Les propriétés du composant
 * @param {Object} props.data - Les données de l'application
 * @param {Object} props.combinedRelevanceMatrix - Matrice de pertinence combinée
 * @param {string} props.selectedOffer - Offre sélectionnée
 * @param {function} props.setSelectedOffer - Fonction pour définir l'offre sélectionnée
 * @param {number} props.relevanceFilter - Filtre de pertinence
 * @param {Object} props.opportunitiesByOffering - Opportunités existantes par offre
 * @param {Array} props.contacts - Liste des contacts disponibles
 * @returns {JSX.Element} Contenu de l'onglet Service Lines
 */
const ServiceLineTabContent = ({
  data,
  combinedRelevanceMatrix,
  selectedOffer,
  setSelectedOffer,
  relevanceFilter,
  opportunitiesByOffering = {},
  contacts = [],
}) => {
  // États pour les lignes de service et offres développées
  const [expandedServiceLine, setExpandedServiceLine] = useState(null);
  const [expandedOffer, setExpandedOffer] = useState(null);

  // État pour la modal et l'opportunité sélectionnée
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  // État pour les opportunités sélectionnées
  const [selectedOpportunities, setSelectedOpportunities] = useState([]);

  // S'abonner aux changements d'opportunités sélectionnées
  useEffect(() => {
    // Obtenir les opportunités déjà sélectionnées
    setSelectedOpportunities(prospectionService.getSelectedOpportunities());

    // S'abonner aux futurs changements
    const unsubscribe = prospectionService.subscribe((opportunities) => {
      setSelectedOpportunities(opportunities);
    });

    // Se désabonner lors du démontage du composant
    return () => unsubscribe();
  }, []);

  // Vérifier si une offre a des opportunités existantes
  const checkHasOpportunities = (offerDetail, opportunitiesByOffering) => {
    const offerDetails = offerDetail.split(", ");

    return offerDetails.some((detail) => {
      const matchingOffering = Object.keys(opportunitiesByOffering).find(
        (key) => key.includes(detail) || detail.includes(key)
      );

      return (
        matchingOffering &&
        opportunitiesByOffering[matchingOffering] &&
        opportunitiesByOffering[matchingOffering].length > 0
      );
    });
  };

  /**
   * Fonction pour regrouper les actualités par offre
   * @returns {Object} Actualités regroupées par ligne de service et offre
   */
  const getNewsByOffering = () => {
    const result = {};

    // Initialiser toutes les lignes de service et offres
    Object.entries(data.completeServiceLines).forEach(
      ([serviceLine, offerings]) => {
        if (!result[serviceLine]) {
          result[serviceLine] = {
            news: [],
            offerings: {},
          };
        }

        offerings.forEach((offering) => {
          result[serviceLine].offerings[offering] = {
            news: [],
          };
        });
      }
    );

    // Remplir avec les actualités correspondantes depuis la matrice de pertinence
    combinedRelevanceMatrix.forEach((item) => {
      if (item.relevanceScore >= relevanceFilter) {
        const offerCategories = [item.offerCategory];
        const offerDetails = item.offerDetail.split(", ");

        offerCategories.forEach((category) => {
          if (result[category]) {
            // Ajouter l'actualité à la ligne de service
            const newsForServiceLine = result[category].news;
            if (!newsForServiceLine.some((news) => news.news === item.news)) {
              newsForServiceLine.push({
                news: item.news,
                newsDate: item.newsDate,
                newsCategory: item.newsCategory,
                newsDescription: item.newsDescription,
                newsLink: item.newsLink,
                relevanceScore: item.relevanceScore,
                offers: [
                  {
                    category: item.offerCategory,
                    detail: item.offerDetail,
                    relevanceScore: item.relevanceScore,
                    // Vérifier si l'offre a des opportunités existantes
                    hasOpportunities: checkHasOpportunities(
                      item.offerDetail,
                      opportunitiesByOffering
                    ),
                  },
                ],
              });
            }

            // Ajouter l'actualité aux offres spécifiques
            offerDetails.forEach((detail) => {
              const matchingOfferings = Object.keys(
                result[category].offerings
              ).filter(
                (offering) =>
                  offering.includes(detail) || detail.includes(offering)
              );

              matchingOfferings.forEach((offering) => {
                const newsForOffering =
                  result[category].offerings[offering].news;
                if (!newsForOffering.some((news) => news.news === item.news)) {
                  newsForOffering.push({
                    news: item.news,
                    newsDate: item.newsDate,
                    newsCategory: item.newsCategory,
                    newsDescription: item.newsDescription,
                    newsLink: item.newsLink,
                    relevanceScore: item.relevanceScore,
                    offers: [
                      {
                        category: item.offerCategory,
                        detail: item.offerDetail,
                        relevanceScore: item.relevanceScore,
                        // Vérifier si l'offre a des opportunités existantes
                        hasOpportunities: checkHasOpportunities(
                          item.offerDetail,
                          opportunitiesByOffering
                        ),
                      },
                    ],
                  });
                }
              });
            });
          }
        });
      }
    });

    return result;
  };

  // Obtenir les actualités regroupées par ligne de service et offre
  const newsByOffering = getNewsByOffering();

  /**
   * Fonction pour trier les actualités par date (de la plus récente à la plus ancienne)
   * @param {Array} news - Liste d'actualités à trier
   * @returns {Array} Liste d'actualités triées par date
   */
  const sortNewsByDate = (news) => {
    return [...news].sort((a, b) => {
      // Utiliser directement Date pour convertir les chaînes de date
      const dateA = new Date(a.newsDate);
      const dateB = new Date(b.newsDate);

      return dateB - dateA; // Ordre chronologique inversé
    });
  };

  // Vérifier si une offre est déjà sélectionnée comme opportunité
  const isOfferingSelected = (offering, newsItem) => {
    return selectedOpportunities.some(
      (opp) =>
        opp.category === newsItem.offers[0].category && opp.detail === offering
    );
  };

  // Vérifier si une offre a un potentiel de prospection (score 3 et pas d'opportunités)
  const hasProspectionPotential = (newsItem, offering) => {
    if (!newsItem || !newsItem.offers || newsItem.offers.length === 0)
      return false;

    // Vérifier si l'actualité a un score de pertinence de 3
    const relevanceScore =
      newsItem.relevanceScore || newsItem.offers[0].relevanceScore;
    if (relevanceScore !== 3) return false;

    // Vérifier si l'offre a des opportunités existantes
    const hasExistingOpportunities = Object.keys(opportunitiesByOffering).some(
      (key) => {
        const isMatchingOffering =
          key === offering || key.includes(offering) || offering.includes(key);
        return (
          isMatchingOffering &&
          opportunitiesByOffering[key] &&
          opportunitiesByOffering[key].length > 0
        );
      }
    );

    return !hasExistingOpportunities;
  };

  // Ouvrir le modal pour une offre et une actualité
  const openOpportunityModal = (offering, newsItem) => {
    // Préparer les données de l'opportunité
    const opportunityData = {
      category: newsItem.offers[0].category,
      detail: offering,
      news: newsItem.news,
      newsDate: newsItem.newsDate,
      newsDescription: newsItem.newsDescription,
      newsLink: newsItem.newsLink,
      relevanceScore: newsItem.relevanceScore,
    };

    setSelectedOpportunity(opportunityData);
    setIsModalOpen(true);
  };

  return (
    <div className="premium-service-lines-content">
      <h2 className="premium-section-title">
        Lignes de service et offres avec leurs actualités associées
      </h2>

      {/* Afficher les lignes de service et leurs offres */}
      {Object.entries(newsByOffering)
        .filter(([serviceLine, _]) => {
          return selectedOffer === "all" || serviceLine === selectedOffer;
        })
        .map(([serviceLine, serviceLineData]) => (
          <div
            key={serviceLine}
            className="premium-service-line-card"
            style={{
              marginBottom: "24px",
              backgroundColor: "var(--glass-bg)",
              backdropFilter: "blur(15px)",
              WebkitBackdropFilter: "blur(15px)",
              borderRadius: "var(--border-radius-lg)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--glass-shadow-md)",
              overflow: "hidden",
            }}
          >
            {/* En-tête de la ligne de service */}
            <div
              className="premium-service-line-header"
              style={{
                padding: "16px",
                borderBottom: "1px solid var(--divider)",
                cursor: "pointer",
                backgroundColor:
                  expandedServiceLine === serviceLine
                    ? "rgba(0, 113, 243, 0.05)"
                    : "transparent",
                transition: "background-color 0.2s ease",
              }}
              onClick={() =>
                setExpandedServiceLine(
                  expandedServiceLine === serviceLine ? null : serviceLine
                )
              }
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <svg
                    style={{
                      width: "16px",
                      height: "16px",
                      transition: "transform 0.2s ease",
                      transform:
                        expandedServiceLine === serviceLine
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
                    }}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 18L15 12L9 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {serviceLine}
                </h3>

                {/* Badge indiquant le nombre d'actualités */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                  }}
                >
                  <span>
                    {serviceLineData.news.length} actualité
                    {serviceLineData.news.length !== 1 ? "s" : ""}
                  </span>
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor:
                        serviceLineData.news.length > 0
                          ? "var(--success)"
                          : "var(--warning)",
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Contenu de la ligne de service (visible si développé) */}
            {expandedServiceLine === serviceLine && (
              <div
                className="premium-service-line-content"
                style={{ padding: "16px" }}
              >
                {/* Afficher les actualités associées à la ligne de service */}
                {serviceLineData.news.length > 0 ? (
                  <div style={{ marginBottom: "24px" }}>
                    <h4
                      style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        marginBottom: "16px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Actualités associées à {serviceLine}
                    </h4>
                    <div className="premium-news-list">
                      {sortNewsByDate(serviceLineData.news).map(
                        (newsItem, index) => (
                          <div
                            key={`${serviceLine}-news-${index}`}
                            className="premium-news-item"
                          >
                            <div className="premium-news-item-header">
                              <span className="premium-news-date">
                                {newsItem.newsDate}
                              </span>
                              <div
                                className={`premium-relevance-badge relevance-${newsItem.relevanceScore}`}
                              >
                                {newsItem.relevanceScore}
                              </div>
                            </div>
                            <h3 className="premium-news-title">
                              {newsItem.newsLink ? (
                                <a
                                  href={newsItem.newsLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="premium-news-link"
                                >
                                  {newsItem.news}
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
                                newsItem.news
                              )}
                            </h3>
                            {newsItem.newsDescription && (
                              <p className="premium-news-description">
                                {newsItem.newsDescription}
                              </p>
                            )}
                            {newsItem.offers && newsItem.offers.length > 0 && (
                              <div className="premium-news-offers">
                                <h5>Offres associées:</h5>
                                <div className="premium-offers-chips">
                                  {newsItem.offers.map((offer, offerIdx) => {
                                    const offerDetails =
                                      offer.detail.split(", ");
                                    return offerDetails.map(
                                      (detail, detailIdx) => (
                                        <button
                                          key={`${offerIdx}-${detailIdx}`}
                                          className={`premium-offer-chip ${
                                            offer.relevanceScore === 3 &&
                                            !offer.hasOpportunities
                                              ? "high-potential"
                                              : ""
                                          }`}
                                          onClick={() =>
                                            openOpportunityModal(
                                              detail,
                                              newsItem
                                            )
                                          }
                                        >
                                          {detail}
                                        </button>
                                      )
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "16px",
                      backgroundColor: "var(--warning-light)",
                      borderRadius: "var(--border-radius)",
                      marginBottom: "24px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <InfoIcon />
                    <span>
                      Aucune actualité n'est associée à cette ligne de service
                      selon les critères de filtrage actuels.
                    </span>
                  </div>
                )}

                {/* Afficher les offres de cette ligne de service */}
                <h4
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    marginBottom: "16px",
                    color: "var(--text-secondary)",
                  }}
                >
                  Offres de {serviceLine}
                </h4>

                <div className="premium-offerings-grid">
                  {Object.entries(serviceLineData.offerings).map(
                    ([offering, offeringData]) => {
                      // Vérifier si cette offre a des opportunités de prospection
                      const hasOpportunities = offeringData.news.some(
                        (newsItem) =>
                          hasProspectionPotential(newsItem, offering)
                      );

                      return (
                        <div
                          key={offering}
                          className={`premium-offering-card ${
                            hasOpportunities ? "with-opportunities" : ""
                          }`}
                          onClick={() =>
                            setExpandedOffer(
                              expandedOffer === offering ? null : offering
                            )
                          }
                        >
                          <div className="premium-offering-header">
                            <h3>{offering}</h3>
                            <div className="premium-offering-badges">
                              {hasOpportunities && (
                                <div className="premium-opportunity-badge">
                                  Opportunité
                                </div>
                              )}
                              <div className="premium-news-count-badge">
                                {offeringData.news.length} actualité
                                {offeringData.news.length !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>

                          {expandedOffer === offering && (
                            <div className="premium-offering-content">
                              {offeringData.news.length > 0 ? (
                                <div className="premium-offering-news-list">
                                  {sortNewsByDate(offeringData.news).map(
                                    (newsItem, newsIdx) => (
                                      <div
                                        key={newsIdx}
                                        className="premium-offering-news-item"
                                      >
                                        <div className="premium-offering-news-header">
                                          <span className="premium-news-date">
                                            {newsItem.newsDate}
                                          </span>
                                          <div
                                            className={`premium-relevance-badge relevance-${newsItem.relevanceScore}`}
                                          >
                                            {newsItem.relevanceScore}
                                          </div>
                                        </div>

                                        <h4 className="premium-offering-news-title">
                                          {newsItem.news}
                                        </h4>

                                        {hasProspectionPotential(
                                          newsItem,
                                          offering
                                        ) && (
                                          <button
                                            className={`premium-opportunity-button ${
                                              isOfferingSelected(
                                                offering,
                                                newsItem
                                              )
                                                ? "selected"
                                                : ""
                                            }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openOpportunityModal(
                                                offering,
                                                newsItem
                                              );
                                            }}
                                          >
                                            {isOfferingSelected(
                                              offering,
                                              newsItem
                                            ) ? (
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
                                                Opportunité sélectionnée
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
                                                  <path d="M12 16L16 11H13V8L9 13H12V16Z"></path>
                                                </svg>
                                                Voir cette opportunité
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <div className="premium-empty-news">
                                  <InfoIcon />
                                  <span>
                                    Aucune actualité associée à cette offre
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

      {/* Message si aucune ligne de service ne correspond aux filtres */}
      {Object.keys(newsByOffering).filter(
        (serviceLine) =>
          selectedOffer === "all" || serviceLine === selectedOffer
      ).length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 8v4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 16h.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="empty-state-text">
            Aucune ligne de service ne correspond à vos critères de recherche.
            <br />
            <small>
              Essayez de modifier vos filtres ou de rafraîchir les actualités.
            </small>
          </div>
        </div>
      )}

      {/* Modal pour l'opportunité sélectionnée */}
      <OpportunityModal
        opportunity={selectedOpportunity}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOpportunity(null);
        }}
        contacts={contacts}
      />

      {/* Styles pour les nouvelles interfaces */}
      <style jsx>{`
        .premium-news-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .premium-news-item {
          background-color: rgba(255, 255, 255, 0.7);
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }

        .premium-news-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        }

        .premium-news-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .premium-news-date {
          font-size: 13px;
          color: var(--text-tertiary);
        }

        .premium-news-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 12px 0;
        }

        .premium-news-description {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0 0 12px 0;
          line-height: 1.5;
        }

        .premium-news-offers h5 {
          font-size: 13px;
          font-weight: 500;
          margin: 0 0 8px 0;
          color: var(--text-tertiary);
        }

        .premium-offers-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .premium-offer-chip {
          padding: 6px 12px;
          background-color: rgba(0, 0, 0, 0.05);
          border: none;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .premium-offer-chip:hover {
          background-color: rgba(0, 0, 0, 0.08);
          transform: translateY(-1px);
        }

        .premium-offer-chip.high-potential {
          background-color: rgba(236, 72, 153, 0.1);
          color: #ec4899;
        }

        .premium-offer-chip.high-potential:hover {
          background-color: rgba(236, 72, 153, 0.15);
          box-shadow: 0 2px 5px rgba(236, 72, 153, 0.1);
        }

        .premium-offerings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .premium-offering-card {
          background-color: rgba(255, 255, 255, 0.7);
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          padding: 16px;
          transition: all 0.2s ease;
          cursor: pointer;
          overflow: hidden;
        }

        .premium-offering-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        }

        .premium-offering-card.with-opportunities {
          border-left: 3px solid #ec4899;
        }

        .premium-offering-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .premium-offering-header h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
        }

        .premium-offering-badges {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .premium-opportunity-badge {
          padding: 4px 8px;
          background-color: rgba(236, 72, 153, 0.1);
          color: #ec4899;
          border-radius: 16px;
          font-size: 11px;
          font-weight: 500;
        }

        .premium-news-count-badge {
          font-size: 11px;
          color: var(--text-tertiary);
        }

        .premium-offering-content {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
        }

        .premium-offering-news-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .premium-offering-news-item {
          padding: 12px;
          background-color: rgba(0, 0, 0, 0.02);
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .premium-offering-news-item:hover {
          background-color: rgba(0, 0, 0, 0.03);
        }

        .premium-offering-news-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .premium-offering-news-title {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 500;
        }

        .premium-opportunity-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: rgba(236, 72, 153, 0.1);
          color: #ec4899;
        }

        .premium-opportunity-button:hover {
          background-color: rgba(236, 72, 153, 0.2);
          transform: translateY(-1px);
        }

        .premium-opportunity-button.selected {
          background-color: rgba(236, 72, 153, 0.8);
          color: white;
        }

        .premium-opportunity-button.selected:hover {
          background-color: rgba(236, 72, 153, 0.9);
        }

        .premium-empty-news {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background-color: rgba(0, 0, 0, 0.02);
          border-radius: 8px;
          font-size: 13px;
          color: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
};

export default ServiceLineTabContent;
