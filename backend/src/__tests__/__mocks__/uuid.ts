// UUID mock for testing - uuid@13.x is ESM-only which causes Jest issues
const v4 = () => 'test-uuid-1234-5678-9012-345678901234'

export { v4 }
export default { v4 }
