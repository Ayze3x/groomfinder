// GroomFinder v2 – Data Layer
// Base coordinates: Bandra, Mumbai (demo origin)
const BASE_LAT = 19.0596;
const BASE_LNG = 72.8295;

var CATEGORIES = {
  salon: { label: "Salon", icon: "ph-scissors", color: "#a78bfa", bg: "rgba(124,58,237,0.2)" },
  barber: { label: "Barbershop", icon: "ph-barbell", color: "#34d399", bg: "rgba(52,211,153,0.15)" },
  beauty: { label: "Beauty Studio", icon: "ph-sparkle", color: "#f472b6", bg: "rgba(244,114,182,0.18)" },
  spa: { label: "Spa & Wellness", icon: "ph-flower-lotus", color: "#67e8f9", bg: "rgba(103,232,249,0.15)" },
  unisex: { label: "Unisex Salon", icon: "ph-users", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
};

// Traffic helpers
function getTrafficLevel(count) {
  if (count <= 5) return "Low";
  if (count <= 10) return "Moderate";
  return "High";
}

function getTrafficColor(level) {
  return { Low: "#34d399", Moderate: "#fbbf24", High: "#f87171" }[level] || "#9898b0";
}

function getWaitingTime(peopleAhead, avgServiceMin, paymentType, queueData) {
  // Prepaid users jump ahead of postpaid in queue
  const prepaidAhead = queueData ? queueData.filter(b => b.status === "pending" && b.paymentType === "prepaid").length : 0;
  const effectiveAhead = paymentType === "prepaid" ? prepaidAhead : peopleAhead;
  return effectiveAhead * avgServiceMin;
}

// Salon data store (mutable – traffic persisted to localStorage)
const SALONS_BASE = [
  {
    id: "sal_001", name: "The Blade Lounge", category: "barber",
    tagline: "Classic cuts, modern vibes",
    address: "12, Linking Road, Bandra West", lat: 19.0601, lng: 72.8301,
    rating: 4.8, reviewCount: 312,
    openTime: "09:00", closeTime: "21:00", phone: "+91 98765 43210",
    verified: true, loyaltyPointsPerVisit: 50,
    image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600",
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600",
      "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600",
    ],
    adminEmail: "admin@bladelounge.com",
    currentPeopleCount: 3,
    avgServiceTime: 35,
    services: [
      { id: "s001", name: "Classic Haircut", duration: 30, price: 350, category: "small" },
      { id: "s002", name: "Beard Trim & Shape", duration: 20, price: 200, category: "small" },
      { id: "s003", name: "Hot Towel Shave", duration: 45, price: 450, category: "small" },
      { id: "s004", name: "Hair + Beard Combo", duration: 60, price: 500, category: "major" },
      { id: "s005", name: "Hair Color", duration: 90, price: 1200, category: "major" },
    ],
    coupons: [
      { id: "cp001", code: "BLADE20", type: "percent", value: 20, description: "20% off all services", minOrder: 300, active: true, expiry: "2026-03-31" },
      { id: "cp002", code: "NEWCUT", type: "flat", value: 100, description: "₹100 off on first visit", minOrder: 200, active: true, expiry: "2026-04-30" },
    ],
    tags: ["walk-ins", "beard specialist", "trending"],
  },
  {
    id: "sal_002", name: "Luxe Beauty Studio", category: "beauty",
    tagline: "Glow up, level up",
    address: "4th Floor, Palladium Mall, Lower Parel", lat: 18.9999, lng: 72.8249,
    rating: 4.9, reviewCount: 541,
    openTime: "10:00", closeTime: "20:00", phone: "+91 98765 11111",
    verified: true, loyaltyPointsPerVisit: 100,
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600",
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600",
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600",
    ],
    adminEmail: "admin@luxebeauty.com",
    currentPeopleCount: 7,
    avgServiceTime: 60,
    services: [
      { id: "s006", name: "Full Face Cleanup", duration: 60, price: 800, category: "major" },
      { id: "s007", name: "Threading (Eyebrows)", duration: 15, price: 100, category: "small" },
      { id: "s008", name: "Full Body Waxing", duration: 90, price: 2000, category: "major" },
      { id: "s009", name: "Party Makeup", duration: 120, price: 3500, category: "major" },
      { id: "s010", name: "Manicure + Pedicure", duration: 75, price: 1200, category: "major" },
    ],
    coupons: [
      { id: "cp003", code: "LUXE15", type: "percent", value: 15, description: "15% off everything", minOrder: 500, active: true, expiry: "2026-03-15" },
      { id: "cp004", code: "BRIDALDAY", type: "flat", value: 500, description: "₹500 off bridal makeup", minOrder: 3000, active: true, expiry: "2026-06-30" },
    ],
    tags: ["luxury", "bridal", "top rated"],
  },
  {
    id: "sal_003", name: "Tress & Co.", category: "salon",
    tagline: "Hair that tells your story",
    address: "22, Hill Road, Bandra", lat: 19.0583, lng: 72.8261,
    rating: 4.6, reviewCount: 198,
    openTime: "09:30", closeTime: "20:30", phone: "+91 99988 77766",
    verified: true, loyaltyPointsPerVisit: 60,
    image: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=600",
      "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600",
    ],
    adminEmail: "admin@tressco.com",
    currentPeopleCount: 9,
    avgServiceTime: 50,
    services: [
      { id: "s011", name: "Women's Haircut", duration: 45, price: 600, category: "small" },
      { id: "s012", name: "Men's Haircut", duration: 30, price: 350, category: "small" },
      { id: "s013", name: "Balayage", duration: 180, price: 4500, category: "major" },
      { id: "s014", name: "Keratin Treatment", duration: 150, price: 5000, category: "major" },
      { id: "s015", name: "Blowout & Style", duration: 60, price: 800, category: "major" },
    ],
    coupons: [
      { id: "cp005", code: "TRESS10", type: "percent", value: 10, description: "10% off all hair services", minOrder: 400, active: true, expiry: "2026-05-01" },
    ],
    tags: ["trending", "color specialist"],
  },
  {
    id: "sal_004", name: "BarberKing", category: "barber",
    tagline: "Precision fades, every time",
    address: "7, Turner Road, Bandra West", lat: 19.0614, lng: 72.8321,
    rating: 4.7, reviewCount: 405,
    openTime: "08:00", closeTime: "22:00", phone: "+91 91234 56789",
    verified: true, loyaltyPointsPerVisit: 40,
    image: "https://images.unsplash.com/photo-1579765671052-3c5d73de9cd0?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1517832606299-7ae9b720a9b4?w=600",
      "https://images.unsplash.com/photo-1534297635766-a262cdcb8ee4?w=600",
    ],
    adminEmail: "admin@barberking.com",
    currentPeopleCount: 12,
    avgServiceTime: 40,
    services: [
      { id: "s016", name: "Skin Fade", duration: 45, price: 500, category: "small" },
      { id: "s017", name: "Taper Cut", duration: 40, price: 450, category: "small" },
      { id: "s018", name: "Beard Lineup", duration: 25, price: 250, category: "small" },
      { id: "s019", name: "Kids Cut", duration: 25, price: 300, category: "small" },
      { id: "s020", name: "Full Grooming Package", duration: 90, price: 900, category: "major" },
    ],
    coupons: [
      { id: "cp006", code: "KING25", type: "percent", value: 25, description: "25% off packages", minOrder: 700, active: true, expiry: "2026-03-20" },
    ],
    tags: ["walk-ins", "fade specialist", "open late"],
  },
  {
    id: "sal_005", name: "Aura Wellness Spa", category: "spa",
    tagline: "Relax, rejuvenate, radiate",
    address: "101, Juhu Scheme, Juhu", lat: 19.1013, lng: 72.8260,
    rating: 4.5, reviewCount: 289,
    openTime: "10:00", closeTime: "19:00", phone: "+91 98612 34567",
    verified: true, loyaltyPointsPerVisit: 120,
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1552693673-1bf958298935?w=600",
      "https://images.unsplash.com/photo-1588776814546-1ffbb7d25f87?w=600",
    ],
    adminEmail: "admin@auraspa.com",
    currentPeopleCount: 4,
    avgServiceTime: 75,
    services: [
      { id: "s021", name: "Swedish Massage (60m)", duration: 60, price: 2500, category: "major" },
      { id: "s022", name: "Deep Tissue Massage", duration: 75, price: 3000, category: "major" },
      { id: "s023", name: "Hydration Facial", duration: 60, price: 1800, category: "major" },
      { id: "s024", name: "Body Scrub & Wrap", duration: 90, price: 3500, category: "major" },
      { id: "s025", name: "Couple Spa Package", duration: 120, price: 7000, category: "major" },
    ],
    coupons: [
      { id: "cp007", code: "AURA30", type: "percent", value: 30, description: "30% off on weekdays", minOrder: 2000, active: true, expiry: "2026-04-15" },
      { id: "cp008", code: "COUPLE500", type: "flat", value: 500, description: "₹500 off couple packages", minOrder: 6000, active: true, expiry: "2026-06-30" },
    ],
    tags: ["spa", "wellness", "couple packages"],
  },
  {
    id: "sal_006", name: "Shear Genius", category: "unisex",
    tagline: "Style without compromise",
    address: "55, Waterfield Road, Bandra", lat: 19.0567, lng: 72.8289,
    rating: 4.4, reviewCount: 174,
    openTime: "09:00", closeTime: "21:00", phone: "+91 87654 32109",
    verified: false, loyaltyPointsPerVisit: 45,
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1582835240932-af07a7d78f8e?w=600",
    ],
    adminEmail: "admin@sheargenius.com",
    currentPeopleCount: 6,
    avgServiceTime: 45,
    services: [
      { id: "s026", name: "Creative Cut", duration: 60, price: 750, category: "major" },
      { id: "s027", name: "Root Touch-up", duration: 90, price: 2000, category: "major" },
      { id: "s028", name: "Highlights", duration: 120, price: 3000, category: "major" },
      { id: "s029", name: "Deep Conditioning", duration: 45, price: 600, category: "small" },
      { id: "s030", name: "Perm", duration: 150, price: 4000, category: "major" },
    ],
    coupons: [],
    tags: ["color expert", "unisex"],
  },
  {
    id: "sal_007", name: "GentlemenFirst", category: "barber",
    tagline: "Where every man matters",
    address: "3, Chapel Road, Bandra", lat: 19.0622, lng: 72.8247,
    rating: 4.3, reviewCount: 220,
    openTime: "09:00", closeTime: "20:00", phone: "+91 70000 12345",
    verified: false, loyaltyPointsPerVisit: 35,
    image: "https://images.unsplash.com/photo-1596362601603-b74f6ef166b2?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600",
    ],
    adminEmail: "admin@gentlemenfirst.com",
    currentPeopleCount: 2,
    avgServiceTime: 35,
    services: [
      { id: "s031", name: "Scissor Cut", duration: 35, price: 400, category: "small" },
      { id: "s032", name: "Straight Razor Shave", duration: 30, price: 350, category: "small" },
      { id: "s033", name: "Hair + Shave Combo", duration: 60, price: 650, category: "major" },
      { id: "s034", name: "Dandruff Treatment", duration: 45, price: 500, category: "small" },
    ],
    coupons: [
      { id: "cp009", code: "GENT15", type: "percent", value: 15, description: "15% off your first cut", minOrder: 300, active: true, expiry: "2026-05-31" },
    ],
    tags: ["classic", "razor specialist"],
  },
  {
    id: "sal_008", name: "Pink Petal Studio", category: "beauty",
    tagline: "Beauty rituals redefined",
    address: "9, Pali Hill, Bandra West", lat: 19.0574, lng: 72.8228,
    rating: 4.7, reviewCount: 367,
    openTime: "10:00", closeTime: "20:00", phone: "+91 80012 34567",
    verified: true, loyaltyPointsPerVisit: 80,
    image: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600",
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600",
    ],
    adminEmail: "admin@pinkpetal.com",
    currentPeopleCount: 8,
    avgServiceTime: 65,
    services: [
      { id: "s035", name: "Gel Nails", duration: 60, price: 900, category: "major" },
      { id: "s036", name: "Nail Art", duration: 75, price: 1200, category: "major" },
      { id: "s037", name: "Eyelash Extension", duration: 90, price: 2500, category: "major" },
      { id: "s038", name: "Eyebrow Microblading", duration: 120, price: 6000, category: "major" },
      { id: "s039", name: "Facial + Cleanup", duration: 60, price: 1000, category: "major" },
    ],
    coupons: [
      { id: "cp010", code: "PETAL10", type: "percent", value: 10, description: "10% off nail services", minOrder: 700, active: true, expiry: "2026-04-01" },
    ],
    tags: ["nail art", "lashes", "brows"],
  },
  {
    id: "sal_009", name: "The Cut Above", category: "unisex",
    tagline: "Premium unisex styling",
    address: "88, SV Road, Santacruz West", lat: 19.0785, lng: 72.8383,
    rating: 4.6, reviewCount: 244,
    openTime: "09:00", closeTime: "21:30", phone: "+91 90009 88877",
    verified: true, loyaltyPointsPerVisit: 55,
    image: "https://images.unsplash.com/photo-1470259078422-826894b933aa?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=600",
    ],
    adminEmail: "admin@cutabove.com",
    currentPeopleCount: 5,
    avgServiceTime: 55,
    services: [
      { id: "s040", name: "Men's Style Cut", duration: 40, price: 500, category: "small" },
      { id: "s041", name: "Women's Style Cut", duration: 60, price: 700, category: "major" },
      { id: "s042", name: "Ombre Color", duration: 180, price: 5000, category: "major" },
      { id: "s043", name: "Brazilian Blowout", duration: 150, price: 4500, category: "major" },
    ],
    coupons: [],
    tags: ["unisex", "premium"],
  },
  {
    id: "sal_010", name: "Urban Trim", category: "barber",
    tagline: "Fast cuts. Real results.",
    address: "17, Andheri Station Road, Andheri West", lat: 19.1188, lng: 72.8462,
    rating: 4.2, reviewCount: 155,
    openTime: "08:30", closeTime: "21:00", phone: "+91 99001 23456",
    verified: false, loyaltyPointsPerVisit: 25,
    image: "https://images.unsplash.com/photo-1593702288561-b8a6c4e8a1a7?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600",
    ],
    adminEmail: "admin@urbantrim.com",
    currentPeopleCount: 11,
    avgServiceTime: 25,
    services: [
      { id: "s044", name: "Express Cut", duration: 20, price: 200, category: "small" },
      { id: "s045", name: "Fade + Design", duration: 50, price: 600, category: "small" },
      { id: "s046", name: "Beard + Trim", duration: 30, price: 350, category: "small" },
    ],
    coupons: [
      { id: "cp011", code: "URBAN50", type: "flat", value: 50, description: "₹50 off on express cut", minOrder: 150, active: true, expiry: "2026-03-31" },
    ],
    tags: ["express", "affordable", "walk-ins"],
  },
  {
    id: "sal_011", name: "Velvet Touch", category: "beauty",
    tagline: "Indulge in beautiful",
    address: "34, Juhu Church Road, Juhu", lat: 19.1073, lng: 72.8252,
    rating: 4.8, reviewCount: 478,
    openTime: "11:00", closeTime: "20:00", phone: "+91 88812 34567",
    verified: true, loyaltyPointsPerVisit: 90,
    image: "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600",
    ],
    adminEmail: "admin@velvettouch.com",
    currentPeopleCount: 6,
    avgServiceTime: 70,
    services: [
      { id: "s047", name: "Hydra Facial", duration: 75, price: 2800, category: "major" },
      { id: "s048", name: "LED Light Therapy", duration: 45, price: 1500, category: "small" },
      { id: "s049", name: "Microdermabrasion", duration: 60, price: 2200, category: "major" },
      { id: "s050", name: "Anti-aging Facial", duration: 90, price: 3500, category: "major" },
    ],
    coupons: [
      { id: "cp012", code: "GLOW20", type: "percent", value: 20, description: "20% off skin treatments", minOrder: 1500, active: true, expiry: "2026-04-30" },
    ],
    tags: ["advanced skincare", "glow"],
  },
  {
    id: "sal_012", name: "Craft & Comb", category: "salon",
    tagline: "Artful hair, every visit",
    address: "11, Perry Cross Road, Bandra", lat: 19.0609, lng: 72.8276,
    rating: 4.5, reviewCount: 302,
    openTime: "09:00", closeTime: "20:00", phone: "+91 77712 34567",
    verified: false, loyaltyPointsPerVisit: 50,
    image: "https://images.unsplash.com/photo-1595475038784-bbe439ff41e6?w=800&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600",
    ],
    adminEmail: "admin@craftcomb.com",
    currentPeopleCount: 4,
    avgServiceTime: 50,
    services: [
      { id: "s051", name: "Precision Cut", duration: 45, price: 550, category: "small" },
      { id: "s052", name: "Color & Style", duration: 120, price: 2500, category: "major" },
      { id: "s053", name: "Scalp Treatment", duration: 60, price: 1000, category: "major" },
      { id: "s054", name: "Hair Spa", duration: 90, price: 1500, category: "major" },
    ],
    coupons: [],
    tags: ["precision", "hair health"],
  },
];

