# Requirements Document

## Introduction

This document defines the formal requirements for upgrading the Permanent Meal System's breakfast control from a binary on/off toggle to a 3-state selector (Off, Half, Full). The feature allows mess members to configure breakfast at different portion levels, affecting meal unit calculations and billing. Only the permanent meal configuration is affected — manual meal entry, lunch, and dinner behavior remain unchanged.

## Glossary

- **Permanent_Meal_System**: The automated daily meal generation subsystem that writes meal entries based on saved member settings
- **Breakfast_Mode_Selector**: The 3-state UI control that cycles through Off, Half, and Full breakfast modes
- **Breakfast_Mode**: One of three string values ("off", "half", "full") representing the breakfast configuration for a member
- **Meal_Setting**: A Firestore document storing a member's permanent meal preferences (breakfast mode, lunch, dinner)
- **Auto_Meal**: A meal document automatically generated daily by the Permanent Meal System based on meal settings
- **Meal_Unit**: The numeric weight assigned to a meal for billing purposes (breakfast: 0, 0.5, or 1.0; lunch/dinner: 1.0 each)
- **Raw_Breakfast_Value**: The integer stored in meal documents (0, 1, or 2) that when multiplied by 0.5 yields the meal unit value
- **Mode_Cycle**: The deterministic rotation sequence: off → half → full → off
- **Legacy_Setting**: A meal setting document that uses only the boolean `breakfast` field without the newer `breakfastMode` field
- **Admin**: A user with permission to modify meal settings for all members in the mess

## Requirements

### Requirement 1: Breakfast Mode Selection

**User Story:** As a mess admin, I want to set each member's breakfast to Off, Half, or Full, so that breakfast portions are accurately reflected in meal counts and billing.

#### Acceptance Criteria

1. WHEN an admin clicks the breakfast toggle for a member, THE Breakfast_Mode_Selector SHALL cycle to the next mode in the sequence: off → half → full → off
2. THE Breakfast_Mode_Selector SHALL display a distinct visual state for each mode: muted with X icon for Off, orange with half-circle icon for Half, and bright orange with check icon for Full
3. WHILE a save operation is in progress, THE Breakfast_Mode_Selector SHALL be disabled to prevent concurrent modifications
4. WHEN a mode change is saved successfully, THE Permanent_Meal_System SHALL display a toast notification indicating the member name and new breakfast mode
5. IF a mode change save fails due to a network error, THEN THE Permanent_Meal_System SHALL display an error toast and revert the UI to the previous mode

### Requirement 2: Bulk Breakfast Mode Control

**User Story:** As a mess admin, I want to set all members' breakfast mode at once, so that I can efficiently configure the entire mess.

#### Acceptance Criteria

1. WHEN an admin selects a bulk breakfast action, THE Permanent_Meal_System SHALL set all members' breakfast mode to the specified value (off, half, or full)
2. WHEN a bulk operation completes successfully, THE Permanent_Meal_System SHALL display a toast confirming the mode and that all members were updated
3. IF any individual member update fails during a bulk operation, THEN THE Permanent_Meal_System SHALL display an error toast indicating the bulk update failed

### Requirement 3: Breakfast Mode Resolution and Backward Compatibility

**User Story:** As a system operator, I want existing boolean breakfast settings to be interpreted correctly, so that no member's meal configuration is disrupted by the upgrade.

#### Acceptance Criteria

1. WHEN a Meal_Setting contains a valid `breakfastMode` field, THE Permanent_Meal_System SHALL use that field value directly as the resolved mode
2. WHEN a Meal_Setting lacks a `breakfastMode` field and has `breakfast: true`, THE Permanent_Meal_System SHALL resolve the mode as "half"
3. WHEN a Meal_Setting lacks a `breakfastMode` field and has `breakfast: false`, THE Permanent_Meal_System SHALL resolve the mode as "off"
4. IF a Meal_Setting contains an invalid `breakfastMode` value, THEN THE Permanent_Meal_System SHALL fall back to the legacy `breakfast` boolean for resolution
5. WHEN saving a breakfast mode, THE Permanent_Meal_System SHALL write both the `breakfastMode` string field and the legacy `breakfast` boolean field for backward compatibility

### Requirement 4: Meal Unit Calculation

**User Story:** As a mess member, I want my breakfast portion to be counted correctly in meal totals, so that billing reflects my actual consumption.

#### Acceptance Criteria

1. THE Permanent_Meal_System SHALL assign a Raw_Breakfast_Value of 0 for Off mode, 1 for Half mode, and 2 for Full mode
2. THE Permanent_Meal_System SHALL calculate total meal units as: (Raw_Breakfast_Value × 0.5) + lunch + dinner
3. WHEN breakfast mode is "half", THE Permanent_Meal_System SHALL produce 0.5 meal units for breakfast, identical to the previous boolean true behavior
4. WHEN breakfast mode is "full", THE Permanent_Meal_System SHALL produce 1.0 meal units for breakfast

### Requirement 5: Auto-Meal Generation with Breakfast Mode

**User Story:** As a mess admin, I want the daily auto-meal generation to respect each member's breakfast mode, so that generated meals have the correct breakfast value.

#### Acceptance Criteria

1. WHEN generating a daily auto-meal for a member with breakfast mode "off", THE Permanent_Meal_System SHALL set the breakfast field to 0
2. WHEN generating a daily auto-meal for a member with breakfast mode "half", THE Permanent_Meal_System SHALL set the breakfast field to 1
3. WHEN generating a daily auto-meal for a member with breakfast mode "full", THE Permanent_Meal_System SHALL set the breakfast field to 2
4. WHEN generating auto-meals, THE Permanent_Meal_System SHALL leave lunch and dinner generation unchanged regardless of breakfast mode

### Requirement 6: Lunch and Dinner Isolation

**User Story:** As a mess admin, I want lunch and dinner toggles to remain as simple on/off controls, so that the breakfast upgrade does not affect other meal types.

#### Acceptance Criteria

1. THE Permanent_Meal_System SHALL maintain lunch as a binary toggle (on/off) with a value of 0 or 1
2. THE Permanent_Meal_System SHALL maintain dinner as a binary toggle (on/off) with a value of 0 or 1
3. WHEN breakfast mode is changed for a member, THE Permanent_Meal_System SHALL preserve the existing lunch and dinner settings without modification

### Requirement 7: Mode Cycle Determinism

**User Story:** As a mess admin, I want the breakfast toggle to cycle predictably, so that I can set the desired mode without confusion.

#### Acceptance Criteria

1. THE Breakfast_Mode_Selector SHALL follow a fixed cycle order: off → half → full → off
2. WHEN the cycle function receives an unknown or invalid mode value, THE Breakfast_Mode_Selector SHALL default to "half" as the next mode
3. FOR ALL valid modes, applying the cycle function exactly three times SHALL return to the original mode

### Requirement 8: Data Validation

**User Story:** As a system operator, I want breakfast mode values to be validated on write, so that invalid data cannot corrupt meal calculations.

#### Acceptance Criteria

1. THE Permanent_Meal_System SHALL only accept "off", "half", or "full" as valid breakfastMode values when writing to Firestore
2. THE Permanent_Meal_System SHALL ensure the breakfast field in meal documents is one of: 0, 1, or 2
3. IF an invalid breakfastMode value is provided to a write operation, THEN THE Permanent_Meal_System SHALL reject the write and report an error
