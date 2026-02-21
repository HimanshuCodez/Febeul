import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'
import { CSVLink } from 'react-csv'

const List = ({ token }) => {

  const [list, setList] = useState([])
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const fetchList = async () => {
    try {

      const response = await axios.get(backendUrl + '/api/product/list')
      if (response.data.success) {
        setList(response.data.products.reverse());
      }
      else {
        toast.error(response.data.message)
      }

    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const removeProduct = async (id) => {
    try {

      const response = await axios.post(backendUrl + '/api/product/remove', { id }, { headers: { token } })

      if (response.data.success) {
        toast.success(response.data.message)
        await fetchList();
      } else {
        toast.error(response.data.message)
      }

    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const confirmDelete = (id) => {
    setProductToDelete(id);
    setShowConfirmModal(true);
  }

  const handleDelete = async () => {
    if (productToDelete) {
      await removeProduct(productToDelete);
      setShowConfirmModal(false);
      setProductToDelete(null);
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const filteredList = list.filter(item =>
    item.variations?.[0]?.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProductSelect = (productId) => {
    setSelectedProducts(prevSelected => {
      if (prevSelected.includes(productId)) {
        return prevSelected.filter(id => id !== productId);
      } else {
        return [...prevSelected, productId];
      }
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allProductIds = filteredList.map(item => item._id);
      setSelectedProducts(allProductIds);
    } else {
      setSelectedProducts([]);
    }
  };

  const headers = [
    { label: "Name", key: "name" },
    { label: "Category", key: "category" },
    { label: "SKU", key: "sku" },
    { label: "Price", key: "price" },
    { label: "MRP", key: "mrp" },
    { label: "Stock", key: "stock" }
  ];

  const csvData = list
    .filter(item => selectedProducts.includes(item._id))
    .map(item => ({
      name: item.name,
      category: item.category,
      sku: item.variations?.[0]?.sku,
      price: item.variations?.[0]?.sizes?.[0]?.price,
      mrp: item.variations?.[0]?.sizes?.[0]?.mrp,
      stock: item.variations?.[0]?.sizes?.[0]?.stock
    }));

  return (
    <>
      <div className='flex justify-between items-center mb-4'>
        <input
          type="text"
          placeholder="Search by SKU"
          className="p-2 border border-gray-300 rounded w-full mr-4"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <CSVLink
          data={csvData}
          headers={headers}
          filename={"products.csv"}
          className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${selectedProducts.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => {
            if (selectedProducts.length === 0) {
              toast.info("Please select products to export");
              return false;
            }
          }}
        >
          Export Selected
        </CSVLink>
      </div>
      <p className='mb-2'>All Products List</p>
      <div className='flex flex-col gap-2'>

        {/* ------- List Table Title ---------- */}

        <div className='hidden md:grid grid-cols-[auto_1fr_3fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center py-1 px-2 border bg-gray-100 text-sm'>
          <input
            type="checkbox"
            onChange={handleSelectAll}
            checked={filteredList.length > 0 && selectedProducts.length === filteredList.length}
          />
          <b>Image</b>
          <b>Name</b>
          <b>Category</b>
          <b>SKU</b>
          <b>Price</b>
          <b>MRP</b>
          <b>Stock</b>
          <b className='text-center'>Edit</b>
          <b className='text-center'>Action</b>
        </div>

        {/* ------ Product List ------ */}

        {
          filteredList.map((item, index) => (
            <div className='grid grid-cols-[auto_1fr_3fr_1fr] md:grid-cols-[auto_1fr_3fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-2 py-1 px-2 border text-sm' key={index}>
              <input
                type="checkbox"
                checked={selectedProducts.includes(item._id)}
                onChange={() => handleProductSelect(item._id)}
              />
              <img className='w-12' src={item.variations?.[0]?.images?.[0]} alt="" />
              <p>{item.name}</p>
              <p>{item.category}</p>
              <p>{item.variations?.[0]?.sku}</p>
              <p>{currency}{item.variations?.[0]?.sizes?.[0]?.price}</p>
              <p>{currency}{item.variations?.[0]?.sizes?.[0]?.mrp}</p>
              <p>{item.variations?.[0]?.sizes?.[0]?.stock || 0}</p>
              <Link to={`/update/${item._id}`} className='text-center cursor-pointer text-lg'>Edit</Link>
              <p onClick={() => confirmDelete(item._id)} className='text-right md:text-center cursor-pointer text-lg'>X</p>
            </div>
          ))
        }

      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4'>
          <div className='bg-white p-6 rounded-lg shadow-xl max-w-sm w-full'>
            <h2 className='text-xl font-bold mb-4 text-gray-800'>Confirm Delete</h2>
            <p className='mb-6 text-gray-600'>Are you sure you want to delete this product? This action cannot be undone.</p>
            <div className='flex justify-end gap-3'>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setProductToDelete(null);
                }}
                className='px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium'
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium'
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default List