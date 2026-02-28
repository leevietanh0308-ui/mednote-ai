# MedNote-SOAP

AI-powered clinical SOAP note generator from audio recordings.

## Overview

MedNote-SOAP is designed to help doctors save time on data entry. It takes audio recordings (either an in-room conversation with a patient or a dictation after the visit) and uses Google's Gemini AI to generate a structured SOAP note.

## Features

- **Two Modes**: "In-room conversation" and "Dictation after visit".
- **Audio Upload**: Upload mp3, wav, or m4a files.
- **Structured Output**: Generates a detailed SOAP note, transcript, and a formatted text note for easy copy-pasting.
- **Safety First**: AI is instructed not to hallucinate information and flags missing or uncertain details.

## Setup Instructions

1. **Configure Gemini API Key**:
   This application requires a Gemini API Key to function.
   - Open the **Secrets** panel in Google AI Studio.
   - Add a new secret named `GEMINI_API_KEY` and paste your API key.
   - The platform will automatically inject this into the application's environment variables.

2. **Run the Application**:
   The application will automatically build and run in the AI Studio environment.

## Tech Stack

- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: Node.js, Express, Multer
- **AI**: `@google/genai` (Gemini 2.5 Flash for multimodal audio processing)
- **Validation**: Zod, zod-to-json-schema
