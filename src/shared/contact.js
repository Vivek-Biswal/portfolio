import {escapeHtml as e, emailHref} from './content.js';

const webUrl = value => {
  if (typeof value !== 'string' || !value) return '';
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
};

// A booking link belongs to the scheduling provider. The portfolio never invents
// availability or pretends that following a link has confirmed a meeting.
export function publicBookingUrl(value) {
  if (typeof value !== 'string' || /[\u0000-\u0020<>"'\\]/.test(value)) return '';
  const safe = webUrl(value);
  if (!safe) return '';
  const url = new URL(safe);
  if (url.protocol !== 'https:') return '';
  if (url.hostname === 'cal.com' && /^\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)) return safe;
  if (url.hostname === 'calendar.google.com' && /^\/calendar\/(?:u\/\d+\/)?appointments\/schedules\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)) return safe;
  if (url.hostname === 'calendar.app.google' && /^\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)) return safe;
  return '';
}

export function contactChannels(content) {
  const contact = content.contact || content;
  const channels = [];
  if (contact.email) channels.push({id:'email', label:'Email', detail:contact.email, url:emailHref(contact.email), external:false});
  const booking = contact.booking || {};
  const bookingUrl = publicBookingUrl(booking.url);
  if (bookingUrl) channels.push({id:'meet', label:booking.label || 'Book a conversation', detail:`${booking.durationMinutes || 30} minutes · Choose a time`, url:bookingUrl, external:true});
  const socials = (contact.socialLinks || []).map(item => ({...item, url:webUrl(item.url)})).filter(item => item.url);
  const known = [
    {id:'linkedin', label:'LinkedIn', host:'linkedin.com', detail:'Connect professionally'},
    {id:'x', label:'X', host:'x.com', detail:'Thoughts, work, and updates'},
    {id:'github', label:'GitHub', host:'github.com', detail:'Explore the source'},
  ];
  const used = new Set();
  for (const platform of known) {
    const match = socials.find(item => {
      const host = new URL(item.url).hostname.replace(/^www\./, '');
      return host === platform.host || (platform.id === 'x' && host === 'twitter.com');
    });
    if (match) {
      channels.push({id:platform.id, label:platform.label, detail:platform.detail, url:match.url, external:true});
      used.add(match.url);
    }
  }
  for (const item of socials) {
    if (!used.has(item.url)) {
      channels.push({id:'social', label:item.label, detail:'Keep in touch', url:item.url, external:true});
      used.add(item.url);
    }
  }
  return channels;
}

export function contactRowsHtml(content) {
  return `<div class="contact-channels">${contactChannels(content).map(channel => `<a class="contact-channel" data-channel="${e(channel.id)}" href="${e(channel.url)}"${channel.external?' target="_blank" rel="noopener noreferrer"':''}><span class="channel-copy"><strong>${e(channel.label)}</strong><span>${e(channel.detail)}</span></span><span class="channel-arrow" aria-hidden="true">↗</span></a>`).join('')}</div>`;
}

export function contactMeta(content) {
  const contact = content.contact || content;
  return [contact.location, contact.booking?.timezone].filter(Boolean).join(' · ');
}

export function bookingNote(content) {
  const contact = content.contact || content;
  return publicBookingUrl(contact.booking?.url) ? '' : '<p class="booking-note">Meetings by email for now.</p>';
}

export function projectLinks(project) {
  const seen = new Set();
  const links = [];
  const normalize = value => value.replace(/\/$/, '');
  const primary = typeof project.url === 'string' && /^\/(?!\/)/.test(project.url) ? project.url : webUrl(project.url);
  const repository = webUrl(project.repositoryUrl);
  const demo = webUrl(project.demoUrl);
  for (const [kind, label, url] of [
    ['project', 'Explore project', primary && ![repository,demo].filter(Boolean).some(value => normalize(value) === normalize(primary)) ? primary : ''],
    ['demo', 'Live demo', demo],
    ['repository', 'GitHub repository', repository],
  ]) {
    if (url && !seen.has(normalize(url))) {
      links.push({kind,label,url});
      seen.add(normalize(url));
    }
  }
  return links;
}

export function projectLinksHtml(project) {
  const links = projectLinks(project);
  return links.length ? `<div class="project-actions">${links.map(link => `<a class="project-action" href="${e(link.url)}"${/^https?:/.test(link.url)?' target="_blank" rel="noopener noreferrer"':''}>${e(link.label)} <span aria-hidden="true">↗</span></a>`).join('')}</div>` : '';
}
