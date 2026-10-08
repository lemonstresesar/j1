import React, { useState } from 'react';
import { Plus, Edit2, Trash2, MapPin, X, Check } from 'lucide-react';
import { DeliveryZone } from '../../types';
import { formatFCFA } from '../../utils/formatters';
import { addDeliveryZone, updateDeliveryZone, deleteDeliveryZone } from '../../services/storeService';
import { INITIAL_DELIVERY_ZONES } from '../../services/initialData';
import { ConfirmModal } from '../common/ConfirmModal';

interface AdminDeliveryZonesProps {
  zones: DeliveryZone[];
}

export const AdminDeliveryZones: React.FC<AdminDeliveryZonesProps> = ({ zones }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [zoneToDelete, setZoneToDelete] = useState<DeliveryZone | null>(null);
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openAddModal = () => {
    setEditingZone(null);
    setName('');
    setPrice('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (z: DeliveryZone) => {
    setEditingZone(z);
    setName(z.name);
    setPrice(z.price);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Le nom du lieu de livraison est requis.');
      return;
    }

    if (price === '' || Number(price) < 0) {
      setError('Veuillez renseigner un tarif valide en FCFA.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingZone) {
        await updateDeliveryZone(editingZone.id, {
          name: name.trim(),
          price: Number(price),
        });
      } else {
        await addDeliveryZone({
          name: name.trim(),
          price: Number(price),
          order: zones.length + 1,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving delivery zone:', err);
      setError('Une erreur est survenue lors de l’enregistrement.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (z: DeliveryZone) => {
    setZoneToDelete(z);
  };

  const executeDelete = async () => {
    if (!zoneToDelete) return;
    const targetId = zoneToDelete.id;

    // 1. Instantly close modal (0ms)
    setZoneToDelete(null);

    // 2. Instantly remove from screen
    setOptimisticDeletedIds((prev) => [...prev, targetId]);

    // 3. Permanently delete from Google Cloud Firestore
    try {
      await deleteDeliveryZone(targetId);
    } catch (err) {
      console.error('Error deleting zone:', err);
      setOptimisticDeletedIds((prev) => prev.filter((id) => id !== targetId));
    }
  };

  const handleSeedZones = async () => {
    try {
      for (const zone of INITIAL_DELIVERY_ZONES) {
        await addDeliveryZone(zone);
      }
    } catch (err) {
      console.error('Error seeding delivery zones:', err);
    }
  };

  const activeZones = zones.filter((z) => !optimisticDeletedIds.includes(z.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#0B2A4A] font-serif">
            Lieux & Tarifs de Livraison à Douala ({activeZones.length})
          </h3>
          <p className="text-xs text-slate-500">
            Ces lieux s’affichent dans le formulaire de commande du client.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="py-2.5 px-4 rounded-xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un lieu</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
        {activeZones.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-3">
            <p>Aucun lieu de livraison enregistré pour le moment.</p>
            <button
              type="button"
              onClick={handleSeedZones}
              className="px-4 py-2.5 rounded-xl bg-[#0B2A4A] text-white font-bold text-xs hover:bg-[#1E63B5] transition-all"
            >
              Initialiser les 14 quartiers de Douala (Akwa, Bonapriso, Deido, Makepe...)
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeZones.map((zone) => (
            <div
              key={zone.id}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAF2FB] text-[#1E63B5] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    {zone.name}
                  </h4>
                  <span className="text-xs font-semibold text-[#0B2A4A]">
                    {formatFCFA(zone.price)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(zone)}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-[#0B2A4A] hover:bg-slate-100 transition-colors"
                  title="Modifier"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(zone)}
                  className="p-2 rounded-xl border border-slate-200 text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden my-auto border border-slate-100">
            <div className="p-4 sm:p-5 bg-[#0B2A4A] text-white flex items-center justify-between">
              <h3 className="text-base font-bold font-serif">
                {editingZone ? 'Modifier le lieu' : 'Nouveau lieu de livraison'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom du quartier / lieu *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Akwa / Boulevard de la Liberté"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Frais de livraison (FCFA) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={500}
                  value={price}
                  onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Ex : 1500"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white text-xs sm:text-sm font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Enregistrement...' : editingZone ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Confirmation Modal for deletion */}
      <ConfirmModal
        isOpen={Boolean(zoneToDelete)}
        title="Supprimer ce lieu de livraison ?"
        message={`Êtes-vous sûre de vouloir supprimer définitivement le lieu « ${zoneToDelete?.name} » ?`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={executeDelete}
        onCancel={() => setZoneToDelete(null)}
      />
    </div>
  );
};
