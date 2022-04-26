import { APIGatewayProxyHandler } from "aws-lambda";
import {document} from '../utils/dynamoDbClient';

interface ICreateCertificateRequest { 
    id: string;
    name: string;
    email: string;
    course: string;
    grade: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
    const {name, id, grade, course, email}: ICreateCertificateRequest = JSON.parse(event.body);

    await document.put({
        TableName: 'certificate_users',
        Item: {
            id,
            name,
            email,
            course,
            grade,
            created_at: new Date()
        },
    }).promise();

    const response = await document.query({
        TableName: 'certificate_users',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: {
            ':id': id
        }
    }).promise()

    return {
        statusCode: 200,
        body: JSON.stringify(response.Items[0]),
    }
}