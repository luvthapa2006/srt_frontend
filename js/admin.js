// ========================================
// ADMIN.JS - Admin Panel Logic (UPDATED PRICING)
// ========================================

// Simple admin authentication (for demo purposes)
const ADMIN_PASSWORD = 'admin123';
let isAuthenticated = sessionStorage.getItem('adminAuth') === 'true';

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
  
  tbody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';
  
  const schedules = await getSchedules();
  
  if (schedules.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No schedules found</td></tr>';
    return;
  }
  
  tbody.innerHTML = schedules.map(schedule => `
    <tr>
      <td>${schedule.id}</td>
      <td>
        <div><strong>${schedule.busName}</strong></div>
        <div class="text-muted">${schedule.type}</div>
      </td>
      <td>${schedule.origin} → ${schedule.destination}</td>
      <td>${formatTime(schedule.departureTime)}</td>
      <td>${formatTime(schedule.arrivalTime)}</td>
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
  
  tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
  
  const bookings = await getAllBookings();
  
  if (bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No bookings found</td></tr>';
    return;
  }
  
  tbody.innerHTML = bookings.map(booking => {
    const schedule = booking.scheduleId; // Already populated from API
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
          <span class="badge badge-${booking.status === 'confirmed' ? 'success' : 'secondary'}">
            ${booking.status}
          </span>
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
  }
}

// Handle schedule form submission
async function handleScheduleSubmit(e) {
  e.preventDefault();
  
  const formData = {
    busName: document.getElementById('bus-name').value.trim(),
    type: document.getElementById('bus-type').value,
    origin: document.getElementById('origin').value.trim(),
    destination: document.getElementById('destination').value.trim(),
    departureTime: document.getElementById('departure-time').value,
    arrivalTime: document.getElementById('arrival-time').value,
    price: parseInt(document.getElementById('price').value)
  };
  
  const scheduleId = document.getElementById('schedule-id').value;
  
  showLoading();
  
  let result;
  if (scheduleId) {
    // Update existing
    result = await updateSchedule(scheduleId, formData);
    if (result) {
      showToast('Schedule updated successfully!', 'success');
    }
  } else {
    // Create new
    result = await addSchedule(formData);
    if (result) {
      showToast('Schedule added successfully!', 'success');
    }
  }
  
  hideLoading();
  
  if (result) {
    // Reset form and reload table
    e.target.reset();
    document.getElementById('schedule-id').value = '';
    // Restore fixed values after reset
    document.getElementById('bus-name').value = 'Mahalaxmi Travels';
    document.getElementById('bus-type').value = 'DD Sleeper Coach';
    document.getElementById('form-title').textContent = 'Add New Schedule';
    await loadSchedulesTable();
    await loadStats();
  }
}

// Edit schedule
async function editSchedule(id) {
  showLoading();
  const schedule = await getScheduleById(id);
  hideLoading();
  
  if (!schedule) return;
  
  document.getElementById('schedule-id').value = schedule.id;
  // Always use fixed values for bus name and type
  document.getElementById('bus-name').value = 'Mahalaxmi Travels';
  document.getElementById('bus-type').value = 'DD Sleeper Coach';
  document.getElementById('origin').value = schedule.origin;
  document.getElementById('destination').value = schedule.destination;
  document.getElementById('departure-time').value = schedule.departureTime.substring(0, 16);
  document.getElementById('arrival-time').value = schedule.arrivalTime.substring(0, 16);
  document.getElementById('price').value = schedule.price;
  
  document.getElementById('form-title').textContent = 'Edit Schedule';
  
  // Scroll to form
  document.getElementById('schedule-form').scrollIntoView({ behavior: 'smooth' });
}

// Delete schedule with confirmation
async function deleteScheduleConfirm(id) {
  showLoading();
  const schedule = await getScheduleById(id);
  hideLoading();
  
  if (!schedule) return;
  
  if (confirm(`Are you sure you want to delete "${schedule.busName}" schedule?`)) {
    showLoading();
    const success = await deleteSchedule(id);
    hideLoading();
    
    if (success) {
      await loadSchedulesTable();
      await loadStats();
      showToast('Schedule deleted successfully!', 'success');
    }
  }
}

// Initialize pricing form with NEW independent pricing
function initPricingForm() {
  const form = document.getElementById('pricing-form');
  if (!form) {
    console.log('Pricing form not found - skipping initialization');
    return;
  }
  
  try {
    // Load current pricing
    const pricing = getSeatPricing();
    
    const firstRightInput = document.getElementById('first-right-price');
    const firstLeftInput = document.getElementById('first-left-price');
    const lastLeftInput = document.getElementById('last-left-price');
    const sleeperInput = document.getElementById('sleeper-price');
    
    // Check if all required elements exist before setting values
    if (firstRightInput && firstLeftInput && lastLeftInput && sleeperInput && pricing) {
      firstRightInput.value = pricing.firstRight || 120;
      firstLeftInput.value = pricing.firstLeft || 100;
      lastLeftInput.value = pricing.lastLeft || 90;
      sleeperInput.value = pricing.sleeper || 150;
      
      updatePricingPreview();
    } else {
      console.warn('Some pricing form inputs are missing');
    }
    
    form.addEventListener('submit', handlePricingSubmit);
    
    // Add live preview updates
    [firstRightInput, firstLeftInput, lastLeftInput, sleeperInput].forEach(input => {
      if (input) {
        input.addEventListener('input', updatePricingPreview);
      }
    });
  } catch (error) {
    console.error('Error initializing pricing form:', error);
  }
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
    <div style="display: flex; gap: 1rem; flex-wrap: wrap; padding: 1rem; background: #f9fafb; border-radius: 8px;">
      <div style="flex: 1; min-width: 150px;">
        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">🔵 First Right</div>
        <div style="font-size: 1.25rem; font-weight: 600; color: #3b82f6;">${formatCurrency(firstRight)}</div>
      </div>
      <div style="flex: 1; min-width: 150px;">
        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">⚪ First Left</div>
        <div style="font-size: 1.25rem; font-weight: 600; color: #6b7280;">${formatCurrency(firstLeft)}</div>
      </div>
      <div style="flex: 1; min-width: 150px;">
        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">🟢 Last Left</div>
        <div style="font-size: 1.25rem; font-weight: 600; color: #10b981;">${formatCurrency(lastLeft)}</div>
      </div>
      <div style="flex: 1; min-width: 150px;">
        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">🟠 Sleeper</div>
        <div style="font-size: 1.25rem; font-weight: 600; color: #f59e0b;">${formatCurrency(sleeper)}</div>
      </div>
    </div>
  `;
}

