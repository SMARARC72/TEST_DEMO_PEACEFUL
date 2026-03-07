#!/usr/bin/env python3
"""CI policy check: ensure required prod secrets are configured for rotation."""

from __future__ import annotations

import re
from pathlib import Path

MODULE_VARS = Path("packages/infra/terraform/modules/secrets/variables.tf")
MODULE_MAIN = Path("packages/infra/terraform/modules/secrets/main.tf")

vars_text = MODULE_VARS.read_text()
main_text = MODULE_MAIN.read_text()

required_match = re.search(
    r'variable "required_prod_rotation_secrets"[\s\S]*?default\s*=\s*\[(.*?)\]',
    vars_text,
    re.S,
)
rotatable_match = re.search(
    r'rotatable_secret_names\s*=\s*toset\(\[(.*?)\]\)',
    main_text,
    re.S,
)

if not required_match or not rotatable_match:
    print("Unable to parse required_prod_rotation_secrets or rotatable_secret_names")
    raise SystemExit(1)

required_default = set(re.findall(r'"([a-z0-9_]+)"', required_match.group(1)))
rotatable_set = set(re.findall(r'"([a-z0-9_]+)"', rotatable_match.group(1)))
managed_specs = set(re.findall(r"^\s{4}([a-z0-9_]+)\s*=\s*\{", main_text, re.M))

missing_in_managed = sorted(required_default - managed_specs)
missing_in_rotatable = sorted(required_default - rotatable_set)

if missing_in_managed or missing_in_rotatable:
    if missing_in_managed:
        print("Missing required secrets in managed_secret_specs:", ", ".join(missing_in_managed))
    if missing_in_rotatable:
        print("Missing required secrets in rotatable_secret_names:", ", ".join(missing_in_rotatable))
    raise SystemExit(1)

print("Rotation policy check passed: required prod secrets are configured for rotation.")
