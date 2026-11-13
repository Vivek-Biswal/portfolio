import {escapeHtml} from '../shared/content.js';

const palettes=[
 {paper:'#dcf49e',ink:'#213024',accent:'#89aa54'},
 {paper:'#cbbcea',ink:'#342b49',accent:'#8b6ab9'},
 {paper:'#f0e8d6',ink:'#493326',accent:'#e58a56'},
];
function variant(id){
 let hash=2166136261;
 for(const char of String(id??'')){hash=Math.imul(hash^char.codePointAt(0),16777619)>>>0;}
 return (hash>>>20)%palettes.length;
}

/** The stable content ID, rather than its current list position, owns the art. */
export function notePalette(id){return {...palettes[variant(id)]};}

function portal({paper,ink,accent}){
 const frames=Array.from({length:8},(_,i)=>{
  const x=116+i*19,y=58+i*13,w=290-i*31,h=310-i*27,r=Math.min(56,w/2);
  return `<path d="M${x} ${y+h}V${y+r}Q${x} ${y} ${x+r} ${y}H${x+w-r}Q${x+w} ${y} ${x+w} ${y+r}V${y+h}" fill="none" stroke="${i%2?ink:accent}" stroke-width="${i?5:11}" opacity="${.38+i*.075}"/>`;
 }).join('');
 return `<g class="note-art-layer" fill="none" stroke="${ink}" stroke-width="1" opacity=".18"><path d="M36 365h528M68 392h470M112 414h380M300 210 36 414M300 210 564 414M300 210 168 414M300 210 432 414"/><path d="M75 88v-20h20M501 68h20v20M75 320v20h20M521 320v20h-20"/></g><g class="note-art-core"><path d="m125 365 118 26 240-39-115-31Z" fill="${ink}" opacity=".12"/><path d="M116 368V114q0-56 56-56h178q56 0 56 56v254l33-24V98q0-60-60-60H207q-31 0-53 20" fill="${accent}" opacity=".5"/><path d="M116 368V114q0-56 56-56h178q56 0 56 56v254" fill="${paper}" stroke="${ink}" stroke-width="2"/>${frames}<path d="M268 368V180q0-20 20-20h18q20 0 20 20v188" fill="${ink}"/><path d="m326 196 27-15v187h-27Z" fill="${accent}"/><path d="M288 181v147" stroke="${paper}" stroke-width="2" opacity=".4"/></g><g class="note-art-layer"><circle cx="458" cy="133" r="28" fill="${ink}"/><path d="M446 133h24m-12-12v24" stroke="${paper}" stroke-width="1.5"/><circle cx="87" cy="248" r="8" fill="${accent}"/><circle cx="466" cy="302" r="4" fill="${ink}"/></g>`;
}

function ripple({paper,ink,accent}){
 const bands=Array.from({length:11},(_,i)=>{
  const rx=185-i*13,ry=143-i*9.6;
  return `<ellipse cx="${296+i*3}" cy="${210+i*2}" rx="${rx}" ry="${ry}" fill="none" stroke="${i%3===0?ink:accent}" stroke-width="${i%3===0?5:2}" opacity="${.45+i*.045}"/>`;
 }).join('');
 return `<g class="note-art-layer" stroke="${ink}" fill="none" opacity=".2"><path d="M45 73h510M45 368h510M93 42v356M510 42v356" stroke-width="1"/><circle cx="93" cy="73" r="6"/><circle cx="510" cy="368" r="6"/></g><g class="note-art-core" transform="rotate(-24 300 220)"><ellipse cx="310" cy="238" rx="195" ry="145" fill="${ink}" opacity=".1"/><ellipse cx="296" cy="210" rx="195" ry="153" fill="${paper}" stroke="${ink}" stroke-width="2"/>${bands}<ellipse cx="330" cy="231" rx="39" ry="33" fill="${ink}"/><path d="M136 284c25 51 115 85 192 83 71-1 130-26 154-64" fill="none" stroke="${ink}" stroke-width="10"/><path d="M137 284c38 51 120 80 190 79 72-2 129-27 151-60" fill="none" stroke="${paper}" stroke-width="2" opacity=".7"/></g><g class="note-art-layer"><circle cx="446" cy="100" r="32" fill="${accent}" stroke="${ink}" stroke-width="1.5"/><path d="M427 100h38M446 81v38" stroke="${ink}" stroke-width="1"/><circle cx="136" cy="329" r="17" fill="${ink}"/><circle cx="127" cy="322" r="4" fill="${paper}" opacity=".7"/></g>`;
}

function folded({paper,ink,accent}){
 return `<g class="note-art-layer" fill="none" stroke="${ink}" stroke-width="1" opacity=".2"><path d="M40 351h520M40 109h520M79 53v334M521 53v334"/><path d="m57 369 10-10m-10 0 10 10m466-302 10-10m-10 0 10 10"/></g><g class="note-art-core"><path d="m114 319 177 73 206-116-169-60Z" fill="${ink}" opacity=".1"/><path d="m116 120 184-67 183 87-179 69Z" fill="${accent}" stroke="${ink}" stroke-width="2"/><path d="m116 120 188 89v82L116 205Z" fill="${ink}"/><path d="m304 209 179-69v85l-179 66Z" fill="${paper}" stroke="${ink}" stroke-width="2"/><path d="m116 205 188 86 179-66-181-84Z" fill="${accent}" stroke="${ink}" stroke-width="2"/><path d="m116 205 188 86v80L116 285Z" fill="${paper}" stroke="${ink}" stroke-width="2"/><path d="m304 291 179-66v83l-179 63Z" fill="${ink}"/><path d="m146 121 157 73 147-55M151 212l152 69 147-54" fill="none" stroke="${paper}" stroke-width="2" opacity=".7"/><path d="m143 236 129 60m-129-39 129 60" stroke="${ink}" stroke-width="1" opacity=".35"/><path d="m325 309 132-49m-132 67 132-49m-132 67 132-49" stroke="${paper}" stroke-width="1" opacity=".25"/></g><g class="note-art-layer"><circle cx="88" cy="303" r="20" fill="${accent}"/><path d="m510 77 12 21-12 21-12-21Z" fill="${ink}"/><path d="M520 354h28m-14-14v28" stroke="${ink}" stroke-width="2"/></g>`;
}

/** Decorative artwork contains no IDs, URLs, executable input or semantic copy. */
export function noteArtwork(id,{className=''}={}){
 const index=variant(id),palette=palettes[index];
 const classes=String(className).split(/\s+/).filter(token=>/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(token)).join(' ');
 return `<svg class="note-art${classes?' '+escapeHtml(classes):''}" viewBox="0 0 600 440" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${[portal,ripple,folded][index](palette)}</svg>`;
}
