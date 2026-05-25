(() => {
    // ── Fetch next ID ─────────────────────────────────────────────────────
    fetch('/next-id')
        .then(r => r.json())
        .then(d => { document.getElementById('nextId').textContent = `#${d.id}`; })
        .catch(() => { document.getElementById('nextId').textContent = 'TBD'; });

    // ── Upload zone ───────────────────────────────────────────────────────
    const uploadZone = document.getElementById('uploadZone');
    const fileInput  = document.getElementById('fileInput');
    const fileName   = document.getElementById('fileName');
    const previewWrap = document.getElementById('preview-wrap');
    const preview    = document.getElementById('preview');

    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', e => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', e => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) setFile(fileInput.files[0]);
    });

    function setFile(file) {
        // Transfer to the hidden input via DataTransfer
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;

        fileName.textContent = file.name;
        const reader = new FileReader();
        reader.onload = e => {
            preview.src = e.target.result;
            previewWrap.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    // ── Form submit ───────────────────────────────────────────────────────
    const form      = document.getElementById('addForm');
    const submitBtn = document.getElementById('submitBtn');
    const statusMsg = document.getElementById('statusMsg');

    form.addEventListener('submit', async e => {
        e.preventDefault();

        if (!fileInput.files[0]) {
            showStatus('error', 'Please select an image.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';

        const data = new FormData(form);

        try {
            const res = await fetch('/submit-item', { method: 'POST', body: data });
            const json = await res.json();

            if (res.ok) {
                showStatus('success', `Trophy #${json.id} submitted! It's live. 🏆`);
                form.reset();
                fileName.textContent = '';
                previewWrap.style.display = 'none';
                document.getElementById('nextId').textContent = `#${json.id + 1}`;
            } else {
                showStatus('error', json.error || 'Something went wrong. Try again.');
            }
        } catch (err) {
            showStatus('error', 'Network error. Try again.');
        }

        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Trophy';
    });

    function showStatus(type, msg) {
        statusMsg.className = type;
        statusMsg.textContent = msg;
        statusMsg.style.display = 'block';
    }
})();
