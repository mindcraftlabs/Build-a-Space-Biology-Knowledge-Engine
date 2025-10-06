
(function() {
    const btn = document.getElementById("copyTreeBtn");
    const tree = document.getElementById("projectTree");
    if (btn && tree) {
        btn.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(tree.textContent.trim());
                btn.textContent = "Copied ✓";
                setTimeout(() => (btn.textContent = "Copy project tree"), 2000);
            } catch (e) {
                console.error("copy failed", e);
                btn.textContent = "Copy failed";
                setTimeout(() => (btn.textContent = "Copy project tree"), 2000);
            }
        });
    }

    // Improve avatar fallbacks: replace empty parent with styled initials
    document.querySelectorAll(".avatar img").forEach((img) => {
        img.addEventListener("error", function() {
            const parent = this.parentNode;
            const alt = this.getAttribute("alt") || "";
            const initials =
                alt
                    .split(" ")
                    .map((s) => s[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "??";
            // hide img and insert styled fallback
            this.style.display = "none";
            const placeholder = document.createElement("div");
            placeholder.className = "avatar-fallback";
            placeholder.textContent = initials;
            // remove existing text nodes
            while (parent.firstChild) parent.removeChild(parent.firstChild);
            parent.appendChild(placeholder);
        });
    });
    // Accordions: wire up accessible toggle behavior
    document.querySelectorAll(".accordion-button").forEach((btn) => {
        const panelId = btn.getAttribute("aria-controls");
        const panel = document.getElementById(panelId);
        const icon = btn.querySelector("span");
        const toggle = (open) => {
            const expand =
                typeof open === "boolean"
                    ? open
                    : btn.getAttribute("aria-expanded") !== "true";
            btn.setAttribute("aria-expanded", expand ? "true" : "false");
            if (panel) panel.classList.toggle("open", expand);
            if (icon) icon.textContent = expand ? "▾" : "▸";
        };
        btn.addEventListener("click", () => toggle());
        btn.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle();
            }
        });
    });
})();
