// Babel replaces only these public constants at bundle time. Never put secrets here.
import { publicAppUrl } from '../shared/publicLinks';
export const PUBLIC_API_URL: string = '__CIRCLE_PUBLIC_API_URL__';
export const SHARE_URL: string = publicAppUrl('__CIRCLE_PUBLIC_SHARE_URL__');
