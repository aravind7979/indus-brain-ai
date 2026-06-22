import React, { useState } from 'react';
import { Shield, Lock, User, Terminal, Loader } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
  backendUrl: string;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, backendUrl }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        // FastAPI Login requires application/x-www-form-urlencoded
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${backendUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Login failed. Invalid credentials.');
        }

        localStorage.setItem('indus_token', data.access_token);
        onLoginSuccess(data.access_token);
      } else {
        // Registration takes application/json
        const response = await fetch(`${backendUrl}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Registration failed.');
        }

        setSuccess('Registration successful! Please login.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-industrial-950 flex flex-col justify-center items-center px-4 bg-grid-pattern relative">
      {/* Glow ambient header background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-industrial-accent-orange/5 blur-3xl pointer-events-none"></div>

      {/* Cyber Industrial Terminal Brand */}
      <div className="mb-8 text-center select-none relative z-10">
        <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-md bg-industrial-900 border border-industrial-accent-orange/30 text-industrial-accent-orange text-sm font-mono mb-3">
          <Terminal size={14} className="animate-pulse" />
          <span>INDUS BRAIN AI // v1.0.0</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
          INDUS <span className="text-industrial-accent-orange">BRAIN</span> AI
        </h1>
        <p className="text-industrial-600 text-sm max-w-sm">
          Unified Industrial Knowledge Intelligence Platform for Asset & Operations Brain
        </p>
      </div>

      {/* Login Box */}
      <div className="w-full max-w-md glass-panel rounded-xl shadow-glass p-8 border-industrial-700 relative z-10">
        {/* Glow indicator line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-industrial-accent-orange/20 via-industrial-accent-orange to-industrial-accent-orange/20 rounded-t-xl"></div>
        
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Shield size={20} className="text-industrial-accent-orange" />
          <span>{isLogin ? 'Security Portal' : 'Register Operator'}</span>
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-industrial-accent-red/10 border border-industrial-accent-red/30 text-industrial-accent-red text-sm font-mono">
            Error: {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-md bg-industrial-accent-green/10 border border-industrial-accent-green/30 text-industrial-accent-green text-sm font-mono">
            Success: {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-industrial-600 mb-1">
              Operator Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-industrial-600">
                <User size={16} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="operator_101"
                className="w-full bg-industrial-950 border border-industrial-700 rounded-md py-2.5 pl-10 pr-4 text-white text-sm placeholder-industrial-600 focus:outline-none focus:border-industrial-accent-orange transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-industrial-600 mb-1">
              Security Key / Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-industrial-600">
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-industrial-950 border border-industrial-700 rounded-md py-2.5 pl-10 pr-4 text-white text-sm placeholder-industrial-600 focus:outline-none focus:border-industrial-accent-orange transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-industrial-accent-orange hover:bg-industrial-accent-orange/90 text-white font-medium py-2.5 rounded-md transition-all flex items-center justify-center gap-2 text-sm shadow-glass-glow cursor-pointer"
          >
            {loading ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              <span>{isLogin ? 'Establish Secure Connection' : 'Create Operator Profile'}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-industrial-accent-blue hover:underline bg-transparent border-none cursor-pointer"
            disabled={loading}
          >
            {isLogin
              ? 'Need a new operator account? Register here'
              : 'Already have an operator account? Login here'}
          </button>
        </div>
      </div>

      {/* Cybernetic footer details */}
      <div className="mt-12 text-center text-xs font-mono text-industrial-600">
        <div>ENCRYPTED SSL LINK // REST API GATEWAY</div>
        <div className="mt-1 opacity-50">Authorized Personnel Only. Actions Are Logged.</div>
      </div>
    </div>
  );
};
