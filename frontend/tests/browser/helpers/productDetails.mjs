import { productDetails } from '../../../../backend/tests/helpers/productFixture.js';
export { productDetails };

export async function fillProductDetails(page) {
  await page.getByRole('combobox', { name: 'Fabric', exact: true }).selectOption(productDetails.fabric);
  await page.getByRole('combobox', { name: 'Type', exact: true }).selectOption(productDetails.type);
  for (const [field, value] of Object.entries(productDetails)) {
    if (field === 'fabric' || field === 'type') continue;
    const id = field === 'itemDimensionsLxWxH' ? 'item-dimensions-lxwxh' : field.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    await page.locator(`#product-${id}`).fill(value);
  }
}
