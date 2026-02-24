// GroomFinder v2 – Bookings Module
const BOOKINGS_KEY = "gf_bookings";

function getAllBookings() {
    return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || "[]");
}

function saveAllBookings(bookings) {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

// Build queue for a salon at a given date, sorted: prepaid first → postpaid, then by createdAt
function getSalonQueue(salonId, date) {
    return getAllBookings()
        .filter(b => b.salonId === salonId && b.date === date && ["pending", "confirmed", "arrived"].includes(b.status))
        .sort((a, b) => {
            if (a.paymentType === "prepaid" && b.paymentType !== "prepaid") return -1;
            if (a.paymentType !== "prepaid" && b.paymentType === "prepaid") return 1;
            return (a.createdAt || 0) - (b.createdAt || 0);
        });
}

function getQueuePositionInfo(booking) {
    const queue = getSalonQueue(booking.salonId, booking.date);
    const idx = queue.findIndex(b => b.id === booking.id);
    if (idx === -1) return { position: null, peopleAhead: 0 };
    const salon = getSalonById(booking.salonId);
    const avgMin = salon ? salon.avgServiceTime : 30;
    return {
        position: idx + 1,
        peopleAhead: idx,
        estimatedWaitMin: idx * avgMin,
        queueNumber: `Q${String(idx + 1).padStart(2, "0")}`,
    };
}

function createBooking({ salonId, salonName, serviceId, serviceName, servicePrice, serviceDuration,
    customerEmail, customerName, date, time, paymentType = "postpaid", appliedCoupon = null, finalPrice = null }) {
    const bookings = getAllBookings();
    const queue = getSalonQueue(salonId, date);

    // Prepaid gets priority — insert before postpaid in queue
    const booking = {
        id: "bk_" + Date.now(),
        salonId, salonName, serviceId, serviceName, servicePrice, serviceDuration,
        customerEmail, customerName, date, time,
        paymentType,
        appliedCoupon,
        finalPrice: finalPrice !== null ? finalPrice : servicePrice,
        status: "pending",
        arrived: false,
        gracePeriodStarted: null,
        createdAt: Date.now(),
    };

    // Recalculate queue position for this booking
    const prepaidCount = queue.filter(b => b.paymentType === "prepaid").length;
    const peopleAhead = paymentType === "prepaid" ? prepaidCount : queue.length;
    const salon = getSalonById(salonId);
    const avgMin = salon ? salon.avgServiceTime : 30;
    booking.queueNumber = `Q${String(queue.length + 1).padStart(2, "0")}`;
    booking.peopleAhead = peopleAhead;
    booking.estimatedWaitMin = peopleAhead * avgMin;

    bookings.unshift(booking);
    saveAllBookings(bookings);

    // Award loyalty points
    if (salon) addLoyaltyPoints(customerEmail, salon.loyaltyPointsPerVisit || 30);

    return booking;
}

function getBookingsByCustomer(email) {
    return getAllBookings()
        .filter(b => b.customerEmail === email)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function getBookingsBySalon(salonId) {
    return getAllBookings()
        .filter(b => b.salonId === salonId)
        .sort((a, b) => {
            // Sort: pending first → by date → by queue (prepaid first)
            const statusOrder = { pending: 0, arrived: 1, confirmed: 2, cancelled: 3, noshow: 4 };
            if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            if (a.paymentType === "prepaid" && b.paymentType !== "prepaid") return -1;
            if (a.paymentType !== "prepaid" && b.paymentType === "prepaid") return 1;
            return (a.createdAt || 0) - (b.createdAt || 0);
        });
}

function updateBookingStatus(bookingId, status) {
    const bookings = getAllBookings();
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx === -1) return false;
    bookings[idx].status = status;
    if (status === "arrived") bookings[idx].arrived = true;
    saveAllBookings(bookings);
    return bookings[idx];
}

function markCustomerArrived(bookingId) {
    const bookings = getAllBookings();
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx === -1) return false;
    bookings[idx].status = "arrived";
    bookings[idx].arrived = true;
    bookings[idx].arrivedAt = Date.now();
    saveAllBookings(bookings);
    return bookings[idx];
}

function startGracePeriod(bookingId) {
    const bookings = getAllBookings();
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx === -1) return false;
    bookings[idx].gracePeriodStarted = Date.now();
    bookings[idx].status = "grace";
    saveAllBookings(bookings);
    // Auto-cancel after 3 minutes
    setTimeout(() => {
        const fresh = getAllBookings();
        const i = fresh.findIndex(b => b.id === bookingId);
        if (i !== -1 && fresh[i].status === "grace") {
            fresh[i].status = "noshow";
            saveAllBookings(fresh);
            // Notify UI update if admin page is open
            if (typeof renderAdminDashboardIfActive === "function") renderAdminDashboardIfActive();
            showToast("Booking auto-cancelled: customer no-show", "error");
        }
    }, 3 * 60 * 1000); // 3 minutes
    return true;
}

