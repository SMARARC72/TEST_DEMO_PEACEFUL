output "log_group_names" {
  description = "Names of the CloudWatch Log Groups"
  value = {
    api            = aws_cloudwatch_log_group.api.name
    ecs            = aws_cloudwatch_log_group.ecs.name
    vpc_flow_logs  = aws_cloudwatch_log_group.vpc_flow_logs.name
  }
}

output "sns_topic_arn" {
  description = "ARN of the SNS alerts topic"
  value       = aws_sns_topic.alerts.arn
}
