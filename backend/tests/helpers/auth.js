import { envAccounts, envToken, userToken } from '../../utils/authTokens.js';
export const adminTokenFor = value => {
    const account = envAccounts().find(a => a.email + a.password === String(value));
    return account ? envToken(account) : userToken({ _id: String(value), tokenVersion: 0 }, 'admin');
};
