import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Upload, X, Search, Check, Image as ImageIcon, Palette, Ruler, Tag } from 'lucide-react';
import { Product, ProductCategory, ProductGender } from '../../types';
import { formatFCFA, compressImageFile, cleanFirestorePayload } from '../../utils/formatters';
import { addProduct, updateProduct, deleteProduct } from '../../services/storeService';
import { ConfirmModal } from '../common/ConfirmModal';

interface AdminProductsProps {
  products: Product[];
}

export const AdminProducts: React.FC<AdminProductsProps> = ({ products }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('vetements');
  const [gender, setGender] = useState<ProductGender>('femme');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [discountPrice, setDiscountPrice] = useState<number | ''>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isHidden, setIsHidden] = useState(false);

  // Colors variation states
  const [hasMultipleColors, setHasMultipleColors] = useState(false);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState('');

  // Sizes variation states
  const [hasMultipleSizes, setHasMultipleSizes] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [sizeInput, setSizeInput] = useState('');

  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('vetements');
    setGender('femme');
    setDescription('');
    setPrice('');
    setDiscountPrice('');
    setPhotos([]);
    setIsHidden(false);
    setHasMultipleColors(false);
    setAvailableColors([]);
    setColorInput('');
    setHasMultipleSizes(false);
    setAvailableSizes([]);
    setSizeInput('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setGender(p.gender);
    setDescription(p.description || '');
    setPrice(p.price);
    setDiscountPrice(p.discountPrice || '');
    setPhotos(p.photos || []);
    setIsHidden(p.isHidden || false);
    setHasMultipleColors(!!(p.availableColors && p.availableColors.length > 0) || p.hasMultipleColors || false);
    setAvailableColors(p.availableColors || []);
    setColorInput('');
    setHasMultipleSizes(!!(p.availableSizes && p.availableSizes.length > 0) || p.hasMultipleSizes || false);
    setAvailableSizes(p.availableSizes || []);
    setSizeInput('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddColor = (colToAdd?: string) => {
    const col = (colToAdd || colorInput).trim();
    if (!col) return;
    if (!availableColors.includes(col)) {
      setAvailableColors((prev) => [...prev, col]);
    }
    setColorInput('');
  };

  const handleRemoveColor = (colToRemove: string) => {
    setAvailableColors((prev) => prev.filter((c) => c !== colToRemove));
  };

  const handleAddSize = (szToAdd?: string) => {
    const sz = (szToAdd || sizeInput).trim();
    if (!sz) return;
    if (!availableSizes.includes(sz)) {
      setAvailableSizes((prev) => [...prev, sz]);
    }
    setSizeInput('');
  };

  const handleRemoveSize = (szToRemove: string) => {
    setAvailableSizes((prev) => prev.filter((s) => s !== szToRemove));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 3) {
      alert('Vous pouvez ajouter un maximum de 3 photos par produit.');
      return;
    }

    setIsCompressing(true);
    try {
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Compresses image to max 800px browser-side to keep under document limit
        const compressedBase64 = await compressImageFile(file, 800, 0.75);
        compressedList.push(compressedBase64);
      }
      setPhotos((prev) => [...prev, ...compressedList].slice(0, 3));
    } catch (err) {
      console.error('Image compression error:', err);
      alert('Erreur lors du traitement de la photo.');
    } finally {
      setIsCompressing(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Le nom du produit est obligatoire.');
      return;
    }

    if (price === '' || Number(price) <= 0) {
      setFormError('Veuillez saisir un prix valide supérieur à 0.');
      return;
    }

    if (photos.length === 0) {
      setFormError('Veuillez ajouter au moins une photo pour le produit.');
      return;
    }

    setIsSaving(true);
    try {
      const rawPayload = {
        name: name.trim(),
        category,
        gender,
        description: description.trim(),
        price: Number(price),
        photos,
        isHidden,
        hasMultipleColors: Boolean(hasMultipleColors && availableColors.length > 0),
        availableColors: hasMultipleColors && availableColors.length > 0 ? availableColors : [],
        hasMultipleSizes: Boolean(hasMultipleSizes && availableSizes.length > 0),
        availableSizes: hasMultipleSizes && availableSizes.length > 0 ? availableSizes : [],
        ...(discountPrice !== '' && Number(discountPrice) > 0 ? { discountPrice: Number(discountPrice) } : {}),
      };
      const payload = cleanFirestorePayload(rawPayload);

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
      } else {
        await addProduct(payload as any);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving product:', err);
      setFormError('Erreur lors de l’enregistrement. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleHide = async (p: Product) => {
    try {
      await updateProduct(p.id, { isHidden: !p.isHidden });
    } catch (err) {
      console.error('Error toggling product visibility:', err);
    }
  };

  const handleDelete = (p: Product) => {
    setProductToDelete(p);
  };

  const executeDelete = async () => {
    if (!productToDelete) return;
    const targetId = productToDelete.id;

    // 1. Instantly close modal (0ms latency for user)
    setProductToDelete(null);

    // 2. Instantly remove product from UI list
    setOptimisticDeletedIds((prev) => [...prev, targetId]);

    // 3. Permanently delete from Google Cloud Firestore database
    try {
      await deleteProduct(targetId);
    } catch (err) {
      console.error('Error permanently deleting product:', err);
      // Rollback on network failure
      setOptimisticDeletedIds((prev) => prev.filter((id) => id !== targetId));
    }
  };


  // Filtered products list with optimistic removal
  const activeProducts = products.filter((p) => !optimisticDeletedIds.includes(p.id));
  const filtered = activeProducts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white outline-none focus:border-[#1E63B5]"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white outline-none focus:border-[#1E63B5]"
          >
            <option value="all">Toutes les catégories</option>
            <option value="vetements">Vêtements</option>
            <option value="chaussures">Chaussures</option>
            <option value="parfums">Parfums</option>
            <option value="sacs">Sacs</option>
            <option value="accessoires">Accessoires</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="py-2.5 px-4 rounded-xl bg-[#0B2A4A] hover:bg-[#1E63B5] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un produit</span>
        </button>
      </div>

      {/* Products table / cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-[#0B2A4A] font-serif">
            Catalogue de la boutique ({filtered.length} produit{filtered.length > 1 ? 's' : ''})
          </h3>
          <span className="text-[11px] text-slate-400">
            Photos automatiquement optimisées à 800px
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-3">
            <p>Aucun produit dans le catalogue pour le moment.</p>
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2.5 rounded-xl bg-[#0B2A4A] text-white font-bold text-xs hover:bg-[#1E63B5] transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter votre premier produit</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((product) => {
              const coverPhoto = product.photos?.[0] || '';
              return (
                <div
                  key={product.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    product.isHidden ? 'bg-slate-50/70 opacity-70' : 'hover:bg-slate-50/40'
                  }`}
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-3.5">
                    <img
                      src={coverPhoto}
                      alt={product.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl bg-slate-100 shrink-0"
                    />

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {product.name}
                        </span>
                        {product.isHidden && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                            Masqué du site
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="capitalize">{product.category}</span>
                        <span>•</span>
                        <span className="capitalize">{product.gender}</span>
                        <span>•</span>
                        <span>{product.photos?.length || 0} photo{product.photos?.length > 1 ? 's' : ''}</span>
                      </div>

                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-xs sm:text-sm font-bold text-[#0B2A4A] font-serif">
                          {formatFCFA(product.discountPrice || product.price)}
                        </span>
                        {product.discountPrice && (
                          <span className="text-[11px] text-slate-400 line-through">
                            {formatFCFA(product.price)}
                          </span>
                        )}
                      </div>

                      {/* Configured variations badges */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {product.availableColors && product.availableColors.length > 0 ? (
                          <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
                            🎨 {product.availableColors.join(', ')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            Couleur unique
                          </span>
                        )}

                        {product.availableSizes && product.availableSizes.length > 0 ? (
                          <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                            📏 {product.availableSizes.join(', ')}
                          </span>
                        ) : product.category === 'vetements' || product.category === 'chaussures' ? (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            Taille unique
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleHide(product)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        product.isHidden
                          ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                      title={product.isHidden ? 'Rendre visible sur le site' : 'Masquer du site client'}
                    >
                      {product.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">
                        {product.isHidden ? 'Afficher' : 'Masquer'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(product)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-[#0B2A4A] hover:bg-slate-100 transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(product)}
                      className="p-2 rounded-xl border border-slate-200 text-rose-500 hover:bg-rose-50 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto border border-slate-100">
            <div className="p-4 sm:p-5 bg-[#0B2A4A] text-white flex items-center justify-between">
              <h3 className="text-base font-bold font-serif">
                {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
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
                  Nom du produit *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Chemise Lin Slim Fit - Blanc"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
                />
              </div>

              {/* Category and Gender */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catégorie *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white outline-none focus:border-[#1E63B5]"
                  >
                    <option value="vetements">Vêtements</option>
                    <option value="chaussures">Chaussures</option>
                    <option value="parfums">Parfums</option>
                    <option value="sacs">Sacs</option>
                    <option value="accessoires">Accessoires</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Genre *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as ProductGender)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white outline-none focus:border-[#1E63B5]"
                  >
                    <option value="femme">Femme</option>
                    <option value="homme">Homme</option>
                    <option value="unisexe">Unisexe</option>
                  </select>
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prix (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={100}
                    value={price}
                    onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ex : 25000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prix réduit (optionnel)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ex : 20000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Détails sur la matière, coupe, style..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:border-[#1E63B5]"
                />
              </div>

              {/* SECTION: Couleurs et Tailles disponibles (Configurées par la vendeuse) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#1E63B5]" />
                  <h4 className="text-xs sm:text-sm font-bold text-[#0B2A4A]">
                    Caractéristiques & Choix disponibles (Couleurs & Tailles)
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  C'est vous qui définissez exactement quelles couleurs et quelles tailles le client pourra choisir lors de sa commande.
                </p>

                {/* 1. Couleurs */}
                <div className="pt-2 border-t border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={hasMultipleColors}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setHasMultipleColors(checked);
                        }}
                        className="rounded border-slate-300 text-[#0B2A4A] focus:ring-[#1E63B5]"
                      />
                      <Palette className="w-3.5 h-3.5 text-[#1E63B5]" />
                      <span>Plusieurs couleurs disponibles (définies par vous)</span>
                    </label>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {hasMultipleColors ? `${availableColors.length} couleur(s)` : 'Couleur unique'}
                    </span>
                  </div>

                  {hasMultipleColors && (
                    <p className="text-[11px] text-slate-600 bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                      ℹ️ Seules les couleurs ajoutées ci-dessous seront proposées au client. Si aucune couleur n'est ajoutée, le produit restera à couleur unique.
                    </p>
                  )}

                  {hasMultipleColors ? (
                    <div className="space-y-2 pl-6">
                      {/* Active color badges */}
                      <div className="flex flex-wrap gap-1.5 min-h-6">
                        {availableColors.length === 0 ? (
                          <span className="text-[11px] text-amber-700 italic">
                            Aucune couleur sélectionnée. Cliquez ci-dessous ou ajoutez-en une.
                          </span>
                        ) : (
                          availableColors.map((color) => (
                            <span
                              key={color}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-xs"
                            >
                              <span>{color}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveColor(color)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                                title="Supprimer cette couleur"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      {/* Quick presets */}
                      <div className="pt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Suggestions rapides (cliquez pour ajouter) :
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {['Noir', 'Blanc', 'Bleu marine', 'Beige', 'Marron', 'Rouge', 'Vert', 'Doré', 'Gris', 'Rose'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => handleAddColor(c)}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                                availableColors.includes(c)
                                  ? 'bg-[#0B2A4A] text-white'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              + {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Saisie personnalisée */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={colorInput}
                          onChange={(e) => setColorInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddColor();
                            }
                          }}
                          placeholder="Autre couleur (ex: Bleu ciel, Kaki, etc.)..."
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-[#1E63B5]"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddColor()}
                          className="px-3 py-1.5 rounded-xl bg-[#0B2A4A] text-white text-xs font-bold hover:bg-[#1E63B5] transition-colors cursor-pointer"
                        >
                          Ajouter
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 pl-6">
                      ✓ Couleur unique (selon la photo). Le client ne verra pas de sélection superflue.
                    </p>
                  )}
                </div>

                {/* 2. Tailles / Pointures */}
                <div className="pt-3 border-t border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={hasMultipleSizes}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setHasMultipleSizes(checked);
                        }}
                        className="rounded border-slate-300 text-[#0B2A4A] focus:ring-[#1E63B5]"
                      />
                      <Ruler className="w-3.5 h-3.5 text-[#1E63B5]" />
                      <span>Tailles ou pointures disponibles (définies par vous)</span>
                    </label>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {hasMultipleSizes ? `${availableSizes.length} taille(s)` : 'Taille unique'}
                    </span>
                  </div>

                  {hasMultipleSizes && (
                    <p className="text-[11px] text-slate-600 bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                      ℹ️ Seules les tailles/pointures ajoutées ci-dessous seront proposées au client. Si aucune taille n'est ajoutée, le produit restera en taille unique standard.
                    </p>
                  )}

                  {hasMultipleSizes ? (
                    <div className="space-y-2 pl-6">
                      {/* Active size badges */}
                      <div className="flex flex-wrap gap-1.5 min-h-6">
                        {availableSizes.length === 0 ? (
                          <span className="text-[11px] text-amber-700 italic">
                            Aucune taille sélectionnée. Cliquez ci-dessous ou ajoutez-en une.
                          </span>
                        ) : (
                          availableSizes.map((size) => (
                            <span
                              key={size}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-xs"
                            >
                              <span>{size}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSize(size)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                                title="Supprimer cette taille"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      {/* Quick size presets based on category */}
                      <div className="pt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Suggestions rapides pour {category} :
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(category === 'chaussures'
                            ? ['37', '38', '39', '40', '41', '42', '43', '44', '45']
                            : category === 'vetements'
                            ? ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']
                            : category === 'parfums'
                            ? ['30 ml', '50 ml', '100 ml', '200 ml']
                            : ['Petit format', 'Moyen format', 'Grand format', 'Taille Unique']
                          ).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => handleAddSize(s)}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                                availableSizes.includes(s)
                                  ? 'bg-[#0B2A4A] text-white'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              + {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Saisie personnalisée */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={sizeInput}
                          onChange={(e) => setSizeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSize();
                            }
                          }}
                          placeholder="Autre taille ou pointure (ex: 46, 4XL, 150ml)..."
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white outline-none focus:border-[#1E63B5]"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddSize()}
                          className="px-3 py-1.5 rounded-xl bg-[#0B2A4A] text-white text-xs font-bold hover:bg-[#1E63B5] transition-colors cursor-pointer"
                        >
                          Ajouter
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 pl-6">
                      ✓ Taille unique standard. Aucune sélection de taille ne sera demandée au client.
                    </p>
                  )}
                </div>
              </div>

              {/* Photos upload (up to 3 compressed to ~800px) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Photos du produit (jusqu’à 3 photos) *
                </label>
                <div className="text-[11px] text-slate-400 mb-2">
                  Les photos sont automatiquement compressées dans votre navigateur à ~800px avant enregistrement.
                </div>

                {/* Photos previews */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-rose-500 text-white shadow-xs"
                        title="Retirer la photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {photos.length < 3 && (
                    <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#1E63B5] flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-[#1E63B5] bg-slate-50 transition-colors">
                      <Upload className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold">Ajouter</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {isCompressing && (
                  <p className="text-xs text-[#1E63B5] animate-pulse">
                    Compression et optimisation des photos en cours...
                  </p>
                )}
              </div>

              {/* Hide / Unhide status */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isHiddenCheckbox"
                  checked={isHidden}
                  onChange={(e) => setIsHidden(e.target.checked)}
                  className="rounded border-slate-300 text-[#0B2A4A] focus:ring-[#1E63B5]"
                />
                <label htmlFor="isHiddenCheckbox" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Masquer ce produit sur la boutique pour le moment (indisponible)
                </label>
              </div>

              {/* Submit */}
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
                  {isSaving ? 'Enregistrement...' : editingProduct ? 'Enregistrer les modifications' : 'Créer le produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Confirmation Modal for deletion */}
      <ConfirmModal
        isOpen={Boolean(productToDelete)}
        title="Supprimer ce produit ?"
        message={`Êtes-vous sûre de vouloir supprimer définitivement « ${productToDelete?.name} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={executeDelete}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
};
