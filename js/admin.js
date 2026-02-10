// ========================================
// ADMIN.JS - Admin Panel Logic (ROUTE-BASED PRICING)
// ========================================

// Simple admin authentication
const ADMIN_PASSWORD = 'admin123';
let isAuthenticated = sessionStorage.getItem('adminAuth') === 'true';

// Currently selected route for pricing
let selectedRoute = null;

// Initialize admin page
function initAdminPage() {
  if (!isAuthenticated) {
    showLoginModal();
  } else {
    initAdminDashboard();
  }
}

// Show login modal
function showLoginModal() {
  const loginModal = document.getElementById('admin-login-modal');
  if (loginModal) {
    loginModal.style.display = 'flex';
  }
}

// Handle admin login
function handleAdminLogin(e) {
  e.preventDefault();
  
  const password = document.getElementById('admin-password').value;
  
  if (password === ADMIN_PASSWORD) {
    isAuthenticated = true;
    sessionStorage.setItem('adminAuth', 'true');
    document.getElementById('admin-login-modal').style.display = 'none';
    initAdminDashboard();
    showToast('Login successful!', 'success');
  } else {
    showToast('Invalid password', 'error');
  }
}

// Admin logout
function adminLogout() {
  isAuthenticated = false;
  sessionStorage.removeItem('adminAuth');
  location.reload();
}

// Initialize admin dashboard
function initAdminDashboard() {
  loadSchedulesTable();
  loadBookingsTable();
  loadStats();
  initScheduleForm();
  initPricingForm();
  loadRouteSelector();
}

// Load statistics
async function loadStats() {
  const schedules = await getSchedules();
  const stats = await getBookingStats();
  
  const totalRevenue = stats.totalRevenue || 0;
  const totalBookings = stats.totalBookings || 0;
  const totalBuses = schedules.length;
  
  const statRevenue = document.getElementById('stat-revenue');
  const statBookings = document.getElementById('stat-bookings');
  const statBuses = document.getElementById('stat-buses');
  
  if (statRevenue) statRevenue.textContent = formatCurrency(totalRevenue);
  if (statBookings) statBookings.textContent = totalBookings;
  if (statBuses) statBuses.textContent = totalBuses;
}

