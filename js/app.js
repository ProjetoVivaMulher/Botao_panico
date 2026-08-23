const btnPanic = document.getElementById("btnPanic");
const countdownOverlay = document.getElementById("countdownOverlay");
const countdownNumber = document.getElementById("countdownNumber");
const btnCancelPanic = document.getElementById("btnCancelPanic");
const toastNotification = document.getElementById("toastNotification");
const toastText = document.getElementById("toastText");

let countdownInterval;

// Quando clicar no botão de pânico
btnPanic.addEventListener("click", function () {
    let seconds = 3;

    countdownNumber.textContent = seconds;
    countdownOverlay.classList.add("active");

    countdownInterval = setInterval(function () {
    seconds--;

    if (seconds === 0) {
        clearInterval(countdownInterval);
        countdownOverlay.classList.remove("active");

        showToast("Abrindo WhatsApp para envio do alerta...");

        const mensagem = "🚨 ALERTA DE EMERGÊNCIA! Preciso de ajuda. Este alerta foi enviado pelo aplicativo Viva Mulher.";

        const urlWhatsApp = "https://wa.me/?text=" + encodeURIComponent(mensagem);

        window.open(urlWhatsApp, "_blank");
    } else {
        countdownNumber.textContent = seconds;
    }
}, 1000);
});

// Cancelar o disparo
btnCancelPanic.addEventListener("click", function () {
    clearInterval(countdownInterval);
    countdownOverlay.classList.remove("active");
    showToast("Disparo cancelado.");
});

function showToast(message) {
    toastText.textContent = message;
    toastNotification.classList.add("show");

    setTimeout(function () {
        toastNotification.classList.remove("show");
    }, 3000);
}