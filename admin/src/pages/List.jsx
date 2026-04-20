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
  const [expandedProductId, setExpandedProductId] = useState(null);
  const role = localStorage.getItem('role');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Reduced for visibility

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

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

  const calculateTotalStock = (item) => {
    return item.variations?.reduce((total, variation) => {
      return total + (variation.sizes?.reduce((sTotal, size) => sTotal + (Number(size.stock) || 0), 0) || 0);
    }, 0) || 0;
  };

  const getDisplayVariation = (item) => {
    if (!searchQuery) return item.variations?.[0];
    const searchLower = searchQuery.toLowerCase();
    return item.variations?.find(v => 
      v.sku?.toLowerCase().includes(searchLower) ||
      v.color?.toLowerCase().includes(searchLower) ||
      v.sizes?.some(s => s.size.toLowerCase().includes(searchLower))
    ) || item.variations?.[0];
  };

  const filteredList = list.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower) ||
      item.variations?.some(variation => 
        variation.sku?.toLowerCase().includes(searchLower) ||
        variation.color?.toLowerCase().includes(searchLower) ||
        variation.sizes?.some(size => size.size.toLowerCase().includes(searchLower))
      )
    );
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
      stock: calculateTotalStock(item)
    }));

  const columnLayout = role !== 'staff' 
    ? "grid-cols-[40px_60px_2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_60px_40px]" 
    : "grid-cols-[40px_60px_2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_60px]";

  return (
    <>
      <div className='flex justify-between items-center mb-4 gap-4'>
        <input
          type="text"
          placeholder="Search by Name, Category, SKU or Color"
          className="p-2 border border-gray-300 rounded w-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <CSVLink
          data={csvData}
          headers={headers}
          filename={"products.csv"}
          className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded whitespace-nowrap ${selectedProducts.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
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
      
      <div className='flex flex-col gap-2'>
        <div className='flex justify-between items-center mb-2'>
          <p className='font-bold text-lg text-gray-700'>All Products List ({filteredList.length})</p>
          <p className='text-sm text-gray-500'>Page {currentPage} of {totalPages || 1}</p>
        </div>

        {/* ------- List Table Header ---------- */}
        <div className={`grid ${columnLayout} items-center gap-2 py-2 px-3 border bg-gray-100 text-xs font-bold text-gray-600 rounded-t-lg`}>
          <div className='flex items-center justify-center'>
            <input
              type="checkbox"
              className='cursor-pointer'
              onChange={handleSelectAll}
              checked={filteredList.length > 0 && selectedProducts.length === filteredList.length}
            />
          </div>
          <p>Image</p>
          <p>Name</p>
          <p className='hidden md:block'>Category</p>
          <p className='hidden md:block'>SKU</p>
          <p>Price</p>
          <p className='hidden md:block'>MRP</p>
          <p className='hidden md:block'>Stock</p>
          <p className='hidden lg:block'>Date</p>
          <p className='hidden lg:block'>Listed By</p>
          <p className='text-center'>Edit</p>
          {role !== 'staff' && <p className='text-center'>Action</p>}
        </div>

        {/* ------ Product List ------ */}
        {
          paginatedList.map((item, index) => {
            const displayVariation = getDisplayVariation(item);
            return (
              <div key={index} className='border rounded-lg overflow-hidden bg-white shadow-sm hover:bg-gray-50 transition-colors'>
                <div 
                  className={`grid ${columnLayout} items-center gap-2 py-3 px-3 cursor-pointer`}
                  onClick={() => setExpandedProductId(expandedProductId === item._id ? null : item._id)}
                >
                  <div onClick={(e) => e.stopPropagation()} className='flex items-center justify-center'>
                    <input
                      type="checkbox"
                      className='cursor-pointer'
                      checked={selectedProducts.includes(item._id)}
                      onChange={() => handleProductSelect(item._id)}
                    />
                  </div>
                  <img className='w-10 h-10 object-cover rounded shadow-sm' src={displayVariation?.images?.[0]} alt="" />
                  <p className='text-xs font-medium text-gray-800 truncate'>{item.name}</p>
                  <p className='hidden md:block text-xs text-gray-600 truncate'>{item.category}</p>
                  <p className='hidden md:block text-xs text-gray-600 truncate'>{displayVariation?.sku}</p>
                  <p className='text-xs font-bold text-gray-900'>{currency}{displayVariation?.sizes?.[0]?.price}</p>
                  <p className='hidden md:block text-xs text-gray-400 line-through'>{currency}{displayVariation?.sizes?.[0]?.mrp}</p>
                  <p className={`hidden md:block text-xs ${calculateTotalStock(item) === 0 ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                    {calculateTotalStock(item) === 0 ? 'Out' : calculateTotalStock(item)}
                  </p>
                  <p className='hidden lg:block text-[10px] text-gray-500 font-medium'>
                    {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <div onClick={(e) => e.stopPropagation()} className='hidden lg:block'>
                    {item.creator ? (
                      <div className='flex flex-col gap-0.5'>
                        <p 
                          onClick={() => { if(item.creator.role === 'staff') { setSelectedStaff(item.creator); setShowStaffModal(true); } }}
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${item.creator.role === 'staff' ? 'bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200' : 'bg-gray-100 text-gray-600'} inline-block w-fit`}
                        >
                          {item.creator.role || 'Admin'}
                        </p>
                      </div>
                    ) : (
                      <p className='text-[9px] bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full font-bold uppercase inline-block w-fit'>
                        System
                      </p>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className='text-center'>
                    <Link to={`/update/${item._id}`} className='text-blue-600 hover:text-blue-800 font-bold text-xs'>Edit</Link>
                  </div>
                  {role !== 'staff' && (
                    <div onClick={(e) => { e.stopPropagation(); confirmDelete(item._id); }} className='text-center'>
                      <p className='text-red-500 hover:text-red-700 cursor-pointer font-bold text-lg'>×</p>
                    </div>
                  )}
                </div>


              {/* Accordion Content: Variations */}
              {expandedProductId === item._id && (
                <div className='bg-gray-50 p-4 border-t'>
                  <h4 className='font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider'>Product Variations</h4>
                  <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {item.variations.map((v, vIndex) => (
                      <div key={vIndex} className='bg-white p-3 rounded-lg border shadow-sm'>
                        <div className='flex items-center gap-3 mb-3'>
                           <img className='w-14 h-14 object-cover rounded-md' src={v.images?.[0]} />
                           <div className='text-xs'>
                             <p><span className='font-semibold text-gray-500'>Color:</span> {v.color}</p>
                             <p><span className='font-semibold text-gray-500'>SKU:</span> {v.sku}</p>
                           </div>
                        </div>
                        <div className='overflow-hidden rounded-md border border-gray-100'>
                          <table className='min-w-full divide-y divide-gray-200 text-[10px]'>
                            <thead className='bg-gray-100'>
                              <tr>
                                <th className='px-2 py-1 text-left font-bold text-gray-600'>Size</th>
                                <th className='px-2 py-1 text-left font-bold text-gray-600'>Price</th>
                                <th className='px-2 py-1 text-left font-bold text-gray-600'>MRP</th>
                                <th className='px-2 py-1 text-left font-bold text-gray-600'>Stock</th>
                              </tr>
                            </thead>
                            <tbody className='bg-white divide-y divide-gray-100'>
                              {v.sizes.map((s, sIndex) => (
                                <tr key={sIndex} className='hover:bg-gray-50'>
                                  <td className='px-2 py-1 font-medium'>{s.size}</td>
                                  <td className='px-2 py-1'>{currency}{s.price}</td>
                                  <td className='px-2 py-1 text-gray-400'>{currency}{s.mrp}</td>
                                  <td className={`px-2 py-1 font-semibold ${s.stock === 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {s.stock}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className='flex justify-center items-center gap-2 mt-8 mb-4'>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className='px-4 py-2 border rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50'
          >
            Previous
          </button>
          
          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1;
            if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 border rounded-md text-sm font-medium transition-colors ${currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                >
                  {pageNum}
                </button>
              );
            } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
              return <span key={pageNum} className='px-2 text-gray-400'>...</span>;
            }
            return null;
          })}

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className='px-4 py-2 border rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50'
          >
            Next
          </button>
        </div>
      )}

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

      {/* Staff Details Modal */}
      {showStaffModal && selectedStaff && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4'>
          <div className='bg-white p-6 rounded-lg shadow-xl max-w-sm w-full'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-bold text-gray-800'>Staff Details</h2>
              <button onClick={() => setShowStaffModal(false)} className='text-gray-500 hover:text-gray-700 font-bold text-xl'>×</button>
            </div>
            <div className='space-y-3'>
              <div className='flex flex-col'>
                <span className='text-xs font-semibold text-gray-500 uppercase'>Name</span>
                <span className='text-sm font-medium text-gray-800'>{selectedStaff.name || 'N/A'}</span>
              </div>
              <div className='flex flex-col'>
                <span className='text-xs font-semibold text-gray-500 uppercase'>Email</span>
                <span className='text-sm font-medium text-gray-800'>{selectedStaff.email}</span>
              </div>
            </div>
            <div className='mt-6 flex justify-end'>
              <button
                onClick={() => setShowStaffModal(false)}
                className='px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors font-medium text-sm'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default List