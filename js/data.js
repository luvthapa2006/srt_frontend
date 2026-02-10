// ========================================
// DATA.JS - API Integration Layer (ROUTE-BASED PRICING)
// Connects to Node.js + MongoDB backend
// ========================================

// API Base URL - Update this when deploying
const API_BASE_URL = 'https://srt-backend-a5m9.onrender.com/api';

// Seat Configuration (Client-side constants)
const TOTAL_SEATS = 40;
const SEATS_PER_DECK = 20;

// Generate all available seats
function generateAllSeats() {
  const seats = [];
  for (let i = 1; i <= SEATS_PER_DECK; i++) {
    seats.push(`U${i}`); // Upper deck
  }
  for (let i = 1; i <= SEATS_PER_DECK; i++) {
    seats.push(`L${i}`); // Lower deck
  }
  return seats;
}

const ALL_SEATS = generateAllSeats();

// DEFAULT pricing (used as fallback)
const defaultSeatPricing = {
  firstRight: 120,
  firstLeft: 100,
  lastLeft: 90,
  sleeper: 150
};

// Define which seats belong to which zone (7-ROW LAYOUT)
const seatPricingZones = {
  firstLeft_U: [1, 2, 3, 4, 5, 6],
  lastLeft_U: [7],
  firstRight_U: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  sleeper_U: [20],
  firstLeft_L: [1, 2, 3, 4, 5, 6],
  lastLeft_L: [7],
  firstRight_L: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  sleeper_L: [20]
};

// Get zone for a seat
function getSeatZone(seatNumber) {
  const deck = seatNumber.charAt(0);
  const num = parseInt(seatNumber.substring(1));
  
  if (num === 20) return 'sleeper';
  if (num === 7) return 'lastLeft';
  if ([1, 2, 3, 4, 5, 6].includes(num)) return 'firstLeft';
  return 'firstRight';
}

// ========================================
// ROUTE-BASED PRICING SYSTEM
// ========================================

// Generate route key from origin and destination
function getRouteKey(origin, destination) {
  // Normalize route key (case-insensitive, trimmed)
  const normalizedOrigin = origin.trim().toLowerCase();
  const normalizedDestination = destination.trim().toLowerCase();
  return `${normalizedOrigin}-${normalizedDestination}`;
}

// Get pricing for a specific route
function getRoutePricing(origin, destination) {
  const routeKey = getRouteKey(origin, destination);
  
  try {
    const storedPricing = localStorage.getItem('routePricing');
    if (storedPricing) {
      const allRoutePricing = JSON.parse(storedPricing);
      if (allRoutePricing[routeKey]) {
        return allRoutePricing[routeKey];
      }
    }
  } catch (e) {
    console.error('Error reading route pricing:', e);
  }
  
  // Return default pricing if no route-specific pricing found
  return { ...defaultSeatPricing };
}

