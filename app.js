const express = require('express');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

let csvData = [];

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('Nenhum arquivo foi enviado.');
    }

    const results = [];

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            csvData = results;
            fs.unlinkSync(req.file.path);
            res.json({ message: 'Arquivo CSV processado com sucesso!', data: csvData });
        })
        .on('error', (error) => {
            res.status(500).json({ error: 'Erro ao ler o arquivo CSV.' });
        });
});

// Endpoint para consultas
app.post('/api/consult', async (req, res) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ error: 'Pergunta não fornecida.' });
    }

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'user', content: `Com base nos seguintes dados: ${JSON.stringify(csvData)}, responda a pergunta: ${question}` }
            ],
            temperature: 0.7,
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        res.json({ answer: response.data.choices[0].message.content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao obter resposta da OpenAI.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
