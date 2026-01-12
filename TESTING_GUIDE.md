# VentureSim - Manual Testing Guide

## Quick Start Testing (5 minutes)

### 1. Launch the Game
```bash
# Open in Xcode
open "/Users/christian/Desktop/CTRL STUDIO/Risorse Interne/Vibe-Coding/VentureSim/File Di Gioco/VentureSim/VentureSim.xcodeproj"

# Or build from command line
cd "/Users/christian/Desktop/CTRL STUDIO/Risorse Interne/Vibe-Coding/VentureSim/File Di Gioco/VentureSim"
xcodebuild -project VentureSim.xcodeproj -scheme VentureSim -configuration Debug
```

### 2. Test Decision Flow (CRITICAL)

**Step 1: Game Setup**
1. Click "New Game"
2. Select "Solo vs Bot" mode
3. Choose any sector (e.g., SaaS B2B)
4. Choose any founder profile (e.g., Hacker)
5. Choose Medium risk
6. Click "Start Game"

**Step 2: Submit Decision**
1. Should see "Decisions for Q1" screen
2. Go to **Core** tab:
   - Set R&D Spend: $50,000
   - Set Marketing Spend: $60,000
   - Set Ops Spend: $20,000
   - Set Pricing (ARPA): **Try $0 first** ⬅️ IMPORTANT TEST
     - ❌ Submit button should be **disabled** (gray)
     - ❌ Should see: "⚠️ Pricing must be greater than 0"
   - Now set Pricing: $1,000
     - ✅ Submit button should be **enabled** (blue)

3. Go to **Product** tab:
   - Set MVP Development: 6 months
   - Choose Development Approach: Balanced
   - Choose Tech Debt Action: Maintain Current

4. Go to **Financing** tab:
   - Select "Sell Equity" ⬅️ IMPORTANT TEST
   - Adjust equity slider to **10%**
   - ✅ Verify you see:
     - "Cash Raised: $XXX,XXX" (in green)
     - "Post-Money Valuation: $X,XXX,XXX"
     - "Your Ownership: X.X% → X.X%"
     - 💡 Tip about dilution
   - Try different equity percentages and watch values update

5. Go to **Reputation** tab:
   - Choose "No Action" (or try PR Stunt)

6. Click **"Submit Decision"** button at bottom

**Step 3: Verify Submitted State** ⬅️ CRITICAL
After clicking Submit, you should see:

✅ **Green banner:** "Decisions Submitted" with checkmark icon
✅ **Orange button:** "Edit Decisions" with unlock icon
✅ **Blue button:** "Advance to Next Period →" with arrow icon

If you DON'T see these 3 elements, **the implementation failed**.

**Step 4: Test Edit Functionality** ⬅️ CRITICAL
1. Click **"Edit Decisions"** (orange button)
2. ✅ Verify all decision tabs are editable again
3. Change pricing to $2,000
4. Navigate between tabs - verify all inputs work
5. Click **"Submit Decision"** again
6. ✅ Verify you're back to submitted state (3 buttons/banners)

**Step 5: Test Period Advancement** ⬅️ CRITICAL
1. Click **"Advance to Next Period →"** (blue button)
2. ✅ Verify round label changes (Q1 → Q2)
3. ✅ Verify Dashboard metrics update:
   - Cash decreases (due to spending)
   - Runway changes
   - MVP progress shows
   - Team cost appears
4. ✅ Verify you can make new decisions for Q2
5. Submit decisions for Q2
6. Advance to Q3
7. Repeat for Q3 → see it change to H1 (semiannual period)

---

## Detailed Testing Scenarios

### Scenario A: Validation Testing

**Test A1: Cannot Submit with Invalid Pricing**
1. Set all decisions
2. Set pricing = $0
3. Click Submit
4. ✅ Expected: Button disabled, warning shown
5. Set pricing = $100
6. ✅ Expected: Button enabled

**Test A2: Cannot Advance Without Submission**
1. Start new round
2. Don't submit decision
3. Try to manually trigger advance (if possible)
4. ✅ Expected: Console shows error, round doesn't advance

---

### Scenario B: Equity Financing Math

**Test B1: Equity Calculation Accuracy**
Given:
- Current valuation: $1,000,000
- Existing team equity: 15%
- Selling equity: 10%

