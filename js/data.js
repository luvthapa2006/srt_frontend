// ========================================
// DATA.JS - API Integration Layer
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

// Seat Pricing Multipliers (can be moved to backend later)
const seatPricing = {
  window: 1.2,
  aisle: 1.0,
  front: 1.1,
  back: 0.9,
  standard: 1.0
};

// Define which seats are window/aisle/front/back
const seatCategories = {
  window: ['U1', 'U2', 'U5', 'U6', 'U9', 'U10', 'U13', 'U14', 'U17', 'U18',
           'L1', 'L2', 'L5', 'L6', 'L9', 'L10', 'L13', 'L14', 'L17', 'L18'],
  front: ['U1', 'U2', 'U3', 'U4', 'L1', 'L2', 'L3', 'L4'],
  back: ['U17', 'U18', 'U19', 'U20', 'L17', 'L18', 'L19', 'L20']
};

// Calculate seat price based on base price and seat category
function calculateSeatPrice(basePrice, seatNumber) {
  let multiplier = seatPricing.standard;
  
  if (seatCategories.window.includes(seatNumber)) {
    multiplier = seatPricing.window;
  }
  if (seatCategories.front.includes(seatNumber)) {
    multiplier = Math.max(multiplier, seatPricing.front);
  }
  if (seatCategories.back.includes(seatNumber)) {
    multiplier = Math.min(multiplier, seatPricing.back);
  }
  
  return Math.round(basePrice * multiplier);
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

    const response = await fetch(`${API_BASE_URL}/schedules?${queryParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch schedules');
    }

    const schedules = await response.json();
    
    // Convert MongoDB _id to id for compatibility with existing frontend code
    return schedules.map(schedule => ({
      ...schedule,
      id: schedule._id,
      bookedSeats: schedule.bookedSeats || []
    }));
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
    const response = await fetch(`${API_BASE_URL}/schedules/${id}`);
    
    if (!response.ok) {
      throw new Error('Schedule not found');
    }

    const schedule = await response.json();
    // Convert MongoDB _id to id for compatibility
    return {
      ...schedule,
      id: schedule._id,
      bookedSeats: schedule.bookedSeats || []
    };
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return null;
  }
}

// Add new schedule (Admin)
async function addSchedule(scheduleData) {
  try {
    const response = await fetch(`${API_BASE_URL}/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(scheduleData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create schedule');
    }

    const schedule = await response.json();
    return {
      ...schedule,
      id: schedule._id,
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
    return {
      ...schedule,
      id: schedule._id,
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
    const response = await fetch(`${API_BASE_URL}/schedules/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete schedule');
    }

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

    // Convert _id to id and handle populated scheduleId
    return {
      ...result,
      id: result._id,
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
      id: booking._id,
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
      id: booking._id,
      scheduleId: booking.scheduleId._id || booking.scheduleId
    }));
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return [];
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

// Calculate total booking amount
function calculateBookingAmount(scheduleId, seatNumbers) {
  // This is a synchronous function, but schedule might not be loaded
  // For now, we'll need to modify the calling code to pass the schedule object
  // or calculate on the backend
  return 0; // Placeholder - will be calculated properly in seats.js
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
// BACKWARD COMPATIBILITY
// For existing frontend code
// ========================================

function getSeatPricing() {
  return { ...seatPricing };
}

function updateSeatPricing(category, multiplier) {
  if (seatPricing.hasOwnProperty(category)) {
    seatPricing[category] = multiplier;
    return true;
  }
  return false;
}

// Wrapper to make getSchedules synchronous-like for old code
// (This is a temporary solution - ideally all code should use async/await)
let cachedSchedules = [];

async function loadAndCacheSchedules(filters = {}) {
  cachedSchedules = await getSchedules(filters);
  return cachedSchedules;
}
