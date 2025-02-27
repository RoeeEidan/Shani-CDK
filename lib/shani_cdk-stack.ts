import 'dotenv/config'
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { ComparisonOperator, CreateAlarmOptions, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { eodTime, schedules } from './config';

export class ShaniCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const { GOOGLE_DOC_EMAIL, GOOGLE_DOC_ID, GOOGLE_DOC_PRIVATE_KEY, ACCOUNT_SID, AUTH_TOKEN } = process.env
    if (!GOOGLE_DOC_EMAIL || !GOOGLE_DOC_ID || !GOOGLE_DOC_PRIVATE_KEY || !ACCOUNT_SID || !AUTH_TOKEN) throw new Error('Missing environment variables')

    // Create an SNS topic for alarm notifications
    const alarmTopic = new Topic(this, 'AlarmTopic', {
      displayName: 'Send WhatsApp Reminders Alarm Topic'
    });

    // Subscribe the email address to the topic
    alarmTopic.addSubscription(new EmailSubscription('roeeeidan@gmail.com'));

    const alarmProps: CreateAlarmOptions = {
      threshold: 0,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
      actionsEnabled: true
    }

    // Add a new Lambda function to send messages
    const sendMessage = new NodejsFunction(this, 'sendMessage', {
      runtime: Runtime.NODEJS_22_X,
      entry: './lib/sendMessage.ts',
      environment: { ACCOUNT_SID, AUTH_TOKEN },
      handler: 'sendMessage',
    });
    sendMessage
      .metricErrors()
      .createAlarm(this, 'sendMessageAlarm', {
        ...alarmProps,
        alarmName: 'sendMessageAlarm',
        alarmDescription: `Alarm when the number of errors is greater than 0, indicating a failure in <a href="https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/ShaniCdkStack-SendWhatsAppReminders27BD0614-smJMo62qJzCC?subtab=asyncInvoke&tab=monitoring">the Lambda function</a>.`
      })
      .addAlarmAction(new SnsAction(alarmTopic))

    const lambdaTriggersProps: NodejsFunctionProps = {
      timeout: Duration.minutes(3),
      runtime: Runtime.NODEJS_22_X,
      environment: {
        GOOGLE_DOC_EMAIL,
        GOOGLE_DOC_ID,
        GOOGLE_DOC_PRIVATE_KEY,
        SNED_MESSAGE_ARN: sendMessage.functionArn,
        TIMEZONE: 'Asia/Jerusalem'
      }
    }
    // Add a new Lambda function to trigger daily reminders
    const triggerDailyReminders = new NodejsFunction(this, 'triggerDailyReminders', {
      ...lambdaTriggersProps,
      handler: 'triggerDailyReminders',
      entry: './lib/triggerDailyReminders.ts',
    });
    new Rule(this, 'SendWhatsAppDailyRemindersRule', {
      schedule: Schedule.cron({
        minute: '0',
        hour: Array
          .from(new Set(schedules.flat()))
          .sort()
          .map(n => n - 2) // To UTC
          .join(',')
      })
    }).addTarget(new LambdaFunction(triggerDailyReminders));

    triggerDailyReminders
      .metricErrors()
      .createAlarm(this, 'triggerDailyRemindersAlarm', {
        ...alarmProps,
        alarmName: 'triggerDailyRemindersAlarm',
        alarmDescription: `Alarm when the number of errors is greater than 0, indicating a failure in <a href="https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/ShaniCdkStack-SendWhatsAppReminders27BD0614-smJMo62qJzCC?subtab=asyncInvoke&tab=monitoring">the Lambda function</a>.`
      })
      .addAlarmAction(new SnsAction(alarmTopic))


    // Add a new Lambda function to send messages
    const triggerEndOfDayReminder = new NodejsFunction(this, 'triggerEndOfDayReminder', {
      ...lambdaTriggersProps,
      handler: 'triggerEndOfDayReminder',
      entry: './lib/triggerEndOfDayReminder.ts',
    });
    new Rule(this, 'SendWhatsAppEndOfDayReminderRule', {
      schedule: Schedule.cron({
        minute: '0',
        hour: (eodTime - 2).toString() // ISRAEL TIMEZONE to UTC
      })
    }).addTarget(new LambdaFunction(triggerEndOfDayReminder));

    triggerEndOfDayReminder
      .metricErrors()
      .createAlarm(this, 'triggerEndOfDayReminderAlarm', {
        ...alarmProps,
        alarmName: 'triggerEndOfDayReminderAlarm',
        alarmDescription: `Alarm when the number of errors is greater than 0, indicating a failure in <a href="https://us-west-2.console.aws.amazon.com/lambda/home?region=us-west-2#/functions/ShaniCdkStack-SendWhatsAppReminders27BD0614-smJMo62qJzCC?subtab=asyncInvoke&tab=monitoring">the Lambda function</a>.`
      })
      .addAlarmAction(new SnsAction(alarmTopic))

    // Grant explicit invoke permissions
    sendMessage.grantInvoke(triggerDailyReminders.grantPrincipal);
    sendMessage.grantInvoke(triggerEndOfDayReminder.grantPrincipal);
  }
}