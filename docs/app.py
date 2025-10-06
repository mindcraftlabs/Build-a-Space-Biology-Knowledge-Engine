#!/usr/bin/env python3 
import random, re

from numpy import printoptions

# pmc toolkit made by VexilonHacker
from pmc_toolkit import PMCDatabase
from flask import Flask, render_template, jsonify, request
from flask_compress import Compress
from transformers import pipeline
from collections import Counter

TEMPLATE_DIR = './templates/'
STATIC_DIR = './static/'
HOST = '0.0.0.0'
PORT = 1080
DBFILE = 'pmc_articles_csv_metadata.db'
PER_PAGE = 20  # articles per page
# TITLE = 'BEXRP'
TITLE = 'Biology Experiment Research Portal'
MODEL  = "sshleifer/distilbart-cnn-12-6"
SUMMARIZATION_MIN_LEN  = 50 
SUMMARIZATION_MAX_LEN  = 120
ENABLE_LIVERELOAD = True
DEBUG = True
MAX_INITIAL_NODES = 10
TOTAL_ARTICLES = 608 
app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)
summarizer = pipeline('summarization', model=MODEL)

app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['COMPRESS_ALGORITHM'] = 'brotli'  
app.config['COMPRESS_LEVEL'] = 6           
app.config['COMPRESS_MIN_SIZE'] = 500      
Compress(app)



def normalize_str(s):
    return s.lower().strip() if isinstance(s, str) else s

@app.route('/api/advancedf', methods=['POST'])
def advanced_search():
    data = request.get_json(silent=True) or {}
    q = (data.get('q') or "").strip().lower()
    filters = data.get('filters', {})
    sort = data.get('sort', 'best')
    print(data)

    results = publications.copy()

    if q:
        results = [pub for pub in results if q in (pub.get('Title') or '').lower()]

    for group_name, selected in filters.items():
        if not selected:
            continue
        selected_norm = [normalize_str(s) for s in selected]

        if group_name == "Keywords":
            include_no_keyword = any("no keyword" in s for s in selected_norm)

            results = [
                pub for pub in results
                if (any(normalize_str(k) in selected_norm for k in pub.get('Keywords') or []))
                   or (include_no_keyword and not pub.get('Keywords'))
            ]

        elif group_name == "Authors":
            include_no_author = "no author" in selected_norm
            results = [
                pub for pub in results
                if (any(normalize_str(a) in selected_norm for a in pub.get('Authors') or []))
                   or (include_no_author and not pub.get('Authors'))
            ]

        elif group_name == "Publication Year":
            selected_years = []
            for s in selected:
                try:
                    selected_years.append(int(s))
                except ValueError:
                    continue
            include_no_year = "no year" in selected_norm
            results = [
                pub for pub in results
                if (pub.get('PublicationDate') and pub['PublicationDate'][:4].isdigit() 
                    and int(pub['PublicationDate'][:4]) in selected_years)
                   or (include_no_year and not pub.get('PublicationDate'))
            ]
        elif group_name == "Publisher":
            include_no_publisher = "no publisher" in selected_norm
            results = [
                pub for pub in results
                if (
                    any(s in normalize_str(pub.get('Publisher') or '') for s in selected_norm)
                    or (include_no_publisher and not pub.get('Publisher'))
                )
            ]


    # Sorting
    if sort == "newest":
        results.sort(key=lambda pub: pub.get("PublicationDate") or "", reverse=True)
    elif sort == "oldest":
        results.sort(key=lambda pub: pub.get("PublicationDate") or "")

    # Pagination
    page = int(data.get('page', 1))
    total = len(results)
    start = (page - 1) * PER_PAGE
    end = start + PER_PAGE
    page_items = results[start:end]

    return jsonify({
        'articles': page_items,
        'page': page,
        'total': total,
        'per_page': PER_PAGE
    })


