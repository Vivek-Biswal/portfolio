import { MdArrowOutward, MdCopyright } from "react-icons/md";
import "./styles/Contact.css";

const Contact = () => (
  <div className="contact-section section-container" id="contact">
    <div className="contact-container">
      <h3>Let's make something</h3>
      <div className="contact-flex">
        <div className="contact-box">
          <h4>Say hello</h4>
          <p><a href="mailto:vivekbiswal.com@gmail.com" data-cursor="disable">vivekbiswal.com@gmail.com</a></p>
          <h4>Curiosity is a good starting point.</h4>
          <p>Have an idea or a project in mind? Send me a note.</p>
        </div>
        <div className="contact-box">
          <h4>Keep exploring</h4>
          <a href="/" data-cursor="disable" className="contact-social">The essentials <MdArrowOutward /></a>
          <a href="/1d/" data-cursor="disable" className="contact-social">Along a line <MdArrowOutward /></a>
          <a href="/2d/" data-cursor="disable" className="contact-social">The pixel world <MdArrowOutward /></a>
          <a href="/work/notes.html" data-cursor="disable" className="contact-social">Field notes <MdArrowOutward /></a>
        </div>
        <div className="contact-box">
          <h2>Made personal by<br /><span>Vivek Biswal</span></h2>
          <p>Original 3D design by <a href="https://github.com/MoncyDev/Portfolio-Website" target="_blank" rel="noopener noreferrer" data-cursor="disable">Moncy Yohannan</a>.</p>
          <h5><MdCopyright /> {new Date().getFullYear()}</h5>
        </div>
      </div>
    </div>
  </div>
);

export default Contact;
