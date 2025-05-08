// background.ts

import { authenticateWithClerk, getAccessToken } from './lib/authUtils';

// Écoute les messages depuis popup ou contenu

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {
    case 'AUTH_CLERK':
      authenticateWithClerk()
        .then(() => sendResponse({ status: 'success' }))
        .catch(err => sendResponse({ status: 'error', error: err.message }));
      return true; // on répond async

    case 'GET_TOKEN':
      getAccessToken()
        .then(token => sendResponse({ status: 'success', token }))
        .catch(err => sendResponse({ status: 'error', error: err.message }));
      return true;

    // case 'REFRESH_TOKEN':
    //   refreshAccessToken()
    //     .then(() => sendResponse({ status: 'success' }))
    //     .catch(err => sendResponse({ status: 'error', error: err.message }));
    //   return true;

    default:
      return false;
  }
});

// Exemple d'appel depuis popup:
// chrome.runtime.sendMessage({ type: 'AUTH_CLERK' }, resp => console.log(resp));
// chrome.runtime.sendMessage({ type: 'GET_TOKEN' }, resp => console.log('Token:', resp.token));
