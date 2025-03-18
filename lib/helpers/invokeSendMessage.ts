import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient();

export const invokeSendMessage = (args: { phone: string, template: string, name: string, id: string }) => {
    if (!process.env.SNED_MESSAGE_ARN) throw new Error('Missing environment variables')
    return lambdaClient.send(new InvokeCommand({
        FunctionName: process.env.SNED_MESSAGE_ARN,
        Payload: Buffer.from(JSON.stringify(args), "utf8"),
        InvocationType: "Event",
    }))
}