import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { backendUrl } from '../App';
import { toast } from 'react-toastify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { assets } from '../assets/assets';
import Loading from '../components/Loading'; // Added Loading import

const availableSizes = ["S", "M", "L", "XL", "XXL", "Free Size"];

const Update = ({ token }) => {
    const { productId } = useParams();
    const navigate = useNavigate();

    const [variations, setVariations] = useState([]); // Updated variations state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("BABYDOLL");

    const [bestseller, setBestseller] = useState(false);
    const [isLuxePrive, setIsLuxePrive] = useState(false);
    const [loading, setLoading] = useState(false); // Added loading state
    const [uploadProgress, setUploadProgress] = useState(0); // Added uploadProgress state
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

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await axios.post(backendUrl + '/api/product/single', { productId });
                if (response.data.success) {
                    const product = response.data.product;
                    setName(product.name);
                    setDescription(product.description);
                    setCategory(product.category);

                    setBestseller(product.bestseller);
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
                    setVariations(product.variations.map(v => ({...v, sku: v.sku || ''})) || []); // Updated to new structure
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
        newVariations[v_index].sizes.push({ size: size, price: '', mrp: '' });
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
            const formData = new FormData();
            formData.append("productId", productId);
            formData.append("name", name);
            formData.append("description", description);
            formData.append("category", category);

            formData.append("bestseller", bestseller);
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
                    mrp: s.mrp
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

    return (
        <form onSubmit={onSubmitHandler} className='flex flex-col w-full items-start gap-3'>
            
            {variations.map((variation, v_index) => (
                <div key={v_index} className='flex flex-wrap md:flex-row gap-4 border p-4 rounded-md w-full relative'>
                    <p className='font-semibold'>Variation {v_index + 1}</p>
                    
                    <div className="flex flex-wrap gap-4 w-full">
                        <div className="flex-1 min-w-[200px]">
                            <p className='mb-2'>Color</p>
                            <input name='color' onChange={(e)=>handleVariationChange(v_index,e)} value={variation.color} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='e.g. Red' required/>
                        </div>

                        <div className="flex-1 min-w-[200px]">
                            <p className='mb-2'>SKU</p>
                            <input name='sku' onChange={(e)=>handleVariationChange(v_index,e)} value={variation.sku} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='e.g. S-110'/>
                        </div>
                    </div>

                    <div className="flex flex-wrap md:flex-row gap-4 w-full">
                        <div className="flex-1 min-w-[300px]">
                            <p className='mb-2'>Sizes & Pricing</p>
                            {variation.sizes.map((sizeData, s_index) => (
                                <div key={s_index} className='flex gap-2 items-end mb-2'>
                                    <div className='w-24'>
                                        <p className='text-sm mb-1'>Size</p>
                                        <input name='size' value={sizeData.size} readOnly className='w-full px-2 py-1 border rounded-md bg-gray-100' />
                                    </div>
                                    <div>
                                        <p className='text-sm mb-1'>MRP</p>
                                        <input name='mrp' onChange={(e)=>handleSizeChange(v_index, s_index, e)} value={sizeData.mrp} className='w-full max-w-[100px] px-2 py-1 border rounded-md' type="number" placeholder='MRP' required/>
                                    </div>
                                    <div>
                                        <p className='text-sm mb-1'>Price</p>
                                        <input name='price' onChange={(e)=>handleSizeChange(v_index, s_index, e)} value={sizeData.price} className='w-full max-w-[100px] px-2 py-1 border rounded-md' type="number" placeholder='Price' required/>
                                    </div>
                                    <button type='button' onClick={()=>removeSize(v_index, s_index)} className='bg-red-500 text-white rounded-md px-2 py-1 text-sm h-fit'>-</button>
                                </div>
                            ))}
                            <div className='flex gap-2 mt-3 flex-wrap'>
                                {availableSizes.filter(size => !variation.sizes.some(s => s.size === size)).map(size => (
                                    <button 
                                        key={size} 
                                        type='button' 
                                        onClick={() => addSize(v_index, size)} 
                                        className='bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm hover:bg-gray-300'
                                    >
                                        Add {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 min-w-[200px]">
                            <p className='mb-2'>Images</p>
                            <div className='flex gap-2 flex-wrap'>
                                {variation.images.map((image, i_index)=>(
                                    <div key={i_index} className='relative'>
                                        <img className='w-20 object-cover' src={typeof image === 'string' ? image : URL.createObjectURL(image)} alt="" />
                                        <p onClick={()=>removeImage(v_index,i_index)} className='absolute top-1 right-1 cursor-pointer bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs'>x</p>
                                    </div>
                                ))}
                                <label className='cursor-pointer'>
                                    <img className='w-20 object-cover' src={assets.upload_area} alt="" />
                                    <input onChange={(e)=>handleImageChange(v_index,e)} type="file" multiple hidden/>
                                </label>
                            </div>
                        </div>
                    </div>
                    {variations.length > 1 && (
                      <button type='button' onClick={()=>removeVariation(v_index)} className='absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-sm'>Remove Variation</button>
                    )}
                </div>
            ))}
            <button type='button' onClick={addVariation} className='bg-blue-500 text-white px-3 py-1 rounded-md mt-4'>Add New Variation</button>
            
            <div className='w-full mt-4'>
                <p className='mb-2'>Product name</p>
                <input onChange={(e) => setName(e.target.value)} value={name} className='w-full max-w-[500px] px-3 py-2 border rounded-md' type="text" placeholder='Type here' required />
            </div>

            <div className='w-full'>
                <p className='mb-2'>Product description</p>
                <ReactQuill theme="snow" value={description} onChange={setDescription} className='w-full max-w-[500px] min-h-40 mb-12' required/>
            </div>

            <div className='w-full'>
                <p className='mb-2'>Product Keywords</p>
                <input
                    onChange={(e) => setKeywords(e.target.value)}
                    value={keywords}
                    className='w-full max-w-[500px] px-3 py-2 border rounded-md'
                    type="text"
                    placeholder="Enter comma-separated keywords"
                />
            </div>

            <div className='flex flex-col sm:flex-row gap-2 w-full sm:gap-8'>
                <div>
                    <p className='mb-2'>Product category</p>
                    <select onChange={(e) => setCategory(e.target.value)} value={category} className='w-full px-3 py-2 border rounded-md'>
                        <option value="BABYDOLL">BABYDOLL</option>
                        <option value="LINGERIE">LINGERIE</option>
                        <option value="NIGHTY">NIGHTY</option>
                        <option value="PAJAMAS">PAJAMAS</option>
                        <option value="NEW & NOW">NEW & NOW</option>
                        <option value="GIFT WRAP">GIFT WRAP</option>
                    </select>
                </div>

                
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-5xl'>

                <div className='w-full'>
                    <p className='mb-2'>Country of Origin</p>
                    <input onChange={(e) => setCountryOfOrigin(e.target.value)} value={countryOfOrigin} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='India' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Manufacturer</p>
                    <input onChange={(e) => setManufacturer(e.target.value)} value={manufacturer} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='King style knitwear' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Packer</p>
                    <input onChange={(e) => setPacker(e.target.value)} value={packer} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='King style knitwear' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Included Components</p>
                    <input onChange={(e) => setIncludedComponents(e.target.value)} value={includedComponents} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='1 shirt, 1 pant' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Fabric</p>
                    <select onChange={(e) => setFabric(e.target.value)} value={fabric} className='w-full px-3 py-2 border rounded-md'>
                        <option value="">Select Fabric</option>
                        <option value="Satin">Satin</option>
                        <option value="Lace">Lace</option>
                        <option value="Net">Net</option>
                        <option value="Silk Satin">Silk Satin</option>
                    </select>
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Type</p>
                    <select onChange={(e) => setType(e.target.value)} value={type} className='w-full px-3 py-2 border rounded-md'>
                        <option value="">Select Type</option>
                        <option value="above-knee-b-doll">Above knee B'doll</option>
                        <option value="knee-length-b-doll">Knee Length B'doll</option>
                        <option value="one-piece-b-doll">One piece B'doll</option>
                        <option value="two-piece-b-doll">Two Piece B'doll</option>
                        <option value="teddy-choker-lingz">Teddy Choker Lingz</option>
                        <option value="bra-panty-lingz-silk-satin">Bra Panty Lingz Slik Satin</option>
                        <option value="sheer-mesh">Sheer Mesh</option>
                    </select>
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Pattern</p>
                    <input onChange={(e) => setPattern(e.target.value)} value={pattern} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='indo western' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Sleeve Style</p>
                    <input onChange={(e) => setSleeveStyle(e.target.value)} value={sleeveStyle} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='straight with cutwork' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Sleeve Length</p>
                    <input onChange={(e) => setSleeveLength(e.target.value)} value={sleeveLength} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='19.5' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Neck</p>
                    <input onChange={(e) => setNeck(e.target.value)} value={neck} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='round' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>HSN</p>
                    <input onChange={(e) => setHsn(e.target.value)} value={hsn} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='6204' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Material Composition</p>
                    <input onChange={(e) => setMaterialComposition(e.target.value)} value={materialComposition} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='92% Net, 8% Lace' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Care Instructions</p>
                    <input onChange={(e) => setCareInstructions(e.target.value)} value={careInstructions} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='Machine Wash' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Closure Type</p>
                    <input onChange={(e) => setClosureType(e.target.value)} value={closureType} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='Tie' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Material Type</p>
                    <input onChange={(e) => setMaterialType(e.target.value)} value={materialType} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='Lace, Net' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Item Weight</p>
                    <input onChange={(e) => setItemWeight(e.target.value)} value={itemWeight} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='150 g' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Item Dimensions LxWxH</p>
                    <input onChange={(e) => setItemDimensionsLxWxH(e.target.value)} value={itemDimensionsLxWxH} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='22 x 20 x 2 Centimeters' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Net Quantity</p>
                    <input onChange={(e) => setNetQuantity(e.target.value)} value={netQuantity} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='1.0 Count' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Generic Name</p>
                    <input onChange={(e) => setGenericName(e.target.value)} value={genericName} className='w-full px-3 py-2 border rounded-md' type="text" placeholder='Nightgown' />
                </div>
            </div>

            {/* Removed old Product Sizes section */}
           

            <div className='flex gap-2 mt-2'>
                <input onChange={() => setIsLuxePrive(prev => !prev)}
                          checked={isLuxePrive} type="checkbox" id='isLuxePrive' />                <label className='cursor-pointer' htmlFor="isLuxePrive">Add to Luxe Prive Sale</label>
            </div>

            <button type="submit" className='w-28 py-3 mt-4 bg-black text-white rounded-md'>UPDATE</button>
            {loading && <Loading progress={uploadProgress} />}
        </form>
    );
};

export default Update;
