import express from 'express';
import { getPolicies, getPolicyByName, createOrUpdatePolicy, deletePolicy } from '../controllers/policyController.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

router.route('/')
    .get(getPolicies)
    .post(adminAuth, createOrUpdatePolicy);

router.route('/:policyName')
    .get(getPolicyByName)
    .delete(adminAuth, deletePolicy);

export default router;
