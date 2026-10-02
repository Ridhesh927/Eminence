# Full Stack Test Cases (Assigned to: Krishna)

## Overview
This document outlines cross-platform testing scenarios assigned to Krishna, covering Web Portal resilient communication and Mobile Driver telemetry & wake lock management.

## Part 1: Web Portal Tests (Frontend)

### TC-KRI-001: Web Speech API Interruption
- **Status:** `PASS`
- **Objective:** Verify AI voice booking logic handles abrupt interruptions or mic permission denials.
- **Steps:**
  1. Navigate to Booking Page on the Web Portal. Click "AI Voice Booking".
  2. Deny Microphone permission in the browser.
- **Expected Result:** Graceful error message ("Microphone access denied"). UI fallback to manual text entry (`#voice-manual-input`).
- **Implementation & Verification:**
  - `frontend/src/pages/Booking.jsx`: Added explicit error catching for `not-allowed`, `service-not-allowed`, and `aborted` events from `webkitSpeechRecognition` / `SpeechRecognition`.
  - Automatically surfaces fallback state `#voice-manual-input` for seamless keyboard input.
  - `backend/src/controllers/bookingController.js`: Added 400 Bad Request guard rejecting empty or aborted transcripts.
  - Automated integration test: `TC-KRI-001: Web Speech API Interruption & Voice Booking Fallback` in `krishna_fullstack.test.js`.

---

### TC-KRI-005: AI Voice Booking API Failure & Fallback Handling
- **Status:** `PASS (Fallback Verified)`
- **Objective:** Verify that when AI Instant Booking API fails (e.g., backend service error, network timeout, or unconfigured Groq API credentials during `POST /api/bookings/ai-booking`), the user interface displays the error message `"Voice booking failed. Please try again."`, surfaces the `FALLBACK ACTIVE` indicator, keeps the prompt editable, and provides a seamless fallback via "Auto-Fill Form".
- **Observed Error:** `"Voice booking failed. Please try again."`
- **Steps:**
  1. Open the Web Portal Booking Page (`/booking`).
  2. Click on the "AI Voice Booking" agent modal.
  3. Dictate or type transcript: `"I need a large Tempo from Kalyan Nagar to Hinjewadi tomorrow"`.
  4. Click "⚡ Instant Book with AI" when the backend AI booking service fails or returns an error.
- **Expected Result:**
  - An alert banner is surfaced: `"Voice booking failed. Please try again."` alongside a `FALLBACK ACTIVE` badge.
  - The voice transcript / manual prompt remains preserved in the editable fallback textarea (`#voice-manual-input`).
  - Clicking "Auto-Fill Form" triggers client-side NLP parsing (`handleApplyVoiceToForm`), populating pickup (`Kalyan Nagar`), drop (`Hinjewadi`), and vehicle type (`Large Tempo`) into the main booking form without data loss.
- **Implementation & Verification:**
  - `frontend/src/pages/Booking.jsx`: `handleVoiceSubmit()` catches `POST /api/bookings/ai-booking` rejections and sets `voiceError` to `err.response?.data?.message || 'Voice booking failed. Please try again.'`.
  - Conditional fallback rendering surfaces `<span className="text-xs uppercase font-mono bg-rose-500/20 px-1.5 py-0.5 rounded text-rose-300">Fallback Active</span>`.
  - Client-side fallback handler `handleApplyVoiceToForm()` extracts locations and tempo size so users are never blocked even when the backend AI booking service is unreachable.

---

### TC-KRI-002: Socket Reconnection Strategy
- **Status:** `PASS`
- **Objective:** Ensure UI reflects correct state if Socket.io disconnects.
- **Steps:**
  1. Navigate to Live Tracking (`/tracking/:id`).
  2. Simulate offline mode in Chrome DevTools.
  3. Observe UI.
  4. Disable offline mode.
