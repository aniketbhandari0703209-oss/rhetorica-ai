Rhetorica AI

An AI-powered public speaking analysis platform designed to help speakers understand, practise, and improve the way they communicate.

Rhetorica AI combines artificial intelligence, real-time audio analysis, computer-vision-based posture feedback, speech analysis, and an interactive 3D interface into a single public-speaking practice environment.

The goal is simple: turn public-speaking practice into something measurable, explainable, and iterative.

Overview

Public speaking is often evaluated subjectively.

A speaker may know that they need to "speak with more confidence" or "maintain better eye contact", but those instructions are difficult to act upon without specific feedback.

Rhetorica AI approaches the problem differently.

Instead of providing only a final score, the platform analyses multiple dimensions of a speaking performance and converts them into actionable feedback.

The system can examine:

Speech delivery

Speaking pace

Vocal intensity

Pitch

Pauses

Filler words

Clarity

Vocal consistency

Script-to-speech alignment

Posture

Camera positioning

Facial positioning

Eye-contact-related visual cues

Overall delivery

The result is intended to function more like a digital speaking coach than a simple speech recorder.

Key Features

AI Speech Analysis

Rhetorica AI uses Google's Gemini API to analyse speech-related input and generate structured coaching feedback.

The AI layer can be used for:

Speech analysis

Rhetorical feedback

Delivery recommendations

Strategy suggestions

Fact-oriented analysis

Vocal delivery interpretation

Speech improvement guidance

The Gemini API is accessed through a server-side function so that the API key is not exposed directly to the client.

Live Audio Coach

The platform includes a browser-based microphone analysis system for real-time speaking feedback.

During a recording session, Rhetorica AI tracks:

Live volume

RMS signal level

Peak volume

Approximate pitch frequency

Vocal tone

Speaking pace

Words per minute

Pause count

Longest pause

Filler words

Clarity

Vocal energy

Voice consistency

The audio system supports:

Start

Pause

Resume

Stop

Playback

Vocal Tone Analysis

Rhetorica AI uses a simple delivery-oriented tone model:

High Tone

Moderate Tone

Low Tone

The system considers vocal pitch and signal intensity when estimating the current delivery level.

Speaking Pace & Pause Analysis

The platform estimates speaking rate using the recognised transcript and recording duration.

It can identify delivery that is too fast, too slow, or within a moderate range.

It also tracks:

Number of pauses

Longest pause

Overall pause behaviour

Filler Word Detection

The system looks for common filler expressions such as:

"um"

"uh"

"er"

"like"

"basically"

"actually"

"you know"

"sort of"

"kind of"

"I mean"

Speech Recognition & Script Matching

Where supported by the browser, Rhetorica AI uses the Web Speech API to create a live transcript.

The recognised speech can be compared with the intended written script to estimate how closely the spoken delivery follows the prepared material.

This can help identify:

Script deviations

Omissions

Added material

Overall script alignment

Posture & Camera Analysis

Rhetorica AI includes camera-based visual feedback.

The posture system can evaluate:

Face detection

Horizontal positioning

Vertical positioning

Apparent distance from the camera

Framing

Overall positioning

Eye-contact-related visual cues

It can provide feedback such as:

Center Yourself

Move Back

Move Closer

Raise Your Position

Lower Your Position

Look Toward Camera

Optimal Upright

Eye Contact

Where browser capabilities allow, face detection is used to estimate facial positioning relative to the camera.

Because native browser face detection does not provide detailed iris or gaze vectors, the current implementation uses facial geometry as a conservative proxy rather than claiming to perform precise eye tracking.

Performance Report

After an audio session, Rhetorica AI generates a report containing:

Overall score

Tone

Target tone

Pitch

Speaking pace

Script match

Clarity

Vocal energy

Voice consistency

Filler-word count

Average volume

Peak volume

Pause count

Longest pause

Director feedback

Recorded audio can also be played back for self-review.

Interactive Interface

The application uses an immersive visual environment incorporating:

3D objects

Animated backgrounds

Star fields

Blue particle effects

Neural-style visual elements

Cursor-responsive motion

Dynamic lighting

Interactive data visualisation

The visual direction is built around the intersection of communication, intelligence, and technology.

Technology Stack

Frontend

React 19

