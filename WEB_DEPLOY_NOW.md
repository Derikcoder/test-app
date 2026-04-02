# Deploy Now: Remote Web UAT Setup

This guide gets your app remotely accessible for testing using:
- Backend: Render
- Frontend: Netlify

Estimated time: 30-60 minutes.

## 1) Deploy Backend API (Render)

1. Push latest code to GitHub main branch.
2. In Render, create a new Web Service from this repo.
3. Render will read [render.yaml](render.yaml).
4. In Render service environment variables, set:
   - `MONGODB_URI` = your MongoDB Atlas URI
   - `JWT_SECRET` = long random production secret
   - `CORS_ORIGIN` = your Netlify site URL (set this after step 2 if needed)
5. Deploy and copy backend URL, for example:
   - `https://test-app-api.onrender.com`
6. Verify health endpoint:
   - `https://test-app-api.onrender.com/api/health`

Expected: JSON response with status OK.

## 2) Deploy Frontend (Netlify)

1. In Netlify, import this GitHub repo.
2. Netlify will read [netlify.toml](netlify.toml).
3. Add environment variable in Netlify:
   - `VITE_API_URL` = `https://<your-render-domain>/api`
   - `VITE_GOOGLE_MAPS_API_KEY` = your restricted browser key
4. Deploy site and copy Netlify URL, for example:
   - `https://test-app-uat.netlify.app`

## 3) Finalize CORS on Backend

1. Go back to Render env vars.
2. Set or update:
   - `CORS_ORIGIN=https://<your-netlify-domain>`
3. Redeploy backend if required by Render.

## 4) Smoke Test (Remote)

Run these in order from a real browser (not localhost):
1. Open frontend URL.
2. Register or login.
3. Open Customers page and submit test customer.
4. Open Service Calls page and create test call.
5. Open Quotations flow and save one quote.

If all pass, remote UAT is ready.

## 5) Troubleshooting

- 401 or login issues:
  - Confirm `JWT_SECRET` exists on backend.
- Network error in browser:
  - Confirm frontend `VITE_API_URL` ends with `/api`.
- CORS error:
  - Confirm `CORS_ORIGIN` exactly matches Netlify origin.
- Maps not loading:
  - Confirm Google Maps API key allows your Netlify domain.

## 6) What to Share With UAT Team

1. Frontend URL (Netlify).
2. Test user credentials (or registration instructions).
3. UAT checklist and bug template.
4. Start/end dates for test window.