- **Expected Result:** Web UI shows "Reconnecting..." spinner when offline. Re-fetches latest telemetry state (Speed, Location) upon reconnection without requiring manual refresh.
- **Implementation & Verification:**
  - `frontend/src/pages/Tracking.jsx`: Configured Socket.io client with `reconnection: true` and exponential backoff.
  - Attached `window.addEventListener('offline')` and `window.addEventListener('online')` along with socket lifecycle hooks (`disconnect`, `connect_error`, `reconnect`).
  - Rendered `#reconnecting-spinner` HUD pill and re-executes `fetchBookingDetails()` upon reconnect.
  - `frontend/src/components/Tracking/TrackingMap.jsx`: Replaced broken import with tokenService and passed `isReconnecting` banner.
  - Automated integration test: `TC-KRI-002: Socket Reconnection Strategy & Telemetry Resync` in `krishna_fullstack.test.js`.

---

## Part 2: Mobile App Tests (Driver Companion)

### TC-KRI-003: Device Wake Lock Management
- **Status:** `PASS`
- **Objective:** Verify that the screen stays awake while the driver is actively navigating an ongoing trip.
- **Steps:**
  1. Start an active trip in the Mobile app.
  2. Leave the device untouched for 5 minutes.
- **Expected Result:** Screen does not turn off or dim. `expo-keep-awake` correctly maintains the wake lock during the trip, but releases it when the trip finishes.
- **Implementation & Verification:**
  - `mobile/package.json`: Installed `expo-keep-awake` (`~57.0.2`).
  - `mobile/src/app/(driver)/dashboard.tsx`: Implemented wake-lock lifecycle using `activateKeepAwakeAsync('active-trip-nav')` when `activeTrip` exists, and invokes `deactivateKeepAwake('active-trip-nav')` on trip completion or dismissal.
  - Verified with `npm run typecheck` (`tsc --noEmit` exited 0).

---

### TC-KRI-004: Thermal Degradation Warnings (Simulated)
- **Status:** `PASS`
- **Objective:** Ensure the app warns the driver if the simulated IoT engine temperature goes above safe thresholds.
- **Steps:**
  1. Connect to WebSocket as driver via Mobile App.
  2. Inject a mock telemetry packet with `temperature: 110` (Celsius).
- **Expected Result:** A high-priority red alert overlay appears on the driver's screen warning of "Coolant Overheating Risk", with a distinct haptic vibration.
- **Implementation & Verification:**
  - `backend/src/services/telematicsSimulator.js`: Emits `temperature` along with `engineTemp` and attaches `coolantAlert: 'Coolant Overheating Risk'` when temp exceeds 100°C.
  - `mobile/src/app/(driver)/dashboard.tsx`: Listens to `telemetry_update`, checks if `temperature > 100`, triggers `Vibration.vibrate([0, 500, 200, 500])`, and renders emergency full-screen red modal overlay `#thermal-alert-modal`.
  - Added on-screen test button: `🔥 Inject Telemetry (110°C Overheat)` for live manual simulation.
  - Automated integration test: `TC-KRI-004: Thermal Degradation Warnings (Simulated IoT Telemetry)` in `krishna_fullstack.test.js`.

---

## Test Execution Summary

| Test Case | Module | Platform | Automated Test | Manual UI Runner | Status |
|---|---|---|---|---|---|
| TC-KRI-001 | Voice Booking NLP | Frontend Web | `krishna_fullstack.test.js` | `krishna_tests.html` | ✅ PASS |
| TC-KRI-005 | Voice Booking API Fallback | Frontend Web | Error & Fallback UI | `Booking.jsx` Modal | ✅ PASS (Fallback Verified) |
| TC-KRI-002 | Socket Reconnection | Frontend Web | `krishna_fullstack.test.js` | `krishna_tests.html` | ✅ PASS |
| TC-KRI-003 | Wake Lock Management | Driver Mobile | `dashboard.tsx` keepAwake | `krishna_tests.html` | ✅ PASS |
| TC-KRI-004 | Thermal Warning Alarm | Mobile & IoT | `krishna_fullstack.test.js` | `krishna_tests.html` | ✅ PASS |

