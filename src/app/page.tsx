import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🚀 Starship Slack App
          </h1>
          <p className="text-gray-600 mb-8">
            Application Slack pour créer des items Monday.com
          </p>
        </div>

        {/* Cards des fonctionnalités */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
          
          {/* Card Slack Integration */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="text-center">
              <div className="text-3xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Commande Slack
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Utilisez <code className="bg-gray-100 px-1 py-0.5 rounded">/ticket</code> dans Slack pour créer des items Monday.com
              </p>
              <div className="text-xs text-gray-500">
                Configuré avec Bolt framework
              </div>
            </div>
          </div>

          {/* Card Test Jira */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="text-center">
              <div className="text-3xl mb-4">🎫</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Test Monday.com API
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Testez directement la création d&apos;items Monday.com
              </p>
              <Link
                href="/test-monday"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Tester l'API →
              </Link>
            </div>
          </div>

          {/* Card Configuration */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="text-center">
              <div className="text-3xl mb-4">⚙️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Configuration
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Board: <strong>Main Board</strong><br/>
                Type: <strong>Task</strong>
              </p>
              <div className="text-xs text-gray-500">
                Hébergé sur Vercel
              </div>
            </div>
          </div>

        </div>

        {/* Status de déploiement */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-2xl">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Application déployée avec succès
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>✅ Webhooks Slack configurés</p>
                <p>✅ API Monday.com connectée</p>
                <p>✅ Régions EU optimisées</p>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
