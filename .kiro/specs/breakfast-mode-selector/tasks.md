# Implementation Plan: Breakfast Mode Selector

## Overview

Upgrade the Permanent Meal System's breakfast control from a binary on/off toggle to a 3-state selector (Off / Half / Full). This involves adding utility functions for mode resolution and cycling, creating a new BreakfastModeToggle UI component, modifying PermanentMealManager to use it, and updating the auto-meal generation logic to write the correct raw breakfast values (0, 1, or 2).

## Tasks

- [x] 1. Add breakfast mode utility functions to permanentMeals.js
  - [x] 1.1 Implement BREAKFAST_MODES constants, resolveBreakfastMode, getNextBreakfastMode, and getBreakfastRawValue functions
    - Add `BREAKFAST_MODES` constant object: `{ OFF: "off", HALF: "half", FULL: "full" }`
    - Add `resolveBreakfastMode(setting)` — returns "off", "half", or "full" based on `breakfastMode` field with legacy boolean fallback
    - Add `getNextBreakfastMode(current)` — cycles off → half → full → off, defaults to "half" for unknown input
    - Add `getBreakfastRawValue(mode)` — maps "off" → 0, "half" → 1, "full" → 2, unknown → 0
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 4.1_

  - [x] 1.2 Update getEnabledMealKeys to use resolveBreakfastMode instead of boolean check
    - Replace `Boolean(setting.breakfast)` check with `resolveBreakfastMode(setting) !== "off"` for the breakfast key
    - Lunch and dinner remain as boolean checks
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_

  - [ ]* 1.3 Write property tests for breakfast mode utility functions
    - **Property 1: Mode Resolution Determinism** — resolveBreakfastMode always returns one of {"off", "half", "full"}
    - **Property 2: Backward Compatibility Invariant** — settings without breakfastMode resolve via legacy boolean
    - **Property 3: Cycle Completeness** — applying getNextBreakfastMode 3 times returns to original mode
    - **Property 4: Unit Calculation Consistency** — getBreakfastRawValue(mode) * 0.5 equals expected units
    - **Property 5: Write-Read Round Trip** — writing breakfastMode then resolving returns same value
    - **Property 6: Lunch/Dinner Isolation** — changing breakfast mode does not affect lunch/dinner in getEnabledMealKeys
    - **Property 7: Total Meals Formula** — countMealUnits equals breakfast*0.5 + lunch + dinner
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.4, 6.1, 6.2, 6.3, 7.1, 7.3**

  - [ ]* 1.4 Write unit tests for breakfast mode utility functions
    - Test resolveBreakfastMode with: valid breakfastMode field, legacy boolean true/false, empty setting, invalid breakfastMode value
    - Test getNextBreakfastMode for all 3 valid modes plus unknown input
    - Test getBreakfastRawValue for all modes plus unknown
    - Test getEnabledMealKeys with various breakfast mode settings
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 4.1_

- [x] 2. Checkpoint - Verify utility functions
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create BreakfastModeToggle component
  - [x] 3.1 Create src/pages/meals/BreakfastModeToggle.jsx component
    - Accept props: `mode` ("off" | "half" | "full"), `disabled`, `memberName`, `onCycle`
    - Render distinct visual states: Off (X icon, muted), Half (half-circle icon, orange), Full (check icon, bright orange)
    - Cycle through modes on click via `onCycle` callback
    - Add accessible `aria-label` describing current state and member name
    - Use framer-motion `whileTap` for tap animation
    - Disable button when `disabled` prop is true
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 3.2 Write unit tests for BreakfastModeToggle
    - Test rendering for each mode state (off, half, full)
    - Test click triggers onCycle callback
    - Test disabled state prevents interaction
    - _Requirements: 1.2, 1.3_

