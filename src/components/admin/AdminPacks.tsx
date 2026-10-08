import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Sparkles, Upload, X, Share2, Check, PackageCheck } from 'lucide-react';
import { Pack, Product, PackItem } from '../../types';
import { formatFCFA, compressImageFile, formatDoualaDateOnly, cleanFirestorePayload } from '../../utils/formatters';
import { addPack, updatePack, deletePack } from '../../services/storeService';
import { ConfirmModal } from '../common/ConfirmModal';

interface AdminPacksProps {
  packs: Pack[];
  products: Product[];
}

export const AdminPacks: React.FC<AdminPacksProps> = ({ packs, products }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [packToDelete, setPackToDelete] = useState<Pack | null>(null);
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [discountPrice, setDiscountPrice] = useState<number | ''>('');
  const [photo, setPhoto] = useState<string>('');
  const [isGombo, setIsGombo] = useState(false);
  const [gomboEndDate, setGomboEndDate] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<PackItem[]>([]);
  const [isHidden, setIsHidden] = useState(false);

  // Custom item not in catalog state
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState<number | ''>('');

  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingPack(null);
    setName('');
    setDescription('');
    setPrice('');
    setDiscountPrice('');
    setPhoto('');
    setIsGombo(false);
    // Default 7 days from now
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setGomboEndDate(sevenDaysLater);
    setSelectedItems([]);
    setIsHidden(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Pack) => {
    setEditingPack(p);
    setName(p.name);
    setDescription(p.description || '');
    setPrice(p.price);
    setDiscountPrice(p.discountPrice || '');
    setPhoto(p.photo || '');
    setIsGombo(p.isGombo || false);
    setGomboEndDate(p.gomboEndDate ? p.gomboEndDate.split('T')[0] : '');
    setSelectedItems(p.items || []);
    setIsHidden(p.isHidden || false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleToggleProductInPack = (product: Product) => {
    const exists = selectedItems.some((item) => item.productId === product.id);
    if (exists) {
      setSelectedItems((prev) => prev.filter((item) => item.productId !== product.id));
    } else {
      setSelectedItems((prev) => [
        ...prev,
        {
          name: product.name,
          price: product.price,
          photo: product.photos?.[0],
          productId: product.id,
        },
      ]);
    }
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) return;
    setSelectedItems((prev) => [
      ...prev,
      {
        name: customItemName.trim(),
        price: customItemPrice !== '' ? Number(customItemPrice) : undefined,
      },
    ]);
    setCustomItemName('');
    setCustomItemPrice('');
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressed = await compressImageFile(file, 800, 0.75);
      setPhoto(compressed);
    } catch (err) {
      console.error('Error compressing pack photo:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Le nom du pack est obligatoire.');
      return;
    }

    if (price === '' || Number(price) <= 0) {
      setFormError('Veuillez saisir un prix valide supérieur à 0.');
      return;
    }

    if (selectedItems.length === 0) {
      setFormError('Veuillez inclure au moins un article dans ce pack.');
      return;
    }

    if (!photo) {
      setFormError('Veuillez ajouter une photo pour ce pack.');
      return;
    }

    if (isGombo && !gomboEndDate) {
      setFormError('Veuillez définir une date de fin pour le Gombo de la semaine.');
      return;
    }

    setIsSaving(true);
    try {
      const rawPayload = {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        photo,
        items: selectedItems,
        isGombo,
        isHidden,
        ...(discountPrice !== '' && Number(discountPrice) > 0 ? { discountPrice: Number(discountPrice) } : {}),
        ...(isGombo && gomboEndDate ? { gomboEndDate: new Date(gomboEndDate).toISOString() } : {}),
      };
      const payload = cleanFirestorePayload(rawPayload);

      if (editingPack) {
        await updatePack(editingPack.id, payload);
      } else {
        await addPack(payload as any);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving pack:', err);
      setFormError('Erreur lors de l’enregistrement du pack.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleHide = async (p: Pack) => {
    try {
      await updatePack(p.id, { isHidden: !p.isHidden });
    } catch (err) {
      console.error('Error toggling pack visibility:', err);
    }
  };

  const handleDelete = (p: Pack) => {
    setPackToDelete(p);
  };

  const executeDelete = async () => {
    if (!packToDelete) return;
    const targetId = packToDelete.id;

    // 1. Instantly close modal (0ms latency)
    setPackToDelete(null);

    // 2. Instantly remove from screen
    setOptimisticDeletedIds((prev) => [...prev, targetId]);

    // 3. Permanently delete from Google Cloud Firestore
    try {
      await deletePack(targetId);
    } catch (err) {
      console.error('Error permanently deleting pack:', err);
      setOptimisticDeletedIds((prev) => prev.filter((id) => id !== targetId));
    }
  };

  const handleCopyShareLink = (packId: string) => {
    const link = `${window.location.origin}/pack/${packId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(packId);
    setTimeout(() => setCopiedId(null), 2500);
  };


  const activePacks = packs.filter((p) => !optimisticDeletedIds.includes(p.id));

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#0B2A4A] font-serif">
            Gestion des Packs & Gombos ({activePacks.length} pack{activePacks.length > 1 ? 's' : ''})
          </h3>
          <p className="text-xs text-slate-500">
            Créez des ensembles d’articles avec un prix promotionnel et des liens directs partageables
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="py-2.5 px-4 rounded-xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un pack</span>
        </button>
      </div>

      {/* Packs grid */}
      {activePacks.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-xs text-slate-400 border border-slate-200/80 space-y-3">
          <p>Aucun pack créé pour le moment.</p>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-[#0B2A4A] text-white font-bold text-xs hover:bg-[#1E63B5] transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Créer votre premier pack promo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activePacks.map((pack) => {
            const isExpiredGombo =
              pack.isGombo &&
              pack.gomboEndDate &&
              new Date(pack.gomboEndDate).getTime() < Date.now();

            return (
              <div
                key={pack.id}
                className={`bg-white rounded-3xl border border-slate-200/80 p-5 flex flex-col justify-between transition-all ${
                  pack.isHidden ? 'opacity-60 bg-slate-50' : 'hover:border-[#1E63B5]/40 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex gap-4">
                    <img
                      src={pack.photo}
                      alt={pack.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-2xl bg-slate-100 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {pack.isGombo && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              isExpiredGombo
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-[#EAF2FB] text-[#1E63B5]'
                            }`}
                          >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            Gombo {isExpiredGombo ? '(Expiré)' : 'Actif'}
                          </span>
                        )}
                        {pack.isHidden && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                            Masqué
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">
                        {pack.name}
                      </h4>

                      <div className="mt-1 text-xs sm:text-sm font-bold text-[#0B2A4A] font-serif">
                        {formatFCFA(pack.discountPrice || pack.price)}
                        {pack.discountPrice && (
                          <span className="ml-2 text-xs text-slate-400 line-through font-normal">
                            {formatFCFA(pack.price)}
                          </span>
                        )}
                      </div>

                      {pack.isGombo && pack.gomboEndDate && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          Fin du gombo : {formatDoualaDateOnly(pack.gomboEndDate)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Included items */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1.5">
                      Articles inclus ({pack.items?.length || 0}) :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {pack.items?.map((item, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-100"
                        >
                          ✓ {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyShareLink(pack.id)}
                    className="p-2 text-xs font-semibold text-slate-600 hover:text-[#0B2A4A] rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                    title="Copier le lien partageable pour WhatsApp"
                  >
                    {copiedId === pack.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedId === pack.id ? 'Lien copié !' : 'Partager'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleHide(pack)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                      title={pack.isHidden ? 'Rendre visible' : 'Masquer'}
                    >
                      {pack.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(pack)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-[#0B2A4A] hover:bg-slate-100 transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(pack)}
                      className="p-2 rounded-xl border border-slate-200 text-rose-500 hover:bg-rose-50 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Pack Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto border border-slate-100">
            <div className="p-4 sm:p-5 bg-[#0B2A4A] text-white flex items-center justify-between">
              <h3 className="text-base font-bold font-serif">
                {editingPack ? 'Modifier le pack' : 'Créer un nouveau pack'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom du pack *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Pack Gentleman VIP Douala"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description du pack
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Détails sur l’ensemble et les avantages..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
                />
              </div>

              {/* Price */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prix de l’ensemble (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={100}
                    value={price}
                    onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ex : 65000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prix réduit promo (optionnel)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ex : 55000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
                  />
                </div>
              </div>

              {/* Gombo de la semaine toggle and date */}
              <div className="p-4 rounded-2xl bg-[#EAF2FB]/70 border border-[#D3E4F7] space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isGomboCheckbox"
                    checked={isGombo}
                    onChange={(e) => setIsGombo(e.target.checked)}
                    className="rounded border-slate-300 text-[#0B2A4A] focus:ring-[#1E63B5]"
                  />
                  <label htmlFor="isGomboCheckbox" className="text-xs text-[#0B2A4A] font-bold cursor-pointer flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#1E63B5]" />
                    Définir comme « Gombo de la semaine »
                  </label>
                </div>

                {isGombo && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date de fin du Gombo *
                    </label>
                    <input
                      type="date"
                      required
                      value={gomboEndDate}
                      onChange={(e) => setGomboEndDate(e.target.value)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white outline-none focus:border-[#1E63B5]"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Après cette date, le pack disparaît automatiquement du bandeau Gombo du site client sans être supprimé.
                    </p>
                  </div>
                )}
              </div>

              {/* Items included in the pack */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Articles inclus dans ce pack ({selectedItems.length}) *
                </label>

                {/* Items chips list */}
                {selectedItems.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    {selectedItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-xs font-semibold text-slate-800 border border-slate-200 shadow-2xs"
                      >
                        <span>✓ {item.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* 1. Pick from existing catalog products */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Sélectionner parmi les articles du catalogue :
                  </span>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-1">
                    {products.map((prod) => {
                      const isSelected = selectedItems.some((i) => i.productId === prod.id);
                      return (
                        <div
                          key={prod.id}
                          onClick={() => handleToggleProductInPack(prod)}
                          className={`p-2 flex items-center justify-between text-xs cursor-pointer rounded-lg transition-colors ${
                            isSelected ? 'bg-[#EAF2FB] text-[#0B2A4A] font-bold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span>{prod.name} ({formatFCFA(prod.price)})</span>
                          <span className="text-xs">{isSelected ? '✓ Inclus' : '+ Ajouter'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Add custom item not in catalog */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Ou ajouter un article hors-catalogue :
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      placeholder="Nom de l’article spécial (ex: Ceinture offerte)"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomItem}
                      className="px-3 py-1.5 bg-[#0B2A4A] text-white text-xs font-bold rounded-lg hover:bg-[#1E63B5]"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>

              {/* Cover photo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Photo de couverture du pack *
                </label>
                <div className="flex items-center gap-3">
                  {photo ? (
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200">
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhoto('')}
                        className="absolute top-1 right-1 p-1 rounded-full bg-rose-500 text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#1E63B5] flex flex-col items-center justify-center cursor-pointer text-slate-400 bg-slate-50">
                      <Upload className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold">Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <span className="text-[11px] text-slate-400 flex-1">
                    Photo d’ensemble mettant en valeur le pack (compressée automatiquement à ~800px).
                  </span>
                </div>
              </div>

              {/* Hide toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hidePackCheckbox"
                  checked={isHidden}
                  onChange={(e) => setIsHidden(e.target.checked)}
                  className="rounded border-slate-300 text-[#0B2A4A] focus:ring-[#1E63B5]"
                />
                <label htmlFor="hidePackCheckbox" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Masquer ce pack du site client pour le moment
                </label>
              </div>

              {/* Submit buttons */}
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
                  disabled={isSaving || isCompressing}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white text-xs sm:text-sm font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Enregistrement...' : editingPack ? 'Mettre à jour le pack' : 'Créer le pack'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Confirmation Modal for deletion */}
      <ConfirmModal
        isOpen={Boolean(packToDelete)}
        title="Supprimer ce pack ?"
        message={`Êtes-vous sûre de vouloir supprimer définitivement le pack « ${packToDelete?.name} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={executeDelete}
        onCancel={() => setPackToDelete(null)}
      />
    </div>
  );
};
