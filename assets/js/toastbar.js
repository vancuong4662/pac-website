const toastbarZone = document.createElement('div');
toastbarZone.id = "toastbar-zone";
document.body.appendChild(toastbarZone);

const toastIcons = {
    success: "check-circle",
    error: "times-circle",
    warning: "exclamation-circle",
    info: "info-circle"
};

const toastCurrentId = 0;

function showToast(title, message, type = "info", lifeSpan = 3000) {
    const icon = toastIcons[type] || "bell";

    const toast = document.createElement('div');
    toast.className = `toastbar-main toastbar-${type}`;
    toast.id = `toastbar-${Date.now()}`;

    toast.innerHTML = `
        <i class="fa fa-${icon} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button type="button" class="btn-close" onclick="removeToastInstant('${toast.id}')">×</button>
    `;

    toastbarZone.appendChild(toast);

    // Tự động xóa sau thời gian
    setTimeout(() => {
        removeToast(toast.id);
    }, lifeSpan);
}

function removeToast(id) {
    const toast = document.getElementById(id);
    if (!toast) return;
    toast.style.animation = "fadeout 0.5s ease forwards";
    toast.addEventListener('animationend', () => {
        toast.remove();
    });
}

function removeToastInstant(id) {
    document.getElementById(id)?.remove();
}