- [x] 4. Update PermanentMealManager to use 3-state breakfast toggle
  - [x] 4.1 Add cycleBreakfastMode handler and integrate BreakfastModeToggle
    - Import `resolveBreakfastMode`, `getNextBreakfastMode`, `getBreakfastRawValue` from permanentMeals.js
    - Import `BreakfastModeToggle` component
    - Add `cycleBreakfastMode(member)` function that resolves current mode, computes next mode, saves to Firestore with both `breakfastMode` and legacy `breakfast` fields
    - Write `breakfastMode` string AND `breakfast` boolean (true for half/full, false for off) on every save
    - Show toast with member name and new mode on success
    - Revert UI on failure with error toast
    - _Requirements: 1.1, 1.4, 1.5, 3.5, 8.1_

  - [x] 4.2 Replace binary breakfast toggle with BreakfastModeToggle in the member table
    - In the MEAL_KEYS map rendering, detect when key is "breakfast" and render BreakfastModeToggle instead of the binary Check/X button
    - Pass resolved mode from `resolveBreakfastMode(setting)` as the `mode` prop
    - Pass `savingKey` state to disable during saves
    - Keep lunch and dinner as existing binary toggles
    - _Requirements: 1.2, 6.1, 6.2, 6.3_

  - [x] 4.3 Update bulk actions for breakfast to support 3 modes (Off, Half, Full)
    - Replace the single "All ON" / "All OFF" buttons for breakfast with three buttons: "All Off", "All Half", "All Full"
    - Implement `setAllBreakfast(mode)` that sets all members' `breakfastMode` to the specified value and writes legacy `breakfast` boolean
    - Show toast confirming mode and that all members were updated
    - Show error toast if bulk operation fails
    - _Requirements: 2.1, 2.2, 2.3, 3.5, 8.1_

  - [ ]* 4.4 Write unit tests for PermanentMealManager breakfast mode integration
    - Test cycleBreakfastMode saves correct breakfastMode and legacy breakfast fields
    - Test bulk setAllBreakfast for each mode
    - Test error handling reverts UI state
    - _Requirements: 1.4, 1.5, 2.1, 2.2, 2.3_

- [x] 5. Checkpoint - Verify UI components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update auto-meal generation in firestoreService.js
  - [x] 6.1 Modify ensureDailyPermanentMeals to use resolveBreakfastMode and getBreakfastRawValue
    - Import `resolveBreakfastMode` and `getBreakfastRawValue` from permanentMeals.js
    - When building the autoMeal object, replace `autoMeal[key] = 1` for breakfast with `autoMeal.breakfast = getBreakfastRawValue(resolveBreakfastMode(setting))`
    - Ensure lunch and dinner still use value 1 (unchanged)
    - Ensure the `countMealUnits` call still works correctly (breakfast raw value * 0.5 produces correct units)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 4.2_

  - [ ]* 6.2 Write unit tests for updated ensureDailyPermanentMeals breakfast handling
    - Test auto-meal generation with breakfastMode "off" produces breakfast: 0
    - Test auto-meal generation with breakfastMode "half" produces breakfast: 1
    - Test auto-meal generation with breakfastMode "full" produces breakfast: 2
    - Test lunch and dinner values remain unchanged regardless of breakfast mode
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Update saveMealSettings to validate breakfastMode
  - [x] 7.1 Add validation in saveMealSettings to only accept valid breakfastMode values
    - Before writing to Firestore, validate that `breakfastMode` is one of "off", "half", "full"
    - If invalid value provided, reject the write and throw an error
    - Ensure the breakfast field in meal documents is constrained to 0, 1, or 2
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 7.2 Write unit tests for saveMealSettings validation
    - Test valid breakfastMode values are accepted
    - Test invalid breakfastMode values are rejected with error
    - _Requirements: 8.1, 8.3_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `* 0.5` multiplier in countMealUnits, billing.js, and smartInsights.js remains unchanged — breakfast raw values (0, 1, 2) are designed to work with it
- No changes needed to billing.js, smartInsights.js, or calculateMealCount

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "6.1", "7.1"] },
    { "id": 5, "tasks": ["4.4", "6.2", "7.2"] }
  ]
}
```
