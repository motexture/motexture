var contactUsModal = document.getElementById('contact-us-modal');
var contactUsButton = document.getElementById('contact-us-button');
var contactUsSpan = document.getElementById('contact-us-close');
var contactForm = document.getElementById('contact-form');
var thankYouMessage = document.getElementById('thank-you-message');

contactUsButton.onclick = function() {
    contactUsModal.style.display = 'block';
}

contactUsSpan.onclick = function() {
    contactUsModal.style.display = 'none';
}

window.onclick = function(event) {
    if (event.target == contactUsModal) {
        contactUsModal.style.display = 'none';
    }
}

contactForm.addEventListener('submit', function(event) {
    event.preventDefault();

    var formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        message: document.getElementById('message').value
    };

    fetch('/contact', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        contactForm.reset();
        thankYouMessage.style.display = 'block';

        setTimeout(function() {
            thankYouMessage.style.display = 'none';
        }, 5000);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});
