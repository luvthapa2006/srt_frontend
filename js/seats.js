// ========================================
// SEATS.JS - Seat Selection (Slider Tab UI)
// AC Sleeper (36):        Both decks: 6L×1 left + 6R×2 right = 18/deck
// AC Seater+Sleeper(8+32):Lower: 6L×1 left + 4R×2 seater + 4R×2 sleeper = 22
//                         Upper: 6L×1 left + 6R×2 right sleeper = 18
// ========================================

let currentSchedule = null;
let selectedSeats    = [];
let activeDeck       = 'lower'; // 'lower' | 'upper'

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
function initSeatsPage() {
  const params = getQueryParams();
  if (!params.id) { showToast('Invalid schedule','error'); navigateTo('timings.html'); return; }
  loadSchedule(params.id);
}

async function loadSchedule(id) {
  showLoading();
  currentSchedule = await getScheduleById(id);
  hideLoading();
  if (!currentSchedule) { showToast('Schedule not found','error'); navigateTo('timings.html'); return; }
  displayScheduleInfo();
  buildDeckTabs();
  renderActiveDeck();
  updateSummary();
}

// ─────────────────────────────────────────
// SCHEDULE INFO
// ─────────────────────────────────────────
function displayScheduleInfo() {
  const info = document.getElementById('schedule-info');
  if (info) info.innerHTML = `
    <h1 class="page-title">Select Seats</h1>
    <p class="schedule-subtitle">${currentSchedule.busName} • ${currentSchedule.type}</p>`;

  const jd = document.getElementById('journey-details');
  if (jd) jd.innerHTML = `
    <h3 class="summary-title">Journey Details</h3>
    <div class="detail-group"><label class="detail-label">Route</label>
      <div class="detail-value">${currentSchedule.origin} → ${currentSchedule.destination}</div></div>
    <div class="detail-group"><label class="detail-label">Departure</label>
      <div class="detail-value">${formatDate(currentSchedule.departureTime)} at ${formatTime(currentSchedule.departureTime)}</div></div>
    <div class="detail-group"><label class="detail-label">Bus Type</label>
      <div class="detail-value">${currentSchedule.type}</div></div>`;
}

// ─────────────────────────────────────────
// DECK TAB SLIDER
// ─────────────────────────────────────────
function buildDeckTabs() {
  const container = document.getElementById('upper-deck');
  const lowerEl   = document.getElementById('lower-deck');

  // Replace the two existing deck divs with a single tabbed container
  const wrapper = document.createElement('div');
  wrapper.id = 'deck-tab-wrapper';
  wrapper.innerHTML = `
    <div class="deck-tabs">
      <button class="deck-tab-btn active" id="tab-btn-lower" onclick="switchDeck('lower')">
        🛏️ Lower Deck
      </button>
      <button class="deck-tab-btn" id="tab-btn-upper" onclick="switchDeck('upper')">
        🛏️ Upper Deck
      </button>
    </div>
    <div id="deck-render-area"></div>`;

  // Insert before the first deck div
  const parent = container.parentNode;
  parent.insertBefore(wrapper, container);
  container.style.display = 'none';
  lowerEl.style.display   = 'none';
}

function switchDeck(deck) {
  activeDeck = deck;
  document.getElementById('tab-btn-lower').classList.toggle('active', deck === 'lower');
  document.getElementById('tab-btn-upper').classList.toggle('active', deck === 'upper');
  renderActiveDeck();
}

// ─────────────────────────────────────────
// RENDER CURRENT DECK
// ─────────────────────────────────────────
function renderActiveDeck() {
  const area = document.getElementById('deck-render-area');
  if (!area) return;
  const busType = currentSchedule.type || 'AC Sleeper (36)';
  const prefix  = activeDeck === 'lower' ? 'L' : 'U';
  area.innerHTML = renderDeck(prefix, busType);
}

function renderDeck(prefix, busType) {
  const isSleeper = busType === 'AC Sleeper (36)';
  const isMixed   = busType === 'AC Seater+Sleeper (8+32)';
  const isLower   = prefix === 'L';

  let html = '<div class="seat-grid-new">';
  html += driverIndicator();

  if (isSleeper) {
    // Both decks: 6 rows, Left 1 col (sleeper) | aisle | Right 2 cols (sleeper)
    // Seats: left = 1-6, right = 7-18 (rows: [7,8],[9,10],[11,12],[13,14],[15,16],[17,18])
    for (let row = 0; row < 6; row++) {
      const leftNum  = row + 1;           // 1-6
      const rightA   = 7 + row * 2;       // 7,9,11,13,15,17
      const rightB   = 8 + row * 2;       // 8,10,12,14,16,18
      html += `<div class="seat-row-new">`;
      html += seatBtn(prefix, leftNum, 'sleeper', true);
      html += `<div class="seat-aisle"></div>`;
      html += seatBtn(prefix, rightA,  'sleeper', true);
      html += seatBtn(prefix, rightB,  'sleeper', true);
      html += `</div>`;
    }

  } else if (isMixed && isLower) {
    // Lower: 6 left sleepers | 4 right seater rows | 4 right sleeper rows  (total 22 seats)
    const totalRows = 8; // 6 left rows, 8 right rows — left ends at row 6 with empty
    for (let row = 0; row < 8; row++) {
      const hasLeft  = row < 6;
      const leftNum  = row + 1;           // L1-L6 left sleepers
      const rightA   = 7  + row * 2;     // L7,L9,...,L21
      const rightB   = 8  + row * 2;     // L8,L10,...,L22
      const isSeater = row < 4;          // rows 0-3 = seater, rows 4-7 = sleeper
      const rightType = isSeater ? 'seater' : 'sleeper';

      html += `<div class="seat-row-new">`;
      if (hasLeft) {
        html += seatBtn(prefix, leftNum, 'sleeper', true);
      } else {
        html += `<div class="seat-empty"></div>`;
      }
      html += `<div class="seat-aisle"></div>`;
      html += seatBtn(prefix, rightA, rightType, !isSeater);
      html += seatBtn(prefix, rightB, rightType, !isSeater);
      html += `</div>`;

      // Separator between seaters and sleepers on right side
      if (row === 3) {
        html += `<div class="seat-type-separator"><span>— Sleeper section below —</span></div>`;
      }
    }

  } else if (isMixed && !isLower) {
    // Upper: 6 left sleepers | 6 right sleeper rows = 18 seats
    for (let row = 0; row < 6; row++) {
      const leftNum = row + 1;
      const rightA  = 7  + row * 2;
      const rightB  = 8  + row * 2;
      html += `<div class="seat-row-new">`;
      html += seatBtn(prefix, leftNum, 'sleeper', true);
      html += `<div class="seat-aisle"></div>`;
      html += seatBtn(prefix, rightA, 'sleeper', true);
      html += seatBtn(prefix, rightB, 'sleeper', true);
      html += `</div>`;
    }
  }

  html += '</div>';
  return html;
}

