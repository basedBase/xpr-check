#!/bin/bash

while true
do
  echo "$(date): Running X.com promotion..."
  node /Users/celebe/WebstormProjects/currentxpr/promote.js
  echo "$(date): Promotion complete. Sleeping for 1 hour..."
  sleep 600 # Sleep for 3600 seconds (1 hour)
done
