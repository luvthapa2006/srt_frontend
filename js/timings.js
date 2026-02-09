// ========================================
// TIMINGS.JS - Bus Timings List Page Logic
// ========================================

let currentFilters = {};

// Initialize page
function initTimingsPage() {
  // Get filter params from URL
  const params = getQueryParams();
  currentFilters = {
    origin: params.origin || '',
    destination: params.destination || '',
    date: params.date || ''
  };
  
  // Display filters info
  displayFilterInfo();
  
  // Load and display schedules
  loadSchedules();
}

// Display filter information
function displayFilterInfo() {
  const filterInfo = document.getElementById('filter-info');
  if (!filterInfo) return;
  
  if (currentFilters.origin && currentFilters.destination) {
    filterInfo.textContent = `Showing results for ${currentFilters.origin} to ${currentFilters.destination}`;
    if (currentFilters.date) {
      filterInfo.textContent += ` on ${formatDate(currentFilters.date)}`;
    }
  } else {
    filterInfo.textContent = 'Showing all scheduled buses';
  }
}

// Load schedules from data
async function loadSchedules() {
  const schedulesList = document.getElementById('schedules-list');
  if (!schedulesList) return;
  
  // Show loading
  schedulesList.innerHTML = createLoadingSkeleton();
  
  // Fetch schedules from API
  const schedules = await getSchedules(currentFilters);
  displaySchedules(schedules);
}

// Create loading skeleton
function createLoadingSkeleton() {
  return `
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
  `;
}

// Display schedules
function displaySchedules(schedules) {
  const schedulesList = document.getElementById('schedules-list');
  if (!schedulesList) return;
  
  if (schedules.length === 0) {
    schedulesList.innerHTML = createEmptyState();
    return;
  }
  
  schedulesList.innerHTML = schedules.map(schedule => createScheduleCard(schedule)).join('');
}

// Create empty state
function createEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-icon">🚌</div>
      <h3>No buses found</h3>
      <p>Try changing your search criteria or date.</p>
      <button onclick="navigateTo('index.html')" class="btn btn-primary">
        Back to Search
      </button>
    </div>
  `;
}

// Create schedule card HTML
function createScheduleCard(schedule) {
  const availableSeats = TOTAL_SEATS - (schedule.bookedSeats?.length || 0);
  const duration = calculateDuration(schedule.departureTime, schedule.arrivalTime);
  
  return `
    <div class="schedule-card animate-on-scroll">
      <div class="schedule-info">
        <div class="schedule-header">
          <div>
            <h3 class="bus-name">${schedule.busName}</h3>
            <span class="bus-rating">4.8 ★</span>
          </div>
        </div>
        <p class="bus-type">${schedule.type}</p>
        
        <div class="route-timeline">
          <div class="route-point">
            <span class="route-time">${formatTime(schedule.departureTime)}</span>
            <span class="route-city">${schedule.origin}</span>
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
          </div>
        </div>
        
        <div class="bus-amenities">
          <svg class="amenity-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
            <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
          </svg>
          <svg class="amenity-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          <svg class="amenity-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
            <line x1="6" y1="1" x2="6" y2="4"></line>
            <line x1="10" y1="1" x2="10" y2="4"></line>
            <line x1="14" y1="1" x2="14" y2="4"></line>
          </svg>
        </div>
      </div>
      
      <div class="schedule-cta">
        <div class="price-section">
          <span class="price-label">Starting from</span>
          <div class="price">${formatCurrency(schedule.price)}</div>
        </div>
        <button 
          class="btn btn-primary btn-lg" 
          onclick="selectBus(${schedule.id})"
        >
          Select Seats
        </button>
        <div class="seats-left">${availableSeats} Seats Left</div>
      </div>
    </div>
  `;
}

// Select bus and navigate to seats page
function selectBus(scheduleId) {
  navigateTo('seats.html', { id: scheduleId });
}

// Apply filters
function applyFilters(origin, destination, date) {
  currentFilters = { origin, destination, date };
  loadSchedules();
}

// Clear filters
function clearFilters() {
  currentFilters = {};
  navigateTo('timings.html');
}

// Sort schedules
function sortSchedules(sortBy) {
  const schedulesList = document.getElementById('schedules-list');
  if (!schedulesList) return;
  
  let schedules = getSchedules(currentFilters);
  
  switch(sortBy) {
    case 'price-low':
      schedules.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      schedules.sort((a, b) => b.price - a.price);
      break;
    case 'departure':
      schedules.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
      break;
    case 'duration':
      schedules.sort((a, b) => {
        const durationA = new Date(a.arrivalTime) - new Date(a.departureTime);
        const durationB = new Date(b.arrivalTime) - new Date(b.departureTime);
        return durationA - durationB;
      });
      break;
  }
  
  displaySchedules(schedules);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initTimingsPage);
