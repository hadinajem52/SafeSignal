# SafeSignal

SafeSignal is a community safety and incident intelligence platform that combines mobile reporting, real-time operations, moderation workflows, and ML-assisted analysis.

## Project Overview

The project is organized as a multi-component system:

- **Mobile App (`Mobile-part/`)**: User-facing reporting and safety experience built with Expo + React Native.
- **Backend API (`backend/`)**: Node.js/Express services for authentication, incident lifecycle, media handling, notifications, and realtime updates.
- **Moderator Dashboard (`moderator-dashboard/`)**: Web console for verification, triage, escalation, analytics, and case management.
- **ML Service (`ml-service/`)**: FastAPI microservice for incident classification, toxicity checks, similarity scoring, risk signals, and media judgment support.

## Core Product Capabilities

- Incident reporting with geolocation, category/severity context, and media evidence.
- Realtime operational updates across mobile users and dashboard staff.
- Moderation queues with review workflows, duplicate handling, and enforcement routing.
- Witness/community signal collection to improve incident confidence.
- ML-assisted incident analysis for category, toxicity, similarity, and risk.
- Operations and analytics views for trends, response behavior, and hotspot monitoring.

## System Design Highlights

- **Realtime backbone**: Socket-based event flow keeps queues, timelines, and alerts synchronized.
- **Geospatial intelligence**: PostgreSQL + PostGIS supports location-aware incident workflows.
- **Safety signal enrichment**: ML outputs are integrated into moderation and incident decision paths.
- **Role-based operations**: Distinct capabilities for citizen users, moderators, admins, and law-enforcement staff.

## Technology Snapshot

- **Client**: React Native (Expo), React, Vite, Tailwind CSS
- **Server**: Node.js, Express, Socket.IO
- **Data**: PostgreSQL, PostGIS, Redis
- **ML**: Python, FastAPI, Uvicorn
- **Auth & Security**: JWT, bcrypt, Google Sign-In
- **Notifications**: Firebase Cloud Messaging, Expo Notifications, Notifee
- **Observability**: Sentry, Winston

## Repository Layout

```text
SafeSignal/
├── Mobile-part/           # Mobile client
├── backend/               # Backend API and realtime services
├── moderator-dashboard/   # Web moderation and analytics UI
├── ml-service/            # ML microservice
├── docs/                  # Product, architecture, and deployment documentation
└── testcases/             # Test planning and QA artifacts
```

## Additional Documentation

- `/docs/TECHNOLOGIES_OVERVIEW.md` — cross-component technology map
- `/docs/MOBILE_DASHBOARD_FEATURES.md` — feature inventory for app and dashboard
- `/docs/backend-ml-render-neon-deployment.md` — hosted deployment reference
