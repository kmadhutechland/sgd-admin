/**
 * Change the admin username and password.
 *
 *   node src/set-admin.js <username> <password>
 *
 * Exists as a script rather than a one-off command because this has to be run
 * again on the production server after the first deploy — the seed's defaults
 * are in the repository, so leaving them in place on a public host means anyone
 * who has read the source can sign in.
 *
 * The username is not required to be an email. The account is identified by
 * whatever string it was created with, and the login route only asks that it is
 * not empty.
 */
import bcrypt from 'bcryptjs'
import { rawUsers, saveUsers } from './store.js'

const [username, password] = process.argv.slice(2)

if (!username || !password) {
  console.error('Usage: node src/set-admin.js <username> <password>')
  process.exit(1)
}

const users = rawUsers()
if (users.length === 0) {
  console.error('No admin account exists yet — run `npm run seed` first.')
  process.exit(1)
}

const lower = username.trim().toLowerCase()
const clash = users.find((u) => u.email === lower && u.id !== users[0].id)
if (clash) {
  console.error(`Another account already uses "${lower}".`)
  process.exit(1)
}

// same cost as createUser, so the two produce comparable hashes
users[0].email = lower
users[0].passwordHash = await bcrypt.hash(password, 10)
users[0].updatedAt = new Date().toISOString()
saveUsers(users)

console.log('Admin credentials updated.')
console.log(`  username  ${lower}`)
console.log(`  password  ${'•'.repeat(password.length)}`)

if (password.length < 12) {
  console.log('\nNote: that password is short. Anything reachable from the')
  console.log('internet should use something long and unique.')
}
