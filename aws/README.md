AWS Deployment
==============

This folder contains a set of CloudFormation templates and scripts to set up a production-ready AWS environment for Care Connect.

1. Install the AWS CLI and configure it with your AWS account credentials
2. Run the `vpc.sh` script to set up the VPC, Elastic IP, and Route 53 public hosted zone for the domain hosting Care Connect.
3. Run the `ses.sh` script to set up the SES sending domain and credentials for sending emails from Care Connect.
4. Run the `rds.sh` script to set up the RDS Postgres DB instance for Care Connect.
5. Run the `s3.sh` script to set up the S3 bucket for storing user uploaded files.
6. Run the `ecs.sh` script to set up the ECS on Fargate cluster
