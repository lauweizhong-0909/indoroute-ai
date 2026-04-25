https://drive.google.com/drive/folders/1EJr99TRb-3AnXLiAm6mwhdt1gjHAvE-C
# indoroute-ai
AI Decision Engine for Malaysia → Indonesia Cross-Border E-commerce
# 🛠️ Prerequisites
 
Before you begin, ensure you have the following installed:
 
- Python 3.9+
- Node.js 18+
- PostgreSQL Database (e.g., Neon Serverless)
- Ilmu.ai API Key (for GLM-5.1 model access)
---
 
# ⚙️ 1. Backend Setup (FastAPI)
 
Navigate to the project root directory and set up the Python environment.
 
## Step 1.1: Environment Variables
 
Create a `.env` file in the root directory:
 
```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>
ILMU_API_KEY=your_ilmu_api_key_here
ZAI_GLM_BASE_URL=https://api.ilmu.ai/v1/chat/completions
```
 
## Step 1.2: Install Dependencies
 
```bash
# Create and activate a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
 
# Install required packages
pip install -r requirements.txt
```
 
## Step 1.3: Initialize Database & Seed Data
 
Run the following commands from the root folder:
 
```bash
# 1. Create the database tables in Neon
python create_tables.py
 
# 2. Seed the database with SKU and JSON data
python apps/api/seed.py
```
 
> ✅ You should see **"All data pushed to Neon successfully!"** if configured correctly.
 
## Step 1.4: Run the Local Server
 
```bash
python -m uvicorn apps.api.main:app --reload
```
 
- **API URL:** `http://127.0.0.1:8000`
- **Swagger UI Docs:** `http://127.0.0.1:8000/docs`
---
 
# 💻 2. Frontend Setup (Next.js)
 
Open a new terminal window and navigate to the frontend directory.
 
## Step 2.1: Environment Variables
 
Create a `.env.local` file inside `apps/web/`:
 
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```
 
## Step 2.2: Install Dependencies
 
```bash
cd apps/web
npm install
```
 
## Step 2.3: Run the Development Server
 
```bash
npm run dev
```
 
- **Frontend URL:** `http://localhost:3000`
---
 
# ☁️ Deployment Guides
 
## Backend (Render)
 
1. Connect your GitHub repository to Render as a **Web Service**.
2. **Build Command:** `pip install -r requirements.txt`
3. **Start Command:** `uvicorn apps.api.main:app --host 0.0.0.0 --port $PORT`
4. Add your `.env` variables to Render's **Environment** panel.
## Frontend (Vercel)
 
1. Import the repository into **Vercel**.
2. Set the **Framework Preset** to `Next.js`.
3. Set the **Root Directory** to `apps/web`.
4. Add the following to **Environment Variables**:
```env
NEXT_PUBLIC_API_URL=https://your-render-url.onrender.com
```
 
---
 
# 🧪 Testing the AI Compliance Engine
 
Once running locally or deployed, test the AI engine via Swagger UI (`/docs`):
 
1. Navigate to `POST /api/skus/{sku_id}/analyze`
2. Enter a test SKU ID (e.g., `VIL-001`)
3. Execute the request to receive the compliance reasoning from the `ilmu-glm-5.1` model.
