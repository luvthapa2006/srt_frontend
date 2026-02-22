// ========================================
// SEATS.JS  –  Seat Selection Page
// Layout fix: flex rows, explicit seat widths, no merging
// Pill slider centered
// ========================================

let currentSchedule = null;
let selectedSeats   = [];
let activeDeck      = "lower";

/* ── Init ── */
function initSeatsPage() {
  const params = getQueryParams();
  if (!params.id) { showToast("Invalid schedule","error"); navigateTo("timings.html"); return; }
  loadSchedule(params.id);
}

async function loadSchedule(id) {
  showLoading();
  currentSchedule = await getScheduleById(id);
  hideLoading();
  if (!currentSchedule) { showToast("Schedule not found","error"); navigateTo("timings.html"); return; }
  displayScheduleInfo();
  buildDeckUI();
  renderActiveDeck();
  updateSummary();
}

/* ── Schedule header ── */
function displayScheduleInfo() {
  const info = document.getElementById("schedule-info");
  if (info) info.innerHTML =
    '<h1 class="page-title">Select Seats</h1>' +
    '<p class="schedule-subtitle">' + currentSchedule.busName + ' &bull; ' + currentSchedule.type + '</p>';

  const jd = document.getElementById("journey-details");
  if (jd) jd.innerHTML =
    '<h3 class="summary-title">Journey Details</h3>' +
    '<div class="detail-group"><label class="detail-label">Route</label>' +
    '<div class="detail-value">' + currentSchedule.origin + ' &rarr; ' + currentSchedule.destination + '</div></div>' +
    '<div class="detail-group"><label class="detail-label">Departure</label>' +
    '<div class="detail-value">' + formatDate(currentSchedule.departureTime) + ' at ' + formatTime(currentSchedule.departureTime) + '</div></div>' +
    '<div class="detail-group"><label class="detail-label">Bus Type</label>' +
    '<div class="detail-value">' + currentSchedule.type + '</div></div>';
}

/* ── Inject styles once ── */
function injectStyles() {
  if (document.getElementById("srt-seat-css")) return;
  const el = document.createElement("style");
  el.id = "srt-seat-css";
  el.textContent = [
    /* pill slider */
    ".srt-slider-wrap{display:flex;justify-content:center;margin:0 0 1.6rem}",
    ".srt-slider{display:inline-flex;background:#f1f5f9;border-radius:999px;padding:5px;gap:4px;",
      "box-shadow:inset 0 2px 6px rgba(0,0,0,.12)}",
    ".srt-tab{padding:.55rem 2rem;border-radius:999px;border:none;background:transparent;",
      "font-size:.88rem;font-weight:600;color:#64748b;cursor:pointer;transition:all .2s;white-space:nowrap}",
    ".srt-tab.active{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;",
      "box-shadow:0 3px 14px rgba(102,126,234,.45)}",
    /* legend */
    ".srt-legend{display:flex;gap:1.2rem;justify-content:center;flex-wrap:wrap;margin-bottom:1.4rem}",
    ".srt-li{display:flex;align-items:center;gap:.35rem;font-size:.76rem;color:#475569}",
    ".srt-swatch{width:15px;height:15px;border-radius:4px;border:2px solid;flex-shrink:0}",
    ".sw-sl{background:#fff;border-color:#94a3b8}",
    ".sw-se{background:#f0fdf4;border-color:#86efac}",
    ".sw-ok{background:linear-gradient(135deg,#667eea,#764ba2);border-color:#4f46e5}",
    ".sw-bk{background:#f1f5f9;border-color:#cbd5e1;opacity:.55}",
    /* bus shell */
    ".srt-bus{background:#f8fafc;border:2px solid #e2e8f0;border-radius:18px;",
      "padding:1.1rem 1.3rem 1.5rem;max-width:380px;margin:0 auto}",
    /* driver */
    ".srt-driver{display:flex;align-items:center;justify-content:center;gap:.45rem;",
      "background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:9px;",
      "padding:.48rem .9rem;font-size:.72rem;font-weight:700;letter-spacing:.7px;",
      "text-transform:uppercase;margin-bottom:1rem}",
    /* seat ROW  –  flex so seats never collapse */
    ".srt-row{display:flex;flex-direction:row;align-items:stretch;gap:6px;margin-bottom:6px}",
    ".srt-aisle{width:22px;flex-shrink:0}",
    /* seat button base */
    ".srt-seat{flex-shrink:0;width:80px;display:flex;flex-direction:column;align-items:center;",
      "justify-content:center;gap:3px;border:2px solid #cbd5e1;border-radius:10px;",
      "background:#fff;cursor:pointer;transition:all .17s;padding:5px 3px;box-sizing:border-box}",
    ".srt-seat:hover:not(:disabled){border-color:#667eea;background:#eef2ff;",
      "transform:translateY(-2px);box-shadow:0 4px 10px rgba(102,126,234,.22)}",
    ".srt-seat:disabled{cursor:not-allowed}",
    /* sleeper = tall rectangle */
    ".srt-seat.sl{min-height:90px;border-radius:12px}",
    /* seater = shorter square, green */
    ".srt-seat.se{min-height:66px;background:#f0fdf4;border-color:#86efac}",
    ".srt-seat.se:hover:not(:disabled){border-color:#22c55e;background:#dcfce7}",
    /* ghost placeholder keeps grid aligned */
    ".srt-seat.ph{visibility:hidden;pointer-events:none}",
    /* selected */
    ".srt-seat.ck{background:linear-gradient(135deg,#667eea,#764ba2)!important;",
      "border-color:transparent!important;box-shadow:0 4px 14px rgba(102,126,234,.45)}",
    ".srt-seat.ck .sn,.srt-seat.ck .sp{color:rgba(255,255,255,.9)!important}",
    /* booked */
    ".srt-seat.bk{background:#f1f5f9!important;border-color:#e2e8f0!important;opacity:.58}",
    /* inner text */
    ".sn{font-size:.67rem;font-weight:700;color:#1e293b;line-height:1}",
    ".si{font-size:.95rem;line-height:1}",
    ".sp{font-size:.58rem;color:#64748b;line-height:1}",
    ".ss{font-size:.56rem;color:#94a3b8}"
  ].join("");
  document.head.appendChild(el);
}

