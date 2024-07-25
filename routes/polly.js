const express = require("express");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const { logInfo, logError } = require('./utils/logUtils');
const config = require('../config');
const { generateSrtFile } = require('./utils/subtitleUtils');

const pollyRouter = express.Router();

AWS.config.update({
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
    region: config.aws.region
});

const polly = new AWS.Polly();

const audioDir = path.join(__dirname, '../audio');
if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir);
}

const subtitleDir = path.join(__dirname, '../subtitles');
if (!fs.existsSync(subtitleDir)) {
    fs.mkdirSync(subtitleDir);
}

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

function convertTextToSSML(text) {
    const escapedText = escapeXml(text);

    const ssmlText = escapedText
        .replace(/\./g, '.<break time="500ms"/>')
        .replace(/,/g, ',<break time="300ms"/>')
        .replace(/\?/g, '?<break time="500ms"/>')
        .replace(/\!/g, '!<break time="500ms"/>');

    return `<speak>${ssmlText}</speak>`;
}

async function generateSpeech(ssmlText, voiceId = "Joanna", requestId) {
    const params = {
        OutputFormat: "mp3",
        Text: ssmlText,
        VoiceId: voiceId,
        TextType: "ssml"
    };

    logInfo(`SSML Text: ${ssmlText}`, requestId, 'generateSpeech');

    return new Promise((resolve, reject) => {
        polly.synthesizeSpeech(params, (err, data) => {
            if (err) {
                console.error("Polly API isteği başarısız oldu:", err);
                logError(`Polly API isteği başarısız oldu: ${err}`, requestId, 'generateSpeech');
                reject(err);
            } else if (data.AudioStream instanceof Buffer) {
                const fileName = `${requestId}.mp3`;
                const audioFilePath = path.join(audioDir, fileName);
                fs.writeFile(audioFilePath, data.AudioStream, (err) => {
                    if (err) {
                        console.error("Ses dosyası yazılamadı:", err);
                        logError(`Ses dosyası yazılamadı: ${err}`, requestId, 'generateSpeech');
                        reject(err);
                    } else {
                        const audioUrl = `/audio/${fileName}`;
                        resolve({ audioUrl, audioFilePath });
                    }
                });
            }
        });
    });
}

async function getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg');
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                resolve(metadata.format.duration * 1000);
            }
        });
    });
}

pollyRouter.post("/v1/polly", async (req, res) => {
    const { text, voiceId } = req.body;
    const requestId = uuidv4();

    if (!text) {
        return res.status(400).json({ hata: 'Metin boş' });
    }

    try {
        const ssmlText = convertTextToSSML(text);
        const response = await generateSpeech(ssmlText, voiceId, requestId);
        const audioDuration = await getAudioDuration(response.audioFilePath);

        const subtitleFilePath = generateSrtFile(text, audioDuration, requestId);

        res.json({ 
            mesaj: 'Ses dosyası ve altyazı başarıyla oluşturuldu.', 
            audioUrl: response.audioUrl, 
            subtitleUrl: `/subtitles/${path.basename(subtitleFilePath)}` 
        });
    } catch (error) {
        res.status(500).json({ hata: 'İstek sırasında bir hata oluştu.', error: error.message });
    }
});

module.exports = {
    pollyRouter,
    generateSpeech,
    convertTextToSSML
};
