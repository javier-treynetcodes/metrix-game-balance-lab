/**
 * Official CSV template: header plus invented example rows.
 * Offered in the web app to download or copy; users replace the example rows with their catalog.
 */
export const CSV_TEMPLATE = [
  'id,name,category,cost,hp,atk:physical,atk:magic,def:physical,def:magic,rate,tag:role',
  'guardian,Stone Guardian,champion,4800,680,55,0,48,40,0.65,tank',
  'archer,Wind Archer,champion,4500,560,68,0,26,30,0.72,marksman',
  'sorcerer,Eclipse Sorcerer,champion,4600,540,0,85,22,32,0.62,mage',
  'duelist,Arcane Duelist,champion,4700,600,42,38,32,34,0.69,fighter',
  '',
].join('\n');

/** File name suggested when the template is downloaded. */
export const CSV_TEMPLATE_FILE_NAME = 'metrix-template.csv';
