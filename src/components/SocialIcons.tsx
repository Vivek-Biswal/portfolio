import { TbMail, TbLayoutGrid, TbNotes } from "react-icons/tb";
import "./styles/SocialIcons.css";
import HoverLinks from "./HoverLinks";

const SocialIcons = () => (
  <div className="icons-section">
    <div className="social-icons" data-cursor="icons" id="social">
      <span><a href="mailto:vivekbiswal.dev@gmail.com" aria-label="Email Vivek"><TbMail /></a></span>
      <span><a href="/" aria-label="Read the essential portfolio"><TbLayoutGrid /></a></span>
      <span><a href="/work/notes.html" aria-label="Read Vivek's notes"><TbNotes /></a></span>
    </div>
    <a className="resume-button" href="mailto:vivekbiswal.dev@gmail.com">
      <HoverLinks text="LET'S TALK" />
      <span><TbMail /></span>
    </a>
  </div>
);

export default SocialIcons;
