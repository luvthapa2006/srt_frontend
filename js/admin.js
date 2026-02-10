// ========================================
// ADMIN.JS - Admin Panel Logic
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
      <td>${schedule.origin} &rarr; ${schedule.destination}</td>
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
          ${schedule ? `<div><strong>${schedule.busName}</strong></div><div class="text-muted">${schedule.origin} &rarr; ${schedule.destination}</div>` : 'N/A'}
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
  document.getElementById('bus-name').value = schedule.busName;
  document.getElementById('bus-type').value = schedule.type;
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

// Initialize pricing form
function initPricingForm() {
  const form = document.getElementById('pricing-form');
  if (!form) {
    console.log('Pricing form not found - skipping initialization');
    return;
  }
  
  try {
    // Load current pricing
    const pricing = getSeatPricing();
    
    const windowInput = document.getElementById('window-multiplier');
    const frontInput = document.getElementById('front-multiplier');
    const backInput = document.getElementById('back-multiplier');
    
    // Check if all required elements exist before setting values
    if (windowInput && frontInput && backInput && pricing) {
      windowInput.value = pricing.window || 1.0;
      frontInput.value = pricing.front || 1.0;
      backInput.value = pricing.back || 1.0;
    } else {
      console.warn('Some pricing form inputs are missing');
    }
    
    form.addEventListener('submit', handlePricingSubmit);
  } catch (error) {
    console.error('Error initializing pricing form:', error);
  }
}

// Handle pricing form submission
function handlePricingSubmit(e) {
  e.preventDefault();
  
  updateSeatPricing('window', parseFloat(document.getElementById('window-multiplier').value));
  updateSeatPricing('front', parseFloat(document.getElementById('front-multiplier').value));
  updateSeatPricing('back', parseFloat(document.getElementById('back-multiplier').value));
  
  showToast('Pricing updated successfully!', 'success');
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