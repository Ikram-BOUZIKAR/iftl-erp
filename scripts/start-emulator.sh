#!/bin/bash
# Start Firebase Emulator Suite

echo "🔥 Starting Firebase Emulator Suite..."
echo ""
echo "This will start:"
echo "  ✓ Auth Emulator (port 9099)"
echo "  ✓ Firestore Emulator (port 8080)"
echo "  ✓ Storage Emulator (port 9199)"
echo "  ✓ Emulator UI (port 4000)"
echo ""
echo "Test Credentials:"
echo "  Email: test@iftl.ma"
echo "  Password: Test123456!"
echo ""
echo "---"
echo ""

firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data
