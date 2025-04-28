import React, { useState, useCallback, useRef, useEffect } from "react";
import { contactService } from "../services/contactService";
import ContactList from "./ContactList";
import LoadingSpinner from "./LoadingSpinner";

/**
 * Composant de gestion des contacts pour l'onglet Contacts
 * Permet l'extraction, l'import et l'analyse des contacts
 * @param {Object} props - Propriétés du composant
 * @param {Array} props.combinedRelevanceMatrix - Matrice combinée de pertinence des actualités
 * @param {Object} props.data - Données de l'application
 * @param {boolean} props.isLoadingRss - Indicateur de chargement des flux RSS
 * @returns {JSX.Element} Onglet de gestion des contacts
 */
const ContactTabContent = ({ combinedRelevanceMatrix, data, isLoadingRss }) => {
  // États de gestion des contacts
  const [contacts, setContacts] = useState([]);
  const [excelContacts, setExcelContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("extracted");
  const [missingRoles, setMissingRoles] = useState([]);
  const [missingRoleContacts, setMissingRoleContacts] = useState([]);

  // Référence pour l'input de fichier
  const fileInputRef = useRef(null);

  // Extraire les contacts des actualités
  const extractContacts = useCallback(async () => {
    try {
      setLoading(true);
      // Extraire les contacts des actualités Schneider Electric
      const newsItems = [
        ...data.schneiderNews,
        ...combinedRelevanceMatrix.map((item) => ({
          title: item.news,
          description: item.newsDescription || "",
          date: item.newsDate,
          link: item.newsLink || "",
        })),
      ];

      const extractedContacts =
        contactService.extractContactsFromNews(newsItems);

      // Identifier les rôles manquants
      const roles = contactService.identifyRolesInNews(combinedRelevanceMatrix);
      const rolesToContacts = contactService.matchContactsToRoles(
        extractedContacts,
        roles
      );
      const missingRolesList = contactService.identifyMissingRoles(
        roles,
        rolesToContacts
      );

      setContacts(extractedContacts);
      setMissingRoles(missingRolesList);
    } catch (error) {
      console.error("Erreur lors de l'extraction des contacts:", error);
    } finally {
      setLoading(false);
    }
  }, [data, combinedRelevanceMatrix]);

  // Importer des contacts depuis un fichier Excel
  const importExcelContacts = useCallback(
    async (file) => {
      setImportLoading(true);
      try {
        // Importer les contacts depuis le fichier Excel
        const importedContacts = await contactService.importContacts(file);

        // Analyser la pertinence des contacts importés
        const relevanceAnalysis = contactService.analyzeContactRelevance(
          importedContacts,
          combinedRelevanceMatrix
        );

        setExcelContacts(relevanceAnalysis);

        // Identifier les rôles manquants
        const roles = contactService.identifyRolesInNews(
          combinedRelevanceMatrix
        );
        const rolesToContacts = contactService.matchContactsToRoles(
          relevanceAnalysis,
          roles
        );
        const missingRolesList = contactService.identifyMissingRoles(
          roles,
          rolesToContacts
        );

        setMissingRoles(missingRolesList);
        setMissingRoleContacts(
          relevanceAnalysis.filter((contact) =>
            missingRolesList.some((role) =>
              contact.role.toLowerCase().includes(role.toLowerCase())
            )
          )
        );

        // Afficher un message de succès
        alert(
          `${importedContacts.length} contacts ont été importés avec succès!`
        );
      } catch (error) {
        console.error("Erreur lors de l'importation des contacts:", error);
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
      const file = event.target.files[0];
      if (file) {
        importExcelContacts(file.name);
      }
    },
    [importExcelContacts]
  );

  // Charger les contacts extraits au premier rendu
  useEffect(() => {
    extractContacts();
  }, [extractContacts]);

  return (
    <div className="contacts-content">
      {/* En-tête */}
      <div className="contacts-header">
        <h2 className="contacts-title">Contacts Schneider Electric</h2>

        <div className="contacts-actions">
          {/* Bouton d'import des contacts */}
          <button
            className="import-button"
            onClick={() => fileInputRef.current.click()}
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
        </button>
        {missingRoles.length > 0 && (
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
      {(loading || isLoadingRss) && (
        <div className="premium-loading-overlay">
          <LoadingSpinner size="large" />
          <p>Extraction et analyse des contacts en cours...</p>
        </div>
      )}

      {/* Contenu des onglets */}
      {!loading && !isLoadingRss && (
        <>
          {activeTab === "extracted" && (
            <ContactList contacts={contacts} isLoadingRss={isLoadingRss} />
          )}

          {activeTab === "imported" && (
            <ContactList
              contacts={excelContacts}
              isLoadingRss={isLoadingRss}
              isImportedList={true}
            />
          )}

          {activeTab === "missing" && missingRoles.length > 0 && (
            <div className="missing-roles-container">
              <div className="missing-roles-info">
                <p>
                  Les rôles suivants ont été identifiés dans les actualités mais
                  ne correspondent à aucun contact dans nos bases de données.
                </p>
              </div>
              <div className="missing-roles-list">
                {missingRoles.map((role, index) => (
                  <div key={index} className="missing-role-item">
                    <div className="missing-role-header">
                      <h3>{role}</h3>
                      <div className="potential-matches-badge">
                        {
                          missingRoleContacts.filter((contact) =>
                            contact.role
                              .toLowerCase()
                              .includes(role.toLowerCase())
                          ).length
                        }{" "}
                        correspondances potentielles
                      </div>
                    </div>

                    <div className="potential-contacts">
                      {missingRoleContacts
                        .filter((contact) =>
                          contact.role
                            .toLowerCase()
                            .includes(role.toLowerCase())
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
        </>
      )}
    </div>
  );
};

export default ContactTabContent;