function cancelBooking(bookingId) {
    return updateBookingStatus(bookingId, "cancelled");
}

function getAdminStats(salonId) {
    const bookings = getBookingsBySalon(salonId);
    const today = new Date().toISOString().slice(0, 10);
    const todayBookings = bookings.filter(b => b.date === today);
    const confirmed = bookings.filter(b => b.status === "confirmed" || b.status === "arrived");
    const revenue = confirmed.reduce((sum, b) => sum + (b.finalPrice || b.servicePrice), 0);
    const pending = bookings.filter(b => b.status === "pending").length;
    const noShows = bookings.filter(b => b.status === "noshow").length;
    const prepaid = bookings.filter(b => b.paymentType === "prepaid").length;
    return { total: bookings.length, todayCount: todayBookings.length, revenue, pending, noShows, prepaid };
}

function seedDemoBookings(customerEmail, customerName) {
    const existing = getAllBookings().filter(b => b.customerEmail === customerEmail);
    if (existing.length > 0) return;
    const demo = [
        {
            id: "bk_demo1", salonId: "sal_001", salonName: "The Blade Lounge",
            serviceId: "s001", serviceName: "Classic Haircut", servicePrice: 350, serviceDuration: 30,
            customerEmail, customerName,
            date: "2026-02-18", time: "11:00", paymentType: "prepaid",
            appliedCoupon: null, finalPrice: 350,
            status: "confirmed", arrived: false, gracePeriodStarted: null,
            queueNumber: "Q01", peopleAhead: 0, estimatedWaitMin: 0, createdAt: Date.now() - 86400000 * 3,
        },
        {
            id: "bk_demo2", salonId: "sal_002", salonName: "Luxe Beauty Studio",
            serviceId: "s006", serviceName: "Full Face Cleanup", servicePrice: 800, serviceDuration: 60,
            customerEmail, customerName,
            date: "2026-02-25", time: "14:00", paymentType: "postpaid",
            appliedCoupon: null, finalPrice: 800,
            status: "pending", arrived: false, gracePeriodStarted: null,
            queueNumber: "Q03", peopleAhead: 2, estimatedWaitMin: 120, createdAt: Date.now() - 86400000,
        },
    ];
    const all = getAllBookings();
    saveAllBookings([...demo, ...all]);
}

function seedAdminDemoBookings(salonId, salonName) {
    const existing = getBookingsBySalon(salonId);
    if (existing.length > 0) return;
    const salon = getSalonById(salonId);
    const s1 = salon.services[0];
    const s2 = salon.services[1] || salon.services[0];
    const today = new Date().toISOString().slice(0, 10);
    const demos = [
        { id: "bk_adm1_" + salonId, salonId, salonName, serviceId: s1.id, serviceName: s1.name, servicePrice: s1.price, serviceDuration: s1.duration || 30, customerEmail: "rohan@example.com", customerName: "Rohan Mehta", date: today, time: "10:00", paymentType: "prepaid", appliedCoupon: null, finalPrice: s1.price, status: "pending", arrived: false, gracePeriodStarted: null, queueNumber: "Q01", peopleAhead: 0, estimatedWaitMin: 0, createdAt: Date.now() - 3600000 },
        { id: "bk_adm2_" + salonId, salonId, salonName, serviceId: s2.id, serviceName: s2.name, servicePrice: s2.price, serviceDuration: s2.duration || 30, customerEmail: "priya@example.com", customerName: "Priya Shah", date: today, time: "12:00", paymentType: "postpaid", appliedCoupon: null, finalPrice: s2.price, status: "pending", arrived: false, gracePeriodStarted: null, queueNumber: "Q02", peopleAhead: 1, estimatedWaitMin: 35, createdAt: Date.now() - 7200000 },
        { id: "bk_adm3_" + salonId, salonId, salonName, serviceId: s1.id, serviceName: s1.name, servicePrice: s1.price, serviceDuration: s1.duration || 30, customerEmail: "arjun@example.com", customerName: "Arjun Nair", date: today, time: "14:00", paymentType: "prepaid", appliedCoupon: null, finalPrice: s1.price * 0.8, status: "confirmed", arrived: false, gracePeriodStarted: null, queueNumber: "Q03", peopleAhead: 2, estimatedWaitMin: 70, createdAt: Date.now() - 1800000 },
    ];
    const all = getAllBookings();
    saveAllBookings([...demos, ...all]);
}