// Load schedules table
async function loadSchedulesTable() {
  const tbody = document.getElementById('schedules-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
  
  const schedules = await getSchedules();
  
  if (schedules.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No schedules found</td></tr>';
    return;
  }
  
  tbody.innerHTML = schedules.map(schedule => `
    <tr>
      <td>
        <div><strong>${schedule.busName}</strong></div>
        <div class="text-muted">${schedule.type}</div>
      </td>
      <td>${schedule.origin} → ${schedule.destination}</td>
      <td>${formatDate(schedule.departureTime)}</td>
      <td>${formatTime(schedule.departureTime)}</td>
      <td>${formatCurrency(schedule.price)}</td>
      <td>
        <span class="badge badge-${(schedule.bookedSeats?.length || 0) > 30 ? 'warning' : 'success'}">
          ${TOTAL_SEATS - (schedule.bookedSeats?.length || 0)} / ${TOTAL_SEATS}
        </span>
      </td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline" onclick="editSchedule('${schedule.id}')" title="Edit">
            Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteScheduleConfirm('${schedule.id}')" title="Delete">
            Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Load bookings table
async function loadBookingsTable() {
  const tbody = document.getElementById('bookings-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';
  
  const bookings = await getAllBookings();
  
  if (bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No bookings found</td></tr>';
    return;
  }
  
  tbody.innerHTML = bookings.map(booking => {
    const schedule = booking.scheduleId;
    return `
      <tr>
        <td>
          <code class="token-code">${booking.bookingToken}</code>
        </td>
        <td>${booking.customerName}</td>
        <td>
          <div>${booking.email}</div>
          <div class="text-muted">${booking.phone}</div>
        </td>
        <td>
          ${schedule ? `<div><strong>${schedule.busName}</strong></div><div class="text-muted">${schedule.origin} → ${schedule.destination}</div>` : 'N/A'}
        </td>
        <td>
          ${booking.seatNumbers.map(seat => `<span class="seat-badge-sm">${seat}</span>`).join(' ')}
        </td>
        <td>${formatCurrency(booking.totalAmount)}</td>
        <td>
          <span class="badge badge-${booking.status === 'confirmed' ? 'success' : booking.status === 'cancelled' ? 'danger' : 'secondary'}">
            ${booking.status}
          </span>
        </td>
        <td>
          ${booking.status === 'confirmed' ? `
            <button class="btn btn-sm btn-danger" onclick="cancelBookingConfirm('${booking.bookingToken}')" title="Cancel Booking">
              Cancel
            </button>
          ` : '<span class="text-muted">-</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

// Initialize schedule form
function initScheduleForm() {
  const form = document.getElementById('schedule-form');
  if (form) {
    form.addEventListener('submit', handleScheduleSubmit);
    
    // Show/hide route pricing section based on origin and destination
    const originInput = document.getElementById('origin');
    const destinationInput = document.getElementById('destination');
    
    [originInput, destinationInput].forEach(input => {
      if (input) {
        input.addEventListener('input', updateScheduleFormPricing);
      }
    });
  }
}

// Update pricing preview in schedule form
function updateScheduleFormPricing() {
  const origin = document.getElementById('origin')?.value.trim();
  const destination = document.getElementById('destination')?.value.trim();
  const pricingPreview = document.getElementById('schedule-pricing-preview');
  
  if (!pricingPreview || !origin || !destination) {
    if (pricingPreview) pricingPreview.style.display = 'none';
    return;
  }
  
  const routePricing = getRoutePricing(origin, destination);
  const isCustomPricing = getAllRoutePricing()[getRouteKey(origin, destination)] !== undefined;
  
  pricingPreview.style.display = 'block';
  pricingPreview.innerHTML = `
    <div class="pricing-info-box">
      <div class="pricing-info-header">
        <strong>📊 Seat Pricing for this Route</strong>
        ${isCustomPricing ? '<span class="badge badge-success">Custom</span>' : '<span class="badge badge-secondary">Default</span>'}
      </div>
      <div class="pricing-grid">
        <div class="pricing-item">
          <span class="pricing-label">🔵 First Right:</span>
          <span class="pricing-value">${formatCurrency(routePricing.firstRight)}</span>
        </div>
        <div class="pricing-item">
          <span class="pricing-label">⚪ First Left:</span>
          <span class="pricing-value">${formatCurrency(routePricing.firstLeft)}</span>
        </div>
        <div class="pricing-item">
          <span class="pricing-label">🟢 Last Left:</span>
          <span class="pricing-value">${formatCurrency(routePricing.lastLeft)}</span>
        </div>
        <div class="pricing-item">
          <span class="pricing-label">🟠 Sleeper:</span>
          <span class="pricing-value">${formatCurrency(routePricing.sleeper)}</span>
        </div>
      </div>
      <div class="pricing-note">
        <small>${isCustomPricing ? 'This route has custom pricing.' : 'Using default pricing. Set custom pricing in the Pricing tab.'}</small>
      </div>
    </div>
  `;
}

// Handle schedule form submission
async function handleScheduleSubmit(e) {
  e.preventDefault();
  
  const busDate = document.getElementById('bus-date').value;
  const busTime = document.getElementById('bus-time').value;
  
  const departureDate = new Date(`${busDate}T${busTime}`);
  const arrivalDate = new Date(departureDate.getTime() + 30 * 60000);
  
  const formData = {
    busName: document.getElementById('bus-name').value.trim(),
    type: document.getElementById('bus-type').value,
    origin: document.getElementById('origin').value.trim(),
    destination: document.getElementById('destination').value.trim(),
    departureTime: departureDate.toISOString(),
    arrivalTime: arrivalDate.toISOString(),
    price: parseInt(document.getElementById('price').value)
  };
  
  const scheduleId = document.getElementById('schedule-id').value;
  
  showLoading();
  
  let result;
  if (scheduleId) {
    result = await updateSchedule(scheduleId, formData);
    if (result) {
      showToast('Schedule updated successfully!', 'success');
    }
  } else {
    result = await addSchedule(formData);
    if (result) {
      showToast('Schedule added successfully!', 'success');
    }
  }
  
  hideLoading();
  
  if (result) {
    e.target.reset();
    document.getElementById('schedule-id').value = '';
    document.getElementById('bus-name').value = 'Mahalaxmi Travels';
    document.getElementById('bus-type').value = 'AC Sleeper (2+1)';
    document.getElementById('form-title').textContent = 'Add New Schedule';
    document.getElementById('schedule-pricing-preview').style.display = 'none';
    await loadSchedulesTable();
    await loadStats();
    await loadRouteSelector(); // Refresh route selector
  }
}

// Edit schedule
async function editSchedule(id) {
  showLoading();
  const schedule = await getScheduleById(id);
  hideLoading();
  
  if (!schedule) {
    showToast('Schedule not found', 'error');
    return;
  }
  
  document.getElementById('schedule-id').value = schedule.id;
  document.getElementById('bus-name').value = schedule.busName;
  document.getElementById('bus-type').value = schedule.type;
  document.getElementById('origin').value = schedule.origin;
  document.getElementById('destination').value = schedule.destination;
  
  const departureDate = new Date(schedule.departureTime);
  const dateStr = departureDate.toISOString().split('T')[0];
  const timeStr = departureDate.toTimeString().substring(0, 5);
  
  document.getElementById('bus-date').value = dateStr;
  document.getElementById('bus-time').value = timeStr;
  document.getElementById('price').value = schedule.price;
  
  document.getElementById('form-title').textContent = 'Edit Schedule';
  
  // Update pricing preview
  updateScheduleFormPricing();
  
  // Scroll to form
  document.getElementById('schedule-form').scrollIntoView({ behavior: 'smooth' });
}

// Delete schedule confirmation
async function deleteScheduleConfirm(id) {
  if (confirm('Are you sure you want to delete this schedule?')) {
    showLoading();
    const success = await deleteSchedule(id);
    hideLoading();
    
    if (success) {
      await loadSchedulesTable();
      await loadStats();
      await loadRouteSelector();
      showToast('Schedule deleted successfully!', 'success');
    }
  }
}

// Reset schedule form
function resetScheduleForm() {
  document.getElementById('schedule-form').reset();
  document.getElementById('schedule-id').value = '';
  document.getElementById('bus-name').value = 'Mahalaxmi Travels';
  document.getElementById('bus-type').value = 'AC Sleeper (2+1)';
  document.getElementById('form-title').textContent = 'Add New Schedule';
  document.getElementById('schedule-pricing-preview').style.display = 'none';
}

// ========================================
// ROUTE-BASED PRICING MANAGEMENT
// ========================================

// Load route selector in pricing tab
async function loadRouteSelector() {
  const routeSelect = document.getElementById('route-selector');
  if (!routeSelect) return;
  
  const routes = await getAllRoutes();
  const allRoutePricing = getAllRoutePricing();
  
  routeSelect.innerHTML = '<option value="">Select a route...</option>';
  
  routes.forEach(route => {
    const hasCustomPricing = allRoutePricing[route.key] !== undefined;
    const option = document.createElement('option');
    option.value = route.key;
    option.textContent = `${route.display}${hasCustomPricing ? ' ⭐' : ''}`;
    option.dataset.origin = route.origin;
    option.dataset.destination = route.destination;
    routeSelect.appendChild(option);
  });
  
  routeSelect.addEventListener('change', handleRouteSelection);
}

// Handle route selection
function handleRouteSelection(e) {
  const selectedOption = e.target.options[e.target.selectedIndex];
  
  if (!selectedOption.value) {
    selectedRoute = null;
    resetPricingForm();
    return;
  }
  
  selectedRoute = {
    key: selectedOption.value,
    origin: selectedOption.dataset.origin,
    destination: selectedOption.dataset.destination,
    display: selectedOption.textContent.replace(' ⭐', '')
  };
  
  loadPricingForRoute(selectedRoute);
}

// Load pricing for selected route
function loadPricingForRoute(route) {
  const pricing = getRoutePricing(route.origin, route.destination);
  const allRoutePricing = getAllRoutePricing();
  const hasCustomPricing = allRoutePricing[route.key] !== undefined;
  
  document.getElementById('first-right-price').value = pricing.firstRight;
  document.getElementById('first-left-price').value = pricing.firstLeft;
  document.getElementById('last-left-price').value = pricing.lastLeft;
  document.getElementById('sleeper-price').value = pricing.sleeper;
  
  // Update UI to show if using custom or default pricing
  const pricingStatus = document.getElementById('pricing-status');
  if (pricingStatus) {
    if (hasCustomPricing) {
      pricingStatus.innerHTML = `
        <div class="alert alert-info">
          <strong>Custom pricing is set for this route.</strong>
          <button class="btn btn-sm btn-outline" onclick="resetRoutePricing()" style="margin-left: 1rem;">
            Reset to Default
          </button>
        </div>
      `;
    } else {
      pricingStatus.innerHTML = `
        <div class="alert alert-secondary">
          <strong>Using default pricing.</strong> Save to set custom pricing for this route.
        </div>
      `;
    }
  }
  
  updatePricingPreview();
}

// Initialize pricing form
function initPricingForm() {
  const form = document.getElementById('pricing-form');
  if (!form) {
    console.log('Pricing form not found - skipping initialization');
    return;
  }
  
  try {
    form.addEventListener('submit', handlePricingSubmit);
    
    const inputs = ['first-right-price', 'first-left-price', 'last-left-price', 'sleeper-price'];
    inputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', updatePricingPreview);
      }
    });
    
    resetPricingForm();
  } catch (error) {
    console.error('Error initializing pricing form:', error);
  }
}

// Reset pricing form to default values
function resetPricingForm() {
  const pricing = getSeatPricing();
  
  document.getElementById('first-right-price').value = pricing.firstRight;
  document.getElementById('first-left-price').value = pricing.firstLeft;
  document.getElementById('last-left-price').value = pricing.lastLeft;
  document.getElementById('sleeper-price').value = pricing.sleeper;
  
  const pricingStatus = document.getElementById('pricing-status');
  if (pricingStatus) {
    pricingStatus.innerHTML = `
      <div class="alert alert-secondary">
        <strong>Select a route</strong> to set custom pricing, or modify default pricing below.
      </div>
    `;
  }
  
  updatePricingPreview();
}

// Update pricing preview
function updatePricingPreview() {
  const preview = document.getElementById('pricing-preview');
  if (!preview) return;
  
  const firstRight = parseInt(document.getElementById('first-right-price')?.value || 120);
  const firstLeft = parseInt(document.getElementById('first-left-price')?.value || 100);
  const lastLeft = parseInt(document.getElementById('last-left-price')?.value || 90);
  const sleeper = parseInt(document.getElementById('sleeper-price')?.value || 150);
  
  preview.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; padding: 1rem; background: #f9fafb; border-radius: 8px;">
      <div>
        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">🔵 First Right</div>
        <div style="font-size: 1.25rem; font-weight: 600; color: #3b82f6;">${formatCurrency(firstRight)}</div>
      </div>
      <div>
        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">⚪ First Left</div>
        <div style="font-size: 1.25rem; font-weight: 600; color: #6b7280;">${formatCurrency(firstLeft)}</div>
      </div>
      <div>
        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">🟢 Last Left</div>
        <div style="font-size: 1.25rem; font-weight: 600; color: #10b981;">${formatCurrency(lastLeft)}</div>
      </div>
      <div>
        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">🟠 Sleeper</div>
        <div style="font-size: 1.25rem; font-weight: 600; color: #f59e0b;">${formatCurrency(sleeper)}</div>
      </div>
    </div>
  `;
}

// Handle pricing form submission
function handlePricingSubmit(e) {
  e.preventDefault();
  
  const firstRight = parseInt(document.getElementById('first-right-price').value);
  const firstLeft = parseInt(document.getElementById('first-left-price').value);
  const lastLeft = parseInt(document.getElementById('last-left-price').value);
  const sleeper = parseInt(document.getElementById('sleeper-price').value);
  
  if (firstRight < 0 || firstLeft < 0 || lastLeft < 0 || sleeper < 0) {
    showToast('Prices must be positive numbers', 'error');
    return;
  }
  
  const pricing = { firstRight, firstLeft, lastLeft, sleeper };
  
  if (selectedRoute) {
    // Save route-specific pricing
    const success = setRoutePricing(selectedRoute.origin, selectedRoute.destination, pricing);
    if (success) {
      showToast(`Custom pricing saved for ${selectedRoute.display}!`, 'success');
      loadRouteSelector(); // Refresh to show star
      loadPricingForRoute(selectedRoute); // Refresh status
    } else {
      showToast('Failed to save pricing', 'error');
    }
  } else {
    // Save as default pricing
    updateSeatPricing('firstRight', firstRight);
    updateSeatPricing('firstLeft', firstLeft);
    updateSeatPricing('lastLeft', lastLeft);
    updateSeatPricing('sleeper', sleeper);
    showToast('Default pricing updated successfully!', 'success');
  }
  
  updatePricingPreview();
}

// Reset route pricing to default
function resetRoutePricing() {
  if (!selectedRoute) return;
  
  if (confirm(`Reset pricing for ${selectedRoute.display} to default values?`)) {
    deleteRoutePricing(selectedRoute.origin, selectedRoute.destination);
    showToast('Route pricing reset to default', 'success');
    loadRouteSelector();
    loadPricingForRoute(selectedRoute);
  }
}

// Reset all pricing to defaults
function resetAllPricing() {
  if (confirm('⚠️ Reset ALL pricing (default and route-specific) to system defaults?')) {
    resetSeatPricing();
    localStorage.removeItem('routePricing');
    showToast('All pricing reset to defaults', 'success');
    selectedRoute = null;
    document.getElementById('route-selector').value = '';
    resetPricingForm();
    loadRouteSelector();
  }
}

// Switch admin tabs
function switchAdminTab(tabName) {
  document.querySelectorAll('.admin-tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  const selectedTab = document.getElementById(`tab-${tabName}`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Reload route selector when switching to pricing tab
  if (tabName === 'pricing') {
    loadRouteSelector();
  }
}

// Export data
function exportData() {
  const data = {
    schedules: getSchedules(),
    bookings: getAllBookings(),
    defaultPricing: getSeatPricing(),
    routePricing: getAllRoutePricing(),
    exportDate: new Date().toISOString()
  };
  
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `shree-ram-travels-data-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  showToast('Data exported successfully!', 'success');
}

// Filter functions
function filterBookings() {
  const searchTerm = document.getElementById('booking-search').value.toLowerCase();
  const rows = document.querySelectorAll('#bookings-table-body tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? '' : 'none';
  });
}

