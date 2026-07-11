import policyModel from '../models/policyModel.js';

// @desc    Get all policies
// @route   GET /api/policy
// @access  Public (or make it private to admin)
const getPolicies = async (req, res) => {
    try {
        const policies = await policyModel.find({}, 'policyName pageTitle');
        res.json(policies);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get a policy by name
// @route   GET /api/policy/:policyName
// @access  Public
const getPolicyByName = async (req, res) => {
    try {
        const policy = await policyModel.findOne({ policyName: req.params.policyName });
        if (policy) {
            res.json(policy);
        } else {
            res.status(404).json({ message: 'Policy not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Create or update a policy
// @route   POST /api/policy
// @access  Private/Admin
const createOrUpdatePolicy = async (req, res) => {
    try {
        const { policyName, content, pageTitle } = req.body;

        const policy = await policyModel.findOneAndUpdate(
            { policyName },
            { 
                content, 
                pageTitle,
                creator: {
                    name: req.userName || 'Admin',
                    email: req.userEmail || '',
                    role: req.role || 'admin'
                }
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(201).json(policy);
    } catch (error) {
        res.status(400).json({ message: 'Error updating policy', error });
    }
};

// @desc    Delete a policy
// @route   DELETE /api/policy/:policyName
// @access  Private/Admin
const deletePolicy = async (req, res) => {
    try {
        const { policyName } = req.params;
        const result = await policyModel.findOneAndDelete({ policyName });
        if (result) {
            res.json({ success: true, message: 'Policy deleted successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Policy not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error });
    }
};

export { getPolicies, getPolicyByName, createOrUpdatePolicy, deletePolicy };
