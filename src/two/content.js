import {initialContent} from '../shared/public-client.js';
import {buildApps} from './app-content.js';
let current=initialContent;
export const getContent=()=>current;
export let apps=buildApps(current);
export function updateApps(content){current=content;apps=buildApps(content);}
