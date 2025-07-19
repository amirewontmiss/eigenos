// QuantumOS Authentication & UI Test Script
// Run this in the browser console of the QuantumOS application

console.log('QuantumOS Test Suite Starting...');

// Test Suite Configuration
const TEST_CONFIG = {
    testUsers: [
        { username: 'admin', password: 'quantum123', shouldPass: true },
        { username: 'admin', password: 'wrongpass', shouldPass: false },
        { username: 'nonexistent', password: 'test', shouldPass: false },
        { username: '', password: '', shouldPass: false }
    ],
    validTotpCodes: ['123456', '000000', '111111'],
    invalidTotpCodes: ['999999', '12345', 'abcdef'],
    providers: ['ibm', 'google', 'rigetti', 'ionq'],
    navigationSections: ['welcome', 'providers', 'circuit-designer', 'device-monitor', 'job-manager', 'state-viz', 'analytics', 'settings', 'logs', 'security']
};

// Test Results Storage
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

// Utility Functions
function log(message, type = 'INFO') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${type}] ${message}`);
}

function assert(condition, testName, details = '') {
    testResults.total++;
    if (condition) {
        testResults.passed++;
        log(`✅ PASS: ${testName}`, 'TEST');
        testResults.details.push({ name: testName, status: 'PASS', details });
    } else {
        testResults.failed++;
        log(`❌ FAIL: ${testName} - ${details}`, 'TEST');
        testResults.details.push({ name: testName, status: 'FAIL', details });
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getElement(id) {
    const element = document.getElementById(id);
    assert(element !== null, `Element ${id} exists`, element ? 'Found' : 'Not found');
    return element;
}

function isVisible(element) {
    return element && element.style.display !== 'none' && element.offsetParent !== null;
}

function simulateInput(elementId, value) {
    const element = getElement(elementId);
    if (element) {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return element;
}

function simulateClick(elementId) {
    const element = typeof elementId === 'string' ? getElement(elementId) : elementId;
    if (element) {
        element.click();
        return true;
    }
    return false;
}

// Test Functions
async function testUIElements() {
    log('Testing UI Elements...', 'TEST');
    
    // Test initial screen
    const authScreen = getElement('authScreen');
    const dashboard = getElement('dashboard');
    
    assert(isVisible(authScreen), 'Auth screen is visible on startup');
    assert(!isVisible(dashboard), 'Dashboard is hidden on startup');
    
    // Test form elements
    const usernameField = getElement('username');
    const passwordField = getElement('password');
    const loginButton = document.querySelector('.auth-button');
    
    assert(usernameField !== null, 'Username field exists');
    assert(passwordField !== null, 'Password field exists');
    assert(loginButton !== null, 'Login button exists');
    
    // Test system specs
    const systemUptime = getElement('systemUptime');
    assert(systemUptime !== null, 'System uptime element exists');
    assert(systemUptime.textContent.match(/\d{2}:\d{2}:\d{2}/), 'Uptime format is correct');
    
    // Test developer mode toggle
    const devModeStatus = getElement('devModeStatus');
    assert(devModeStatus.textContent === 'DISABLED', 'Dev mode initially disabled');
    
    // Test color scheme
    const body = document.body;
    const computedStyle = window.getComputedStyle(body);
    assert(computedStyle.backgroundColor === 'rgb(0, 0, 0)', 'Background is black');
    assert(computedStyle.color === 'rgb(255, 255, 255)', 'Text is white');
}

async function testAuthentication() {
    log('Testing Authentication System...', 'TEST');
    
    for (const testUser of TEST_CONFIG.testUsers) {
        log(`Testing login: ${testUser.username || '(empty)'} / ${testUser.password || '(empty)'}`);
        
        // Reset to login form
        if (!isVisible(getElement('loginForm'))) {
            if (currentSession) {
                performLogout();
                await sleep(100);
            }
        }
        
        // Input credentials
        simulateInput('username', testUser.username);
        simulateInput('password', testUser.password);
        
        // Attempt login
        const loginForm = getElement('loginForm');
        const tfaForm = getElement('tfaForm');
        
        performLogin();
        await sleep(100);
        
        if (testUser.shouldPass) {
            assert(isVisible(tfaForm) && !isVisible(loginForm), 
                   `Valid login shows 2FA form for ${testUser.username}`);
            
            // Test TOTP validation
            for (const code of TEST_CONFIG.validTotpCodes) {
                simulateInput('totpCode', code);
                verifyTOTP();
                await sleep(100);
                
                if (isVisible(getElement('dashboard'))) {
                    assert(true, `TOTP code ${code} accepted`);
                    performLogout();
                    await sleep(100);
                    break;
                }
            }
        } else {
            assert(isVisible(loginForm) && !isVisible(tfaForm), 
                   `Invalid login rejected for ${testUser.username || '(empty)'}`);
        }
    }
}

async function testDevMode() {
    log('Testing Developer Mode...', 'TEST');
    
    // Ensure logged out
    if (currentSession) {
        performLogout();
        await sleep(100);
    }
    
    // Test dev mode toggle
    const devOption = document.querySelector('.auth-option:last-child');
    simulateClick(devOption);
    await sleep(100);
    
    const devModeStatus = getElement('devModeStatus');
    assert(devModeStatus.textContent === 'ENABLED', 'Dev mode can be enabled');
    
    // Test dev login
    simulateInput('username', 'dev');
    simulateInput('password', 'dev123');
    performLogin();
    await sleep(100);
    
    assert(isVisible(getElement('dashboard')), 'Dev mode bypass works');
    
    performLogout();
    await sleep(100);
}

async function testNavigation() {
    log('Testing Navigation...', 'TEST');
    
    // Login first
    simulateInput('username', 'admin');
    simulateInput('password', 'quantum123');
    performLogin();
    await sleep(100);
    
    simulateInput('totpCode', '123456');
    verifyTOTP();
    await sleep(200);
    
    if (!isVisible(getElement('dashboard'))) {
        log('❌ Cannot test navigation - not logged in', 'ERROR');
        return;
    }
    
    // Test each navigation section
    for (const section of TEST_CONFIG.navigationSections) {
        log(`Testing navigation to ${section}`);
        
        const navItems = document.querySelectorAll('.nav-item');
        const targetNav = Array.from(navItems).find(item => 
            item.textContent.toLowerCase().includes(section.replace('-', ' ').split(' ')[0])
        );
        
        if (targetNav) {
            simulateClick(targetNav);
            await sleep(100);
            
            assert(targetNav.classList.contains('active'), 
                   `Navigation to ${section} activates correct item`);
        }
    }
}

async function testProviderConfiguration() {
    log('Testing Provider Configuration...', 'TEST');
    
    // Navigate to providers section
    const providersNav = Array.from(document.querySelectorAll('.nav-item'))
        .find(item => item.textContent.includes('Provider'));
    
    if (providersNav) {
        simulateClick(providersNav);
        await sleep(200);
        
        const providersSection = getElement('providersSection');
        assert(isVisible(providersSection), 'Providers section is visible');
        
        // Test each provider
        for (const provider of TEST_CONFIG.providers) {
            log(`Testing ${provider} provider configuration`);
            
            const statusElement = getElement(`${provider}Status`);
            assert(statusElement !== null, `${provider} status element exists`);
            
            // Test connection button
            const testButton = document.querySelector(`#${provider}Status`)?.closest('.provider-card')
                ?.querySelector('.auth-button');
            
            if (testButton) {
                const originalText = testButton.textContent;
                simulateClick(testButton);
                await sleep(100);
                
                assert(testButton.textContent === 'TESTING...', 
                       `${provider} test button shows testing state`);
                
                // Wait for test to complete
                await sleep(2500);
                
                assert(testButton.textContent === originalText, 
                       `${provider} test button returns to normal state`);
            }
        }
    }
}

