#!/usr/bin/env python3

import os
import re
import time
import json
import random
import sqlite3
from typing import List, Optional

import requests
import pandas as pd
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def make_session(total_retries: int = 3, backoff_factor: float = 0.5) -> requests.Session:
    session = requests.Session()
    retries = Retry(
        total=total_retries,
        backoff_factor=backoff_factor,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "POST", "HEAD"])
    )
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


class PMCMetadataFetcher:
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6825.76 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.7 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
    ]

    SESSION = make_session()

    def __init__(self, pmc_id: str):
        self.pmc_id = pmc_id
        self.metadata = None
        self._soup: Optional[BeautifulSoup] = None

    @staticmethod
    def random_headers() -> dict:
        return {"User-Agent": random.choice(PMCMetadataFetcher.USER_AGENTS)}

    @staticmethod
    def extract_text(elem) -> str:
        return "".join(elem.itertext()).strip() if elem is not None else ""

    @staticmethod
    def parse_pub_date(meta) -> str:
        pub_dates = meta.findall("pub-date")
        preferred_types = ["epub", "collection"]
        pd = None
        for t in preferred_types:
            for d in pub_dates:
                if d.attrib.get("pub-type") == t:
                    pd = d
                    break
            if pd:
                break
        if not pd and pub_dates:
            pd = pub_dates[0]
        if pd is None:
            return "Unknown"
        year = PMCMetadataFetcher.extract_text(pd.find("year"))
        month = PMCMetadataFetcher.extract_text(pd.find("month")) or "1"
        day = PMCMetadataFetcher.extract_text(pd.find("day")) or "1"
        try:
            return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"
        except Exception:
            return "Unknown"

    def _fetch_article_html_once(self) -> Optional[BeautifulSoup]:
        if self._soup is not None:
            return self._soup
        url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/{self.pmc_id}/"
        try:
            resp = self.SESSION.get(url, headers=self.random_headers(), timeout=20)
            resp.raise_for_status()
            self._soup = BeautifulSoup(resp.text, "html.parser")
            return self._soup
        except Exception as e:
            print(f"[DEBUG] Failed HTML fetch for {self.pmc_id}: {e}")
            self._soup = None
            return None

    def fetch_images_from_soup(self, soup: BeautifulSoup) -> List[str]:
        images = []
        for img in (soup.find_all("img", class_="graphic") + soup.find_all("img", class_="graphic zoom-in")):
            src = img.get("src") or img.get("data-src")
            if not src:
                continue
            if src.startswith("//"):
                src = "https:" + src
            elif src.startswith("/"):
                src = "https://www.ncbi.nlm.nih.gov" + src
            if any(src.lower().endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".gif", ".tif", ".tiff")):
                images.append(src)
        return list(dict.fromkeys(images))

    def fetch_pdf_url_from_soup(self, soup: BeautifulSoup) -> Optional[str]:
        tag = soup.find("meta", {"name": "citation_pdf_url"})
        if tag:
            pdf = tag.get("content")
            if pdf and pdf.startswith("/"):
                pdf = f"https://www.ncbi.nlm.nih.gov{pdf}"
            return pdf
        return None

    def fetch_metadata_xml(self) -> dict:
        xml_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&retmode=xml&id={self.pmc_id}"
        resp = self.SESSION.get(xml_url, headers=self.random_headers(), timeout=20)
        resp.raise_for_status()

        xml_root = ET.fromstring(resp.content)
        front = xml_root.find(".//article/front")
        meta = front.find("article-meta") if front is not None else None
        journal_meta = front.find("journal-meta") if front is not None else None

        publisher_name = "Unknown"
        if journal_meta is not None:
            publisher_elem = journal_meta.find("publisher/publisher-name")
            if publisher_elem is not None:
                publisher_name = self.extract_text(publisher_elem)

        title = self.extract_text(meta.find("title-group/article-title")) if meta is not None else "No title"
        abstract = self.extract_text(meta.find("abstract/p")) if meta is not None else "No abstract"

        authors = []
        if meta is not None:
            for contrib in meta.findall("contrib-group/contrib"):
                surname = self.extract_text(contrib.find("name/surname"))
                given = self.extract_text(contrib.find("name/given-names"))
                if surname or given:
                    authors.append(f"{given} {surname}".strip())
        if not authors:
            authors.append("No authors")

        publication_date = self.parse_pub_date(meta) if meta is not None else "Unknown"

        sections = {}
        restricted_text = "does not allow downloading of the full text in XML form"
        restricted = front is None or restricted_text in ET.tostring(front, encoding="unicode")
        if not restricted:
            for sec in xml_root.findall(".//body//sec"):
                sec_title_elem = sec.find("title")
                sec_title = self.extract_text(sec_title_elem).lower() if sec_title_elem is not None else ""
                if "introduction" in sec_title or "conclusion" in sec_title:
                    paragraphs = [self.extract_text(p) for p in sec.findall(".//p")]
                    if paragraphs:
                        sections[sec_title.split()[0]] = "\n".join(paragraphs)

        keywords_list = []
        if meta is not None:
            for kwd_group in meta.findall("kwd-group"):
                for kw in kwd_group.findall("kwd"):
                    text = self.extract_text(kw)
                    if text:
                        keywords_list.append(text)

        soup = self._fetch_article_html_once()
        images = self.fetch_images_from_soup(soup) if soup else []
        pdf_url = self.fetch_pdf_url_from_soup(soup) if soup else None

        self.metadata = {
            "title": title.replace("▿", ""),
            "authors": authors,
            "publication_date": publication_date,
            "publisher": publisher_name,
            "keywords": keywords_list,
            "abstract": abstract,
            "sections": sections,
            "restricted": restricted,
            "images": images,
            "Pdf_URL": pdf_url
        }
        return self.metadata


