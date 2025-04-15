# Leakr - Chrome Extension

## Overview

Leakr is a Chrome extension that allows users to easily find content from Twitch streamers on other platforms. The extension streamlines the search process by automatically extracting the streamer's name from the Twitch URL.

## Features

- Automatic detection of the Twitch channel name from any Twitch URL
- Quick search across multiple platforms with a single click
- Opens search results in a new tab
- Simple and intuitive user interface
- Works directly from the browser

## Technical Architecture

The extension consists of:

- A popup interface (`popup.html` and `popup.ts`)
- A background script (`background.ts`)
- A manifest configuration file

## How it works

1. The user opens the extension on a Twitch page (the streamer's name is automatically detected) or pastes a Twitch URL into the text field
2. Three search options are provided:
   - Simple Google search
   - Search on KBJ Free
   - Specific "leaks" search
3. By clicking one of the buttons, the extension opens a new tab with the search results
4. The user can then browse the results to find the creator's content on other platforms

## Installation

1. Clone the repository
2. Build the extension (using Vite, as indicated in the configuration files)
3. Load the extension in Chrome:
   - Go to chrome://extensions/
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the build directory

## Development

This project is built with:

- TypeScript
- Chrome Extension API
- Vite (for building)
- TailwindCSS (for styling)

To modify the extension:

1. Edit the files in the `src` directory
2. Rebuild the extension
3. Reload it in Chrome

## Privacy Considerations

This extension simply initiates a search and does not store or transmit any personal data. It only requires minimal permissions (just "tabs" to open a new search tab).

## Disclaimer

This extension is intended for educational purposes only. Users must respect the privacy and rights of content creators and comply with the terms of service of all platforms.
