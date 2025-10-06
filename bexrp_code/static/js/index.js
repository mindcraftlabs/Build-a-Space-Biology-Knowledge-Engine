let currentPage = 1;
let totalArticles = 0;
let isFetching = false;
let currentSort = "best"; // persists the user's selected sort for all requests
const filterBtn = document.getElementById("filter-btn");
const filterPanel = document.getElementById("filterPanel");
const clearBtn = document.querySelector(".clear-filters-btn");
const citeBtn = document.getElementById("cite-btn");

const filterCountElem = filterBtn.querySelector(".filter-count");
clearBtn.addEventListener("click", () => {
    filterPanel
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => (cb.checked = false));
    filterPanel
        .querySelectorAll(".filter-search")
        .forEach((input) => (input.value = ""));
    updateFilterCount();
    showToast("Filters cleared!");
});

filterBtn.addEventListener("click", () => {
    const panel = document.getElementById("filterPanel");
    if (!panel.classList.contains("active")) {
        openFilterPanel();
    } else {
        closeFilterPanel();
    }
});
function openFilterPanel() {
    const panel = document.getElementById("filterPanel");
    const scrollHeight = panel.scrollHeight;
    panel.style.maxHeight = scrollHeight + "px";
    panel.classList.add("active");
}

function closeFilterPanel() {
    const panel = document.getElementById("filterPanel");
    panel.style.maxHeight = "0px";
    panel.classList.remove("active");
}

document.addEventListener("click", (e) => {
    e.stopPropagation();

    if (!filterBtn.contains(e.target) && !filterPanel.contains(e.target)) {
        closeFilterPanel();
    }
});

function getSelectedFilters() {
    const filters = {};
    document.querySelectorAll(".filter-group").forEach((group) => {
        const groupName = group.querySelector(".filter-header h3").innerText.trim();
        const selected = Array.from(
            group.querySelectorAll('input[type="checkbox"]:checked')
        ).map((cb) => cb.value);
        if (selected.length > 0) {
            if (groupName.includes("Keyword")) filters["Keywords"] = selected;
            else if (groupName.includes("Author")) filters["Authors"] = selected;
            else if (groupName.includes("Year"))
                filters["Publication Year"] = selected.map((y) => parseInt(y));
            else if (groupName.includes("Publisher")) filters["Publisher"] = selected; // ✅ new line
        }
    });
    return filters;
}

function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, "");
}

const filterDebounceTimers = new WeakMap();
function filterOptions(inputElem) {
    if (filterDebounceTimers.has(inputElem)) {
        clearTimeout(filterDebounceTimers.get(inputElem));
    }

    const timer = setTimeout(() => {
        const searchValue = normalizeText(inputElem.value.trim());
        const optionsContainer = inputElem
            .closest(".filter-group")
            .querySelector(".filter-options");
        const options = optionsContainer.querySelectorAll(".filter-option");

        const searchTerms = searchValue.split(/\s+/).filter(Boolean);

        options.forEach((option) => {
            const labelElem = option.querySelector("label");
            const labelTextRaw = labelElem.textContent;
            const labelText = normalizeText(labelTextRaw);

            const matches = searchTerms.every((term) => labelText.includes(term));

            if (matches) {
                option.style.display = "flex";

                let highlighted = labelTextRaw;
                searchTerms.forEach((term) => {
                    if (!term) return;
                    const regex = new RegExp(`(${term})`, "gi");
                    highlighted = highlighted.replace(regex, "<mark>$1</mark>");
                });
                labelElem.innerHTML = highlighted;
            } else {
                option.style.display = "none";
                labelElem.innerHTML = labelTextRaw;
            }
        });
    }, 150); // now it look better :]

    filterDebounceTimers.set(inputElem, timer);
}

window.filterOptions = filterOptions;
function updateFilterCount() {
    const checkboxes = filterPanel.querySelectorAll(
        'input[type="checkbox"]:checked'
    );
    const count = checkboxes.length;
    filterCountElem.textContent = count;

    const searchBtn = document.querySelector(".search-btn");
    if (searchBtn) {
        searchBtn.innerHTML =
            count > 0
                ? `<i class="fas fa-rocket"></i> Search (filtered)`
                : `<i class="fas fa-rocket"></i> Search`;
    }
}

filterPanel
    .querySelectorAll('input[type="checkbox"]')
    .forEach((cb) => cb.addEventListener("change", updateFilterCount));
updateFilterCount();

