import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const sms = new PinpointSMSVoiceV2Client({ region: 'us-east-1' });
const ORIGINATION_NUMBER = '+18552432682';

const COMPLETION_TABLE = 'FamilyChoresCompletion';

const KIDS = ['Shane', 'Austin', 'Olivia'];
const PHONES = {
  Shane: process.env.SHANE_PHONE || '+14044932795',
  Austin: process.env.AUSTIN_PHONE || '+16789842089',
  Olivia: process.env.OLIVIA_PHONE || '+14708333224',
};

const REMINDER_MESSAGES = [
  "Hey {name}, it's 8pm and your chores aren't done yet. Get them done now or you will lose phone privileges tonight. No excuses. 📵",
  "{name}, this is your reminder — chores need to be done before bed. If they're not completed, phone privileges are gone for the night. Handle it now. 📵",
  "Hey {name}, you still have chores to finish. Get them done or your phone is getting turned off tonight. You know the deal. 📵",
];

async function sendSms(phone, msg) {
  try {
    await sms.send(new SendTextMessageCommand({
      DestinationPhoneNumber: phone,
      OriginationIdentity: ORIGINATION_NUMBER,
      MessageBody: msg,
      MessageType: 'TRANSACTIONAL'
    }));
  } catch (err) {
    console.error('SMS error:', err.message);
  }
}

export const handler = async () => {
  // Get today's date in ET
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const date = et.getFullYear() + '-' + String(et.getMonth() + 1).padStart(2, '0') + '-' + String(et.getDate()).padStart(2, '0');

  // Get all completions for today
  const result = await ddb.send(new ScanCommand({ TableName: COMPLETION_TABLE }));
  const todayCompletions = (result.Items || [])
    .filter(item => item.personDate?.S?.includes(date));

  const reminded = [];

  for (const kid of KIDS) {
    // Check how many completions this kid has today
    const kidCompletions = todayCompletions.filter(item => item.person?.S === kid);

    // If they have fewer than 2 completions, they haven't finished all their chores
    if (kidCompletions.length < 2) {
      const phone = PHONES[kid];
      if (phone) {
        const msg = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)].replace('{name}', kid);
        await sendSms(phone, msg);
        reminded.push(kid);
      }
    }
  }

  return { statusCode: 200, body: JSON.stringify({ date, reminded }) };
};
