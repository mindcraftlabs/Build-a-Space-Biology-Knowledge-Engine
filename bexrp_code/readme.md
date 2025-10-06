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

## 1. Project Overview

This repository contains a web application that serves a small research-focused site for exploring article metadata and simple visualizations. The app is built in Python using a lightweight web framework (Flask or similar) and uses local static assets for client-side visualization and interaction.

High-level goals:

- Provide searchable/indexable article metadata stored in a local SQLite database (`pmc_articles_csv_metadata.db`).
- Offer a small number of UI pages for home, charts/visualizations, knowledge graph, and an about page.
- Expose easy-to-understand endpoints and static assets so a developer can run the app locally and extend it.

Placeholder for project hero image or animated GIF:

<!-- HERO IMAGE -->

<iframe width="560" height="315" 
src="https://www.youtube.com/embed/W0tHUS97FFA?si=-m8URVRae1UMiL40" 
title="YouTube video player" frameborder="0" 
allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
referrerpolicy="strict-origin-when-cross-origin" 
allowfullscreen></iframe>



<!-- HERO VIDEO -->
<!-- Insert video: ./static/media/intro.mp4 -->

## 2. Quick Start (Local Development)

Prerequisites:

- Python 3.8+ (3.9/3.10/3.11 recommended)
- pip or pipenv/poetry for dependency installation
- Git (optional, for cloning)

Steps to run locally:

1. Create and activate a virtual environment

