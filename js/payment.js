// ========================================
// PAYMENT.JS - Payment & Confirmation Page Logic with Paytm Integration
// ========================================

let bookingDetails = null;
let confirmedBooking = null;
let paytmConfig = null;

// Initialize payment page
async function initPaymentPage() {
  const params = getQueryParams();
  
  // Check if returning from Paytm
  if (params.status) {
    handlePaymentCallback(params);
    return;
  }
  
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
  
  // Load Paytm configuration
  await loadPaytmConfig();
  
  hideLoading();
  
  if (!schedule) {
    showToast('Schedule not found', 'error');
    navigateTo('timings.html');
    return;
  }
  
  displayBookingSummary(schedule);
  setupPaymentForm();
}

// Load Paytm configuration from backend
async function loadPaytmConfig() {
  try {
    const response = await fetch(`${API_BASE_URL}/paytm/config`);
    const result = await response.json();
    
    if (result.success) {
      paytmConfig = result.data;
      console.log('✅ Paytm config loaded:', paytmConfig);
    }
  } catch (error) {
    console.error('❌ Error loading Paytm config:', error);
  }
}

// Handle payment callback from Paytm
function handlePaymentCallback(params) {
  const formContainer = document.getElementById('payment-form-container');
  const confirmationContainer = document.getElementById('confirmation-container');
  
  if (formContainer) formContainer.style.display = 'none';
  if (confirmationContainer) confirmationContainer.style.display = 'block';
  
  if (params.status === 'success') {
    showPaymentSuccess(params);
  } else if (params.status === 'failed') {
    showPaymentFailed(params);
  } else {
    showPaymentError(params);
  }
}

// Display payment success
function showPaymentSuccess(params) {
  const confirmationContainer = document.getElementById('confirmation-container');
  if (!confirmationContainer) return;
  
  confirmationContainer.innerHTML = `
    <div class="confirmation-success">
      <div class="success-icon">✓</div>
      <h2 class="success-title">Payment Successful!</h2>
      <p class="success-message">Your payment has been processed successfully</p>
    </div>
    
    <div class="ticket-card">
      <div class="ticket-header">
        <h3>Transaction Details</h3>
      </div>
      <div class="ticket-body">
        <div class="ticket-section">
          <div class="ticket-row">
            <div class="ticket-field">
              <span class="field-label">Order ID</span>
              <span class="field-value">${params.orderId || 'N/A'}</span>
            </div>
            <div class="ticket-field">
              <span class="field-label">Transaction ID</span>
              <span class="field-value">${params.txnId || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="confirmation-actions">
      <button class="btn btn-primary" onclick="navigateTo('index.html')">
        Back to Home
      </button>
    </div>
  `;
  
  showToast('Payment successful!', 'success');
}

// Display payment failed
function showPaymentFailed(params) {
  const confirmationContainer = document.getElementById('confirmation-container');
  if (!confirmationContainer) return;
  
  const message = decodeURIComponent(params.message || 'Payment failed');
  
  confirmationContainer.innerHTML = `
    <div style="background: #FEE2E2; border: 2px solid #EF4444; border-radius: 1rem; padding: 2rem; text-align: center;">
      <div style="font-size: 4rem; color: #DC2626; margin-bottom: 1rem;">✗</div>
      <h2 style="color: #991B1B; font-size: 1.75rem; margin-bottom: 0.5rem;">Payment Failed</h2>
      <p style="color: #7F1D1D; margin-bottom: 1.5rem;">${message}</p>
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button class="btn btn-primary" onclick="history.back()">
          Try Again
        </button>
        <button class="btn btn-outline" onclick="navigateTo('index.html')">
          Go to Home
        </button>
      </div>
    </div>
  `;
  
  showToast('Payment failed', 'error');
}

// Display payment error
function showPaymentError(params) {
  const confirmationContainer = document.getElementById('confirmation-container');
  if (!confirmationContainer) return;
  
  const message = decodeURIComponent(params.message || 'An error occurred');
  
  confirmationContainer.innerHTML = `
    <div style="background: #FEF3C7; border: 2px solid #F59E0B; border-radius: 1rem; padding: 2rem; text-align: center;">
      <div style="font-size: 4rem; color: #D97706; margin-bottom: 1rem;">⚠</div>
      <h2 style="color: #92400E; font-size: 1.75rem; margin-bottom: 0.5rem;">Payment Error</h2>
      <p style="color: #78350F; margin-bottom: 1.5rem;">${message}</p>
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button class="btn btn-primary" onclick="history.back()">
          Try Again
        </button>
        <button class="btn btn-outline" onclick="navigateTo('index.html')">
          Go to Home
        </button>
      </div>
    </div>
  `;
  
  showToast('Payment error occurred', 'error');
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

// Handle payment form submission - Initiate Paytm payment
async function handlePaymentSubmit(e) {
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
  
  try {
    // Initiate Paytm payment
    const response = await fetch(`${API_BASE_URL}/paytm/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    hideLoading();
    
    if (!result.success) {
      showToast(result.message || 'Failed to initiate payment', 'error');
      if (result.unavailableSeats) {
        showToast(`Seats ${result.unavailableSeats.join(', ')} are no longer available`, 'error');
        setTimeout(() => {
          navigateTo('seats.html', { id: formData.scheduleId });
        }, 2000);
      }
      return;
    }
    
    console.log('✅ Payment initiated:', result.data);
    
    // Store pending booking data in session storage
    sessionStorage.setItem('pendingBooking', JSON.stringify(result.data.pendingBooking));
    
    // Redirect to Paytm payment page
    initiatePaytmPayment(result.data);
    
  } catch (error) {
    console.error('❌ Error initiating payment:', error);
    hideLoading();
    showToast('Failed to initiate payment. Please try again.', 'error');
  }
}

// Initiate Paytm payment by creating a form and submitting
function initiatePaytmPayment(paymentData) {
  const { paytmParams, paytmUrl } = paymentData;
  
  console.log('🚀 Redirecting to Paytm payment page...');
  console.log('Paytm URL:', paytmUrl);
  console.log('Paytm Params:', paytmParams);
  
  // Create a form dynamically
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paytmUrl;
  form.style.display = 'none';
  
  // Add all parameters as hidden fields
  Object.keys(paytmParams).forEach(key => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = paytmParams[key];
    form.appendChild(input);
  });
  
  // Add form to body and submit
  document.body.appendChild(form);
  
  // Show message to user
  showToast('Redirecting to Paytm payment gateway...', 'info');
  
  // Submit form after a short delay
  setTimeout(() => {
    form.submit();
  }, 500);
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initPaymentPage);

// Print styles for ticket
window.addEventListener('beforeprint', () => {
  document.body.classList.add('printing');
});

window.addEventListener('afterprint', () => {
  document.body.classList.remove('printing');
});