const DATABASE = 'febeul-product-drafts';
const STORE = 'images';
let databasePromise;

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); databasePromise = null; };
        resolve(request.result);
      };
      request.onerror = () => { databasePromise = null; reject(request.error); };
      request.onblocked = () => { databasePromise = null; reject(new Error('Draft image storage is unavailable.')); };
    });
  }
  return databasePromise;
}

async function imageTransaction(mode, operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const request = operation(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request?.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Draft image save was interrupted.'));
  });
}

export function createProductValues(product = {}) {
  return {
    name: '', description: '', category: 'BABYDOLL', type: '',
    bestseller: false, isLuxePrive: false, isActive: true,
    countryOfOrigin: '', manufacturer: '', packer: '', includedComponents: '',
    fabric: '', pattern: '', sleeveStyle: '', sleeveLength: '', neck: '', hsn: '',
    materialComposition: '', careInstructions: '', closureType: '', materialType: '',
    itemWeight: '', itemDimensionsLxWxH: '', netQuantity: '', genericName: '',
    keywords: '', newSizeInput: '',
    ...product,
    variations: (product.variations || [{ color: '', images: [], sizes: [], sku: '' }]).map(variation => ({
      ...variation, sku: variation.sku || '', images: variation.images || [],
      sizes: (variation.sizes || []).map(size => ({ ...size, stock: size.stock ?? 0 }))
    })),
    ...(Array.isArray(product.keywords) ? { keywords: product.keywords.join(', ') } : {})
  };
}

// Text is journaled synchronously on each edit. Files live separately in IndexedDB,
// so typing does not repeatedly serialize large galleries or depend on the network.
export function createProductDraftStorage(key) {
  const identities = new WeakMap();
  const stored = new Set();
  const pending = new Map();

  return {
    async read() {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const record = JSON.parse(raw);
      if (record.version !== 1 || !Array.isArray(record.values?.variations)) {
        throw new Error('This draft could not be read.');
      }
      const missingImages = [];
      const variations = await Promise.all(record.values.variations.map(async variation => ({
        ...variation,
        images: (await Promise.all(variation.images.map(async image => {
          if (typeof image === 'string') return image;
          try {
            if (!image.id?.startsWith(`${key}:image:`)) throw new Error('Invalid image reference.');
            const blob = await imageTransaction('readonly', store => store.get(image.id));
            if (!(blob instanceof Blob)) throw new Error('Image is unavailable.');
            const file = new File([blob], image.name, { type: image.type, lastModified: image.lastModified });
            identities.set(file, image.id);
            stored.add(image.id);
            return file;
          } catch {
            missingImages.push(image.name || 'Unnamed image');
            return null;
          }
        }))).filter(Boolean)
      })));
      return { ...record, values: createProductValues({ ...record.values, variations }), missingImages };
    },

    async write(values, baseline) {
      const uploads = [];
      const variations = values.variations.map(variation => ({
        ...variation,
        images: variation.images.map(image => {
          if (typeof image === 'string') return image;
          let id = identities.get(image);
          if (!id) {
            id = `${key}:image:${crypto.randomUUID()}`;
            identities.set(image, id);
          }
          uploads.push({ id, image });
          return { id, name: image.name, type: image.type, lastModified: image.lastModified };
        })
      }));
      const savedAt = Date.now();
      localStorage.setItem(key, JSON.stringify({ version: 1, savedAt, baseline, values: { ...values, variations } }));
      await Promise.all(uploads.map(({ id, image }) => {
        if (stored.has(id)) return undefined;
        if (!pending.has(id)) {
          const saving = imageTransaction('readwrite', store => store.put(image, id))
            .then(() => { stored.add(id); })
            .finally(() => { pending.delete(id); });
          pending.set(id, saving);
        }
        return pending.get(id);
      }));
      return savedAt;
    },

    async clear() {
      // Remove the recovery record first; an outstanding image write cannot recreate it.
      localStorage.removeItem(key);
      await Promise.allSettled([...pending.values()]);
      // Orphan cleanup is best effort; the recovery record is already removed.
      await imageTransaction('readwrite', store => store.delete(IDBKeyRange.bound(`${key}:image:`, `${key}:image:\uffff`))).catch(() => {});
      stored.clear();
    }
  };
}
