// ========================================
// ADMIN.JS - Admin Panel Logic
// ========================================

// ── Auth: ALWAYS require password on every page load ──
// Never persist auth across reloads or tab switches
const ADMIN_PASSWORD_KEY = '__srt_admin_sess__';
let isAuthenticated = false;   // starts false EVERY time

let selectedRoute  = null;
let allBookingsCache = [];    // cached for export

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
function initAdminPage() {
  // Always show login on fresh page load
  showLoginModal();

  // Also lock whenever the tab becomes visible again after being hidden
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !isAuthenticated) {
      showLoginModal();
    }
  });
}

// ─────────────────────────────────────────
// LOGIN MODAL
// ─────────────────────────────────────────
function showLoginModal() {
  isAuthenticated = false;
  document.body.classList.remove('admin-authed');
  const modal = document.getElementById('admin-login-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    // clear & focus password field
    const pw = document.getElementById('admin-password');
    if (pw) { pw.value = ''; setTimeout(() => pw.focus(), 100); }
  }
}

function hideLoginModal() {
  const modal = document.getElementById('admin-login-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
}

function handleAdminLogin(e) {
  e.preventDefault();
  const password = document.getElementById('admin-password').value;

  // Validate against env-based password (stored server-side ideally;
  // for now keep the same pattern as before)
  const correct = 'admin123'; // ← change to match your ADMIN_PASSWORD env var

  if (password === correct) {
    isAuthenticated = true;
    document.body.classList.add('admin-authed');
    hideLoginModal();
    initAdminDashboard();
    showToast('Welcome back!', 'success');
  } else {
    showToast('Incorrect password', 'error');
    document.getElementById('admin-password').value = '';
    // shake the modal box
    const box = document.querySelector('.modal-content');
    if (box) {
      box.style.animation = 'none';
      box.offsetHeight; // reflow
      box.style.animation = 'shake 0.4s ease';
    }
  }
}

function adminLogout() {
  isAuthenticated = false;
  showToast('Logged out', 'info');
  setTimeout(() => location.reload(), 600);
}

// Shake animation (injected once)
(function injectShake() {
  const s = document.createElement('style');
  s.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`;
  document.head.appendChild(s);
})();

// ─────────────────────────────────────────
// DASHBOARD INIT
// ─────────────────────────────────────────
function initAdminDashboard() {
  loadSchedulesTable();
  loadBookingsTable();
  loadStats();
  initScheduleForm();
  initPricingForm();
  loadRouteSelector();
  initBusDatePicker();
  initCouponForm();
}

// ─────────────────────────────────────────
// STATS
// ─────────────────────────────────────────
async function loadStats() {
  const schedules = await getSchedules();
  const stats     = await getBookingStats();

  const totalRevenue  = stats.totalRevenue  || 0;
  const totalBookings = stats.totalBookings || 0;
  const totalBuses    = schedules.length;

  const statRevenue  = document.getElementById('stat-revenue');
  const statBookings = document.getElementById('stat-bookings');
  const statBuses    = document.getElementById('stat-buses');

  if (statRevenue)  statRevenue.textContent  = formatCurrency(totalRevenue);
  if (statBookings) statBookings.textContent = totalBookings;
  if (statBuses)    statBuses.textContent    = totalBuses;
}

// ─────────────────────────────────────────
// SCHEDULES TABLE
// ─────────────────────────────────────────
async function loadSchedulesTable() {
  const tbody = document.getElementById('schedules-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading…</td></tr>';
  const schedules = await getSchedules();

  if (schedules.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No schedules found</td></tr>';
    return;
  }

  tbody.innerHTML = schedules.map(schedule => {
    const dh = schedule.durationHours || 0;
    const dm = schedule.durationMins  || 0;
    const durationStr = dh || dm
      ? `${dh > 0 ? dh + 'h ' : ''}${dm > 0 ? dm + 'm' : ''}`.trim()
      : '—';
    return `
    <tr>
      <td>
        <div><strong>${schedule.busName}</strong></div>
        <div class="text-muted">${schedule.type}</div>
      </td>
      <td>${schedule.origin} → ${schedule.destination}</td>
      <td style="font-size:0.8rem;color:#475569;">${schedule.pickupPoint || '—'}</td>
      <td style="font-size:0.8rem;color:#475569;">${schedule.dropPoint   || '—'}</td>
      <td>${formatDate(schedule.departureTime)}</td>
      <td>${formatTime(schedule.departureTime)}</td>
      <td><span style="background:#eff6ff;color:#3b82f6;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.8rem;font-weight:600;">⏱ ${durationStr}</span></td>
      <td>${formatCurrency(schedule.price)}</td>
      <td>
        <span class="badge badge-${(schedule.bookedSeats?.length || 0) > 30 ? 'warning' : 'success'}">
          ${TOTAL_SEATS - (schedule.bookedSeats?.length || 0)} / ${TOTAL_SEATS}
        </span>
      </td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline" onclick="editSchedule('${schedule.id}')">Edit</button>
          <button class="btn btn-sm btn-danger"  onclick="openBusCancelDialog('${schedule.id}')">Delete / Cancel</button>
        </div>
      </td>
    </tr>`}).join('');
}

// ─────────────────────────────────────────
// BOOKINGS TABLE
// ─────────────────────────────────────────
async function loadBookingsTable() {
  const tbody = document.getElementById('bookings-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="8" class="text-center">Loading…</td></tr>';
  const bookings = await getAllBookings();
  allBookingsCache = bookings; // cache for export

  if (bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No bookings found</td></tr>';
    return;
  }

  tbody.innerHTML = bookings.map(booking => {
    const schedule = booking.scheduleId;
    return `
      <tr>
        <td><code class="token-code">${booking.bookingToken}</code></td>
        <td>${booking.customerName}</td>
        <td>
          <div>${booking.email}</div>
          <div class="text-muted">${booking.phone}</div>
        </td>
        <td>
          ${schedule
            ? `<div><strong>${schedule.busName}</strong></div><div class="text-muted">${schedule.origin} → ${schedule.destination}</div>`
            : 'N/A'}
        </td>
        <td>${booking.seatNumbers.map(s => `<span class="seat-badge-sm">${s}</span>`).join(' ')}</td>
        <td>${formatCurrency(booking.totalAmount)}</td>
        <td>
          <span class="badge badge-${booking.status === 'confirmed' ? 'success' : booking.status === 'cancelled' ? 'danger' : 'secondary'}">
            ${booking.status}
          </span>
        </td>
        <td>
          ${booking.status === 'confirmed'
            ? `<button class="btn btn-sm btn-danger" onclick="cancelBookingConfirm('${booking.bookingToken}')">Cancel</button>`
            : '<span class="text-muted">-</span>'}
        </td>
      </tr>`;
  }).join('');
}

// ─────────────────────────────────────────
// EXCEL EXPORT
// ─────────────────────────────────────────
function openExportModal() {
  // Populate route selector in modal
  const routeSelect = document.getElementById('export-route-filter');
  if (routeSelect && allBookingsCache.length > 0) {
    const routes = new Set();
    allBookingsCache.forEach(b => {
      if (b.scheduleId && b.scheduleId.origin) {
        routes.add(`${b.scheduleId.origin} → ${b.scheduleId.destination}`);
      }
    });
    routeSelect.innerHTML = '<option value="">All Routes</option>';
    routes.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r; opt.textContent = r;
      routeSelect.appendChild(opt);
    });
  }

  // Show/hide filter fields based on radio
  document.querySelectorAll('input[name="export-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const filterFields = document.getElementById('export-filter-fields');
      filterFields.classList.toggle('visible', radio.value === 'filter');
    });
  });

  // Reset to "all"
  document.querySelector('input[name="export-type"][value="all"]').checked = true;
  document.getElementById('export-filter-fields').classList.remove('visible');

  document.getElementById('export-modal').classList.add('active');
}

function closeExportModal() {
  document.getElementById('export-modal').classList.remove('active');
}

function executeExport() {
  const exportType = document.querySelector('input[name="export-type"]:checked')?.value || 'all';

  let data = [...allBookingsCache];

  if (exportType === 'filter') {
    const dateFrom  = document.getElementById('export-date-from').value;
    const dateTo    = document.getElementById('export-date-to').value;
    const routeVal  = document.getElementById('export-route-filter').value;

    if (dateFrom) {
      const from = new Date(dateFrom);
      data = data.filter(b => new Date(b.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      data = data.filter(b => new Date(b.createdAt) <= to);
    }
    if (routeVal) {
      data = data.filter(b => {
        if (!b.scheduleId) return false;
        const route = `${b.scheduleId.origin} → ${b.scheduleId.destination}`;
        return route === routeVal;
      });
    }

    if (data.length === 0) {
      showToast('No bookings match the selected filters.', 'warning');
      return;
    }
  }

  downloadExcel(data);
  closeExportModal();
}

function downloadExcel(bookings) {
  // Build CSV (opens perfectly in Excel)
  const headers = [
    'Booking Token', 'Passenger Name', 'Email', 'Phone',
    'Bus Name', 'Route', 'Departure Date', 'Departure Time',
    'Seats', 'Total Amount (₹)', 'Status', 'Booked On'
  ];

  const rows = bookings.map(b => {
    const schedule = b.scheduleId;
    const dep = schedule?.departureTime ? new Date(schedule.departureTime) : null;
    return [
      b.bookingToken,
      b.customerName,
      b.email,
      b.phone,
      schedule?.busName || 'N/A',
      schedule ? `${schedule.origin} → ${schedule.destination}` : 'N/A',
      dep ? dep.toLocaleDateString('en-IN') : 'N/A',
      dep ? dep.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      b.seatNumbers.join(', '),
      b.totalAmount,
      b.status,
      new Date(b.createdAt).toLocaleString('en-IN')
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const BOM = '\uFEFF';  // UTF-8 BOM so Excel reads Hindi/special chars correctly
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `SRT_Bookings_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Downloaded ${bookings.length} booking(s)!`, 'success');
}

// ─────────────────────────────────────────
// SCHEDULE FORM
// ─────────────────────────────────────────
function initScheduleForm() {
  const form = document.getElementById('schedule-form');
  if (form) {
    form.addEventListener('submit', handleScheduleSubmit);
    ['origin', 'destination'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', updateScheduleFormPricing);
    });
  }
}

function updateScheduleFormPricing() {
  const origin      = document.getElementById('origin')?.value.trim();
  const destination = document.getElementById('destination')?.value.trim();
  const preview     = document.getElementById('schedule-pricing-preview');
  if (!preview || !origin || !destination) { if (preview) preview.style.display = 'none'; return; }

  const routePricing   = getRoutePricing(origin, destination);
  const isCustom       = getAllRoutePricing()[getRouteKey(origin, destination)] !== undefined;
  preview.style.display = 'block';
  preview.innerHTML = `
    <div class="pricing-info-box">
      <div class="pricing-info-header">
        <strong>📊 Seat Pricing for this Route</strong>
        ${isCustom ? '<span class="badge badge-success">Custom</span>' : '<span class="badge badge-secondary">Default</span>'}
      </div>
      <div class="pricing-grid">
        <div class="pricing-item"><span class="pricing-label">🔵 First Right:</span><span class="pricing-value">${formatCurrency(routePricing.firstRight)}</span></div>
        <div class="pricing-item"><span class="pricing-label">⚪ First Left:</span><span class="pricing-value">${formatCurrency(routePricing.firstLeft)}</span></div>
        <div class="pricing-item"><span class="pricing-label">🟢 Last Left:</span><span class="pricing-value">${formatCurrency(routePricing.lastLeft)}</span></div>
        <div class="pricing-item"><span class="pricing-label">🟠 Sleeper:</span><span class="pricing-value">${formatCurrency(routePricing.sleeper)}</span></div>
      </div>
      <div class="pricing-note"><small>${isCustom ? 'This route has custom pricing.' : 'Using default pricing. Set custom pricing in the Pricing tab.'}</small></div>
    </div>`;
}

async function handleScheduleSubmit(e) {
  e.preventDefault();
  const busDates = buildDatesFromMode();
  const busTime  = document.getElementById('bus-time').value;
  const scheduleId = document.getElementById('schedule-id').value;

  // If editing an existing, use old single-date approach
  if (scheduleId) {
    // For edit mode, fall back to single date (use first date from picker or today)
    const singleDate = busDates[0] || new Date().toISOString().split('T')[0];
    const departureDate = new Date(`${singleDate}T${busTime}`);
    const durationHrs  = parseInt(document.getElementById('duration-hours').value)  || 0;
    const durationMins = parseInt(document.getElementById('duration-minutes').value) || 0;
    const totalMins    = (durationHrs * 60) + durationMins;
    const arrivalDate  = new Date(departureDate.getTime() + (totalMins || 30) * 60000);
    const origin       = document.getElementById('origin').value.trim();
    const destination  = document.getElementById('destination').value.trim();
    const basePriceRaw = document.getElementById('price').value;
    const basePrice    = basePriceRaw !== '' ? parseInt(basePriceRaw) : null;
    const formData = {
      busName: document.getElementById('bus-name').value.trim(),
      type: document.getElementById('bus-type').value,
      origin, destination,
      pickupPoint:   document.getElementById('pickup-point').value.trim(),
      dropPoint:     document.getElementById('drop-point').value.trim(),
      durationHours: durationHrs, durationMins,
      departureTime: departureDate.toISOString(),
      arrivalTime:   arrivalDate.toISOString(),
      price: basePrice || 0
    };
    showLoading();
    const result = await updateSchedule(scheduleId, formData);
    hideLoading();
    if (result) {
      showToast('Schedule updated!', 'success');
      resetScheduleFormState();
      await loadSchedulesTable(); await loadStats(); await loadRouteSelector();
    }
    return;
  }

  // New schedule — require at least one date
  if (!busDates.length) {
    showToast('Please select at least one bus date', 'error'); return;
  }
  if (!busTime) { showToast('Please set a departure time', 'error'); return; }

  const durationHrs  = parseInt(document.getElementById('duration-hours').value)  || 0;
  const durationMins = parseInt(document.getElementById('duration-minutes').value) || 0;
  const origin       = document.getElementById('origin').value.trim();
  const destination  = document.getElementById('destination').value.trim();
  const basePriceRaw = document.getElementById('price').value;
  const basePrice    = basePriceRaw !== '' ? parseInt(basePriceRaw) : null;

  const formData = {
    busName:       document.getElementById('bus-name').value.trim(),
    type:          document.getElementById('bus-type').value,
    origin, destination,
    pickupPoint:   document.getElementById('pickup-point').value.trim(),
    dropPoint:     document.getElementById('drop-point').value.trim(),
    durationHours: durationHrs,
    durationMins,
    price:         basePrice || 0,
    busDates,
    busTime
  };

  showLoading();
  const result = await addSchedule(formData);
  hideLoading();

  if (result) {
    const count = result.count || 1;
    showToast(`${count} schedule${count > 1 ? 's' : ''} added! 🎉`, 'success');

    if (basePrice && basePrice > 0) {
      const existing = getRoutePricing(origin, destination);
      setRoutePricing(origin, destination, {
        lowerPrice: basePrice, upperPrice: basePrice, perSeat: existing.perSeat || {}
      });
    }

    resetScheduleFormState();
    await loadSchedulesTable(); await loadStats(); await loadRouteSelector();
  }
}

function resetScheduleFormState() {
  document.getElementById('schedule-form')?.reset();
  document.getElementById('schedule-id').value   = '';
  document.getElementById('bus-name').value       = 'Shree Ram Travels';
  document.getElementById('bus-type').value       = 'AC Sleeper (36)';
  document.getElementById('form-title').textContent = 'Add New Schedule';
  document.getElementById('schedule-pricing-preview').style.display = 'none';
  selectedBusDates = [];
  renderDatePills();
}

async function editSchedule(id) {
  showLoading();
  const schedule = await getScheduleById(id);
  hideLoading();
  if (!schedule) { showToast('Schedule not found', 'error'); return; }

  document.getElementById('schedule-id').value   = schedule.id;
  document.getElementById('bus-name').value      = schedule.busName;
  document.getElementById('bus-type').value      = schedule.type;
  document.getElementById('origin').value        = schedule.origin;
  document.getElementById('destination').value   = schedule.destination;
  document.getElementById('pickup-point').value  = schedule.pickupPoint  || '';
  document.getElementById('drop-point').value    = schedule.dropPoint    || '';
  document.getElementById('duration-hours').value   = schedule.durationHours || '';
  document.getElementById('duration-minutes').value = schedule.durationMins  || '';

  const d = new Date(schedule.departureTime);
  // For edit mode: set a single date in the multi-date picker
  selectedBusDates = [d.toISOString().split('T')[0]];
  renderDatePills();
  document.getElementById('bus-time').value = d.toTimeString().substring(0, 5);
  document.getElementById('price').value    = schedule.price;
  document.getElementById('form-title').textContent = 'Edit Schedule';
  updateScheduleFormPricing();
  document.getElementById('schedule-form').scrollIntoView({ behavior: 'smooth' });
}

// ── Delete / Cancel Bus Dialog ──────────────────────────────────────
let _cancelDialogScheduleId = null;
let _cancelDialogSelectedDates = [];

function openBusCancelDialog(scheduleId) {
  _cancelDialogScheduleId = scheduleId;
  _cancelDialogSelectedDates = [];
  const s = allBusesCache.find(x => x.id === scheduleId || x._id === scheduleId);
  const nameEl = document.getElementById('bus-cancel-dialog-name');
  if (nameEl && s) nameEl.textContent = `${s.busName} · ${s.origin} → ${s.destination}`;
  document.getElementById('cancel-dates-panel').style.display = 'none';
  const dialog = document.getElementById('bus-cancel-dialog');
  if (dialog) { dialog.style.display = 'flex'; }
}

function closeBusCancelDialog() {
  document.getElementById('bus-cancel-dialog').style.display = 'none';
  _cancelDialogScheduleId = null;
  _cancelDialogSelectedDates = [];
}

async function busDeleteAction(action) {
  if (action === 'delete-all') {
    if (!confirm('Permanently delete this route and ALL its dates? This cannot be undone.')) return;
    closeBusCancelDialog();
    showLoading();
    const success = await deleteSchedule(_cancelDialogScheduleId);
    hideLoading();
    if (success) {
      await loadSchedulesTable(); await loadStats(); await loadBusListTable();
      showToast('Route deleted permanently', 'success');
    }
  } else if (action === 'cancel-dates') {
    // Show date picker panel — list upcoming scheduled dates for this route
    const s = allBusesCache.find(x => (x.id||x._id) === _cancelDialogScheduleId);
    const panel = document.getElementById('cancel-dates-panel');
    const listEl = document.getElementById('cancel-dates-list');
    panel.style.display = 'block';
    // Generate upcoming dates to show (next 30 days)
    const upcoming = [];
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now); d.setDate(d.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      upcoming.push(ds);
    }
    listEl.innerHTML = upcoming.map(ds => {
      const label = new Date(ds + 'T00:00').toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
      return `<label style="cursor:pointer;"><input type="checkbox" class="cancel-date-check" value="${ds}">
        <span style="display:inline-block;padding:0.25rem 0.6rem;border:1.5px solid #e5e7eb;border-radius:6px;font-size:0.8rem;margin:2px;">${label}</span></label>`;
    }).join('');
  }
}

async function confirmCancelDates() {
  const checks = document.querySelectorAll('.cancel-date-check:checked');
  const dates = Array.from(checks).map(ch => ch.value);
  if (!dates.length) { showToast('Select at least one date', 'error'); return; }
  closeBusCancelDialog();
  showLoading();
  // Cancel = set isActive false for those dates via API (store as cancelledDates on the schedule)
  const res = await fetch(`${API_BASE}/schedules/${_cancelDialogScheduleId}/cancel-dates`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dates })
  }).catch(() => null);
  hideLoading();
  showToast(`Cancelled ${dates.length} date(s) for this route`, 'success');
  await loadBusListTable();
}

function resetScheduleForm() {
  document.getElementById('schedule-form').reset();
  document.getElementById('schedule-id').value      = '';
  document.getElementById('bus-name').value         = 'Shree Ram Travels';
  document.getElementById('bus-type').value         = 'AC Sleeper (36)';
  document.getElementById('pickup-point').value     = '';
  document.getElementById('drop-point').value       = '';
  document.getElementById('duration-hours').value   = '';
  document.getElementById('duration-minutes').value = '';
  document.getElementById('form-title').textContent = 'Add New Schedule';
  document.getElementById('schedule-pricing-preview').style.display = 'none';
  selectedBusDates = [];
  renderDatePills();
}

// ─────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────
async function loadRouteSelector() {
  const routeSelect = document.getElementById('route-selector');
  if (!routeSelect) return;
  const routes     = await getAllRoutes();
  const allPricing = getAllRoutePricing();
  // remove old listener by cloning
  const fresh = routeSelect.cloneNode(false);
  routeSelect.parentNode.replaceChild(fresh, routeSelect);
  fresh.innerHTML = '<option value="">Select a route…</option>';
  routes.forEach(route => {
    const hasCustom = allPricing[route.key] !== undefined;
    const opt = document.createElement('option');
    opt.value = route.key;
    opt.textContent = `${route.display}${hasCustom ? ' ⭐' : ''}`;
    opt.dataset.origin      = route.origin;
    opt.dataset.destination = route.destination;
    fresh.appendChild(opt);
  });
  fresh.addEventListener('change', handleRouteSelection);
}

function handleRouteSelection(e) {
  const sel = e.target.options[e.target.selectedIndex];
  if (!sel.value) { selectedRoute = null; resetPricingForm(); return; }
  selectedRoute = {
    key:         sel.value,
    origin:      sel.dataset.origin,
    destination: sel.dataset.destination,
    display:     sel.textContent.replace(' ⭐','')
  };
  loadPricingForRoute(selectedRoute);
}

function loadPricingForRoute(route) {
  const pricing    = getRoutePricing(route.origin, route.destination);
  const allPricing = getAllRoutePricing();
  const hasCustom  = allPricing[route.key] !== undefined;

  // Section 1 – deck-level prices
  document.getElementById('lower-deck-price').value = pricing.lowerPrice || 800;
  document.getElementById('upper-deck-price').value = pricing.upperPrice || 600;

  const ps = document.getElementById('pricing-status');
  if (ps) ps.innerHTML = hasCustom
    ? `<div class="alert alert-info"><strong>Custom pricing set for this route.</strong>
        <button class="btn btn-sm btn-outline" onclick="resetRoutePricing()" style="margin-left:1rem;">Reset to Default</button></div>`
    : `<div class="alert alert-secondary"><strong>Using default pricing.</strong> Save to apply custom pricing.</div>`;

  const btn = document.getElementById('reset-route-btn');
  if (btn) btn.style.display = hasCustom ? 'inline-flex' : 'none';

  // Section 2 – per-seat map (detect bus type from first schedule on this route)
  renderAdminSeatMap(route, pricing);
}

function initPricingForm() {
  const form = document.getElementById('pricing-form');
  if (!form) return;
  form.addEventListener('submit', handlePricingSubmit);
  ['lower-deck-price','upper-deck-price'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateDeckPricePreview);
  });
  resetPricingForm();
}

function resetPricingForm() {
  document.getElementById('lower-deck-price').value = 800;
  document.getElementById('upper-deck-price').value = 600;
  const ps = document.getElementById('pricing-status');
  if (ps) ps.innerHTML = `<div class="alert alert-secondary"><strong>Select a route</strong> to configure pricing.</div>`;
  document.getElementById('per-seat-map-container').innerHTML =
    `<p style="color:#6b7280;text-align:center;padding:2rem 0;">Select a route above to configure per-seat prices.</p>`;
  updateDeckPricePreview();
}

function updateDeckPricePreview() {
  const lp = parseInt(document.getElementById('lower-deck-price')?.value || 800);
  const up = parseInt(document.getElementById('upper-deck-price')?.value || 600);
  const prev = document.getElementById('pricing-preview');
  if (!prev) return;
  prev.innerHTML = `
    <div style="display:flex;gap:1.5rem;flex-wrap:wrap;padding:1rem;background:#f9fafb;border-radius:8px;">
      <div>
        <div style="font-size:0.8rem;color:#6b7280;margin-bottom:0.25rem;">🛏️ Lower Deck (default)</div>
        <div style="font-size:1.4rem;font-weight:700;color:#3b82f6;">${formatCurrency(lp)}</div>
      </div>
      <div>
        <div style="font-size:0.8rem;color:#6b7280;margin-bottom:0.25rem;">🛏️ Upper Deck (default)</div>
        <div style="font-size:1.4rem;font-weight:700;color:#8b5cf6;">${formatCurrency(up)}</div>
      </div>
      <div style="flex:1;min-width:200px;background:#fffbeb;border-radius:6px;padding:0.75rem;font-size:0.8rem;color:#92400e;">
        ℹ️ Per-seat overrides (Section 2) will take priority over these deck defaults.
      </div>
    </div>`;
}

// ─── Section 2: Admin per-seat map ───
async function renderAdminSeatMap(route, pricing) {
  const container = document.getElementById('per-seat-map-container');
  if (!container) return;

  // Get bus type from first schedule matching this route
  const schedules = await getSchedules({ origin: route.origin, destination: route.destination });
  const busType   = schedules[0]?.type || 'AC Sleeper (36)';
  const perSeat   = pricing.perSeat || {};

  const lp = parseInt(document.getElementById('lower-deck-price').value || 800);
  const up = parseInt(document.getElementById('upper-deck-price').value || 600);

  function renderMapDeck(prefix, deckLabel, deckDefault) {
    const isSleeper = busType === 'AC Sleeper (36)';
    const isMixed   = busType === 'AC Seater+Sleeper (8+32)';
    const isLower   = prefix === 'L';
    const rows = (isMixed && isLower) ? 8 : 6;

    let html = `<div style="margin-bottom:2rem;">
      <h5 style="margin-bottom:1rem;font-weight:700;color:#374151;">
        🛏️ ${deckLabel} Deck
        <small style="font-weight:400;color:#6b7280;font-size:0.8rem;"> — default: ${formatCurrency(deckDefault)}</small>
      </h5>
      <div class="admin-seat-grid">`;

    for (let row = 0; row < rows; row++) {
      const hasLeft = !(isMixed && isLower && row >= 6);
      const leftNum = row + 1;
      const rightA  = 7  + row * 2;
      const rightB  = 8  + row * 2;
      const isSeaterRow = isMixed && isLower && row < 4;

      html += `<div class="admin-seat-row">`;

      // Left seat
      if (hasLeft) {
        const sid = `${prefix}${leftNum}`;
        const val = perSeat[sid] !== undefined ? perSeat[sid] : '';
        html += adminSeatInput(sid, val, deckDefault, 'sleeper');
      } else {
        html += `<div class="admin-seat-empty"></div>`;
      }

      html += `<div class="admin-aisle"></div>`;

      // Right seats
      [rightA, rightB].forEach(n => {
        const sid = `${prefix}${n}`;
        const val = perSeat[sid] !== undefined ? perSeat[sid] : '';
        const type = isSeaterRow ? 'seater' : 'sleeper';
        html += adminSeatInput(sid, val, deckDefault, type);
      });

      html += `</div>`;
      if (isMixed && isLower && row === 3) {
        html += `<div style="text-align:center;font-size:0.75rem;color:#9ca3af;margin:0.5rem 0;border-top:1px dashed #e5e7eb;padding-top:0.5rem;">— Sleeper section —</div>`;
      }
    }

    html += `</div></div>`;
    return html;
  }

  function adminSeatInput(sid, val, deckDefault, type) {
    const icon = type === 'seater' ? '💺' : '💤';
    return `
      <div class="admin-seat-input-wrap" title="${sid}">
        <div class="admin-seat-label">${icon} ${sid}</div>
        <input type="number" class="admin-seat-price-input" id="seat-input-${sid}"
          data-seat="${sid}" min="0" placeholder="${deckDefault}"
          value="${val}" oninput="onPerSeatInput('${sid}')">
      </div>`;
  }

  container.innerHTML = `
    <div style="margin-bottom:1rem;padding:0.75rem 1rem;background:#eff6ff;border-radius:8px;font-size:0.85rem;color:#1e40af;">
      💡 Leave a seat blank to use the deck default price. Enter a value to override that specific seat.
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;overflow-x:auto;">
      <div>${renderMapDeck('L','Lower', lp)}</div>
      <div>${renderMapDeck('U','Upper', up)}</div>
    </div>`;
}

function onPerSeatInput(seatId) {
  // live update — collected on save
}

function handlePricingSubmit(e) {
  e.preventDefault();
  if (!selectedRoute) { showToast('Please select a route first','warning'); return; }

  const lp = parseInt(document.getElementById('lower-deck-price').value);
  const up = parseInt(document.getElementById('upper-deck-price').value);
  if (isNaN(lp) || isNaN(up) || lp < 0 || up < 0) { showToast('Prices must be positive','error'); return; }

  // Collect per-seat overrides
  const perSeat = {};
  document.querySelectorAll('.admin-seat-price-input').forEach(input => {
    const sid = input.dataset.seat;
    const val = input.value.trim();
    if (val !== '' && !isNaN(parseInt(val)) && parseInt(val) >= 0) {
      perSeat[sid] = parseInt(val);
    }
  });

  const ok = setRoutePricing(selectedRoute.origin, selectedRoute.destination, { lowerPrice: lp, upperPrice: up, perSeat });
  if (ok) {
    showToast(`Pricing saved for ${selectedRoute.display}!`, 'success');
    loadRouteSelector();
    loadPricingForRoute(selectedRoute);
  } else {
    showToast('Failed to save pricing','error');
  }
}

function resetRoutePricing() {
  if (!selectedRoute) return;
  if (confirm(`Reset pricing for ${selectedRoute.display} to defaults?`)) {
    deleteRoutePricing(selectedRoute.origin, selectedRoute.destination);
    showToast('Route pricing reset','success');
    loadRouteSelector();
    loadPricingForRoute(selectedRoute);
  }
}

function resetAllPricing() {
  if (confirm('⚠️ Reset ALL pricing to system defaults?')) {
    localStorage.removeItem('routePricing_v2');
    localStorage.removeItem('routePricing');
    showToast('All pricing reset','success');
    selectedRoute = null;
    document.getElementById('route-selector').value = '';
    resetPricingForm();
    loadRouteSelector();
  }
}

// ─────────────────────────────────────────
// TABS
// ─────────────────────────────────────────
function switchAdminTab(tabName, event) {
  document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById(`tab-${tabName}`);
  if (tab) tab.classList.add('active');
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  if (event?.target) event.target.classList.add('active');
  if (tabName === 'pricing')  loadRouteSelector();
  if (tabName === 'bookings') loadBookingsTable();
  if (tabName === 'buslists') loadBusListTable();
  if (tabName === 'coupons')  loadCouponsTable();
}


// ─────────────────────────────────────────
// CANCEL BOOKING
// ─────────────────────────────────────────
async function cancelBookingConfirm(bookingToken) {
  if (confirm(`Cancel booking ${bookingToken}?`)) {
    showLoading();
    const success = await cancelBooking(bookingToken);
    hideLoading();
    if (success) {
      await loadBookingsTable();
      await loadStats();
      showToast('Booking cancelled!', 'success');
    } else {
      showToast('Failed to cancel booking.', 'error');
    }
  }
}

// ─────────────────────────────────────────
// SEARCH FILTERS
// ─────────────────────────────────────────
function filterBookings() {
  const term = document.getElementById('booking-search')?.value.toLowerCase() || '';
  document.querySelectorAll('#bookings-table-body tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
}

function filterSchedules() {
  const term = document.getElementById('schedule-search')?.value.toLowerCase() || '';
  document.querySelectorAll('#schedules-table-body tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
}

// ─────────────────────────────────────────
// RESET STATS (dev only)
// ─────────────────────────────────────────
async function resetStatsTemporary() {
  if (confirm('⚠️ DEVELOPMENT ONLY: Reset all stats?')) {
    showLoading();
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/reset-stats`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (response.ok) {
        await loadStats();
        showToast('Stats reset!', 'success');
      } else {
        document.getElementById('stat-revenue').textContent  = '₹0';
        document.getElementById('stat-bookings').textContent = '0';
        showToast('Display reset (backend endpoint not implemented)', 'info');
      }
    } catch {
      document.getElementById('stat-revenue').textContent  = '₹0';
      document.getElementById('stat-bookings').textContent = '0';
    }
    hideLoading();
  }
}

