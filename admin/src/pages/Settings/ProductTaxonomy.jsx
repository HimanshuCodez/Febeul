import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { backendUrl } from "../../App";
import { Tags, Shirt, Layers, Ruler, Save, RefreshCcw, Plus, X, Info } from "lucide-react";
import { DEFAULT_TAXONOMY, fetchTaxonomy, saveTaxonomy } from "../../utils/taxonomy";

const Chip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200">
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="text-gray-400 hover:text-red-600 transition-colors"
      title={`Remove ${label}`}
    >
      <X size={14} />
    </button>
  </span>
);

const AddChipInput = ({ placeholder, onAdd }) => {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
          }
        }}
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={!value.trim()}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={16} /> Add
      </button>
    </div>
  );
};

const ProductTaxonomy = ({ token }) => {
  const [taxonomy, setTaxonomy] = useState(DEFAULT_TAXONOMY);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadTaxonomy = async () => {
    setIsLoading(true);
    const data = await fetchTaxonomy(backendUrl);
    setTaxonomy(data);
    setSelectedCategory((prev) => (data.categories.includes(prev) ? prev : data.categories[0] || ""));
    setIsLoading(false);
  };

  useEffect(() => {
    loadTaxonomy();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await saveTaxonomy(backendUrl, token, taxonomy);
      if (response.success) {
        toast.success("Product taxonomy updated successfully");
      } else {
        toast.error(response.message || "Failed to update taxonomy");
      }
    } catch (error) {
      console.error("Error saving product taxonomy:", error);
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const addCategory = (name) => {
    if (taxonomy.categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      toast.error("That category already exists.");
      return;
    }
    setTaxonomy((prev) => ({
      ...prev,
      categories: [...prev.categories, name],
      typesByCategory: { ...prev.typesByCategory, [name]: [] },
    }));
    setSelectedCategory(name);
  };

  const removeCategory = (name) => {
    if (!window.confirm(`Remove category "${name}"? This also discards its Type list.`)) return;
    setTaxonomy((prev) => {
      const restTypes = { ...prev.typesByCategory };
      delete restTypes[name];
      return {
        ...prev,
        categories: prev.categories.filter((c) => c !== name),
        typesByCategory: restTypes,
      };
    });
    setSelectedCategory((prev) => (prev === name ? "" : prev));
  };

  const addFabric = (name) => {
    if (taxonomy.fabrics.some((f) => f.toLowerCase() === name.toLowerCase())) {
      toast.error("That fabric already exists.");
      return;
    }
    setTaxonomy((prev) => ({ ...prev, fabrics: [...prev.fabrics, name] }));
  };

  const removeFabric = (name) => {
    setTaxonomy((prev) => ({ ...prev, fabrics: prev.fabrics.filter((f) => f !== name) }));
  };

  const addSize = (name) => {
    if (taxonomy.sizes.some((s) => s.toLowerCase() === name.toLowerCase())) {
      toast.error("That size already exists.");
      return;
    }
    setTaxonomy((prev) => ({ ...prev, sizes: [...prev.sizes, name] }));
  };

  const removeSize = (name) => {
    setTaxonomy((prev) => ({ ...prev, sizes: prev.sizes.filter((s) => s !== name) }));
  };

  const addType = (name) => {
    if (!selectedCategory) {
      toast.error("Select a category first.");
      return;
    }
    const existing = taxonomy.typesByCategory[selectedCategory] || [];
    if (existing.some((t) => t.toLowerCase() === name.toLowerCase())) {
      toast.error("That type already exists for this category.");
      return;
    }
    setTaxonomy((prev) => ({
      ...prev,
      typesByCategory: {
        ...prev.typesByCategory,
        [selectedCategory]: [...(prev.typesByCategory[selectedCategory] || []), name],
      },
    }));
  };

  const removeType = (name) => {
    setTaxonomy((prev) => ({
      ...prev,
      typesByCategory: {
        ...prev.typesByCategory,
        [selectedCategory]: (prev.typesByCategory[selectedCategory] || []).filter((t) => t !== name),
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  const typesForSelectedCategory = taxonomy.typesByCategory[selectedCategory] || [];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Product Taxonomy</h2>
            <p className="text-gray-500 text-sm mt-1">Manage the Category, Fabric, Size, and Type lists used across product forms and the storefront nav</p>
          </div>
          <div className="p-3 rounded-xl bg-pink-100 text-pink-600">
            <Tags size={28} />
          </div>
        </div>

        <div className="p-8 space-y-10">
          {/* Categories */}
          <section>
            <div className="flex items-center gap-2 mb-6 border-b pb-2">
              <Layers className="text-purple-500" size={20} />
              <h3 className="font-bold text-gray-800">Categories</h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {taxonomy.categories.length > 0 ? (
                taxonomy.categories.map((cat) => (
                  <Chip key={cat} label={cat} onRemove={() => removeCategory(cat)} />
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">No categories yet.</p>
              )}
            </div>
            <AddChipInput placeholder="e.g. ROBES" onAdd={addCategory} />
          </section>

          {/* Fabrics */}
          <section>
            <div className="flex items-center gap-2 mb-6 border-b pb-2">
              <Shirt className="text-blue-500" size={20} />
              <h3 className="font-bold text-gray-800">Fabrics</h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {taxonomy.fabrics.length > 0 ? (
                taxonomy.fabrics.map((fabric) => (
                  <Chip key={fabric} label={fabric} onRemove={() => removeFabric(fabric)} />
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">No fabrics yet.</p>
              )}
            </div>
            <AddChipInput placeholder="e.g. Chiffon" onAdd={addFabric} />
          </section>

          {/* Sizes */}
          <section>
            <div className="flex items-center gap-2 mb-6 border-b pb-2">
              <Ruler className="text-orange-500" size={20} />
              <h3 className="font-bold text-gray-800">Sizes</h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {taxonomy.sizes.length > 0 ? (
                taxonomy.sizes.map((size) => (
                  <Chip key={size} label={size} onRemove={() => removeSize(size)} />
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">No sizes yet.</p>
              )}
            </div>
            <AddChipInput placeholder="e.g. 3XL" onAdd={addSize} />
          </section>

          {/* Types (per category) */}
          <section>
            <div className="flex items-center gap-2 mb-6 border-b pb-2">
              <Tags className="text-emerald-500" size={20} />
              <h3 className="font-bold text-gray-800">Types (per Category)</h3>
            </div>
            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-600 block mb-2">Editing types for</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full max-w-xs px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
              >
                <option value="">Select a category</option>
                {taxonomy.categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {selectedCategory ? (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {typesForSelectedCategory.length > 0 ? (
                    typesForSelectedCategory.map((type) => (
                      <Chip key={type} label={type} onRemove={() => removeType(type)} />
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic">No types yet for {selectedCategory}.</p>
                  )}
                </div>
                <AddChipInput placeholder={`e.g. New ${selectedCategory} type`} onAdd={addType} />
              </>
            ) : (
              <p className="text-xs text-gray-400 italic">Pick a category above to manage its types.</p>
            )}
          </section>

          <div className="pt-8 border-t border-gray-50 flex justify-end gap-4">
            <button
              onClick={loadTaxonomy}
              className="flex items-center gap-2 px-6 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all font-medium text-gray-600"
            >
              <RefreshCcw size={18} />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-2 rounded-xl bg-black text-white hover:bg-gray-800 transition-all font-medium disabled:bg-gray-400"
            >
              {isSaving ? <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div> : <Save size={18} />}
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 rounded-2xl bg-amber-50 border border-amber-100 flex gap-4">
        <div className="p-2 h-fit bg-amber-100 rounded-lg text-amber-600">
          <Info size={20} />
        </div>
        <div>
          <h4 className="font-bold text-amber-900 mb-1 text-sm italic">Where this shows up</h4>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            These lists power the Category/Fabric/Size/Type dropdowns on the Add &amp; Update product pages, and the storefront Navbar's mega menu builds itself
            from the same Categories and Types automatically. Removing a category, size, or type here does not change any existing products — it only affects
            what's offered going forward.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProductTaxonomy;
