// ========================================
// SEATS.JS - Seat Selection Page Logic (NEW LAYOUT)
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
  upperDeck.innerHTML = '<h4 class="deck-title">Upper Deck</h4>' + renderDeck('U', 1, 20);
  
  // Render lower deck (L1-L20)
  lowerDeck.innerHTML = '<h4 class="deck-title">Lower Deck</h4>' + renderDeck('L', 1, 20);
}

// Render a single deck with new layout
// Layout: 2x6 seats on left, 2x6 seats on right, 1 seat at position 15 & 20, and 2 sleeper seats at 5 & 10
function renderDeck(prefix, start, end) {
  let html = '<div class="seat-grid-new">';
  
  // Add driver position indicator at the start
  html += '<div class="driver-indicator">🚗 Driver</div>';
  
  // Row 1: U1, U2 | U3, U4 | U5 (sleeper)
  html += '<div class="seat-row-new">';
  html += createSeatButton(prefix, 1, 'first-left');
  html += createSeatButton(prefix, 2, 'first-left');
  html += '<div class="seat-aisle"></div>';
  html += createSeatButton(prefix, 3, 'first-right');
  html += createSeatButton(prefix, 4, 'first-right');
  html += '<div class="seat-aisle"></div>';
  html += createSeatButton(prefix, 5, 'sleeper', true);
  html += '</div>';
  
  // Row 2: U6, U7 | U8, U9 | U10 (sleeper)
  html += '<div class="seat-row-new">';
  html += createSeatButton(prefix, 6, 'first-left');
  html += createSeatButton(prefix, 7, 'first-left');
  html += '<div class="seat-aisle"></div>';
  html += createSeatButton(prefix, 8, 'first-right');
  html += createSeatButton(prefix, 9, 'first-right');
  html += '<div class="seat-aisle"></div>';
  html += createSeatButton(prefix, 10, 'sleeper', true);
  html += '</div>';
  
  // Row 3: U11, U12 | U13, U14 | U15 (last left)
  html += '<div class="seat-row-new">';
  html += createSeatButton(prefix, 11, 'first-left');
  html += createSeatButton(prefix, 12, 'first-left');
  html += '<div class="seat-aisle"></div>';
  html += createSeatButton(prefix, 13, 'first-right');
  html += createSeatButton(prefix, 14, 'first-right');
  html += '<div class="seat-aisle"></div>';
  html += createSeatButton(prefix, 15, 'last-left');
  html += '</div>';
  
  // Row 4: U16, U17 | U18, U19 | U20 (last left)
  html += '<div class="seat-row-new">';
  html += createSeatButton(prefix, 16, 'first-left');
  html += createSeatButton(prefix, 17, 'first-left');
  html += '<div class="seat-aisle"></div>';
  html += createSeatButton(prefix, 18, 'first-right');
  html += createSeatButton(prefix, 19, 'first-right');
  html += '<div class="seat-aisle"></div>';
  html += createSeatButton(prefix, 20, 'last-left');
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
    // Determine zone based on seat number
    const seatNum = parseInt(seatId.substring(1));
    let zone = 'first-left';
    
    if ([5, 10].includes(seatNum)) {
      zone = 'sleeper';
    } else if ([15, 20].includes(seatNum)) {
      zone = 'last-left';
    } else if ([3, 4, 8, 9, 13, 14, 18, 19].includes(seatNum)) {
      zone = 'first-right';
    }
    
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
    const seatNum = parseInt(seatId.substring(1));
    let zone = 'first-left';
    
    if ([5, 10].includes(seatNum)) {
      zone = 'sleeper';
    } else if ([15, 20].includes(seatNum)) {
      zone = 'last-left';
    } else if ([3, 4, 8, 9, 13, 14, 18, 19].includes(seatNum)) {
      zone = 'first-right';
    }
    
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