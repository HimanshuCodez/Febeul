import React, { useState } from 'react'
import {assets} from '../assets/assets'
import axios from 'axios'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'
import ReactQuill from 'react-quill';
import 'react-quill/dist/react-quill.snow.css';

const Add = ({token}) => {

   const [type, setType] = useState("");
   const [variations, setVariations] = useState([{ color: '', images: [], price: '', mrp: '' }]);
   const [name, setName] = useState("");
   const [description, setDescription] = useState("");
   const [category, setCategory] = useState("BABYDOLL");
   const [subCategory, setSubCategory] = useState("Topwear");
   const [bestseller, setBestseller] = useState(false);
   const [isLuxePrive, setIsLuxePrive] = useState(false);
   const [sizes, setSizes] = useState([]);

   const [sku, setSku] = useState("");
   const [countryOfOrigin, setCountryOfOrigin] = useState("");
   const [manufacturer, setManufacturer] = useState("");
   const [packer, setPacker] = useState("");
   const [includedComponents, setIncludedComponents] = useState("");
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

   const handleVariationChange = (index, event) => {
    const newVariations = [...variations];
    newVariations[index][event.target.name] = event.target.value;
    setVariations(newVariations);
   }

   const handleImageChange = (index, event) => {
    const newVariations = [...variations];
    newVariations[index].images.push(...event.target.files);
    setVariations(newVariations);
   }

   const addVariation = () => {
    setVariations([...variations, { color: '', images: [], price: '', mrp: '' }]);
   }

   const removeVariation = (index) => {
    const newVariations = [...variations];
    newVariations.splice(index, 1);
    setVariations(newVariations);
   }

   const removeImage = (v_index,i_index) => {
    const newVariations = [...variations];
    newVariations[v_index].images.splice(i_index,1)
    setVariations(newVariations)
   }

   const onSubmitHandler = async (e) => {
    e.preventDefault();

    try {
      
      const formData = new FormData()

      formData.append("name",name)
      formData.append("description",description)
      formData.append("category",category)
      formData.append("subCategory",subCategory)
      formData.append("bestseller",bestseller)
      formData.append("isLuxePrive", isLuxePrive)
      formData.append("sizes",JSON.stringify(sizes))

      formData.append("sku",sku)
      formData.append("countryOfOrigin",countryOfOrigin)
      formData.append("manufacturer",manufacturer)
      formData.append("packer",packer)
      formData.append("includedComponents",includedComponents)
      formData.append("fabric",fabric)
      formData.append("type",type)
      formData.append("pattern",pattern)
      formData.append("sleeveStyle",sleeveStyle)
      formData.append("sleeveLength",sleeveLength)
      formData.append("neck",neck)
      formData.append("hsn",hsn)
      formData.append("materialComposition",materialComposition)
      formData.append("careInstructions",careInstructions)
      formData.append("closureType",closureType)
      formData.append("materialType",materialType)
      formData.append("itemWeight",itemWeight)
      formData.append("itemDimensionsLxWxH",itemDimensionsLxWxH)
      formData.append("netQuantity",netQuantity)
      formData.append("genericName",genericName)
      
      const variationsData = variations.map(v => ({color: v.color, price: v.price, mrp: v.mrp}));
      formData.append("variations", JSON.stringify(variationsData));
      
      variations.forEach((variation, v_idx) => {
        variation.images.forEach((image) => {
            formData.append(`variations[${v_idx}][images]`, image)
        })
      })

      const response = await axios.post(backendUrl + "/api/product/add",formData,{headers:{token}})

      if (response.data.success) {
        toast.success(response.data.message)
        setName('')
        setDescription('')
        setVariations([{ color: '', images: [], price: '', mrp: '' }])
        setSku('')
        setBestseller(false)
        setIsLuxePrive(false)
        setCountryOfOrigin('')
        setManufacturer('')
        setPacker('')
        setIncludedComponents('')
        setFabric('')
        setType('')
        setPattern('')
        setSleeveStyle('')
        setSleeveLength('')
        setNeck('')
        setHsn('')
        setMaterialComposition('')
        setCareInstructions('')
        setClosureType('')
        setMaterialType('')
        setItemWeight('')
        setItemDimensionsLxWxH('')
        setNetQuantity('')
        setGenericName('')
      } else {
        toast.error(response.data.message)
      }

    } catch (error) {
      console.log(error);
      toast.error(error.message)
    }
   }

  return (
    <form onSubmit={onSubmitHandler} className='flex flex-col w-full items-start gap-3'>
        
        {variations.map((variation, index) => (
            <div key={index} className='flex flex-col gap-2 border p-4 rounded-md w-full'>
                <p className='font-semibold'>Variation {index + 1}</p>
                <div className='w-full'>
                    <p className='mb-2'>Color</p>
                    <input name='color' onChange={(e)=>handleVariationChange(index,e)} value={variation.color} className='w-full max-w-[500px] px-3 py-2' type="text" placeholder='e.g. Red' required/>
                </div>
                <div classsName='flex gap-2'>
                  <div>
                    <p className='mb-2'>MRP</p>
                    <input name='mrp' onChange={(e)=>handleVariationChange(index,e)} value={variation.mrp} className='w-full max-w-[120px] px-3 py-2' type="number" placeholder='e.g. 100' required/>
                  </div>
                  <div>
                    <p className='mb-2'>Selling Price</p>
                    <input name='price' onChange={(e)=>handleVariationChange(index,e)} value={variation.price} className='w-full max-w-[120px] px-3 py-2' type="number" placeholder='e.g. 80' required/>
                  </div>
                </div>
                <div>
                    <p className='mb-2'>Upload Images</p>
                    <div className='flex gap-2 flex-wrap'>
                        {variation.images.map((image, i_index)=>(
                            <div key={i_index} className='relative'>
                                <img className='w-20' src={URL.createObjectURL(image)} alt="" />
                                <p onClick={()=>removeImage(index,i_index)} className='absolute top-1 right-1 cursor-pointer bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center'>x</p>
                            </div>
                        ))}
                        <label>
                            <img className='w-20 cursor-pointer' src={assets.upload_area} alt="" />
                            <input onChange={(e)=>handleImageChange(index,e)} type="file" multiple hidden/>
                        </label>
                    </div>
                </div>
                <button type='button' onClick={()=>removeVariation(index)} className='bg-red-500 text-white px-3 py-1 rounded-md w-fit'>Remove Variation</button>
            </div>
        ))}

        <button type='button' onClick={addVariation} className='bg-blue-500 text-white px-3 py-1 rounded-md'>Add Variation</button>

        <div className='w-full'>
          <p className='mb-2'>Product name</p>
          <input onChange={(e)=>setName(e.target.value)} value={name} className='w-full max-w-[500px] px-3 py-2' type="text" placeholder='Type here' required/>
        </div>

        <div className='w-full'>
          <p className='mb-2'>Product description</p>
          <ReactQuill theme="snow" value={description} onChange={setDescription} className='w-full max-w-[500px] min-h-40 mb-12' required/>
        </div>

        <div className='flex flex-col sm:flex-row gap-2 w-full sm:gap-8'>
            <div>
              <p className='mb-2'>Product Category</p>
              <select onChange={(e) => setCategory(e.target.value)} value={category} className='w-full px-3 py-2'>
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
            <p className='mb-2'>SKU</p>
            <input onChange={(e)=>setSku(e.target.value)} value={sku} className='w-full px-3 py-2' type="text" placeholder='s-110' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Country of Origin</p>
            <input onChange={(e)=>setCountryOfOrigin(e.target.value)} value={countryOfOrigin} className='w-full px-3 py-2' type="text" placeholder='India' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Manufacturer</p>
            <input onChange={(e)=>setManufacturer(e.target.value)} value={manufacturer} className='w-full px-3 py-2' type="text" placeholder='King style knitwear' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Packer</p>
            <input onChange={(e)=>setPacker(e.target.value)} value={packer} className='w-full px-3 py-2' type="text" placeholder='King style knitwear' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Included Components</p>
            <input onChange={(e)=>setIncludedComponents(e.target.value)} value={includedComponents} className='w-full px-3 py-2' type="text" placeholder='1 shirt, 1 pant' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Fabric</p>
            <select onChange={(e)=>setFabric(e.target.value)} value={fabric} className='w-full px-3 py-2'>
                <option value="">Select Fabric</option>
                <option value="Satin">Satin</option>
                <option value="Lace">Lace</option>
                <option value="Net">Net</option>
                <option value="Silk Satin">Silk Satin</option>
            </select>
          </div>
          <div className='w-full'>
            <p className='mb-2'>Type</p>
            <select onChange={(e)=>setType(e.target.value)} value={type} className='w-full px-3 py-2'>
                <option value="">Select Type</option>
                <option value="Above knee B'doll">Above knee B'doll</option>
                <option value="Knee Length B'doll">Knee Length B'doll</option>
                <option value="One piece B'doll">One piece B'doll</option>
                <option value="Two Piece B'doll">Two Piece B'doll</option>
                <option value="Teddy Choker Lingz">Teddy Choker Lingz</option>
                <option value="Bra Panty Lingz Slik Satin">Bra Panty Lingz Slik Satin</option>
                <option value="Sheer Mesh">Sheer Mesh</option>
            </select>
          </div>
          <div className='w-full'>
            <p className='mb-2'>Pattern</p>
            <input onChange={(e)=>setPattern(e.target.value)} value={pattern} className='w-full px-3 py-2' type="text" placeholder='indo western' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Sleeve Style</p>
            <input onChange={(e)=>setSleeveStyle(e.target.value)} value={sleeveStyle} className='w-full px-3 py-2' type="text" placeholder='straight with cutwork' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Sleeve Length</p>
            <input onChange={(e)=>setSleeveLength(e.target.value)} value={sleeveLength} className='w-full px-3 py-2' type="text" placeholder='19.5' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Neck</p>
            <input onChange={(e)=>setNeck(e.target.value)} value={neck} className='w-full px-3 py-2' type="text" placeholder='round' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>HSN</p>
            <input onChange={(e)=>setHsn(e.target.value)} value={hsn} className='w-full px-3 py-2' type="text" placeholder='6204' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Material Composition</p>
            <input onChange={(e)=>setMaterialComposition(e.target.value)} value={materialComposition} className='w-full px-3 py-2' type="text" placeholder='92% Net, 8% Lace' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Care Instructions</p>
            <input onChange={(e)=>setCareInstructions(e.target.value)} value={careInstructions} className='w-full px-3 py-2' type="text" placeholder='Machine Wash' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Closure Type</p>
            <input onChange={(e)=>setClosureType(e.target.value)} value={closureType} className='w-full px-3 py-2' type="text" placeholder='Tie' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Material Type</p>
            <input onChange={(e)=>setMaterialType(e.target.value)} value={materialType} className='w-full px-3 py-2' type="text" placeholder='Lace, Net' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Item Weight</p>
            <input onChange={(e)=>setItemWeight(e.target.value)} value={itemWeight} className='w-full px-3 py-2' type="text" placeholder='150 g' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Item Dimensions LxWxH</p>
            <input onChange={(e)=>setItemDimensionsLxWxH(e.target.value)} value={itemDimensionsLxWxH} className='w-full px-3 py-2' type="text" placeholder='22 x 20 x 2 Centimeters' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Net Quantity</p>
            <input onChange={(e)=>setNetQuantity(e.target.value)} value={netQuantity} className='w-full px-3 py-2' type="text" placeholder='1.0 Count' />
          </div>
          <div className='w-full'>
            <p className='mb-2'>Generic Name</p>
            <input onChange={(e)=>setGenericName(e.target.value)} value={genericName} className='w-full px-3 py-2' type="text" placeholder='Nightgown' />
          </div>
        </div>

        <div>
          <p className='mb-2'>Product Sizes</p>
          <div className='flex gap-3'>
            <div onClick={()=>setSizes(prev => prev.includes("S") ? prev.filter( item => item !== "S") : [...prev,"S"])}>
              <p className={`${sizes.includes("S") ? "bg-pink-100" : "bg-slate-200" } px-3 py-1 cursor-pointer`}>S</p>
            </div>
            
            <div onClick={()=>setSizes(prev => prev.includes("M") ? prev.filter( item => item !== "M") : [...prev,"M"])}>
              <p className={`${sizes.includes("M") ? "bg-pink-100" : "bg-slate-200" } px-3 py-1 cursor-pointer`}>M</p>
            </div>

            <div onClick={()=>setSizes(prev => prev.includes("L") ? prev.filter( item => item !== "L") : [...prev,"L"])}>
              <p className={`${sizes.includes("L") ? "bg-pink-100" : "bg-slate-200" } px-3 py-1 cursor-pointer`}>L</p>
            </div>

            <div onClick={()=>setSizes(prev => prev.includes("XL") ? prev.filter( item => item !== "XL") : [...prev,"XL"])}>
              <p className={`${sizes.includes("XL") ? "bg-pink-100" : "bg-slate-200" } px-3 py-1 cursor-pointer`}>XL</p>
            </div>

            <div onClick={()=>setSizes(prev => prev.includes("XXL") ? prev.filter( item => item !== "XXL") : [...prev,"XXL"])}>
              <p className={`${sizes.includes("XXL") ? "bg-pink-100" : "bg-slate-200" } px-3 py-1 cursor-pointer`}>XXL</p>
            </div>
            <div onClick={()=>setSizes(prev => prev.includes("Free Size") ? prev.filter( item => item !== "Free Size") : [...prev,"Free Size"])}>
              <p className={`${sizes.includes("Free Size") ? "bg-pink-100" : "bg-slate-200" } px-3 py-1 cursor-pointer`}>Free Size</p>
            </div>
          </div>
        </div>

       

        <div className='flex gap-2 mt-2'>
          <input onChange={() => setIsLuxePrive(prev => !prev)} checked={isLuxePrive} type="checkbox" id='isLuxePrive' />
          <label className='cursor-pointer' htmlFor="isLuxePrive">Add to Luxe Prive Sale</label>
        </div>

        <button type="submit" className='w-28 py-3 mt-4 bg-black text-white'>ADD</button>

    </form>
  )
}

export default Add