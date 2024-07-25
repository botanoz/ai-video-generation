const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const config = require("./config");
const { chatgptRouter } = require("./routes/chatgpt");
const { pixabayRouter } = require("./routes/pixabay");
const { pollyRouter } = require("./routes/polly");
const videoRouter = require("./routes/video");

const app = express();
const port = config.server.port;

app.use(cors());
app.use(express.json());

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
checkDirectory(path.join(__dirname, 'audio'));
checkDirectory(path.join(__dirname, 'videos'));
checkDirectory(path.join(__dirname, '../temp_files'));
checkDirectory(path.join(__dirname, '../subtitles'));

app.use('/audio', express.static(path.join(__dirname, 'audio')));
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use("/api", chatgptRouter);
app.use("/api", pixabayRouter);
app.use("/api", pollyRouter);
app.use("/api", videoRouter);

app.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde başlatıldı!`);
});

module.exports = app;
