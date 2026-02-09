// ========================================
// PAYMENT.JS - Payment & Confirmation Page Logic
// ========================================

let bookingDetails = null;
let confirmedBooking = null;

// Initialize payment page
async function initPaymentPage() {
  const params = getQueryParams();
  
  if (!params.scheduleId || !params.seats || !params.totalAmount) {
    showToast('Invalid booking details', 'error');
    navigateTo('index.html');
    return;
  }
  
  bookingDetails = {
    scheduleId: params.scheduleId,
    seatNumbers: params.seats.split(','),
    totalAmount: parseInt(params.totalAmount)
  };
  
  showLoading();
  const schedule = await getScheduleById(bookingDetails.scheduleId);
  hideLoading();
  
  if (!schedule) {
    showToast('Schedule not found', 'error');
    navigateTo('timings.html');
    return;
  }
  
  displayBookingSummary(schedule);
  setupPaymentForm();
}

// Display booking summary
function displayBookingSummary(schedule) {
  const summarySection = document.getElementById('booking-summary-section');
  if (!summarySection) return;
  
  summarySection.innerHTML = `
    <div class="summary-card">
      <h3 class="summary-title">Booking Summary</h3>
      
      <div class="summary-details">
        <div class="detail-row">
          <span class="detail-label">Bus</span>
          <span class="detail-value">${schedule.busName}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Route</span>
          <span class="detail-value">${schedule.origin} → ${schedule.destination}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Departure</span>
          <span class="detail-value">${formatDate(schedule.departureTime)} at ${formatTime(schedule.departureTime)}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Selected Seats</span>
          <span class="detail-value">
            ${bookingDetails.seatNumbers.map(seat => 
              `<span class="seat-badge">${seat}</span>`
            ).join(' ')}
          </span>
        </div>
        
        <div class="detail-row breakdown">
          <span class="detail-label">Seat Breakdown</span>
          <div class="breakdown-items">
            ${bookingDetails.seatNumbers.map(seat => {
              const price = calculateSeatPrice(schedule.price, seat);
              return `
                <div class="breakdown-item">
                  <span>${seat}</span>
                  <span>${formatCurrency(price)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <div class="summary-divider"></div>
        
        <div class="detail-row total">
          <span class="detail-label">Total Amount</span>
          <span class="detail-value total-amount">${formatCurrency(bookingDetails.totalAmount)}</span>
        </div>
      </div>
    </div>
  `;
}

// Setup payment form
function setupPaymentForm() {
  const form = document.getElementById('payment-form');
  if (!form) return;
  
  form.addEventListener('submit', handlePaymentSubmit);
  
  // Auto-format phone number
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').substring(0, 10);
    });
  }
}

// Handle payment form submission
function handlePaymentSubmit(e) {
  e.preventDefault();
  
  if (!validateForm('payment-form')) {
    return;
  }
  
  // Collect form data
  const formData = {
    customerName: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    ...bookingDetails
  };
  
  // Show loading
  showLoading();
  
  // Simulate payment processing
  setTimeout(() => {
    processBooking(formData);
  }, 1500);
}

// Process booking
async function processBooking(formData) {
  const result = await createBooking(formData);
  
  hideLoading();
  
  if (result.error) {
    showToast(result.error, 'error');
    if (result.unavailableSeats) {
      showToast(`Seats ${result.unavailableSeats.join(', ')} are no longer available`, 'error');
      setTimeout(() => {
        navigateTo('seats.html', { id: formData.scheduleId });
      }, 2000);
    }
    return;
  }
  
  // Success!
  confirmedBooking = result;
  displayConfirmation();
  
  // Send confirmation email (simulated)
  sendConfirmationEmail(result);
}

// Display confirmation
function displayConfirmation() {
  const formContainer = document.getElementById('payment-form-container');
  const confirmationContainer = document.getElementById('confirmation-container');
  
  if (formContainer) formContainer.style.display = 'none';
  if (confirmationContainer) {
    confirmationContainer.style.display = 'block';
    renderConfirmation();
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Show success message
  showToast('Booking confirmed successfully!', 'success');
}

// Render confirmation details
async function renderConfirmation() {
  const confirmationContainer = document.getElementById('confirmation-container');
  if (!confirmationContainer || !confirmedBooking) return;
  
  // Get schedule details (might be populated or need fetching)
  let schedule = confirmedBooking.scheduleId;
  if (typeof schedule === 'string') {
    showLoading();
    schedule = await getScheduleById(schedule);
    hideLoading();
  }
  
  if (!schedule) {
    showToast('Error loading booking details', 'error');
    return;
  }
  
  confirmationContainer.innerHTML = `
    <div class="confirmation-success">
      <div class="success-icon">✓</div>
      <h2 class="success-title">Booking Confirmed!</h2>
      <p class="success-message">Your tickets have been booked successfully</p>
    </div>
    
    <div class="ticket-card" id="ticket-details">
      <div class="ticket-header">
        <h3>Shree Ram Travels</h3>
        <div class="ticket-token">
          <span class="token-label">Booking Token</span>
          <span class="token-value" id="booking-token">${confirmedBooking.bookingToken}</span>
          <button class="btn-icon" onclick="copyToken()" title="Copy Token">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="ticket-body">
        <div class="ticket-section">
          <div class="ticket-row">
            <div class="ticket-field">
              <span class="field-label">Passenger</span>
              <span class="field-value">${confirmedBooking.customerName}</span>
            </div>
            <div class="ticket-field">
              <span class="field-label">Phone</span>
              <span class="field-value">${confirmedBooking.phone}</span>
            </div>
          </div>
          
          <div class="ticket-row">
            <div class="ticket-field">
              <span class="field-label">Email</span>
              <span class="field-value">${confirmedBooking.email}</span>
            </div>
          </div>
        </div>
        
        <div class="ticket-divider"></div>
        
        <div class="ticket-section">
          <div class="ticket-row">
            <div class="ticket-field">
              <span class="field-label">Bus</span>
              <span class="field-value">${schedule.busName} (${schedule.type})</span>
            </div>
          </div>
          
          <div class="ticket-row">
            <div class="ticket-field">
              <span class="field-label">From</span>
              <span class="field-value">${schedule.origin}</span>
            </div>
            <div class="ticket-field">
              <span class="field-label">To</span>
              <span class="field-value">${schedule.destination}</span>
            </div>
          </div>
          
          <div class="ticket-row">
            <div class="ticket-field">
              <span class="field-label">Departure</span>
              <span class="field-value">${formatDate(schedule.departureTime)}</span>
            </div>
            <div class="ticket-field">
              <span class="field-label">Time</span>
              <span class="field-value">${formatTime(schedule.departureTime)}</span>
            </div>
          </div>
          
          <div class="ticket-row">
            <div class="ticket-field">
              <span class="field-label">Seats</span>
              <span class="field-value seats-value">
                ${confirmedBooking.seatNumbers.map(seat => 
                  `<span class="seat-badge">${seat}</span>`
                ).join(' ')}
              </span>
            </div>
            <div class="ticket-field">
              <span class="field-label">Amount</span>
              <span class="field-value amount-value">${formatCurrency(confirmedBooking.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="ticket-footer">
        <p class="ticket-note">Please arrive 15 minutes before departure time</p>
        <p class="ticket-note">Carry a valid ID proof for verification</p>
      </div>
    </div>
    
    <div class="confirmation-actions">
      <button class="btn btn-primary" onclick="downloadTicketPDF()">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download Ticket
      </button>
      
      <button class="btn btn-secondary" onclick="shareBookingDetails()">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
        Share
      </button>
      
      <button class="btn btn-outline" onclick="navigateTo('index.html')">
        Book Another Ticket
      </button>
    </div>
  `;
}

// Copy booking token
function copyToken() {
  const token = document.getElementById('booking-token');
  if (token) {
    copyToClipboard(token.textContent);
  }
}

// Download ticket as PDF (using print)
function downloadTicketPDF() {
  window.print();
}

// Share booking details
function shareBookingDetails() {
  if (confirmedBooking) {
    shareBooking(confirmedBooking);
  }
}

// Send confirmation email (simulated)
function sendConfirmationEmail(booking) {
  console.log('Sending confirmation email to:', booking.email);
  console.log('Booking details:', booking);
  
  // In a real app, this would call an API to send email
  // For demo purposes, we'll just log it
  setTimeout(() => {
    showToast('Confirmation email sent!', 'info');
  }, 1000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPaymentPage);

// Print styles for ticket
window.addEventListener('beforeprint', () => {
  document.body.classList.add('printing');
});

window.addEventListener('afterprint', () => {
  document.body.classList.remove('printing');
});
