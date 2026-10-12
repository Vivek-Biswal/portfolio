import "./styles/Career.css";
const chapters = [
  { title: 'Start with the essentials', label: '0D / 1D', copy: 'A readable introduction and a guided line through my work. A simple starting point for an experiment in different dimensions.' },
  { title: 'Build a little world', label: '2D', copy: 'A personal pixel desktop with interactive windows, an animated companion, and seven games inside a neighbourhood arcade.' },
  { title: 'Keep experimenting', label: '3D / NOW', copy: 'Exploring character animation, light, movement, and playful ways to navigate the web. This portfolio keeps evolving as I learn.' },
];
const Career = () => (
  <div className="career-section section-container"><div className="career-container">
    <h2>The making <span>of</span><br /> this little world</h2>
    <div className="career-info"><div className="career-timeline"><div className="career-dot" /></div>
      {chapters.map(chapter => <div className="career-info-box" key={chapter.label}>
        <div className="career-info-in"><div className="career-role"><h4>{chapter.title}</h4><h5>Personal portfolio experiment</h5></div><h3>{chapter.label}</h3></div>
        <p>{chapter.copy}</p>
      </div>)}
    </div>
  </div></div>
);
export default Career;
