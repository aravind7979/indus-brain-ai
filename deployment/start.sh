#!/bin/bash
echo "Starting INDUS BRAIN AI system components..."
sudo systemctl start indus-backend.service
sudo systemctl start nginx
echo "Components active."
