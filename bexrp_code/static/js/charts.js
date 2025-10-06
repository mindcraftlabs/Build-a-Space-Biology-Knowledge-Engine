(async () => {
    const css = getComputedStyle(document.documentElement);
    const textLight = (css.getPropertyValue('--text-light') || '#f3f4f6').trim();

    let articlesChartInstance, categoryChartInstance, authorChartInstance, publisherChartInstance;

    const modal = document.getElementById('summaryModal');
    const modalContent = document.getElementById('summaryContent');
    const modalTitle = document.getElementById('modalTitle');
    const modalArticles = document.getElementById('modalArticles');

    modal.addEventListener('click', (e) => {
        if (!modalContent.contains(e.target)) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });

    function commonPlugins(textColor) {
        return {
            legend: { labels: { color: textColor } },
            tooltip: { titleColor: textColor, bodyColor: textColor, backgroundColor: 'rgba(10,25,47,0.95)' }
        };
    }

    function renderGenericChart({ canvasId, type, labels, counts, horizontal = false }) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (canvasId === 'articlesChart' && articlesChartInstance) articlesChartInstance.destroy();
        if (canvasId === 'categoryChart' && categoryChartInstance) categoryChartInstance.destroy();
        if (canvasId === 'authorChart' && authorChartInstance) authorChartInstance.destroy();
        if (canvasId === 'publisherChart' && publisherChartInstance) publisherChartInstance.destroy();

        let data, options;
        const borderColor = 'rgba(59,130,246,1)';
        const lineFill = 'rgba(59,130,246,0.2)';

        if (type === 'pie' || type === 'doughnut') {
            const colors = labels.map((_, i) => {
                const r = 59 + (i * 37) % 196;
                const g = 130 + (i * 53) % 126;
                const b = 246 - (i * 29) % 196;
                return `rgba(${r},${g},${b},0.7)`;
            });
            data = { labels, datasets: [{ data: counts, backgroundColor: colors, borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1 }] };
            options = { responsive: true, maintainAspectRatio: false, plugins: commonPlugins(textLight) };
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(59,130,246,0.85)');
            gradient.addColorStop(1, 'rgba(59,130,246,0.4)');

            data = {
                labels,
                datasets: [{
                    label: 'Articles',
                    data: counts,
                    backgroundColor: (type === 'line') ? lineFill : gradient,
                    borderColor,
                    borderWidth: 1,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: borderColor
                }]
            };

            options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: commonPlugins(textLight),
                indexAxis: horizontal ? 'y' : 'x',
                scales: {
                    x: { ticks: { color: textLight }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    y: { ticks: { color: textLight }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
                }
            };
        }

        const chart = new Chart(ctx, { type: type === 'horizontal' ? 'bar' : type, data, options });

        if (canvasId === 'articlesChart') articlesChartInstance = chart;
        if (canvasId === 'categoryChart') categoryChartInstance = chart;
        if (canvasId === 'authorChart') authorChartInstance = chart;
        if (canvasId === 'publisherChart') publisherChartInstance = chart;

        return chart;
    }

    async function fetchChartsPayload() {
        const res = await fetch('/api/charts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        if (!res.ok) throw new Error('Failed to fetch charts payload');
        return await res.json();
    }

    function showArticlesModal(title, articles) {
        const [label, value] = title.split(':');
        modalTitle.innerHTML = `<span class="modal-label">${label}:</span> <span class="modal-value">${value.trim()}</span>`;

        modalArticles.innerHTML = '';
        if (!articles.length) modalArticles.innerHTML = '<p>No articles found.</p>';
        else {
            articles.forEach(a => {
                const card = document.createElement('div');
                card.className = 'article-card';
                card.innerHTML = `<a href="https://www.ncbi.nlm.nih.gov/pmc/articles/${a.Pmcid}/" target="_blank">${a.Title}</a><p>${a.Authors || 'Unknown authors'}</p>`;
                modalArticles.appendChild(card);
            });
        }
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function addDrilldown(chart, filterType, labels, articles) {
        chart.options.onClick = (evt) => {
            const points = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (!points.length) return;
            const idx = points[0].index;
            const value = labels[idx];
            const filtered = articles.filter(a => {
                if (filterType === 'year') return a.PublicationDate && a.PublicationDate.startsWith(String(value));
                if (filterType === 'category') {
                    if (!a.Keywords) return false;
                    const kws = Array.isArray(a.Keywords) ? a.Keywords.map(k => k.toLowerCase()) : a.Keywords.split(',').map(k => k.trim().toLowerCase());
                    return kws.includes(value.toLowerCase());
                }
                if (filterType === 'author') {
                    if (!a.Authors) return false;
                    const auths = Array.isArray(a.Authors) ? a.Authors.map(a => a.toLowerCase()) : a.Authors.split(',').map(a => a.trim().toLowerCase());
                    return auths.includes(value.toLowerCase());
                }
                if (filterType === 'publisher') {
                    if (!a.Publisher) return false;
                    const pubs = typeof a.Publisher === 'string' ? a.Publisher.split(',').map(p => p.trim().toLowerCase()) : a.Publisher.map(p => p.toLowerCase());
                    return pubs.some(p => p.includes(value.toLowerCase()));
                }
                return true;
            });
            showArticlesModal(`${filterType.charAt(0).toUpperCase() + filterType.slice(1)}: ${value}`, filtered);
        };
        chart.update();
    }

    function renderAndBind({ canvasId, type, labels, counts, filterType, articles, horizontal = false }) {
        const chart = renderGenericChart({ canvasId, type, labels, counts, horizontal });
        addDrilldown(chart, filterType, labels, articles);
        return chart;
    }

    function addDownloadListener(buttonId, canvasId, fileName) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        btn.addEventListener('click', () => {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return alert('Chart canvas not found!');
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = fileName;
            link.click();
        });
    }

    try {
        const payload = await fetchChartsPayload();
        const articlesData = payload.articles || [];

        const yearLabels = (payload.years || []).map(r => String(r.year));
        const yearCounts = (payload.years || []).map(r => Number(r.count || 0));
        const categoryLabels = (payload.categories || []).map(r => r.category);
        const categoryCounts = (payload.categories || []).map(r => Number(r.count || 0));
        const authorLabels = (payload.authors || []).map(r => r.author);
        const authorCounts = (payload.authors || []).map(r => Number(r.count || 0));
        const publisherLabels = (payload.publishers || []).map(r => r.publisher);
        const publisherCounts = (payload.publishers || []).map(r => Number(r.count || 0));

        articlesChartInstance = renderAndBind({ canvasId: 'articlesChart', type: 'bar', labels: yearLabels, counts: yearCounts, filterType: 'year', articles: articlesData });
        categoryChartInstance = renderAndBind({ canvasId: 'categoryChart', type: 'bar', labels: categoryLabels, counts: categoryCounts, filterType: 'category', articles: articlesData });
        authorChartInstance = renderAndBind({ canvasId: 'authorChart', type: 'bar', labels: authorLabels, counts: authorCounts, filterType: 'author', articles: articlesData, horizontal: true });
        publisherChartInstance = renderAndBind({ canvasId: 'publisherChart', type: 'pie', labels: publisherLabels, counts: publisherCounts, filterType: 'publisher', articles: articlesData });

        document.getElementById('chartType').addEventListener('change', (e) => {
            articlesChartInstance = renderAndBind({ canvasId: 'articlesChart', type: e.target.value, labels: yearLabels, counts: yearCounts, filterType: 'year', articles: articlesData });
        });
        document.getElementById('chartType2').addEventListener('change', (e) => {
            categoryChartInstance = renderAndBind({ canvasId: 'categoryChart', type: e.target.value, labels: categoryLabels, counts: categoryCounts, filterType: 'category', articles: articlesData });
        });
        document.getElementById('chartType3').addEventListener('change', (e) => {
            const horizontal = e.target.value === 'horizontal';
            authorChartInstance = renderAndBind({ canvasId: 'authorChart', type: horizontal ? 'bar' : e.target.value, labels: authorLabels, counts: authorCounts, filterType: 'author', articles: articlesData, horizontal });
        });
        document.getElementById('chartType4').addEventListener('change', (e) => {
            const horizontal = e.target.value === 'horizontal';
            const type = horizontal ? 'bar' : e.target.value;
            publisherChartInstance = renderAndBind({ canvasId: 'publisherChart', type, labels: publisherLabels, counts: publisherCounts, filterType: 'publisher', articles: articlesData, horizontal });
        });

        addDownloadListener('downloadArticlesChart', 'articlesChart', 'articles_chart.png');
        addDownloadListener('downloadCategoryChart', 'categoryChart', 'category_chart.png');
        addDownloadListener('downloadAuthorChart', 'authorChart', 'author_chart.png');
        addDownloadListener('downloadPublisherChart', 'publisherChart', 'publisher_chart.png');

    } catch (err) {
        console.error('charts page error:', err);
    }
})();

