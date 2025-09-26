#!/bin/bash

# DAGShield AI Model Training Script

echo "🛡️ DAGShield AI Threat Detection Model Training"
echo "=============================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🔧 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Create necessary directories
mkdir -p data models logs

# Run training
echo "🤖 Starting model training..."
python3 train_threat_detector.py 2>&1 | tee logs/training_$(date +%Y%m%d_%H%M%S).log

# Check if training was successful
if [ $? -eq 0 ]; then
    echo "✅ Training completed successfully!"
    echo "📁 Model files are available in the 'models' directory"
    echo "📊 Training logs saved in the 'logs' directory"
    
    # List generated files
    echo ""
    echo "Generated files:"
    ls -la models/
else
    echo "❌ Training failed. Check the logs for details."
    exit 1
fi

# Deactivate virtual environment
deactivate

echo "🎉 DAGShield AI model training complete!"
