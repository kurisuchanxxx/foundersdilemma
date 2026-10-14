#!/bin/bash

echo "Creating VentureSim Xcode project..."

cd "$(dirname "$0")"

# Create Xcode project using swift package
swift package generate-xcodeproj 2>/dev/null || echo "Note: generate-xcodeproj is deprecated, use 'xed .' to open in Xcode"

echo ""
echo "================================================"
echo "VentureSim Project Setup Complete!"
echo "================================================"
echo ""
echo "To open the project in Xcode, run:"
echo "  cd VentureSim"
echo "  open -a Xcode ."
echo ""
echo "Or simply double-click VentureSim folder in Finder"
echo "and Xcode will recognize it as a Swift package."
echo ""
echo "Build and run with Cmd+R in Xcode."
echo ""
