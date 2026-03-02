/**
 * barcodeService
 *
 * Looks up food products by barcode using the Open Food Facts API.
 * Returns normalised per-serving nutrition data.
 */

const API_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const TIMEOUT_MS = 8000;

const USER_AGENT = 'Biblely/1.0 (iOS; contact@biblely.app)';

function parseServingGrams(servingSize) {
  if (!servingSize) return null;
  const match = servingSize.match(/([\d.]+)\s*g/i);
  return match ? parseFloat(match[1]) : null;
}

function round(val) {
  return Math.round(val);
}

/**
 * Look up a barcode and return nutrition data.
 * @param {string} barcode - EAN-13, UPC-A, etc.
 * @returns {Promise<object|null>} Nutrition object or null if not found.
 */
async function lookup(barcode) {
  if (!barcode || typeof barcode !== 'string') return null;

  const clean = barcode.trim();
  if (!clean) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(
      `${API_BASE}/${encodeURIComponent(clean)}.json?fields=product_name,nutriments,serving_size,serving_quantity,brands,image_front_small_url`,
      {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
      },
    );
    clearTimeout(timer);

    if (!res.ok) return null;

    const json = await res.json();
    if (!json || json.status === 0 || !json.product) return null;

    const p = json.product;
    const n = p.nutriments || {};

    const hasPerServing = n['energy-kcal_serving'] != null;
    const servingGrams = parseServingGrams(p.serving_size) || p.serving_quantity || null;

    let calories, protein, carbs, fat;

    if (hasPerServing) {
      calories = round(n['energy-kcal_serving'] || 0);
      protein  = round(n['proteins_serving'] || 0);
      carbs    = round(n['carbohydrates_serving'] || 0);
      fat      = round(n['fat_serving'] || 0);
    } else if (servingGrams && servingGrams !== 100) {
      const factor = servingGrams / 100;
      calories = round((n['energy-kcal_100g'] || 0) * factor);
      protein  = round((n['proteins_100g'] || 0) * factor);
      carbs    = round((n['carbohydrates_100g'] || 0) * factor);
      fat      = round((n['fat_100g'] || 0) * factor);
    } else {
      calories = round(n['energy-kcal_100g'] || 0);
      protein  = round(n['proteins_100g'] || 0);
      carbs    = round(n['carbohydrates_100g'] || 0);
      fat      = round(n['fat_100g'] || 0);
    }

    const name = p.product_name
      ? (p.brands ? `${p.product_name} (${p.brands.split(',')[0].trim()})` : p.product_name)
      : null;

    if (!name) return null;

    return {
      name,
      description: p.serving_size ? `Serving: ${p.serving_size}` : 'Per 100g',
      calories,
      protein,
      carbs,
      fat,
      portionSize: p.serving_size || '100g',
      source: 'barcode',
    };
  } catch (e) {
    if (e.name === 'AbortError') {
      console.warn('[Barcode] Request timed out for:', clean);
    } else {
      console.warn('[Barcode] Lookup failed:', e.message);
    }
    return null;
  }
}

export default { lookup };
