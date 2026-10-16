import { DynamoDBClient, ScanCommand, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const smsClient = new PinpointSMSVoiceV2Client({ region: 'us-east-1' });
const ORIGINATION_NUMBER = '+18552432682';

const COMPLETION_TABLE = 'FamilyChoresCompletion';
const POINTS_TABLE = 'FamilyChoresPoints';

const KIDS = ['Shane', 'Austin', 'Olivia'];
const PHONES = {
  Shane: '+14044932795',
  Austin: '+16789842089',
  Olivia: '+14708333224',
  Danny: '+14048037330',
  Courtnee: '+14048037877',
};

const FLAG_MESSAGES = [
  "Hey {name}, your chores weren't completed today. A flag has been added. Tomorrow's a new day — get it done early! 🚩",
  "{name}, auto-flag added — chores weren't completed today. I know life gets busy. Try to knock them out earlier tomorrow. 🚩",
  "Hey {name}, flag added for today. Your chores weren't checked off. We're counting on you — let's reset tomorrow. 🚩",
];

async function sendSms(phone, msg) {
  try {
    await smsClient.send(new SendTextMessageCommand({
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
  const date = et.getFullYear() + '-' + String(et.getMonth()+1).padStart(2,'0') + '-' + String(et.getDate()).padStart(2,'0');

  // Get all completions for today
  const completionResult = await ddb.send(new ScanCommand({ TableName: COMPLETION_TABLE }));
  const todayCompletions = (completionResult.Items || [])
    .filter(item => item.personDate?.S?.includes(date))
    .map(item => item.person?.S);

  // Check each kid — if they have NO completions today, add a flag
  const flagged = [];

  for (const kid of KIDS) {
    const hasCompletion = todayCompletions.includes(kid);
    if (!hasCompletion) {
      // Add a flag
      const current = await ddb.send(new GetItemCommand({
        TableName: POINTS_TABLE,
        Key: { person: { S: kid } }
      }));

      let history = JSON.parse(current.Item?.history?.S || '[]');
      const alreadyFlagged = parseInt(current.Item?.points?.N || '0') > 0;
      // Single on/off flag — set to 1, no counting
      history.push({ type: 'add', day: date, date: now.toISOString(), by: 'Auto (9pm)' });
      if (history.length > 30) history = history.slice(-30);

      await ddb.send(new PutItemCommand({
        TableName: POINTS_TABLE,
        Item: {
          person: { S: kid },
          points: { N: '1' },
          history: { S: JSON.stringify(history) },
          updatedAt: { S: now.toISOString() },
          updatedBy: { S: 'Auto' },
        }
      }));

      // Only notify if they weren't already flagged (avoid re-flagging noise)
      if (!alreadyFlagged) {
        // Notify the kid
        const msg = FLAG_MESSAGES[Math.floor(Math.random() * FLAG_MESSAGES.length)].replace('{name}', kid);
        if (PHONES[kid]) await sendSms(PHONES[kid], msg);

        // Notify Courtnee only (Danny gets the 9pm summary instead)
        await sendSms(PHONES.Courtnee, `🚩 Auto-flag: ${kid} didn't complete chores today. Device paused until cleared.`);
      }

      flagged.push({ kid });
    }
  }

  return { statusCode: 200, body: JSON.stringify({ date, flagged }) };
};
