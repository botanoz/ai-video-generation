const express = require("express");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const concat = require('ffmpeg-concat');
const { createUniqueId, cleanTempFiles } = require('./utils/fileUtils');
const { getChatGPTResponse } = require('../routes/chatgpt');
const { fetchPixabayMedia, retryOperation } = require('../routes/pixabay');
const { generateSpeech, convertTextToSSML } = require('../routes/polly');
const { resizeVideo, processImageFile, processVideoFile, mergeMediaFilesConcatProtocol, processAndMergeFiles, mergeVideoAndAudio, addSubtitlesToVideo, sanitizeFilename } = require('./utils/ffmpegUtils');
const { logInfo, logError } = require('./utils/logUtils');
const config = require('../config');
const { generateAssFile } = require('./utils/subtitleUtils');

const router = express.Router();

const videoDir = path.join(__dirname, '../videos');
const tempDir = path.join(__dirname, '../temp_files');
const audioDir = path.join(__dirname, '../audio');
const subtitleDir = path.join(__dirname, '../subtitles');

const checkDirectory = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.access(dir, fs.constants.W_OK, (err) => {
        if (err) {
            console.error(`Output directory is not writable: ${dir}`);
            throw new Error(`Output directory is not writable: ${dir}`);
        } else {
            console.log(`Output directory is writable: ${dir}`);
        }
    });
};

// Check directories
checkDirectory(videoDir);
checkDirectory(tempDir);
checkDirectory(audioDir);
checkDirectory(subtitleDir);

