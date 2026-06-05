import { DynamoDBClient, PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const sns = new SNSClient({ region: 'us-east-1' });

const TABLE = process.env.COMPLETION_TABLE || 'FamilyChoresCompletion';

const PHONES = {
  Shane: process.env.SHANE_PHONE || '+16789842089',
  Austin: process.env.AUSTIN_PHONE || '+14044932795',
  Olivia: process.env.OLIVIA_PHONE || '+14708333224',
  Danny: process.env.DANNY_PHONE || '+14048037330',
  Courtnee: process.env.COURTNEE_PHONE || '+14048037877',
};

const PARENTS = ['Danny', 'Courtnee'];
const KIDS = ['Shane', 'Austin', 'Olivia'];

async function sendSms(phone, msg) {
  try {
    await sns.send(new PublishCommand({
      PhoneNumber: phone,
      Message: msg,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' }
      }
    }));
  } catch (err) {
    console.error('SMS error:', err.message);
  }
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === 'GET') {
    const date = event.queryStringParameters?.date;
    if (!date) return response(400, { error: 'date parameter required' });

    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    const items = (result.Items || [])
      .filter(item => item.personDate.S.includes(date))
      .map(item => ({
        person: item.person?.S,
        chore: item.chore?.S,
        completedAt: item.completedAt?.S,
      }));

    return response(200, items);
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { person, chore, date } = body;

    if (!person || !chore || !date) {
      return response(400, { error: 'person, chore, and date required' });
    }

    const personDate = `${person}#${chore}#${date}`;
    const now = new Date().toISOString();

    await ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: {
        personDate: { S: personDate },
        person: { S: person },
        chore: { S: chore },
        date: { S: date },
        completedAt: { S: now },
      }
    }));

    // Send notifications
    const isKid = KIDS.includes(person);

    if (isKid) {
      // Text the kid: "You marked X complete and ready for review"
      const kidPhone = PHONES[person];
      if (kidPhone) {
        await sendSms(kidPhone, `✅ You marked "${chore}" complete and ready for review! Nice work, ${person}! 💪`);
      }

      // Text both parents: "X has marked X complete and ready for review"
      for (const parent of PARENTS) {
        const parentPhone = PHONES[parent];
        if (parentPhone) {
          await sendSms(parentPhone, `📋 ${person} has marked "${chore}" complete and ready for review. (${date})`);
        }
      }
    } else {
      // Parent completed a chore — just a quiet confirmation
      const parentPhone = PHONES[person];
      if (parentPhone) {
        await sendSms(parentPhone, `✅ You completed "${chore}". Nice one! 👍`);
      }
    }

    return response(200, { success: true, personDate, completedAt: now });
  }

  return response(405, { error: 'Method not allowed' });
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    body: JSON.stringify(body),
  };
}
