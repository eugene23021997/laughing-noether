import React, { useState, useEffect, useMemo } from "react";
import LoadingSpinner from "./LoadingSpinner";

/**
 * Composant pour afficher une table de contacts avec possibilité d'extraction
 */
const ContactsTable = ({ contacts, opportunity, onExport }) => {
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Mettre à jour la sélection de tous les contacts
  useEffect(() => {
    if (selectAll) {
      setSelectedContacts(contacts.map(contact => contact.fullName || contact.name || ""));
    } else if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    }
  }, [selectAll, contacts]);

  // Gérer la sélection/désélection d'un contact
  const handleToggleContact = (contactName) => {
    if (selectedContacts.includes(contactName)) {
      setSelectedContacts(selectedContacts.filter(name => name !== contactName));
    } else {
      setSelectedContacts([...selectedContacts, contactName]);
    }
  };

  // Gérer l'extraction des contacts sélectionnés
  const handleExport = () => {
    const contactsToExport = contacts.filter(contact => 
      selectedContacts.includes(contact.fullName || contact.name || "")
    );
    onExport(contactsToExport, opportunity);
  };

  // Obtenir une couleur pour le badge de pertinence
  const getScoreColor = (score) => {
    if (score > 0.8) return "#059669"; // vert
    if (score > 0.6) return "#0071f3"; // bleu
    if (score > 0.4) return "#f59e0b"; // orange
    return "#6b7280"; // gris
  };

  // Obtenir un label pour le score de pertinence
  const getScoreLabel = (score) => {
    const scorePercent = Math.round(score * 100);
    if (scorePercent > 80) return "Parfait";
    if (scorePercent > 60) return "Élevé";
    if (scorePercent > 40) return "Moyen";
    return "Basique";
  };

  return (
    <div
      style={{
        backgroundColor: "var(--glass-bg)",
        backdropFilter: "blur(15px)",
        WebkitBackdropFilter: "blur(15px)",
        borderRadius: "var(--border-radius-lg)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--glass-shadow-md)",
        overflow: "hidden",
        marginBottom: "24px",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
            <th style={{ width: "40px", padding: "12px 8px", textAlign: "center" }}>
              <input
                type="checkbox"
                checked={selectAll}
                onChange={() => setSelectAll(!selectAll)}
                style={{
                  width: "18px",
                  height: "18px",
                  cursor: "pointer",
                  accentColor: "var(--primary)",
                }}
              />
            </th>
            <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "var(--text-tertiary)" }}>
              Nom
            </th>
            <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "var(--text-tertiary)" }}>
              Fonction
            </th>
            <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "var(--text-tertiary)" }}>
              Email
            </th>
            <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "var(--text-tertiary)", width: "100px" }}>
              Pertinence
            </th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact, index) => {
            const contactName = contact.fullName || contact.name || "";
            const isSelected = selectedContacts.includes(contactName);
            const scoreColor = getScoreColor(contact.relevanceScore);
            const scoreLabel = getScoreLabel(contact.relevanceScore);
            const scorePercent = Math.round(contact.relevanceScore * 100);
            
            return (
              <tr 
                key={index} 
                style={{ 
                  borderTop: "1px solid var(--divider)",
                  backgroundColor: isSelected ? "rgba(0, 113, 243, 0.05)" : "transparent",
                  transition: "background-color 0.2s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = isSelected 
                    ? "rgba(0, 113, 243, 0.08)" 
                    : "rgba(0, 0, 0, 0.01)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = isSelected 
                    ? "rgba(0, 113, 243, 0.05)" 
                    : "transparent";
                }}
              >
                <td style={{ padding: "12px 8px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleContact(contactName)}
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                      accentColor: "var(--primary)",
                    }}
                  />
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}99)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "14px",
                        fontWeight: "600",
                      }}
                    >
                      {contactName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: "500", color: "var(--text-primary)" }}>
                        {contactName}
                      </div>
                      {contact.department && (
                        <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                          {contact.department}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: "14px", color: "var(--text-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {contact.role || "Non spécifié"}
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {contact.email ? (
                    <a
                      href={`mailto:${contact.email}`}
                      style={{
                        color: "var(--primary)",
                        textDecoration: "none",
                        fontSize: "13px",
                        fontFamily: "monospace",
                      }}
                    >
                      {contact.email}
                    </a>
                  ) : (
                    <span style={{ fontSize: "13px", color: "var(--text-tertiary)", fontStyle: "italic" }}>
                      Non disponible
                    </span>
                  )}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 8px",
                      borderRadius: "var(--border-radius-full)",
                      backgroundColor: `${scoreColor}15`,
                      border: `1px solid ${scoreColor}30`,
                      color: scoreColor,
                      fontSize: "12px",
                      fontWeight: "500",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span>{scorePercent}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Actions pour la table */}
      <div 
        style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "12px 16px", 
          borderTop: "1px solid var(--divider)",
          backgroundColor: "rgba(0, 0, 0, 0.01)"
        }}
      >
        <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          {selectedContacts.length} sur {contacts.length} contacts sélectionnés
        </div>
        <button
          onClick={handleExport}
          disabled={selectedContacts.length === 0}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            backgroundColor: selectedContacts.length === 0 ? "rgba(0, 0, 0, 0.05)" : "var(--primary-light)",
            color: selectedContacts.length === 0 ? "var(--text-tertiary)" : "var(--primary)",
            border: selectedContacts.length === 0 
              ? "1px solid rgba(0, 0, 0, 0.1)" 
              : "1px solid rgba(0, 113, 243, 0.2)",
            borderRadius: "var(--border-radius)",
            fontWeight: "500",
            fontSize: "13px",
            cursor: selectedContacts.length === 0 ? "default" : "pointer",
            transition: "all 0.2s ease",
          }}
        >
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Extraire {selectedContacts.length > 0 ? selectedContacts.length : ""} contact{selectedContacts.length > 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
};

