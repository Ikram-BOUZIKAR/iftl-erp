import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage({ auth }) {
  const [email, setEmail] = useState('test@iftl.ma');
  const [password, setPassword] = useState('Test123456!');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await auth.login(email, password);
      setMessage('Connexion réussie');
      setTimeout(() => navigate('/'), 500);
    } catch (err) {
      setMessage(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">IFTL ERP</h1>
          <p className="text-gray-600 text-sm mb-6">Système de gestion pédagogique</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@iftl.ma"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Test123456!"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white text-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              message.includes('réussie') 
                ? 'bg-green-50 text-green-800' 
                : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {auth.error && (
            <div className="mt-4 p-3 rounded-lg text-sm bg-red-50 text-red-800">
              {auth.error}
            </div>
          )}

          <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-700">
            <p className="font-medium mb-1">Identifiants de test :</p>
            <p>Email : test@iftl.ma</p>
            <p>Mot de passe : Test123456!</p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-600">
          <p>Vos données sont protégées conformément à la loi n° 09-08 – Autorisation CNDP n° A-PO-268/2024</p>
        </div>
      </div>
    </div>
  );
}
