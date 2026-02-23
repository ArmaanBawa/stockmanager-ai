# Password Reset Guide

## Where Passwords Are Stored

Passwords are stored in the **SQLite database** at:
```
procureflow/prisma/dev.db
```

**Database Details:**
- **Table**: `User`
- **Field**: `hashedPassword`
- **Hashing**: bcrypt with 12 rounds (one-way encryption)
- **Security**: Passwords are never stored in plain text

## How to Reset Passwords

### Method 1: Using the Reset Script (Recommended)

Use the provided script to reset any user's password:

```bash
cd procureflow
npx tsx scripts/reset-password.ts <email> <new-password>
```

**Example:**
```bash
npx tsx scripts/reset-password.ts rahul@acme.com newpassword123
```

### Method 2: Using Prisma Studio (Visual)

1. Open Prisma Studio:
   ```bash
   npx prisma studio
   ```

2. Navigate to the `User` table
3. Find the user by email
4. **Note**: You cannot directly edit the hashed password here. You'll need to use Method 1 or 3.

### Method 3: Using the API Endpoint

**For logged-in users (change own password):**
```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "currentPassword": "oldpassword",
    "newPassword": "newpassword123"
  }'
```

**For admin reset (development only):**
```bash
curl -X PUT http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rahul@acme.com",
    "newPassword": "newpassword123"
  }'
```

### Method 4: Direct Database Access (Advanced)

If you need to reset via SQL directly:

```bash
# First, generate a hash for your new password
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('newpassword123', 12).then(h => console.log(h))"

# Then update the database (replace HASH_HERE with the output above)
sqlite3 prisma/dev.db "UPDATE User SET hashedPassword = 'HASH_HERE' WHERE email = 'rahul@acme.com';"
```

## Viewing Users in Database

### Using Prisma Studio:
```bash
npx prisma studio
```
Then navigate to the `User` table to see all users.

### Using SQLite CLI:
```bash
sqlite3 prisma/dev.db "SELECT id, email, name, createdAt FROM User;"
```

## Security Notes

1. **Never store plain text passwords** - Always use bcrypt hashing
2. **Password requirements**: Minimum 6 characters (can be customized)
3. **Hashing rounds**: 12 (recommended for good security/performance balance)
4. **One-way encryption**: Hashed passwords cannot be reversed to get the original

## Default Seeded User

After running `npm run db:seed`:
- **Email**: `rahul@acme.com`
- **Password**: `password123`

To reset this user's password:
```bash
npx tsx scripts/reset-password.ts rahul@acme.com yournewpassword
```

## Future Enhancements

For production, consider adding:
- Email-based password reset with tokens
- Password reset links with expiration
- "Forgot Password" UI page
- Password strength requirements
- Password history (prevent reusing old passwords)