function driverIndicator() {
  return `<div class="driver-indicator">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
      <line x1="12" y1="2" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="22" y2="12"/>
    </svg> Driver
  </div>`;
}

function seatBtn(prefix, num, type, isSleeper) {
  const seatId   = `${prefix}${num}`;
  const isBooked = currentSchedule.bookedSeats?.includes(seatId);
  const isSel    = selectedSeats.includes(seatId);
  const price    = calculateSeatPriceForRoute(currentSchedule.origin, currentSchedule.destination, seatId, currentSchedule.type);

  let cls = `seat-new seat-type-${type}`;
  if (isBooked) cls += ' seat-booked';
  if (isSel)    cls += ' seat-selected';
  if (isSleeper) cls += ' seat-is-sleeper';

  return `
    <button class="${cls}" data-seat="${seatId}"
      ${isBooked ? 'disabled' : ''} onclick="toggleSeat('${seatId}')"
      title="${seatId} ${isSleeper ? '(Sleeper)' : '(Seater)'} — ₹${price}">
      <span class="seat-number">${seatId}</span>
      <span class="seat-icon">${isSleeper ? '💤' : '💺'}</span>
      ${!isBooked
        ? `<span class="seat-price">₹${price}</span>`
        : `<span class="sold-label">Sold</span>`}
    </button>`;
}

// ─────────────────────────────────────────
// TOGGLE SEAT
// ─────────────────────────────────────────
function toggleSeat(seatId) {
  if (currentSchedule.bookedSeats?.includes(seatId)) return;
  const idx = selectedSeats.indexOf(seatId);
  if (idx > -1) {
    selectedSeats.splice(idx, 1);
  } else {
    if (selectedSeats.length >= 6) { showToast('Maximum 6 seats allowed','warning'); return; }
    selectedSeats.push(seatId);
  }
  renderActiveDeck();
  updateSummary();
}

// ─────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────
function updateSummary() {
  const el = document.getElementById('booking-summary');
  if (!el) return;

  if (selectedSeats.length === 0) {
    el.innerHTML = `<div class="empty-selection">
      <p>No seats selected</p>
      <p class="text-muted">Switch decks and click seats to select</p>
    </div>`;
    return;
  }

  let total = 0;
  const details = selectedSeats.map(sid => {
    const price = calculateSeatPriceForRoute(currentSchedule.origin, currentSchedule.destination, sid, currentSchedule.type);
    total += price;
    const deck = sid.charAt(0) === 'L' ? 'Lower' : 'Upper';
    return { sid, price, deck };
  });

  el.innerHTML = `
    <h4 class="summary-subtitle">Selected Seats</h4>
    <div class="selected-seats-list">
      ${details.map(({ sid, price, deck }) => `
        <div class="selected-seat-item">
          <span class="seat-badge">${sid}<small style="font-weight:400;opacity:.7;margin-left:3px;">${deck}</small></span>
          <span class="seat-item-price">₹${price}</span>
          <button class="remove-seat-btn" onclick="toggleSeat('${sid}')" title="Remove">×</button>
        </div>`).join('')}
    </div>
    <div class="summary-divider"></div>
    <div class="total-section">
      <span class="total-label">Total Amount</span>
      <span class="total-amount">${formatCurrency(total)}</span>
    </div>
    <button class="btn btn-primary btn-lg btn-block" onclick="proceedToPayment()">
      Proceed to Payment →
    </button>`;
}

// ─────────────────────────────────────────
// PAYMENT
// ─────────────────────────────────────────
function proceedToPayment() {
  if (selectedSeats.length === 0) { showToast('Please select at least one seat','warning'); return; }
  let total = 0;
  selectedSeats.forEach(sid => {
    total += calculateSeatPriceForRoute(currentSchedule.origin, currentSchedule.destination, sid, currentSchedule.type);
  });
  navigateTo('payment.html', {
    scheduleId:  currentSchedule.id,
    seats:       selectedSeats.join(','),
    totalAmount: total
  });
}

document.addEventListener('DOMContentLoaded', initSeatsPage);