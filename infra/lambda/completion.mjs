import { DynamoDBClient, PutItemCommand, DeleteItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const sms = new PinpointSMSVoiceV2Client({ region: 'us-east-1' });
const ORIGINATION_NUMBER = '+18552432682';

const TABLE = process.env.COMPLETION_TABLE || 'FamilyChoresCompletion';

const PHONES = {
  Shane: process.env.SHANE_PHONE || '+14044932795',
  Austin: process.env.AUSTIN_PHONE || '+16789842089',
  Olivia: process.env.OLIVIA_PHONE || '+14708333224',
  Danny: process.env.DANNY_PHONE || '+14048037330',
  Courtnee: process.env.COURTNEE_PHONE || '+14048037877',
};

const ALL5 = ['Shane', 'Austin', 'Olivia', 'Danny', 'Courtnee'];
const KIDS = ['Shane', 'Austin', 'Olivia'];

const KID_THANKS = [
  "Thank you for helping the family! 🙏🏾",
  "We are grateful for the time you gave to this. Thank you! 💛",
  "I'm proud of you! Thank you! ✊🏾",
  "You showed up for the family today. That means a lot. 💪🏾",
  "This is what teamwork looks like. Thank you! 🏠",
  "You're building great habits. Keep it up! 🌟",
  "The family appreciates you. Thank you for doing your part! 🤎",
  "That's one less thing we all have to worry about. Thank you! 🙌🏾",
];

const PARENT_THANKS = [
  "Nice one! Leading by example. 👍🏾",
  "Done and done. Thank you for keeping things moving. 🏠",
  "Teamwork makes the dream work. ✅",
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

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
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
    const { person, chore, date, undo } = body;

    if (!person || !chore || !date) {
      return response(400, { error: 'person, chore, and date required' });
    }

    const personDate = `${person}#${chore}#${date}`;

    if (undo) {
      await ddb.send(new DeleteItemCommand({
        TableName: TABLE,
        Key: { personDate: { S: personDate } }
      }));
      return response(200, { success: true, undone: true, personDate });
    }

    // Mark complete
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
    if (KIDS.includes(person)) {
      // Text the kid with a heartfelt thank you
      const kidPhone = PHONES[person];
      if (kidPhone) {
        const thanks = randomFrom(KID_THANKS);
        await sendSms(kidPhone, `✅ ${person}, you completed "${chore}". ${thanks}`);
      }

      // Text everyone else that the kid completed it
      for (const member of ALL5) {
        if (member === person) continue;
        const phone = PHONES[member];
        if (phone) {
          await sendSms(phone, `📋 ${person} has completed "${chore}". (${date})`);
        }
      }

      // Check if both chores are now done (look for 2 completions for this person today)
      const allToday = await ddb.send(new ScanCommand({ TableName: TABLE }));
      const personToday = (allToday.Items || []).filter(item => 
        item.person?.S === person && item.personDate?.S?.includes(date)
      );
      if (personToday.length >= 2) {
        // Broadcast "Done and Done!"
        for (const member of ALL5) {
          const phone = PHONES[member];
          if (phone) {
            await sendSms(phone, `🎉🎉 ${person} is Done and Done! Both chores complete! 💪🏾🏠`);
          }
        }
      }
    } else {
      // Parent completed a chore
      const parentPhone = PHONES[person];
      if (parentPhone) {
        await sendSms(parentPhone, `✅ "${chore}" done. ${randomFrom(PARENT_THANKS)}`);
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
