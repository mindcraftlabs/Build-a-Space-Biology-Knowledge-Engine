# Project README

## Table of contents

1. Project Overview  
2. Quick Start (Local Development)  
3. Architecture and Components  
4. Data Sources and Formats  
5. Endpoints and UI Routes  
6. Key Files and Directory Layout  
7. Configuration and Environment  
8. Installation & Dependencies  
9. Development Workflow  
10. Testing  
11. Deployment  
12. Security Considerations  
13. Troubleshooting & FAQs  
14. Contribution Guide  
15. License  
16. Appendix: Glossary, Credits, and References  

---

## 1. Project Overview

This repository contains **Final_BEXRP (Biology Experiment Research Portal)** — a research-focused web application that ingests, processes, and serves article metadata and visualizations.  

High-level goals:

- Provide searchable/indexable article metadata stored in a local SQLite database (`pmc_articles_csv_metadata.db`).  
- Offer UI pages for home, charts, visualizations, knowledge graph, and about page.  
- Expose clean endpoints and static assets for local development and extension.  
[Project Overview video](https://www.youtube.com/watch?v=W0tHUS97FFA)  

---

## 2. Quick Start (Local Development)

**Prerequisites:**
- Python 3.9–3.13  
- `pip`, Poetry, or Pipenv  
- Git (optional)  

**Steps:**  

1. Create and activate virtual environment  

Windows (PowerShell):  
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Linux/macOS (bash):  
```bash
python -m venv .venv
source .venv/bin/activate
```

2. Install dependencies  
```bash
pip install -r requirements.txt
```

3. Run the app  
```bash
python app.py
```

4. Open: [http://127.0.0.1:1080](http://127.0.0.1:1080)  

---

## 3. Architecture and Components

**Server-side:** Flask app (`app.py`) serving templates + JSON endpoints.  
**Client-side:** JS for charts and knowledge graph.  

Key components:  
- `app.py` — routes + server entrypoint  
- `pmc_toolkit.py` — DB + parsing utilities  
- `pmc_articles_csv_metadata.db` — local SQLite DB  
- `templates/` — Jinja2 HTML templates  
- `static/` — CSS, JS, images  

Typical flow:  
1. Request route → `app.py` query DB  
2. Render HTML via template  
3. Client-side JS fetches APIs + renders charts  

![Architecture diagram](https://assets.spaceappschallenge.org/media/images/system_design__CuGbbEn.width-1024.png)  

---

## 4. Data Sources and Formats

SQLite database (`pmc_articles_csv_metadata.db`):  

**Schema (articles):**  
- id (PK)  
- pmcid (TEXT)  
- title (TEXT)  
- authors (TEXT or JSON)  
- abstract (TEXT)  
- journal (TEXT)  
- year (INT)  
- keywords (TEXT)  
- raw_json (TEXT)  

Tips:  
- Normalize `authors` and `keywords` for scalability.  
- Add full-text search (SQLite FTS5).  

---

## 5. Endpoints and UI Routes

UI routes:  
- `/` → Home  
- `/charts` → Charts  
- `/knowledge` → Knowledge graph  
- `/about` → About  

API endpoints:  
- `/api/articles` → paginated metadata list  
- `/api/articles/<id>` → full article metadata  

Example fetch:  
```js
fetch("/api/articles?q=cancer&limit=25")
  .then(r => r.json())
  .then(data => console.log(data));
```

---

## 6. Key Files and Directory Layout

```bash
.
├── app.py
├── pmc_articles_csv_metadata.db
├── pmc_toolkit.py
├── pyproject.toml
├── readme.md
├── requirements.txt
├── static
│   ├── css
│   │   ├── galaxy.gif
│   │   ├── imlazy.css
│   │   └── style.css
│   ├── icons
│   │   └── favicon.ico
│   └── js
│       ├── aboutus.js
│       ├── charts.js
│       ├── index.js
│       └── knowledgegraph.js
└── templates
    ├── 404.html
    ├── aboutus.html
    ├── charts.html
    ├── index.html
    └── knowledgg.html

6 directories, 19 files
```

---




---

## 7 Future enhancements: 
- Semantic embeddings  
- Entity extraction (genes, pathways)  
- PostgreSQL/OpenSearch backend  
- Precomputed summaries  
- Containerized inference service  

**Inspiration:** Data-driven exploratory platforms in hackathons like NASA Space Apps, applied to biomedical research.  


## 8. License

Add license here (MIT/Apache-2.0).  
