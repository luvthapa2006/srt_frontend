// ========================================
// TIMINGS.JS - Bus Timings List Page Logic (WORKING VERSION)
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
  
  // Setup filter controls if they exist
  setupFilterControls();
  
  // Load and display schedules
  await loadSchedules();
}

// Setup filter controls
function setupFilterControls() {
  // Sort dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortSchedules(e.target.value);
    });
  }
}

// Display filter information
function displayFilterInfo() {
  const filterInfo = document.getElementById('filter-info');
  if (!filterInfo) return;
  
  if (currentFilters.origin && currentFilters.destination) {
    let infoText = `Showing results for ${currentFilters.origin} to ${currentFilters.destination}`;
    if (currentFilters.date) {
      infoText += ` on ${formatDate(currentFilters.date)}`;
    }
    filterInfo.innerHTML = `<h1 class="page-title" style="margin: 0; color: white;">${infoText}</h1>`;
  } else {
    filterInfo.innerHTML = `<h1 class="page-title" style="margin: 0; color: white;">All Available Buses</h1>`;
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
    console.log('📊 Schedules data:', allSchedules);
    
    // Display schedules
    displaySchedules(allSchedules);
    
  } catch (error) {
    console.error('❌ Error loading schedules:', error);
    
    schedulesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Error Loading Buses</h3>
        <p>${error.message || 'Failed to load bus schedules. Please check your connection.'}</p>
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
    html += createScheduleGroup('🌅', 'Morning Buses (6 AM - 12 PM)', groupedSchedules.morning);
  }
  
  // Afternoon buses (12 PM - 6 PM)
  if (groupedSchedules.afternoon.length > 0) {
    html += createScheduleGroup('☀️', 'Afternoon Buses (12 PM - 6 PM)', groupedSchedules.afternoon);
  }
  
  // Evening buses (6 PM - 12 AM)
  if (groupedSchedules.evening.length > 0) {
    html += createScheduleGroup('🌆', 'Evening Buses (6 PM - 12 AM)', groupedSchedules.evening);
  }
  
  // Night buses (12 AM - 6 AM)
  if (groupedSchedules.night.length > 0) {
    html += createScheduleGroup('🌙', 'Night Buses (12 AM - 6 AM)', groupedSchedules.night);
  }
  
  schedulesList.innerHTML = html;
  
  console.log('✅ Schedules displayed successfully');
}

// Create schedule group
function createScheduleGroup(icon, title, schedules) {
  return `
    <div class="schedule-group" style="margin-bottom: 2rem;">
      <h3 class="schedule-group-title" style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e5e7eb;">
        <span class="time-icon" style="font-size: 1.5rem;">${icon}</span>
        ${title}
      </h3>
      <div class="schedule-group-content" style="display: grid; gap: 1.5rem;">
        ${schedules.map(schedule => createScheduleCard(schedule)).join('')}
      </div>
    </div>
  `;
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
  
  console.log('📊 Grouped schedules:', {
    morning: grouped.morning.length,
    afternoon: grouped.afternoon.length,
    evening: grouped.evening.length,
    night: grouped.night.length
  });
  
  return grouped;
}

