/**
 * src/seeders/salons.seeder.js
 * Seeds the 12 demo salons from the frontend data.js into MongoDB.
 * Run once: node src/seeders/salons.seeder.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Salon from '../models/Salon.js';

const DEMO_SALONS = [
    {
        name: 'The Blade Lounge',
        category: 'barber',
        tagline: 'Classic cuts, modern vibes',
        address: '12, Linking Road, Bandra West',
        location: { lat: 19.0601, lng: 72.8301 },
        phone: '+91 98765 43210',
        openTime: '09:00', closeTime: '21:00',
        rating: 4.8, reviewCount: 312,
        verified: true, loyaltyPointsPerVisit: 50,
        avgServiceTime: 35,
        image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=80',
        galleryImages: [
            'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600',
            'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600',
        ],
        services: [
            { id: 's001', name: 'Classic Haircut', duration: 30, price: 350, category: 'small' },
            { id: 's002', name: 'Beard Trim & Shape', duration: 20, price: 200, category: 'small' },
            { id: 's003', name: 'Hot Towel Shave', duration: 45, price: 450, category: 'small' },
            { id: 's004', name: 'Hair + Beard Combo', duration: 60, price: 500, category: 'major' },
            { id: 's005', name: 'Hair Color', duration: 90, price: 1200, category: 'major' },
        ],
        coupons: [
            { id: 'cp001', code: 'BLADE20', type: 'percent', value: 20, description: '20% off all services', minOrder: 300, active: true, expiry: '2027-03-31' },
        ],
        tags: ['walk-ins', 'beard specialist', 'trending'],
        adminEmail: 'admin@bladelounge.com',
        currentPeopleCount: 3,
    },
    {
        name: 'Luxe Beauty Studio',
        category: 'beauty',
        tagline: 'Glow up, level up',
        address: '4th Floor, Palladium Mall, Lower Parel',
        location: { lat: 18.9999, lng: 72.8249 },
        phone: '+91 98765 11111',
        openTime: '10:00', closeTime: '20:00',
        rating: 4.9, reviewCount: 541,
        verified: true, loyaltyPointsPerVisit: 100,
        avgServiceTime: 60,
        image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
        galleryImages: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600'],
        services: [
            { id: 's006', name: 'Full Face Cleanup', duration: 60, price: 800, category: 'major' },
            { id: 's007', name: 'Threading (Eyebrows)', duration: 15, price: 100, category: 'small' },
            { id: 's008', name: 'Full Body Waxing', duration: 90, price: 2000, category: 'major' },
            { id: 's009', name: 'Party Makeup', duration: 120, price: 3500, category: 'major' },
            { id: 's010', name: 'Manicure + Pedicure', duration: 75, price: 1200, category: 'major' },
        ],
        coupons: [
            { id: 'cp003', code: 'LUXE15', type: 'percent', value: 15, description: '15% off everything', minOrder: 500, active: true, expiry: '2027-03-15' },
        ],
        tags: ['luxury', 'bridal', 'top rated'],
        adminEmail: 'admin@luxebeauty.com',
        currentPeopleCount: 7,
    },
    {
        name: 'Tress & Co.',
        category: 'salon',
        tagline: 'Hair that tells your story',
        address: '22, Hill Road, Bandra',
        location: { lat: 19.0583, lng: 72.8261 },
        phone: '+91 99988 77766',
        openTime: '09:30', closeTime: '20:30',
        rating: 4.6, reviewCount: 198,
        verified: true, loyaltyPointsPerVisit: 60,
        avgServiceTime: 50,
        image: 'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&q=80',
        galleryImages: [],
        services: [
            { id: 's011', name: "Women's Haircut", duration: 45, price: 600, category: 'small' },
            { id: 's012', name: "Men's Haircut", duration: 30, price: 350, category: 'small' },
            { id: 's013', name: 'Balayage', duration: 180, price: 4500, category: 'major' },
            { id: 's014', name: 'Keratin Treatment', duration: 150, price: 5000, category: 'major' },
        ],
        coupons: [],
        tags: ['trending', 'color specialist'],
        adminEmail: 'admin@tressco.com',
        currentPeopleCount: 9,
    },
    {
        name: 'BarberKing',
        category: 'barber',
        tagline: 'Precision fades, every time',
        address: '7, Turner Road, Bandra West',
        location: { lat: 19.0614, lng: 72.8321 },
        phone: '+91 91234 56789',
        openTime: '08:00', closeTime: '22:00',
        rating: 4.7, reviewCount: 405,
        verified: true, loyaltyPointsPerVisit: 40,
        avgServiceTime: 40,
        image: 'https://images.unsplash.com/photo-1579765671052-3c5d73de9cd0?w=800&q=80',
        galleryImages: [],
        services: [
            { id: 's016', name: 'Skin Fade', duration: 45, price: 500, category: 'small' },
            { id: 's017', name: 'Taper Cut', duration: 40, price: 450, category: 'small' },
            { id: 's018', name: 'Beard Lineup', duration: 25, price: 250, category: 'small' },
            { id: 's019', name: 'Kids Cut', duration: 25, price: 300, category: 'small' },
            { id: 's020', name: 'Full Grooming Package', duration: 90, price: 900, category: 'major' },
        ],
        coupons: [
            { id: 'cp006', code: 'KING25', type: 'percent', value: 25, description: '25% off packages', minOrder: 700, active: true, expiry: '2027-03-20' },
        ],
        tags: ['walk-ins', 'fade specialist', 'open late'],
        adminEmail: 'admin@barberking.com',
        currentPeopleCount: 12,
    },
    {
        name: 'Aura Wellness Spa',
        category: 'spa',
        tagline: 'Relax, rejuvenate, radiate',
        address: '101, Juhu Scheme, Juhu',
        location: { lat: 19.1013, lng: 72.8260 },
        phone: '+91 98612 34567',
        openTime: '10:00', closeTime: '19:00',
        rating: 4.5, reviewCount: 289,
        verified: true, loyaltyPointsPerVisit: 120,
        avgServiceTime: 75,
        image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
        galleryImages: [],
        services: [
            { id: 's021', name: 'Swedish Massage (60m)', duration: 60, price: 2500, category: 'major' },
            { id: 's022', name: 'Deep Tissue Massage', duration: 75, price: 3000, category: 'major' },
            { id: 's023', name: 'Hydration Facial', duration: 60, price: 1800, category: 'major' },
            { id: 's024', name: 'Body Scrub & Wrap', duration: 90, price: 3500, category: 'major' },
        ],
        coupons: [
            { id: 'cp007', code: 'AURA30', type: 'percent', value: 30, description: '30% off on weekdays', minOrder: 2000, active: true, expiry: '2027-04-15' },
        ],
        tags: ['spa', 'wellness', 'couple packages'],
        adminEmail: 'admin@auraspa.com',
        currentPeopleCount: 4,
    },
    {
        name: 'Shear Genius',
        category: 'unisex',
        tagline: 'Style without compromise',
        address: '55, Waterfield Road, Bandra',
        location: { lat: 19.0567, lng: 72.8289 },
        phone: '+91 87654 32109',
        openTime: '09:00', closeTime: '21:00',
        rating: 4.4, reviewCount: 174,
        verified: false, loyaltyPointsPerVisit: 45,
        avgServiceTime: 45,
        image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&q=80',
        galleryImages: [],
        services: [
            { id: 's026', name: 'Creative Cut', duration: 60, price: 750, category: 'major' },
            { id: 's027', name: 'Root Touch-up', duration: 90, price: 2000, category: 'major' },
        ],
        coupons: [],
        tags: ['color expert', 'unisex'],
        adminEmail: 'admin@sheargenius.com',
        currentPeopleCount: 6,
    },
    {
        name: 'GentlemenFirst',
        category: 'barber',
        tagline: 'Where every man matters',
        address: '3, Chapel Road, Bandra',
        location: { lat: 19.0622, lng: 72.8247 },
        phone: '+91 70000 12345',
        openTime: '09:00', closeTime: '20:00',
        rating: 4.3, reviewCount: 220,
        verified: false, loyaltyPointsPerVisit: 35,
        avgServiceTime: 35,
        image: 'https://images.unsplash.com/photo-1596362601603-b74f6ef166b2?w=800&q=80',
        galleryImages: [],
        services: [
            { id: 's031', name: 'Scissor Cut', duration: 35, price: 400, category: 'small' },
            { id: 's032', name: 'Straight Razor Shave', duration: 30, price: 350, category: 'small' },
        ],
        coupons: [],
        tags: ['classic', 'razor specialist'],
        adminEmail: 'admin@gentlemenfirst.com',
        currentPeopleCount: 2,
    },
    {
        name: 'Pink Petal Studio',
        category: 'beauty',
        tagline: 'Beauty rituals redefined',
        address: '9, Pali Hill, Bandra West',
        location: { lat: 19.0574, lng: 72.8228 },
        phone: '+91 80012 34567',
        openTime: '10:00', closeTime: '20:00',
        rating: 4.7, reviewCount: 367,
        verified: true, loyaltyPointsPerVisit: 80,
        avgServiceTime: 65,
        image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80',
        galleryImages: [],
        services: [
            { id: 's035', name: 'Gel Nails', duration: 60, price: 900, category: 'major' },
            { id: 's036', name: 'Nail Art', duration: 75, price: 1200, category: 'major' },
            { id: 's037', name: 'Eyelash Extension', duration: 90, price: 2500, category: 'major' },
        ],
        coupons: [],
        tags: ['nail art', 'lashes', 'brows'],
        adminEmail: 'admin@pinkpetal.com',
        currentPeopleCount: 8,
    },
    {
        name: 'The Cut Above',
        category: 'unisex',
        tagline: 'Premium unisex styling',
        address: '88, SV Road, Santacruz West',
        location: { lat: 19.0785, lng: 72.8383 },
        phone: '+91 90009 88877',
        openTime: '09:00', closeTime: '21:30',
        rating: 4.6, reviewCount: 244,
        verified: true, loyaltyPointsPerVisit: 55,
        avgServiceTime: 55,
        image: 'https://images.unsplash.com/photo-1470259078422-826894b933aa?w=800&q=80',
        galleryImages: [],
        services: [
            { id: 's040', name: "Men's Style Cut", duration: 40, price: 500, category: 'small' },
            { id: 's041', name: "Women's Style Cut", duration: 60, price: 700, category: 'major' },
        ],
        coupons: [],
        tags: ['unisex', 'premium'],
        adminEmail: 'admin@cutabove.com',
        currentPeopleCount: 5,
    },
    {
        name: 'Urban Trim',
        category: 'barber',
        tagline: 'Fast cuts. Real results.',
        address: '17, Andheri Station Road, Andheri West',
        location: { lat: 19.1188, lng: 72.8462 },
        phone: '+91 99001 23456',
        openTime: '08:30', closeTime: '21:00',
        rating: 4.2, reviewCount: 155,
        verified: false, loyaltyPointsPerVisit: 25,
        avgServiceTime: 25,
        image: 'https://images.unsplash.com/photo-1593702288561-b8a6c4e8a1a7?w=800&q=80',
        galleryImages: [],
        services: [
            { id: 's044', name: 'Express Cut', duration: 20, price: 200, category: 'small' },
            { id: 's045', name: 'Fade + Design', duration: 50, price: 600, category: 'small' },
        ],
        coupons: [
            { id: 'cp011', code: 'URBAN50', type: 'flat', value: 50, description: '₹50 off on express cut', minOrder: 150, active: true, expiry: '2027-03-31' },
        ],
        tags: ['express', 'affordable', 'walk-ins'],
        adminEmail: 'admin@urbantrim.com',
        currentPeopleCount: 11,
    },
    {
        name: 'Velvet Touch',
        category: 'beauty',
        tagline: 'Indulge in beautiful',
        address: '34, Juhu Church Road, Juhu',
        location: { lat: 19.1073, lng: 72.8252 },
        phone: '+91 88812 34567',
        openTime: '11:00', closeTime: '20:00',
        rating: 4.8, reviewCount: 478,
        verified: true, loyaltyPointsPerVisit: 90,
        avgServiceTime: 70,
        image: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800&q=80',
        galleryImages: [],
        services: [
            { id: 's047', name: 'Hydra Facial', duration: 75, price: 2800, category: 'major' },
            { id: 's048', name: 'LED Light Therapy', duration: 45, price: 1500, category: 'small' },
        ],
        coupons: [
            { id: 'cp012', code: 'GLOW20', type: 'percent', value: 20, description: '20% off skin treatments', minOrder: 1500, active: true, expiry: '2027-04-30' },
        ],
        tags: ['advanced skincare', 'glow'],
        adminEmail: 'admin@velvettouch.com',
        currentPeopleCount: 6,
    },
    {
        name: 'Craft & Comb',
        category: 'salon',
        tagline: 'Artful hair, every visit',
        address: '11, Perry Cross Road, Bandra',
        location: { lat: 19.0609, lng: 72.8276 },
        phone: '+91 77712 34567',
        openTime: '09:00', closeTime: '20:00',
        rating: 4.5, reviewCount: 302,
        verified: false, loyaltyPointsPerVisit: 50,
        avgServiceTime: 50,
        image: 'https://images.unsplash.com/photo-1595475038784-bbe439ff41e6?w=800&q=80',
        galleryImages: [],
        services: [
            { id: 's051', name: 'Precision Cut', duration: 45, price: 550, category: 'small' },
            { id: 's052', name: 'Color & Style', duration: 120, price: 2500, category: 'major' },
        ],
        coupons: [],
        tags: ['precision', 'hair health'],
        adminEmail: 'admin@craftcomb.com',
        currentPeopleCount: 4,
    },
];

async function seed() {
    try {
        await connectDB();

        const existing = await Salon.countDocuments();
        if (existing > 0) {
            console.log(`ℹ️  ${existing} salons already in DB. Skipping seed.`);
            console.log('   To re-seed, first run: db.salons.deleteMany({})');
            await mongoose.disconnect();
            return;
        }

        const created = await Salon.insertMany(DEMO_SALONS);
        console.log(`✅ Seeded ${created.length} salons into MongoDB.`);

        // Log IDs for reference
        created.forEach(s => {
            console.log(`   📍 ${s.name} → ${s._id}`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Done! MongoDB connection closed.');
    } catch (err) {
        console.error('❌ Seeder error:', err);
        await mongoose.disconnect();
        process.exit(1);
    }
}

seed();