/* ── Build wrapper (runs once) ── */
function buildDeckUI() {
  injectStyles();

  /* hide the old deck divs that were already in the HTML */
  ["upper-deck","lower-deck"].forEach(function(id){
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  /* remove any previous wrapper */
  const old = document.getElementById("srt-deck-wrapper");
  if (old) old.remove();

  /* find a good parent: the container that held the deck divs */
  const anchor = document.getElementById("upper-deck") || document.getElementById("lower-deck");
  const parent = anchor ? anchor.parentNode : document.body;

  const wrap = document.createElement("div");
  wrap.id = "srt-deck-wrapper";
  wrap.innerHTML =
    '<div class="srt-slider-wrap">' +
      '<div class="srt-slider">' +
        '<button class="srt-tab active" id="srt-btn-lower" onclick="switchDeck(\'lower\')">&#128711; Lower Deck</button>' +
        '<button class="srt-tab"        id="srt-btn-upper" onclick="switchDeck(\'upper\')">&#128711; Upper Deck</button>' +
      '</div>' +
    '</div>' +
    '<div class="srt-legend">' +
      '<div class="srt-li"><div class="srt-swatch sw-sl"></div>Sleeper</div>' +
      '<div class="srt-li"><div class="srt-swatch sw-se"></div>Seater</div>' +
      '<div class="srt-li"><div class="srt-swatch sw-ok"></div>Selected</div>' +
      '<div class="srt-li"><div class="srt-swatch sw-bk"></div>Booked</div>' +
    '</div>' +
    '<div id="srt-render"></div>';

  parent.insertBefore(wrap, anchor);
}

/* ── Switch tab ── */
function switchDeck(deck) {
  activeDeck = deck;
  document.getElementById("srt-btn-lower").classList.toggle("active", deck === "lower");
  document.getElementById("srt-btn-upper").classList.toggle("active", deck === "upper");
  renderActiveDeck();
}

/* ── Render the active deck ── */
function renderActiveDeck() {
  const area = document.getElementById("srt-render");
  if (!area) return;
  const prefix  = activeDeck === "lower" ? "L" : "U";
  const busType = currentSchedule.type || "AC Sleeper (36)";
  area.innerHTML = buildDeckHTML(prefix, busType);
}

function buildDeckHTML(prefix, busType) {
  const isMixed = busType === "AC Seater+Sleeper (8+32)";
  const isLower = prefix === "L";
  var rowsHTML = "";

  if (isMixed && isLower) {
    /*
      Lower deck layout (AC Seater+Sleeper 8+32):
        Left col  : L1-L6  (sleepers, rows 0-5), empty for rows 6-7
        Right pair: L7+L8 (seater), L9+L10 (seater), L11+L12 (seater), L13+L14 (seater)
                    L15+L16(sleeper),L17+L18(sleeper),L19+L20(sleeper),L21+L22(sleeper)
    */
    for (var r = 0; r < 8; r++) {
      var leftNum   = r < 6 ? (r + 1) : null;   // L1..L6 then empty
      var ra        = 7  + r * 2;                // 7,9,11,13,15,17,19,21
      var rb        = ra + 1;                    // 8,10,12,14,16,18,20,22
      var rType     = r < 4 ? "se" : "sl";       // seater vs sleeper
      rowsHTML += makeRowHTML(prefix, leftNum, "sl", ra, rType, rb, rType);
    }
  } else {
    /*
      AC Sleeper (36) – both decks, or Mixed upper deck:
        Left col : 1-6  (sleepers)
        Right pair: 7+8, 9+10, 11+12, 13+14, 15+16, 17+18  (all sleepers)
    */
    for (var r = 0; r < 6; r++) {
      var ln = r + 1;
      var ra = 7  + r * 2;
      var rb = ra + 1;
      rowsHTML += makeRowHTML(prefix, ln, "sl", ra, "sl", rb, "sl");
    }
  }

  return '<div class="srt-bus">' + driverHTML() + rowsHTML + '</div>';
}

/* Build one flex row */
function makeRowHTML(prefix, leftNum, leftClass, rNumA, rClassA, rNumB, rClassB) {
  var leftHTML = leftNum !== null
    ? seatHTML(prefix, leftNum, leftClass)
    : '<button class="srt-seat sl ph" disabled></button>';

  return '<div class="srt-row">' +
           leftHTML +
           '<div class="srt-aisle"></div>' +
           seatHTML(prefix, rNumA, rClassA) +
           seatHTML(prefix, rNumB, rClassB) +
         '</div>';
}

/* Single seat button */
function seatHTML(prefix, num, typeClass) {
  var id       = prefix + num;
  var booked   = currentSchedule.bookedSeats && currentSchedule.bookedSeats.includes(id);
  var selected = selectedSeats.includes(id);
  var isSleep  = typeClass === "sl";
  var price    = calculateSeatPriceForRoute(
    currentSchedule.origin, currentSchedule.destination, id, currentSchedule.type
  );

  var cls = "srt-seat " + typeClass;
  if (selected) cls += " ck";
  if (booked)   cls += " bk";

  var icon  = isSleep
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3"/><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5"/><rect x="6" y="9" width="12" height="4" rx="1"/><line x1="2" y1="18" x2="2" y2="21"/><line x1="22" y1="18" x2="22" y2="21"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12"/><path d="M6 3v11"/><path d="M18 3v8"/><path d="M6 14h12a2 2 0 0 1 2 2v2H4v-2a2 2 0 0 1 2-2z"/><path d="M4 18v3"/><path d="M20 18v3"/></svg>';
  var price_html = booked
    ? '<span class="ss">Sold</span>'
    : '<span class="sp">&#8377;' + price + '</span>';

  return '<button class="' + cls + '" ' +
           (booked ? "disabled" : 'onclick="toggleSeat(\'' + id + '\')"') +
           ' title="' + id + ' (' + (isSleep ? "Sleeper" : "Seater") + ') - Rs.' + price + '">' +
           '<span class="sn">' + id + '</span>' +
           '<span class="si">' + icon + '</span>' +
           price_html +
         '</button>';
}

function driverHTML() {
  return '<div class="srt-driver">' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>' +
    '<line x1="12" y1="2" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="22"/>' +
    '<line x1="2" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="22" y2="12"/>' +
    '</svg> DRIVER</div>';
}

/* ── Toggle seat ── */
function toggleSeat(seatId) {
  if (currentSchedule.bookedSeats && currentSchedule.bookedSeats.includes(seatId)) return;
  var idx = selectedSeats.indexOf(seatId);
  if (idx > -1) {
    selectedSeats.splice(idx, 1);
  } else {
    if (selectedSeats.length >= 6) { showToast("Maximum 6 seats allowed","warning"); return; }
    selectedSeats.push(seatId);
  }
  renderActiveDeck();
  updateSummary();
}

/* ── Summary panel ── */
function updateSummary() {
  var el = document.getElementById("booking-summary");
  if (!el) return;

  if (selectedSeats.length === 0) {
    el.innerHTML =
      '<div class="empty-selection">' +
        '<p>No seats selected</p>' +
        '<p class="text-muted">Switch decks and click seats to select</p>' +
      '</div>';
    return;
  }

  var total = 0;
  var rows  = selectedSeats.map(function(sid) {
    var price = calculateSeatPriceForRoute(
      currentSchedule.origin, currentSchedule.destination, sid, currentSchedule.type
    );
    total += price;
    var deck = sid.charAt(0) === "L" ? "Lower" : "Upper";
    return '<div class="selected-seat-item">' +
             '<span class="seat-badge">' + sid +
               '<small style="font-weight:400;opacity:.7;margin-left:3px;">' + deck + '</small>' +
             '</span>' +
             '<span class="seat-item-price">&#8377;' + price + '</span>' +
             '<button class="remove-seat-btn" onclick="toggleSeat(\'' + sid + '\')" title="Remove">&times;</button>' +
           '</div>';
  }).join("");

  el.innerHTML =
    '<h4 class="summary-subtitle">Selected Seats</h4>' +
    '<div class="selected-seats-list">' + rows + '</div>' +
    '<div class="summary-divider"></div>' +
    '<div class="total-section">' +
      '<span class="total-label">Total Amount</span>' +
      '<span class="total-amount">' + formatCurrency(total) + '</span>' +
    '</div>' +
    '<button class="btn btn-primary btn-lg btn-block" onclick="proceedToPayment()">' +
      'Proceed to Payment &rarr;' +
    '</button>';
}

/* ── Payment ── */
function proceedToPayment() {
  if (selectedSeats.length === 0) { showToast("Please select at least one seat","warning"); return; }
  var total = 0;
  selectedSeats.forEach(function(sid) {
    total += calculateSeatPriceForRoute(
      currentSchedule.origin, currentSchedule.destination, sid, currentSchedule.type
    );
  });
  navigateTo("payment.html", {
    scheduleId:  currentSchedule.id,
    seats:       selectedSeats.join(","),
    totalAmount: total
  });
}

document.addEventListener("DOMContentLoaded", initSeatsPage);