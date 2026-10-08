import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, CheckCircle2, MapPin, PackagePlus, AlertCircle, ExternalLink } from 'lucide-react';
import { registerFirstAdmin, loginWithGoogleAdmin } from '../../services/authService';

interface AdminSetupProps {
  onSetupCompleted: () => void;
}

export const AdminSetup: React.FC<AdminSetupProps> = ({ onSetupCompleted }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<{ message: string; showConsoleLink?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [step, setStep] = useState<'create_account' | 'wizard'>('create_account');
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);

  const handleGoogleSetup = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogleAdmin();
      setStep('wizard');
    } catch (err: any) {
      console.error('Google setup error:', err);
      setError({
        message: 'La connexion avec Google a été annulée ou n’a pas pu aboutir. Veuillez réessayer.',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanUser || cleanUser.length < 3) {
      setError({ message: 'L’identifiant doit comporter au moins 3 caractères alphanumériques.' });
      return;
    }

    if (password.length < 6) {
      setError({ message: 'Le mot de passe doit comporter au moins 6 caractères.' });
      return;
    }

    if (password !== confirmPassword) {
      setError({ message: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }

    setIsLoading(true);
    try {
      await registerFirstAdmin(cleanUser, password);
      setStep('wizard');
    } catch (err: any) {
      console.error('Registration error:', err);
      const code = err?.code || '';

      if (code === 'auth/operation-not-allowed') {
        setError({
          message:
            "L’option « E-mail / Mot de passe » n'est pas encore activée dans la console Firebase de votre projet. Vous pouvez soit vous connecter directement avec Google ci-dessus (déjà actif), soit activer l'option dans la console Firebase.",
          showConsoleLink: true,
        });
      } else if (code === 'auth/email-already-in-use') {
        setError({ message: 'Cet identifiant est déjà utilisé.' });
      } else if (code === 'auth/weak-password') {
        setError({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
      } else {
        setError({
          message: err?.message || 'Une erreur est survenue lors de la création du compte.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'wizard') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-[#EAF2FB] text-[#0B2A4A] mx-auto flex items-center justify-center">
            {wizardStep === 1 ? <MapPin className="w-7 h-7" /> : <PackagePlus className="w-7 h-7" />}
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E63B5] bg-[#EAF2FB] px-3 py-1 rounded-full">
              Assistant de démarrage • Étape {wizardStep}/2
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-[#0B2A4A] mt-3">
              {wizardStep === 1 ? 'Lieux de livraison préconfigurés' : 'Catalogue de produits initialisé'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              {wizardStep === 1
                ? 'Les principaux quartiers de Douala (Akwa, Bonanjo, Bonapriso, Deido, Makepe, Bonamoussadi...) avec leurs tarifs ont été pré-enregistrés.'
                : 'Une collection de mode élégante (vêtements, parfums, chaussures, sacs, packs) a été configurée et est prête à la vente.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left text-xs space-y-2 text-slate-700">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {wizardStep === 1
                  ? 'Tarifs de livraison par défaut activés (modifiables à tout moment).'
                  : 'Produits avec photos et prix en FCFA prêts pour vos clients.'}
              </span>
            </div>
            <p className="text-slate-500">
              Vous pourrez ajouter, modifier ou supprimer des éléments à tout moment depuis les onglets de votre tableau de bord.
            </p>
          </div>

          <div className="pt-2">
            {wizardStep === 1 ? (
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <span>Continuer vers les produits</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSetupCompleted}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <span>Accéder au Tableau de Bord</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100">
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#0B2A4A] text-white mx-auto flex items-center justify-center shadow-md">
            <ShieldCheck className="w-6 h-6 text-amber-300" />
          </div>
          <h1 className="text-2xl font-bold font-serif text-[#0B2A4A]">
            Espace Vendeuse
          </h1>
          <p className="text-xs text-slate-500">
            Initialisation de l’unique compte administratrice de la boutique
          </p>
          <span className="inline-block text-[10px] font-bold text-[#1E63B5] bg-[#EAF2FB] px-2.5 py-1 rounded-full">
            Création unique • Un seul compte vendeuse
          </span>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error.message}</div>
            </div>
            {error.showConsoleLink && (
              <a
                href="https://console.firebase.google.com/project/optical-tokenizer-sdtd0/authentication/providers"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-[#1E63B5] hover:underline pt-1"
              >
                <span>Activer « E-mail/Mot de passe » dans la console Firebase</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* 1-Click Google Sign-In */}
        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={handleGoogleSetup}
            disabled={isGoogleLoading || isLoading}
            className="w-full py-3 px-4 rounded-2xl border-2 border-[#1E63B5]/30 hover:border-[#1E63B5] bg-[#EAF2FB] hover:bg-[#d8e8f8] text-[#0B2A4A] font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isGoogleLoading ? 'Connexion en cours...' : 'Se connecter en 1 clic avec Google'}</span>
          </button>
          <span className="block text-center text-[11px] text-slate-400">
            Recommandé • Actif immédiatement sans configuration supplémentaire
          </span>
        </div>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase">
            Ou par Identifiant
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Username & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Identifiant de connexion
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex : laura ou patronne"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
            />
            <span className="text-[10px] text-slate-400">
              Sert à vous identifier (sans arobase).
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Répétez le mot de passe"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              <span>{isLoading ? 'Création du compte...' : 'Créer mon compte Vendeuse'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          En cas d’oubli ultérieur, le mot de passe pourra être réinitialisé en base par le développeur.
        </p>
      </div>
    </div>
  );
};
