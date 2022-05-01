import { APIGatewayProxyHandler } from "aws-lambda";
import { readFileSync } from "fs";
import { compile } from "handlebars";
import { join } from "path";
import {document} from '../utils/dynamoDbClient';
import dayjs from "dayjs";
import chromium from 'chrome-aws-lambda';
import {S3} from 'aws-sdk'

interface ICreateCertificateRequest { 
    id: string;
    name: string;
    description: string;
    course: string;
}

interface ITemplate extends ICreateCertificateRequest {
    date: string;
    medal: string;
}

const compileTemplate = async (data: ITemplate) => {
    const filePath = join(process.cwd(), "src", "templates", "certificate.hbs");
    const html =  readFileSync(filePath, "utf8");
    return compile(html)(data);
}

export const handler: APIGatewayProxyHandler = async (event) => {
    const {name, id, description, course}: ICreateCertificateRequest = JSON.parse(event.body);

    const response = await document.query({
        TableName: 'certificate_users',
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: {
            ':id': id
        }
    }).promise()

    const userAlreadyExists = response.Items[0];

    if (!userAlreadyExists) { 
        await document.put({
            TableName: 'certificate_users',
            Item: {
                id,
                name,
                description,
                course,
                created_at: new Date().getTime()
            },
        }).promise();
    }


    const medalPath = join(process.cwd(), 'src', 'templates', 'selo.png');
    const medal = readFileSync(medalPath, 'base64');

    const content = await compileTemplate({
        name,
        id,
        course,
        date: dayjs().format('DD/MM/YYYY'),
        description,
        medal,
    })

    const browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
    })

    const page = await browser.newPage();

    await page.setContent(content);

    const pdf = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true,
        path: process.env.IS_OFFLINE ? './certificate.pdf' : null,
    })

    await browser.close()

    const s3 = new S3();

    // await s3.createBucket({
    //     Bucket: 'certificate-node-courses-wictor',
    // }).promise();

    await s3.putObject({
        Bucket: 'certificate-node-courses-wictor',
        Key: `certificates/${id}.pdf`,
        ACL: 'public-read',
        Body: pdf,
        ContentType: 'application/pdf',
    }).promise();



    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Certificate generated successfully',
            url: `https://certificate-node-courses-wictor.s3.amazonaws.com/certificates/${id}.pdf`,
        }),
    }
}