@app.route('/api/articles', methods=['POST'])
def get_articles():
    global publications
    data = request.get_json(silent=True) or {}

    q = (data.get('q') or "").strip().lower()
    page = int(data.get('page') or 1)
    sort_order = data.get('sort')  
    print(data)

    if not publications:
        return jsonify({'articles': [], 'page': page, 'total': 0, 'per_page': PER_PAGE})

    if q:
        filtered = [pub for pub in publications if q in (pub.get('Title') or '').lower()]
    else:
        filtered = publications.copy()

    if sort_order in ('newest', 'oldest'):
        def parse_date(pub):
            return pub.get('PublicationDate') or '0000-00-00'
        filtered.sort(key=parse_date, reverse=(sort_order == 'newest'))

    total = len(filtered)
    start = (page - 1) * PER_PAGE
    end = start + PER_PAGE
    page_items = filtered[start:end]

    return jsonify({
        'articles': page_items,
        'page': page,
        'total': total,
        'per_page': PER_PAGE
    })


@app.route('/api/summary', methods=['POST'])
def get_summary():
    data = request.get_json() or {}
    title = (data.get('title') or "").strip()
    pub_id = data.get('pub_id')

    def pick_text_from_record(rec):
        if not rec:
            return None
        abstract = rec.get('abstract') or rec.get('Abstract') or ""
        if abstract and isinstance(abstract, str) and abstract.strip():
            return abstract.strip()
        sections = rec.get('sections') or rec.get('Sections')
        if sections and isinstance(sections, dict):
            paragraphs = [t for t in sections.values() if isinstance(t, str) and t.strip()]
            if paragraphs:
                paragraphs.sort(key=len)
                return paragraphs[0].strip()
        return None

    if title:
        try:
            title_matches = db.fetch_filtered(title=title) 
        except Exception as e:
            return jsonify({'summary': f'Lookup error: {e}'}), 500

        if not title_matches:
            return jsonify({'summary': 'Publication not found.'}), 404

        record = title_matches[0] 
        text_to_summarize = pick_text_from_record(record)
        if not text_to_summarize:
            return jsonify({'summary': 'Unable to summarize.'})

        try:
            tokens = len(text_to_summarize.split())
            DMAXLEN = min(tokens, SUMMARIZATION_MAX_LEN)
            DMINLEN = max(int(DMAXLEN * 0.5), SUMMARIZATION_MIN_LEN) + 5
            DMINLEN = min(DMINLEN, DMAXLEN)
            summary = summarizer(
                text_to_summarize,
                min_length=DMINLEN,
                max_length=DMAXLEN,
                do_sample=False
            )[0]['summary_text']
            return jsonify({'summary': summary})
        except Exception as e:
            return jsonify({'summary': f"Summary unavailable: {e}"})

    if not isinstance(pub_id, int):
        return jsonify({'summary': 'Invalid or missing publication ID'}), 400

    pub = next((p for p in publications if p['id'] == pub_id), None)
    if not pub:
        return jsonify({'summary': 'Publication not found.'}), 404

    text_to_summarize = pub.get('Abstract', '') or None
    if not text_to_summarize:
        sections = pub.get('Sections')
        if sections and isinstance(sections, dict):
            all_paragraphs = [
                (name, text)
                for name, text in sections.items()
                if isinstance(text, str) and text.strip()
            ]
            if all_paragraphs:
                smallest_section = min(all_paragraphs, key=lambda x: len(x[1]))
                text_to_summarize = smallest_section[1]
            else:
                return jsonify({'summary': 'Unable to summarize.'})
        else:
            return jsonify({'summary': 'Unable to summarize.'})

    try:
        tokens = len(text_to_summarize.split())
        DMAXLEN = min(tokens, SUMMARIZATION_MAX_LEN)
        DMINLEN = max(int(DMAXLEN * 0.5), SUMMARIZATION_MIN_LEN) + 5
        DMINLEN = min(DMINLEN, DMAXLEN)
        summary = summarizer(
            text_to_summarize,
            min_length=DMINLEN,
            max_length=DMAXLEN,
            do_sample=False
        )[0]['summary_text']
        return jsonify({'summary': summary})
    except Exception as e:
        return jsonify({'summary': f"Summary unavailable: {e}"})



