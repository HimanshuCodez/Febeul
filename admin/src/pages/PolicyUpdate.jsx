import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../App.jsx';

const PolicyUpdate = ({ token }) => {
    const [policyNames, setPolicyNames] = useState([]); // [{ policyName: "DataPrivacy", pageTitle: "Privacy Policy" }]
    const [selectedPolicyName, setSelectedPolicyName] = useState('');
    const [policyContent, setPolicyContent] = useState(null); // Full policy object from DB
    const [editedContent, setEditedContent] = useState(''); // Stringified content array for textarea
    const [pageTitle, setPageTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isAddingNewPolicy, setIsAddingNewPolicy] = useState(false); // New state for add mode
    const [newPolicyName, setNewPolicyName] = useState(''); // New state for new policy name

    const API_BASE_URL = `${backendUrl}/api/policy`;

    useEffect(() => {
        fetchPolicyNames();
    }, []);

    const fetchPolicyNames = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get(API_BASE_URL);
            setPolicyNames(response.data);
        } catch (err) {
            console.error('Error fetching policy names:', err);
            setError('Failed to load policy names.');
            toast.error('Failed to load policy names.');
        } finally {
            setLoading(false);
        }
    };

    const fetchPolicyContent = async (name) => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get(`${API_BASE_URL}/${name}`);
            setPolicyContent(response.data);
            setEditedContent(JSON.stringify(response.data.content, null, 2)); // Pretty print JSON
            setPageTitle(response.data.pageTitle);
        } catch (err) {
            console.error(`Error fetching policy ${name}:`, err);
            setError(`Failed to load content for ${name}.`);
            toast.error(`Failed to load content for ${name}.`);
        } finally {
            setLoading(false);
        }
    };

    const handlePolicySelect = (e) => {
        const name = e.target.value;
        setSelectedPolicyName(name);
        setIsAddingNewPolicy(false); // Exit add mode when selecting an existing policy
        if (name) {
            fetchPolicyContent(name);
        } else {
            setPolicyContent(null);
            setEditedContent('');
            setPageTitle('');
        }
    };

    const handleContentChange = (e) => {
        setEditedContent(e.target.value);
    };

    const handlePageTitleChange = (e) => {
        setPageTitle(e.target.value);
    };

    const handleAddNewPolicyClick = () => {
        setIsAddingNewPolicy(true);
        setSelectedPolicyName('');
        setPolicyContent(null);
        setEditedContent('');
        setPageTitle('');
        setNewPolicyName(''); // Clear new policy name input
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        let currentPolicyName = selectedPolicyName;
        if (isAddingNewPolicy) {
            currentPolicyName = newPolicyName;
        }

        if (!currentPolicyName || !pageTitle || !editedContent) {
            setError('All fields are required.');
            toast.error('All fields are required.');
            setLoading(false);
            return;
        }

        try {
            const contentArray = JSON.parse(editedContent); // Attempt to parse the JSON string
            const payload = {
                policyName: currentPolicyName,
                pageTitle: pageTitle,
                content: contentArray
            };
            
            const axiosConfig = {
                headers: {
                    'Content-Type': 'application/json',
                    'token': token 
                }
            };

            await axios.post(API_BASE_URL, payload, axiosConfig);
            toast.success(`${currentPolicyName} policy ${isAddingNewPolicy ? 'added' : 'updated'} successfully!`);
            
            // After successful submission, refresh the list of policy names
            await fetchPolicyNames(); 
            // Optionally, switch back to editing mode and select the newly added policy
            if (isAddingNewPolicy) {
                setIsAddingNewPolicy(false);
                setSelectedPolicyName(currentPolicyName);
                fetchPolicyContent(currentPolicyName); // Load the content of the newly added policy
            }
        } catch (err) {
            console.error('Error updating policy:', err);
            if (err instanceof SyntaxError) {
                setError('Invalid JSON format for policy content.');
                toast.error('Invalid JSON format for policy content.');
            } else {
                setError('Failed to update policy.');
                toast.error('Failed to update policy.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 admin-panel">
            <h1 className="text-2xl font-bold mb-4">Update Policy Pages</h1>

            {error && <div className="text-red-500 mb-4">{error}</div>}

            {isAddingNewPolicy ? (
                <div className="mb-4">
                    <label htmlFor="new-policy-name" className="block text-gray-700 text-sm font-bold mb-2">
                        New Policy Name:
                    </label>
                    <input
                        type="text"
                        id="new-policy-name"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={newPolicyName}
                        onChange={(e) => setNewPolicyName(e.target.value)}
                        placeholder="e.g., DataPrivacy, GiftWrapPolicy"
                        disabled={loading}
                    />
                </div>
            ) : (
                <div className="mb-4">
                    <label htmlFor="policy-select" className="block text-gray-700 text-sm font-bold mb-2">
                        Select Policy:
                    </label>
                    <select
                        id="policy-select"
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={selectedPolicyName}
                        onChange={handlePolicySelect}
                        disabled={loading}
                    >
                        <option value="">-- Choose a Policy --</option>
                        {policyNames.map((policy) => (
                            <option key={policy.policyName} value={policy.policyName}>
                                {policy.pageTitle || policy.policyName}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="mb-4">
                <button
                    type="button"
                    onClick={handleAddNewPolicyClick}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    disabled={loading}
                >
                    Add New Policy
                </button>
            </div>


            {selectedPolicyName && (
                <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                    <div className="mb-4">
                        <label htmlFor="page-title" className="block text-gray-700 text-sm font-bold mb-2">
                            Page Title:
                        </label>
                        <input
                            type="text"
                            id="page-title"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={pageTitle}
                            onChange={handlePageTitleChange}
                            disabled={loading}
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="policy-content" className="block text-gray-700 text-sm font-bold mb-2">
                            Policy Content (JSON):
                        </label>
                        <textarea
                            id="policy-content"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-96 font-mono"
                            value={editedContent}
                            onChange={handleContentChange}
                            disabled={loading}
                        ></textarea>
                        <p className="text-xs text-gray-500 mt-1">
                            Edit the policy content in JSON format. Ensure it's valid JSON.
                        </p>
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default PolicyUpdate;
