import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const sms = new PinpointSMSVoiceV2Client({ region: 'us-east-1' });
const ORIGINATION_NUMBER = '+18552432682';

const COMPLETION_TABLE = 'FamilyChoresCompletion';

const KIDS = ['Shane', 'Austin', 'Olivia'];
const DANNY_PHONE = process.env.DANNY_PHONE || '+14048037330';

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
    .filter(item => item.personDate?.S?.includes(date))
    .map(item => ({
      person: item.person?.S,
      chore: item.chore?.S,
    }));

  // Build summary per kid
  let summary = `📋 Daily Chore Summary for ${date}\n\n`;
  let anyActivity = false;

  for (const kid of KIDS) {
    const kidChores = todayCompletions.filter(c => c.person === kid);
    if (kidChores.length > 0) {
      anyActivity = true;
      summary += `${kid}: ✅ ${kidChores.map(c => c.chore).join(', ')}\n`;
    } else {
      summary += `${kid}: ❌ Nothing completed today\n`;
    }
  }

  if (!anyActivity) {
    summary += `\nNone of the kids completed any chores today.`;
  }

  await sendSms(DANNY_PHONE, summary);

  return { statusCode: 200, body: JSON.stringify({ date, sent: true, summary }) };
};
