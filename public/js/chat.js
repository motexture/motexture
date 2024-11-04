const inputField = document.getElementById('input');
const chat = document.getElementById('chat');

let lastUserMessage = "";
let waitingForAnswer = false;

localStorage.removeItem('interactions');

function isMobileDevice() {
    return /Mobi|Android/i.test(navigator.userAgent);
}

function isStorageSpaceAvailable(data) {
    let dataSizeInBytes = new Blob([JSON.stringify(data)]).size;
    let remainingSpace = getRemainingLocalStorageSpace();
    return dataSizeInBytes < remainingSpace;
}

function pruneInteractions() {
    let interactions = JSON.parse(localStorage.getItem('interactions')) || [];
    while (interactions.length > 0 && !isStorageSpaceAvailable(interactions)) {
        interactions.shift();
    }
    localStorage.setItem('interactions', JSON.stringify(interactions));
}

function storeInteraction(userMessage, assistantMessage, userEmbedding, assistantEmbedding) {
    let interactions = JSON.parse(localStorage.getItem('interactions')) || [];
    interactions.push({
        userMessage,
        assistantMessage,
        userEmbedding,
        assistantEmbedding
    });
    localStorage.setItem('interactions', JSON.stringify(interactions));
}

function isQuotaExceededError(e) {
    return e instanceof DOMException && (
        e.code === 22 ||
        e.code === 1014 ||
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
        navigator.userAgent.toLowerCase().indexOf('firefox') === -1 &&
        localStorage.length !== 0;
}

function safelyStoreInteraction(userMessage, assistantMessage, userEmbedding, assistantEmbedding) {
    try {
        storeInteraction(userMessage, assistantMessage, userEmbedding, assistantEmbedding);
    } catch (e) {
        if (isQuotaExceededError(e)) {
            pruneInteractions();
            storeInteraction(userMessage, assistantMessage, userEmbedding, assistantEmbedding);
        } else {
            throw e;
        }
    }
}

function calculateSimilarity(embedding1, embedding2) {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        normA += embedding1[i] * embedding1[i];
        normB += embedding2[i] * embedding2[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    return dotProduct / (normA * normB);
}

function getPastInteractions(currentEmbedding) {
    let interactions = JSON.parse(localStorage.getItem('interactions')) || [];
    let relatedInteractions = [];

    const threshold = 0.5;

    interactions.forEach(interaction => {
        let similarity = calculateSimilarity(currentEmbedding, interaction.userEmbedding);
        if (similarity > threshold) {
            relatedInteractions.push({ interaction: interaction, similarity: similarity });
        }
    });

    relatedInteractions.sort((a, b) => b.similarity - a.similarity);
    return relatedInteractions.slice(0, 10);
}

function getLastUserMessage() {
    return lastUserMessage;
}

function generateEmbedding(message) {
    return fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message })
    })
    .then(response => response.json())
    .then(data => data.embedding)
    .catch(error => {
        console.error('Error in embedding generation:', error);
        return undefined;
    });
}


function generateAndStoreInteraction(userMessage, assistantMessage) {
    Promise.all([
        generateEmbedding(userMessage),
        generateEmbedding(assistantMessage)
    ]).then(([userEmbedding, assistantEmbedding]) => {
        if (userEmbedding && assistantEmbedding) {
            safelyStoreInteraction(userMessage, assistantMessage, userEmbedding, assistantEmbedding);
        }
    });
}

function sendMessage(userMessage) {
    inputField.value = '';

    if (userMessage && !waitingForAnswer) {
        waitingForAnswer = true;

        displayMessage("Utente: " + userMessage);

        Promise.all([
            generateEmbedding(userMessage),
        ]).then(([userEmbedding]) => {
            let pastInteractions = undefined;

            if (userEmbedding) {
                pastInteractions = getPastInteractions(userEmbedding);
            }

            const requestBody = {
                prompt: userMessage,
                pastInteractions: pastInteractions
            };

            lastUserMessage = userMessage;

            fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            })
            .then(response => {
                if (response.status === 429) {
                    return response.json().then(data => {
                        displayMessage("Assistente: " + data.message);
                        waitingForAnswer = false;
                    });
                }
            
                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let buffer = '';
                const assistantMessageElement = createAssistantMessageElement();
            
                function processText({ done, value }) {
                    if (done) {
                        finalizeAssistantMessage(assistantMessageElement);
                        waitingForAnswer = false;
                        return;
                    }
            
                    buffer += decoder.decode(value, { stream: true });
                    let parts = buffer.split('\n');
            
                    parts.forEach(line => {
                        if (line.trim()) {
                            try {
                                const outerData = JSON.parse(line);
                                const innerJsonString = outerData.response.replace('data: ', '');
                                const innerData = JSON.parse(innerJsonString);

                                if (innerData.object === "chat.completion.chunk" && innerData.choices && innerData.choices[0].delta.content) {
                                    const content = innerData.choices[0].delta.content;
                                    console.log('Content received:', content);
                                    updateAssistantMessage(assistantMessageElement, content);
                                }
                            } catch (error) {
                                console.error('Error parsing JSON:', error, 'Line content:', line);
                            }
                        }
                    });
            
                    buffer = parts[parts.length - 1];
                    return reader.read().then(processText);
                }
            
                reader.read().then(processText);
            
            })
            .catch(error => {
                waitingForAnswer = false;
                console.error('Error:', error);
            });
        });
    }
}

