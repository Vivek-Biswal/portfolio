export const apps = Object.freeze({
  about: {
    title: "About Vivek",
    icon: "person",
    html: `
      <div class="welcome-grid">
        <figure>
          <button class="avatar-button" type="button" data-avatar aria-label="Say hello to pixel Vivek">
            <img src="/2d/vivek-pixel.png" width="140" height="180" alt="A smiling pixel-art portrait of Vivek Biswal." />
          </button>
          <figcaption class="avatar-caption">A little hello from my world.</figcaption>
        </figure>
        <div>
          <p class="app-eyebrow">A personal corner of the internet</p>
          <h1 class="app-heading">Hey, I’m Vivek.</h1>
          <p class="app-copy">A curious builder exploring design, technology, and what the web can become.</p>
          <p>I like turning an idea into something you can use, explore, or play with. This little desktop is one of those experiments.</p>
          <p class="speech-bubble" data-speech aria-live="polite">Welcome to my corner of the pixel universe.</p>
        </div>
      </div>
      <div class="app-card">
        <h2>From “what if?” to something real.</h2>
        <p>I enjoy shaping an idea, finding a clear way to present it, and refining the details. Useful interfaces and small, thoughtful interactions keep me curious.</p>
      </div>
      <p class="app-links"><a href="/1d/">Follow the 1D line →</a><a href="/">Read the 0D essentials →</a></p>
    `,
  },
  projects: {
    title: "Projects",
    icon: "folder",
    html: `
      <p class="app-eyebrow">Selected work / 001</p>
      <h1 class="app-heading">One portfolio. Four ways in.</h1>
      <p class="app-copy">The same person, work, and ideas, presented through different worlds.</p>
      <article class="app-card">
        <h2>A portfolio in four dimensions</h2>
        <p>My current personal project starts with a plain page, follows a guided line, opens this pixel desktop, and explores a character-led 3D scene.</p>
        <ul class="tag-list" aria-label="Portfolio modes">
          <li>0D · Essentials</li><li>1D · A guided line</li><li>2D · You are here</li><li>3D · Experiment</li>
        </ul>
        <p class="app-links"><a href="/work/dimensional-portfolio.html">Read the project →</a><a href="/">0D</a><a href="/1d/">1D</a><a href="/3d/">3D ↗</a></p>
        <details>
          <summary>Inside the project</summary>
          <p>The 0D pages use HTML and CSS. The guided line and pixel desktop add small JavaScript interactions. The 3D experiment uses React, TypeScript, Three.js, and GSAP. Vite builds the different entry points.</p>
          <p>The 3D foundation comes from <a href="https://github.com/MoncyDev/Portfolio-Website" target="_blank" rel="noopener noreferrer">MoncyDev’s portfolio</a>; its attribution is retained.</p>
        </details>
      </article>
      <p>More work will find a home here as I build it. For now, explore the experiment that started this desktop.</p>
    `,
  },
  notes: {
    title: "Notes & ideas",
    icon: "note",
    html: `
      <p class="app-eyebrow">A few things on my mind</p>
      <h1 class="app-heading">Little notes, big possibilities.</h1>
      <p class="app-copy">Thoughts behind this corner of the web.</p>
      <details open>
        <summary>Why different dimensions?</summary>
        <p>Some visitors want the essentials. Others want to explore. Each mode is another way into the same portfolio, and you can choose one directly.</p>
        <p><a href="/work/notes.html#dimensions">Read the dimension idea →</a></p>
      </details>
      <details>
        <summary>Keep the work easy to find</summary>
        <p>A playful interface still needs clear answers: what is the work, what was the idea, and how can someone get in touch? The simple version gives that content a home.</p>
        <p><a href="/work/notes.html#interfaces">Read about useful interfaces →</a></p>
      </details>
      <details>
        <summary>A character that feels personal</summary>
        <p>My photographs are the reference for the avatar. A smile, a glance, or a small reaction can add personality while leaving the work readable.</p>
        <p><a href="/work/notes.html#avatar">Read the avatar notes →</a></p>
      </details>
      <p class="app-links"><a href="/work/now.html">What I’m working on now →</a><a href="/work/notes.html">All design notes →</a></p>
    `,
  },
  contact: {
    title: "Say hello",
    icon: "mail",
    html: `
      <p class="app-eyebrow">The inbox is open</p>
      <h1 class="app-heading">Let’s make something interesting.</h1>
      <p class="app-copy">A project, a collaboration, or an idea you can’t stop thinking about? I’d love to hear it.</p>
      <p class="contact-address"><a href="mailto:vivekbiswal.dev@gmail.com" data-email>vivekbiswal.dev@gmail.com</a></p>
      <p class="app-links"><a class="pixel-button" href="mailto:vivekbiswal.dev@gmail.com?subject=Hello%20Vivek">Write an email ↗</a><button class="pixel-button" type="button" data-copy-email>Copy email</button></p>
      <p data-copy-status role="status" aria-live="polite"></p>
      <div class="app-card">
        <h2>Keep in touch</h2>
        <p>Save my contact or take a short introduction with you.</p>
        <p class="app-links"><a href="/0d/vivek-biswal.vcf" download="vivek-biswal.vcf">Save contact ↓</a><a href="/0d/vivek-biswal.txt" download="vivek-biswal-profile.txt">Download profile ↓</a></p>
      </div>
    `,
  },
  settings: {
    title: "Desktop settings",
    icon: "gear",
    html: `
      <p class="app-eyebrow">Make yourself at home</p>
      <h1 class="app-heading">A little customization.</h1>
      <fieldset>
        <legend>Wallpaper color</legend>
        <div class="app-links">
          <button class="pixel-button" type="button" data-wallpaper="lavender" aria-pressed="false">Lavender</button>
          <button class="pixel-button" type="button" data-wallpaper="peach" aria-pressed="false">Peach</button>
          <button class="pixel-button" type="button" data-wallpaper="mint" aria-pressed="false">Mint</button>
        </div>
      </fieldset>
      <p><label><input type="checkbox" data-scanlines /> Add subtle screen lines</label></p>
      <p class="app-copy">Click the Vivek Arcade building and I’ll run to its door. Inside, walk with arrows / WASD or click a cabinet to try one of seven games. Enter / E chooses a nearby game; on a phone, use the direction buttons.</p>
      <p>Animation follows your device’s reduced-motion preference. Each game keeps a best score in this browser.</p>
      <p><button class="pixel-button" type="button" data-reset-desktop>Reset desktop</button></p>
      <div class="app-card">
        <h2>Finding your way around</h2>
        <ul>
          <li>Open an app from a desktop icon or the Start menu.</li>
          <li>Drag a window by its title bar.</li>
          <li>Use the title-bar buttons to minimize, maximize, or close it.</li>
          <li>Bring a minimized app back from the taskbar.</li>
          <li>Pause a game with Escape or P. Return to the arcade to choose another cabinet, or to Desktop to pick up your portfolio windows.</li>
        </ul>
      </div>
      <p class="app-links"><a href="/">Prefer a plain page? Open 0D →</a></p>
    `,
  },
});
