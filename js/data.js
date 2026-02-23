// ========================================
// DATA.JS - API Integration Layer
// Bus Types: AC Sleeper (36) | AC Seater+Sleeper (8+32)
// Pricing: lower deck price, upper deck price, per-seat overrides
// ========================================

const API_BASE_URL = 'https://srt-backend-a5m9.onrender.com/api';

// ── Bus type constants ──
const BUS_TYPE_SLEEPER   = 'AC Sleeper (36)';
const BUS_TYPE_MIXED     = 'AC Seater+Sleeper (8+32)';

// ── Seat layout per bus type per deck ──
// AC Sleeper (36): both decks → 6L×1 left + 6R×2 right = 18 per deck × 2 = 36
// AC Seater+Sleeper (8+32):
//   Lower → 6L×1 left + 4R×2 seaters + 4R×2 sleepers = 6+8+8 = 22... 
//   Wait: spec says 8 seats total (lower right first 4 rows×2) + 32 sleepers
//   Lower: 6 left(sleeper) + 8 right-seater(rows1-4) + 8 right-sleeper(rows5-8) = 22 lower
//   Upper: 6 left(sleeper) + 12 right(sleeper) = 18 upper  → total 40 (8 seaters + 32 sleepers) ✓

function getTotalSeats(busType) {
  if (busType === BUS_TYPE_SLEEPER) return 36;
  if (busType === BUS_TYPE_MIXED)   return 40; // 8 seaters + 32 sleepers
  return 36;
}

// Generate seat IDs for a given bus type
// Returns { lower: [...], upper: [...] }
function getSeatIds(busType) {
  if (busType === BUS_TYPE_SLEEPER) {
    // Lower: L1-L18, Upper: U1-U18
    const lower = Array.from({length: 18}, (_, i) => `L${i+1}`);
    const upper = Array.from({length: 18}, (_, i) => `U${i+1}`);
    return { lower, upper };
  }
  if (busType === BUS_TYPE_MIXED) {
    // Lower: L1-L22 (6 left + 8 seater-right + 8 sleeper-right)
    const lower = Array.from({length: 22}, (_, i) => `L${i+1}`);
    // Upper: U1-U18 (6 left sleepers + 12 right sleepers)
    const upper = Array.from({length: 18}, (_, i) => `U${i+1}`);
    return { lower, upper };
  }
  // fallback
  const lower = Array.from({length: 18}, (_, i) => `L${i+1}`);
  const upper = Array.from({length: 18}, (_, i) => `U${i+1}`);
  return { lower, upper };
}

// Get zone info for a seat given busType
// Returns: { zone, isSeater, isSleeper, deck, col }
function getSeatInfo(seatId, busType) {
  const deck = seatId.charAt(0); // 'L' or 'U'
  const num  = parseInt(seatId.substring(1));

  if (busType === BUS_TYPE_SLEEPER) {
    // Both decks: seats 1-6 = left sleepers, 7-18 = right sleepers (6 rows × 2)
    const isLeft  = num <= 6;
    return {
      zone:      isLeft ? 'left' : 'right',
      isSleeper: true,
      isSeater:  false,
      deck,
      col: isLeft ? 'left' : 'right'
    };
  }

  if (busType === BUS_TYPE_MIXED) {
    if (deck === 'L') {
      // Lower: 1-6 left sleepers | 7-14 right seaters (rows 1-4 × 2) | 15-22 right sleepers (rows 5-8 × 2)
      if (num <= 6)  return { zone: 'left',          isSleeper: true,  isSeater: false, deck, col: 'left' };
      if (num <= 14) return { zone: 'right-seater',  isSleeper: false, isSeater: true,  deck, col: 'right' };
      return           { zone: 'right-sleeper', isSleeper: true,  isSeater: false, deck, col: 'right' };
    } else {
      // Upper: 1-6 left sleepers | 7-18 right sleepers
      const isLeft = num <= 6;
      return {
        zone:      isLeft ? 'left' : 'right',
        isSleeper: true,
        isSeater:  false,
        deck,
        col: isLeft ? 'left' : 'right'
      };
    }
  }

  return { zone: 'left', isSleeper: true, isSeater: false, deck, col: 'left' };
}

