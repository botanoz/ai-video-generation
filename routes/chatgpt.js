const express = require("express");
const axios = require("axios");
const { v4: uuidv4 } = require('uuid');
const { logInfo, logError } = require('./utils/logUtils');
const config = require('../config');

const chatgptRouter = express.Router();
chatgptRouter.use(express.json());

async function getChatGPTResponse(prompt) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.openai.apiKey}`
                }
            }
        );
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("API isteği başarısız oldu:", error.response ? error.response.data : error.message);
        throw error;
    }
}

chatgptRouter.post("/v1/chatgpt", async (req, res) => {
    const userInput = req.body.input;
    const requestId = uuidv4();

    if (!userInput) {
        return res.status(400).json({ hata: 'Giriş metni boş' });
    }

    const finalPrompt = `${config.openai.basePrompt}\nUser-provided word or phrase: ${userInput}`;

    try {
        logInfo("Requesting ChatGPT response...", requestId, 'chatGPT');
        const completion = await getChatGPTResponse(finalPrompt);
        const titleMatch = completion.match(/Title:\s*(.*)/);
        const storyMatch = completion.match(/Story:\s*(.*)/);
        const tagsMatch = completion.match(/Tags:\s*(.*)/);

        if (titleMatch && storyMatch && tagsMatch) {
            const result = {
                id: requestId,
                title: titleMatch[1],
                story: storyMatch[1],
                tags: tagsMatch[1].split(',').map(tag => tag.trim())
            };
            res.json(result);
        } else {
            res.status(500).json({
                hata: 'API yanıtı doğru formatta değil. Lütfen daha sonra tekrar deneyin veya başka bir kelime/cümle ile deneyin.',
                prompt: finalPrompt,
                input: userInput
            });
        }
    } catch (error) {
        logError(error.message, requestId, 'chatGPT');
        res.status(500).json({ hata: 'API isteği başarısız oldu.', error: error.message });
    }
});

module.exports = {
    chatgptRouter,
    getChatGPTResponse
};
