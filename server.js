import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const modelName = "meta-llama-3.1-8b-instruct";
const embeddingModelName = "text-embedding-nomic-embed-text-v1.5@q4_k_m"
const systemMessage = `
Questa è una chat tra un utente curioso e un assistente virtuale di intelligenza artificiale rappresentante motexture, un esperto freelance nel campo dell'intelligenza artificiale e dello sviluppo software. L'assistente fornisce risposte utili, dettagliate e cortesi, e si impegna a comprendere approfonditamente le esigenze dei potenziali clienti. L’obiettivo è capire le loro necessità, fare domande mirate e offrire soluzioni personalizzate per migliorare le loro attività o progetti.

Informazioni su motexture:
- Nome: motexture
- Website: https://motexture.com/
- Fiverr: https://www.fiverr.com/users/motexture/
- GitHub: https://github.com/motexture/
- LinkedIn: https://www.linkedin.com/in/motexture/

Offro una gamma completa di servizi AI personalizzati, tra cui:
- Sviluppo di applicazioni mobili per Android e iOS, utilizzando le tecnologie più avanzate per garantire prestazioni elevate e un’esperienza utente eccezionale.
- Creazione di web app interattive e responsive, con particolare attenzione a scalabilità e sicurezza.
- Chatbot avanzati e interattivi per migliorare il coinvolgimento dei clienti.
- Assistenti virtuali intelligenti per l'ottimizzazione dei processi aziendali.
- Sviluppo di siti web intuitivi e interattivi.
- Soluzioni di analisi dei dati per fornire informazioni commerciali approfondite.
- Integrazioni di AI per automatizzare processi aziendali.

Sono anche disponibile per consulenze personalizzate, per aiutarti a scoprire come l'AI può migliorare la tua attività. Se desideri informazioni sui servizi o un preventivo, sentiti libero di contattarmi su Fiverr, GitHub o LinkedIn. Sarò lieto di discutere in dettaglio le soluzioni più adatte alle tue esigenze.`;
const endPoint = 'http://localhost:1234/v1/chat/completions';
const embeddingsEndPoint = 'http://localhost:1234/v1/embeddings';
const app = express();
const port = 3000;

const limiter = rateLimit({
    windowMs: 3 * 60 * 60 * 1000,
    max: 20,
    handler: (req, res) => {
        res.status(429).json({
            error: "Troppe richieste",
            message: "Troppe richieste da questo IP. Per favore riprova più tardi."
        });
    }
});

app.use(bodyParser.json({ limit: '5mb' }));
app.use(cors());
app.use(express.static('public'));
app.use(limiter);

function formatMessage(prompt, pastInteractions) {
    const messages = [
        { role: "system", content: systemMessage }
    ];

    if (pastInteractions && pastInteractions.length) {
        pastInteractions.forEach(({ interaction }) => {
            messages.push({ role: "user", content: interaction.userMessage });
            messages.push({ role: "assistant", content: interaction.assistantMessage });
        });
    }

    messages.push({ role: "user", content: prompt });
    return messages;
}

app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, pastInteractions } = req.body;
        const formattedMessage = formatMessage(prompt, pastInteractions);

        const requestBody = {
            model: modelName,
            messages: formattedMessage,
            stream: true
        };

        const response = await fetch(endPoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Transfer-Encoding', 'chunked');

        response.body.on('data', (chunk) => {
            const data = chunk.toString().trim();
            if (data) {
                res.write(`${JSON.stringify({ response: data })}\n`);
            }
        });

        response.body.on('end', () => {
            res.end();
        });

        response.body.on('error', (err) => {
            console.error('Streaming error:', err);
            res.status(500).json({ error: 'Stream error' });
        });

    } catch (error) {
        console.error('Error in /api/generate:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/embeddings', async (req, res) => {
    try {
        const requestBody = {
            model: embeddingModelName,
            input: req.body.prompt
        };

        const response = await fetch(embeddingsEndPoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();

        const embedding = responseData.data[0].embedding;
        res.json({ embedding });
    } catch (error) {
        console.error('Error in /api/embeddings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/contact', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        console.log(`Contact message received from ${name} (${email}): ${message}`);
        res.status(200).json({ message: 'Il tuo messaggio è stato ricevuto. Grazie!' });
    } catch (error) {
        console.error('Error in /contact:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
