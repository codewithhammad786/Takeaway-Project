// Distance-based delivery pricing — how far a customer's postcode is from the branch decides the
// delivery fee and the minimum order for that order, instead of one flat fee/minimum site-wide.
// Geocoding uses postcodes.io (free, no API key, UK postcodes only) for both the branch and the
// customer address, then a Haversine great-circle distance in miles is matched against DELIVERY_TIERS.

const BRANCH_POSTCODES = {
  Birmingham: 'B1 1DA',
  'Stoke-on-Trent': 'ST6 5TA',
};

// Ordered by maxMiles ascending — the first tier whose maxMiles the customer's distance fits
// inside applies. Anything beyond the last tier's maxMiles is out of delivery range.
const DELIVERY_TIERS = [
  { maxMiles: 1, fee: 0, minOrder: 10 },
  { maxMiles: 2, fee: 1.5, minOrder: 10 },
  { maxMiles: 3, fee: 2.5, minOrder: 15 },
  { maxMiles: 4, fee: 3.5, minOrder: 15 },
  { maxMiles: 5, fee: 4.5, minOrder: 20 },
  { maxMiles: 6, fee: 5.5, minOrder: 20 },
];

const GEOCODE_TIMEOUT_MS = 6000;

const branchCoordsCache = new Map();

async function geocodePostcode(postcode) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.trim())}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.result) return null;
    return { lat: data.result.latitude, lon: data.result.longitude };
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getBranchCoords(branch) {
  if (branchCoordsCache.has(branch)) {
    return branchCoordsCache.get(branch);
  }
  const postcode = BRANCH_POSTCODES[branch];
  if (!postcode) return null;

  const coords = await geocodePostcode(postcode);
  if (coords) {
    branchCoordsCache.set(branch, coords);
  }
  return coords;
}

function haversineMiles(a, b) {
  const EARTH_RADIUS_MILES = 3958.8;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_MILES * c;
}

function findTier(miles) {
  return DELIVERY_TIERS.find((tier) => miles <= tier.maxMiles) || null;
}

// Resolves the delivery fee and minimum order for a customer's postcode relative to a branch.
// Returns { valid: true, miles, deliveryFee, minOrder } on success, or
// { valid: false, reason: 'invalid_postcode' | 'out_of_range' | 'branch_unresolved', miles? } otherwise.
async function resolveDeliveryPricing(branch, customerPostcode) {
  if (!customerPostcode || !customerPostcode.trim()) {
    return { valid: false, reason: 'invalid_postcode' };
  }

  const branchCoords = await getBranchCoords(branch);
  if (!branchCoords) {
    return { valid: false, reason: 'branch_unresolved' };
  }

  const customerCoords = await geocodePostcode(customerPostcode);
  if (!customerCoords) {
    return { valid: false, reason: 'invalid_postcode' };
  }

  const miles = haversineMiles(branchCoords, customerCoords);
  const tier = findTier(miles);
  if (!tier) {
    return { valid: false, reason: 'out_of_range', miles };
  }

  return { valid: true, miles, deliveryFee: tier.fee, minOrder: tier.minOrder };
}

module.exports = { resolveDeliveryPricing, DELIVERY_TIERS };
