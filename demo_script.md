# EMINENCE - Live Demo Script

**Pre-requisites before starting the demo:**
1. Ensure the NeonDB PostgreSQL database is connected and active.
2. Start the Backend server (`npm run dev` in `/backend`).
3. Start the Web Frontend (`npm run dev` in `/frontend`) and keep the Customer and Admin dashboards open in two separate browser tabs.
4. Start the Mobile App (`npx expo start` in `/mobile`) on a physical device or emulator for the Driver App.

---

### Step 1: The AI Voice Booking (Customer Web Portal)
* **Goal:** Showcase the Groq NLP integration and user accessibility.
* **Action:** 
  1. Open the Customer Dashboard in the browser.
  2. Click the **Microphone / Voice Book** button.
  3. Speak the following (or similar) into the microphone: *"I need a small tempo to deliver goods from Pune Railway Station to Koregaon Park immediately."*
  4. **Highlight to Professor:** Show how the NLP engine instantly extracts the Pickup, Drop, and Vehicle type, mapping it into the form without any manual typing.
  5. Click **Submit Booking**.

### Step 2: Intelligent Routing (Admin/Customer Dashboard)
* **Goal:** Demonstrate OSRM Routing and Nominatim Geocoding.
* **Action:**
  1. Open the Booking Details of the newly created booking.
  2. **Highlight to Professor:** Point out the actual driving distance, ETA, and the map rendering the real route (not a straight line). Explain that the system solved the routing using OSRM algorithms.

### Step 3: Dispatch & IoT Simulation (Admin & Driver Mobile)
* **Goal:** Showcase "Software-in-the-Loop" Telematics.
* **Action:**
  1. Switch to the Admin Dashboard and assign the booking to your Driver account.
  2. Open the **Driver Mobile App** and Accept the booking.
  3. Tap **Start Trip**.
  4. Keep the Admin Dashboard visible on the screen behind the mobile emulator.
  5. **Highlight to Professor:** As the driver emulator/device moves (or as the background location updates), show the live GPS coordinates broadcasting to the Admin Dashboard via Socket.io at high frequency (1Hz).

### Step 4: Offline Resilience (Driver Mobile App)
* **Goal:** Prove the system handles rural dead zones seamlessly.
* **Action:**
  1. On the Driver Mobile App, turn off Wi-Fi/Data (or enable Airplane Mode).
  2. Capture a photo for Proof of Delivery.
  3. Tap **Complete Delivery**.
  4. **Highlight to Professor:** Point out the alert saying *"Offline Mode: Delivery saved locally."* Show how the app didn't crash and the driver can move on to the next task.
  5. Turn Wi-Fi/Data back on.
  6. **Highlight to Professor:** Watch the background sync automatically push the queued request to the backend.

### Step 5: The Grand Finale - Blockchain PoD (Admin Database)
* **Goal:** Show the immutable cryptographic signature.
* **Action:**
  1. Go to the Admin Dashboard -> Completed Trips.
  2. Open the completed trip details.
  3. **Highlight to Professor:** Show the **PoD Hash** (the long SHA-256 string). Explain that it cryptographically binds the Driver ID, Booking ID, Delivery Status, and exact GPS Coordinates of the delivery moment, ensuring the event is immutable and transparent.

---
**End of Demo. Proceed to Q&A!**
