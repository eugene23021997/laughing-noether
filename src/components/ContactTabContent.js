import React, { useState, useCallback, useRef, useEffect } from "react";
import { contactService } from "../services/contactService";
import { prospectionService } from "../services/prospectionService";
import ContactList from "./ContactList";
import SelectedContactsTab from "./SelectedContactsTab";
import LoadingSpinner from "./LoadingSpinner";

// Stockage local pour les contacts importés (persistance entre les changements d'onglets)
// Initialisation avec un tableau vide pour éviter undefined
let storedImportedContacts = [];

const ContactTabContent = ({
  combinedRelevanceMatrix,
  data,
  isLoadingRss,
  opportunitiesByOffering = {},
}) => {
  // États de gestion des contacts
  const [contacts, setContacts] = useState([]);
  const [excelContacts, setExcelContacts] = useState(storedImportedContacts || []); // Ajout de || [] pour éviter undefined
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("extracted");
  const [missingRoles, setMissingRoles] = useState([]);
  const [missingRoleContacts, setMissingRoleContacts] = useState([]);
  const [importError, setImportError] = useState(null);

  // État pour le contact sélectionné (pour l'affichage des détails)
  const [selectedContact, setSelectedContact] = useState(null);

  // État pour les opportunités sélectionnées (synchronisées avec le service)
  const [selectedOpportunities, setSelectedOpportunities] = useState([]);

  // Référence pour l'input de fichier
  const fileInputRef = useRef(null);

  // S'abonner aux changements d'opportunités sélectionnées
  useEffect(() => {
    // Obtenir les opportunités déjà sélectionnées
    setSelectedOpportunities(prospectionService.getSelectedOpportunities() || []);

    // S'abonner aux futurs changements
    const unsubscribe = prospectionService.subscribe((opportunities) => {
      setSelectedOpportunities(opportunities || []);
    });

    // Se désabonner lors du démontage du composant
    return () => unsubscribe();
  }, []);

  // Extraire les contacts des actualités
  const extractContacts = useCallback(async () => {
    try {
      setLoading(true);
      // Extraire les contacts des actualités Schneider Electric
      const newsItems = [
        ...(data?.schneiderNews || []),
        ...((combinedRelevanceMatrix || []).map((item) => ({
          title: item.news,
          description: item.newsDescription || "",
          date: item.newsDate,
          link: item.newsLink || "",
        })))
      ];

      const extractedContacts =
        contactService.extractContactsFromNews(newsItems);

      // Identifier les rôles manquants
      const roles = contactService.identifyRolesInNews(combinedRelevanceMatrix || []);
      const rolesToContacts = contactService.matchContactsToRoles(
        extractedContacts || [],
        roles || []
      );
      const missingRolesList = contactService.identifyMissingRoles(
        roles || [],
        rolesToContacts || {}
      );

      setContacts(extractedContacts || []);
      setMissingRoles(missingRolesList || []);
    } catch (error) {
      console.error("Erreur lors de l'extraction des contacts:", error);
    } finally {
      setLoading(false);
    }
  }, [data, combinedRelevanceMatrix]);

  // Gestion de la sélection d'un contact
  const handleContactSelect = (contact) => {
    setSelectedContact(contact);
  };

  // Importer des contacts depuis un fichier avec la version améliorée
  const importExcelContacts = useCallback(
    async (file) => {
      setImportLoading(true);
      setImportError(null); // Réinitialiser les erreurs précédentes

      try {
        // Vérifier que file est bien un objet File
        if (!(file instanceof File)) {
          throw new Error("Le paramètre fourni n'est pas un fichier valide");
        }

        console.log("Importation du fichier:", file.name, file.type);

        // Importer les contacts depuis le fichier avec la méthode améliorée
        const importedContacts = await contactService.importContacts(file);

        // Analyser la pertinence des contacts importés
        const relevanceAnalysis = contactService.analyzeContactRelevance(
          importedContacts || [],
          combinedRelevanceMatrix || []
        );

        // Stocker les contacts importés à la fois dans l'état local et dans la variable globale
        setExcelContacts(relevanceAnalysis || []);
        storedImportedContacts = relevanceAnalysis || []; // Stockage pour la persistance

        // Identifier les rôles manquants
        const roles = contactService.identifyRolesInNews(
          combinedRelevanceMatrix || []
        );
        const rolesToContacts = contactService.matchContactsToRoles(
          relevanceAnalysis || [],
          roles || []
        );
        const missingRolesList = contactService.identifyMissingRoles(
          roles || [],
          rolesToContacts || {}
        );

        setMissingRoles(missingRolesList || []);
        setMissingRoleContacts(
          (relevanceAnalysis || []).filter((contact) =>
            (missingRolesList || []).some((role) =>
              (contact.role || "").toLowerCase().includes((role || "").toLowerCase())
            )
          )
        );

        // Afficher un message de succès
        alert(
          `${(importedContacts || []).length} contacts ont été importés avec succès!`
        );

        // Passer automatiquement à l'onglet "importés"
        setActiveTab("imported");
      } catch (error) {
        console.error("Erreur lors de l'importation des contacts:", error);
        setImportError(`Erreur lors de l'importation: ${error.message}`);
        alert(`Erreur lors de l'importation des contacts: ${error.message}`);
      } finally {
        setImportLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [combinedRelevanceMatrix]
  );

  // Gestion de la sélection de fichier
  const handleFileSelect = useCallback(
    (event) => {
      const file = event.target.files && event.target.files[0];
      if (file) {
        // Passer l'objet File directement
        importExcelContacts(file);
      }
    },
    [importExcelContacts]
  );

  // Charger les contacts extraits au premier rendu
  useEffect(() => {
    extractContacts();

    // Identifier les opportunités potentielles de prospection
    const potentialOpportunities = prospectionService.identifyNewOpportunities(
      combinedRelevanceMatrix || [],
      opportunitiesByOffering || {}
    );

    console.log(
      "Opportunités de prospection identifiées:",
      potentialOpportunities
    );
  }, [extractContacts, combinedRelevanceMatrix, opportunitiesByOffering]);

  // Obtenir tous les contacts (extraits + importés)
  const allContacts = [...(contacts || []), ...(excelContacts || [])];

  return (
    <div className="contacts-content">
      {/* En-tête */}
      <div className="contacts-header">
        <h2 className="contacts-title">Contacts Schneider Electric</h2>

        <div className="contacts-actions">
          {/* Bouton d'import des contacts */}
          <button
            className="import-button"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={importLoading}
          >
            {importLoading ? (
              <LoadingSpinner size="small" color="white" />
            ) : (
              "Importer des contacts"
            )}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
            />
          </button>
        </div>
      </div>

      {/* Affichage des erreurs d'importation */}
      {importError && (
        <div
          className="error-message"
          style={{
            padding: "12px 16px",
            margin: "16px 0",
            backgroundColor: "rgba(220, 38, 38, 0.1)",
            border: "1px solid rgba(220, 38, 38, 0.3)",
            borderRadius: "8px",
            color: "#dc2626",
          }}
        >
          <strong>Erreur:</strong> {importError}
        </div>
      )}

      {/* Onglets */}
      <div className="contacts-tabs">
        <button
          className={`contacts-tab-button ${
            activeTab === "extracted" ? "active" : ""
          }`}
          onClick={() => setActiveTab("extracted")}
        >
          Contacts extraits
        </button>
        <button
          className={`contacts-tab-button ${
            activeTab === "imported" ? "active" : ""
          }`}
          onClick={() => setActiveTab("imported")}
        >
          Contacts importés
          {excelContacts && excelContacts.length > 0 && (
            <span className="tab-badge">{excelContacts.length}</span>
          )}
        </button>
        <button
          className={`contacts-tab-button ${
            activeTab === "selected" ? "active" : ""
          }`}
          onClick={() => setActiveTab("selected")}
        >
          Contacts recommandés
          {selectedOpportunities && selectedOpportunities.length > 0 && (
            <span className="tab-badge highlight-badge">
              {selectedOpportunities.length}
            </span>
          )}
        </button>
        {missingRoles && missingRoles.length > 0 && (
          <button
            className={`contacts-tab-button ${
              activeTab === "missing" ? "active" : ""
            }`}
            onClick={() => setActiveTab("missing")}
          >
            Rôles manquants
          </button>
        )}
      </div>

      {/* Chargement */}
      {(loading || isLoadingRss || importLoading) && (
        <div className="premium-loading-overlay">
          <LoadingSpinner size="large" />
          <p>
            {importLoading 
              ? "Importation des contacts en cours..." 
              : "Extraction et analyse des contacts en cours..."}
          </p>
        </div>
      )}

      {/* Interface en deux colonnes quand un contact est sélectionné */}
      <div
        className={`contacts-layout ${selectedContact ? "with-details" : ""}`}
      >
        {/* Contenu des onglets */}
        {!loading && !isLoadingRss && !importLoading && (
          <div className="contacts-main-content">
            {activeTab === "extracted" && (
              <ContactList
                contacts={contacts || []}
                isLoadingRss={isLoadingRss}
                onContactSelect={handleContactSelect}
              />
            )}

            {activeTab === "imported" && (
              <ContactList
                contacts={excelContacts || []}
                isLoadingRss={isLoadingRss}
                isImportedList={true}
                onContactSelect={handleContactSelect}
              />
            )}

            {activeTab === "selected" && (
              <SelectedContactsTab
                contacts={allContacts}
                selectedOpportunities={selectedOpportunities || []}
                isLoading={loading || isLoadingRss || importLoading}
              />
            )}

            {activeTab === "missing" && missingRoles && missingRoles.length > 0 && (
              <div className="missing-roles-container">
                <div className="missing-roles-info">
                  <p>
                    Les rôles suivants ont été identifiés dans les actualités
                    mais ne correspondent à aucun contact dans nos bases de
                    données.
                  </p>
                </div>
                <div className="missing-roles-list">
                  {missingRoles.map((role, index) => (
                    <div key={index} className="missing-role-item">
                      <div className="missing-role-header">
                        <h3>{role}</h3>
                        <div className="potential-matches-badge">
                          {
                            (missingRoleContacts || []).filter((contact) =>
                              (contact.role || "")
                                .toLowerCase()
                                .includes((role || "").toLowerCase())
                            ).length
                          }{" "}
                          correspondances potentielles
                        </div>
                      </div>

                      <div className="potential-contacts">
                        {(missingRoleContacts || [])
                          .filter((contact) =>
                            (contact.role || "")
                              .toLowerCase()
                              .includes((role || "").toLowerCase())
                          )
                          .map((contact, idx) => (
                            <div key={idx} className="potential-contact-card">
                              <div className="potential-contact-info">
                                <div className="potential-contact-role">
                                  {contact.fullName || contact.name}
                                </div>
                                <div className="potential-contact-dept">
                                  {contact.role}
                                </div>
                                <div className="potential-contact-details">
                                  {contact.department && (
                                    <div>Département: {contact.department}</div>
                                  )}
                                  {contact.email && (
                                    <div>Email: {contact.email}</div>
                                  )}
                                  {contact.phone && (
                                    <div>Téléphone: {contact.phone}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Panneau de détails du contact (apparaît lorsqu'un contact est sélectionné) */}
        {selectedContact && (
          <div className="contact-details-panel">
            <div className="contact-details-header">
              <h3>Détails du contact</h3>
              <button
                className="close-details-button"
                onClick={() => setSelectedContact(null)}
                aria-label="Fermer les détails"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="contact-details-content">
              <div className="contact-details-avatar">
                {((selectedContact.fullName || selectedContact.name || "")
                  .charAt(0)
                  .toUpperCase())}
              </div>

              <h2 className="contact-details-name">
                {selectedContact.fullName || selectedContact.name}
              </h2>

              <div className="contact-details-role">
                {selectedContact.role !== "Poste non spécifié" ? (
                  selectedContact.role
                ) : (
                  <span className="unknown-role">Rôle non spécifié</span>
                )}
              </div>

              {selectedContact.company && (
                <div className="contact-details-company">
                  <label>Entreprise</label>
                  <span>{selectedContact.company}</span>
                </div>
              )}

              {selectedContact.department && (
                <div className="contact-details-info">
                  <label>Département</label>
                  <span>{selectedContact.department}</span>
                </div>
              )}

              {selectedContact.email && (
                <div className="contact-details-info">
                  <label>Email</label>
                  <a
                    href={`mailto:${selectedContact.email}`}
                    className="contact-details-email"
                  >
                    {selectedContact.email}
                  </a>
                </div>
              )}

              {selectedContact.phone && (
                <div className="contact-details-info">
                  <label>Téléphone</label>
                  <a
                    href={`tel:${selectedContact.phone}`}
                    className="contact-details-phone"
                  >
                    {selectedContact.phone}
                  </a>
                </div>
              )}

              {/* Sources du contact */}
              {selectedContact.sources &&
                selectedContact.sources.length > 0 && (
                  <div className="contact-details-sources">
                    <label>Sources ({selectedContact.sources.length})</label>
                    <ul className="contact-sources-list">
                      {selectedContact.sources.map((source, idx) => (
                        <li key={idx} className="contact-source-item">
                          {source.link ? (
                            <a
                              href={source.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="contact-source-link"
                            >
                              {source.title}
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="external-link-icon"
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
                            <span className="contact-source-title">
                              {source.title}
                            </span>
                          )}
                          {source.date && (
                            <span className="contact-source-date">
                              {source.date}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Actions */}
              <div className="contact-details-actions">
                <a
                  href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
                    selectedContact.fullName || selectedContact.name
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="linkedin-search-button"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <rect
                      x="2"
                      y="9"
                      width="4"
                      height="12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="4"
                      cy="4"
                      r="2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Rechercher sur LinkedIn
                </a>

                {selectedContact.email && (
                  <a
                    href={`mailto:${selectedContact.email}`}
                    className="email-button"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <polyline
                        points="22,6 12,13 2,6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Envoyer un email
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Styles pour le nouvel onglet */}
      <style jsx>{`
        .highlight-badge {
          background-color: #ec4899 !important;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.4);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(236, 72, 153, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(236, 72, 153, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default ContactTabContent;
