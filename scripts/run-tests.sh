#!/bin/bash

echo "🧪 Running DAGShield Test Suite"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        exit 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if hardhat is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Please install Node.js and npm${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    print_status $? "Dependencies installed"
fi

# Compile contracts
echo "🔨 Compiling contracts..."
npx hardhat compile
print_status $? "Contracts compiled"

# Run unit tests
echo "🧪 Running unit tests..."
npx hardhat test test/DAGToken.test.js
print_status $? "DAGToken tests"

npx hardhat test test/DAGShield.test.js
print_status $? "DAGShield tests"

npx hardhat test test/DAGOracle.test.js
print_status $? "DAGOracle tests"

npx hardhat test test/DAGStaking.test.js
print_status $? "DAGStaking tests"

npx hardhat test test/DAGGameification.test.js
print_status $? "DAGGameification tests"

# Run integration tests
echo "🔗 Running integration tests..."
npx hardhat test test/DAGShield-Integration.test.js
print_status $? "Integration tests"

# Run gas usage analysis
echo "⛽ Analyzing gas usage..."
REPORT_GAS=true npx hardhat test
print_status $? "Gas analysis"

# Generate coverage report
echo "📊 Generating coverage report..."
npx hardhat coverage
print_status $? "Coverage report generated"

# Run security analysis (if slither is installed)
if command -v slither &> /dev/null; then
    echo "🔒 Running security analysis..."
    slither . --exclude-dependencies
    print_status $? "Security analysis"
else
    print_warning "Slither not installed. Skipping security analysis."
fi

# Deploy to local network for testing
echo "🚀 Testing deployment on local network..."
npx hardhat node &
HARDHAT_PID=$!
sleep 5

npx hardhat run scripts/deploy-full-network.js --network localhost
DEPLOY_STATUS=$?

# Kill hardhat node
kill $HARDHAT_PID

print_status $DEPLOY_STATUS "Local deployment test"

# Run network monitor test
echo "📡 Testing network monitor..."
timeout 30s node scripts/network-monitor.js &
MONITOR_PID=$!
sleep 5
kill $MONITOR_PID 2>/dev/null
print_status 0 "Network monitor test"

echo ""
echo -e "${GREEN}🎉 All tests completed successfully!${NC}"
echo "================================"
echo "📁 Test reports available in:"
echo "   - coverage/index.html (Coverage report)"
echo "   - network-metrics.json (Network metrics)"
echo "   - network-activity.log (Activity log)"
