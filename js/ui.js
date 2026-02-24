// GroomFinder v2 – UI Renderer Module

/* ── Toast ── */
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const icons = { success: "ph-check-circle", error: "ph-x-circle", info: "ph-info" };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="toast-icon ph ${icons[type] || "ph-info"}" style="font-size:1.2rem"></i><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 300); }, 3200);
}

/* ── Floating Filter Badge ── */
let _activeBadgeTimeout = null;
function showFloatingFilterBadge(category) {
  const container = document.getElementById("aura-filter-badge-container");
  if (!container) {
    console.error("Filter badge container not found!");
    return;
  }

  // Clear existing
  container.innerHTML = "";
  if (_activeBadgeTimeout) clearTimeout(_activeBadgeTimeout);

  if (category === "all") return;

  const cat = CATEGORIES[category] || { label: category };
  const el = document.createElement("div");
  el.className = "aura-filter-badge";
  el.innerHTML = `<i class="ph ph-funnel-simple"></i><span>Viewing ${cat.label}</span>`;
  container.appendChild(el);

  _activeBadgeTimeout = setTimeout(() => {
    el.classList.add("fade-out");
    setTimeout(() => el.remove(), 500);
  }, 3000);
}

/* ── Stars ── */
function renderStars(rating) {
  let h = '<span class="stars">';
  for (let i = 1; i <= 5; i++) h += `<i class="star ph-fill ph-star${i > rating ? " empty" : ""}"></i>`;
  return h + "</span>";
}

/* ── Traffic badge ── */
function renderTrafficBadge(level) {
  return `<span class="traffic-badge ${level}"><span class="traffic-dot"></span>${level} Traffic</span>`;
}

/* ── Category badge ── */
function renderCatBadge(category) {
  const cat = CATEGORIES[category] || {};
  const classMap = { salon: "badge-primary", barber: "badge-teal", beauty: "badge-pink", spa: "badge-teal", unisex: "badge-warning" };
  return `<span class="salon-card-cat badge ${classMap[category] || "badge-muted"}" style="background:${cat.bg || ""};color:${cat.color || ""};border-color:${cat.color || ""}33">${cat.label || category}</span>`;
}

/* ── Salon Card (photo card design) ── */
function renderSalonCard(salon) {
  const distKm = salon.distance != null ? salon.distance.toFixed(1) : '?';
  const services = (salon.services && salon.services.length > 0) ? salon.services : [{ price: 0 }];
  const minPrice = Math.min(...services.map(s => s.price || 0));
  const waitText = salon.waitingMinutes > 0 ? `~${salon.waitingMinutes}m wait` : 'No wait';
  const hasCoupons = (getSalonCoupons(salon.id) || []).filter(c => c.active).length > 0;
  const img = (typeof SALON_IMAGES !== 'undefined' && SALON_IMAGES[salon.id])
    || salon.image
    || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80';
  return `
  <div class="salon-photo-card" id="sc-${salon.id}" onclick="navigateTo('/salon/${salon.id}')">
    <div class="salon-photo-img" style="background-image:url('${img}')">
      <button class="salon-heart-btn" onclick="event.stopPropagation();showToast('Saved!','success')" aria-label="Save">
        <i class="ph ph-heart"></i>
      </button>
      <span class="salon-photo-dist">
        <i class="ph ph-map-pin"></i>${distKm} km
      </span>
      ${hasCoupons ? '<span class="salon-photo-offer">🏷 Offer</span>' : ''}
    </div>
    <div class="salon-photo-body">
      <div class="salon-photo-name">${salon.name}</div>
      <div class="salon-photo-meta">
        <span class="salon-photo-rating">⭐ ${salon.rating} <span style="color:var(--text-muted);font-weight:400">(${salon.reviewCount})</span></span>
        ${minPrice > 0 ? `<span class="salon-photo-price">From ₹${minPrice}</span>` : ''}
      </div>
      <div class="salon-photo-row2">
        <span class="salon-photo-wait"><i class="ph ph-clock"></i>${waitText}</span>
      </div>
    </div>
  </div>`;
}