// Legacy compatibility
function getSeatZone(seatId) {
  return getSeatInfo(seatId, BUS_TYPE_SLEEPER).zone;
}

// ========================================
// PRICING SYSTEM
// Structure per route:
// {
//   lowerPrice: number,   // default price for all lower seats
//   upperPrice: number,   // default price for all upper seats
//   perSeat: { L1: 500, U7: 600, ... }  // individual overrides
// }
// ========================================

const defaultPricing = {
  lowerPrice: 800,
  upperPrice: 600,
  perSeat: {}
};

function getRouteKey(origin, destination) {
  return `${origin.trim().toLowerCase()}-${destination.trim().toLowerCase()}`;
}

function getRoutePricing(origin, destination) {
  const key = getRouteKey(origin, destination);
  try {
    const stored = localStorage.getItem('routePricing_v2');
    if (stored) {
      const all = JSON.parse(stored);
      if (all[key]) return all[key];
    }
  } catch(e) {}
  return { ...defaultPricing, perSeat: {} };
}

function setRoutePricing(origin, destination, pricing) {
  const key = getRouteKey(origin, destination);
  try {
    let all = {};
    const stored = localStorage.getItem('routePricing_v2');
    if (stored) all = JSON.parse(stored);
    all[key] = {
      lowerPrice: parseInt(pricing.lowerPrice) || 800,
      upperPrice: parseInt(pricing.upperPrice) || 600,
      perSeat:    pricing.perSeat || {},
      routeName:  `${origin} → ${destination}`,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('routePricing_v2', JSON.stringify(all));
    return true;
  } catch(e) { return false; }
}

function getAllRoutePricing() {
  try {
    const stored = localStorage.getItem('routePricing_v2');
    return stored ? JSON.parse(stored) : {};
  } catch(e) { return {}; }
}

function deleteRoutePricing(origin, destination) {
  const key = getRouteKey(origin, destination);
  try {
    const stored = localStorage.getItem('routePricing_v2');
    if (stored) {
      const all = JSON.parse(stored);
      delete all[key];
      localStorage.setItem('routePricing_v2', JSON.stringify(all));
    }
    return true;
  } catch(e) { return false; }
}

// Calculate price for one seat
function calculateSeatPriceForRoute(origin, destination, seatId, busType) {
  const pricing = getRoutePricing(origin, destination);
  // Per-seat override takes priority
  if (pricing.perSeat && pricing.perSeat[seatId] !== undefined) {
    return parseInt(pricing.perSeat[seatId]);
  }
  // Deck-level price
  const deck = seatId.charAt(0);
  return deck === 'L' ? (pricing.lowerPrice || 800) : (pricing.upperPrice || 600);
}

// ── Legacy shims so old code doesn't break ──
function getSeatPricing()           { return { firstRight:800, firstLeft:800, lastLeft:800, sleeper:800 }; }
function updateSeatPricing()        { return true; }
function resetSeatPricing()         { return true; }
function calculateSeatPrice(bp, s)  { return bp; }

// ========================================
// API FUNCTIONS
// ========================================

async function getSchedules(filters = {}) {
  try {
    const q = new URLSearchParams();
    if (filters.origin)      q.append('origin',      filters.origin);
    if (filters.destination) q.append('destination', filters.destination);
    if (filters.date)        q.append('date',         filters.date);

    const res = await fetch(`${API_BASE_URL}/schedules?${q}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const schedules = await res.json();
    return schedules.map(s => ({ ...s, id: s._id || s.id, bookedSeats: s.bookedSeats || [] }));
  } catch(e) {
    console.error('Error fetching schedules:', e);
    showToast('Failed to load schedules.', 'error');
    return [];
  }
}

async function getAllCities() {
  try {
    const res = await fetch(`${API_BASE_URL}/schedules/cities`);
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    return data.cities || [];
  } catch(e) { return []; }
}

async function getOriginCities() {
  try {
    const res = await fetch(`${API_BASE_URL}/schedules/origins`);
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    return data.cities || [];
  } catch(e) { return []; }
}

async function getDestinationCities() {
  try {
    const res = await fetch(`${API_BASE_URL}/schedules/destinations`);
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    return data.cities || [];
  } catch(e) { return []; }
}

async function getAllRoutes() {
  try {
    const schedules = await getSchedules();
    const seen = new Set();
    return schedules.reduce((acc, s) => {
      const key = getRouteKey(s.origin, s.destination);
      if (!seen.has(key)) {
        seen.add(key);
        acc.push({ key, origin: s.origin, destination: s.destination, display: `${s.origin} → ${s.destination}` });
      }
      return acc;
    }, []);
  } catch(e) { return []; }
}

async function getScheduleById(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/schedules/${id}`);
    if (!res.ok) throw new Error('Not found');
    const s = await res.json();
    return { ...s, id: s._id || s.id, bookedSeats: s.bookedSeats || [] };
  } catch(e) {
    showToast('Failed to load schedule.', 'error');
    return null;
  }
}

async function addSchedule(data) {
  try {
    const res = await fetch(`${API_BASE_URL}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
    const s = await res.json();
    return { ...s, id: s._id || s.id, bookedSeats: s.bookedSeats || [] };
  } catch(e) { showToast(e.message, 'error'); return null; }
}

async function updateSchedule(id, updates) {
  try {
    const res = await fetch(`${API_BASE_URL}/schedules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
    const s = await res.json();
    return { ...s, id: s._id || s.id, bookedSeats: s.bookedSeats || [] };
  } catch(e) { showToast(e.message, 'error'); return null; }
}

async function deleteSchedule(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/schedules/${id}`, { method: 'DELETE' });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
    return true;
  } catch(e) { showToast(e.message, 'error'); return false; }
}

async function createBooking(data) {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) return { error: result.message || 'Failed', unavailableSeats: result.unavailableSeats };
    return { ...result, id: result._id || result.id, bookingToken: result.bookingToken };
  } catch(e) { return { error: 'Failed to create booking.' }; }
}

async function getBookingByToken(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/${token}`);
    if (!res.ok) return null;
    const b = await res.json();
    return { ...b, id: b._id || b.id };
  } catch(e) { return null; }
}

