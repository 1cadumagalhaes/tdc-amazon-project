# TTT-99 Infrastructure as Code

This directory contains Terraform configuration to deploy TTT-99 to AWS using Free Tier resources.

## Architecture

- **EC2 t4g.micro**: Backend server (ARM-based, Free Tier eligible)
- **S3 + CloudFront**: Frontend hosting and CDN
- **VPC**: Isolated network with public subnet
- **Security Group**: HTTP/HTTPS/SSH access
- **Nginx**: Reverse proxy with SSL termination

## Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **Terraform installed** (>= 1.0)
3. **SSH key pair** for EC2 access

## Quick Start

1. **Copy and configure variables**:
   ```bash
   cd iac
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

2. **Generate SSH key** (if you don't have one):
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/ttt99-key
   cat ~/.ssh/ttt99-key.pub  # Copy this to terraform.tfvars
   ```

3. **Deploy infrastructure**:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

4. **Deploy application**:
   ```bash
   # SSH to the server
   ssh -i ~/.ssh/ttt99-key ec2-user@<EC2_PUBLIC_IP>
   
   # Run deployment script
   sudo /opt/ttt99/deploy.sh
   ```

5. **Deploy frontend**:
   ```bash
   # Build frontend locally
   bun run build:web
   
   # Sync to S3
   aws s3 sync apps/web/dist/ s3://<S3_BUCKET_NAME>/
   
   # Invalidate CloudFront cache
   aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
   ```

## Configuration

### Required Variables

- `ssh_public_key`: Your SSH public key content
- `aws_region`: AWS region (default: us-east-1)
- `project_name`: Project name for resources (default: ttt99)

### Optional Variables

- `domain_name`: Custom domain for SSL certificate

## Outputs

After deployment, Terraform will output:

- `ec2_public_ip`: Server IP address
- `ec2_public_dns`: Server DNS name
- `s3_bucket_name`: Frontend bucket name
- `cloudfront_url`: Frontend URL
- `ssh_command`: Command to SSH to server

## SSL Certificate

If you provide a `domain_name`, the deployment will automatically:

1. Configure Nginx for your domain
2. Obtain Let's Encrypt SSL certificate
3. Set up HTTPS redirect

**Note**: Ensure your domain's DNS points to the EC2 public IP before deployment.

## Cost Estimate

**Free Tier (first 12 months)**:
- EC2 t4g.micro: 750 hours/month (FREE)
- S3: 5GB storage, 20,000 GET requests (FREE)
- CloudFront: 1TB data transfer (FREE)
- Data Transfer: 1GB/month (FREE)

**After Free Tier**:
- EC2 t4g.micro: ~$3-4/month
- S3 + CloudFront: ~$1-2/month for typical usage
- **Total**: ~$5-6/month

## Deployment Script

The EC2 instance includes a deployment script at `/opt/ttt99/deploy.sh` that:

1. Clones the latest code from GitHub
2. Installs dependencies and builds the app
3. Creates atomic releases with rollback capability
4. Restarts the service
5. Cleans up old releases

## Monitoring

- **Application logs**: `journalctl -u ttt99 -f`
- **Nginx logs**: `/var/log/nginx/access.log`
- **System logs**: `/var/log/messages`

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

**Warning**: This will permanently delete all resources and data.

## Troubleshooting

### Service not starting
```bash
sudo systemctl status ttt99
sudo journalctl -u ttt99 -f
```

### SSL certificate issues
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

### Nginx configuration
```bash
sudo nginx -t
sudo systemctl reload nginx
```