/* ── Salon Detail Page ── */
function renderSalonDetail(salon) {
  const reviews = REVIEWS[salon.id] || [];
  const page = document.getElementById("page-salon-detail");
  const coupons = getSalonCoupons(salon.id).filter(c => c.active);
  const catMap = { salon: "badge-primary", barber: "badge-teal", beauty: "badge-pink", spa: "badge-teal", unisex: "badge-warning" };
  const cat = CATEGORIES[salon.category] || {};
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(salon.name + " " + salon.address)}`;

  const galleryHtml = (salon.galleryImages || []).map(img =>
    `<div class="gallery-img"><img src="${img}" alt="gallery" loading="lazy"></div>`
  ).join("");

  const reviewsHtml = reviews.map(r => `
  <div class="review-item">
    <div class="review-header">
      <span class="review-user">${r.user}</span>
      <span class="review-date">${r.date}</span>
    </div>
    <div style="margin-bottom:5px">${renderStars(r.rating)}</div>
    <p class="review-text">${r.text}</p>
  </div>`).join("");

  const servicesHtml = salon.services.map(s => {
    const catLabel = s.category === "major" ? "Major (1h)" : s.category === "small" ? "Small (30m)" : "Custom";
    return `
    <div class="service-item" data-service-id="${s.id}" onclick="selectDetailService('${s.id}')">
      <div class="service-left">
        <div class="service-name">
          <span class="service-cat-dot ${s.category}"></span>${s.name}
        </div>
        <div class="service-duration"><i class="ph ph-clock"></i>${s.duration} min · <span style="color:var(--text-muted)">${catLabel}</span></div>
      </div>
      <div class="service-price">₹${s.price}</div>
    </div>`;
  }).join("");

  const couponsHtml = coupons.length ? `
  <div class="detail-section">
    <div class="detail-section-title"><i class="ph ph-tag"></i>Offers & Coupons</div>
    <div class="coupons-grid">
      ${coupons.map(c => `
      <div class="coupon-card" onclick="copyCouponCode('${c.code}')">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="coupon-code">${c.code}</span>
          <span class="coupon-value-badge">${c.type === "percent" ? c.value + "% OFF" : "₹" + c.value + " OFF"}</span>
        </div>
        <div class="coupon-desc">${c.description}</div>
        <div class="coupon-meta">
          <span>Min ₹${c.minOrder}</span><span>Expires ${c.expiry}</span>
        </div>
      </div>`).join("")}
    </div>
  </div>` : "";

  page.innerHTML = `
  <div class="detail-hero">
    <img src="${salon.image}" alt="${salon.name}" onerror="this.src='https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800'">
    <div class="detail-hero-overlay"></div>
    <button class="btn btn-ghost btn-icon detail-hero-back" onclick="history.back()"><i class="ph ph-arrow-left"></i></button>
    <div class="detail-hero-info">
      <div class="detail-badges">
        <span class="badge ${catMap[salon.category] || "badge-muted"}" style="background:${cat.bg || ""};color:${cat.color || ""};border-color:${cat.color || ""}33">${cat.label || salon.category}</span>
        ${salon.verified ? '<span class="verified-badge"><i class="ph-fill ph-seal-check"></i>Verified</span>' : ""}
        ${renderTrafficBadge(salon.trafficLevel)}
      </div>
      <div class="detail-name">${salon.name}</div>
      <div class="detail-tagline">${salon.tagline}</div>
    </div>
  </div>
  <div class="detail-body">
    <div class="detail-meta-row">
      <div class="detail-meta-item">${renderStars(Math.round(salon.rating))}<strong>${salon.rating}</strong><span>(${salon.reviewCount})</span></div>
      <div class="detail-meta-item"><i class="ph ph-map-pin"></i><span>${salon.address}</span></div>
      <div class="detail-meta-item"><i class="ph ph-clock"></i><span>${salon.openTime} – ${salon.closeTime}</span></div>
      <div class="detail-meta-item"><i class="ph ph-phone"></i><span>${salon.phone}</span></div>
      ${salon.distance != null ? `<div class="detail-meta-item"><i class="ph ph-navigation-arrow"></i><strong>${salon.distance.toFixed(1)} km away</strong></div>` : ""}
      <div class="detail-meta-item">
        <button class="btn btn-ghost btn-sm" style="gap:5px;padding:4px 10px"
                onclick="openGoogleMapsDirections(${(salon.location?.lat || salon.lat || 0)},${(salon.location?.lng || salon.lng || 0)})">
          <i class="ph ph-navigation-arrow"></i>Get Directions
        </button>
      </div>
    </div>

    <!-- Leaflet Map — initialized in showSalonDetail() via location.js -->
    <div class="salon-leaflet-map-wrap">
      <div id="salon-leaflet-map" style="height:260px;width:100%"></div>
    </div>


    <!-- Live Queue Info -->
    <div class="live-queue-card">
      <div class="queue-stat">
        <div class="queue-stat-value traffic-${salon.trafficLevel}">${salon.trafficLevel}</div>
        <div class="queue-stat-label">Traffic Level</div>
      </div>
      <div class="queue-stat">
        <div class="queue-stat-value">${salon.currentPeopleCount}</div>
        <div class="queue-stat-label">People Inside</div>
      </div>
      <div class="queue-stat">
        <div class="queue-stat-value">${salon.waitingMinutes > 0 ? "~" + salon.waitingMinutes + "m" : "None"}</div>
        <div class="queue-stat-label">Est. Wait Time</div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title"><i class="ph ph-scissors"></i>Services <span style="font-weight:400;font-size:0.8rem;color:var(--text-muted);margin-left:8px">Tap a service to select it</span></div>
      <div class="services-list">${servicesHtml}</div>
    </div>

    ${galleryHtml ? `
    <div class="detail-section">
      <div class="detail-section-title"><i class="ph ph-images"></i>Ambience</div>
      <div class="gallery-grid">${galleryHtml}</div>
    </div>` : ""}

    ${couponsHtml}

    ${reviews.length ? `
    <div class="detail-section">
      <div class="detail-section-title"><i class="ph ph-star"></i>Reviews</div>
      <div class="reviews-list">${reviewsHtml}</div>
    </div>` : ""}
  </div>
  <div class="detail-book-bar">
    <div class="book-bar-info">
      <strong id="detail-selected-service-name">Select a service above</strong>
      <span id="detail-selected-service-price"></span>
    </div>
    <button class="btn btn-primary" id="detail-book-btn" onclick="startBookingFromDetail('${salon.id}')" disabled>
      <i class="ph ph-calendar-plus"></i>Book Now
    </button>
  </div>`;

  window._detailSalonId = salon.id;
  window._detailSelectedServiceId = null;
}

function copyCouponCode(code) {
  navigator.clipboard.writeText(code).then(() => showToast(`Coupon code "${code}" copied!`, "success")).catch(() => showToast(`Use code: ${code}`, "info"));
}

function selectDetailService(serviceId) {
  window._detailSelectedServiceId = serviceId;
  const salon = getSalonById(window._detailSalonId);
  const service = salon.services.find(s => s.id === serviceId);
  document.querySelectorAll(".service-item").forEach(el => el.classList.toggle("selected", el.dataset.serviceId === serviceId));
  document.getElementById("detail-selected-service-name").textContent = service.name;
  document.getElementById("detail-selected-service-price").textContent = `₹${service.price} · ${service.duration} min`;
  const btn = document.getElementById("detail-book-btn");
  if (btn) btn.disabled = false;
}

function startBookingFromDetail(salonId) {
  if (!window._detailSelectedServiceId) { showToast("Please select a service first", "error"); return; }
  navigateTo(`/book/${salonId}?service=${window._detailSelectedServiceId}`);
}

/* ── Booking Page ── */
let _bookingState = {};

function initBookingPage(salonId, preServiceId) {
  const salon = getSalonById(salonId);
  if (!salon) return;

  _bookingState = {
    salon, step: 1,
    selectedServiceId: preServiceId || null,
    selectedDate: null, selectedTime: null,
    paymentType: null, couponCode: "", appliedCoupon: null,
    calViewDate: null,
  };

  const page = document.getElementById("page-book");
  page.innerHTML = `
  <div class="topbar">
    <button class="btn btn-ghost btn-icon" onclick="history.back()"><i class="ph ph-arrow-left"></i></button>
    <div class="topbar-title">Book Appointment</div>
  </div>
  <div class="booking-page-inner">
    <div class="booking-salon-info">
      <img class="booking-salon-img" src="${salon.image}" alt="${salon.name}" onerror="this.src='https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800'">
      <div>
        <div class="booking-salon-name">${salon.name}</div>
        <div class="booking-salon-sub">${salon.address} · ${renderTrafficBadge(salon.trafficLevel)}</div>
      </div>
    </div>
    <div class="stepper" id="book-stepper"></div>
    <div id="book-step-content" style="margin-top:24px"></div>
  </div>`;

  renderBookingStep();
}

function renderBookingStep() {
  const { step, salon, selectedServiceId, selectedDate, selectedTime, paymentType } = _bookingState;
  renderStepper(step);
  const container = document.getElementById("book-step-content");

  if (step === 1) {
    // Service selection
    container.innerHTML = `
    <div class="step-content">
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:14px">Choose a Service</h3>
      <div class="services-list">
        ${salon.services.map(s => `
        <div class="service-item${selectedServiceId === s.id ? " selected" : ""}" data-service-id="${s.id}" onclick="bookSelectService('${s.id}')">
          <div class="service-left">
            <div class="service-name"><span class="service-cat-dot ${s.category}"></span>${s.name}</div>
            <div class="service-duration"><i class="ph ph-clock"></i>${s.duration} min</div>
          </div>
          <div class="service-price">₹${s.price}</div>
        </div>`).join("")}
      </div>
      <div class="booking-nav">
        <button class="btn btn-secondary" onclick="history.back()">Cancel</button>
        <button class="btn btn-primary" onclick="bookNextStep()" ${!selectedServiceId ? "disabled" : ""}>Next <i class="ph ph-arrow-right"></i></button>
      </div>
    </div>`;

  } else if (step === 2) {
    // Payment type
    container.innerHTML = `
    <div class="step-content">
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:6px">Payment Method</h3>
      <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:16px">Prepaid bookings get <strong style="color:#a78bfa">priority in queue</strong></p>
      <div class="payment-type-selector">
        <div class="payment-type-card prepaid${paymentType === "prepaid" ? " selected" : ""}" onclick="bookSelectPayment('prepaid')">
          <div class="payment-type-icon"><i class="ph ph-credit-card"></i></div>
          <div class="payment-type-name">Prepaid</div>
          <div class="payment-type-desc">Pay now online. Guaranteed priority position in the queue.</div>
          <div class="payment-type-badge">⚡ Queue Priority</div>
        </div>
        <div class="payment-type-card postpaid${paymentType === "postpaid" ? " selected" : ""}" onclick="bookSelectPayment('postpaid')">
          <div class="payment-type-icon"><i class="ph ph-money"></i></div>
          <div class="payment-type-name">Postpaid</div>
          <div class="payment-type-desc">Pay at the salon after your service is complete.</div>
          <div class="payment-type-badge">Pay Later</div>
        </div>
      </div>
      <div class="booking-nav">
        <button class="btn btn-secondary" onclick="bookPrevStep()"><i class="ph ph-arrow-left"></i> Back</button>
        <button class="btn btn-primary" id="payment-next-btn" onclick="bookNextStep()" ${!paymentType ? "disabled" : ""}>Next <i class="ph ph-arrow-right"></i></button>
      </div>
    </div>`;

  } else if (step === 3) {
    // Date
    container.innerHTML = `
    <div class="step-content">
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:14px">Pick a Date</h3>
      <div id="date-picker"></div>
      <div class="booking-nav">
        <button class="btn btn-secondary" onclick="bookPrevStep()"><i class="ph ph-arrow-left"></i> Back</button>
        <button class="btn btn-primary" id="date-next-btn" onclick="bookNextStep()" ${!selectedDate ? "disabled" : ""}>Next <i class="ph ph-arrow-right"></i></button>
      </div>
    </div>`;
    renderDatePicker();

  } else if (step === 4) {
    // Time
    const slots = generateTimeSlots(salon.openTime, salon.closeTime);
    container.innerHTML = `
    <div class="step-content">
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:14px">Pick a Time</h3>
      <div class="time-grid">
        ${slots.map(t => `<div class="time-slot${selectedTime === t ? " selected" : ""}" onclick="bookSelectTime('${t}')">${t}</div>`).join("")}
      </div>
      <div class="booking-nav" style="margin-top:20px">
        <button class="btn btn-secondary" onclick="bookPrevStep()"><i class="ph ph-arrow-left"></i> Back</button>
        <button class="btn btn-primary" id="time-next-btn" onclick="bookNextStep()" ${!selectedTime ? "disabled" : ""}>Next <i class="ph ph-arrow-right"></i></button>
      </div>
    </div>`;

  } else if (step === 5) {
    // Coupon + Confirm
    const service = salon.services.find(s => s.id === selectedServiceId);
    const activeCoupons = getSalonCoupons(salon.id).filter(c => c.active);
    const finalPrice = _bookingState.appliedCoupon ? _bookingState.appliedCoupon.finalAmount : service.price;
    container.innerHTML = `
    <div class="step-content">
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:14px">Confirm Your Booking</h3>

      ${activeCoupons.length ? `
      <div style="margin-bottom:16px">
        <div style="font-size:0.85rem;font-weight:600;margin-bottom:8px">Have a coupon?</div>
        <div class="coupon-input-row">
          <input id="coupon-input" class="input-field" placeholder="Enter coupon code" value="${_bookingState.couponCode}" oninput="_bookingState.couponCode=this.value.toUpperCase()">
          <button class="btn btn-secondary btn-sm" onclick="applyBookingCoupon()">Apply</button>
        </div>
        ${_bookingState.appliedCoupon ? `<div class="coupon-applied"><i class="ph ph-check-circle"></i>${_bookingState.appliedCoupon.coupon.description} — <strong>₹${_bookingState.appliedCoupon.discount} off</strong></div>` : ""}
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:6px">Available: ${activeCoupons.map(c => `<span style="color:#a78bfa;font-weight:700">${c.code}</span>`).join(", ")}</div>
      </div>` : ""}

      <div class="booking-summary">
        <div class="booking-summary-row"><span class="booking-summary-label">Salon</span><span>${salon.name}</span></div>
        <div class="booking-summary-row"><span class="booking-summary-label">Service</span><span>${service.name}</span></div>
        <div class="booking-summary-row"><span class="booking-summary-label">Duration</span><span>${service.duration} min</span></div>
        <div class="booking-summary-row"><span class="booking-summary-label">Date</span><span>${selectedDate}</span></div>
        <div class="booking-summary-row"><span class="booking-summary-label">Time</span><span>${selectedTime}</span></div>
        <div class="booking-summary-row"><span class="booking-summary-label">Payment</span><span><span class="payment-type-chip ${paymentType}">${paymentType === "prepaid" ? '<i class="ph ph-credit-card"></i> Prepaid' : '<i class="ph ph-money"></i> Postpaid'}</span></span></div>
        ${_bookingState.appliedCoupon ? `<div class="booking-summary-row"><span class="booking-summary-label">Discount</span><span style="color:#34d399">-₹${_bookingState.appliedCoupon.discount}</span></div>` : ""}
        <div class="booking-summary-row"><span class="booking-summary-label">Total</span><span style="color:#a78bfa;font-size:1.1rem">₹${finalPrice}</span></div>
      </div >

    <div class="booking-nav">
      <button class="btn btn-secondary" onclick="bookPrevStep()"><i class="ph ph-arrow-left"></i> Back</button>
      <button class="btn btn-primary btn-lg" onclick="confirmBooking()" style="flex:1"><i class="ph ph-check"></i>Confirm & Book</button>
    </div>
    </div > `;
  }
}

function applyBookingCoupon() {
  const { salon, selectedServiceId, couponCode } = _bookingState;
  if (!couponCode) { showToast("Enter a coupon code", "error"); return; }
  const service = salon.services.find(s => s.id === selectedServiceId);
  const result = validateCoupon(couponCode, salon.id, service.price);
  if (!result.ok) { showToast(result.error, "error"); return; }
  _bookingState.appliedCoupon = result;
  showToast(`Coupon applied! You save ₹${result.discount} `, "success");
  renderBookingStep();
}

function renderStepper(current) {
  const steps = ["Service", "Payment", "Date", "Time", "Confirm"];
  const container = document.getElementById("book-stepper");
  container.innerHTML = steps.map((label, i) => {
    const n = i + 1;
    const cls = n < current ? "done" : n === current ? "active" : "";
    return `
    ${i > 0 ? `<div class="step-line${n - 1 < current ? " done" : ""}"></div>` : ""}
  <div class="step-item ${cls}">
    <div class="step-circle">${n < current ? '<i class="ph ph-check"></i>' : n}</div>
    <div class="step-label">${label}</div>
  </div>`;
  }).join("");
}

function bookSelectService(id) { _bookingState.selectedServiceId = id; renderBookingStep(); }
function bookSelectPayment(type) { _bookingState.paymentType = type; renderBookingStep(); }
function bookSelectTime(t) { _bookingState.selectedTime = t; renderBookingStep(); }
function bookNextStep() {
  const { step, selectedServiceId, paymentType, selectedDate, selectedTime } = _bookingState;
  if (step === 1 && !selectedServiceId) { showToast("Select a service", "error"); return; }
  if (step === 2 && !paymentType) { showToast("Select a payment method", "error"); return; }
  if (step === 3 && !selectedDate) { showToast("Select a date", "error"); return; }
  if (step === 4 && !selectedTime) { showToast("Select a time slot", "error"); return; }
  _bookingState.step++;
  renderBookingStep();
}
function bookPrevStep() { if (_bookingState.step > 1) { _bookingState.step--; renderBookingStep(); } }

function renderDatePicker() {
  const now = new Date();
  if (!_bookingState.calViewDate) _bookingState.calViewDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const v = _bookingState.calViewDate;
  const year = v.getFullYear(), month = v.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  let cells = "";
  for (let i = 0; i < firstDay; i++) cells += "<div></div>";
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isPast = new Date(ds) < new Date(now.toISOString().slice(0, 10));
    const isSelected = _bookingState.selectedDate === ds;
    const isToday = ds === now.toISOString().slice(0, 10);
    cells += `<div class="date-cell${isPast ? " disabled" : ""}${isSelected ? " selected" : ""}${isToday ? " today" : ""}" onclick="bookSelectDate('${ds}')">
      <span class="day-name">${dayNames[new Date(ds).getDay()]}</span>
      <span class="day-num">${d}</span>
    </div>`;
  }
  document.getElementById("date-picker").innerHTML = `
  <div class="date-nav">
    <button class="btn btn-ghost btn-sm btn-icon" onclick="changeCalMonth(-1)"><i class="ph ph-caret-left"></i></button>
    <span class="date-nav-label">${monthNames[month]} ${year}</span>
    <button class="btn btn-ghost btn-sm btn-icon" onclick="changeCalMonth(1)"><i class="ph ph-caret-right"></i></button>
  </div>
    <div class="date-grid">${cells}</div>`;
}

function changeCalMonth(delta) {
  const v = _bookingState.calViewDate;
  _bookingState.calViewDate = new Date(v.getFullYear(), v.getMonth() + delta, 1);
  renderDatePicker();
}

function bookSelectDate(ds) {
  _bookingState.selectedDate = ds;
  renderDatePicker();
  const btn = document.getElementById("date-next-btn");
  if (btn) btn.disabled = false;
}

function confirmBooking() {
  const session = getCurrentSession();
  if (!session) { showToast("Please login first", "error"); navigateTo("/customer-login"); return; }
  const { salon, selectedServiceId, selectedDate, selectedTime, paymentType, appliedCoupon } = _bookingState;
  const service = salon.services.find(s => s.id === selectedServiceId);
  const finalPrice = appliedCoupon ? appliedCoupon.finalAmount : service.price;

  const bookingData = {
    salonId: salon.id, salonName: salon.name,
    serviceId: service.id, serviceName: service.name, servicePrice: service.price, serviceDuration: service.duration,
    customerEmail: session.email, customerName: session.name,
    date: selectedDate, time: selectedTime,
    paymentType, appliedCoupon: appliedCoupon ? appliedCoupon.coupon.code : null, finalPrice,
    discount: appliedCoupon ? appliedCoupon.discount : 0,
    salonImg: salon.image,
  };

  if (paymentType === 'prepaid') {
    // Navigate to dedicated payment page — Razorpay checkout happens there
    window._pendingPaymentBooking = bookingData;
    navigateTo('/payment');
  } else {
    // Postpaid — create booking immediately, show confirmation
    const booking = createBooking(bookingData);
    showBookingConfirmation(booking, salon);
    scheduleReminder(booking);
  }
}

function scheduleReminder(booking) {
  // Simulate reminder toast (in a real app this would be a push notification)
  showToast(`Reminder set for 15 min before ${booking.time} `, "info");
}

function showBookingConfirmation(booking, salon) {
  const queueInfo = getQueuePositionInfo(booking);
  const page = document.getElementById('page-book');
  page.innerHTML = `
    < div class="booking-confirmed-wrap" >
    < !--Sage green hero-- >
    <div class="booking-confirmed-hero">
      <div class="booking-confirmed-illustration" style="color:var(--brand-sage); font-size: 3rem"><i class="ph ph-plant"></i> <i class="ph ph-scissors"></i></div>
      <div class="booking-confirmed-check"><i class="ph ph-check"></i></div>
      <h2 class="booking-confirmed-title">Thank You!</h2>
      <p class="booking-confirmed-sub">Your appointment is confirmed.</p>
    </div>

    <!--Receipt card-- >
    <div class="booking-confirmed-card">
      <div class="booking-confirmed-row">
        <span class="booking-confirmed-label">Date</span>
        <span class="booking-confirmed-val">${booking.date}</span>
      </div>
      <div class="booking-confirmed-row">
        <span class="booking-confirmed-label">Time</span>
        <span class="booking-confirmed-val">${booking.time}</span>
      </div>
      <div class="booking-confirmed-row">
        <span class="booking-confirmed-label">Service</span>
        <span class="booking-confirmed-val">${booking.serviceName}</span>
      </div>
      <div class="booking-confirmed-row">
        <span class="booking-confirmed-label">Salon</span>
        <span class="booking-confirmed-val">${salon.name}</span>
      </div>
      <div class="booking-confirmed-row">
        <span class="booking-confirmed-label">Queue #</span>
        <span class="booking-confirmed-val" style="color:var(--brand-primary);font-weight:800">${booking.queueNumber || '—'}</span>
      </div>
      <div class="booking-confirmed-divider"></div>
      <div class="booking-confirmed-row">
        <span class="booking-confirmed-label">Service Cost</span>
        <span class="booking-confirmed-val">₹${booking.servicePrice}</span>
      </div>
      ${booking.appliedCoupon ? `<div class="booking-confirmed-row">
        <span class="booking-confirmed-label">Discount</span>
        <span class="booking-confirmed-val" style="color:var(--brand-sage)">-₹${booking.servicePrice - booking.finalPrice}</span>
      </div>` : ''}
      <div class="booking-confirmed-row" style="font-weight:800">
        <span class="booking-confirmed-label">Total Paid</span>
        <span class="booking-confirmed-val" style="color:var(--brand-primary);font-size:1.05rem">₹${booking.finalPrice}</span>
      </div>
      <div class="booking-confirmed-payment">
        <i class="ph ph-credit-card"></i>
        ${booking.paymentType === 'prepaid' ? 'Prepaid · Priority Queue' : 'Pay at salon'}
      </div>
    </div>

    <!--Actions -->
    <div class="booking-confirmed-actions">
      <button class="btn btn-primary btn-lg" onclick="navigateTo('/discover')" style="width:100%">
        <i class="ph ph-house-simple"></i>Return to Home
      </button>
      <button class="btn btn-secondary" onclick="navigateTo('/my-bookings')" style="width:100%">
        <i class="ph ph-calendar-blank"></i>My Bookings
      </button>
    </div>
  </div > `;
  showToast('Booking confirmed! Loyalty points added <i class="ph-fill ph-medal" style="color:#fbbf24"></i>', 'success');
}

/* ── My Bookings ── */
function renderMyBookings() {
  const session = getCurrentSession();
  if (!session) return;
  const bookings = getBookingsByCustomer(session.email);
  const container = document.getElementById("my-bookings-list");
  const pts = getLoyaltyPoints(session.email);

  document.getElementById("loyalty-points-display").textContent = pts.toLocaleString("en-IN");
  document.getElementById("loyalty-tier").innerHTML = pts >= 1000 ? 'Gold Member <i class="ph-fill ph-medal" style="color:#fbbf24"></i>' : pts >= 500 ? 'Silver Member <i class="ph-fill ph-medal" style="color:#9ca3af"></i>' : 'Member';

  if (!bookings.length) {
    container.innerHTML = `<div class="no-salons"><i class="ph ph-calendar-blank"></i><h3>No bookings yet</h3><p>Discover salons and book your first appointment!</p><button class="btn btn-primary" onclick="navigateTo('/discover')" style="margin-top:20px"><i class="ph ph-compass"></i>Discover Salons</button></div>`;
    return;
  }

  container.innerHTML = bookings.map(b => {
    const salon = getSalonById(b.salonId);
    const img = salon?.image || "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=200";
    return `
    <div class="booking-card">
      <img class="booking-card-img" src="${img}" alt="${b.salonName}" onerror="this.src='https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200'">
        <div class="booking-card-info">
          <div class="booking-card-salon">${b.salonName}</div>
          <div class="booking-card-service">${b.serviceName}</div>
          <div class="booking-card-meta">
            <span><i class="ph ph-calendar"></i>${b.date}</span>
            <span><i class="ph ph-clock"></i>${b.time}</span>
            <span><i class="ph ph-currency-inr"></i>₹${b.finalPrice || b.servicePrice}</span>
            ${b.queueNumber ? `<span><i class="ph ph-list-numbers"></i>${b.queueNumber}</span>` : ""}
          </div>
          ${b.peopleAhead !== undefined ? `
        <div class="booking-queue-info">
          <span><i class="ph ph-users"></i>${b.peopleAhead} ahead</span>
          <span><i class="ph ph-timer"></i>~${b.estimatedWaitMin}m wait</span>
          <span class="payment-type-chip ${b.paymentType}">${b.paymentType}</span>
        </div>` : ""}
        </div>
        <div class="booking-card-actions">
          <span class="status-chip ${b.status}">${b.status}</span>
          ${b.status === "pending" ? `<button class="btn btn-danger btn-sm" onclick="customerCancelBooking('${b.id}')">Cancel</button>` : ""}
          ${(b.status === "confirmed" || b.status === "cancelled" || b.status === "noshow") ? `<button class="btn btn-secondary btn-sm" onclick="navigateTo('/salon/${b.salonId}')">Rebook</button>` : ""}
        </div>
      </div>`;
  }).join("");
}

function customerCancelBooking(id) {
  if (!confirm("Cancel this booking?")) return;
  cancelBooking(id);
  showToast("Booking cancelled", "info");
  renderMyBookings();
}

/* ── Admin Dashboard ── */
function renderAdminDashboard(salonId) {
  const salon = getSalonById(salonId);
  const stats = getAdminStats(salonId);
  const recent = getBookingsBySalon(salonId).slice(0, 8);
  document.getElementById("admin-dash-title").textContent = salon.name;
  const statsData = [
    { icon: "ph-calendar-check", bg: "rgba(124,58,237,0.15)", ic: "#a78bfa", label: "Today's Bookings", value: stats.todayCount },
    { icon: "ph-list", bg: "rgba(6,182,212,0.12)", ic: "#67e8f9", label: "Total Bookings", value: stats.total },
    { icon: "ph-clock", bg: "rgba(245,158,11,0.12)", ic: "#fbbf24", label: "Pending", value: stats.pending },
    { icon: "ph-currency-inr", bg: "rgba(16,185,129,0.12)", ic: "#34d399", label: "Revenue", value: "₹" + stats.revenue.toLocaleString("en-IN") },
    { icon: "ph-lightning", bg: "rgba(124,58,237,0.1)", ic: "#c4b5fd", label: "Prepaid Bookings", value: stats.prepaid },
    { icon: "ph-x-circle", bg: "rgba(239,68,68,0.1)", ic: "#f87171", label: "No-Shows", value: stats.noShows },
  ];
  document.getElementById("admin-stats-grid").innerHTML = statsData.map(s => `
    <div class="stat-card">
      <div class="stat-card-icon" style="background:${s.bg}"><i class="ph ${s.icon}" style="color:${s.ic}"></i></div>
      <div class="stat-card-value">${s.value}</div>
      <div class="stat-card-label">${s.label}</div>
    </div>`).join("");

  renderTrafficControlCard(salonId);

  const tableEl = document.getElementById("admin-recent-bookings");
  if (!recent.length) { tableEl.innerHTML = '<div class="no-salons" style="padding:40px"><i class="ph ph-calendar-blank"></i><p>No bookings yet</p></div>'; return; }
  tableEl.innerHTML = buildBookingsTable(recent, salonId);
}

function renderTrafficControlCard(salonId) {
  const salon = getSalonById(salonId);
  const count = salon.currentPeopleCount;
  const level = salon.trafficLevel;
  const el = document.getElementById("admin-traffic-control");
  if (!el) return;
  el.innerHTML = `
    <div class="traffic-control-card">
      <div class="traffic-control-header">
        <div>
          <div style="font-size:1rem;font-weight:700;margin-bottom:4px">Live Traffic Control</div>
          <div style="font-size:0.82rem;color:var(--text-secondary)">Update customers in store to adjust queue &amp; traffic status</div>
        </div>
        ${renderTrafficBadge(level)}
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:24px;margin:12px 0">
        <button class="btn count-btn minus" onclick="adminUpdateTraffic('${salonId}', -1)"><i class="ph ph-minus"></i></button>
        <div class="count-display">${count}</div>
        <button class="btn count-btn plus" onclick="adminUpdateTraffic('${salonId}', 1)"><i class="ph ph-plus"></i></button>
      </div>
      <div style="font-size:0.78rem;color:var(--text-muted);text-align:center">People currently in store</div>
      <div class="traffic-scale" style="margin-top:14px">
        <div class="traffic-scale-item Low" style="opacity:${level === 'Low' ? 1 : 0.3}"></div>
        <div class="traffic-scale-item Moderate" style="opacity:${level === 'Moderate' || level === 'High' ? 1 : 0.3}"></div>
        <div class="traffic-scale-item High" style="opacity:${level === 'High' ? 1 : 0.3}"></div>
      </div>
      <div class="traffic-scale-label"><span>Low (0–5)</span><span>Moderate (6–10)</span><span>High (11–15)</span></div>
    </div>`;
}

function adminUpdateTraffic(salonId, delta) {
  const salon = getSalonById(salonId);
  const newCount = Math.max(0, salon.currentPeopleCount + delta);
  setSalonTrafficData(salonId, newCount);
  const newLevel = getTrafficLevel(newCount);
  renderTrafficControlCard(salonId);
  showToast(`Traffic updated: ${newCount} people · ${newLevel} `, "info");
}

function buildBookingsTable(bookings, salonId) {
  return `
    <div class="bookings-table-wrap">
      <table class="bookings-table">
        <thead><tr><th>Queue</th><th>Customer</th><th>Service</th><th>Date/Time</th><th>Payment</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${bookings.map(b => `
      <tr>
        <td><strong style="color:#a78bfa">${b.queueNumber || '—'}</strong></td>
        <td><div>${b.customerName}</div><div style="font-size:0.72rem;color:var(--text-muted)">${b.customerEmail}</div></td>
        <td>${b.serviceName}</td>
        <td><div>${b.date}</div><div style="color:var(--text-muted);font-size:0.78rem">${b.time}</div></td>
        <td><span class="payment-type-chip ${b.paymentType}">${b.paymentType}</span></td>
        <td>₹${b.finalPrice || b.servicePrice}</td>
        <td><span class="status-chip ${b.status}">${b.status}</span></td>
        <td>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            ${b.status === 'pending' ? `
              <button class="btn btn-success btn-sm" onclick="adminArrived('${b.id}','${salonId}')">Arrived</button>
              <button class="btn btn-danger btn-sm" onclick="adminNoShow('${b.id}','${salonId}')">No-show</button>` : ''}
            ${b.status === 'arrived' ? `<button class="btn btn-success btn-sm" onclick="adminConfirm('${b.id}','${salonId}')">Done</button>` : ''}
          </div>
        </td>
      </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function adminArrived(id, salonId) {
  markCustomerArrived(id);
  showToast("Customer marked as arrived ✓", "success");
  refreshAdminViews(salonId);
}

function adminNoShow(id, salonId) {
  startGracePeriod(id);
  showToast("3-minute grace period started. Auto-cancel if no-show.", "info");
  refreshAdminViews(salonId);
}

function adminConfirm(id, salonId) {
  updateBookingStatus(id, "confirmed");
  showToast("Service marked as completed", "success");
  refreshAdminViews(salonId);
}

function refreshAdminViews(salonId) {
  const session = getCurrentSession();
  if (!session) return;
  const sid = salonId || session.salonId;
  if (document.getElementById("admin-view-dashboard") && !document.getElementById("admin-view-dashboard").classList.contains("hidden")) {
    renderAdminDashboard(sid);
  }
  if (document.getElementById("admin-view-bookings") && !document.getElementById("admin-view-bookings").classList.contains("hidden")) {
    renderAdminBookingsPage(sid);
  }
}

function renderAdminDashboardIfActive() {
  const session = getCurrentSession();
  if (session) refreshAdminViews(session.salonId);
}

/* ── Admin Bookings ── */
function renderAdminBookingsPage(salonId) {
  const bookings = getBookingsBySalon(salonId);
  const filter = window._adminBookingFilter || "all";
  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter || (filter === "prepaid" && b.paymentType === "prepaid"));
  const container = document.getElementById("admin-bookings-list");
  container.innerHTML = filtered.length ? buildBookingsTable(filtered, salonId) : '<div class="no-salons" style="padding:40px"><i class="ph ph-calendar-blank"></i><p>No bookings found</p></div>';
}

function setAdminBookingFilter(f) {
  window._adminBookingFilter = f;
  document.querySelectorAll(".admin-filter-chip").forEach(c => c.classList.toggle("active", c.dataset.filter === f));
  const session = getCurrentSession();
  if (session) renderAdminBookingsPage(session.salonId);
}

/* ── Admin Services ── */
function renderAdminServices(salonId) {
  const salon = getSalonById(salonId);
  const key = `gf_services_${salonId} `;
  const services = JSON.parse(localStorage.getItem(key) || "null") || salon.services;
  const container = document.getElementById("admin-services-list");
  const catColors = { major: "#a78bfa", small: "#34d399", custom: "#67e8f9" };
  container.innerHTML = services.map(s => `
    < div class="service-admin-item" >
      <div style="width:8px;height:8px;border-radius:50%;background:${catColors[s.category] || " var(--text - muted)"};flex-shrink:0;margin-top:3px" ></div >
    <div class="service-admin-info">
      <div class="service-admin-name">${s.name}</div>
      <div class="service-admin-meta"><i class="ph ph-clock"></i>${s.duration} min · ${s.category || "custom"}</div>
    </div>
    <div class="service-admin-price">₹${s.price}</div>
    <div class="service-admin-actions">
      <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteAdminService('${salonId}','${s.id}')"><i class="ph ph-trash" style="color:var(--danger)"></i></button>
    </div>
  </div > `).join("") || '<p style="color:var(--text-muted);padding:20px">No services added yet.</p>';
}

function deleteAdminService(salonId, serviceId) {
  if (!confirm("Delete this service?")) return;
  const key = `gf_services_${salonId} `;
  const salon = getSalonById(salonId);
  let services = JSON.parse(localStorage.getItem(key) || "null") || salon.services;
  services = services.filter(s => s.id !== serviceId);
  localStorage.setItem(key, JSON.stringify(services));
  showToast("Service deleted", "info");
  renderAdminServices(salonId);
}

function openAddServiceModal(salonId) {
  const existing = document.getElementById("add-service-modal");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "add-service-modal";
  overlay.innerHTML = `
    < div class="modal-box" >
    <div class="modal-header">
      <h3 style="font-size:1.05rem;font-weight:700">Add New Service</h3>
      <button class="btn btn-ghost btn-icon modal-close" onclick="document.getElementById('add-service-modal').remove()"><i class="ph ph-x"></i></button>
    </div>
    <div class="modal-body">
      <div class="service-form">
        <div class="input-group"><label class="input-label">Service Name</label><input id="svc-name" class="input-field" placeholder="e.g. Classic Haircut"></div>
        <div class="input-group"><label class="input-label">Category</label>
          <select id="svc-cat" class="input-field">
            <option value="major">Major (1 hour)</option>
            <option value="small">Small (30 min)</option>
            <option value="custom">Custom duration</option>
          </select>
        </div>
        <div class="input-group"><label class="input-label">Duration (min)</label><input id="svc-dur" class="input-field" type="number" placeholder="30"></div>
        <div class="input-group"><label class="input-label">Price (₹)</label><input id="svc-price" class="input-field" type="number" placeholder="500"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('add-service-modal').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="addAdminService('${salonId}')"><i class="ph ph-plus"></i>Add Service</button>
    </div>
  </div > `;
  document.body.appendChild(overlay);
}

function addAdminService(salonId) {
  const name = document.getElementById("svc-name").value.trim();
  const cat = document.getElementById("svc-cat").value;
  const duration = parseInt(document.getElementById("svc-dur").value) || (cat === "major" ? 60 : 30);
  const price = parseInt(document.getElementById("svc-price").value);
  if (!name || !price) { showToast("Please fill all required fields", "error"); return; }
  const key = `gf_services_${salonId} `;
  const salon = getSalonById(salonId);
  let services = JSON.parse(localStorage.getItem(key) || "null") || salon.services;
  services.push({ id: "svc_" + Date.now(), name, duration, price, category: cat });
  localStorage.setItem(key, JSON.stringify(services));
  document.getElementById("add-service-modal").remove();
  showToast("Service added!", "success");
  renderAdminServices(salonId);
}

/* ── Admin Coupons ── */
function renderAdminCoupons(salonId) {
  const coupons = getSalonCoupons(salonId);
  const container = document.getElementById("admin-coupons-list");
  container.innerHTML = coupons.length ? `< div class="coupons-admin-list" > ${coupons.map(c => `
  <div class="coupon-admin-card">
    <div class="coupon-admin-header">
      <div>
        <div class="coupon-admin-code">${c.code}</div>
        <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:3px">${c.description}</div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:8px">
        <span class="coupon-value-badge">${c.type === "percent" ? c.value + "%" : "₹" + c.value} OFF</span>
        <div class="coupon-status-dot ${c.active ? "active" : "inactive"}"></div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-top:6px">
      <span>Min ₹${c.minOrder}</span><span>Exp: ${c.expiry}</span>
    </div>
    <div class="coupon-admin-actions" style="margin-top:10px;display:flex;gap:6px">
      <button class="btn btn-sm ${c.active ? "btn-secondary" : "btn-success"}" onclick="toggleCoupon('${salonId}','${c.id}')">${c.active ? "Deactivate" : "Activate"}</button>
      <button class="btn btn-sm btn-danger" onclick="deleteCoupon('${salonId}','${c.id}')"><i class="ph ph-trash"></i></button>
    </div>
  </div>`).join("")
    }</div > ` : '<p style="color:var(--text-muted);padding:20px">No coupons added yet.</p>';
}

function toggleCoupon(salonId, couponId) {
  const coupons = getSalonCoupons(salonId);
  const idx = coupons.findIndex(c => c.id === couponId);
  if (idx !== -1) coupons[idx].active = !coupons[idx].active;
  saveSalonCoupons(salonId, coupons);
  showToast(`Coupon ${coupons[idx].active ? "activated" : "deactivated"} `, "info");
  renderAdminCoupons(salonId);
}

function deleteCoupon(salonId, couponId) {
  if (!confirm("Delete this coupon?")) return;
  const coupons = getSalonCoupons(salonId).filter(c => c.id !== couponId);
  saveSalonCoupons(salonId, coupons);
  showToast("Coupon deleted", "info");
  renderAdminCoupons(salonId);
}

function openAddCouponModal(salonId) {
  const existing = document.getElementById("add-coupon-modal");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "add-coupon-modal";
  overlay.innerHTML = `
    < div class="modal-box" >
    <div class="modal-header">
      <h3 style="font-size:1.05rem;font-weight:700">Add Coupon / Offer</h3>
      <button class="btn btn-ghost btn-icon modal-close" onclick="document.getElementById('add-coupon-modal').remove()"><i class="ph ph-x"></i></button>
    </div>
    <div class="modal-body">
      <div class="service-form">
        <div class="input-group"><label class="input-label">Coupon Code</label><input id="cp-code" class="input-field" placeholder="e.g. SUMMER20" style="text-transform:uppercase"></div>
        <div class="input-group"><label class="input-label">Discount Type</label>
          <select id="cp-type" class="input-field">
            <option value="percent">Percentage (%)</option>
            <option value="flat">Flat Amount (₹)</option>
          </select>
        </div>
        <div class="input-group"><label class="input-label">Discount Value</label><input id="cp-value" class="input-field" type="number" placeholder="20"></div>
        <div class="input-group"><label class="input-label">Min Order (₹)</label><input id="cp-min" class="input-field" type="number" placeholder="300"></div>
        <div class="input-group"><label class="input-label">Description</label><input id="cp-desc" class="input-field" placeholder="e.g. 20% off on all services"></div>
        <div class="input-group"><label class="input-label">Expiry Date</label><input id="cp-expiry" class="input-field" type="date" min="${new Date().toISOString().slice(0, 10)}"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('add-coupon-modal').remove()">Cancel</button>
      <button class="btn btn-primary" onclick="addAdminCoupon('${salonId}')"><i class="ph ph-plus"></i>Add Coupon</button>
    </div>
  </div > `;
  document.body.appendChild(overlay);
}

function addAdminCoupon(salonId) {
  const code = document.getElementById("cp-code").value.trim().toUpperCase();
  const type = document.getElementById("cp-type").value;
  const value = parseInt(document.getElementById("cp-value").value);
  const minOrder = parseInt(document.getElementById("cp-min").value) || 0;
  const description = document.getElementById("cp-desc").value.trim();
  const expiry = document.getElementById("cp-expiry").value;
  if (!code || !value || !description || !expiry) { showToast("Please fill all fields", "error"); return; }
  const coupons = getSalonCoupons(salonId);
  coupons.push({ id: "cp_" + Date.now(), code, type, value, minOrder, description, active: true, expiry });
  saveSalonCoupons(salonId, coupons);
  document.getElementById("add-coupon-modal").remove();
  showToast("Coupon added!", "success");
  renderAdminCoupons(salonId);
}

/* ── Admin Queue View ── */
function renderAdminQueueView(salonId) {
  const today = new Date().toISOString().slice(0, 10);
  const queue = getSalonQueue(salonId, today);
  const container = document.getElementById("admin-queue-list");
  if (!queue.length) {
    container.innerHTML = '<div class="no-salons" style="padding:40px"><i class="ph ph-list-numbers"></i><p>No active queue for today</p></div>';
    return;
  }
  container.innerHTML = `< div class="queue-list" > ${queue.map((b, i) => `
  <div class="queue-item">
    <div class="queue-number-badge">${b.queueNumber || ("Q" + String(i + 1).padStart(2, "0"))}</div>
    <div class="queue-item-info">
      <div class="queue-item-name">${b.customerName} <span class="payment-type-chip ${b.paymentType}">${b.paymentType}</span></div>
      <div class="queue-item-service">${b.serviceName}</div>
      <div class="queue-item-meta">
        <span><i class="ph ph-clock"></i>${b.time}</span>
        <span>₹${b.finalPrice || b.servicePrice}</span>
      </div>
    </div>
    <div class="queue-item-actions">
      ${b.status === "pending" ? `<button class="btn btn-success btn-sm" onclick="adminArrived('${b.id}','${salonId}')">Arrived</button><button class="btn btn-danger btn-sm" onclick="adminNoShow('${b.id}','${salonId}')">No-show</button>` : `<span class="status-chip ${b.status}">${b.status}</span>`}
    </div>
  </div>`).join("")
    }</div > `;
}
