import mongoose from 'mongoose';
import userModel from '../models/userModel.js';
import orderModel from '../models/orderModel.js';
import couponModel from '../models/couponModel.js';
import productModel from '../models/productModel.js';

const LIMIT = 6;
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const short = value => String(value || '').slice(0, 120);
const link = (path, value) => `${path}?search=${encodeURIComponent(value)}`;

export async function searchAdminRecords(query, { role, permissions = [] }) {
  const can = permission => role === 'admin' || permissions.includes(permission);
  const regex = new RegExp(escapeRegex(query), 'i');
  const idQuery = query.replace(/^#/, '');
  const idMatch = /^[a-f\d]{24}$/i.test(idQuery)
    ? [{ _id: new mongoose.Types.ObjectId(idQuery) }]
    : /^[a-f\d]{4,23}$/i.test(idQuery)
      ? [{ $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: escapeRegex(idQuery), options: 'i' } } }]
      : [];
  const definitions = [
    {
      type: 'Users', permission: '/allusers', model: userModel,
      filter: { $or: [{ name: regex }, { email: regex }, { mobile: regex }, ...idMatch] },
      fields: 'name email role',
      format: row => ({ title: short(row.name || row.email), subtitle: short(row.email), href: link('/allusers', row.email) }),
    },
    {
      type: 'Orders', permission: '/orders', model: orderModel,
      filter: { $or: [{ orderItemId: new RegExp(escapeRegex(idQuery), 'i') }, ...idMatch] },
      fields: 'orderItemId orderStatus',
      format: row => ({ title: `Order #${row.orderItemId || row._id}`, subtitle: short(row.orderStatus), href: link('/orders', row._id) }),
    },
    {
      type: 'Coupons', permission: '/coupons', model: couponModel,
      filter: { $or: [{ code: regex }, { description: regex }, ...idMatch] },
      fields: 'code description isActive expiryDate',
      format: row => ({ title: short(row.code), subtitle: !row.isActive ? 'Inactive coupon' : new Date(row.expiryDate) < new Date() ? 'Expired coupon' : short(row.description || 'Active coupon'), href: link('/coupons', row.code) }),
    },
    {
      type: 'Products', permission: '/list', model: productModel,
      filter: { $or: [{ name: regex }, { 'variations.sku': regex }, { category: regex }, { styleCode: regex }, ...idMatch] },
      fields: 'name category isActive',
      format: row => ({ title: short(row.name), subtitle: `${short(row.category)}${row.isActive === false ? ' · Inactive' : ''}`, href: link('/list', row._id) }),
    },
  ].filter(item => can(item.permission));

  // Each collection has its own deadline: one unavailable category cannot hide the others.
  const results = await Promise.allSettled(definitions.map(async item => {
    const rows = await item.model.find(item.filter).select(item.fields).sort({ _id: -1 })
      .limit(LIMIT + 1).maxTimeMS(1500).lean();
    return { type: item.type, hasMore: rows.length > LIMIT, items: rows.slice(0, LIMIT).map(row => ({
      id: `${item.type}:${row._id}`, type: item.type, ...item.format(row),
    })) };
  }));
  return {
    groups: results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []),
    unavailable: results.flatMap((result, index) => result.status === 'rejected' ? [definitions[index].type] : []),
  };
}