function getStorageList(key) {
    return JSON.parse(localStorage.getItem(key) || "[]");
}
function setStorageList(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
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

function addRecent(article) {
    let recents = getStorageList("recent-articles");
    recents = recents.filter((a) => a.id !== article.id);
    recents.unshift(article);
    if (recents.length > 10) recents = recents.slice(0, 10);
    setStorageList("recent-articles", recents);
}

function getSavedList() {
    return getStorageList("saved-articles");
}
function setSavedList(list) {
    setStorageList("saved-articles", list);
}

function addSaved(article) {
    const id = typeof article.id === "string" ? parseInt(article.id) : article.id;
    let saved = getSavedList();
    if (saved.some((a) => a.id === id)) {
        showToast(`Article '${(article.title || "").slice(0, 30)}' already saved`);
        return false;
    }
    saved.unshift(Object.assign({}, article, { id }));
    setSavedList(saved);
    renderList(saved, "saved-list");
    showToast(`Saved '${(article.title || "").slice(0, 30)}'`);
    return true;
}

function removeSaved(id) {
    let saved = getSavedList().filter((a) => a.id !== id);
    setSavedList(saved);
    renderList(saved, "saved-list");
}

function renderList(list, elemId) {
    const ul = document.getElementById(elemId);
    if (!ul) return;
    ul.innerHTML = "";
    if (!list || list.length === 0) {
        ul.innerHTML = '<li style="color:#ffffff;">No articles yet.</li>';
        return;
    }
    list.forEach((a, idx) => {
        const li = document.createElement("li");
        li.style.padding = "0.7rem 1rem";
        li.style.marginBottom = idx === list.length - 1 ? "0" : "0.5rem";
        li.style.borderRadius = "0.7rem";
        li.style.boxShadow = "0 1px 4px 0 rgba(0,0,0,0.04)";

        const aTag = document.createElement("a");
        aTag.href = a.link || "#";
        aTag.target = "_blank";
        aTag.innerText = a.title || "Untitled";
        li.appendChild(aTag);

        if (elemId === "saved-list") {
            const btn = document.createElement("button");
            btn.className = "unsave-btn";
            btn.title = "Unsave";
            btn.style.marginLeft = "10px";
            btn.innerHTML = "<i class='fas fa-trash'></i> Unsave";
            btn.onclick = () => removeSaved(a.id);
            li.appendChild(btn);
        }
        ul.appendChild(li);
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = "block";
    const backdrop = document.getElementById("modal-backdrop");
    if (backdrop) backdrop.style.display = "block";
    document.body.style.overflow = "hidden";
}

function closeAllModals() {
    const galleryDiv = document.getElementById("modal-image-gallery");
    if (galleryDiv && galleryDiv._carouselHandler) {
        document.removeEventListener("keydown", galleryDiv._carouselHandler);
        delete galleryDiv._carouselHandler;
    }

    if (window.__closeLightbox) window.__closeLightbox();

    document
        .querySelectorAll(".modal")
        .forEach((m) => (m.style.display = "none"));
    const backdrop = document.getElementById("modal-backdrop");
    if (backdrop) backdrop.style.display = "none";
    document.body.style.overflow = "";
}

(function() {
    const lightbox = document.getElementById("image-lightbox");
    const lbImg = lightbox ? lightbox.querySelector(".lb-img") : null;
    const lbClose = lightbox ? lightbox.querySelector(".lb-close") : null;
    let lbKeyHandler = null;

    let scale = 1;
    const ZOOM_STEPS = [1, 2, 3]; // cycle levels on double-click | should i add freecad mouse mvt. nah im lazy
    let zoomIndex = 0;
    const MAX_SCALE = 3;
    let tx = 0,
        ty = 0;
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let imgStart = { x: 0, y: 0 };

    function setTransform() {
        if (!lbImg) return;
        lbImg.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
        lbImg.classList.toggle("zooming", scale > 1);
    }

    function clampPan() {
        if (!lbImg) return;
        const rect = lbImg.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const imgW = lbImg.naturalWidth * scale; // use natural size
        const imgH = lbImg.naturalHeight * scale;

        const maxX = Math.max(0, (imgW - vw) / 2);
        const maxY = Math.max(0, (imgH - vh) / 2);

        tx = Math.min(maxX, Math.max(-maxX, tx));
        ty = Math.min(maxY, Math.max(-maxY, ty));
    }

    function zoomAt(clientX, clientY, newScale) {
        newScale = Math.min(MAX_SCALE, Math.max(1, newScale));
        const rect = lbImg.getBoundingClientRect();
        const px = clientX - rect.left;
        const py = clientY - rect.top;
        const ratio = newScale / scale;
        tx = px - ratio * (px - tx);
        ty = py - ratio * (py - ty);
        scale = newScale;
        clampPan();
        setTransform();
    }

    function resetTransform() {
        scale = 1;
        zoomIndex = 0;
        tx = 0;
        ty = 0;
        setTransform();
    }

    function openLightbox(src, alt) {
        if (!lightbox || !lbImg) return;
        lbImg.src = src || "";
        lbImg.alt = alt || "Image";
        resetTransform();
        lightbox.classList.add("show");
        lightbox.setAttribute("aria-hidden", "false");

        lbKeyHandler = (e) => {
            if (e.key === "Escape") closeLightbox();
            if (e.key === "ArrowLeft") {
                const prev = document.getElementById("modal-prev");
                if (prev && !prev.disabled) prev.click();
            }
            if (e.key === "ArrowRight") {
                const next = document.getElementById("modal-next");
                if (next && !next.disabled) next.click();
            }
        };
        document.addEventListener("keydown", lbKeyHandler);
    }

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove("show");
        lightbox.setAttribute("aria-hidden", "true");
        lbImg.src = "";
        lbImg.style.transform = "";
        document.removeEventListener("keydown", lbKeyHandler);
        lbKeyHandler = null;
    }

    if (lbImg) {
        lbImg.addEventListener(
            "wheel",
            (e) => {
                e.preventDefault();
                const zoomFactor = Math.exp(-e.deltaY * 0.0015);
                zoomAt(e.clientX, e.clientY, scale * zoomFactor);
            },
            { passive: false }
        );

        lbImg.addEventListener("dblclick", (e) => {
            e.preventDefault();
            zoomIndex = (zoomIndex + 1) % ZOOM_STEPS.length;
            const targetScale = ZOOM_STEPS[zoomIndex];

            if (targetScale === 1) {
                resetTransform();
            } else {
                zoomAt(e.clientX, e.clientY, targetScale);
            }
        });

        lbImg.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            lbImg.setPointerCapture(e.pointerId);
            isPanning = true;
            panStart = { x: e.clientX, y: e.clientY };
            imgStart = { x: tx, y: ty };
            lbImg.classList.add("grabbing");
        });

        lbImg.addEventListener("pointermove", (e) => {
            if (!isPanning) return;
            e.preventDefault();
            tx = imgStart.x + (e.clientX - panStart.x);
            ty = imgStart.y + (e.clientY - panStart.y);
            clampPan();
            setTransform();
        });

        lbImg.addEventListener("pointerup", () => {
            isPanning = false;
            lbImg.classList.remove("grabbing");
        });

        lbImg.addEventListener("pointercancel", () => {
            isPanning = false;
            lbImg.classList.remove("grabbing");
        });
    }

    if (lbClose) lbClose.addEventListener("click", closeLightbox);
    if (lightbox) {
        lightbox.addEventListener("click", (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    window.__openLightbox = openLightbox;
    window.__closeLightbox = closeLightbox;
})();

function formatAuthorForPubMed(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return name;
    const last = parts.pop();
    const firstInitials = parts.map((p) => p[0]).join("");
    return `${last} ${firstInitials}`;
}
function showCitationModal(articleTitle, citationData) {
    // remove any existing cite-backdrop to avoid duplicates
    const existing = document.querySelector(".cite-backdrop");
    if (existing) existing.remove();

    // build backdrop + card
    const backdrop = document.createElement("div");
    backdrop.className = "cite-backdrop";

    const card = document.createElement("div");
    card.className = "cite-card";
    backdrop.appendChild(card);

    // Header
    const header = document.createElement("div");
    header.className = "cite-header";
    header.innerHTML = `
  <div>
    <h3 class="cite-title">
      <span class="cite-label">Cite:</span>
      <span class="cite-article">${articleTitle}</span>
    </h3>
    <div class="cite-meta" id="cite-meta"></div>
  </div>
  <button class="cite-close" aria-label="Close">&times;</button>
`;

    card.appendChild(header);

    // Top row: format selector + help
    const toprow = document.createElement("div");
    toprow.className = "cite-toprow";
    toprow.innerHTML = `
      <div class="cite-format">
        <div class="cite-label">Format</div>
        <select id="cite-format-select"></select>
      </div>
      <div class="cite-help">Choose a format, copy, or download NBIB</div>
    `;
    card.appendChild(toprow);

    // Code box
    const codePre = document.createElement("pre");
    codePre.className = "cite-code";
    codePre.innerText = ""; // will be filled
    card.appendChild(codePre);

    // Actions
    const actions = document.createElement("div");
    actions.className = "cite-actions";
    actions.innerHTML = `
      <button class="btn" id="cite-copy">Copy</button>
      <button class="btn" id="cite-download-txt">Download</button>
      <button class="btn btn--primary" id="cite-download-nbib">Download NBIB</button>
    `;
    card.appendChild(actions);

    // append to body
    document.body.appendChild(backdrop);
    backdrop.style.display = "flex"; // or block, depending on your CSS

    // fill selector with keys present in citationData (common formats)
    const formatOrder = ["ama", "apa", "mla", "nlm"];
    const select = document.getElementById("cite-format-select");
    const availableFormats = formatOrder.filter(
        (k) => citationData && citationData[k]
    );
    // fallback: any keys present
    if (availableFormats.length === 0 && citationData) {
        Object.keys(citationData).forEach((k) => {
            if (typeof citationData[k] === "object" && citationData[k].format)
                availableFormats.push(k);
        });
    }
    if (availableFormats.length === 0) {
        // nothing to show
        codePre.innerText = JSON.stringify(citationData, null, 2);
    } else {
        availableFormats.forEach((k, idx) => {
            const opt = document.createElement("option");
            opt.value = k;
            opt.innerText = k.toUpperCase();
            select.appendChild(opt);
        });
        // set initial content
        const initial = select.value || availableFormats[0];
        // allow HTML in format (they come with <i> tags). We'll display HTML but copy plain text.
        codePre.innerHTML =
            citationData[initial].format || citationData[initial].orig || "";
    }

    // populate meta: try to show PMCID & PMID and year if available
    (function populateMeta() {
        const metaEl = document.getElementById("cite-meta");
        let pmcid = "";
        // Try extracting PMCID from citationData.nlm.format or citationData.nlm.orig
        if (citationData && citationData.nlm) {
            const txt = citationData.nlm.format || citationData.nlm.orig || "";
            const m = txt.match(/PMCID:\s*(PMC\d+)/i);
            if (m) pmcid = m[1];
        }
        // Only show PMCID if available
        metaEl.innerText = pmcid ? `PMCID: ${pmcid}` : "";
    })();

    // helper to get plain text from HTML string
    function htmlToPlainText(html) {
        const tmp = document.createElement("div");
        tmp.innerHTML = html || "";
        return tmp.innerText.trim();
    }

    // selector change handler
    select.addEventListener("change", () => {
        const v = select.value;
        if (citationData && citationData[v]) {
            codePre.innerHTML = citationData[v].format || citationData[v].orig || "";
        } else {
            codePre.innerText = "";
        }
    });

    // copy button
    const copyBtn = document.getElementById("cite-copy");
    copyBtn.addEventListener("click", () => {
        const v = select.value;
        let textToCopy = "";
        if (citationData && citationData[v]) {
            // copy plain text (strip tags)
            textToCopy = htmlToPlainText(
                citationData[v].format || citationData[v].orig || ""
            );
        } else {
            textToCopy = codePre.innerText;
        }
        navigator.clipboard
            .writeText(textToCopy)
            .then(() => showToast("Copied to clipboard!"))
            .catch(() => showToast("Copy failed"));
    });

    // download TXT button
    const downloadTxtBtn = document.getElementById("cite-download-txt");
    downloadTxtBtn.addEventListener("click", () => {
        const v = select.value; // selected format
        let textToSave = "";
        if (citationData && citationData[v]) {
            textToSave = htmlToPlainText(
                citationData[v].format || citationData[v].orig || ""
            );
        } else {
            textToSave = codePre.innerText;
        }

        // get PMCID from modal
        const pmcid =
            document.getElementById("modal-pcmid")?.innerText?.trim() || "unknown";

        // build filename: citation_PMCxxxx_format.txt
        const filename = `citation_${pmcid}_${v || "citation"}.txt`;

        const blob = new Blob([textToSave], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    });

    // download NBIB button: calls existing downloadNbib(pmcid)
    const downloadNbibBtn = document.getElementById("cite-download-nbib");
    // determine PMCID if present in modal-pcmid or citationData
    function findPmcid() {
        const modalPmcid = document
            .getElementById("modal-pcmid")
            ?.innerText?.trim();
        if (modalPmcid) return modalPmcid;
        // fallback: try to parse from NLM formatted string
        if (citationData && citationData.nlm && citationData.nlm.format) {
            const m = citationData.nlm.format.match(/PMCID:\s*(PMC\d+)/i);
            if (m) return m[1];
        }
        // try other fields
        if (citationData && citationData.nlm && citationData.nlm.orig) {
            const m = citationData.nlm.orig.match(/PMCID:\s*(PMC\d+)/i);
            if (m) return m[1];
        }
        return "";
    }

    const foundPmcid = findPmcid();
    if (!foundPmcid) {
        downloadNbibBtn.disabled = true;
        downloadNbibBtn.title = "No PMCID available for NBIB";
        downloadNbibBtn.style.opacity = "0.6";
        downloadNbibBtn.style.cursor = "not-allowed";
    } else {
        downloadNbibBtn.addEventListener("click", () => {
            // call your downloadNbib function which expects a pmcid (it strips 'PMC' itself)
            try {
                downloadNbib(foundPmcid);
            } catch (err) {
                console.error(err);
                showToast("Failed to start NBIB download.");
            }
        });
    }

    // close handlers
    const closeBtn = header.querySelector(".cite-close");
    function removeModal() {
        document.removeEventListener("keydown", escHandler);
        backdrop.style.display = "none"; // just hide
    }

    closeBtn.addEventListener("click", removeModal);

    // click outside the card closes it
    backdrop.addEventListener("click", (ev) => {
        if (ev.target === backdrop) removeModal();
    });

    // esc to close
    function escHandler(e) {
        if (e.key === "Escape") removeModal();
    }
    document.addEventListener("keydown", escHandler);

    // prevent clicks inside card from closing
    card.addEventListener("click", (e) => e.stopPropagation());
}

function downloadNbib(pmcid) {
    const numericPmcid = pmcid.replace(/^PMC/i, "");
    const nbibUrl = `https://pmc.ncbi.nlm.nih.gov/resources/citations/${numericPmcid}/export/`;

    fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(nbibUrl)}`, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36",
        },
    })
        .then((res) => res.json())
        .then((data) => {
            const blob = new Blob([data.contents], { type: "application/nbib" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `pmc_${numericPmcid}.nbib`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })
        .catch((err) => {
            console.error(err);
            showToast("Failed to download NBIB file.");
        });
}

async function showSummaryFromElem(elem) {
    const idRaw = elem.dataset.id;
    const id = isNaN(Number(idRaw)) ? idRaw : Number(idRaw);
    const title = elem.dataset.title || "";
    const link = elem.dataset.link || "#";
    const authorsRaw = elem.dataset.authors || "";
    const pcmid = elem.dataset.pcmid || "";
    const date = elem.dataset.date || "";
    let keywords = [];
    try {
        keywords = JSON.parse(elem.dataset.keywords || "[]");
    } catch {
        keywords = [];
    }

    let images = [];
    try {
        images = JSON.parse(elem.dataset.images || "[]");
    } catch {
        images = [];
    }
    if ((!images || images.length === 0) && elem.dataset.image) {
        images = [elem.dataset.image];
    }
    // show a small caption under the modal image if server used a placeholder
    const defaultImgFlag = elem.dataset.defaultImgFound === "true";
    let modalImgCaption = document.getElementById("modal-image-caption");
    if (!modalImgCaption) {
        modalImgCaption = document.createElement("div");
        modalImgCaption.id = "modal-image-caption";
        modalImgCaption.className = "img-note";
        // insert caption right under galleryDiv (adjust if needed)
        const galleryContainer = document.querySelector(
            "#summary-modal .modal-content"
        );
        if (galleryContainer) {
            // insert after the gallery if present, otherwise prepend at top
            const galleryDivLocal = document.getElementById("modal-image-gallery");
            if (galleryDivLocal && galleryDivLocal.parentNode) {
                galleryDivLocal.parentNode.insertBefore(
                    modalImgCaption,
                    galleryDivLocal.nextSibling
                );
            } else {
                galleryContainer.insertBefore(
                    modalImgCaption,
                    galleryContainer.firstChild
                );
            }
        }
    }
    modalImgCaption.textContent = defaultImgFlag
        ? "Figure not found — showing placeholder."
        : "";

    addRecent({
        id,
        title,
        link,
        image: images[0] || "",
        authors: authorsRaw,
        date,
        keywords,
    });

    const modalSaveBtn = document.getElementById("modal-save-btn");
    const alreadySaved = getSavedList().some((a) => a.id === id);
    if (modalSaveBtn) {
        const savedList = getSavedList();
        const isSaved = savedList.some((a) => a.id === id);

        modalSaveBtn.classList.toggle("saved", isSaved);
        modalSaveBtn.innerHTML = isSaved
            ? "<i class='fas fa-star'></i> Saved"
            : "<i class='fas fa-star'></i> Save Article";

        modalSaveBtn.onclick = (e) => {
            e.preventDefault();
            let currentlySaved = getSavedList().some((a) => a.id === id);

            if (currentlySaved) {
                removeSaved(id);
                modalSaveBtn.classList.remove("saved");
                modalSaveBtn.innerHTML = "<i class='fas fa-star'></i> Save Article";
                showToast(`Unsaved '${title.slice(0, 30)}'`);
            } else {
                addSaved({
                    id,
                    title,
                    link,
                    Image: images[0] || "",
                    Authors: authorsRaw,
                    PublicationDate: date,
                    Keywords: keywords,
                });
                modalSaveBtn.classList.add("saved");
                modalSaveBtn.innerHTML = "<i class='fas fa-star'></i> Saved";
            }
        };
    }

    const modalTitle = document.getElementById("modal-title");
    if (modalTitle) modalTitle.innerText = title;

    const galleryDiv = document.getElementById("modal-image-gallery");
    const mainImg = document.getElementById("modal-image-main");
    const prevBtn = document.getElementById("modal-prev");
    const nextBtn = document.getElementById("modal-next");
    const counter = document.getElementById("modal-carousel-counter");

    if (galleryDiv && galleryDiv._carouselHandler) {
        document.removeEventListener("keydown", galleryDiv._carouselHandler);
        delete galleryDiv._carouselHandler;
    }

    if (images && images.length > 0) {
        galleryDiv.style.display = "flex";
        let currentIndex = 0;

        function renderIndex(i) {
            currentIndex = Math.max(0, Math.min(i, images.length - 1));
            mainImg.src = images[currentIndex] || "";
            mainImg.alt = title || `image ${currentIndex + 1}`;
            prevBtn.disabled = currentIndex <= 0;
            nextBtn.disabled = currentIndex >= images.length - 1;
            if (counter)
                counter.textContent = `${currentIndex + 1} / ${images.length}`;
        }

        prevBtn.onclick = () => {
            if (currentIndex > 0) renderIndex(currentIndex - 1);
        };
        nextBtn.onclick = () => {
            if (currentIndex < images.length - 1) renderIndex(currentIndex + 1);
        };

        const keyHandler = (e) => {
            if (e.key === "ArrowLeft") {
                prevBtn.click();
            } else if (e.key === "ArrowRight") {
                nextBtn.click();
            } else if (e.key === "Escape") {
                closeAllModals();
            }
        };
        document.addEventListener("keydown", keyHandler);
        galleryDiv._carouselHandler = keyHandler;

        renderIndex(0);
        if (mainImg) {
            mainImg.style.cursor = "zoom-in";
            mainImg.onclick = () => {
                const src = mainImg.src || (images && images.length ? images[0] : "");
                window.__openLightbox(src, title || "Image");
            };
        }
    } else {
        if (galleryDiv) galleryDiv.style.display = "none";
    }

    const modalAuthors = document.getElementById("modal-authors");
    if (modalAuthors) {
        modalAuthors.innerHTML = "";
        const authors = (authorsRaw || "")
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean);
        if (authors.length === 0) {
            modalAuthors.innerText = "Unknown authors";
        } else {
            authors.forEach((author) => {
                const btn = document.createElement("button");
                btn.textContent = author;
                btn.className = "author-btn";
                btn.style.margin = "0 5px 5px 0";
                btn.onclick = () => {
                    const formatted = formatAuthorForPubMed(author);
                    const query = encodeURIComponent(`"${formatted}"[Author]`);
                    window.open(
                        `https://pubmed.ncbi.nlm.nih.gov/?term=${query}`,
                        "_blank"
                    );
                };
                modalAuthors.appendChild(btn);
            });
        }
    }

    const modalPmcid = document.getElementById("modal-pcmid");
    const citeBtn = document.getElementById("cite-btn");

    if (citeBtn) {
        citeBtn.onclick = async (e) => {
            e.preventDefault();

            const rawPmcid = document
                .getElementById("modal-pcmid")
                ?.innerText?.trim();
            if (!rawPmcid) {
                showToast("No PMC ID available for citation.");
                return;
            }

            // ✅ Add spinner
            let spinner = citeBtn.querySelector(".cite-spinner");
            if (!spinner) {
                spinner = document.createElement("span");
                spinner.className = "cite-spinner";
                citeBtn.appendChild(spinner);
            }
            spinner.style.display = "inline-block"; // show spinner

            const numericPmcid = rawPmcid.replace(/^PMC/i, "");

            try {
                const res = await fetch(
                    `https://api.allorigins.win/get?url=${encodeURIComponent(
                        `https://pmc.ncbi.nlm.nih.gov/resources/citations/${numericPmcid}/`
                    )}`
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const wrapper = await res.json();
                const data = JSON.parse(wrapper.contents);

                const articleTitle =
                    document.getElementById("modal-title")?.innerText ||
                    "Untitled Article";

                showCitationModal(articleTitle, data, numericPmcid);
            } catch (err) {
                console.error(err);
                showToast("Failed to fetch citation.");
            } finally {
                // ✅ hide spinner
                spinner.style.display = "none";
            }
        };
    }

    if (modalPmcid) modalPmcid.innerText = pcmid || "";
    const modalDate = document.getElementById("modal-date");
    if (modalDate) modalDate.innerText = date || "";
    const modalDomains = document.getElementById("modal-domains");
    if (modalDomains)
        modalDomains.innerText = keywords.length
            ? keywords.join(", ")
            : "No keywords found";
    const readFullBtn = document.getElementById("read-full-article-btn");
    const downloadPdfBtn = document.getElementById("download-pdf-btn");

    if (readFullBtn) readFullBtn.href = link;

    const pdfUrl = elem.dataset.pdf || "";
    if (downloadPdfBtn) {
        if (pdfUrl && pdfUrl.trim() !== "") {
            downloadPdfBtn.href = pdfUrl;
            downloadPdfBtn.style.display = "inline-block";
        } else {
            downloadPdfBtn.href = "#";
            downloadPdfBtn.style.display = "none";
        }
    }

    const summaryDiv = document.getElementById("modal-summary");
    if (summaryDiv) summaryDiv.innerHTML = `<span class="spinner"></span>`;

    openModal("summary-modal");

    try {
        const res = await fetch("/api/summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pub_id: id }),
        });
        const data = await res.json();
        if (summaryDiv)
            summaryDiv.innerHTML = data.summary || "No summary available.";
    } catch (err) {
        if (summaryDiv) summaryDiv.innerHTML = "Error fetching summary.";
        console.error(err);
    }
}

function setGridCols(cols) {
    const grid = document.getElementById("results-grid");
    if (!grid) return;
    grid.classList.remove(
        "grid-cols-1",
        "grid-cols-2",
        "grid-cols-3",
        "grid-cols-4",
        "grid-cols-5"
    );
    grid.classList.add("grid-cols-" + cols);
    localStorage.setItem("grid-cols", cols);
}

async function fetchArticles(reset = false) {
    if (isFetching) return;
    isFetching = true;

    const query = (
        document.querySelector("input[name='q']") || { value: "" }
    ).value.trim();
    const filters = getSelectedFilters();

    if (reset) {
        currentPage = 1;
        totalArticles = 0;
        const grid = document.getElementById("results-grid");
        if (grid) grid.innerHTML = "";
    }

    try {
        const payload = {
            q: query,
            page: currentPage,
            filters,
        };

        if (currentSort && currentSort !== "best") {
            payload.sort = currentSort;
        }

        const res = await fetch("/api/advancedf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        totalArticles = data.total || 0;

        const grid = document.getElementById("results-grid");
        if (!grid) return;

        (data.articles || []).forEach((pub) => {
            const div = document.createElement("div");
            div.className = "result-card";

            // create image area (use server-provided Image; server also sends Default_Img_Found flag)
            if (pub.Image) {
                const img = document.createElement("img");
                img.dataset.originalSrc = pub.Image || "";
                img.src = pub.Image || DEFAULT_PLACEHOLDER;
                img.alt = pub.Title || "";
                img.className = "result-img";
                div.appendChild(img);
                img.onerror = () => handleImageError(img);
            } else {
                const img = document.createElement("img");
                img.src = DEFAULT_PLACEHOLDER;
                img.alt = "No image available";
                img.className = "result-img";
                div.appendChild(img);

                const note = document.createElement("div");
                note.className = "img-note";
                note.textContent = "Image not found — showing placeholder.";
                div.appendChild(note);
            }

            const h3 = document.createElement("h3");
            const a = document.createElement("a");
            a.href = "#";
            a.innerText = pub.Title || "Untitled";
            a.dataset.id = pub.id;
            a.dataset.title = pub.Title || "";
            a.dataset.link = pub.Link || "";
            a.dataset.pdf = pub.Pdf || pub.Pdf_URL || "";
            a.dataset.image = pub.Image || "";
            a.dataset.authors = Array.isArray(pub.Authors)
                ? pub.Authors.join(", ")
                : pub.Authors || "";
            a.dataset.pcmid = pub.Pmcid || "";
            a.dataset.date = pub.PublicationDate || "";
            a.dataset.defaultImgFound = pub.Default_Img_Found ? "true" : "false";

            try {
                a.dataset.keywords = JSON.stringify(pub.Keywords || []);
            } catch {
                a.dataset.keywords = "[]";
            }
            try {
                a.dataset.images = JSON.stringify(
                    pub.Images && pub.Images.length
                        ? pub.Images
                        : pub.Image
                            ? [pub.Image]
                            : []
                );
            } catch {
                a.dataset.images = "[]";
            }
            a.addEventListener("click", function(e) {
                e.preventDefault();
                showSummaryFromElem(a);
            });
            h3.appendChild(a);
            div.appendChild(h3);

            const meta = document.createElement("div");
            meta.className = "result-meta";

            if (pub.Keywords && pub.Keywords.length) {
                const keywordsContainer = document.createElement("div");
                keywordsContainer.className = "article-keywords";
                (pub.Keywords || []).forEach((kw) => {
                    const span = document.createElement("span");
                    span.className = "keyword";
                    span.innerText = kw;
                    keywordsContainer.appendChild(span);
                });
                meta.appendChild(keywordsContainer);
                meta.appendChild(document.createElement("br"));
            }

            if (pub.PublicationDate) {
                const dateDiv = document.createElement("div");
                dateDiv.className = "pub-date";
                dateDiv.innerHTML = `<i class="fa fa-calendar"></i> Publication date: ${pub.PublicationDate}`;
                meta.appendChild(dateDiv);
            }

            const viewLink = document.createElement("span");
            viewLink.className = "view-link";
            viewLink.innerHTML = `<i class="fas fa-link"></i> <a href="${pub.Link || "#"
                }" target="_blank">View Paper</a>`;
            meta.appendChild(viewLink);

            const saveLink = document.createElement("span");
            saveLink.className = "save-link";
            saveLink.innerHTML = `<i class="fas fa-star"></i> Save Paper`;
            saveLink.onclick = () => {
                const currentlySaved = getSavedList().some((a) => a.id === pub.id);

                if (currentlySaved) {
                    removeSaved(pub.id);
                    saveLink.innerHTML = `<i class="fas fa-star"></i> Save Paper`;
                    showToast(`Unsaved '${(pub.Title || "").slice(0, 30)}'`);
                } else {
                    addSaved({
                        id: pub.id,
                        title: pub.Title,
                        link: pub.Link,
                        Image: pub.Image,
                        Authors: pub.Authors,
                        PublicationDate: pub.PublicationDate,
                        Keywords: pub.Keywords,
                    });
                    saveLink.innerHTML = `<i class="fas fa-star"></i> Saved`;
                }
            };

            meta.appendChild(saveLink);

            div.appendChild(meta);
            grid.appendChild(div);
        });
        const loadedCount = document.getElementById("results-grid").children.length;
        const resultsCount = document.getElementById("results-count");
        if (resultsCount) {
            showarticlesno = totalArticles;
            if (totalArticles >= 565) {
                showarticlesno = 608;
            }
            resultsCount.innerText = `Showing ${loadedCount} of ${showarticlesno} results`;
        }

        currentPage++;
    } catch (err) {
        console.error("fetchArticles error:", err);
    } finally {
        isFetching = false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("grid-cols");
    const isMobile =
        window.matchMedia && window.matchMedia("(max-width:900px)").matches;
    if (isMobile) {
        // On mobile force single-column grid and remove the grid choice
        setGridCols("1");
        if (select) {
            select.value = "1";
            select.style.display = "none";
            select.disabled = true;
        }
    } else {
        const savedCols = localStorage.getItem("grid-cols") || "3";
        if (select) {
            select.value = savedCols;
            setGridCols(savedCols);
            select.addEventListener("change", () => setGridCols(select.value));
        }
    }

    const sortSelect = document.getElementById("sort-date");
    if (sortSelect) {
        currentSort = sortSelect.value || "best";
        sortSelect.addEventListener("change", (e) => {
            currentSort = e.target.value || "best";
            fetchArticles(true); // reset and fetch with new sort
        });
    }

    const searchForm = document.querySelector(".search-box");
    if (searchForm) {
        searchForm.onsubmit = (e) => {
            e.preventDefault();
            fetchArticles(true);
        };
    }

    const savedBtn = document.getElementById("saved-btn");
    if (savedBtn) {
        savedBtn.onclick = () => {
            renderList(getSavedList(), "saved-list");
            openModal("saved-modal");
        };
    }

    const recentBtn = document.getElementById("recent-btn");
    if (recentBtn) {
        recentBtn.onclick = () => {
            renderList(getStorageList("recent-articles"), "recent-list");
            openModal("recent-modal");
        };
    }

    const titleElem = document.getElementById("title");
    if (titleElem) {
        titleElem.addEventListener("click", () => {
            const qInput = document.querySelector("input[name='q']");
            if (qInput) qInput.value = "";
            fetchArticles(true);
        });
    }

    fetchArticles(true);

    window.addEventListener("scroll", () => {
        const scrollTop = window.scrollY;
        const windowHeight = window.innerHeight;
        const fullHeight = document.body.scrollHeight;
        const loadedCount = document.getElementById("results-grid").children.length;
        if (
            scrollTop + windowHeight > fullHeight - 300 &&
            loadedCount < totalArticles
        ) {
            fetchArticles();
        }
    });

    const backdrop = document.getElementById("modal-backdrop");
    if (backdrop) backdrop.addEventListener("click", closeAllModals);

    document.querySelectorAll(".modal-close").forEach((btn) => {
        btn.addEventListener("click", closeAllModals);
    });
});

window.addSaved = addSaved;
window.addRecent = addRecent;
window.closeAllModals = closeAllModals;
document.getElementById("analytics-btn").onclick = (e) => {
    const openInNewTab = e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1;

    if (openInNewTab) {
        window.open("/analytics", "_blank");
    } else {
        window.location.href = "/analytics";
    }
};

document.getElementById("kg-btn").onclick = (e) => {
    const openInNewTab = e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1;

    if (openInNewTab) {
        window.open("/knowledgraphs", "_blank");
    } else {
        window.location.href = "/knowledgraphs";
    }
};
// i was here ;] aHR0cHM6Ly9naXRodWIuY29tL1ZleGlsb25IYWNrZXIK

// i was here ;] aHR0cHM6Ly9naXRodWIuY29tL1ZleGlsb25IYWNrZXIK 
//
