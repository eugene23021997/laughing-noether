import React, { useState, useMemo, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";

/**
 * Composant amélioré pour afficher une liste de contacts avec filtres et actions
 * Modifications: réduction de la largeur de la colonne de sélection et normalisation des rôles
 * @param {Object} props - Propriétés du composant
 * @param {Array} props.contacts - Liste des contacts à afficher
 * @param {boolean} props.isLoadingRss - Indicateur de chargement des flux RSS
 * @param {boolean} props.isImportedList - Indique si la liste provient d'un import Excel
 * @param {function} props.onContactSelect - Fonction appelée lors de la sélection d'un contact
 * @returns {JSX.Element} Liste de contacts filtrables et exportables
 */
const ContactList = ({
  contacts,
  isLoadingRss,
  isImportedList = false,
  onContactSelect,
}) => {
  // États pour le filtrage et la sélection
  const [confidenceFilter, setConfidenceFilter] = useState(0.5);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [normalizedContacts, setNormalizedContacts] = useState([]);

  // Liste des rôles standardisés applicables à toutes les entreprises
  const standardRoles = [
    "CEO / PDG",
    "CFO / Directeur Financier",
    "CIO / DSI",
    "CTO / Directeur Technique",
    "CDO / Directeur Digital",
    "COO / Directeur des Opérations",
    "CMO / Directeur Marketing",
    "CHRO / DRH",
    "CSO / Directeur Sécurité",
    "Directeur Stratégie",
    "Directeur Commercial",
    "Directeur de la Transformation",
    "Directeur de l'Innovation",
    "Directeur de la Supply Chain",
    "Directeur de Production",
    "Directeur de Projet",
    "VP / Vice-Président",
    "Responsable IT",
    "Responsable Commercial",
    "Responsable Achats",
    "Chef de Produit",
  ];

  // Fonction pour normaliser les rôles des contacts
  const normalizeRole = (role) => {
    if (!role) return "Autre";

    const roleLower = role.toLowerCase();

    // Appliquer la normalisation basée sur les mots-clés
    if (
      roleLower.includes("pdg") ||
      roleLower.includes("ceo") ||
      roleLower.includes("président") ||
      roleLower.includes("chief executive") ||
      roleLower.includes("directeur général")
    ) {
      return "CEO / PDG";
    }

    if (
      roleLower.includes("cfo") ||
      roleLower.includes("financier") ||
      roleLower.includes("finance") ||
      roleLower.includes("chief financial")
    ) {
      return "CFO / Directeur Financier";
    }

    if (
      roleLower.includes("cio") ||
      roleLower.includes("dsi") ||
      roleLower.includes("systèmes d'information") ||
      roleLower.includes("information technology") ||
      roleLower.includes("informatique")
    ) {
      return "CIO / DSI";
    }

    if (
      roleLower.includes("cto") ||
      roleLower.includes("technique") ||
      roleLower.includes("technology") ||
      roleLower.includes("technical")
    ) {
      return "CTO / Directeur Technique";
    }

    if (
      roleLower.includes("cdo") ||
      roleLower.includes("digital") ||
      roleLower.includes("numérique")
    ) {
      return "CDO / Directeur Digital";
    }

    if (
      roleLower.includes("coo") ||
      roleLower.includes("opérations") ||
      roleLower.includes("operations")
    ) {
      return "COO / Directeur des Opérations";
    }

    if (roleLower.includes("cmo") || roleLower.includes("marketing")) {
      return "CMO / Directeur Marketing";
    }

    if (
      roleLower.includes("rh") ||
      roleLower.includes("ressources humaines") ||
      roleLower.includes("human resources") ||
      roleLower.includes("chro") ||
      roleLower.includes("drh")
    ) {
      return "CHRO / DRH";
    }

    if (
      roleLower.includes("cso") ||
      roleLower.includes("sécurité") ||
      roleLower.includes("security")
    ) {
      return "CSO / Directeur Sécurité";
    }

    if (roleLower.includes("stratégie") || roleLower.includes("strategy")) {
      return "Directeur Stratégie";
    }

    if (
      (roleLower.includes("commercial") ||
        roleLower.includes("ventes") ||
        roleLower.includes("sales")) &&
      (roleLower.includes("directeur") || roleLower.includes("director"))
    ) {
      return "Directeur Commercial";
    }

    if (roleLower.includes("transformation")) {
      return "Directeur de la Transformation";
    }

    if (roleLower.includes("innovation")) {
      return "Directeur de l'Innovation";
    }

    if (
      roleLower.includes("supply chain") ||
      roleLower.includes("chaîne") ||
      roleLower.includes("logistique")
    ) {
      return "Directeur de la Supply Chain";
    }

    if (
      roleLower.includes("production") ||
      roleLower.includes("manufacturing")
    ) {
      return "Directeur de Production";
    }

    if (roleLower.includes("projet") || roleLower.includes("project")) {
      return "Directeur de Projet";
    }

    if (roleLower.includes("vice") || roleLower.includes("vp")) {
      return "VP / Vice-Président";
    }

    if (
      (roleLower.includes("it") || roleLower.includes("informatique")) &&
      (roleLower.includes("responsable") ||
        roleLower.includes("manager") ||
        roleLower.includes("chef"))
    ) {
      return "Responsable IT";
    }

    if (
      (roleLower.includes("commercial") ||
        roleLower.includes("ventes") ||
        roleLower.includes("sales")) &&
      (roleLower.includes("responsable") ||
        roleLower.includes("manager") ||
        roleLower.includes("chef"))
    ) {
      return "Responsable Commercial";
    }

    if (
      roleLower.includes("achat") ||
      roleLower.includes("procurement") ||
      roleLower.includes("purchasing")
    ) {
      return "Responsable Achats";
    }

    if (roleLower.includes("produit") || roleLower.includes("product")) {
      return "Chef de Produit";
    }

    // Si aucune correspondance n'est trouvée
    return "Autre";
  };

  // Normaliser les contacts
  useEffect(() => {
    const normalized = contacts.map((contact) => ({
      ...contact,
      normalizedRole: normalizeRole(contact.role),
    }));
    setNormalizedContacts(normalized);
  }, [contacts]);

  // Extraction des rôles réellement présents dans les données pour le filtre
  const uniqueRoles = useMemo(() => {
    const rolesInData = new Set(
      normalizedContacts.map((contact) => contact.normalizedRole)
    );

    // Filtrer les rôles standards qui sont présents dans les données
    return standardRoles.filter((role) => rolesInData.has(role));
  }, [normalizedContacts]);

  // Filtrage des contacts
  const filteredContacts = useMemo(() => {
    return normalizedContacts.filter((contact) => {
      // Filtre par score de confiance
      if (contact.confidenceScore < confidenceFilter) {
        return false;
      }

      // Filtre par rôle
      if (roleFilter !== "all" && contact.normalizedRole !== roleFilter) {
        return false;
      }

      // Filtre par recherche
      const searchText = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (contact.fullName &&
          contact.fullName.toLowerCase().includes(searchText)) ||
        (contact.name && contact.name.toLowerCase().includes(searchText)) ||
        (contact.role && contact.role.toLowerCase().includes(searchText)) ||
        (contact.department &&
          contact.department.toLowerCase().includes(searchText)) ||
        (contact.company &&
          contact.company.toLowerCase().includes(searchText)) ||
        (contact.email && contact.email.toLowerCase().includes(searchText));

      // Filtre "sélectionnés uniquement"
      const isSelected = selectedContacts.includes(
        contact.name || contact.fullName
      );
      if (showOnlySelected && !isSelected) {
        return false;
      }

      return matchesSearch;
    });
  }, [
    normalizedContacts,
    confidenceFilter,
    roleFilter,
    searchTerm,
    selectedContacts,
    showOnlySelected,
  ]);

  // Sélection/désélection d'un contact
  const toggleContactSelection = (contactName) => {
    const name = contactName.name || contactName.fullName || contactName;
    if (selectedContacts.includes(name)) {
      setSelectedContacts(
        selectedContacts.filter((selectedName) => selectedName !== name)
      );
    } else {
      setSelectedContacts([...selectedContacts, name]);

      // Notifier le parent si la fonction est fournie
      if (onContactSelect) {
        const contact = contacts.find((c) => (c.name || c.fullName) === name);
        if (contact) {
          onContactSelect(contact);
        }
      }
    }
  };

  // Sélection/désélection de tous les contacts filtrés
  const toggleSelectAll = () => {
    if (filteredContacts.length === selectedContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(
        filteredContacts.map((contact) => contact.name || contact.fullName)
      );
    }
  };

  // Générer un lien LinkedIn à partir du nom
  const generateLinkedInSearchUrl = (name) => {
    if (!name) return null;

    // Pour les contacts importés, on utilise la recherche LinkedIn
    const encodedName = encodeURIComponent(name);
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodedName}`;

    // Si le nom inclut Schneider Electric, on affine la recherche
    if (name.toLowerCase().includes("schneider")) {
      return `${searchUrl}&company=Schneider%20Electric`;
    }

    return searchUrl;
  };

  // Formater la source en texte lisible
  const formatSource = (source) => {
    if (!source || !source.title) {
      return "Actualité sans titre";
    }
    return source.title.length > 50
      ? source.title.substring(0, 47) + "..."
      : source.title;
  };

  // Export des contacts sélectionnés
  const exportContacts = () => {
    // Filtrer les contacts à exporter
    const contactsToExport = filteredContacts.filter(
      (contact) =>
        selectedContacts.includes(contact.name || contact.fullName) ||
        !showOnlySelected
    );

    if (contactsToExport.length === 0) {
      alert("Aucun contact à exporter.");
      return;
    }

    // Créer les entêtes CSV
    const headers = [
      "Full Name",
      "Role",
      "Email",
      "Company",
      "Department",
      "Phone",
      "Sources",
    ];

    // Créer les lignes CSV
    const rows = contactsToExport.map((contact) => [
      contact.fullName || contact.name,
      contact.role,
      contact.email || "",
      contact.company,
      contact.department || "",
      contact.phone || "",
      (contact.sources || []).map((s) => s.title).join(" | "),
    ]);

    // Assembler le contenu CSV
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Créer un blob et un lien de téléchargement
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `contacts_schneider_${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {isLoadingRss && (
        <div className="premium-loading-overlay">
          <LoadingSpinner size="large" />
          <p>Mise à jour des actualités et extraction des contacts...</p>
        </div>
      )}

      <div className="premium-contacts-header">
        <h2 className="premium-section-title">
          Contacts {isImportedList ? "importés" : "détectés"}
          {contacts.length > 0 && (
            <span className="contacts-count">({contacts.length})</span>
          )}
        </h2>

        <div className="premium-contacts-actions">
          <button
            className="premium-export-button"
            onClick={exportContacts}
            disabled={showOnlySelected && selectedContacts.length === 0}
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
            {showOnlySelected
              ? `Exporter ${selectedContacts.length} contacts`
              : `Exporter tous les contacts (${filteredContacts.length})`}
          </button>
        </div>
      </div>

      <div className="premium-filters">
        <div className="premium-filter-controls">
          <div className="premium-selector">
            <label htmlFor="confidenceFilter">
              Score de confiance minimum:
            </label>
            <select
              id="confidenceFilter"
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(parseFloat(e.target.value))}
              className="premium-select"
            >
              <option value="0">Tous les scores</option>
              <option value="0.3">Faible (0.3+)</option>
              <option value="0.5">Moyen (0.5+)</option>
              <option value="0.7">Élevé (0.7+)</option>
              <option value="0.9">Très élevé (0.9+)</option>
            </select>
          </div>

          <div className="premium-selector">
            <label htmlFor="roleFilter">Rôle:</label>
            <select
              id="roleFilter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="premium-select"
            >
              <option value="all">Tous les rôles</option>
              {uniqueRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
              {normalizedContacts.some((c) => c.normalizedRole === "Autre") && (
                <option value="Autre">Autre</option>
              )}
            </select>
          </div>

          <div className="premium-selector">
            <label htmlFor="searchContact">Recherche:</label>
            <input
              id="searchContact"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un nom ou un rôle..."
              className="premium-select"
            />
          </div>

          <div className="premium-selector">
            <label htmlFor="showSelected">Affichage:</label>
            <div className="premium-checkbox-container">
              <input
                id="showSelected"
                type="checkbox"
                checked={showOnlySelected}
                onChange={() => setShowOnlySelected(!showOnlySelected)}
                className="premium-checkbox"
              />
              <label htmlFor="showSelected" className="premium-checkbox-label">
                Afficher uniquement les contacts sélectionnés (
                {selectedContacts.length})
              </label>
            </div>
          </div>
        </div>

        {searchTerm && (
          <div className="premium-search-results">
            <div className="premium-search-term">
              <span>Recherche: </span>
              <strong>{searchTerm}</strong>
              <button
                className="premium-clear-search"
                onClick={() => setSearchTerm("")}
              >
                <svg
                  width="16"
                  height="16"
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
          </div>
        )}
      </div>

      {filteredContacts.length > 0 ? (
        <div className="premium-contacts-table-wrapper">
          <table className="premium-contacts-table">
            <thead>
              <tr>
                <th className="select-column" style={{ width: "32px" }}>
                  <input
                    type="checkbox"
                    checked={
                      selectedContacts.length === filteredContacts.length &&
                      filteredContacts.length > 0
                    }
                    onChange={toggleSelectAll}
                    id="selectAll"
                    className="premium-checkbox"
                  />
                  <label
                    htmlFor="selectAll"
                    className="premium-checkbox-label visually-hidden"
                  >
                    Tout sélectionner
                  </label>
                </th>
                <th className="name-column">Full Name</th>
                <th className="role-column">Role</th>
                <th className="email-column">Email</th>
                {!isImportedList && <th className="source-column">Source</th>}
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact, index) => (
                <tr
                  key={`${contact.name || contact.fullName}-${index}`}
                  className={
                    selectedContacts.includes(contact.name || contact.fullName)
                      ? "selected-row"
                      : ""
                  }
                >
                  <td
                    className="select-column"
                    style={{
                      width: "32px",
                      paddingLeft: "4px",
                      paddingRight: "4px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(
                        contact.name || contact.fullName
                      )}
                      onChange={() => toggleContactSelection(contact)}
                      id={`contact-${index}`}
                      className="premium-checkbox"
                    />
                    <label
                      htmlFor={`contact-${index}`}
                      className="premium-checkbox-label visually-hidden"
                    >
                      Sélectionner {contact.name || contact.fullName}
                    </label>
                  </td>
                  <td className="name-column">
                    {/* Ajouter un lien LinkedIn */}
                    <a
                      href={generateLinkedInSearchUrl(
                        contact.fullName || contact.name
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="linkedin-link"
                      title="Rechercher sur LinkedIn"
                    >
                      {contact.fullName || contact.name}
                      <svg
                        className="linkedin-icon"
                        width="14"
                        height="14"
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
                    </a>
                  </td>
                  <td className="role-column">
                    {contact.role === "Poste non spécifié" ? (
                      <span className="premium-contact-unknown-role">
                        Rôle non spécifié
                      </span>
                    ) : (
                      <>
                        <div className="role-main">
                          {contact.normalizedRole}
                        </div>
                        {contact.normalizedRole !== contact.role && (
                          <div className="role-original">{contact.role}</div>
                        )}
                      </>
                    )}
                  </td>
                  <td className="email-column">
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="contact-email-link"
                      >
                        {contact.email}
                      </a>
                    ) : (
                      <span className="premium-contact-empty">
                        Email non disponible
                      </span>
                    )}
                  </td>
                  {!isImportedList && (
                    <td className="source-column">
                      {contact.sources && contact.sources.length > 0 ? (
                        <div className="source-info">
                          {contact.sources[0].link ? (
                            <a
                              href={contact.sources[0].link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="source-link"
                              title={contact.sources[0].title}
                            >
                              {formatSource(contact.sources[0])}
                              <svg
                                className="external-link-icon"
                                width="10"
                                height="10"
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
                            <span
                              className="source-title"
                              title={contact.sources[0].title}
                            >
                              {formatSource(contact.sources[0])}
                            </span>
                          )}
                          {contact.sources.length > 1 && (
                            <span className="source-count">
                              +{contact.sources.length - 1} autres
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="premium-contact-empty">
                          Source non disponible
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="9"
                cy="7"
                r="4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M23 21v-2a4 4 0 0 0-3-3.87"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 3.13a4 4 0 0 1 0 7.75"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="empty-message">
            {contacts.length === 0
              ? "Aucun contact n'a été détecté."
              : "Aucun contact ne correspond aux critères de filtrage actuels."}
          </div>
          {contacts.length > 0 && (
            <button
              className="reset-button"
              onClick={() => {
                setConfidenceFilter(0);
                setRoleFilter("all");
                setSearchTerm("");
              }}
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Styles spécifiques */}
      <style jsx>{`
        .select-column {
          width: 32px !important;
          min-width: 32px !important;
          max-width: 32px !important;
          padding-left: 4px !important;
          padding-right: 4px !important;
          text-align: center !important;
        }

        .premium-contacts-table-wrapper {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          background: var(--surface);
          margin-bottom: 24px;
        }

        .premium-contacts-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .premium-contacts-table th {
          background-color: var(--glass-bg);
          color: var(--text-secondary);
          font-weight: 600;
          text-align: left;
          padding: 16px;
          position: sticky;
          top: 0;
          z-index: 10;
          border-bottom: 1px solid var(--divider);
        }

        .premium-contacts-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--divider);
          vertical-align: middle;
        }

        .premium-contacts-table tbody tr {
          transition: background-color 0.15s ease;
        }

        .premium-contacts-table tbody tr:hover {
          background-color: rgba(0, 113, 243, 0.04);
        }

        .premium-contacts-table tbody tr.selected-row {
          background-color: rgba(0, 113, 243, 0.08);
        }

        .premium-contacts-table tbody tr.selected-row:hover {
          background-color: rgba(0, 113, 243, 0.12);
        }

        .name-column {
          width: 18%;
          min-width: 160px;
          font-weight: 500;
        }

        /* Style pour le lien LinkedIn */
        .linkedin-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: var(--text-primary);
          text-decoration: none;
          position: relative;
          transition: color 0.2s ease;
        }

        .linkedin-link:hover {
          color: var(--primary);
        }

        .linkedin-icon {
          opacity: 0.3;
          transition: opacity 0.2s ease;
        }

        .linkedin-link:hover .linkedin-icon {
          opacity: 0.8;
        }

        .role-column {
          width: 30%;
        }

        .role-main {
          font-weight: 500;
          color: var(--text-primary);
        }

        .role-original {
          font-size: 12px;
          color: var(--text-tertiary);
          margin-top: 2px;
        }

        .email-column {
          width: 22%;
          min-width: 180px;
        }

        .source-column {
          width: 30%;
        }

        .contact-email-link {
          color: var(--primary);
          text-decoration: none;
          transition: color 0.15s ease;
          font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo,
            monospace;
          font-size: 13px;
        }

        .contact-email-link:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }

        .premium-contact-unknown-role {
          color: var(--text-tertiary);
          font-style: italic;
        }

        .premium-contact-empty {
          color: var(--text-tertiary);
          font-style: italic;
          font-size: 13px;
        }

        .source-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .source-title {
          font-size: 13px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 250px;
        }

        .source-link {
          font-size: 13px;
          color: var(--primary);
          text-decoration: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 250px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: color 0.15s ease;
        }

        .source-link:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }

        .external-link-icon {
          opacity: 0.7;
          transition: opacity 0.15s ease;
        }

        .source-link:hover .external-link-icon {
          opacity: 1;
        }

        .source-count {
          font-size: 12px;
          color: var(--text-tertiary);
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .source-column {
            display: none;
          }

          .name-column {
            width: 25%;
          }

          .role-column {
            width: 45%;
          }
        }

        @media (max-width: 992px) {
          .email-column {
            display: none;
          }

          .name-column {
            width: 30%;
          }

          .role-column {
            width: 70%;
          }
        }

        @media (max-width: 768px) {
          .premium-contacts-table th,
          .premium-contacts-table td {
            padding: 12px 8px;
          }

          .name-column {
            min-width: 120px;
          }
        }

        @media (max-width: 576px) {
          .premium-contacts-table-wrapper {
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          }

          .premium-contacts-table {
            font-size: 13px;
          }

          .role-column {
            max-width: 200px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      `}</style>
    </>
  );
};

export default ContactList;
