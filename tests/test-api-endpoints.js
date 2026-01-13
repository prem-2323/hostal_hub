/**
 * Automated API Testing Script for Hostel Management App
 * Tests all endpoints and verifies MongoDB data persistence
 */

const API_BASE_URL = 'http://localhost:5000/api';

// ANSI color codes for better console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
};

let authToken = '';
let adminToken = '';
let studentUserId = '';
let adminUserId = '';
let testData = {};

/**
 * Helper function to make HTTP requests
 */
async function makeRequest(method, endpoint, data = null, token = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const responseData = await response.json();
        return { status: response.status, data: responseData, ok: response.ok };
    } catch (error) {
        return { status: 0, data: { error: error.message }, ok: false };
    }
}

/**
 * Test logger
 */
function logTest(testName, passed, message = '') {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        console.log(`${colors.green}✓${colors.reset} ${testName}`);
    } else {
        testResults.failed++;
        console.log(`${colors.red}✗${colors.reset} ${testName}`);
        if (message) console.log(`  ${colors.red}${message}${colors.reset}`);
    }
}

/**
 * Print section header
 */
function printSection(title) {
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}${title}${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * Test 1: User Registration (Student)
 */
async function testStudentRegistration() {
    printSection('Testing Student Registration');

    const studentData = {
        registerId: `TEST_STUDENT_${Date.now()}`,
        password: 'TestPass123!',
        name: 'Test Student',
        phone: '1234567890',
        role: 'student',
        roomNumber: '101',
        hostelBlock: 'A',
    };

    const result = await makeRequest('POST', '/auth/register', studentData);

    logTest(
        'Student Registration',
        result.ok && result.data.user,
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok && result.data.user) {
        studentUserId = result.data.user.id;
        testData.student = studentData;
        console.log(`  Student ID: ${studentUserId}`);
    }
}

/**
 * Test 2: User Registration (Admin)
 */
async function testAdminRegistration() {
    printSection('Testing Admin Registration');

    const adminData = {
        registerId: `TEST_ADMIN_${Date.now()}`,
        password: 'AdminPass123!',
        name: 'Test Admin',
        phone: '9876543210',
        role: 'admin',
    };

    const result = await makeRequest('POST', '/auth/register', adminData);

    logTest(
        'Admin Registration',
        result.ok && result.data.user,
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok && result.data.user) {
        adminUserId = result.data.user.id;
        testData.admin = adminData;
        console.log(`  Admin ID: ${adminUserId}`);
    }
}

/**
 * Test 3: User Login (Student)
 */
async function testStudentLogin() {
    printSection('Testing Student Login');

    if (!testData.student) {
        console.log(`${colors.yellow}⚠${colors.reset} Skipping - Student not registered`);
        return;
    }

    const loginData = {
        registerId: testData.student.registerId,
        password: testData.student.password,
    };

    const result = await makeRequest('POST', '/auth/login', loginData);

    logTest(
        'Student Login',
        result.ok && result.data.token,
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok && result.data.token) {
        authToken = result.data.token;
        console.log(`  Token received: ${authToken.substring(0, 20)}...`);
    }
}

/**
 * Test 4: User Login (Admin)
 */
async function testAdminLogin() {
    printSection('Testing Admin Login');

    if (!testData.admin) {
        console.log(`${colors.yellow}⚠${colors.reset} Skipping - Admin not registered`);
        return;
    }

    const loginData = {
        registerId: testData.admin.registerId,
        password: testData.admin.password,
    };

    const result = await makeRequest('POST', '/auth/login', loginData);

    logTest(
        'Admin Login',
        result.ok && result.data.token,
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok && result.data.token) {
        adminToken = result.data.token;
        console.log(`  Admin Token received: ${adminToken.substring(0, 20)}...`);
    }
}

/**
 * Test 5: Create Leave Request
 */
async function testCreateLeaveRequest() {
    printSection('Testing Leave Request Creation');

    const leaveData = {
        userId: studentUserId,
        fromDate: new Date().toISOString(),
        toDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        reason: 'Family function',
        isEmergency: false,
    };

    const result = await makeRequest('POST', '/leave-requests', leaveData, authToken);

    logTest(
        'Create Leave Request',
        result.ok && result.data,
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok && result.data) {
        testData.leaveRequestId = result.data._id || result.data.id;
        console.log(`  Leave Request ID: ${testData.leaveRequestId}`);
    }
}

/**
 * Test 6: Get Leave Requests
 */
async function testGetLeaveRequests() {
    printSection('Testing Get Leave Requests');

    const result = await makeRequest('GET', '/leave-requests', null, authToken);

    logTest(
        'Get Leave Requests',
        result.ok && Array.isArray(result.data),
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok) {
        console.log(`  Found ${result.data.length} leave request(s)`);
    }
}

/**
 * Test 7: Update Leave Request (Admin Approval)
 */
async function testUpdateLeaveRequest() {
    printSection('Testing Leave Request Approval');

    if (!testData.leaveRequestId) {
        console.log(`${colors.yellow}⚠${colors.reset} Skipping - No leave request ID available`);
        return;
    }

    const updateData = {
        status: 'approved',
        adminRemarks: 'Approved for family function',
    };

    const result = await makeRequest(
        'PUT',
        `/leave-requests/${testData.leaveRequestId}`,
        updateData,
        adminToken
    );

    logTest(
        'Approve Leave Request',
        result.ok,
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );
}

/**
 * Test 8: Create Complaint
 */
async function testCreateComplaint() {
    printSection('Testing Complaint Creation');

    const complaintData = {
        userId: studentUserId,
        category: 'water',
        description: 'Water supply issue in Room 101',
        isAnonymous: false,
    };

    const result = await makeRequest('POST', '/complaints', complaintData, authToken);

    logTest(
        'Create Complaint',
        result.ok && result.data,
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok && result.data) {
        testData.complaintId = result.data._id || result.data.id;
        console.log(`  Complaint ID: ${testData.complaintId}`);
    }
}

/**
 * Test 9: Get Complaints
 */
async function testGetComplaints() {
    printSection('Testing Get Complaints');

    const result = await makeRequest('GET', '/complaints', null, authToken);

    logTest(
        'Get Complaints',
        result.ok && Array.isArray(result.data),
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok) {
        console.log(`  Found ${result.data.length} complaint(s)`);
    }
}

/**
 * Test 10: Update Complaint Status
 */
async function testUpdateComplaint() {
    printSection('Testing Complaint Status Update');

    if (!testData.complaintId) {
        console.log(`${colors.yellow}⚠${colors.reset} Skipping - No complaint ID available`);
        return;
    }

    const updateData = {
        status: 'in_progress',
        adminRemarks: 'Water supply team has been notified',
    };

    const result = await makeRequest(
        'PUT',
        `/complaints/${testData.complaintId}`,
        updateData,
        adminToken
    );

    logTest(
        'Update Complaint Status',
        result.ok,
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );
}

/**
 * Test 11: Create Mess Menu
 */
async function testCreateMessMenu() {
    printSection('Testing Mess Menu Creation');

    const menuData = {
        date: new Date().toISOString(),
        mealType: 'lunch',
        items: 'Rice, Dal, Roti, Sabzi, Salad',
        isSpecial: false,
    };

    const result = await makeRequest('POST', '/mess-menus', menuData, adminToken);

    logTest(
        'Create Mess Menu',
        result.ok && result.data,
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok && result.data) {
        testData.menuId = result.data._id || result.data.id;
        console.log(`  Menu ID: ${testData.menuId}`);
    }
}

/**
 * Test 12: Get Mess Menus
 */
async function testGetMessMenus() {
    printSection('Testing Get Mess Menus');

    const result = await makeRequest('GET', '/mess-menus', null, authToken);

    logTest(
        'Get Mess Menus',
        result.ok && Array.isArray(result.data),
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok) {
        console.log(`  Found ${result.data.length} menu(s)`);
    }
}

/**
 * Test 13: Create Announcement
 */
async function testCreateAnnouncement() {
    printSection('Testing Announcement Creation');

    const announcementData = {
        title: 'Test Announcement',
        content: 'This is a test announcement for automated testing',
        isEmergency: false,
        isHoliday: false,
    };

    const result = await makeRequest('POST', '/announcements', announcementData, adminToken);

    logTest(
        'Create Announcement',
        result.ok && result.data,
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok && result.data) {
        testData.announcementId = result.data._id || result.data.id;
        console.log(`  Announcement ID: ${testData.announcementId}`);
    }
}

/**
 * Test 14: Get Announcements
 */
async function testGetAnnouncements() {
    printSection('Testing Get Announcements');

    const result = await makeRequest('GET', '/announcements', null, authToken);

    logTest(
        'Get Announcements',
        result.ok && Array.isArray(result.data),
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok) {
        console.log(`  Found ${result.data.length} announcement(s)`);
    }
}

/**
 * Test 15: Create Room
 */
async function testCreateRoom() {
    printSection('Testing Room Creation');

    const roomData = {
        roomNumber: '101',
        hostelBlock: 'A',
        capacity: 4,
        currentOccupancy: 1,
    };

    const result = await makeRequest('POST', '/rooms', roomData, adminToken);

    logTest(
        'Create Room',
        result.ok && result.data,
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok && result.data) {
        testData.roomId = result.data._id || result.data.id;
        console.log(`  Room ID: ${testData.roomId}`);
    }
}

/**
 * Test 16: Get Rooms
 */
async function testGetRooms() {
    printSection('Testing Get Rooms');

    const result = await makeRequest('GET', '/rooms', null, adminToken);

    logTest(
        'Get Rooms',
        result.ok && Array.isArray(result.data),
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok) {
        console.log(`  Found ${result.data.length} room(s)`);
    }
}

/**
 * Test 17: Create Attendance
 */
async function testCreateAttendance() {
    printSection('Testing Attendance Creation');

    const attendanceData = {
        userId: studentUserId,
        date: new Date().toISOString(),
        isPresent: true,
        latitude: '28.7041',
        longitude: '77.1025',
    };

    const result = await makeRequest('POST', '/attendances', attendanceData, authToken);

    logTest(
        'Create Attendance',
        result.ok && result.data,
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok && result.data) {
        testData.attendanceId = result.data._id || result.data.id;
        console.log(`  Attendance ID: ${testData.attendanceId}`);
    }
}

/**
 * Test 18: Get Attendances
 */
async function testGetAttendances() {
    printSection('Testing Get Attendances');

    const result = await makeRequest('GET', '/attendances', null, adminToken);

    logTest(
        'Get Attendances',
        result.ok && Array.isArray(result.data),
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok) {
        console.log(`  Found ${result.data.length} attendance record(s)`);
    }
}

/**
 * Test 19: Create Menu Suggestion
 */
async function testCreateMenuSuggestion() {
    printSection('Testing Menu Suggestion Creation');

    const suggestionData = {
        userId: studentUserId,
        suggestion: 'Paneer Butter Masala',
        votes: 0,
    };

    const result = await makeRequest('POST', '/menu-suggestions', suggestionData, authToken);

    logTest(
        'Create Menu Suggestion',
        result.ok && result.data,
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok && result.data) {
        testData.suggestionId = result.data._id || result.data.id;
        console.log(`  Suggestion ID: ${testData.suggestionId}`);
    }
}

/**
 * Test 20: Get Menu Suggestions
 */
async function testGetMenuSuggestions() {
    printSection('Testing Get Menu Suggestions');

    const result = await makeRequest('GET', '/menu-suggestions', null, authToken);

    logTest(
        'Get Menu Suggestions',
        result.ok && Array.isArray(result.data),
        result.ok ? '' : `Error: ${JSON.stringify(result.data)}`
    );

    if (result.ok) {
        console.log(`  Found ${result.data.length} suggestion(s)`);
    }
}

/**
 * Print final results
 */
function printResults() {
    printSection('Test Results Summary');

    console.log(`Total Tests: ${testResults.total}`);
    console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);

    const successRate = ((testResults.passed / testResults.total) * 100).toFixed(2);
    console.log(`\nSuccess Rate: ${successRate}%`);

    if (testResults.failed === 0) {
        console.log(`\n${colors.green}✓ All tests passed! 🎉${colors.reset}`);
    } else {
        console.log(`\n${colors.yellow}⚠ Some tests failed. Please review the errors above.${colors.reset}`);
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}Hostel Management App - API Testing${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.yellow}Server: ${API_BASE_URL}${colors.reset}\n`);

    try {
        // Authentication Tests
        await testStudentRegistration();
        await testAdminRegistration();
        await testStudentLogin();
        await testAdminLogin();

        // Leave Request Tests
        await testCreateLeaveRequest();
        await testGetLeaveRequests();
        await testUpdateLeaveRequest();

        // Complaint Tests
        await testCreateComplaint();
        await testGetComplaints();
        await testUpdateComplaint();

        // Mess Menu Tests
        await testCreateMessMenu();
        await testGetMessMenus();

        // Announcement Tests
        await testCreateAnnouncement();
        await testGetAnnouncements();

        // Room Tests
        await testCreateRoom();
        await testGetRooms();

        // Attendance Tests
        await testCreateAttendance();
        await testGetAttendances();

        // Menu Suggestion Tests
        await testCreateMenuSuggestion();
        await testGetMenuSuggestions();

        // Print results
        printResults();
    } catch (error) {
        console.error(`${colors.red}Fatal error during testing: ${error.message}${colors.reset}`);
    }
}

// Run tests
runAllTests();
