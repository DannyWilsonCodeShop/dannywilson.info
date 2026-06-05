import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const sns = new SNSClient({ region: 'us-east-1' });

const PHONES = {
  Shane: process.env.SHANE_PHONE,
  Austin: process.env.AUSTIN_PHONE,
  Olivia: process.env.OLIVIA_PHONE,
  Danny: process.env.DANNY_PHONE,
  Courtnee: process.env.COURTNEE_PHONE,
};

const GREETINGS = [
  "Rise and shine! ☀️",
  "Good morning! 🌅",
  "Hey superstar! ⭐",
  "Time to crush it! 💪",
  "New day, new wins! 🏆",
  "Let's goooo! 🚀",
  "Wakey wakey! 🌞",
];

// ---- Chore logic (mirrors frontend) ----
const SCHEDULE_START = new Date(2026, 5, 4);
const ALL5 = ['Shane','Austin','Olivia','Danny','Courtnee'];
const KIDS = ['Shane','Austin','Olivia'];
const DEEP_CLEANS = ['Deep Clean Bathrooms','Clean Windows & Mirrors','Vacuum All Bedrooms','Deep Clean Kitchen/Fridge','Sweep Porch & Garage','Yard & Outdoor Tidying','Baseboards & Laundry Room'];
const KID_LAUNDRY = {Shane:[[1,4],[0,4],[2,5]],Austin:[[2,0],[1,5],[0,3]],Olivia:[[3,6],[2,3],[1,4]]};
const ADULT_LAUNDRY = {Danny:[[1,5],[3,5],[1,4]],Courtnee:[[0,2],[0,4],[2,6]]};
const MAX_CHORES = 2;

function localMidnight(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0); }
function getMondayOf(d){ const x = localMidnight(d); const day = x.getDay(); x.setDate(x.getDate() + (day===0 ? -6 : 1-day)); return x; }
function getWeekIndex(d){ const m = getMondayOf(d), s = getMondayOf(SCHEDULE_START); return Math.max(0, Math.round((m-s)/(7*864e5))); }
function getDayIndex(d){ return Math.round((localMidnight(d)-localMidnight(SCHEDULE_START))/864e5); }
function dow(d){ const w = d.getDay(); return w===0 ? 6 : w-1; }
function getDinner(di){ return di%2===0 ? 'Courtnee' : 'Danny'; }
function getDog(di){ return ALL5[((di%5)+5)%5]; }
function getEveningChores(dw, wr){ const b=(wr*2+dw)%3; return {dishes:KIDS[b], sweep:KIDS[(b+1)%3], living:KIDS[(b+2)%3]}; }
function canAdd(ch, person){ return ch[person].length < MAX_CHORES; }

function getDailyChores(date){
  const wi = getWeekIndex(date), wr = wi%3, di = getDayIndex(date), dw = dow(date);
  const ec = getEveningChores(dw, wr);
  const dog = getDog(di), din = getDinner(di);
  const ch = {Shane:[],Austin:[],Olivia:[],Danny:[],Courtnee:[]};

  ch[ec.dishes].push('🍽️ Wash Dishes');
  ch[ec.sweep].push('🧹 Sweep & Mop');
  ch[ec.living].push('🛋️ Living Rm & Counters');

  // Dog: avoid stacking with Dishes
  let dogPerson = dog;
  if(dogPerson === ec.dishes){ dogPerson = ALL5[((di+1)%5+5)%5]; }
  if(dogPerson === ec.dishes){ dogPerson = ALL5[((di+2)%5+5)%5]; }
  if(canAdd(ch, dogPerson)) ch[dogPerson].push('🐶 Feed Chaka');
  if(canAdd(ch, din)) ch[din].push('🍳 Cook Dinner');

  KIDS.forEach(k => {
    const [cd, td] = KID_LAUNDRY[k][wr];
    if(cd===dw && canAdd(ch, k)) ch[k].push('👕 Wash Clothes');
    if(td===dw && canAdd(ch, k)) ch[k].push('🏠 Wash Towels/Linens');
  });

  ['Danny','Courtnee'].forEach(a => {
    const [cd, td] = ADULT_LAUNDRY[a][wr];
    if(cd===dw && canAdd(ch, a)) ch[a].push('👕 Wash Clothes');
    if(td===dw && canAdd(ch, a)) ch[a].push('🏠 Wash Towels/Linens');
  });

  ['Danny','Courtnee'].forEach(a => {
    if(ch[a].length < MAX_CHORES){
      ch[a].push('🧽 ' + DEEP_CLEANS[((dw%7)+7)%7]);
    }
  });

  return ch;
}

export const handler = async () => {
  const today = new Date();
  // Use ET timezone
  const et = new Date(today.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  et.setHours(0,0,0,0);

  const chores = getDailyChores(et);
  const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

  const results = [];

  for (const person of ALL5) {
    const phone = PHONES[person];
    if (!phone) continue;

    const choreList = chores[person];
    const msg = `${greeting}\n\nHey ${person}! Here are your chores for today:\n\n${choreList.map((c,i) => `${i+1}. ${c}`).join('\n')}\n\nYou got this! 🙌`;

    try {
      await sns.send(new PublishCommand({
        PhoneNumber: phone,
        Message: msg,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' }
        }
      }));
      results.push({ person, status: 'sent' });
    } catch (err) {
      results.push({ person, status: 'error', error: err.message });
    }
  }

  return { statusCode: 200, body: JSON.stringify(results) };
};
