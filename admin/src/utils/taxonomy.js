import axios from "axios";

// Seed values match the historical hardcoded lists this replaces, so nothing
// changes for existing products/nav until an admin edits Settings > Product
// Taxonomy. Shared across Add.jsx, Update.jsx, and the Product Taxonomy
// settings page so all three read/write the exact same CMS doc shape.
export const DEFAULT_TAXONOMY = {
  categories: ["BABYDOLL", "LINGERIE", "NIGHTY", "PAJAMAS", "GIFT WRAP"],
  fabrics: ["Satin", "Lace", "Net", "Silk Satin"],
  typesByCategory: {
    BABYDOLL: ["Above knee B'doll", "Knee Length B'doll", "One piece B'doll", "Two Piece B-doll"],
    LINGERIE: ["Teddy Choker Lingz", "Bra Panty Lingz"],
    NIGHTY: ["Silk Satin", "Sheer Mesh"],
    PAJAMAS: [],
    "GIFT WRAP": [],
  },
};

export const fetchTaxonomy = async (backendUrl) => {
  try {
    const response = await axios.get(`${backendUrl}/api/cms/productTaxonomy`);
    if (response.data.success && response.data.content) {
      const content = response.data.content;
      return {
        categories: content.categories?.length ? content.categories : DEFAULT_TAXONOMY.categories,
        fabrics: content.fabrics?.length ? content.fabrics : DEFAULT_TAXONOMY.fabrics,
        typesByCategory: content.typesByCategory || {},
      };
    }
  } catch (error) {
    console.error("Error fetching product taxonomy:", error);
  }
  return DEFAULT_TAXONOMY;
};

export const saveTaxonomy = async (backendUrl, token, content) => {
  const response = await axios.post(
    `${backendUrl}/api/cms`,
    { name: "productTaxonomy", content },
    { headers: { token } }
  );
  return response.data;
};