@app.route("/api/charts", methods=["POST"])
def charts_data():
    if not publications:
        return jsonify({
            "years": [], 
            "categories": [], 
            "authors": [],
            "articles": []
        })

    years = []
    for pub in publications:
        pub_date = pub.get("PublicationDate")
        if pub_date and pub_date[:4].isdigit():
            years.append(int(pub_date[:4]))
    year_counts = Counter(years)
    years_data = [{"year": y, "count": year_counts[y]} for y in sorted(year_counts.keys())]

    publisher_counter = Counter()
    for pub in publications:
        pubs = pub.get("Publisher") or []
        if isinstance(pubs, str):
            pubs = [p.strip() for p in pubs.split(",") if p.strip()]
        for p in pubs:
            publisher_counter[p] += 1
    top_publishers = publisher_counter.most_common(15)  # top 15
    publishers_data = [{"publisher": name, "count": count} for name, count in top_publishers]

    kw_counter = Counter()
    for pub in publications:
        keywords = pub.get("Keywords") or []
        if isinstance(keywords, str):
            arr = [k.strip().lower() for k in keywords.split(",") if k.strip()]
        elif isinstance(keywords, (list, tuple)):
            arr = [k.strip().lower() for k in keywords if isinstance(k, str) and k.strip()]
        else:
            arr = []
        for k in arr:
            kw_counter[k] += 1
    top_categories = kw_counter.most_common(20)
    categories_data = [{"category": name, "count": count} for name, count in top_categories]

    author_counter = Counter()
    for pub in publications:
        authors = pub.get("Authors") or []
        if isinstance(authors, str):
            arr = [a.strip() for a in authors.split(",") if a.strip()]
        elif isinstance(authors, (list, tuple)):
            arr = [a.strip() for a in authors if isinstance(a, str) and a.strip()]
        else:
            arr = []
        for a in arr:
            author_counter[a] += 1
    top_authors = author_counter.most_common(15)
    authors_data = [{"author": name, "count": count} for name, count in top_authors]

    articles_data = [
        {
            "id": pub["id"],
            "Title": pub["Title"],
            "Authors": pub["Authors"],
            "Publisher": pub.get("Publisher") or [],  # <-- ADD THIS
            "Pmcid": pub["Pmcid"],
            "PublicationDate": pub["PublicationDate"],
            "Keywords": pub["Keywords"],
            "Image": pub["Image"],
        }
        for pub in publications
    ]


    return jsonify({
        "years": years_data,
        "categories": categories_data,
        "authors": authors_data,
        "publishers": publishers_data, 
        "articles": articles_data
    })


