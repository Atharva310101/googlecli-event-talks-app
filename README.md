# BigQuery Release Pulse 📡

A premium, responsive Python Flask web application that scrapes the official Google Cloud BigQuery Release Notes RSS feed, parses the updates into discrete features, changes, fixes, and deprecations, and provides a polished social composer to share updates directly to **X (Twitter)**.

---

## 🚀 Key Features

* **Intelligent Scraper & Parser**: Connects to the official Google Cloud BigQuery Atom feed and segments releases on the same day using BeautifulSoup, separating multiple updates into distinct cards.
* **Server-Side Caching**: Stores feed results in-memory with a 5-minute timeout window to prevent rate limits and speed up client loading.
* **Modern Premium Interface**: Sleek dark space-theme with background glow blobs, responsive layouts, card lift animations, and customized category colors.
* **Skeleton Shimmer Screen**: Beautiful loading placeholders that prevent layout shifts while fetching the latest feed updates.
* **Search & Filters**: Instantly query specific keywords (e.g., Gemini, SQL, partition) and filter updates by category (Features, Changes, Fixes, Deprecated).
* **Polished X (Twitter) Modal**:
  * Auto-drafts formatted tweets under 280 characters with direct links.
  * Live-rendered mock preview of the post.
  * Real-time character countdown with an interactive progress ring.
  * Quick-tap hashtag injectors (e.g., `#BigQuery`, `#GoogleCloud`).
  * Direct handoff to Twitter Web Intent without complex API tokens.

---

## 🛠️ Tech Stack

* **Backend**: Python 3.12, Flask, BeautifulSoup4, Requests
* **Frontend**: Vanilla HTML5, Vanilla CSS3 (custom design system), Vanilla JavaScript (ES6)

---

## 💻 Setup & Installation

### 1. Clone the repository and navigate to the directory
```bash
git clone https://github.com/Atharva310101/googlecli-event-talks-app.git
cd googlecli-event-talks-app
```

### 2. Create and activate a Virtual Environment
**On Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**On macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```
*(Alternatively: `pip install flask requests beautifulsoup4`)*

### 4. Run the Server
```bash
python app.py
```
The application will be running locally at: **http://127.0.0.1:5000**

---

## 📂 Project Structure

```text
googlecli-event-talks-app/
├── app.py                  # Flask backend web server & scraper
├── templates/
│   └── index.html          # HTML dashboard structure
├── static/
│   ├── css/
│   │   └── style.css       # Premium custom layout & styling stylesheet
│   └── js/
│       └── app.js          # Core state engine, filters & social composer
├── .gitignore              # Standard git exclusion configurations
└── README.md               # Project documentation
```

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