router.post("/v1/create-video", async (req, res) => {
    const userInput = req.body.input;
    const requestId = createUniqueId();

    if (!userInput) {
        return res.status(400).json({ hata: 'Giriş metni boş' });
    }

    try {
        logInfo(`Processing request with ID: ${requestId}`, requestId, 'start');

        const finalPrompt = `${config.openai.basePrompt}\nUser-provided word or phrase: ${userInput}`;

        logInfo("Requesting ChatGPT response...", requestId, 'chatGPT');
        const chatGPTResponse = await retryOperation(async () => {
            const completion = await getChatGPTResponse(finalPrompt);
            const titleMatch = completion.match(/Title:\s*(.*)/);
            const storyMatch = completion.match(/Story:\s*(.*)/);
            const tagsMatch = completion.match(/Tags:\s*(.*)/);

            if (!titleMatch || !storyMatch || !tagsMatch) {
                throw new Error('Invalid API response format.');
            }

            return {
                title: titleMatch[1].toLowerCase().replace(/\s+/g, '-'),
                story: storyMatch[1],
                tags: tagsMatch[1].split(',').map(tag => tag.trim())
            };
        }, config.maxRetryAttempts);
        logInfo("ChatGPT response received.", requestId, 'chatGPT');

        logInfo("Requesting audio from Polly...", requestId, 'polly');
        const audioResponse = await retryOperation(async () => {
            const response = await generateSpeech(convertTextToSSML(chatGPTResponse.story), 'Joanna', requestId);
            if (!response.audioUrl) {
                throw new Error('Invalid audio response');
            }
            return response;
        }, config.maxRetryAttempts);
        logInfo("Audio received from Polly.", requestId, 'polly');

        const audioFilePath = path.join(audioDir, path.basename(audioResponse.audioUrl));

        logInfo("Analyzing audio duration...", requestId, 'audioAnalysis');
        const audioDuration = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(audioFilePath, (err, metadata) => {
                if (err) reject(err);
                else resolve(metadata.format.duration);
            });
        });
        logInfo(`Audio duration: ${audioDuration} seconds`, requestId, 'audioAnalysis');

        logInfo("Generating subtitle file...", requestId, 'subtitleGeneration');
        const subtitleFilePath = generateAssFile(chatGPTResponse.story, audioDuration, requestId);
        logInfo("Subtitle file generated.", requestId, 'subtitleGeneration');

        logInfo("Requesting media from Pixabay...", requestId, 'pixabay');
        const pixabayMediaResponse = await retryOperation(async () => {
            const selectedTags = chatGPTResponse.tags;
            let foundVideos = [];

            for (const tag of selectedTags) {
                const video = await retryOperation(() => fetchPixabayMedia(tag, 'video', requestId), config.maxRetryAttempts);
                if (video) foundVideos.push(video);
            }

            const images = await Promise.all(
                selectedTags.map(tag => retryOperation(() => fetchPixabayMedia(tag, 'photo', requestId), config.maxRetryAttempts))
            );

            const validImages = images.filter(Boolean);
            if (foundVideos.length === 0 && validImages.length === 0) {
                throw new Error('No valid photos or videos found.');
            }

            return { videos: foundVideos, images: validImages };
        }, config.maxRetryAttempts);
        logInfo("Media received from Pixabay.", requestId, 'pixabay');

        const images = pixabayMediaResponse.images || [];
        const videos = pixabayMediaResponse.videos || [];
        const mediaCount = images.length + videos.length;
        if (mediaCount === 0) {
            throw new Error('No valid photos or videos found.');
        }

        logInfo("Processing media files...", requestId, 'processMediaFiles');
        const processedFiles = [];

        for (let i = 0; i < images.length; i++) {
            try {
                const processedFile = await processImageFile(images[i], i, config.photoDuration, requestId, config);
                processedFiles.push(processedFile);
            } catch (error) {
                logError(error, requestId, `processImageFile (${i})`);
                console.error(`[${requestId}] Image processing error for ${images[i]}:`, error);
            }
        }

        for (let i = 0; i < videos.length; i++) {
            try {
                const processedFile = await processVideoFile(videos[i], i + images.length, config.videoDuration, requestId, config);
                processedFiles.push(processedFile);
            } catch (error) {
                logError(error, requestId, `processVideoFile (${i})`);
                console.error(`[${requestId}] Video processing error for ${videos[i]}:`, error);
            }
        }

        logInfo("Media files processed.", requestId, 'processMediaFiles');

        logInfo("Applying effects and merging media files using ffmpeg-concat...", requestId, 'applyEffectsAndMerge');
        const finalMergedFilePath = path.join(tempDir, `${chatGPTResponse.title}_${requestId}_merged.mp4`);
        await concat({
            output: finalMergedFilePath,
            videos: processedFiles,
            transition: {
                name: 'fade',
                duration: 500
            }
        });

        logInfo("Merging audio with the final merged video...", requestId, 'mergeAudio');
        const tempVideoWithAudioPath = path.join(tempDir, `${chatGPTResponse.title}_${requestId}_temp.mp4`);
        await mergeVideoAndAudio(finalMergedFilePath, audioFilePath, tempVideoWithAudioPath, requestId, config);

        logInfo("Adding subtitles to the final video...", requestId, 'addSubtitles');
        const tempSubtitledVideoPath = path.join(tempDir, `${chatGPTResponse.title}_${requestId}_subtitled_temp.mp4`);
        const finalVideoFilePath = path.join(videoDir, `${chatGPTResponse.title}_${requestId}.mp4`);

        try {
            await addSubtitlesToVideo(tempVideoWithAudioPath, subtitleFilePath, tempSubtitledVideoPath, requestId);
            fs.renameSync(tempSubtitledVideoPath, finalVideoFilePath);
            logInfo("Subtitles added successfully", requestId, 'addSubtitles');
        } catch (error) {
            logError(`Error adding subtitles: ${error.message}`, requestId, 'addSubtitles');
            throw error;
        }

        cleanTempFiles(requestId);
        logInfo(`Request ${requestId} completed successfully.`, requestId, 'end');

        res.json({
            mesaj: 'Video başarıyla oluşturuldu.',
            videoUrl: `/videos/${path.basename(finalVideoFilePath)}`,
            audioUrl: audioResponse.audioUrl,
            subtitleUrl: `/subtitles/${path.basename(subtitleFilePath)}`,
            title: chatGPTResponse.title,
            story: chatGPTResponse.story,
            tags: chatGPTResponse.tags
        });

    } catch (error) {
        logError(error, requestId, 'finalCatch');
        console.error(`[${requestId}] Final error:`, error);
        res.status(500).json({ hata: 'İşlem sırasında bir hata oluştu.', error: error.message });
        cleanTempFiles(requestId);
    }
});

module.exports = router;
