import 'dotenv/config'
import { Stack, StackProps } from 'aws-cdk-lib';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';

export class ShaniCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    if (!process.env.GOOGLE_DOC_EMAIL
      || !process.env.GOOGLE_DOC_ID
      || !process.env.GOOGLE_DOC_PRIVATE_KEY
      || !process.env.ACCOUNT_SID
      || !process.env.AUTH_TOKEN)
      throw new Error('Missing environment variables')

    const sendWhatsAppReminders = new NodejsFunction(this, 'SendWhatsAppReminders', {
      runtime: Runtime.NODEJS_LATEST,
      entry: './lib/sendReminders.ts',
      handler: 'default',
      retryAttempts: 0,
      environment: {
        GOOGLE_DOC_EMAIL: String(process.env.GOOGLE_DOC_EMAIL),
        GOOGLE_DOC_ID: String(process.env.GOOGLE_DOC_ID),
        GOOGLE_DOC_PRIVATE_KEY: String(process.env.GOOGLE_DOC_PRIVATE_KEY),
        ACCOUNT_SID: String(process.env.ACCOUNT_SID),
        AUTH_TOKEN: String(process.env.AUTH_TOKEN)
      }
    });

    const target = new LambdaFunction(sendWhatsAppReminders);
    /*
      ISRAEL TIMEZONE UTC+2
        - Sunday, Wednesday, Saturday at 7, 11, 15, 19, 21, 23 
        - Monday, Thursday at 8, 12, 15, 18, 20, 23 
        - Tuesday, Frinday at 9, 12, 16, 19, 22, 23
    */
    new Rule(this, 'SundayWhatsAppRule', { schedule: Schedule.cron({ minute: '0', hour: '5,9,13,17,19,21', weekDay: 'SUN,WED,SAT' }) }).addTarget(target);
    new Rule(this, 'MondayWhatsAppRule', { schedule: Schedule.cron({ minute: '0', hour: '6,10,13,16,18,21', weekDay: 'MON,THU' }) }).addTarget(target);
    new Rule(this, 'TuesdayWhatsAppRule', { schedule: Schedule.cron({ minute: '0', hour: '7,10,14,17,20,21', weekDay: 'TUE,FRI' }) }).addTarget(target);

    // Create an SNS topic for alarm notifications
    const alarmTopic = new Topic(this, 'AlarmTopic', {
      displayName: 'Send WhatsApp Reminders Alarm Topic'
    });

    // Subscribe the email address to the topic
    alarmTopic.addSubscription(new EmailSubscription('roeeeidan@gmail.com'));

    // Create a CloudWatch alarm for the Lambda function errors
    sendWhatsAppReminders
      .metricErrors()
      .createAlarm(this, 'SendWhatsAppRemindersAlarm', {
        threshold: 0,
        evaluationPeriods: 1,
        alarmName: 'SendWhatsAppRemindersAlarm',
        comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        actionsEnabled: true,
        alarmDescription: `Alarm when the number of errors is greater than 0, indicating a failure in <a href="https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/ShaniCdkStack-SendWhatsAppReminders27BD0614-smJMo62qJzCC?subtab=asyncInvoke&tab=monitoring">the Lambda function</a>.`
      })
      .addAlarmAction(new SnsAction(alarmTopic))
  }
}