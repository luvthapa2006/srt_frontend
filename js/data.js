// ========================================
// DATA.JS - API Integration Layer (UPDATED PRICING)
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

// NEW: Independent Seat Pricing (NOT multipliers, direct prices)
// These are the DEFAULT prices for each zone
const seatPricing = {
  firstRight: 120,    // First Right (2×6) - Premium seats
  firstLeft: 100,     // First Left (2×6) - Standard seats
  lastLeft: 90,       // Last Left 7th Seat - Budget seats
  sleeper: 150        // Last Right Sleeper - Luxury seats
};

// Define which seats belong to which zone (7-ROW LAYOUT)
// Layout: Left column (1-7) | Right columns (8-20)
const seatPricingZones = {
  // Upper Deck
  firstLeft_U: [1, 2, 3, 4, 5, 6],      // Left column seats (standard)
  lastLeft_U: [7],                       // Last left seat (budget)
  firstRight_U: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], // Right column seats (premium)
  sleeper_U: [20],                       // Sleeper seats
  
  // Lower Deck - Same mapping
  firstLeft_L: [1, 2, 3, 4, 5, 6],
  lastLeft_L: [7],
  firstRight_L: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  sleeper_L: [20]
};

// Get zone for a seat (7-ROW LAYOUT)
function getSeatZone(seatNumber) {
  const deck = seatNumber.charAt(0); // 'U' or 'L'
  const num = parseInt(seatNumber.substring(1));
  
  // Check sleeper seats first (only 20 now)
  if (num === 20) {
    return 'sleeper';
  }
  
  // Check last left seat (7)
  if (num === 7) {
    return 'lastLeft';
  }
  
  // Check first left seats (1-6)
  if ([1, 2, 3, 4, 5, 6].includes(num)) {
    return 'firstLeft';
  }
  
  // All other seats are first right (8-19)
  return 'firstRight';
}

// Calculate seat price based on zone (NO LONGER USES BASE PRICE)
function calculateSeatPrice(basePrice, seatNumber) {
  const zone = getSeatZone(seatNumber);
  const pricing = getSeatPricing();
  
  // Return the direct price for the zone
  return pricing[zone] || pricing.firstLeft; // fallback to firstLeft price
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

    // Convert _id to id and handle populated scheduleId
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
    // Handle populated scheduleId from backend
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
      scheduleId: booking.scheduleId // Keep populated object from backend
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

// Helper function for seats.js
async function calculateBookingAmountAsync(scheduleId, seatNumbers) {
  const schedule = await getScheduleById(scheduleId);
  if (!schedule) return 0;
  
  let total = 0;
  seatNumbers.forEach(seat => {
    total += calculateSeatPrice(schedule.price, seat);
  });
  
  return total;
}

// ========================================
// PRICING MANAGEMENT
// ========================================

// Get current seat pricing
function getSeatPricing() {
  // Try to get from localStorage first (for admin changes)
  const stored = localStorage.getItem('seatPricing');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing stored pricing:', e);
    }
  }
  
  // Return default pricing
  return { ...seatPricing };
}

// Update seat pricing (Admin only)
function updateSeatPricing(zone, price) {
  const currentPricing = getSeatPricing();
  
  if (currentPricing.hasOwnProperty(zone)) {
    currentPricing[zone] = parseInt(price);
    localStorage.setItem('seatPricing', JSON.stringify(currentPricing));
    console.log('Updated pricing for', zone, ':', price);
    return true;
  }
  
  console.error('Invalid pricing zone:', zone);
  return false;
}

// Reset pricing to defaults
function resetSeatPricing() {
  localStorage.removeItem('seatPricing');
  console.log('Pricing reset to defaults');
  return true;
}

// ========================================
// BACKWARD COMPATIBILITY
// ========================================

// Wrapper to make getSchedules synchronous-like for old code
let cachedSchedules = [];

async function loadAndCacheSchedules(filters = {}) {
  cachedSchedules = await getSchedules(filters);
  return cachedSchedules;
}

console.log('✅ Data.js loaded with independent zone pricing');
console.log('📊 Current pricing:', getSeatPricing());