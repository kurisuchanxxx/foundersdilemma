# VentureSim - Setup Guide

## Quick Start (5 minutes)

### Step 1: Open in Xcode

```bash
cd /Users/christian/VentureSim
open -a Xcode .
```

Xcode will open the folder. Since there's no `.xcodeproj` yet, follow Step 2.

---

### Step 2: Create Xcode Project

#### Method A: Xcode GUI (Recommended - 3 minutes)

1. **Open Xcode** → **File** → **New** → **Project**

2. **Choose template**: **macOS** → **App**

3. **Project settings**:
   - **Product Name**: `VentureSim`
   - **Team**: (select your team or None)
   - **Organization Identifier**: `com.yourdomain` (any value)
   - **Interface**: **SwiftUI**
   - **Language**: **Swift**
   - **Storage**: **None**
   - **Hosting**: Leave unchecked
   - **Include Tests**: Check this (we have test files)

4. **Save location**: Navigate to `/Users/christian/VentureSim` and click **Create**

5. **Clean up duplicates**:
   - Xcode creates `VentureSimApp.swift` and `ContentView.swift`
   - **Delete** these (we already have them)
   - Right-click → Delete → Move to Trash

6. **Add existing source files**:
   - In Project Navigator, right-click on **VentureSim** (blue icon) → **Add Files to "VentureSim"**
   - Navigate to `/Users/christian/VentureSim/VentureSim/`
   - Select **all** `.swift` files and folders (`Views/`, `ViewModels/`)
   - **Options**:
     - ✅ **Copy items if needed** (unchecked)
     - ✅ **Create groups** (selected)
     - ✅ **Add to targets**: VentureSim (checked)
   - Click **Add**

7. **Add SimulationCore**:
   - Right-click on project root → **Add Files to "VentureSim"**
   - Select `/Users/christian/VentureSim/SimulationCore/` folder
   - Same options as above
   - Click **Add**

8. **Add candidates.json as resource**:
   - Right-click on **VentureSim** target → **Add Files**
   - Select `/Users/christian/VentureSim/SimulationCore/Data/candidates.json`
   - ✅ **Copy items if needed** (checked this time)
   - ✅ **Add to targets**: VentureSim
   - Click **Add**

9. **Add test files**:
   - Right-click on **VentureSimTests** group → **Add Files**
   - Select all files from `/Users/christian/VentureSim/SimulationCoreTests/`
   - ✅ **Add to targets**: VentureSimTests
   - Click **Add**

10. **Configure deployment**:
    - Click on **VentureSim** project (blue icon) in Navigator
    - Select **VentureSim** target
    - **General** tab → **Minimum Deployments** → **macOS 14.0**

11. **Fix Info.plist** (if needed):
    - In **Build Settings**, search for "Info.plist"
    - Set path to `VentureSim/Info.plist`

---

### Step 3: Build and Run

1. **Select scheme**: **VentureSim** → **My Mac** (in toolbar)
2. **Build**: **Product** → **Build** (⌘B)
3. **Run**: **Product** → **Run** (⌘R)

**Expected result**: Game launches, setup screen appears!

---

## Troubleshooting

### "Cannot find 'Candidate' in scope"
- Ensure `SimulationCore` files are added to the project
- Check File Inspector: Target Membership includes `VentureSim`

### "candidates.json not found"
- Select `candidates.json` in Navigator
- **File Inspector** → **Target Membership**: ✅ VentureSim
- **Build Phases** → **Copy Bundle Resources**: verify `candidates.json` is listed

### "Module 'SimulationCore' not found"
- Xcode isn't recognizing the folder structure
- **Option 1**: Add all `.swift` files individually (not as folder reference)
- **Option 2**: Create a separate framework target (advanced)

### Build errors about missing views
- Ensure all `.swift` files in `VentureSim/Views/` are added
- Check that folders use "Create groups" not "Create folder references"

### App crashes on launch
- Check Console for errors
- Common issue: `candidates.json` not in bundle
- Solution: Add as resource (step 8 above)

---

## File Checklist

Ensure these files are in the project:

### App Target (VentureSim)
- ✅ `VentureSimApp.swift`
- ✅ `ViewModels/GameViewModel.swift`
- ✅ `Views/MainView.swift`
- ✅ `Views/Setup/GameSetupView.swift`
- ✅ `Views/Setup/PlayerSetupView.swift`
- ✅ `Views/Game/DashboardView.swift`
- ✅ `Views/Game/DecisionsView.swift`
- ✅ `Views/Game/TeamView.swift`
- ✅ `Views/Game/EventsView.swift`
- ✅ `Views/Game/LeaderboardView.swift`
- ✅ `Views/Game/Components/MetricCard.swift`
- ✅ `Views/Settings/SettingsView.swift`
- ✅ All `SimulationCore/**/*.swift` files
- ✅ `SimulationCore/Data/candidates.json` (in Copy Bundle Resources)
- ✅ `Info.plist`
- ✅ `Assets.xcassets/`

### Test Target (VentureSimTests)
- ✅ `SimulationCoreTests/ValuationCalculatorTests.swift`
- ✅ `SimulationCoreTests/MetricsCalculatorTests.swift`
- ✅ `SimulationCoreTests/TeamSystemTests.swift`
- ✅ `SimulationCoreTests/SeededRandomTests.swift`

---

## Running Tests

1. **Product** → **Test** (⌘U)
2. Or click the diamond icon next to test functions
3. Tests should pass (4 test suites, ~20 tests)

---

## Advanced: Command Line Build

Once Xcode project is created:

```bash
cd /Users/christian/VentureSim
./build.sh
```

This builds a Release version in `build/Build/Products/Release/VentureSim.app`

---

## Next Steps

- **Customize app icon**: Add PNG files to `Assets.xcassets/AppIcon.appiconset/`
- **Adjust settings**: Change appearance, tweak gameplay params
- **Extend**: Add more events, team candidates, sectors

---

## Support

See [README.md](README.md) for gameplay instructions and architecture details.

For build issues, check:
- Xcode version (15.0+)
- macOS version (14.0+)
- All source files are added to correct targets
