'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthResultContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const error = searchParams.get('error');
  const resource = searchParams.get('resource');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {success ? (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                  🚀 Starship Connected!
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Successfully connected to {resource ? decodeURIComponent(resource) : 'Jira'}
                </p>
                <p className="mt-4 text-sm text-gray-500">
                  You can now close this window and return to Slack to start using Starship.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => window.close()}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Close Window
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                  Authentication Failed
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {error ? decodeURIComponent(error) : 'An unknown error occurred'}
                </p>
                <p className="mt-4 text-sm text-gray-500">
                  Please try again or contact your administrator for help.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => window.close()}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Close Window
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthResult() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthResultContent />
    </Suspense>
  );
}
