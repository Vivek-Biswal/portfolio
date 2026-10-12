import "./styles/DimensionSwitcher.css";

const worlds = [
  { label: "0D", href: "/", name: "Essentials", description: "The essentials" },
  { label: "1D", href: "/1d/", name: "The line", description: "Along a line" },
  { label: "2D", href: "/2d/", name: "Pixel world", description: "The pixel desktop" },
  { label: "3D", href: "/3d/", name: "The studio", description: "The character studio" },
] as const;

// Keep this outside the loading provider and scroll wrapper: changing worlds
// must remain available before the model loads and if WebGL is unavailable.
const DimensionSwitcher = () => (
  <nav
    className="dimension-switcher"
    aria-label="Portfolio dimension"
    data-cursor="disable"
  >
    <div className="dimension-switcher-links">
      <span className="dimension-switcher-lens" aria-hidden="true" />
      {worlds.map((world) => (
        <a
          key={world.label}
          href={world.href}
          aria-current={world.label === "3D" ? "page" : undefined}
          aria-label={`${world.label}, ${world.description}`}
        >
          <span className="dimension-switcher-number">{world.label}</span>
          <span className="dimension-switcher-name" aria-hidden="true">{world.name}</span>
        </a>
      ))}
    </div>
  </nav>
);

export default DimensionSwitcher;
