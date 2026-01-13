#!/bin/sh

# If complete config is provided, use it
if [ "$OTTERSCAN_CONFIG" ]; then
  PARAMS="$OTTERSCAN_CONFIG"
else
  # Build config JSON from container init params
  PARAMS=$(jq -n \
    --arg rpcURL "$ERIGON_URL" \
    --arg beaconAPI "$BEACON_API_URL" \
    --arg assetsURLPrefix "$ASSETS_URL_PREFIX" \
    --arg experimental "$OTS2" \
    '{
      rpcURL: $rpcURL,
      beaconAPI: $beaconAPI,
      assetsURLPrefix: $assetsURLPrefix,
      experimental: $experimental,
    }')
fi

# Overwrite base image config.json with our own and let nginx do the rest
if [ ! "$DISABLE_CONFIG_OVERWRITE" ]; then
  echo $PARAMS > /usr/share/nginx/html/config.json
fi
exec nginx -g "daemon off;"