async function getAllBookings() {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings`);
    if (!res.ok) throw new Error('Failed');
    const bookings = await res.json();
    return bookings.map(b => ({ ...b, id: b._id || b.id }));
  } catch(e) { return []; }
}

async function cancelBooking(token) {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/${token}/cancel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
    return true;
  } catch(e) { showToast(e.message, 'error'); return false; }
}

async function getBookingStats() {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings/stats/revenue`);
    if (!res.ok) throw new Error('Failed');
    return await res.json();
  } catch(e) { return { totalRevenue: 0, totalBookings: 0 }; }
}

// ── Constants for old code compatibility ──
const TOTAL_SEATS    = 40;
const SEATS_PER_DECK = 20;

function generateAllSeats() {
  const seats = [];
  for (let i = 1; i <= 18; i++) seats.push(`U${i}`);
  for (let i = 1; i <= 18; i++) seats.push(`L${i}`);
  return seats;
}
const ALL_SEATS = generateAllSeats();

let cachedSchedules = [];
async function loadAndCacheSchedules(f = {}) {
  cachedSchedules = await getSchedules(f);
  return cachedSchedules;
}

console.log('✅ Data.js v2 loaded — AC Sleeper(36) + AC Seater+Sleeper(8+32)');

// ── Coupon API ──
async function validateCoupon(code, totalAmount) {
  try {
    const res = await fetch(`${API_BASE_URL}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, totalAmount })
    });
    return await res.json();
  } catch(e) { return { error: 'Failed to validate coupon' }; }
}

async function useCoupon(code) {
  try {
    await fetch(`${API_BASE_URL}/coupons/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
  } catch(e) {}
}

async function getAllCoupons() {
  try {
    const res = await fetch(`${API_BASE_URL}/coupons`);
    if (!res.ok) throw new Error('Failed');
    return await res.json();
  } catch(e) { return []; }
}

async function createCoupon(data) {
  try {
    const res = await fetch(`${API_BASE_URL}/coupons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message);
    return result;
  } catch(e) { showToast(e.message, 'error'); return null; }
}

async function deleteCoupon(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/coupons/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed');
    return true;
  } catch(e) { showToast('Failed to delete coupon', 'error'); return false; }
}

async function toggleScheduleActive(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/schedules/${id}/toggle-active`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed');
    return await res.json();
  } catch(e) { showToast('Failed to toggle status', 'error'); return null; }
}