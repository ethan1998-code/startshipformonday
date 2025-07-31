import { useState, useEffect } from 'react';

export default function TestPage() {
  const [testResults, setTestResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const endpoints = [
    {
      name: 'API Slack Events (GET)',
      url: '/api/slack-events',
      method: 'GET',
      expected: 200
    },
    {
      name: 'API Slack Install',
      url: '/api/slack-install',
      method: 'GET',
      expected: 200
    },
    {
      name: 'API Slack OAuth Callback',
      url: '/api/slack-oauth-callback',
      method: 'GET',
      expected: 200
    }
  ];

  const testEndpoint = async (endpoint) => {
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
      });
      
      return {
        status: response.status,
        success: response.status === endpoint.expected,
        data: await response.json().catch(() => ({ message: 'Non-JSON response' }))
      };
    } catch (error) {
      return {
        status: 'ERROR',
        success: false,
        error: error.message
      };
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    const results = {};
    
    for (const endpoint of endpoints) {
      console.log(`Testing ${endpoint.name}...`);
      results[endpoint.name] = await testEndpoint(endpoint);
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  useEffect(() => {
    runAllTests();
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1>🚀 Starship Slack Bot - Test Dashboard</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runAllTests}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007cba',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '🔄 Testing...' : '🧪 Run Tests'}
        </button>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>📊 Test Results</h2>
        {Object.keys(testResults).length === 0 && !isLoading && (
          <p>Click "Run Tests" to start testing endpoints</p>
        )}
        
        {endpoints.map((endpoint) => {
          const result = testResults[endpoint.name];
          if (!result) return null;

          return (
            <div 
              key={endpoint.name}
              style={{
                border: `2px solid ${result.success ? '#4CAF50' : '#f44336'}`,
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px',
                backgroundColor: result.success ? '#e8f5e8' : '#fdeaea'
              }}
            >
              <h3 style={{ margin: '0 0 10px 0' }}>
                {result.success ? '✅' : '❌'} {endpoint.name}
              </h3>
              <p><strong>URL:</strong> {endpoint.url}</p>
              <p><strong>Method:</strong> {endpoint.method}</p>
              <p><strong>Status:</strong> {result.status}</p>
              <p><strong>Expected:</strong> {endpoint.expected}</p>
              
              {result.data && (
                <details style={{ marginTop: '10px' }}>
                  <summary style={{ cursor: 'pointer' }}>📄 Response Data</summary>
                  <pre style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '10px', 
                    borderRadius: '4px',
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
              
              {result.error && (
                <p style={{ color: '#f44336' }}>
                  <strong>Error:</strong> {result.error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <h2>🔗 Manual Test Links</h2>
        <p>Click these links to test manually:</p>
        <ul>
          {endpoints.map((endpoint) => (
            <li key={endpoint.name} style={{ marginBottom: '5px' }}>
              <a 
                href={endpoint.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#007cba' }}
              >
                {endpoint.name} ({endpoint.url})
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '8px' }}>
        <h2>🎯 Slack Configuration URLs</h2>
        <p>Use these URLs in your Slack App configuration:</p>
        <ul>
          <li><strong>Event Subscriptions:</strong> <code>https://startship-pearl.vercel.app/api/slack-events</code></li>
          <li><strong>Interactivity & Shortcuts:</strong> <code>https://startship-pearl.vercel.app/api/slack-events</code></li>
          <li><strong>OAuth Redirect:</strong> <code>https://startship-pearl.vercel.app/api/slack-oauth-callback</code></li>
        </ul>
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>🕐 Last test run: {new Date().toLocaleString()}</p>
        <p>🌐 Environment: {process.env.NODE_ENV || 'development'}</p>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return {
    props: {
      timestamp: new Date().toISOString()
    }
  };
}