Windows (PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```
Linux bash:
```bash
python -m venv .venv
source .venv/bin/activate
```

2. Install dependencies

```powershell
pip install -r requirements.txt
```

3. Run the app

```powershell
python app.py
```

4. Open your browser to http://127.0.0.1:1080 (or the URL printed by the server)

Notes:

- If your environment uses a different Python executable name (for example `python3`), use that command instead.
- If you prefer Docker, see the Deployment section for a sample Dockerfile snippet.

## 3. Architecture and Components

This is a simple monolithic web app with a server-side component that renders templates and serves API-like JSON endpoints. The client-side includes JavaScript for charts and interactive behavior.

Components:

- app.py — main Flask-style app entrypoint. Responsible for routing, launching the server, and wiring templates/static assets.
- pmc_toolkit.py — helper utilities for interacting with the local database, parsing CSV metadata, or performing data transforms.
- pmc_articles_csv_metadata.db — local SQLite database containing article metadata. Keep this file in the repo for quick demos; in production you'll likely migrate this to a proper database server.
- templates/ — Jinja2 (or similar) templates for HTML pages.
- static/ — CSS, JS, images, and other static assets. Notable files:
  - `static/js/index.js` — client logic for home page
  - `static/js/charts.js` — charts and visualization logic
  - `static/js/knowledgegraph.js` — code to render a knowledge graph
  - `static/css/style.css`, `imlazy.css` — styling and lazy-loading helpers

Typical request flow:

1. Browser requests a route (e.g., `/` or `/charts`).
2. `app.py` executes a view function that optionally queries `pmc_toolkit.py` and `pmc_articles_csv_metadata.db`.
3. The view renders a template from `templates/` and includes references to static assets.
4. Client-side JS enhances the page, fetches additional JSON endpoints if necessary, and renders charts.

Placeholder architecture diagram:

<!-- ARCHITECTURE IMAGE -->

![Architecture diagram](./static/icons/placeholder-architecture.png)

## 4. Data Sources and Formats

The app uses a small local SQLite database `pmc_articles_csv_metadata.db`. The schema is intentionally simple and stores metadata typically extracted from a CSV.

Typical table: articles

- id (INTEGER primary key)
- pmcid (TEXT)
- title (TEXT)
- authors (TEXT) — a simple string or JSON array
- abstract (TEXT)
- journal (TEXT)
- year (INTEGER)
- keywords (TEXT)
- raw_json (TEXT) — optional column containing original metadata

Tips for extending the data model:

- Convert `authors` and `keywords` columns to normalized tables for complex queries.
- Add full-text search using SQLite FTS5 if you want search over title/abstract.
- Use a migration tool (Alembic for SQLAlchemy or simple SQL scripts) when changing schema.

## 5. Endpoints and UI Routes

This section lists the main routes and expected behavior. Confirm actual names in `app.py` and adjust if necessary.

- GET / — Home page (renders `templates/index.html`).
- GET /charts — Charts page (renders `templates/charts.html`).
- GET /knowledge — Knowledge graph page (renders `templates/knowledgg.html`).
- GET /about — About page (renders `templates/aboutus.html`).
- GET /api/articles — Returns JSON list of articles with pagination and optional query parameters (q, year, author).
- GET /api/articles/<id> — Returns full metadata for a single article.

Example API usage (client-side fetch):

```js
fetch("/api/articles?q=cancer&limit=25")
  .then((r) => r.json())
  .then((data) => console.log(data));
```

## 6. Key Files and Directory Layout

Root files

- `app.py` — main application server
- `pmc_toolkit.py` — helper utilities for database access and parsing
- `pmc_articles_csv_metadata.db` — sample/prebuilt database
- `requirements.txt` — Python dependency list
- `pyproject.toml` — project metadata (optional)
- `readme.md` — (this file) short project description

Templates (`templates/`)

- `index.html` — home
- `charts.html` — charts and visualizations
- `knowledgg.html` — knowledge graph
- `aboutus.html` — about page
- `404.html` — not found page

Static (`static/`)

- `css/` — stylesheets and animated gifs
- `js/` — client-side JavaScript
- `icons/` — favicon and small images

Database and tooling

- `pmc_toolkit.py` — includes functions used by `app.py` to read and query the SQLite DB.

## 7. Configuration and Environment

Environment variables used by the app (conventional names; check `app.py`):

- FLASK_ENV — `development` or `production` (affects debug mode)
- DATABASE_URL — a sqlite path or other SQLAlchemy connection string
- SECRET_KEY — Flask secret key for sessions (random string in production)

Example .env (not committed):

```
FLASK_ENV=development
DATABASE_URL=sqlite:///pmc_articles_csv_metadata.db
SECRET_KEY=a-very-secret-key
```

If the app reads config from a file or uses click/argparse flags, prefer environment variables for override in CI or Docker.

## 8. Installation & Dependencies

Install from `requirements.txt`:

```powershell
pip install -r requirements.txt
```

Common dependencies you may find in this project (check `requirements.txt`):

- Flask
- Jinja2
- pandas (if CSV parsing included)
- SQLAlchemy or sqlite3 for DB access
- plotly/d3/c3 or Chart.js for client-side charts (served via static assets or CDN)

## 9. Development Workflow

Branching and contribution suggestions:

- main (or master) — stable production-ready code
- feature/\* — feature branches
- fix/\* — small fixes

Running locally:

- Use a virtual environment
- Run `python app.py` for a development server
- Make changes to templates/static and reload the browser (Flask debug mode provides auto-reload)

Code-style and linting:

- Add `flake8` or `pylint` for linting
- Use `black` for formatting if you want consistent formatting

## 10. Testing

This project does not include tests by default. Add tests using `pytest` and create a `tests/` folder. Example minimal tests to add:

- test_app_routes.py — sanity-check that pages return HTTP 200 in test client
- test_db_queries.py — test `pmc_toolkit.py` helper functions against a temporary SQLite DB

Quick example using pytest and Flask test client:

```python
from app import app

def test_homepage():
    client = app.test_client()
    resp = client.get('/')
    assert resp.status_code == 200
```

## 11. Deployment

Simple deployment options:

- WSGI server (gunicorn/uWSGI) behind nginx for Linux servers
- Docker container for portability
- Platform-as-a-Service (Heroku, Render, Railway) with a simple Procfile

Example Dockerfile snippet:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

Notes:

- If using sqlite in a container, ensure persistent storage for the DB file or replace with a proper DB server.

## 12. Security Considerations

- Do not commit secrets (API keys, SECRET_KEY) to the repo.
- Sanitize and validate any user input used in SQL queries to avoid SQL injection. Prefer parameterized queries or an ORM.
- Use HTTPS in production. Configure TLS termination in your hosting or behind a proxy like nginx.
- Keep dependencies up-to-date and scan for vulnerabilities regularly.

## 13. Troubleshooting & FAQs

Q: The server won't start; I see ImportError for a module.
A: Ensure you installed dependencies via `pip install -r requirements.txt` in the correct virtual environment.

Q: Database queries are slow?
A: Add indexes on columns you query frequently (for example `year`, `pmcid`, or `title`). Consider normalizing authors and keywords.

Q: Charts don’t render or show blank areas.
A: Open browser devtools console — look for JS errors or 404s for missing static assets. Ensure `static/js/charts.js` is included in the template.

## 14. Contribution Guide

If you want to contribute:

- Fork the repo and create a feature branch
- Keep changes small and focused
- Add tests for new behavior
- Open a pull request with a clear description of changes

Maintainers should run tests and linters before merging.

## 15. License

Specify your license here (e.g., MIT, Apache-2.0). If unsure, add a `LICENSE` file with your chosen license and reference it here.

## 16. Appendix: Glossary, Credits, and References

Glossary

- PMC: PubMed Central
- PMCID: PubMed Central identifier

Credits

- Project scaffolded and maintained by the repository owner. Replace with real names and affiliations.

References

- SQLite: https://www.sqlite.org/
- Flask: https://flask.palletsprojects.com/

---

How to add images, GIFs and videos

- Put image files into `static/icons/` or `static/media/` and reference them from templates or this README.
- Suggested markup for images:

```markdown
![Alt text](./static/icons/your-image.png)
```

- Suggested markup for GIFs:

```markdown
![Animated GIF](./static/icons/your-animated.gif)
```

- Suggested markup for video (HTML in README not always supported on GitHub; include link or path):

```html
<video controls src="./static/media/intro.mp4">
  Your browser does not support the video tag.
</video>
```

Place an image for each of the placeholders used earlier in this document:

- `./static/icons/placeholder-hero.png`
- `./static/icons/placeholder-architecture.png`

If you'd like, I can also create example placeholder PNGs or add a short video file for you to replace.

---

Contact

- For questions, email: repo-owner@example.com (replace with your contact)

Thank you for using this project — happy hacking!

# Final_BEXRP – Biology Experiment Research Portal

Final_BEXRP (Biology Experiment Research Portal) is a full‑stack Flask application that ingests, enriches, and serves biomedical literature from PubMed Central (PMC) to accelerate hypothesis generation and exploratory analysis for biology / life‑science experiments. A custom harvesting + ETL pipeline (PMCDatabase + PMCMetadataFetcher) pulls XML + HTML content from `https://pmc.ncbi.nlm.nih.gov/articles/PMC<ID>/`, normalizes metadata (title, authors, publication date, publisher, keywords, abstract, selected body sections, images, PDF link), auto‑generates fallback keywords (KeyBERT or heuristic), and persists structured records in a lightweight SQLite database (`pmc_articles_csv_metadata.db`). At runtime the Flask backend (`app.py`) loads 600+ processed articles, computes weighted completeness scores (favoring images > abstract > sections > PDF > core metadata), and exposes a set of JSON APIs powering: (1) fast paginated & filtered title search; (2) advanced faceted filtering across Keywords / Authors / Publication Year / Publisher (with graceful handling of “no data” buckets); (3) abstractive summarization via a DistilBART CNN model (`sshleifer/distilbart-cnn-12-6`) with adaptive length constraints; (4) analytics endpoints returning aggregate distributions (years, keyword frequency, top authors, top publishers) for frontend chart visualizations; and (5) a dynamic knowledge graph construction service that builds contextual node/edge sets (articles ↔ authors ↔ keywords) on demand for semantic exploration. The frontend (HTML templates + modular JS in `static/js/`) renders a responsive portal featuring search panels, knowledge graph visualization, analytics dashboards, and detail overlays; assets are optimized with Brotli compression (`flask_compress`) and live reload (optional) to streamline development. Data normalization routines defensively coerce string/list dual representations, deduplicate keywords & images, and maintain stable IDs for graph nodes. Design emphasizes reproducibility (deterministic pipeline stages), extensibility (drop‑in model swap for summarization or future NER), and transparency (raw links back to PMC). This repository structure:

```
.
├── app.py
├── pmc_articles_csv_metadata.db
├── pmc_toolkit.py
├── pyproject.toml
├── requirements.txt
├── static
│   ├── css
│   │   ├── galaxy.gif
│   │   ├── imlazy.css
│   │   └── style.css
│   ├── icons
│   │   └── favicon.ico
│   └── js
│       ├── aboutus.js
│       ├── charts.js
│       ├── index.js
│       └── knowledgegraph.js
└── templates
    ├── 404.html
    ├── aboutus.html
    ├── charts.html
    ├── index.html
    └── knowledgg.html
```

Key Features: fast faceted article discovery; adaptive abstractive summarization fallback strategy (abstract → smallest section); on‑the‑fly knowledge graph assembly (article-centric, author-centric, or keyword-centric modes); publication analytics (temporal trends, topical density, authorship concentration, publisher distribution); completeness scoring for quality triage; resilient network layer with retry/backoff; auto keyword enrichment; and clean separation between ingestion toolkit (`pmc_toolkit.py`) and serving layer (`app.py`). Future Enhancements: add embedding-based semantic search, integrate entity extraction (e.g., genes, pathways), persist precomputed summaries, implement OpenSearch / PostgreSQL backend for scalability, introduce per‑article versioning, and containerize with a lightweight inference service for summarization.

> Inspiration & Cross‑Disciplinary Relevance: The architectural philosophy aligns with data‑driven exploratory platforms seen in scientific hackathons (e.g., NASA Space Apps) where open data, visualization, summarization, and graph context significantly reduce cognitive load. Final_BEXRP applies these principles to biomedical literature, enabling rapid experiment planning, literature triage, and knowledge linking.

