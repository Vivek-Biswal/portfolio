import { z } from 'zod';
const text = max => z.string().trim().max(max);
const required = max => text(max).min(1);
const url = z.string().max(2048).refine(value => {
  if (value === '') return true;
  if (/[\u0000-\u0020<>"'\\]/.test(value) || value.startsWith('//')) return false;
  if (value.startsWith('/')) {
    try {
      const path=decodeURIComponent(new URL(value,'https://portfolio.invalid').pathname).toLowerCase();
      return !path.startsWith('/admin') && (!path.startsWith('/api/') || /^\/api\/portfolio\?action=media&id=[a-f0-9-]{36}$/.test(value));
    }catch{return false;}
  }
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; }
}, 'Use an HTTPS URL or a path beginning with /.');
const id = required(80).regex(/^[a-z0-9][a-z0-9-]*$/);
const paragraphs = z.array(required(4000)).min(1).max(20);
const bookingUrl = url.refine(value => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && (
      parsed.hostname === 'cal.com' && /^\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/?$/.test(parsed.pathname) ||
      parsed.hostname === 'calendar.google.com' && /^\/calendar\/(?:u\/\d+\/)?appointments\/schedules\/[a-zA-Z0-9_-]+\/?$/.test(parsed.pathname) ||
      parsed.hostname === 'calendar.app.google' && /^\/[a-zA-Z0-9_-]+\/?$/.test(parsed.pathname));
  } catch { return false; }
}, 'Use a public Cal.com event or Google Calendar appointment booking link.');
export const projectSchema = z.object({id,title:required(200),summary:required(2000),details:text(6000),url,image:url,category:required(100),year:required(20),tags:z.array(required(50)).max(20),githubId:z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),repositoryUrl:url.default(''),demoUrl:url.default('')}).strict();
export const contentSchema = z.object({
  schemaVersion:z.literal(1),
  profile:z.object({name:required(100),headline:required(350),introduction:required(1200),status:required(100),portrait:url,dottedPortrait:url,pixelPortrait:url,portraitCaption:text(150)}).strict(),
  about:z.object({paragraphs}).strict(),
  contact:z.object({email:z.email().max(254),phone:text(60),location:text(120),heading:required(150),message:required(1200),socialLinks:z.array(z.object({label:required(50),url:url.refine(v=>v.length>0)}).strict()).max(12),resumeUrl:url,contactCardUrl:url,booking:z.object({url:bookingUrl.default(''),label:required(100).default('Book a conversation'),durationMinutes:z.number().int().min(15).max(120).default(30),timezone:required(80).refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}},'Use a valid timezone.').default('Asia/Kolkata')}).strict().default({url:'',label:'Book a conversation',durationMinutes:30,timezone:'Asia/Kolkata'})}).strict(),
  skills:z.array(required(60)).max(40),
  projects:z.array(projectSchema).max(40),
  notes:z.array(z.object({id,title:required(200),summary:required(500),paragraphs}).strict()).max(40),
  now:z.object({title:required(200),introduction:required(1200),sections:z.array(z.object({heading:required(200),paragraphs}).strict()).max(12)}).strict(),
  settings:z.object({siteTitle:required(150),description:required(350),copyright:required(150),pixelTitle:required(150),pixelSubtitle:required(300),defaultWallpaper:z.enum(['lavender','mint','peach']),arcadeEnabled:z.boolean()}).strict(),
}).strict().superRefine((value,ctx)=>{
  for (const key of ['projects','notes']) {
    const ids=value[key].map(item=>item.id);
    if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',path:[key],message:'Each entry needs a unique ID.'});
  }
  const repositories=value.projects.filter(project=>project.githubId!==undefined).map(project=>project.githubId);
  if(new Set(repositories).size!==repositories.length)ctx.addIssue({code:'custom',path:['projects'],message:'A GitHub repository can only appear once.'});
  if(Buffer.byteLength(JSON.stringify(value),'utf8')>150_000)ctx.addIssue({code:'custom',message:'Content must be smaller than 150 KB.'});
});
export function validateContent(content) { return contentSchema.parse(content); }
