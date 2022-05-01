import { APIGatewayProxyHandler } from "aws-lambda";
import { document } from "../utils/dynamoDbClient";


export const handler: APIGatewayProxyHandler = async (event) => {
    const {id} = event.pathParameters;
    const response = await document.query({
        TableName: 'certificate_users',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: {
            ':id': id
        }
    }).promise()

    const userCertificate = response.Items[0];

    if (userCertificate) {
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Valid certificate',
                name: userCertificate.name,
                url: `https://certificate-node-courses-wictor.s3.amazonaws.com/certificates/${id}.pdf`,
            })  
        }
    }

    return {
        statusCode: 404,
        body: JSON.stringify({
            message: 'Certificate not found',
        })
    }


    
}