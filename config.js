require('dotenv').config();

const config = {
    aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
    },
    subtitle: {
        fontName: 'Arial',
        fontSize: 24,
        primaryColor: '&H00FFFFFF', // Beyaz
        outlineColor: '&H000000FF', // Siyah
        backColor: '&H00000000', // Şeffaf
        bold: -1, // -1: true, 0: false
        italic: 0,
        alignment: 2, // 2: Alt orta
        marginV: 10
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        basePrompt: process.env.BASE_PROMPT,
    },
    pixabay: {
        apiKey: process.env.PIXABAY_API_KEY,
    },
    server: {
        port: process.env.PORT || 9000,
    },
    maxRetryAttempts: process.env.MAX_RETRY_ATTEMPTS || 3,
    photoDuration: process.env.PHOTO_DURATION || 5,
    videoDuration: process.env.VIDEO_DURATION || 10,
    ffmpegOptions: {
        videoResolution: { width: 1080, height: 1920 }, // 9:16 aspect ratio
        frameRate: 25,
        videoBitrate: '1500k',
        videoCodec: 'libx264',
        crf: 28,
        preset: 'veryfast',
        pixelFormat: 'yuv420p',
        audioCodec: 'aac',
        audioBitrate: '128k',
        audioSampleRate: 44100,
        audioChannels: 2,
        movFlags: '+faststart'
    }
};

module.exports = config;