// Set pricing for a specific route
function setRoutePricing(origin, destination, pricing) {
  const routeKey = getRouteKey(origin, destination);
  
  try {
    let allRoutePricing = {};
    const stored = localStorage.getItem('routePricing');
    if (stored) {
      allRoutePricing = JSON.parse(stored);
    }
    
    allRoutePricing[routeKey] = {
      firstRight: parseInt(pricing.firstRight),
      firstLeft: parseInt(pricing.firstLeft),
      lastLeft: parseInt(pricing.lastLeft),
      sleeper: parseInt(pricing.sleeper),
      routeName: `${origin} → ${destination}`,
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem('routePricing', JSON.stringify(allRoutePricing));
    console.log(`✅ Pricing saved for route: ${routeKey}`, allRoutePricing[routeKey]);
    return true;
  } catch (e) {
    console.error('Error saving route pricing:', e);
    return false;
  }
}

// Get all routes with custom pricing
function getAllRoutePricing() {
  try {
    const stored = localStorage.getItem('routePricing');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading all route pricing:', e);
  }
  return {};
}

// Delete pricing for a specific route (revert to default)
function deleteRoutePricing(origin, destination) {
  const routeKey = getRouteKey(origin, destination);
  
  try {
    const stored = localStorage.getItem('routePricing');
    if (stored) {
      const allRoutePricing = JSON.parse(stored);
      delete allRoutePricing[routeKey];
      localStorage.setItem('routePricing', JSON.stringify(allRoutePricing));
      console.log(`✅ Pricing deleted for route: ${routeKey}`);
      return true;
    }
  } catch (e) {
    console.error('Error deleting route pricing:', e);
  }
  return false;
}

// Calculate seat price for a specific route and seat
function calculateSeatPriceForRoute(origin, destination, seatNumber) {
  const zone = getSeatZone(seatNumber);
  const routePricing = getRoutePricing(origin, destination);
  return routePricing[zone] || routePricing.firstLeft;
}

// BACKWARD COMPATIBILITY: Keep old function for existing code
function calculateSeatPrice(basePrice, seatNumber) {
  // This is deprecated - now we use route-based pricing
  // But keeping for backward compatibility
  const zone = getSeatZone(seatNumber);
  return getSeatPricing()[zone] || getSeatPricing().firstLeft;
}

// Get current default pricing (for routes without custom pricing)
function getSeatPricing() {
  try {
    const stored = localStorage.getItem('defaultSeatPricing');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error parsing default pricing:', e);
  }
  return { ...defaultSeatPricing };
}

// Update default pricing
function updateSeatPricing(zone, price) {
  const currentPricing = getSeatPricing();
  
  if (currentPricing.hasOwnProperty(zone)) {
    currentPricing[zone] = parseInt(price);
    localStorage.setItem('defaultSeatPricing', JSON.stringify(currentPricing));
    console.log('Updated default pricing for', zone, ':', price);
    return true;
  }
  
  console.error('Invalid pricing zone:', zone);
  return false;
}

// Reset default pricing
function resetSeatPricing() {
  localStorage.removeItem('defaultSeatPricing');
  console.log('Default pricing reset to defaults');
  return true;
}

// ========================================
// API FUNCTIONS
// ========================================

// Get all schedules with optional filters
async function getSchedules(filters = {}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.origin) {
      queryParams.append('origin', filters.origin);
    }
    if (filters.destination) {
      queryParams.append('destination', filters.destination);
    }
    if (filters.date) {
      queryParams.append('date', filters.date);
    }

    const url = `${API_BASE_URL}/schedules?${queryParams}`;
    console.log('Fetching schedules from:', url);
    console.log('With filters:', filters);

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Failed to fetch schedules: ${response.status} ${response.statusText}`);
    }

    const schedules = await response.json();
    console.log('API returned schedules:', schedules);
    
    // Convert MongoDB _id to id for compatibility with existing frontend code
    const processedSchedules = schedules.map(schedule => ({
      ...schedule,
      id: schedule._id || schedule.id,
      bookedSeats: schedule.bookedSeats || []
    }));
    
    console.log('Processed schedules:', processedSchedules);
    return processedSchedules;
  } catch (error) {
    console.error('Error fetching schedules:', error);
    showToast('Failed to load schedules. Please check your connection.', 'error');
    return [];
  }
}

// Get all unique cities
async function getAllCities() {
  try {
    const response = await fetch(`${API_BASE_URL}/schedules/cities`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch cities');
    }

    const data = await response.json();
    return data.cities || [];
  } catch (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
}

// Get all unique routes from schedules
async function getAllRoutes() {
  try {
    const schedules = await getSchedules();
    const routesSet = new Set();
    
    schedules.forEach(schedule => {
      const routeKey = getRouteKey(schedule.origin, schedule.destination);
      routesSet.add(JSON.stringify({
        key: routeKey,
        origin: schedule.origin,
        destination: schedule.destination,
        display: `${schedule.origin} → ${schedule.destination}`
      }));
    });
    
    return Array.from(routesSet).map(r => JSON.parse(r));
  } catch (error) {
    console.error('Error fetching routes:', error);
    return [];
  }
}

// Get single schedule by ID
async function getScheduleById(id) {
  try {
    console.log('Fetching schedule by ID:', id);
    const response = await fetch(`${API_BASE_URL}/schedules/${id}`);
    
    if (!response.ok) {
      throw new Error('Schedule not found');
    }

    const schedule = await response.json();
    console.log('Fetched schedule:', schedule);
    
    // Convert MongoDB _id to id for compatibility
    return {
      ...schedule,
      id: schedule._id || schedule.id,
      bookedSeats: schedule.bookedSeats || []
    };
  } catch (error) {
    console.error('Error fetching schedule:', error);
    showToast('Failed to load schedule details.', 'error');
    return null;
  }
}

// Add new schedule (Admin)
async function addSchedule(scheduleData) {
  try {
    console.log('Adding schedule:', scheduleData);
    
    const response = await fetch(`${API_BASE_URL}/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(scheduleData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch (e) {
        error = { message: errorText || 'Failed to create schedule' };
      }
      throw new Error(error.message || 'Failed to create schedule');
    }

    const schedule = await response.json();
    console.log('Schedule created:', schedule);
    
    return {
      ...schedule,
      id: schedule._id || schedule.id,
      bookedSeats: schedule.bookedSeats || []
    };
  } catch (error) {
    console.error('Error creating schedule:', error);
    showToast(error.message, 'error');
    return null;
  }
}

