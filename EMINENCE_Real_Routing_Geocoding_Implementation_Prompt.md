EMINENCE — Real Routing & Geocoding Implementation Prompt
Role
Act as a senior full-stack engineer working inside the existing EMINENCE repository. Implement the missing real-world geocoding, road routing, distance, and ETA functionality with minimal disruption to the current GPS tracking system.
Context from the prior audit
The audit report says the project already has:
- Expo device GPS via expo-location
- Background location tracking configured in mobile/src/services/LocationTracking.ts
- Backend live telemetry in backend/src/services/telemetryService.js
- Web live-tracking map in frontend/src/pages/Tracking.jsx, using React Leaflet and OpenStreetMap tiles
- PostgreSQL persistence through NeonDB
- Socket.io live updates
- Simulated straight-line distance / ETA logic in backend/src/services/routeOptimizer.js
- Incomplete or mocked geocoding for text addresses
These findings came from an audit report and have not been independently verified in this prompt. Verify each relevant claim in the repository before changing code.
Primary objective
Make pickup/drop-off addresses resolve to real coordinates and calculate routes, road distances, and ETAs using a real road-routing service, while preserving the existing working GPS, map, database, and Socket.io flow.
Non-negotiable rules
1. Inspect before editing. Read the relevant files, trace actual call paths, and identify the current API contracts and data models first.
2. Do not rebuild the project, replace the frontend map library, or rewrite GPS tracking unless inspection proves it is necessary.
3. Do not break existing booking flows, driver tracking, Socket.io event names, API response shapes, or database schemas. If a change is necessary, document it and update all affected callers.
4. Do not claim something is fixed or tested unless you actually ran the relevant checks.
5. Keep secrets and provider keys on the backend in environment variables. Never put secret keys in frontend or mobile client code.
6. Handle external API failures, timeouts, invalid addresses, rate limits, and missing coordinates gracefully.
7. Do not use Euclidean/straight-line distance as a road distance or present it as a real driving ETA. If routing is unavailable, clearly return an unavailable/estimated status rather than silently pretending it is accurate.
8. Do not introduce a paid provider by default. Prefer a low-cost/open-source-compatible implementation suitable for a student MVP, but confirm the provider's public-service usage policies and limits before relying on it in production.
9. Do not add dependencies unless needed. Do not remove existing dependencies without evidence.
10. Preserve existing coding conventions, error format, validation approach, and folder structure.
Phase 1 — Repository verification (do this first)
Inspect and trace:
- backend/src/services/routeOptimizer.js
- backend/src/services/telemetryService.js
- Relevant booking controllers/routes/services and validation schemas
- Relevant Sequelize models/migrations for bookings, pickup/drop-off coordinates, and trip data
- mobile/src/services/LocationTracking.ts
- frontend/src/pages/Tracking.jsx
- Any address search, geocoding, map, route, or ETA utilities already present
- .env.example, backend configuration, and existing test scripts
Before editing, write a concise findings summary in the terminal/report:
- What is actually implemented
- What is simulated or mocked
- Existing request/response shapes and Socket.io events
- Whether coordinates are persisted and their exact fields/types
- Where pickup/drop-off addresses enter the system
- Any blockers or schema gaps
Do not stop after writing the report: proceed to implementation if the findings confirm the requirements below can be implemented safely. Do not ask for approval unless there is a destructive migration, an unavoidable breaking API change, or a material choice that cannot be resolved from the repository.
Phase 2 — Implement geocoding
Implement a backend geocoding service behind a small reusable interface, for example:
- geocodeAddress(address, options?)
- Optionally reverseGeocode(latitude, longitude) if the current product needs coordinates-to-address conversion
Requirements:
- Choose a provider compatible with the current stack and budget. OSRM handles routing, not address geocoding; do not treat OSRM as a geocoder.
- For a no-key MVP, assess Nominatim or another suitable geocoder, and respect its current usage policy, attribution, identification, and rate limits. Do not assume its public endpoint is an unrestricted production service.
- Normalize and validate input; reject empty or clearly invalid addresses.
- Return a consistent internal result containing latitude, longitude, display label, and provider/source metadata where useful.
- Validate coordinates as finite numbers within valid ranges.
- Use request timeouts, bounded retries only where appropriate, and clear errors. Avoid retry loops.
- Add caching if compatible with the project, to reduce repeated lookups and respect provider limits. Use existing infrastructure first; do not introduce Redis solely for this unless justified.
- Do not geocode the same address on every GPS update.
- When the provider returns no useful match or multiple ambiguous matches, surface a clear response that lets the user choose or refine the address. Do not silently select a potentially wrong location.
- For bookings, store resolved pickup/drop-off coordinates in the existing schema if suitable. If schema changes are required, explain why and create the smallest safe migration.
- Keep user-entered address text for display; coordinates should not replace the human-readable address.
- Ensure voice/IVR or AI-created bookings follow the same validation/geocoding path as web/mobile bookings.
Phase 3 — Implement real road routing and ETA
Replace simulated route calculations in backend/src/services/routeOptimizer.js only after identifying all current callers and expected return fields.
Preferred initial candidate: OSRM's routing API, if compatible with project requirements and its service policy. Keep provider integration isolated so it can be changed later.
Requirements:
- Accept validated origin and destination coordinates.
- Request a driving route from the configured routing provider.
- Parse route geometry, road distance in metres, and duration in seconds.
- Return the existing expected fields where possible; document any unavoidable contract change.
- Convert units consistently for UI display.
- Handle no-route responses, malformed provider responses, timeouts, HTTP errors, and rate limits.
- Do not label straight-line distance as road distance.
- If routing fails, return a typed/clear unavailable state. A fallback straight-line distance may be shown only when explicitly labeled “straight-line estimate—not driving distance”; do not derive a driving ETA from it.
- Do not claim traffic-aware ETA if the selected provider does not supply traffic-aware routing.
- Keep route computation separate from live GPS telemetry. Driver position updates should not trigger a geocode request per update.
- If route geometry is already supported by the frontend, pass it through in a compatible format. If it is not, add the smallest compatible change needed to display the road route on the existing map.
Phase 4 — Frontend/mobile integration
Inspect actual booking and tracking flows before wiring anything.
- On pickup/drop-off entry, resolve the address and provide a clear way to confirm the correct location if the result is ambiguous.
- Preserve manual map-pin selection and current GPS-based pickup selection if these already exist.
- Make sure GPS “current location” is not automatically treated as the desired pickup address when the user needs to select a different pickup point.
- Show road distance and ETA only when a valid route result exists.
- Clearly show loading, invalid address, no-result, routing-unavailable, and retry states.
- Keep OpenStreetMap/React Leaflet and the current mobile map approach unless a verified issue requires change.
- Do not expose backend-only credentials in web/mobile environment variables.
- Preserve the existing live driver marker and Socket.io tracking behavior.
Phase 5 — Reliability and security checks
Verify rather than assume:
- Only the authenticated, authorized driver can submit location updates for the relevant trip.
- Only users authorized for a booking/trip can subscribe to its live location.
- Coordinates are validated and cannot be arbitrary malformed values.
- Socket.io reconnection resynchronizes with the latest known location, if this is part of the existing design.
- The UI distinguishes fresh location from stale location and handles a disconnected driver.
- Background location permissions and task registration work on a physical Android device; emulator-only tests are not sufficient proof of physical-device background operation.
- Avoid logging unnecessary precise location data or secrets.
Do not redesign authentication or the entire socket architecture as part of this task. Report security gaps and make focused fixes where safe.
Phase 6 — Configuration and documentation
- Add only the required backend environment variables to .env.example, with safe non-secret defaults where possible.
- Never write real secrets to tracked files.
- Document the chosen geocoder/router, expected configuration, usage limitations, attribution requirements, and how to replace the provider.
- If using public demo endpoints, clearly state they are suitable for development/testing only unless their policy says otherwise.
- Document how to test address lookup, routing, and failure cases.
Phase 7 — Tests and verification
Add or update tests following the existing test framework. At minimum, cover:
1. Valid address geocoding
2. No-result/ambiguous geocoding behavior
3. Invalid coordinate input
4. Valid route response parsing and unit conversion
5. No route found
6. Provider timeout/error/rate limit
7. Existing booking response compatibility
8. Regression check that live telemetry/Socket.io tracking still works
Mock external provider responses in automated tests; tests should not depend on a public service being online. Run the relevant test suite and build/lint scripts available in the repository. Report the actual commands and outcomes. If something cannot run, state why.
Deliverables
At completion, provide:
1. Files changed — each file and the reason for changing it.
2. Before/after behavior — distinguish verified existing behavior from newly implemented behavior.
3. Provider choice — geocoder and router, rationale, constraints, and whether any key is required.
4. API/data contract changes — exact changes, if any.
5. Database migration — whether one was needed and whether it was run.
6. Tests — commands run and actual pass/fail results.
7. Manual test steps — especially on a physical Android device.
8. Known limitations — public endpoint limits, ETA accuracy, background tracking constraints, and anything not verified.
Acceptance criteria
- Pickup/drop-off text can be resolved to validated coordinates through a real geocoding provider.
- Route distance and duration come from a real road-routing provider, not Euclidean calculations.
- Existing GPS acquisition, background tracking configuration, live driver marker, and Socket.io flow remain intact.
- Provider failure is handled visibly and safely.
- No secrets are exposed to client code or committed to the repository.
- Tests/build checks and unverified items are accurately reported.
Start with repository inspection, then implement the smallest safe end-to-end change. Do not merely return a plan; make the changes in the existing repository and report evidence for each acceptance criterion.