TypeScript

Vite

TanStack Start

TanStack Router

Tailwind CSS

AI

Google Gemini API

Server-side Gemini function

3D & Visualisation

Three.js

React Three Fiber

Drei

Framer Motion

Recharts

UI

Radix/shadcn-style UI components

Lucide icons

Browser APIs

MediaDevices / getUserMedia

MediaRecorder

Web Audio API

AnalyserNode

Speech Recognition

Face Detection

How It Works

                   Speaker
                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼
        Microphone          Camera
             │                 │
             ▼                 ▼
       Web Audio          Face / Frame
        Analysis            Analysis
             │                 │
      ┌──────┼──────┐    ┌─────┼─────┐
      │      │      │    │     │     │
    Pitch   Pace   Tone Posture Face Eye Contact
    Volume Pauses Fillers Position
      │      │      │    │     │     │
      └──────┴──────┴────┴─────┴─────┘
                      │
                      ▼
              Speech Recognition
                      │
                      ▼
               Script Matching
                      │
                      ▼
                  Gemini AI
                      │
                      ▼
             Performance Report

AI Architecture

The Gemini API is accessed through the server rather than directly from the browser.

Browser
   │
   ▼
TanStack Server Function
   │
   │ GEMINI_API_KEY
   ▼
Google Gemini API
   │
   ▼
Server Function
   │
   ▼
Browser

This keeps the Gemini API key out of client-side JavaScript.

Local Development

Prerequisites

Node.js

npm

Install dependencies:

npm install

Environment Variables

Create a .env file in the project root:

GEMINI_API_KEY=your_gemini_api_key

The real API key should never be committed to Git.

The repository includes .env.example as a template.

Start Development Server

npm run dev

Production Build

npm run build

This runs the production Vite build and TypeScript validation.

Deployment

Rhetorica AI is designed to be deployed using Vercel with the TanStack Start application framework.

The production environment requires:

GEMINI_API_KEY

The key should be added through the deployment platform's environment-variable settings rather than committed to the repository.

Design Philosophy

The project intentionally uses a predominantly blue visual language.

The interface combines:

Deep navy backgrounds

Electric blue highlights

Cyan accents

Soft blue lighting

Animated 3D elements

The visual direction is inspired by:

communication × intelligence × technology

Limitations

Some measurements depend on browser capabilities and hardware.

For example:

Speech recognition availability varies by browser.

Native face detection support varies by browser.

Eye-contact analysis currently relies on facial geometry where detailed gaze tracking is unavailable.

Pitch detection is an approximation derived from microphone audio.

Audio-derived clarity, energy, and consistency values are analytical estimates rather than clinical measurements.

Microphone and camera quality can affect results.

The platform therefore presents these results as coaching signals and estimates, rather than absolute measurements.

Future Development

Potential future improvements include:

More advanced facial landmark tracking

Dedicated iris/gaze estimation

Improved acoustic analysis

Speaker-specific vocal baselines

More sophisticated rhetorical analysis

Automatic speech segmentation

Better cross-browser speech recognition

Longitudinal performance tracking

Session-to-session progress comparison

Personalised AI coaching plans

More advanced speech analytics

Why Rhetorica?

The name Rhetorica comes from the tradition of rhetoric — the study and practice of effective communication.

The project brings that idea into a modern technical environment by combining:

Artificial intelligence

Audio signal processing

Computer vision

Speech recognition

Interactive 3D graphics

Real-time browser technologies

Rather than simply asking whether a speech is "good" or "bad", Rhetorica attempts to answer:

What specifically can the speaker improve, and how can technology help them practise it?

Project Status

Current status: Active development / production-ready prototype

Current capabilities include:

AI-powered analysis

Live audio coaching

Speech recognition

Vocal analysis

Pace analysis

Pause detection

Filler-word detection

Script matching

Camera analysis

Posture feedback

Eye-contact-oriented feedback

Interactive 3D interface

Production build configuration

Author

Rhetorica AI is an independently developed software project exploring the intersection of artificial intelligence, communication, and human-computer interaction.

The project was built as an exploration of how modern browser technologies and AI systems can be combined to create practical tools for improving real-world communication.

License

This project is currently intended as a personal/educational project.

All rights reserved unless otherwise specified.