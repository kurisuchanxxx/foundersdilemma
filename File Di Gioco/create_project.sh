#!/bin/bash
set -e

PROJECT_NAME="VentureSim"
BUNDLE_ID="com.venturesim.app"

mkdir -p "${PROJECT_NAME}.xcodeproj"

cat > "${PROJECT_NAME}.xcodeproj/project.pbxproj" << 'PBXPROJ'
// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 56;
	objects = {
		/* Begin PBXFileReference section */
		/* End PBXFileReference section */
		
		/* Begin PBXGroup section */
		/* End PBXGroup section */
		
		/* Begin PBXNativeTarget section */
		/* End PBXNativeTarget section */
		
		/* Begin PBXProject section */
		/* End PBXProject section */
	};
	rootObject = 1234567890ABCDEF12345678 /* Project object */;
}
PBXPROJ

echo "Xcode project template created"
