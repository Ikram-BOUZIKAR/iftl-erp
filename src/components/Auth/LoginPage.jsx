import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage({ auth }) {
  const [email, setEmail] = useState('test@iftl.ma');
  const [password, setPassword] = useState('Test123456!');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      await auth.login(email, password);
      setMessage('Connexion réussie !');
      navigate('/');
    } catch (err) {
      setMessage(err.message || 'Erreur de connexion');
    }
  };

  return (
    <main className="App p-6">
      <h2 className="text-2xl font-bold mb-4">Connexion</h2>
      <form onSubmit={handleLogin} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@iftl.ma"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Mot de passe</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Test123456!"
            required
          />
        </div>

        <button className="btn" type="submit">Se connecter</button>
      </form>

      {message && <p className="mt-3 text-sm">{message}</p>}
      {auth.error && <p className="mt-2 text-red-500">{auth.error}</p>}
    </main>
  );
}
