import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { backendUrl } from '../App';
import { toast } from 'react-toastify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Loading from '../components/Loading';
import EditableSelect from '../components/EditableSelect';
import { DEFAULT_TAXONOMY, fetchTaxonomy, saveTaxonomy } from '../utils/taxonomy';
import {
  PackageSearch,
  Palette,
  ScrollText,
  Truck,
  Sparkles,
  ImagePlus,
  Trash2,
} from 'lucide-react';

const Update = ({ token }) => {
    const { productId } = useParams();
    const navigate = useNavigate();
    const role = localStorage.getItem('role');

    const [variations, setVariations] = useState([]); // Updated variations state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("BABYDOLL");
    const [taxonomy, setTaxonomy] = useState(DEFAULT_TAXONOMY);

    const [bestseller, setBestseller] = useState(false);
    const [isLuxePrive, setIsLuxePrive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [countryOfOrigin, setCountryOfOrigin] = useState("");
    const [manufacturer, setManufacturer] = useState("");
    const [packer, setPacker] = useState("");
    const [includedComponents, setIncludedComponents] = useState("");
    const [fabric, setFabric] = useState("");
    const [type, setType] = useState("");
    const [pattern, setPattern] = useState("");
    const [sleeveStyle, setSleeveStyle] = useState("");
    const [sleeveLength, setSleeveLength] = useState("");
    const [neck, setNeck] = useState("");
    const [hsn, setHsn] = useState("");
    const [materialComposition, setMaterialComposition] = useState("");
    const [careInstructions, setCareInstructions] = useState("");
    const [closureType, setClosureType] = useState("");
    const [materialType, setMaterialType] = useState("");
    const [itemWeight, setItemWeight] = useState("");
    const [itemDimensionsLxWxH, setItemDimensionsLxWxH] = useState("");
    const [netQuantity, setNetQuantity] = useState("");
    const [genericName, setGenericName] = useState("");
    const [keywords, setKeywords] = useState("");
    const [existingSkus, setExistingSkus] = useState([]);
    const [newSizeInput, setNewSizeInput] = useState("");

    useEffect(() => {
        const fetchExistingSkus = async () => {
            try {
                const response = await axios.get(backendUrl + "/api/product/list");
                if (response.data.success) {
                    const skus = response.data.products
                        .filter(p => p._id !== productId) // Exclude current product
                        .flatMap(p => p.variations.map(v => v.sku))
                        .filter(sku => sku);
                    setExistingSkus(skus);
                }
            } catch (error) {
                console.error("Error fetching SKUs:", error);
            }
        };
        fetchExistingSkus();
    }, [productId]);

    useEffect(() => {
        const loadTaxonomy = async () => {
            const data = await fetchTaxonomy(backendUrl);
            setTaxonomy(data);
        };
        loadTaxonomy();
    }, []);

    const handleCategoryChange = (newCategory) => {
        setCategory(newCategory);
        const validTypes = taxonomy.typesByCategory[newCategory] || [];
        if (type && !validTypes.includes(type)) {
            setType("");
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
        setNewSizeInput("");
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
        // Check against existing products in DB (excluding current one)
        if (existingSkus.some(s => s?.toLowerCase().trim() === skuLower)) return true;
        // Check against other variations in current form
        return variations.some((v, idx) => v.sku?.toLowerCase().trim() === skuLower && idx !== index);
    };

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await axios.post(backendUrl + '/api/product/single', { productId });
                if (response.data.success) {
                    const product = response.data.product;
                    setName(product.name);
                    setDescription(product.description);
                    setCategory(product.category);

                    setBestseller(product.bestseller || false);
                    // setSizes(product.sizes); // Removed top-level sizes
                    setIsLuxePrive(product.isLuxePrive || false);
                    setCountryOfOrigin(product.countryOfOrigin || "");
                    setManufacturer(product.manufacturer || "");
                    setPacker(product.packer || "");
                    setIncludedComponents(product.includedComponents || "");
                    setFabric(product.fabric || "");
                    setType(product.type || "");
                    setPattern(product.pattern || "");
                    setSleeveStyle(product.sleeveStyle || "");
                    setSleeveLength(product.sleeveLength || "");
                    setNeck(product.neck || "");
                    setHsn(product.hsn || "");
                    setMaterialComposition(product.materialComposition || "");
                    setCareInstructions(product.careInstructions || "");
                    setClosureType(product.closureType || "");
                    setMaterialType(product.materialType || "");
                    setItemWeight(product.itemWeight || "");
                    setItemDimensionsLxWxH(product.itemDimensionsLxWxH || "");
                    setNetQuantity(product.netQuantity || "");
                    setGenericName(product.genericName || "");
                    setVariations(product.variations.map(v => ({
                        ...v,
                        sku: v.sku || '',
                        sizes: v.sizes.map(s => ({...s, stock: s.stock || 0}))
                    })) || []); // Updated to new structure
                    setKeywords(product.keywords ? product.keywords.join(", ") : "");
                } else {
                    toast.error(response.data.message);
                }
            } catch (error) {
                toast.error(error.message);
            }
        };
        fetchProduct();
    }, [productId]);

    const handleVariationChange = (index, event) => {
        const newVariations = [...variations];
        newVariations[index][event.target.name] = event.target.value;
        setVariations(newVariations);
    }

    const handleSizeChange = (v_index, s_index, event) => {
        const newVariations = [...variations];
        newVariations[v_index].sizes[s_index][event.target.name] = event.target.value;
        setVariations(newVariations);
    }

    const handleImageChange = (index, event) => {
        const newVariations = [...variations];
        newVariations[index].images.push(...Array.from(event.target.files));
        setVariations(newVariations);
    }

    const addVariation = () => {
        setVariations([...variations, { color: '', images: [], sizes: [], sku: '' }]);
    }

    const removeVariation = (index) => {
        const newVariations = [...variations];
        newVariations.splice(index, 1);
        setVariations(newVariations);
    }

    const addSize = (v_index, size) => {
        const newVariations = [...variations];
        newVariations[v_index].sizes.push({ size: size, price: '', mrp: '', stock: '' });
        setVariations(newVariations);
    }

    const removeSize = (v_index, s_index) => {
        const newVariations = [...variations];
        newVariations[v_index].sizes.splice(s_index, 1);
        setVariations(newVariations);
    }

    const removeImage = (v_index, i_index) => {
        const newVariations = [...variations];
        newVariations[v_index].images.splice(i_index, 1);
        setVariations(newVariations);
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault();
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

            const formData = new FormData();
            formData.append("productId", productId);
            formData.append("name", name);
            formData.append("description", description);
            formData.append("category", category);

            formData.append("bestseller", bestseller); // Added bestseller to formData
            formData.append("isLuxePrive", isLuxePrive);
            formData.append("countryOfOrigin", countryOfOrigin);
            formData.append("manufacturer", manufacturer);
            formData.append("packer", packer);
            formData.append("includedComponents", includedComponents);
            formData.append("fabric", fabric);
            formData.append("type", type); // Modified line
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

            const variationsData = variations.map(v => ({
                color: v.color,
                sku: v.sku,
                images: v.images.filter(img => typeof img === 'string'), // only existing images (URLs)
                sizes: v.sizes.map(s => ({
                    size: s.size,
                    price: s.price,
                    mrp: s.mrp,
                    stock: s.stock
                }))
            }));
            formData.append("variations", JSON.stringify(variationsData));

            variations.forEach((variation, v_idx) => {
                variation.images.forEach((image) => {
                    if (image instanceof File) {
                        formData.append(`variations[${v_idx}][images]`, image);
                    }
                });
            });

            const response = await axios.post(
                backendUrl + '/api/product/update',
                formData,
                {
                    headers: { token },
                }
            );

            clearInterval(interval); // Clear interval on response
            setUploadProgress(100); // Set to 100% immediately on response

            if (response.data.success) {
                toast.success(response.data.message);
                navigate('/list');
                setLoading(false);
            } else {
                toast.error(response.data.message);
                setLoading(false);
            }
        } catch (error) {
            toast.error(error.message);
            clearInterval(interval); // Clear interval on error
            setUploadProgress(0); // Reset progress on error
            setLoading(false);
        }
    };

    const typeOptions = taxonomy.typesByCategory[category] || [];

    return (
        <form onSubmit={onSubmitHandler} className='max-w-5xl mx-auto pb-10'>
            <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6'>
                <div className='p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50'>
                    <div>
                        <h2 className='text-2xl font-bold text-gray-900'>Update Product</h2>
                        <p className='text-gray-500 text-sm mt-1'>Edit variations, pricing, and compliance details</p>
                    </div>
                    <div className='p-3 rounded-xl bg-pink-100 text-pink-600'>
                        <PackageSearch size={28} />
                    </div>
                </div>

                <div className='p-8 space-y-10'>
                    {/* Variations */}
                    <section>
                        <div className='flex items-center gap-2 mb-6 border-b pb-2'>
                            <Palette className='text-pink-500' size={20} />
                            <h3 className='font-bold text-gray-800'>Variations</h3>
                        </div>

                        <div className='space-y-4'>
                            {variations.map((variation, v_index) => (
                                <div key={v_index} className='flex flex-wrap md:flex-row gap-4 border border-gray-200 bg-gray-50/40 p-5 rounded-2xl w-full relative'>
                                    <p className='font-semibold text-gray-700 w-full'>Variation {v_index + 1}</p>

                                    <div className="flex flex-wrap gap-4 w-full">
                                        <div className="flex-1 min-w-[200px]">
                                            <p className='mb-2 text-sm font-semibold text-gray-600'>Color</p>
                                            <input name='color' onChange={(e)=>handleVariationChange(v_index,e)} value={variation.color} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400' type="text" placeholder='e.g. Red' required/>
                                        </div>

                                        <div className="flex-1 min-w-[200px]">
                                            <p className='mb-2 flex items-center gap-2 text-sm font-semibold text-gray-600'>
                                                SKU
                                                {isSkuDuplicate(variation.sku, v_index) && (
                                                    <span className="text-red-500 text-[10px] font-bold">sku already listed try another</span>
                                                )}
                                            </p>
                                            <input name='sku' onChange={(e)=>handleVariationChange(v_index,e)} value={variation.sku} className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400 ${isSkuDuplicate(variation.sku, v_index) ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} type="text" placeholder='e.g. S-110'/>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap md:flex-row gap-4 w-full">
                                        <div className="flex-1 min-w-[300px]">
                                            <p className='mb-2 text-sm font-semibold text-gray-600'>Sizes & Pricing</p>
                                            {variation.sizes.map((sizeData, s_index) => (
                                                <div key={s_index} className='flex gap-2 items-end mb-2'>
                                                    <div className='w-24'>
                                                        <p className='text-xs mb-1 text-gray-500'>Size</p>
                                                        <input name='size' value={sizeData.size} readOnly className='w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-100 text-sm' />
                                                    </div>
                                                    <div>
                                                        <p className='text-xs mb-1 text-gray-500'>MRP</p>
                                                        <input name='mrp' onChange={(e)=>handleSizeChange(v_index, s_index, e)} value={sizeData.mrp} className='w-full max-w-[100px] px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400' type="number" placeholder='MRP' required/>
                                                    </div>
                                                    <div>
                                                        <p className='text-xs mb-1 text-gray-500'>Price</p>
                                                        <input name='price' onChange={(e)=>handleSizeChange(v_index, s_index, e)} value={sizeData.price} className='w-full max-w-[100px] px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400' type="number" placeholder='Price' required/>
                                                    </div>
                                                    <div>
                                                        <p className='text-xs mb-1 text-gray-500'>Stock</p>
                                                        <input name='stock' onChange={(e)=>handleSizeChange(v_index, s_index, e)} value={sizeData.stock} className='w-full max-w-[100px] px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400' type="number" placeholder='Stock' required/>
                                                    </div>
                                                    {role !== 'staff' && (
                                                        <button type='button' onClick={()=>removeSize(v_index, s_index)} className='bg-red-50 text-red-600 hover:bg-red-100 rounded-lg px-2.5 py-1.5 text-sm h-fit transition-colors'><Trash2 size={14} /></button>
                                                    )}
                                                </div>
                                            ))}
                                            <div className='flex gap-2 mt-3 flex-wrap items-center'>
                                                {taxonomy.sizes.filter(size => !variation.sizes.some(s => s.size === size)).map(size => (
                                                    <button
                                                        key={size}
                                                        type='button'
                                                        onClick={() => addSize(v_index, size)}
                                                        className='bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:border-pink-300 hover:text-pink-600 transition-colors'
                                                    >
                                                        + {size}
                                                    </button>
                                                ))}
                                                {role !== 'staff' && (
                                                    <div className='flex gap-1'>
                                                        <input
                                                            type='text'
                                                            value={newSizeInput}
                                                            onChange={(e) => setNewSizeInput(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    addTaxonomySize(newSizeInput);
                                                                }
                                                            }}
                                                            placeholder='New size e.g. 3XL'
                                                            className='w-32 px-2 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400'
                                                        />
                                                        <button
                                                            type='button'
                                                            onClick={() => addTaxonomySize(newSizeInput)}
                                                            disabled={!newSizeInput.trim()}
                                                            className='px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-[200px]">
                                            <p className='mb-2 text-sm font-semibold text-gray-600'>Images</p>
                                            <div className='flex gap-2 flex-wrap'>
                                                {variation.images.map((image, i_index)=>(
                                                    <div key={i_index} className='relative group'>
                                                        <img className='w-20 h-20 object-cover rounded-lg border border-gray-200' src={typeof image === 'string' ? image : URL.createObjectURL(image)} alt="" />
                                                        {role !== 'staff' && (
                                                            <button type='button' onClick={()=>removeImage(v_index,i_index)} className='absolute -top-1.5 -right-1.5 cursor-pointer bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm hover:bg-red-600'>×</button>
                                                        )}
                                                    </div>
                                                ))}
                                                <label className='cursor-pointer w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-pink-300 hover:bg-pink-50/40 transition-colors'>
                                                    <ImagePlus size={20} className="text-gray-400" />
                                                    <input onChange={(e)=>handleImageChange(v_index,e)} type="file" multiple hidden/>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    {variations.length > 1 && role !== 'staff' && (
                                      <button type='button' onClick={()=>removeVariation(v_index)} className='absolute top-3 right-3 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors'>Remove Variation</button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button type='button' onClick={addVariation} className='mt-4 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors'>+ Add Variation</button>
                    </section>

                    {/* Basic Info */}
                    <section>
                        <div className='flex items-center gap-2 mb-6 border-b pb-2'>
                            <ScrollText className='text-blue-500' size={20} />
                            <h3 className='font-bold text-gray-800'>Basic Info</h3>
                        </div>

                        <div className='space-y-6'>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Product name</p>
                                <input onChange={(e) => setName(e.target.value)} value={name} className='w-full max-w-[500px] px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400' type="text" placeholder='Type here' required />
                            </div>

                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Product description</p>
                                <ReactQuill theme="snow" value={description} onChange={setDescription} className='w-full max-w-[500px] min-h-40 mb-12'/>
                            </div>

                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Product Keywords</p>
                                <input
                                    onChange={(e) => setKeywords(e.target.value)}
                                    value={keywords}
                                    className='w-full max-w-[500px] px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400'
                                    type="text"
                                    placeholder="Enter comma-separated keywords"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Category & Attributes */}
                    <section>
                        <div className='flex items-center gap-2 mb-6 border-b pb-2'>
                            
                            <h3 className='font-bold text-gray-800'>Category & Attributes</h3>
                        </div>

                        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
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
                                options={taxonomy.fabrics}
                                value={fabric}
                                onChange={setFabric}
                                onAddNew={addFabric}
                            />
                            <EditableSelect
                                label="Type"
                                options={typeOptions}
                                value={type}
                                onChange={setType}
                                onAddNew={addType}
                            />

                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Pattern</p>
                                <input onChange={(e) => setPattern(e.target.value)} value={pattern} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400' type="text" placeholder='indo western' />
                            </div>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Sleeve Style</p>
                                <input onChange={(e) => setSleeveStyle(e.target.value)} value={sleeveStyle} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400' type="text" placeholder='straight with cutwork' />
                            </div>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Sleeve Length</p>
                                <input onChange={(e) => setSleeveLength(e.target.value)} value={sleeveLength} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400' type="text" placeholder='19.5' />
                            </div>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Neck</p>
                                <input onChange={(e) => setNeck(e.target.value)} value={neck} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400' type="text" placeholder='round' />
                            </div>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Material Composition</p>
                                <input onChange={(e) => setMaterialComposition(e.target.value)} value={materialComposition} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400' type="text" placeholder='92% Net, 8% Lace' />
                            </div>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Closure Type</p>
                                <input onChange={(e) => setClosureType(e.target.value)} value={closureType} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400' type="text" placeholder='Tie' />
                            </div>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Material Type</p>
                                <input onChange={(e) => setMaterialType(e.target.value)} value={materialType} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400' type="text" placeholder='Lace, Net' />
                            </div>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Care Instructions</p>
                                <input onChange={(e) => setCareInstructions(e.target.value)} value={careInstructions} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400' type="text" placeholder='Machine Wash' />
                            </div>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Generic Name</p>
                                <input onChange={(e) => setGenericName(e.target.value)} value={genericName} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-400' type="text" placeholder='Nightgown' />
                            </div>
                        </div>
                    </section>

                    {/* Compliance & Shipping Details */}
                    <section>
                        <div className='flex items-center gap-2 mb-6 border-b pb-2'>
                            <Truck className='text-emerald-500' size={20} />
                            <h3 className='font-bold text-gray-800'>Compliance & Shipping Details</h3>
                        </div>

                        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Country of Origin</p>
                                <input onChange={(e) => setCountryOfOrigin(e.target.value)} value={countryOfOrigin} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400' type="text" placeholder='India' />
                            </div>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Manufacturer</p>
                                <input onChange={(e) => setManufacturer(e.target.value)} value={manufacturer} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400' type="text" placeholder='King style knitwear' />
                            </div>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Packer</p>
                                <input onChange={(e) => setPacker(e.target.value)} value={packer} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400' type="text" placeholder='King style knitwear' />
                            </div>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Included Components</p>
                                <input onChange={(e) => setIncludedComponents(e.target.value)} value={includedComponents} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400' type="text" placeholder='1 shirt, 1 pant' />
                            </div>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>HSN</p>
                                <input onChange={(e) => setHsn(e.target.value)} value={hsn} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400' type="text" placeholder='6204' />
                            </div>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Item Weight</p>
                                <input onChange={(e) => setItemWeight(e.target.value)} value={itemWeight} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400' type="text" placeholder='150 g' />
                            </div>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Item Dimensions LxWxH</p>
                                <input onChange={(e) => setItemDimensionsLxWxH(e.target.value)} value={itemDimensionsLxWxH} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400' type="text" placeholder='22 x 20 x 2 Centimeters' />
                            </div>
                            <div className='w-full'>
                                <p className='mb-2 text-sm font-semibold text-gray-600'>Net Quantity</p>
                                <input onChange={(e) => setNetQuantity(e.target.value)} value={netQuantity} className='w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400' type="text" placeholder='1.0 Count' />
                            </div>
                        </div>
                    </section>

                    {/* Flags */}
                    <section>
                        <div className='flex flex-wrap gap-6'>
                            <label htmlFor="isLuxePrive" className='flex items-center gap-2 cursor-pointer bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5'>
                                <input onChange={() => setIsLuxePrive(prev => !prev)} checked={isLuxePrive} type="checkbox" id='isLuxePrive' className='accent-amber-500 w-4 h-4' />
                                <span className='text-sm font-medium text-amber-800'>Add to Luxe Prive Sale</span>
                            </label>

                            <label htmlFor="isBestseller" className='flex items-center gap-2 cursor-pointer bg-pink-50 border border-pink-100 rounded-lg px-4 py-2.5'>
                                <input onChange={() => setBestseller(prev => !prev)} checked={bestseller} type="checkbox" id='isBestseller' className='accent-pink-500 w-4 h-4' />
                                <span className='text-sm font-medium text-pink-700'>Add to Bestseller</span>
                            </label>
                        </div>
                    </section>

                    <div className='pt-4 border-t border-gray-50'>
                        <button type="submit" className='px-8 py-3 rounded-xl bg-black text-white font-medium hover:bg-gray-800 transition-colors'>UPDATE PRODUCT</button>
                    </div>
                </div>
            </div>
            {loading && <Loading progress={uploadProgress} />}
        </form>
    );
};

export default Update;
