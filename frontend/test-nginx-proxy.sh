#!/bin/sh
set -eu
grep -F 'proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;' nginx.conf.template
