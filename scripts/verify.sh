#!/usr/bin/env bash
set -euo pipefail

openclaw --version
pi --version
openclaw config validate
openclaw plugins inspect acpx
openclaw plugins inspect openclaw-weixin
openclaw gateway status
openclaw channels status --channel openclaw-weixin