Expected Results:
- Cash Raised = $1,000,000 × 0.10 = **$100,000**
- Post-Money Valuation = $1,000,000 / (1 - 0.10) = **$1,111,111**
- Current Ownership = 100% - 15% = **85%**
- New Ownership = 85% - 10% = **75%**

Steps:
1. Go to Financing tab
2. Select "Sell Equity"
3. Set slider to 10%
4. ✅ Verify all 4 values match expectations
5. Try 20%: Cash = $200k, Ownership = 65%
6. Try 5%: Cash = $50k, Ownership = 80%

---

### Scenario C: Multi-Round Progression

**Test C1: 5-Round Game Flow**
1. Submit & Advance Q1 → Q2
2. Submit & Advance Q2 → Q3
3. Submit & Advance Q3 → H1 (note period type change)
4. Submit & Advance H1 → H2
5. Submit & Advance H2 → Year 2

✅ Verify at each round:
- Metrics update logically
- Cash decreases by burn rate
- Revenue may appear if MVP ready
- Runway adjusts based on cash/burn
- No NaN or Infinity values

---

### Scenario C2: Hiring Equity Impact Display

**Test C2: Equity Cost Visibility in Hiring**
Given:
- Current valuation: $1,000,000
- Existing team equity: 15% (from previous hires)
- Making offer to Senior Engineer with equity: 0.50%

Expected Results:
- Cost to Founder: **0.50% of company**
- Equity Value: $1,000,000 × 0.005 = **$5,000**
- Current Ownership: 100% - 15% = **85.0%**
- New Ownership: 85.0% - 0.5% = **84.5%**

Steps:
1. Navigate to Hiring panel
2. Click "View CV" on any candidate
3. ✅ Verify CV sheet displays with:
   - Education (university, degree, field, year)
   - Work Experience (company, role, years)
   - Skills (with level indicators)
   - Achievements
   - Hidden Bonuses (if any)
4. Close CV and click "Make Offer"
5. Set equity slider to 0.50%
6. ✅ Verify "Equity Impact" section appears showing:
   - Cost to Founder: 0.50% of company (orange)
   - Equity Value: $5,000 (purple)
   - Your Ownership: 85.0% → 84.5% (red)
7. Try different equity values:
   - 1.0%: Cost = 1.0%, Value = $10k, Ownership = 85% → 84%
   - 2.0%: Cost = 2.0%, Value = $20k, Ownership = 85% → 83%
8. ✅ Verify all calculations update in real-time

---

### Scenario D: Decision Editing

**Test D1: Multiple Edits in One Round**
1. Submit decision with pricing = $1,000
2. Click Edit
3. Change pricing to $2,000
4. Submit
5. Click Edit again
6. Change pricing to $1,500
7. Submit
8. Click Edit again
9. Change R&D spend to $80,000
10. Submit
11. Advance period
12. ✅ Verify final values used: pricing=$1,500, R&D=$80,000

---

## Expected Console Output

### Normal Flow
```
[GameViewModel] Starting new game with 2 players
[GameViewModel] Generating CVs for 50 candidates
[DecisionsView] Submitted decision for Player: [CompanyName]
[GameViewModel] Player ready: [CompanyName]
[GameViewModel] All players ready, advancing round
[SimulationEngine] Simulating round 1
[SimulationEngine] Processing player: [CompanyName]
[MetricsCalculator] Calculated CAC: $XXX
[MetricsCalculator] Calculated LTV: $X,XXX
[MetricsCalculator] Calculated revenue: $XXX,XXX
[GameState] Advanced to round 2 (Q2)
```

### Validation Errors (Expected)
```
⚠️ Warning: Not all players have submitted decisions
❌ Error: Player [CompanyName] has no decision
❌ Error: Player [CompanyName] has invalid pricing: 0.0
```

---

## Performance Benchmarks

### Build Time
- **Clean build:** ~30-45 seconds
- **Incremental build:** ~10-15 seconds

### Runtime Performance
- **Game start:** < 1 second
- **CV generation (50 candidates):** < 0.5 seconds
- **Decision submit:** < 0.1 seconds
- **Period simulation:** < 0.5 seconds
- **UI responsiveness:** No lag

### Memory Usage
- **App launch:** ~50-80 MB
- **After 10 rounds:** ~100-150 MB
- **No memory leaks detected**

---

## Troubleshooting