// Create empty state
function createEmptyState() {
  return `
    <div class="empty-state" style="text-align: center; padding: 4rem 2rem; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <div class="empty-icon" style="font-size: 4rem; margin-bottom: 1rem;">🚌</div>
      <h3 style="font-size: 1.5rem; font-weight: 600; color: #1f2937; margin-bottom: 0.5rem;">No Buses Found</h3>
      <p style="color: #6b7280; margin-bottom: 1.5rem;">We couldn't find any buses matching your search criteria.</p>
      <div class="empty-state-actions" style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
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

// Create schedule card HTML with inline styles for guaranteed display
function createScheduleCard(schedule) {
  const availableSeats = TOTAL_SEATS - (schedule.bookedSeats?.length || 0);
  const duration = calculateDuration(schedule.departureTime, schedule.arrivalTime);
  const departureDate = new Date(schedule.departureTime);
  const isToday = isDateToday(departureDate);
  
  return `
    <div class="schedule-card" style="display: flex; gap: 2rem; padding: 1.5rem; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s ease;" data-schedule-id="${schedule.id}">
      <div class="schedule-info" style="flex: 1;">
        <div class="schedule-header" style="margin-bottom: 0.5rem;">
          <div class="bus-info-header" style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <h3 class="bus-name" style="font-size: 1.25rem; font-weight: 600; color: #1f2937; margin: 0 0 0.25rem 0;">${schedule.busName}</h3>
              <p class="bus-type" style="color: #6b7280; font-size: 0.875rem; margin: 0;">${schedule.type}</p>
            </div>
            <div class="bus-meta" style="display: flex; gap: 0.5rem; align-items: center;">
              ${isToday ? '<span class="badge-today" style="background: #10b981; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Today</span>' : ''}
            </div>
          </div>
        </div>
        
        <div class="route-timeline" style="display: flex; align-items: center; gap: 1rem; margin: 1rem 0;">
          <div class="route-point" style="display: flex; flex-direction: column; gap: 0.25rem;">
            <span class="route-time" style="font-size: 1.125rem; font-weight: 600; color: #1f2937;">${formatTime(schedule.departureTime)}</span>
            <span class="route-city" style="font-size: 0.875rem; color: #6b7280;">${schedule.origin}</span>
            <span class="route-date" style="font-size: 0.75rem; color: #9ca3af;">${formatDate(schedule.departureTime)}</span>
          </div>
          
          <div class="route-connector" style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
            <div class="route-line" style="width: 100%; height: 2px; background: linear-gradient(to right, #667eea, #764ba2);"></div>
            <div class="route-duration" style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: #6b7280; background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 4px;">
              <svg class="icon-clock" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              ${duration}
            </div>
          </div>
          
          <div class="route-point" style="display: flex; flex-direction: column; gap: 0.25rem;">
            <span class="route-time" style="font-size: 1.125rem; font-weight: 600; color: #1f2937;">${formatTime(schedule.arrivalTime)}</span>
            <span class="route-city" style="font-size: 0.875rem; color: #6b7280;">${schedule.destination}</span>
            ${new Date(schedule.arrivalTime).toDateString() !== new Date(schedule.departureTime).toDateString()
              ? `<span class="route-date" style="font-size:0.75rem;color:#f59e0b;font-weight:600;">+1 Day · ${formatDate(schedule.arrivalTime)}</span>`
              : `<span class="route-date" style="font-size:0.75rem;color:#9ca3af;">${formatDate(schedule.arrivalTime)}</span>`
            }
          </div>
        </div>
        
        <div class="bus-amenities" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
          <span class="amenity-badge" style="display: flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; background: #f3f4f6; border-radius: 4px; font-size: 0.75rem; color: #6b7280;">📶 WiFi</span>
          <span class="amenity-badge" style="display: flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; background: #f3f4f6; border-radius: 4px; font-size: 0.75rem; color: #6b7280;">🔌 Charging</span>
          <span class="amenity-badge" style="display: flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; background: #f3f4f6; border-radius: 4px; font-size: 0.75rem; color: #6b7280;">💧 Water</span>
          ${schedule.type.includes('AC') ? '<span class="amenity-badge" style="display: flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; background: #f3f4f6; border-radius: 4px; font-size: 0.75rem; color: #6b7280;">❄️ AC</span>' : ''}
        </div>
        ${(schedule.pickupPoint || schedule.dropPoint) ? `
        <div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid #f1f5f9;">
          ${schedule.pickupPoint ? `<div style="font-size:0.75rem;color:#475569;display:flex;align-items:flex-start;gap:0.3rem;"><span style="color:#10b981;margin-top:1px;">📍</span><div><span style="font-weight:600;color:#374151;">Pick Up:</span> ${schedule.pickupPoint}</div></div>` : ''}
          ${schedule.dropPoint   ? `<div style="font-size:0.75rem;color:#475569;display:flex;align-items:flex-start;gap:0.3rem;"><span style="color:#ef4444;margin-top:1px;">📍</span><div><span style="font-weight:600;color:#374151;">Drop:</span> ${schedule.dropPoint}</div></div>` : ''}
        </div>` : ''}
      </div>
      
      <div class="schedule-cta" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 200px; gap: 0.75rem;">
        <div class="price-section" style="text-align: center;">
          <span class="price-label" style="font-size: 0.75rem; color: #6b7280; display: block;">Starting from</span>
          <div class="price" style="font-size: 1.75rem; font-weight: 700; color: #667eea; margin: 0.25rem 0;">${formatCurrency(schedule.price)}</div>
          <span class="price-note" style="font-size: 0.75rem; color: #9ca3af; display: block;">per seat</span>
        </div>
        
        <button 
          class="btn btn-primary btn-lg" 
          onclick="selectBus('${schedule.id}')"
          style="padding: 1rem 2rem; border-radius: 6px; font-weight: 500; cursor: pointer; border: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 100%; ${availableSeats === 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
          ${availableSeats === 0 ? 'disabled' : ''}
        >
          ${availableSeats > 0 ? 'Select Seats' : 'Fully Booked'}
        </button>
        
        <div class="seats-left" style="font-size: 0.875rem; color: ${availableSeats < 10 ? '#f59e0b' : '#10b981'}; font-weight: 500; display: flex; align-items: center; gap: 0.25rem;">
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
  console.log('Filter Info Element:', document.getElementById('filter-info'));
};

console.log('✅ Timings.js loaded - Use window.debugTimings() for debugging');