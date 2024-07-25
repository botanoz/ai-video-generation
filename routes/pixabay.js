const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const { logInfo, logError } = require('./utils/logUtils');
const config = require('../config');

const pixabayRouter = express.Router();
const PIXABAY_API_URL = "https://pixabay.com/api/";

const tempDir = path.join(__dirname, '../temp_files');

if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

async function retryOperation(operation, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            console.log(`Deneme ${attempt} başarısız. Hata: ${error.message}`);
            if (attempt === maxAttempts) throw error;
            console.log(`Yeniden deneniyor...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

async function fetchPixabayMedia(tag, mediaType, requestId) {
    console.log(`Fetching ${mediaType} for tag: ${tag}`);
    try {
        const response = await axios.get(PIXABAY_API_URL, {
            params: {
                key: config.pixabay.apiKey,
                q: tag,
                per_page: 3,
                [mediaType === 'video' ? 'video_type' : 'image_type']: mediaType === 'video' ? 'film' : 'photo'
            }
        });
        console.log(`Received response for ${mediaType}:`, response.data);

        if (response.data.hits.length > 0) {
            const mediaUrl = mediaType === 'video' ? response.data.hits[0].videos.medium.url : response.data.hits[0].largeImageURL;
            const mediaData = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
            const fileExtension = mediaType === 'video' ? 'mp4' : 'jpg';
            const filePath = path.join(tempDir, `${sanitizeFilename(tag)}_${requestId}.${fileExtension}`);
            fs.writeFileSync(filePath, mediaData.data);
            return filePath;
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Error fetching ${mediaType} for tag ${tag}:`, error.message);
        return null;
    }
}

function sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?*']/g, '_');
}

pixabayRouter.post("/v1/images", async (req, res) => {
    const tags = req.body.tags;
    const requestId = uuidv4();
    console.log("Received tags for images:", tags);

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
        console.log("Invalid tags parameter:", tags);
        return res.status(400).json({ error: "Tags are required and should be an array." });
    }

    try {
        const images = await Promise.all(
            tags.map(tag => retryOperation(() => fetchPixabayMedia(tag, 'photo', requestId)))
        );

        const validImages = images.filter(Boolean);
        console.log(`Found ${validImages.length} valid images out of ${tags.length}`);

        if (validImages.length === 0) {
            return res.status(404).json({ error: "No images found for the given tags." });
        }

        res.json({ images: validImages });
    } catch (error) {
        console.error("Error in /v1/images route:", error.message);
        res.status(500).json({ error: "An error occurred while fetching images.", details: error.message });
    }
});

pixabayRouter.post("/v1/videos", async (req, res) => {
    const tags = req.body.tags;
    const requestId = uuidv4();
    console.log("Received tags for videos:", tags);

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
        console.log("Invalid tags parameter:", tags);
        return res.status(400).json({ error: "Tags are required and should be an array." });
    }

    try {
        let foundVideos = [];

        for (const tag of tags) {
            const video = await retryOperation(() => fetchPixabayMedia(tag, 'video', requestId));
            if (video) foundVideos.push(video);
        }

        if (foundVideos.length < 3) {
            console.log("No sufficient videos found, fetching random photos");
            const images = await Promise.all(
                tags.map(tag => retryOperation(() => fetchPixabayMedia(tag, 'photo', requestId)))
            );

            const validImages = images.filter(Boolean).slice(0, 3);
            if (validImages.length === 0) {
                return res.status(404).json({ error: "No videos or images found for the given tags." });
            }

            return res.json({ videos: [], images: validImages });
        }

        res.json({ videos: foundVideos, images: [] });
    } catch (error) {
        console.error("Error in /v1/videos route:", error.message);
        res.status(500).json({ error: "An error occurred while fetching videos.", details: error.message });
    }
});

module.exports = {
    pixabayRouter,
    fetchPixabayMedia,
    retryOperation
};
