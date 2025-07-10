import React, { useState, useEffect } from 'react';
import { claudeAnalysisService } from '../services/claudeAnalysisService';

/**
 * Composant pour tester la connexion à l'API Claude
 * À intégrer dans votre interface d'administration ou de développement
 */
const ClaudeTestComponent = () => {
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Test automatique au chargement du composant
  useEffect(() => {
    testClaudeConnection();
  }, []);

  const testClaudeConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Début du test de connexion Claude...');
      const result = await claudeAnalysisService.testConnection();
      
      setTestResult(result);
      
      if (result.success) {
        console.log('✅ Test Claude réussi:', result.data);
      } else {
        console.error('❌ Test Claude échoué:', result.error);
        setError(result.error);
      }
    } catch (err) {
      console.error('❌ Erreur lors du test:', err);
      setError(err.message);
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const testSimpleAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🧪 Test d\'analyse simple...');
      
      // Test avec un article factice
      const testArticle = {
        title: "Test d'analyse Claude",
        date: "10 Juil. 2025",
        category: "Test",
        description: "Ceci est un test pour vérifier que l'analyse Claude fonctionne correctement.",
        link: ""
      };
      
      const testOffers = {
        "Technology": ["Data, Analytics and AI", "Cloud & Sourcing"],
        "Finance & Risk": ["Performance Management", "Risk Management"]
      };
      
      const analysis = await claudeAnalysisService.analyzeArticleCompletely(testArticle, testOffers);
      
      console.log('✅ Test d\'analyse réussi:', analysis);
      setTestResult({
        success: true,
        data: {
          analysisTest: true,
          summary: analysis.summary,
          relevanceScore: analysis.relevanceScore,
          analyzed: analysis.analyzed
        }
      });
    } catch (err) {
      console.error('❌ Erreur lors du test d\'analyse:', err);
      setError(err.message);
      setTestResult({ success: false, error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    if (isLoading) return '#3b82f6';
    if (testResult?.success) return '#10b981';
    return '#ef4444';
  };

  const getStatusText = () => {
    if (isLoading) return 'Test en cours...';
    if (testResult?.success) return 'API Claude fonctionnelle';
    return 'Problème avec l\'API Claude';
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      backgroundColor: 'white',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      minWidth: '300px'
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
        Test API Claude
      </h3>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          animation: isLoading ? 'pulse 2s infinite' : 'none'
        }}></div>
        <span style={{ fontSize: '14px', fontWeight: '500' }}>
          {getStatusText()}
        </span>
      </div>
      
      {testResult && (
        <div style={{
          backgroundColor: testResult.success ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>
            {testResult.success ? (
              <div>
                <div style={{ color: '#166534', marginBottom: '4px' }}>
                  ✅ Connexion réussie
                </div>
                {testResult.data?.response && (
                  <div style={{ color: '#374151' }}>
                    Réponse: {testResult.data.response}
                  </div>
                )}
                {testResult.data?.usage && (
                  <div style={{ color: '#6b7280', fontSize: '12px' }}>
                    Tokens utilisés: {testResult.data.usage.input_tokens + testResult.data.usage.output_tokens}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#dc2626' }}>
                ❌ Erreur: {testResult.error?.error || testResult.error || 'Erreur inconnue'}
              </div>
            )}
          </div>
        </div>
      )}
      
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <div style={{ fontSize: '13px', color: '#dc2626' }}>
            ❌ {error}
          </div>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={testClaudeConnection}
          disabled={isLoading}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1
          }}
        >
          Test connexion
        </button>
        
        <button
          onClick={testSimpleAnalysis}
          disabled={isLoading}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1
          }}
        >
          Test analyse
        </button>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ClaudeTestComponent;
