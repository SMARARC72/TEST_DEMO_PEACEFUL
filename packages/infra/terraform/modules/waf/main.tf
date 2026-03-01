# ------------------------------------------------------------------------------
# WAF Module – AWS WAF v2 for ALB Protection
# SEC-010: Web Application Firewall for HIPAA-compliant clinical platform
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# WAF Web ACL
# ------------------------------------------------------------------------------

resource "aws_wafv2_web_acl" "main" {
  name        = "${var.app_name}-${var.environment}-waf"
  description = "WAF for Peacefull.ai ${var.environment} API"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # --------------------------------------------------------------------------
  # Rule 1: AWS Managed – Common Rule Set (XSS, LFI, RFI, etc.)
  # --------------------------------------------------------------------------
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"

        # Exclude rules that may conflict with clinical API payloads
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {}
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.app_name}-${var.environment}-common-rules"
      sampled_requests_enabled   = true
    }
  }

  # --------------------------------------------------------------------------
  # Rule 2: AWS Managed – SQL Injection Rule Set
  # --------------------------------------------------------------------------
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesSQLiRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.app_name}-${var.environment}-sqli-rules"
      sampled_requests_enabled   = true
    }
  }

  # --------------------------------------------------------------------------
  # Rule 3: AWS Managed – Known Bad Inputs
  # --------------------------------------------------------------------------
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 30

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.app_name}-${var.environment}-bad-inputs-rules"
      sampled_requests_enabled   = true
    }
  }

  # --------------------------------------------------------------------------
  # Rule 4: Rate Limiting – 2000 requests / 5 minutes per IP
  # --------------------------------------------------------------------------
  rule {
    name     = "RateLimitPerIP"
    priority = 40

    action {
      block {
        custom_response {
          response_code = 429
          custom_response_body_key = "rate-limited"
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.app_name}-${var.environment}-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  # --------------------------------------------------------------------------
  # Rule 5: Geo-Restriction – US only (HIPAA data residency)
  # --------------------------------------------------------------------------
  dynamic "rule" {
    for_each = var.geo_restrict ? [1] : []
    content {
      name     = "GeoRestriction"
      priority = 50

      action {
        block {
          custom_response {
            response_code = 403
            custom_response_body_key = "geo-blocked"
          }
        }
      }

      statement {
        not_statement {
          statement {
            geo_match_statement {
              country_codes = var.allowed_country_codes
            }
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${var.app_name}-${var.environment}-geo-block"
        sampled_requests_enabled   = true
      }
    }
  }

  # --------------------------------------------------------------------------
  # Rule 6: Request Body Size Limit (16 KB for API, except file uploads)
  # --------------------------------------------------------------------------
  rule {
    name     = "RequestBodySizeLimit"
    priority = 60

    action {
      block {
        custom_response {
          response_code = 413
          custom_response_body_key = "body-too-large"
        }
      }
    }

    statement {
      and_statement {
        statement {
          size_constraint_statement {
            comparison_operator = "GT"
            size                = var.max_body_size_bytes

            field_to_match {
              body {
                oversize_handling = "CONTINUE"
              }
            }

            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }

        # Exclude file upload paths from body size limit
        statement {
          not_statement {
            statement {
              byte_match_statement {
                positional_constraint = "STARTS_WITH"
                search_string         = "/api/v1/uploads"

                field_to_match {
                  uri_path {}
                }

                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.app_name}-${var.environment}-body-size"
      sampled_requests_enabled   = true
    }
  }

  # --------------------------------------------------------------------------
  # Custom response bodies
  # --------------------------------------------------------------------------
  custom_response_body {
    key          = "rate-limited"
    content      = "{\"error\":\"RATE_LIMITED\",\"message\":\"Too many requests. Please try again later.\"}"
    content_type = "APPLICATION_JSON"
  }

  custom_response_body {
    key          = "geo-blocked"
    content      = "{\"error\":\"GEO_BLOCKED\",\"message\":\"This service is not available in your region.\"}"
    content_type = "APPLICATION_JSON"
  }

  custom_response_body {
    key          = "body-too-large"
    content      = "{\"error\":\"BODY_TOO_LARGE\",\"message\":\"Request body exceeds maximum allowed size.\"}"
    content_type = "APPLICATION_JSON"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.app_name}-${var.environment}-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Name  = "${var.app_name}-${var.environment}-waf"
    HIPAA = "true"
  }
}

# ------------------------------------------------------------------------------
# Associate WAF with ALB
# ------------------------------------------------------------------------------

resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = var.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# ------------------------------------------------------------------------------
# CloudWatch Logging for WAF (HIPAA audit trail)
# ------------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "waf" {
  name              = "aws-waf-logs-${var.app_name}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name  = "${var.app_name}-${var.environment}-waf-logs"
    HIPAA = "true"
  }
}

resource "aws_wafv2_web_acl_logging_configuration" "main" {
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]
  resource_arn            = aws_wafv2_web_acl.main.arn

  logging_filter {
    default_behavior = "KEEP"

    filter {
      behavior    = "KEEP"
      requirement = "MEETS_ANY"

      condition {
        action_condition {
          action = "BLOCK"
        }
      }

      condition {
        action_condition {
          action = "COUNT"
        }
      }
    }
  }
}
