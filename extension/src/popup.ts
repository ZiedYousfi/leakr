// src/popup.ts
import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');
if (!target) {
  throw new Error('Mount point "#app" introuvable dans popup.html');
}

mount(App, {
  target,
  props: {}
});