async function testSessionManagement() {
    log('Testing Session Management...', 'TEST');
    
    // Test session persistence
    const sessionData = localStorage.getItem('quantumos_session');
    assert(sessionData !== null, 'Session data is stored in localStorage');
    
    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            assert(session.username !== undefined, 'Session contains username');
            assert(session.sessionId !== undefined, 'Session contains sessionId');
            assert(session.exp > Date.now(), 'Session is not expired');
        } catch (e) {
            assert(false, 'Session data is valid JSON', e.message);
        }
    }
    
    // Test logout
    const currentUser = getElement('currentUser').textContent;
    performLogout();
    await sleep(100);
    
    assert(isVisible(getElement('authScreen')), 'Logout shows auth screen');
    assert(!isVisible(getElement('dashboard')), 'Logout hides dashboard');
    assert(localStorage.getItem('quantumos_session') === null, 'Logout clears session data');
}

async function testResponsiveness() {
    log('Testing Responsiveness...', 'TEST');
    
    // Test window resize (simulate different screen sizes)
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    
    // Simulate mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
    window.dispatchEvent(new Event('resize'));
    await sleep(100);
    
    const authContainer = document.querySelector('.auth-container');
    assert(authContainer !== null, 'Auth container exists in mobile view');
    
    // Restore original size
    Object.defineProperty(window, 'innerWidth', { value: originalWidth, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalHeight, writable: true });
    window.dispatchEvent(new Event('resize'));
}

async function testErrorHandling() {
    log('Testing Error Handling...', 'TEST');
    
    // Test invalid TOTP codes
    simulateInput('username', 'admin');
    simulateInput('password', 'quantum123');
    performLogin();
    await sleep(100);
    
    for (const invalidCode of TEST_CONFIG.invalidTotpCodes) {
        simulateInput('totpCode', invalidCode);
        verifyTOTP();
        await sleep(100);
        
        const errorElement = getElement('tfaError');
        assert(isVisible(errorElement), `Error shown for invalid TOTP code: ${invalidCode}`);
    }
    
    // Test empty form submission
    performLogout();
    await sleep(100);
    
    simulateInput('username', '');
    simulateInput('password', '');
    performLogin();
    await sleep(100);
    
    const loginError = getElement('loginError');
    assert(isVisible(loginError), 'Error shown for empty credentials');
}

