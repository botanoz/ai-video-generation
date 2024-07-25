const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const { logInfo, logError } = require('./logUtils');

const tempDir = path.join(__dirname, '../../temp_files');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

function sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?*']/g, '_');
}

async function resizeVideo(inputPath, outputPath, width, height) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions(`-vf scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => {
                logError(`Error resizing video: ${err.message}`);
                reject(err);
            })
            .save(outputPath);
    });
}

async function processImageFile(imageFile, index, duration, id, config) {
    const outputFile = path.join(tempDir, `segment_${index}_${id}.mp4`);
    const photoDuration = config.photoDuration;

    return new Promise((resolve, reject) => {
        ffmpeg(imageFile)
            .inputOptions(['-loop 1'])
            .outputOptions([
                `-vf scale=${config.ffmpegOptions.videoResolution.width}:${config.ffmpegOptions.videoResolution.height}:force_original_aspect_ratio=increase,crop=${config.ffmpegOptions.videoResolution.width}:${config.ffmpegOptions.videoResolution.height},zoompan=z='min(zoom+0.0015,1.5)':d=${photoDuration*30}:s=${config.ffmpegOptions.videoResolution.width}x${config.ffmpegOptions.videoResolution.height}`,
                `-t ${photoDuration}`,
                `-r ${config.ffmpegOptions.frameRate}`,
                `-b:v ${config.ffmpegOptions.videoBitrate}`,
                `-c:v ${config.ffmpegOptions.videoCodec}`,
                `-crf ${config.ffmpegOptions.crf}`,
                `-preset ${config.ffmpegOptions.preset}`,
                `-pix_fmt ${config.ffmpegOptions.pixelFormat}`
            ])
            .toFormat('mp4')
            .on('end', () => {
                resolve(outputFile);
                logInfo(`Processed image ${index} with duration ${photoDuration}s, file: ${imageFile}`, id, 'processImageFile');
            })
            .on('error', (err) => {
                reject(err);
            })
            .save(outputFile);
    });
}

async function processVideoFile(videoFile, index, duration, id, config) {
    const outputFile = path.join(tempDir, `segment_${index}_${id}.mp4`);

    return new Promise((resolve, reject) => {
        ffmpeg(videoFile)
            .inputOptions(['-loglevel error'])
            .outputOptions([
                `-t ${duration}`,
                `-r ${config.ffmpegOptions.frameRate}`,
                `-b:v ${config.ffmpegOptions.videoBitrate}`,
                `-c:v ${config.ffmpegOptions.videoCodec}`,
                `-crf ${config.ffmpegOptions.crf}`,
                `-preset ${config.ffmpegOptions.preset}`,
                `-pix_fmt ${config.ffmpegOptions.pixelFormat}`,
                `-vf scale=${config.ffmpegOptions.videoResolution.width}:${config.ffmpegOptions.videoResolution.height}:force_original_aspect_ratio=increase,crop=${config.ffmpegOptions.videoResolution.width}:${config.ffmpegOptions.videoResolution.height}`
            ])
            .toFormat('mp4')
            .on('end', () => {
                resolve(outputFile);
                logInfo(`Processed video ${index}, duration: ${duration}s, file: ${videoFile}`, id, 'processVideoFile');
            })
            .on('error', (err) => {
                reject(err);
            })
            .save(outputFile);
    });
}

async function mergeMediaFilesConcatProtocol(files, outputFilePath, requestId, step) {
    return new Promise((resolve, reject) => {
        const fileListPath = path.join(tempDir, `filelist_${requestId}.txt`);
        fs.writeFileSync(fileListPath, files.map(file => `file '${file.replace(/\\/g, '/')}'`).join('\n'));

        ffmpeg()
            .input(fileListPath)
            .inputOptions(['-f concat', '-safe 0'])
            .outputOptions('-c copy')
            .on('start', (command) => {
                console.log(`[${requestId}] [${step}] FFmpeg komutu: ${command}`);
            })
            .on('progress', (progress) => {
                console.log(`[${requestId}] [${step}] İşleme: ${progress.percent}% tamamlandı`);
            })
            .on('end', () => {
                resolve(outputFilePath);
                logInfo(`Merged ${files.length} media files into ${outputFilePath} using concat protocol`, requestId, step);
            })
            .on('error', (err) => {
                reject(err);
            })
            .save(outputFilePath);
    });
}

async function processAndMergeFiles(processedFiles, requestId, step, audioDuration, config) {
    logInfo("Merging media files in small groups...", requestId, step);
    const mergedGroupFiles = [];
    const groupSize = 4;

    for (let i = 0; i < processedFiles.length; i += groupSize) {
        const group = processedFiles.slice(i, i + groupSize);
        const groupFilePath = path.join(tempDir, `merged_group_${i}_${requestId}.mp4`);
        try {
            await mergeMediaFilesConcatProtocol(group, groupFilePath, requestId, `mergeGroupConcat (${i})`);
            mergedGroupFiles.push(groupFilePath);
        } catch (concatError) {
            logError(concatError, requestId, `mergeGroupConcat (${i})`);
            console.error(`[${requestId}] Grup ${i} birleştirme hatası:`, concatError);
        }
    }

    logInfo("Merging all media groups...", requestId, step);
    let finalMergedFilePath;
    try {
        finalMergedFilePath = path.join(tempDir, `merged_all_concat_${requestId}.mp4`);
        await mergeMediaFilesConcatProtocol(mergedGroupFiles, finalMergedFilePath, requestId, 'mergeAllConcat');
    } catch (concatError) {
        logError(concatError, requestId, 'mergeAllConcat');
        console.error(`[${requestId}] Tüm grupları birleştirme hatası:`, concatError);

        // Son çare olarak tek bir görüntü kullan
        if (processedFiles.length > 0) {
            finalMergedFilePath = path.join(tempDir, `merged_single_${requestId}.mp4`);
            await processImageFile(processedFiles[0], 0, audioDuration, requestId, config);
        } else {
            throw new Error('Hiçbir medya dosyası işlenemedi');
        }
    }

    return finalMergedFilePath;
}

async function mergeVideoAndAudio(videoPath, audioPath, outputPath, requestId, config) {
    const tempOutputPath = path.join(tempDir, `temp2_${path.basename(outputPath)}`);
    console.log(`[${requestId}] Video ve ses birleştiriliyor...`);

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions([
                `-c:v ${config.ffmpegOptions.videoCodec}`,
                `-preset ${config.ffmpegOptions.preset}`,
                `-crf ${config.ffmpegOptions.crf}`,
                `-b:v ${config.ffmpegOptions.videoBitrate}`,
                `-c:a ${config.ffmpegOptions.audioCodec}`,
                `-b:a ${config.ffmpegOptions.audioBitrate}`,
                `-ar ${config.ffmpegOptions.audioSampleRate}`,
                `-ac ${config.ffmpegOptions.audioChannels}`,
                `-r ${config.ffmpegOptions.frameRate}`,
                `-pix_fmt ${config.ffmpegOptions.pixelFormat}`,
                `-movflags ${config.ffmpegOptions.movFlags}`,
                `-vf scale=${config.ffmpegOptions.videoResolution.width}:${config.ffmpegOptions.videoResolution.height}:force_original_aspect_ratio=decrease,pad=${config.ffmpegOptions.videoResolution.width}:${config.ffmpegOptions.videoResolution.height}:(ow-iw)/2:(oh-ih)/2,setsar=1`
            ])
            .on('start', (command) => {
                console.log(`[${requestId}] FFmpeg komutu: ${command}`);
            })
            .on('progress', (progress) => {
                console.log(`[${requestId}] İşleme: ${progress.percent}% tamamlandı`);
            })
            .on('end', () => {
                console.log(`[${requestId}] Video başarıyla oluşturuldu: ${tempOutputPath}`);
                try {
                    if (fs.existsSync(tempOutputPath)) {
                        fs.renameSync(tempOutputPath, outputPath); 
                        resolve(outputPath);
                    } else {
                        throw new Error(`Temp output file does not exist: ${tempOutputPath}`);
                    }
                } catch (renameError) {
                    console.error(`[${requestId}] Dosya yeniden adlandırma hatası:`, renameError);
                    reject(renameError);
                }
            })
            .on('error', (err) => {
                console.error(`[${requestId}] Video oluşturma hatası:`, err);
                reject(err);
            })
            .save(tempOutputPath);
    });
}

const addSubtitlesToVideo = (inputVideoPath, subtitlePath, outputVideoPath, requestId) => {
    return new Promise((resolve, reject) => {
        const sanitizedOutputPath = path.join(tempDir, `temp_subtitled_${sanitizeFilename(path.basename(outputVideoPath))}`);
        
        ffmpeg(inputVideoPath)
            .input(subtitlePath)
            .outputOptions([
                `-c copy`,
                `-c:s mov_text`
            ])
            .on('start', (commandLine) => {
                logInfo(`FFmpeg started with command: ${commandLine}`, requestId, 'addSubtitlesToVideo');
            })
            .on('progress', (progress) => {
                logInfo(`Processing: ${progress.percent}% done`, requestId, 'addSubtitlesToVideo');
            })
            .on('error', (err) => {
                logError(`FFmpeg error: ${err.message}`, requestId, 'addSubtitlesToVideo');
                reject(err);
            })
            .on('end', () => {
                logInfo('Subtitles added successfully', requestId, 'addSubtitlesToVideo');
                fs.renameSync(sanitizedOutputPath, outputVideoPath);
                resolve();
            })
            .save(sanitizedOutputPath);
    });
};

module.exports = {
    resizeVideo,
    processImageFile,
    processVideoFile,
    mergeMediaFilesConcatProtocol,
    processAndMergeFiles,
    mergeVideoAndAudio,
    addSubtitlesToVideo,
    sanitizeFilename
};
