#!/bin/sh

set -e

flask --app run:app db upgrade

exec "$@"