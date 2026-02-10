// ========================================
// TIMINGS.JS - Bus Timings List Page Logic (FIXED VERSION)
// ========================================

let currentFilters = {};
let allSchedules = [];

// Initialize page
async function initTimingsPage() {
  console.log('🚀 Initializing Timings Page...');
  
  // Get filter params from URL
  const params = getQueryParams();
  currentFilters = {
    origin: params.origin || '',
    destination: params.destination || '',
    date: params.date || ''
  };
  
  console.log('📋 Current filters:', currentFilters);
  
  // Display filters info
  displayFilterInfo();
  
  // Setup filter form if exists
  setupFilterForm();
  
  // Load and display schedules
  await loadSchedules();
}

// Setup filter form
function setupFilterForm() {
  const filterForm = document.getElementById('filter-form');
  if (filterForm) {
    filterForm.addEventListener('submit', handleFilterSubmit);
  }
  
  // Populate current filter values
  if (currentFilters.origin) {
    const originInput = document.getElementById('filter-origin');
    if (originInput) originInput.value = currentFilters.origin;
  }
  
  if (currentFilters.destination) {
    const destInput = document.getElementById('filter-destination');
    if (destInput) destInput.value = currentFilters.destination;
  }
  
  if (currentFilters.date) {
    const dateInput = document.getElementById('filter-date');
    if (dateInput) dateInput.value = currentFilters.date;
  }
}

// Handle filter form submission
function handleFilterSubmit(e) {
  e.preventDefault();
  
  const origin = document.getElementById('filter-origin')?.value || '';
  const destination = document.getElementById('filter-destination')?.value || '';
  const date = document.getElementById('filter-date')?.value || '';
  
  navigateTo('timings.html', { origin, destination, date });
}

// Display filter information
function displayFilterInfo() {
  const filterInfo = document.getElementById('filter-info');
  if (!filterInfo) return;
  
  if (currentFilters.origin && currentFilters.destination) {
    filterInfo.innerHTML = `
      <div class="filter-info-content">
        <span>Showing results for <strong>${currentFilters.origin}</strong> to <strong>${currentFilters.destination}</strong></span>
        ${currentFilters.date ? `<span> on <strong>${formatDate(currentFilters.date)}</strong></span>` : ''}
      </div>
    `;
  } else {
    filterInfo.innerHTML = `
      <div class="filter-info-content">
        <span>Showing all available buses</span>
      </div>
    `;
  }
}

