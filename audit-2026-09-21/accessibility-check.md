# Accessibility check — 22 September 2026

Reviewed the local demo in the in-app browser. Evidence includes current screenshots, accessibility-tree inspection, keyboard interactions and DOM measurements. No backend configuration or deployment was changed.

## 1. Mobile navigation

Fixed and keyboard-verified. Opening now focuses Close navigation; Tab from Logout wraps to Close navigation. The main content is inert while the drawer is open. Escape closes it, removes inert and returns focus to Open navigation.

![Mobile navigation](/Users/mahvishsadafv2/Desktop/solarflow_demo/output/accessibility-qa/10-navigation-fixed.png)

## 2. Add Lead

Fixed field names and contrast. The accessibility tree now exposes the optional address, team, system and payment fields by name. Customer-name focus and safe Escape behavior were verified. The enabled amber submit button uses rgb(12,10,9) text on rgb(245,158,11), a calculated contrast ratio of 9.20:1. Pale secondary text in this form was darkened.

![Add Lead](/Users/mahvishsadafv2/Desktop/solarflow_demo/output/accessibility-qa/07-add-lead-fixed.png)

## 3. Role picker

Fixed and keyboard-verified. The native modal now wraps Shift+Tab from Close to the final role; Escape returns focus to Switch role. Saved records and selected roles were not changed during this check.

![Role picker](/Users/mahvishsadafv2/Desktop/solarflow_demo/output/accessibility-qa/11-role-picker-fixed.png)

## 4. Delivery editor

Fixed modal semantics, initial focus, field names, close-button name and focus return. Tab from Save wraps to Close; Shift+Tab wraps back. Escape returns to Create Delivery Batch. Every input/select/textarea in the opened editor had a label or accessible name. Mobile filters wrap; measured dialog and form horizontal overflow were both false at the narrow viewport. Keyboard traversal also passed at 1280px.

![Delivery editor](/Users/mahvishsadafv2/Desktop/solarflow_demo/output/accessibility-qa/08-delivery-fixed.png)

## 5. Unsaved-changes confirmation

Fixed the shared popup focus loop. Keep Editing receives initial focus; Tab from Discard returns to Keep Editing. Escape preserved the entered fictional name and restored focus to that field. The unsaved test draft was discarded afterward without creating a customer.

![Unsaved-changes confirmation](/Users/mahvishsadafv2/Desktop/solarflow_demo/output/accessibility-qa/12-confirmation-fixed.png)

## Validation and limits

Production build (including the isolation guard), isolation tests (2 passed), and git diff whitespace checks passed. Global focus-visible outlines now remain visible even on controls styled with outline-none. Screenshots above were saved and opened for inspection.

This is a focused accessibility pass on the main navigation and common forms/popups, not a whole-app WCAG certification. Full screen-reader speech testing, every role-specific screen, print preview, image cropper, all contrast combinations and zoom levels were not exhaustively tested. No blanket compliance claim is made. Deployment remains deferred.
