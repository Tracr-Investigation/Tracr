import { useState } from 'react';
import './index.css';

function App() {
  const [response, setResponse] = useState('');

  const testBackend = async () => {
    console.log('📤 Appel du backend...');

    try {
      const res = await fetch('http://localhost:8000/test');
      const data = await res.json();

      console.log('✅ Réponse reçue:', data);
      setResponse(JSON.stringify(data, null, 2));

    } catch (error) {
      console.error('❌ Erreur:', error);
      setResponse('Erreur: Le backend ne répond pas');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Test Backend ↔️ Frontend
        </h1>

        <button
          onClick={testBackend}
          className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
        >
          Tester la connexion
        </button>

        {response && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="font-semibold mb-2">Réponse du backend:</p>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              {response}
            </pre>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-600">
          <p>Ouvre la console pour voir les logs 👀</p>
        </div>
      </div>
    </div>
  );
}

export default App;