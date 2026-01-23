#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FrontendStack } from '../lib/frontend-stack';
import { BackendStack } from '../lib/backend-stack';

const app = new cdk.App();

const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Frontend: S3 + CloudFront
new FrontendStack(app, 'CaseFlowFrontend', {
    env,
    description: 'CaseFlow Frontend - S3 Static Site with CloudFront CDN',
});

// Backend: ECS Fargate + ALB
new BackendStack(app, 'CaseFlowBackend', {
    env,
    description: 'CaseFlow Backend - ECS Fargate with Application Load Balancer',
});

app.synth();
