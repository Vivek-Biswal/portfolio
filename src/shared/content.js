export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const paragraphs = items => items.map(p => '<p>' + escapeHtml(p) + '</p>').join('');
export const emailHref = email => 'mailto:' + encodeURIComponent(email);
export const noteHref = note => '/work/notes.html#' + encodeURIComponent(note.id);
export const socialHtml = links => links.map(item => '<a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(item.label) + ' ↗</a>').join(' ');
