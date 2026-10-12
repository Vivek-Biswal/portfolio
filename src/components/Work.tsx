import "./styles/Work.css";
import WorkImage from "./WorkImage";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const experiments = [
  { title: "The essentials", category: "0D / Personal portfolio", tools: "HTML, typography, a little curiosity", image: "/images/world-0d.svg", link: "/" },
  { title: "Along a line", category: "1D / Guided exploration", tools: "A continuous story, keyboard navigation", image: "/images/world-1d.svg", link: "/1d/" },
  { title: "Vivek Arcade", category: "2D / Playable pixel world", tools: "Canvas, seven games, a world to explore", image: "/images/world-2d.svg", link: "/2d/" },
  { title: "The character studio", category: "3D / Interactive experiment", tools: "React, Three.js, character animation", image: "/images/world-3d.svg", link: "/work/dimensional-portfolio.html" },
];

const Work = () => {
  const spacerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Navbar creates ScrollSmoother in a passive effect. Set up the pin after it,
  // so its scroller migration cannot wrap an existing pin a second time.
  useEffect(() => {
    const spacer = spacerRef.current;
    const section = sectionRef.current;
    const container = containerRef.current;
    const track = trackRef.current;
    if (!spacer || !section || !container || !track) return;

    const scrollDistance = () => {
      const lastCard = track.lastElementChild as HTMLElement | null;
      if (!lastCard) return 0;
      const trailingPadding = parseFloat(getComputedStyle(track).paddingRight) || 0;
      // Measure the cards rather than scrollWidth: the decorative border
      // pseudo-elements intentionally extend far beyond the track.
      return Math.max(
        0,
        lastCard.offsetLeft +
          lastCard.offsetWidth +
          trailingPadding -
          container.clientWidth
      );
    };
    const media = gsap.matchMedia();
    media.add("(min-width: 1025px)", () => {
      gsap.to(track, {
        x: () => -scrollDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${Math.max(1, scrollDistance())}`,
          scrub: true,
          pin: section,
          pinSpacer: spacer,
          pinSpacing: true,
          invalidateOnRefresh: true,
          refreshPriority: 1,
          id: "work",
        },
      });
      const refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
      return () => cancelAnimationFrame(refreshFrame);
    }, section);

    return () => media.revert();
  }, []);
  return (
    <div className="work-scroll-track" ref={spacerRef}>
      <div className="work-section" id="work" ref={sectionRef}>
        <div className="work-container section-container" ref={containerRef}>
          <h2>
            Selected <span>Experiments</span>
          </h2>
          <div
            className="work-flex"
            ref={trackRef}
            role="region"
            aria-label="Portfolio projects"
            tabIndex={0}
          >
            {experiments.map((experiment, index) => (
              <div className="work-box" key={experiment.title}>
                <div className="work-info">
                  <div className="work-title">
                    <h3>0{index + 1}</h3>

                    <div>
                      <h4>{experiment.title}</h4>
                      <p>{experiment.category}</p>
                    </div>
                  </div>
                  <h4>Tools and features</h4>
                  <p>{experiment.tools}</p>
                </div>
                <WorkImage image={experiment.image} alt={`${experiment.title} visual study`} link={experiment.link} />
              </div>
            ))}
          </div>
        </div>
    </div>
    </div>
  );
};

export default Work;
