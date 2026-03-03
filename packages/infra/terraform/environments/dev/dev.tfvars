# ─── Dev Environment Variables ────────────────────────────────────────
# Copy to dev.auto.tfvars and fill in secrets before running terraform.
#
# NEVER commit secrets to this file — use dev.auto.tfvars (gitignored) or
# pass them via CLI: terraform plan -var="db_password=xxx"
# ─────────────────────────────────────────────────────────────────────

# Required — set via env or -var flag
# db_password     = "<SET_VIA_CLI_OR_ENV>"

# Optional overrides
# container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/peacefull-dev-api:latest"
# acm_certificate_arn = "<ACM_ARN_FOR_DEV_DOMAIN>"
alert_email       = "alerts-dev@peacefull.ai"
