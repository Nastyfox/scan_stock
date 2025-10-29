// Configuration - Remplace cette URL par ton URL de déploiement Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

let html5QrcodeScanner;
let lastScannedCode = '';

// Initialisation du scanner au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    initScanner();
});

function initScanner() {
    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { 
            fps: 10,
            qrbox: { width: 250, height: 150 },
            formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.CODE_93,
                Html5QrcodeSupportedFormats.ITF
            ],
            rememberLastUsedCamera: true
        },
        false
    );
    
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function onScanSuccess(decodedText, decodedResult) {
    // Éviter les scans multiples du même code
    if (decodedText === lastScannedCode) {
        return;
    }
    
    lastScannedCode = decodedText;
    
    // Remplir le champ code-barres
    document.getElementById('barcode').value = decodedText;
    
    // Focus sur le champ quantité
    document.getElementById('quantity').focus();
    
    // Réinitialiser le message
    hideMessage();
    
    // Vibration si supportée (mobile)
    if (navigator.vibrate) {
        navigator.vibrate(200);
    }
    
    console.log(`Code scanné: ${decodedText}`, decodedResult);
}

function onScanFailure(error) {
    // Gérer silencieusement les erreurs de scan (trop verbeux sinon)
    // console.warn(`Erreur de scan: ${error}`);
}

async function submitToSheets() {
    const barcode = document.getElementById('barcode').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const submitBtn = document.getElementById('submitBtn');
    
    // Validation
    if (!barcode) {
        showMessage('Veuillez scanner un code-barres', 'error');
        return;
    }
    
    if (!quantity || quantity < 1) {
        showMessage('Veuillez entrer une quantité valide', 'error');
        return;
    }
    
    // Désactiver le bouton pendant l'envoi
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours...';
    
    try {
        // Envoi des données à Google Sheets
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                barcode: barcode,
                quantity: quantity,
                timestamp: new Date().toISOString()
            })
        });
        
        // Note: mode 'no-cors' ne retourne pas de réponse lisible
        // On suppose que l'envoi a réussi
        showMessage(`✓ Stock mis à jour: ${barcode} (+${quantity})`, 'success');
        
        // Réinitialiser les champs
        document.getElementById('barcode').value = '';
        document.getElementById('quantity').value = '1';
        lastScannedCode = '';
        
        // Vibration de confirmation
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
        
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('Erreur lors de l\'envoi. Vérifiez votre connexion.', 'error');
    } finally {
        // Réactiver le bouton
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ajouter au stock';
    }
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    // Masquer automatiquement après 5 secondes
    setTimeout(hideMessage, 5000);
}

function hideMessage() {
    const messageDiv = document.getElementById('message');
    messageDiv.style.display = 'none';
}

// Permettre la soumission avec la touche Entrée
document.getElementById('quantity').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        submitToSheets();
    }
});