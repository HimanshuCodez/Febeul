/* eslint-disable react/prop-types -- Authentication props are supplied by the admin routes. */
import { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import ReactQuill from "../components/SafeRichText";
import "react-quill-new/dist/quill.snow.css";
import Loading from "../components/Loading";
import EditableSelect from "../components/EditableSelect";
import ProductImageGallery from "../components/ProductImageGallery";
import useProductDraft from '../hooks/useProductDraft';
import ProductDraftStatus from '../components/ProductDraftStatus';
import { DEFAULT_TAXONOMY, fetchTaxonomy, saveTaxonomy } from "../utils/taxonomy";
import { validateProductImageUploads } from '../../../shared/productUploads.js';
import {
  PackagePlus,
  Palette,
  ScrollText,
  Truck,
  Sparkles,
  Trash2,
  Tags,
  Package,
  Save,
} from "lucide-react";

const inputClass = "w-full min-w-0 rounded-lg border border-[#e4dce9] bg-white px-3 py-2.5 text-sm text-[#514459] outline-none transition-shadow placeholder:text-[#a99bad] focus:border-[#b77997] focus:ring-2 focus:ring-[#f5e9f0]";
const sectionClass = "min-w-0 rounded-2xl border border-[#eae5ed] bg-white p-4 shadow-sm sm:p-6";

const Add = ({ token, draftOwner }) => {
  const { values, setField, draft } = useProductDraft({ owner: draftOwner, namespace: backendUrl });
  const {
    name, description, category, type, variations, bestseller,
    isLuxePrive, isActive, countryOfOrigin, manufacturer, packer, includedComponents,
    fabric, pattern, sleeveStyle, sleeveLength, neck, hsn,
    materialComposition, careInstructions, closureType, materialType, itemWeight, itemDimensionsLxWxH,
    netQuantity, genericName, keywords, newSizeInput,
  } = values;
  const [taxonomy, setTaxonomy] = useState(DEFAULT_TAXONOMY);

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingSkus, setExistingSkus] = useState([]);

  useEffect(() => {
    const fetchExistingSkus = async () => {
      try {
        const response = await axios.get(backendUrl + "/api/product/list");
        if (response.data.success) {
          const skus = response.data.products.flatMap(p =>
            p.variations.map(v => v.sku)
          ).filter(sku => sku);
          setExistingSkus(skus);
        }
      } catch (error) {
        console.error("Error fetching SKUs:", error);
      }
    };
    fetchExistingSkus();
  }, []);

  useEffect(() => {
    const loadTaxonomy = async () => {
      const data = await fetchTaxonomy(backendUrl);
      setTaxonomy(data);
    };
    loadTaxonomy();
  }, []);

  const handleCategoryChange = (newCategory) => {
    setField('category', newCategory);
    const disabledTypes = taxonomy.disabledTypesByCategory?.[newCategory] || [];
    const validTypes = (taxonomy.typesByCategory[newCategory] || []).filter((t) => !disabledTypes.includes(t));
    if (type && !validTypes.includes(type)) {
      setField('type', "");
    }
    const disabledFabrics = taxonomy.disabledFabricsByCategory?.[newCategory] || [];
    if (fabric && disabledFabrics.includes(fabric)) {
      setField('fabric', "");
    }
  };

  const addCategory = async (newName) => {
    const updated = {
      ...taxonomy,
      categories: taxonomy.categories.includes(newName) ? taxonomy.categories : [...taxonomy.categories, newName],
      typesByCategory: { ...taxonomy.typesByCategory, [newName]: taxonomy.typesByCategory[newName] || [] },
    };
    try {
      await saveTaxonomy(backendUrl, token, updated);
      setTaxonomy(updated);
      toast.success(`Category "${newName}" added.`);
    } catch (error) {
      toast.error("Failed to save new category, but you can still use it for this product.");
    }
  };

  const addFabric = async (newName) => {
    const updated = {
      ...taxonomy,
      fabrics: taxonomy.fabrics.includes(newName) ? taxonomy.fabrics : [...taxonomy.fabrics, newName],
    };
    try {
      await saveTaxonomy(backendUrl, token, updated);
      setTaxonomy(updated);
      toast.success(`Fabric "${newName}" added.`);
    } catch (error) {
      toast.error("Failed to save new fabric, but you can still use it for this product.");
    }
  };

  const addTaxonomySize = async (newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (taxonomy.sizes.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("That size already exists.");
      return;
    }
    const updated = { ...taxonomy, sizes: [...taxonomy.sizes, trimmed] };
    try {
      await saveTaxonomy(backendUrl, token, updated);
      setTaxonomy(updated);
      toast.success(`Size "${trimmed}" added.`);
    } catch (error) {
      toast.error("Failed to save new size, but you can still use it for this product.");
      setTaxonomy(updated);
    }
    setField('newSizeInput', "");
  };

  const addType = async (newName) => {
    if (!category) {
      toast.error("Please select a Category before adding a Type.");
      throw new Error("No category selected");
    }
    const existingTypes = taxonomy.typesByCategory[category] || [];
    const updated = {
      ...taxonomy,
      typesByCategory: {
        ...taxonomy.typesByCategory,
        [category]: existingTypes.includes(newName) ? existingTypes : [...existingTypes, newName],
      },
    };
    try {
      await saveTaxonomy(backendUrl, token, updated);
      setTaxonomy(updated);
      toast.success(`Type "${newName}" added to ${category}.`);
    } catch (error) {
      toast.error("Failed to save new type, but you can still use it for this product.");
    }
  };

  const isSkuDuplicate = (sku, index) => {
    if (!sku) return false;
    const skuLower = sku.toLowerCase().trim();
    // Check against existing products in DB
    if (existingSkus.some(s => s?.toLowerCase().trim() === skuLower)) return true;
    // Check against other variations in current form
    return variations.some((v, idx) => v.sku?.toLowerCase().trim() === skuLower && idx !== index);
  };

  const handleVariationChange = (index, event) => {
    const newVariations = [...variations];
    newVariations[index][event.target.name] = event.target.value;
    setField('variations', newVariations);
  };

  const handleSizeChange = (v_index, s_index, event) => {
    const newVariations = [...variations];
    newVariations[v_index].sizes[s_index][event.target.name] =
      event.target.value;
    setField('variations', newVariations);
  };

  const handleImageChange = (index, event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    const error = validateProductImageUploads([...variations.flatMap(variation => variation.images), ...files]);
    if (error) { toast.error(error); return; }
    setField('variations', previous => previous.map((variation, i) => i === index ? { ...variation, images: [...variation.images, ...files] } : variation));
  };

  const addVariation = () => {
    setField('variations', [...variations, { color: "", images: [], sizes: [], sku: "" }]);
  };

  const removeVariation = (index) => {
    const newVariations = [...variations];
    newVariations.splice(index, 1);
    setField('variations', newVariations);
  };

  const addSize = (v_index, size) => {
    const newVariations = [...variations];
    newVariations[v_index].sizes.push({ size: size, price: "", mrp: "", stock: "" });
    setField('variations', newVariations);
  };

  const removeSize = (v_index, s_index) => {
    const newVariations = [...variations];
    newVariations[v_index].sizes.splice(s_index, 1);
    setField('variations', newVariations);
  };

  const updateImages = (index, images) => {
    setField('variations', previous => previous.map((variation, i) => i === index ? { ...variation, images } : variation));
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (loading || !draft.ready || draft.status === 'clearing') return;
    const imageError = validateProductImageUploads(variations.flatMap(variation => variation.images));
    if (imageError) { toast.error(imageError); return; }
    setLoading(true);
    setUploadProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 5; // Increment by 5%
      if (progress >= 95) {
        clearInterval(interval); // Stop at 95%
      }
      setUploadProgress(progress);
    }, 500); // Update every 500ms (adjust as needed)

    try {
      // Validate variations: must have at least one size with price and mrp
      for (const variation of variations) {
        if (!variation.sizes || variation.sizes.length === 0) {
          toast.error(`Variation with color '${variation.color || "N/A"}' must have at least one size.`);
          setLoading(false);
          clearInterval(interval);
          setUploadProgress(0);
          return;
        }
        for (const size of variation.sizes) {
          if (!size.price || !size.mrp || parseFloat(size.price) <= 0 || parseFloat(size.mrp) <= 0) {
            toast.error(`Size '${size.size}' in variation with color '${variation.color || "N/A"}' must have valid positive Price and MRP.`);
            setLoading(false);
            clearInterval(interval);
            setUploadProgress(0);
            return;
          }
        }
      }

      // Validate SKUs
      for (let i = 0; i < variations.length; i++) {
        if (isSkuDuplicate(variations[i].sku, i)) {
          toast.error(`SKU '${variations[i].sku}' is already listed or duplicated. Please use another.`);
          setLoading(false);
          clearInterval(interval);
          setUploadProgress(0);
          return;
        }
      }

      await draft.save();
      const formData = new FormData();

      formData.append("name", name);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("bestseller", bestseller);
      formData.append("isLuxePrive", isLuxePrive);
      formData.append("isActive", isActive);
      formData.append("countryOfOrigin", countryOfOrigin);
      formData.append("manufacturer", manufacturer);
      formData.append("packer", packer);
      formData.append("includedComponents", includedComponents);
      formData.append("fabric", fabric);
      formData.append("type", type);
      formData.append("pattern", pattern);
      formData.append("sleeveStyle", sleeveStyle);
      formData.append("sleeveLength", sleeveLength);
      formData.append("neck", neck);
      formData.append("hsn", hsn);
      formData.append("materialComposition", materialComposition);
      formData.append("careInstructions", careInstructions);
      formData.append("closureType", closureType);
      formData.append("materialType", materialType);
      formData.append("itemWeight", itemWeight);
      formData.append("itemDimensionsLxWxH", itemDimensionsLxWxH);
      formData.append("netQuantity", netQuantity);
      formData.append("genericName", genericName);
      formData.append("keywords", keywords);

      const variationsData = variations.map((v) => ({
        color: v.color,
        sku: v.sku,
        sizes: v.sizes.map((s) => ({
          size: s.size,
          price: s.price,
          mrp: s.mrp,
          stock: s.stock
        })),
      }));
      formData.append("variations", JSON.stringify(variationsData));

      variations.forEach((variation, v_idx) => {
        variation.images.forEach((image) => {
          formData.append(`variations[${v_idx}][images]`, image);
        });
      });

      const response = await axios.post(
        backendUrl + "/api/product/add",
        formData,
        {
          headers: { token },
        },
      );

      clearInterval(interval); // Clear interval on response
      setUploadProgress(100); // Set to 100% immediately on response

      if (response.data.success) {
        toast.success(response.data.message);
        await draft.clear(true);
        setLoading(false);
        // Refresh existing SKUs after adding
        const updatedSkusResponse = await axios.get(backendUrl + "/api/product/list");
        if (updatedSkusResponse.data.success) {
          setExistingSkus(updatedSkusResponse.data.products.flatMap(p => p.variations.map(v => v.sku)).filter(sku => sku));
        }
      } else {
        toast.error(response.data.message);
        setLoading(false);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || error.message || 'Unable to add product. Please try again.');
      clearInterval(interval); // Clear interval on error
      setUploadProgress(0); // Reset progress on error
      setLoading(false);
    }
  };

  const disabledTypes = taxonomy.disabledTypesByCategory?.[category] || [];
  const typeOptions = (taxonomy.typesByCategory[category] || []).filter((t) => !disabledTypes.includes(t));
  const disabledFabrics = taxonomy.disabledFabricsByCategory?.[category] || [];
  const fabricOptions = taxonomy.fabrics.filter((f) => !disabledFabrics.includes(f));

  return (
    <form onSubmit={onSubmitHandler} className="mx-auto w-full max-w-[1500px] pb-6 font-[Outfit,sans-serif] text-[#342a3c] [&_*]:[font-family:inherit] [&_input]:min-w-0 [&_select]:min-w-0 [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-[#ad708f] motion-reduce:[&_*]:transition-none">
      <header className="mb-6 flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2.5 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[#947c8c]"><span className="h-1.5 w-1.5 rotate-45 rounded-sm bg-[#c77893]" />FEBEUL / CATALOG</p>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.04em] sm:text-[34px]">Add new product<span className="text-[#c77893]">.</span></h1>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-[#8b7b93] sm:text-[13px]">Build your listing with product details, images, and inventory.</p>
        </div>
        <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[#e7dce8] bg-white px-3 py-2 text-[11px] font-medium text-[#96768c]"><PackagePlus size={15} aria-hidden="true" />New listing</span>
      </header>

      <ProductDraftStatus draft={draft} disabled={loading} />
      <fieldset disabled={!draft.ready || loading || draft.status === 'clearing'} className="min-w-0">

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-5">
          <section id="product-basics" aria-labelledby="product-basics-title" className={sectionClass}>
            <div className="mb-6 flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#faf0f5] text-[#ae708b]"><ScrollText size={18} aria-hidden="true" /></span>
              <div><h2 id="product-basics-title" className="text-base font-semibold tracking-tight text-[#342a3c]">Basic Info</h2><p className="mt-1 text-xs leading-relaxed text-[#8b7b93]">The name and description customers see on your product page.</p></div>
            </div>

            <div className="space-y-6">
              <div className="w-full">
                <label htmlFor="product-name" className="mb-2 block text-xs font-medium text-[#776580]">Product name</label>
                <input id="product-name"
                  onChange={(e) => setField('name', e.target.value)}
                  value={name}
                  className={inputClass}
                  type="text"
                  placeholder="Type here"
                  required
                />
              </div>

              <div className="w-full">
                <p className="mb-2 block text-xs font-medium text-[#776580]">Product description</p>
                <ReactQuill
                  theme="snow" readOnly={!draft.ready || loading || draft.status === 'clearing'}
                  value={description}
                  onChange={(value, _delta, source) => { if (source === 'user') setField('description', value); }}
                  className="w-full [&_.ql-toolbar.ql-snow]:rounded-t-xl [&_.ql-toolbar.ql-snow]:border-[#e4dce9] [&_.ql-toolbar.ql-snow]:bg-[#fcfafd] [&_.ql-container.ql-snow]:rounded-b-xl [&_.ql-container.ql-snow]:border-[#e4dce9] [&_.ql-editor]:min-h-44 [&_.ql-editor]:text-sm [&_.ql-editor]:text-[#514459] [&_.ql-tooltip]:left-0 [&_.ql-tooltip]:max-w-full [&_.ql-tooltip]:whitespace-normal"
                />
              </div>

              <div className="w-full">
                <label htmlFor="product-keywords" className="mb-2 block text-xs font-medium text-[#776580]">Product Keywords</label>
                <input id="product-keywords"
                  onChange={(e) => setField('keywords', e.target.value)}
                  value={keywords}
                  className={inputClass}
                  type="text"
                  placeholder="Enter comma-separated keywords"
                />
              </div>
            </div>
          </section>

          <section id="product-variations" aria-labelledby="product-variations-title" className={sectionClass}>
            <div className="mb-6 flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#faf0f5] text-[#ae708b]"><Palette size={18} aria-hidden="true" /></span>
              <div><h2 id="product-variations-title" className="text-base font-semibold tracking-tight text-[#342a3c]">Variations</h2><p className="mt-1 text-xs leading-relaxed text-[#8b7b93]">Manage colors, SKUs, sizes, prices, and images in one place.</p></div>
            </div>

            <div className="space-y-4">
              {variations.map((variation, v_index) => (
                <div
                  key={v_index} role="group" aria-label={"Variation " + (v_index + 1)}
                  className="relative flex w-full min-w-0 flex-col gap-5 rounded-xl border border-[#e9e0ed] bg-[#fcfafd] p-3 sm:p-5"
                >
                  <p className="w-full border-b border-[#eee6f1] pb-3 text-xs font-semibold uppercase tracking-wider text-[#9b718b]">Variation {v_index + 1}</p>

                  <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="min-w-0">
                      <label htmlFor={"product-color-" + v_index} className="mb-2 block text-xs font-medium text-[#776580]">Color</label>
                      <input id={"product-color-" + v_index}
                        name="color"
                        onChange={(e) => handleVariationChange(v_index, e)}
                        value={variation.color}
                        className={inputClass}
                        type="text"
                        placeholder="e.g. Red"
                        required
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-[#776580]">
                        SKU
                        {isSkuDuplicate(variation.sku, v_index) && (
                          <span className="text-[10px] font-medium text-rose-600">SKU already exists. Please use another.</span>
                        )}
                      </p>
                      <input
                        aria-label={"SKU for variation " + (v_index + 1)} name="sku"
                        onChange={(e) => handleVariationChange(v_index, e)}
                        value={variation.sku}
                        className={`w-full min-w-0 px-3 py-2.5 border rounded-lg text-sm text-[#514459] outline-none focus:ring-2 focus:ring-[#f5e9f0] ${isSkuDuplicate(variation.sku, v_index) ? 'border-red-500 bg-red-50' : 'border-[#e4dce9] bg-white'}`}
                        type="text"
                        placeholder="e.g. S-110"
                      />
                    </div>
                  </div>

                  <div className="flex w-full min-w-0 flex-col gap-5">
                    <div className="min-w-0">
                      <p className="mb-2 block text-xs font-medium text-[#776580]">Sizes & Pricing</p>
                      {variation.sizes.map((sizeData, s_index) => (
                        <div key={s_index} className="mb-3 grid min-w-0 grid-cols-2 items-end gap-2 rounded-xl border border-[#ece4f0] bg-white p-3 min-[900px]:grid-cols-[minmax(64px,0.8fr)_repeat(3,minmax(0,1fr))_36px]">
                          <div className="min-w-0">
                            <label htmlFor={"product-size-" + v_index + "-" + s_index} className="mb-1.5 block text-[11px] font-medium text-[#927d9d]">Size</label>
                            <input id={"product-size-" + v_index + "-" + s_index}
                              name="size"
                              value={sizeData.size}
                              readOnly
                              className="w-full min-w-0 rounded-lg border border-[#e4dce9] bg-[#f8f4fa] px-3 py-2.5 text-sm font-medium text-[#7d6688]"
                            />
                          </div>
                          <div>
                            <label htmlFor={"product-mrp-" + v_index + "-" + s_index} className="mb-1.5 block text-[11px] font-medium text-[#927d9d]">MRP</label>
                            <input id={"product-mrp-" + v_index + "-" + s_index}
                              name="mrp"
                              onChange={(e) => handleSizeChange(v_index, s_index, e)}
                              value={sizeData.mrp}
                              className={inputClass}
                              type="number"
                              placeholder="MRP"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor={"product-price-" + v_index + "-" + s_index} className="mb-1.5 block text-[11px] font-medium text-[#927d9d]">Price</label>
                            <input id={"product-price-" + v_index + "-" + s_index}
                              name="price"
                              onChange={(e) => handleSizeChange(v_index, s_index, e)}
                              value={sizeData.price}
                              className={inputClass}
                              type="number"
                              placeholder="Price"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor={"product-stock-" + v_index + "-" + s_index} className="mb-1.5 block text-[11px] font-medium text-[#927d9d]">Stock</label>
                            <input id={"product-stock-" + v_index + "-" + s_index}
                              name="stock"
                              onChange={(e) => handleSizeChange(v_index, s_index, e)}
                              value={sizeData.stock}
                              className={inputClass}
                              type="number"
                              placeholder="Stock"
                              required
                            />
                          </div>
                          <button
                            type="button"
                            aria-label={"Remove size " + sizeData.size + " from variation " + (v_index + 1)} onClick={() => removeSize(v_index, s_index)}
                            className="col-span-2 grid h-10 w-9 place-items-center justify-self-end rounded-lg text-[#b47a90] transition-colors hover:bg-rose-50 hover:text-rose-600 min-[900px]:col-span-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-3 flex-wrap items-center">
                        {taxonomy.sizes
                          .filter((size) => !variation.sizes.some((s) => s.size === size))
                          .map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => addSize(v_index, size)}
                              className="min-h-9 rounded-lg border border-[#e5dbe9] bg-white px-3 py-2 text-xs font-medium text-[#897094] transition-colors hover:border-[#c69ab1] hover:bg-[#faf1f6] hover:text-[#a4587b]"
                            >
                              + {size}
                            </button>
                          ))}
                        <div className="flex min-w-0 gap-1">
                          <input
                            type="text"
                            value={newSizeInput}
                            onChange={(e) => setField('newSizeInput', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addTaxonomySize(newSizeInput);
                              }
                            }}
                            placeholder="New size e.g. 3XL"
                            className="w-32 min-w-0 rounded-lg border border-dashed border-[#d6c5de] bg-white px-2 py-2 text-xs outline-none focus:border-[#b77997] focus:ring-2 focus:ring-[#f5e9f0]"
                          />
                          <button
                            type="button"
                            onClick={() => addTaxonomySize(newSizeInput)}
                            disabled={!newSizeInput.trim()}
                            className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    <ProductImageGallery images={variation.images} variationIndex={v_index} disabled={!draft.ready || loading || draft.status === 'clearing'}
                      onChange={images => updateImages(v_index, images)} onUpload={event => handleImageChange(v_index, event)} />
                  </div>
                  {variations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariation(v_index)}
                      className="self-end rounded-lg px-3 py-2 text-xs font-medium text-[#b4758d] transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      Remove Variation
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addVariation}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#d6c5de] bg-[#fcf8fd] px-4 py-3 text-xs font-medium text-[#93729e] transition-colors hover:border-[#b77997] hover:bg-[#faf0f6]"
            >
              + Add Variation
            </button>
          </section>

          <section id="product-attributes" aria-labelledby="product-attributes-title" className={sectionClass}>
            <div className="mb-6 flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#faf0f5] text-[#ae708b]"><Tags size={18} aria-hidden="true" /></span>
              <div><h2 id="product-attributes-title" className="text-base font-semibold tracking-tight text-[#342a3c]">Category & Attributes</h2><p className="mt-1 text-xs leading-relaxed text-[#8b7b93]">Organize the product and describe its fit, fabric, and finish.</p></div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
              <EditableSelect
                label="Category"
                options={taxonomy.categories}
                value={category}
                onChange={handleCategoryChange}
                onAddNew={addCategory}
                required
              />
              <EditableSelect
                label="Fabric"
                options={fabricOptions}
                value={fabric}
                onChange={value => setField('fabric', value)}
                onAddNew={addFabric}
              />
              <EditableSelect
                label="Type"
                options={typeOptions}
                value={type}
                onChange={value => setField('type', value)}
                onAddNew={addType}
              />

              <div className="w-full">
                <label htmlFor="product-pattern" className="mb-2 block text-xs font-medium text-[#776580]">Pattern</label>
                <input id="product-pattern" onChange={(e) => setField('pattern', e.target.value)} value={pattern} className={inputClass} type="text" placeholder="indo western" />
              </div>
              <div className="w-full">
                <label htmlFor="product-sleeve-style" className="mb-2 block text-xs font-medium text-[#776580]">Sleeve Style</label>
                <input id="product-sleeve-style" onChange={(e) => setField('sleeveStyle', e.target.value)} value={sleeveStyle} className={inputClass} type="text" placeholder="straight with cutwork" />
              </div>
              <div className="w-full">
                <label htmlFor="product-sleeve-length" className="mb-2 block text-xs font-medium text-[#776580]">Sleeve Length</label>
                <input id="product-sleeve-length" onChange={(e) => setField('sleeveLength', e.target.value)} value={sleeveLength} className={inputClass} type="text" placeholder="19.5" />
              </div>
              <div className="w-full">
                <label htmlFor="product-neck" className="mb-2 block text-xs font-medium text-[#776580]">Neck</label>
                <input id="product-neck" onChange={(e) => setField('neck', e.target.value)} value={neck} className={inputClass} type="text" placeholder="round" />
              </div>
              <div className="w-full">
                <label htmlFor="product-material-composition" className="mb-2 block text-xs font-medium text-[#776580]">Material Composition</label>
                <input id="product-material-composition" onChange={(e) => setField('materialComposition', e.target.value)} value={materialComposition} className={inputClass} type="text" placeholder="92% Net, 8% Lace" />
              </div>
              <div className="w-full">
                <label htmlFor="product-closure-type" className="mb-2 block text-xs font-medium text-[#776580]">Closure Type</label>
                <input id="product-closure-type" onChange={(e) => setField('closureType', e.target.value)} value={closureType} className={inputClass} type="text" placeholder="Tie" />
              </div>
              <div className="w-full">
                <label htmlFor="product-material-type" className="mb-2 block text-xs font-medium text-[#776580]">Material Type</label>
                <input id="product-material-type" onChange={(e) => setField('materialType', e.target.value)} value={materialType} className={inputClass} type="text" placeholder="Lace, Net" />
              </div>
              <div className="w-full">
                <label htmlFor="product-care-instructions" className="mb-2 block text-xs font-medium text-[#776580]">Care Instructions</label>
                <input id="product-care-instructions" onChange={(e) => setField('careInstructions', e.target.value)} value={careInstructions} className={inputClass} type="text" placeholder="Machine Wash" />
              </div>
              <div className="w-full">
                <label htmlFor="product-generic-name" className="mb-2 block text-xs font-medium text-[#776580]">Generic Name</label>
                <input id="product-generic-name" onChange={(e) => setField('genericName', e.target.value)} value={genericName} className={inputClass} type="text" placeholder="Nightgown" />
              </div>
            </div>
          </section>

          <section id="product-shipping" aria-labelledby="product-shipping-title" className={sectionClass}>
            <div className="mb-6 flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#faf0f5] text-[#ae708b]"><Truck size={18} aria-hidden="true" /></span>
              <div><h2 id="product-shipping-title" className="text-base font-semibold tracking-tight text-[#342a3c]">Compliance & Shipping Details</h2><p className="mt-1 text-xs leading-relaxed text-[#8b7b93]">Add origin, packaging, and shipping information.</p></div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
              <div className="w-full">
                <label htmlFor="product-country-of-origin" className="mb-2 block text-xs font-medium text-[#776580]">Country of Origin</label>
                <input id="product-country-of-origin" onChange={(e) => setField('countryOfOrigin', e.target.value)} value={countryOfOrigin} className={inputClass} type="text" placeholder="India" />
              </div>
              <div className="w-full">
                <label htmlFor="product-manufacturer" className="mb-2 block text-xs font-medium text-[#776580]">Manufacturer</label>
                <input id="product-manufacturer" onChange={(e) => setField('manufacturer', e.target.value)} value={manufacturer} className={inputClass} type="text" placeholder="King style knitwear" />
              </div>
              <div className="w-full">
                <label htmlFor="product-packer" className="mb-2 block text-xs font-medium text-[#776580]">Packer</label>
                <input id="product-packer" onChange={(e) => setField('packer', e.target.value)} value={packer} className={inputClass} type="text" placeholder="King style knitwear" />
              </div>
              <div className="w-full">
                <label htmlFor="product-included-components" className="mb-2 block text-xs font-medium text-[#776580]">Included Components</label>
                <input id="product-included-components" onChange={(e) => setField('includedComponents', e.target.value)} value={includedComponents} className={inputClass} type="text" placeholder="1 shirt, 1 pant" />
              </div>
              <div className="w-full">
                <label htmlFor="product-hsn" className="mb-2 block text-xs font-medium text-[#776580]">HSN</label>
                <input id="product-hsn" onChange={(e) => setField('hsn', e.target.value)} value={hsn} className={inputClass} type="text" placeholder="6204" />
              </div>
              <div className="w-full">
                <label htmlFor="product-item-weight" className="mb-2 block text-xs font-medium text-[#776580]">Item Weight</label>
                <input id="product-item-weight" onChange={(e) => setField('itemWeight', e.target.value)} value={itemWeight} className={inputClass} type="text" placeholder="150 g" />
              </div>
              <div className="w-full">
                <label htmlFor="product-item-dimensions-lxwxh" className="mb-2 block text-xs font-medium text-[#776580]">Item Dimensions LxWxH</label>
                <input id="product-item-dimensions-lxwxh" onChange={(e) => setField('itemDimensionsLxWxH', e.target.value)} value={itemDimensionsLxWxH} className={inputClass} type="text" placeholder="22 x 20 x 2 Centimeters" />
              </div>
              <div className="w-full">
                <label htmlFor="product-net-quantity" className="mb-2 block text-xs font-medium text-[#776580]">Net Quantity</label>
                <input id="product-net-quantity" onChange={(e) => setField('netQuantity', e.target.value)} value={netQuantity} className={inputClass} type="text" placeholder="1.0 Count" />
              </div>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-6">
          <section className={sectionClass} aria-labelledby="product-publishing-title"><div className="mb-6 flex items-start gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#faf0f5] text-[#ae708b]"><Sparkles size={18} aria-hidden="true" /></span>
                        <div><h2 id="product-publishing-title" className="text-base font-semibold tracking-tight text-[#342a3c]">Publishing</h2><p className="mt-1 text-xs leading-relaxed text-[#8b7b93]">Choose how this product appears in your store.</p></div>
                      </div>
            <div className="space-y-3">
              <label htmlFor="isActive" className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#eae1ef] bg-[#fcfafd] p-3 transition-colors hover:border-[#d1b4c8] has-[:checked]:border-[#ddc4d4] has-[:checked]:bg-[#fbf1f7]">
                <input
                  onChange={() => setField('isActive', (prev) => !prev)}
                  checked={isActive}
                  type="checkbox"
                  id="isActive"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#a86386]"
                />
                <span className="text-xs font-medium leading-relaxed text-[#725e7f]">Visible on Website</span>
              </label>

              <label htmlFor="isLuxePrive" className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#eae1ef] bg-[#fcfafd] p-3 transition-colors hover:border-[#d1b4c8] has-[:checked]:border-[#ddc4d4] has-[:checked]:bg-[#fbf1f7]">
                <input
                  onChange={() => setField('isLuxePrive', (prev) => !prev)}
                  checked={isLuxePrive}
                  type="checkbox"
                  id="isLuxePrive"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#a86386]"
                />
                <span className="text-xs font-medium leading-relaxed text-[#725e7f]">Add to Luxe Prive Sale</span>
              </label>

              <label htmlFor="isBestseller" className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#eae1ef] bg-[#fcfafd] p-3 transition-colors hover:border-[#d1b4c8] has-[:checked]:border-[#ddc4d4] has-[:checked]:bg-[#fbf1f7]">
                <input
                  onChange={() => setField('bestseller', (prev) => !prev)}
                  checked={bestseller}
                  type="checkbox"
                  id="isBestseller"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#a86386]"
                />
                <span className="text-xs font-medium leading-relaxed text-[#725e7f]">Add to Bestseller</span>
              </label>
            </div>
          <p className="mt-4 text-[11px] leading-relaxed text-[#96859f]">These settings take effect when you add the product.</p></section>
          <section className="rounded-2xl bg-[#302735] p-5 text-white" aria-labelledby="product-summary-title">
            <div className="mb-4 flex items-center justify-between gap-2"><h2 id="product-summary-title" className="text-sm font-medium">In this form</h2><Package size={17} className="text-[#d8a3bb]" aria-hidden="true" /></div>
            <dl className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3"><dt className="text-[#cbbdd1]">Variations</dt><dd className="font-medium tabular-nums">{variations.length}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-[#cbbdd1]">Size entries</dt><dd className="font-medium tabular-nums">{variations.reduce((count, variation) => count + variation.sizes.length, 0)}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-[#cbbdd1]">Images</dt><dd className="font-medium tabular-nums">{variations.reduce((count, variation) => count + variation.images.length, 0)}</dd></div>
            </dl>
            <p className="mt-5 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-[#cbbdd1]">Review each variation&apos;s pricing and stock before saving.</p>
          </section>
        </aside>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#eae5ed] bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><p className="text-sm font-medium text-[#59465f]">Ready to save?</p><p className="mt-1 text-xs leading-relaxed text-[#96859f]">Review your product details and publishing settings.</p></div>
        <button type="submit" disabled={loading} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#302735] px-6 py-3 text-xs font-medium text-white transition-colors hover:bg-[#48354e] disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} aria-hidden="true" />ADD PRODUCT</button>
      </div>
      </fieldset>
      {loading && <Loading progress={uploadProgress} />}
    </form>
  );
};

export default Add;