@app.route("/api/kg", methods=["POST"])
def knowledge_graph():
    """
    modes (POST to /api/kg):
      1) { "article_id": N } -> returns authors for that article + edges
      2) { "author": "Author Name" } -> returns author node + their article nodes + edges
      3) { "keywords": [...] } -> returns keyword -> article nodes
      4) { "title": "Article Title" } -> returns article node + all its authors and keywords
    """
    data = request.get_json() or {}
    nodes, edges, node_ids = [], [], set()
    print(data)
    
    def add_author_node(author_name, article_id=None, edge_label="WRITTEN_BY"):
        clean_author = re.sub(r'\W+', '_', author_name.lower()).strip('_')
        author_id = f"author_{clean_author}"
        if author_id not in node_ids:
            nodes.append({"id": author_id, "label": author_name, "group": "author"})
            node_ids.add(author_id)
        if article_id is not None:
            edges.append({"from": author_id, "to": f"article_{article_id}", "label": edge_label})

    def add_article_node(pub):
        art_id = f"article_{pub['id']}"
        if art_id not in node_ids:
            nodes.append({
                "id": art_id,
                "label": pub.get("Title"),
                "group": "article",
                "title_full": pub.get("Title"),
                "pmcid": pub.get("Pmcid"),
                "link": pub.get("Link"),
                "PubDate": pub.get("PublicationDate")

            })
            node_ids.add(art_id)
        return art_id

    def format_article(pub):
        # ensure Keywords and Publisher are always lists
        kws = pub.get("Keywords") or []
        if isinstance(kws, str):
            kws = [k.strip() for k in kws.split(",") if k.strip()]
        pubs = pub.get("Publisher") or []
        if isinstance(pubs, str):
            pubs = [p.strip() for p in pubs.split(",") if p.strip()]
        authors = pub.get("Authors") or []
        if isinstance(authors, str):
            authors = [a.strip() for a in authors.split(",") if a.strip()]
        return {
            "id": pub["id"],
            "Title": pub.get("Title"),
            "Authors": authors,
            "Keywords": kws,
            "Pmcid": pub.get("Pmcid"),
            "Link": pub.get("Link"),
            "Publisher": pubs,
            "Abstract": pub.get("Abstract"),
            "Sections": pub.get("Sections"),
            "Pdf": pub.get("Pdf"),
            "Images": pub.get("Images"),
            "Image": pub.get("Image"),
            "PubDate": pub.get("PublicationDate")

        }

    # 1) By article_id
    article_id = data.get("article_id")
    if article_id is not None:
        try:
            article_id = int(article_id)
        except:
            return jsonify({"nodes": [], "edges": [], "article": None})
        pub = next((p for p in publications if p["id"] == article_id), None)
        if not pub:
            return jsonify({"nodes": [], "edges": [], "article": None})
        art_id = add_article_node(pub)
        authors_raw = pub.get("Authors") or []
        authors_list = re.split(r'[,;]+', authors_raw) if isinstance(authors_raw, str) else authors_raw
        for a in authors_list:
            if isinstance(a, str) and a.strip():
                add_author_node(a.strip(), article_id=pub["id"])
        return jsonify({
            "nodes": nodes,
            "edges": edges,
            "article": format_article(pub)
        })

    # 2) By author
    author_q = data.get("author") or data.get("author_name")
    if author_q:
        qnorm = normalize_str(author_q)
        clean_author = re.sub(r'\W+', '_', author_q.lower()).strip('_')
        author_id = f"author_{clean_author}"
        if author_id not in node_ids:
            nodes.append({"id": author_id, "label": author_q, "group": "author"})
            node_ids.add(author_id)
        for pub in publications:
            pub_auths = pub.get("Authors") or []
            pub_auths_list = re.split(r'[,;]+', pub_auths) if isinstance(pub_auths, str) else pub_auths
            pub_auths_list = [a.strip() for a in pub_auths_list if isinstance(a, str) and a.strip()]
            if any(normalize_str(a) == qnorm for a in pub_auths_list):
                art_id = add_article_node(pub)
                edges.append({"from": author_id, "to": art_id, "label": "WROTE"})
                edges.append({"from": art_id, "to": author_id, "label": "WRITTEN_BY"})
        return jsonify({"nodes": nodes, "edges": edges})

    # 3) By keywords
    selected_keywords = [k for k in data.get("keywords", []) if isinstance(k, str)]
    for kw in selected_keywords:
        kw_norm = kw.lower()
        kw_id = f"keyword_{kw_norm}"
        if kw_id not in node_ids:
            nodes.append({"id": kw_id, "label": kw, "group": "keyword"})
            node_ids.add(kw_id)
        for pub in publications:
            pub_keywords = pub.get("Keywords") or []
            pub_keywords_list = re.split(r',', pub_keywords) if isinstance(pub_keywords, str) else pub_keywords
            pub_keywords_list = [k.strip().lower() for k in pub_keywords_list if isinstance(k, str) and k.strip()]
            if kw_norm in pub_keywords_list:
                art_id = add_article_node(pub)
                edges.append({"from": kw_id, "to": art_id, "label": "HAS"})
    if selected_keywords:
        return jsonify({"nodes": nodes, "edges": edges})

    # 4) By article title
    title_q = data.get("title")
    if title_q:
        tnorm = normalize_str(title_q)
        pub = next((p for p in publications if normalize_str(p.get("Title") or "") == tnorm), None)
        if not pub:
            return jsonify({"nodes": [], "edges": [], "article": None})
        art_id = add_article_node(pub)
        authors_raw = pub.get("Authors") or []
        authors_list = re.split(r'[,;]+', authors_raw) if isinstance(authors_raw, str) else authors_raw
        authors_list = [a.strip() for a in authors_list if isinstance(a, str) and a.strip()]
        for a in authors_list:
            add_author_node(a, article_id=pub["id"])
        kws = pub.get("Keywords") or []
        kws = [k.strip() for k in kws.split(",")] if isinstance(kws, str) else kws
        for k in kws:
            kw_id = f"keyword_{k.lower()}"
            if kw_id not in node_ids:
                nodes.append({"id": kw_id, "label": k, "group": "keyword"})
                node_ids.add(kw_id)
            edges.append({"from": kw_id, "to": art_id, "label": "HAS"})
        return jsonify({
            "nodes": nodes,
            "edges": edges,
            "article": format_article(pub)
        })

    return jsonify({"nodes": [], "edges": []})


