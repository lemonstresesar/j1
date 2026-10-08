import React, { useState, useEffect } from 'react';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  User as UserIcon,
  KeyRound,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import {
  loginWithJessicaCredentials,
  checkLoginLockout,
} from '../../services/authService';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToStore?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToStore }) => {
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(() => {
    const status = checkLoginLockout();
    return status.isLocked ? status.remainingSeconds : 0;
  });

  // Countdown timer if locked out
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Bot detection check
    if (honeypot) {
      setError('Requête non autorisée.');
      return;
    }

    if (lockoutSeconds > 0) {
      setError(`Accès temporairement verrouillé. Veuillez patienter ${Math.ceil(lockoutSeconds / 60)} min.`);
      return;
    }

    const cleanNom = nom.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanNom) {
      setError('Veuillez saisir votre identifiant.');
      return;
    }

    if (!cleanCode) {
      setError('Veuillez saisir votre mot de passe.');
      return;
    }

    setIsLoading(true);

    // Artificial delay to prevent timing analysis & rapid bot spamming
    const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 450));

    try {
      await Promise.all([
        loginWithJessicaCredentials(cleanNom, cleanCode),
        minDelayPromise,
      ]);
      onLoginSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = err?.message || 'Identifiant ou mot de passe incorrect.';
      setError(msg);

      // Recheck lockout status
      const lockoutStatus = checkLoginLockout();
      if (lockoutStatus.isLocked) {
        setLockoutSeconds(lockoutStatus.remainingSeconds);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFormLocked = lockoutSeconds > 0;

  return (
    <div className="min-h-screen bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-100 relative">
        {/* Back to store button */}
        {onBackToStore && (
          <button
            type="button"
            onClick={onBackToStore}
            className="absolute left-6 top-6 text-slate-400 hover:text-[#0B2A4A] flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour</span>
          </button>
        )}

        <div className="text-center space-y-2 mb-8 pt-2">
          <div className="w-16 h-16 rounded-2xl bg-[#0B2A4A] text-white mx-auto flex items-center justify-center shadow-lg shadow-[#0B2A4A]/20">
            <Lock className="w-8 h-8 text-amber-300" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#0B2A4A] tracking-tight pt-2">
            Espace Vendeuse
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Accès sécurisé réservé à la gestion de boutique
          </p>
        </div>

        {/* Lockout Warning */}
        {isFormLocked && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-spin" />
            <div className="leading-relaxed font-semibold">
              <span className="block font-bold">Sécurité renforcée activée</span>
              <span>
                Trop de tentatives infructueuses. Le formulaire est verrouillé pendant encore{' '}
                {Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s.
              </span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && !isFormLocked && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs text-rose-800 space-y-1 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Honeypot anti-bot hidden field */}
          <input
            type="text"
            name="security_check_field"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            style={{ display: 'none', position: 'absolute', left: '-9999px' }}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Identifiant d’accès
            </label>
            <div className="relative">
              <input
                type="text"
                required
                disabled={isFormLocked || isLoading}
                autoComplete="username"
                value={nom}
                onChange={(e) => {
                  setNom(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Votre identifiant"
                className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm outline-none transition-all font-medium placeholder:text-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed ${
                  error
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 focus:border-[#1E63B5] focus:ring-4 focus:ring-[#1E63B5]/10'
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
                disabled={isFormLocked || isLoading}
                autoComplete="current-password"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                className={`w-full pl-11 pr-12 py-3.5 rounded-2xl border text-sm outline-none transition-all font-mono font-medium placeholder:text-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed ${
                  error
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                    : 'border-slate-200 focus:border-[#1E63B5] focus:ring-4 focus:ring-[#1E63B5]/10'
                }`}
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                disabled={isFormLocked}
                onClick={() => setShowCode(!showCode)}
                className="p-2 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer disabled:opacity-50"
                title={showCode ? 'Masquer' : 'Afficher'}
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isLoading || isFormLocked}
              className="w-full py-4 px-6 rounded-2xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0B2A4A]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] cursor-pointer"
            >
              <span>{isLoading ? 'Vérification sécurisée...' : 'Se connecter'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Chiffrement SHA-256 • Protection anti-brute-force</span>
        </div>
      </div>
    </div>
  );
};
