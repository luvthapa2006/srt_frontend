// ========================================
// SEATS.JS - Seat Selection Page Logic
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


// Render a single deck with proper 2-1-2-1 layout (8 rows of 5 seats = 20 seats per deck)
function renderDeck(prefix, start, end) {
  let html = '<div class="seat-grid">';
  
  // Add driver position indicator at the start
  html += '<div class="driver-indicator">🚗 Driver</div>';
  
  // 4 rows of 5 seats each (2 left, 1 aisle, 2 middle, 1 right)
  // Total: 4 rows × 5 positions = 20 seats per deck
  for (let row = 0; row < 4; row++) {
    html += '<div class="seat-row">';
    
    // First Left (2 seats) - Positions 1,2
    for (let col = 0; col < 2; col++) {
      const seatNum = row * 5 + col + 1;
      if (seatNum <= (end - start + 1)) {
        html += createSeatButton(prefix, seatNum);
      }
    }
    
    // Aisle
    html += '<div class="seat-aisle"></div>';
    
    // First Right (2 seats) - Positions 3,4
    for (let col = 2; col < 4; col++) {
      const seatNum = row * 5 + col + 1;
      if (seatNum <= (end - start + 1)) {
        html += createSeatButton(prefix, seatNum);
      }
    }
    
    // Last position (sleeper or 7th seat) - Position 5
    const seatNum = row * 5 + 5;
    if (seatNum <= (end - start + 1)) {
      const isSleeper = (seatNum === 5 || seatNum === 10); // Rows 1-2 are sleepers
      html += createSeatButton(prefix, seatNum, isSleeper);
    }
    
    html += '</div>';
  }
  
  html += '</div>';
  return html;
}

// Create individual seat button
function createSeatButton(prefix, number, isSleeper = false) {
  const seatId = `${prefix}${number}`;
  const isBooked = currentSchedule.bookedSeats?.includes(seatId);
  const isSelected = selectedSeats.includes(seatId);
  const seatPrice = calculateSeatPrice(currentSchedule.price, seatId);
  
  let className = 'seat';
  if (isBooked) className += ' seat-booked';
  if (isSelected) className += ' seat-selected';
  if (isSleeper) className += ' seat-sleeper'; // Add sleeper styling
  
  // Determine zone color
  if (seatPricingZones.firstRight.includes(seatId) || 
      seatPricingZones.firstRight_L.includes(seatId)) {
    className += ' zone-first-right';
  } else if (seatPricingZones.lastRightSleeper.includes(seatId) || 
             seatPricingZones.lastRightSleeper_L.includes(seatId)) {
    className += ' zone-sleeper';
  } else if (seatPricingZones.lastLeft7th.includes(seatId) || 
             seatPricingZones.lastLeft7th_L.includes(seatId)) {
    className += ' zone-last-left';
  }
  
  return `
    <button 
      class="${className}" 
      data-seat="${seatId}"
      ${isBooked ? 'disabled' : ''}
      onclick="toggleSeat('${seatId}')"
      title="${seatId}${isSleeper ? ' (Sleeper)' : ''} - ${formatCurrency(seatPrice)}"
    >
      <span class="seat-number">${seatId}</span>
      ${isSleeper ? '<span class="seat-type">💤</span>' : ''}
      ${!isBooked ? `<span class="seat-price">${formatCurrency(seatPrice)}</span>` : ''}
    </button>
  `;
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
  selectedSeats.forEach(seat => {
    totalAmount += calculateSeatPrice(currentSchedule.price, seat);
  });
  
  summarySection.innerHTML = `
    <h4 class="summary-subtitle">Selected Seats</h4>
    <div class="selected-seats-list">
      ${selectedSeats.map(seat => {
        const price = calculateSeatPrice(currentSchedule.price, seat);
        return `
          <div class="selected-seat-item">
            <span class="seat-badge">${seat}</span>
            <span class="seat-item-price">${formatCurrency(price)}</span>
            <button class="remove-seat-btn" onclick="toggleSeat('${seat}')" title="Remove">×</button>
          </div>
        `;
      }).join('')}
    </div>
    
    <div class="summary-divider"></div>
    
    <div class="total-section">
      <span class="total-label">Total Amount</span>
      <span class="total-amount">${formatCurrency(totalAmount)}</span>
    </div>
    
    <button class="btn btn-primary btn-lg btn-block" onclick="proceedToPayment()">
      Proceed to Payment
    </button>
    
    <p class="summary-note">* Final amount may vary based on selected seats</p>
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
  selectedSeats.forEach(seat => {
    totalAmount += calculateSeatPrice(currentSchedule.price, seat);
  });
  
  navigateTo('payment.html', {
    scheduleId: currentSchedule.id,
    seats: selectedSeats.join(','),
    totalAmount: totalAmount
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initSeatsPage);
