# AI-Powered Video Generation Project

English| [Türkçe](README-TR_tr.md) 

This project is an AI-driven video generation system that creates engaging short-form videos by combining text-to-speech, image and video content, and subtitles. It leverages various APIs and services to produce high-quality, vertical format (9:16 aspect ratio) videos suitable for platforms like TikTok, Instagram Reels, and YouTube Shorts.

## Features

- Generates story content using OpenAI's GPT model
- Converts text to speech using AWS Polly
- Fetches relevant images and videos from Pixabay
- Processes and combines media into a single video
- Adds subtitles to the final video
- Optimized for vertical video format (9:16 aspect ratio)
- Configurable video and audio settings

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v14 or later)
- FFmpeg installed on your system
- API keys for OpenAI, AWS, and Pixabay

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/botanoz/ai-video-generation.git
   cd ai-video-generation
   ```

2. Install the dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your API keys:
   ```
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=your_aws_region
   OPENAI_API_KEY=your_openai_api_key
   PIXABAY_API_KEY=your_pixabay_api_key
   ```

4. Update the `config.js` file with your preferred settings.

## Usage

To generate a video, send a POST request to the `/api/v1/create-video` endpoint with a JSON body containing the input text:

```json
{
  "input": "Your input text or prompt here"
}
```

The server will process the request and return a JSON response with the URLs for the generated video, audio, and subtitle files.

## Project Structure

- `audio/`: Directory for storing generated audio files
- `errors/`: Directory for error logs
- `logs/`: Directory for information logs
- `routes/`: Contains route handlers and API integrations
  - `utils/`: Utility functions for various operations
- `subtitles/`: Directory for generated subtitle files
- `temp_files/`: Directory for temporary files used during processing
- `videos/`: Directory for final generated video files
- `config.js`: Configuration file for the project
- `index.js`: Main application file

## Configuration

You can modify various settings in the `config.js` file, including:

- Video resolution and aspect ratio
- Frame rate and bitrate
- FFmpeg encoding settings
- Subtitle appearance

## API Integrations

This project integrates with the following APIs:

- OpenAI GPT for story generation
- AWS Polly for text-to-speech conversion
- Pixabay for fetching images and videos

## Contributing

Contributions to this project are welcome. Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Commit your changes (`git commit -am 'Add some feature'`)
5. Push to the branch (`git push origin feature/your-feature-name`)
6. Create a new Pull Request

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Contact

If you have any questions or feedback, please open an issue on the GitHub repository.

