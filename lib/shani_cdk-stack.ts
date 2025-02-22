import 'dotenv/config'
import * as cdk from 'aws-cdk-lib';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class ShaniCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    if (!process.env.GOOGLE_DOC_EMAIL
      || !process.env.GOOGLE_DOC_ID
      || !process.env.GOOGLE_DOC_PRIVATE_KEY
      || !process.env.ACCOUNT_SID
      || !process.env.AUTH_TOKEN
      || !process.env.FROM_WHATSAPP)
      throw new Error('Missing environment variables')

    const sendWhatsAppReminders = new NodejsFunction(this, 'SendWhatsAppReminders', {
      runtime: Runtime.NODEJS_LATEST,
      entry: './lib/sendWhatsAppRemindersFunction.ts',
      handler: 'handler',
      environment: {
        GOOGLE_DOC_EMAIL: String(process.env.GOOGLE_DOC_EMAIL),
        GOOGLE_DOC_ID: String(process.env.GOOGLE_DOC_ID),
        GOOGLE_DOC_PRIVATE_KEY: String(process.env.GOOGLE_DOC_PRIVATE_KEY),
        ACCOUNT_SID: String(process.env.ACCOUNT_SID),
        AUTH_TOKEN: String(process.env.AUTH_TOKEN),
        FROM_WHATSAPP: String(process.env.FROM_WHATSAPP)
      }
    });

    // Create a rule to trigger the Lambda every round hour
    const rule = new Rule(this, 'HourlyTrigger', {
      schedule: Schedule.cron({ minute: '0' }), // Trigger at the top of every hour
    });

    // Add the Lambda function as the target of the rule
    rule.addTarget(new LambdaFunction(sendWhatsAppReminders));
  }
}
