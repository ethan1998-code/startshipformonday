export default function TestAPI() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Starship Slack Bot API Test</h1>
      <p>✅ Next.js is working</p>
      <p>🚀 Deployed on Vercel</p>
      <p>📡 API Endpoint: <code>/api/slack-events</code></p>
      
      <h2>Environment Check:</h2>
      <ul>
        <li>SLACK_BOT_TOKEN: {process.env.SLACK_BOT_TOKEN ? '✅ Set' : '❌ Missing'}</li>
        <li>SLACK_SIGNING_SECRET: {process.env.SLACK_SIGNING_SECRET ? '✅ Set' : '❌ Missing'}</li>
      </ul>
    </div>
  );
}

export async function getServerSideProps() {
  return {
    props: {
      // This will run on the server and help debug env vars
    },
  };
}
