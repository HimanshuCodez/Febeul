import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { backendUrl } from '../App';
import { toast } from 'react-toastify';

const Update = ({ token }) => {
    const { productId } = useParams();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [mrp, setMrp] = useState("");
    const [category, setCategory] = useState("BABYDOLL");
    const [subCategory, setSubCategory] = useState("Topwear");
    const [bestseller, setBestseller] = useState(false);
    const [sizes, setSizes] = useState([]);
    const [length, setLength] = useState("");
    const [breadth, setBreadth] = useState("");
    const [dressType, setDressType] = useState("");
    const [styleCode, setStyleCode] = useState("");
    const [countryOfOrigin, setCountryOfOrigin] = useState("");
    const [manufacturer, setManufacturer] = useState("");
    const [color, setColor] = useState("");
    const [fabric, setFabric] = useState("");
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

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await axios.post(backendUrl + '/api/product/single', { productId });
                if (response.data.success) {
                    const product = response.data.product;
                    setName(product.name);
                    setDescription(product.description);
                    setPrice(product.price);
                    setMrp(product.mrp || "");
                    setCategory(product.category);
                    setSubCategory(product.subCategory);
                    setBestseller(product.bestseller);
                    setSizes(product.sizes);
                    setLength(product.length || "");
                    setBreadth(product.breadth || "");
                    setDressType(product.dressType || "");
                    setStyleCode(product.styleCode || "");
                    setCountryOfOrigin(product.countryOfOrigin || "");
                    setManufacturer(product.manufacturer || "");
                    setColor(product.color || "");
                    setFabric(product.fabric || "");
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
                } else {
                    toast.error(response.data.message);
                }
            } catch (error) {
                toast.error(error.message);
            }
        };
        fetchProduct();
    }, [productId]);

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(backendUrl + '/api/product/update', {
                productId,
                name,
                description,
                price,
                mrp,
                category,
                subCategory,
                bestseller,
                sizes: JSON.stringify(sizes),
                length,
                breadth,
                dressType,
                styleCode,
                countryOfOrigin,
                manufacturer,
                color,
                fabric,
                pattern,
                sleeveStyle,
                sleeveLength,
                neck,
                hsn,
                materialComposition,
                careInstructions,
                closureType,
                materialType,
                itemWeight,
                itemDimensionsLxWxH,
                netQuantity,
                genericName
            }, { headers: { token } });

            if (response.data.success) {
                toast.success(response.data.message);
                navigate('/list');
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <form onSubmit={onSubmitHandler} className='flex flex-col w-full items-start gap-3'>
            <div className='w-full'>
                <p className='mb-2'>Product name</p>
                <input onChange={(e) => setName(e.target.value)} value={name} className='w-full max-w-[500px] px-3 py-2' type="text" placeholder='Type here' required />
            </div>

            <div className='w-full'>
                <p className='mb-2'>Product description</p>
                <textarea onChange={(e) => setDescription(e.target.value)} value={description} className='w-full max-w-[500px] px-3 py-2' type="text" placeholder='Write content here' required />
            </div>

            <div className='flex flex-col sm:flex-row gap-2 w-full sm:gap-8'>
                <div>
                    <p className='mb-2'>Product category</p>
                    <select onChange={(e) => setCategory(e.target.value)} value={category} className='w-full px-3 py-2'>
                        <option value="BABYDOLL">BABYDOLL</option>
                        <option value="LINGERIE">LINGERIE</option>
                        <option value="NIGHTY">NIGHTY</option>
                        <option value="PAJAMAS">PAJAMAS</option>
                        <option value="NEW & NOW">NEW & NOW</option>
                        <option value="GIFT WRAP">GIFT WRAP</option>
                    </select>
                </div>
                <div>
                    <p className='mb-2'>Sub category</p>
                    <select onChange={(e) => setSubCategory(e.target.value)} value={subCategory} className='w-full px-3 py-2'>
                        <option value="Topwear">Topwear</option>
                        <option value="Bottomwear">Bottomwear</option>
                        <option value="Winterwear">Winterwear</option>
                    </select>
                </div>
                <div>
                    <p className='mb-2'>Product Price</p>
                    <input onChange={(e) => setPrice(e.target.value)} value={price} className='w-full px-3 py-2 sm:w-[120px]' type="Number" placeholder='25' />
                </div>
                <div>
                    <p className='mb-2'>Product MRP</p>
                    <input onChange={(e) => setMrp(e.target.value)} value={mrp} className='w-full px-3 py-2 sm:w-[120px]' type="Number" placeholder='45' />
                </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-5xl'>
                <div className='w-full'>
                    <p className='mb-2'>Length</p>
                    <input onChange={(e) => setLength(e.target.value)} value={length} className='w-full px-3 py-2' type="text" placeholder='shirt- 32cm, bottom-39' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Breadth</p>
                    <input onChange={(e) => setBreadth(e.target.value)} value={breadth} className='w-full px-3 py-2' type="text" placeholder='40( size L)' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Dress Type</p>
                    <input onChange={(e) => setDressType(e.target.value)} value={dressType} className='w-full px-3 py-2' type="text" placeholder='co-ord set' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Style Code</p>
                    <input onChange={(e) => setStyleCode(e.target.value)} value={styleCode} className='w-full px-3 py-2' type="text" placeholder='s-110' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Country of Origin</p>
                    <input onChange={(e) => setCountryOfOrigin(e.target.value)} value={countryOfOrigin} className='w-full px-3 py-2' type="text" placeholder='India' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Manufacturer</p>
                    <input onChange={(e) => setManufacturer(e.target.value)} value={manufacturer} className='w-full px-3 py-2' type="text" placeholder='King style knitwear' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Color</p>
                    <input onChange={(e) => setColor(e.target.value)} value={color} className='w-full px-3 py-2' type="text" placeholder='bottle green' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Fabric</p>
                    <input onChange={(e) => setFabric(e.target.value)} value={fabric} className='w-full px-3 py-2' type="text" placeholder='cotton linen' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Pattern</p>
                    <input onChange={(e) => setPattern(e.target.value)} value={pattern} className='w-full px-3 py-2' type="text" placeholder='indo western' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Sleeve Style</p>
                    <input onChange={(e) => setSleeveStyle(e.target.value)} value={sleeveStyle} className='w-full px-3 py-2' type="text" placeholder='straight with cutwork' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Sleeve Length</p>
                    <input onChange={(e) => setSleeveLength(e.target.value)} value={sleeveLength} className='w-full px-3 py-2' type="text" placeholder='19.5' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Neck</p>
                    <input onChange={(e) => setNeck(e.target.value)} value={neck} className='w-full px-3 py-2' type="text" placeholder='round' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>HSN</p>
                    <input onChange={(e) => setHsn(e.target.value)} value={hsn} className='w-full px-3 py-2' type="text" placeholder='6204' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Material Composition</p>
                    <input onChange={(e) => setMaterialComposition(e.target.value)} value={materialComposition} className='w-full px-3 py-2' type="text" placeholder='92% Net, 8% Lace' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Care Instructions</p>
                    <input onChange={(e) => setCareInstructions(e.target.value)} value={careInstructions} className='w-full px-3 py-2' type="text" placeholder='Machine Wash' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Closure Type</p>
                    <input onChange={(e) => setClosureType(e.target.value)} value={closureType} className='w-full px-3 py-2' type="text" placeholder='Tie' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Material Type</p>
                    <input onChange={(e) => setMaterialType(e.target.value)} value={materialType} className='w-full px-3 py-2' type="text" placeholder='Lace, Net' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Item Weight</p>
                    <input onChange={(e) => setItemWeight(e.target.value)} value={itemWeight} className='w-full px-3 py-2' type="text" placeholder='150 g' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Item Dimensions LxWxH</p>
                    <input onChange={(e) => setItemDimensionsLxWxH(e.target.value)} value={itemDimensionsLxWxH} className='w-full px-3 py-2' type="text" placeholder='22 x 20 x 2 Centimeters' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Net Quantity</p>
                    <input onChange={(e) => setNetQuantity(e.target.value)} value={netQuantity} className='w-full px-3 py-2' type="text" placeholder='1.0 Count' />
                </div>
                <div className='w-full'>
                    <p className='mb-2'>Generic Name</p>
                    <input onChange={(e) => setGenericName(e.target.value)} value={genericName} className='w-full px-3 py-2' type="text" placeholder='Nightgown' />
                </div>
            </div>

            <div>
                <p className='mb-2'>Product Sizes</p>
                <div className='flex gap-3'>
                    <div onClick={() => setSizes(prev => prev.includes("S") ? prev.filter(item => item !== "S") : [...prev, "S"])}>
                        <p className={`${sizes.includes("S") ? "bg-pink-100" : "bg-slate-200"} px-3 py-1 cursor-pointer`}>S</p>
                    </div>
                    <div onClick={() => setSizes(prev => prev.includes("M") ? prev.filter(item => item !== "M") : [...prev, "M"])}>
                        <p className={`${sizes.includes("M") ? "bg-pink-100" : "bg-slate-200"} px-3 py-1 cursor-pointer`}>M</p>
                    </div>
                    <div onClick={() => setSizes(prev => prev.includes("L") ? prev.filter(item => item !== "L") : [...prev, "L"])}>
                        <p className={`${sizes.includes("L") ? "bg-pink-100" : "bg-slate-200"} px-3 py-1 cursor-pointer`}>L</p>
                    </div>
                    <div onClick={() => setSizes(prev => prev.includes("XL") ? prev.filter(item => item !== "XL") : [...prev, "XL"])}>
                        <p className={`${sizes.includes("XL") ? "bg-pink-100" : "bg-slate-200"} px-3 py-1 cursor-pointer`}>XL</p>
                    </div>
                    <div onClick={() => setSizes(prev => prev.includes("XXL") ? prev.filter(item => item !== "XXL") : [...prev, "XXL"])}>
                        <p className={`${sizes.includes("XXL") ? "bg-pink-100" : "bg-slate-200"} px-3 py-1 cursor-pointer`}>XXL</p>
                    </div>
                </div>
            </div>

            <div className='flex gap-2 mt-2'>
                <input onChange={() => setBestseller(prev => !prev)} checked={bestseller} type="checkbox" id='bestseller' />
                <label className='cursor-pointer' htmlFor="bestseller">Add to bestseller</label>
            </div>

            <button type="submit" className='w-28 py-3 mt-4 bg-black text-white'>UPDATE</button>
        </form>
    );
};

export default Update;
