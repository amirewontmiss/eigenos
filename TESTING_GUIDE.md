# QuantumOS Testing Guide

## Comprehensive Testing Protocol

This guide provides step-by-step instructions for testing all functionality in the QuantumOS desktop application.

## Getting Started

### Launch the Application
1. Navigate to: `/home/xan/eigenos/release/`
2. Run: `./QuantumOS-1.0.0.AppImage`
3. The application should open with the authentication screen

## Authentication Testing

### Test Credentials
- **Username**: `admin` or `xan`
- **Password**: `quantum123`
- **TOTP Codes**: `123456`, `000000`, or `111111`

### Authentication Flow Tests

#### Test 1: Valid Login
1. Enter username: `xan` (or `admin`)
2. Enter password: `quantum123`
3. Click "AUTHENTICATE"
4. **Expected**: 2FA form appears
5. Enter TOTP code: `123456`
6. Click "VERIFY"
7. **Expected**: Dashboard loads successfully

#### Test 2: Invalid Password
1. Enter username: `admin`
2. Enter password: `wrongpassword`
3. Click "AUTHENTICATE"
4. **Expected**: Error message appears, 2FA form does NOT appear

#### Test 3: Invalid TOTP
1. Complete valid login (username/password)
2. Enter invalid TOTP: `999999`
3. Click "VERIFY"
4. **Expected**: Error message appears

#### Test 4: Developer Mode
1. Click "Developer Mode" option to enable it
2. **Expected**: Status changes to "ENABLED"
3. Enter username: `dev`
4. Enter password: `dev123`
5. Click "AUTHENTICATE"
6. **Expected**: Dashboard loads directly (no 2FA)

#### Test 5: Empty Form Validation
1. Leave username and password empty
2. Click "AUTHENTICATE"
3. **Expected**: Error message about required fields

## UI/UX Testing

### Visual Design Tests

