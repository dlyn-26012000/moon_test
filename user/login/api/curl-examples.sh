#!/usr/bin/env bash
# cURL examples for User Login API. Endpoint throttled 5 req/min per IP.
# Usage: bash curl-examples.sh
API="https://api-moon.dlyn.site/api/user/auth/login"
ME="https://api-moon.dlyn.site/api/user/auth/me"
LOGOUT="https://api-moon.dlyn.site/api/user/auth/logout"
H=(-H "Content-Type: application/json" -H "Accept: application/json")

echo "# 1) Login success -> 200 LOGIN_SUCCESS + token"
curl -s -w "\n[HTTP %{http_code} | %{time_total}s]\n" "${H[@]}" -X POST \
  -d '{"username":"user001","password":"password"}' "$API"

echo -e "\n# 2) Wrong password -> BUG-001: HTTP 500 CREDENTIALS_INCORRECT (should be 401)"
curl -s -w "\n[HTTP %{http_code}]\n" "${H[@]}" -X POST \
  -d '{"username":"user001","password":"wrong"}' "$API"

echo -e "\n# 3) Unknown user -> BUG-002: USER_NOT_FOUND (enumeration), HTTP 500"
curl -s -w "\n[HTTP %{http_code}]\n" "${H[@]}" -X POST \
  -d '{"username":"no_such_user_zzz","password":"password"}' "$API"

echo -e "\n# 4) Missing fields -> 422 VALIDATION_ERROR"
curl -s -w "\n[HTTP %{http_code}]\n" "${H[@]}" -X POST -d '{}' "$API"

echo -e "\n# 5) Password type-juggling -> 422 (password must be a string)"
curl -s -w "\n[HTTP %{http_code}]\n" "${H[@]}" -X POST \
  -d '{"username":"user001","password":["password"]}' "$API"

echo -e "\n# 6) Rate limit: 6 rapid requests -> 6th returns 429 Too Many Attempts"
for i in $(seq 1 6); do
  echo -n "  req $i: "
  curl -s -o /dev/null -w "%{http_code}\n" "${H[@]}" -X POST \
    -d '{"username":"user001","password":"password"}' "$API"
done

echo -e "\n# 7) Authenticated call with token (replace <TOKEN>)"
echo 'curl -s -H "Accept: application/json" -H "Authorization: Bearer <TOKEN>" '"$ME"

echo -e "\n# 8) Logout (delete current token)"
echo 'curl -s -X DELETE -H "Accept: application/json" -H "Authorization: Bearer <TOKEN>" '"$LOGOUT"
