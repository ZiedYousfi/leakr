# Leakr - Enhanced Chrome Extension

## Overview

Leakr is a comprehensive Chrome extension designed to help users easily discover and manage content from their favorite creators across multiple platforms. The extension organizes, categorizes, and centralizes online content with a user-friendly interface.

## Key Features

- **Enhanced Creator Discovery**: Automatically identify creators from Twitch, Instagram, Twitter, YouTube, TikTok, and other platforms
- **Content Management System**: Save and organize content URLs associated with specific creators
- **Multi-tab Interface**: Navigate through intuitive tabs for searching, managing content, and organizing creators
- **Profile Integration**: Associate multiple platform profiles with each creator
- **Favorites & Collections**: Mark both creators and content as favorites for quick access
- **Local Database**: All data is stored locally for privacy and offline access

## Technical Architecture

The extension is built with a modern tech stack:

- **Frontend**: Svelte with TypeScript for a reactive, component-based UI
- **Database**: SQL.js for local storage with a well-structured schema
- **Styling**: TailwindCSS for responsive design
- **Building**: Vite for fast development and optimized production builds
- **Chrome API**: Integration with browser tabs and storage

## How It Works

1. **Search & Identification**: The extension automatically detects creator information from platform URLs and usernames
2. **Content Storage**: Save current browser tabs to associate with specific creators
3. **Creator Profiles**: Manage multiple platform profiles for each creator
4. **Quick Access**: Browse saved content through All, Favorites, or Creator-specific tabs

## Installation

1. Clone the repository
2. Build the extension using Vite:
   ```
   npm install
   npm run build
   ```
3. Load the extension in Chrome:
   - Go to chrome://extensions/
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the build directory

## Development

The extension follows a modular architecture:
- **Components**: Reusable UI elements in `src/components/`
- **Pages**: Main views including Search, Contents, and Creators
- **Library**: Core functionality for database, creator identification, and platform detection
- **Stores**: Central state management using Svelte stores

To extend the extension, modify the relevant components and rebuild.

## Privacy & Security

Leakr stores all data locally in your browser. No data is transmitted to external servers, ensuring your browsing history and saved content remain private.

## Disclaimer

This extension is intended for personal content organization only. Users must respect content creators' rights and the terms of service for all platforms.
