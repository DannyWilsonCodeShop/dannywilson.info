import { DynamoDBClient, PutItemCommand, DeleteItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const TABLE = 'FamilyChoresCustom';

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === 'GET') {
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    const chores = (result.Items || []).map(item => ({
      choreId: item.choreId?.S,
      name: item.name?.S,
      icon: item.icon?.S || '📋',
      assignTo: item.assignTo?.S, // 'kids','parents','all', or specific name
      rotation: item.rotation?.S, // 'rotate','fixed'
      days: JSON.parse(item.days?.S || '[]'), // [0-6] Sun=0
      difficulty: item.difficulty?.S || 'medium',
      maxPerDay: parseInt(item.maxPerDay?.N || '3'),
      createdAt: item.createdAt?.S,
    }));
    return response(200, chores);
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { choreId, name, icon, assignTo, rotation, days, difficulty, maxPerDay, action } = body;

    if (action === 'delete' && choreId) {
      await ddb.send(new DeleteItemCommand({ TableName: TABLE, Key: { choreId: { S: choreId } } }));
      return response(200, { success: true, deleted: choreId });
    }

    if (!name) return response(400, { error: 'name required' });

    const id = choreId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    await ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: {
        choreId: { S: id },
        name: { S: name },
        icon: { S: icon || '📋' },
        assignTo: { S: assignTo || 'kids' },
        rotation: { S: rotation || 'rotate' },
        days: { S: JSON.stringify(days || [1,2,3,4,5]) },
        difficulty: { S: difficulty || 'medium' },
        maxPerDay: { N: String(maxPerDay || 3) },
        createdAt: { S: new Date().toISOString() },
      }
    }));

    return response(200, { success: true, choreId: id });
  }

  return response(405, { error: 'Method not allowed' });
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' },
    body: JSON.stringify(body),
  };
}