class KeywordExtractor:
    _model = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            try:
                from keybert import KeyBERT
                cls._model = KeyBERT(model="all-MiniLM-L6-v2")
            except Exception:
                cls._model = None
        return cls._model

    @classmethod
    def extract_keywords(cls, text: str, total_keywords: int = 3) -> List[str]:
        model = cls.get_model()
        if model is None:
            tokens = [t for t in re.findall(r"[A-Za-z0-9]+", text.lower()) if len(t) > 3]
            return tokens[:total_keywords]
        kws = model.extract_keywords(text, keyphrase_ngram_range=(1, 2), stop_words='english', top_n=total_keywords)
        return [kw[0] for kw in kws]


class PMCDatabase:
    def __init__(self, db_file):
        self.db_file = db_file
        self._create_db()

    def _create_db(self):
        conn = sqlite3.connect(self.db_file)
        c = conn.cursor()
        c.execute("""
        CREATE TABLE IF NOT EXISTS articles (
            pmcid TEXT PRIMARY KEY,
            title TEXT,
            authors TEXT,
            publication_date TEXT,
            publisher TEXT,
            keywords TEXT,
            abstract TEXT,
            sections TEXT,
            restricted INTEGER,
            images TEXT,
            Pdf_URL TEXT
        )
        """)
        conn.commit()
        conn.close()

    def insert_article(self, pmcid: str, enable_auto_keyword_generation: bool = False, total_extracted_keywords: int = 3):
        fetcher = PMCMetadataFetcher(pmcid)
        data = fetcher.fetch_metadata_xml()
        if not data['keywords'] and enable_auto_keyword_generation:
            data['keywords'] = KeywordExtractor.extract_keywords(data['title'], total_extracted_keywords)

        conn = sqlite3.connect(self.db_file)
        c = conn.cursor()
        c.execute("""
        INSERT OR REPLACE INTO articles (
            pmcid, title, authors, publication_date, publisher, keywords, abstract, sections, restricted, images, Pdf_URL
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            pmcid,
            data["title"],
            json.dumps(data["authors"]),
            data["publication_date"],
            data.get("publisher"),
            json.dumps(data["keywords"]),
            data["abstract"],
            json.dumps(data["sections"]),
            int(data["restricted"]),
            json.dumps(data["images"]),
            data.get("Pdf_URL")
        ))
        conn.commit()
        conn.close()
        print(f"[DEBUG] Inserted PMCID: {pmcid}, Title: {data['title']}, Publisher: {data.get('publisher')}")


    def fetch_filtered(self, **filters) -> List[dict]:
        conn = sqlite3.connect(self.db_file)
        c = conn.cursor()
        conditions, values = [], []
        for key, value in filters.items():
            if key == "title":
                conditions.append("LOWER(title) LIKE ?")
                values.append(f"%{value.lower()}%")
            elif key == "authors":
                conditions.append("authors LIKE ?")
                values.append(f"%{value}%")
            elif key == "publication_date":
                conditions.append("publication_date LIKE ?")
                values.append(f"%{value}%")
            elif key == "publisher":
                conditions.append("publisher LIKE ?")
                values.append(f"%{value}%")
            elif key == "restricted":
                conditions.append("restricted = ?")
                values.append(int(value))
            elif key == "pmcid":
                if isinstance(value, list):
                    placeholders = ",".join("?" for _ in value)
                    conditions.append(f"pmcid IN ({placeholders})")
                    values.extend(value)
                else:
                    conditions.append("pmcid = ?")
                    values.append(value)
            else:
                raise ValueError(f"Unsupported filter key: {key}")
        query = "SELECT * FROM articles"
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        c.execute(query, values)
        rows = c.fetchall()
        conn.close()
        return [self._row_to_dict(row) for row in rows]

    def _row_to_dict(self, row) -> dict:
        pmcid, title, authors_json, pub_date, publisher, keywords_json, abstract, sections_json, restricted, images_json, pdf_url = row
        return {
            "pmcid": pmcid,
            "title": title,
            "authors": json.loads(authors_json) if authors_json else [],
            "publication_date": pub_date,
            "publisher": publisher,
            "keywords": json.loads(keywords_json) if keywords_json else [],
            "abstract": abstract,
            "sections": json.loads(sections_json) if sections_json else {},
            "restricted": bool(restricted),
            "images": json.loads(images_json) if images_json else [],
            "Pdf_URL": pdf_url
        }

    def print_json(self, data, indent: int = 4):
        print(json.dumps(data, indent=indent))


class PMCPipeline:
    def __init__(self, db_file: str, csv_file: str, csv_url: str = None):
        self.db_file = db_file
        self.csv_file = csv_file
        self.csv_url = csv_url
        self.pmc_db = PMCDatabase(db_file)

    def download_csv(self) -> bool:
        if os.path.exists(self.csv_file):
            print(f"[DEBUG] CSV exists locally: {self.csv_file}")
            return True
        if not self.csv_url:
            print("[ERROR] CSV URL not provided")
            return False
        resp = requests.get(self.csv_url)
        if resp.status_code != 200:
            print(f"[ERROR] Failed to download CSV: status {resp.status_code}")
            return False
        with open(self.csv_file, "wb") as f:
            f.write(resp.content)
        print(f"[DEBUG] CSV downloaded: {self.csv_file}")
        return True

    def process_articles(self):
        df = pd.read_csv(self.csv_file)
        urls = df['Link'].tolist()
        total_errors = ""
        start_time = time.time()
        for idx, url in enumerate(urls):
            try:
                pmcid = re.search(r"(PMC\d+)", str(url)).group(1)
                self.pmc_db.insert_article(pmcid, enable_auto_keyword_generation=True)
                print(f"[DEBUG] {idx+1}/{len(urls)} Processed {pmcid}")
            except Exception as e:
                msg = f"[ERROR] Line {idx+1}, URL: {url}, ERROR: {e}"
                total_errors += msg + "\n"
                print(msg)
        elapsed = time.time() - start_time
        print(f"[DEBUG] Total elapsed time: {elapsed:.2f} sec")
        if total_errors:
            print("[DEBUG] Errors during processing:\n", total_errors)

    def run(self):
        if self.download_csv():
            self.process_articles()
        else:
            print("[ERROR] CSV download failed. Exiting.")
            raise SystemExit(1)


if __name__ == "__main__":
    DB_FILE = "pmc_articles_csv_metadata.db"
    CSV_FILE = "SB_publication_PMC.csv"
    CSV_URL = "https://raw.githubusercontent.com/jgalazka/SB_publications/refs/heads/main/SB_publication_PMC.csv"

    # pipeline = PMCPipeline(DB_FILE, CSV_FILE, CSV_URL)
    # pipeline.run()

    db = PMCDatabase(DB_FILE)
    db.print_json(db.fetch_filtered(title='Hindlimb suspension in Wistar rats: Sex‐based differences in muscle response'))