/**
 * Composant pour afficher une carte d'opportunité sans contacts
 */
const EmptyStateCard = ({ opportunity, message, actionButton = null }) => {
  // Style de carte basé sur le score de pertinence
  const getBorderColor = () => {
    if (opportunity.relevanceScore === 3) return "#059669"; // vert
    if (opportunity.relevanceScore === 2) return "#0071f3"; // bleu
    return "#6b7280"; // gris
  };

  const borderColor = getBorderColor();

  return (
    <div
      style={{
        backgroundColor: "var(--glass-bg)",
        backdropFilter: "blur(15px)",
        WebkitBackdropFilter: "blur(15px)",
        borderRadius: "var(--border-radius-lg)",
        border: `1px solid var(--glass-border)`,
        borderLeft: `3px solid ${borderColor}`,
        overflow: "hidden",
        boxShadow: "var(--glass-shadow-md)",
        marginBottom: "20px",
      }}
    >
      {/* En-tête de l'opportunité */}
      <div style={{ padding: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "12px",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "var(--text-primary)",
              margin: "0",
              flex: 1,
              paddingRight: "16px",
            }}
          >
            {opportunity.detail}
          </h3>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: borderColor,
              backgroundColor: `${borderColor}15`,
              padding: "4px 10px",
              borderRadius: "var(--border-radius-full)",
              whiteSpace: "nowrap",
              border: `1px solid ${borderColor}30`,
            }}
          >
            Pertinence {opportunity.relevanceScore}
          </div>
        </div>
        <div
          style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
          }}
        >
          {opportunity.category}
        </div>
      </div>

      {/* Section d'état vide */}
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.02)",
          padding: "32px 20px",
          textAlign: "center",
          borderTop: "1px solid var(--divider)",
        }}
      >
        <div
          style={{
            margin: "0 auto 20px",
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            backgroundColor: "rgba(0, 0, 0, 0.03)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <p
          style={{
            fontSize: "16px",
            fontWeight: "500",
            color: "var(--text-secondary)",
            margin: "0 0 12px 0",
          }}
        >
          {message}
        </p>
        {actionButton}
      </div>
    </div>
  );
};

/**
 * Composant principal pour l'onglet des contacts recommandés
 */
