import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { api } from '../../services/api';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await signIn(email, password);

      if (response.error) {
        console.error('Login error:', response.error);
        setError(response.error.message);
      } else if (response.data && response.data.user) {
        // Navigate to home page on successful login
        navigate('/');
      } else {
        console.warn('No error but also no data returned');
        setError('Login failed without specific error');
      }
    } catch (err) {
      console.error('Unexpected login error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="px-8 py-10 bg-white rounded-lg shadow-md w-full max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800">Sign in</h1>
        <p className="mt-2 mb-6 text-sm text-center text-gray-600">
          Enter your credentials to access your account
        </p>

        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-xs hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        
        {/* Test Users Section */}
        <div className="mt-8 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Available Test Users</h3>
          <p className="text-xs text-gray-500 mb-3">Password for all users: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">Password!</span></p>
          <div className="flex flex-col space-y-2">
            <div className="text-xs text-gray-600 font-mono">admin@school1.com</div>
            <div className="text-xs text-gray-600 font-mono">admin@school2.com</div>
            <div className="text-xs text-gray-600 font-mono">admin@school3.com</div>
            <div className="text-xs text-gray-600 font-mono">developer@josematoswork.com</div>
            <div className="text-xs text-gray-600 font-mono">student1@school1.com</div>
            <div className="text-xs text-gray-600 font-mono">student2@school2.com</div>
            <div className="text-xs text-gray-600 font-mono">student3@school3.com</div>
            <div className="text-xs text-gray-600 font-mono">student4@school3.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}
