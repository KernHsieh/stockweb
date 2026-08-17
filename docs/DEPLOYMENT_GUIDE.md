# StockWeb 免費雲端部署與 PostgreSQL 本地同步指南

這份指南將引導您如何在**完全免費的雲端環境**中部署 StockWeb，讓任何人都可以透過專屬網址連線共同查看與編輯畫線、筆記，並確保資料能與您的本地端電腦隨時雙向同步！

---

## 總體架構概覽

```
[使用者 / 協同者]
       │
       ▼ (HTTPS 網址連線)
┌───────────────────────────────────────────────┐
│ 1. 前端 (React): Vercel / Cloudflare Pages    │ (免費 Hosting)
│ 2. 後端 (FastAPI): Render / Koyeb Web Service │ (免費 Hosting)
│ 3. 雲端資料庫: Supabase (PostgreSQL 500MB)    │ (免費 PostgreSQL)
└───────────────────────────────────────────────┘
       │
       ▼ (定時或一鍵同步)
┌───────────────────────────────────────────────┐
│ 4. 本地端資料庫: 本機 PostgreSQL / SQLite     │ (本地電腦備份)
│    執行腳本: python backend/scripts/sync_db.py │
└───────────────────────────────────────────────┘
```

---

## 步驟一：建立免費雲端 PostgreSQL 資料庫 (Supabase)

1. 前往 [Supabase 官網 (supabase.com)](https://supabase.com) 並註冊 / 登入（可用 GitHub 帳號一鍵登入）。
2. 點擊 **"New Project"**，輸入專案名稱（例如 `stockweb`）並設定資料庫密碼。
3. 建立完成後，進入專案設定：
   * 點選左側齒輪 **Project Settings** $\rightarrow$ **Database**。
   * 在 **Connection String** 區塊切換至 **URI** 模式，複製連線字串：
     ```text
     postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
     ```
4. 這就是您的 `CLOUD_DATABASE_URL`！

---

## 步驟二：免費部署後端 API (Render)

1. 前往 [Render 官網 (render.com)](https://render.com) 註冊 / 登入。
2. 點擊 **"New +"** $\rightarrow$ **"Web Service"**，連接您的 GitHub Repository（包含此專案代碼）。
3. 設定參數：
   * **Root Directory**: `.` 或留空
   * **Runtime**: `Python 3`
   * **Build Command**: `pip install -r backend/requirements.txt`
   * **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. 在 **Environment Variables (環境變數)** 中新增：
   * `DATABASE_URL` = 填入步驟一取得的 Supabase PostgreSQL 連線字串。
5. 點擊 **"Create Web Service"**，等待部屬完成即可獲得後端公開網址（例如 `https://stockweb-backend.onrender.com`）。

---

## 步驟三：免費部署前端網站 (Vercel)

1. 前往 [Vercel 官網 (vercel.com)](https://vercel.com) 登入。
2. 點擊 **"Add New Project"**，導入相同的 GitHub Repository。
3. 設定專案：
   * **Framework Preset**: `Vite`
   * **Root Directory**: 點選 Edit 選擇 `frontend` 目錄。
   * **Environment Variables**:
     * `VITE_API_URL` = 您的 Render 後端公開網址（例如 `https://stockweb-backend.onrender.com`）
4. 點擊 **"Deploy"**！
5. 部署完成後即可獲得公開分享網址（例如 `https://your-stockweb.vercel.app`），分享給任何朋友即可共同連線看盤、畫線與做筆記！

---

## 步驟四：本地端與雲端 PostgreSQL 雙向同步

當您或朋友在雲端網站上新增了筆記、畫了線，想要把資料備份回本地端電腦：

### 1. 配置本地端環境變數
在專案根目錄或 `backend/` 下建立 `.env` 檔案：
```env
CLOUD_DATABASE_URL=postgresql://postgres.xxx:yourpassword@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
LOCAL_DATABASE_URL=sqlite:///./stockweb.db
# 若本地有安裝 PostgreSQL，亦可填入:
# LOCAL_DATABASE_URL=postgresql://postgres:localpass@localhost:5432/stockweb
```

### 2. 執行雙向同步
在命令列執行：
```bash
python backend/scripts/sync_db.py
```
同步引擎會自動檢查雲端與本地端每筆筆記與畫線的 `updated_at` 時間戳：
- 雲端有新增的筆記/畫線 $\rightarrow$ 自動下載至本地。
- 本地有新增或修改 $\rightarrow$ 自動推播更新至雲端。

### 3. 設定 Windows 自動排程 (可選)
您可以在 Windows「工作排程器」(Task Scheduler) 建立每日或每小時排程自動執行 `sync_db.py`，實現無感自動同步！

---

## 本地端一鍵啟動開發測試

在本地電腦上測試前後端：

1. **啟動後端 API (FastAPI)**：
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
2. **啟動前端 (React Vite)**：
   ```bash
   cd frontend
   npm run dev
   ```
3. 打開瀏覽器訪問 `http://localhost:3000` 即可！
