# ------------------------------------------------------------------------------
# Monitoring Module – CloudWatch Logs, Alarms, SNS
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# CloudWatch Log Groups (HIPAA: 365-day retention)
# ------------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/${var.app_name}-${var.environment}/api"
  retention_in_days = 365

  tags = {
    Name  = "${var.app_name}-${var.environment}-api-logs"
    HIPAA = "true"
  }
}

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/aws/${var.app_name}-${var.environment}/ecs"
  retention_in_days = 365

  tags = {
    Name  = "${var.app_name}-${var.environment}-ecs-logs"
    HIPAA = "true"
  }
}

resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  name              = "/aws/${var.app_name}-${var.environment}/vpc-flow-logs"
  retention_in_days = 365

  tags = {
    Name  = "${var.app_name}-${var.environment}-vpc-flow-logs"
    HIPAA = "true"
  }
}

# ------------------------------------------------------------------------------
# SNS Topic for Alerts
# ------------------------------------------------------------------------------

resource "aws_sns_topic" "alerts" {
  name = "${var.app_name}-${var.environment}-alerts"

  tags = {
    Name  = "${var.app_name}-${var.environment}-alerts"
    HIPAA = "true"
  }
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ------------------------------------------------------------------------------
# CloudWatch Alarms
# ------------------------------------------------------------------------------

# API 5xx Error Rate > 1%
resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "${var.app_name}-${var.environment}-api-5xx-rate"
  alarm_description   = "API 5xx error rate exceeds 1%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  threshold           = 1

  metric_query {
    id          = "error_rate"
    expression  = "(errors / requests) * 100"
    label       = "5xx Error Rate"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "HTTPCode_Target_5XX_Count"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }

  metric_query {
    id = "requests"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name  = "${var.app_name}-${var.environment}-api-5xx-alarm"
    HIPAA = "true"
  }
}

# API p99 Latency > 2000ms
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${var.app_name}-${var.environment}-api-p99-latency"
  alarm_description   = "API p99 latency exceeds 2000ms"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  extended_statistic   = "p99"
  threshold           = 2.0
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name  = "${var.app_name}-${var.environment}-api-latency-alarm"
    HIPAA = "true"
  }
}

# ECS CPU > 80%
resource "aws_cloudwatch_metric_alarm" "ecs_cpu" {
  alarm_name          = "${var.app_name}-${var.environment}-ecs-cpu"
  alarm_description   = "ECS CPU utilization exceeds 80%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ecs_service_name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name  = "${var.app_name}-${var.environment}-ecs-cpu-alarm"
    HIPAA = "true"
  }
}

# RDS CPU > 80%
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.app_name}-${var.environment}-rds-cpu"
  alarm_description   = "RDS CPU utilization exceeds 80%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name  = "${var.app_name}-${var.environment}-rds-cpu-alarm"
    HIPAA = "true"
  }
}

# RDS Free Storage < 5GB
resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "${var.app_name}-${var.environment}-rds-storage"
  alarm_description   = "RDS free storage space below 5GB"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120 # 5 GB in bytes
  treat_missing_data  = "breaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name  = "${var.app_name}-${var.environment}-rds-storage-alarm"
    HIPAA = "true"
  }
}

# Redis Memory > 80%
resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.app_name}-${var.environment}-redis-memory"
  alarm_description   = "Redis memory utilization exceeds 80%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    CacheClusterId = var.redis_cluster_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name  = "${var.app_name}-${var.environment}-redis-memory-alarm"
    HIPAA = "true"
  }
}

# ------------------------------------------------------------------------------
# Route53 Health Check — Uptime Monitoring (UGO-6.3)
# Checks the /health endpoint every 30 seconds from multiple AWS regions.
# Alarm fires after 2 consecutive failures → SNS alert.
# ------------------------------------------------------------------------------

resource "aws_route53_health_check" "api_health" {
  count = var.api_domain != "" ? 1 : 0

  fqdn              = var.api_domain
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold  = 2
  request_interval   = 30
  measure_latency    = true

  tags = {
    Name  = "${var.app_name}-${var.environment}-api-health-check"
    HIPAA = "true"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_uptime" {
  count = var.api_domain != "" ? 1 : 0

  alarm_name          = "${var.app_name}-${var.environment}-api-uptime"
  alarm_description   = "API health endpoint is unreachable (2+ consecutive failures)"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  treat_missing_data  = "breaching"

  dimensions = {
    HealthCheckId = aws_route53_health_check.api_health[0].id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name  = "${var.app_name}-${var.environment}-api-uptime-alarm"
    HIPAA = "true"
  }
}
