# Deployment Guide for "AIGramX" Project

This document provides a step-by-step guide to deploying the `AIGramX` project. The architecture consists of a Node.js/Express backend, which we will deploy on **Render**, and a React/Vite frontend, which we will deploy on **Vercel**.

---

## 1. Backend Deployment (Render)

Render is an excellent platform for hosting Node.js applications.

### Prerequisites
- A GitHub/GitLab account where your code is pushed.
- A Render account (https://render.com).
- A MongoDB database (e.g., MongoDB Atlas).
- A Cloudinary account for media storage.

### Steps to Deploy

1. **Log into Render** and go to your Dashboard.
2. Click on **New +** and select **Web Service**.
3. **Connect your Git repository** containing this project.
4. Fill in the deployment settings:
   - **Name**: `AIGramX-backend` (or your preferred name)
   - **Root Directory**: `backend` (This is crucial as it tells Render where the backend code lives)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/index.js` (Recommended for production, rather than `npm start` which currently uses `tsx`)
5. **Configure Environment Variables**:
   Scroll down to the "Environment Variables" section and add the following keys (based on your `.env.example`):
   - `MONGODB_URI`: Your MongoDB connection string (e.g., from MongoDB Atlas)
   - `JWT_SECRET`: A strong random string for JWT signing
   - `CLOUDINARY_CLOUD_NAME`: Your Cloudinary Cloud Name
   - `CLOUDINARY_API_KEY`: Your Cloudinary API Key
   - `CLOUDINARY_API_SECRET`: Your Cloudinary API Secret
   - `NODE_ENV`: `production`
6. Click **Create Web Service**. 
7. Render will now build and deploy your backend. Once successful, copy the backend URL (e.g., `https://AIGramX-backend.onrender.com`). You will need this for the frontend.

---

## 2. Frontend Deployment (Vercel)

Vercel is highly optimized for Vite and React applications.

### Prerequisites
- A Vercel account (https://vercel.com).
- Your backend deployed (so you have the API URL).

### Steps to Deploy

1. **Log into Vercel** and go to your dashboard.
2. Click **Add New...** and select **Project**.
3. **Import your Git repository** containing the `AIGramX` project.
4. In the **Configure Project** section:
   - **Project Name**: `AIGramX-frontend`
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click "Edit" and select `frontend`.
5. **Build and Output Settings** (Vercel usually auto-detects these, but confirm them):
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
6. **Environment Variables**:
   Add any environment variables your frontend requires to communicate with the backend. Typically, Vite expects variables to be prefixed with `VITE_`.
   - e.g., `VITE_API_URL`: `<Your-Render-Backend-URL>` (e.g., `https://AIGramX-backend.onrender.com`)
   *(Note: ensure your frontend codebase is configured to use this variable for API calls and Socket.io connections!)*
7. Click **Deploy**.
8. Vercel will build and publish your frontend. Once completed, you will receive a public URL to access your application.

---

## Post-Deployment Checklist

- **CORS Configuration**: Ensure your backend `cors` configuration allows requests from your new Vercel frontend domain. You might need to update the CORS origin in `backend/src/index.ts` to include the Vercel URL.
- **WebSocket (Socket.io) Setup**: Ensure that the Socket.io client in your frontend is pointed to the deployed Render backend URL. Render natively supports WebSockets out of the box, so no extra proxy configuration is needed on Render.
- **Database IP Access**: If you are using MongoDB Atlas, make sure you have allowed access from anywhere (`0.0.0.0/0`) in your Network Access settings, or set it up to accept connections from Render's IPs.

Congratulations! Your `AIGramX` application is now live.