// ─────────────────────────────────────────
// MULTI-DATE BUS PICKER
// ─────────────────────────────────────────
// ── Schedule Mode (Date Range / Days of Week / Specific Dates) ──────────────
let selectedBusDates = [];
let _scheduleMode = 'daterange';

function setScheduleMode(mode) {
  _scheduleMode = mode;
  ['daterange','daysofweek','specific'].forEach(m => {
    const panel = document.getElementById('mode-panel-' + m);
    const tab   = document.getElementById('mode-tab-' + m);
    if (panel) panel.style.display = m === mode ? 'block' : 'none';
    if (tab)   tab.style.border = m === mode ? '2px solid #667eea' : '2px solid #e5e7eb';
  });
  updateDatesSummary();
}

function previewDateRange() {
  const s = document.getElementById('range-start')?.value;
  const e = document.getElementById('range-end')?.value;
  const preview = document.getElementById('range-preview');
  if (!s || !e) { if (preview) preview.textContent = ''; return; }
  if (e < s) { if (preview) preview.textContent = '⚠️ End date must be after start date'; return; }
  const start = new Date(s), end = new Date(e);
  const days = Math.round((end - start) / 86400000) + 1;
  if (preview) preview.textContent = `✅ ${days} days (${s} → ${e})`;
  updateDatesSummary();
}

