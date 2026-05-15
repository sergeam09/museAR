// Generador básico de QR
window.generateQR = function(text, elementId) {
    // Usar API pública de goQR.me
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
    const img = document.createElement('img');
    img.src = qrUrl;
    img.alt = 'QR Code';
    
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    container.appendChild(img);
};

// Configurar botones de compartir
document.addEventListener('DOMContentLoaded', () => {
    const shareLinkBtn = document.getElementById('share-link');
    const shareQRBtn = document.getElementById('share-qr');
    const popup = document.getElementById('qr-popup');
    const closeBtn = document.querySelector('.close');
    const copyLinkBtn = document.getElementById('copy-link');
    
    shareLinkBtn.addEventListener('click', () => {
        const link = window.generateShareLink();
        navigator.clipboard.writeText(link);
        alert('Link copiado al portapapeles: ' + link);
    });
    
    shareQRBtn.addEventListener('click', () => {
        const link = window.generateShareLink();
        document.getElementById('share-url').textContent = link;
        window.generateQR(link, 'qr-code');
        popup.classList.remove('hidden');
    });
    
    closeBtn.addEventListener('click', () => {
        popup.classList.add('hidden');
    });
    
    copyLinkBtn.addEventListener('click', () => {
        const url = document.getElementById('share-url').textContent;
        navigator.clipboard.writeText(url);
        alert('Enlace copiado');
    });
    
    // Cerrar popup al hacer clic fuera
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.classList.add('hidden');
        }
    });
});