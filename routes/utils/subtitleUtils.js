const fs = require('fs');
const path = require('path');
const { logInfo, logError } = require('./logUtils');

const generateAssSubtitles = (text, totalAudioDuration, requestId) => {
    const sentences = text.split(/([.!?])/).filter(Boolean);
    let subtitles = [];
    let startTime = 0;
    const totalSentences = sentences.length / 2;
    const baseDuration = (totalAudioDuration - (totalSentences - 1) * 250) / totalSentences;

    for (let i = 0; i < sentences.length; i += 2) {
        let sentence = sentences[i].trim();
        let punctuation = (i + 1 < sentences.length) ? sentences[i + 1] : '';

        let endTime = startTime + baseDuration;

        subtitles.push({
            text: sentence + punctuation,
            start: startTime,
            end: endTime
        });

        startTime = endTime + 250;
    }

    logInfo(`Generated ${subtitles.length} subtitles`, requestId, 'generateAssSubtitles');
    return subtitles;
};

const formatAssTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const millisecondsLeft = Math.floor((milliseconds % 1000) / 10);

    return `${String(hours).padStart(1, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millisecondsLeft).padStart(2, '0')}`;
};

const generateAssContent = (subtitles) => {
    const header = `[Script Info]
Title: Subtitles
ScriptType: v4.00+
Collisions: Normal
PlayDepth: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${config.subtitle.fontName},${config.subtitle.fontSize},${config.subtitle.primaryColor},&H000000FF,${config.subtitle.outlineColor},${config.subtitle.backColor},${config.subtitle.bold},${config.subtitle.italic},0,0,100,100,0,0,1,1,0,${config.subtitle.alignment},10,10,${config.subtitle.marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

    const events = subtitles.map((subtitle, index) => {
        return `Dialogue: 0,${formatAssTime(subtitle.start)},${formatAssTime(subtitle.end)},Default,,0,0,0,,${subtitle.text}`;
    }).join('\n');

    return `${header}\n${events}`;
};

const generateAssFile = (text, totalAudioDuration, requestId) => {
    const subtitles = generateAssSubtitles(text, totalAudioDuration, requestId);
    const assContent = generateAssContent(subtitles);
    const subtitleDir = path.join(__dirname, '../../subtitles');
    if (!fs.existsSync(subtitleDir)) {
        fs.mkdirSync(subtitleDir, { recursive: true });
    }
    const subtitleFilePath = path.join(subtitleDir, `${requestId}.ass`);
    fs.writeFileSync(subtitleFilePath, assContent);
    logInfo(`Generated ASS file: ${subtitleFilePath}`, requestId, 'generateAssFile');
    return subtitleFilePath;
};

module.exports = {
    generateAssFile
};