// Traffic state – persisted to localStorage
function getTrafficKey(salonId) { return `gf_traffic_${salonId}`; }

function getSalonTrafficData(salonId) {
  const stored = localStorage.getItem(getTrafficKey(salonId));
  if (stored) return JSON.parse(stored);
  const base = SALONS_BASE.find(s => s.id === salonId);
  return base ? { currentPeopleCount: base.currentPeopleCount } : { currentPeopleCount: 0 };
}

function setSalonTrafficData(salonId, count) {
  localStorage.setItem(getTrafficKey(salonId), JSON.stringify({ currentPeopleCount: Math.max(0, count) }));
}

// Get enriched salon (with live traffic from localStorage)
function getSalonEnriched(base) {
  const traffic = getSalonTrafficData(base.id);
  const count = traffic.currentPeopleCount;
  const level = getTrafficLevel(count);
  const waitMin = count * base.avgServiceTime;
  return {
    ...base,
    currentPeopleCount: count,
    trafficLevel: level,
    waitingMinutes: waitMin,
  };
}

// Get all salons with live traffic
function getAllSalonsEnriched() {
  return SALONS_BASE.map(getSalonEnriched);
}

function getSalonById(id) {
  const base = SALONS_BASE.find(s => s.id === id);
  return base ? getSalonEnriched(base) : null;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getSalonsNearby(userLat, userLng, radiusKm = 5) {
  return getAllSalonsEnriched()
    .map(s => ({ ...s, distance: haversineDistance(userLat, userLng, s.lat, s.lng) }))
    .filter(s => s.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

// Smart recommendation score: higher rating + lower traffic = better
function getRecommendationScore(salon) {
  const trafficPenalty = { Low: 0, Moderate: 0.5, High: 1.5 };
  return salon.rating - (trafficPenalty[salon.trafficLevel] || 0) - (salon.distance || 0) * 0.1;
}

// Coupon helpers
function validateCoupon(code, salonId, orderAmount) {
  const salon = SALONS_BASE.find(s => s.id === salonId);
  if (!salon) return { ok: false, error: "Salon not found" };
  // Check localStorage for admin-edited coupons
  const key = `gf_coupons_${salonId}`;
  const coupons = JSON.parse(localStorage.getItem(key) || "null") || salon.coupons;
  const coupon = coupons.find(c => c.code.toLowerCase() === code.toLowerCase() && c.active);
  if (!coupon) return { ok: false, error: "Invalid or expired coupon code" };
  if (new Date(coupon.expiry) < new Date()) return { ok: false, error: "This coupon has expired" };
  if (orderAmount < coupon.minOrder) return { ok: false, error: `Minimum order ₹${coupon.minOrder} required` };
  const discount = coupon.type === "percent" ? Math.round(orderAmount * coupon.value / 100) : coupon.value;
  return { ok: true, coupon, discount, finalAmount: Math.max(0, orderAmount - discount) };
}

function getSalonCoupons(salonId) {
  const salon = SALONS_BASE.find(s => s.id === salonId);
  if (!salon) return [];
  const key = `gf_coupons_${salonId}`;
  return JSON.parse(localStorage.getItem(key) || "null") || salon.coupons;
}

function saveSalonCoupons(salonId, coupons) {
  localStorage.setItem(`gf_coupons_${salonId}`, JSON.stringify(coupons));
}

// Loyalty points helpers
function getLoyaltyPoints(email) {
  const data = JSON.parse(localStorage.getItem("gf_loyalty") || "{}");
  return data[email] || 0;
}

function addLoyaltyPoints(email, points) {
  const data = JSON.parse(localStorage.getItem("gf_loyalty") || "{}");
  data[email] = (data[email] || 0) + points;
  localStorage.setItem("gf_loyalty", JSON.stringify(data));
  return data[email];
}

// Sample reviews
const REVIEWS = {
  sal_001: [
    { user: "Rahul M.", rating: 5, text: "Best beard trim in the city!", date: "2026-02-15" },
    { user: "Aryan K.", rating: 5, text: "Incredible hot towel shave. Felt like royalty.", date: "2026-02-10" },
    { user: "Vikram S.", rating: 4, text: "Clean place, skilled barbers.", date: "2026-01-28" },
  ],
  sal_002: [
    { user: "Priya N.", rating: 5, text: "Party makeup was absolutely stunning!", date: "2026-02-18" },
    { user: "Sneha R.", rating: 5, text: "My go-to for facials.", date: "2026-02-05" },
  ],
  sal_003: [
    { user: "Ananya P.", rating: 5, text: "My balayage turned out amazing!", date: "2026-02-12" },
    { user: "Meera T.", rating: 4, text: "Great keratin treatment.", date: "2026-01-30" },
  ],
  sal_004: [
    { user: "Dev S.", rating: 5, text: "Perfect skin fade every time.", date: "2026-02-17" },
    { user: "Nikhil B.", rating: 5, text: "Open late is a huge plus!", date: "2026-02-08" },
  ],
  sal_005: [
    { user: "Kavya R.", rating: 5, text: "Most relaxing spa experience ever.", date: "2026-02-14" },
  ],
};

// Pre-seeded store admin accounts
var STORE_ADMINS = {
  "admin@bladelounge.com": { password: "blade123", salonId: "sal_001" },
  "admin@luxebeauty.com": { password: "luxe123", salonId: "sal_002" },
  "admin@tressco.com": { password: "tress123", salonId: "sal_003" },
  "admin@barberking.com": { password: "bking123", salonId: "sal_004" },
  "admin@auraspa.com": { password: "aura123", salonId: "sal_005" },
  "admin@sheargenius.com": { password: "shear123", salonId: "sal_006" },
  "admin@gentlemenfirst.com": { password: "gent123", salonId: "sal_007" },
  "admin@pinkpetal.com": { password: "pink123", salonId: "sal_008" },
  "admin@cutabove.com": { password: "cut123", salonId: "sal_009" },
  "admin@urbantrim.com": { password: "urban123", salonId: "sal_010" },
  "admin@velvettouch.com": { password: "velvet123", salonId: "sal_011" },
  "admin@craftcomb.com": { password: "craft123", salonId: "sal_012" },
};

function generateTimeSlots(openTime = "09:00", closeTime = "20:00") {
  const slots = [];
  let [h, m] = openTime.split(":").map(Number);
  const [eH] = closeTime.split(":").map(Number);
  while (h < eH - 1) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30; if (m >= 60) { m = 0; h++; }
  }
  return slots;
}
