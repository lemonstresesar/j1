import React, { useState, useEffect } from 'react';
import { Smartphone, X, Download } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('pwa_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [showModal, setShowModal] = useState(false);

  if (isInstalled || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  const handleAction = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <aside aria-label="Installation de l'application" className="md:hidden bg-gradient-to-r from-[#0B2A4A] to-[#164e87] text-white px-4 py-2 text-xs shadow-inner">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-6 h-6 rounded-lg bg-amber-400 text-[#0B2A4A] flex items-center justify-center shrink-0">
              <Smartphone className="w-3.5 h-3.5" />
            </span>
            <p className="truncate font-medium text-slate-100">
              <strong className="text-white font-semibold">Application For him and her :</strong> Accès direct sur votre écran d'accueil
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAction}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#0B2A4A] font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Installer</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 text-slate-300 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Ignorer la bannière"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

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
