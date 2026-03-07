"""AWS Secrets Manager rotation Lambda for Peacefull managed secrets.

This implementation supports all required rotation steps and performs a
non-breaking rollover by preserving the previous secret value when a
`*_PREVIOUS` companion key is present in JSON secrets.
"""

from __future__ import annotations

import json
import logging
import os
import secrets
import string
from typing import Any

import boto3

LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)

SECRETS = boto3.client("secretsmanager")
ENVIRONMENT = os.getenv("ENVIRONMENT", "unknown")
APP_NAME = os.getenv("APP_NAME", "peacefull")

ALPHABET = string.ascii_letters + string.digits + "-_"


def _new_secret(length: int = 64) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


def _read_secret(secret_id: str, version_stage: str) -> str:
    return SECRETS.get_secret_value(SecretId=secret_id, VersionStage=version_stage)["SecretString"]


def _safe_parse_json(value: str) -> dict[str, Any] | None:
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return None


def _rotate_value(current_value: str) -> str:
    parsed = _safe_parse_json(current_value)
    if not parsed:
        return _new_secret()

    rotated = dict(parsed)
    for key in list(rotated):
        if key.endswith("_PREVIOUS"):
            continue

        if any(marker in key.upper() for marker in ["SECRET", "KEY", "TOKEN", "PASSWORD"]):
            previous_key = f"{key}_PREVIOUS"
            old_value = str(rotated.get(key, ""))
            if old_value:
                rotated[previous_key] = old_value
            rotated[key] = _new_secret()

    return json.dumps(rotated)


def lambda_handler(event: dict[str, Any], _context: Any) -> None:
    secret_id = event["SecretId"]
    client_token = event["ClientRequestToken"]
    step = event["Step"]

    metadata = SECRETS.describe_secret(SecretId=secret_id)
    versions = metadata.get("VersionIdsToStages", {})

    if client_token not in versions:
        raise ValueError(f"Secret version {client_token} has no staging labels for {secret_id}")

    if step == "createSecret":
        if "AWSPENDING" in versions[client_token]:
            LOGGER.info("AWSPENDING already exists for %s", secret_id)
            return

        current_value = _read_secret(secret_id, "AWSCURRENT")
        pending_value = _rotate_value(current_value)
        SECRETS.put_secret_value(
            SecretId=secret_id,
            ClientRequestToken=client_token,
            SecretString=pending_value,
            VersionStages=["AWSPENDING"],
        )
        LOGGER.info("Created AWSPENDING version for %s in %s/%s", secret_id, APP_NAME, ENVIRONMENT)
        return

    if step == "setSecret":
        LOGGER.info("setSecret no-op for %s (application-managed propagation)", secret_id)
        return

    if step == "testSecret":
        _read_secret(secret_id, "AWSPENDING")
        LOGGER.info("testSecret passed for %s", secret_id)
        return

    if step == "finishSecret":
        current_version = next(
            (version for version, labels in versions.items() if "AWSCURRENT" in labels),
            None,
        )

        if current_version == client_token:
            LOGGER.info("Version %s already current for %s", client_token, secret_id)
            return

        SECRETS.update_secret_version_stage(
            SecretId=secret_id,
            VersionStage="AWSCURRENT",
            MoveToVersionId=client_token,
            RemoveFromVersionId=current_version,
        )
        LOGGER.info("finishSecret promoted %s for %s", client_token, secret_id)
        return

    raise ValueError(f"Unsupported rotation step {step}")
