# GroomFinder ✂️

**Hyper-local Grooming Discovery & Priority Booking Platform**

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-site-id/deploy-status)](https://app.netlify.com/sites/your-site-id/deploys)

GroomFinder is a modern, responsive web application that helps users discover and book the best salons, barbershops, and beauty studios within a 5 km radius. It features live traffic updates, real-time queue tracking, and prepaid priority booking—all built as a blazing-fast Vanilla JavaScript Single Page Application (SPA).

## 🎥 Preview Video

*(Add your preview video link or embed here)*
> [Watch the Preview Video Here](./preview-video.mp4) 

*(If you have a YouTube/Vimeo link, you can embed it using: `[![GroomFinder Preview](https://img.youtube.com/vi/YOUR_VIDEO_ID/0.jpg)](https://www.youtube.com/watch?v=YOUR_VIDEO_ID)`)*

---

## ✨ Key Features

- **Hyper-local Discovery**: Finds stores specifically within a 5 km radius using location services.
- **Real-time Queue & Traffic**: View live wait times and store 'traffic' before booking.
- **Prepaid Priority Booking**: Customers can prepay for services to skip the queue with priority booking slots.
- **Dual User Roles**: 
  - **Customer Portal**: For browsing, booking, and managing appointments.
  - **Store Admin Panel**: For salon owners to manage queue status, inventory, and incoming bookings.
- **Progressive Web App (PWA)**: Installable on modern mobile devices with offline support via service workers.
- **Dark/Light Theme**: Native support for customizable system-preferred theming.

## 🛠️ Tech Stack

GroomFinder is built with an emphasis on zero-dependency performance and simplicity.

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3 (Custom Properties & Animations)
- **Architecture**: Custom Client-side SPA (`js/app.js`, `js/ui.js`)
- **Icons**: [Phosphor Icons](https://phosphoricons.com/)
- **Hosting / Deployment**: Configured for seamless deployment on [Netlify](https://www.netlify.com/) (`netlify.toml` included).
- **PWA Capabilities**: Verified Web App Manifest and Service Worker implementation.

## 🚀 Getting Started

To run the project locally, you don't need any complex build steps. 

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/groomfinder_app.git
   cd groomfinder_app
   ```

2. **Serve the project:**
   Since this uses ES modules and service workers, it must be run via a local web server (opening the file directly via `file://` will not work).
   
   If you have Python installed:
   ```bash
   python -m http.server 8000
   ```
   Or using Node.js (`http-server`, `live-server`):
   ```bash
   npx live-server
   ```

3. **Open in Browser:**
   Navigate to `http://localhost:8000`

## 📁 Repository Structure

```text
├── index.html          # Main SPA Entry Point
├── styles/             # Modular CSS Architecture
│   ├── main.css        # Global variables, typography, utilities
│   └── pages.css       # Page-level specific styling
├── js/                 # Vanilla JS application logic
│   ├── app.js          # Core application state & router
│   ├── auth.js         # Authentication logic (Customer/Store)
│   ├── bookings.js     # Booking state & checkout flow
│   ├── data.js         # Mock data / external data fetching
│   └── ui.js           # DOM rendering components and page generators
├── assets/             # Images, icons, and static material
├── manifest.json       # PWA Configuration metadata
├── sw.js               # Service Worker for offline capabilities
└── netlify.toml        # Netlify deployment configurations
```

## 🌐 Deployment

This application is ready to be deployed to **Netlify** natively. The included `netlify.toml` automatically handles SPA routing fallbacks and headers.

1. Connect your GitHub repository to Netlify.
2. Ensure the build directory is naturally set to the root (or standard HTML publish directory).
3. Deploy!

## 📜 License

This project is licensed under the [MIT License](LICENSE).
