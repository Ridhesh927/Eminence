# Frontend Setup

This is the frontend for the Eminence project, built with React and Vite.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm (or yarn/pnpm)

## Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Environment Variables:
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Update `.env` with your actual configuration values.

## Running the Application

To start the development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

The application will typically be available at `http://localhost:5173`.

## Building for Production

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```
