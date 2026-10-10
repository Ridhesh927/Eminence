# EMINENCE - Final Project Report

## 1. Abstract
The "EMINENCE" project introduces a smart transport booking and helpline management system aimed at transforming tempo and local transport services. By integrating IoT-driven real-time tracking, AI Voice Bookings, and Offline-First mobile capabilities, Eminence sets a new standard for modern B2B and B2C logistics. 

## 2. Introduction
Traditional tempo and localized transport systems suffer from fragmentation, lack of real-time visibility, and inefficient route mapping. Eminence seeks to bridge this gap by offering an Uber-like experience for freight. Key innovations include AI-powered NLP voice bookings, cryptographically secured Proof of Delivery (PoD), and an offline-first mobile application architecture.

## 3. System Architecture
EMINENCE utilizes a robust, modern technology stack:
* **Frontend**: React + Vite (Web Portal), React Native + Expo (Driver & Customer Mobile App)
* **Backend**: Node.js + Express
* **Database**: PostgreSQL hosted on NeonDB
* **Real-time Telematics**: Socket.io WebSocket connections
* **Geocoding & Routing**: OpenStreetMap Nominatim and Open Source Routing Machine (OSRM)

## 4. Key Features Implemented

### 4.1. Real-Time Tracking & Telematics (IoT Simulation)
The platform uses an advanced Socket.io connection to stream real-time driver coordinates to the customer dashboard. In the absence of physical IoT hardware for the demo, a "Software-in-the-Loop" simulation is used to model live GPS movements, proving the architecture's readiness for actual production hardware.

### 4.2. AI Voice Booking (NLP Integration)
To cater to rural and diverse demographics, the system integrates a Groq-powered AI Voice engine. Users can speak their booking requirements in natural language (e.g., "I need a small tempo from Pune to Mumbai"). The backend processes the transcript, extracts intent, and maps it directly to a database payload.

### 4.3. Intelligent Routing & Geocoding
Eminence uses Nominatim for accurate address-to-GPS conversions. The backend incorporates OSRM to resolve Multi-Stop Traveling Salesperson Problems (TSP), offering optimized delivery routes and real driving distances/ETAs instead of simple Euclidean models.

### 4.4. Offline-First Synchronization
Drivers often lose network connectivity in transit. The mobile application utilizes SQLite and React Native NetInfo to safely queue "Delivery Completed" actions offline. Once connectivity is restored, the mobile app automatically flushes the queue to the backend.

### 4.5. Blockchain Proof-of-Delivery (PoD)
Upon delivery completion, the system generates a SHA-256 cryptographic hash securely tying together the Booking ID, Driver ID, exact GPS timestamp, and GPS coordinates. This ensures an immutable and indisputable ledger of the delivery event.

## 5. Conclusion
EMINENCE successfully demonstrates the convergence of AI, IoT, and logistics into a unified platform. The integration of offline-capabilities and real-time Socket telemetry creates a production-grade template ready for real-world deployment.
