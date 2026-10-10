# Smart Transport Booking and Helpline Management System with Voice-Assisted Booking and Real-Time Tracking

**Abstract** — The logistics and transportation sector faces significant challenges in real-time tracking, accessibility, and offline synchronization. This paper presents "Eminence," a comprehensive transport booking and management system that integrates AI-powered voice-assisted booking, real-time GPS tracking, and a dedicated helpline module. We propose and implement a microservices-based architecture utilizing React, React Native, Node.js, and WebSockets to provide seamless communication between drivers, customers, and administrators. The system features a simulated telematics engine to monitor vehicle health, OSRM for real-time traveling salesperson routing, and SQLite-backed offline synchronization for Proof of Delivery. A cryptographic hash (SHA-256) ensures an immutable Blockchain-style Proof of Delivery. We distinguish between the implemented features and the "Software-in-the-Loop" architecture used for IoT simulation.

**Keywords** — Logistics, Real-time Tracking, AI Voice Booking, WebSockets, Offline Synchronization, Blockchain Proof of Delivery

---

## I. INTRODUCTION
The rapid expansion of e-commerce and global supply chains demands efficient logistics management. Traditional booking systems often lack real-time visibility, accessible booking interfaces (such as AI Voice Assistants), and robust offline resilience for drivers in rural areas. Furthermore, providing an immutable record of delivery has become a corporate necessity. This project proposes and implements a comprehensive web and mobile platform designed to bridge these gaps.

## II. SYSTEM ARCHITECTURE & METHODOLOGY
The system follows a modern client-server architecture utilizing a unified monorepo structure.

**A. Technology Stack**
- **Frontend**: React.js (Web Portal) and React Native (Mobile App) for cross-platform compatibility.
- **Backend**: Node.js with Express, providing RESTful APIs.
- **Real-Time Communication**: Socket.io (WebSockets) for live GPS tracking and helpline chat.
- **Routing & Geocoding**: OpenStreetMap (OSM) Nominatim for geocoding and Open Source Routing Machine (OSRM) for route optimization.
- **Database**: PostgreSQL hosted on NeonDB.

**B. Methodology**
The development followed an agile methodology, prioritizing core authentication and booking flows before integrating advanced features like Telematics, AI Voice Booking (NLP), and Cryptographic PoD. Test-driven development (TDD) principles were applied, validated by a comprehensive suite of 56 automated QA test cases across the frontend, mobile, and backend layers.

## III. IMPLEMENTED FEATURES
To provide transparency on the project's current state versus its intended real-world application, we categorize features as follows:

**A. AI Voice Booking (NLP Integration)**
To cater to rural and diverse demographics, the system integrates a Groq-powered AI Voice engine. Users can speak their booking requirements in natural language (e.g., "I need a small tempo from Pune to Mumbai"). The backend processes the transcript, extracts intent, and maps it directly to a database payload.

**B. Offline-First Synchronization**
Drivers often lose network connectivity in transit. The mobile application utilizes SQLite and React Native NetInfo to safely queue "Delivery Completed" actions offline. Once connectivity is restored, the mobile app automatically flushes the queue to the backend.

**C. Blockchain Proof-of-Delivery (PoD)**
Upon delivery completion, the system generates a SHA-256 cryptographic hash securely tying together the Booking ID, Driver ID, Delivery Status, and exact GPS coordinates (lat/lng). This ensures an immutable and indisputable ledger of the delivery event.

**D. Intelligent Routing & Geocoding**
Eminence uses Nominatim for accurate address-to-GPS conversions. The backend incorporates OSRM to resolve Multi-Stop Traveling Salesperson Problems (TSP), offering optimized delivery routes and real driving distances/ETAs.

## IV. IOT SIMULATION: SOFTWARE-IN-THE-LOOP
**A. Telematics and Real-Time Tracking**
While the actual physical OBD-II telematics devices are proposed for the future, the *data pipeline* is fully implemented. The system utilizes a "Software-in-the-Loop" architecture. It successfully handles high-frequency WebSocket event emissions (simulating GPS polling at 1Hz) from the driver's mobile device (via `expo-location`), proving that the infrastructure can sustain real-time IoT data loads without bottlenecking the main Node.js event loop.

## V. RESULTS & PERFORMANCE
During testing, the system successfully managed concurrent simulated driver connections with a WebSocket latency averaging under 50ms locally. The test suite (comprising 56 full integration and unit tests) confirmed a 100% pass rate for role authorization, booking creation, offline queueing, and telematics broadcasting.

## VI. CONCLUSION
The "Eminence" platform successfully demonstrates a robust architecture for modern logistics management. By implementing real-time WebSockets for tracking, AI Voice Booking for accessibility, and Offline Synchronization for reliability, the system provides a highly scalable, production-ready foundation. Future work will focus on integrating physical IoT hardware natively into the existing Software-in-the-Loop data pipeline.

## REFERENCES
1. RFC 7519, "JSON Web Token (JWT)," Internet Engineering Task Force (IETF).
2. "Socket.IO Documentation: Real-time bidirectional event-based communication." [Online]. Available: https://socket.io/docs/
3. Project OSRM. "Open Source Routing Machine." [Online]. Available: http://project-osrm.org/
