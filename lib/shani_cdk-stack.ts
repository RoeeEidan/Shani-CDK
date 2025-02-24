import 'dotenv/config'
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { schedules } from './sendReminders';

export class ShaniCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const { GOOGLE_DOC_EMAIL, GOOGLE_DOC_ID, GOOGLE_DOC_PRIVATE_KEY, ACCOUNT_SID, AUTH_TOKEN } = process.env
    if (!GOOGLE_DOC_EMAIL || !GOOGLE_DOC_ID || !GOOGLE_DOC_PRIVATE_KEY || !ACCOUNT_SID || !AUTH_TOKEN) throw new Error('Missing environment variables')

    const sendWhatsAppReminders = new NodejsFunction(this, 'SendWhatsAppReminders', {
      timeout: Duration.minutes(3),
      runtime: Runtime.NODEJS_22_X,
      entry: './lib/sendReminders.ts',
      handler: 'default',
      retryAttempts: 0,
      environment: { GOOGLE_DOC_EMAIL, GOOGLE_DOC_ID, GOOGLE_DOC_PRIVATE_KEY, ACCOUNT_SID, AUTH_TOKEN }
    });

    new Rule(this, 'SendWhatsAppRule', {
      schedule: Schedule.cron({
        minute: '0',
        hour: Array
          .from(new Set(schedules.flat()))
          .sort()
          .map(n => n - 2) // To UTC
          .join(',')
      })
    }).addTarget(new LambdaFunction(sendWhatsAppReminders));

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