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
      setMessage('Connexion réussie !');
      setTimeout(() => navigate('/'), 500);
    } catch (err) {
      setMessage(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            IFTL ERP
          </h1>
          <p className="text-gray-600 font-medium">Système de gestion pédagogique</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-purple-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Connexion</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@iftl.ma"
                required
                className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-white text-gray-900 placeholder-gray-500"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Test123456!"
                required
                className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-white text-gray-900 placeholder-gray-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition disabled:opacity-50 cursor-pointer mt-6"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Messages */}
          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
              message.includes('réussie') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}
          
          {auth.error && (
            <div className="mt-4 p-3 rounded-lg text-sm font-medium bg-red-50 text-red-800 border border-red-200">
              {auth.error}
            </div>
          )}

          {/* Test Credentials */}
          <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-xs text-gray-600 font-medium mb-2">Identifiants de test :</p>
            <p className="text-sm text-gray-800"><strong>Email :</strong> test@iftl.ma</p>
            <p className="text-sm text-gray-800"><strong>Mot de passe :</strong> Test123456!</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-600">
          <p>Vos données sont protégées conformément à la loi n° 09-08</p>
        </div>
      </div>
    </div>
  );
}
