/**
 * Simple MongoDB Data Persistence Test
 * This script tests basic CRUD operations and verifies data is stored in MongoDB
 */

const API_BASE_URL = 'http://localhost:5000/api';

// Helper to test an endpoint
async function testEndpoint(name, method, endpoint, data = null, token = null) {
    console.log(`\n----- Testing: ${name} -----`);

    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };

    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (data) options.body = JSON.stringify(data);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();

        console.log(`Status: ${response.status}`);
        console.log(`Response:`, JSON.stringify(result, null, 2));

        return { ok: response.ok, data: result, status: response.status };
    } catch (error) {
        console.log(`ERROR: ${error.message}`);
        return { ok: false, error: error.message };
    }
}

async function runTests() {
    console.log('========================================');
    console.log('MongoDB Data Persistence Test');
    console.log('========================================');

    let studentToken, adminToken, testIds = {};

    // 1. Register Student
    const studentData = {
        registerId: `STUDENT_${Date.now()}`,
        password: 'Pass123!',
        name: 'Test Student',
        phone: '1234567890',
        role: 'student',
        roomNumber: '101',
        hostelBlock: 'A',
    };

    let result = await testEndpoint(
        'Student Registration',
        'POST',
        '/auth/register',
        studentData
    );

    if (result.ok) {
        console.log('✓ Student registered successfully');
        testIds.studentId = result.data.user.id;
    } else {
        console.log('✗ Student registration failed');
    }

    // 2. Register Admin
    const adminData = {
        registerId: `ADMIN_${Date.now()}`,
        password: 'Admin123!',
        name: 'Test Admin',
        phone: '9876543210',
        role: 'admin',
    };

    result = await testEndpoint(
        'Admin Registration',
        'POST',
        '/auth/register',
        adminData
    );

    if (result.ok) {
        console.log('✓ Admin registered successfully');
        testIds.adminId = result.data.user.id;
    } else {
        console.log('✗ Admin registration failed');
    }

    // 3. Login Student
    result = await testEndpoint(
        'Student Login',
        'POST',
        '/auth/login',
        { registerId: studentData.registerId, password: studentData.password }
    );

    if (result.ok && result.data.token) {
        studentToken = result.data.token;
        console.log('✓ Student login successful');
        console.log(`Token: ${studentToken.substring(0, 30)}...`);
    } else {
        console.log('✗ Student login failed');
    }

    // 4. Login Admin
    result = await testEndpoint(
        'Admin Login',
        'POST',
        '/auth/login',
        { registerId: adminData.registerId, password: adminData.password }
    );

    if (result.ok && result.data.token) {
        adminToken = result.data.token;
        console.log('✓ Admin login successful');
    } else {
        console.log('✗ Admin login failed');
    }

    // 5. Create Leave Request
    result = await testEndpoint(
        'Create Leave Request',
        'POST',
        '/leave-requests',
        {
            userId: testIds.studentId,
            fromDate: new Date().toISOString(),
            toDate: new Date(Date.now() + 7 * 86400000).toISOString(),
            reason: 'Family function',
            isEmergency: false,
        },
        studentToken
    );

    if (result.ok) {
        console.log('✓ Leave request created');
        testIds.leaveRequestId = result.data._id || result.data.id;
    } else {
        console.log('✗ Leave request creation failed');
    }

    // 6. Get Leave Requests
    result = await testEndpoint(
        'Get Leave Requests',
        'GET',
        '/leave-requests',
        null,
        studentToken
    );

    if (result.ok && Array.isArray(result.data)) {
        console.log(`✓ Retrieved ${result.data.length} leave requests`);
    } else {
        console.log('✗ Failed to get leave requests');
    }

    // 7. Create Complaint
    result = await testEndpoint(
        'Create Complaint',
        'POST',
        '/complaints',
        {
            userId: testIds.studentId,
            category: 'water',
            description: 'Test complaint - water issue',
            isAnonymous: false,
        },
        studentToken
    );

    if (result.ok) {
        console.log('✓ Complaint created');
        testIds.complaintId = result.data._id || result.data.id;
    } else {
        console.log('✗ Complaint creation failed');
    }

    // 8. Get Complaints
    result = await testEndpoint(
        'Get Complaints',
        'GET',
        '/complaints',
        null,
        studentToken
    );

    if (result.ok && Array.isArray(result.data)) {
        console.log(`✓ Retrieved ${result.data.length} complaints`);
    } else {
        console.log('✗ Failed to get complaints');
    }

    // 9. Create Mess Menu
    result = await testEndpoint(
        'Create Mess Menu',
        'POST',
        '/mess-menus',
        {
            date: new Date().toISOString(),
            mealType: 'lunch',
            items: 'Rice, Dal, Roti, Sabzi',
            isSpecial: false,
        },
        adminToken
    );

    if (result.ok) {
        console.log('✓ Mess menu created');
        testIds.menuId = result.data._id || result.data.id;
    } else {
        console.log('✗ Mess menu creation failed');
    }

    // 10. Get Mess Menus
    result = await testEndpoint(
        'Get Mess Menus',
        'GET',
        '/mess-menus',
        null,
        studentToken
    );

    if (result.ok && Array.isArray(result.data)) {
        console.log(`✓ Retrieved ${result.data.length} menus`);
    } else {
        console.log('✗ Failed to get menus');
    }

    // 11. Create Announcement
    result = await testEndpoint(
        'Create Announcement',
        'POST',
        '/announcements',
        {
            title: 'Test Announcement',
            content: 'This is a test announcement',
            isEmergency: false,
            isHoliday: false,
        },
        adminToken
    );

    if (result.ok) {
        console.log('✓ Announcement created');
        testIds.announcementId = result.data._id || result.data.id;
    } else {
        console.log('✗ Announcement creation failed');
    }

    // 12. Get Announcements
    result = await testEndpoint(
        'Get Announcements',
        'GET',
        '/announcements',
        null,
        studentToken
    );

    if (result.ok && Array.isArray(result.data)) {
        console.log(`✓ Retrieved ${result.data.length} announcements`);
    } else {
        console.log('✗ Failed to get announcements');
    }

    // 13. Create Room
    result = await testEndpoint(
        'Create Room',
        'POST',
        '/rooms',
        {
            roomNumber: '201',
            hostelBlock: 'B',
            capacity: 4,
            currentOccupancy: 0,
        },
        adminToken
    );

    if (result.ok) {
        console.log('✓ Room created');
        testIds.roomId = result.data._id || result.data.id;
    } else {
        console.log('✗ Room creation failed');
    }

    // 14. Get Rooms
    result = await testEndpoint(
        'Get Rooms',
        'GET',
        '/rooms',
        null,
        adminToken
    );

    if (result.ok && Array.isArray(result.data)) {
        console.log(`✓ Retrieved ${result.data.length} rooms`);
    } else {
        console.log('✗ Failed to get rooms');
    }

    // 15. Create Attendance
    result = await testEndpoint(
        'Create Attendance',
        'POST',
        '/attendances',
        {
            userId: testIds.studentId,
            date: new Date().toISOString(),
            isPresent: true,
            latitude: '28.7041',
            longitude: '77.1025',
        },
        studentToken
    );

    if (result.ok) {
        console.log('✓ Attendance created');
        testIds.attendanceId = result.data._id || result.data.id;
    } else {
        console.log('✗ Attendance creation failed');
    }

    // 16. Get Attendances
    result = await testEndpoint(
        'Get Attendances',
        'GET',
        '/attendances',
        null,
        adminToken
    );

    if (result.ok && Array.isArray(result.data)) {
        console.log(`✓ Retrieved ${result.data.length} attendance records`);
    } else {
        console.log('✗ Failed to get attendances');
    }

    console.log('\n========================================');
    console.log('Test Summary');
    console.log('========================================');
    console.log('Test IDs created:');
    console.log(JSON.stringify(testIds, null, 2));
    console.log('\n✓ All data should now be in MongoDB!');
    console.log('Check MongoDB Atlas to verify data persistence.');
}

runTests().catch(console.error);