const SelectedContactsTab = ({
  contacts = [],
  selectedOpportunities = [],
  isLoading = false,
}) => {
  // États
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendedContacts, setRecommendedContacts] = useState({});
  const [exportHistory, setExportHistory] = useState([]);

  // Vérifier s'il y a des contacts à analyser
  const hasContactsToAnalyze = contacts && contacts.length > 0;
  const hasOpportunitiesToAnalyze = selectedOpportunities && selectedOpportunities.length > 0;

  /**
   * Fonction pour analyser et recommander des contacts
   * Utilise les mots-clés des opportunités pour trouver des contacts pertinents
   */
  const analyzeAndRecommendContacts = () => {
    setIsAnalyzing(true);
    
    // Simulation de chargement (peut être remplacée par un vrai traitement asynchrone)
    setTimeout(() => {
      const recommendations = {};
      
      // Pour chaque opportunité/actualité sélectionnée
      selectedOpportunities.forEach(opportunity => {
        // Mots-clés de l'opportunité (catégorie et détail)
        const keywords = [
          ...opportunity.category.toLowerCase().split(/\s+/),
          ...opportunity.detail.toLowerCase().split(/\s+/),
          // Ajouter des mots-clés supplémentaires si nécessaire
        ].filter(word => word.length > 3); // Filtrer les mots courts
        
        // Analyser chaque contact
        const relevantContacts = contacts
          .map(contact => {
            // Texte complet du contact
            const contactText = `${contact.fullName || contact.name || ""} ${contact.role || ""} ${contact.department || ""} ${contact.email || ""}`.toLowerCase();
            
            // Calculer un score pour chaque contact
            let matchScore = 0;
            let matchedKeywords = 0;
            
            // Compter les correspondances de mots-clés
            keywords.forEach(keyword => {
              if (contactText.includes(keyword)) {
                matchScore += 0.1;
                matchedKeywords++;
              }
            });
            
            // Bonus pour les décideurs
            const decisionMakerTerms = ["directeur", "director", "responsable", "manager", "chef", "head", "président", "ceo", "cto", "cio"];
            const isDecisionMaker = decisionMakerTerms.some(term => (contact.role || "").toLowerCase().includes(term));
            if (isDecisionMaker) {
              matchScore += 0.2;
            }
            
            // Bonus pour les contacts avec email
            if (contact.email) {
              matchScore += 0.1;
            }
            
            // Bonus pour les contacts complets
            if (contact.email && contact.role && (contact.fullName || contact.name)) {
              matchScore += 0.1;
            }
            
            // Si opportunité de niveau 3, augmenter le score
            if (opportunity.relevanceScore === 3) {
              matchScore *= 1.3;
            }
            
            // Normaliser le score entre 0 et 1
            matchScore = Math.min(1, matchScore);
            
            return {
              ...contact,
              relevanceScore: matchScore,
              matchedKeywords
            };
          })
          // Filtrer les contacts peu pertinents
          .filter(contact => contact.relevanceScore > 0.3)
          // Trier par score de pertinence
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          // Limiter à 15-20 contacts maximum par opportunité
          .slice(0, 15);
        
        // Stocker les contacts pertinents pour cette opportunité
        recommendations[opportunity.detail] = relevantContacts;
      });
      
      setRecommendedContacts(recommendations);
      setIsAnalyzing(false);
      setHasAnalyzed(true);
    }, 1500); // Simuler un temps de traitement
  };

  /**
   * Fonction pour extraire les contacts sélectionnés
   * @param {Array} contactsToExport - Liste des contacts à extraire
   * @param {Object} opportunity - L'opportunité associée
   */
  const handleExportContacts = (contactsToExport, opportunity) => {
    // Préparer les données d'export (CSV, etc.)
    const exportData = {
      opportunity: opportunity.detail,
      category: opportunity.category,
      timestamp: new Date().toISOString(),
      contactsCount: contactsToExport.length,
      contacts: contactsToExport
    };
    
    // Ajouter à l'historique d'export
    setExportHistory([exportData, ...exportHistory]);
    
    // Créer un CSV à télécharger
    const headers = ["Nom", "Fonction", "Email", "Département", "Téléphone", "Pertinence"];
    const rows = contactsToExport.map(contact => [
      contact.fullName || contact.name || "",
      contact.role || "",
      contact.email || "",
      contact.department || "",
      contact.phone || "",
      `${Math.round(contact.relevanceScore * 100)}%`
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    // Créer un blob et déclencher le téléchargement
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = `contacts_${opportunity.detail.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Notification de succès
    alert(`${contactsToExport.length} contacts exportés avec succès pour l'opportunité "${opportunity.detail}"`);
  };

  // Interface visuelle améliorée pour le chargement
  if (isLoading || isAnalyzing) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
          background: "linear-gradient(135deg, rgba(0, 113, 243, 0.03) 0%, rgba(255, 255, 255, 0) 100%)",
          borderRadius: "var(--border-radius-lg)",
          padding: "40px",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "80px",
            height: "80px",
            marginBottom: "24px",
          }}
        >
          <LoadingSpinner size="large" />
          <svg
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "30px",
              height: "30px",
            }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "var(--text-primary)",
            marginBottom: "12px",
            textAlign: "center",
          }}
        >
          {isAnalyzing ? "Analyse des contacts en cours" : "Chargement des données"}
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "var(--text-secondary)",
            marginBottom: "16px",
            textAlign: "center",
            maxWidth: "500px",
          }}
        >
          {isAnalyzing
            ? "Nous identifions les meilleurs contacts pour vos opportunités en fonction de leur pertinence."
            : "Préparation des données de contacts et d'opportunités..."}
        </p>
        <div
          style={{
            width: "200px",
            height: "6px",
            backgroundColor: "rgba(0, 113, 243, 0.1)",
            borderRadius: "var(--border-radius-full)",
            overflow: "hidden",
            marginTop: "8px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "30%",
              backgroundColor: "var(--primary)",
              borderRadius: "var(--border-radius-full)",
              animation: "progressAnimation 1.5s ease-in-out infinite",
            }}
          ></div>
        </div>

        <style jsx>{`
          @keyframes progressAnimation {
            0% {
              width: 10%;
              transform: translateX(-100%);
            }
            50% {
              width: 30%;
            }
            100% {
              width: 10%;
              transform: translateX(1000%);
            }
          }
        `}</style>
      </div>
    );
  }

  // Affichage lorsqu'aucune opportunité n'est sélectionnée
  if (!hasOpportunitiesToAnalyze) {
    return (
      <div
        style={{
          minHeight: "500px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(255, 255, 255, 0) 100%)",
          borderRadius: "var(--border-radius-lg)",
          padding: "40px",
        }}
      >
        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            backgroundColor: "rgba(0, 0, 0, 0.03)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "24px",
          }}
        >
          <svg
            width="50"
            height="50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
            <path d="M9 16l2 2 5-5"></path>
          </svg>
        </div>
        <h2
          style={{
            fontSize: "28px",
            fontWeight: "600",
            marginBottom: "16px",
            backgroundImage: "linear-gradient(90deg, #4f46e5, #0071f3)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Aucune opportunité sélectionnée
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "var(--text-secondary)",
            maxWidth: "500px",
            marginBottom: "24px",
            lineHeight: "1.6",
          }}
        >
          Pour obtenir des recommandations de contacts, veuillez d'abord sélectionner des opportunités 
          de prospection dans les onglets Actualités ou Service Lines.
        </p>
        <div
          style={{
            backgroundColor: "var(--glass-bg)",
            backdropFilter: "blur(15px)",
            WebkitBackdropFilter: "blur(15px)",
            borderRadius: "var(--border-radius)",
            padding: "16px 24px",
            border: "1px solid var(--glass-border)",
            maxWidth: "400px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "0",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "rgba(79, 70, 229, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </div>
            <div>
              <h3
                style={{
                  margin: "0 0 4px 0",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "var(--text-primary)",
                }}
              >
                Comment ça marche
              </h3>
              <p
                style={{
                  margin: "0",
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                }}
              >
                Sélectionnez des actualités ou offres, puis lancez l'analyse pour
                identifer les contacts les plus pertinents.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Affichage lorsqu'aucun contact n'est disponible
  if (!hasContactsToAnalyze) {
    return (
      <div
        style={{
          minHeight: "500px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, rgba(255, 255, 255, 0) 100%)",
          borderRadius: "var(--border-radius-lg)",
          padding: "40px",
        }}
      >
        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            backgroundColor: "rgba(0, 0, 0, 0.03)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "24px",
          }}
        >
          <svg
            width="50"
            height="50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
            <line x1="12" y1="11" x2="12" y2="17"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
          </svg>
        </div>
        <h2
          style={{
            fontSize: "28px",
            fontWeight: "600",
            marginBottom: "16px",
            backgroundImage: "linear-gradient(90deg, #f59e0b, #d97706)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Aucun contact disponible
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "var(--text-secondary)",
            maxWidth: "500px",
            marginBottom: "24px",
            lineHeight: "1.6",
          }}
        >
          Pour obtenir des recommandations, veuillez d'abord importer des contacts
          via l'onglet "Contacts". Ces contacts seront utilisés pour les
          recommandations.
        </p>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 24px",
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            color: "#d97706",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "var(--border-radius)",
            fontSize: "16px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(245, 158, 11, 0.15)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(245, 158, 11, 0.1)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          onClick={() => {
            // Vous pouvez ajouter ici une fonction pour naviguer vers l'onglet des contacts
            // Par exemple: setActiveTab('imported');
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Importer des contacts
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 0" }}>
      {/* Bouton d'analyse central (visible seulement si pas encore analysé) */}
      {!hasAnalyzed && (
        <div
          style={{
            backgroundColor: "var(--glass-bg)",
            backdropFilter: "blur(15px)",
            WebkitBackdropFilter: "blur(15px)",
            borderRadius: "var(--border-radius-lg)",
            padding: "40px 24px",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow-md)",
            marginBottom: "32px",
            textAlign: "center",
            background: "linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(255, 255, 255, 0) 100%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Éléments décoratifs */}
          <div
            style={{
              position: "absolute",
              right: "5%",
              top: "20%",
              width: "300px",
              height: "300px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(79, 70, 229, 0.05) 0%, rgba(255, 255, 255, 0) 70%)",
              zIndex: 0,
            }}
          ></div>
          <div
            style={{
              position: "absolute",
              left: "10%",
              bottom: "10%",
              width: "200px",
              height: "200px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0, 113, 243, 0.05) 0%, rgba(255, 255, 255, 0) 70%)",
              zIndex: 0,
            }}
          ></div>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              maxWidth: "700px",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4f46e5, #0071f3)",
                margin: "0 auto 24px",
                boxShadow: "0 8px 20px rgba(79, 70, 229, 0.3)",
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
                <line x1="16" y1="8" x2="2" y2="22"></line>
                <line x1="17.5" y1="15" x2="9" y2="15"></line>
              </svg>
            </div>

            <h2
              style={{
                fontSize: "28px",
                fontWeight: "700",
                marginBottom: "16px",
                backgroundImage: "linear-gradient(90deg, #4f46e5, #0071f3)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {selectedOpportunities.length} opportunité{selectedOpportunities.length > 1 ? "s" : ""} sélectionnée{selectedOpportunities.length > 1 ? "s" : ""}
            </h2>

            <p
              style={{
                fontSize: "16px",
                color: "var(--text-secondary)",
                lineHeight: "1.6",
                marginBottom: "32px",
                maxWidth: "600px",
                margin: "0 auto 32px",
              }}
            >
              Notre moteur d'intelligence artificielle peut analyser vos {contacts.length} contacts
              importés pour identifier les personnes les plus pertinentes pour chaque opportunité,
              en se basant sur leur rôle, département et lien avec les actualités et offres sélectionnées.
            </p>

            <button
              onClick={analyzeAndRecommendContacts}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: "16px 32px",
                background: "linear-gradient(135deg, #4f46e5, #0071f3)",
                color: "white",
                border: "none",
                borderRadius: "var(--border-radius)",
                fontSize: "18px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(79, 70, 229, 0.3)",
                transition: "all 0.3s ease",
                margin: "0 auto",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 12px 25px rgba(79, 70, 229, 0.4)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(79, 70, 229, 0.3)";
              }}
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
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Me recommander des contacts
            </button>

            <div
              style={{
                marginTop: "32px",
                display: "flex",
                justifyContent: "center",
                gap: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--text-tertiary)",
                  fontSize: "14px",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(99, 102, 241, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <span>Analyse intelligente</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--text-tertiary)",
                  fontSize: "14px",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(99, 102, 241, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </div>
                <span>Pertinence maximale</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--text-tertiary)",
                  fontSize: "14px",
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(99, 102, 241, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>
                <span>Contacts de qualité</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opportunités avec tableaux de contacts */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "32px",
        }}
      >
        {selectedOpportunities.map((opportunity, index) => {
          const opportunityContacts = hasAnalyzed
            ? recommendedContacts[opportunity.detail] || []
            : [];

          // Déterminer si des contacts sont trouvés ou non
          const hasNoContacts = hasAnalyzed && opportunityContacts.length === 0;
          const notYetSynchronized = !hasAnalyzed;

          if (notYetSynchronized) {
            return (
              <EmptyStateCard
                key={index}
                opportunity={opportunity}
                message="Pas de synchronisation"
                actionButton={null}
              />
            );
          } else if (hasNoContacts) {
            return (
              <EmptyStateCard
                key={index}
                opportunity={opportunity}
                message="Pas de contacts identifiés"
                actionButton={null}
              />
            );
          }

          return (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0",
              }}
            >
              {/* En-tête de l'opportunité */}
              <div
                style={{
                  backgroundColor: "var(--glass-bg)",
                  backdropFilter: "blur(15px)",
                  WebkitBackdropFilter: "blur(15px)",
                  borderRadius: "var(--border-radius-lg) var(--border-radius-lg) 0 0",
                  border: "1px solid var(--glass-border)",
                  borderBottom: "none",
                  padding: "20px",
                  boxShadow: "var(--glass-shadow-md)",
                  borderTop: opportunity.relevanceScore === 3 
                    ? "4px solid #059669" 
                    : opportunity.relevanceScore === 2
                    ? "4px solid #0071f3"
                    : "4px solid #6b7280",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    margin: "0 0 12px 0",
                    color: "var(--text-primary)",
                  }}
                >
                  {opportunity.detail}
                </h3>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {opportunity.category}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "500",
                        color: "#6b7280",
                      }}
                    >
                      {opportunityContacts.length} contact{opportunityContacts.length > 1 ? "s" : ""}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "4px 10px",
                        borderRadius: "var(--border-radius-full)",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: opportunity.relevanceScore === 3 
                          ? "#059669" 
                          : opportunity.relevanceScore === 2
                          ? "#0071f3"
                          : "#6b7280",
                        backgroundColor: opportunity.relevanceScore === 3 
                          ? "rgba(5, 150, 105, 0.1)" 
                          : opportunity.relevanceScore === 2
                          ? "rgba(0, 113, 243, 0.1)"
                          : "rgba(107, 114, 128, 0.1)",
                        border: opportunity.relevanceScore === 3 
                          ? "1px solid rgba(5, 150, 105, 0.2)" 
                          : opportunity.relevanceScore === 2
                          ? "1px solid rgba(0, 113, 243, 0.2)"
                          : "1px solid rgba(107, 114, 128, 0.2)",
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      </svg>
                      <span>Pertinence {opportunity.relevanceScore}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tableau de contacts pour cette opportunité */}
              <ContactsTable 
                contacts={opportunityContacts} 
                opportunity={opportunity} 
                onExport={handleExportContacts} 
              />
            </div>
          );
        })}
      </div>

      {/* Historique des exports (affichable dans une future évolution) */}
      {exportHistory.length > 0 && false && (
        <div
          style={{
            marginTop: "40px",
            padding: "20px",
            backgroundColor: "var(--glass-bg)",
            backdropFilter: "blur(15px)",
            WebkitBackdropFilter: "blur(15px)",
            borderRadius: "var(--border-radius-lg)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow-md)",
          }}
        >
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "600",
              margin: "0 0 16px 0",
            }}
          >
            Historique des extractions
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Date</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Opportunité</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Contacts</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exportHistory.map((export_, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--divider)" }}>
                  <td style={{ padding: "12px" }}>
                    {new Date(export_.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px" }}>{export_.opportunity}</td>
                  <td style={{ padding: "12px" }}>{export_.contactsCount} contacts</td>
                  <td style={{ padding: "12px" }}>
                    <button
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        backgroundColor: "var(--primary-light)",
                        color: "var(--primary)",
                        border: "1px solid rgba(0, 113, 243, 0.2)",
                        borderRadius: "var(--border-radius)",
                        fontSize: "13px",
                        cursor: "pointer",
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
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Exporter à nouveau
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SelectedContactsTab;