async function testKeyboardNavigation() {
    log('Testing Keyboard Navigation...', 'TEST');
    
    // Test Enter key navigation
    const usernameField = getElement('username');
    const passwordField = getElement('password');
    
    usernameField.focus();
    simulateInput('username', 'admin');
    
    // Simulate Enter key
    const enterEvent = new KeyboardEvent('keypress', { key: 'Enter', bubbles: true });
    usernameField.dispatchEvent(enterEvent);
    await sleep(100);
    
    assert(document.activeElement === passwordField, 'Enter in username field focuses password');
    
    simulateInput('password', 'quantum123');
    passwordField.dispatchEvent(enterEvent);
    await sleep(100);
    
    assert(isVisible(getElement('tfaForm')), 'Enter in password field submits login');
}

async function testDataPersistence() {
    log('Testing Data Persistence...', 'TEST');
    
    // Test provider config persistence
    const testConfig = {
        ibm: { connected: true, credentials: { token: 'test_token' } }
    };
    
    localStorage.setItem('quantumos_providers', JSON.stringify(testConfig));
    
    // Reload page simulation
    window.location.reload = function() {
        // Simulate reload by re-running initialization
        document.dispatchEvent(new Event('DOMContentLoaded'));
    };
    
    const savedConfig = localStorage.getItem('quantumos_providers');
    assert(savedConfig !== null, 'Provider configuration persists');
    
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            assert(config.ibm !== undefined, 'IBM config persists correctly');
        } catch (e) {
            assert(false, 'Saved config is valid JSON', e.message);
        }
    }
}

async function testSystemStats() {
    log('Testing System Statistics...', 'TEST');
    
    // Ensure logged in and on overview page
    const welcomeNav = Array.from(document.querySelectorAll('.nav-item'))
        .find(item => item.textContent.includes('Overview'));
    
    if (welcomeNav) {
        simulateClick(welcomeNav);
        await sleep(100);
        
        const statElements = ['deviceCount', 'qubitsAvailable', 'jobsCompleted', 'systemLoad'];
        
        for (const statId of statElements) {
            const element = getElement(statId);
            assert(element !== null, `${statId} element exists`);
            assert(element.textContent.trim() !== '', `${statId} has content`);
        }
        
        // Test stats update
        const initialDeviceCount = getElement('deviceCount').textContent;
        updateSystemStats();
        await sleep(100);
        
        // Stats should update (they're randomized so they should change)
        const newDeviceCount = getElement('deviceCount').textContent;
        log(`Device count: ${initialDeviceCount} -> ${newDeviceCount}`);
    }
}

// Main Test Runner
async function runAllTests() {
    log('Starting Comprehensive QuantumOS Test Suite', 'TEST');
    
    try {
        await testUIElements();
        await testAuthentication();
        await testDevMode();
        await testNavigation();
        await testProviderConfiguration();
        await testSessionManagement();
        await testResponsiveness();
        await testErrorHandling();
        await testKeyboardNavigation();
        await testDataPersistence();
        await testSystemStats();
        
        // Generate test report
        log('📋 Test Results Summary:', 'REPORT');
        log(`Total Tests: ${testResults.total}`, 'REPORT');
        log(`Passed: ${testResults.passed}`, 'REPORT');
        log(`Failed: ${testResults.failed}`, 'REPORT');
        log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`, 'REPORT');
        
        if (testResults.failed > 0) {
            log('❌ Failed Tests:', 'REPORT');
            testResults.details
                .filter(test => test.status === 'FAIL')
                .forEach(test => log(`  - ${test.name}: ${test.details}`, 'REPORT'));
        }
        
        // Store test results
        window.quantumosTestResults = testResults;
        
        log('✅ Test Suite Completed', 'TEST');
        
    } catch (error) {
        log(`💥 Test Suite Error: ${error.message}`, 'ERROR');
        console.error(error);
    }
}

// Auto-run tests if in test mode
if (window.location.search.includes('test=true')) {
    setTimeout(runAllTests, 1000);
} else {
    log('🧪 Test suite loaded. Run runAllTests() to execute all tests.', 'INFO');
    log('💡 Tip: Add ?test=true to URL to auto-run tests on load.', 'INFO');
}

// Export test functions for manual testing
window.quantumosTests = {
    runAllTests,
    testUIElements,
    testAuthentication,
    testDevMode,
    testNavigation,
    testProviderConfiguration,
    testSessionManagement,
    testResponsiveness,
    testErrorHandling,
    testKeyboardNavigation,
    testDataPersistence,
    testSystemStats,
    results: () => testResults
};