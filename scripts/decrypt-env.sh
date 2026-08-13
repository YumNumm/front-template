#!/usr/bin/env bash
set -euo pipefail

mise exec -- sops -d .env.enc.json
