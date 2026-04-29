# 🚀 AstraFlare Deployment Guide

This guide provides step-by-step instructions to deploy AstraFlare to production.

## 1. Infrastructure Setup

### A. MongoDB (Database)
1.  Sign up for [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2.  Create a new Cluster (the Free Tier is sufficient for testing).
3.  In **Network Access**, allow access from all IP addresses (`0.0.0.0/0`) or specific IP ranges of your deployment platforms.
4.  In **Database Access**, create a user with `readWriteAnyDatabase` privileges.
5.  Get your **Connection String** (e.g., `mongodb+srv://<user>:<password>@cluster0.mongodb.net/astraflare`).

### B. Redis (Caching & Queues)
1.  Sign up for [Upstash](https://upstash.com/).
2.  Create a new Redis database.
3.  Copy the **Redis URL** (e.g., `redis://default:<password>@<endpoint>:<port>`).

---

## 2. Deploying Services

### A. ML Service (Render/Railway)
*The ML Service is too large for Vercel and should be deployed to a platform that supports Docker or long-running Python processes.*

1.  **Render**: Create a new **Web Service** and point it to the `ml-service` directory (or use the `Dockerfile`).
2.  **Environment Variables**:
    *   `PORT=8000`
3.  **URL**: Copy the service URL (e.g., `https://astraflare-ml.onrender.com`).

### B. Backend Server (Render/Railway)
1.  **Render**: Create a new **Web Service** and point it to the `server` directory.
2.  **Build Command**: `npm install`
3.  **Start Command**: `npm start`
4.  **Environment Variables**:
    *   `MONGODB_URI`: Your Atlas URI.
    *   `REDIS_URL`: Your Upstash URL.
    *   `ML_SERVICE_URL`: The URL from step 2A.
    *   `JWT_SECRET`: A random secure string.
    *   `ENCRYPTION_KEY`: A random 32-character string.
    *   `CLIENT_URL`: The URL of your Vercel frontend (see step 2C).
5.  **URL**: Copy the service URL (e.g., `https://astraflare-api.onrender.com`).

### C. Frontend Client (Vercel)
1.  Connect your GitHub repository to [Vercel](https://vercel.com).
2.  Set the **Root Directory** to `client` or use the provided `vercel.json`.
3.  **Environment Variables**:
    *   `VITE_API_BASE_URL`: The Backend URL from step 2B (e.g., `https://astraflare-api.onrender.com/api`).
4.  **Deploy!**

---

## 3. Post-Deployment Verification
1.  Visit your Vercel URL.
2.  Check if the login/signup works (verifies Backend + MongoDB).
3.  Try running a prediction (verifies Backend + ML Service).
4.  Check for real-time alerts (verifies WebSockets).
