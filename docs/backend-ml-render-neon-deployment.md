# Backend and ML Deployment Guide: Render + Neon

This guide walks through deploying the SafeSignal backend and ML service so the APK can use a hosted API instead of local `localhost` services.

## Target Architecture

```text
Mobile APK
  -> Render backend service
      -> Neon PostgreSQL database
      -> Render ML service
```

The deployed URLs should end up looking like this:

```text
Backend API: https://safesignal-backend.onrender.com/api
Backend socket URL: https://safesignal-backend.onrender.com
ML service URL: https://safesignal-ml.onrender.com
Database: Neon PostgreSQL connection string
```

## Before You Start

You need:

- A GitHub repository containing this project.
- A Render account.
- A Neon account.
- A production `JWT_SECRET`.
- Optional: a Gemini API key if the ML service should use `ML_PROVIDER=gemini`.

Do not upload local `.env` files or service account JSON files to GitHub.

## 1. Prepare the Repository

Commit and push the latest code:

```bash
git status
git add .
git commit -m "Prepare backend deployment"
git push
```

Render will deploy from GitHub, so only pushed code reaches the hosted services.

## 2. Create the Neon Database

1. Open Neon.
2. Create a new project.
3. Choose PostgreSQL.
4. Copy the connection string.
5. Open the Neon SQL editor and enable PostGIS:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

The connection string should look similar to:

```text
postgresql://user:password@host/dbname?sslmode=require
```

Save this value. It will become the backend `DATABASE_URL`.

## 3. Deploy the ML Service on Render

Create the ML service first because the backend needs its hosted URL.

1. Open Render.
2. Choose **New** -> **Web Service**.
3. Connect the GitHub repository.
4. Set the root directory:

```text
ml-service
```

5. Use the Docker environment if Render detects the `Dockerfile`.
6. Set the service name:

```text
safesignal-ml
```

7. Set the health check path:

```text
/health
```

8. Add environment variables.

Minimal local-model configuration:

```text
ML_SERVICE_PORT=5001
ML_PROVIDER=local
```

Gemini-backed configuration:

```text
ML_SERVICE_PORT=5001
ML_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
```

9. Deploy the service.

After deployment, test the health endpoint:

```text
https://safesignal-ml.onrender.com/health
```

Expected result:

```json
{
  "status": "healthy"
}
```

The response may include more fields. `degraded` means the service is reachable but the configured provider is not fully ready.

## 4. Deploy the Backend on Render

1. Open Render.
2. Choose **New** -> **Web Service**.
3. Connect the same GitHub repository.
4. Set the root directory:

```text
backend
```

5. Set the service name:

```text
safesignal-backend
```

6. Set the build command:

```bash
npm install
```

7. Set the start command:

```bash
npm start
```

8. Set the health check path:

```text
/api/health
```

9. Add required environment variables:

```text
NODE_ENV=production
DATABASE_URL=your_neon_connection_string
JWT_SECRET=replace_with_a_long_random_secret
ML_SERVICE_URL=https://safesignal-ml.onrender.com
ML_TIMEOUT_MS=35000
ML_MEDIA_TIMEOUT_MS=120000
```

Optional environment variables:

```text
JWT_EXPIRES_IN=7d
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn
FIREBASE_SERVICE_ACCOUNT_JSON=your_firebase_service_account_json
```

10. Deploy the service.

After deployment, test the backend health endpoint:

```text
https://safesignal-backend.onrender.com/api/health
```

Expected result:

```json
{
  "status": "OK"
}
```

## 5. Initialize or Migrate the Production Database

The backend code can connect to Neon through `DATABASE_URL`, but the database still needs the schema.
The schema uses PostGIS `GEOGRAPHY` columns, so confirm `CREATE EXTENSION IF NOT EXISTS postgis;` has already been run in Neon before this step.

From your local machine, run the database init against Neon:

```cmd
cd backend
set DATABASE_URL=your_neon_connection_string
npm run db:init
```

PowerShell version:

```powershell
cd backend
$env:DATABASE_URL="your_neon_connection_string"
npm run db:init
```

If you need demo data:

```powershell
$env:DATABASE_URL="your_neon_connection_string"
npm run db:seed
```

Only seed production if the data is safe for a public project showcase.

## 6. Update the Mobile Production URLs

The APK must point to the hosted backend.

Update `Mobile-part/src/services/apiClient.js`:

```js
if (!__DEV__) {
  return 'https://safesignal-backend.onrender.com/api';
}
```

Update `Mobile-part/src/utils/socketUrl.js`:

```js
if (!__DEV__) {
  return 'https://safesignal-backend.onrender.com';
}
```

After changing these values, rebuild the APK. A previously built APK will still contain the old URL.

## 7. Verify the Full Flow

Check these in order:

1. ML service health:

```text
https://safesignal-ml.onrender.com/health
```

2. Backend health:

```text
https://safesignal-backend.onrender.com/api/health
```

3. Backend logs in Render:

```text
Database connection successful
SafeSignal Backend running
```

4. Register or log in from the APK.
5. Submit a basic incident.
6. Confirm the incident appears in Neon.
7. Confirm backend logs do not show repeated ML failures.
8. Confirm realtime/socket features still connect.

## 8. How Updates Reach Production

Local changes do not update Render automatically until you push them.

Normal update flow:

```bash
git add .
git commit -m "Describe the backend change"
git push
```

Render will detect the push and redeploy the affected service.

If you change only `backend`, the backend service redeploys.
If you change only `ml-service`, the ML service redeploys.
If you change both, both services may redeploy.

## 9. Common Problems

### APK Still Calls Localhost

Cause:

```text
The APK was built before the production URL was updated.
```

Fix:

```text
Update the production URL in the mobile app and rebuild the APK.
```

### Backend Cannot Connect to Database

Check:

- `DATABASE_URL` is set in Render.
- The Neon connection string includes `sslmode=require`.
- The database schema was initialized with `npm run db:init`.

### Backend Cannot Reach ML Service

Check:

- `ML_SERVICE_URL` points to the Render ML service URL.
- The ML service `/health` endpoint works.
- The ML service is not still deploying or sleeping.

### First Request Is Slow

Free Render services can sleep after inactivity. The first request may wake the service and take longer than normal.

### Uploads Disappear

The backend currently has local upload storage under `backend/uploads`. Hosted local disk storage is not a reliable long-term place for user media on free services.

For a real deployment, move media uploads to one of:

- Cloudinary
- AWS S3
- Firebase Storage
- Supabase Storage

For a short project showcase, local upload storage may be acceptable if persistence is not being graded.

### ML Service Runs Out of Memory

The local ML provider loads large models. If Render free resources are not enough, use:

```text
ML_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
```

This shifts heavy inference away from the Render instance.

## 10. Deployment Checklist

- [ ] Code is pushed to GitHub.
- [ ] Neon database is created.
- [ ] Backend `DATABASE_URL` points to Neon.
- [ ] ML service is deployed on Render.
- [ ] Backend `ML_SERVICE_URL` points to the Render ML URL.
- [ ] Backend `JWT_SECRET` is not the local default.
- [ ] Backend `/api/health` returns `status: OK`.
- [ ] ML `/health` returns `healthy` or an understood `degraded` state.
- [ ] Production database schema is initialized.
- [ ] Mobile production API URL points to Render backend.
- [ ] APK is rebuilt after URL changes.
- [ ] Login/register works from the APK.
- [ ] Incident submission works from the APK.
