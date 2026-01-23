import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class BackendStack extends cdk.Stack {
    public readonly service: ecs.FargateService;
    public readonly loadBalancer: elbv2.ApplicationLoadBalancer;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // VPC
        const vpc = new ec2.Vpc(this, 'CaseFlowVpc', {
            maxAzs: 2,
            natGateways: 1,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
            ],
        });

        // ECS Cluster
        const cluster = new ecs.Cluster(this, 'CaseFlowCluster', {
            vpc,
            clusterName: 'caseflow-cluster',
            containerInsights: true,
        });

        // Secrets Manager for environment variables
        const dbSecret = new secretsmanager.Secret(this, 'CaseFlowDbSecret', {
            secretName: 'caseflow/database',
            description: 'Database connection string for CaseFlow',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    DATABASE_URL: 'postgresql://user:pass@host:5432/caseflow',
                }),
                generateStringKey: 'password',
            },
        });

        const jwtSecret = new secretsmanager.Secret(this, 'CaseFlowJwtSecret', {
            secretName: 'caseflow/jwt',
            description: 'JWT secrets for CaseFlow authentication',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    JWT_SECRET: '',
                    JWT_REFRESH_SECRET: '',
                }),
                generateStringKey: 'JWT_SECRET',
                excludePunctuation: true,
                passwordLength: 64,
            },
        });

        // ECR Repository
        const repository = new ecr.Repository(this, 'CaseFlowRepo', {
            repositoryName: 'caseflow-backend',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            imageScanOnPush: true,
        });

        // Task Definition
        const taskDefinition = new ecs.FargateTaskDefinition(
            this,
            'CaseFlowTaskDef',
            {
                memoryLimitMiB: 512,
                cpu: 256,
                runtimePlatform: {
                    operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
                    cpuArchitecture: ecs.CpuArchitecture.X86_64,
                },
            }
        );

        // Log Group
        const logGroup = new logs.LogGroup(this, 'CaseFlowLogs', {
            logGroupName: '/ecs/caseflow-backend',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Container Definition
        const container = taskDefinition.addContainer('CaseFlowContainer', {
            image: ecs.ContainerImage.fromRegistry('node:20-alpine'),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'caseflow',
                logGroup,
            }),
            environment: {
                NODE_ENV: 'production',
                PORT: '3000',
            },
            secrets: {
                DATABASE_URL: ecs.Secret.fromSecretsManager(dbSecret, 'DATABASE_URL'),
                JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret, 'JWT_SECRET'),
                JWT_REFRESH_SECRET: ecs.Secret.fromSecretsManager(
                    jwtSecret,
                    'JWT_REFRESH_SECRET'
                ),
            },
            healthCheck: {
                command: [
                    'CMD-SHELL',
                    'wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1',
                ],
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                retries: 3,
                startPeriod: cdk.Duration.seconds(60),
            },
        });

        container.addPortMappings({
            containerPort: 3000,
            protocol: ecs.Protocol.TCP,
        });

        // Security Group for ALB
        const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
            vpc,
            description: 'Security group for CaseFlow ALB',
            allowAllOutbound: true,
        });
        albSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(80),
            'Allow HTTP'
        );
        albSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(443),
            'Allow HTTPS'
        );

        // Security Group for ECS Tasks
        const ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
            vpc,
            description: 'Security group for CaseFlow ECS tasks',
            allowAllOutbound: true,
        });
        ecsSecurityGroup.addIngressRule(
            albSecurityGroup,
            ec2.Port.tcp(3000),
            'Allow traffic from ALB'
        );

        // Application Load Balancer
        this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'CaseFlowAlb', {
            vpc,
            internetFacing: true,
            securityGroup: albSecurityGroup,
            loadBalancerName: 'caseflow-alb',
        });

        // Target Group
        const targetGroup = new elbv2.ApplicationTargetGroup(
            this,
            'CaseFlowTargetGroup',
            {
                vpc,
                port: 3000,
                protocol: elbv2.ApplicationProtocol.HTTP,
                targetType: elbv2.TargetType.IP,
                healthCheck: {
                    path: '/api/health',
                    healthyHttpCodes: '200',
                    interval: cdk.Duration.seconds(30),
                    timeout: cdk.Duration.seconds(5),
                    healthyThresholdCount: 2,
                    unhealthyThresholdCount: 3,
                },
            }
        );

        // HTTP Listener
        this.loadBalancer.addListener('HttpListener', {
            port: 80,
            defaultAction: elbv2.ListenerAction.forward([targetGroup]),
        });

        // Fargate Service
        this.service = new ecs.FargateService(this, 'CaseFlowService', {
            cluster,
            taskDefinition,
            desiredCount: 1,
            securityGroups: [ecsSecurityGroup],
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            assignPublicIp: false,
            serviceName: 'caseflow-backend',
            circuitBreaker: { rollback: true },
        });

        this.service.attachToApplicationTargetGroup(targetGroup);

        // Auto Scaling
        const scaling = this.service.autoScaleTaskCount({
            minCapacity: 1,
            maxCapacity: 4,
        });

        scaling.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 70,
            scaleInCooldown: cdk.Duration.seconds(60),
            scaleOutCooldown: cdk.Duration.seconds(60),
        });

        // Outputs
        new cdk.CfnOutput(this, 'ClusterName', {
            value: cluster.clusterName,
            description: 'ECS Cluster name',
        });

        new cdk.CfnOutput(this, 'ServiceName', {
            value: this.service.serviceName,
            description: 'ECS Service name',
        });

        new cdk.CfnOutput(this, 'LoadBalancerDns', {
            value: this.loadBalancer.loadBalancerDnsName,
            description: 'Load Balancer DNS',
        });

        new cdk.CfnOutput(this, 'ApiUrl', {
            value: `http://${this.loadBalancer.loadBalancerDnsName}/api`,
            description: 'Backend API URL',
        });

        new cdk.CfnOutput(this, 'EcrRepository', {
            value: repository.repositoryUri,
            description: 'ECR repository URI for backend images',
        });
    }
}