@app.errorhandler(404)
@app.errorhandler(405)
def error(e):
    return render_template('404.html'), 404

@app.route("/knowledgraphs")
def kg_page():
    all_titles = [
        {"id": pub["id"], "title": pub["Title"]}
        for pub in publications
    ]

    return render_template(
        "knowledgg.html",
        keywords=all_keywords,
        authors=all_authors,
        all_titles=all_titles  # <-- added here
    )

@app.route("/analytics")
def charts_page():
    return render_template("charts.html")

@app.route("/aboutus")
def aboutus():
    return render_template("aboutus.html")

@app.route('/')
def index():
    return render_template(
        'index.html', 
        TITLE=TITLE,
        keywords=all_keywords,
        authors=all_authors,
        years=all_years,
        publishers=all_publisher,
        total_authors=len(all_authors),
        total_articles=TOTAL_ARTICLES,
        total_keywords=len(all_keywords)

    )

def CompletenessScore(article):
    """weighted completeness score prioritizing images > abstract > sections > PDF"""
    score = 0
    # high priority
    score += 5 if article.get('images') and len(article['images']) > 0 else 0
    score += 4 if article.get('abstract') else 0
    score += 3 if article.get('sections') else 0
    score += 2 if article.get('Pdf_URL') else 0
    # medium/low priority
    score += 1 if article.get('title') else 0
    score += 1 if article.get('pmcid') else 0
    score += 1 if article.get('authors') else 0
    score += 1 if article.get('keywords') else 0
    score += 1 if article.get('publication_date') else 0
    return score