function previewDaysOfWeek() {
  const checked = Array.from(document.querySelectorAll('.dow-check:checked')).map(x => parseInt(x.value));
  const s = document.getElementById('dow-start')?.value;
  const e = document.getElementById('dow-end')?.value;
  const preview = document.getElementById('dow-preview');
  if (!checked.length || !s || !e) { if (preview) preview.textContent = ''; return; }
  // Count matching dates
  let count = 0;
  const cur = new Date(s);
  const end = new Date(e);
  while (cur <= end) {
    const dow = cur.getDay() || 7; // make Sunday = 7
    if (checked.includes(dow)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  const dayNames = ['','Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  if (preview) preview.textContent = `✅ ${count} trips on ${checked.map(d => dayNames[d]).join(', ')} between ${s} → ${e}`;
  updateDatesSummary();
}

function updateDatesSummary() {
  const el = document.getElementById('dates-summary');
  if (!el) return;
  if (_scheduleMode === 'daterange') {
    const s = document.getElementById('range-start')?.value;
    const e = document.getElementById('range-end')?.value;
    el.textContent = s && e ? `📅 Daily from ${s} to ${e}` : '';
  } else if (_scheduleMode === 'daysofweek') {
    const checked = Array.from(document.querySelectorAll('.dow-check:checked')).map(x => parseInt(x.value));
    const dayNames = ['','Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    el.textContent = checked.length ? `🗓️ Runs every ${checked.map(d => dayNames[d]).join(', ')}` : '';
  } else {
    el.textContent = selectedBusDates.length ? `📌 ${selectedBusDates.length} specific date(s) selected` : '';
  }
}

function renderDowCheckboxes() {
  const container = document.getElementById('dow-checkboxes');
  if (!container) return;
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  container.innerHTML = days.map((d, i) => `
    <label style="cursor:pointer;">
      <input type="checkbox" class="dow-check" value="${i + 1}" onchange="previewDaysOfWeek()">
      <span style="display:inline-block;padding:0.3rem 0.7rem;border:2px solid #e5e7eb;border-radius:6px;font-size:0.85rem;font-weight:600;">${d}</span>
    </label>`).join('');
}

function initBusDatePicker() {
  renderDowCheckboxes();
  const today = new Date().toISOString().split('T')[0];
  ['bus-date-picker','range-start','range-end','dow-start','dow-end'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.min = today;
  });
  setScheduleMode('daterange');
  renderDatePills();
}

function addBusDate(dateStr) {
  if (!dateStr) return;
  if (!selectedBusDates.includes(dateStr)) {
    selectedBusDates.push(dateStr);
    selectedBusDates.sort();
    renderDatePills();
  }
}

function removeBusDate(dateStr) {
  selectedBusDates = selectedBusDates.filter(d => d !== dateStr);
  renderDatePills();
}

function renderDatePills() {
  const container = document.getElementById('selected-dates-list');
  if (!container) return;
  if (selectedBusDates.length === 0) {
    container.innerHTML = '<span style="color:#9ca3af;font-size:0.8rem;">No dates selected yet</span>';
  } else {
    container.innerHTML = selectedBusDates.map(d => {
      const display = new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
      return `<span class="date-pill">${display}<button type="button" onclick="removeBusDate('${d}')" title="Remove">×</button></span>`;
    }).join('');
  }
  const hidden = document.getElementById('bus-dates-json');
  if (hidden) hidden.value = JSON.stringify(selectedBusDates);
  updateDatesSummary();
}

// Build the flat array of dates from current schedule mode (for form submission)
function buildDatesFromMode() {
  if (_scheduleMode === 'specific') return selectedBusDates;
  if (_scheduleMode === 'daterange') {
    const s = document.getElementById('range-start')?.value;
    const e = document.getElementById('range-end')?.value;
    if (!s || !e || e < s) return [];
    const dates = [];
    const cur = new Date(s);
    while (cur <= new Date(e)) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }
  if (_scheduleMode === 'daysofweek') {
    const checked = Array.from(document.querySelectorAll('.dow-check:checked')).map(x => parseInt(x.value));
    const s = document.getElementById('dow-start')?.value;
    const e = document.getElementById('dow-end')?.value;
    if (!checked.length || !s || !e) return [];
    const dates = [];
    const cur = new Date(s);
    const end = new Date(e);
    while (cur <= end) {
      const dow = cur.getDay() || 7;
      if (checked.includes(dow)) dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }
  return [];
}

// Override initScheduleForm to hook multi-date
const _origInitScheduleForm = initScheduleForm;

// ─────────────────────────────────────────
// BUS LISTS TAB
// ─────────────────────────────────────────
let allBusesCache = [];

async function loadBusListTable() {
  const tbody = document.getElementById('buslist-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" class="text-center">Loading…</td></tr>';
  allBusesCache = await getSchedules();
  renderBusListTable(allBusesCache);
}

function renderBusListTable(schedules) {
  const tbody = document.getElementById('buslist-table-body');
  if (!tbody) return;
  if (schedules.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">No buses found</td></tr>';
    return;
  }
  tbody.innerHTML = schedules.map(s => {
    const dh = s.durationHours || 0, dm = s.durationMins || 0;
    const dur = (dh || dm) ? `${dh > 0 ? dh+'h ' : ''}${dm > 0 ? dm+'m' : ''}`.trim() : '—';
    const isActive = s.isActive !== false; // default true
    const availSeats = (s.totalSeats || TOTAL_SEATS) - (s.bookedSeats?.length || 0);
    return `
    <tr id="busrow-${s.id}" style="opacity:${isActive ? 1 : 0.55};">
      <td><div><strong>${s.busName}</strong></div><div class="text-muted" style="font-size:0.75rem;">${s.type}</div></td>
      <td>${s.origin} → ${s.destination}</td>
      <td style="font-size:0.78rem;color:#475569;">${s.pickupPoint || '—'}<br>${s.dropPoint || '—'}</td>
      <td>${formatDate(s.departureTime)}<br><small>${formatTime(s.departureTime)}</small></td>
      <td><span style="background:#eff6ff;color:#3b82f6;padding:0.15rem 0.4rem;border-radius:4px;font-size:0.78rem;">⏱ ${dur}</span></td>
      <td>${formatCurrency(s.price)}</td>
      <td><span class="badge badge-${availSeats < 5 ? 'warning' : 'success'}">${availSeats}/${s.totalSeats || TOTAL_SEATS}</span></td>
      <td>
        <label class="toggle-label">
          <label class="toggle-switch">
            <input type="checkbox" ${isActive ? 'checked' : ''} onchange="handleBusToggle('${s.id}', this)">
            <span class="toggle-slider"></span>
          </label>
          <span id="bus-status-${s.id}" style="font-size:0.78rem;color:${isActive ? '#10b981' : '#9ca3af'};">${isActive ? 'Active' : 'Inactive'}</span>
        </label>
      </td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline" onclick="editSchedule('${s.id}')">Edit</button>
          <button class="btn btn-sm btn-danger"  onclick="openBusCancelDialog('${s.id}')">Delete / Cancel</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function handleBusToggle(scheduleId, checkbox) {
  const result = await toggleScheduleActive(scheduleId);
  if (result) {
    const row = document.getElementById(`busrow-${scheduleId}`);
    const statusEl = document.getElementById(`bus-status-${scheduleId}`);
    if (row) row.style.opacity = result.isActive ? '1' : '0.55';
    if (statusEl) {
      statusEl.textContent = result.isActive ? 'Active' : 'Inactive';
      statusEl.style.color = result.isActive ? '#10b981' : '#9ca3af';
    }
    showToast(result.isActive ? 'Bus activated 🟢' : 'Bus deactivated ⭕', result.isActive ? 'success' : 'info');
  } else {
    // revert checkbox
    checkbox.checked = !checkbox.checked;
  }
}

function filterBusList() {
  const term   = document.getElementById('buslist-search')?.value.toLowerCase() || '';
  const type   = document.getElementById('buslist-filter-type')?.value || '';
  const status = document.getElementById('buslist-filter-status')?.value || '';
  const filtered = allBusesCache.filter(s => {
    const matchText   = !term   || (s.busName + s.origin + s.destination + s.type).toLowerCase().includes(term);
    const matchType   = !type   || s.type === type;
    const isActive    = s.isActive !== false;
    const matchStatus = !status || (status === 'active' ? isActive : !isActive);
    return matchText && matchType && matchStatus;
  });
  renderBusListTable(filtered);
}

// ─────────────────────────────────────────
// COUPONS TAB
// ─────────────────────────────────────────
async function loadCouponsTable() {
  const tbody = document.getElementById('coupons-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading…</td></tr>';
  const coupons = await getAllCoupons();
  if (coupons.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No coupons yet. Create one above!</td></tr>';
    return;
  }
  const now = new Date();
  tbody.innerHTML = coupons.map(c => {
    const expired = new Date(c.endDate) < now;
    const notYet  = new Date(c.startDate) > now;
    let statusBadge;
    if (!c.isActive) statusBadge = '<span style="background:#fee2e2;color:#dc2626;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.78rem;">Disabled</span>';
    else if (expired) statusBadge = '<span style="background:#fef3c7;color:#92400e;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.78rem;">Expired</span>';
    else if (notYet)  statusBadge = '<span style="background:#eff6ff;color:#3b82f6;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.78rem;">Upcoming</span>';
    else statusBadge = '<span style="background:#d1fae5;color:#065f46;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.78rem;">Active ✓</span>';

    const discountDisplay = c.discountType === 'flat'
      ? `₹${c.discountValue} off`
      : `${c.discountValue}% off`;
    const usageDisplay = c.maxUsage ? `${c.usageCount}/${c.maxUsage}` : `${c.usageCount}/∞`;
    return `
    <tr>
      <td><strong style="font-size:1rem;letter-spacing:1px;">${c.code}</strong></td>
      <td style="font-size:0.85rem;color:#475569;">${c.description || '—'}</td>
      <td><span style="background:#f0fdf4;color:#166534;padding:0.2rem 0.5rem;border-radius:4px;font-weight:600;">${discountDisplay}</span></td>
      <td style="font-size:0.82rem;">${new Date(c.startDate).toLocaleDateString('en-IN')} – ${new Date(c.endDate).toLocaleDateString('en-IN')}</td>
      <td style="font-size:0.85rem;">${usageDisplay}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-danger" onclick="deleteCouponConfirm('${c._id}')">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function initCouponForm() {
  const form = document.getElementById('coupon-form');
  if (!form) return;
  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30*24*3600*1000).toISOString().split('T')[0];
  const startEl = document.getElementById('coupon-start');
  const endEl   = document.getElementById('coupon-end');
  if (startEl) startEl.value = today;
  if (endEl)   endEl.value   = nextMonth;
  form.addEventListener('submit', handleCouponSubmit);
}

function updateCouponPreview() {
  const type  = document.getElementById('coupon-type')?.value;
  const value = document.getElementById('coupon-value')?.value;
  const prev  = document.getElementById('coupon-preview');
  if (!prev) return;
  if (value && Number(value) > 0) {
    const display = type === 'flat' ? `₹${value} flat discount` : `${value}% percentage discount`;
    prev.style.display = 'block';
    prev.innerHTML = `🎉 Customers will get <strong>${display}</strong> on their booking total.`;
  } else {
    prev.style.display = 'none';
  }
}

async function handleCouponSubmit(e) {
  e.preventDefault();
  const code        = document.getElementById('coupon-code').value.trim().toUpperCase();
  const description = document.getElementById('coupon-description').value.trim();
  const discountType  = document.getElementById('coupon-type').value;
  const discountValue = document.getElementById('coupon-value').value;
  const startDate   = document.getElementById('coupon-start').value;
  const endDate     = document.getElementById('coupon-end').value;
  const maxUsage    = document.getElementById('coupon-max-usage').value;

  if (!code || !discountValue || !startDate || !endDate) {
    showToast('Please fill all required fields', 'error'); return;
  }
  if (new Date(startDate) > new Date(endDate)) {
    showToast('End date must be after start date', 'error'); return;
  }

  showLoading();
  const result = await createCoupon({ code, description, discountType, discountValue, startDate, endDate, maxUsage });
  hideLoading();
  if (result) {
    showToast(`Coupon "${code}" created! 🎟️`, 'success');
    resetCouponForm();
    loadCouponsTable();
  }
}

function resetCouponForm() {
  document.getElementById('coupon-form')?.reset();
  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30*24*3600*1000).toISOString().split('T')[0];
  const startEl = document.getElementById('coupon-start');
  const endEl   = document.getElementById('coupon-end');
  if (startEl) startEl.value = today;
  if (endEl)   endEl.value   = nextMonth;
  const prev = document.getElementById('coupon-preview');
  if (prev) prev.style.display = 'none';
}

async function deleteCouponConfirm(id) {
  if (confirm('Delete this coupon? This cannot be undone.')) {
    showLoading();
    const ok = await deleteCoupon(id);
    hideLoading();
    if (ok) { showToast('Coupon deleted', 'success'); loadCouponsTable(); }
  }
}

// ─────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initAdminPage);