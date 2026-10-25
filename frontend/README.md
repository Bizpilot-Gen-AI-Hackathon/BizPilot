# BizPilot Frontend

BizPilot is a React + Vite prototype for business sales, inventory, reports, and AI-assisted insights.

## Run locally

From this `frontend` directory:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173/`). The Vite entry point is `index.html`, which loads `src/main.jsx` and `src/App.jsx`.

## Available screens

- Public landing page
- Login and signup screens
- Business overview dashboard
- Products catalogue
- Inventory
- Reports and insights
- AI assistant UI
- Sample-data import modal

The frontend starts on the landing page. **Explore the workspace** opens the demo dashboard without login. The email login/signup form also enters the demo workspace after local form validation; it does not create or verify an account.

## Integration status

- Google sign-in/sign-up is UI-only until OAuth credentials and an authentication provider are configured.
- Sales, inventory, and assistant API helpers target the backend at `http://localhost:8000` by default. Set `VITE_API_URL` in `.env.local` to change it.
- Sample/mock data is used where backend endpoints are not implemented or available.
- Do not use the demo login for real accounts or sensitive business data.