function displayMessage(message) {
    const li = document.createElement('li');
    const codeBlockRegex = /```([a-z]+)\n([\s\S]*?)```/;

    if (codeBlockRegex.test(message)) {
        const matches = message.match(codeBlockRegex);
        const language = matches[1];
        const codeContent = matches[2];
        const pre = document.createElement('pre');
        const code = document.createElement('code');

        code.className = `language-${language}`;
        code.textContent = codeContent;

        pre.appendChild(code);
        li.appendChild(pre);

        Prism.highlightElement(code);
    } else {
        li.textContent = message;
    }

    chat.appendChild(li);
    chat.scrollTop = chat.scrollHeight;
} 

function createAssistantMessageElement() {
    const li = document.createElement('li');

    li.textContent = "Assistente: ";

    chat.appendChild(li);
    chat.scrollTop = chat.scrollHeight;

    return li;
}

function updateAssistantMessage(element, message) {
    message = message.replace(". ", ".<br>");
    message = message.replace("!", "!<br>");
    message = message.replace("?", "?<br>");
    message = message.replace(/\n/g, "<br>");

    element.innerHTML += message;
    setTimeout(() => {
        chat.scrollTop = chat.scrollHeight;
    }, 0);
}

function createCopyButton(codeContent) {
    const button = document.createElement('button');

    button.textContent = 'Copia';
    button.onclick = function() {
        navigator.clipboard.writeText(codeContent).then(() => {
            button.textContent = 'Copiato!';
            setTimeout(() => (button.textContent = 'Copiato'), 2000);
        }).catch(err => {
            console.error('Errore nel copiare il testo: ', err);
        });
    };
    
    return button;
}

function finalizeAssistantMessage(element) {
    const fullMessageHTML = element.innerHTML
    const fullMessage = element.textContent
    const segments = fullMessage.split(/(```[a-z]+\n[\s\S]*?```)/gm);

    generateAndStoreInteraction(getLastUserMessage(), fullMessage.replace(/Assistente:/g, ''))

    element.textContent = '';

    segments.forEach(segment => {
        if (/```[a-z]+\n[\s\S]*?```/.test(segment)) {
            const codeBlockRegex = /```([a-z]+)\n([\s\S]*?)```/;
            const matches = segment.match(codeBlockRegex);
            const language = matches[1];
            const codeContent = matches[2];

            const pre = document.createElement('pre');
            pre.style.position = 'relative';
            const codeEl = document.createElement('code');
            codeEl.className = `language-${language}`;
            codeEl.textContent = codeContent;
            pre.appendChild(codeEl);

            const copyButton = createCopyButton(codeContent);
            pre.appendChild(copyButton);

            element.appendChild(pre);

            Prism.highlightElement(codeEl);
        }
        element.innerHTML = fullMessageHTML;
    });

    setTimeout(() => {
        chat.scrollTop = chat.scrollHeight;
    }, 0);
}

function defaultMessage(text, element, index=0, delay=50) {
    if (index < text.length) {
        const chunkSize = Math.min(text.length - index, Math.floor(Math.random() * 3) + 1);
        updateAssistantMessage(element, text.substr(index, chunkSize))
        setTimeout(() => defaultMessage(text, element, index + chunkSize, delay), delay);
    }
}

inputField.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        if (isMobileDevice()) {
            console.log("Not sending message because the device is mobile.");
            return;
        }
        sendMessage(inputField.value.trim());
    }
});

const sendButton = document.getElementById('input-button');
const infoButton = document.getElementById('info-button');
const servicesButton = document.getElementById('services-button');
const assistantMessage = "Ciao! Come posso aiutarti oggi?";

window.onload = () => {
    assistantMessageElement = createAssistantMessageElement();
    defaultMessage(assistantMessage, assistantMessageElement);
};

sendButton.addEventListener('click', function() {
    sendMessage(inputField.value.trim());
});
infoButton.addEventListener('click', function() {
    sendMessage("Chi sono?");
});
servicesButton.addEventListener('click', function() {
    sendMessage("Che servizi offro?");
});