// Handle pricing form submission with NEW independent pricing
function handlePricingSubmit(e) {
  e.preventDefault();
  
  const firstRight = parseInt(document.getElementById('first-right-price').value);
  const firstLeft = parseInt(document.getElementById('first-left-price').value);
  const lastLeft = parseInt(document.getElementById('last-left-price').value);
  const sleeper = parseInt(document.getElementById('sleeper-price').value);
  
  // Validate prices
  if (firstRight < 0 || firstLeft < 0 || lastLeft < 0 || sleeper < 0) {
    showToast('Prices must be positive numbers', 'error');
    return;
  }
  
  // Update pricing
  updateSeatPricing('firstRight', firstRight);
  updateSeatPricing('firstLeft', firstLeft);
  updateSeatPricing('lastLeft', lastLeft);
  updateSeatPricing('sleeper', sleeper);
  
  showToast('Pricing updated successfully!', 'success');
  updatePricingPreview();
}

// Reset pricing to defaults
function resetPricing() {
  if (confirm('Are you sure you want to reset pricing to default values?')) {
    resetSeatPricing();
    initPricingForm();
    showToast('Pricing reset to defaults', 'success');
  }
}

// Switch admin tabs
function switchAdminTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.admin-tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Show selected tab
  const selectedTab = document.getElementById(`tab-${tabName}`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // Update tab buttons
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
}

// Export data as JSON
function exportData() {
  const data = {
    schedules: getSchedules(),
    bookings: getAllBookings(),
    pricing: getSeatPricing(),
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

// Search/Filter bookings
function filterBookings() {
  const searchTerm = document.getElementById('booking-search').value.toLowerCase();
  const rows = document.querySelectorAll('#bookings-table-body tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? '' : 'none';
  });
}

// Search/Filter schedules
function filterSchedules() {
  const searchTerm = document.getElementById('schedule-search').value.toLowerCase();
  const rows = document.querySelectorAll('#schedules-table-body tr');
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? '' : 'none';
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAdminPage);