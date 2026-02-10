// ========================================
// SEATS.JS - Seat Selection Page Logic (NEW 7-ROW LAYOUT)
// Layout: Left side = 1 column (7 seats), Right side = 2 columns (13 seats)
// Total per deck: 20 seats
// ========================================

let currentSchedule = null;
let selectedSeats = [];

// Initialize seats page
function initSeatsPage() {
  const params = getQueryParams();
  const scheduleId = params.id;
  
  if (!scheduleId) {
    showToast('Invalid schedule', 'error');
    navigateTo('timings.html');
    return;
  }
  
  loadSchedule(scheduleId);
}

// Load schedule details
async function loadSchedule(scheduleId) {
  showLoading();
  currentSchedule = await getScheduleById(scheduleId);
  hideLoading();
  
  if (!currentSchedule) {
    showToast('Schedule not found', 'error');
    navigateTo('timings.html');
    return;
  }
  
  displayScheduleInfo();
  renderSeatLayout();
  updateSummary();
}

// Display schedule information
function displayScheduleInfo() {
  const scheduleInfo = document.getElementById('schedule-info');
  if (scheduleInfo) {
    scheduleInfo.innerHTML = `
      <h1 class="page-title">Select Seats</h1>
      <p class="schedule-subtitle">${currentSchedule.busName} • ${currentSchedule.type}</p>
    `;
  }
  
  // Update journey details sidebar
  const journeyDetails = document.getElementById('journey-details');
  if (journeyDetails) {
    journeyDetails.innerHTML = `
      <h3 class="summary-title">Journey Details</h3>
      
      <div class="detail-group">
        <label class="detail-label">Route</label>
        <div class="detail-value">${currentSchedule.origin} → ${currentSchedule.destination}</div>
      </div>
      
      <div class="detail-group">
        <label class="detail-label">Departure</label>
        <div class="detail-value">
          ${formatDate(currentSchedule.departureTime)} at ${formatTime(currentSchedule.departureTime)}
        </div>
      </div>
      
      <div class="detail-group">
        <label class="detail-label">Bus Type</label>
        <div class="detail-value">${currentSchedule.type}</div>
      </div>
    `;
  }
}

// Render seat layout
function renderSeatLayout() {
  const upperDeck = document.getElementById('upper-deck');
  const lowerDeck = document.getElementById('lower-deck');
  
  if (!upperDeck || !lowerDeck) return;
  
  // Clear existing
  upperDeck.innerHTML = '';
  lowerDeck.innerHTML = '';
  
  // Render upper deck (U1-U20)
  upperDeck.innerHTML = '<h4 class="deck-title">Upper Deck</h4>' + renderDeck('U');
  
  // Render lower deck (L1-L20)
  lowerDeck.innerHTML = '<h4 class="deck-title">Lower Deck</h4>' + renderDeck('L');
}

// Render a single deck with new 7-row layout
// Layout: Left (1 column x 7 rows) | Aisle | Right (2 columns x 7 rows)
// Seat mapping:
// Left column: 1, 2, 3, 4, 5, 6, 7
// Right columns: 8-9, 10-11, 12-13, 14-15, 16-17, 18-19, 20
function renderDeck(prefix) {
  let html = '<div class="seat-grid-7row">';
  
  // Add driver position indicator at the start with steering wheel icon
  html += '<div class="driver-indicator"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="2" x2="12" y2="9"></line><line x1="12" y1="15" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"></line><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="9" y2="12"></line><line x1="15" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"></line><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"></line></svg> Driver</div>';
  
  // Define seat zones for pricing
  const seatZones = {
    // Left column (1-7) - Standard
    1: 'first-left', 2: 'first-left', 3: 'first-left', 
    4: 'first-left', 5: 'first-left', 6: 'first-left', 
    7: 'last-left',
    
    // Right columns (8-20)
    8: 'first-right', 9: 'first-right',
    10: 'first-right', 11: 'first-right',
    12: 'first-right', 13: 'first-right',
    14: 'first-right', 15: 'first-right',
    16: 'first-right', 17: 'first-right',
    18: 'first-right', 19: 'first-right',
    20: 'sleeper'
  };
  
  // Row 1: Seat 1 | 8, 9
  html += '<div class="seat-row-7">';
  html += createSeatButton(prefix, 1, seatZones[1]);
  html += '<div class="seat-aisle"></div>';
  html += createSeatButton(prefix, 8, seatZones[8]);
  html += createSeatButton(prefix, 9, seatZones[9]);
  html += '</div>';
  
  // Row 2: Seat 2 | 10, 11
  html += '<div class="seat-row-7">';
  html += createSeatButton(prefix, 2, seatZones[2]);
  html += '<div class="seat-aisle"></div>';
  html += createSeatButton(prefix, 10, seatZones[10]);
  html += createSeatButton(prefix, 11, seatZones[11]);
  html += '</div>';
  
  // Row 3: Seat 3 | 12, 13
  html += '<div class="seat-row-7">';
  html += createSeatButton(prefix, 3, seatZones[3]);
  html += '<div class="seat-aisle"></div>';
  html += createSeatButton(prefix, 12, seatZones[12]);
  html += createSeatButton(prefix, 13, seatZones[13]);
  html += '</div>';
  
  // Row 4: Seat 4 | 14, 15
  html += '<div class="seat-row-7">';
  html += createSeatButton(prefix, 4, seatZones[4]);
  html += '<div class="seat-aisle"></div>';
  html += createSeatButton(prefix, 14, seatZones[14]);
  html += createSeatButton(prefix, 15, seatZones[15]);
  html += '</div>';
  
  // Row 5: Seat 5 | 16, 17
  html += '<div class="seat-row-7">';
  html += createSeatButton(prefix, 5, seatZones[5]);
  html += '<div class="seat-aisle"></div>';
  html += createSeatButton(prefix, 16, seatZones[16]);
  html += createSeatButton(prefix, 17, seatZones[17]);
  html += '</div>';
  
  // Row 6: Seat 6 | 18, 19
  html += '<div class="seat-row-7">';
  html += createSeatButton(prefix, 6, seatZones[6]);
  html += '<div class="seat-aisle"></div>';
  html += createSeatButton(prefix, 18, seatZones[18]);
  html += createSeatButton(prefix, 19, seatZones[19]);
  html += '</div>';
  
  // Row 7: Seat 7 (last-left) | 20 (sleeper - spans 2 columns)
  html += '<div class="seat-row-7 seat-row-7-last">';
  html += createSeatButton(prefix, 7, seatZones[7]);
  html += '<div class="seat-aisle"></div>';
  html += createSeatButton(prefix, 20, seatZones[20], true);
  html += '</div>';
  
  html += '</div>';
  return html;
}

// Create individual seat button with zone-based pricing
function createSeatButton(prefix, number, zone, isSleeper = false) {
  const seatId = `${prefix}${number}`;
  const isBooked = currentSchedule.bookedSeats?.includes(seatId);
  const isSelected = selectedSeats.includes(seatId);
  const seatPrice = calculateSeatPriceByZone(currentSchedule.price, zone);
  
  let className = 'seat-new';
  if (isBooked) className += ' seat-booked';
  if (isSelected) className += ' seat-selected';
  if (isSleeper) className += ' seat-sleeper';
  
  // Add zone-specific styling
  className += ` zone-${zone}`;
  
  return `
    <button 
      class="${className}" 
      data-seat="${seatId}"
      data-zone="${zone}"
      ${isBooked ? 'disabled' : ''}
      onclick="toggleSeat('${seatId}')"
      title="${seatId}${isSleeper ? ' (Sleeper)' : ''} - ${formatCurrency(seatPrice)}"
    >
      <span class="seat-number">${seatId}</span>
      ${isSleeper ? '<span class="seat-type">💤</span>' : ''}
      ${!isBooked ? `<span class="seat-price">${formatCurrency(seatPrice)}</span>` : '<span class="sold-label">Sold</span>'}
    </button>
  `;
}

// Calculate seat price based on zone
function calculateSeatPriceByZone(basePrice, zone) {
  const pricing = getSeatPricing();
  
  switch(zone) {
    case 'first-right':
      return pricing.firstRight;
    case 'first-left':
      return pricing.firstLeft;
    case 'last-left':
      return pricing.lastLeft;
    case 'sleeper':
      return pricing.sleeper;
    default:
      return basePrice; // fallback to base price
  }
}

// Toggle seat selection
function toggleSeat(seatId) {
  const isBooked = currentSchedule.bookedSeats?.includes(seatId);
  if (isBooked) return;
  
  const index = selectedSeats.indexOf(seatId);
  if (index > -1) {
    selectedSeats.splice(index, 1);
  } else {
    // Limit to max 6 seats
    if (selectedSeats.length >= 6) {
      showToast('Maximum 6 seats can be selected', 'warning');
      return;
    }
    selectedSeats.push(seatId);
  }
  
  // Update UI
  renderSeatLayout();
  updateSummary();
}

// Get zone for a seat number (helper function)
function getSeatZoneByNumber(seatNumber) {
  const num = parseInt(seatNumber.substring(1));
  
  const seatZones = {
    1: 'first-left', 2: 'first-left', 3: 'first-left', 
    4: 'first-left', 5: 'first-left', 6: 'first-left', 
    7: 'last-left',
    8: 'first-right', 9: 'first-right',
    10: 'first-right', 11: 'first-right',
    12: 'first-right', 13: 'first-right',
    14: 'first-right', 15: 'first-right',
    16: 'first-right', 17: 'first-right',
    18: 'first-right', 19: 'first-right',
    20: 'sleeper'
  };
  
  return seatZones[num] || 'first-left';
}

// Update booking summary
function updateSummary() {
  const summarySection = document.getElementById('booking-summary');
  if (!summarySection) return;
  
  if (selectedSeats.length === 0) {
    summarySection.innerHTML = `
      <div class="empty-selection">
        <p>No seats selected</p>
        <p class="text-muted">Click on available seats to select</p>
      </div>
    `;
    return;
  }
  
  // Calculate total amount
  let totalAmount = 0;
  const seatDetails = [];
  
  selectedSeats.forEach(seatId => {
    const zone = getSeatZoneByNumber(seatId);
    const price = calculateSeatPriceByZone(currentSchedule.price, zone);
    totalAmount += price;
    seatDetails.push({ seatId, price, zone });
  });
  
  summarySection.innerHTML = `
    <h4 class="summary-subtitle">Selected Seats</h4>
    <div class="selected-seats-list">
      ${seatDetails.map(({ seatId, price, zone }) => `
        <div class="selected-seat-item">
          <span class="seat-badge zone-${zone}">${seatId}</span>
          <span class="seat-item-price">${formatCurrency(price)}</span>
          <button class="remove-seat-btn" onclick="toggleSeat('${seatId}')" title="Remove">×</button>
        </div>
      `).join('')}
    </div>
    
    <div class="summary-divider"></div>
    
    <div class="total-section">
      <span class="total-label">Total Amount</span>
      <span class="total-amount">${formatCurrency(totalAmount)}</span>
    </div>
    
    <button class="btn btn-primary btn-lg btn-block" onclick="proceedToPayment()">
      Proceed to Payment
    </button>
  `;
}

// Proceed to payment
function proceedToPayment() {
  if (selectedSeats.length === 0) {
    showToast('Please select at least one seat', 'warning');
    return;
  }
  
  // Calculate total amount
  let totalAmount = 0;
  selectedSeats.forEach(seatId => {
    const zone = getSeatZoneByNumber(seatId);
    totalAmount += calculateSeatPriceByZone(currentSchedule.price, zone);
  });
  
  navigateTo('payment.html', {
    scheduleId: currentSchedule.id,
    seats: selectedSeats.join(','),
    totalAmount: totalAmount
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initSeatsPage);