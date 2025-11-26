let groupCount = 0;
const groupContainer = document.getElementById("groupContainer");
const groupSelect = document.getElementById("groupSelect");
const previewCanvas = document.getElementById("previewCanvas");
const ctx = previewCanvas.getContext("2d");

const groups = {}; // Lưu tất cả group {id: {name, files: []}}

// Thêm group mới
function addGroup() {
    groupCount++;
    const groupId = `group${groupCount}`;
    const groupDiv = document.createElement("div");
    groupDiv.classList.add("group-container");
    groupDiv.dataset.groupId = groupId;

    groupDiv.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <strong>Group ${groupCount}</strong>
            <button class="btn btn-sm btn-danger removeGroupBtn">Xóa Group</button>
        </div>
        <input type="file" class="groupFiles form-control form-control-sm mt-2" multiple>
        <div class="frame-list"></div>
    `;

    groupContainer.appendChild(groupDiv);

    const fileInput = groupDiv.querySelector(".groupFiles");
    const frameList = groupDiv.querySelector(".frame-list");

    groups[groupId] = { name: `Group ${groupCount}`, files: [] };

    setupFrameList(fileInput, frameList, groupId);

    // Xóa group
    groupDiv.querySelector(".removeGroupBtn").addEventListener("click", () => {
        delete groups[groupId];
        groupDiv.remove();
        updateGroupDropdown();
        updatePreview();
    });

    updateGroupDropdown();
}

// Dropdown group
function updateGroupDropdown() {
    groupSelect.innerHTML = `<option value="">-- Chọn group --</option>`;
    Object.keys(groups).forEach(id => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = groups[id].name;
        groupSelect.appendChild(option);
    });
}

// Setup frame list cho group
function setupFrameList(fileInput, frameListDiv, groupId) {
    fileInput.addEventListener("change", () => {
        frameListDiv.innerHTML = "";
        const filesArray = [...fileInput.files];
        groups[groupId].files = filesArray;

        filesArray.forEach(file => {
            const div = document.createElement("div");
            div.className = "frame-item";
            div.file = file;

            const img = document.createElement("img");
            img.src = URL.createObjectURL(file);

            const label = document.createElement("div");
            label.textContent = file.name;

            div.appendChild(img);
            div.appendChild(label);
            frameListDiv.appendChild(div);
        });
        updatePreview();
    });

    Sortable.create(frameListDiv, {
        animation: 150,
        onSort: () => {
            groups[groupId].files = [...frameListDiv.querySelectorAll(".frame-item")].map(item => item.file);
            updatePreview();
        }
    });
}

// Lấy frame của group hiện tại
function getCurrentFrames() {
    const groupId = groupSelect.value;
    if (!groupId) return [];
    return groups[groupId].files;
}

// Load images
function loadImages(files) {
    return Promise.all(files.map(file => new Promise(res => {
        const img = new Image();
        img.onload = () => res(img);
        img.src = URL.createObjectURL(file);
    })));
}

// Animation preview
let animationInterval;
async function updatePreview() {
    if (animationInterval) clearInterval(animationInterval);
    const files = getCurrentFrames();
    if (!files || files.length === 0) {
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        return;
    }

    const useBg = document.getElementById("useBg").checked;
    const bgColor = document.getElementById("bgColor").value;
    const scale = parseInt(document.getElementById("scale").value);
    const fps = parseInt(document.getElementById("fps").value);
    const delay = 1000 / fps;

    const images = await loadImages(files);
    let index = 0;

    animationInterval = setInterval(() => {
        const img = images[index];
        const w = img.width * scale;
        const h = img.height * scale;

        previewCanvas.width = w;
        previewCanvas.height = h;

        if (useBg) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, w, h);
        } else {
            ctx.clearRect(0, 0, w, h);
        }

        ctx.drawImage(img, 0, 0, w, h);

        index = (index + 1) % images.length;
    }, delay);
}

// Init
addGroup();
document.getElementById("addGroupBtn").addEventListener("click", addGroup);
groupSelect.addEventListener("change", updatePreview);
["useBg","bgColor","fps","scale"].forEach(id => {
    document.getElementById(id).addEventListener("input", updatePreview);
});
