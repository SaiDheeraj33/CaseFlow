import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class FrontendStack extends cdk.Stack {
    public readonly distribution: cloudfront.Distribution;
    public readonly bucket: s3.Bucket;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // S3 Bucket for static website hosting
        this.bucket = new s3.Bucket(this, 'CaseFlowFrontendBucket', {
            bucketName: `caseflow-frontend-${this.account}-${this.region}`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: false,
        });

        // Origin Access Identity for CloudFront
        const originAccessIdentity = new cloudfront.OriginAccessIdentity(
            this,
            'CaseFlowOAI',
            {
                comment: 'OAI for CaseFlow Frontend',
            }
        );

        // Grant read permissions to CloudFront
        this.bucket.addToResourcePolicy(
            new iam.PolicyStatement({
                actions: ['s3:GetObject'],
                resources: [this.bucket.arnForObjects('*')],
                principals: [
                    new iam.CanonicalUserPrincipal(
                        originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
                    ),
                ],
            })
        );

        // CloudFront Distribution
        this.distribution = new cloudfront.Distribution(this, 'CaseFlowCDN', {
            defaultBehavior: {
                origin: new origins.S3Origin(this.bucket, {
                    originAccessIdentity,
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                compress: true,
            },
            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5),
                },
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.minutes(5),
                },
            ],
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
            enabled: true,
            httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
        });

        // Outputs
        new cdk.CfnOutput(this, 'BucketName', {
            value: this.bucket.bucketName,
            description: 'S3 bucket for frontend assets',
        });

        new cdk.CfnOutput(this, 'DistributionId', {
            value: this.distribution.distributionId,
            description: 'CloudFront distribution ID',
        });

        new cdk.CfnOutput(this, 'DistributionDomainName', {
            value: this.distribution.distributionDomainName,
            description: 'CloudFront distribution URL',
        });

        new cdk.CfnOutput(this, 'FrontendUrl', {
            value: `https://${this.distribution.distributionDomainName}`,
            description: 'Frontend application URL',
        });
    }
}
