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
"[NASA Data](https://github.com/jgalazka/SB_publications/tree/main)"

---

## 👥 Team Members
<table style="width: 100%; text-align: center;">
    <tr>
        <td>
            <img src="https://github.com/user-attachments/assets/14d46eb5-9860-41b3-89f0-d974c6bd188a" TAHA TAIDI LAAMIRI width="200" height="250" style="border-radius: 50%;">
             <h3><a href="https://github.com/DexterTaha" target="_blank">TAHA TAIDI LAAMIRI</a> </h3>
            <h3>📚 Industrial Engineering</h3>
            <p><strong>Role:</strong> Team Owner & Backend Developer</p>
            <p><strong>Skills:</strong> Leadership, Writing, Coordination</p>
        </td>
        <td>
            <img src="https://github.com/user-attachments/assets/9ebc7d0a-426d-4db9-833a-c6f420e9fcd8" SALMANE DERDEB width="200" height="250" style="border-radius: 50%;">
            <h3><a target="_blank" href="https://www.instagram.com/reality_faker/" >SALMANE DERDEB</a> </h3>
            <h3>📚 Science Mathematics Student</h3>
            <p><strong>Role:</strong> Video Editor</p>
            <p><strong>Skills:</strong> Robotics, 3D Design, Programming</p>
        </td>
                    <td>
            <img src="https://github.com/user-attachments/assets/b25c348b-d36f-4dd7-af4a-eb81c705d57c" MED YASSINE BEHAMMOU width="200" height="250" style="border-radius: 50%;">
            <h3><a href="https://github.com/walidbnslimane" target="_blank">MED YASSINE BEHAMMOU</a> </h3>
            <h3>📚 Science Student</h3>
            <p><strong>Role:</strong>  Backend Developer & Data Analyst</p>
            <p><strong>Skills:</strong> Robotics, Programming, 3D Design</p>
        </td>
    </tr>
    <tr>
        <td>
            <img src="https://github.com/user-attachments/assets/2c713ccb-ab21-4fd5-8392-8a7c9552a62e" MOURTADA TAIDI LAAMIRI width="200" height="250" style="border-radius: 50%;">
            <h3><a href="https://github.com/salmane-derdeb" target="_blank">MOURTADA TAIDI LAAMIRI</a> </h3>
            <h3>📚 Science Student</h3>
            <p><strong>Role:</strong> Graphic Designer</p>
            <p><strong>Skills:</strong> Design, Programming, Robotics</p>
        </td>
        <td>
            <img src="https://github.com/user-attachments/assets/bf4b8673-004b-45db-bee4-a3f43f788413" RANIA ELHADDAOUI width="200" height="250" style="border-radius: 50%;">
            <h3><a href="https://github.com/taidimortada" target="_blank">RANIA ELHADDAOUI</a> </h3>
            <h3>📚 Science Student</h3>
            <p><strong>Role:</strong> Documenter</p>
            <p><strong>Skills:</strong> Robotics, Programming, 3D Design</p>
        </td>
        <td>
            <img src="https://github.com/user-attachments/assets/4e8eeabd-78cd-4cc3-8c56-d02175d7cf89" SALAMA HAMRAOUI width="200" height="250" style="border-radius: 50%;">
            <h3><a href="https://github.com/taidimortada" target="_blank">SALAMA HAMRAOUI</a> </h3>
            <h3>📚 Science Student</h3>
            <p><strong>Role:</strong> Documenter</p>
            <p><strong>Skills:</strong> Robotics, Programming, 3D Design</p>
        </td>
    </tr>
</table>
