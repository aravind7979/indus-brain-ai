#!/bin/bash
echo "Stopping INDUS BRAIN AI system components..."
sudo systemctl stop indus-backend.service
sudo systemctl stop nginx
echo "Components stopped."
