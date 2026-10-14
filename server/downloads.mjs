export function profileText(c) {
  return [c.profile.name,c.profile.headline,c.profile.introduction,'','ABOUT',...c.about.paragraphs,'','SKILLS',c.skills.join(', '),'','PROJECTS',...c.projects.flatMap(p=>[p.title,p.summary,p.url,'']),'CONTACT',c.contact.email,c.contact.phone,c.contact.location,...c.contact.socialLinks.map(s=>s.label+': '+s.url)].join('\n');
}
export function contactCard(c) {
  const escape=value=>String(value).replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(';','\\;').replaceAll(',','\\,');
  return ['BEGIN:VCARD','VERSION:3.0','FN:'+escape(c.profile.name),'EMAIL:'+escape(c.contact.email),...(c.contact.phone?['TEL:'+escape(c.contact.phone)]:[]),'NOTE:'+escape(c.profile.headline),'END:VCARD',''].join('\r\n');
}
