import { DynamoDBClient, PutItemCommand, ScanCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

const ddb = new DynamoDBClient({ region: 'us-east-1' });
const TABLE = 'BH365Leaderboard';

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === 'GET') {
    // Get full leaderboard
    const result = await ddb.send(new ScanCommand({ TableName: TABLE }));
    const entries = (result.Items || []).map(item => ({
      username: item.username?.S,
      totalCorrect: parseInt(item.totalCorrect?.N || '0'),
      totalQuestions: parseInt(item.totalQuestions?.N || '0'),
      quizzesTaken: parseInt(item.quizzesTaken?.N || '0'),
      bestStreak: parseInt(item.bestStreak?.N || '0'),
      awards: JSON.parse(item.awards?.S || '[]'),
      lastActive: item.lastActive?.S || '',
    }));
    // Sort by totalCorrect descending
    entries.sort((a, b) => b.totalCorrect - a.totalCorrect);
    return response(200, entries);
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { username, totalCorrect, totalQuestions, quizzesTaken, bestStreak, awards } = body;

    if (!username) return response(400, { error: 'username required' });

    await ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: {
        username: { S: username },
        totalCorrect: { N: String(totalCorrect || 0) },
        totalQuestions: { N: String(totalQuestions || 0) },
        quizzesTaken: { N: String(quizzesTaken || 0) },
        bestStreak: { N: String(bestStreak || 0) },
        awards: { S: JSON.stringify(awards || []) },
        lastActive: { S: new Date().toISOString() },
      }
    }));

    return response(200, { success: true });
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
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}
