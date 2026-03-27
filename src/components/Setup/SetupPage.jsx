import React from 'react';

export default function SetupPage() {
  const steps = [
    {
      num: 1,
      title: "Aller à Firebase Console",
      desc: "https://console.firebase.google.com/project/erp-pedago-iftl/settings/general"
    },
    {
      num: 2,
      title: "Sections: Paramètres du projet",
      desc: "Copier la configuration Firebase"
    },
    {
      num: 3,
      title: "Fichier .env.local",
      desc: "Créer dans le dossier racine avec vos clés"
    }
  ];

  const envExample = `VITE_FIREBASE_API_KEY=YOUR_API_KEY_HERE
VITE_FIREBASE_AUTH_DOMAIN=erp-pedago-iftl.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=erp-pedago-iftl
VITE_FIREBASE_STORAGE_BUCKET=erp-pedago-iftl.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID_HERE
VITE_FIREBASE_APP_ID=YOUR_APP_ID_HERE`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 border-l-4 border-gray-800">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuration Firebase</h1>
          <p className="text-gray-600 mb-8">Suivez les étapes ci-dessous pour configurer votre application</p>

          <div className="space-y-6 mb-8">
            {steps.map(step => (
              <div key={step.num} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-800 text-white font-bold">
                    {step.num}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Contenu du fichier .env.local :</p>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
{envExample}
            </pre>
            <p className="text-xs text-gray-600 mt-3">⚠️ Ne jamais commit ce fichier. Ajouter à .gitignore</p>
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              📌 Après configuration, redémarrez l'application locale avec : <code className="bg-blue-100 px-2 py-1 rounded">npm run dev</code>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Pour toute question, consultez la <a href="https://firebase.google.com/docs" target="_blank" rel="noopener noreferrer" className="text-gray-900 font-medium hover:underline">documentation Firebase</a></p>
        </div>
      </div>
    </div>
  );
}
