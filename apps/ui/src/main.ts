import './style.css';
import App from './App.svelte';

// Mount the Svelte app to the #app element
const app = new App({
  target: document.getElementById('app')!,
});

export default app;