// Load schedules from API
async function loadSchedules() {
  const schedulesList = document.getElementById('schedules-list');
  
  if (!schedulesList) {
    console.error('❌ schedules-list element not found in DOM');
    return;
  }
  
  // Show loading state
  schedulesList.innerHTML = createLoadingSkeleton();
  
  try {
    console.log('🔄 Fetching schedules with filters:', currentFilters);
    
    // Fetch schedules from API
    allSchedules = await getSchedules(currentFilters);
    
    console.log('✅ Received schedules:', allSchedules.length);
    
    // Display schedules
    displaySchedules(allSchedules);
    
  } catch (error) {
    console.error('❌ Error loading schedules:', error);
    
    schedulesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Error Loading Buses</h3>
        <p>${error.message || 'Failed to load bus schedules. Please check your internet connection.'}</p>
        <button onclick="loadSchedules()" class="btn btn-primary">
          🔄 Try Again
        </button>
      </div>
    `;
  }
}

// Create loading skeleton
function createLoadingSkeleton() {
  return `
    <div class="loading-container">
      <div class="schedule-card skeleton-card">
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
        <div class="skeleton skeleton-button"></div>
      </div>
      <div class="schedule-card skeleton-card">
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
        <div class="skeleton skeleton-button"></div>
      </div>
      <div class="schedule-card skeleton-card">
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
        <div class="skeleton skeleton-button"></div>
      </div>
    </div>
  `;
}

// Display schedules
function displaySchedules(schedules) {
  const schedulesList = document.getElementById('schedules-list');
  if (!schedulesList) {
    console.error('❌ schedules-list element not found');
    return;
  }
  
  console.log('📊 Displaying schedules:', schedules.length);
  
  if (!schedules || schedules.length === 0) {
    schedulesList.innerHTML = createEmptyState();
    return;
  }
  
  // Group schedules by time of day
  const groupedSchedules = groupSchedulesByTimeOfDay(schedules);
  
  let html = '';
  
  // Morning buses (6 AM - 12 PM)
  if (groupedSchedules.morning.length > 0) {
    html += `
      <div class="schedule-group">
        <h3 class="schedule-group-title">
          <span class="time-icon">🌅</span>
          Morning Buses (6 AM - 12 PM)
        </h3>
        <div class="schedule-group-content">
          ${groupedSchedules.morning.map(schedule => createScheduleCard(schedule)).join('')}
        </div>
      </div>
    `;
  }
  
  // Afternoon buses (12 PM - 6 PM)
  if (groupedSchedules.afternoon.length > 0) {
    html += `
      <div class="schedule-group">
        <h3 class="schedule-group-title">
          <span class="time-icon">☀️</span>
          Afternoon Buses (12 PM - 6 PM)
        </h3>
        <div class="schedule-group-content">
          ${groupedSchedules.afternoon.map(schedule => createScheduleCard(schedule)).join('')}
        </div>
      </div>
    `;
  }
  
  // Evening buses (6 PM - 12 AM)
  if (groupedSchedules.evening.length > 0) {
    html += `
      <div class="schedule-group">
        <h3 class="schedule-group-title">
          <span class="time-icon">🌆</span>
          Evening Buses (6 PM - 12 AM)
        </h3>
        <div class="schedule-group-content">
          ${groupedSchedules.evening.map(schedule => createScheduleCard(schedule)).join('')}
        </div>
      </div>
    `;
  }
  
  // Night buses (12 AM - 6 AM)
  if (groupedSchedules.night.length > 0) {
    html += `
      <div class="schedule-group">
        <h3 class="schedule-group-title">
          <span class="time-icon">🌙</span>
          Night Buses (12 AM - 6 AM)
        </h3>
        <div class="schedule-group-content">
          ${groupedSchedules.night.map(schedule => createScheduleCard(schedule)).join('')}
        </div>
      </div>
    `;
  }
  
  schedulesList.innerHTML = html;
}

// Group schedules by time of day
function groupSchedulesByTimeOfDay(schedules) {
  const grouped = {
    morning: [],
    afternoon: [],
    evening: [],
    night: []
  };
  
  schedules.forEach(schedule => {
    const date = new Date(schedule.departureTime);
    const hour = date.getHours();
    
    if (hour >= 6 && hour < 12) {
      grouped.morning.push(schedule);
    } else if (hour >= 12 && hour < 18) {
      grouped.afternoon.push(schedule);
    } else if (hour >= 18 && hour < 24) {
      grouped.evening.push(schedule);
    } else {
      grouped.night.push(schedule);
    }
  });
  
  return grouped;
}

// Create empty state
function createEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-icon">🚌</div>
      <h3>No Buses Found</h3>
      <p>We couldn't find any buses matching your search criteria.</p>
      <div class="empty-state-actions">
        <button onclick="clearFilters()" class="btn btn-primary">
          Clear Filters
        </button>
        <button onclick="navigateTo('index.html')" class="btn btn-outline">
          Back to Search
        </button>
      </div>
    </div>
  `;
}

// Create schedule card HTML
function createScheduleCard(schedule) {
  const availableSeats = TOTAL_SEATS - (schedule.bookedSeats?.length || 0);
  const duration = calculateDuration(schedule.departureTime, schedule.arrivalTime);
  const departureDate = new Date(schedule.departureTime);
  const isToday = isDateToday(departureDate);
  
  return `
    <div class="schedule-card animate-on-scroll" data-schedule-id="${schedule.id}">
      <div class="schedule-info">
        <div class="schedule-header">
          <div class="bus-info-header">
            <h3 class="bus-name">${schedule.busName}</h3>
            <div class="bus-meta">
              <span class="bus-rating">⭐ 4.${Math.floor(Math.random() * 3) + 6}</span>
              ${isToday ? '<span class="badge-today">Today</span>' : ''}
            </div>
          </div>
        </div>
        
        <p class="bus-type">${schedule.type}</p>
        
        <div class="route-timeline">
          <div class="route-point">
            <span class="route-time">${formatTime(schedule.departureTime)}</span>
            <span class="route-city">${schedule.origin}</span>
            <span class="route-date">${formatDate(schedule.departureTime)}</span>
          </div>
          
          <div class="route-connector">
            <div class="route-line"></div>
            <div class="route-duration">
              <svg class="icon-clock" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              ${duration}
            </div>
          </div>
          
          <div class="route-point">
            <span class="route-time">${formatTime(schedule.arrivalTime)}</span>
            <span class="route-city">${schedule.destination}</span>
            <span class="route-date">${formatDate(schedule.arrivalTime)}</span>
          </div>
        </div>
        
        <div class="bus-amenities">
          <span class="amenity-badge" title="WiFi Available">
            <svg class="amenity-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
              <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
              <line x1="12" y1="20" x2="12.01" y2="20"></line>
            </svg>
            WiFi
          </span>
          <span class="amenity-badge" title="Charging Point">
            <svg class="amenity-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            Charging
          </span>
          <span class="amenity-badge" title="Water Bottle">
            <svg class="amenity-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
              <line x1="6" y1="1" x2="6" y2="4"></line>
              <line x1="10" y1="1" x2="10" y2="4"></line>
              <line x1="14" y1="1" x2="14" y2="4"></line>
            </svg>
            Water
          </span>
          ${schedule.type.includes('AC') ? '<span class="amenity-badge" title="Air Conditioned">❄️ AC</span>' : ''}
        </div>
      </div>
      
      <div class="schedule-cta">
        <div class="price-section">
          <span class="price-label">Starting from</span>
          <div class="price">${formatCurrency(schedule.price)}</div>
          <span class="price-note">per seat</span>
        </div>
        
        <button 
          class="btn btn-primary btn-lg ${availableSeats === 0 ? 'btn-disabled' : ''}" 
          onclick="selectBus('${schedule.id}')"
          ${availableSeats === 0 ? 'disabled' : ''}
        >
          ${availableSeats > 0 ? 'Select Seats' : 'Fully Booked'}
        </button>
        
        <div class="seats-left ${availableSeats < 10 ? 'seats-low' : ''}">
          ${availableSeats > 0 ? 
            `<span class="seats-icon">💺</span> ${availableSeats} Seats Available` : 
            '<span class="seats-icon">❌</span> No Seats Available'
          }
        </div>
      </div>
    </div>
  `;
}

// Helper function to check if date is today
function isDateToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
}

