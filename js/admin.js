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
          <button class="btn btn-sm btn-danger"  onclick="deleteScheduleConfirm('${schedule.id}')">Delete</button>
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
  const busDate = document.getElementById('bus-date').value;
  const busTime = document.getElementById('bus-time').value;
  const departureDate = new Date(`${busDate}T${busTime}`);

  // Calculate arrival time from duration fields
  const durationHrs  = parseInt(document.getElementById('duration-hours').value)  || 0;
  const durationMins = parseInt(document.getElementById('duration-minutes').value) || 0;
  const totalMins    = (durationHrs * 60) + durationMins;
  const arrivalDate  = new Date(departureDate.getTime() + (totalMins || 30) * 60000);

  const formData = {
    busName:       document.getElementById('bus-name').value.trim(),
    type:          document.getElementById('bus-type').value,
    origin:        document.getElementById('origin').value.trim(),
    destination:   document.getElementById('destination').value.trim(),
    pickupPoint:   document.getElementById('pickup-point').value.trim(),
    dropPoint:     document.getElementById('drop-point').value.trim(),
    durationHours: durationHrs,
    durationMins:  durationMins,
    departureTime: departureDate.toISOString(),
    arrivalTime:   arrivalDate.toISOString(),
    price:         parseInt(document.getElementById('price').value)
  };
  const scheduleId = document.getElementById('schedule-id').value;

  showLoading();
  let result;
  if (scheduleId) {
    result = await updateSchedule(scheduleId, formData);
    if (result) showToast('Schedule updated!', 'success');
  } else {
    result = await addSchedule(formData);
    if (result) showToast('Schedule added!', 'success');
  }
  hideLoading();

  if (result) {
    e.target.reset();
    document.getElementById('schedule-id').value = '';
    document.getElementById('bus-name').value    = 'Shree Ram Travels';
    document.getElementById('bus-type').value    = 'AC Sleeper (2+1)';
    document.getElementById('form-title').textContent = 'Add New Schedule';
    document.getElementById('schedule-pricing-preview').style.display = 'none';
    await loadSchedulesTable();
    await loadStats();
    await loadRouteSelector();
  }
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
  document.getElementById('bus-date').value = d.toISOString().split('T')[0];
  document.getElementById('bus-time').value = d.toTimeString().substring(0, 5);
  document.getElementById('price').value    = schedule.price;
  document.getElementById('form-title').textContent = 'Edit Schedule';
  updateScheduleFormPricing();
  document.getElementById('schedule-form').scrollIntoView({ behavior: 'smooth' });
}

async function deleteScheduleConfirm(id) {
  if (confirm('Are you sure you want to delete this schedule?')) {
    showLoading();
    const success = await deleteSchedule(id);
    hideLoading();
    if (success) {
      await loadSchedulesTable();
      await loadStats();
      await loadRouteSelector();
      showToast('Schedule deleted!', 'success');
    }
  }
}

function resetScheduleForm() {
  document.getElementById('schedule-form').reset();
  document.getElementById('schedule-id').value      = '';
  document.getElementById('bus-name').value         = 'Shree Ram Travels';
  document.getElementById('bus-type').value         = 'AC Sleeper (2+1)';
  document.getElementById('pickup-point').value     = '';
  document.getElementById('drop-point').value       = '';
  document.getElementById('duration-hours').value   = '';
  document.getElementById('duration-minutes').value = '';
  document.getElementById('form-title').textContent = 'Add New Schedule';
  document.getElementById('schedule-pricing-preview').style.display = 'none';
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
// BOOT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initAdminPage);