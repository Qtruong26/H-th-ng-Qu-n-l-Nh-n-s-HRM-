const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

console.log('🧪 Starting HRM Unit & Validation Tests...');

// 1. Kiểm tra mã hóa và xác thực mật khẩu với bcrypt
console.log('1. Testing bcrypt password hashing and verification...');
const rawPass = 'Admin@123';
const hash = bcrypt.hashSync(rawPass, 10);
assert(bcrypt.compareSync(rawPass, hash) === true, 'Bcrypt compare should match raw password');
assert(bcrypt.compareSync('WrongPassword', hash) === false, 'Bcrypt compare should fail on wrong password');
console.log('   ✅ Bcrypt password hashing test PASSED');

// 2. Kiểm tra tạo và xác thực JWT Token
console.log('2. Testing JWT token generation and verification...');
const secret = 'test_secret_key_123';
const payload = { id: 1, username: 'admin', role: 'ADMIN' };
const token = jwt.sign(payload, secret, { expiresIn: '1h' });
const decoded = jwt.verify(token, secret);
assert.strictEqual(decoded.username, 'admin', 'Decoded username should match');
assert.strictEqual(decoded.role, 'ADMIN', 'Decoded role should match');
console.log('   ✅ JWT token generation and verification test PASSED');

// 3. Kiểm tra tính toán giờ làm việc thực tế (Attendance work_hours)
console.log('3. Testing attendance work hours calculation...');
function calcHours(checkIn, checkOut) {
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  const diff = (outH + outM / 60) - (inH + inM / 60);
  return Math.round(diff * 10) / 10;
}
assert.strictEqual(calcHours('08:00', '17:30'), 9.5, '08:00 to 17:30 should be 9.5 hours');
assert.strictEqual(calcHours('08:30', '17:00'), 8.5, '08:30 to 17:00 should be 8.5 hours');
console.log('   ✅ Attendance work hours calculation test PASSED');

// 4. Kiểm tra Regex định dạng Email hợp lệ
console.log('4. Testing Email validation regex...');
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
assert(emailRegex.test('an.nguyen@hrm.com') === true, 'Valid email should pass');
assert(emailRegex.test('invalid-email-no-at') === false, 'Invalid email without @ should fail');
assert(emailRegex.test('test@domain') === false, 'Invalid email without tld should fail');
console.log('   ✅ Email regex validation test PASSED');

// 5. Kiểm tra phân loại trạng thái chấm công đúng giờ / muộn
console.log('5. Testing attendance status classification (8:15 AM threshold)...');
function checkAttendanceStatus(hours, minutes) {
  return (hours > 8 || (hours === 8 && minutes > 15)) ? 'LATE' : 'PRESENT';
}
assert.strictEqual(checkAttendanceStatus(8, 0), 'PRESENT', '8:00 should be PRESENT');
assert.strictEqual(checkAttendanceStatus(8, 15), 'PRESENT', '8:15 should be PRESENT');
assert.strictEqual(checkAttendanceStatus(8, 16), 'LATE', '8:16 should be LATE');
assert.strictEqual(checkAttendanceStatus(9, 0), 'LATE', '9:00 should be LATE');
console.log('   ✅ Attendance status classification test PASSED');

console.log('\n🎉 ALL 5 HRM UNIT TESTS PASSED SUCCESSFULLY!');
