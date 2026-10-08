import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff, User as UserIcon, KeyRound } from 'lucide-react';
import { loginWithJessicaCredentials } from '../../services/authService';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanNom = nom.trim().toLowerCase();
    const cleanCode = code.trim().toLowerCase();

    if (!cleanNom) {
      setError('Veuillez saisir votre identifiant.');
      return;
    }

    if (!cleanCode) {
      setError('Veuillez saisir votre mot de passe.');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithJessicaCredentials(cleanNom, cleanCode);
      onLoginSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Identifiant ou mot de passe incorrect.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="text-center space-y-2 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#0B2A4A] text-white mx-auto flex items-center justify-center shadow-lg shadow-[#0B2A4A]/15">
            <Lock className="w-8 h-8 text-amber-300" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#0B2A4A] tracking-tight pt-2">
            Espace Vendeuse
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            For him and her • Douala
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs text-rose-800 space-y-1 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Nom d’accès
            </label>
            <div className="relative">
              <input
                type="text"
                required
                autoComplete="username"
                value={nom}
                onChange={(e) => {
                  setNom(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Identifiant"
                className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm outline-none transition-all font-medium placeholder:text-slate-300 ${
                  error ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10' : 'border-slate-200 focus:border-[#1E63B5] focus:ring-4 focus:ring-[#1E63B5]/10'
                }`}
              />
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showCode ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                className={`w-full pl-11 pr-12 py-3.5 rounded-2xl border text-sm outline-none transition-all font-mono font-medium placeholder:text-slate-300 ${
                  error ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10' : 'border-slate-200 focus:border-[#1E63B5] focus:ring-4 focus:ring-[#1E63B5]/10'
                }`}
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="p-2 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                title={showCode ? 'Masquer le code' : 'Afficher le code'}
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-2xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0B2A4A]/20 transition-all disabled:opacity-50 active:scale-[0.99] cursor-pointer"
            >
              <span>{isLoading ? 'Connexion en cours...' : 'Se connecter'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-[#1E63B5]" />
          <span>Espace sécurisé et confidentiel</span>
        </div>
      </div>
    </div>
  );
};