function filterSchedules() {
  const searchTerm = document.getElementById('schedule-search').value.toLowerCase();
  const rows = document.querySelectorAll('#schedules-table-body tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? '' : 'none';
  });
}

// Cancel booking
async function cancelBookingConfirm(bookingToken) {
  if (confirm(`Are you sure you want to cancel booking ${bookingToken}?`)) {
    showLoading();
    const success = await cancelBooking(bookingToken);
    hideLoading();
    
    if (success) {
      await loadBookingsTable();
      await loadStats();
      showToast('Booking cancelled successfully!', 'success');
    } else {
      showToast('Failed to cancel booking. Please try again.', 'error');
    }
  }
}

// Reset stats
async function resetStatsTemporary() {
  if (confirm('⚠️ DEVELOPMENT ONLY: Reset all stats?')) {
    showLoading();
    
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/reset-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await loadStats();
        showToast('Stats reset successfully!', 'success');
      } else if (response.status === 404) {
        document.getElementById('stat-revenue').textContent = '₹0';
        document.getElementById('stat-bookings').textContent = '0';
        showToast('Stats display set to zero (backend endpoint not implemented)', 'info');
      }
    } catch (error) {
      document.getElementById('stat-revenue').textContent = '₹0';
      document.getElementById('stat-bookings').textContent = '0';
      showToast('Stats display set to zero', 'info');
    }
    
    hideLoading();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAdminPage);