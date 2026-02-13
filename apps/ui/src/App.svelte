<script lang="ts">
  let count = 0;

  function increment() {
    count += 1;
  }
</script>

<div class="container">
  <h1>🎉 Hello dev-see!</h1>
  <p>If you can see this, Svelte is working!</p>

  <button onclick={increment}>
    Clicked {count} times
  </button>
</div>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
    color: white;
  }

  h1 {
    font-size: 3rem;
    margin: 0;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }

  p {
    font-size: 1.5rem;
    margin: 1rem 0 2rem 0;
    opacity: 0.9;
  }

  button {
    background: white;
    color: #667eea;
    border: none;
    padding: 1rem 2rem;
    font-size: 1.2rem;
    font-weight: bold;
    border-radius: 0.5rem;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    transition: all 0.2s;
  }

  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  }

  button:active {
    transform: translateY(0);
  }
</style>
