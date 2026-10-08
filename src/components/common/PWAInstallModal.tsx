import React from 'react';
import { Download, Share, PlusSquare, Smartphone, Monitor, X, CheckCircle2 } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  isAndroid: boolean;
  onNativeInstall?: () => void;
  isInstallable?: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isIOS,
  isAndroid,
  onNativeInstall,
  isInstallable,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with App Icon */}
        <div className="flex items-center gap-4 mb-6 pr-8">
          <div className="w-14 h-14 rounded-2xl bg-[#0B2A4A] text-white flex items-center justify-center shadow-lg shadow-[#0B2A4A]/25 shrink-0 overflow-hidden">
            <img 
              src="/pwa-192x192.png" 
              alt="For him and her" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to icon
                (e.currentTarget as HTMLElement).style.display = 'none';
              }} 
            />
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold text-[#0B2A4A] leading-tight">
              Installer l'application
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              For him and her • Accès rapide & direct
            </p>
          </div>
        </div>

        {/* Direct native install button if browser has prompt ready */}
        {isInstallable && onNativeInstall && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => {
                onNativeInstall();
                onClose();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[#0B2A4A]/20 transition-all cursor-pointer active:scale-98"
            >
              <Download className="w-4.5 h-4.5" />
              <span>Installer maintenant en 1 clic</span>
            </button>
            <div className="flex items-center justify-center gap-2 my-4">
              <span className="h-px bg-slate-200 flex-1" />
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">ou manuellement</span>
              <span className="h-px bg-slate-200 flex-1" />
            </div>
          </div>
        )}

        {/* Instructions by Platform */}
        {isIOS ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs">
              <p className="font-semibold mb-1 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-700 shrink-0" />
                Guide d'installation sur iPhone / iPad :
              </p>
              <p className="text-amber-800">
                Safari sur iOS ne permet pas l'installation automatique mais s'installe en 2 secondes :
              </p>
            </div>

            <ol className="space-y-3 text-xs sm:text-sm text-slate-700">
              <li className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <span className="font-semibold text-slate-900 block">Appuyez sur le bouton Partager</span>
                  <span className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                    L'icône <Share className="w-3.5 h-3.5 inline text-blue-600" /> au bas de l'écran dans Safari.
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <span className="font-semibold text-slate-900 block">Défilez vers le bas</span>
                  <span className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                    Sélectionnez <strong className="text-slate-800">"Sur l'écran d'accueil"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-slate-600" />
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <span className="font-semibold text-slate-900 block">Validez avec "Ajouter"</span>
                  <span className="text-slate-500 text-xs mt-0.5">
                    L'icône apparaîtra sur votre écran d'accueil comme n'importe quelle app native !
                  </span>
                </div>
              </li>
            </ol>
          </div>
        ) : isAndroid ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-blue-950 text-xs">
              <p className="font-semibold mb-1 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-blue-700 shrink-0" />
                Guide sur Android (Chrome / Navigateur) :
              </p>
              <p className="text-blue-800">
                Si la fenêtre automatique ne s'ouvre pas :
              </p>
            </div>

            <ol className="space-y-3 text-xs sm:text-sm text-slate-700">
              <li className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-[#0B2A4A] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <span className="font-semibold text-slate-900 block">Appuyez sur le menu (⋮)</span>
                  <span className="text-slate-500 text-xs">En haut à droite de votre navigateur Chrome.</span>
                </div>
              </li>

              <li className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-[#0B2A4A] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <span className="font-semibold text-slate-900 block">Sélectionnez "Installer l'application"</span>
                  <span className="text-slate-500 text-xs">Ou "Ajouter à l'écran d'accueil".</span>
                </div>
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-900 text-xs">
              <p className="font-semibold mb-1 flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-slate-700 shrink-0" />
                Sur Ordinateur (Chrome, Edge) :
              </p>
              <p className="text-slate-600">
                Cliquez sur l'icône d'installation dans la barre d'adresse (en haut à droite) ou ouvrez le menu du navigateur puis cliquez sur <strong>"Installer For him and her"</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Benefits reminder */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Plein écran sans barre d'URL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ouverture ultra rapide</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
        >
          Fermer
        </button>
      </div>
    </div>
  );
};
