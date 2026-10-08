import React, { useState } from 'react';
import { Download, Smartphone, Check, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'header-client' | 'header-admin' | 'card' | 'footer' | 'pill';
  className?: string;
  label?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header-client',
  className = '',
  label,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  // If already installed, remove download/install prompt completely
  if (isInstalled) {
    return null;
  }

  // Variant: Card (for Admin Dashboard / Settings)
  if (variant === 'card') {
    return (
      <>
        <div className={`p-5 rounded-2xl bg-gradient-to-br from-[#0B2A4A] to-[#1E63B5] text-white shadow-lg relative overflow-hidden ${className}`}>
          <div className="absolute right-0 -bottom-6 opacity-10 text-white pointer-events-none">
            <Smartphone className="w-36 h-36" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
                <Smartphone className="w-3 h-3 text-amber-300" />
                <span>Application Mobile (PWA)</span>
              </div>
              <h3 className="text-base font-bold text-white">
                Installer l'application sur votre écran d'accueil
              </h3>
              <p className="text-xs text-slate-200 max-w-xl font-normal leading-relaxed">
                Utilisez l'application en 1 clic sans passer par l'adresse web du navigateur, avec navigation plein écran et fluidité maximale.
              </p>
            </div>

            {isInstalled ? (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold shrink-0">
                <Check className="w-4 h-4 text-emerald-300" />
                <span>App déjà installée</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#0B2A4A] font-bold text-xs sm:text-sm shadow-md transition-all active:scale-97 cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4 text-[#0B2A4A]" />
                <span>{label || "Installer l'app"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <PWAInstallModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          isIOS={isIOS}
          isAndroid={isAndroid}
          isInstallable={isInstallable}
          onNativeInstall={install}
        />
      </>
    );
  }

  // Variant: Admin Top Header
  if (variant === 'header-admin') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0B2A4A] text-xs font-bold transition-all shadow-sm active:scale-97 cursor-pointer ${className}`}
          title="Installer l'application sur votre appareil"
        >
          <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0B2A4A]" />
          <span className="hidden md:inline">{label || "Installer l'app"}</span>
          <span className="md:hidden">{label || "App"}</span>
        </button>

        <PWAInstallModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          isIOS={isIOS}
          isAndroid={isAndroid}
          isInstallable={isInstallable}
          onNativeInstall={install}
        />
      </>
    );
  }

  // Variant: Footer
  if (variant === 'footer') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-all cursor-pointer ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-[#0B2A4A]" />
          <span>{label || "Télécharger / Installer l'application"}</span>
        </button>

        <PWAInstallModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          isIOS={isIOS}
          isAndroid={isAndroid}
          isInstallable={isInstallable}
          onNativeInstall={install}
        />
      </>
    );
  }

  // Default Variant: Client Header
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#0B2A4A] text-xs font-bold transition-all border border-slate-200/70 shadow-2xs active:scale-97 cursor-pointer ${className}`}
        title="Installer l'application sur votre écran d'accueil"
      >
        <Smartphone className="w-4 h-4 text-[#1E63B5] shrink-0" />
        <span className="hidden lg:inline">{label || "Installer l'app"}</span>
        <span className="lg:hidden">{label || "App"}</span>
      </button>

      <PWAInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isIOS={isIOS}
        isAndroid={isAndroid}
        isInstallable={isInstallable}
        onNativeInstall={install}
      />
    </>
  );
};
