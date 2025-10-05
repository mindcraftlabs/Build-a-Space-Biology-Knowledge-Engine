# Project MINDCRAFT Alpha

## 📌 Summary
Our project aims to make decades of **NASA bioscience research** accessible, summarized, and interconnected through a dynamic **AI-powered knowledge platform**.  

NASA has performed hundreds of biological experiments in space — from **microgravity effects on cells** to **radiation impacts on DNA** — but much of this data remains difficult to navigate.  

To address this, we developed **Biology Experiment Research Portal**, an intelligent dashboard that extracts, summarizes, and visualizes key findings from NASA bioscience publications.  

By combining **deep learning summarization models** with **structured relationship mapping**, our platform allows users to explore how organisms, missions, and biological systems interact in space environments.  

This tool supports scientists, educators, and mission planners preparing for **human exploration of the Moon and Mars**.

---

## 🔬 Project Details

### What exactly does it do?
The **Biology Experiment Research Portal**:
- Ingests NASA bioscience publications.
- Extracts structured metadata and figures.
- Presents results as **searchable, filterable records** and **visual knowledge graphs**.
- Allows browsing of article metadata, viewing extracted figures, exploring relationships, and downloading visualizations.

### Project Objectives
- Deliver a **reliable, source-faithful research platform** that centralizes NASA bioscience outputs.  
- Enable **rapid literature discovery**.  
- Provide **portable visualizations** to inform experiment planning, education, and cross-study synthesis.  

### Our Goal
Provide researchers, educators, and mission planners with a **reliable, searchable, and visual tool** to:
- Find relevant bioscience studies.  
- Understand how **spaceflight conditions affect organisms**.  
- Support preparation and planning for **future experiments**.  

---

## ⚙️ How It Works

### 1. Data Collection and Preprocessing
- **Data Source**: 608 full-text open-access Space Biology publications.  
- **XML Parsing**: Extracted structured metadata, keywords, summaries, and semantic tags.  
- **HTML Extraction**: Retrieved images embedded in articles and linked them with textual context.  
- **Cleaning & Segmentation**: Tokenized and segmented into sections (methods, results, organisms, environment, missions, conclusions).  

### 2. Knowledge Graph Construction
The **knowledge graph** is built from structured XML/HTML data.  

- **Source Data**: Nodes and edges derived from metadata, keywords, summaries, and images.  
- **Export Format**: Rendered and exported as a **PNG image**.  
- **Purpose**: Helps users:  
  - Understand biological relationships in spaceflight experiments.  
  - Explore how organisms respond to **microgravity** and **radiation**.  
  - See visual links between **missions, outcomes, and setups**.  

By exporting as static images, the graph ensures **high fidelity to original publications** while remaining **shareable**.  

### 3. Dashboard and Visualization
The front-end dashboard provides **interactivity and clarity**:  
- 🔍 **Search & Summarize**: Type a topic and instantly view AI-generated summaries.  
- 🧬 **Knowledge Graph Explorer**: Navigate connected experiments visually.  
- 💡 **Insight Generator**: Highlights keywords, authors, and publication years.  

#### ✅ Key Benefits
- **Accurate fidelity**: Relationships mirror source statements.  
- **Improved discoverability**: Fast access to decades of space bioscience.  
- **Visual clarity**: Graphs & analytics summarize complex experiments.  
- **Research efficiency**: Helps researchers, educators, and mission planners quickly triage relevant studies.  

---

## 📂 NASA Data
All data originates from **NASA’s open-access bioscience publications**.
"[https://www.nasa.gov" target="_blank](https://github.com/jgalazka/SB_publications/tree/main)"
