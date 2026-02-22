import './styles/global.css';
import { mount } from 'svelte';
import App from './App.svelte';

// Mount the Svelte app to the #app element (Svelte 5 API)
const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
