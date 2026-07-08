#!/usr/bin/env bash
# Security / edge-case API probes for User Login.
# NOTE: login is throttled 5 req/min per IP. This script sleeps between probes
# to stay under the limit so each probe reflects the REAL endpoint behaviour
# (not a 429). Output is machine-appended to evidence/network/api-security-probes.log
set -u
API="https://api-moon.dlyn.site/api/user/auth/login"
OUT="$(cd "$(dirname "$0")/.." && pwd)/evidence/network/api-security-probes.log"
: > "$OUT"

probe () { # $1 = label, $2 = json body
  echo "================================================================" >>"$OUT"
  echo "PROBE: $1" >>"$OUT"
  echo "BODY : $2" >>"$OUT"
  curl -s -D - -o /tmp/lp_body --max-time 25 -X POST \
       -H "Content-Type: application/json" -H "Accept: application/json" \
       -d "$2" "$API" \
    | sed -n '1p;/^[Xx]-[Rr]ate/p;/^[Cc]ontent-[Tt]ype/p' >>"$OUT"
  echo "RESPONSE: $(cat /tmp/lp_body)" >>"$OUT"
  echo >>"$OUT"
  sleep 14   # 5/min => one probe every ~14s keeps us under the throttle
}

echo "Started $(date -u)" >>"$OUT"
sleep 62   # let any exhausted throttle window fully reset first
probe "SQLi in username"            '{"username":"user001'"'"' OR 1=1 -- ","password":"password"}'
probe "SQLi in password"            '{"username":"user001","password":"'"'"' OR '"'"'1'"'"'='"'"'1"}'
probe "XSS in username"             '{"username":"<script>alert(1)</script>","password":"x"}'
probe "Username case-sensitivity"   '{"username":"USER001","password":"password"}'
probe "Password type-juggling(array)" '{"username":"user001","password":["password"]}'
probe "Username as integer"         '{"username":12345,"password":"password"}'
probe "Extremely long username"     "{\"username\":\"$(printf 'a%.0s' {1..5000})\",\"password\":\"password\"}"
probe "Leading/trailing spaces"     '{"username":"  user001  ","password":"password"}'
probe "Unicode/emoji username"      '{"username":"user001😀","password":"password"}'
probe "Null password"               '{"username":"user001","password":null}'
echo "Finished $(date -u)" >>"$OUT"
echo "DONE"
