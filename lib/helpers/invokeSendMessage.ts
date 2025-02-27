import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient();

export const invokeSendMessage = (phone: string, message: string) => {
    if (!process.env.SNED_MESSAGE_ARN) throw new Error('Missing environment variables')
    return lambdaClient.send(new InvokeCommand({
        FunctionName: process.env.SNED_MESSAGE_ARN,
        Payload: Buffer.from(JSON.stringify({ phone, message }), "utf8"),
        InvocationType: "Event",
    }))
}