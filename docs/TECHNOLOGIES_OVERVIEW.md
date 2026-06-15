# SafeSignal Technologies Overview

This is a high-level summary of the main technologies used across the project.

## Overall Stack

| Area | Technologies |
|---|---|
| Mobile app | Expo, React Native, React, JavaScript |
| Moderator dashboard | React, Vite, Tailwind CSS, JavaScript |
| Backend API | Node.js, Express, Socket.IO |
| Database | PostgreSQL, PostGIS |
| ML service | Python, FastAPI, Uvicorn |
| ML models/providers |  Google Gemini |
| Cache | Redis |
| Authentication | JWT, bcrypt, Google Sign-In |
| Maps | Google Maps, React Native Maps, deck.gl |
| Notifications | Socket.IO realtime events, Firebase Cloud Messaging, Expo Notifications, Notifee |
| Media storage | Local upload storage, optional Cloudflare R2 via S3-compatible API |
| Monitoring/logging | Sentry, Winston |
| Deployment | Render, Neon, Docker |
| Testing | Jest, Supertest, Node test runner, pytest-style ML tests |

## By Component

### Mobile App

The mobile app is built with Expo and React Native. It uses React Navigation for screens, React Query for API data, React Native Maps for maps, Expo modules for location/media/notifications, and Secure Store or AsyncStorage for local persistence.

### Moderator Dashboard

The dashboard is a React web app built with Vite and styled with Tailwind CSS. It uses React Router for navigation, React Query for API data, Google Maps and deck.gl for map/heatmap views, Lucide icons, and Socket.IO for realtime updates.

### Backend

The backend is a Node.js and Express API. It uses PostgreSQL through pg-promise, JWT authentication, bcrypt password hashing, Socket.IO realtime events, Multer for uploads, Firebase Admin for push notifications, and Sentry/Winston for monitoring and logging.

### Database

The database is PostgreSQL with PostGIS for geospatial incident data and location queries. It stores users, incidents, reports, moderation history, ML outputs, notifications, and witness-corroboration data.

### ML Service

The ML service is a Python FastAPI service. a Gemini-backed provider for LLM analysis, embeddings, insights, and media judgment.

### Deployment and Tooling

The deployment docs target Render for backend and ML hosting, Neon for PostgreSQL, Docker for the ML service, and Redis for caching. JavaScript dependencies are managed with npm.