def ProcessSweetArticles(all_articles, error_img, CompletenessScore, debug=False):
    random.shuffle(all_articles)
    ordered_articles = sorted(all_articles, key=CompletenessScore, reverse=True)

    abstract_count, sections_only_count, no_content_count = 0, 0, 0
    publications = []
    all_keywords = set()
    all_authors = set()
    all_years = set()
    all_publisher = set()
    for idx, article in enumerate(ordered_articles):
        if article.get('abstract'):
            abstract_count += 1
        elif not article.get('abstract') and article.get('sections'):
            sections_only_count += 1
        else:
            no_content_count += 1

        has_images = bool(article.get('images'))
        chosen_image = article['images'][0] if has_images else error_img
        pubs_item = {
            'id': idx,
            'Title': article.get('title', '').replace("▿", "") or 'Untitled',
            'Link': f"https://www.ncbi.nlm.nih.gov/pmc/articles/{article.get('pmcid','')}/",
            'Authors': article.get('authors'),
            'Publisher': article.get("publisher"),
            'Pmcid': article.get('pmcid'),
            'Keywords': article.get('keywords'),
            'Abstract': article.get('abstract') or 'Error in summary',
            'Sections': article.get('sections'),
            'PublicationDate': article.get('publication_date'),
            'Restricted': article.get('restricted'),
            'Images': article.get('images'),
            'Image': chosen_image,
            'Pdf': article.get('Pdf_URL'),
            'Default_Img_Found': False if has_images else True,
        }

        kws = pubs_item.get('Keywords') or []
        if isinstance(kws, str):
            kws = [k.strip() for k in kws.split(",") if k.strip()]
        all_keywords.update(kws)

        authors = pubs_item.get('Authors') or []
        if isinstance(authors, str):
            authors = [a.strip() for a in authors.split(",") if a.strip()]
        all_authors.update(authors)

        date = pubs_item.get('PublicationDate')
        if date and date[:4].isdigit():
            all_years.add(int(date[:4]))
        
        publs = pubs_item.get('Publisher') or []
        if isinstance(publs, str):
            publs = [p.strip() for p in publs.split(",") if p.strip()]
        all_publisher.update(publs)

        all_publisher.update(publs)
        publications.append(pubs_item)



    total_articles = len(ordered_articles)
    summarizable_count = abstract_count + sections_only_count
    unsummarizable_count = no_content_count
    unsummarizable_before_sections = total_articles - abstract_count

    quality_thresholds = {'high': 10, 'medium': 7}
    high_quality_count = 0
    medium_quality_count = 0
    low_quality_count = 0

    for article in ordered_articles:
        score = CompletenessScore(article)
        if score >= quality_thresholds['high']:
            high_quality_count += 1
        elif score >= quality_thresholds['medium']:
            medium_quality_count += 1
        else:
            low_quality_count += 1

    stats = {
        'total_articles': total_articles,
        'abstract_count': abstract_count,
        'sections_only_count': sections_only_count,
        'no_content_count': no_content_count,
        'summarizable_count': summarizable_count,
        'unsummarizable_count': unsummarizable_count,
        'unsummarizable_before_sections': unsummarizable_before_sections,
        'high_quality_count': high_quality_count,
        'medium_quality_count': medium_quality_count,
        'low_quality_count': low_quality_count
    }

    if debug:
        print(f"High quality articles: {high_quality_count} ({(high_quality_count/total_articles)*100:.2f}%)")
        print(f"Medium quality articles: {medium_quality_count} ({(medium_quality_count/total_articles)*100:.2f}%)")
        print(f"Low quality articles: {low_quality_count} ({(low_quality_count/total_articles)*100:.2f}%)")
        print(f"Articles with abstract: {abstract_count} ({(abstract_count/total_articles)*100:.2f}%)")
        print(f"Articles without abstract but with sections: {sections_only_count} ({(sections_only_count/total_articles)*100:.2f}%)")
        print(f"Articles with neither abstract nor sections: {no_content_count} ({(no_content_count/total_articles)*100:.2f}%)")
        print(f"Total summarizable articles: {summarizable_count} ({(summarizable_count/total_articles)*100:.2f}%)")
        print(f"Total unsummarizable articles: {unsummarizable_count} ({(unsummarizable_count/total_articles)*100:.2f}%)")
        print(f"Total unsummarizable articles when we didn't add sections: {unsummarizable_before_sections} ({(unsummarizable_before_sections/total_articles)*100:.2f}%)")
    return publications, sorted(list(all_keywords)), sorted(list(all_authors)), sorted(list(all_publisher)), sorted(list(all_years)), stats

def main():
    global publications, db, all_keywords, all_years, all_authors, all_publisher  
    error_img = "https://images.unsplash.com/photo-1610296669228-602fa827fc1f?..."

    db = PMCDatabase(DBFILE)
    all_articles = db.fetch_filtered()
    
    publications, all_keywords, all_authors, all_publisher, all_years, info_stats = ProcessSweetArticles(all_articles, error_img, CompletenessScore, debug=DEBUG)
    all_keywords.append("No keywords")
    print(publications[0])

    print(f'publishers: {all_publisher}, total publishers: {len(all_publisher)}')

    if ENABLE_LIVERELOAD :
        from livereload import Server
        server = Server(app.wsgi_app)
        server.watch(TEMPLATE_DIR)  
        server.watch(STATIC_DIR)    
        server.serve(host=HOST, port=PORT)
    else:
        app.run(host=HOST, port=PORT)


if __name__ == '__main__':
    main()


