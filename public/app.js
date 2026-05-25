(async () => {
    // ── Read ?ID from URL ─────────────────────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    const reqId  = parseInt(params.get('ID'), 10);

    // ── Fetch catalog ─────────────────────────────────────────────────────
    let items = [];
    try {
        const res = await fetch('/items.json');
        items = await res.json();
    } catch (e) {
        console.error('Failed to load items.json', e);
    }

    // ── Find item (fallback to first if no ID given) ───────────────────────
    let item = isNaN(reqId)
        ? items[0]
        : items.find(i => i.id === reqId);

    // ── Render ────────────────────────────────────────────────────────────
    const productEl     = document.getElementById('product');
    const notFoundEl    = document.getElementById('notFound');
    const imgEl         = document.getElementById('productImage');
    const imgNotFound   = document.getElementById('imageNotFound');
    const nameEl        = document.getElementById('productName');
    const descEl        = document.getElementById('productDescription');
    const priceEl       = document.getElementById('productPrice');

    if (!item) {
        productEl.classList.add('hidden');
        notFoundEl.classList.remove('hidden');
        return;
    }

    // Populate fields
    nameEl.textContent  = item.name;
    descEl.textContent  = item.description;
    priceEl.textContent = item.price;
    document.title      = `${item.name} — USA Custom Trophies`;

    // Load image, show placeholder if missing
    if (item.file) {
        imgEl.src = `/ITEMS/${item.file}`;
        imgEl.onerror = () => {
            imgEl.classList.add('hidden');
            imgNotFound.classList.remove('hidden');
        };
    } else {
        imgEl.classList.add('hidden');
        imgNotFound.classList.remove('hidden');
    }

    // ── Order button → modal ──────────────────────────────────────────────
    const overlay    = document.getElementById('modalOverlay');
    const orderBtn   = document.getElementById('orderBtn');
    const modalClose = document.getElementById('modalClose');
    const modalOk    = document.getElementById('modalOk');

    function openModal()  { overlay.classList.remove('hidden'); }
    function closeModal() { overlay.classList.add('hidden'); }

    orderBtn.addEventListener('click', openModal);
    modalClose.addEventListener('click', closeModal);
    modalOk.addEventListener('click', closeModal);
    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal();
    });
})();
