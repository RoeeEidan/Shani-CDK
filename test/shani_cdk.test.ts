import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as ShaniCdk from '../lib/shani_cdk-stack';

describe('ShaniCdkStack', () => {

    it('creates a Lambda function & event rule with the correct properties', () => {
        // Mock Environment Variables
        process.env.GOOGLE_DOC_EMAIL = 'GOOGLE_DOC_EMAIL';
        process.env.GOOGLE_DOC_ID = 'GOOGLE_DOC_ID';
        process.env.GOOGLE_DOC_PRIVATE_KEY = 'GOOGLE_DOC_PRIVATE_KEY';
        process.env.ACCOUNT_SID = 'ACCOUNT_SID';
        process.env.AUTH_TOKEN = 'AUTH_TOKEN';

        const stack = new ShaniCdk.ShaniCdkStack(new cdk.App(), 'MyTestStack');
        const template = Template.fromStack(stack);

        template.hasResourceProperties('AWS::Lambda::Function', {
            Environment: {
                Variables: {
                    GOOGLE_DOC_EMAIL: 'GOOGLE_DOC_EMAIL',
                    GOOGLE_DOC_ID: 'GOOGLE_DOC_ID',
                    GOOGLE_DOC_PRIVATE_KEY: 'GOOGLE_DOC_PRIVATE_KEY',
                    ACCOUNT_SID: 'ACCOUNT_SID',
                    AUTH_TOKEN: 'AUTH_TOKEN'
                }
            }
        });

        template.hasResourceProperties('AWS::Events::Rule', {
            ScheduleExpression: 'cron(0 * * * ? *)'
        });

        // Check that the Lambda function is the target of the rule
        template.hasResourceProperties('AWS::Events::Rule', {
            Targets: [
                {
                    Arn: {
                        'Fn::GetAtt': [
                            'SendWhatsAppReminders27BD0614',
                            'Arn'
                        ]
                    }
                }
            ]
        });

        template.resourceCountIs('AWS::Lambda::Function', 1);
        template.resourceCountIs('AWS::Events::Rule', 1);
    })

    it('throws an error if environment variable is not provided', () => {
        expect(() => {
            // Mock Environment Variables
            delete process.env.GOOGLE_DOC_EMAIL
            delete process.env.GOOGLE_DOC_ID
            delete process.env.GOOGLE_DOC_PRIVATE_KEY
            delete process.env.ACCOUNT_SID
            delete process.env.AUTH_TOKEN
            new ShaniCdk.ShaniCdkStack(new cdk.App(), 'MyTestStack');
        }).toThrow('Missing environment variables');
    })

})