// Select bus and navigate to seats page
function selectBus(scheduleId) {
  console.log('🎫 Selecting bus:', scheduleId);
  
  if (!scheduleId) {
    showToast('Invalid bus selection', 'error');
    return;
  }
  
  // Store selected schedule in session storage for quick access
  const schedule = allSchedules.find(s => s.id === scheduleId);
  if (schedule) {
    sessionStorage.setItem('selectedSchedule', JSON.stringify(schedule));
  }
  
  navigateTo('seats.html', { id: scheduleId });
}

// Clear filters
function clearFilters() {
  currentFilters = {};
  navigateTo('timings.html');
}

// Sort schedules
function sortSchedules(sortBy) {
  console.log('🔄 Sorting by:', sortBy);
  
  if (!allSchedules || allSchedules.length === 0) {
    return;
  }
  
  let sortedSchedules = [...allSchedules];
  
  switch(sortBy) {
    case 'price-low':
      sortedSchedules.sort((a, b) => a.price - b.price);
      showToast('Sorted by: Price (Low to High)', 'info');
      break;
      
    case 'price-high':
      sortedSchedules.sort((a, b) => b.price - a.price);
      showToast('Sorted by: Price (High to Low)', 'info');
      break;
      
    case 'departure':
      sortedSchedules.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
      showToast('Sorted by: Departure Time', 'info');
      break;
      
    case 'duration':
      sortedSchedules.sort((a, b) => {
        const durationA = new Date(a.arrivalTime) - new Date(a.departureTime);
        const durationB = new Date(b.arrivalTime) - new Date(b.departureTime);
        return durationA - durationB;
      });
      showToast('Sorted by: Journey Duration', 'info');
      break;
      
    case 'seats':
      sortedSchedules.sort((a, b) => {
        const seatsA = TOTAL_SEATS - (a.bookedSeats?.length || 0);
        const seatsB = TOTAL_SEATS - (b.bookedSeats?.length || 0);
        return seatsB - seatsA;
      });
      showToast('Sorted by: Available Seats', 'info');
      break;
      
    default:
      return;
  }
  
  allSchedules = sortedSchedules;
  displaySchedules(allSchedules);
}

// Filter schedules by bus type
function filterByBusType(type) {
  console.log('🔍 Filtering by bus type:', type);
  
  if (type === 'all') {
    loadSchedules();
    return;
  }
  
  const filtered = allSchedules.filter(schedule => 
    schedule.type.toLowerCase().includes(type.toLowerCase())
  );
  
  displaySchedules(filtered);
  showToast(`Showing ${filtered.length} ${type} buses`, 'info');
}

// Search schedules
function searchSchedules(searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    displaySchedules(allSchedules);
    return;
  }
  
  const term = searchTerm.toLowerCase();
  const filtered = allSchedules.filter(schedule => 
    schedule.busName.toLowerCase().includes(term) ||
    schedule.origin.toLowerCase().includes(term) ||
    schedule.destination.toLowerCase().includes(term) ||
    schedule.type.toLowerCase().includes(term)
  );
  
  displaySchedules(filtered);
  
  if (filtered.length === 0) {
    showToast('No buses found matching your search', 'warning');
  } else {
    showToast(`Found ${filtered.length} buses`, 'success');
  }
}

// Refresh schedules
async function refreshSchedules() {
  showToast('Refreshing bus schedules...', 'info');
  await loadSchedules();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTimingsPage);
} else {
  initTimingsPage();
}

// Debug function - call this from console if needed
window.debugTimings = function() {
  console.log('🔍 Debug Info:');
  console.log('Current Filters:', currentFilters);
  console.log('All Schedules:', allSchedules);
  console.log('Schedules List Element:', document.getElementById('schedules-list'));
};