### Issue: Submit button always disabled
**Cause:** Pricing is $0 or <= 0
**Fix:** Set pricing to any value > 0 (e.g., $1,000)

### Issue: Can't see "Advance to Next Period" button
**Cause 1:** Not in singleplayer mode (check game setup)
**Cause 2:** Haven't submitted decision yet
**Fix:** Verify game mode is "Solo vs Bot" and click Submit first

### Issue: Round doesn't advance
**Cause:** Validation failed in `advanceYear()`
**Fix:** Check Xcode console for error messages

### Issue: Equity calculations seem wrong
**Cause:** May not be accounting for existing team equity
**Fix:** Check Dashboard → "Founder Equity" to see current ownership

### Issue: Metrics show NaN or Infinity
**Cause:** Division by zero in calculation (bug)
**Fix:** This shouldn't happen; report as critical bug

---

## Regression Testing Checklist

After any code changes, verify these still work:

- [ ] Game launches without crash
- [ ] Can create new game
- [ ] Can select all 4 sectors
- [ ] Can select all 6 founder profiles
- [ ] Can select all 3 risk levels
- [ ] Dashboard displays all metrics
- [ ] All 4 decision tabs load
- [ ] All sliders and pickers work
- [ ] Submit button logic works
- [ ] Edit button appears after submit
- [ ] Advance button appears after submit (singleplayer)
- [ ] Period advances correctly
- [ ] Metrics update after each round
- [ ] Can play 5+ rounds without crash
- [ ] Equity financing math is correct
- [ ] Pricing range is 100-20,000
- [ ] Hiring panel loads candidate list
- [ ] Can view candidate CVs
- [ ] Can make hiring offers
- [ ] Equity impact displays in hiring offers
- [ ] No console errors in normal flow

---

## Known Limitations (Not Bugs)

1. **No undo after advancing period**
   - Once you click "Advance", the period is finalized
   - This is intentional design (permanent commitment)

2. **Cannot skip periods**
   - Must make decisions every period
   - This is intentional (turn-based game)

3. **Bot decisions are conservative**
   - Bots use fixed formulas, not adaptive AI
   - This is intentional (simple opponent)

4. **Validation is basic**
   - Only checks pricing > 0 and decision exists
   - More validation coming in A8

5. **No save/load yet**
   - Must complete game in one session
   - Coming in Phase B

---

## Success Criteria

### ✅ Phase 1 (A1-A7) is SUCCESSFUL if:
1. Can start a singleplayer game
2. Can submit decisions
3. Can edit and resubmit decisions
4. Can advance to next period after submit
5. Cannot submit with pricing = $0
6. Cannot advance without submitting
7. Equity financing shows all 4 metrics (cash raised, post-money, ownership change, tip)
8. Pricing range is 100-20,000
9. Can view candidate CVs with full details
10. Equity impact shows in hiring offers (cost, value, ownership change)
11. Game progresses through 5 rounds without crash
12. All metrics stay valid (no NaN)

### ❌ Phase 1 FAILED if:
1. Cannot see "Advance to Next Period" button
2. Can submit with pricing = $0
3. Edit button doesn't unlock decisions
4. Equity calculations are wrong (financing or hiring)
5. CV display is missing or incomplete
6. Equity impact not visible in hiring offers
7. Game crashes during period advancement
8. Metrics become NaN or Infinity

---

## Reporting Issues

When reporting bugs, include:
1. **Steps to reproduce:** Exact sequence of actions
2. **Expected behavior:** What should happen
3. **Actual behavior:** What actually happened
4. **Console output:** Copy relevant logs
5. **Screenshots:** If UI issue
6. **Build info:** Xcode version, macOS version

Example:
```
BUG: Advance button not visible

Steps:
1. Start Solo vs Bot game
2. Submit decision for Q1
3. Look at bottom of Decisions screen

Expected: See "Advance to Next Period →" button
Actual: Only see "Edit Decisions" button

Console: (no errors)
macOS: 14.6, Xcode 16.2
```

---

## Next Testing Phase

After Phase 1 testing is complete, proceed to:
- **Phase A8:** Simulation validation testing
- **Phase B:** Save/load functionality testing
- **Phase C:** New panels (Funding/Sales) testing
- **Phase D-G:** Sector/modifier/tooltip testing

---

**Last Updated:** December 23, 2025
**Tester:** [Your Name]
**Version:** v1.0-alpha (Phase 1)
