#!/bin/bash
echo "Restarting INDUS BRAIN AI system components..."
sudo systemctl restart indus-backend.service
sudo systemctl restart nginx
echo "Components restarted."
