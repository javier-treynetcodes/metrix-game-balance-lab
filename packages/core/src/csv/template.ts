/**
 * @file Official CSV template offered for download in the app.
 */

/**
 * Official CSV template: header plus invented example rows, readable at a glance.
 *
 * - Two damage channels, `channel1` and `channel2`; users rename them after their game
 *   (e.g. `atk:physical`) in the header or in the Damage rules tab.
 * - Eight characters across the six usual MOBA classes (tank, fighter, mage, marksman, assassin,
 *   support): generic terms of the genre. Units, characters and complements are invented.
 * - Attack speed (`speed`) and movement (`move`) as whole percentages where 100 is normal:
 *   tanks are slower, marksmen and assassins faster.
 * - One complement per class, which adds attack, armor, speed or move to every character of
 *   that class (Hunter Bow and Venom Dagger add attack speed, Twin Blade adds movement).
 * - No `rule` rows: the armor coverage is the default one (each armor stops only its channel).
 *
 * It is deliberately balanced so it teaches how to read results: no walls or draws, every
 * character wins between 2 and 5 of its 7 duels both at base and with complements, by hits
 * and by time to defeat, the mixed attacker (Blade Duelist) is strong, the complements change
 * the winner of several duels and some losers are fast enough to escape.
 * `template.test.ts` keeps it that way. Every value is a whole number.
 */
export const CSV_TEMPLATE = [
  'id,kind,name,character,class,cost,hp,speed,move,atk:channel1,def:channel1,atk:channel2,def:channel2,tag:role',
  'vanguard,unit,Iron Vanguard,Aria,tank,45,600,95,90,30,30,0,10,frontline',
  'duelist,unit,Blade Duelist,Kael,fighter,47,500,105,100,26,20,26,12,frontline',
  'archer,unit,Long Archer,Lysa,marksman,44,400,125,105,50,6,0,6,backline',
  'shadow,unit,Night Shadow,Vex,assassin,46,380,110,120,54,10,0,8,flank',
  'sorcerer,unit,Storm Sorcerer,Nyra,mage,49,440,105,100,0,10,42,20,backline',
  'oracle,unit,Dawn Oracle,Sera,support,44,440,95,100,0,16,30,24,backline',
  'warden,unit,Rune Warden,Toren,tank,48,640,90,85,0,26,28,14,frontline',
  'witch,unit,Ember Witch,Mira,mage,42,320,95,105,0,8,44,18,flank',
  'shield,complement,Tower Shield,,tank,,,,,,2,,10,',
  'blade,complement,Twin Blade,,fighter,,,,10,10,,,,',
  'bow,complement,Hunter Bow,,marksman,,,10,,6,,,,',
  'dagger,complement,Venom Dagger,,assassin,,,5,,6,,,,',
  'staff,complement,Arcane Staff,,mage,,,,,,,2,,',
  'charm,complement,Ward Charm,,support,,,,,,8,,2,',
  '',
].join('\n');

/** File name suggested when the template is downloaded. */
export const CSV_TEMPLATE_FILE_NAME = 'metrix-template.csv';
