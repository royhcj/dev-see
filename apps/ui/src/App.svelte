<script lang="ts">
  // This is the "logic" section of a Svelte component
  // Any variables declared here are reactive!
  let count = 0;

  function increment() {
    count += 1;
  }
</script>

<!-- This is the "template" section - your HTML -->
<main>
  <div class="card">
    <h1>🎉 Hello dev-see!</h1>
    <p>Welcome to your Svelte + Vite app</p>

    <div class="counter-demo">
      <button on:click={increment}>
        Count is: {count}
      </button>
      <p class="hint">Click the button to test reactivity!</p>
    </div>
  </div>
</main>

<!-- This is the "style" section - scoped to this component only! -->
<style>
  main {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .card {
    background: white;
    padding: 2rem;
    border-radius: 1rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    text-align: center;
    max-width: 500px;
  }

  h1 {
    font-size: 2.5rem;
    margin: 0 0 1rem 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  p {
    color: #666;
    margin: 0 0 2rem 0;
  }

  .counter-demo {
    margin-top: 2rem;
  }

  button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 1rem 2rem;
    font-size: 1.2rem;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
  }

  button:active {
    transform: translateY(0);
  }

  .hint {
    font-size: 0.875rem;
    color: #999;
    margin-top: 1rem;
  }
</style>
