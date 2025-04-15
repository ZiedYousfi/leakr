# Leakr - Chrome Extension

## Overview

Leakr is a Chrome extension that allows users to find content from Twitch streamers across other platforms, particularly adult content platforms where creators might have additional material. The extension simplifies the process of finding a streamer's presence on other websites by providing a quick search functionality.

## Features

- Extract a Twitch channel name from any Twitch URL
- Perform a search for that channel name with a single click on multiple platforms
- Open the search results in a new tab
- Supports multiple platforms (e.g., OnlyFans, Fansly, etc.)
- Simple and intuitive user interface
- Works directly from the browser

## Technical Architecture

The extension consists of:

- A popup interface (`popup.html` and `popup.ts`)
- A background script (`background.ts`)
- Manifest configuration file

## How It Works

1. The user inputs a Twitch URL into the text field in the popup
2. When the search button is clicked, the extension extracts the channel name using regex
3. A new tab opens with search results for that channel name on multiple platforms (choice of platforms will be added in the future)
4. The user can then browse through the search results to find content from that creator on other platforms

## Installation

1. Clone the repository
2. Build the extension (using Vite, as indicated by the configuration files)
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

To modify the extension:

1. Edit the files in the `src` directory
2. Rebuild the extension
3. Reload it in Chrome

## Privacy Considerations

This extension simply initiates a Google search and does not store or transmit any personal data. It requires minimal permissions (only "tabs" to open a new search tab).

## Disclaimer

This extension is intended for educational purposes only. Users should respect the privacy and rights of content creators and comply with the terms of service of all platforms. The extension does not guarantee that you will find leaked content, as it simply performs a standard search.