#### Test 6: Color Scheme
1. Verify background is completely black (#000000)
2. Verify text is white (#ffffff)
3. Verify blue accents (#4a69bd) are present
4. Verify no emojis are visible anywhere

#### Test 7: Typography
1. Verify monospace font is used throughout
2. Verify system specs are displayed correctly
3. Verify all text is readable

#### Test 8: System Information
1. Check left panel displays:
   - System ID: QOS-ENTERPRISE-v1.0.0
   - Architecture: x86_64-linux-quantum
   - Kernel: QKernel 6.15.1-quantum-1
   - Runtime: Electron 28.0.0
   - Providers: IBM, Google, Rigetti, IonQ
   - Security: bcrypt + TOTP + device-binding
   - Uptime: (updating counter)

## Navigation Testing

### Dashboard Navigation Tests

#### Test 9: Main Navigation
1. Login successfully
2. Test each navigation item:
   - Overview
   - Provider Configuration
   - Circuit Designer
   - Device Monitor
   - Job Manager
   - State Visualization
   - Analytics
   - Settings
   - System Logs
   - Security

3. **Expected**: Each section loads with appropriate content

#### Test 10: Navigation State
1. Click different navigation items
2. **Expected**: Active item is highlighted with blue border
3. **Expected**: Only one item is active at a time

## Provider Configuration Testing

### Provider Setup Tests

#### Test 11: IBM Quantum Configuration
1. Navigate to "Provider Configuration"
2. In IBM Quantum card:
   - Enter API Token: `test_token_123`
   - Hub: `ibm-q` (pre-filled)
   - Group: `open` (pre-filled)
   - Project: `main` (pre-filled)
3. Click "TEST CONNECTION"
4. **Expected**: Button shows "TESTING..." then returns to normal
5. **Expected**: Status changes to "Connected" (70% chance)
6. **Expected**: Terminal log shows connection attempt

#### Test 12: Google Quantum AI Configuration
1. In Google Quantum AI card:
   - Service Account JSON: `{"type": "service_account", "project_id": "test"}`
   - Project ID: `test-project`
2. Click "TEST CONNECTION"
3. **Expected**: Similar behavior to IBM test

#### Test 13: All Providers
1. Test Rigetti Computing:
   - API Key: `test_rigetti_key`
   - User ID: `test_user`
2. Test IonQ:
   - API Key: `test_ionq_key`
   - Endpoint: `https://api.ionq.co` (pre-filled)
3. **Expected**: All providers can be tested independently

## System Statistics Testing

#### Test 14: Live Statistics
1. Navigate to "Overview"
2. Observe system statistics:
   - Devices Online
   - Qubits Available
   - Jobs Completed
   - System Load
3. Wait 5 seconds
4. **Expected**: Statistics update automatically

#### Test 15: Statistics Accuracy
1. Connect providers in Provider Configuration
2. Return to Overview
3. **Expected**: Device count increases based on connected providers
4. **Expected**: Qubit count reflects connected devices

## Session Management Testing

#### Test 16: Session Persistence
1. Login successfully
2. Close application
3. Reopen application
4. **Expected**: Automatically logged in (session persists)

#### Test 17: Session Expiry
1. Login successfully
2. Open browser dev tools (F12)
3. In console: `localStorage.setItem('quantumos_session', JSON.stringify({exp: Date.now() - 1000}))`
4. Refresh page or restart app
5. **Expected**: Forced to login again

#### Test 18: Logout Functionality
1. Login successfully
2. Click "LOGOUT" button in top-right
3. **Expected**: Returns to authentication screen
4. **Expected**: Session data cleared
5. **Expected**: Username field focused

## Keyboard Navigation Testing

#### Test 19: Enter Key Navigation
1. On auth screen, enter username
2. Press Enter key
3. **Expected**: Focus moves to password field
4. Enter password and press Enter
5. **Expected**: Login is submitted

#### Test 20: TOTP Enter Key
1. Reach 2FA screen
2. Enter TOTP code
3. Press Enter key
4. **Expected**: TOTP is submitted

## Data Persistence Testing

#### Test 21: Provider Config Persistence
1. Configure at least one provider
2. Close and reopen application
3. Login and navigate to Provider Configuration
4. **Expected**: Provider configurations are saved
5. **Expected**: Connected providers show "Connected" status

#### Test 22: Terminal Log Persistence
1. Perform various actions (login, navigation, provider tests)
2. Navigate away and back to Provider Configuration
3. **Expected**: Terminal log retains previous messages

## Error Handling Testing

#### Test 23: Network Error Simulation
1. Disconnect internet (if possible)
2. Try provider connection tests
3. **Expected**: Appropriate error handling

#### Test 24: Invalid Input Handling
1. Enter special characters in all form fields
2. Enter extremely long inputs
3. **Expected**: No application crashes
4. **Expected**: Appropriate validation

## Responsiveness Testing

#### Test 25: Window Resizing
1. Resize application window to various sizes
2. **Expected**: Interface adapts properly
3. **Expected**: No elements overflow or become unusable

## Performance Testing

#### Test 26: Memory Usage
1. Open system monitor
2. Use application for 10+ minutes
3. **Expected**: Memory usage remains stable
4. **Expected**: No significant memory leaks

#### Test 27: CPU Usage
1. Monitor CPU usage during normal operation
2. **Expected**: Low CPU usage when idle
3. **Expected**: No excessive background processing

## Security Testing

#### Test 28: Password Security
1. Check that passwords are not visible in form fields
2. Check that passwords are not logged to console
3. **Expected**: Password fields use type="password"

#### Test 29: Session Security
1. Check localStorage for session data
2. **Expected**: Session data is structured but not plaintext passwords

## Automated Testing

### Run Automated Test Suite
1. Open application
2. Open Developer Tools (F12)
3. Go to Console tab
4. Copy and paste the contents of `test-script.js`
5. Run: `runAllTests()`
6. **Expected**: Comprehensive test results displayed

### Quick Test Commands
```javascript
// Run individual test categories
quantumosTests.testAuthentication()
quantumosTests.testNavigation()
quantumosTests.testProviderConfiguration()

// View test results
quantumosTests.results()
```

## Test Results Documentation

### Success Criteria
- [ ] All authentication flows work correctly
- [ ] UI is completely black with white text and dark blue accents
- [ ] No emojis visible anywhere
- [ ] All navigation works smoothly
- [ ] Provider configuration functions properly
- [ ] Session management works correctly
- [ ] Error handling is robust
- [ ] Performance is acceptable
- [ ] Data persistence works

### Bug Reporting Format
```
**Bug Title**: Brief description
**Steps to Reproduce**: 
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**: What should happen
**Actual Behavior**: What actually happens
**Browser/Environment**: Chrome/Firefox/etc.
**Severity**: High/Medium/Low
```

## Known Issues to Verify Fixed

1. **Vulkan Warning**: Check if Vulkan driver warnings still appear in console
2. **Emoji Removal**: Verify no emojis appear anywhere in the interface
3. **Color Scheme**: Confirm complete black background with white text
4. **Authentication Flow**: Verify 2FA works correctly
5. **Provider Integration**: Confirm all 4 providers can be configured

## Post-Testing Actions

After completing all tests:

1. Document any bugs found
2. Verify all critical functionality works
3. Confirm UI meets design requirements
4. Test on different screen sizes if possible
5. Report overall application stability

---

**Testing completed successfully means the QuantumOS desktop application is ready for production use.**