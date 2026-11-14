import {escapeHtml} from './content.js';

// Hand-traced from Vivek's supplied pen samples. The tall V, climbing "ivek",
// and returning oval are kept as separate strokes so they can be drawn in ink.
// No photo, notebook lines, or explanatory annotations are embedded.
export function signatureHtml(name){
  const first=name.trim().split(/\s+/)[0];
  if(first.toLowerCase()!=='vivek')return `<span class="signature-fallback">${escapeHtml(first)}.</span>`;
  return `<svg class="personal-signature" viewBox="175 270 700 1020" fill="none" role="img" aria-label="${escapeHtml(name)}, handwritten signature" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
      <path class="signature-v" pathLength="1" stroke-width="14" d="M312 647C330 737 337 1028 366 1153C379 1225 397 1185 432 1123"/>
      <path class="signature-rise" pathLength="1" stroke-width="7" opacity=".7" d="M432 1123C503 970 642 663 782 392"/>
      <path class="signature-letters" pathLength="1" stroke-width="14" d="M320 705C346 770 369 831 409 862C445 894 473 883 485 808C488 798 485 782 483 778C487 823 508 814 522 770C536 737 539 704 538 681C547 728 558 734 571 689C581 656 583 608 576 579C590 613 608 602 614 552L612 503C610 486 604 493 606 513L627 536C620 513 630 488 653 481C668 477 680 470 685 463"/>
      <path class="signature-dot" pathLength="1" stroke-width="12" d="M466 746L468 743"/>
      <path class="signature-sweep" pathLength="1" stroke-width="12" d="M639 450C666 343 619 294 562 310C426 326 298 485 247 665C204 815 203 1002 242 1133C267 1222 307 1279 363 1261C502 1219 727 828 837 610"/>
    </g>
  </svg>`;
}
