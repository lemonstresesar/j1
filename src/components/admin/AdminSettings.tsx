import React, { useState } from 'react';
import {
  Save,
  Check,
  Settings as SettingsIcon,
  Phone,
  Store,
  CreditCard,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Bell,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import { ShopSettings } from '../../types';
import { updateSettings } from '../../services/storeService';
import { changeAdminPassword } from '../../services/authService';
import { playNewOrderSound, requestNotificationPermission } from '../../utils/notificationSound';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface AdminSettingsProps {
  settings: ShopSettings;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ settings }) => {
  // Store info state
  const [shopName, setShopName] = useState(settings.shopName || 'For him and her');
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber || '+237 6 96 60 55 86');
  const [paymentInstructions, setPaymentInstructions] = useState(
    settings.paymentInstructions ||
      'Paiement par dépôt sécurisé Orange Money ou MTN Mobile Money. La vendeuse vous envoie le numéro exact sur WhatsApp.'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Password modification state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);

  // Notification state
  const [soundPlayed, setSoundPlayed] = useState(false);
  const [notifPermissionState, setNotifPermissionState] = useState<string>(() => {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(false);

    try {
      await updateSettings({
        shopName: shopName.trim(),
        whatsappNumber: whatsappNumber.trim(),
        paymentInstructions: paymentInstructions.trim(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Erreur lors de la mise à jour des paramètres.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(false);

    if (!oldPassword.trim()) {
      setPassError('Veuillez renseigner votre mot de passe actuel.');
      return;
    }

    if (!newPassword.trim()) {
      setPassError('Veuillez saisir votre nouveau mot de passe.');
      return;
    }

    if (newPassword.trim().length < 3) {
      setPassError('Le nouveau mot de passe doit comporter au moins 3 caractères.');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setPassError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setIsChangingPass(true);
    try {
      await changeAdminPassword(oldPassword.trim(), newPassword.trim());
      setPassSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(false), 4500);
    } catch (err: any) {
      setPassError(err?.message || 'Erreur lors de la modification du mot de passe.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleTestSound = () => {
    playNewOrderSound();
    setSoundPlayed(true);
    setTimeout(() => setSoundPlayed(false), 1500);
  };

  const handleRequestNotif = async () => {
    const res = await requestNotificationPermission();
    setNotifPermissionState(res);
  };

  return (
    <div className="max-w-3xl space-y-8">
      {/* 1. Store settings */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-[#EAF2FB] text-[#1E63B5] flex items-center justify-center">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0B2A4A] font-serif">
              Paramètres de la Boutique
            </h3>
            <p className="text-xs text-slate-500">
              Coordonnées de réception des commandes clients sur WhatsApp
            </p>
          </div>
        </div>

        {success && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Paramètres enregistrés avec succès !</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-[#1E63B5]" />
              Nom de la boutique
            </label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#1E63B5]" />
              Numéro de réception WhatsApp
            </label>
            <input
              type="text"
              required
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+237 6 96 60 55 86"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
            />
            <span className="text-[11px] text-slate-400 block mt-1">
              Les messages de commande générés par les clients seront envoyés vers ce numéro WhatsApp.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#1E63B5]" />
              Instructions de paiement par dépôt (affichées après commande)
            </label>
            <textarea
              rows={3}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
            />
            <span className="text-[11px] text-slate-400 block mt-1">
              Rappelle aux clients qu’aucun paiement n’est débité sur le site et que le règlement se fait par dépôt Orange Money ou MTN Mobile Money.
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="py-3 px-6 rounded-xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les paramètres'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Password Modification Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0B2A4A] font-serif">
              Sécurité & Mot de passe
            </h3>
            <p className="text-xs text-slate-500">
              Modifiez le mot de passe d’accès à votre espace vendeuse
            </p>
          </div>
        </div>

        {passSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Votre nouveau mot de passe a été enregistré avec succès ! Utilisez-le lors de votre prochaine connexion.</span>
          </div>
        )}

        {passError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{passError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                type={showOldPass ? 'text' : 'password'}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Votre mot de passe actuel"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
              />
              <button
                type="button"
                onClick={() => setShowOldPass(!showOldPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 3 caractères"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-slate-400" />
                Confirmer le nouveau mot de passe
              </label>
              <input
                type={showNewPass ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le nouveau mot de passe"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isChangingPass}
              className="py-3 px-6 rounded-xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{isChangingPass ? 'Modification...' : 'Modifier le mot de passe'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Audio & System Notifications Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0B2A4A] font-serif">
              Notifications & Alertes de Commande
            </h3>
            <p className="text-xs text-slate-500">
              Restez alertée en direct dès qu’un client passe une commande
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Volume2 className="w-4 h-4 text-[#1E63B5]" />
              <span>Alerte sonore de commande</span>
            </div>
            <p className="text-xs text-slate-500">
              Un carillon mélodieux retentit automatiquement dès qu'une commande est reçue.
            </p>
            <button
              type="button"
              onClick={handleTestSound}
              className="py-2 px-4 rounded-xl bg-white border border-slate-200 hover:border-[#1E63B5] text-xs font-bold text-[#0B2A4A] flex items-center gap-2 shadow-2xs hover:bg-[#EAF2FB]/40 transition-all cursor-pointer"
            >
              <Volume2 className={`w-3.5 h-3.5 ${soundPlayed ? 'text-amber-500 animate-bounce' : 'text-[#1E63B5]'}`} />
              <span>{soundPlayed ? 'Carillon joué !' : 'Tester le son'}</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Bell className="w-4 h-4 text-[#1E63B5]" />
              <span>Notifications Système</span>
            </div>
            <p className="text-xs text-slate-500">
              {notifPermissionState === 'granted'
                ? 'Les notifications sur écran sont déjà autorisées.'
                : 'Autorisez votre navigateur à afficher les alertes sur votre écran.'}
            </p>
            {notifPermissionState === 'granted' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <Check className="w-3.5 h-3.5" />
                <span>Notifications actives</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestNotif}
                className="py-2 px-4 rounded-xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white text-xs font-bold transition-all cursor-pointer"
              >
                Activer les notifications
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. PWA Installation */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <PWAInstallButton
          variant="card"
          label="Installer l'application sur mon appareil"
        />
      </div>
    </div>
  );
};