// Update schedule (Admin)
async function updateSchedule(id, updates) {
  try {
    console.log('Updating schedule:', id, updates);
    
    const response = await fetch(`${API_BASE_URL}/schedules/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update schedule');
    }

    const schedule = await response.json();
    console.log('Schedule updated:', schedule);
    
    return {
      ...schedule,
      id: schedule._id || schedule.id,
      bookedSeats: schedule.bookedSeats || []
    };
  } catch (error) {
    console.error('Error updating schedule:', error);
    showToast(error.message, 'error');
    return null;
  }
}

// Delete schedule (Admin)
async function deleteSchedule(id) {
  try {
    console.log('Deleting schedule:', id);
    
    const response = await fetch(`${API_BASE_URL}/schedules/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete schedule');
    }

    console.log('Schedule deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting schedule:', error);
    showToast(error.message, 'error');
    return false;
  }
}

// Create booking
async function createBooking(bookingData) {
  try {
    console.log('Creating booking:', bookingData);
    
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    });

    const result = await response.json();

    if (!response.ok) {
      return { 
        error: result.message || 'Failed to create booking',
        unavailableSeats: result.unavailableSeats 
      };
    }

    console.log('Booking created:', result);

    return {
      ...result,
      id: result._id || result.id,
      bookingToken: result.bookingToken,
      scheduleId: result.scheduleId._id || result.scheduleId
    };
  } catch (error) {
    console.error('Error creating booking:', error);
    return { error: 'Failed to create booking. Please try again.' };
  }
}

// Get booking by token
async function getBookingByToken(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${token}`);
    
    if (!response.ok) {
      return null;
    }

    const booking = await response.json();
    return {
      ...booking,
      id: booking._id || booking.id,
      scheduleId: booking.scheduleId._id || booking.scheduleId
    };
  } catch (error) {
    console.error('Error fetching booking:', error);
    return null;
  }
}

// Get all bookings (Admin)
async function getAllBookings() {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch bookings');
    }

    const bookings = await response.json();
    return bookings.map(booking => ({
      ...booking,
      id: booking._id || booking.id,
      scheduleId: booking.scheduleId
    }));
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }
}

// Cancel booking (Admin)
async function cancelBooking(bookingToken) {
  try {
    console.log('Cancelling booking:', bookingToken);
    
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingToken}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('Cancel booking endpoint not implemented on backend yet');
        showToast('Cancel booking feature requires backend implementation', 'warning');
        return false;
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel booking');
    }

    console.log('Booking cancelled successfully');
    return true;
  } catch (error) {
    console.error('Error cancelling booking:', error);
    if (error.message.includes('Route not found') || error.message.includes('404')) {
      showToast('Cancel booking endpoint not yet implemented on backend', 'warning');
    } else {
      showToast(error.message, 'error');
    }
    return false;
  }
}

// Get booking statistics (Admin)
async function getBookingStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/stats/revenue`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    const stats = await response.json();
    return stats;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { totalRevenue: 0, totalBookings: 0 };
  }
}

// Helper function for seats.js - calculate amount for route-based pricing
async function calculateBookingAmountAsync(scheduleId, seatNumbers) {
  const schedule = await getScheduleById(scheduleId);
  if (!schedule) return 0;
  
  let total = 0;
  seatNumbers.forEach(seat => {
    total += calculateSeatPriceForRoute(schedule.origin, schedule.destination, seat);
  });
  
  return total;
}

// ========================================
// BACKWARD COMPATIBILITY
// ========================================

let cachedSchedules = [];

async function loadAndCacheSchedules(filters = {}) {
  cachedSchedules = await getSchedules(filters);
  return cachedSchedules;
}

console.log('✅ Data.js loaded with ROUTE-BASED pricing system');
console.log('📊 Default pricing:', getSeatPricing());
console.log('🛣️ Route pricing enabled');