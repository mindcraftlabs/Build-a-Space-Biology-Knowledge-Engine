// I HATE KNOWLEDGE GRAPHS
document.addEventListener('DOMContentLoaded', () => {
    const authorFilter = document.getElementById('author-filter');
    const authorListEl = document.getElementById('author-list');
    const keywordFilter = document.getElementById('keyword-filter');
    const keywordListEl = document.getElementById('keyword-list');
    const clearGraphBtn = document.getElementById('btn-clear');
    const graphContainer = document.getElementById('graph-node');
    const detailWindow = document.getElementById('detail-window');
    const detailTitle = document.getElementById('detail-title');
    const detailKeywords = document.getElementById('detail-keywords');
    const detailAuthors = document.getElementById('detail-authors');
    const detailAbstract = document.getElementById('detail-abstract');
    const detailLink = document.getElementById('detail-link');
    const detailAiBtn = document.getElementById('detail-ai-btn');
    const detailAiSummary = document.getElementById('detail-ai-summary');

    const detailCloseBtn = document.getElementById('detail-close');
    const zoomInBtn = document.getElementById('btn-zoom-in');
    const zoomOutBtn = document.getElementById('btn-zoom-out');
    const fitBtn = document.getElementById('btn-fit');
    const rootArticleBatches = new Map();
    let moreRootCounter = 0;
    const KEYWORD_ICON = 'https://cdn-icons-png.flaticon.com/512/542/542734.png';
    const AUTHOR_ICON = 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png';
    const MAIN_AUTHOR_ICON = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
    const ARTICLE_ICON = 'https://cdn-icons-png.flaticon.com/512/3208/3208892.png';

    let network = null;
    window.network = null;
    let nodes = null;
    let edges = null;
    const expandedArticles = new Map();
    let currentDetailArticleId = null;
    let activeAuthorItem = null;
    let activeKeywordItem = null;
    const articleFilter = document.getElementById('article-filter');
    const articleListEl = document.getElementById('article-list');

    if (articleFilter && articleListEl) {
        articleFilter.addEventListener('input', (ev) => {
            const q = ev.target.value.trim().toLowerCase();
            for (const item of articleListEl.querySelectorAll('.article-item')) {
                const title = item.getAttribute('data-article-title') || '';
                item.style.display = (!q || title.toLowerCase().includes(q)) ? '' : 'none';
            }
        });
    }

    const COLORS = {
        keyword: { bg: '#3b82f6', border: '#1e40af', font: '#fff' },
        article: { bg: '#eaf4ff', border: '#3b82f6', font: '#ffffff' },
        author: { bg: '#064e2b', border: '#15803d', font: '#ffffff' },
        more: { bg: '#facc15', border: '#ca8a04', font: '#000' },
        edge: '#8892A0'

    };
    const BATCH_SIZE = 10;
    async function postKG(payload) {
        try {
            const r = await fetch('/api/kg', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!r.ok) {
                const txt = await r.text().catch(() => '');
                throw new Error(txt || r.status);
            }
            return await r.json();
        } catch (err) {
            console.error('postKG error:', err);
            throw err;
        }
    }
    function showToast(message, duration = 2000) {
        const toast = document.getElementById("toast");
        if (!toast) return;
        toast.innerText = message;
        toast.classList.remove("show");
        void toast.offsetWidth;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), duration);
    }
    function getPubIdFromMeta(meta = {}) {
        if (meta == null) return null;
        if (typeof meta.id === 'number') return meta.id;
        if (typeof meta.id === 'string' && /^\d+$/.test(meta.id)) return parseInt(meta.id, 10);
        const pmcid = meta.Pmcid || meta.pmcid || (meta.meta && (meta.meta.Pmcid || meta.meta.pmcid));
        if (pmcid) {
            const found = (window.publications || []).find(p => String(p.Pmcid) === String(pmcid) || String(p.Pmcid).endsWith(String(pmcid).replace(/^PMC/i, '')));
            if (found) return found.id;
        }
        if (meta.Title || meta.title_full || meta.title) {
            const title = (meta.Title || meta.title_full || meta.title).trim();
            const found = (window.publications || []).find(p => (p.Title || '').trim() === title);
            if (found) return found.id;
        }
        return null;
    }
    if (articleListEl) {
        articleListEl.addEventListener('click', async (ev) => {
            const el = ev.target.closest('.article-item');
            if (!el) return;

            hideDetailWindow();
            currentDetailArticleId = null;
            expandedArticles.clear();

            const articleId = el.getAttribute('data-article-id');

            try {
                const payload = await postKG({ article_id: parseInt(articleId, 10) });
                renderGraphPayload(payload, `article_${articleId}`);
                showToast(`Graph loaded for article`);
                graphContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (err) {
                console.error('Article fetch failed', err);
                alert('Failed to fetch article graph: ' + (err?.message || 'Unknown error'));
            }
        });
    }

    function localFallbackSummary(meta = {}, sentenceCount = 2) {
        let text = (meta.Abstract || meta.abstract || meta.summary || '') || '';
        if (!text && meta.Sections && typeof meta.Sections === 'object') {
            const paras = Object.values(meta.Sections).filter(t => typeof t === 'string' && t.trim());
            if (paras.length) {
                paras.sort((a, b) => a.length - b.length);
                text = paras[0];
            }
        }
        if (!text) return "No abstract/sections available to summarize.";

        const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
        const selected = sentences.slice(0, sentenceCount).join(' ').trim();
        return selected.length ? selected : text.slice(0, 400) + (text.length > 400 ? '…' : '');
    }

    async function fetchAiSummary(pubId, meta) {
        const title = (meta && (meta.Title || meta.title_full || meta.title || '')).trim();

        if (title) {
            try {
                const res = await fetch('/api/summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: title })
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data && data.summary) return data.summary;
                console.warn('Backend summary by title failed or empty, falling back:', data);
            } catch (err) {
                console.warn('Error calling backend /api/summary with title — falling back to pub_id/local summary.', err);
            }
        }

        if (typeof pubId === 'number') {
            try {
                const res = await fetch('/api/summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pub_id: pubId })
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data && data.summary) return data.summary;
                console.warn('Backend summary by pub_id failed or empty, falling back:', data);
            } catch (err) {
                console.warn('Error calling backend /api/summary with pub_id — falling back to local summary.', err);
            }
        } else {
            console.info('No numeric pubId available — attempting local fallback summary.');
        }

        return localFallbackSummary(meta, 3);
    }

    function renderAiSummary(text) {
        if (!detailAiSummary) return;
        detailAiSummary.innerText = text;
        detailAiSummary.style.display = 'block';
        window.scrollTo({
            top: document.body.scrollHeight,
            left: 0,
            behavior: 'smooth'
        });

    }

    function clearAiSummary() {
        if (!detailAiSummary) return;
        detailAiSummary.innerText = '';
        detailAiSummary.style.display = 'none';
    }

    async function handleAiBtnClick() {
        if (!detailAiBtn) return;
        if (detailAiBtn.dataset.busy === '1') return;
        detailAiBtn.dataset.busy = '1';
        detailAiBtn.setAttribute('aria-pressed', 'true');
        const oldText = detailAiBtn.innerHTML;
        detailAiBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Summarizing…';

        const meta = (currentDetailArticleId && nodes && nodes.get) ? (nodes.get(currentDetailArticleId)?.meta || {}) : (window.currentDetailMeta || {});
        const pubId = getPubIdFromMeta(meta);

        if (meta && meta._ai_summary) {
            renderAiSummary(meta._ai_summary);
            detailAiBtn.innerHTML = oldText;
            detailAiBtn.dataset.busy = '0';
            detailAiBtn.setAttribute('aria-pressed', 'false');
            return;
        }

        try {
            const summary = await fetchAiSummary(pubId, meta || {});
            if (meta) meta._ai_summary = summary;
            renderAiSummary(summary);
        } catch (err) {
            console.error('AI summary error', err);
            renderAiSummary('Failed to produce summary.');
        } finally {
            detailAiBtn.innerHTML = oldText;
            detailAiBtn.dataset.busy = '0';
            detailAiBtn.setAttribute('aria-pressed', 'false');
        }
    }

    if (detailAiBtn) {
        detailAiBtn.addEventListener('click', handleAiBtnClick);
    }

    function formatAuthorForPubMed(fullName) {
        const parts = fullName.trim().split(' ').filter(Boolean);
        if (parts.length === 1) return parts[0];
        const lastName = parts.pop();
        const initials = parts.map(p => p[0].toUpperCase()).join('');
        return `${lastName} ${initials}`;
    }

    function renderGraphPayload(payload, focusNodeId = null) {
        const serverNodes = payload.nodes || [];
        const serverEdges = payload.edges || [];

        const articleNodes = serverNodes.filter(n => {
            const idStr = String(n.id);
            return idStr.startsWith('article_') || (n.group === 'article');
        });
        const otherNodes = serverNodes.filter(n => !articleNodes.includes(n));

        const initialArticles = articleNodes.slice(0, BATCH_SIZE);
        const remainingArticles = articleNodes.slice(BATCH_SIZE);

        let rootMoreNodeId = null;
        if (remainingArticles.length > 0) {
            moreRootCounter += 1;
            rootMoreNodeId = `more_root_${moreRootCounter}`;
            rootArticleBatches.set(rootMoreNodeId, {
                remaining: remainingArticles.slice(),
                addBatch: null
            });
        }


        const nodesToBuild = [
            ...otherNodes,
            ...initialArticles
        ].map(n => {
            const idStr = String(n.id);
            const rawGroup = n.group;
            const group = rawGroup || (idStr.startsWith('keyword_') ? 'keyword' : (idStr.startsWith('author_') ? 'author' : 'article'));
            const col = COLORS[group] || { bg: '#f3f4f6', border: '#ccc', font: '#111' };

            const selectedAuthorName = (activeAuthorItem?.getAttribute('data-author') || '').trim().toLowerCase();
            const nodeLabelNorm = (n.label || '').trim().toLowerCase();
            const isMainAuthor = (group === 'author' && selectedAuthorName && nodeLabelNorm === selectedAuthorName);

            let shape = 'box';
            let imageUrl = undefined;

            if (group === 'keyword') {
                shape = 'image';
                imageUrl = KEYWORD_ICON;
            } else if (group === 'author') {
                shape = 'image';
                imageUrl = isMainAuthor ? MAIN_AUTHOR_ICON : AUTHOR_ICON;
            } else if (group === 'article') {
                shape = 'image';
                imageUrl = ARTICLE_ICON;

            }
            // HARDER BETTER FASTER STRONGER
            return {
                id: n.id,
                label: n.label,
                group,
                shape,
                image: imageUrl,
                color: { background: col.bg, border: col.border, highlight: { background: '#fff', border: col.border } },
                font: { color: group === 'author' ? '#ffffff' : col.font, size: 13 },
                borderWidth: 2,
                mass: group === 'article' ? 2.5 : (group === 'keyword' ? 3.0 : 1.0),
                meta: n
            };

        });

        if (rootMoreNodeId) {
            const remainingCount = rootArticleBatches.get(rootMoreNodeId).remaining.length;
            nodesToBuild.push({
                id: rootMoreNodeId,
                label: `+${remainingCount} more`,
                group: 'more',
                shape: 'box',
                color: { background: '#facc15', border: '#ca8a04', font: '#000' },
                mass: 1
            });
            if (initialArticles.length) {
                serverEdges.push({
                    id: `edge_more_root_${moreRootCounter}`,
                    from: rootMoreNodeId,
                    to: initialArticles[0].id,
                    label: 'more articles',
                    arrows: 'to',
                    font: { color: COLORS.more.border || '#ca8a04', italic: true, size: 12 },
                    color: { color: COLORS.more.bg || '#facc15' },
                    dashes: true,
                    width: 3,
                    length: 120
                });

            }
        }

        edges = new vis.DataSet(serverEdges.map((e, i) => {
            const fromIsKeyword = String(e.from).startsWith('keyword_');
            const toIsArticle = String(e.to).startsWith('article_');
            const length = (fromIsKeyword && toIsArticle) ? 250 : 100;
            return {
                id: e.id || `srv_e_${i}`,
                from: e.from,
                to: e.to,
                label: e.label || '',
                arrows: 'to',
                color: { color: COLORS.edge },
                length
            };
        }));

        if (network) {
            try { network.destroy(); } catch (e) { }
        }

        nodes = new vis.DataSet(nodesToBuild);
        network = new vis.Network(graphContainer, { nodes, edges }, {
            nodes: { borderWidth: 2 },
            edges: { smooth: { type: 'dynamic' }, font: { color: '#cbd5e1' } },
            physics: {
                enabled: true,
                stabilization: { iterations: 160 },
                barnesHut: { gravitationalConstant: -2000, springLength: 600, damping: 0.12 }
            },
            interaction: { hover: true, dragNodes: true, dragView: true, multiselect: false }
        });

        window.network = network;

        try { if (network && typeof network.off === 'function') network.off('click'); } catch (e) { /* ignore */ }

        if (!network._singleClickRouterAdded) {
            let lastRequestedArticleId = null;

            network.on('click', async params => {
                if (!params.nodes || !params.nodes.length) return;
                const clickedNodeId = String(params.nodes[0]);

                if (clickedNodeId.startsWith('more_root_')) {
                    const info = rootArticleBatches.get(clickedNodeId);
                    if (!info || !info.remaining) return;

                    const expectedEdgeId = `edge_more_root_${clickedNodeId.replace('more_root_', '')}`;
                    if (edges.get(expectedEdgeId)) edges.remove(expectedEdgeId);
                    if (nodes.get(clickedNodeId)) nodes.remove(clickedNodeId);

                    const nextBatch = info.remaining.splice(0, BATCH_SIZE);
                    nextBatch.forEach(an => {
                        if (!nodes.get(an.id)) {
                            nodes.add({
                                id: an.id,
                                label: an.label,
                                group: 'article',
                                shape: 'image',
                                image: ARTICLE_ICON,
                                color: {
                                    background: COLORS.article.bg,
                                    border: COLORS.article.border,
                                    highlight: { background: '#fff', border: COLORS.article.border }
                                },
                                font: { color: COLORS.article.font, size: 13 },
                                borderWidth: 2,
                                mass: 2.5,
                                meta: an
                            });
                        }
                    });

                    if (info.remaining.length > 0) {
                        const rootIndex = clickedNodeId.replace('more_root_', '');
                        nodes.add({
                            id: clickedNodeId,
                            label: `+${info.remaining.length} more`,
                            group: 'more',
                            shape: 'box',
                            color: { background: COLORS.more.bg, border: COLORS.more.border, font: COLORS.more.font },
                            mass: 1
                        });
                        const edgeId = `edge_more_root_${rootIndex}`;
                        const edgeObj = {
                            id: edgeId,
                            from: clickedNodeId,
                            to: nextBatch.length ? nextBatch[0].id : info.remaining[0]?.id,
                            arrows: 'to',
                            label: 'more articles',
                            font: { color: COLORS.more.border || '#ca8a04', italic: true, size: 12 },
                            color: { color: COLORS.more.bg || '#facc15' },
                            dashes: true,
                            width: 3,
                            length: 120
                        };

                        if (edges.get(edgeId)) {
                            edges.update(edgeObj);
                        } else {
                            edges.add(edgeObj);
                        }

                    } else {
                        rootArticleBatches.delete(clickedNodeId);
                    }

                    try { if (network && typeof network.redraw === 'function') network.redraw(); } catch (e) { }
                    try { if (network && typeof network.fit === 'function') network.fit({ animation: { duration: 200 } }); } catch (e) { }
                    return;
                }

                if (clickedNodeId.startsWith('more_')) {
                    const suffix = clickedNodeId.replace(/^more_/, '');
                    const articleNodeId = `article_${suffix}`;
                    const info = expandedArticles.get(articleNodeId);
                    if (!info || !info.addBatch) return;

                    const moreEdgeId = `edge_more_article_${suffix}`;
                    if (edges.get(moreEdgeId)) edges.remove(moreEdgeId);
                    if (nodes.get(clickedNodeId)) nodes.remove(clickedNodeId);

                    try { info.addBatch(); } catch (e) { console.error('info.addBatch error', e); }

                    try { if (network && typeof network.redraw === 'function') network.redraw(); } catch (e) { }
                    try { if (network && typeof network.fit === 'function') network.fit({ animation: { duration: 200 } }); } catch (e) { }
                    return;
                }

                if (clickedNodeId.startsWith('article_')) {
                    if (currentDetailArticleId && currentDetailArticleId !== clickedNodeId) {
                        collapseArticle(currentDetailArticleId, { hideWindow: false });
                    }

                    if (expandedArticles.has(clickedNodeId)) {
                        collapseArticle(clickedNodeId);
                        return;
                    }

                    const pubId = parseInt(String(clickedNodeId).replace(/^article_/, ''), 10);
                    lastRequestedArticleId = clickedNodeId;
                    try {
                        const payload = await postKG({ article_id: pubId });
                        if (lastRequestedArticleId !== clickedNodeId) return;
                        expandArticleFromPayload(clickedNodeId, payload);
                        lastRequestedArticleId = null;
                    } catch (err) {
                        console.error('Error fetching article authors:', err);
                        showToast('Failed to fetch article authors: ' + (err && err.message ? err.message : 'Unknown'), 3000);
                        lastRequestedArticleId = null;
                    }
                    return;
                }

            });

            network._singleClickRouterAdded = true;
        }


        network.on('doubleClick', params => {
            if (!params.nodes || !params.nodes.length) return;
            const nodeId = params.nodes[0];
            const meta = nodes.get(nodeId) && nodes.get(nodeId).meta || {};
            const pmc = meta.Pmcid || meta.pmcid;
            const link = pmc ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmc}/` : (meta.link || meta.Link || '#');
            if (link && link !== '#') window.open(link, '_blank');
        });

        if (focusNodeId && nodes.get(focusNodeId)) {
            try { network.focus(focusNodeId, { scale: 1.2, animation: { duration: 400 } }); } catch (e) { }
        }

        setTimeout(() => {
            try {
                if (network && typeof network.redraw === 'function') network.redraw();
                if (network && typeof network.fit === 'function') network.fit({ animation: { duration: 250 } });
            } catch (e) { }
        }, 50);
    }


    function expandArticleFromPayload(nodeId, payload) {
        const allArticles = payload.nodes || [];
        const edgesPayload = payload.edges || [];
        const articleMeta = payload.article || (nodes.get(nodeId) && nodes.get(nodeId).meta) || {};

        let renderedCount = 0;
        const addedAuthorIds = [];
        const addedEdgeIds = [];

        function addBatch() {
            const batch = allArticles.slice(renderedCount, renderedCount + BATCH_SIZE);

            const selectedAuthorName = (activeAuthorItem?.getAttribute('data-author') || '').trim().toLowerCase();

            batch.forEach(an => {
                const nodeLabelNorm = (an.label || '').trim().toLowerCase();
                const isMain = selectedAuthorName && nodeLabelNorm === selectedAuthorName;

                if (!nodes.get(an.id)) {
                    nodes.add({
                        id: an.id,
                        label: an.label,
                        group: 'author', // <--- changed from 'article' OK
                        shape: 'image',
                        image: isMain ? MAIN_AUTHOR_ICON : AUTHOR_ICON,
                        color: {
                            background: COLORS.author.bg,
                            border: COLORS.author.border,
                            highlight: { background: '#fff', border: COLORS.author.border }
                        },
                        font: { color: COLORS.author.font, size: 13 },
                        borderWidth: 2,
                        mass: 1.5,
                        meta: an
                    });

                    addedAuthorIds.push(an.id);
                }
            });

            batch.forEach((an, idx) => {
                const eid = `e_a_${String(nodeId).replace(/^article_/, '')}_${renderedCount + idx}`;
                if (!edges.get(eid) && !edges.get().some(x => x.from === an.id && x.to === nodeId)) {
                    edges.add({
                        id: eid,
                        from: an.id,
                        to: nodeId,
                        arrows: 'to',
                        label: 'written by',
                        font: { color: '#94a3b8', size: 10 },
                        color: { color: COLORS.edge },
                        length: 110
                    });
                    addedEdgeIds.push(eid);
                }
            });

            renderedCount += batch.length;

            if (renderedCount < allArticles.length) {
                const suffix = String(nodeId).replace(/^article_/, '');
                const moreNodeId = `more_${suffix}`;
                const moreEdgeId = `edge_more_article_${suffix}`;

                if (!nodes.get(moreNodeId)) {
                    nodes.add({
                        id: moreNodeId,
                        label: `+${allArticles.length - renderedCount} more`,
                        group: 'more',
                        shape: 'box',
                        color: { background: COLORS.more.bg, border: COLORS.more.border, font: COLORS.more.font },
                        mass: 1
                    });
                }

                if (!edges.get(moreEdgeId)) {
                    edges.add({
                        id: moreEdgeId,
                        from: moreNodeId,
                        to: nodeId,
                        arrows: 'to',
                        label: 'more authors',
                        font: { color: COLORS.more.border || '#ca8a04', italic: true, size: 12 },
                        color: { color: COLORS.more.bg || '#facc15' },
                        dashes: true,
                        width: 3,
                        length: 100
                    });
                    addedEdgeIds.push(moreEdgeId);
                }
            }
        }

        addBatch();

        expandedArticles.set(nodeId, {
            addedAuthorIds,
            addedEdgeIds,
            articleMeta,
            addBatch
        });

        currentDetailArticleId = nodeId;
        showDetailWindow(articleMeta);
    }

    function collapseArticle(nodeId, { hideWindow = true } = {}) {
        if (!expandedArticles.has(nodeId)) return;
        const info = expandedArticles.get(nodeId);

        (info.addedEdgeIds || []).forEach(eid => {
            if (edges && edges.get(eid)) edges.remove(eid);
        });

        (info.addedAuthorIds || []).forEach(aid => {
            if (nodes && nodes.get(aid)) nodes.remove(aid);
        });

        const suffix = String(nodeId).replace(/^article_/, '');
        const moreNodeId = `more_${suffix}`;
        const moreEdgeId = `edge_more_article_${suffix}`;
        if (nodes && nodes.get(moreNodeId)) nodes.remove(moreNodeId);
        if (edges && edges.get(moreEdgeId)) edges.remove(moreEdgeId);

        expandedArticles.delete(nodeId);

        if (hideWindow && currentDetailArticleId === nodeId) {
            hideDetailWindow();
        }

        if (currentDetailArticleId === nodeId) {
            currentDetailArticleId = null;
        }
    }

    /* --- helpers: add these before showDetailWindow --- */
    function getMeta(meta = {}, ...keys) {
        // return the first value present for any of the given keys (case-sensitive keys as used by backend)
        for (const k of keys) {
            if (!k) continue;
            if (meta[k] !== undefined && meta[k] !== null && meta[k] !== '') return meta[k];
        }
        // try some common lowercase/camel variants
        for (const k of keys) {
            const alt = String(k).toLowerCase();
            for (const mk in meta) {
                if (mk.toLowerCase() === alt && meta[mk] !== undefined && meta[mk] !== null && meta[mk] !== '') {
                    return meta[mk];
                }
            }
        }
        return null;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            // try ISO-like parse
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                // show local readable date (you can change locale)
                return d.toLocaleDateString();
            }
        } catch (e) { /* ignore */ }
        // fallback: return original string
        return String(dateStr);
    }
    // Add this JS somewhere global
    function showAuthorSearchPopup(author) {
        let modal = document.getElementById('author-search-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'author-search-modal';
            modal.className = 'author-search-modal';
            modal.innerHTML = `
            <div class="author-search-content">
                <h3>Search for "${author}"</h3>
                <button class="pubmed-btn">PubMed</button>
                <button class="scholar-btn">Google Scholar</button>
                <button class="close-btn">Cancel</button>
            </div>
        `;
            document.body.appendChild(modal);

            modal.querySelector('.pubmed-btn').onclick = () => {
                const q = encodeURIComponent(`"${author}"[Author]`);
                window.open(`https://pubmed.ncbi.nlm.nih.gov/?term=${q}`, '_blank');
                hideModal();
            };
            modal.querySelector('.scholar-btn').onclick = () => {
                const q = encodeURIComponent(`"${author}"`);
                const scholarUrl = `https://scholar.google.com/scholar?hl=en&q=${encodeURIComponent(`author:"${author}" ${q}`)}`;

                window.open(scholarUrl, '_blank');

                hideModal();
            };
            modal.querySelector('.close-btn').onclick = hideModal;
        }

        modal.querySelector('h3').textContent = `Search for "${author}"`;
        modal.classList.add('show');

        function hideModal() {
            modal.classList.remove('show');
        }
    }

    function showDetailWindow(meta = {}) {
        const titleText = meta.Title || meta.title_full || meta.title || 'Untitled';
        detailTitle.textContent = titleText;

        const metaBlock = detailWindow.querySelector('#detail-meta-block');
        const imageWrap = detailWindow.querySelector('.detail-image-wrap');

        // Clear old content
        metaBlock.innerHTML = '';
        imageWrap.innerHTML = '';

        // --- IMAGE ---
        const imgSrc = meta.Image || (meta.Images && meta.Images[0]) || meta.image || meta.images || '';
        if (imgSrc) {
            const img = document.createElement('img');
            img.className = 'detail-image-large';
            img.src = imgSrc;
            img.alt = titleText;
            img.loading = 'lazy';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.onclick = () => window.open(imgSrc, '_blank', 'noopener');
            imageWrap.appendChild(img);
        }

        // --- META LINES ---
        function appendLine(label, content) {
            const row = document.createElement('div');
            row.className = 'detail-line';
            const strong = document.createElement('strong');
            strong.textContent = label + ' ';
            row.appendChild(strong);
            if (content instanceof Node) {
                row.appendChild(content);
            } else {
                row.appendChild(document.createTextNode(content || ''));
            }
            metaBlock.appendChild(row);
        }

        // Title
        appendLine('Title:', titleText);

        // Keywords
        const keywords = meta.Keywords || meta.keywords || [];
        appendLine('Keywords:', Array.isArray(keywords) ? keywords.join(', ') : keywords);

        // Authors
        const authors = meta.Authors || meta.authors || meta.author_list || [];
        if (Array.isArray(authors) && authors.length) {
            const authorsContainer = document.createElement('span');
            authorsContainer.className = 'authors';
            authors.forEach(author => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'author-btn';
                btn.textContent = author;
                btn.onclick = () => showAuthorSearchPopup(author);
                authorsContainer.appendChild(btn);
            });
            appendLine('Authors:', authorsContainer);
        } else {
            appendLine('Authors:', '');
        }

        // PMCID
        const pmc = meta.PMCID || meta.pmcid || meta.Pmcid;
        if (pmc) appendLine('PMCID:', pmc);

        // Publisher
        const publisher = meta.Publisher || meta.publisher || '';
        appendLine('Publisher:', publisher);

        // Publication Date
        const dateStr = meta.PubDate || meta.PublicationDate || meta.publication_date || meta.date;
        if (dateStr) appendLine('Publication Date:', dateStr);

        // --- ACTIONS ---
        if (detailLink) {
            const link = meta.Link || meta.link || meta.url || '#';
            detailLink.href = link;
            detailLink.target = link ? '_blank' : '';
            detailLink.style.pointerEvents = link ? 'auto' : 'none';
        }
        if (detailAiBtn) {
            detailAiBtn.style.display = 'inline-block';
            detailAiBtn.disabled = false;
        }
        if (detailAbstract) detailAbstract.style.display = 'none';

        // --- SHOW WINDOW ---
        detailWindow.classList.remove('hide');
        void detailWindow.offsetWidth;
        detailWindow.style.display = 'block';
        detailWindow.classList.add('show');
        detailWindow.scrollIntoView({ behavior: 'smooth', block: 'end' });

        clearAiSummary();
    }

    function hideDetailWindow() {
        if (!detailWindow.classList.contains('show') && !detailWindow.classList.contains('hide')) return;

        // Move focus away to avoid aria-hidden conflict
        if (document.activeElement && detailWindow.contains(document.activeElement)) {
            document.activeElement.blur();
            document.body.focus(); // fallback focus
        }

        detailWindow.classList.remove('show');
        void detailWindow.offsetWidth;
        detailWindow.classList.add('hide');
        detailWindow.setAttribute('aria-hidden', 'true');

        const cleanup = () => {
            detailWindow.style.display = 'none';
            detailWindow.classList.remove('hide');
            detailWindow.removeEventListener('animationend', cleanup);
        };
        detailWindow.addEventListener('animationend', cleanup);
    }

    if (authorListEl) {
        authorListEl.addEventListener('click', async (ev) => {
            const el = ev.target.closest('.author-item');
            if (!el) return;
            if (activeAuthorItem) activeAuthorItem.classList.remove('active');
            el.classList.add('active');
            activeAuthorItem = el;
            const authorName = el.getAttribute('data-author');

            hideDetailWindow();
            currentDetailArticleId = null;
            expandedArticles.clear();

            try {
                const payload = await postKG({ author: authorName });
                renderGraphPayload(payload, `author_${authorName.toLowerCase().replace(/\W+/g, '_')}`);
                showToast(`Graph loaded for author: "${authorName}"`);
                graphContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (err) {
                console.error('Author fetch failed', err);
                const message = err && err.message ? err.message : 'Unknown error';
                alert('Failed to fetch author articles: ' + message);
            }
        });
    }
    if (keywordListEl) {
        keywordListEl.addEventListener('click', async (ev) => {
            const el = ev.target.closest('.keyword-item');
            if (!el) return;
            if (activeKeywordItem) activeKeywordItem.classList.remove('active');
            el.classList.add('active');
            activeKeywordItem = el;
            const kw = el.getAttribute('data-keyword');

            hideDetailWindow();
            currentDetailArticleId = null;
            expandedArticles.clear();

            try {
                const payload = await postKG({ keywords: [kw] });
                renderGraphPayload(payload, `keyword_${kw.toLowerCase().replace(/\W+/g, '_')}`);
                showToast(`Graph loaded for keyword: "${kw}"`);
                graphContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (err) {
                console.error('Keyword graph fetch failed', err);
                const message = err && err.message ? err.message : 'Unknown error';
                alert('Failed to fetch keyword graph: ' + message);
            }
        });
    }


    if (authorFilter && authorListEl) {
        authorFilter.addEventListener('input', (ev) => {
            const q = ev.target.value.trim().toLowerCase();
            for (const item of authorListEl.querySelectorAll('.author-item')) {
                const a = item.getAttribute('data-author') || '';
                item.style.display = (!q || a.toLowerCase().includes(q)) ? '' : 'none';
            }
        });
    }
    if (keywordFilter && keywordListEl) {
        keywordFilter.addEventListener('input', (ev) => {
            const q = ev.target.value.trim().toLowerCase();
            for (const item of keywordListEl.querySelectorAll('.keyword-item')) {
                const k = item.getAttribute('data-keyword') || '';
                item.style.display = (!q || k.toLowerCase().includes(q)) ? '' : 'none';
            }
        });
    }

    if (clearGraphBtn) {
        clearGraphBtn.addEventListener('click', () => {
            if (network) {
                try { network.destroy(); } catch (e) { }
                network = null;
                window.network = null;
            }
            nodes = null; edges = null;
            hideDetailWindow();
            if (activeAuthorItem) { activeAuthorItem.classList.remove('active'); activeAuthorItem = null; }
            if (activeKeywordItem) { activeKeywordItem.classList.remove('active'); activeKeywordItem = null; }
            expandedArticles.clear();
            if (graphContainer) graphContainer.innerHTML = '';
        });
    }

    if (detailCloseBtn) {
        detailCloseBtn.addEventListener('click', () => {
            if (currentDetailArticleId) {
                collapseArticle(currentDetailArticleId);
            } else {
                hideDetailWindow();
            }
        });
    }

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => {
        if (window.network && typeof window.network.moveTo === 'function') {
            const scale = (window.network.getScale() || 1) * 1.18;
            window.network.moveTo({ scale, animation: { duration: 200 } });
        }
    });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => {
        if (window.network && typeof window.network.moveTo === 'function') {
            const scale = (window.network.getScale() || 1) / 1.18;
            window.network.moveTo({ scale, animation: { duration: 200 } });
        }
    });
    if (fitBtn) fitBtn.addEventListener('click', () => {
        if (window.network && typeof window.network.fit === 'function') window.network.fit({ animation: { duration: 300 } });
    });

    let _kgResizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(_kgResizeTimer);
        _kgResizeTimer = setTimeout(() => {
            if (window.network) {
                try {
                    window.network.redraw();
                    window.network.fit({ animation: { duration: 150 } });
                } catch (e) { }
            }
        }, 120);
    });

    window.postKG = postKG;
    window.renderGraphPayload = renderGraphPayload;
    window.showDetailWindow = showDetailWindow;
    window.hideDetailWindow = hideDetailWindow;
});

// i was here ;] aHR0cHM6Ly9naXRodWIuY29tL1ZleGlsb25IYWNrZXIK 
