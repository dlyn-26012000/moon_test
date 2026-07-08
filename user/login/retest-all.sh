#!/usr/bin/env bash
# Chạy lại toàn bộ suite QA login theo requirement.md, tuần tự + giãn cách để
# tránh throttle 5 req/phút/IP trên endpoint login. Chạy sau khi code đã deploy.
set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"
PW=/www/dlyn-26012000/ec-core/node_modules/playwright

echo "############ 1/3 UI suite (Playwright vi+en+mobile) ############"
( cd "$ROOT/playwright" && PW=$PW node run.js )

echo "############ pausing 75s (throttle window) ############"; sleep 75

echo "############ 2/3 API suite (Playwright) ############"
( cd "$ROOT/api" && NODE_PATH=/www/dlyn-26012000/ec-core/node_modules node login.api.spec.js )

echo "############ pausing 75s (throttle window) ############"; sleep 75

echo "############ 3/3 Security probes (cURL) ############"
( cd "$ROOT/api" && bash security-probes.sh )

echo "############ RETEST DONE ############"
