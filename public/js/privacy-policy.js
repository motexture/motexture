var privacyPolicyModal = document.getElementById('privacy-policy-modal');
var privacyPolicyButton = document.getElementById('privacy-policy-link');
var privacyPolicySpan = document.getElementsByClassName('close')[0];

privacyPolicyButton.onclick = function() {
    privacyPolicyModal.style.display = 'block';
}

privacyPolicySpan.onclick = function() {
    privacyPolicyModal.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target === privacyPolicyModal) {
        privacyPolicyModal.style.display = 'none';
    }
}