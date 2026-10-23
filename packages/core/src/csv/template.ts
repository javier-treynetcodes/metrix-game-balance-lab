/**
 * Official CSV template: header plus invented, genre-neutral example rows.
 * Channels are named 1, 2 and 3, each attack next to its defense; users rename them
 * after their game (e.g. `atk:plasma`). Offered in the web app to download or copy.
 */
export const CSV_TEMPLATE = [
  'id,name,category,cost,hp,atk:1,def:1,atk:2,def:2,atk:3,def:3,rate,tag:role',
  'heavy,Heavy Unit,unit,4800,680,55,48,0,40,0,20,0.65,tank',
  'ranged,Ranged Unit,unit,4500,560,68,26,0,30,10,15,0.72,ranged',
  'hybrid,Hybrid Unit,unit,4700,600,42,32,38,34,0,25,0.69,hybrid',
  'fast,Fast Unit,unit,4200,480,30,22,0,24,35,10,1.1,striker',
  '',
].join('\n');

/** File name suggested when the template is downloaded. */
export const CSV_TEMPLATE_FILE_NAME = 'metrix-template.csv';
