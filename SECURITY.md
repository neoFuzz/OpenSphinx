# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in OpenSphinx, please report it responsibly:

1. **Do not** create a public GitHub issue
2. Email security concerns to the maintainers
3. Include detailed steps to reproduce the vulnerability
4. Allow reasonable time for the issue to be addressed before public disclosure

## Security Measures

### Authentication & Authorization
- Discord OAuth integration with JWT tokens
- Secure session management
- CSRF protection enabled

### Network Security
- CORS configured with explicit allowed origins (`CLIENT_URLS`)
- Helmet security headers applied
- Rate limiting implemented
- Input validation on all endpoints

### Data Protection
- SQLite database for game persistence
- Environment variables for sensitive configuration
- Secrets stored in `.env` files (gitignored)

### Required Environment Variables

**Server Security Configuration:**
```bash
JWT_SECRET=<strong-random-string>
CSRF_SECRET=<csrf-secret-key>
CLIENT_URLS=<comma-separated-allowed-origins>
```

## Security Best Practices

### For Developers
- Keep dependencies updated (`npm audit`)
- Use strong, unique secrets for `JWT_SECRET` and `CSRF_SECRET`
- Validate all user inputs
- Sanitize data before database operations
- Review code for potential vulnerabilities

### For Deployment
- Use HTTPS in production
- Set `NODE_ENV=production`
- Restrict `CLIENT_URLS` to production domains only
- Secure Discord OAuth credentials
- Regular security updates

### For Users
- Keep Node.js and npm updated
- Use secure networks when playing
- Don't share authentication tokens

## Supported Versions

Security updates are provided for the latest version only. Please ensure you're running the most recent release.

## Security Features

- **CSRF Protection**: Prevents cross-site request forgery attacks
- **Rate Limiting**: Protects against abuse and DoS attacks  
- **Helmet Headers**: Security headers for common vulnerabilities
- **Input Validation**: Server-side validation of all user inputs
- **Secure Authentication**: OAuth integration with JWT tokens
- **CORS Policy**: Strict origin validation