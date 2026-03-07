# Deploying CodeGenius

This guide will walk you through deploying the **Backend to Render** and the **Frontend to Vercel**.

---

## 🚀 1. Deploy the Backend (Render)

Render is perfect for Python/Flask backends. Because CodeGenius saves files and Vector Embeddings (`chroma_data`) to disk, we need to attach a **Persistent Disk**.

1. Create a [Render](https://render.com) account and click **New +** > **Web Service**.
2. Connect your GitHub repository and select the `CodeGenius` repo.
3. **Settings**:
   - **Name**: `codegenius-api` (or whatever you prefer)
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
4. **Environment Variables**:
   Under **Environment**, add the required variables:
   - `GROQ_API_KEY` (Required for AI responses)
   - `PYTHON_VERSION`: `3.10.0` (Optional but recommended)
5. **Persistent Disk** (Crucial!):
   CodeGenius requires a disk to persist uploaded files and the Chroma vector database.
   - Click **Advanced** > **Add Disk**
   - **Name**: `chroma_storage`
   - **Mount Path**: `/opt/render/project/src/backend/chroma_data`
   - **Size**: 1GB (will be enough for thousands of files)
6. Click **Create Web Service**. 
7. Once deployed, copy your shiny new Render URL (e.g., `https://codegenius-api.onrender.com`).

---

## ⚡ 2. Deploy the Frontend (Vercel)

Vercel is the fastest way to deploy React + Vite applications.

1. Create a [Vercel](https://vercel.com) account and click **Add New** > **Project**.
2. Import your `CodeGenius` GitHub repository.
3. Configure the **Framework Preset**:
   - Vercel should auto-detect **Vite**. If not, select Vite from the dropdown.
   - **Root Directory**: Select `Edit` and change it to `frontend`
4. **Environment Variables**:
   - Add a new variable named `VITE_API_BASE_URL`
   - Set the value to your **Render Backend URL** (e.g., `https://codegenius-api.onrender.com/api`)
5. Click **Deploy**.

## 💡 Usage

Congratulations! 🎉 
Go to your provided Vercel frontend URL, upload a ZIP folder, and the Vercel app will seamlessly communicate directly with your Render-backed Vector database!
